import OpenAI from "openai";
import { creds } from "../connections";
import fs from "node:fs";
import path from "node:path";
import { saveFile, UPLOAD_DIR } from "../storage";

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

// ---------------- Video (fal.ai queue) ----------------
// OpenAI retired the Sora video API on 2026-09-24, so videos render on fal.ai.
// The model is configurable; any fal text-to-video model that takes a prompt works.
export const VIDEO_MODEL = process.env.FAL_VIDEO_MODEL || "bytedance/seedance-2.0/text-to-video";
export const VIDEO_SECONDS = ["4", "5", "8", "10", "12", "15"] as const;
export type VideoSeconds = (typeof VIDEO_SECONDS)[number];

type FalJob = { provider: "fal"; model: string; status_url: string; response_url: string };

async function falSubmit(model: string, input: Record<string, unknown>, userId?: string | null): Promise<string | null> {
  const key = creds("fal", userId).FAL_KEY;
  if (!key) return null;
  const r = await fetch(`https://queue.fal.run/${model}`, {
    method: "POST",
    headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const j = (await r.json().catch(() => ({}))) as { status_url?: string; response_url?: string; detail?: unknown };
  if (!r.ok || !j.status_url || !j.response_url) throw new Error(`fal ${r.status}: ${JSON.stringify(j.detail ?? j).slice(0, 300)}`);
  const job: FalJob = { provider: "fal", model, status_url: j.status_url, response_url: j.response_url };
  return JSON.stringify(job);
}

/** Text-to-video (no speaker). Returns a job descriptor (JSON string), or null in demo mode. */
export async function startVideo(prompt: string, opts: { seconds?: VideoSeconds; vertical?: boolean; audio?: boolean }, userId?: string | null) {
  return falSubmit(VIDEO_MODEL, {
    prompt,
    duration: opts.seconds ?? "8",
    aspect_ratio: opts.vertical === false ? "16:9" : "9:16",
    resolution: process.env.FAL_VIDEO_RESOLUTION || "720p",
    generate_audio: opts.audio ?? true,
  }, userId);
}

// ---------------- Talking presenter (image + Hebrew voice + lip-sync) ----------------
// Video models that invent their own speech garble Hebrew, so the voice is made by a
// TTS engine and an avatar model animates the presenter to that exact audio.
export const AVATAR_MODEL = process.env.FAL_AVATAR_MODEL || "fal-ai/kling-video/ai-avatar/v2/standard";
export const TTS_MODEL = process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts";

/** Speech audio (mp3) from OpenAI TTS. */
export async function speak(text: string, opts: { voice?: string; style?: string }, userId?: string | null): Promise<Buffer> {
  const key = creds("openai", userId).OPENAI_API_KEY;
  if (!key) throw new Error("OpenAI is not connected (needed for the voice-over)");
  const client = new OpenAI({ apiKey: key });
  const r = await client.audio.speech.create({
    model: TTS_MODEL,
    voice: opts.voice || "coral",
    input: text,
    instructions: opts.style || "Speak natural native Israeli Hebrew (or the language of the text), warm and energetic, like a social media reel.",
    response_format: "mp3",
  });
  return Buffer.from(await r.arrayBuffer());
}

function toDataUri(buf: Buffer, mime: string) {
  return `data:${mime};base64,${buf.toString("base64")}`;
}

function localOrRemote(url: string, mime: string): string {
  if (url.startsWith("/files/")) return toDataUri(fs.readFileSync(path.join(UPLOAD_DIR, url.slice(7))), mime);
  return url;
}

/**
 * Presenter video: generates the presenter photo and the voice-over, then submits a
 * lip-sync job. Returns the job plus the image/audio it used, or null in demo mode.
 */
export async function startPresenterVideo(
  opts: { imagePrompt: string; speech: string; voice?: string; voiceStyle?: string },
  userId?: string | null,
): Promise<{ job: string; image: string; audio: string } | null> {
  if (!creds("fal", userId).FAL_KEY) return null;
  const img = await generateImage(opts.imagePrompt, "story", userId);
  if (!img) throw new Error("Could not create the presenter image (connect OpenAI or fal.ai for images)");
  const audioBuf = await speak(opts.speech, { voice: opts.voice, style: opts.voiceStyle }, userId);
  const audio = saveFile(audioBuf, "audio/mpeg");
  const job = await falSubmit(AVATAR_MODEL, {
    image_url: localOrRemote(img.url, "image/png"),
    audio_url: toDataUri(audioBuf, "audio/mpeg"),
    prompt: "Natural, friendly presenter speaking to camera, subtle head and hand movement, steady framing.",
  }, userId);
  return job ? { job, image: img.url, audio } : null;
}

/** Polls a video job. When done, downloads the mp4 and returns its local URL. */
export async function pollVideo(jobId: string, userId?: string | null): Promise<{ status: string; url?: string; error?: string }> {
  let job: FalJob;
  try {
    job = JSON.parse(jobId) as FalJob;
  } catch {
    return { status: "failed", error: "Old Sora job – OpenAI retired that API" };
  }
  const key = creds("fal", userId).FAL_KEY;
  if (!key) return { status: "failed", error: "fal.ai is not connected" };
  const headers = { Authorization: `Key ${key}` };
  const st = (await (await fetch(job.status_url, { headers })).json()) as { status?: string; error?: string };
  if (st.status === "COMPLETED") {
    const res = await fetch(job.response_url, { headers });
    const out = (await res.json()) as { video?: { url?: string }; detail?: unknown };
    if (!res.ok || !out.video?.url) return { status: "failed", error: `fal result ${res.status}: ${JSON.stringify(out.detail ?? out).slice(0, 300)}` };
    const buf = Buffer.from(await (await fetch(out.video.url)).arrayBuffer());
    return { status: "completed", url: saveFile(buf, "video/mp4") };
  }
  if (st.status === "IN_QUEUE" || st.status === "IN_PROGRESS") return { status: "processing" };
  return { status: "failed", error: st.error || `fal status ${st.status ?? "unknown"}` };
}
