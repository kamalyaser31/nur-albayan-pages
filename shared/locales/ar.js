/**
 * Nour Al-Bayan - Arabic Language Pack (ar)
 * الحزمة الأساسية للغة العربية
 */

(function() {
    const meta = {
        name: 'العربية',
        nativeName: 'العربية',
        dir: 'rtl'
    };

    const strings = {
        // مفاتيح الواجهات والنظام تدرج هنا
    };

    if (typeof i18n !== 'undefined') {
        i18n.register('ar', meta, strings);
    }
})();
