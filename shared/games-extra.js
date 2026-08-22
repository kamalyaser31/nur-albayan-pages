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
        let resumeBtn = document.getElementById('memory-resume-btn');
        if (resumeBtn) { resumeBtn.textContent = "Skip to Wordwall ⏭️"; resumeBtn.classList.remove('animate-bounce', 'bg-emerald-400', 'text-white'); resumeBtn.classList.add('bg-yellow-400', 'text-purple-900'); }
    },
    shuffleCards() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1)); [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    },
    renderBoard() {
        const board = document.getElementById('memory-board'); if (!board) return; board.textContent = '';
        this.cards.forEach((icon) => {
            const scene = document.createElement('div'); scene.className = 'mem-scene';
            const card = document.createElement('div'); card.className = 'mem-card'; card.dataset.icon = icon; card.onclick = () => this.flipCard(card);
            const front = document.createElement('div'); front.className = 'mem-face mem-face-front shadow-[0_4px_0_#be123c] active:translate-y-1 active:shadow-none'; front.innerText = '❓';
            const back = document.createElement('div'); back.className = 'mem-face mem-face-back'; back.innerText = icon;
            card.appendChild(front); card.appendChild(back); scene.appendChild(card); board.appendChild(scene);
        });
    },
    flipCard(card) {
        if (!this.gameActive || this.lockBoard || card === this.firstCard || card.classList.contains('is-flipped')) return;
        card.classList.add('is-flipped');
        if (!this.hasFlippedCard) { this.hasFlippedCard = true; this.firstCard = card; return; }
        this.secondCard = card; this.checkForMatch();
    },
    checkForMatch() {
        let isMatch = this.firstCard.dataset.icon === this.secondCard.dataset.icon;
        if (isMatch) this.disableCards(); else this.unflipCards();
    },
    disableCards() {
        this.firstCard.onclick = null; this.secondCard.onclick = null; this.matchedPairs++; this.resetBoard();
        if (this.matchedPairs === 8) {
            this.gameActive = false;
            const status = document.getElementById('memory-status'); if (status) { status.textContent = "🏆 Fantastic! You matched them all!"; status.classList.add('text-yellow-300'); }
            fireCelebration();
            let resumeBtn = document.getElementById('memory-resume-btn');
            if (resumeBtn) { resumeBtn.textContent = "Wordwall Games 🎡"; resumeBtn.classList.add('animate-bounce', 'bg-emerald-400', 'text-white'); resumeBtn.classList.remove('bg-yellow-400', 'text-purple-900'); }
        }
    },
    unflipCards() {
        this.lockBoard = true;
        setTimeout(() => {
            if (this.firstCard) this.firstCard.classList.remove('is-flipped');
            if (this.secondCard) this.secondCard.classList.remove('is-flipped');
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
        let resumeBtn = document.getElementById('riddles-resume-btn');
        if (resumeBtn) { resumeBtn.textContent = "Skip to Wordwall ⏭️"; resumeBtn.classList.remove('animate-bounce', 'bg-emerald-400', 'text-white'); resumeBtn.classList.add('bg-yellow-400', 'text-purple-900'); }
        this.loadNext();
    },
    loadNext() {
        if (this.idx >= this.data.length) {
            fireCelebration();
            const qEl = document.getElementById('riddle-question'); if (qEl) qEl.innerText = "🏆 Unbelievable! You solved all the riddles and earned the Quran Genius Badge!";
            const optsDiv = document.getElementById('riddle-options'); if (optsDiv) optsDiv.textContent = '';
            let resumeBtn = document.getElementById('riddles-resume-btn');
            if (resumeBtn) { resumeBtn.textContent = "Wordwall Room 🎡"; resumeBtn.classList.add('animate-bounce', 'bg-emerald-400', 'text-white'); resumeBtn.classList.remove('bg-yellow-400', 'text-purple-900'); }
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
