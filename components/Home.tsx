import Link from "next/link";
import { coreTeam, loadAgents } from "@/lib/agents/registry";

const COPY = {
  he: {
    dir: "rtl" as const,
    nav: { team: "הצוות", make: "מה מייצרים", flow: "איך זה עובד", integrations: "חיבורים", faq: "שאלות", login: "כניסה", start: "להתחיל" },
    eyebrow: "סוכנות שיווק שכולה סוכני AI",
    title: ["צוות שיווק שלם.", "שיחה אחת."],
    sub: "מנהל חשבון AI מקבל את הבריף שלך, מחלק את העבודה בין עשרות מומחים מ-The Agency, ומחזיר פוסטים, דפי נחיתה, סרטונים וקמפיינים – מוכנים לאישור שלך.",
    cta: "לפתוח שיחה עם הסוכנות",
    cta2: "לראות את הצוות",
    chat: [
      { me: true, t: "יש לי סטודיו לקרמיקה בחיפה. צריך למלא את הסדנאות של דצמבר" },
      { me: false, t: "מעולה. חוקר השוק בודק מה עובד אצל סטודיואים אחרים בצפון, ובינתיים אני מכין לך תוכנית: דף נחיתה לסדנה, קרוסלה לאינסטגרם וקמפיין Meta ברדיוס 20 ק\"מ." },
      { me: false, t: "🧾 לאישור: קמפיין Meta · ₪120 ליום · 3 מודעות", card: true },
    ],
    teamTitle: "הצוות שעובד בשבילך",
    teamSub: (n: number) => `${n} סוכנים מומחים מתוך ספריית The Agency (קוד פתוח, MIT). מנהל החשבון בוחר מי מהם נכנס לכל משימה.`,
    makeTitle: "מה הסוכנות מייצרת",
    make: [
      { i: "🖼️", t: "פוסטים, קרוסלות ובאנרים", d: "טיפים, ניפוץ מיתוסים, חגים ומבצעים – בצבעים ובטון של המותג, בכל פורמט: פיד, סטורי, באנר רחב." },
      { i: "🧭", t: "דפי נחיתה ואתרי תדמית", d: "ארבעה סגנונות: לידים, אתר מותג, השוואה למתחרים וסיפור. טופס לידים, מדידת צפיות וכפתור וואטסאפ מובנים." },
      { i: "🎬", t: "סרטונים עם מציג AI", d: "תסריט של מומחה וידאו קצר ורינדור במודל וידאו מתקדם עם קול: מציג, סגנון UGC, מוצר או אנימציה. 4–15 שניות, אנכי." },
      { i: "📅", t: "תזמון ופרסום", d: "פרסום ישיר ל-Facebook, Instagram, TikTok, LinkedIn ו-YouTube – עכשיו או בשעה שבחרת." },
      { i: "📈", t: "קמפיינים ממומנים", d: "Meta ו-Google Ads מקצה לקצה: מבנה CBO/ABO, קהלים, מילות מפתח, רדיוס גיאוגרפי וקריאייטיב." },
      { i: "🔎", t: "מחקר ודוחות", d: "מחקר שוק ומתחרים חי מהרשת, ודוח שבועי על צפיות, לידים וקמפיינים." },
    ],
    flowTitle: "איך זה עובד",
    flow: [
      { t: "מספרים מה צריך", d: "כותבים בצ'אט באתר או בוואטסאפ, כמו לעובד חדש. קישור לאתר מספיק כדי שנבנה פרופיל מותג." },
      { t: "הצוות מתכנן", d: "מנהל החשבון מתייעץ עם המומחים הרלוונטיים, עושה מחקר ומציג תוכנית קצרה." },
      { t: "את/ה מאשר/ת", d: "כל דבר שעולה כסף או יוצא לציבור מגיע ככרטיס אישור. בלי לחיצה – כלום לא קורה." },
      { t: "מקבלים תוצרים", d: "הנכסים מגיעים לצ'אט ולספרייה, ואפשר לבקש תיקונים במילים." },
    ],
    intTitle: "מתחבר לכלים שכבר יש לך",
    intSub: "כל חיבור הוא אופציונלי. בלי מפתחות המערכת רצה במצב הדגמה מלא.",
    faqTitle: "שאלות נפוצות",
    faq: [
      { q: "האם הסוכנות מוציאה כסף בלי לשאול?", a: "לא. סרטונים, פרסום ברשתות וקמפיינים ממומנים נוצרים ככרטיס אישור ורק לחיצה שלך מפעילה אותם. קמפיינים נבנים במצב מושהה ומופעלים רק בסוף." },
      { q: "מי המומחים בצוות?", a: "הסוכנים מגיעים מ-The Agency – ספריית קוד פתוח של פרסונות מומחים. כל פרסונה רצה כסוכן-משנה עם הידע וכללי העבודה שלה." },
      { q: "אפשר לעבוד מוואטסאפ?", a: "כן. מחברים מספר WhatsApp Business (Cloud API) והשיחה, התוצרים וכרטיסי האישור עוברים לשם." },
      { q: "באיזו שפה?", a: "עברית ואנגלית. התוכן נכתב בשפת המותג." },
    ],
    final: "מוכנים לתת לצוות לעבוד?",
    foot: "The Agency Power · סוכני המומחים מבוססים על The Agency (MIT)",
  },
  en: {
    dir: "ltr" as const,
    nav: { team: "Team", make: "What we make", flow: "How it works", integrations: "Integrations", faq: "FAQ", login: "Log in", start: "Start" },
    eyebrow: "A marketing agency staffed by AI agents",
    title: ["A whole marketing team.", "One conversation."],
    sub: "An AI account director takes your brief, splits the work across dozens of specialists from The Agency, and hands back posts, landing pages, videos and campaigns – ready for your approval.",
    cta: "Open a chat with the agency",
    cta2: "Meet the team",
    chat: [
      { me: true, t: "I run a ceramics studio in Haifa. Need to fill December workshops" },
      { me: false, t: "Great. The market researcher is checking what works for studios up north. Meanwhile, the plan: a workshop landing page, an Instagram carousel and a Meta campaign within 20 km." },
      { me: false, t: "🧾 For approval: Meta campaign · ₪120/day · 3 ads", card: true },
    ],
    teamTitle: "The team working for you",
    teamSub: (n: number) => `${n} specialist agents from The Agency library (open source, MIT). The account director picks who joins each task.`,
    makeTitle: "What the agency makes",
    make: [
      { i: "🖼️", t: "Posts, carousels, banners", d: "Tips, myth-busters, holidays and promos in your brand colors and voice, in every format." },
      { i: "🧭", t: "Landing pages & sites", d: "Four styles: lead-gen, brand site, competitor comparison and story. Lead form, analytics and WhatsApp built in." },
      { i: "🎬", t: "AI presenter videos", d: "Scripted by a short-video specialist, rendered with a state-of-the-art video model with sound: presenter, UGC, product or animation." },
      { i: "📅", t: "Scheduling & publishing", d: "Direct publishing to Facebook, Instagram, TikTok, LinkedIn and YouTube." },
      { i: "📈", t: "Paid campaigns", d: "Meta and Google Ads end to end: CBO/ABO, audiences, keywords, radius and creative." },
      { i: "🔎", t: "Research & reports", d: "Live market and competitor research, plus a weekly report on views, leads and campaigns." },
    ],
    flowTitle: "How it works",
    flow: [
      { t: "Say what you need", d: "Write in the web chat or on WhatsApp, like briefing a new hire." },
      { t: "The team plans", d: "The director consults the right specialists, researches and shows a short plan." },
      { t: "You approve", d: "Anything that costs money or goes public arrives as an approval card." },
      { t: "Get the work", d: "Assets land in the chat and the library; ask for changes in plain words." },
    ],
    intTitle: "Works with the tools you already use",
    intSub: "Every connection is optional. Without keys the system runs in full demo mode.",
    faqTitle: "FAQ",
    faq: [
      { q: "Does it spend money without asking?", a: "No. Videos, publishing and paid campaigns are approval cards; only your tap runs them." },
      { q: "Who are the specialists?", a: "Personas from The Agency, an open-source library. Each runs as a sub-agent with its own expertise." },
      { q: "Can I work from WhatsApp?", a: "Yes, connect a WhatsApp Business number (Cloud API)." },
      { q: "Languages?", a: "Hebrew and English." },
    ],
    final: "Ready to put the team to work?",
    foot: "The Agency Power · specialist agents based on The Agency (MIT)",
  },
};

const INTEGRATIONS = ["Claude", "Seedance (fal.ai)", "gpt-image", "WhatsApp", "Facebook", "Instagram", "Meta Ads", "Google Ads", "TikTok", "LinkedIn", "YouTube", "Unsplash"];

export default function Home({ lang }: { lang: "he" | "en" }) {
  const c = COPY[lang];
  const team = coreTeam();
  const total = loadAgents().length;
  const loginHref = "/login";
  return (
    <div dir={c.dir} lang={lang} className="min-h-screen">
      <header className="sticky top-0 z-20 border-b backdrop-blur" style={{ borderColor: "var(--line)", background: "color-mix(in srgb, var(--bg) 85%, transparent)" }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href={lang === "he" ? "/" : "/en"} className="flex items-center gap-2 text-lg font-extrabold">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-white">⚡</span> The Agency Power
          </Link>
          <nav className="hidden gap-6 text-sm font-medium md:flex">
            <a href="#team">{c.nav.team}</a><a href="#make">{c.nav.make}</a><a href="#flow">{c.nav.flow}</a><a href="#integrations">{c.nav.integrations}</a><a href="#faq">{c.nav.faq}</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href={lang === "he" ? "/en" : "/"} className="chip">{lang === "he" ? "EN" : "עב"}</Link>
            <Link href={loginHref} className="hidden text-sm font-semibold sm:inline">{c.nav.login}</Link>
            <Link href={loginHref} className="btn !px-4 !py-2 text-sm">{c.nav.start}</Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-[1.1fr_.9fr] md:py-24">
        <div>
          <p className="chip !bg-brand-soft !text-brand">{c.eyebrow}</p>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] md:text-6xl">{c.title[0]}<br /><span className="text-brand">{c.title[1]}</span></h1>
          <p className="muted mt-5 max-w-xl text-lg">{c.sub}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={loginHref} className="btn">{c.cta}</Link>
            <a href="#team" className="btn-ghost">{c.cta2}</a>
          </div>
        </div>
        <div className="card p-4 shadow-xl">
          <div className="mb-3 flex items-center gap-2 border-b pb-3" style={{ borderColor: "var(--line)" }}>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-brand text-white">⚡</span>
            <div><p className="font-bold leading-tight">The Agency Power</p><p className="text-xs text-green-600">● online</p></div>
          </div>
          <div className="space-y-2">
            {c.chat.map((m, i) => (
              <div key={i} className={`flex ${m.me ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.me ? "bg-brand text-white" : m.card ? "border-2 border-accent bg-orange-50 text-ink" : "bg-black/5 dark:bg-white/10"}`}>{m.t}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="team" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-3xl font-extrabold">{c.teamTitle}</h2>
        <p className="muted mt-2 max-w-2xl">{c.teamSub(total)}</p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {team.map(({ slug, role, agent }) => (
            <div key={slug} className="card p-4">
              <div className="text-2xl">{agent!.emoji}</div>
              <p className="mt-2 font-bold">{agent!.name}</p>
              <p className="muted text-sm">{lang === "he" ? role : agent!.vibe.slice(0, 80)}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="make" className="py-16" style={{ background: "color-mix(in srgb, var(--line) 35%, transparent)" }}>
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-3xl font-extrabold">{c.makeTitle}</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {c.make.map((m) => (
              <div key={m.t} className="card p-6"><div className="text-3xl">{m.i}</div><h3 className="mt-3 text-lg font-bold">{m.t}</h3><p className="muted mt-1 text-sm">{m.d}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section id="flow" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-3xl font-extrabold">{c.flowTitle}</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-4">
          {c.flow.map((f, i) => (
            <li key={f.t} className="card p-6"><span className="grid h-9 w-9 place-items-center rounded-full bg-brand font-bold text-white">{i + 1}</span><h3 className="mt-3 font-bold">{f.t}</h3><p className="muted mt-1 text-sm">{f.d}</p></li>
          ))}
        </ol>
      </section>

      <section id="integrations" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-3xl font-extrabold">{c.intTitle}</h2>
        <p className="muted mt-2">{c.intSub}</p>
        <div className="mt-6 flex flex-wrap gap-2">{INTEGRATIONS.map((x) => <span key={x} className="card px-4 py-2 text-sm font-semibold">{x}</span>)}</div>
      </section>

      <section id="faq" className="mx-auto max-w-3xl px-4 py-16">
        <h2 className="text-3xl font-extrabold">{c.faqTitle}</h2>
        <div className="mt-6 space-y-3">
          {c.faq.map((f) => (
            <details key={f.q} className="card p-5"><summary className="cursor-pointer font-bold">{f.q}</summary><p className="muted mt-2">{f.a}</p></details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="rounded-[2rem] bg-brand px-6 py-14 text-center text-white">
          <h2 className="text-3xl font-extrabold">{c.final}</h2>
          <Link href={loginHref} className="btn mt-6 !bg-white !text-brand">{c.cta}</Link>
        </div>
      </section>
      <footer className="muted border-t py-8 text-center text-sm" style={{ borderColor: "var(--line)" }}>{c.foot}</footer>
    </div>
  );
}
