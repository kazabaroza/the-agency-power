import Link from "next/link";
import { coreTeam, loadAgents } from "@/lib/agents/registry";
import { SKILLS } from "@/lib/skills";
import {
  IconArrow, IconBolt, IconCalendar, IconChart, IconChat, IconCheck, IconImage, IconLayout,
  IconPlug, IconSearch, IconShield, IconUsers, IconVideo,
} from "./Icons";

type Lang = "he" | "en";

const COPY = {
  he: {
    dir: "rtl" as const,
    nav: [["#how", "איך זה עובד"], ["#work", "מה מייצרים"], ["#team", "הצוות"], ["#control", "שליטה"], ["#faq", "שאלות"]],
    login: "כניסה",
    start: "להתחיל",
    badge: "סוכנות שיווק שכולה סוכני AI",
    h1a: "כל השיווק של העסק,",
    h1b: "בשיחה אחת.",
    sub: "מנהל חשבון מבוסס AI מקבל ממך בריף קצר, מחלק את העבודה בין מומחים, ומחזיר פוסטים, דפי נחיתה, סרטונים וקמפיינים מוכנים. שום דבר לא עולה לאוויר ושום שקל לא יוצא בלי האישור שלך.",
    cta: "לפתוח שיחה עם הסוכנות",
    cta2: "איך זה עובד",
    worksWith: "מתחבר ל",
    stats: (agents: number, skills: number) => [
      [String(agents), "מומחים בצוות"],
      [String(skills), "כישורי ביצוע"],
      ["דקות", "מבריף לתוצר"],
      ["100%", "באישור שלך"],
    ],
    mock: {
      title: "מנהל החשבון",
      online: "מחובר",
      user: "יש לי סטודיו לקרמיקה בחיפה. רוצה למלא את הסדנאות של דצמבר.",
      agent: "בדקתי מה עובד אצל סטודיואים באזור. התוכנית: דף נחיתה לסדנה, קרוסלה לאינסטגרם וקמפיין ממומן ברדיוס 20 ק\"מ.",
      working: "מומחה הקרוסלות עובד על זה",
      card: "לאישור: קמפיין Meta",
      cardMeta: "₪120 ליום · 3 מודעות · חיפה + 20 ק\"מ",
      approve: "מאשר",
      later: "לא עכשיו",
      assets: ["קרוסלה · 5 שקפים", "דף נחיתה", "סרטון 10 שנ׳"],
    },
    howTitle: "מבריף לתוצר בארבעה צעדים",
    howSub: "בלי טפסים ובלי מסכים מסובכים. מדברים עם הסוכנות כמו עם מנהל שיווק.",
    how: [
      ["מספרים מה צריך", "בצ'אט באתר או בוואטסאפ. קישור לאתר שלך מספיק כדי שנבנה פרופיל מותג."],
      ["הצוות מתכנן", "מנהל החשבון מתייעץ עם המומחים הנכונים, עושה מחקר שוק ומציג תוכנית קצרה."],
      ["את/ה מאשר/ת", "כל פעולה שעולה כסף או יוצאת לציבור מגיעה ככרטיס אישור עם כל הפרטים."],
      ["מקבלים תוצרים", "הנכסים מגיעים לשיחה ולספרייה. רוצים שינוי? פשוט כותבים מה לשנות."],
    ],
    workTitle: "מה הסוכנות מייצרת",
    workSub: "כל תוצר נבנה בצבעים, בטון ובשפה של המותג שלך.",
    work: [
      ["image", "פוסטים, קרוסלות ובאנרים", "טיפים, מבצעים, חגים וניפוץ מיתוסים, בכל פורמט: פיד, סטורי ובאנר רחב."],
      ["layout", "דפי נחיתה ואתרי תדמית", "ארבעה סגנונות, עם טופס לידים, מדידת צפיות וכפתור וואטסאפ מובנים."],
      ["video", "סרטונים עם מציג/ה", "תסריט של מומחה וידאו, קריינות טבעית בעברית ומציג/ה עם סנכרון שפתיים."],
      ["calendar", "תזמון ופרסום", "פרסום ישיר ל-Facebook, Instagram, TikTok, LinkedIn ו-YouTube."],
      ["chart", "קמפיינים ממומנים", "Meta ו-Google Ads מקצה לקצה: מבנה, קהלים, מילות מפתח ורדיוס."],
      ["search", "מחקר ודוחות", "מחקר שוק ומתחרים מהרשת, ודוח שבועי על צפיות, לידים וקמפיינים."],
    ],
    teamTitle: "הצוות שעובד בשבילך",
    teamSub: (n: number) => `${n} פרסונות מומחים מספריית The Agency (קוד פתוח). לכל משימה מנהל החשבון בוחר את המומחים המתאימים.`,
    teamMore: "לכל הצוות",
    controlTitle: "את/ה מחליט/ה. תמיד.",
    controlSub: "הסוכנות עובדת מהר, אבל לא לבד. כל מה שעולה כסף או יוצא לציבור מחכה לאישור שלך.",
    control: [
      "קמפיינים נבנים במצב מושהה ומופעלים רק אחרי אישור",
      "פרסום ברשתות ובוואטסאפ רק אחרי לחיצה על \"מאשר\"",
      "אין המלצות, מחירים או פרטים מומצאים על העסק",
      "כל נכס נשמר בספרייה, וכל ליד נשמר במערכת",
    ],
    intTitle: "עובד עם הכלים שכבר יש לך",
    faqTitle: "שאלות נפוצות",
    faq: [
      ["האם הסוכנות מוציאה כסף בלי לשאול?", "לא. סרטונים, פרסום ברשתות וקמפיינים ממומנים נוצרים ככרטיס אישור, ורק לחיצה שלך מפעילה אותם."],
      ["מי המומחים בצוות?", "הם מגיעים מ-The Agency, ספריית קוד פתוח של פרסונות מומחים. כל מומחה רץ כסוכן משנה עם הידע וכללי העבודה שלו."],
      ["אפשר לעבוד מוואטסאפ?", "כן. מחברים מספר WhatsApp Business, והשיחה, התוצרים וכרטיסי האישור עוברים לשם."],
      ["באיזו שפה?", "עברית ואנגלית. התוכן נכתב בשפת המותג, והסרטונים מוקראים בעברית טבעית."],
    ],
    finalTitle: "מוכנים לתת לצוות לעבוד?",
    finalSub: "פותחים שיחה, מספרים על העסק, ומקבלים תוכנית ראשונה תוך דקות.",
    foot: "The Agency Power · המומחים מבוססים על The Agency (רישיון MIT)",
  },
  en: {
    dir: "ltr" as const,
    nav: [["#how", "How it works"], ["#work", "What we make"], ["#team", "Team"], ["#control", "Control"], ["#faq", "FAQ"]],
    login: "Log in",
    start: "Get started",
    badge: "A marketing agency staffed by AI agents",
    h1a: "All of your marketing,",
    h1b: "in one conversation.",
    sub: "An AI account director takes a short brief, splits the work across specialists, and hands back posts, landing pages, videos and campaigns. Nothing goes live and nothing is spent without your approval.",
    cta: "Open a chat with the agency",
    cta2: "How it works",
    worksWith: "Works with",
    stats: (agents: number, skills: number) => [
      [String(agents), "specialists"],
      [String(skills), "production skills"],
      ["Minutes", "from brief to asset"],
      ["100%", "on your approval"],
    ],
    mock: {
      title: "Account director",
      online: "online",
      user: "I run a ceramics studio in Haifa. I want to fill the December workshops.",
      agent: "I checked what works for studios nearby. Plan: a workshop landing page, an Instagram carousel and a paid campaign within 20 km.",
      working: "The carousel specialist is on it",
      card: "For approval: Meta campaign",
      cardMeta: "₪120/day · 3 ads · Haifa + 20 km",
      approve: "Approve",
      later: "Not now",
      assets: ["Carousel · 5 slides", "Landing page", "Video 10s"],
    },
    howTitle: "From brief to asset in four steps",
    howSub: "No forms, no complicated dashboards. Talk to the agency like you would to a marketing manager.",
    how: [
      ["Say what you need", "In the web chat or on WhatsApp. A link to your site is enough to build a brand profile."],
      ["The team plans", "The director consults the right specialists, researches the market and shows a short plan."],
      ["You approve", "Anything that costs money or goes public arrives as an approval card with every detail."],
      ["Get the work", "Assets land in the chat and the library. Want a change? Just say what to change."],
    ],
    workTitle: "What the agency makes",
    workSub: "Every asset follows your brand's colors, voice and language.",
    work: [
      ["image", "Posts, carousels, banners", "Tips, promos, holidays and myth-busters in every format: feed, story and wide banner."],
      ["layout", "Landing pages & sites", "Four styles with a lead form, view tracking and a WhatsApp button built in."],
      ["video", "Presenter videos", "Scripted by a video specialist, with a natural voice-over and a lip-synced presenter."],
      ["calendar", "Scheduling & publishing", "Direct publishing to Facebook, Instagram, TikTok, LinkedIn and YouTube."],
      ["chart", "Paid campaigns", "Meta and Google Ads end to end: structure, audiences, keywords and radius."],
      ["search", "Research & reports", "Live market and competitor research, plus a weekly report on views, leads and campaigns."],
    ],
    teamTitle: "The team working for you",
    teamSub: (n: number) => `${n} specialist personas from The Agency library (open source). For each task the director picks the right specialists.`,
    teamMore: "See the whole team",
    controlTitle: "You decide. Always.",
    controlSub: "The agency works fast, but not alone. Anything that costs money or goes public waits for your approval.",
    control: [
      "Campaigns are built paused and only switched on after approval",
      "Publishing to social and WhatsApp only after you tap \"Approve\"",
      "No invented reviews, prices or facts about your business",
      "Every asset is kept in the library, every lead in the system",
    ],
    intTitle: "Works with the tools you already use",
    faqTitle: "FAQ",
    faq: [
      ["Does it spend money without asking?", "No. Videos, publishing and paid campaigns are approval cards; only your tap runs them."],
      ["Who are the specialists?", "Personas from The Agency, an open-source library. Each runs as a sub-agent with its own expertise."],
      ["Can I work from WhatsApp?", "Yes. Connect a WhatsApp Business number and the chat, assets and approval cards move there."],
      ["Languages?", "Hebrew and English, with natural Hebrew voice-overs in videos."],
    ],
    finalTitle: "Ready to put the team to work?",
    finalSub: "Open a chat, tell us about the business, and get a first plan within minutes.",
    foot: "The Agency Power · specialists based on The Agency (MIT licence)",
  },
};

const INTEGRATIONS = ["Claude", "WhatsApp", "Facebook", "Instagram", "Meta Ads", "Google Ads", "TikTok", "LinkedIn", "YouTube", "fal.ai", "OpenAI", "Unsplash"];

const WORK_ICONS: Record<string, (p: { className?: string }) => React.ReactElement> = {
  image: IconImage, layout: IconLayout, video: IconVideo, calendar: IconCalendar, chart: IconChart, search: IconSearch,
};

function Section({ id, children, tint }: { id?: string; children: React.ReactNode; tint?: boolean }) {
  return (
    <section id={id} className={`scroll-mt-20 py-20 md:py-28 ${tint ? "bg-slate-50 dark:bg-white/[0.03]" : ""}`}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">{children}</div>
    </section>
  );
}

function Heading({ title, sub, center }: { title: string; sub?: string; center?: boolean }) {
  return (
    <div className={`max-w-2xl ${center ? "mx-auto text-center" : ""}`}>
      <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">{title}</h2>
      {sub && <p className="muted mt-3 text-lg">{sub}</p>}
    </div>
  );
}

export default function Home({ lang }: { lang: Lang }) {
  const c = COPY[lang];
  const team = coreTeam().slice(0, 8);
  const total = loadAgents().length;
  const arrowFlip = c.dir === "ltr" ? "rotate-180" : "";

  return (
    <div dir={c.dir} lang={lang} className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-black/5 bg-white/80 backdrop-blur-md dark:border-white/10 dark:bg-[#0f1013]/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href={lang === "he" ? "/" : "/en"} className="flex items-center gap-2.5 font-extrabold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white"><IconBolt className="h-4 w-4" /></span>
            The Agency Power
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300 lg:flex">
            {c.nav.map(([href, label]) => <a key={href} href={href} className="transition hover:text-brand">{label}</a>)}
          </nav>
          <div className="flex items-center gap-3">
            <Link href={lang === "he" ? "/en" : "/"} className="text-xs font-semibold text-slate-500 hover:text-brand">{lang === "he" ? "EN" : "עב"}</Link>
            <Link href="/login" className="hidden text-sm font-semibold sm:inline">{c.login}</Link>
            <Link href="/login" className="btn !px-4 !py-2 text-sm">{c.start}</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60rem_30rem_at_50%_-10%,rgba(91,61,245,0.10),transparent)]" />
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-16 pt-16 sm:px-6 md:pt-24 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" /> {c.badge}
            </span>
            <h1 className="mt-6 text-[2.6rem] font-extrabold leading-[1.05] tracking-tight md:text-6xl">
              {c.h1a}
              <br />
              <span className="text-brand">{c.h1b}</span>
            </h1>
            <p className="muted mt-6 max-w-xl text-lg leading-relaxed">{c.sub}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/login" className="btn px-6 py-3 text-base">{c.cta} <IconArrow className={`h-4 w-4 ${arrowFlip}`} /></Link>
              <a href="#how" className="btn-ghost px-6 py-3 text-base">{c.cta2}</a>
            </div>
            <div className="mt-10">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{c.worksWith}</p>
              <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">{INTEGRATIONS.slice(0, 7).join(" · ")}</p>
            </div>
          </div>

          {/* Product mock */}
          <div className="relative">
            <div className="rounded-2xl border border-black/10 bg-white shadow-[0_30px_80px_-30px_rgba(30,20,90,0.35)] dark:border-white/10 dark:bg-[#17191e]">
              <div className="flex items-center gap-3 border-b border-black/5 px-5 py-4 dark:border-white/10">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-brand text-white"><IconChat className="h-4 w-4" /></span>
                <div className="leading-tight">
                  <p className="text-sm font-bold">{c.mock.title}</p>
                  <p className="text-xs text-emerald-600">● {c.mock.online}</p>
                </div>
              </div>
              <div className="space-y-3 p-5 text-sm">
                <div className="flex justify-start"><div className="max-w-[85%] rounded-2xl rounded-ss-sm bg-brand px-4 py-2.5 text-white">{c.mock.user}</div></div>
                <div className="flex justify-end"><div className="max-w-[85%] rounded-2xl rounded-se-sm bg-slate-100 px-4 py-2.5 dark:bg-white/10">{c.mock.agent}</div></div>
                <div className="flex justify-end"><span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">{c.mock.working}</span></div>
                <div className="flex justify-end">
                  <div className="w-full max-w-[85%] rounded-xl border border-amber-300 bg-amber-50 p-3 text-slate-900">
                    <p className="flex items-center gap-1.5 text-xs font-bold text-amber-700"><IconShield className="h-4 w-4" /> {c.mock.card}</p>
                    <p className="mt-1 text-xs text-slate-600">{c.mock.cardMeta}</p>
                    <div className="mt-2.5 flex gap-2">
                      <span className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">{c.mock.approve}</span>
                      <span className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600">{c.mock.later}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Asset chips */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              {c.mock.assets.map((a, i) => {
                const Icon = [IconImage, IconLayout, IconVideo][i];
                return (
                  <div key={a} className="rounded-xl border border-black/10 bg-white p-3 text-xs font-semibold shadow-sm dark:border-white/10 dark:bg-[#17191e]">
                    <div className={`mb-2 grid h-14 place-items-center rounded-lg ${["bg-violet-100 text-violet-600", "bg-sky-100 text-sky-600", "bg-rose-100 text-rose-600"][i]}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    {a}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="border-y border-black/5 bg-white dark:border-white/10 dark:bg-transparent">
          <dl className="mx-auto grid max-w-6xl grid-cols-2 px-4 sm:px-6 md:grid-cols-4">
            {c.stats(total, SKILLS.length).map(([v, l]) => (
              <div key={l} className="border-black/5 py-6 text-center dark:border-white/10 [&:not(:last-child)]:md:border-e">
                <dt className="text-2xl font-extrabold tracking-tight md:text-3xl">{v}</dt>
                <dd className="muted mt-1 text-sm">{l}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* How it works */}
      <Section id="how">
        <Heading title={c.howTitle} sub={c.howSub} />
        <ol className="mt-12 grid gap-6 md:grid-cols-4">
          {c.how.map(([t, d], i) => (
            <li key={t} className="relative">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-brand text-sm font-bold text-brand">{i + 1}</span>
                {i < c.how.length - 1 && <span aria-hidden className="hidden h-px flex-1 bg-gradient-to-l from-transparent to-brand/30 md:block" />}
              </div>
              <h3 className="mt-4 text-lg font-bold">{t}</h3>
              <p className="muted mt-1.5 text-sm leading-relaxed">{d}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* What we make */}
      <Section id="work" tint>
        <Heading title={c.workTitle} sub={c.workSub} />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {c.work.map(([icon, t, d]) => {
            const Icon = WORK_ICONS[icon];
            return (
              <div key={t} className="group rounded-2xl border border-black/5 bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-[#17191e]">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand"><Icon className="h-5 w-5" /></span>
                <h3 className="mt-5 text-lg font-bold">{t}</h3>
                <p className="muted mt-1.5 text-sm leading-relaxed">{d}</p>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Team */}
      <Section id="team">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <Heading title={c.teamTitle} sub={c.teamSub(total)} />
          <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand">{c.teamMore} <IconArrow className={`h-4 w-4 ${arrowFlip}`} /></Link>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {team.map(({ slug, role, agent }) => (
            <div key={slug} className="flex items-start gap-3 rounded-2xl border border-black/5 p-4 dark:border-white/10">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-lg dark:bg-white/10">{agent!.emoji}</span>
              <div className="min-w-0">
                <p className="font-bold leading-snug" dir="ltr" style={{ textAlign: "start" }}>{agent!.name}</p>
                <p className="muted mt-0.5 text-sm">{lang === "he" ? role : agent!.divisionLabel}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Control */}
      <Section id="control" tint>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand text-white"><IconShield className="h-6 w-6" /></span>
            <h2 className="mt-6 text-3xl font-extrabold tracking-tight md:text-4xl">{c.controlTitle}</h2>
            <p className="muted mt-3 text-lg">{c.controlSub}</p>
          </div>
          <ul className="space-y-3">
            {c.control.map((t) => (
              <li key={t} className="flex items-start gap-3 rounded-xl border border-black/5 bg-white p-4 dark:border-white/10 dark:bg-[#17191e]">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700"><IconCheck className="h-3.5 w-3.5" /></span>
                <span className="font-medium">{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* Integrations */}
      <Section>
        <Heading title={c.intTitle} center />
        <div className="mx-auto mt-10 flex max-w-4xl flex-wrap justify-center gap-3">
          {INTEGRATIONS.map((x) => (
            <span key={x} className="inline-flex items-center gap-2 rounded-full border border-black/10 px-4 py-2 text-sm font-semibold dark:border-white/10">
              <IconPlug className="h-4 w-4 text-slate-400" /> {x}
            </span>
          ))}
        </div>
      </Section>

      {/* FAQ */}
      <Section id="faq" tint>
        <div className="mx-auto max-w-3xl">
          <Heading title={c.faqTitle} center />
          <div className="mt-10 divide-y divide-black/5 rounded-2xl border border-black/5 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-[#17191e]">
            {c.faq.map(([q, a]) => (
              <details key={q} className="group p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold">
                  {q}
                  <span className="text-xl text-slate-400 transition group-open:rotate-45">+</span>
                </summary>
                <p className="muted mt-3 leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </Section>

      {/* Final CTA */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-slate-900 px-6 py-16 text-center text-white md:py-20">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-white/10"><IconUsers className="h-6 w-6" /></span>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight md:text-4xl">{c.finalTitle}</h2>
          <p className="mx-auto mt-3 max-w-xl text-lg text-slate-300">{c.finalSub}</p>
          <Link href="/login" className="btn mt-8 px-7 py-3 text-base">{c.cta}</Link>
        </div>
      </section>

      <footer className="border-t border-black/5 py-8 text-center text-sm text-slate-500 dark:border-white/10">{c.foot}</footer>
    </div>
  );
}
