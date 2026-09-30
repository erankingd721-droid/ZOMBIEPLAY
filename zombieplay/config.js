/* =====================================================================
   ⚙️  ההגדרות של האתר: משנים רק כאן.
   סטטוס לייב, עוקבים ב-Kick, משחקים וקליפים נמשכים אוטומטית מ-Kick.
   הסרטונים החדשים ביוטיוב נוספים לבד (עד 15 האחרונים).
   ===================================================================== */
window.SITE_CONFIG = {

  // ─── 1. הערוצים ──────────────────────────────────────────────────────
  youtube: {
    handle: "@ZombiePlay55",
    channelId: "UCGJrR9YJPbWkr3HizjM0MPg",
    // אופציונלי: מפתח YouTube Data API. עם מפתח, מספר המנויים מתעדכן בזמן אמת
    // והאתר מזהה גם לייב ביוטיוב (בלי מפתח: לייב מזוהה רק מ-Kick). הסבר ב-README.
    apiKey: "AIzaSyB8LhTUuBsUKYkMhtMJstFhkW86lvykEKA",   // נעול לכתובות של האתרים ב-Google Cloud
  },
  kick: "zombieplay55",


  // ─── 2. שם ומיתוג ────────────────────────────────────────────────────
  name: "ZombiePlay",
  owner: "ערן",                    // מופיע ב"נעים להכיר. אני ערן."
  wordmark: ["ZOMBIE", "PLAY"],    // הלוגו בטקסט: חלק ראשון לבן, חלק שני בצבע
  accent: "#3DFF1F",               // הירוק של ה-ZP


  // ─── 3. הכותרת הראשית ────────────────────────────────────────────────
  hero: {
    line1: "מת מצחוק.",
    line2: "חי בלייבים.",
    subtitle: "מיינקראפט, משחקי אימה ומשחקי צופים. לייבים ביוטיוב וב-Kick, עם הצ׳אט הכי חי שיש.",
    // הפתק ליד הזומבי (שורה רגילה + שורה צבעונית)
    stickerOffline: ["הזומבי ישן.", "תכף מתעורר."],
    stickerLive: ["הזומבי ער!", "בואו לצ׳אט."],
  },


  // ─── 4. עליי ─────────────────────────────────────────────────────────
  about: {
    text: "יו, כאן ערן מ-ZombiePlay. אני עושה סרטונים ולייבים של מיינקראפט, משחקי אימה ומשחקי צופים, ביוטיוב וב-Kick. בניתי את האתר הזה כדי שיהיה מקום אחד לכל מה שקורה בערוץ.",
    note: ["אותו זומבי מהלייב.", "רק בלי הצ׳אט."],
    // type: "subs" / "followers" / "game" / "since" מתמלאים לבד
    facts: [
      { type: "subs" },
      { type: "game" },
      { icon: "chat", label: "בלייבים", title: "משחקי צופים", text: "הצ׳אט בוחר, אני סובל. ככה זה עובד." },
      { type: "since" },
    ],
  },


  // ─── 5. קישורים ──────────────────────────────────────────────────────
  // יוטיוב ו-Kick מופיעים אוטומטית. כאן מוסיפים את השאר.
  // ⚠️ דיסקורד: צריך קישור הזמנה שלא פג תוקף (בדיסקורד: הזמנה ← "אף פעם לא יפוג")
  links: {
    discord: "https://discord.gg/ua2XmqtKT",
    tiktok: "",
    instagram: "",
    whatsapp: "",
    x: "",
    twitch: "",
    email: "",
  },
  // אפשר לשנות את הטקסט שמופיע ליד כל רשת
  linkTexts: {
    youtube: "סרטונים, שורטס ולייבים של מיינקראפט ומשחקי אימה.",
    kick: "הלייבים בזמן אמת, עם הצ׳אט הכי חי שיש.",
  },


  // ─── 6. הקהילה ───────────────────────────────────────────────────────
  // יעדי המנויים והעוקבים מחושבים לבד (הרף העגול הבא). מטרות נוספות:
  goals: [
    // { title: "100 צפיות בלייב", current: 64, target: 100, reward: "לייב 24 שעות" },
  ],

  // יעדי הלייב מהבוט (KickGuard). מופיעים בכרטיס "מטרות קהילה" רק בזמן לייב, כשהבוט רץ במחשב.
  // הכתובת: ה-Webhook URL מלוח הבקרה של הבוט, עם /public/goals במקום /webhook.
  botGoals: {
    url: "https://dayroom-pope-reseller.ngrok-free.dev/public/goals",
    everySeconds: 30,
  },

  // פארק הזומבים (game.html): משחק לצופים. המצב מגיע מהבוט. הכתובת: אותה כתובת ngrok עם /public/game.
  game: {
    url: "https://dayroom-pope-reseller.ngrok-free.dev/public/game",
  },

  // משחקי צ'אט (games.html): איש תלוי, חידות, טריוויה ועוד. המצב מגיע מהבוט. הכתובת: אותה כתובת ngrok עם /public/games.
  chatGames: {
    url: "https://dayroom-pope-reseller.ngrok-free.dev/public/games",
  },

  // אזור מודים ומנהל (mod.html). הקודים נמצאים בלוח הבקרה של הבוט ולא כאן.
  // url: אותה כתובת ngrok, עם /mod בסוף.
  modArea: {
    url: "https://dayroom-pope-reseller.ngrok-free.dev/mod",
    // חוקי הערוץ למודים, שורה לכל חוק. ריק = הקטע לא מופיע.
    rules: [
    ],
    commands: [
      { cmd: "!guard status", text: "מצב ההגנה מבוטים" },
      { cmd: "!guard lock / unlock", text: "נעילה ידנית נגד פשיטת פולואו-בוטים, וביטולה" },
      { cmd: "!guard undo", text: "ביטול הבאנים מהפשיטה האחרונה (אם הבוט טעה)" },
      { cmd: "!יעדים  /  !goals", text: "התקדמות היעדים של הלייב (לכולם)" },
      { cmd: "!זמן", text: "כמה זמן בלייב (לכולם)" },
      { cmd: "!goals report", text: "שליחת עדכון יעדים מלא לצ׳אט" },
      { cmd: "!goals end", text: "סיכום סוף לייב בשני הצ׳אטים, לפני שמסיימים" },
    ],
    // טיפים חופשיים למודים
    notes: [
    ],
  },

  // לוח שידורים (אופציונלי). אם ריק, הכרטיס לא מופיע.
  schedule: [
    // { day: "חמישי", time: "20:00", title: "מיינקראפט עם הצ׳אט" },
  ],


  // ─── 7. איך עוזרים לערוץ ─────────────────────────────────────────────
  support: {
    title: "איך עוזרים\nלזומבי לגדול?",   // \n = שורה חדשה
    text: "הערוץ עוד קטן, וכל עזרה מרגישה. הנה איך אפשר לעזור לזומבי לגדול (חוץ מלא לאכול אותו).",
  },

  // טקסטים קטנים נוספים
  texts: {
    liveOffline: "הזומבי ישן כרגע. כשהלייב עולה ביוטיוב או ב-Kick, הכרטיס הזה מתעורר.",
  },


  // ─── 8. תמונות ───────────────────────────────────────────────────────
  images: {
    avatar: "https://yt3.googleusercontent.com/sysvsqHoWWCxCr86CSvAauorkUeVwqX8ei6Av-Cd4vxG-5XbQrVbgq34wlHcJzoCRTAHv211QA=s240-c-k-c0x00ffffff-no-rj",
    banner: "https://yt3.googleusercontent.com/8PMoTGueMUuCJEslA-qpirSLjiy2KFg34nGuOW9MyUqApicU-Kv9v0uOFOQbNHJsMdL4YVOl=w2120-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
    about: "assets/img/stickers/01_happy_love.png",
  },

  // הסטיקרים של הזומבי (שם הקובץ בתיקייה assets/img/stickers + שם באנגלית)
  stickers: [
    { file: "01_happy_love.png", name: "LOVE", he: "מאוהב" },
    { file: "02_shocked.png", name: "SHOCK", he: "בהלם" },
    { file: "03_angry.png", name: "ANGRY", he: "עצבני" },
    { file: "04_scared.png", name: "SCARED", he: "מפחד" },
    { file: "05_crying.png", name: "CRY", he: "בוכה" },
    { file: "06_thinking.png", name: "THINK", he: "חושב" },
    { file: "07_sleepy_tired.png", name: "SLEEPY", he: "עייף" },
    { file: "08_blushing_shy.png", name: "SHY", he: "מתבייש" },
  ],
};
