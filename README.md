# The Agency Power

סוכנות שיווק של סוכני AI לעסקים קטנים. בעל העסק כותב בצ'אט (באתר או בוואטסאפ), ומנהל חשבון AI מחלק את העבודה בין מומחים מ-[The Agency](https://github.com/msitarzewski/agency-agents) ומייצר פוסטים, באנרים, דפי נחיתה, סרטונים, פרסומים מתוזמנים וקמפיינים ממומנים. כל דבר שעולה כסף או יוצא לציבור מחכה לכרטיס אישור.

אין במערכת חיובים או מנויים.

## הפעלה

```bash
npm install
cp .env.example .env.local   # הכל אופציונלי
npm run build && npm start   # http://localhost:3000
```

בלי מפתחות המערכת רצה ב**מצב הדגמה**: הסוכן מבין בקשות פשוטות, מייצר באנרים ודפי נחיתה אמיתיים, ושומר קמפיינים ופרסומים בלי להוציא כסף. קוד הכניסה מוצג על המסך עד שמחברים שירות מייל (Resend).

בסביבות שבהן שמות שמתחילים ב-`ANTHROPIC_` שמורים למערכת (למשל סביבות הענן של Claude Code), שמים את המפתח במשתנה `AGENCY_ANTHROPIC_API_KEY`. כל משתנה אחר מהרשימה עובד גם עם הקידומת `AGENCY_`.

מאחורי פרוקסי (למשל בסביבות הענן של Claude Code) מפעילים את השרת עם `NODE_USE_ENV_PROXY=1`. בלי זה, הפניות של Node ל-OpenAI, ל-Meta ולשירותים אחרים לא עוברות דרך הפרוקסי ונכשלות עם "Connection error". השתמשו ב-Node 22.21 ומעלה.

דרוש Node 22.5 ומעלה (המערכת משתמשת ב-SQLite המובנה של Node). הנתונים נשמרים ב-`data/agency.db`, והקבצים שנוצרים ב-`data/uploads`.

## ארכיטקטורה

| שכבה | קובץ | מה זה עושה |
|---|---|---|
| מנהל החשבון | `lib/agents/director.ts` | לולאת Claude עם כלים, כרטיסי אישור, ומצב הדגמה מבוסס כוונות |
| המומחים | `lib/agents/registry.ts`, `lib/agents/specialist.ts`, `agents/` | 283 פרסונות מ-The Agency; כל אחת רצה כסוכן-משנה עם הפרסונה כ-system prompt |
| הכישורים (Skills) | `lib/skills/index.ts` | 12 כלים: ניתוח עסק, מחקר שוק, התייעצות עם מומחה, פוסט/קרוסלה, באנר, דף נחיתה, סרטון, תזמון, קהלים, קמפיין, דוח, רשימת נכסים |
| ספקים | `lib/providers/*` | Claude, ‏OpenAI (gpt-image), ‏fal.ai (וידאו ב-Seedance 2.0 ותמונות), ‏Unsplash, ‏WhatsApp Cloud API, ‏Facebook/Instagram/LinkedIn/TikTok/YouTube, ‏Meta Marketing API, ‏Google Ads API |
| מתזמן | `lib/scheduler.ts`, `instrumentation.ts` | כל דקה: מפרסם פוסטים שהגיע זמנם ומושך סרטונים שסיימו רינדור |
| דפי נחיתה | `lib/landing.ts`, `app/p/[slug]` | 4 סגנונות, טופס לידים, מדידת צפיות, כפתור וואטסאפ |

### כישורים שדורשים אישור
`create_video`, `schedule_post` ו-`create_ad_campaign`. כשמנהל החשבון קורא לאחד מהם נוצר כרטיס אישור, בווב או ככפתורים בוואטסאפ, והכלי רץ רק אחרי לחיצה. קמפיינים ב-Meta נבנים מושהים ומופעלים רק אחרי שכל החלקים נוצרו.

### מודל
ברירת המחדל היא `claude-opus-5-5` עם effort בינוני (`AGENT_MODEL`, `AGENT_EFFORT`), עם fallback בצד השרת למקרה של סירוב (`fallbacks: "default"`). מחקר שוק משתמש בכלי חיפוש הרשת של Claude.

## חיבור WhatsApp
1. יוצרים אפליקציה ב-Meta עם מוצר WhatsApp ומקבלים `WHATSAPP_TOKEN` ו-`WHATSAPP_PHONE_NUMBER_ID`.
2. מגדירים Webhook לכתובת `https://<הדומיין>/api/whatsapp/webhook`, עם אותו `WHATSAPP_VERIFY_TOKEN` שב-env, ונרשמים לאירוע `messages`.
3. מגדירים `WHATSAPP_APP_SECRET` כדי שחתימות ה-webhook ייבדקו.

## הערות
- סרטוני מציג ו-UGC: קריינות בעברית מ-OpenAI TTS ומציג/ה מסונכרנ/ת שפתיים ב-Kling AI Avatar v2 (fal.ai). מודלי וידאו שמייצרים דיבור בעצמם משבשים עברית. סרטוני מוצר ואנימציה נשארים ב-Seedance 2.0.
- OpenAI סגרה את ממשק הווידאו של Sora ב-24.9.2026, ולכן הסרטונים נוצרים ב-fal.ai. מחליפים מודל עם `FAL_VIDEO_MODEL`.
- `APP_URL` חייב להיות כתובת ציבורית כדי ש-Instagram, ‏TikTok ו-Meta יוכלו למשוך תמונות וסרטונים.
- בפרסום ל-LinkedIn התמונה נשלחת כקישור. העלאת תמונה נייטיבית לא מומשה.
- בדפי הנחיתה מוצגות המלצות רק אם בעל העסק סיפק המלצות אמיתיות.

## רישיון הסוכנים
הקבצים בתיקייה `agents/` לקוחים מ-agency-agents, © AgentLand Contributors, תחת רישיון MIT. ראו `agents/LICENSE`.
