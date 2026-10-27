"use client";
import { useEffect, useState } from "react";
import PageHead from "@/components/PageHead";

type P = { key: string; label: string; docs: string; fields: string[]; connected: boolean; savedFields: string[] };

export default function Connections() {
  const [ps, setPs] = useState<P[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  useEffect(() => { fetch("/api/connections").then((r) => r.json()).then((j) => setPs(j.providers)); }, []);
  async function save(key: string) {
    const r = await fetch("/api/connections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: key, data: form }) });
    const j = await r.json();
    setPs(j.providers); setOpen(null); setForm({});
  }
  const appUrl = typeof window !== "undefined" ? location.origin : "";
  return (
    <div className="p-4 md:p-8">
      <PageHead title="חיבורים" sub="כל חיבור אופציונלי. מה שלא מחובר רץ במצב הדגמה ולא מוציא כסף. מפתחות נשמרים בשרת שלך ולא מוצגים שוב." />
      <div className="grid gap-4 md:grid-cols-2">
        {ps.map((p) => (
          <div key={p.key} className="card p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold">{p.label}</p>
              <span className={`chip ${p.connected ? "!bg-green-100 !text-green-800" : ""}`}>{p.connected ? "● מחובר" : "הדגמה"}</span>
            </div>
            <a href={p.docs} target="_blank" className="muted text-xs underline" dir="ltr">{p.docs}</a>
            {p.key === "whatsapp" && <p className="muted mt-2 text-xs">כתובת ה-Webhook ל-Meta: <span dir="ltr" className="font-mono">{appUrl}/api/whatsapp/webhook</span> · WhatsApp משתמש במפתחות הסביבה של השרת (המספר של הסוכנות).</p>}
            {open === p.key ? (
              <div className="mt-3 space-y-2">
                {p.fields.map((f) => (
                  <label key={f} className="block"><span className="font-mono text-xs" dir="ltr">{f}{p.savedFields.includes(f) ? " (שמור)" : ""}</span>
                    <input className="input !py-2 font-mono text-sm" dir="ltr" type="password" autoComplete="off" placeholder={p.savedFields.includes(f) ? "••••••• (להשאיר ריק = ללא שינוי)" : ""} onChange={(e) => setForm({ ...form, [f]: e.target.value })} />
                  </label>
                ))}
                <div className="flex gap-2 pt-1"><button className="btn !py-2 text-sm" onClick={() => save(p.key)}>שמירה</button><button className="btn-ghost !py-2 text-sm" onClick={() => setOpen(null)}>ביטול</button></div>
              </div>
            ) : (
              <button className="btn-ghost mt-3 !py-1.5 text-sm" onClick={() => { setOpen(p.key); setForm({}); }}>{p.connected ? "עדכון" : "חיבור"}</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
