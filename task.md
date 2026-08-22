# مهام إعادة الهيكلة والتطوير الشامل (Refactoring & Modernization Task List)

## الحالة الإجمالية: مكتمل (complete)

- [x] تجريد وفحص ملفات الدروس الـ19 الأولى (19 إلى 37)
- [x] استخراج الأصول المشتركة إلى `shared/core.css` و `shared/core.js`
- [x] تجريد الملفات الـ9 الجديدة (10 إلى 18) وربطها بالنواة المشتركة
- [x] توسيع النواة المشتركة لدعم كافة أنماط عرض الكلمات (`segs`, `boxes`, `groups`, `html`, `multiBox`)
- [x] إصلاح الخلل الجذري في عرض وتجاور البطاقات المقسمة (`boxes`, `multiBox`)
- [x] تطوير التجاوب البصري لكافة الشاشات (الهواتف، الأجهزة اللوحية، الحواسيب، والسبورات الذكية)
- [x] إدراج بطاقة المطور والدعاء الثابتة في القائمة الرئيسية
- [x] مراجعة وتدقيق منطقة جميع الألعاب وإصلاح علل الذاكرة والتعادل وعجلة الحظ
- [x] توحيد وضبط أسماء صفحات الدروس لتصبح بأرقامها المجردة (`10.html` إلى `37.html`)
- [x] التحول للاستقلال التام دون إنترنت (Offline-First) واستبدال Play CDN بـ `core.css` المترجم محلياً
- [x] توفير مكتبات `Chart.js` و `canvas-confetti` وخطوط `Amiri` و `Fredoka` محلياً داخل `shared/vendor/`
- [x] إعادة تصميم صفحة الفهرس `index.html` بشبكة بطاقات تفاعلية متجاوبة وجميلة
- [x] إدراج اختصارات لوحة المفاتيح والوصول الشامل (ARIA) ونمط المراجعة الذكية للأخطاء وشريط التقدم التفاعلي
- [x] التحقق الفني الثلاثي الشامل (Pass 1 Node Simulation, Pass 2 Offline Audit, Pass 3 Index & A11y)
- [x] تحديث سجل التغييرات وحالة المشروع والتوثيق

## حالة الملفات (Files Status)

| الملف | الحالة |
|---|---|
| shared/core.css | complete |
| shared/sound.js | complete |
| shared/ui-template.js | complete |
| shared/app.js | complete |
| shared/games-wordwall.js | complete |
| shared/games-board.js | complete |
| shared/games-extra.js | complete |
| shared/rule-manager.js | complete |
| shared/vendor/chart.umd.min.js | complete |
| shared/vendor/confetti.browser.min.js | complete |
| shared/vendor/fonts/ | complete |
| pages/10.html | complete |
| pages/11.html | complete |
| pages/12.html | complete |
| pages/13.html | complete |
| pages/14.html | complete |
| pages/15.html | complete |
| pages/16.html | complete |
| pages/17.html | complete |
| pages/18.html | complete |
| pages/19.html | complete |
| pages/20.html | complete |
| pages/21.html | complete |
| pages/22.html | complete |
| pages/23.html | complete |
| pages/24.html | complete |
| pages/25.html | complete |
| pages/26.html | complete |
| pages/27.html | complete |
| pages/28.html | complete |
| pages/29.html | complete |
| pages/30.html | complete |
| pages/31.html | complete |
| pages/32.html | complete |
| pages/33.html | complete |
| pages/34.html | complete |
| pages/35.html | complete |
| pages/36.html | complete |
| pages/37.html | complete |
| update_index.py | complete |
| index.html | complete |
