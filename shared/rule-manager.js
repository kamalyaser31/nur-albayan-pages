const ruleManager = {
    step: 0,
    init() { this.step = 0; this.render(); },
    render() {
        if (typeof rulesData === 'undefined' || rulesData.length === 0) return;
        const data = rulesData[this.step];
        const indicator = document.getElementById('rule-step-indicator');
        if (indicator) indicator.innerText = rulesData.length === 1 ? 'LESSON RULE' : `RULE ${this.step + 1} OF ${rulesData.length}`;
        const titleEl = document.getElementById('rule-title'); if (titleEl) titleEl.innerText = data.title;
        const descEl = document.getElementById('rule-desc'); if (descEl) descEl.innerText = data.desc;
        const bigText = document.getElementById('rule-big-text'); if (bigText) bigText.innerHTML = data.html;
        const prevBtn = document.getElementById('rule-prev-btn');
        if (prevBtn) { if (this.step > 0) prevBtn.classList.remove('hidden'); else prevBtn.classList.add('hidden'); }
        const nextBtn = document.getElementById('rule-next-btn');
        if (nextBtn) {
            if (this.step === rulesData.length - 1) {
                nextBtn.innerText = "Start Challenge! 🚀";
                nextBtn.className = "bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black py-4 px-8 rounded-2xl text-sm transition-transform active:scale-95 shadow-lg flex-1 animate-pulse";
            } else {
                nextBtn.innerText = "Next Rule ➡";
                nextBtn.className = "bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 px-8 rounded-2xl text-sm transition-transform active:scale-95 shadow-md flex-1";
            }
        }
    },
    next() {
        if (typeof rulesData === 'undefined') return;
        if (this.step < rulesData.length - 1) { this.step++; this.render(); }
        else { app.startChallenge(); }
    },
    prev() {
        if (this.step > 0) { this.step--; this.render(); }
    }
};

window.onload = () => { app.init(); };
