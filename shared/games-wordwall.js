const wordwallRoom = {
    mode: 'box', openedBoxes: new Set(),
    filterSessionMistakes: false,

    getActiveDataset() {
        if (typeof dataset === 'undefined' || !Array.isArray(dataset)) return [];
        if (!this.filterSessionMistakes) return dataset;

        const mistakes = (typeof app !== 'undefined')
            ? ((app.sessionMistakesHistory && app.sessionMistakesHistory.length > 0) ? app.sessionMistakesHistory : (app.mistakeIndices || []))
            : [];

        if (!mistakes || mistakes.length === 0) {
            return dataset;
        }

        return mistakes.map(idx => {
            const item = dataset[idx];
            if (!item) return null;
            return Object.assign({}, item, { _origIndex: idx });
        }).filter(Boolean);
    },

    toggleMistakesFilter() {
        const mistakes = (typeof app !== 'undefined')
            ? ((app.sessionMistakesHistory && app.sessionMistakesHistory.length > 0) ? app.sessionMistakesHistory : (app.mistakeIndices || []))
            : [];

        if (!this.filterSessionMistakes && (!mistakes || mistakes.length === 0)) {
            const isAr = (typeof i18n !== 'undefined' && i18n.getLocale() === 'ar');
            const noMistakesMsg = isAr ? 'لا توجد عثرات مسجلة في هذه الجلسة! 🌟' : 'No session mistakes recorded! 🌟';
            if (typeof app !== 'undefined' && typeof app.triggerFeedback === 'function') {
                app.triggerFeedback(noMistakesMsg, '#10b981', true);
            }
            return;
        }

        this.filterSessionMistakes = !this.filterSessionMistakes;
        this.updateFilterButtonUI();

        // إعادة تحديث شبكة الألعاب فورياً لتقتصر على عثرات الجلسة أو جميع الكلمات
        this.openedBoxes.clear();
        if (this.mode === 'box' || this.mode === 'curtain') {
            this.renderBoxes();
        } else if (this.mode === 'wheel') {
            if (typeof wheelGame !== 'undefined') {
                wheelGame.reset();
                wheelGame.draw();
            }
        } else if (this.mode === 'cards') {
            if (typeof cardsGame !== 'undefined') {
                cardsGame.init();
            }
        } else if (this.mode === 'ladder') {
            if (typeof ladderGame !== 'undefined') {
                ladderGame.init();
            }
        } else if (this.mode === 'tiles') {
            if (typeof tilesGame !== 'undefined') {
                tilesGame.reset();
            }
        } else if (this.mode === 'honeycomb') {
            if (typeof honeycombGame !== 'undefined') {
                honeycombGame.reset();
            }
        }
    },

    updateFilterButtonUI() {
        const btn = document.getElementById('btn-ww-mistakes-filter');
        const textEl = document.getElementById('ww-filter-text');
        const isAr = (typeof i18n !== 'undefined' && i18n.getLocale() === 'ar');

        const mistakes = (typeof app !== 'undefined')
            ? ((app.sessionMistakesHistory && app.sessionMistakesHistory.length > 0) ? app.sessionMistakesHistory : (app.mistakeIndices || []))
            : [];
        const count = mistakes ? mistakes.length : 0;

        if (this.filterSessionMistakes) {
            if (textEl) textEl.textContent = isAr ? `عثرات الحصة (${count})` : `Session Mistakes (${count})`;
            if (btn) {
                btn.className = 'px-3 py-1 bg-rose-500 hover:bg-rose-600 text-white border border-rose-600 rounded-full font-black text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer';
                btn.setAttribute('aria-pressed', 'true');
            }
        } else {
            if (textEl) textEl.textContent = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('ww_filter_session_mistakes') : 'عثرات الحصة 🎯';
            if (btn) {
                btn.className = 'px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-full font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer';
                btn.setAttribute('aria-pressed', 'false');
            }
        }
    },

    init() {
        this.renderBoxes();
        this.updateFilterButtonUI();
        if (typeof wheelGame !== 'undefined') wheelGame.init();
        if (typeof cardsGame !== 'undefined') cardsGame.init();
        if (typeof ladderGame !== 'undefined') ladderGame.init();
        if (typeof tilesGame !== 'undefined') tilesGame.init();
        if (typeof honeycombGame !== 'undefined') honeycombGame.init();
    },
    switchMode(mode) {
        this.mode = mode;
        if (typeof wheelGame !== 'undefined') wheelGame.reset();
        if (typeof cardsGame !== 'undefined') {
            if (cardsGame.animTimer) {
                clearTimeout(cardsGame.animTimer);
                cardsGame.animTimer = null;
            }
            cardsGame.isAnimating = false;
        }
        // تصفير وإعادة ضبط خواص التحويل والشفافية لبطاقات التقليب لمنع تشوه مظهرها عند التبديل أثناء الحركة
        const activeCardEl = document.getElementById('active-deck-card');
        if (activeCardEl) {
            activeCardEl.style.transform = 'none';
            activeCardEl.style.opacity = '1';
        }

        document.querySelectorAll('#wordwall-stage .game-tab').forEach(tab => tab.classList.remove('active'));
        const activeTab = document.getElementById(`tab-${mode}`); if (activeTab) activeTab.classList.add('active');
        const boxC = document.getElementById('ww-box-container');
        const wheelC = document.getElementById('ww-wheel-container');
        const cardsC = document.getElementById('ww-cards-container');
        const ladderC = document.getElementById('ww-ladder-container');
        const tilesC = document.getElementById('ww-tiles-container');
        const hexC = document.getElementById('ww-honeycomb-container');
        if (boxC) boxC.classList.add('hidden');
        if (wheelC) wheelC.classList.add('hidden');
        if (cardsC) cardsC.classList.add('hidden');
        if (ladderC) ladderC.classList.add('hidden');
        if (tilesC) tilesC.classList.add('hidden');
        if (hexC) hexC.classList.add('hidden');

        if (mode === 'box' || mode === 'curtain') {
            if (boxC) {
                boxC.classList.remove('hidden');
                const promptEl = document.getElementById('box-prompt-text');
                if (promptEl) {
                    promptEl.innerText = (mode === 'curtain')
                        ? i18n.t('prompt_curtain')
                        : i18n.t('prompt_box');
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
            if (typeof wheelGame !== 'undefined') {
                wheelGame.drawTimer = setTimeout(() => {
                    wheelGame.draw();
                    wheelGame.drawTimer = null;
                }, 50);
            }
        }
        else if (mode === 'cards' && cardsC) {
            cardsC.classList.remove('hidden');
        }
        else if (mode === 'tiles' && tilesC) {
            tilesC.classList.remove('hidden');
            if (typeof tilesGame !== 'undefined') tilesGame.init();
        }
        else if (mode === 'honeycomb' && hexC) {
            hexC.classList.remove('hidden');
            if (typeof honeycombGame !== 'undefined') honeycombGame.init();
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
        const activeData = this.getActiveDataset();

        activeData.forEach((item, index) => {
            const origIdx = (item && item._origIndex !== undefined) ? item._origIndex : index;
            const box = document.createElement('button');
            box.type = 'button';
            box.className = `wordwall-box relative aspect-square w-full flex items-center justify-center rounded-2xl ${isCurtain ? 'curtain-box' : ''} ${this.openedBoxes.has(origIdx) ? 'opened opacity-50 grayscale-[50%]' : ''}`;
            box.id = `box-${origIdx}`;
            const isOpened = this.openedBoxes.has(origIdx);
            const boxAriaKey = isCurtain ? (isOpened ? 'aria_curtain_opened' : 'aria_curtain_closed') : (isOpened ? 'aria_box_opened' : 'aria_box_closed');
            const boxAriaText = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t(boxAriaKey, null, { num: origIdx + 1 }) : `${labelType} ${origIdx + 1}${isOpened ? ', opened' : ', closed'}`;
            box.setAttribute('aria-label', boxAriaText);
            const color = wordwallColors[origIdx % wordwallColors.length];
            
            if (isCurtain) {
                box.innerHTML = `
                    <div class="wordwall-box-inner relative w-full h-full duration-500" aria-hidden="true">
                        <div class="box-front rounded-2xl flex flex-col items-center justify-center text-white border-[3px] border-amber-300 shadow-lg hover:scale-105 transition-transform overflow-hidden curtain-bg" style="--curtain-color: ${color};">
                            <div class="curtain-drape"></div>
                            <span class="text-4xl sm:text-5xl lg:text-6xl font-black drop-shadow-md z-10">${origIdx + 1}</span>
                            <span class="text-[10px] sm:text-xs font-bold uppercase tracking-wider mt-2 bg-amber-400 text-slate-900 px-3 py-0.5 rounded-full shadow-sm z-10">${i18n.t('reveal')}</span>
                        </div>
                        <div class="box-back rounded-2xl flex items-center justify-center text-slate-400 bg-slate-100 border-[3px] border-slate-300 shadow-inner"><span class="text-4xl">✔</span></div>
                    </div>`;
            } else {
                box.innerHTML = `
                    <div class="wordwall-box-inner relative w-full h-full duration-500" aria-hidden="true">
                        <div class="box-front rounded-2xl flex flex-col items-center justify-center text-white border-[3px] border-white/40 shadow-lg hover:scale-105 transition-transform" style="background-color: ${color}">
                            <span class="text-4xl sm:text-5xl lg:text-6xl font-black drop-shadow-md">${origIdx + 1}</span>
                            <span class="text-[10px] sm:text-xs font-bold uppercase tracking-wider mt-2 bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">${i18n.t('open')}</span>
                        </div>
                        <div class="box-back rounded-2xl flex items-center justify-center text-slate-400 bg-slate-100 border-[3px] border-slate-300 shadow-inner"><span class="text-4xl">✔</span></div>
                    </div>`;
            }
            
            box.onclick = () => {
                if (!this.openedBoxes.has(origIdx)) {
                    const openedKey = isCurtain ? 'aria_curtain_opened' : 'aria_box_opened';
                    box.setAttribute('aria-label', (typeof i18n !== 'undefined' && i18n.t) ? i18n.t(openedKey, null, { num: origIdx + 1 }) : `${labelType} ${origIdx + 1}, opened`);
                    app.revealWord(origIdx, isCurtain ? 'curtain' : 'box');
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
        if (typeof ladderGame !== 'undefined') ladderGame.reset();
        if (typeof tilesGame !== 'undefined') tilesGame.reset();
        if (typeof honeycombGame !== 'undefined') honeycombGame.reset();
    }
};

const wheelGame = {
    canvas: null, ctx: null, angle: 0, angularVelocity: 0, friction: 0.985, isSpinning: false, animFrameId: null, revealTimer: null, drawTimer: null,
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
        if (this.drawTimer) { clearTimeout(this.drawTimer); this.drawTimer = null; }
        this.isSpinning = false;
        this.angularVelocity = 0;
    },
    draw() {
        const activeData = (typeof wordwallRoom !== 'undefined' && wordwallRoom.getActiveDataset) ? wordwallRoom.getActiveDataset() : dataset;
        if (!this.canvas || !this.ctx || !activeData || activeData.length === 0) return;
        const numSlices = activeData.length;
        const sliceAngle = (Math.PI * 2) / numSlices;
        const radius = this.canvas.width / 2;
        const fontSize = numSlices > 24 ? 'bold 13px Fredoka' : 'bold 17px Fredoka';
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();
        this.ctx.translate(radius, radius);
        this.ctx.rotate(this.angle);

        // دالة التباين الخطي وفق معيار WCAG 2.1
        const rLin = (c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };

        for (let i = 0; i < numSlices; i++) {
            const item = activeData[i];
            const origIdx = (item && item._origIndex !== undefined) ? item._origIndex : i;
            const col = wordwallColors[origIdx % wordwallColors.length];
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.arc(0, 0, radius - 8, i * sliceAngle, (i + 1) * sliceAngle);
            this.ctx.closePath();
            this.ctx.fillStyle = col;
            this.ctx.fill();
            this.ctx.lineWidth = 2;
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.stroke();

            this.ctx.save();
            this.ctx.rotate(i * sliceAngle + sliceAngle / 2);
            const red = parseInt(col.slice(1, 3), 16);
            const green = parseInt(col.slice(3, 5), 16);
            const blue = parseInt(col.slice(5, 7), 16);
            const lum = 0.2126 * rLin(red) + 0.7152 * rLin(green) + 0.0722 * rLin(blue);
            this.ctx.fillStyle = lum > 0.38 ? '#0f172a' : '#ffffff';
            this.ctx.font = fontSize;
            this.ctx.textAlign = 'right';
            this.ctx.fillText((origIdx + 1).toString(), radius - 25, 5);
            this.ctx.restore();
        }
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 30, 0, Math.PI * 2);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fill();
        this.ctx.lineWidth = 4;
        this.ctx.strokeStyle = '#34d399';
        this.ctx.stroke();
        this.ctx.restore();
    },
    spin() {
        const activeData = (typeof wordwallRoom !== 'undefined' && wordwallRoom.getActiveDataset) ? wordwallRoom.getActiveDataset() : dataset;
        if (this.isSpinning || !activeData || activeData.length === 0) return;
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
        const activeData = (typeof wordwallRoom !== 'undefined' && wordwallRoom.getActiveDataset) ? wordwallRoom.getActiveDataset() : dataset;
        if (!activeData || activeData.length === 0) return;
        const numSlices = activeData.length;
        const sliceAngle = (Math.PI * 2) / numSlices;
        const TWO_PI = Math.PI * 2;
        // المؤشر يقع في قمة الدائرة عند 270 درجة (1.5 * PI)
        const normalizedAngle = ((1.5 * Math.PI - (this.angle % TWO_PI)) % TWO_PI + TWO_PI) % TWO_PI;
        const sliceIndex = Math.floor(normalizedAngle / sliceAngle) % numSlices;
        const targetItem = activeData[sliceIndex];
        const origIdx = (targetItem && targetItem._origIndex !== undefined) ? targetItem._origIndex : sliceIndex;

        const status = document.getElementById('wheel-status');
        if (status) {
            status.innerText = (typeof i18n !== 'undefined')
                ? i18n.t('wheel_landed', 'استقرت العجلة على: {word}', { word: origIdx + 1 })
                : `استقرت العجلة على: ${origIdx + 1}`;
        }
        this.revealTimer = setTimeout(() => {
            if (typeof app !== 'undefined') app.revealWord(origIdx, 'wheel');
            this.revealTimer = null;
        }, 400);
    }
};

const cardsGame = {
    cardDeckIndices: [], isAnimating: false, animTimer: null,
    init() {
        if (this.animTimer) { clearTimeout(this.animTimer); this.animTimer = null; }
        this.isAnimating = false;
        const activeCard = document.getElementById('active-deck-card');
        if (activeCard) {
            activeCard.style.transform = 'none';
            activeCard.style.opacity = '1';
            activeCard.onclick = () => this.dealNextCard();
        }
        const activeData = (typeof wordwallRoom !== 'undefined' && wordwallRoom.getActiveDataset) ? wordwallRoom.getActiveDataset() : dataset;
        if (!activeData || activeData.length === 0) return;
        this.cardDeckIndices = Array.from({ length: activeData.length }, (_, i) => i);
        this.shuffleDeck();
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
            const reshuffleMsg = (typeof i18n !== 'undefined')
                ? i18n.t('reshuffling_deck', 'إعادة خلط البطاقات... 🃏')
                : 'إعادة خلط البطاقات... 🃏';
            if (typeof app !== 'undefined') app.triggerFeedback(reshuffleMsg, '#3b82f6');
            this.init();
            return;
        }
        this.isAnimating = true;
        const deckIndex = this.cardDeckIndices.pop();
        const activeData = (typeof wordwallRoom !== 'undefined' && wordwallRoom.getActiveDataset) ? wordwallRoom.getActiveDataset() : dataset;
        const targetItem = activeData ? activeData[deckIndex] : null;
        const activeCardIndex = (targetItem && targetItem._origIndex !== undefined) ? targetItem._origIndex : deckIndex;

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
        const activeData = (typeof wordwallRoom !== 'undefined' && wordwallRoom.getActiveDataset) ? wordwallRoom.getActiveDataset() : dataset;
        if (!activeData || activeData.length === 0) return;
        this.currentStep = 0;
        this.isCompleted = false;
        this.queueIdx = 0;
        this.buildQueue();
        this.renderLadder();
        this.showCurrentWord();
        const resetBtn = document.getElementById('ladder-reset-btn');
        if (resetBtn) {
            resetBtn.textContent = (typeof i18n !== 'undefined')
                ? i18n.t('restart_round', 'إعادة الجولة 🔄')
                : 'إعادة الجولة 🔄';
        }
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
        const activeData = (typeof wordwallRoom !== 'undefined' && wordwallRoom.getActiveDataset) ? wordwallRoom.getActiveDataset() : dataset;
        if (!activeData || activeData.length === 0) { this.wordQueue = []; return; }
        this.wordQueue = Array.from({ length: activeData.length }, (_, i) => i);
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
        const activeData = (typeof wordwallRoom !== 'undefined' && wordwallRoom.getActiveDataset) ? wordwallRoom.getActiveDataset() : dataset;
        if (!activeData || activeData.length === 0) return;
        if (this.queueIdx >= this.wordQueue.length) {
            this.buildQueue();
            this.queueIdx = 0;
        }
        const wordIndex = this.wordQueue[this.queueIdx];
        this.currentWordItem = activeData[wordIndex];

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
            const stepText = (typeof i18n !== 'undefined')
                ? i18n.t('ladder_step_indicator', 'الدرجة {step} من {total}', { step: this.currentStep, total: this.targetSteps })
                : `الدرجة ${this.currentStep} من ${this.targetSteps}`;
            liveRegion.textContent = `${stepText}: ${plainWord}`;
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
            const stepAriaKey = isCrown ? (isReached ? 'aria_step_crown' : 'aria_step_unreached') : (isReached ? 'aria_step_reached' : 'aria_step_unreached');
            const stepAriaText = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t(stepAriaKey, null, { step: s }) : `Step ${s}`;
            rung.setAttribute('aria-label', stepAriaText);

            const crownLabel = (typeof i18n !== 'undefined') ? i18n.t('ladder_peak_label', '👑 القمة') : '👑 القمة';
            const stepLabel = (typeof i18n !== 'undefined') ? i18n.t('ladder_rung_label', 'الدرجة {step}', { step: s }) : `الدرجة ${s}`;

            rung.innerHTML = `
                <div class="flex items-center gap-2">
                    <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs ${isReached ? 'bg-white text-emerald-700 font-black' : 'bg-slate-200 text-slate-600'}">${s}</span>
                    <span>${isCrown ? crownLabel : stepLabel}</span>
                </div>
                <span class="text-sm">${isReached ? (isCrown ? '🏆' : '✔') : '🔒'}</span>
            `;
            rungsContainer.appendChild(rung);
        }

        const stepCountEl = document.getElementById('ladder-step-indicator');
        if (stepCountEl) {
            stepCountEl.textContent = (typeof i18n !== 'undefined')
                ? i18n.t('ladder_step_indicator', 'الدرجة {step} من {total}', { step: this.currentStep, total: this.targetSteps })
                : `الدرجة ${this.currentStep} من ${this.targetSteps}`;
        }
    },

    grade(isCorrect) {
        if (this.isCompleted) return;

        if (isCorrect) {
            this.currentStep++;
            if (typeof Sound !== 'undefined' && typeof Sound.stepUp === 'function') {
                Sound.stepUp(this.currentStep, this.targetSteps);
            }
            this.renderLadder();

            if (this.currentStep >= this.targetSteps) {
                this.isCompleted = true;
                if (typeof fireCelebration === 'function') {
                    fireCelebration();
                }
                if (typeof Sound !== 'undefined' && typeof Sound.playChime === 'function') {
                    Sound.playChime();
                }
                const wordDisplay = document.getElementById('ladder-word-display');
                if (wordDisplay) {
                    const congratsHeading = (typeof i18n !== 'undefined')
                        ? i18n.t('ladder_peak_congrats', 'ما شاء الله! بلغت القمة!')
                        : 'ما شاء الله! بلغت القمة!';
                    const congratsSub = (typeof i18n !== 'undefined')
                        ? i18n.t('ladder_peak_subtext', 'أتممت درجات الارتقاء بنجاح تام')
                        : 'أتممت درجات الارتقاء بنجاح تام';
                    wordDisplay.innerHTML = `
                        <div class="flex flex-col items-center justify-center p-4 text-center animate-bounce">
                            <span class="text-6xl sm:text-7xl">👑</span>
                            <h3 class="text-2xl sm:text-3xl font-black text-amber-500 mt-2">${congratsHeading}</h3>
                            <p class="text-sm text-slate-600 mt-1 font-bold">${congratsSub}</p>
                        </div>
                    `;
                }
                const liveRegion = document.getElementById('ladder-live-announcer');
                if (liveRegion) {
                    liveRegion.textContent = (typeof i18n !== 'undefined')
                        ? i18n.t('ladder_peak_announcement', 'أحسنت! بلغت القمة والدرجة {total}', { total: this.targetSteps })
                        : `أحسنت! بلغت القمة والدرجة ${this.targetSteps}`;
                }
                return;
            }
        } else {
            this.currentStep = Math.max(0, this.currentStep - 1);
            if (typeof Sound !== 'undefined' && typeof Sound.stepDown === 'function') {
                Sound.stepDown();
            }
            this.renderLadder();
        }

        this.queueIdx++;
        this.showCurrentWord();
    },

    reset() {
        this.init();
    }
};

/**
 * 3D Flip Tiles Game Engine
 * Universal template for flipping numbered cards to reveal diacritized words
 */
const tilesGame = {
    flippedTiles: new Set(),
    init() {
        this.renderTiles();
    },
    renderTiles() {
        const container = document.getElementById('tiles-grid');
        if (!container) return;
        const activeData = (typeof wordwallRoom !== 'undefined' && wordwallRoom.getActiveDataset) ? wordwallRoom.getActiveDataset() : dataset;
        if (!activeData) return;
        container.textContent = '';

        activeData.forEach((item, index) => {
            const origIdx = (item && item._origIndex !== undefined) ? item._origIndex : index;
            const tile = document.createElement('div');
            tile.className = `flip-tile relative aspect-square w-full rounded-2xl ${this.flippedTiles.has(origIdx) ? 'flipped' : ''}`;
            tile.id = `tile-${origIdx}`;
            tile.setAttribute('role', 'button');
            tile.setAttribute('tabindex', '0');
            const tileAriaKey = this.flippedTiles.has(origIdx) ? 'aria_tile_revealed' : 'aria_tile_hidden';
            const tileAria = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t(tileAriaKey, null, { num: origIdx + 1 }) : `Tile ${origIdx + 1}`;
            tile.setAttribute('aria-label', tileAria);
            
            const color = wordwallColors[origIdx % wordwallColors.length];
            const wordText = (typeof item === 'object' && item !== null) ? (item.display || item.word || item.text || (typeof app !== 'undefined' ? app.getPlainWord(item) : '')) : String(item || '');
            
            tile.innerHTML = `
                <div class="flip-tile-inner" aria-hidden="true">
                    <div class="tile-face tile-front flex flex-col items-center justify-center text-white border-[3px] border-white/40 shadow-lg hover:scale-105 transition-transform" style="background-color: ${color}">
                        <span class="text-4xl sm:text-5xl lg:text-6xl font-black drop-shadow-md">${origIdx + 1}</span>
                        <span class="text-[10px] sm:text-xs font-bold uppercase tracking-wider mt-2 bg-black/25 px-3 py-0.5 rounded-full backdrop-blur-sm">${i18n.t('flip')} 🀄</span>
                    </div>
                    <div class="tile-face tile-back flex flex-col items-center justify-center p-2 bg-white border-[3px] border-emerald-400 text-slate-800 shadow-xl overflow-hidden">
                        <span class="font-amiri text-2xl sm:text-3xl md:text-4xl font-bold text-emerald-950 leading-relaxed text-center" style="letter-spacing: normal !important;">${wordText}</span>
                    </div>
                </div>
            `;

            const doFlip = () => {
                this.flipTile(origIdx);
            };

            tile.onclick = doFlip;
            tile.onkeydown = (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    doFlip();
                }
            };

            container.appendChild(tile);
        });
    },
    flipTile(index) {
        const tile = document.getElementById(`tile-${index}`);
        if (!tile) return;
        
        if (this.flippedTiles.has(index)) {
            this.flippedTiles.delete(index);
            tile.classList.remove('flipped');
            const tileHiddenAria = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('aria_tile_hidden', null, { num: index + 1 }) : `Tile ${index + 1}, hidden`;
            tile.setAttribute('aria-label', tileHiddenAria);
            if (typeof Sound !== 'undefined' && typeof Sound.playTone === 'function') {
                Sound.playTone(400, 'sine', 0.08);
            }
        } else {
            this.flippedTiles.add(index);
            tile.classList.add('flipped');
            const tileRevealedAria = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('aria_tile_revealed', null, { num: index + 1 }) : `Tile ${index + 1}, revealed`;
            tile.setAttribute('aria-label', tileRevealedAria);
            if (typeof Sound !== 'undefined' && typeof Sound.playTone === 'function') {
                Sound.playTone(600, 'sine', 0.1);
            }
        }
    },
    flipAll() {
        const activeData = (typeof wordwallRoom !== 'undefined' && wordwallRoom.getActiveDataset) ? wordwallRoom.getActiveDataset() : dataset;
        if (!activeData || activeData.length === 0) return;
        const allFlipped = this.flippedTiles.size === activeData.length;
        if (allFlipped) {
            this.flippedTiles.clear();
            if (typeof Sound !== 'undefined' && typeof Sound.playTone === 'function') {
                Sound.playTone(350, 'sine', 0.1);
            }
        } else {
            activeData.forEach((item, idx) => {
                const origIdx = (item && item._origIndex !== undefined) ? item._origIndex : idx;
                this.flippedTiles.add(origIdx);
            });
            if (typeof Sound !== 'undefined' && typeof Sound.playTone === 'function') {
                Sound.playTone(700, 'sine', 0.15);
            }
        }
        this.renderTiles();
    },
    reset() {
        this.flippedTiles.clear();
        this.renderTiles();
        if (typeof Sound !== 'undefined' && typeof Sound.playTone === 'function') {
            Sound.playTone(440, 'triangle', 0.1);
        }
    }
};

/**
 * Honeycomb Matrix Board Game Engine
 * Hexagonal interactive cells tracking mastery and review states
 */
const honeycombGame = {
    cellStatus: {}, // index: 'mastered' | 'review' | null
    init() {
        this.cellStatus = {};
        this.renderBoard();
        this.updateBadge();
    },
    renderBoard() {
        const board = document.getElementById('honeycomb-board');
        if (!board) return;
        const activeData = (typeof wordwallRoom !== 'undefined' && wordwallRoom.getActiveDataset) ? wordwallRoom.getActiveDataset() : dataset;
        if (!activeData) return;
        board.textContent = '';

        activeData.forEach((item, index) => {
            const origIdx = (item && item._origIndex !== undefined) ? item._origIndex : index;
            const hex = document.createElement('button');
            hex.type = 'button';
            const status = this.cellStatus[origIdx] || '';
            hex.className = `hex-cell ${status}`;
            hex.id = `hex-${origIdx}`;
            
            const statusKey = status === 'mastered' ? 'status_mastered' : (status === 'review' ? 'status_review' : 'status_closed');
            const statusText = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t(statusKey) : (status === 'mastered' ? 'متقنة' : (status === 'review' ? 'مراجعة' : 'مغلقة'));
            const hexAria = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('aria_honeycomb_cell', null, { num: origIdx + 1, status: statusText }) : `Cell ${origIdx + 1}: ${statusText}`;
            hex.setAttribute('aria-label', hexAria);

            hex.innerHTML = `
                <div class="flex flex-col items-center justify-center text-white drop-shadow-sm pointer-events-none">
                    <span class="text-xl sm:text-2xl font-black">${origIdx + 1}</span>
                    <span class="text-[10px] font-bold mt-0.5">${status === 'mastered' ? '✔' : (status === 'review' ? '📌' : '⬡')}</span>
                </div>
            `;

            hex.onclick = () => {
                this.selectHex(origIdx);
            };

            board.appendChild(hex);
        });
    },
    selectHex(index) {
        if (typeof dataset === 'undefined' || !dataset[index]) return;
        if (typeof Sound !== 'undefined' && typeof Sound.playTone === 'function') {
            Sound.playTone(520, 'sine', 0.1);
        }
        if (typeof app !== 'undefined' && typeof app.revealWord === 'function') {
            app.revealWord(index, 'honeycomb');
        }
    },
    markStatus(index, isMastered) {
        this.cellStatus[index] = isMastered ? 'mastered' : 'review';
        const hex = document.getElementById(`hex-${index}`);
        if (hex) {
            hex.classList.remove('mastered', 'review');
            hex.classList.add(this.cellStatus[index]);
            const statusKey = isMastered ? 'status_mastered' : 'status_review';
            const statusText = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t(statusKey) : (isMastered ? 'متقنة' : 'مراجعة');
            const hexAria = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('aria_honeycomb_cell', null, { num: index + 1, status: statusText }) : `Cell ${index + 1}: ${statusText}`;
            hex.setAttribute('aria-label', hexAria);
            const iconSpan = hex.querySelector('span:last-child');
            if (iconSpan) iconSpan.textContent = isMastered ? '✔' : '📌';
        }
        this.updateBadge();
        
        const activeData = (typeof wordwallRoom !== 'undefined' && wordwallRoom.getActiveDataset) ? wordwallRoom.getActiveDataset() : dataset;
        if (activeData) {
            const masteredCount = Object.keys(this.cellStatus).filter(k => this.cellStatus[k] === 'mastered').length;
            if (masteredCount >= activeData.length) {
                if (typeof fireCelebration === 'function') fireCelebration();
                if (typeof Sound !== 'undefined' && typeof Sound.playChime === 'function') Sound.playChime();
            }
        }
    },
    updateBadge() {
        const badge = document.getElementById('hex-progress-badge');
        const activeData = (typeof wordwallRoom !== 'undefined' && wordwallRoom.getActiveDataset) ? wordwallRoom.getActiveDataset() : dataset;
        if (!badge || !activeData) return;
        const total = activeData.length;
        const mastered = Object.keys(this.cellStatus).filter(k => this.cellStatus[k] === 'mastered').length;
        badge.textContent = (typeof i18n !== 'undefined')
            ? i18n.t('honeycomb_mastered_badge', 'المتقن: {count} من {total}', { count: mastered, total: total })
            : `المتقن: ${mastered} من ${total}`;
    },
    reset() {
        this.cellStatus = {};
        this.renderBoard();
        this.updateBadge();
        if (typeof Sound !== 'undefined' && typeof Sound.playTone === 'function') {
            Sound.playTone(440, 'triangle', 0.1);
        }
    }
};

