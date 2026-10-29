"use client";
import { useState } from "react";
import { IconBolt } from "@/components/Icons";

export default function Login() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await fetch("/api/auth/send-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) return setErr(j.error);
    setDemoCode(j.demoCode ?? null);
    setStep("code");
  }
  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await fetch("/api/auth/verify-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code }) });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) return setErr(j.error);
    location.href = "/app";
  }

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="card w-full max-w-md p-8">
        <a href="/" className="flex items-center gap-2 text-lg font-extrabold"><span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-forest-900"><IconBolt className="h-4 w-4" /></span> The Agency Power</a>
        <h1 className="mt-6 text-2xl font-extrabold">{step === "email" ? "כניסה / הרשמה" : "הזינו את הקוד"}</h1>
        <p className="muted mt-1 text-sm">{step === "email" ? "נשלח קוד חד-פעמי לאימייל. בלי סיסמאות." : `שלחנו קוד בן 6 ספרות ל-${email}`}</p>
        {step === "email" ? (
          <form onSubmit={send} className="mt-6 space-y-3">
            <input className="input" type="email" dir="ltr" placeholder="you@business.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <button className="btn w-full" disabled={busy}>{busy ? "שולח…" : "שלחו לי קוד"}</button>
          </form>
        ) : (
          <form onSubmit={verify} className="mt-6 space-y-3">
            {demoCode && <p className="rounded-xl bg-amber-100 p-3 text-sm text-amber-900">מצב הדגמה (אין שירות מייל מחובר) – הקוד שלך: <b dir="ltr">{demoCode}</b></p>}
            <input className="input text-center text-2xl tracking-[.5em]" dir="ltr" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} required autoFocus />
            <button className="btn w-full" disabled={busy}>{busy ? "בודק…" : "כניסה"}</button>
            <button type="button" className="muted w-full text-sm" onClick={() => setStep("email")}>החלפת אימייל</button>
          </form>
        )}
        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
      </div>
    </main>
  );
}
