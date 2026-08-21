# دليل إطار نور البيان التفاعلي — للنماذج القادمة

## نظرة معمارية عامة

يقوم الإطار على فصل تام بين طبقتين:

| الطبقة | الملف | المسؤولية |
|---|---|---|
| **النواة المشتركة** | `shared/core.css` | كل أنماط CSS وتنسيقات الخطوط والسمات اللونية |
| **النواة المشتركة** | `shared/core.js` | كل منطق التطبيق: الألعاب، الصوت، عرض الكلمات، بناء الواجهة |
| **محتوى الدرس** | `pages/NN Nour-Al-Bayan.html` | **بيانات الدرس فقط** + إعدادات `PAGE_CONFIG` |

صفحات الدروس **لا تحوي أي** CSS، ولا بنية HTML للواجهة، ولا كائنات ألعاب. `core.js` يبني الواجهة كاملةً ويُحقنها في `<body>` لحظة التحميل عبر دالة `buildAppUI()`.

---

## بنية صفحة الدرس المجردة (القالب الوحيد)

```html
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Nour Al-Bayan - [LESSON TOPIC]</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Fredoka:wght@400;600;700;900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../shared/core.css">
</head>
<body class="flex flex-col items-center select-none bg-emerald-50/40">
    <script>
        window.PAGE_CONFIG = { ... };   /* إعدادات الدرس */
        /* + مصفوفة rulesData إن وُجدت */
        const dataset = [ ... ];        /* مصفوفة الكلمات */
    </script>
    <script src="../shared/core.js"></script>
</body>
</html>
```

> **قاعدة صارمة:** لا يوجد في `<body>` سوى هذين الوسمين فقط: `<script>` للبيانات، و`<script src="../shared/core.js">`. كل شيء آخر يبنيه `core.js` تلقائياً.

---

## `window.PAGE_CONFIG` — إعدادات الدرس

```js
window.PAGE_CONFIG = {
    title:    'Nour Al-Bayan',          // نص العنوان الكبير في الصفحة الرئيسية
    subtitle: 'Mutaharrik Syllables',   // السطر التوضيحي تحت العنوان
    footer:   'Nour Al-Bayan System',   // نص تذييل الصفحة
    game3:    'memory'                  // نوع اللعبة الثالثة: 'memory' أو 'riddles'
};
```

**قيمة `game3`:**
- `'memory'` — لعبة مطابقة البطاقات (الافتراضي لمعظم الدروس)
- `'riddles'` — صندوق الألغاز السرية (الدروس 31، 32، 33)

---

## مصفوفة `dataset` — الكلمات التعليمية

### النمط الأول: كلمات مشكّلة (HTML)
يُستخدم في الدروس 20–37، وكل كلمة عبارة عن HTML جاهز يعرضه المحرك مباشرةً.

```js
const dataset = [
    {
        w:     "<span class='c-black'>بَا</span><span class='c-red'>بٌ</span>",
        info:  "وصف الكلمة / اسم المجموعة",  // يظهر في نافذة الكشف الكبيرة
        theme: "pink",   // لون الإطار: 'pink' | 'green' | 'yellow' | 'blue'
        t:     "normal"  // نوع البطاقة (انظر الجدول أدناه)
    },
    ...
];
```

### النمط الثاني: كلمات مقطّعة (segments)
يُستخدم في الدرس 19 والدروس المماثلة، تعرض كل مقطع في صندوق ملوّن مستقل.

```js
const dataset = [
    {
        segs:  ["أُ", "ذِ", "نَ"],       // مصفوفة المقاطع تُعرض من اليمين لليسار
        plain: "أُذِنَ",                 // النص الصافي لشريط التنقل
        info:  "Harakat Examples",
        theme: "pink",
        t:     "normal"
    },
    ...
];
```

### جدول أنواع البطاقات (`t`)

| القيمة | التأثير | النقاط عند الإجابة الصحيحة |
|---|---|---|
| `"normal"` | بطاقة عادية، لا صوت خاص | +2 |
| `"golden"` | بطاقة ذهبية، يُشغَّل صوت الاحتفال | +10 |
| `"danger"` | بطاقة تحدٍّ، يُشغَّل صوت التحذير | +2 (أو −5 عند الخطأ) |
| `"speed"` | بطاقة السرعة، يظهر عداد 10 ثوانٍ | +5 (ضمن الوقت) |

---

## `rulesData` — قواعد الدرس (اختياري)

أضِفها قبل `dataset` عند وجود قواعد تجويدية أو نحوية يجب عرضها قبل بدء التحدي.

```js
const rulesData = [
    {
        title: "اسم القاعدة",
        desc:  "شرح نثري مختصر للقاعدة",
        html:  "<span class='c-black'>نَصٌّ</span> <span class='c-red'>تَوْضِيحِيٌّ</span>"
        // html: محتوى يُعرض بخط قرآني كبير في وسط الشاشة
    },
    // يمكن تعدد القواعد، يتنقل بينها المستخدم بزرَّي "Back / Next"
];
```

**تأثير وجود `rulesData`:**
- يُضاف زر "📖 Lesson Rules" تلقائياً في القائمة الرئيسية.
- يُضاف مرحلة عرض القواعد (`#rule-stage`) قبل بدء التحدي.
- يُفعَّل `app.jumpTo('rules')` من زر القائمة.

---

## أنماط بناء `dataset` المتقدمة

بعض الدروس تُعرِّف مصفوفات وسيطة ثم تبني `dataset` بـ `map()`. هذا مقبول ومدعوم طالما أن المتغير النهائي اسمه `dataset`:

```js
// مثال: الدرس 34
const rawWords = ["<span>...</span>", "<span>...</span>"];
const typesArr = ['normal', 'speed', 'danger', 'golden', ...];
const themesArr = ['pink', 'green', 'blue', 'yellow'];
const dataset = rawWords.map((wordHTML, index) => ({
    w:     wordHTML,
    info:  "اسم المجموعة",
    theme: themesArr[Math.floor(index / 8) % themesArr.length],
    t:     typesArr[index % typesArr.length]
}));
```

---

## الألوان المستخدمة في CSS

### ألوان النصوص القرآنية

```css
.c-red,  .c0  { color: #dc2626; }   /* الأجزاء المميزة / الحركات */
.c-blue, .c1  { color: #2563eb; }   /* الجذر / المقطع الأوسط */
.c-black,.c2  { color: #1e293b; }   /* النص الأساسي */
.c-purple     { color: #9333ea; }
.sep-bar      { color: #cbd5e1; }   /* فاصل المقاطع | */
```

### أثيمات إطار الكلمة (`theme`)
القيمة تُضاف تلقائياً كصنف CSS `.theme-pink`، `.theme-green`، إلخ.

---

## الكائنات المُوفَّرة في `core.js`

جميعها متاحة عالمياً دون تعريف إضافي في صفحة الدرس:

| الكائن | الدور |
|---|---|
| `app` | المحرك الرئيسي: عرض الكلمات، النقاط، التنقل، الانتقال بين المراحل |
| `Sound` | محرك الصوت (Web Audio API): `.golden()`, `.danger()`, `.flip()`, `.nav()`, إلخ |
| `wordwallRoom` | إدارة غرفة الألعاب الثلاثة (Open Box, Spin Wheel, Random Cards) |
| `wheelGame` | لعبة عجلة الحظ (Canvas) |
| `cardsGame` | لعبة الأوراق العشوائية |
| `xoGame` | لعبة XO (Tic-Tac-Toe) |
| `c4Game` | لعبة Connect 4 |
| `memoryGame` | لعبة مطابقة البطاقات |
| `riddlesGame` | لعبة الألغاز السرية |
| `ruleManager` | إدارة عرض القواعد (يعمل تلقائياً عند وجود `rulesData`) |
| `buildAppUI()` | تُبني HTML الواجهة كاملةً وتُحقن في `<body>` (تُستدعى من `app.init()`) |
| `fireCelebration()` | إطلاق فرقعة الاحتفال (canvas-confetti) |

---

## كيفية تجريد صفحة جديدة (خطوات مضمونة)

### الخطوة 1 — استخلاص البيانات

من الصفحة الأصلية، ابحث عن أول تعريف `const` يبدأ بأحد هذه الأسماء واستخرج كل شيء حتى `const wordwallColors` أو `const app =`:

```
rulesData | themes | rawData | rawWords | processedWords | typesArr | themesArr | dataset
```

> **تحذير:** لا تقطع الاستخراج عند `const ruleManager =`. تابع حتى تجد `const wordwallColors` أو `const app =` أو `window.onload`.

### الخطوة 2 — قراءة إعدادات الصفحة

من الصفحة الأصلية اقرأ:
- نص `<h1>` داخل `#main-menu-stage` → `PAGE_CONFIG.title`
- نص `<p>` داخل `#main-menu-stage` → `PAGE_CONFIG.subtitle`
- نص `<footer>` → `PAGE_CONFIG.footer`
- هل يوجد `#riddles-stage` أو `riddlesGame` في الكود؟ → `game3: 'riddles'`، وإلا → `game3: 'memory'`

### الخطوة 3 — بناء الصفحة المجردة

انسخ القالب الوارد في القسم الأول أعلاه والصق فيه:
1. `PAGE_CONFIG` بالقيم المستخرجة
2. كتلة البيانات الأصلية كاملةً دون تغيير حرف واحد

### الخطوة 4 — التحقق

شغّل فحصاً على الصفحة الجديدة:

```js
// اختبار Node.js بسيط (انظر test_node.js السابق)
app.init();
app.jumpTo('word_0');
app.evaluate(true);
app.evaluate(false);
app.jumpTo('ww_box');
app.jumpTo('ww_wheel');
app.jumpTo('ww_cards');
```

لا يجب أن يُرمى أي خطأ.

---

## الأخطاء الشائعة وعلاجها

| الخطأ | السبب | العلاج |
|---|---|---|
| `dataset is not defined` | لم يتم استخراج المصفوفة كاملاً | أعد القراءة، ابحث عن `const dataset` في الكود الأصلي |
| `themes is not defined` | توقف الاستخراج قبل تعريف `themes` | ابدأ الاستخراج من أول متغير وسيط (themes, rawData...) لا من `dataset` |
| `ruleManager is not defined` | أُدرج `const ruleManager` في كتلة البيانات عن طريق الخطأ | احذفه من صفحة الدرس؛ `core.js` يوفره بالفعل |
| `Identifier 'dataset' has already been declared` | كُرِّرت `dataset` مرتين أو أن `core.js` يعرفها أيضاً | تأكد أن `core.js` لا يعرِّف `dataset` وأن صفحة الدرس تعرفها مرة واحدة |
| `Sound.nav is not a function` | نسخة قديمة من `core.js` | تحقق من أن `Sound` في `core.js` تحوي الدوال: `nav, tap, drop, win, success, fail` |

---

## ملاحظات الترقيم والتسمية

- ملفات الدروس مسماة: `NN Nour-Al-Bayan.html` حيث `NN` رقم الدرس (19–37)
- بعضها بامتداد `.HTML` (حروف كبيرة): 22، 23، 24 — احتفظ بهذا الاسم كما هو
- بعضها مسافة مزدوجة بعد الرقم: 20، 21، 22، 23، 24، 25، 26، 28، 29، 30، 33، 34، 35 — احتفظ بها كما هي
- بعد إضافة صفحة جديدة، شغّل `python update_index.py` لتحديث `index.html` تلقائياً

---

## ملخص حجم المشروع

| | قبل التجريد | بعد التجريد |
|---|---|---|
| مجموع الصفحات | ~1,400 KB | ~160 KB |
| مجموع shared/ | — | ~76 KB |
| **الإجمالي الفعلي** | ~1,400 KB | **~236 KB** |
| **نسبة التوفير** | — | **~83%** |

> جزء كبير من النواة يُحمَّل مرة واحدة في ذاكرة المتصفح (Browser Cache) ويُعاد استخدامه في كل الصفحات.

---

## الملفات الرئيسية

| الملف | الغرض |
|---|---|
| [`shared/core.js`](shared/core.js) | محرك التطبيق والألعاب وبناء الواجهة |
| [`shared/core.css`](shared/core.css) | الأنماط والتنسيقات المشتركة |
| [`pages/`](pages/) | صفحات الدروس المجردة (بيانات فقط) |
| [`update_index.py`](update_index.py) | تحديث فهرس `index.html` تلقائياً |
| [`index.html`](index.html) | الصفحة الرئيسية بروابط الدروس |
