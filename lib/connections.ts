import { all, get, parse, run } from "./db";

/**
 * Every external service the agency can use. Each one reads its credentials from
 * the user's saved connection first, then from environment variables.
 * When nothing is configured the matching skill runs in demo mode.
 */
export const PROVIDERS = {
  anthropic: { label: "Claude (המוח של הסוכן)", fields: ["ANTHROPIC_API_KEY"], docs: "https://console.anthropic.com" },
  openai: { label: "OpenAI – Sora 2 וידאו + gpt-image", fields: ["OPENAI_API_KEY"], docs: "https://platform.openai.com" },
  fal: { label: "fal.ai – מודלי תמונה", fields: ["FAL_KEY"], docs: "https://fal.ai/dashboard/keys" },
  unsplash: { label: "Unsplash – תמונות סטוק", fields: ["UNSPLASH_ACCESS_KEY"], docs: "https://unsplash.com/developers" },
  whatsapp: {
    label: "WhatsApp Cloud API",
    fields: ["WHATSAPP_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_VERIFY_TOKEN", "WHATSAPP_APP_SECRET"],
    docs: "https://developers.facebook.com/docs/whatsapp/cloud-api",
  },
  meta: {
    label: "Meta – Facebook, Instagram וקמפיינים",
    fields: ["META_ACCESS_TOKEN", "META_PAGE_ID", "META_IG_USER_ID", "META_AD_ACCOUNT_ID"],
    docs: "https://developers.facebook.com/docs/marketing-apis",
  },
  google_ads: {
    label: "Google Ads",
    fields: [
      "GOOGLE_ADS_DEVELOPER_TOKEN", "GOOGLE_ADS_CLIENT_ID", "GOOGLE_ADS_CLIENT_SECRET",
      "GOOGLE_ADS_REFRESH_TOKEN", "GOOGLE_ADS_CUSTOMER_ID", "GOOGLE_ADS_LOGIN_CUSTOMER_ID",
    ],
    docs: "https://developers.google.com/google-ads/api/docs/start",
  },
  linkedin: { label: "LinkedIn", fields: ["LINKEDIN_ACCESS_TOKEN", "LINKEDIN_AUTHOR_URN"], docs: "https://learn.microsoft.com/linkedin/marketing/" },
  tiktok: { label: "TikTok", fields: ["TIKTOK_ACCESS_TOKEN"], docs: "https://developers.tiktok.com/doc/content-posting-api-get-started" },
  youtube: { label: "YouTube", fields: ["YOUTUBE_ACCESS_TOKEN"], docs: "https://developers.google.com/youtube/v3/guides/uploading_a_video" },
} as const;

export type ProviderKey = keyof typeof PROVIDERS;

/** Required fields for a provider to count as "connected". Optional ones are left out. */
const REQUIRED: Partial<Record<ProviderKey, string[]>> = {
  whatsapp: ["WHATSAPP_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"],
  meta: ["META_ACCESS_TOKEN"],
  google_ads: ["GOOGLE_ADS_DEVELOPER_TOKEN", "GOOGLE_ADS_CLIENT_ID", "GOOGLE_ADS_CLIENT_SECRET", "GOOGLE_ADS_REFRESH_TOKEN", "GOOGLE_ADS_CUSTOMER_ID"],
  linkedin: ["LINKEDIN_ACCESS_TOKEN", "LINKEDIN_AUTHOR_URN"],
};

export function creds(provider: ProviderKey, userId?: string | null): Record<string, string> {
  const saved = userId
    ? parse<Record<string, string>>(get<{ data: string }>("SELECT data FROM connections WHERE user_id = ? AND provider = ?", userId, provider)?.data, {})
    : {};
  const out: Record<string, string> = {};
  for (const f of PROVIDERS[provider].fields) {
    // AGENCY_<NAME> is accepted too, for hosts that reserve some names (e.g. ANTHROPIC_*).
    const v = saved[f] || process.env[f] || process.env[`AGENCY_${f}`] || "";
    if (v) out[f] = v;
  }
  return out;
}

export function isConnected(provider: ProviderKey, userId?: string | null) {
  const c = creds(provider, userId);
  const req = REQUIRED[provider] ?? PROVIDERS[provider].fields;
  return req.every((f) => !!c[f]);
}

export function connectionStatus(userId?: string | null) {
  return (Object.keys(PROVIDERS) as ProviderKey[]).map((k) => ({
    key: k,
    label: PROVIDERS[k].label,
    docs: PROVIDERS[k].docs,
    fields: PROVIDERS[k].fields as readonly string[],
    connected: isConnected(k, userId),
    savedFields: Object.keys(
      userId ? parse<Record<string, string>>(get<{ data: string }>("SELECT data FROM connections WHERE user_id = ? AND provider = ?", userId, k)?.data, {}) : {},
    ),
  }));
}

export function saveConnection(userId: string, provider: ProviderKey, data: Record<string, string>) {
  const allowed = new Set<string>(PROVIDERS[provider].fields);
  const current = parse<Record<string, string>>(
    get<{ data: string }>("SELECT data FROM connections WHERE user_id = ? AND provider = ?", userId, provider)?.data, {},
  );
  for (const [k, v] of Object.entries(data)) {
    if (!allowed.has(k)) continue;
    if (v === "") delete current[k];
    else current[k] = v;
  }
  run(
    "INSERT INTO connections (user_id, provider, data, updated_at) VALUES (?, ?, ?, datetime('now')) ON CONFLICT(user_id, provider) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at",
    userId, provider, JSON.stringify(current),
  );
}

export function anyUserWithWhatsapp() {
  return all<{ user_id: string }>("SELECT user_id FROM connections WHERE provider = 'whatsapp'");
}
