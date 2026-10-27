# העלאה ל-Railway וחיבור WhatsApp

המדריך מחולק לשלושה חלקים: העלאה ל-Railway (כ-15 דקות), הגדרת WhatsApp אצל Meta (כ-20 דקות), וחיבור של שניהם.

## חלק א – העלאה ל-Railway

1. נכנסים ל-https://railway.com ונרשמים עם חשבון GitHub.
2. לוחצים על **New Project**, בוחרים **Deploy from GitHub repo** ואז את `kazabaroza/the-agency-power`. Railway מזהה את קובץ ה-`Dockerfile` ובונה את המערכת לבד.
3. **דיסק קבוע (חובה):** בשירות שנוצר בוחרים **Settings ← Volumes ← Add Volume** ומגדירים Mount path: `/app/data`. בלי הדיסק, המשתמשים, הלידים והקבצים נמחקים בכל עדכון.
4. **כתובת:** ב-**Settings ← Networking ← Generate Domain** מקבלים כתובת בסגנון `https://the-agency-power-production.up.railway.app`.
5. **משתנים:** בלשונית **Variables** מוסיפים:
   ```
   APP_URL=https://<הכתובת מסעיף 4>
   SESSION_SECRET=<מחרוזת אקראית ארוכה>
   ANTHROPIC_API_KEY=...
   OPENAI_API_KEY=...
   FAL_KEY=...
   ```
   ב-Railway אין מגבלה על שמות שמתחילים ב-`ANTHROPIC_`, אבל גם `AGENCY_ANTHROPIC_API_KEY` עובד.
6. בודקים שהכתובת נפתחת ושאפשר להיכנס למערכת.

## חלק ב – WhatsApp Cloud API אצל Meta

1. נכנסים ל-https://developers.facebook.com ולוחצים על **My Apps ← Create App**. בוחרים סוג **Business** ומחברים את ה-Business Portfolio שלכם.
2. בעמוד האפליקציה מוסיפים את המוצר **WhatsApp**. Meta נותנת מספר בדיקה חינמי.
3. ב-**WhatsApp ← API Setup** מעתיקים את **Phone number ID**. תחת "To" מוסיפים את הטלפון שלכם כנמען בדיקה ומאשרים בקוד שמגיע בוואטסאפ.
4. **טוקן קבוע:** הטוקן שמופיע בעמוד הזה פג אחרי 24 שעות. לטוקן קבוע:
   Business Settings ← Users ← **System users** ← Add (Admin) ← **Generate token**, בוחרים את האפליקציה ומסמנים את ההרשאות `whatsapp_business_messaging` ו-`whatsapp_business_management`. ב-Assets נותנים ל-System user גישה לחשבון ה-WhatsApp.
5. **App Secret:** נמצא ב-**App settings ← Basic ← App secret**.
6. ממציאים **Verify token**, כל מחרוזת אקראית (למשל `agency-power-7f3k9`).

## חלק ג – חיבור

1. ב-Railway מוסיפים למשתנים:
   ```
   WHATSAPP_TOKEN=<הטוקן הקבוע>
   WHATSAPP_PHONE_NUMBER_ID=<Phone number ID>
   WHATSAPP_VERIFY_TOKEN=<ה-Verify token שהמצאתם>
   WHATSAPP_APP_SECRET=<App secret>
   ```
2. ב-Meta: **WhatsApp ← Configuration ← Webhook ← Edit**:
   - Callback URL: `https://<הכתובת>/api/whatsapp/webhook`
   - Verify token: אותה מחרוזת כמו ב-`WHATSAPP_VERIFY_TOKEN`
   - לוחצים על Verify and save, ואז ב-Webhook fields לוחצים על **Subscribe** ליד `messages`.
3. שולחים הודעה למספר הבדיקה מהטלפון שהוספתם בחלק ב, למשל "היי, יש לי מאפייה בחיפה". הסוכן אמור לענות תוך כמה שניות.

## שימו לב

- **חלון 24 שעות:** WhatsApp מאפשר לעסק לשלוח הודעה חופשית רק תוך 24 שעות מההודעה האחרונה של הלקוח. התראות שמגיעות אחרי זמן רב, כמו ליד חדש או "הסרטון מוכן", לא יגיעו אם החלון נסגר. כדי לשלוח אותן תמיד צריך תבנית הודעה מאושרת (Message Template). אפשר להוסיף את זה כשלב הבא.
- **מספר אמיתי:** מספר הבדיקה מוגבל לנמענים שהוגדרו מראש. כדי לעבוד עם לקוחות אמיתיים מוסיפים מספר עסקי ב-WhatsApp Manager ומאמתים את העסק אצל Meta.
- **בדיקה מהירה:** `scripts/check-whatsapp.sh https://<הכתובת>` בודק את הטוקן ואת ה-webhook בלי לשלוח הודעות.
