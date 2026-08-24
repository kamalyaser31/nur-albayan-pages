/**
 * وحدة محرك ألعاب جدار الكلمات (Wordwall Engine & Games Suite)
 * المنظومة: نور البيان
 *
 * يوفر هذا الملف:
 * 1. GameCore: كائن الخدمات المشتركة (إدارة البيانات، الميقاتيات، الخلط، والاحتفال)
 * 2. wordwallRoom: المدير العام لغرفة الألعاب ونظام الـ Plugins
 * 3. الألعاب الفرعية السبع: الصناديق (box)، الستار (curtain)، العجلة الدوارة (wheel)،
 *    البطاقات المتقلبة (cards)، سلم الارتقاء (ladder)، بطاقات الكشف ثلاثية الأبعاد (tiles)، ومصفوفة خلية النحل (honeycomb).
 */

// ==========================================
// 1. كائن الخدمات المشتركة (Game Core Services)
// ==========================================
const GameCore = {
    /**
     * استخراج الكلمات النشطة مع إلحاق الفهرس الأصلي _origIndex
     * وفلترة عثرات الجلسة مع إزالة أي تكرار ناتج عن تكرار الخطأ
     * @param {boolean} [filterMistakes] - تفعيل فلترة عثرات الجلسة
     * @returns {Array} مصفوفة الكلمات النشطة
     */
    getDataset(filterMistakes = (typeof wordwallRoom !== 'undefined' ? wordwallRoom.filterSessionMistakes : false)) {
        if (typeof dataset === 'undefined' || !Array.isArray(dataset)) return [];
        if (!filterMistakes) return dataset;

        const mistakes = (typeof app !== 'undefined')
            ? ((app.sessionMistakesHistory && app.sessionMistakesHistory.length > 0) ? app.sessionMistakesHistory : (app.mistakeIndices || []))
            : [];

        if (!mistakes || mistakes.length === 0) {
            return dataset;
        }

        // تصفية الفهارس الفريدة لمنع تكرار الكلمات
        const uniqueIndices = [...new Set(mistakes)];

        return uniqueIndices.map(idx => {
            const item = dataset[idx];
            if (!item) return null;
            return Object.assign({}, item, { _origIndex: idx });
        }).filter(Boolean);
    },

    /**
     * خوارزمية خلط موحدة (Fisher-Yates) تستعين بـ app.shuffle إن وجدت
     * @param {Array} array - المصفوفة المراد خلطها
     * @returns {Array} المصفوفة بعد الخلط
     */
    shuffle(array) {
        if (!Array.isArray(array)) return array;
        if (typeof app !== 'undefined' && typeof app.shuffle === 'function') {
            app.shuffle(array);
        } else {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
        }
        return array;
    },

    /**
     * استدعاء آمن وموحد لتأثيرات الاحتفال البصرية والصوتية
     * @param {boolean} [withSound=true] - تشغيل النغمة الاحتفالية
     */
    celebrate(withSound = true) {
        if (typeof fireCelebration === 'function') {
            fireCelebration();
        }
        if (withSound && typeof Sound !== 'undefined' && typeof Sound.playChime === 'function') {
            Sound.playChime();
        }
    },

    /**
     * مدير ميقاتيات آمن يصفي أي ميقاتي سابق مسجل على نفس الخاصية لمنع تداخل العمليات
     * @param {Object} host - الكائن الحاضن للميقاتي
     * @param {string} timerProp - اسم خاصية الميقاتي
     * @param {Function} cb - الدالة المراد تنفيذها عند انتهاء المؤقت
     * @param {number} delay - مدة الانتظار بالمللي ثانية
     * @returns {number|null} معرف الميقاتي
     */
    createTimer(host, timerProp, cb, delay) {
        if (host && timerProp) {
            if (host[timerProp]) {
                clearTimeout(host[timerProp]);
                host[timerProp] = null;
            }
            if (typeof cb === 'function') {
                host[timerProp] = setTimeout(() => {
                    host[timerProp] = null;
                    cb();
                }, delay);
                return host[timerProp];
            }
        }
        return null;
    },

    /**
     * تصفية ميقاتي محدد بأمان
     * @param {Object} host - الكائن الحاضن
     * @param {string} timerProp - اسم خاصية الميقاتي
     */
    clearTimer(host, timerProp) {
        if (host && timerProp && host[timerProp]) {
            clearTimeout(host[timerProp]);
            host[timerProp] = null;
        }
    }
};

// ==========================================
// 2. الألعاب السبع الفرعية (Sub-Games Plugins)
// ==========================================

/**
 * لعبة الصناديق التفاعلية (Box Game Plugin)
 */
const boxGame = {
    containerId: 'ww-box-container',
    init() {
        if (typeof wordwallRoom !== 'undefined') wordwallRoom.renderBoxes();
    },
    reset() {
        if (typeof wordwallRoom !== 'undefined') {
            wordwallRoom.openedBoxes.clear();
            wordwallRoom.renderBoxes();
        }
    },
    cleanup() {}
};

/**
 * لعبة الستار المسرحي (Curtain Game Plugin)
 */
const curtainGame = {
    containerId: 'ww-box-container',
    init() {
        if (typeof wordwallRoom !== 'undefined') wordwallRoom.renderBoxes();
    },
    reset() {
        if (typeof wordwallRoom !== 'undefined') {
            wordwallRoom.openedBoxes.clear();
            wordwallRoom.renderBoxes();
        }
    },
    cleanup() {}
};

/**
 * لعبة العجلة الدوارة (Wheel of Fortune Game Plugin)
 * مع تسريع الرسم عبر Precomputed Slice Cache لضمان معدل 60fps مستقر
 */
const wheelGame = {
    containerId: 'ww-wheel-container',
    canvas: null,
    ctx: null,
    angle: 0,
    angularVelocity: 0,
    friction: 0.985,
    isSpinning: false,
    animFrameId: null,
    revealTimer: null,
    drawTimer: null,
    _sliceCache: null,

    _buildSliceCache(activeData) {
        const rLin = (c) => {
            const v = c / 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        };
        this._sliceCache = activeData.map((item, i) => {
            const origIdx = (item && item._origIndex !== undefined) ? item._origIndex : i;
            const col = wordwallColors[origIdx % wordwallColors.length];
            const red = parseInt(col.slice(1, 3), 16);
            const green = parseInt(col.slice(3, 5), 16);
            const blue = parseInt(col.slice(5, 7), 16);
            const lum = 0.2126 * rLin(red) + 0.7152 * rLin(green) + 0.0722 * rLin(blue);
            const textColor = lum > 0.38 ? '#0f172a' : '#ffffff';
            return {
                origIdx,
                col,
                textColor,
                label: (origIdx + 1).toString()
            };
        });
    },

    init() {
        this.reset();
        this.canvas = document.getElementById('wheel-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        const activeData = GameCore.getDataset();
        if (activeData) this._buildSliceCache(activeData);
        // تأخير طفيف لضمان حساب أبعاد الحاوية في الـ DOM بعد التبديل
        GameCore.createTimer(this, 'drawTimer', () => this.draw(), 50);
    },

    reset() {
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }
        GameCore.clearTimer(this, 'revealTimer');
        GameCore.clearTimer(this, 'drawTimer');
        this.isSpinning = false;
        this.angularVelocity = 0;
    },

    cleanup() {
        this.reset();
    },

    draw() {
        const activeData = GameCore.getDataset();
        if (!this.canvas || !this.ctx || !activeData || activeData.length === 0) return;
        if (!this._sliceCache || this._sliceCache.length !== activeData.length) {
            this._buildSliceCache(activeData);
        }
        const numSlices = this._sliceCache.length;
        const sliceAngle = (Math.PI * 2) / numSlices;
        const radius = this.canvas.width / 2;
        const fontSize = numSlices > 24 ? 'bold 13px Fredoka' : 'bold 17px Fredoka';
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();
        this.ctx.translate(radius, radius);
        this.ctx.rotate(this.angle);

        for (let i = 0; i < numSlices; i++) {
            const slice = this._sliceCache[i];
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.arc(0, 0, radius - 8, i * sliceAngle, (i + 1) * sliceAngle);
            this.ctx.closePath();
            this.ctx.fillStyle = slice.col;
            this.ctx.fill();
            this.ctx.lineWidth = 2;
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.stroke();

            this.ctx.save();
            this.ctx.rotate(i * sliceAngle + sliceAngle / 2);
            this.ctx.fillStyle = slice.textColor;
            this.ctx.font = fontSize;
            this.ctx.textAlign = 'right';
            this.ctx.fillText(slice.label, radius - 25, 5);
            this.ctx.restore();
        }

        // المركز الدائري
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
        const activeData = GameCore.getDataset();
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
        const activeData = GameCore.getDataset();
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
        GameCore.createTimer(this, 'revealTimer', () => {
            if (typeof app !== 'undefined') app.revealWord(origIdx, 'wheel');
        }, 400);
    }
};

/**
 * لعبة البطاقات المتقلبة (Deck Cards Game Plugin)
 */
const cardsGame = {
    containerId: 'ww-cards-container',
    cardDeckIndices: [],
    isAnimating: false,
    animTimer: null,

    init() {
        this.cleanup();
        const activeCard = document.getElementById('active-deck-card');
        if (activeCard) {
            activeCard.style.transform = 'none';
            activeCard.style.opacity = '1';
            activeCard.onclick = () => this.dealNextCard();
        }
        const activeData = GameCore.getDataset();
        if (!activeData || activeData.length === 0) return;
        this.cardDeckIndices = Array.from({ length: activeData.length }, (_, i) => i);
        this.shuffleDeck();
        this.updateBadge();
    },

    updateBadge() {
        const badge = document.getElementById('cards-remaining-badge');
        if (!badge) return;
        const activeData = GameCore.getDataset();
        const total = activeData ? activeData.length : 0;
        const remaining = this.cardDeckIndices ? this.cardDeckIndices.length : 0;
        const isAr = (typeof i18n !== 'undefined' && i18n.getLocale() === 'ar');
        badge.textContent = isAr ? `المتبقي: ${remaining} من ${total}` : `Remaining: ${remaining} of ${total}`;
    },

    shuffleDeck() {
        GameCore.shuffle(this.cardDeckIndices);
    },

    cleanup() {
        GameCore.clearTimer(this, 'animTimer');
        this.isAnimating = false;
        const activeCard = document.getElementById('active-deck-card');
        if (activeCard) {
            activeCard.style.transform = 'none';
            activeCard.style.opacity = '1';
        }
    },

    reset() {
        this.init();
    },

    dealNextCard() {
        if (this.isAnimating) return;
        const activeData = GameCore.getDataset();
        if (!activeData || activeData.length === 0) return;

        // عند نفاد الطابور: إعادة الخلط والسحب فوراً في نفس النبضة
        if (this.cardDeckIndices.length === 0) {
            const reshuffleMsg = (typeof i18n !== 'undefined')
                ? i18n.t('reshuffling_deck', 'إعادة خلط البطاقات... 🃏')
                : 'إعادة خلط البطاقات... 🃏';
            if (typeof app !== 'undefined') app.triggerFeedback(reshuffleMsg, '#3b82f6');
            this.cardDeckIndices = Array.from({ length: activeData.length }, (_, i) => i);
            this.shuffleDeck();
        }

        this.isAnimating = true;
        const deckIndex = this.cardDeckIndices.pop();
        this.updateBadge();
        const targetItem = activeData[deckIndex];
        const activeCardIndex = (targetItem && targetItem._origIndex !== undefined) ? targetItem._origIndex : deckIndex;

        const activeUIElement = document.getElementById('active-deck-card');
        if (activeUIElement) {
            activeUIElement.style.transform = 'translateY(-120px) rotateY(360deg) scale(1.15)';
            activeUIElement.style.opacity = '0.1';
            GameCore.createTimer(this, 'animTimer', () => {
                activeUIElement.style.transform = 'none';
                activeUIElement.style.opacity = '1';
                this.isAnimating = false;
                if (typeof app !== 'undefined') app.revealWord(activeCardIndex, 'cards');
            }, 600);
        } else {
            this.isAnimating = false;
            if (typeof app !== 'undefined') app.revealWord(activeCardIndex, 'cards');
        }
    }
};

/**
 * لعبة سلم الارتقاء القرآني (Ladder Progression Game Plugin)
 */
const ladderGame = {
    containerId: 'ww-ladder-container',
    targetSteps: 5,
    currentStep: 0,
    wordQueue: [],
    queueIdx: 0,
    currentWordItem: null,
    isCompleted: false,

    init() {
        const activeData = GameCore.getDataset();
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
        const activeData = GameCore.getDataset();
        if (!activeData || activeData.length === 0) {
            this.wordQueue = [];
            return;
        }
        this.wordQueue = Array.from({ length: activeData.length }, (_, i) => i);
        GameCore.shuffle(this.wordQueue);
    },

    showCurrentWord() {
        const activeData = GameCore.getDataset();
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
            const stepLabel = (typeof i18n !== 'undefined' && i18n.t)
                ? i18n.t('aria_ladder_announcement', null, { step: this.currentStep, total: this.targetSteps, word: plainWord })
                : `Step ${this.currentStep} of ${this.targetSteps}: ${plainWord}`;
            liveRegion.textContent = stepLabel;
        }
    },

    renderLadder() {
        const rungsContainer = document.getElementById('ladder-rungs');
        if (!rungsContainer) return;
        rungsContainer.textContent = '';
        const fragment = document.createDocumentFragment();

        for (let s = this.targetSteps; s >= 1; s--) {
            const rung = document.createElement('div');
            const isReached = s <= this.currentStep;
            const isTarget = !this.isCompleted && (s === this.currentStep + 1);
            const isCrown = s === this.targetSteps;

            const bgClass = isCrown
                ? (isReached ? 'bg-amber-400 text-slate-900 border-2 border-amber-300 shadow-lg scale-105' : (isTarget ? 'bg-amber-200 text-amber-950 border-2 border-amber-400 ring-4 ring-amber-300 animate-pulse scale-105 font-black' : 'bg-amber-100 text-amber-800 border-2 border-amber-300/60'))
                : (isReached ? 'bg-emerald-500 text-white shadow-md' : (isTarget ? 'bg-emerald-100 text-emerald-950 border-2 border-emerald-400 ring-4 ring-emerald-300 scale-102 font-black shadow-sm' : 'bg-white/60 text-slate-400 border border-slate-200'));

            rung.className = `rung-step flex items-center justify-between p-2.5 rounded-xl font-bold text-xs transition-all duration-300 ${bgClass}`;
            rung.id = `ladder-rung-${s}`;

            const stepAriaKey = isCrown ? (isReached ? 'aria_step_crown' : 'aria_step_unreached') : (isReached ? 'aria_step_reached' : 'aria_step_unreached');
            const stepAriaText = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t(stepAriaKey, null, { step: s }) : `Step ${s}`;
            rung.setAttribute('aria-label', stepAriaText);

            const crownLabel = (typeof i18n !== 'undefined') ? i18n.t('ladder_peak_label', '👑 القمة') : '👑 القمة';
            const stepLabel = (typeof i18n !== 'undefined') ? i18n.t('ladder_rung_label', 'الدرجة {step}', { step: s }) : `الدرجة ${s}`;
            const stepIcon = isReached ? (isCrown ? '🏆' : '✔') : (isTarget ? '🎯' : '🔒');

            rung.innerHTML = `
                <div class="flex items-center gap-2">
                    <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs ${isReached ? 'bg-white text-emerald-700 font-black' : (isTarget ? 'bg-emerald-600 text-white font-black' : 'bg-slate-200 text-slate-600')}">${s}</span>
                    <span>${isCrown ? crownLabel : stepLabel}</span>
                </div>
                <span class="text-sm">${stepIcon}</span>
            `;
            fragment.appendChild(rung);
        }
        rungsContainer.appendChild(fragment);

        const stepCountEl = document.getElementById('ladder-step-indicator');
        if (stepCountEl) {
            stepCountEl.textContent = (typeof i18n !== 'undefined')
                ? i18n.t('ladder_step_indicator', 'الدرجة {step} من {total}', { step: this.currentStep, total: this.targetSteps })
                : `الدرجة ${this.currentStep} من ${this.targetSteps}`;
        }
    },

    grade(isCorrect) {
        if (this.isCompleted) return;

        const activeData = GameCore.getDataset();
        const wordIndex = (this.wordQueue && this.wordQueue[this.queueIdx] !== undefined) ? this.wordQueue[this.queueIdx] : 0;
        const currentWord = (activeData && activeData[wordIndex]) ? activeData[wordIndex] : this.currentWordItem;
        const origIdx = (currentWord && currentWord._origIndex !== undefined) ? currentWord._origIndex : wordIndex;
        const lessonId = (typeof app !== 'undefined' && typeof app.getLessonId === 'function') ? app.getLessonId() : 'current';
        const activeStudentId = (typeof studentManager !== 'undefined') ? studentManager.getActiveStudentId() : null;

        if (isCorrect) {
            this.currentStep++;
            if (typeof app !== 'undefined') {
                app.score += 2;
                app.stats.ok++;
                app.updateScoreUI();
            }
            if (typeof studentManager !== 'undefined' && activeStudentId) {
                studentManager.recordCardEvaluation(activeStudentId, origIdx, true, lessonId, 2);
            }
            if (typeof Sound !== 'undefined' && typeof Sound.stepUp === 'function') {
                Sound.stepUp(this.currentStep, this.targetSteps);
            }
            this.renderLadder();

            if (this.currentStep >= this.targetSteps) {
                this.isCompleted = true;
                GameCore.celebrate(true);
                if (typeof app !== 'undefined') {
                    app.score += 5;
                    app.updateScoreUI();
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
            if (typeof app !== 'undefined') {
                app.stats.err++;
                app.recordMistake(origIdx);
            }
            if (typeof studentManager !== 'undefined' && activeStudentId) {
                studentManager.recordCardEvaluation(activeStudentId, origIdx, false, lessonId, 0);
            }
            this.currentStep = Math.max(0, this.currentStep - 1);
            if (typeof Sound !== 'undefined' && typeof Sound.stepDown === 'function') {
                Sound.stepDown();
            }
            this.renderLadder();
            // إعادة إدراج الكلمة المتعثرة في نهاية الطابور لضمان إتقانها
            if (this.wordQueue) {
                this.wordQueue.push(wordIndex);
            }
        }

        this.queueIdx++;
        this.showCurrentWord();
    },

    cleanup() {},

    reset() {
        this.init();
    }
};

/**
 * لعبة بطاقات الكشف ثلاثية الأبعاد (3D Flip Tiles Game Plugin)
 */
const tilesGame = {
    containerId: 'ww-tiles-container',
    flippedTiles: new Set(),

    init() {
        this.renderTiles();
    },

    cleanup() {},

    renderTiles() {
        const container = document.getElementById('tiles-grid');
        if (!container) return;
        const activeData = GameCore.getDataset();
        if (!activeData) return;
        container.textContent = '';
        const fragment = document.createDocumentFragment();

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
            let innerHtml = '';
            if (typeof item === 'object' && item !== null) {
                if (item.html) {
                    innerHtml = item.html;
                } else if (item.w && typeof item.w === 'string') {
                    innerHtml = item.w;
                } else if (Array.isArray(item.w)) {
                    innerHtml = item.w.map((seg, i) => `<span class="color-${i % 3}">${seg}</span>`).join('');
                } else if (item.segs && Array.isArray(item.segs)) {
                    const colorClasses = ['c-red', 'c-blue', 'c-black'];
                    innerHtml = item.segs.map((ch, i) => `<span class="${colorClasses[i % 3]}">${ch}</span>`).join(' ');
                } else {
                    innerHtml = (typeof app !== 'undefined' ? app.getPlainWord(item) : String(item));
                }
            } else {
                innerHtml = String(item || '');
            }

            const plainText = (typeof app !== 'undefined') ? app.getPlainWord(item) : String(item);
            const charLen = plainText.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '').length;
            const tileFontSize = charLen > 18 ? 'text-xs sm:text-sm md:text-base' : (charLen > 12 ? 'text-sm sm:text-base md:text-lg' : (charLen > 6 ? 'text-lg sm:text-xl md:text-2xl' : 'text-2xl sm:text-3xl md:text-4xl'));

            tile.innerHTML = `
                <div class="flip-tile-inner" aria-hidden="true">
                    <div class="tile-face tile-front flex flex-col items-center justify-center text-white border-[3px] border-white/40 shadow-lg hover:scale-105 transition-transform" style="background-color: ${color}">
                        <span class="text-4xl sm:text-5xl lg:text-6xl font-black drop-shadow-md">${origIdx + 1}</span>
                        <span class="text-[10px] sm:text-xs font-bold uppercase tracking-wider mt-2 bg-black/25 px-3 py-0.5 rounded-full backdrop-blur-sm">${i18n.t('flip')} 🀄</span>
                    </div>
                    <div class="tile-face tile-back flex flex-col items-center justify-center p-2 bg-white border-[3px] border-emerald-400 text-slate-800 shadow-xl overflow-hidden">
                        <div class="quran-font ${tileFontSize} font-bold text-slate-900 leading-snug text-center" style="letter-spacing: normal !important;">${innerHtml}</div>
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

            fragment.appendChild(tile);
        });
        container.appendChild(fragment);
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

    /**
     * قلب كافة البطاقات مع التعديل الجراحي على عناصر الـ DOM القائمة لمنع إعادة البناء
     */
    flipAll() {
        const activeData = GameCore.getDataset();
        if (!activeData || activeData.length === 0) return;
        const allFlipped = this.flippedTiles.size === activeData.length;

        if (allFlipped) {
            this.flippedTiles.clear();
            activeData.forEach((item, idx) => {
                const origIdx = (item && item._origIndex !== undefined) ? item._origIndex : idx;
                const tile = document.getElementById(`tile-${origIdx}`);
                if (tile) {
                    tile.classList.remove('flipped');
                    const aria = (typeof i18n !== 'undefined' && i18n.t)
                        ? i18n.t('aria_tile_hidden', null, { num: origIdx + 1 })
                        : `Tile ${origIdx + 1}, hidden`;
                    tile.setAttribute('aria-label', aria);
                }
            });
            if (typeof Sound !== 'undefined' && typeof Sound.playTone === 'function') {
                Sound.playTone(350, 'sine', 0.1);
            }
        } else {
            activeData.forEach((item, idx) => {
                const origIdx = (item && item._origIndex !== undefined) ? item._origIndex : idx;
                this.flippedTiles.add(origIdx);
                const tile = document.getElementById(`tile-${origIdx}`);
                if (tile) {
                    tile.classList.add('flipped');
                    const aria = (typeof i18n !== 'undefined' && i18n.t)
                        ? i18n.t('aria_tile_revealed', null, { num: origIdx + 1 })
                        : `Tile ${origIdx + 1}, revealed`;
                    tile.setAttribute('aria-label', aria);
                }
            });
            if (typeof Sound !== 'undefined' && typeof Sound.playTone === 'function') {
                Sound.playTone(700, 'sine', 0.15);
            }
        }
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
 * مصفوفة خلية النحل التعليمية (Honeycomb Matrix Board Plugin)
 */
const honeycombGame = {
    containerId: 'ww-honeycomb-container',
    cellStatus: {}, // index: 'mastered' | 'review' | null

    init() {
        this.cellStatus = {};
        this.renderBoard();
        this.updateBadge();
    },

    cleanup() {},

    renderBoard() {
        const board = document.getElementById('honeycomb-board');
        if (!board) return;
        const activeData = GameCore.getDataset();
        if (!activeData) return;
        board.textContent = '';
        const fragment = document.createDocumentFragment();

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

            fragment.appendChild(hex);
        });
        board.appendChild(fragment);
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
            hex.classList.add(isMastered ? 'mastered' : 'review');
            const statusText = isMastered ? 'متقنة' : 'مراجعة';
            hex.setAttribute('aria-label', (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('aria_honeycomb_cell', null, { num: index + 1, status: statusText }) : `Cell ${index + 1}: ${statusText}`);
            const iconSpan = hex.querySelector('span:last-child');
            if (iconSpan) iconSpan.textContent = isMastered ? '✔' : '📌';
        }
        this.updateBadge();
    },

    updateBadge() {
        const badge = document.getElementById('hex-progress-badge');
        if (!badge) return;
        const activeData = GameCore.getDataset();
        const total = activeData ? activeData.length : (dataset ? dataset.length : 0);
        const mastered = Object.values(this.cellStatus).filter(s => s === 'mastered').length;
        const isAr = (typeof i18n !== 'undefined' && i18n.getLocale() === 'ar');
        badge.textContent = isAr ? `المتقن: ${mastered} من ${total}` : `Mastered: ${mastered} of ${total}`;
    },

    reset() {
        this.cellStatus = {};
        this.renderBoard();
        this.updateBadge();
    }
};

// ==========================================
// 3. المدير العام لغرفة الألعاب (Wordwall Room)
// ==========================================
const wordwallRoom = {
    mode: 'box',
    openedBoxes: new Set(),
    boxStatus: {},
    filterSessionMistakes: false,

    // سجل الألعاب كـ Plugins
    games: {
        box: boxGame,
        curtain: curtainGame,
        wheel: wheelGame,
        cards: cardsGame,
        ladder: ladderGame,
        tiles: tilesGame,
        honeycomb: honeycombGame
    },

    getActiveDataset() {
        return GameCore.getDataset(this.filterSessionMistakes);
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

        // إعادة ضبط اللعبة الحالية بعد تغيير الفلترة
        this.openedBoxes.clear();
        this.boxStatus = {};
        if (this.mode === 'box' || this.mode === 'curtain') {
            this.renderBoxes();
        } else if (this.games[this.mode]) {
            const activeGame = this.games[this.mode];
            if (typeof activeGame.reset === 'function') {
                activeGame.reset();
            }
            if (this.mode === 'wheel' && typeof activeGame.draw === 'function') {
                activeGame.draw();
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
        this.updateFilterButtonUI();
        this.renderBoxes();
        Object.values(this.games).forEach(game => {
            if (game && typeof game.init === 'function') {
                game.init();
            }
        });
    },

    cleanup() {
        Object.values(this.games).forEach(game => {
            if (game && typeof game.cleanup === 'function') {
                game.cleanup();
            }
        });
    },

    /**
     * تبديل نمط اللعبة مع تنظيف تلقائي للعبة السابقة وإخفاء الحاويات بحلقة واحدة
     * @param {string} mode - اسم النمط المسجل
     */
    switchMode(mode) {
        if (!this.games[mode]) return;
        const prevGame = this.games[this.mode];
        if (prevGame && typeof prevGame.cleanup === 'function') {
            prevGame.cleanup();
        }
        this.mode = mode;

        // 1. تحديث حالة أزرار التبويب ودعم WAI-ARIA
        document.querySelectorAll('#wordwall-stage .game-tab').forEach(tab => {
            tab.classList.remove('active');
            tab.setAttribute('aria-selected', 'false');
        });
        const activeTab = document.getElementById(`tab-${mode}`);
        if (activeTab) {
            activeTab.classList.add('active');
            activeTab.setAttribute('aria-selected', 'true');
        }

        // 2. إخفاء كافة الحاويات الفرعية المسجلة بحلقة واحدة
        const uniqueContainerIds = new Set(Object.values(this.games).map(g => g.containerId).filter(Boolean));
        uniqueContainerIds.forEach(cId => {
            const containerEl = document.getElementById(cId);
            if (containerEl) containerEl.classList.add('hidden');
        });

        // 3. إظهار الحاوية للعبة الحالية
        const currentGame = this.games[mode];
        if (currentGame && currentGame.containerId) {
            const activeContainer = document.getElementById(currentGame.containerId);
            if (activeContainer) activeContainer.classList.remove('hidden');
        }

        // 4. ضبط العناوين أو إعادة تهيئة النمط
        if (mode === 'box' || mode === 'curtain') {
            const promptEl = document.getElementById('box-prompt-text');
            if (promptEl && typeof i18n !== 'undefined') {
                promptEl.innerText = (mode === 'curtain') ? i18n.t('prompt_curtain') : i18n.t('prompt_box');
            }
            this.renderBoxes();
        } else if (currentGame && typeof currentGame.init === 'function') {
            currentGame.init();
        }

        // 5. مزامنة القائمة المنسدلة للتنقل
        const navSelect = document.getElementById('example-navigator');
        if (navSelect) navSelect.value = `ww_${mode}`;
    },

    markBoxStatus(index, isCorrect) {
        this.boxStatus[index] = isCorrect ? 'mastered' : 'review';
        const box = document.getElementById(`box-${index}`);
        if (box) {
            box.classList.remove('status-mastered', 'status-review');
            box.classList.add(isCorrect ? 'status-mastered' : 'status-review');
            const backFace = box.querySelector('.box-back');
            if (backFace) {
                backFace.className = `box-back rounded-2xl flex items-center justify-center border-[3px] shadow-inner ${
                    isCorrect ? 'bg-emerald-50 text-emerald-600 border-emerald-400' : 'bg-rose-50 text-rose-600 border-rose-400'
                }`;
                backFace.innerHTML = `<span class="text-4xl">${isCorrect ? '✔' : '📌'}</span>`;
            }
        }
    },

    renderBoxes() {
        const container = document.getElementById('box-grid');
        if (!container || typeof dataset === 'undefined') return;
        container.textContent = '';
        const isCurtain = (this.mode === 'curtain');
        const labelType = isCurtain ? 'Curtain' : 'Box';
        const activeData = this.getActiveDataset();
        const fragment = document.createDocumentFragment();

        activeData.forEach((item, index) => {
            const origIdx = (item && item._origIndex !== undefined) ? item._origIndex : index;
            const box = document.createElement('button');
            box.type = 'button';
            const isOpened = this.openedBoxes.has(origIdx);
            const status = this.boxStatus[origIdx];
            const isMastered = status === 'mastered';
            const isReview = status === 'review';
            const statusClass = isMastered ? 'status-mastered' : (isReview ? 'status-review' : '');
            const backClass = isMastered
                ? 'bg-emerald-50 text-emerald-600 border-emerald-400'
                : (isReview ? 'bg-rose-50 text-rose-600 border-rose-400' : 'bg-slate-100 text-slate-400 border-slate-300');
            const backIcon = isMastered ? '✔' : (isReview ? '📌' : '✔');

            box.className = `wordwall-box relative aspect-square w-full flex items-center justify-center rounded-2xl ${isCurtain ? 'curtain-box' : ''} ${isOpened ? 'opened' : ''} ${statusClass}`.trim();
            box.id = `box-${origIdx}`;
            
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
                        <div class="box-back rounded-2xl flex items-center justify-center border-[3px] shadow-inner ${backClass}"><span class="text-4xl">${backIcon}</span></div>
                    </div>`;
            } else {
                box.innerHTML = `
                    <div class="wordwall-box-inner relative w-full h-full duration-500" aria-hidden="true">
                        <div class="box-front rounded-2xl flex flex-col items-center justify-center text-white border-[3px] border-white/40 shadow-lg hover:scale-105 transition-transform" style="background-color: ${color}">
                            <span class="text-4xl sm:text-5xl lg:text-6xl font-black drop-shadow-md">${origIdx + 1}</span>
                            <span class="text-[10px] sm:text-xs font-bold uppercase tracking-wider mt-2 bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">${i18n.t('open')}</span>
                        </div>
                        <div class="box-back rounded-2xl flex items-center justify-center border-[3px] shadow-inner ${backClass}"><span class="text-4xl">${backIcon}</span></div>
                    </div>`;
            }
            
            box.onclick = () => {
                if (!this.openedBoxes.has(origIdx)) {
                    const openedKey = isCurtain ? 'aria_curtain_opened' : 'aria_box_opened';
                    box.setAttribute('aria-label', (typeof i18n !== 'undefined' && i18n.t) ? i18n.t(openedKey, null, { num: origIdx + 1 }) : `${labelType} ${origIdx + 1}, opened`);
                    app.revealWord(origIdx, isCurtain ? 'curtain' : 'box');
                }
            };
            fragment.appendChild(box);
        });
        container.appendChild(fragment);
    },

    /**
     * تصفية كافة الألعاب المسجلة بحلقة واحدة والتحول لنمط الصناديق الأساسي
     */
    reset() {
        this.openedBoxes.clear();
        this.boxStatus = {};
        Object.values(this.games).forEach(game => {
            if (game && typeof game.reset === 'function') {
                game.reset();
            }
        });
        this.switchMode('box');
    }
};

// ضمان إتاحة الكائنات في النطاق العام للمتصفح
if (typeof window !== 'undefined') {
    window.GameCore = GameCore;
    window.boxGame = boxGame;
    window.curtainGame = curtainGame;
    window.wheelGame = wheelGame;
    window.cardsGame = cardsGame;
    window.ladderGame = ladderGame;
    window.tilesGame = tilesGame;
    window.honeycombGame = honeycombGame;
    window.wordwallRoom = wordwallRoom;
}
