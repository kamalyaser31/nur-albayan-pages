const memoryGame = {
    iconSets: [
        ['🍎', '🍌', '🍉', '🍇', '🍓', '🥑', '🥕', '🌽'],
        ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼'],
        ['🚗', '🚕', '🚙', '🚌', '🚓', '🚑', '🚒', '🚜'],
        ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏓', '🎱'],
        ['🌞', '🌝', '🌛', '🌜', '🌙', '⭐', '🌟', '☄️']
    ],
    currentSetIndex: 0, cards: [], hasFlippedCard: false, lockBoard: false, firstCard: null, secondCard: null, matchedPairs: 0, gameActive: true,
    init() {
        this.cards = [...this.iconSets[this.currentSetIndex], ...this.iconSets[this.currentSetIndex]];
        this.shuffleCards(); this.renderBoard();
        this.matchedPairs = 0; this.hasFlippedCard = false; this.lockBoard = false; this.firstCard = null; this.secondCard = null; this.gameActive = true;
        const status = document.getElementById('memory-status'); if (status) { status.textContent = "Find all matching pairs! 🧠"; status.classList.remove('text-yellow-300'); }
        if (typeof app !== 'undefined') app.setGameResumeState('memory-resume-btn', false, '', "Skip to Wordwall ⏭️");
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
        this.firstCard.onclick = null; this.secondCard.onclick = null; this.matchedPairs++; this.resetBoard();
        if (this.matchedPairs === 8) {
            this.gameActive = false;
            const status = document.getElementById('memory-status'); if (status) { status.textContent = "🏆 Fantastic! You matched them all!"; status.classList.add('text-yellow-300'); }
            fireCelebration();
            if (typeof app !== 'undefined') app.setGameResumeState('memory-resume-btn', true, "Wordwall Games 🎡");
        }
    },
    unflipCards() {
        this.lockBoard = true;
        setTimeout(() => {
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
        }, 1000);
    },
    resetBoard() { [this.hasFlippedCard, this.lockBoard] = [false, false]; [this.firstCard, this.secondCard] = [null, null]; },
    reset() { this.currentSetIndex = (this.currentSetIndex + 1) % this.iconSets.length; this.init(); }
};

const riddlesGame = {
    idx: 0,
    data: [
        { questionText: "What speaks all languages in the world but has no tongue?", options: ["A telephone", "An echo", "A book", "A flag"], answerIndex: 1 },
        { questionText: "What gets larger the more you take away from it, and smaller if you add to it?", options: ["A hole", "Time", "Age", "Money"], answerIndex: 0 },
        { questionText: "What has many teeth but cannot bite?", options: ["A crocodile", "A saw", "A comb", "A key"], answerIndex: 2 }
    ],
    init() { this.idx = 0; },
    reset() {
        this.init();
        if (typeof app !== 'undefined') app.setGameResumeState('riddles-resume-btn', false, '', "Skip to Wordwall ⏭️");
        this.loadNext();
    },
    loadNext() {
        if (this.idx >= this.data.length) {
            fireCelebration();
            const qEl = document.getElementById('riddle-question'); if (qEl) qEl.innerText = "🏆 Unbelievable! You solved all the riddles and earned the Quran Genius Badge!";
            const optsDiv = document.getElementById('riddle-options'); if (optsDiv) optsDiv.textContent = '';
            if (typeof app !== 'undefined') app.setGameResumeState('riddles-resume-btn', true, "Wordwall Room 🎡");
            return;
        }
        const riddle = this.data[this.idx];
        const qEl = document.getElementById('riddle-question'); if (qEl) qEl.innerText = riddle.questionText;
        const optsDiv = document.getElementById('riddle-options'); if (optsDiv) optsDiv.textContent = '';
        const fbEl = document.getElementById('riddle-feedback'); if (fbEl) fbEl.innerText = '';
        if (optsDiv) {
            riddle.options.forEach((opt, i) => {
                let btn = document.createElement('button');
                btn.className = "bg-white/20 hover:bg-white/30 text-xl font-bold py-5 rounded-2xl shadow-md transition-all active:scale-95 text-left px-6 flex justify-between items-center shadow-[0_4px_0_#d97706] active:translate-y-1 active:shadow-none";
                btn.innerHTML = `<span>${opt}</span><span class="text-sm opacity-55">Option ${i + 1}</span>`;
                btn.onclick = () => this.check(i, btn);
                optsDiv.appendChild(btn);
            });
        }
    },
    check(selectedIdx, btn) {
        const correctIdx = this.data[this.idx].answerIndex;
        const fb = document.getElementById('riddle-feedback');
        if (selectedIdx === correctIdx) {
            btn.classList.replace('bg-white/20', 'bg-emerald-500');
            if (fb) fb.innerText = "Genius correct answer! Excellent 👏";
            if (typeof confetti === 'function') confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
            setTimeout(() => { this.idx++; this.loadNext(); }, 1500);
        } else {
            btn.classList.replace('bg-white/20', 'bg-rose-500');
            if (fb) { fb.innerText = "Oops! Think again!"; fb.classList.replace('text-emerald-400', 'text-rose-400'); }
            setTimeout(() => {
                btn.classList.replace('bg-rose-500', 'bg-white/20');
                if (fb) { fb.innerText = ""; fb.classList.replace('text-rose-400', 'text-emerald-400'); }
            }, 1000);
        }
    }
};
