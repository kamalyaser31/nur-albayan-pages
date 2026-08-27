/**
 * منصة نور البيان — وحدة إدارة وعرض القواعد التعليمية
 * Rule Manager Module (Clean Code, Safe Contract & Fallback Cascade)
 */
const ruleManager = {
    step: 0,

    getPageNumber() {
        if (typeof window !== 'undefined' && window.PAGE_CONFIG) {
            if (typeof window.PAGE_CONFIG.page === 'number') {
                return window.PAGE_CONFIG.page;
            }
            if (window.PAGE_CONFIG.subtitle) {
                const m = String(window.PAGE_CONFIG.subtitle).match(/Page\s+(\d+)/i);
                if (m) return parseInt(m[1], 10);
            }
        }
        if (typeof window !== 'undefined' && window.location && window.location.pathname) {
            const m = window.location.pathname.match(/(\d+)\.html/i);
            if (m) return parseInt(m[1], 10);
        }
        return 0;
    },

    hasRules(pageNumber) {
        const page = pageNumber || this.getPageNumber();
        if (typeof rulesData !== 'undefined' && Array.isArray(rulesData) && rulesData.length > 0) {
            return true;
        }
        if (typeof window !== 'undefined' && window.PAGE_CONFIG && Array.isArray(window.PAGE_CONFIG.rules) && window.PAGE_CONFIG.rules.length > 0) {
            return true;
        }
        if (typeof window !== 'undefined' && window.RULES_REGISTRY) {
            const enRules = window.RULES_REGISTRY.en && window.RULES_REGISTRY.en[page];
            const arRules = window.RULES_REGISTRY.ar && window.RULES_REGISTRY.ar[page];
            return Boolean((enRules && enRules.length > 0) || (arRules && arRules.length > 0));
        }
        return false;
    },

    getRules(pageNumber, lang) {
        const page = pageNumber || this.getPageNumber();
        const currentLang = lang || (typeof i18n !== 'undefined' && typeof i18n.getLocale === 'function' ? i18n.getLocale() : 'en');

        // 1. فحص القواعد المضمنة محلياً بالصفحة كخيار بديل مسبق
        if (typeof rulesData !== 'undefined' && Array.isArray(rulesData) && rulesData.length > 0) {
            return rulesData;
        }
        if (typeof window !== 'undefined' && window.PAGE_CONFIG && Array.isArray(window.PAGE_CONFIG.rules) && window.PAGE_CONFIG.rules.length > 0) {
            return window.PAGE_CONFIG.rules;
        }

        // 2. فحص السجل المركزي مع مسار الرجوع التلقائي المرن (Graceful Fallback Cascade)
        if (typeof window !== 'undefined' && window.RULES_REGISTRY) {
            // أ. محاولة جلب قواعد اللغة النشطة
            if (window.RULES_REGISTRY[currentLang] && Array.isArray(window.RULES_REGISTRY[currentLang][page])) {
                return window.RULES_REGISTRY[currentLang][page];
            }
            // ب. الرجوع التلقائي إلى الإنجليزية
            if (window.RULES_REGISTRY.en && Array.isArray(window.RULES_REGISTRY.en[page])) {
                return window.RULES_REGISTRY.en[page];
            }
            // ج. الرجوع التلقائي إلى العربية
            if (window.RULES_REGISTRY.ar && Array.isArray(window.RULES_REGISTRY.ar[page])) {
                return window.RULES_REGISTRY.ar[page];
            }
        }

        return [];
    },

    // معقم بديل آمن يضمن عرض وسوم القواعد والتلوين القرآني في غياب app.setSafeHTML
    safeSetHTML(el, htmlStr) {
        if (!el) return;
        if (typeof app !== 'undefined' && typeof app.setSafeHTML === 'function') {
            app.setSafeHTML(el, htmlStr);
            return;
        }
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlStr || '', 'text/html');
            const ALLOWED_TAGS = new Set(['SPAN', 'BDI', 'RUBY', 'RT', 'B', 'STRONG', 'EM', 'I', 'DIV', 'P', 'BR']);
            const ALLOWED_ATTRS = new Set(['class', 'style', 'dir', 'lang', 'aria-hidden']);

            const sanitizeNode = (node) => {
                const children = Array.from(node.childNodes);
                for (const child of children) {
                    if (child.nodeType === Node.ELEMENT_NODE) {
                        if (!ALLOWED_TAGS.has(child.tagName.toUpperCase())) {
                            child.replaceWith(...Array.from(child.childNodes));
                            continue;
                        }
                        for (let j = child.attributes.length - 1; j >= 0; j--) {
                            const attr = child.attributes[j];
                            const attrName = attr.name.toLowerCase();
                            const val = attr.value.trim().toLowerCase();
                            if (!ALLOWED_ATTRS.has(attrName) || val.startsWith('javascript:') || val.includes('data:') || val.includes('vbscript:')) {
                                child.removeAttribute(attr.name);
                            }
                        }
                        sanitizeNode(child);
                    }
                }
            };
            sanitizeNode(doc.body);
            el.replaceChildren(...Array.from(doc.body.childNodes));
        } catch (e) {
            el.textContent = htmlStr || '';
        }
    },

    init() {
        this.step = 0;
        this.render();
    },

    render() {
        const rules = this.getRules();
        if (rules.length === 0) return;

        if (this.step < 0) this.step = 0;
        if (this.step >= rules.length) this.step = rules.length - 1;

        const data = rules[this.step];
        if (!data) return;

        const indicator = document.getElementById('rule-step-indicator');
        if (indicator) {
            const isSingle = (rules.length === 1);
            if (isSingle) {
                indicator.innerText = typeof i18n !== 'undefined' ? i18n.t("rule_step_single", "Lesson Rule 📖") : "Lesson Rule 📖";
            } else {
                indicator.innerText = typeof i18n !== 'undefined'
                    ? i18n.t("rule_step_indicator", `Rule ${this.step + 1} of ${rules.length}`, { current: this.step + 1, total: rules.length })
                    : `Rule ${this.step + 1} of ${rules.length}`;
            }
        }

        const titleEl = document.getElementById('rule-title');
        if (titleEl) titleEl.innerText = data.title || '';

        const descEl = document.getElementById('rule-desc');
        if (descEl) descEl.innerText = data.desc || '';

        const bigText = document.getElementById('rule-big-text');
        if (bigText) {
            this.safeSetHTML(bigText, data.html || '');
        }

        const prevBtn = document.getElementById('rule-prev-btn');
        if (prevBtn) {
            prevBtn.classList.toggle('hidden', this.step === 0);
            const prevText = typeof i18n !== 'undefined' ? i18n.t("prev_rule", "Previous ⬅") : "Previous ⬅";
            prevBtn.innerText = prevText;
        }

        const nextBtn = document.getElementById('rule-next-btn');
        if (nextBtn) {
            const isLastStep = (this.step === rules.length - 1);
            nextBtn.innerText = isLastStep
                ? (typeof i18n !== 'undefined' ? i18n.t("start_challenge", "Start Challenge 🚀") : "Start Challenge 🚀")
                : (typeof i18n !== 'undefined' ? i18n.t("next_rule", "Next Rule ➡") : "Next Rule ➡");

            // فئات التنسيق الأساسية وتبديل الحالات
            nextBtn.classList.toggle('animate-pulse', isLastStep);
            nextBtn.classList.toggle('bg-gradient-to-r', isLastStep);
            nextBtn.classList.toggle('from-emerald-500', isLastStep);
            nextBtn.classList.toggle('to-teal-600', isLastStep);
            nextBtn.classList.toggle('hover:from-emerald-600', isLastStep);
            nextBtn.classList.toggle('hover:to-teal-700', isLastStep);
            nextBtn.classList.toggle('bg-emerald-500', !isLastStep);
            nextBtn.classList.toggle('hover:bg-emerald-600', !isLastStep);
        }
    },

    next() {
        const rules = this.getRules();
        if (rules.length === 0 || this.step >= rules.length - 1) {
            // إطلاق حدث اكتمال القواعد
            if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
                window.dispatchEvent(new CustomEvent(NBContracts.EVENTS.RULE_COMPLETED, {
                    detail: { totalRules: rules.length, completedAt: Date.now() }
                }));
            }
            if (typeof app !== 'undefined' && typeof app.startChallenge === 'function') {
                app.startChallenge();
            }
            return;
        }
        this.step++;
        this.render();
    },

    prev() {
        if (this.step > 0) {
            this.step--;
            this.render();
        }
    }
};

// تثبيت الوحدة على كائن النافذة العام لضمان التوافقية الشاملة
if (typeof window !== 'undefined') {
    window.ruleManager = ruleManager;
}

// مستمع لحدث تغيير اللغة لتحديث نصوص القواعد ومؤشر الخطوات فورياً
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function' && typeof NBContracts !== 'undefined' && NBContracts.EVENTS) {
    window.addEventListener(NBContracts.EVENTS.LOCALE_CHANGED, () => {
        if (typeof ruleManager !== 'undefined' && ruleManager.getRules().length > 0) {
            ruleManager.render();
        }
    });
}
