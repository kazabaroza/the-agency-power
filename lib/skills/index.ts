import type Anthropic from "@anthropic-ai/sdk";
import { all, get, id, insert, parse, update } from "../db";
import { addMessage } from "../conversation";
import { runSpecialist, parseJson } from "../agents/specialist";
import { coreTeam, getAgent } from "../agents/registry";
import { svgBanner, generateImage, stockPhotos, startVideo, startPresenterVideo, FORMATS, VIDEO_SECONDS, VIDEO_MODEL, AVATAR_MODEL, type Brand, type Format, type VideoSeconds } from "../providers/media";
import { saveFile } from "../storage";
import { renderLanding, demoLanding, type LandingContent } from "../landing";
import { PLATFORMS, type Platform } from "../providers/social";
import { launchMeta, launchGoogle, type CampaignSpec } from "../providers/ads";
import { publishScheduled } from "../scheduler";

export type SkillCtx = {
  userId: string;
  conversationId: string;
  brand: Brand | null;
  client: Anthropic | null; // null = demo mode
  appUrl: string;
};

export type Skill = {
  name: string;
  label: string;
  /** Short Hebrew explanation for the owner (the English description is what the model reads). */
  descHe: string;
  description: string;
  input_schema: Anthropic.Tool["input_schema"];
  /** Skills that spend money or publish publicly wait for an approval card. */
  gated?: boolean;
  summarize?: (input: Record<string, unknown>, ctx: SkillCtx) => { summary: string; cost: string };
  run: (input: Record<string, unknown>, ctx: SkillCtx) => Promise<string>;
};

const lang = (ctx: SkillCtx) => (ctx.brand?.language === "en" ? "en" : "he");
const S = (v: unknown, d = "") => (typeof v === "string" ? v : d);

function asset(ctx: SkillCtx, type: string, title: string, data: Record<string, unknown>, url?: string, status = "ready") {
  const aid = id("a_");
  insert("assets", { id: aid, user_id: ctx.userId, brand_id: ctx.brand?.id ?? null, type, title, data, url: url ?? null, status });
  return aid;
}

function showAsset(ctx: SkillCtx, assetId: string, text: string) {
  addMessage(ctx.conversationId, { role: "assistant", kind: "asset", text, meta: { assetId } });
}

function showAgent(ctx: SkillCtx, slug: string, task: string) {
  const a = getAgent(slug);
  if (a) addMessage(ctx.conversationId, { role: "assistant", kind: "agent", text: `${a.emoji} ${a.name} עובד/ת על זה`, meta: { slug, task: task.slice(0, 300) } });
}

// ------------------------------------------------------------------ skills

const analyzeBusiness: Skill = {
  name: "analyze_business",
  label: "ניתוח עסק ובניית פרופיל מותג",
  descHe: "בונה פרופיל מותג מתוך קישור לאתר או תיאור של בעל העסק: שם, מה העסק מציע, קהל יעד, טון דיבור וצבעים. זה הצעד הראשון כשאין עדיין פרופיל.",
  description: "Build or update the brand profile from a website URL and/or the owner's description. Reads the site, extracts name, offer, audience, tone and colors. Use this first when there is no brand profile.",
  input_schema: {
    type: "object",
    properties: {
      website: { type: "string", description: "Business website or social page URL" },
      description: { type: "string", description: "What the owner said about the business" },
      name: { type: "string" },
      phone: { type: "string", description: "WhatsApp/phone for landing pages" },
      location: { type: "string" },
      language: { type: "string", enum: ["he", "en"] },
    },
  },
  async run(input, ctx) {
    let siteText = "";
    let siteColors: string[] = [];
    const website = S(input.website);
    if (website) {
      try {
        const r = await fetch(website.startsWith("http") ? website : `https://${website}`, { headers: { "User-Agent": "Mozilla/5.0 TheAgencyPower" }, signal: AbortSignal.timeout(12000) });
        const html = await r.text();
        siteColors = [...new Set(html.match(/#[0-9a-fA-F]{6}\b/g) ?? [])].slice(0, 3);
        siteText = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 6000);
      } catch {
        siteText = "";
      }
    }
    type Profile = { name: string; description: string; audience: string; tone: string; colors: string[]; location?: string };
    let p: Profile | null = null;
    if (ctx.client) {
      const out = await runSpecialist({
        client: ctx.client, slug: "design-brand-guardian", brand: ctx.brand, conversationId: ctx.conversationId, json: true,
        task: `Build a brand profile. Owner said: "${S(input.description)}". Name hint: "${S(input.name)}". Website text: """${siteText}""". Colors seen on site: ${siteColors.join(", ") || "none"}.
Return JSON: {"name":"","description":"one or two sentences","audience":"who buys","tone":"tone of voice in 3-5 words","colors":["#hex primary","#hex accent"],"location":""}`,
      });
      p = parseJson<Profile>(out);
    }
    if (!p) {
      const title = siteText.slice(0, 80);
      p = {
        name: S(input.name) || title.split(/[|\-–]/)[0].trim() || "העסק שלי",
        description: S(input.description) || title,
        audience: "",
        tone: "חם, מקצועי וישיר",
        colors: siteColors.length >= 2 ? siteColors : ["#5b3df5", "#ff7a45"],
      };
    }
    const row = {
      name: p.name, website: website || null, description: p.description, audience: p.audience, tone: p.tone,
      colors: p.colors, language: S(input.language) || ctx.brand?.language || "he",
      phone: S(input.phone) || ctx.brand?.phone || null, location: S(input.location) || p.location || ctx.brand?.location || null,
    };
    if (ctx.brand) update("brands", ctx.brand.id, row);
    else {
      const bid = id("b_");
      insert("brands", { id: bid, user_id: ctx.userId, ...row });
      update("conversations", ctx.conversationId, { brand_id: bid });
      ctx.brand = get<Brand>("SELECT * FROM brands WHERE id = ?", bid) ?? null;
    }
    if (ctx.brand) ctx.brand = get<Brand>("SELECT * FROM brands WHERE id = ?", ctx.brand.id) ?? ctx.brand;
    return `Brand profile saved: ${JSON.stringify(row)}`;
  },
};

const consult: Skill = {
  name: "consult_specialist",
  label: "התייעצות עם מומחה מ-The Agency",
  descHe: "מעביר משימה למומחה אחד מהצוות של The Agency, למשל אסטרטגיה, קופי, מחקר, SEO או תכנון פרסום. אפשר להפעיל חיפוש חי ברשת למחקר שוק ומתחרים.",
  description: "Hand a task to one specialist agent from The Agency roster (use the slug). Use for strategy, copy, research, audits, SEO, paid media planning and anything that benefits from a specialist. Set web_search true for live market or competitor research.",
  input_schema: {
    type: "object",
    properties: {
      agent_slug: { type: "string", description: "Slug from the roster, e.g. marketing-growth-hacker" },
      task: { type: "string", description: "Complete, self-contained brief for the specialist" },
      web_search: { type: "boolean" },
    },
    required: ["agent_slug", "task"],
  },
  async run(input, ctx) {
    const slug = S(input.agent_slug);
    if (!getAgent(slug)) return `Unknown agent "${slug}". Pick a slug from the roster.`;
    showAgent(ctx, slug, S(input.task));
    if (!ctx.client) return demoSpecialist(slug, S(input.task), ctx);
    return runSpecialist({ client: ctx.client, slug, task: S(input.task), brand: ctx.brand, conversationId: ctx.conversationId, webSearch: !!input.web_search });
  },
};

const marketResearch: Skill = {
  name: "market_research",
  label: "מחקר שוק ומתחרים",
  descHe: "מחקר שוק ומתחרים חי מהרשת: מה הלקוחות מחפשים, איך המתחרים ממצבים את עצמם, אילו זוויות הם מפספסים, ושלושה מסרים מומלצים.",
  description: "Live research on the market, competitors and angles they miss, using web search. Returns findings and recommended angles. Use before plans, campaigns and landing pages.",
  input_schema: { type: "object", properties: { question: { type: "string" } }, required: ["question"] },
  async run(input, ctx) {
    showAgent(ctx, "product-trend-researcher", S(input.question));
    if (!ctx.client) return demoSpecialist("product-trend-researcher", S(input.question), ctx);
    const out = await runSpecialist({
      client: ctx.client, slug: "product-trend-researcher", brand: ctx.brand, conversationId: ctx.conversationId, webSearch: true,
      task: `Research for a small-business marketing plan: ${S(input.question)}
Cover: what buyers search for and care about, 3-5 real competitors and how they position, gaps and angles they are not using, and 3 recommended messages. Cite sources inline. Keep it under 350 words.`,
    });
    asset(ctx, "research", `מחקר: ${S(input.question).slice(0, 60)}`, { text: out });
    return out;
  },
};

const createPost: Skill = {
  name: "create_social_post",
  label: "פוסט / קרוסלה / באנר לרשתות",
  descHe: "יוצר פוסט לרשתות עם טקסט ותמונה מעוצבת: טיפ, קרוסלה, ניפוץ מיתוס, ביקורת, חג, מבצע או הודעה. בקרוסלה בוחרים 3 עד 8 שקפים.",
  description: "Create an organic social post: copy + designed image(s). Types: tip, carousel, myth_buster, review, holiday, promo, announcement. For carousel, set slides (3-8). Returns the asset id.",
  input_schema: {
    type: "object",
    properties: {
      topic: { type: "string" },
      post_type: { type: "string", enum: ["tip", "carousel", "myth_buster", "review", "holiday", "promo", "announcement"] },
      platform: { type: "string", enum: ["instagram", "facebook", "linkedin", "tiktok"] },
      format: { type: "string", enum: Object.keys(FORMATS) },
      slides: { type: "integer", minimum: 1, maximum: 8 },
      ai_background: { type: "boolean", description: "Generate an AI photo background (needs an image provider)" },
    },
    required: ["topic"],
  },
  async run(input, ctx) {
    const type = S(input.post_type, "tip");
    const platform = S(input.platform, "instagram");
    const format = (S(input.format) || (platform === "linkedin" ? "wide" : type === "carousel" ? "portrait" : "feed")) as Format;
    const slidesN = type === "carousel" ? Math.max(3, Math.min(8, Number(input.slides) || 5)) : 1;
    type Copy = { caption: string; hashtags: string[]; slides: { headline: string; sub?: string; cta?: string }[]; image_prompt?: string };
    let copy: Copy | null = null;
    const slug = type === "carousel" ? "marketing-carousel-growth-engine" : platform === "linkedin" ? "marketing-linkedin-content-creator" : platform === "tiktok" ? "marketing-tiktok-strategist" : "marketing-instagram-curator";
    showAgent(ctx, slug, S(input.topic));
    if (ctx.client) {
      copy = parseJson<Copy>(await runSpecialist({
        client: ctx.client, slug, brand: ctx.brand, conversationId: ctx.conversationId, json: true,
        task: `Write a ${type} post for ${platform} about: ${S(input.topic)}.
${slidesN > 1 ? `It is a carousel of exactly ${slidesN} slides: slide 1 is the hook, the last slide is the call to action.` : "One image."}
Headlines max 8 words, sub-lines max 16 words.
Return JSON: {"caption":"post caption with line breaks","hashtags":["..."],"slides":[{"headline":"","sub":"","cta":""}],"image_prompt":"English prompt for a photo background without any text"}`,
      }));
    }
    if (!copy?.slides?.length) copy = demoPost(S(input.topic), type, slidesN, lang(ctx), ctx.brand);
    let bg: string | undefined;
    if (input.ai_background && copy.image_prompt) bg = (await generateImage(copy.image_prompt, format, ctx.userId))?.url;
    const images = copy.slides.slice(0, slidesN).map((s, i) =>
      saveFile(svgBanner({ headline: s.headline, sub: s.sub, cta: s.cta, brand: ctx.brand, format, bgImage: bg, slide: slidesN > 1 ? `${i + 1}/${slidesN}` : undefined }), "image/svg+xml"),
    );
    const caption = `${copy.caption}\n\n${(copy.hashtags ?? []).map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}`.trim();
    const aid = asset(ctx, type === "carousel" ? "carousel" : "post", copy.slides[0].headline, { caption, images, platform, format, type }, images[0]);
    showAsset(ctx, aid, slidesN > 1 ? `הקרוסלה מוכנה – ${slidesN} שקפים` : "הפוסט מוכן");
    return `Created ${type} post asset ${aid} (${images.length} image(s), format ${format}). Caption:\n${caption}`;
  },
};

const createBanner: Skill = {
  name: "create_banner",
  label: "באנר / מודעה",
  descHe: "מעצב באנר או מודעה בודדת עם כותרת, שורת משנה וכפתור, בצבעי המותג. אפשר להוסיף רקע מצולם שנוצר ב-AI.",
  description: "Design a single banner or ad image with headline, sub-line and CTA in the brand colors. Optionally with an AI-generated photo background.",
  input_schema: {
    type: "object",
    properties: {
      headline: { type: "string" }, sub: { type: "string" }, cta: { type: "string" },
      format: { type: "string", enum: Object.keys(FORMATS) },
      image_prompt: { type: "string", description: "English prompt for an AI background photo (no text in image)" },
    },
    required: ["headline"],
  },
  async run(input, ctx) {
    const format = (S(input.format) || "feed") as Format;
    const bg = S(input.image_prompt) ? (await generateImage(S(input.image_prompt), format, ctx.userId))?.url : undefined;
    const url = saveFile(svgBanner({ headline: S(input.headline), sub: S(input.sub), cta: S(input.cta), brand: ctx.brand, format, bgImage: bg }), "image/svg+xml");
    const aid = asset(ctx, "banner", S(input.headline), { images: [url], format, caption: S(input.sub) }, url);
    showAsset(ctx, aid, `באנר מוכן (${FORMATS[format].label})`);
    return `Banner asset ${aid} created at ${url}`;
  },
};

const buildLanding: Skill = {
  name: "build_landing_page",
  label: "דף נחיתה / אתר",
  descHe: "כותב ומפרסם דף נחיתה או אתר תדמית עם טופס לידים, מדידת צפיות וכפתור וואטסאפ. ארבעה סגנונות: לידים, אתר מותג, השוואה למתחרים וסיפור.",
  description: "Write and publish a landing page or one-page site with lead form, analytics and WhatsApp button. Styles: lead (lead generation), brand (one-page brand site), comparison (vs competitors), story (storytelling). Returns the live URL.",
  input_schema: {
    type: "object",
    properties: {
      goal: { type: "string", description: "What the page should get visitors to do, and the offer" },
      style: { type: "string", enum: ["lead", "brand", "comparison", "story"] },
      audience: { type: "string" },
      testimonials: { type: "array", items: { type: "object", properties: { quote: { type: "string" }, name: { type: "string" } } }, description: "Only real testimonials the owner provided" },
    },
    required: ["goal"],
  },
  async run(input, ctx) {
    const style = (S(input.style) || "lead") as LandingContent["style"];
    const language = lang(ctx);
    let content: LandingContent | null = null;
    showAgent(ctx, "design-ux-architect", S(input.goal));
    if (ctx.client) {
      content = parseJson<LandingContent>(await runSpecialist({
        client: ctx.client, slug: "design-ux-architect", brand: ctx.brand, conversationId: ctx.conversationId, json: true,
        task: `Write a high-converting ${style} landing page. Goal/offer: ${S(input.goal)}. Audience: ${S(input.audience) || ctx.brand?.audience || "infer"}.
The page is built around ONE action: the lead form. Language: ${language}.
Return JSON exactly in this shape (omit optional sections that do not fit the style):
{"style":"${style}","language":"${language}","hero":{"eyebrow":"","title":"","subtitle":"","cta":""},"benefits":[{"icon":"emoji","title":"","text":""}],
"story":{"title":"","paragraphs":[""]},"comparison":{"title":"","us":"","them":"","rows":[{"label":"","us":"","them":""}]},
"steps":[{"title":"","text":""}],"faq":[{"q":"","a":""}],"offer":{"title":"","text":"","cta":""},
"form":{"title":"","button":"","fields":["name","phone","email"]},"seo":{"title":"max 60 chars","description":"max 155 chars"}}
Do not include testimonials.`,
      }));
    }
    if (!content?.hero) content = demoLanding(ctx.brand, S(input.goal), style, language);
    content.style = style;
    content.language = language;
    const real = Array.isArray(input.testimonials) ? (input.testimonials as { quote: string; name: string }[]).filter((t) => t?.quote && t?.name) : [];
    content.testimonials = real.length ? real : undefined;
    const photos = await stockPhotos(`${ctx.brand?.name ?? ""} ${S(input.goal)}`.slice(0, 80), ctx.userId, 4);
    if (photos[0]) content.hero.image = photos[0];
    if (photos.length > 1) content.gallery = photos.slice(1);

    const pid = id("lp_");
    const slug = `${(ctx.brand?.name || "page").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "page"}-${pid.slice(3, 9).toLowerCase()}`;
    const html = renderLanding(content, ctx.brand, pid, ctx.appUrl);
    insert("landing_pages", { id: pid, user_id: ctx.userId, brand_id: ctx.brand?.id ?? null, slug, title: content.seo.title, style, html, published: 1 });
    const url = `/p/${slug}`;
    const aid = asset(ctx, "landing_page", content.hero.title, { landingPageId: pid, slug, style, content }, url);
    showAsset(ctx, aid, "דף הנחיתה באוויר");
    return `Landing page published at ${ctx.appUrl}${url} (asset ${aid}, page ${pid}). Leads from the form go to the Leads screen.`;
  },
};

const createVideo: Skill = {
  name: "create_video",
  label: "סרטון עם מציג AI / UGC",
  descHe: "כותב תסריט לסרטון קצר ומרנדר אותו. בסרטוני מציג ו-UGC יש קריינות טבעית בעברית ומציג/ה עם סנכרון שפתיים. סרטוני מוצר ואנימציה נוצרים עם מוזיקה. עולה כסף, ולכן דורש אישור.",
  description: "Write a short-video script and render it: presenter (AI presenter talking to camera) and ugc (creator-style reel) get a natural voice-over in the brand language with a lip-synced presenter; product (product showcase) and animation are rendered by a text-to-video model with music/ambient sound. 4-15 seconds, vertical by default. Costs money - needs approval.",
  gated: true,
  input_schema: {
    type: "object",
    properties: {
      topic: { type: "string" },
      style: { type: "string", enum: ["presenter", "ugc", "product", "animation"] },
      seconds: { type: "string", enum: [...VIDEO_SECONDS] },
      vertical: { type: "boolean" },
      presenter: { type: "string", description: "Look of the presenter, e.g. 'woman in her 30s, warm smile, studio light'" },
    },
    required: ["topic"],
  },
  summarize: (i) => ({
    summary: `סרטון ${({ presenter: "עם מציג AI", ugc: "בסגנון UGC", product: "מוצר", animation: "אנימציה" } as Record<string, string>)[S(i.style, "presenter")] ?? ""} על "${S(i.topic)}" – ${S(i.seconds, "8")} שניות`,
    cost: ["presenter", "ugc"].includes(S(i.style, "presenter"))
      ? `קריינות בעברית + מציג/ה מסונכרן/ת · ${S(i.seconds, "8")} שניות`
      : `${VIDEO_MODEL.split("/").slice(0, 2).join(" ")} · ${S(i.seconds, "8")} שניות`,
  }),
  async run(input, ctx) {
    const style = S(input.style, "presenter");
    const seconds = ((VIDEO_SECONDS as readonly string[]).includes(S(input.seconds)) ? S(input.seconds) : "8") as VideoSeconds;
    type Script = { hook: string; voiceover: string; caption: string; video_prompt: string; presenter_image_prompt?: string; voice_style?: string };
    const speaking = style === "presenter" || style === "ugc";
    let s: Script | null = null;
    showAgent(ctx, "marketing-short-video-editing-coach", S(input.topic));
    if (ctx.client) {
      s = parseJson<Script>(await runSpecialist({
        client: ctx.client, slug: "marketing-short-video-editing-coach", brand: ctx.brand, conversationId: ctx.conversationId, json: true,
        task: `Write a ${seconds}-second ${style} vertical video about: ${S(input.topic)}. Presenter look: ${S(input.presenter) || "pick one that fits the audience"}.
The spoken line must fit ${seconds} seconds (about ${Number(seconds) * 2.3 | 0} words) in ${lang(ctx) === "he" ? "Hebrew" : "English"}.
Return JSON: {"hook":"first line","voiceover":"exact spoken words, written for the ear (numbers and brand names as they are said)","caption":"post caption",
"presenter_image_prompt":"English prompt for ONE photorealistic vertical portrait of the presenter looking straight at the camera, mouth closed, upper body, in the setting. No text or logos.",
"voice_style":"English instructions for the voice: accent, energy, pace",
"video_prompt":"English prompt for a text-to-video model: subject, setting, camera, lighting, action. ${speaking ? "The presenter speaks the line." : "No speech."} No on-screen text or logos."}`,
      }));
    }
    if (!s) s = { hook: S(input.topic), voiceover: S(input.topic), caption: S(input.topic), video_prompt: `A friendly ${S(input.presenter) || "presenter"} speaks to camera in a bright studio about: ${S(input.topic)}. Vertical, handheld, natural light.` };
    let jobId: string | null = null;
    let extra: Record<string, unknown> = {};
    try {
      if (speaking) {
        const r = await startPresenterVideo({
          imagePrompt: s.presenter_image_prompt || `Photorealistic vertical portrait of ${S(input.presenter) || "a friendly presenter"}, looking at the camera, mouth closed, ${s.video_prompt}`,
          speech: s.voiceover,
          voiceStyle: s.voice_style,
        }, ctx.userId);
        if (r) { jobId = r.job; extra = { presenterImage: r.image, voiceAudio: r.audio, pipeline: AVATAR_MODEL }; }
      } else {
        jobId = await startVideo(s.video_prompt, { seconds, vertical: input.vertical !== false, audio: true }, ctx.userId);
        if (jobId) extra = { pipeline: VIDEO_MODEL };
      }
    } catch (e) {
      // Thrown so the approval card shows "failed" instead of "executed".
      throw new Error(`Video failed to start: ${e instanceof Error ? e.message : e}`);
    }
    const aid = asset(ctx, "video", s.hook, { ...s, ...extra, style, seconds, jobId, demo: !jobId }, undefined, jobId ? "processing" : "demo");
    showAsset(ctx, aid, jobId ? "הסרטון ברינדור (בדרך כלל כמה דקות). אשלח אותו כאן כשיהיה מוכן." : "תסריט הסרטון מוכן. חברו את fal.ai במסך החיבורים כדי לרנדר אותו.");
    return jobId ? `Video job started on ${String(extra.pipeline)} for asset ${aid}. The user will get the video automatically when it is ready.` : `Demo mode: script saved as asset ${aid}; no video rendered because fal.ai is not connected.`;
  },
};

const schedulePost: Skill = {
  name: "schedule_post",
  label: "תזמון ופרסום ברשתות",
  descHe: "מפרסם עכשיו או מתזמן פוסט, קרוסלה, באנר או סרטון ל-Facebook, Instagram, TikTok, LinkedIn ו-YouTube. פרסום הוא פעולה ציבורית, ולכן דורש אישור.",
  description: "Publish now or schedule an existing post/carousel/banner/video asset to Facebook, Instagram, TikTok, LinkedIn and/or YouTube. 'when' is ISO 8601 with timezone, or 'now'. Publishing is public - needs approval.",
  gated: true,
  input_schema: {
    type: "object",
    properties: {
      asset_id: { type: "string" },
      platforms: { type: "array", items: { type: "string", enum: [...PLATFORMS] } },
      when: { type: "string", description: "ISO datetime with timezone, e.g. 2026-11-05T09:00:00+02:00, or 'now'" },
      caption: { type: "string", description: "Override the asset caption" },
    },
    required: ["asset_id", "platforms", "when"],
  },
  summarize: (i) => {
    const when = S(i.when) === "now" ? "עכשיו" : new Date(S(i.when)).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem", dateStyle: "full", timeStyle: "short" });
    return { summary: `פרסום ב-${(i.platforms as string[]).join(", ")} · ${when}`, cost: "ללא עלות" };
  },
  async run(input, ctx) {
    const a = get<{ id: string; data: string; url: string; title: string }>("SELECT * FROM assets WHERE id = ? AND user_id = ?", S(input.asset_id), ctx.userId);
    if (!a) return `Asset ${S(input.asset_id)} not found`;
    const data = parse<{ caption?: string; images?: string[] }>(a.data, {});
    const runAt = S(input.when) === "now" ? new Date() : new Date(S(input.when));
    if (isNaN(runAt.getTime())) return "Invalid date";
    const sid = id("s_");
    insert("scheduled_posts", {
      id: sid, user_id: ctx.userId, brand_id: ctx.brand?.id ?? null, asset_id: a.id, platforms: input.platforms as Platform[],
      caption: S(input.caption) || data.caption || a.title, media_url: a.url || data.images?.[0] || null, run_at: runAt.toISOString(),
    });
    if (S(input.when) === "now") {
      const r = await publishScheduled(sid);
      return `Published now: ${JSON.stringify(r)}`;
    }
    return `Scheduled ${sid} for ${runAt.toISOString()} on ${(input.platforms as string[]).join(", ")}.`;
  },
};

const generateAudiences: Skill = {
  name: "generate_audiences",
  label: "קהלי יעד",
  descHe: "מציע 3 עד 5 קהלי יעד לקמפיין: תחומי עניין, טווח גילים, בסיס לקהל דומה (Lookalike) ומילות מפתח לחיפוש.",
  description: "Propose 3-5 target audiences for a campaign (interests, age range, lookalike seeds, keywords for search).",
  input_schema: { type: "object", properties: { goal: { type: "string" } }, required: ["goal"] },
  async run(input, ctx) {
    showAgent(ctx, "paid-media-paid-social-strategist", S(input.goal));
    if (!ctx.client) return JSON.stringify(demoAudiences(lang(ctx)));
    return runSpecialist({
      client: ctx.client, slug: "paid-media-paid-social-strategist", brand: ctx.brand, conversationId: ctx.conversationId,
      task: `Propose 3-5 target audiences for: ${S(input.goal)}. For each: name, who they are, Meta interests (3-6 real interest names in English), age range, lookalike seed suggestion, and 5 Google search keywords in the customer language. Be concise.`,
    });
  },
};

const createCampaign: Skill = {
  name: "create_ad_campaign",
  label: "קמפיין ממומן ב-Meta / Google",
  descHe: "בונה ומעלה קמפיין ממומן ב-Meta או ב-Google Ads מקצה לקצה: מבנה, קהלים, מודעות, מילות מפתח, תקציב ורדיוס. מוציא כסף, ולכן תמיד דורש אישור.",
  description: "Build and launch a paid campaign end to end on Meta and/or Google Ads: structure (CBO/ABO), audiences, creatives, keywords, budget, location radius. Spends money - always needs approval. Prepare creatives and landing page first.",
  gated: true,
  input_schema: {
    type: "object",
    properties: {
      platforms: { type: "array", items: { type: "string", enum: ["meta", "google"] } },
      name: { type: "string" },
      objective: { type: "string", enum: ["leads", "traffic", "sales", "awareness"] },
      daily_budget: { type: "number", description: "Per platform, in ILS" },
      location_label: { type: "string" },
      lat: { type: "number" }, lng: { type: "number" }, radius_km: { type: "number" },
      age_min: { type: "integer" }, age_max: { type: "integer" },
      genders: { type: "array", items: { type: "string", enum: ["female", "male"] }, description: "Meta only. One value to target a single gender; omit for everyone." },
      interests: { type: "array", items: { type: "string" } },
      keywords: { type: "array", items: { type: "string" } },
      structure: { type: "string", enum: ["CBO", "ABO"] },
      landing_url: { type: "string" },
      creatives: {
        type: "array",
        items: { type: "object", properties: { headline: { type: "string" }, primaryText: { type: "string" }, description: { type: "string" }, imageUrl: { type: "string" }, cta: { type: "string" } }, required: ["headline", "primaryText"] },
      },
    },
    required: ["platforms", "name", "objective", "daily_budget", "landing_url", "creatives"],
  },
  summarize: (i) => ({
    summary: `קמפיין "${S(i.name)}" ב-${(i.platforms as string[]).map((p) => (p === "meta" ? "Meta" : "Google Ads")).join(" + ")} · ${S(i.location_label, "ישראל")}${i.radius_km ? ` (${i.radius_km} ק"מ)` : ""}${Array.isArray(i.genders) && i.genders.length === 1 ? (i.genders[0] === "female" ? " · נשים" : " · גברים") : ""}${i.age_min || i.age_max ? ` · גילאי ${i.age_min ?? 18}-${i.age_max ?? 65}` : ""} · ${(i.creatives as unknown[]).length} מודעות`,
    cost: `₪${Number(i.daily_budget)} ליום${(i.platforms as string[]).length > 1 ? " לכל פלטפורמה" : ""}`,
  }),
  async run(input, ctx) {
    const spec: CampaignSpec = {
      name: S(input.name), objective: S(input.objective, "leads") as CampaignSpec["objective"], dailyBudget: Number(input.daily_budget),
      location: { label: S(input.location_label, "Israel"), lat: input.lat as number | undefined, lng: input.lng as number | undefined, radiusKm: input.radius_km as number | undefined },
      ageMin: input.age_min as number | undefined, ageMax: input.age_max as number | undefined,
      genders: input.genders as CampaignSpec["genders"],
      interests: input.interests as string[] | undefined, keywords: input.keywords as string[] | undefined,
      structure: S(input.structure, "CBO") as "CBO" | "ABO",
      landingUrl: S(input.landing_url).startsWith("/") ? ctx.appUrl + S(input.landing_url) : S(input.landing_url),
      creatives: input.creatives as CampaignSpec["creatives"],
    };
    const lines: string[] = [];
    for (const p of input.platforms as ("meta" | "google")[]) {
      const res = p === "meta" ? await launchMeta(spec, ctx.userId) : await launchGoogle(spec, ctx.userId);
      const cid = id("cp_");
      insert("campaigns", {
        id: cid, user_id: ctx.userId, brand_id: ctx.brand?.id ?? null, platform: p, name: spec.name, objective: spec.objective,
        daily_budget: spec.dailyBudget, location: spec.location, audiences: { interests: spec.interests, ageMin: spec.ageMin, ageMax: spec.ageMax, genders: spec.genders },
        creatives: spec.creatives, keywords: spec.keywords ?? [], structure: spec.structure, landing_url: spec.landingUrl,
        status: res.ok ? (res.demo ? "demo" : "active") : "failed", external_ids: res.externalIds ?? {}, metrics: res.error ? { error: res.error } : {},
      });
      lines.push(`${p}: ${res.ok ? (res.demo ? "saved as DEMO (ad account not connected, nothing was spent)" : `LIVE ${JSON.stringify(res.externalIds)}`) : `FAILED – ${res.error}`}`);
      const aid = asset(ctx, "campaign", spec.name, { campaignId: cid, platform: p, spec, result: res });
      showAsset(ctx, aid, `קמפיין ${p === "meta" ? "Meta" : "Google Ads"}: ${res.ok ? (res.demo ? "נשמר במצב הדגמה" : "באוויר") : "נכשל"}`);
    }
    return lines.join("\n");
  },
};

const report: Skill = {
  name: "performance_report",
  label: "דוח ביצועים",
  descHe: "מסכם מה נוצר ואיך הוא מתפקד: נכסים, פרסומים, צפיות ולידים בדפי הנחיתה, ומצב הקמפיינים בשבוע האחרון.",
  description: "Summarize what was produced and how it performs: assets, scheduled/published posts, landing page views and leads, campaign status and metrics for the last 7 days.",
  input_schema: { type: "object", properties: {} },
  async run(_i, ctx) {
    const since = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 19).replace("T", " ");
    const assets = all<{ type: string; n: number }>("SELECT type, COUNT(*) n FROM assets WHERE user_id = ? AND created_at >= ? GROUP BY type", ctx.userId, since);
    const pages = all<{ title: string; slug: string; views: number; leads: number }>(
      "SELECT lp.title, lp.slug, lp.views, (SELECT COUNT(*) FROM leads l WHERE l.landing_page_id = lp.id) leads FROM landing_pages lp WHERE lp.user_id = ? ORDER BY lp.created_at DESC LIMIT 10", ctx.userId,
    );
    const posts = all<{ status: string; n: number }>("SELECT status, COUNT(*) n FROM scheduled_posts WHERE user_id = ? GROUP BY status", ctx.userId);
    const camps = all<{ name: string; platform: string; status: string; daily_budget: number; metrics: string }>("SELECT name, platform, status, daily_budget, metrics FROM campaigns WHERE user_id = ? ORDER BY created_at DESC LIMIT 10", ctx.userId);
    const data = { assetsLast7Days: assets, landingPages: pages.map((p) => ({ ...p, conversion: p.views ? `${((p.leads / p.views) * 100).toFixed(1)}%` : "-" })), posts, campaigns: camps.map((c) => ({ ...c, metrics: parse(c.metrics, {}) })) };
    asset(ctx, "report", `דוח שבועי ${new Date().toLocaleDateString("he-IL")}`, data);
    return JSON.stringify(data);
  },
};

const listAssets: Skill = {
  name: "list_assets",
  label: "רשימת נכסים",
  descHe: "מציג את הנכסים האחרונים, כדי שמנהל החשבון יוכל להפנות אליהם בתזמון או בקמפיין.",
  description: "List the latest assets (id, type, title, url) so you can reference them for scheduling or campaigns.",
  input_schema: { type: "object", properties: { type: { type: "string" } } },
  async run(input, ctx) {
    const rows = S(input.type)
      ? all("SELECT id, type, title, url, status, created_at FROM assets WHERE user_id = ? AND type = ? ORDER BY created_at DESC LIMIT 20", ctx.userId, S(input.type))
      : all("SELECT id, type, title, url, status, created_at FROM assets WHERE user_id = ? ORDER BY created_at DESC LIMIT 20", ctx.userId);
    return JSON.stringify(rows);
  },
};

export const SKILLS: Skill[] = [analyzeBusiness, marketResearch, consult, createPost, createBanner, buildLanding, createVideo, schedulePost, generateAudiences, createCampaign, report, listAssets];
export const skill = (name: string) => SKILLS.find((s) => s.name === name);

export function toolDefs(): Anthropic.Tool[] {
  return SKILLS.map((s) => ({ name: s.name, description: s.description + (s.gated ? " [Requires the user's approval card before it runs.]" : ""), input_schema: s.input_schema }));
}

// ------------------------------------------------------------------ demo content (no LLM key)

function demoSpecialist(slug: string, task: string, ctx: SkillCtx) {
  const a = getAgent(slug);
  const name = ctx.brand?.name || "העסק";
  return `[מצב הדגמה – ${a?.name}] כדי לקבל עבודה אמיתית מהמומחה, חברו מפתח Claude במסך החיבורים.
סיכום ראשוני עבור ${name}: המשימה "${task.slice(0, 120)}" תטופל ע"י ${a?.name}. כיוונים מומלצים: 1) מסר אחד ברור לקהל אחד, 2) הוכחה חברתית אמיתית, 3) קריאה לפעולה אחת.`;
}

function demoPost(topic: string, type: string, n: number, language: "he" | "en", brand: Brand | null) {
  const he = language === "he";
  const slides = Array.from({ length: n }, (_, i) =>
    i === 0
      ? { headline: topic, sub: he ? "החליקו לצד ←" : "Swipe →" }
      : i === n - 1
        ? { headline: he ? "רוצים לשמוע עוד?" : "Want to know more?", sub: brand?.name || "", cta: he ? "שלחו הודעה" : "Message us" }
        : { headline: he ? `טיפ ${i}` : `Tip ${i}`, sub: he ? `נקודה חשובה על ${topic}` : `A key point about ${topic}` },
  );
  return {
    caption: he ? `${topic} ✨\n\nכל מה שחשוב לדעת – בקצרה. שמרו את הפוסט ושתפו מישהו שזה רלוונטי לו.` : `${topic} ✨\n\nEverything you need to know, in short.`,
    hashtags: he ? ["טיפים", (brand?.name || "עסקקטן").replace(/\s/g, "")] : ["tips"],
    slides: type === "carousel" ? slides : [{ headline: topic, sub: brand?.description?.slice(0, 80) || "", cta: he ? "לפרטים" : "Learn more" }],
  };
}

function demoAudiences(language: "he" | "en") {
  const he = language === "he";
  return [
    { name: he ? "בעלי עניין מקומיים" : "Local intenders", interests: ["Small business", "Shopping"], age: "25-54", keywords: [] },
    { name: he ? "לקוחות דומים (Lookalike 1%)" : "Lookalike 1%", seed: he ? "רשימת לקוחות / לידים" : "Customer list", age: "25-60" },
    { name: he ? "רימרקטינג – מבקרי דף הנחיתה" : "Retargeting – page visitors", window: "30d" },
  ];
}

export { coreTeam };
