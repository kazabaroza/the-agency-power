import fs from "node:fs";
import path from "node:path";
import { creds, isConnected } from "../connections";
import { absoluteUrl, UPLOAD_DIR } from "../storage";

export const PLATFORMS = ["facebook", "instagram", "linkedin", "tiktok", "youtube"] as const;
export type Platform = (typeof PLATFORMS)[number];

const GRAPH = `https://graph.facebook.com/${process.env.META_GRAPH_VERSION || "v23.0"}`;

export type PublishResult = { platform: Platform; ok: boolean; demo?: boolean; id?: string; url?: string; error?: string };

type Post = { caption: string; mediaUrl?: string | null; title?: string };

const isVideo = (u?: string | null) => !!u && /\.mp4(\?|$)/i.test(u);

export function platformConnected(p: Platform, userId: string) {
  // With a Meta token the page and Instagram account are found at publish time.
  if (p === "facebook" || p === "instagram") return isConnected("meta", userId);
  if (p === "linkedin") return isConnected("linkedin", userId);
  if (p === "tiktok") return isConnected("tiktok", userId);
  return isConnected("youtube", userId);
}

export async function publish(platform: Platform, post: Post, userId: string): Promise<PublishResult> {
  if (!platformConnected(platform, userId)) {
    return { platform, ok: true, demo: true, id: `demo-${Date.now()}` };
  }
  try {
    switch (platform) {
      case "facebook": return await facebook(post, userId);
      case "instagram": return await instagram(post, userId);
      case "linkedin": return await linkedin(post, userId);
      case "tiktok": return await tiktok(post, userId);
      case "youtube": return await youtube(post, userId);
    }
  } catch (e) {
    return { platform, ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function graph(pathname: string, params: Record<string, string>, token: string) {
  const body = new URLSearchParams({ ...params, access_token: token });
  const r = await fetch(`${GRAPH}/${pathname}`, { method: "POST", body, signal: AbortSignal.timeout(60000) });
  const j = (await r.json()) as { id?: string; post_id?: string; error?: { message: string } };
  if (!r.ok || j.error) throw new Error(j.error?.message || `Graph error ${r.status}`);
  return j;
}

async function graphGet<T>(pathname: string, token: string): Promise<T> {
  const sep = pathname.includes("?") ? "&" : "?";
  const r = await fetch(`${GRAPH}/${pathname}${sep}access_token=${encodeURIComponent(token)}`, { signal: AbortSignal.timeout(20000) });
  const j = (await r.json()) as T & { error?: { message: string } };
  if (!r.ok || j.error) throw new Error(j.error?.message || `Graph error ${r.status}`);
  return j;
}

/**
 * Finds the Page (and its Instagram account) the token can post to. META_PAGE_ID and
 * META_IG_USER_ID win when set; otherwise the token's only Page is used.
 * Posting to a Page needs that Page's own token, which is read with the user/system token.
 */
export async function metaTargets(userId: string | null) {
  const c = creds("meta", userId);
  const token = c.META_ACCESS_TOKEN;
  if (!token) throw new Error("META_ACCESS_TOKEN חסר");
  const pages = await graphGet<{ data: { id: string; name: string; access_token?: string; instagram_business_account?: { id: string } }[] }>(
    "me/accounts?fields=id,name,access_token,instagram_business_account&limit=50", token,
  ).catch(() => ({ data: [] }));
  let page = c.META_PAGE_ID ? pages.data.find((p) => p.id === c.META_PAGE_ID) : pages.data.length === 1 ? pages.data[0] : undefined;
  if (!page && c.META_PAGE_ID) {
    const p = await graphGet<{ id: string; name: string; access_token?: string; instagram_business_account?: { id: string } }>(
      `${c.META_PAGE_ID}?fields=id,name,access_token,instagram_business_account`, token,
    ).catch(() => undefined);
    if (p) page = p;
  }
  return {
    token,
    pageId: page?.id ?? c.META_PAGE_ID,
    pageName: page?.name,
    pageToken: page?.access_token ?? token,
    igUserId: c.META_IG_USER_ID || page?.instagram_business_account?.id,
    pagesSeen: pages.data.length,
  };
}

async function facebook(post: Post, userId: string): Promise<PublishResult> {
  const t = await metaTargets(userId);
  if (!t.pageId) throw new Error("לא נמצא עמוד פייסבוק. צריך להגדיר META_PAGE_ID או לתת לטוקן גישה לעמוד");
  const page = t.pageId;
  const token = t.pageToken;
  let j;
  if (isVideo(post.mediaUrl)) j = await graph(`${page}/videos`, { file_url: absoluteUrl(post.mediaUrl!), description: post.caption }, token);
  else if (post.mediaUrl) j = await graph(`${page}/photos`, { url: absoluteUrl(post.mediaUrl), caption: post.caption }, token);
  else j = await graph(`${page}/feed`, { message: post.caption }, token);
  const pid = j.post_id || j.id;
  return { platform: "facebook", ok: true, id: pid, url: pid ? `https://facebook.com/${pid}` : undefined };
}

async function instagram(post: Post, userId: string): Promise<PublishResult> {
  if (!post.mediaUrl) throw new Error("באינסטגרם חייבים תמונה או סרטון");
  const t = await metaTargets(userId);
  const ig = t.igUserId;
  if (!ig) throw new Error("לא נמצא חשבון אינסטגרם עסקי שמחובר לעמוד הפייסבוק");
  const token = t.token;
  const media = isVideo(post.mediaUrl)
    ? await graph(`${ig}/media`, { media_type: "REELS", video_url: absoluteUrl(post.mediaUrl), caption: post.caption }, token)
    : await graph(`${ig}/media`, { image_url: absoluteUrl(post.mediaUrl), caption: post.caption }, token);
  // Videos need processing time before they can be published.
  for (let i = 0; i < 30 && isVideo(post.mediaUrl); i++) {
    const s = await graphGet<{ status_code?: string }>(`${media.id}?fields=status_code`, token);
    if (s.status_code === "FINISHED") break;
    if (s.status_code === "ERROR") throw new Error("Instagram could not process the video");
    await new Promise((r) => setTimeout(r, 5000));
  }
  const pub = await graph(`${ig}/media_publish`, { creation_id: media.id! }, token);
  return { platform: "instagram", ok: true, id: pub.id };
}

async function linkedin(post: Post, userId: string): Promise<PublishResult> {
  const c = creds("linkedin", userId);
  const r = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${c.LINKEDIN_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": process.env.LINKEDIN_VERSION || "202510",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author: c.LINKEDIN_AUTHOR_URN,
      commentary: post.caption + (post.mediaUrl ? `\n\n${absoluteUrl(post.mediaUrl)}` : ""),
      visibility: "PUBLIC",
      distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  });
  if (!r.ok) throw new Error(`LinkedIn ${r.status}: ${await r.text()}`);
  return { platform: "linkedin", ok: true, id: r.headers.get("x-restli-id") ?? undefined };
}

async function tiktok(post: Post, userId: string): Promise<PublishResult> {
  const token = creds("tiktok", userId).TIKTOK_ACCESS_TOKEN;
  if (!post.mediaUrl) throw new Error("TikTok requires a video or photo");
  const video = isVideo(post.mediaUrl);
  const url = video ? "https://open.tiktokapis.com/v2/post/publish/video/init/" : "https://open.tiktokapis.com/v2/post/publish/content/init/";
  const body = video
    ? { post_info: { title: post.caption.slice(0, 2200), privacy_level: "PUBLIC_TO_EVERYONE" }, source_info: { source: "PULL_FROM_URL", video_url: absoluteUrl(post.mediaUrl) } }
    : {
        post_info: { title: (post.title || post.caption).slice(0, 90), description: post.caption.slice(0, 4000), privacy_level: "PUBLIC_TO_EVERYONE" },
        source_info: { source: "PULL_FROM_URL", photo_images: [absoluteUrl(post.mediaUrl)], photo_cover_index: 0 },
        post_mode: "DIRECT_POST",
        media_type: "PHOTO",
      };
  const r = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=UTF-8" }, body: JSON.stringify(body) });
  const j = (await r.json()) as { data?: { publish_id?: string }; error?: { code: string; message: string } };
  if (!r.ok || (j.error && j.error.code !== "ok")) throw new Error(`TikTok: ${j.error?.message || r.status}`);
  return { platform: "tiktok", ok: true, id: j.data?.publish_id };
}

async function youtube(post: Post, userId: string): Promise<PublishResult> {
  const token = creds("youtube", userId).YOUTUBE_ACCESS_TOKEN;
  if (!isVideo(post.mediaUrl)) throw new Error("YouTube requires a video");
  let bytes: Buffer;
  if (post.mediaUrl!.startsWith("/files/")) bytes = fs.readFileSync(path.join(UPLOAD_DIR, post.mediaUrl!.slice(7)));
  else bytes = Buffer.from(await (await fetch(post.mediaUrl!)).arrayBuffer());
  const init = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Upload-Content-Type": "video/mp4", "X-Upload-Content-Length": String(bytes.length) },
    body: JSON.stringify({
      snippet: { title: (post.title || post.caption).slice(0, 95) + " #Shorts", description: post.caption },
      status: { privacyStatus: "public", selfDeclaredMadeForKids: false },
    }),
  });
  const loc = init.headers.get("location");
  if (!init.ok || !loc) throw new Error(`YouTube init ${init.status}: ${await init.text()}`);
  const up = await fetch(loc, { method: "PUT", headers: { "Content-Type": "video/mp4" }, body: new Uint8Array(bytes) });
  const j = (await up.json()) as { id?: string; error?: { message: string } };
  if (!up.ok) throw new Error(j.error?.message || `YouTube upload ${up.status}`);
  return { platform: "youtube", ok: true, id: j.id, url: j.id ? `https://youtube.com/shorts/${j.id}` : undefined };
}
