"use client";
import { useEffect, useState } from "react";
import PageHead from "@/components/PageHead";

type Brand = { id?: string; name: string; website: string; description: string; audience: string; tone: string; colors: string; language: string; phone: string; location: string };
const EMPTY: Brand = { name: "", website: "", description: "", audience: "", tone: "", colors: '["#5b3df5","#ff7a45"]', language: "he", phone: "", location: "" };

export default function BrandPage() {
  const [b, setB] = useState<Brand>(EMPTY);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    fetch("/api/brands").then((r) => r.json()).then((j) => { if (j.brands?.[0]) setB({ ...EMPTY, ...Object.fromEntries(Object.entries(j.brands[0]).map(([k, v]) => [k, v ?? ""])) } as Brand); });
  }, []);
  const colors: string[] = (() => { try { return JSON.parse(b.colors || "[]"); } catch { return []; } })();
  const setColor = (i: number, v: string) => { const c = [...colors]; c[i] = v; setB({ ...b, colors: JSON.stringify(c) }); };
  async function save(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/brands", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...b, colors }) });
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  }
  const field = (k: keyof Brand, label: string, opts: { area?: boolean; ltr?: boolean; ph?: string } = {}) => (
    <label className="block"><span className="mb-1 block text-sm font-semibold">{label}</span>
      {opts.area ? <textarea className="input" rows={3} value={b[k] ?? ""} placeholder={opts.ph} onChange={(e) => setB({ ...b, [k]: e.target.value })} />
        : <input className="input" dir={opts.ltr ? "ltr" : undefined} value={b[k] ?? ""} placeholder={opts.ph} onChange={(e) => setB({ ...b, [k]: e.target.value })} />}
    </label>
  );
  return (
    <div className="p-4 md:p-8">
      <PageHead title="פרופיל מותג" sub="כל הצוות משתמש בפרופיל הזה. אפשר גם פשוט לשלוח קישור לאתר בשיחה והסוכנות תמלא אותו." />
      <form onSubmit={save} className="card max-w-2xl space-y-4 p-6">
        {field("name", "שם העסק")}
        {field("website", "אתר / עמוד ברשתות", { ltr: true, ph: "https://" })}
        {field("description", "מה העסק עושה", { area: true })}
        {field("audience", "קהל יעד", { area: true })}
        {field("tone", "טון דיבור", { ph: "חם, מקצועי, הומוריסטי…" })}
        {field("location", "אזור פעילות", { ph: "חיפה והקריות" })}
        {field("phone", "וואטסאפ לדפי נחיתה", { ltr: true, ph: "9725XXXXXXXX" })}
        <div className="flex flex-wrap gap-6">
          <label className="block"><span className="mb-1 block text-sm font-semibold">צבע ראשי</span><input type="color" value={colors[0] || "#5b3df5"} onChange={(e) => setColor(0, e.target.value)} className="h-11 w-20 rounded-lg" /></label>
          <label className="block"><span className="mb-1 block text-sm font-semibold">צבע הדגשה</span><input type="color" value={colors[1] || "#ff7a45"} onChange={(e) => setColor(1, e.target.value)} className="h-11 w-20 rounded-lg" /></label>
          <label className="block"><span className="mb-1 block text-sm font-semibold">שפת התוכן</span>
            <select className="input" value={b.language} onChange={(e) => setB({ ...b, language: e.target.value })}><option value="he">עברית</option><option value="en">English</option></select></label>
        </div>
        <button className="btn">{saved ? "נשמר ✔" : "שמירה"}</button>
      </form>
    </div>
  );
}
