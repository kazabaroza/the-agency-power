import { creds, isConnected } from "../connections";
import { absoluteUrl } from "../storage";

const GRAPH = `https://graph.facebook.com/${process.env.META_GRAPH_VERSION || "v23.0"}`;
const GADS = `https://googleads.googleapis.com/${process.env.GOOGLE_ADS_API_VERSION || "v21"}`;

export type CampaignSpec = {
  name: string;
  objective: "leads" | "traffic" | "sales" | "awareness";
  dailyBudget: number; // in account currency, major units
  location: { label: string; lat?: number; lng?: number; radiusKm?: number; countries?: string[] };
  ageMin?: number;
  ageMax?: number;
  genders?: ("female" | "male")[]; // empty = everyone
  interests?: string[];
  structure?: "CBO" | "ABO";
  landingUrl: string;
  creatives: { headline: string; primaryText: string; description?: string; imageUrl?: string; cta?: string }[];
  keywords?: string[];
};

export type LaunchResult = { ok: boolean; demo?: boolean; externalIds?: Record<string, unknown>; error?: string };

// ---------------- Meta Marketing API ----------------

const META_OBJECTIVE: Record<CampaignSpec["objective"], { objective: string; goal: string }> = {
  leads: { objective: "OUTCOME_LEADS", goal: "LINK_CLICKS" },
  traffic: { objective: "OUTCOME_TRAFFIC", goal: "LINK_CLICKS" },
  sales: { objective: "OUTCOME_SALES", goal: "LINK_CLICKS" },
  awareness: { objective: "OUTCOME_AWARENESS", goal: "REACH" },
};

async function metaPost(path: string, params: Record<string, unknown>, token: string) {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) body.set(k, typeof v === "string" ? v : JSON.stringify(v));
  body.set("access_token", token);
  const r = await fetch(`${GRAPH}/${path}`, { method: "POST", body });
  const j = (await r.json()) as { id?: string; error?: { message: string; error_user_msg?: string } };
  if (!r.ok || j.error) throw new Error(j.error?.error_user_msg || j.error?.message || `Meta ${r.status}`);
  return j;
}

async function metaInterestIds(names: string[], token: string) {
  const out: { id: string; name: string }[] = [];
  for (const q of names.slice(0, 6)) {
    const r = await fetch(`${GRAPH}/search?type=adinterest&limit=1&q=${encodeURIComponent(q)}&access_token=${token}`);
    const j = (await r.json()) as { data?: { id: string; name: string }[] };
    if (j.data?.[0]) out.push(j.data[0]);
  }
  return out;
}

export async function launchMeta(spec: CampaignSpec, userId: string): Promise<LaunchResult> {
  if (!isConnected("meta", userId) || !creds("meta", userId).META_AD_ACCOUNT_ID) return { ok: true, demo: true, externalIds: { campaign: `demo-meta-${Date.now()}` } };
  const c = creds("meta", userId);
  const token = c.META_ACCESS_TOKEN;
  const act = c.META_AD_ACCOUNT_ID.startsWith("act_") ? c.META_AD_ACCOUNT_ID : `act_${c.META_AD_ACCOUNT_ID}`;
  const obj = META_OBJECTIVE[spec.objective];
  const cents = Math.round(spec.dailyBudget * 100);
  const cbo = spec.structure !== "ABO";
  try {
    const campaign = await metaPost(`${act}/campaigns`, {
      name: spec.name, objective: obj.objective, status: "PAUSED", special_ad_categories: [],
      ...(cbo ? { daily_budget: String(cents), bid_strategy: "LOWEST_COST_WITHOUT_CAP" } : { is_adset_budget_sharing_enabled: "false" }),
    }, token);

    const geo = spec.location.lat != null && spec.location.lng != null
      ? { custom_locations: [{ latitude: spec.location.lat, longitude: spec.location.lng, radius: spec.location.radiusKm ?? 15, distance_unit: "kilometer" }] }
      : { countries: spec.location.countries ?? ["IL"] };
    const interests = spec.interests?.length ? await metaInterestIds(spec.interests, token) : [];
    const adset = await metaPost(`${act}/adsets`, {
      name: `${spec.name} – Ad set`, campaign_id: campaign.id, status: "PAUSED",
      billing_event: "IMPRESSIONS", optimization_goal: obj.goal,
      ...(cbo ? {} : { daily_budget: String(cents), bid_strategy: "LOWEST_COST_WITHOUT_CAP" }),
      destination_type: "WEBSITE",
      targeting: {
        geo_locations: geo, age_min: spec.ageMin ?? 21, age_max: spec.ageMax ?? 65,
        ...(spec.genders?.length === 1 ? { genders: [spec.genders[0] === "male" ? 1 : 2] } : {}),
        ...(interests.length ? { flexible_spec: [{ interests }] } : {}),
        targeting_automation: { advantage_audience: interests.length ? 0 : 1 },
      },
    }, token);

    const ads: string[] = [];
    for (const [i, cr] of spec.creatives.entries()) {
      const creative = await metaPost(`${act}/adcreatives`, {
        name: `${spec.name} – Creative ${i + 1}`,
        object_story_spec: {
          page_id: c.META_PAGE_ID,
          link_data: {
            link: spec.landingUrl, message: cr.primaryText, name: cr.headline, description: cr.description ?? "",
            ...(cr.imageUrl ? { picture: absoluteUrl(cr.imageUrl) } : {}),
            call_to_action: { type: cr.cta || "LEARN_MORE", value: { link: spec.landingUrl } },
          },
        },
      }, token);
      const ad = await metaPost(`${act}/ads`, { name: `${spec.name} – Ad ${i + 1}`, adset_id: adset.id, creative: { creative_id: creative.id }, status: "PAUSED" }, token);
      ads.push(ad.id!);
    }
    // Built paused, then switched on in one step so a half-built campaign never spends.
    for (const objId of [...ads, adset.id!, campaign.id!]) await metaPost(objId, { status: "ACTIVE" }, token);
    return { ok: true, externalIds: { campaign: campaign.id, adset: adset.id, ads } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function setMetaStatus(campaignId: string, status: "ACTIVE" | "PAUSED", userId: string) {
  if (!isConnected("meta", userId) || campaignId.startsWith("demo")) return { ok: true, demo: true };
  await metaPost(campaignId, { status }, creds("meta", userId).META_ACCESS_TOKEN);
  return { ok: true };
}

export async function metaInsights(campaignId: string, userId: string) {
  if (!isConnected("meta", userId) || campaignId.startsWith("demo")) return null;
  const token = creds("meta", userId).META_ACCESS_TOKEN;
  const r = await fetch(`${GRAPH}/${campaignId}/insights?fields=impressions,clicks,spend,ctr,cpc,actions&date_preset=last_7d&access_token=${token}`);
  const j = (await r.json()) as { data?: Record<string, unknown>[] };
  return j.data?.[0] ?? null;
}

// ---------------- Google Ads API ----------------

async function googleToken(userId: string) {
  const c = creds("google_ads", userId);
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({ client_id: c.GOOGLE_ADS_CLIENT_ID, client_secret: c.GOOGLE_ADS_CLIENT_SECRET, refresh_token: c.GOOGLE_ADS_REFRESH_TOKEN, grant_type: "refresh_token" }),
  });
  const j = (await r.json()) as { access_token?: string; error_description?: string };
  if (!j.access_token) throw new Error(j.error_description || "Google OAuth failed");
  return j.access_token;
}

async function gadsMutate(userId: string, operations: unknown[]) {
  const c = creds("google_ads", userId);
  const cid = c.GOOGLE_ADS_CUSTOMER_ID.replace(/-/g, "");
  const headers: Record<string, string> = {
    Authorization: `Bearer ${await googleToken(userId)}`,
    "developer-token": c.GOOGLE_ADS_DEVELOPER_TOKEN,
    "Content-Type": "application/json",
  };
  if (c.GOOGLE_ADS_LOGIN_CUSTOMER_ID) headers["login-customer-id"] = c.GOOGLE_ADS_LOGIN_CUSTOMER_ID.replace(/-/g, "");
  const r = await fetch(`${GADS}/customers/${cid}/googleAds:mutate`, { method: "POST", headers, body: JSON.stringify({ mutateOperations: operations }) });
  const j = (await r.json()) as { mutateOperationResponses?: Record<string, { resourceName: string }>[]; error?: { message: string } };
  if (!r.ok) throw new Error(j.error?.message || `Google Ads ${r.status}`);
  return { cid, responses: j.mutateOperationResponses ?? [] };
}

export async function launchGoogle(spec: CampaignSpec, userId: string): Promise<LaunchResult> {
  if (!isConnected("google_ads", userId)) return { ok: true, demo: true, externalIds: { campaign: `demo-google-${Date.now()}` } };
  try {
    const cid = creds("google_ads", userId).GOOGLE_ADS_CUSTOMER_ID.replace(/-/g, "");
    const budget = `customers/${cid}/campaignBudgets/-1`;
    const campaign = `customers/${cid}/campaigns/-2`;
    const adGroup = `customers/${cid}/adGroups/-3`;
    const cr = spec.creatives[0];
    const headlines = [...new Set(spec.creatives.flatMap((c) => [c.headline, c.description ?? ""]).filter(Boolean))].map((t) => ({ text: t.slice(0, 30) })).slice(0, 15);
    while (headlines.length < 3) headlines.push({ text: spec.name.slice(0, 30) + (headlines.length ? ` ${headlines.length}` : "") });
    const descriptions = spec.creatives.map((c) => ({ text: c.primaryText.slice(0, 90) })).slice(0, 4);
    while (descriptions.length < 2) descriptions.push({ text: (cr?.primaryText || spec.name).slice(0, 90) });

    const ops: unknown[] = [
      { campaignBudgetOperation: { create: { resourceName: budget, name: `${spec.name} budget ${Date.now()}`, amountMicros: String(Math.round(spec.dailyBudget * 1_000_000)), deliveryMethod: "STANDARD", explicitlyShared: false } } },
      { campaignOperation: { create: {
        resourceName: campaign, name: spec.name, status: "PAUSED", advertisingChannelType: "SEARCH", campaignBudget: budget,
        targetSpend: {}, networkSettings: { targetGoogleSearch: true, targetSearchNetwork: true, targetContentNetwork: false },
        containsEuPoliticalAdvertising: "DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING",
      } } },
      spec.location.lat != null && spec.location.lng != null
        ? { campaignCriterionOperation: { create: { campaign, proximity: { geoPoint: { latitudeInMicroDegrees: Math.round(spec.location.lat * 1e6), longitudeInMicroDegrees: Math.round(spec.location.lng * 1e6) }, radius: spec.location.radiusKm ?? 15, radiusUnits: "KILOMETERS" } } } }
        : { campaignCriterionOperation: { create: { campaign, location: { geoTargetConstant: "geoTargetConstants/2376" } } } }, // Israel
      { adGroupOperation: { create: { resourceName: adGroup, name: `${spec.name} – Ad group`, campaign, status: "ENABLED", type: "SEARCH_STANDARD" } } },
      ...(spec.keywords ?? []).slice(0, 20).map((k) => ({ adGroupCriterionOperation: { create: { adGroup, status: "ENABLED", keyword: { text: k, matchType: "PHRASE" } } } })),
      { adGroupAdOperation: { create: { adGroup, status: "ENABLED", ad: { finalUrls: [spec.landingUrl], responsiveSearchAd: { headlines, descriptions } } } } },
    ];
    const { responses } = await gadsMutate(userId, ops);
    const campaignRes = responses.map((r) => r.campaignResult?.resourceName).find(Boolean);
    if (campaignRes) await gadsMutate(userId, [{ campaignOperation: { update: { resourceName: campaignRes, status: "ENABLED" }, updateMask: "status" } }]);
    return { ok: true, externalIds: { campaign: campaignRes } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function setGoogleStatus(resourceName: string, status: "ENABLED" | "PAUSED", userId: string) {
  if (!isConnected("google_ads", userId) || resourceName.startsWith("demo")) return { ok: true, demo: true };
  await gadsMutate(userId, [{ campaignOperation: { update: { resourceName, status }, updateMask: "status" } }]);
  return { ok: true };
}
