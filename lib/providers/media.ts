import OpenAI from "openai";
import { creds } from "../connections";
import { saveFile } from "../storage";

export type Brand = {
  id: string; name: string; website?: string | null; description?: string | null; audience?: string | null;
  tone?: string | null; colors?: string | null; logo_url?: string | null; language?: string | null;
  phone?: string | null; location?: string | null;
};

export function brandColors(b?: Brand | null): [string, string, string] {
  try {
    const c = JSON.parse(b?.colors || "[]") as string[];
    if (c.length >= 2) return [c[0], c[1], c[2] || "#ffffff"];
  } catch {}
  return ["#5b3df5", "#ff7a45", "#ffffff"];
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Wraps text into lines of roughly `max` characters for SVG output. */
function wrap(text: string, max: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > max && cur) {
      lines.push(cur);
      cur = w;
    } else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 5);
}

export const FORMATS = {
  feed: { w: 1080, h: 1080, label: "פוסט ריבועי 1:1" },
  portrait: { w: 1080, h: 1350, label: "פיד 4:5" },
  story: { w: 1080, h: 1920, label: "סטורי / רילס 9:16" },
  wide: { w: 1200, h: 628, label: "באנר רחב" },
} as const;
export type Format = keyof typeof FORMATS;

/** Designed SVG banner. Always works, no external service needed. */
export function svgBanner(opts: {
  headline: string; sub?: string; cta?: string; brand?: Brand | null; format?: Format; slide?: string; bgImage?: string;
}) {
  const { w, h } = FORMATS[opts.format ?? "feed"];
  const [c1, c2, c3] = brandColors(opts.brand);
  const rtl = /[֐-׿؀-ۿ]/.test(opts.headline);
  const anchor = rtl ? "end" : "start";
  const x = rtl ? w - 90 : 90;
  const fs1 = Math.round(w / 12);
  const head = wrap(opts.headline, Math.round(w / fs1 * 1.7));
  const sub = opts.sub ? wrap(opts.sub, Math.round(w / 22)) : [];
  let y = h * 0.36;
  const headSvg = head.map((l, i) => `<text x="${x}" y="${y + i * fs1 * 1.15}" font-size="${fs1}" font-weight="800" fill="${c3}" text-anchor="${anchor}">${esc(l)}</text>`).join("");
  y += head.length * fs1 * 1.15 + 30;
  const subSvg = sub.map((l, i) => `<text x="${x}" y="${y + i * 52}" font-size="40" fill="${c3}" opacity=".9" text-anchor="${anchor}">${esc(l)}</text>`).join("");
  const ctaW = Math.min(w - 180, (opts.cta?.length ?? 0) * 26 + 120);
  const ctaX = rtl ? w - 90 - ctaW : 90;
  const cta = opts.cta
    ? `<rect x="${ctaX}" y="${h - 220}" rx="44" width="${ctaW}" height="88" fill="${c2}"/><text x="${ctaX + ctaW / 2}" y="${h - 162}" font-size="38" font-weight="700" fill="#fff" text-anchor="middle">${esc(opts.cta)}</text>`
    : "";
  const bg = opts.bgImage
    ? `<image href="${esc(opts.bgImage)}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/><rect width="${w}" height="${h}" fill="url(#g)" opacity=".82"/>`
    : `<rect width="${w}" height="${h}" fill="url(#g)"/><circle cx="${w * 0.85}" cy="${h * 0.15}" r="${w * 0.28}" fill="${c2}" opacity=".35"/><circle cx="${w * 0.1}" cy="${h * 0.95}" r="${w * 0.22}" fill="#fff" opacity=".08"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="Heebo, Assistant, Arial, sans-serif" direction="${rtl ? "rtl" : "ltr"}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${shade(c1, -35)}"/></linearGradient></defs>
${bg}
${opts.slide ? `<text x="${rtl ? 90 : w - 90}" y="110" font-size="34" fill="${c3}" opacity=".7" text-anchor="${rtl ? "start" : "end"}">${esc(opts.slide)}</text>` : ""}
<text x="${x}" y="120" font-size="36" font-weight="700" fill="${c3}" opacity=".85" text-anchor="${anchor}">${esc(opts.brand?.name ?? "")}</text>
${headSvg}${subSvg}${cta}
</svg>`;
}

function shade(hex: string, pct: number) {
  const n = parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + (v * pct) / 100)));
  return "#" + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map((v) => v.toString(16).padStart(2, "0")).join("");
}

/** AI background/photo generation: OpenAI gpt-image, then fal.ai, else null. */
export async function generateImage(prompt: string, format: Format, userId?: string | null): Promise<{ url: string; provider: string } | null> {
  const oa = creds("openai", userId).OPENAI_API_KEY;
  const size = format === "feed" ? "1024x1024" : format === "wide" ? "1536x1024" : "1024x1536";
  if (oa) {
    try {
      const client = new OpenAI({ apiKey: oa });
      const res = await client.images.generate({ model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2", prompt, size });
      const b64 = res.data?.[0]?.b64_json;
      if (b64) return { url: saveFile(Buffer.from(b64, "base64"), "image/png"), provider: "openai" };
    } catch (e) {
      console.error("[image] openai failed", e);
    }
  }
  const fal = creds("fal", userId).FAL_KEY;
  if (fal) {
    try {
      const model = process.env.FAL_IMAGE_MODEL || "fal-ai/flux/schnell";
      const r = await fetch(`https://fal.run/${model}`, {
        method: "POST",
        headers: { Authorization: `Key ${fal}`, "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, image_size: format === "feed" ? "square_hd" : format === "wide" ? "landscape_16_9" : "portrait_16_9" }),
      });
      const j = (await r.json()) as { images?: { url: string }[] };
      if (j.images?.[0]?.url) return { url: j.images[0].url, provider: "fal" };
    } catch (e) {
      console.error("[image] fal failed", e);
    }
  }
  return null;
}

export async function stockPhotos(query: string, userId?: string | null, count = 6): Promise<string[]> {
  const key = creds("unsplash", userId).UNSPLASH_ACCESS_KEY;
  if (!key) return [];
  try {
    const r = await fetch(`https://api.unsplash.com/search/photos?per_page=${count}&query=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Client-ID ${key}` },
    });
    const j = (await r.json()) as { results?: { urls: { regular: string } }[] };
    return (j.results ?? []).map((p) => p.urls.regular);
  } catch {
    return [];
  }
}

/** Starts a Sora 2 video job. Returns the provider job id, or null in demo mode. */
export async function startVideo(prompt: string, opts: { seconds?: "4" | "8" | "12"; vertical?: boolean; pro?: boolean }, userId?: string | null) {
  const key = creds("openai", userId).OPENAI_API_KEY;
  if (!key) return null;
  const client = new OpenAI({ apiKey: key });
  const job = await client.videos.create({
    model: opts.pro === false ? "sora-2" : "sora-2-pro",
    prompt,
    seconds: opts.seconds ?? "12",
    size: opts.vertical === false ? "1280x720" : "720x1280",
  });
  return job.id;
}

/** Polls a Sora job. When done, downloads the mp4 and returns its local URL. */
export async function pollVideo(jobId: string, userId?: string | null): Promise<{ status: string; url?: string; progress?: number; error?: string }> {
  const key = creds("openai", userId).OPENAI_API_KEY;
  if (!key) return { status: "failed", error: "OpenAI is not connected" };
  const client = new OpenAI({ apiKey: key });
  const v = await client.videos.retrieve(jobId);
  if (v.status === "completed") {
    const res = await client.videos.downloadContent(jobId);
    const buf = Buffer.from(await res.arrayBuffer());
    return { status: "completed", url: saveFile(buf, "video/mp4") };
  }
  if (v.status === "failed") return { status: "failed", error: v.error?.message ?? "video failed" };
  return { status: v.status, progress: v.progress };
}
