"use client";
import { useState } from "react";

export type Asset = { id: string; type: string; title: string; data: string; url: string | null; status: string; created_at: string };

const TYPE_LABEL: Record<string, string> = {
  post: "פוסט", carousel: "קרוסלה", banner: "באנר", landing_page: "דף נחיתה", video: "סרטון", campaign: "קמפיין", research: "מחקר", report: "דוח",
};

export default function AssetCard({ a }: { a: Asset }) {
  const data = safe(a.data);
  const images: string[] = Array.isArray(data.images) ? data.images : [];
  const [i, setI] = useState(0);
  const [copied, setCopied] = useState(false);

  return (
    <div className="card overflow-hidden">
      {(a.type === "post" || a.type === "carousel" || a.type === "banner") && images.length > 0 && (
        <div className="relative bg-black/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[i]} alt={a.title} className="mx-auto max-h-[420px] w-auto" />
          {images.length > 1 && (
            <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1">
              {images.map((_, k) => <button key={k} onClick={() => setI(k)} className={`h-2 w-2 rounded-full ${k === i ? "bg-brand" : "bg-white/80"}`} aria-label={`שקף ${k + 1}`} />)}
            </div>
          )}
        </div>
      )}
      {a.type === "video" && a.url && <video src={a.url} controls playsInline className="mx-auto max-h-[480px] w-auto bg-black" />}
      {a.type === "landing_page" && a.url && <iframe src={a.url} title={a.title} className="h-72 w-full border-0 bg-white" loading="lazy" />}
      <div className="space-y-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="chip">{TYPE_LABEL[a.type] ?? a.type}</span>
          {a.status !== "ready" && <span className="chip !bg-amber-100 !text-amber-900">{({ processing: "ברינדור…", demo: "הדגמה", failed: "נכשל" } as Record<string, string>)[a.status] ?? a.status}</span>}
        </div>
        <p className="font-bold">{a.title}</p>
        {typeof data.caption === "string" && data.caption && (
          <div>
            <p className="muted line-clamp-4 whitespace-pre-wrap text-sm">{data.caption}</p>
            <button className="mt-1 text-xs font-semibold text-brand" onClick={() => { navigator.clipboard.writeText(data.caption); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? "הועתק ✔" : "העתקת הטקסט"}</button>
          </div>
        )}
        {a.type === "video" && (
          <div className="muted space-y-1 text-sm">
            {data.voiceover && <p><b>טקסט:</b> {data.voiceover}</p>}
            {data.sora_prompt && <details><summary className="cursor-pointer">פרומפט ל-Sora</summary><p dir="ltr" className="text-xs">{data.sora_prompt}</p></details>}
          </div>
        )}
        {(a.type === "research" || a.type === "report") && (
          <pre className="muted max-h-48 overflow-auto whitespace-pre-wrap text-xs" dir="auto">{typeof data.text === "string" ? data.text : JSON.stringify(data, null, 2)}</pre>
        )}
        {a.type === "campaign" && (
          <p className="muted text-sm">{data.platform === "meta" ? "Meta" : "Google Ads"} · ₪{data.spec?.dailyBudget} ליום · {data.result?.demo ? "הדגמה – לא הוצא כסף" : data.result?.ok ? "באוויר" : `נכשל: ${data.result?.error ?? ""}`}</p>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          {a.url && <a className="btn-ghost !px-3 !py-1.5 text-sm" href={a.url} target="_blank" rel="noreferrer">פתיחה</a>}
          {images.length > 0 && <a className="btn-ghost !px-3 !py-1.5 text-sm" href={images[i]} download>הורדה</a>}
        </div>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safe(s: string): any {
  try { return JSON.parse(s || "{}"); } catch { return {}; }
}
