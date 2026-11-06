export const metadata = { title: "מדיניות פרטיות – The Agency Power" };
export const dynamic = "force-dynamic";

const sections: [string, string[]][] = [
  ["אילו נתונים נשמרים", [
    "כתובת מייל או מספר וואטסאפ שאיתם נכנסים למערכת, ושם אם נמסר.",
    "תוכן השיחות עם הסוכן, ופרטי העסק שנמסרו בשיחה.",
    "התכנים שנוצרו: פוסטים, באנרים, דפי נחיתה, סרטונים וקמפיינים.",
    "לידים שהשאירו מבקרים בדפי הנחיתה (שם, טלפון, מייל), לשימוש בעל העסק בלבד.",
    "מפתחות וחיבורים לחשבונות (Facebook, ‏Instagram ואחרים) שבעל העסק חיבר.",
  ]],
  ["למה משתמשים בהם", [
    "כדי להפעיל את השירות: לענות בצ'אט, לייצר תכנים, ולפרסם או להפעיל קמפיינים רק אחרי אישור של בעל העסק.",
    "הנתונים לא נמכרים ולא משמשים לפרסום.",
  ]],
  ["שירותים חיצוניים", [
    "חלק מהעבודה נעשית אצל ספקים: Anthropic ‏(Claude), ‏OpenAI, ‏fal.ai, ‏Meta ‏(WhatsApp, ‏Facebook, ‏Instagram), ‏Google, ‏Resend (מיילים) ו-Fly.io (אחסון).",
    "לכל ספק נשלח רק מה שנדרש למשימה.",
  ]],
  ["פרסום ברשתות", [
    "פוסטים עולים לעמוד הפייסבוק או לחשבון האינסטגרם של בעל העסק רק אחרי לחיצה על כרטיס אישור.",
    "אפשר לנתק את החיבור בכל רגע, בהגדרות החשבון ב-Meta או בעמוד החיבורים במערכת.",
  ]],
  ["שמירה ומחיקה", [
    "הנתונים נשמרים בשרת מאובטח, עם גיבוי יומי שנשמר עד 30 יום.",
    "לבקשת מחיקה של כל הנתונים אפשר לפנות במייל שלמטה, והמחיקה תתבצע תוך 30 יום.",
  ]],
];

export default function Privacy() {
  const contact = process.env.PRIVACY_CONTACT_EMAIL || process.env.EMAIL_REPLY_TO || "";
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <a href="/" className="text-sm opacity-70">← The Agency Power</a>
      <h1 className="mt-4 text-3xl font-extrabold">מדיניות פרטיות</h1>
      <p className="mt-2 opacity-70">עודכן לאחרונה: נובמבר 2026</p>
      {sections.map(([title, items]) => (
        <section key={title} className="card mt-6 p-6">
          <h2 className="text-xl font-bold">{title}</h2>
          <ul className="mt-3 list-disc space-y-2 pr-5 opacity-90">{items.map((t) => <li key={t}>{t}</li>)}</ul>
        </section>
      ))}
      <section className="card mt-6 p-6">
        <h2 className="text-xl font-bold">יצירת קשר</h2>
        <p className="mt-3 opacity-90">{contact ? <>לשאלות ולבקשות מחיקה: <a className="text-brand underline" href={`mailto:${contact}`}>{contact}</a></> : "לשאלות ולבקשות מחיקה אפשר לפנות לבעל השירות."}</p>
      </section>
    </main>
  );
}
