const wordwallRoom = {
    mode: 'box', openedBoxes: new Set(),
    init() {
        this.renderBoxes();
        if (typeof wheelGame !== 'undefined') wheelGame.init();
        if (typeof cardsGame !== 'undefined') cardsGame.init();
        if (typeof ladderGame !== 'undefined') ladderGame.init();
    },
    switchMode(mode) {
        this.mode = mode;
        document.querySelectorAll('#wordwall-stage .game-tab').forEach(tab => tab.classList.remove('active'));
        const activeTab = document.getElementById(`tab-${mode}`); if (activeTab) activeTab.classList.add('active');
        const boxC = document.getElementById('ww-box-container');
        const wheelC = document.getElementById('ww-wheel-container');
        const cardsC = document.getElementById('ww-cards-container');
        const ladderC = document.getElementById('ww-ladder-container');
        if (boxC) boxC.classList.add('hidden');
        if (wheelC) wheelC.classList.add('hidden');
        if (cardsC) cardsC.classList.add('hidden');
        if (ladderC) ladderC.classList.add('hidden');

        if (mode === 'box' || mode === 'curtain') {
            if (boxC) {
                boxC.classList.remove('hidden');
                const promptEl = document.getElementById('box-prompt-text');
                if (promptEl) {
                    promptEl.innerText = (mode === 'curtain')
                        ? 'Tap any curtain to reveal the hidden word! 🎭'
                        : 'Tap any box to reveal the hidden word! 🎁';
                }
                this.renderBoxes();
            }
        }
        else if (mode === 'ladder' && ladderC) {
            ladderC.classList.remove('hidden');
            if (typeof ladderGame !== 'undefined') ladderGame.init();
        }
        else if (mode === 'wheel' && wheelC) {
            wheelC.classList.remove('hidden');
            if (typeof wheelGame !== 'undefined') setTimeout(() => wheelGame.draw(), 50);
        }
        else if (mode === 'cards' && cardsC) {
            cardsC.classList.remove('hidden');
        }
        const navSelect = document.getElementById('example-navigator');
        if (navSelect) navSelect.value = `ww_${mode}`;
    },
    renderBoxes() {
        const container = document.getElementById('box-grid');
        if (!container || typeof dataset === 'undefined') return;
        container.textContent = '';
        const isCurtain = (this.mode === 'curtain');
        const labelType = isCurtain ? 'Curtain' : 'Box';

        dataset.forEach((item, index) => {
            const box = document.createElement('button');
            box.type = 'button';
            box.className = `wordwall-box relative aspect-square w-full flex items-center justify-center rounded-2xl ${isCurtain ? 'curtain-box' : ''} ${this.openedBoxes.has(index) ? 'opened opacity-50 grayscale-[50%]' : ''}`;
            box.id = `box-${index}`;
            box.setAttribute('aria-label', `${labelType} ${index + 1}${this.openedBoxes.has(index) ? ', opened' : ', closed'}`);
            const color = wordwallColors[index % wordwallColors.length];
            
            if (isCurtain) {
                box.innerHTML = `
                    <div class="wordwall-box-inner relative w-full h-full duration-500" aria-hidden="true">
                        <div class="box-front rounded-2xl flex flex-col items-center justify-center text-white border-[3px] border-amber-300 shadow-lg hover:scale-105 transition-transform overflow-hidden curtain-bg" style="--curtain-color: ${color};">
                            <div class="curtain-drape"></div>
                            <span class="text-4xl sm:text-5xl lg:text-6xl font-black drop-shadow-md z-10">${index + 1}</span>
                            <span class="text-[10px] sm:text-xs font-bold uppercase tracking-wider mt-2 bg-amber-400 text-slate-900 px-3 py-0.5 rounded-full shadow-sm z-10">Reveal</span>
                        </div>
                        <div class="box-back rounded-2xl flex items-center justify-center text-slate-400 bg-slate-100 border-[3px] border-slate-300 shadow-inner"><span class="text-4xl">✔</span></div>
                    </div>`;
            } else {
                box.innerHTML = `
                    <div class="wordwall-box-inner relative w-full h-full duration-500" aria-hidden="true">
                        <div class="box-front rounded-2xl flex flex-col items-center justify-center text-white border-[3px] border-white/40 shadow-lg hover:scale-105 transition-transform" style="background-color: ${color}">
                            <span class="text-4xl sm:text-5xl lg:text-6xl font-black drop-shadow-md">${index + 1}</span>
                            <span class="text-[10px] sm:text-xs font-bold uppercase tracking-wider mt-2 bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">Open</span>
                        </div>
                        <div class="box-back rounded-2xl flex items-center justify-center text-slate-400 bg-slate-100 border-[3px] border-slate-300 shadow-inner"><span class="text-4xl">✔</span></div>
                    </div>`;
            }
            
            box.onclick = () => {
                if (!this.openedBoxes.has(index)) {
                    box.setAttribute('aria-label', `${labelType} ${index + 1}, opened`);
                    app.revealWord(index, isCurtain ? 'curtain' : 'box');
                }
            };
            container.appendChild(box);
        });
    },
    reset() {
        this.openedBoxes.clear();
        this.renderBoxes();
        this.switchMode('box');
        if (typeof cardsGame !== 'undefined') cardsGame.init();
        if (typeof ladderGame !== 'undefined') ladderGame.init();
    }
};

const wheelGame = {
    canvas: null, ctx: null, angle: 0, angularVelocity: 0, friction: 0.985, isSpinning: false, animFrameId: null, revealTimer: null,
    init() {
        this.reset();
        this.canvas = document.getElementById('wheel-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.draw();
    },
    reset() {
        if (this.animFrameId) { cancelAnimationFrame(this.animFrameId); this.animFrameId = null; }
        if (this.revealTimer) { clearTimeout(this.revealTimer); this.revealTimer = null; }
        this.isSpinning = false;
        this.angularVelocity = 0;
    },
    draw() {
        if (!this.canvas || !this.ctx || typeof dataset === 'undefined' || dataset.length === 0) return;
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
    spin() {
        if (this.isSpinning || typeof dataset === 'undefined' || dataset.length === 0) return;
        this.reset();
        this.isSpinning = true;
        this.angularVelocity = Math.random() * 0.4 + 0.4;
        this.animate();
    },
    animate() {
        if (this.angularVelocity > 0.002) {
            this.angle += this.angularVelocity;
            this.angularVelocity *= this.friction;
            this.draw();
            this.animFrameId = requestAnimationFrame(() => this.animate());
        } else {
            this.isSpinning = false;
            this.angularVelocity = 0;
            this.animFrameId = null;
            this.calculateStoppingSlice();
        }
    },
    calculateStoppingSlice() {
        if (typeof dataset === 'undefined' || dataset.length === 0) return;
        const numSlices = dataset.length; const sliceAngle = (Math.PI * 2) / numSlices;
        let normalizedAngle = (Math.PI * 2.5 - (this.angle % (Math.PI * 2))) % (Math.PI * 2);
        let sliceIndex = Math.floor(normalizedAngle / sliceAngle) % numSlices;
        const status = document.getElementById('wheel-status');
        if (status) status.innerText = `Wheel landed on Word ${sliceIndex + 1}`;
        this.revealTimer = setTimeout(() => {
            if (typeof app !== 'undefined') app.revealWord(sliceIndex, 'wheel');
            this.revealTimer = null;
        }, 400);
    }
};

const cardsGame = {
    cardDeckIndices: [], isAnimating: false, animTimer: null,
    init() {
        if (this.animTimer) { clearTimeout(this.animTimer); this.animTimer = null; }
        this.isAnimating = false;
        if (typeof dataset === 'undefined' || dataset.length === 0) return;
        this.cardDeckIndices = Array.from({ length: dataset.length }, (_, i) => i);
        this.shuffleDeck();
        const activeCard = document.getElementById('active-deck-card');
        if (activeCard) activeCard.onclick = () => this.dealNextCard();
    },
    shuffleDeck() {
        if (typeof app !== 'undefined' && typeof app.shuffle === 'function') {
            app.shuffle(this.cardDeckIndices);
        } else {
            for (let i = this.cardDeckIndices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.cardDeckIndices[i], this.cardDeckIndices[j]] = [this.cardDeckIndices[j], this.cardDeckIndices[i]];
            }
        }
    },
    dealNextCard() {
        if (this.isAnimating) return;
        if (this.cardDeckIndices.length === 0) {
            if (typeof app !== 'undefined') app.triggerFeedback('Reshuffling Deck... 🃏', '#3b82f6');
            this.init();
            return;
        }
        this.isAnimating = true;
        const activeCardIndex = this.cardDeckIndices.pop();
        const activeUIElement = document.getElementById('active-deck-card');
        if (activeUIElement) {
            activeUIElement.style.transform = 'translateY(-120px) rotateY(360deg) scale(1.15)';
            activeUIElement.style.opacity = '0.1';
            this.animTimer = setTimeout(() => {
                activeUIElement.style.transform = 'none';
                activeUIElement.style.opacity = '1';
                this.isAnimating = false;
                this.animTimer = null;
                if (typeof app !== 'undefined') app.revealWord(activeCardIndex, 'cards');
            }, 600);
        } else {
            this.isAnimating = false;
            if (typeof app !== 'undefined') app.revealWord(activeCardIndex, 'cards');
        }
    }
};

const ladderGame = {
    targetSteps: 5,
    currentStep: 0,
    wordQueue: [],
    queueIdx: 0,
    currentWordItem: null,
    isCompleted: false,

    init() {
        if (typeof dataset === 'undefined' || dataset.length === 0) return;
        this.currentStep = 0;
        this.isCompleted = false;
        this.queueIdx = 0;
        this.buildQueue();
        this.renderLadder();
        this.showCurrentWord();
        const resetBtn = document.getElementById('ladder-reset-btn');
        if (resetBtn) resetBtn.textContent = 'Restart Round 🔄';
    },

    setTarget(steps) {
        this.targetSteps = steps;
        const btn5 = document.getElementById('ladder-btn-5');
        const btn10 = document.getElementById('ladder-btn-10');
        if (btn5) {
            btn5.className = (steps === 5)
                ? 'py-1 px-3.5 rounded-full font-bold text-xs bg-emerald-500 text-white shadow-sm transition-all'
                : 'py-1 px-3.5 rounded-full font-bold text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all';
        }
        if (btn10) {
            btn10.className = (steps === 10)
                ? 'py-1 px-3.5 rounded-full font-bold text-xs bg-emerald-500 text-white shadow-sm transition-all'
                : 'py-1 px-3.5 rounded-full font-bold text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all';
        }
        this.init();
    },

    buildQueue() {
        this.wordQueue = Array.from({ length: dataset.length }, (_, i) => i);
        if (typeof app !== 'undefined' && typeof app.shuffle === 'function') {
            app.shuffle(this.wordQueue);
        } else {
            for (let i = this.wordQueue.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.wordQueue[i], this.wordQueue[j]] = [this.wordQueue[j], this.wordQueue[i]];
            }
        }
    },

    showCurrentWord() {
        if (typeof dataset === 'undefined') return;
        if (this.queueIdx >= this.wordQueue.length) {
            this.buildQueue();
            this.queueIdx = 0;
        }
        const wordIndex = this.wordQueue[this.queueIdx];
        this.currentWordItem = dataset[wordIndex];

        const wordDisplay = document.getElementById('ladder-word-display');
        if (wordDisplay && this.currentWordItem && typeof app !== 'undefined') {
            app.renderWordInto(wordDisplay, this.currentWordItem);
            if (this.currentWordItem.info) {
                const infoEl = document.createElement('div');
                infoEl.className = 'mt-2 text-xs sm:text-sm font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full';
                infoEl.textContent = this.currentWordItem.info;
                wordDisplay.appendChild(infoEl);
            }
        }

        this.announceStatus();
    },

    announceStatus() {
        const liveRegion = document.getElementById('ladder-live-announcer');
        if (liveRegion && this.currentWordItem && typeof app !== 'undefined') {
            const plainWord = app.getPlainWord(this.currentWordItem);
            liveRegion.textContent = `الدرجة ${this.currentStep}: ${plainWord}`;
        }
    },

    renderLadder() {
        const rungsContainer = document.getElementById('ladder-rungs');
        if (!rungsContainer) return;
        rungsContainer.innerHTML = '';

        for (let s = this.targetSteps; s >= 1; s--) {
            const rung = document.createElement('div');
            const isReached = this.currentStep >= s;
            const isCurrent = this.currentStep === s;
            const isCrown = (s === this.targetSteps);

            rung.className = `ladder-rung flex items-center justify-between px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl transition-all duration-300 font-bold text-xs sm:text-sm ${
                isCrown ? (isReached ? 'bg-amber-400 text-slate-900 border-2 border-amber-300 shadow-lg scale-105' : 'bg-amber-100 text-amber-800 border-2 border-amber-300/60') :
                isReached ? 'bg-emerald-500 text-white shadow-md' :
                'bg-white/60 text-slate-400 border border-slate-200'
            } ${isCurrent ? 'ring-4 ring-emerald-300 scale-102 font-black' : ''}`;
            
            rung.id = `ladder-rung-${s}`;
            rung.setAttribute('aria-label', `Step ${s}${isReached ? ', reached' : ''}${isCrown ? ', top crown' : ''}`);

            rung.innerHTML = `
                <div class="flex items-center gap-2">
                    <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs ${isReached ? 'bg-white text-emerald-700 font-black' : 'bg-slate-200 text-slate-600'}">${s}</span>
                    <span>${isCrown ? '👑 القمة' : `الدرجة ${s}`}</span>
                </div>
                <span class="text-sm">${isReached ? (isCrown ? '🏆' : '✔') : '🔒'}</span>
            `;
            rungsContainer.appendChild(rung);
        }

        const stepCountEl = document.getElementById('ladder-step-indicator');
        if (stepCountEl) {
            stepCountEl.textContent = `الدرجة ${this.currentStep} من ${this.targetSteps}`;
        }
    },

    grade(isCorrect) {
        if (this.isCompleted) return;

        if (isCorrect) {
            this.currentStep++;
            Sound.stepUp(this.currentStep, this.targetSteps);
            this.renderLadder();

            if (this.currentStep >= this.targetSteps) {
                this.isCompleted = true;
                fireCelebration();
                Sound.playChime();
                const wordDisplay = document.getElementById('ladder-word-display');
                if (wordDisplay) {
                    wordDisplay.innerHTML = `
                        <div class="flex flex-col items-center justify-center p-4 text-center animate-bounce">
                            <span class="text-6xl sm:text-7xl">👑</span>
                            <h3 class="text-2xl sm:text-3xl font-black text-amber-500 mt-2">ما شاء الله! بلغت القمة!</h3>
                            <p class="text-sm text-slate-600 mt-1 font-bold">أتممت درجات الارتقاء بنجاح تام</p>
                        </div>
                    `;
                }
                const liveRegion = document.getElementById('ladder-live-announcer');
                if (liveRegion) {
                    liveRegion.textContent = `أحسنت! بلغت القمة والدرجة ${this.targetSteps}`;
                }
                return;
            }
        } else {
            this.currentStep = Math.max(0, this.currentStep - 1);
            Sound.stepDown();
            this.renderLadder();
        }

        this.queueIdx++;
        this.showCurrentWord();
    },

    reset() {
        this.init();
    }
};
