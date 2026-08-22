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
- [x] إضافة مظهر «الستار» التفاعلي لغرفة ألعاب الكلمات بإعادة استخدام آلية الصناديق دون تكرار للكود
- [x] تطوير وهندسة قالب «سلَّم الارتقاء» (Mastery Ladder) بخياري 5 و10 درجات والصعود عند الصواب والهبوط عند الخطأ
- [x] ضبط وتأكيد وصولية المعلم الكفيف وقارئات الشاشة عبر ARIA Live Regions واختصارات لوحة المفاتيح
- [x] تطهير وتوحيد الدوال البرمجية المكررة في كامل المنظومة (Function Deduplication & 100% DRY)
- [x] تنقية واختزال تكرارات ملف التنسيقات `core.css` وضبط السمات اللونية
- [x] تطهير الأكواد الميتة (Dead Code Elimination) عبر 5 مراحل منهجية شاملة
- [x] التدقيق الشامل للمستودع وإصلاح خطأ صياغة صفحة 31 وترقية وصولية المراجعة الذكية renderReview وتحديث التوثيق
- [x] تفكيك ملف التنسيقات المشترك إلى 9 وحدات تخصصية في `shared/css/` وبناء سكربت التدقيق الآلي `validate_assets.py`
- [x] تفكيك وحدة التنسيقات المساعدة `utilities.css` إلى 8 وحدات فرعية دقيقة في `shared/css/utilities/`
- [x] تحديث سجل التغييرات وحالة المشروع والتوثيق

## حالة الملفات (Files Status)

| الملف | الحالة |
|---|---|
| shared/core.css | complete |
| shared/css/tokens.css | complete |
| shared/css/base.css | complete |
| shared/css/utilities.css | complete |
| shared/css/utilities/layout.css | complete |
| shared/css/utilities/spacing.css | complete |
| shared/css/utilities/text.css | complete |
| shared/css/utilities/colors.css | complete |
| shared/css/utilities/borders.css | complete |
| shared/css/utilities/effects.css | complete |
| shared/css/utilities/buttons.css | complete |
| shared/css/utilities/responsive.css | complete |
| shared/css/typography.css | complete |
| shared/css/cards.css | complete |
| shared/css/components.css | complete |
| shared/css/games-wordwall.css | complete |
| shared/css/games-board.css | complete |
| shared/css/animations.css | complete |
| validate_assets.py | complete |
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
