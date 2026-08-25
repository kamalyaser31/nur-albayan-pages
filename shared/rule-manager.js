/**
 * منصة نور البيان — وحدة إدارة وعرض القواعد التعليمية
 * Rule Manager Module (Clean Code & Safe Contract)
 */
const ruleManager = {
    step: 0,

    getRules() {
        if (typeof rulesData !== 'undefined' && Array.isArray(rulesData)) {
            return rulesData;
        }
        if (typeof window !== 'undefined' && window.PAGE_CONFIG && Array.isArray(window.PAGE_CONFIG.rules)) {
            return window.PAGE_CONFIG.rules;
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
            indicator.innerText = rules.length === 1
                ? (typeof i18n !== 'undefined' ? i18n.t("rule_step_single", "قاعدة الدرس 📖") : "قاعدة الدرس 📖")
                : (typeof i18n !== 'undefined' ? i18n.t("rule_step_indicator", `القاعدة ${this.step + 1} من ${rules.length}`, { current: this.step + 1, total: rules.length }) : `القاعدة ${this.step + 1} من ${rules.length}`);
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
            const prevText = typeof i18n !== 'undefined' ? i18n.t("prev_rule", "القاعدة السابقة ⬅") : "القاعدة السابقة ⬅";
            prevBtn.innerText = prevText;
        }

        const nextBtn = document.getElementById('rule-next-btn');
        if (nextBtn) {
            const isLastStep = (this.step === rules.length - 1);
            nextBtn.innerText = isLastStep
                ? (typeof i18n !== 'undefined' ? i18n.t("start_challenge", "بدء التحدي 🚀") : "بدء التحدي 🚀")
                : (typeof i18n !== 'undefined' ? i18n.t("next_rule", "القاعدة التالية ➡") : "القاعدة التالية ➡");
            
            // الحفاظ على فئات التنسيق الأساسية وتبديل الحالات عبر classList.toggle
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
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('nb:rule-completed', {
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

// مستمع لحدث تغيير اللغة لتحديث نصوص القواعد ومؤشر الخطوات فورياً
if (typeof window !== 'undefined') {
    window.addEventListener(NBContracts.EVENTS.LOCALE_CHANGED, () => {
        if (typeof ruleManager !== 'undefined' && ruleManager.getRules().length > 0) {
            ruleManager.render();
        }
    });
}
