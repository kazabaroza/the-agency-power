"use client";
import { useEffect, useState } from "react";
import PageHead from "@/components/PageHead";

type Post = { id: string; platforms: string; caption: string; media_url: string | null; run_at: string; status: string; result: string | null };
const ST: Record<string, string> = { scheduled: "מתוזמן", publishing: "מפרסם…", published: "פורסם", partial: "פורסם חלקית", failed: "נכשל", cancelled: "בוטל" };

export default function Schedule() {
  const [posts, setPosts] = useState<Post[]>([]);
  const load = () => fetch("/api/scheduled").then((r) => r.json()).then((j) => setPosts(j.posts));
  useEffect(() => { load(); }, []);
  return (
    <div className="p-4 md:p-8">
      <PageHead title="תזמון פרסומים" sub='לתזמון חדש כתבו בשיחה, למשל: "תפרסם את הקרוסלה ביום חמישי ב-9 בבוקר באינסטגרם ובפייסבוק".' />
      {posts.length === 0 ? <p className="muted">אין פרסומים מתוזמנים.</p> : (
        <div className="space-y-3">
          {posts.map((p) => (
            <div key={p.id} className="card flex flex-wrap items-center gap-4 p-4">
              {p.media_url && (/\.mp4$/.test(p.media_url) ? <video src={p.media_url} className="h-20 w-20 rounded-lg object-cover" /> : <img src={p.media_url} alt="" className="h-20 w-20 rounded-lg object-cover" />)}
              <div className="min-w-0 flex-1">
                <p className="font-bold">{new Date(p.run_at).toLocaleString("he-IL", { dateStyle: "full", timeStyle: "short" })}</p>
                <p className="muted text-sm">{(JSON.parse(p.platforms) as string[]).join(" · ")}</p>
                <p className="muted line-clamp-2 text-sm">{p.caption}</p>
                {p.result && <p className="muted mt-1 text-xs" dir="ltr">{(JSON.parse(p.result) as { platform: string; ok: boolean; demo?: boolean; error?: string }[]).map((r) => `${r.platform}: ${r.ok ? (r.demo ? "demo" : "ok") : r.error}`).join(" | ")}</p>}
              </div>
              <span className="chip">{ST[p.status] ?? p.status}</span>
              {p.status === "scheduled" && <button className="btn-ghost !py-1.5 text-sm" onClick={async () => { await fetch(`/api/scheduled?id=${p.id}`, { method: "DELETE" }); load(); }}>ביטול</button>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
