/**
 * تحديث زر اللغة وشارة الطالب النشط في ترويسة الدرس تلقائياً
 */
function updateTopNavLang() {
    if (typeof i18n === 'undefined') return;
    const isAr = i18n.getLocale() === 'ar';
    const langBtnText = document.getElementById('top-nav-lang-text');
    const langBtn = document.getElementById('top-nav-lang-btn');
    if (langBtnText) {
        langBtnText.textContent = isAr ? 'EN' : 'عربي';
    }
    if (langBtn) {
        langBtn.setAttribute('aria-label', isAr ? 'التحويل إلى اللغة الإنجليزية' : 'Switch to Arabic language');
    }
}

/**
 * تحديث شارة الطالب النشط في ترويسة الدرس تلقائياً عبر studentManager
 */
function updateActiveStudentPill() {
    const pill = document.getElementById('active-student-pill');
    const nameEl = document.getElementById('active-student-name-text');
    const avatarEl = document.getElementById('active-student-avatar-icon');
    if (!nameEl || !avatarEl) return;

    if (typeof studentManager !== 'undefined' && typeof studentManager.getActiveStudent === 'function') {
        const student = studentManager.getActiveStudent();
        if (student && (student.name || student.id)) {
            nameEl.textContent = student.name || (typeof i18n !== 'undefined' ? i18n.t('student_name_placeholder') : 'طالب');
            avatarEl.textContent = student.avatar || '👤';
            if (pill) {
                pill.setAttribute('aria-label', `${typeof i18n !== 'undefined' ? i18n.t('active_badge') : 'الطالب الحالي'}: ${student.name}`);
                pill.title = student.name;
            }
            return;
        }
    }

    const defaultText = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('general_session') : 'حصة عامة';
    nameEl.textContent = defaultText;
    avatarEl.textContent = '👤';
    if (pill) {
        pill.setAttribute('aria-label', defaultText);
        pill.title = defaultText;
    }
}

/**
 * تحديث تذييل صفحة الدرس تلقائياً
 */
function updateTemplateFooter() {
    const footerEl = document.querySelector('footer');
    if (!footerEl) return;
    const cfg = window.PAGE_CONFIG || {};
    const isAr = (typeof i18n !== 'undefined' && i18n.getLocale() === 'ar');
    let rawSub = cfg.subtitle || '';
    if (isAr) {
        const pageMatch = rawSub.match(/Page\s+(\d+)/i);
        const arBracketMatch = rawSub.match(/\(([^)]+)\)/);
        if (pageMatch && arBracketMatch) {
            rawSub = `الصفحة ${pageMatch[1]} • ${arBracketMatch[1]}`;
        } else if (arBracketMatch) {
            rawSub = arBracketMatch[1];
        }
    }
    const subtitle = rawSub || (isAr ? 'تعليم القراءة وضبط الحركات' : 'Harakat & Reading Practice');
    footerEl.textContent = isAr ? `منظومة نور البيان التعليمية • ${subtitle}` : (cfg.footer || 'Nour Al-Bayan Learning System');
}

/**
 * مزامنة وتحديث واجهة الدرس التصريحية عند تغيير اللغة بالاعتماد التام على i18n.translateDOM
 */
function updateDynamicLessonUI() {
    if (typeof i18n !== 'undefined' && typeof i18n.translateDOM === 'function') {
        i18n.translateDOM();
    }
    updateTopNavLang();
    updateActiveStudentPill();
    updateTemplateFooter();
}

// إتاحة الدوال عالمياً وتحديث الشارة عند جاهزية الصفحة
window.updateActiveStudentPill = updateActiveStudentPill;
window.updateTopNavLang = updateTopNavLang;
window.updateTemplateFooter = updateTemplateFooter;
window.updateDynamicLessonUI = updateDynamicLessonUI;

if (typeof document !== 'undefined') {
    const initTopBar = () => {
        updateActiveStudentPill();
        updateTopNavLang();
        setupModalAccessibility();
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTopBar);
    } else {
        initTopBar();
    }
}

// الاستماع لحدث تغيير اللغة أو الاشتراك في المتجر الموحد لتحديث الواجهة تلقائياً
if (typeof window !== 'undefined') {
    window.addEventListener(NBContracts.EVENTS.LOCALE_CHANGED, updateDynamicLessonUI);
    if (typeof nbStore !== 'undefined' && typeof nbStore.subscribe === 'function') {
        nbStore.subscribe('locale', updateDynamicLessonUI);
    }
}
