"use client";
import { useEffect, useRef, useState } from "react";
import AssetCard, { type Asset } from "./AssetCard";

type Msg = { id: string; role: string; kind: string; text: string; meta: Record<string, unknown>; created_at: string };

const SUGGESTIONS = [
  "הנה האתר שלי: ",
  "תכין קרוסלה של 5 שקפים עם טיפים ללקוחות",
  "תבנה דף נחיתה ללידים עם השוואה למתחרים",
  "תעשה סרטון UGC של 12 שניות על המבצע",
  "תכין קמפיין Meta ב-120 ₪ ליום ברדיוס 15 ק\"מ",
  "דוח ביצועים לשבוע האחרון",
];

export default function Chat() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [assets, setAssets] = useState<Record<string, Asset>>({});
  const [approvals, setApprovals] = useState<Record<string, string>>({});
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function load() {
    const r = await fetch("/api/messages");
    if (!r.ok) return;
    const j = (await r.json()) as { messages: Msg[]; assets: Asset[]; approvals: { id: string; status: string }[] };
    setMsgs(j.messages);
    setAssets(Object.fromEntries(j.assets.map((a) => [a.id, a])));
    setApprovals(Object.fromEntries(j.approvals.map((a) => [a.id, a.status])));
  }

  useEffect(() => {
    load();
    const t = setInterval(load, busy ? 1500 : 8000);
    return () => clearInterval(t);
  }, [busy]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const t = text.trim();
    if (!t || busy) return;
    setText("");
    setBusy(true);
    setMsgs((m) => [...m, { id: "tmp", role: "user", kind: "text", text: t, meta: {}, created_at: "" }]);
    try {
      await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: t }) });
    } finally {
      setBusy(false);
      load();
    }
  }

  async function decide(id: string, approve: boolean) {
    setApprovals((a) => ({ ...a, [id]: approve ? "running" : "rejected" }));
    setBusy(true);
    try {
      await fetch("/api/approvals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, approve }) });
    } finally {
      setBusy(false);
      load();
    }
  }

  return (
    <div className="flex h-[calc(100vh-0px)] flex-col md:h-screen">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-3">
          {msgs.length === 0 && (
            <div className="card p-6">
              <p className="text-2xl">👋</p>
              <h2 className="mt-2 text-xl font-extrabold">היי, אני מנהל החשבון שלך</h2>
              <p className="muted mt-1">ספרו לי על העסק (או הדביקו קישור לאתר), ומה תרצו שהצוות יכין. כל דבר שעולה כסף או יוצא לציבור יחכה לאישור שלכם.</p>
            </div>
          )}
          {msgs.map((m) => <Bubble key={m.id + m.created_at} m={m} asset={assets[String(m.meta?.assetId)]} approvalStatus={approvals[String(m.meta?.approvalId)]} onDecide={decide} />)}
          {busy && <div className="flex justify-end"><div className="rounded-2xl bg-white/[0.06] px-4 py-3 text-sm"><span className="animate-pulse">הצוות עובד…</span></div></div>}
          <div ref={endRef} />
        </div>
      </div>
      <div className="border-t p-3" style={{ borderColor: "var(--line)" }}>
        <div className="mx-auto max-w-3xl">
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
            {SUGGESTIONS.map((s) => <button key={s} className="chip shrink-0 hover:bg-brand-soft" onClick={() => setText(s)}>{s}</button>)}
          </div>
          <form onSubmit={send} className="flex gap-2">
            <textarea
              className="input min-h-[52px] flex-1 resize-none"
              rows={1}
              placeholder="מה נשווק היום?"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            />
            <button className="btn" disabled={busy || !text.trim()}>שליחה</button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Bubble({ m, asset, approvalStatus, onDecide }: { m: Msg; asset?: Asset; approvalStatus?: string; onDecide: (id: string, a: boolean) => void }) {
  if (m.role === "user")
    return <div className="flex justify-start"><div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-ss-sm bg-forest-600 px-4 py-2.5 text-cream">{m.text}</div></div>;
  if (m.kind === "agent")
    return <div className="flex justify-end"><span className="chip !bg-brand-soft !text-brand" title={String(m.meta.task ?? "")}>{m.text}</span></div>;
  if (m.kind === "status")
    return <div className="flex justify-end"><div className="muted max-w-[85%] whitespace-pre-wrap text-sm">{m.text}</div></div>;
  if (m.kind === "approval") {
    const id = String(m.meta.approvalId);
    const st = approvalStatus ?? "pending";
    return (
      <div className="flex justify-end">
        <div className="w-full max-w-md rounded-2xl border border-brand/50 bg-brand/10 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-brand">🧾 נדרש אישור · {String(m.meta.label ?? "")}</p>
          <p className="mt-1 font-bold">{m.text}</p>
          {!!m.meta.cost && <p className="mt-1 text-sm">עלות: <b>{String(m.meta.cost)}</b></p>}
          <details className="mt-2 text-xs"><summary className="cursor-pointer">כל הפרטים</summary><pre dir="ltr" className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap rounded bg-white/70 p-2">{JSON.stringify(m.meta.input, null, 2)}</pre></details>
          {st === "pending" ? (
            <div className="mt-3 flex gap-2">
              <button className="btn !py-2" onClick={() => onDecide(id, true)}>✅ מאשר/ת</button>
              <button className="btn-ghost !py-2" onClick={() => onDecide(id, false)}>לא עכשיו</button>
            </div>
          ) : (
            <p className="mt-3 text-sm font-semibold">{({ approved: "אושר", running: "מבצע…", executed: "✅ בוצע", rejected: "בוטל", failed: "⚠️ נכשל" } as Record<string, string>)[st] ?? st}</p>
          )}
        </div>
      </div>
    );
  }
  if (m.kind === "asset")
    return (
      <div className="flex justify-end">
        <div className="w-full max-w-md space-y-2">
          <p className="text-sm font-semibold">{m.text}</p>
          {asset && <AssetCard a={asset} />}
        </div>
      </div>
    );
  return <div className="flex justify-end"><div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-se-sm bg-white/[0.06] px-4 py-2.5">{m.text}</div></div>;
}
