const memoryGame = {
    iconSets: [
        ['🍎', '🍌', '🍉', '🍇', '🍓', '🥑', '🥕', '🌽'],
        ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼'],
        ['🚗', '🚕', '🚙', '🚌', '🚓', '🚑', '🚒', '🚜'],
        ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏓', '🎱'],
        ['🌞', '🌝', '🌛', '🌜', '🌙', '⭐', '🌟', '☄️']
    ],
    currentSetIndex: 0, cards: [], hasFlippedCard: false, lockBoard: false, firstCard: null, secondCard: null, matchedPairs: 0, gameActive: true, flipTimer: null,
    init() {
        if (this.flipTimer) { clearTimeout(this.flipTimer); this.flipTimer = null; }
        this.cards = [...this.iconSets[this.currentSetIndex], ...this.iconSets[this.currentSetIndex]];
        this.shuffleCards(); this.renderBoard();
        this.matchedPairs = 0; this.hasFlippedCard = false; this.lockBoard = false; this.firstCard = null; this.secondCard = null; this.gameActive = true;
        const status = document.getElementById('memory-status'); if (status) { status.textContent = i18n.t("memory_find_pairs"); status.classList.remove('text-yellow-300'); }
        if (typeof app !== 'undefined') app.setGameResumeState('memory-resume-btn', false, '', i18n.t("skip_to_wordwall"));
    },
    shuffleCards() {
        if (typeof app !== 'undefined' && typeof app.shuffle === 'function') {
            app.shuffle(this.cards);
        } else {
            for (let i = this.cards.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
            }
        }
    },
    renderBoard() {
        const board = document.getElementById('memory-board'); if (!board) return; board.textContent = '';
        this.cards.forEach((icon, idx) => {
            const scene = document.createElement('div'); scene.className = 'mem-scene';
            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'mem-card';
            card.dataset.icon = icon;
            card.setAttribute('aria-label', `Memory card ${idx + 1}, hidden`);
            card.setAttribute('aria-pressed', 'false');
            card.onclick = () => this.flipCard(card);
            const front = document.createElement('div'); front.className = 'mem-face mem-face-front shadow-[0_4px_0_#be123c] active:translate-y-1 active:shadow-none'; front.innerText = '❓';
            const back = document.createElement('div'); back.className = 'mem-face mem-face-back'; back.innerText = icon;
            card.appendChild(front); card.appendChild(back); scene.appendChild(card); board.appendChild(scene);
        });
    },
    flipCard(card) {
        if (!this.gameActive || this.lockBoard || card === this.firstCard || card.classList.contains('is-flipped')) return;
        card.classList.add('is-flipped');
        card.setAttribute('aria-label', `Card with ${card.dataset.icon}`);
        card.setAttribute('aria-pressed', 'true');
        if (!this.hasFlippedCard) { this.hasFlippedCard = true; this.firstCard = card; return; }
        this.secondCard = card; this.checkForMatch();
    },
    checkForMatch() {
        let isMatch = this.firstCard.dataset.icon === this.secondCard.dataset.icon;
        if (isMatch) this.disableCards(); else this.unflipCards();
    },
    disableCards() {
        this.firstCard.setAttribute('aria-label', `Matched pair: ${this.firstCard.dataset.icon}`);
        this.secondCard.setAttribute('aria-label', `Matched pair: ${this.secondCard.dataset.icon}`);
        this.firstCard.disabled = true;
        this.secondCard.disabled = true;
        this.firstCard.onclick = null;
        this.secondCard.onclick = null;
        this.matchedPairs++;
        this.resetBoard();

        if (typeof Sound !== 'undefined' && typeof Sound.stepUp === 'function') {
            Sound.stepUp(this.matchedPairs);
        }

        if (this.matchedPairs === this.cards.length / 2) {
            this.gameActive = false;
            const status = document.getElementById('memory-status');
            if (status) {
                status.textContent = typeof i18n !== 'undefined' ? i18n.t("memory_cleared", "🏆 أحسنت! تم تطابق جميع البطاقات! 🎉") : "🏆 أحسنت! تم تطابق جميع البطاقات! 🎉";
                status.classList.add('text-yellow-300');
            }
            if (typeof fireCelebration === 'function') fireCelebration();
            if (typeof app !== 'undefined') app.setGameResumeState('memory-resume-btn', true, typeof i18n !== 'undefined' ? i18n.t("open_word_games", "ألعاب الكلمات 🎡") : "ألعاب الكلمات 🎡");
        }
    },
    unflipCards() {
        this.lockBoard = true;
        if (this.flipTimer) clearTimeout(this.flipTimer);
        this.flipTimer = setTimeout(() => {
            if (this.firstCard) {
                this.firstCard.classList.remove('is-flipped');
                this.firstCard.setAttribute('aria-label', 'Memory card, hidden');
                this.firstCard.setAttribute('aria-pressed', 'false');
            }
            if (this.secondCard) {
                this.secondCard.classList.remove('is-flipped');
                this.secondCard.setAttribute('aria-label', 'Memory card, hidden');
                this.secondCard.setAttribute('aria-pressed', 'false');
            }
            this.resetBoard();
            this.flipTimer = null;
        }, 1000);
    },
    resetBoard() { [this.hasFlippedCard, this.lockBoard] = [false, false]; [this.firstCard, this.secondCard] = [null, null]; },
    reset() {
        if (this.flipTimer) { clearTimeout(this.flipTimer); this.flipTimer = null; }
        this.currentSetIndex = (this.currentSetIndex + 1) % this.iconSets.length;
        this.init();
    }
};

const riddlesGame = {
    idx: 0,
    isAnswering: false,
    timer: null,
    data: [
        {
            qKey: "riddle_q1_text",
            questionText: "حركة توضع فوق الحرف وتفتح الفم عند نطقها، ما هي؟",
            options: ["الكسرة", "الفتحة", "الضمة", "السكون"],
            optKeys: ["riddle_q1_opt1", "riddle_q1_opt2", "riddle_q1_opt3", "riddle_q1_opt4"],
            answerIndex: 1
        },
        {
            qKey: "riddle_q2_text",
            questionText: "حركة ترسم كالواو الصغيرة فوق الحرف ونضم الشفتين عند نطقها، ما هي؟",
            options: ["الفتحة", "الكسرة", "الضمة", "التنوين"],
            optKeys: ["riddle_q2_opt1", "riddle_q2_opt2", "riddle_q2_opt3", "riddle_q2_opt4"],
            answerIndex: 2
        },
        {
            qKey: "riddle_q3_text",
            questionText: "سورة قرآنية كريمة تسمى (أم الكتاب) ونقرؤها في كل ركعة صلاة؟",
            options: ["سورة الإخلاص", "سورة الفاتحة", "سورة الكوثر", "سورة الناس"],
            optKeys: ["riddle_q3_opt1", "riddle_q3_opt2", "riddle_q3_opt3", "riddle_q3_opt4"],
            answerIndex: 1
        },
        {
            qKey: "riddle_q4_text",
            questionText: "حرف مد يأتي ساكناً وقبله حرف مفتوح، ما هو؟",
            options: ["الألف المدية", "الياء المدية", "الواو المدية", "الهمزة"],
            optKeys: ["riddle_q4_opt1", "riddle_q4_opt2", "riddle_q4_opt3", "riddle_q4_opt4"],
            answerIndex: 0
        },
        {
            qKey: "riddle_q5_text",
            questionText: "سورة قرآنية تعدل ثلث القرآن الكريم وتتحدث عن إخلاص التوحيد لله؟",
            options: ["سورة الفلق", "سورة الكافرون", "سورة النصر", "سورة الإخلاص"],
            optKeys: ["riddle_q5_opt1", "riddle_q5_opt2", "riddle_q5_opt3", "riddle_q5_opt4"],
            answerIndex: 3
        },
        {
            qKey: "riddle_q6_text",
            questionText: "نون ساكنة زائدة تلحق آخر الأسماء لفظاً لا خطاً (نطقاً لا كتابة)، ما هي؟",
            options: ["السكون", "الشدة", "التنوين", "المد"],
            optKeys: ["riddle_q6_opt1", "riddle_q6_opt2", "riddle_q6_opt3", "riddle_q6_opt4"],
            answerIndex: 2
        },
        {
            qKey: "riddle_q7_text",
            questionText: "حركة توضع تحت الحرف وينخفض الفك السفلي عند نطقها، ما هي؟",
            options: ["الضمة", "الكسرة", "الفتحة", "السكون"],
            optKeys: ["riddle_q7_opt1", "riddle_q7_opt2", "riddle_q7_opt3", "riddle_q7_opt4"],
            answerIndex: 1
        },
        {
            qKey: "riddle_q8_text",
            questionText: "ما هي أقصر سورة في القرآن الكريم وتتكون من ثلاث آيات؟",
            options: ["سورة الكوثر", "سورة العصر", "سورة الإخلاص", "سورة الفلق"],
            optKeys: ["riddle_q8_opt1", "riddle_q8_opt2", "riddle_q8_opt3", "riddle_q8_opt4"],
            answerIndex: 0
        }
    ],
    init() { this.idx = 0; this.isAnswering = false; },
    reset() {
        if (this.timer) { clearTimeout(this.timer); this.timer = null; }
        this.init();
        if (typeof app !== 'undefined') app.setGameResumeState('riddles-resume-btn', false, '', typeof i18n !== 'undefined' ? i18n.t("skip_to_wordwall") : "Skip to Wordwall ⏭️");
        this.loadNext();
    },
    loadNext() {
        if (this.idx >= this.data.length) {
            if (typeof fireCelebration === 'function') fireCelebration();
            const qEl = document.getElementById('riddle-question');
            if (qEl) qEl.innerText = typeof i18n !== 'undefined' ? i18n.t("riddle_all_cleared", "🏆 رائع للغاية! لقد حللت جميع الألغاز وحصلت على وسام عبقري نور البيان!") : "🏆 رائع للغاية! لقد حللت جميع الألغاز وحصلت على وسام عبقري نور البيان!";
            const optsDiv = document.getElementById('riddle-options'); if (optsDiv) optsDiv.textContent = '';
            if (typeof app !== 'undefined') app.setGameResumeState('riddles-resume-btn', true, typeof i18n !== 'undefined' ? i18n.t("open_word_games", "ألعاب الكلمات 🎡") : "ألعاب الكلمات 🎡");
            return;
        }
        const riddle = this.data[this.idx];
        const qEl = document.getElementById('riddle-question');
        const question = (riddle.qKey && typeof i18n !== 'undefined') ? i18n.t(riddle.qKey, riddle.questionText) : riddle.questionText;
        if (qEl) qEl.innerText = question;
        const optsDiv = document.getElementById('riddle-options'); if (optsDiv) optsDiv.textContent = '';
        const fbEl = document.getElementById('riddle-feedback'); if (fbEl) fbEl.innerText = '';
        if (optsDiv) {
            riddle.options.forEach((opt, i) => {
                const optText = (riddle.optKeys && riddle.optKeys[i] && typeof i18n !== 'undefined')
                    ? i18n.t(riddle.optKeys[i], opt)
                    : opt;
                let btn = document.createElement('button');
                btn.type = 'button';
                btn.className = "bg-white/20 hover:bg-white/30 text-xl font-bold py-5 rounded-2xl shadow-md transition-all active:scale-95 text-center px-6 flex justify-between items-center shadow-[0_4px_0_#d97706] active:translate-y-1 active:shadow-none";
                const optLabel = typeof i18n !== 'undefined' ? i18n.t("riddle_option_num", `الخيار ${i + 1}`, { num: i + 1 }) : `Option ${i + 1}`;
                btn.setAttribute('aria-label', `${optText}, ${optLabel}`);
                btn.innerHTML = `<span>${optText}</span><span class="text-sm opacity-60">${optLabel}</span>`;
                btn.onclick = () => this.check(i, btn);
                optsDiv.appendChild(btn);
            });
        }
    },
    check(selectedIdx, btn) {
        if (this.isAnswering) return;
        this.isAnswering = true;
        const correctIdx = this.data[this.idx].answerIndex;
        const fb = document.getElementById('riddle-feedback');
        if (selectedIdx === correctIdx) {
            btn.classList.remove('bg-white/20');
            btn.classList.add('bg-emerald-500');
            if (fb) {
                fb.innerText = typeof i18n !== 'undefined' ? i18n.t("riddle_correct", "إجابة عبقرية صحيحة! أحسنت 👏") : "إجابة عبقرية صحيحة! أحسنت 👏";
                fb.className = "text-lg sm:text-xl font-bold h-8 text-emerald-400 mt-3";
            }
            if (typeof fireCelebration === 'function') fireCelebration();
            this.timer = setTimeout(() => {
                this.idx++;
                this.isAnswering = false;
                this.timer = null;
                this.loadNext();
            }, 1500);
        } else {
            btn.classList.remove('bg-white/20');
            btn.classList.add('bg-rose-500');
            if (fb) {
                fb.innerText = typeof i18n !== 'undefined' ? i18n.t("riddle_incorrect", "حاول مرة أخرى! فكر جيداً يا بطل 🤔") : "حاول مرة أخرى! فكر جيداً يا بطل 🤔";
                fb.className = "text-lg sm:text-xl font-bold h-8 text-rose-400 mt-3";
            }
            this.timer = setTimeout(() => {
                btn.classList.remove('bg-rose-500');
                btn.classList.add('bg-white/20');
                if (fb) {
                    fb.innerText = "";
                    fb.className = "text-lg sm:text-xl font-bold h-8 text-emerald-400 mt-3";
                }
                this.isAnswering = false;
                this.timer = null;
            }, 1000);
        }
    }
};

// مستمع لحدث تغيير اللغة لإعادة رسم اللغز النشط
if (typeof window !== 'undefined') {
    window.addEventListener('nb:locale-changed', () => {
        const stage = document.getElementById('riddles-stage');
        if (stage && !stage.classList.contains('hidden') && typeof riddlesGame !== 'undefined') {
            riddlesGame.loadNext();
        }
    });
}
