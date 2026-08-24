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
            indicator.innerText = rules.length === 1 ? 'LESSON RULE' : `RULE ${this.step + 1} OF ${rules.length}`;
        }

        const titleEl = document.getElementById('rule-title');
        if (titleEl) titleEl.innerText = data.title || '';

        const descEl = document.getElementById('rule-desc');
        if (descEl) descEl.innerText = data.desc || '';

        const bigText = document.getElementById('rule-big-text');
        if (bigText) {
            if (typeof app !== 'undefined' && typeof app.setSafeHTML === 'function') {
                app.setSafeHTML(bigText, data.html || '');
            } else {
                bigText.textContent = data.html || '';
            }
        }

        const prevBtn = document.getElementById('rule-prev-btn');
        if (prevBtn) {
            prevBtn.classList.toggle('hidden', this.step === 0);
        }

        const nextBtn = document.getElementById('rule-next-btn');
        if (nextBtn) {
            const isLastStep = (this.step === rules.length - 1);
            nextBtn.innerText = isLastStep ? "Start Challenge! 🚀" : "Next Rule ➡";
            nextBtn.className = isLastStep
                ? "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black py-4 px-8 rounded-2xl text-sm shadow-[0_4px_0_#047857] active:translate-y-1 active:shadow-none transition-all flex-1 animate-pulse"
                : "bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 px-8 rounded-2xl text-sm shadow-[0_4px_0_#047857] active:translate-y-1 active:shadow-none transition-all flex-1";
        }
    },

    next() {
        const rules = this.getRules();
        if (rules.length === 0 || this.step >= rules.length - 1) {
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

