const wordwallRoom = {
    mode: 'box', openedBoxes: new Set(),
    init() { this.renderBoxes(); if (typeof wheelGame !== 'undefined') wheelGame.init(); if (typeof cardsGame !== 'undefined') cardsGame.init(); },
    switchMode(mode) {
        this.mode = mode;
        document.querySelectorAll('#wordwall-stage .game-tab').forEach(tab => tab.classList.remove('active'));
        const activeTab = document.getElementById(`tab-${mode}`); if (activeTab) activeTab.classList.add('active');
        const boxC = document.getElementById('ww-box-container');
        const wheelC = document.getElementById('ww-wheel-container');
        const cardsC = document.getElementById('ww-cards-container');
        if (boxC) boxC.classList.add('hidden');
        if (wheelC) wheelC.classList.add('hidden');
        if (cardsC) cardsC.classList.add('hidden');
        if (mode === 'box' && boxC) boxC.classList.remove('hidden');
        else if (mode === 'wheel' && wheelC) { wheelC.classList.remove('hidden'); if (typeof wheelGame !== 'undefined') setTimeout(() => wheelGame.draw(), 50); }
        else if (mode === 'cards' && cardsC) { cardsC.classList.remove('hidden'); }
        const navSelect = document.getElementById('example-navigator'); if (navSelect) navSelect.value = `ww_${mode}`;
    },
    renderBoxes() {
        const container = document.getElementById('box-grid');
        if (!container || typeof dataset === 'undefined') return;
        container.textContent = '';
        dataset.forEach((item, index) => {
            const box = document.createElement('button');
            box.type = 'button';
            box.className = `wordwall-box relative aspect-square w-full flex items-center justify-center rounded-2xl ${this.openedBoxes.has(index) ? 'opened opacity-50 grayscale-[50%]' : ''}`;
            box.id = `box-${index}`;
            box.setAttribute('aria-label', `Box ${index + 1}${this.openedBoxes.has(index) ? ', opened' : ', closed'}`);
            const color = wordwallColors[index % wordwallColors.length];
            
            box.innerHTML = `
                <div class="wordwall-box-inner relative w-full h-full duration-500" aria-hidden="true">
                    <div class="box-front rounded-2xl flex flex-col items-center justify-center text-white border-[3px] border-white/40 shadow-lg hover:scale-105 transition-transform" style="background-color: ${color}">
                        <span class="text-4xl sm:text-5xl lg:text-6xl font-black drop-shadow-md">${index + 1}</span>
                        <span class="text-[10px] sm:text-xs font-bold uppercase tracking-wider mt-2 bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">Open</span>
                    </div>
                    <div class="box-back rounded-2xl flex items-center justify-center text-slate-400 bg-slate-100 border-[3px] border-slate-300 shadow-inner"><span class="text-4xl">✔</span></div>
                </div>`;
            
            box.onclick = () => {
                if (!this.openedBoxes.has(index)) {
                    box.setAttribute('aria-label', `Box ${index + 1}, opened`);
                    app.revealWord(index, 'box');
                }
            };
            container.appendChild(box);
        });
    },
    reset() { this.openedBoxes.clear(); this.renderBoxes(); this.switchMode('box'); if (typeof cardsGame !== 'undefined') cardsGame.init(); }
};

const wheelGame = {
    canvas: null, ctx: null, angle: 0, angularVelocity: 0, friction: 0.985, isSpinning: false,
    init() { this.canvas = document.getElementById('wheel-canvas'); if (!this.canvas) return; this.ctx = this.canvas.getContext('2d'); this.draw(); },
    draw() {
        if (!this.canvas || !this.ctx || typeof dataset === 'undefined') return;
        const numSlices = dataset.length; const sliceAngle = (Math.PI * 2) / numSlices; const radius = this.canvas.width / 2;
        const fontSize = numSlices > 24 ? 'bold 13px Fredoka' : 'bold 17px Fredoka';
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save(); this.ctx.translate(radius, radius); this.ctx.rotate(this.angle);
        for (let i = 0; i < numSlices; i++) {
            const col = wordwallColors[i % wordwallColors.length];
            this.ctx.beginPath(); this.ctx.moveTo(0, 0); this.ctx.arc(0, 0, radius - 8, i * sliceAngle, (i + 1) * sliceAngle); this.ctx.closePath();
            this.ctx.fillStyle = col; this.ctx.fill(); this.ctx.lineWidth = 2; this.ctx.strokeStyle = '#ffffff'; this.ctx.stroke();
            this.ctx.save(); this.ctx.rotate(i * sliceAngle + sliceAngle / 2);
            const red = parseInt(col.slice(1, 3), 16) / 255;
            const green = parseInt(col.slice(3, 5), 16) / 255;
            const blue = parseInt(col.slice(5, 7), 16) / 255;
            const lum = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
            this.ctx.fillStyle = lum > 0.45 ? '#1a1a2e' : '#ffffff';
            this.ctx.font = fontSize; this.ctx.textAlign = 'right'; this.ctx.fillText((i + 1).toString(), radius - 25, 5); this.ctx.restore();
        }
        this.ctx.beginPath(); this.ctx.arc(0, 0, 30, 0, Math.PI * 2); this.ctx.fillStyle = '#ffffff'; this.ctx.fill(); this.ctx.lineWidth = 4; this.ctx.strokeStyle = '#34d399'; this.ctx.stroke();
        this.ctx.restore();
    },
    spin() { if (this.isSpinning) return; this.isSpinning = true; this.angularVelocity = Math.random() * 0.4 + 0.4; this.animate(); },
    animate() {
        if (this.angularVelocity > 0.002) { this.angle += this.angularVelocity; this.angularVelocity *= this.friction; this.draw(); requestAnimationFrame(() => this.animate()); }
        else { this.isSpinning = false; this.angularVelocity = 0; this.calculateStoppingSlice(); }
    },
    calculateStoppingSlice() {
        if (typeof dataset === 'undefined') return;
        const numSlices = dataset.length; const sliceAngle = (Math.PI * 2) / numSlices;
        let normalizedAngle = (Math.PI * 2.5 - (this.angle % (Math.PI * 2))) % (Math.PI * 2);
        let sliceIndex = Math.floor(normalizedAngle / sliceAngle) % numSlices;
        const status = document.getElementById('wheel-status');
        if (status) status.innerText = `Wheel landed on Word ${sliceIndex + 1}`;
        setTimeout(() => { app.revealWord(sliceIndex, 'wheel'); }, 400);
    }
};

const cardsGame = {
    cardDeckIndices: [], isAnimating: false,
    init() {
        if (typeof dataset === 'undefined') return;
        this.cardDeckIndices = Array.from({ length: dataset.length }, (_, i) => i);
        this.shuffleDeck();
        const activeCard = document.getElementById('active-deck-card'); if (activeCard) activeCard.onclick = () => this.dealNextCard();
    },
    shuffleDeck() {
        for (let i = this.cardDeckIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cardDeckIndices[i], this.cardDeckIndices[j]] = [this.cardDeckIndices[j], this.cardDeckIndices[i]];
        }
    },
    dealNextCard() {
        if (this.isAnimating) return;
        if (this.cardDeckIndices.length === 0) { app.triggerFeedback('Reshuffling Deck... 🃏', '#3b82f6'); this.init(); return; }
        this.isAnimating = true;
        const activeCardIndex = this.cardDeckIndices.pop();
        const activeUIElement = document.getElementById('active-deck-card');
        if (activeUIElement) {
            activeUIElement.style.transform = 'translateY(-120px) rotateY(360deg) scale(1.15)'; activeUIElement.style.opacity = '0.1';
            setTimeout(() => { activeUIElement.style.transform = 'none'; activeUIElement.style.opacity = '1'; this.isAnimating = false; app.revealWord(activeCardIndex, 'cards'); }, 600);
        } else {
            this.isAnimating = false; app.revealWord(activeCardIndex, 'cards');
        }
    }
};
