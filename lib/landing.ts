import { brandColors, type Brand } from "./providers/media";

export type LandingContent = {
  style: "lead" | "brand" | "comparison" | "story";
  language: "he" | "en";
  hero: { eyebrow?: string; title: string; subtitle: string; cta: string; image?: string };
  benefits: { title: string; text: string; icon?: string }[];
  story?: { title: string; paragraphs: string[] };
  comparison?: { title: string; us: string; them: string; rows: { label: string; us: string; them: string }[] };
  steps?: { title: string; text: string }[];
  testimonials?: { quote: string; name: string; role?: string }[];
  faq?: { q: string; a: string }[];
  offer?: { title: string; text: string; cta: string };
  form: { title: string; button: string; fields: ("name" | "phone" | "email" | "message")[] };
  gallery?: string[];
  seo: { title: string; description: string };
};

const esc = (s = "") => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const L = {
  he: { name: "שם מלא", phone: "טלפון", email: "אימייל", message: "במה נוכל לעזור?", thanks: "תודה! קיבלנו את הפרטים ונחזור אליך בהקדם.", faq: "שאלות נפוצות", how: "איך זה עובד", say: "מה אומרים עלינו", wa: "דברו איתנו בוואטסאפ" },
  en: { name: "Full name", phone: "Phone", email: "Email", message: "How can we help?", thanks: "Thanks! We got your details and will be in touch soon.", faq: "FAQ", how: "How it works", say: "What people say", wa: "Chat on WhatsApp" },
};

/** Renders a complete, self-contained landing page. Every page posts leads back to the platform. */
export function renderLanding(c: LandingContent, brand: Brand | null, pageId: string, appUrl = ""): string {
  const [c1, c2] = brandColors(brand);
  const t = L[c.language] ?? L.he;
  const dir = c.language === "en" ? "ltr" : "rtl";
  const sec = (inner: string, cls = "") => `<section class="sec ${cls}"><div class="wrap">${inner}</div></section>`;

  const hero = `<header class="hero"><div class="wrap hero-grid">
    <div><p class="eyebrow">${esc(c.hero.eyebrow || brand?.name || "")}</p><h1>${esc(c.hero.title)}</h1><p class="lead">${esc(c.hero.subtitle)}</p>
    <a class="btn" href="#form">${esc(c.hero.cta)}</a></div>
    ${c.hero.image ? `<img class="hero-img" src="${esc(c.hero.image)}" alt="">` : `<div class="hero-art" aria-hidden="true"></div>`}
  </div></header>`;

  const benefits = c.benefits?.length
    ? sec(`<div class="cards">${c.benefits.map((b) => `<article class="card"><div class="ic">${esc(b.icon || "✦")}</div><h3>${esc(b.title)}</h3><p>${esc(b.text)}</p></article>`).join("")}</div>`)
    : "";
  const story = c.story ? sec(`<h2>${esc(c.story.title)}</h2>${c.story.paragraphs.map((p) => `<p class="prose">${esc(p)}</p>`).join("")}`, "alt") : "";
  const comparison = c.comparison
    ? sec(`<h2>${esc(c.comparison.title)}</h2><div class="tbl"><table><thead><tr><th></th><th class="us">${esc(c.comparison.us)}</th><th>${esc(c.comparison.them)}</th></tr></thead><tbody>${c.comparison.rows.map((r) => `<tr><td>${esc(r.label)}</td><td class="us">${esc(r.us)}</td><td>${esc(r.them)}</td></tr>`).join("")}</tbody></table></div>`, "alt")
    : "";
  const steps = c.steps?.length ? sec(`<h2>${t.how}</h2><ol class="steps">${c.steps.map((s) => `<li><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></li>`).join("")}</ol>`) : "";
  const gallery = c.gallery?.length ? sec(`<div class="gallery">${c.gallery.map((g) => `<img src="${esc(g)}" alt="" loading="lazy">`).join("")}</div>`) : "";
  // Testimonials are only shown when the business supplied real ones - never invented faces.
  const testimonials = c.testimonials?.length
    ? sec(`<h2>${t.say}</h2><div class="cards">${c.testimonials.map((q) => `<figure class="card quote"><blockquote>“${esc(q.quote)}”</blockquote><figcaption>${esc(q.name)}${q.role ? ` · ${esc(q.role)}` : ""}</figcaption></figure>`).join("")}</div>`, "alt")
    : "";
  const offer = c.offer ? sec(`<div class="offer"><h2>${esc(c.offer.title)}</h2><p>${esc(c.offer.text)}</p><a class="btn light" href="#form">${esc(c.offer.cta)}</a></div>`) : "";
  const faq = c.faq?.length ? sec(`<h2>${t.faq}</h2>${c.faq.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}`) : "";
  const formFields: LandingContent["form"]["fields"] = c.form.fields?.length ? c.form.fields : ["name", "phone"];
  const fields = formFields.map((f) =>
    f === "message"
      ? `<textarea name="message" placeholder="${t.message}" rows="3"></textarea>`
      : `<input name="${f}" type="${f === "email" ? "email" : f === "phone" ? "tel" : "text"}" placeholder="${t[f]}" ${f !== "email" ? "required" : ""}>`,
  ).join("");
  const form = sec(`<div class="form-box" id="form"><h2>${esc(c.form.title)}</h2><form id="lead">${fields}<button class="btn" type="submit">${esc(c.form.button)}</button><p class="ok" hidden>${t.thanks}</p></form></div>`, "alt");
  const wa = brand?.phone ? `<a class="wa" href="https://wa.me/${esc(brand.phone.replace(/\D/g, ""))}" target="_blank" rel="noopener">💬 ${t.wa}</a>` : "";

  return `<!doctype html><html lang="${c.language}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(c.seo.title)}</title><meta name="description" content="${esc(c.seo.description)}">
<meta property="og:title" content="${esc(c.seo.title)}"><meta property="og:description" content="${esc(c.seo.description)}">${c.hero.image ? `<meta property="og:image" content="${esc(c.hero.image)}">` : ""}
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;800&display=swap" rel="stylesheet">
<style>
:root{--c1:${c1};--c2:${c2};--ink:#15171c;--muted:#5d6370;--bg:#fff;--alt:#f6f5f2}
*{box-sizing:border-box}body{margin:0;font-family:Heebo,system-ui,sans-serif;color:var(--ink);background:var(--bg);line-height:1.6}
.wrap{max-width:1080px;margin:0 auto;padding:0 20px}h1{font-size:clamp(2rem,5vw,3.4rem);line-height:1.1;margin:.3em 0}h2{font-size:clamp(1.5rem,3.4vw,2.2rem);margin:0 0 .8em}
.hero{background:linear-gradient(135deg,var(--c1),color-mix(in srgb,var(--c1) 55%,#000));color:#fff;padding:72px 0}
.hero-grid{display:grid;gap:40px;align-items:center;grid-template-columns:1.1fr .9fr}.eyebrow{opacity:.85;font-weight:600;margin:0}.lead{font-size:1.2rem;opacity:.92;max-width:34em}
.hero-img{width:100%;border-radius:24px;aspect-ratio:4/3;object-fit:cover;box-shadow:0 30px 60px rgba(0,0,0,.25)}.hero-art{aspect-ratio:4/3;border-radius:24px;background:radial-gradient(circle at 30% 30%,var(--c2),transparent 60%),rgba(255,255,255,.08)}
.btn{display:inline-block;background:var(--c2);color:#fff;font-weight:700;padding:14px 28px;border-radius:999px;text-decoration:none;border:0;font:inherit;font-weight:700;cursor:pointer}.btn.light{background:#fff;color:var(--c1)}
.sec{padding:64px 0}.sec.alt{background:var(--alt)}.cards{display:grid;gap:18px;grid-template-columns:repeat(auto-fit,minmax(230px,1fr))}
.card{background:#fff;border-radius:18px;padding:24px;box-shadow:0 1px 0 rgba(0,0,0,.05),0 10px 30px rgba(0,0,0,.05)}.card h3{margin:.3em 0}.card p{color:var(--muted);margin:0}.ic{font-size:1.6rem}
.prose{font-size:1.1rem;max-width:42em}.quote blockquote{margin:0 0 10px;font-size:1.05rem}.quote figcaption{color:var(--muted);font-weight:600}
.tbl{overflow-x:auto}table{width:100%;border-collapse:collapse;background:#fff;border-radius:16px;overflow:hidden}th,td{padding:14px;border-bottom:1px solid #eee;text-align:start}th.us,td.us{background:color-mix(in srgb,var(--c1) 8%,#fff);font-weight:700}
.steps{list-style:none;padding:0;display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));counter-reset:s}.steps li{counter-increment:s;background:var(--alt);border-radius:18px;padding:22px}.steps li:before{content:counter(s);display:inline-grid;place-items:center;width:34px;height:34px;border-radius:50%;background:var(--c1);color:#fff;font-weight:800}
.gallery{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}.gallery img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:16px}
.offer{background:var(--c1);color:#fff;border-radius:28px;padding:44px;text-align:center}
details{background:#fff;border:1px solid #eee;border-radius:14px;padding:14px 18px;margin-bottom:10px}summary{font-weight:700;cursor:pointer}
.form-box{max-width:520px;margin:0 auto;background:#fff;border-radius:24px;padding:32px;box-shadow:0 20px 50px rgba(0,0,0,.08)}form{display:grid;gap:12px}
input,textarea{font:inherit;padding:14px;border:1px solid #ddd;border-radius:12px;width:100%}.ok{color:#127a3a;font-weight:700}
.wa{position:fixed;bottom:18px;inset-inline-end:18px;background:#25d366;color:#fff;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:700;box-shadow:0 10px 25px rgba(0,0,0,.2)}
footer{padding:30px 0;color:var(--muted);text-align:center;font-size:.9rem}
@media(max-width:760px){.hero-grid{grid-template-columns:1fr}.hero{padding:48px 0}}
</style></head><body>
${hero}${c.style === "story" ? story + benefits : benefits + story}${comparison}${steps}${gallery}${testimonials}${offer}${faq}${form}
<footer>© ${new Date().getFullYear()} ${esc(brand?.name || "")}</footer>${wa}
<script>
(function(){var api=${JSON.stringify(appUrl)};var id=${JSON.stringify(pageId)};
try{navigator.sendBeacon(api+"/api/track",JSON.stringify({page:id,type:"view"}))}catch(e){}
var f=document.getElementById("lead");f.addEventListener("submit",function(e){e.preventDefault();var d=Object.fromEntries(new FormData(f));d.page=id;
fetch(api+"/api/leads",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)}).then(function(r){if(r.ok){f.querySelectorAll("input,textarea,button").forEach(function(x){x.hidden=true});f.querySelector(".ok").hidden=false}})});})();
</script></body></html>`;
}

/** Content used when no LLM is connected - fully filled so the page is usable. */
export function demoLanding(brand: Brand | null, goal: string, style: LandingContent["style"], language: "he" | "en"): LandingContent {
  const name = brand?.name || (language === "he" ? "העסק שלך" : "Your business");
  const he = language === "he";
  const base: LandingContent = {
    style,
    language,
    hero: {
      eyebrow: name,
      title: goal || (he ? `${name} – בדיוק מה שחיפשת` : `${name} – exactly what you were looking for`),
      subtitle: brand?.description || (he ? "שירות אישי, תוצאות שרואים, ומענה מהיר לכל שאלה." : "Personal service, visible results and fast answers."),
      cta: he ? "אני רוצה פרטים" : "Get details",
    },
    benefits: he
      ? [
          { icon: "⚡", title: "מענה מהיר", text: "חוזרים אליך עוד היום, בלי לחכות." },
          { icon: "🎯", title: "מותאם בדיוק לך", text: "מתחילים בשיחה קצרה ומבינים מה באמת צריך." },
          { icon: "🤝", title: "ליווי עד הסוף", text: "אנחנו איתך בכל שלב, גם אחרי." },
        ]
      : [
          { icon: "⚡", title: "Fast response", text: "We get back to you today." },
          { icon: "🎯", title: "Tailored to you", text: "We start with a short call to understand your needs." },
          { icon: "🤝", title: "With you all the way", text: "Support at every step, and after." },
        ],
    steps: he
      ? [
          { title: "משאירים פרטים", text: "חצי דקה, בלי התחייבות." },
          { title: "שיחת היכרות", text: "מבינים את הצורך ומתאימים פתרון." },
          { title: "מתחילים", text: "יוצאים לדרך עם תוכנית ברורה." },
        ]
      : [
          { title: "Leave your details", text: "30 seconds, no commitment." },
          { title: "Intro call", text: "We understand the need and match a solution." },
          { title: "Get started", text: "We move ahead with a clear plan." },
        ],
    faq: he
      ? [
          { q: "כמה זה עולה?", a: "המחיר תלוי בצורך. בשיחת ההיכרות נותנים הצעה ברורה." },
          { q: "תוך כמה זמן חוזרים אליי?", a: "בדרך כלל באותו יום עסקים." },
        ]
      : [
          { q: "How much does it cost?", a: "It depends on your needs - you get a clear quote on the intro call." },
          { q: "How fast do you reply?", a: "Usually the same business day." },
        ],
    offer: { title: he ? "מתחילים עכשיו" : "Start now", text: he ? "השאירו פרטים ונחזור אליכם עם הצעה מותאמת." : "Leave your details and get a tailored offer.", cta: he ? "לפרטים" : "Details" },
    form: { title: he ? "השאירו פרטים" : "Leave your details", button: he ? "שליחה" : "Send", fields: ["name", "phone", "email"] },
    seo: { title: `${name}`, description: brand?.description || name },
  };
  if (style === "comparison")
    base.comparison = {
      title: he ? "למה לבחור בנו" : "Why choose us",
      us: name,
      them: he ? "אחרים" : "Others",
      rows: he
        ? [
            { label: "זמן תגובה", us: "אותו יום", them: "כמה ימים" },
            { label: "ליווי אישי", us: "✔", them: "חלקי" },
            { label: "שקיפות במחיר", us: "✔", them: "✖" },
          ]
        : [
            { label: "Response time", us: "Same day", them: "Days" },
            { label: "Personal support", us: "✔", them: "Partial" },
            { label: "Transparent pricing", us: "✔", them: "✖" },
          ],
    };
  if (style === "story" || style === "brand")
    base.story = {
      title: he ? "הסיפור שלנו" : "Our story",
      paragraphs: [brand?.description || (he ? "התחלנו מתוך אהבה למה שאנחנו עושים, וממשיכים כי אנחנו רואים את ההבדל אצל כל לקוח." : "We started out of love for what we do and keep going because we see the difference for every client.")],
    };
  return base;
}
