const app = {
    idx: 0,
    score: 0,
    stats: { ok: 0, err: 0 },
    clock: 10.0,
    timer: null,
    feedbackTimer: null,
    advanceTimer: null,
    drillTransitionTimer: null,
    _isAdvancing: false,
    hasPlayedGame1: false,
    hasPlayedGame2: false,
    hasPlayedGame3: false,
    currentActiveIndex: null,
    pendingGame: 0,
    chartInstance: null,
    order: null,
    mistakeIndices: [],
    keyboardBound: false,
    _localeBound: false,
    isSessionDrill: false,
    sessionDrillQueue: [],
    sessionDrillIdx: 0,
    initialSessionMistakes: [],
    sessionMistakesHistory: [],
    enableGameBreaks: false,

    init() {
        buildAppUI();
        if (typeof settingsManager !== 'undefined') {
            const s = settingsManager.get();
            this.enableGameBreaks = !!s.gameBreaksEnabled;
            settingsManager.apply(s);
        } else {
            try {
                const saved = localStorage.getItem('nb_teacher_settings');
                if (saved !== null) {
                    const parsed = JSON.parse(saved);
                    this.enableGameBreaks = !!parsed.gameBreaksEnabled;
                }
            } catch (e) {}
        }
        const toggleEl = document.getElementById('toggle-game-breaks');
        if (toggleEl) toggleEl.checked = this.enableGameBreaks;

        this.populateSelector();
        this.populatePageJumper();
        this.jumpTo('menu');
        if (typeof xoGame !== 'undefined') xoGame.init();
        if (typeof c4Game !== 'undefined') c4Game.init();
        if (typeof memoryGame !== 'undefined' && document.getElementById('memory-stage')) memoryGame.init();
        if (typeof riddlesGame !== 'undefined' && document.getElementById('riddles-stage')) riddlesGame.init();
        if (typeof wordwallRoom !== 'undefined') wordwallRoom.init();
        if (typeof ruleManager !== 'undefined' && typeof ruleManager.hasRules === 'function' && ruleManager.hasRules()) ruleManager.init();

        if (!this._localeBound) {
            this._localeBound = true;
            window.addEventListener(NBContracts.EVENTS.LOCALE_CHANGED, () => {
                this.populateSelector();
                this.populatePageJumper();
                if (typeof updateActiveStudentPill === 'function') {
                    updateActiveStudentPill();
                }
            });
        }

        if (!this.keyboardBound) {
            this.keyboardBound = true;
            document.addEventListener('keydown', (e) => {
                // فحص المفاتيح التوجيهية وتجاهلها لعدم التعارض مع اختصارات المتصفح
                if (e.ctrlKey || e.altKey || e.metaKey) return;

                // حظر التفاعل بالمفاتيح السريعة إذا كان التركيز داخل حقل إدخال
                if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

                // حظر التفاعل بالمفاتيح إذا كانت نافذة الإعدادات مفتوحة
                const settingsModal = document.getElementById('nb-settings-modal');
                if (settingsModal && !settingsModal.classList.contains('hidden')) return;

                // حظر التفاعل بالمفاتيح إذا كانت نافذة قائمة الطلاب مفتوحة
                const rosterModal = document.getElementById('student-roster-modal');
                if (rosterModal && !rosterModal.classList.contains('hidden')) return;

                // حظر التفاعل بالمفاتيح إذا كانت نافذة تأكيد الخروج المبكر مفتوحة
                const earlyExitModal = document.getElementById('early-exit-modal');
                if (earlyExitModal && !earlyExitModal.classList.contains('hidden')) {
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        app.closeEarlyExitModal();
                    }
                    return;
                }

                // تعطيل مفتاح Escape أثناء طور المعالجة الفورية وقصر الخروج على زر (✕) الذي يفتح نافذة التأكيد
                if (app.isSessionDrill) {
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        app.openEarlyExitModal();
                        return;
                    }
                }

                const overlay = document.getElementById('word-overlay');
                const isOverlayOpen = overlay && !overlay.classList.contains('hidden');
                const learningStage = document.getElementById('learning-stage');
                const isLearning = learningStage && !learningStage.classList.contains('hidden');

                const ruleStage = document.getElementById('rule-stage');
                const isRuleActive = ruleStage && !ruleStage.classList.contains('hidden');
                if (isRuleActive && typeof ruleManager !== 'undefined') {
                    if (e.key === 'ArrowLeft' || e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        ruleManager.next();
                    } else if (e.key === 'ArrowRight') {
                        e.preventDefault();
                        ruleManager.prev();
                    }
                    return;
                }

                if (isOverlayOpen) {
                    if (e.key === 'Escape') app.closeOverlay();
                    else if (e.key === '1' || e.key === 'ArrowUp') { e.preventDefault(); app.gradeResult(false); }
                    else if (e.key === '2' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); app.gradeResult(true); }
                    return;
                }

                const wwStage = document.getElementById('wordwall-stage');
                const isWordwall = wwStage && !wwStage.classList.contains('hidden');
                if (isWordwall && typeof wordwallRoom !== 'undefined' && wordwallRoom.mode === 'ladder' && typeof ladderGame !== 'undefined') {
                    if (e.key === '1' || e.key === 'ArrowDown') { e.preventDefault(); ladderGame.grade(false); }
                    else if (e.key === '2' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ladderGame.grade(true); }
                    else if (e.key === 'r' || e.key === 'R') ladderGame.reset();
                    return;
                }

                if (isLearning) {
                    if (e.key === 'ArrowRight' || e.key === 'PageUp') {
                        e.preventDefault();
                        app.prev();
                    } else if (e.key === 'ArrowLeft' || e.key === 'PageDown' || e.key === 'n' || e.key === 'N') {
                        e.preventDefault();
                        app.next();
                    } else if (e.key === '1' || e.key === 'ArrowDown') {
                        e.preventDefault();
                        app.evaluate(false);
                    } else if (e.key === '2' || e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        app.evaluate(true);
                    }
                }
            });
        }
    },

    hideAll() {
        this.clearAdvanceTimer();
        if (this.timer) { clearInterval(this.timer); this.timer = null; }
        if (this.feedbackTimer) { clearTimeout(this.feedbackTimer); this.feedbackTimer = null; }
        if (this.drillTransitionTimer) { clearTimeout(this.drillTransitionTimer); this.drillTransitionTimer = null; }
        this._isAdvancing = false;
        this.closeOverlay();
        this.closeEarlyExitModal();

        // تنظيف الألعاب النشطة
        if (typeof xoGame !== 'undefined' && typeof xoGame.cleanup === 'function') xoGame.cleanup();
        if (typeof c4Game !== 'undefined' && typeof c4Game.cleanup === 'function') c4Game.cleanup();
        if (typeof memoryGame !== 'undefined' && typeof memoryGame.cleanup === 'function') memoryGame.cleanup();
        if (typeof riddlesGame !== 'undefined' && typeof riddlesGame.cleanup === 'function') riddlesGame.cleanup();
        if (typeof wordwallRoom !== 'undefined' && typeof wordwallRoom.cleanup === 'function') wordwallRoom.cleanup();

        const drillBanner = document.getElementById('session-drill-banner');
        if (drillBanner) drillBanner.classList.add('hidden');
        ['main-menu-stage', 'rule-stage', 'game-transition-stage', 'learning-stage', 'xo-stage', 'c4-stage', 'memory-stage', 'riddles-stage', 'wordwall-stage', 'summary-screen'].forEach(id => {
            const el = document.getElementById(id); if (el) el.classList.add('hidden');
        });
    },

    jumpTo(val) {
        if (this.drillTransitionTimer) {
            clearTimeout(this.drillTransitionTimer);
            this.drillTransitionTimer = null;
        }
        this.hideAll();
        this.isSessionDrill = false;
        const topNav = document.getElementById('top-nav'); if (topNav) topNav.classList.remove('hidden');
        if (typeof val === 'string' && val.startsWith('word_')) {
            const targetWordIdx = parseInt(val.split('_')[1], 10);
            if (!Number.isNaN(targetWordIdx) && targetWordIdx >= 0) {
                if (!this.order && typeof dataset !== 'undefined') {
                    this.order = Array.from({ length: dataset.length }, (_, i) => i);
                    const settings = (typeof settingsManager !== 'undefined') ? settingsManager.get() : {};
                    if (settings.shuffleCards) {
                        this.shuffle(this.order);
                    }
                }
                const foundPos = (this.order) ? this.order.indexOf(targetWordIdx) : targetWordIdx;
                this.idx = (foundPos !== -1) ? foundPos : targetWordIdx;
                const stage = document.getElementById('learning-stage'); if (stage) stage.classList.remove('hidden');
                this.render();
            }
        } else if (val === 'menu') {
            const menu = document.getElementById('main-menu-stage'); if (menu) menu.classList.remove('hidden');
        } else if (val === 'rules') {
            const rStage = document.getElementById('rule-stage'); if (rStage) { rStage.classList.remove('hidden'); if (typeof ruleManager !== 'undefined') ruleManager.render(); }
        } else if (val === 'session_drill') {
            this.startSessionDrill();
        } else if (val === 'transition_1') { this.showGameTransition(1); }
        else if (val === 'transition_2') { this.showGameTransition(2); }
        else if (val === 'transition_3') { this.showGameTransition(3); }
        else if (val === 'game_xo') { const s = document.getElementById('xo-stage'); if (s) s.classList.remove('hidden'); }
        else if (val === 'game_c4') { const s = document.getElementById('c4-stage'); if (s) s.classList.remove('hidden'); }
        else if (val === 'game_memory') { const s = document.getElementById('memory-stage'); if (s) { s.classList.remove('hidden'); if (typeof memoryGame !== 'undefined') memoryGame.init(); } }
        else if (val === 'game_riddles') { const s = document.getElementById('riddles-stage'); if (s) { s.classList.remove('hidden'); if (typeof riddlesGame !== 'undefined') riddlesGame.reset(); } }
        else if (val === 'ww_box') { const s = document.getElementById('wordwall-stage'); if (s) s.classList.remove('hidden'); if (typeof wordwallRoom !== 'undefined') wordwallRoom.switchMode('box'); }
        else if (val === 'ww_curtain') { const s = document.getElementById('wordwall-stage'); if (s) s.classList.remove('hidden'); if (typeof wordwallRoom !== 'undefined') wordwallRoom.switchMode('curtain'); }
        else if (val === 'ww_ladder') { const s = document.getElementById('wordwall-stage'); if (s) s.classList.remove('hidden'); if (typeof wordwallRoom !== 'undefined') wordwallRoom.switchMode('ladder'); }
        else if (val === 'ww_wheel') { const s = document.getElementById('wordwall-stage'); if (s) s.classList.remove('hidden'); if (typeof wordwallRoom !== 'undefined') wordwallRoom.switchMode('wheel'); }
        else if (val === 'ww_cards') { const s = document.getElementById('wordwall-stage'); if (s) s.classList.remove('hidden'); if (typeof wordwallRoom !== 'undefined') wordwallRoom.switchMode('cards'); }
        else if (val === 'ww_tiles') { const s = document.getElementById('wordwall-stage'); if (s) s.classList.remove('hidden'); if (typeof wordwallRoom !== 'undefined') wordwallRoom.switchMode('tiles'); }
        else if (val === 'ww_honeycomb') { const s = document.getElementById('wordwall-stage'); if (s) s.classList.remove('hidden'); if (typeof wordwallRoom !== 'undefined') wordwallRoom.switchMode('honeycomb'); }
        else if (val === 'summary') { this.finishToSummary(); }
        const sel = document.getElementById('example-navigator'); if (sel) sel.value = val;
    },

    startChallenge() {
        this.idx = 0; this.score = 0; this.stats = { ok: 0, err: 0 };
        this.hasPlayedGame1 = false; this.hasPlayedGame2 = false; this.hasPlayedGame3 = false;
        this.mistakeIndices = [];
        this.isSessionDrill = false; this.sessionDrillQueue = []; this.sessionDrillIdx = 0; this.sessionMistakesHistory = [];
        this.updateDrillNavOption();
        this.updateScoreUI();

        // مزامنة الدرس الحالي والنقاط مع موزع الحالة المركزي
        if (typeof nbStore !== 'undefined' && typeof nbStore.setState === 'function') {
            const lessonId = (typeof window.PAGE_CONFIG !== 'undefined' && window.PAGE_CONFIG.lessonId)
                ? window.PAGE_CONFIG.lessonId
                : (window.location.pathname.match(/(\d+)\.html/) || [])[1] || null;
            nbStore.setState({ score: 0, currentLessonId: lessonId }, { silent: true });
        }

        if (typeof dataset !== 'undefined' && Array.isArray(dataset)) {
            this.order = Array.from({ length: dataset.length }, (_, i) => i);
            const settings = (typeof settingsManager !== 'undefined') ? settingsManager.get() : {};
            if (settings.shuffleCards) {
                this.shuffle(this.order);
            }
        } else {
            this.order = null;
        }

        const firstWordIdx = (this.order && this.order.length > 0) ? this.order[0] : 0;
        this.jumpTo(`word_${firstWordIdx}`);
    },

    populateSelector() {
        const selector = document.getElementById('example-navigator');
        if (!selector || typeof dataset === 'undefined') return;
        const currentVal = selector.value;
        selector.innerHTML = '';

        const mainGroup = document.createElement('optgroup');
        mainGroup.label = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('group_overview') : '📌 Overview & Rules';
        const menuOpt = document.createElement('option');
        menuOpt.value = 'menu';
        menuOpt.textContent = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('main_menu') : '🏠 Main Menu';
        mainGroup.appendChild(menuOpt);

        if (typeof rulesData !== 'undefined' && rulesData.length > 0) {
            const ruleOpt = document.createElement('option');
            ruleOpt.value = 'rules';
            ruleOpt.textContent = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('rules_and_intro') : '📖 Rules';
            mainGroup.appendChild(ruleOpt);
        }

        if (this.mistakeIndices && this.mistakeIndices.length > 0) {
            const drillOpt = document.createElement('option');
            drillOpt.value = 'session_drill';
            drillOpt.id = 'nav-opt-session-drill';
            const isAr = (typeof i18n !== 'undefined' && i18n.getLocale() === 'ar');
            drillOpt.textContent = isAr ? `🎯 عالج عثرات اليوم (${this.mistakeIndices.length})` : `🎯 Drill Today's Mistakes (${this.mistakeIndices.length})`;
            mainGroup.appendChild(drillOpt);
        }
        selector.appendChild(mainGroup);

        const cardGroup = document.createElement('optgroup');
        cardGroup.label = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('group_cards') : '🔤 Cards';
        dataset.forEach((item, index) => {
            const opt = document.createElement('option');
            opt.value = `word_${index}`;
            const plain = this.getPlainWord(item);
            opt.textContent = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('card_label', null, { num: index + 1, word: plain }) : `Card ${index + 1}: ${plain}`;
            cardGroup.appendChild(opt);
        });
        selector.appendChild(cardGroup);

        const gamesGroup = document.createElement('optgroup');
        gamesGroup.label = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('group_mini_games') : '🎮 Games';
        const g1 = document.createElement('option'); g1.value = 'game_xo'; g1.textContent = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('game_xo') : '🕹️ XO'; gamesGroup.appendChild(g1);
        const g2 = document.createElement('option'); g2.value = 'game_c4'; g2.textContent = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('game_c4') : '🕹️ Connect 4'; gamesGroup.appendChild(g2);
        const g3 = document.createElement('option'); g3.value = 'game_memory'; g3.textContent = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('game_memory') : '🧠 Memory'; gamesGroup.appendChild(g3);
        const g4 = document.createElement('option'); g4.value = 'game_riddles'; g4.textContent = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('game_riddles') : '❓ Riddles'; gamesGroup.appendChild(g4);
        selector.appendChild(gamesGroup);

        const wwGroup = document.createElement('optgroup');
        wwGroup.label = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('group_wordwall') : '🌟 Wordwall';
        const w1 = document.createElement('option'); w1.value = 'ww_box'; w1.textContent = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('ww_box_opt') : '📦 Box'; wwGroup.appendChild(w1);
        const w2 = document.createElement('option'); w2.value = 'ww_curtain'; w2.textContent = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('ww_curtain_opt') : '🎭 Curtain'; wwGroup.appendChild(w2);
        const w3 = document.createElement('option'); w3.value = 'ww_ladder'; w3.textContent = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('ww_ladder_opt') : '🪜 Ladder'; wwGroup.appendChild(w3);
        const w4 = document.createElement('option'); w4.value = 'ww_wheel'; w4.textContent = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('ww_wheel_opt') : '🎡 Wheel'; wwGroup.appendChild(w4);
        const w5 = document.createElement('option'); w5.value = 'ww_cards'; w5.textContent = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('ww_cards_opt') : '🎴 Cards'; wwGroup.appendChild(w5);
        const w6 = document.createElement('option'); w6.value = 'ww_tiles'; w6.textContent = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('ww_tiles_opt') : '🀄 Tiles'; wwGroup.appendChild(w6);
        const w7 = document.createElement('option'); w7.value = 'ww_honeycomb'; w7.textContent = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('ww_honeycomb_opt') : '🐝 Honeycomb'; wwGroup.appendChild(w7);
        selector.appendChild(wwGroup);

        if (currentVal) selector.value = currentVal;
    },

    populatePageJumper() {
        const jumper = document.getElementById('page-jumper');
        if (!jumper) return;
        jumper.innerHTML = '';

        const indexOpt = document.createElement('option');
        indexOpt.value = '../index.html';
        indexOpt.textContent = (typeof i18n !== 'undefined' && i18n.t && i18n.t('index_title')) ? i18n.t('index_title') : '📑 الفهرس';
        jumper.appendChild(indexOpt);

        const group = document.createElement('optgroup');
        group.label = (typeof i18n !== 'undefined' && i18n.t && i18n.t('group_pages')) ? i18n.t('group_pages') : '📖 صفحات الكتاب';

        const match = window.location.pathname.match(/(\d+)\.html$/);
        const currentPageNum = match ? parseInt(match[1], 10) : 0;

        for (let i = 6; i <= 95; i++) {
            const opt = document.createElement('option');
            opt.value = `${i}.html`;
            opt.textContent = `ص ${i}`;
            if (i === currentPageNum) {
                opt.selected = true;
            }
            group.appendChild(opt);
        }
        jumper.appendChild(group);
    },

    updateDrillNavOption() {
        const selector = document.getElementById('example-navigator');
        if (!selector) return;
        let opt = document.getElementById('nav-opt-session-drill');
        const count = (this.mistakeIndices) ? this.mistakeIndices.length : 0;
        const isAr = (typeof i18n !== 'undefined' && i18n.getLocale() === 'ar');
        const label = isAr
            ? `🎯 عالج عثرات اليوم (${count})`
            : `🎯 Drill Today's Mistakes (${count})`;

        if (count > 0) {
            if (opt) {
                opt.textContent = label;
            } else {
                this.populateSelector();
            }
        } else {
            if (opt) {
                opt.remove();
            }
        }
    },

    shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    },

    // تعقيم وتطهير نصوص HTML ضد هجمات XSS وفق معيار القائمة البيضاء الصارمة (Strict Whitelist)
    setSafeHTML(el, htmlStr) {
        if (!el) return;
        const template = document.createElement('template');
        template.innerHTML = htmlStr || '';
        const content = template.content;

        const ALLOWED_TAGS = new Set(['SPAN', 'BDI', 'RUBY', 'RT', 'B', 'STRONG', 'EM', 'I', 'DIV']);
        const ALLOWED_ATTRS = new Set(['class', 'style', 'dir', 'lang', 'aria-hidden']);

        const allElements = Array.from(content.querySelectorAll('*'));
        for (const node of allElements) {
            if (!ALLOWED_TAGS.has(node.tagName.toUpperCase())) {
                node.replaceWith(...node.childNodes);
                continue;
            }
            for (let j = node.attributes.length - 1; j >= 0; j--) {
                const attr = node.attributes[j];
                const attrName = attr.name.toLowerCase();
                const val = attr.value.trim().toLowerCase();
                if (!ALLOWED_ATTRS.has(attrName) || val.startsWith('javascript:') || val.includes('data:') || val.includes('vbscript:')) {
                    node.removeAttribute(attr.name);
                }
            }
        }
        el.replaceChildren(content);
    },

    renderWordInto(container, item) {
        if (typeof WordRenderer === 'undefined') return;
        WordRenderer.renderInto(container, item);
    },

    getPlainWord(item) {
        return typeof WordRenderer !== 'undefined' ? WordRenderer.getPlainWord(item) : '';
    },

    render() {
        if (typeof dataset === 'undefined' || dataset.length === 0) return;
        const currentItemIdx = (this.order && this.order[this.idx] !== undefined) ? this.order[this.idx] : this.idx;
        const item = dataset[currentItemIdx];
        if (!item) return;

        const area = document.getElementById('word-display-area');
        const banner = document.getElementById('status-banner');
        const timerBox = document.getElementById('challenge-timer');
        const navSelect = document.getElementById('example-navigator');
        if (navSelect) navSelect.value = `word_${currentItemIdx}`;
        this.updateProgress(this.idx + 1, dataset.length, 'Card');
        if (area) {
            this.renderWordInto(area, item);
            const plain = this.getPlainWord(item);
            const cardLabel = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('card_label', null, { num: this.idx + 1, word: plain }) : `Card ${this.idx + 1}: ${plain}`;
            area.setAttribute('aria-label', cardLabel);
            area.tabIndex = -1;
            area.focus({ preventScroll: true });
        }
        if (banner) { banner.classList.add('hidden'); banner.classList.remove('pulse-danger'); }
        if (timerBox) timerBox.classList.add('hidden');
        if (this.timer) { clearInterval(this.timer); this.timer = null; }

        if (item.t === 'golden') {
            if (typeof Sound !== 'undefined' && typeof Sound.playChime === 'function') Sound.playChime();
            if (banner) {
                banner.innerText = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('fb_golden_word') : "🌟 Golden Word! (+10)";
                banner.className = "text-center py-1 px-4 rounded-full font-bold text-white shadow-md w-fit bg-amber-500 block animate-bounce uppercase tracking-wide text-xs shrink-0";
                banner.classList.remove('hidden');
            }
        } else if (item.t === 'danger') {
            if (typeof Sound !== 'undefined' && typeof Sound.danger === 'function') Sound.danger();
            if (banner) {
                banner.innerText = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('warning_danger_penalty') : "⚠️ High Focus! (-5)";
                banner.className = "text-center py-1 px-4 rounded-full font-bold text-white shadow-md w-fit bg-rose-600 block pulse-danger uppercase tracking-wide text-xs shrink-0";
                banner.classList.remove('hidden');
            }
        } else if (item.t === 'speed') {
            if (banner) {
                banner.innerText = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('speed_challenge_banner', '⚡ SPEED CHALLENGE!') : "⚡ SPEED CHALLENGE!";
                banner.className = "text-center py-1 px-4 rounded-full font-bold text-white shadow-md w-fit bg-blue-500 block uppercase tracking-wide text-xs shrink-0";
                banner.classList.remove('hidden');
            }
            if (timerBox) timerBox.classList.remove('hidden');
            this.startClock();
        }
    },

    updateScoreUI() {
        const scoreEl = document.getElementById('score-val');
        if (scoreEl) scoreEl.innerText = String(this.score);
        if (typeof nbStore !== 'undefined' && typeof nbStore.set === 'function') {
            nbStore.set('score', this.score, { silent: true });
        }
    },

    clearAdvanceTimer() {
        if (this.advanceTimer) {
            clearTimeout(this.advanceTimer);
            this.advanceTimer = null;
        }
        this._isAdvancing = false;
    },

    scheduleAdvance(callback, delay = 600) {
        const settings = (typeof settingsManager !== 'undefined') ? settingsManager.get() : {};
        if (settings.manualAdvance) return;

        this.clearAdvanceTimer();
        this._isAdvancing = true;
        this.advanceTimer = setTimeout(() => {
            this._isAdvancing = false;
            this.advanceTimer = null;
            if (typeof callback === 'function') {
                callback();
            } else {
                this.next();
            }
        }, delay);
    },

    recordMistake(origIndex) {
        return LessonSession.recordMistake.call(this, origIndex);
    },

    _evaluateDrillItem(drillItem, origIndex, item, isCorrect, isAr) {
        return RemediationSession.evaluateItem.call(this, drillItem, origIndex, item, isCorrect, isAr);
    },

    startClock() {
        return LessonSession.startClock.call(this);
    },

    updateProgress(current, total, prefix = 'Card') {
        return LessonSession.updateProgress.call(this, current, total, prefix);
    },

    evaluate(isCorrect) {
        return LessonSession.evaluate.call(this, isCorrect);
    },

    next() {
        return LessonSession.next.call(this);
    },

    startSessionDrill() {
        return RemediationSession.start.call(this);
    },

    renderSessionDrill() {
        return RemediationSession.render.call(this);
    },

    finishSessionDrill() {
        return RemediationSession.finish.call(this);
    },

    openEarlyExitModal() {
        const modal = document.getElementById('early-exit-modal');
        if (modal) {
            modal.classList.remove('hidden');
            const saveBtn = document.getElementById('btn-early-exit-save');
            if (saveBtn) saveBtn.focus();
        }
    },

    closeEarlyExitModal() {
        const modal = document.getElementById('early-exit-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    },

    confirmEarlyExit(action) {
        this.closeEarlyExitModal();
        this.isSessionDrill = false;

        if (action === 'cancel') {
            // استرجاع قائمة الأخطاء الأصلية دون تعديل
            if (this.initialSessionMistakes) {
                this.mistakeIndices = [...this.initialSessionMistakes];
            }
        }
        // في حالة 'save' يتم الاحتفاظ بما تم إنجازه وشطبه تلقائياً
        this.updateDrillNavOption();
        this.finishToSummary();
    },

    toggleGameBreaks(enabled) {
        this.enableGameBreaks = enabled;
        if (typeof settingsManager !== 'undefined') {
            settingsManager.save({ gameBreaksEnabled: enabled });
        }
    },

    prev() {
        return LessonSession.prev.call(this);
    },

    triggerFeedback(txt, color, playSound = false) {
        if (playSound) {
            if (typeof Sound !== 'undefined') Sound.playChime();
            if (typeof fireCelebration === 'function') fireCelebration();
        }
        const badge = document.getElementById('badge-ui'); if (!badge) return;
        badge.innerText = txt; badge.style.color = color; badge.style.borderColor = color; badge.classList.add('active'); badge.style.opacity = '1';
        if (this.feedbackTimer) clearTimeout(this.feedbackTimer);
        this.feedbackTimer = setTimeout(() => {
            badge.classList.remove('active');
            badge.style.opacity = '0';
            this.feedbackTimer = null;
        }, 1200);
    },

    setGameResumeState(btnId, isFinished, targetText = 'Continue Reading 📖', defaultText = 'Skip & Read ⏭️') {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        const defaultTextColors = {
            'xo-resume-btn': 'text-teal-900',
            'c4-resume-btn': 'text-blue-900',
            'memory-resume-btn': 'text-purple-900',
            'riddles-resume-btn': 'text-purple-900'
        };
        if (isFinished) {
            btn.textContent = targetText;
            btn.classList.add('animate-bounce', 'bg-emerald-400', 'text-white');
            btn.classList.remove('bg-yellow-400', 'text-teal-900', 'text-blue-900', 'text-purple-900');
        } else {
            btn.textContent = defaultText;
            btn.classList.remove('animate-bounce', 'bg-emerald-400', 'text-white');
            btn.classList.add('bg-yellow-400', defaultTextColors[btnId]);
        }
    },

    showGameTransition(gameNum) {
        this.pendingGame = gameNum;
        const stage = document.getElementById('game-transition-stage'); if (stage) stage.classList.remove('hidden');
        let gameName = "";
        if (gameNum === 1) {
            gameName = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('game_xo') : "Tic-Tac-Toe";
        } else if (gameNum === 2) {
            gameName = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('game_c4') : "Connect 4";
        } else if (gameNum === 3) {
            const isRiddles = (typeof PAGE_CONFIG !== 'undefined' && PAGE_CONFIG.game3 === 'riddles');
            if (isRiddles) {
                gameName = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('game_riddles') : "Riddles";
            } else {
                gameName = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('game_memory') : "Memory Match";
            }
        }
        const titleEl = document.getElementById('transition-game-name'); if (titleEl) titleEl.innerText = gameName;
    },

    enterGame() {
        if (this.pendingGame === 1) this.jumpTo('game_xo');
        else if (this.pendingGame === 2) this.jumpTo('game_c4');
        else if (this.pendingGame === 3) {
            const isRiddles = (typeof PAGE_CONFIG !== 'undefined' && PAGE_CONFIG.game3 === 'riddles');
            this.jumpTo(isRiddles ? 'game_riddles' : 'game_memory');
        }
    },

    resume(gameNum) {
        if (gameNum === 1) this.hasPlayedGame1 = true;
        if (gameNum === 2) this.hasPlayedGame2 = true;
        if (gameNum === 3) {
            this.hasPlayedGame3 = true;
            if (typeof dataset !== 'undefined' && this.idx < dataset.length - 1) {
                this.idx++;
                const wordIdx = (this.order && this.order[this.idx] !== undefined) ? this.order[this.idx] : this.idx;
                this.jumpTo(`word_${wordIdx}`);
            } else {
                this.playWordwall();
            }
            return;
        }
        if (typeof dataset !== 'undefined' && this.idx < dataset.length - 1) {
            this.idx++;
            const wordIdx = (this.order && this.order[this.idx] !== undefined) ? this.order[this.idx] : this.idx;
            this.jumpTo(`word_${wordIdx}`);
        }
        else { this.playWordwall(); }
    },

    playWordwall() { this.jumpTo('ww_box'); },

    revealWord(index, triggerType) {
        if (typeof dataset === 'undefined' || !dataset[index]) return;
        this.currentActiveIndex = index;
        const item = dataset[index];
        const infoEl = document.getElementById('revealed-info'); if (infoEl) infoEl.innerText = `${item.info || (typeof i18n !== 'undefined' && i18n.t ? i18n.t('question_card_badge') : 'Card')} • #${index + 1}`;
        const giantSpan = document.getElementById('giant-arabic-word');
        if (giantSpan) {
            this.renderWordInto(giantSpan, item);
        }
        const overlay = document.getElementById('word-overlay');
        if (overlay) {
            overlay.classList.remove('hidden');
            const closeBtn = overlay.querySelector('button');
            if (closeBtn) closeBtn.focus();
        }
        if ((triggerType === 'box' || triggerType === 'curtain') && typeof wordwallRoom !== 'undefined') {
            const boxEl = document.getElementById(`box-${index}`); if (boxEl) boxEl.classList.add('opened');
            wordwallRoom.openedBoxes.add(index);
        }
    },

    closeOverlay() { const overlay = document.getElementById('word-overlay'); if (overlay) overlay.classList.add('hidden'); },

    gradeResult(isCorrect) {
        if (typeof PAGE_CONFIG !== 'undefined' && PAGE_CONFIG.pageNumber === 'remediation') {
            const currentWord = (typeof dataset !== 'undefined' && this.currentActiveIndex !== null && dataset[this.currentActiveIndex]) ? dataset[this.currentActiveIndex] : null;
            if (currentWord && typeof studentManager !== 'undefined') {
                const res = studentManager.recordRemediationAttempt(studentManager.getActiveStudentId(), currentWord, isCorrect);
                if (isCorrect) {
                    this.score += res.mastered ? 5 : 2;
                    this.stats.ok++;
                    const feedback = res.mastered ? ((typeof i18n !== 'undefined' && i18n.t) ? i18n.t('fb_mastered') : 'أتقنت الكلمة! 🌟') : ((typeof i18n !== 'undefined' && i18n.t) ? i18n.t('fb_well_done') : 'أحسنت! ⭐');
                    this.triggerFeedback(feedback, '#10b981', true);
                } else {
                    this.stats.err++;
                    this.triggerFeedback((typeof i18n !== 'undefined' && i18n.t) ? i18n.t('fb_needs_practice') : 'تحتاج تدريباً إضافياً ⭐', '#f43f5e', false);
                }
                if (typeof honeycombGame !== 'undefined' && this.currentActiveIndex !== null) {
                    honeycombGame.markStatus(this.currentActiveIndex, isCorrect);
                }
                this.updateScoreUI();
                this.closeOverlay();
                return;
            }
        }

        if (isCorrect) {
            this.score += 5;
            this.stats.ok++;
            this.triggerFeedback((typeof i18n !== 'undefined' && i18n.t) ? i18n.t('fb_magnificent') : 'Magnificent! ❤️⭐', '#10b981', true);
        } else {
            this.stats.err++;
            this.recordMistake(this.currentActiveIndex);
            this.triggerFeedback((typeof i18n !== 'undefined' && i18n.t) ? i18n.t('fb_keep_trying') : 'Keep Trying! ⭐', '#f43f5e', false);
        }

        // تحديث حالة خلية النحل والصناديق إذا كانت الألعاب نشطة
        if (typeof honeycombGame !== 'undefined' && this.currentActiveIndex !== null) {
            honeycombGame.markStatus(this.currentActiveIndex, isCorrect);
        }
        if (typeof wordwallRoom !== 'undefined' && this.currentActiveIndex !== null && typeof wordwallRoom.markBoxStatus === 'function') {
            wordwallRoom.markBoxStatus(this.currentActiveIndex, isCorrect);
        }

        // التسجيل الذري اللحظي للطالب النشط
        if (typeof studentManager !== 'undefined' && studentManager.hasActiveStudent()) {
            const lessonId = this.getLessonId();
            const currentWord = (typeof dataset !== 'undefined' && this.currentActiveIndex !== null && dataset[this.currentActiveIndex]) ? dataset[this.currentActiveIndex] : null;
            studentManager.recordCardEvaluation({
                lessonId,
                isCorrect,
                pointsAwarded: isCorrect ? 5 : 0,
                wordData: currentWord,
                cardIndex: this.currentActiveIndex,
                totalCards: dataset ? dataset.length : 0
            });
        }

        this.updateScoreUI();
        this.closeOverlay();
    },

    finishToSummary() {
        return LessonSummary.finish.call(this);
    },

    getLessonId() {
        if (typeof window !== 'undefined') {
            if (window.PAGE_CONFIG) {
                if (window.PAGE_CONFIG.lessonId) return String(window.PAGE_CONFIG.lessonId);
                if (window.PAGE_CONFIG.id) return String(window.PAGE_CONFIG.id);
                if (window.PAGE_CONFIG.pageNumber !== undefined && window.PAGE_CONFIG.pageNumber !== null) return String(window.PAGE_CONFIG.pageNumber);
                if (window.PAGE_CONFIG.page !== undefined && window.PAGE_CONFIG.page !== null) return String(window.PAGE_CONFIG.page);
                const text = `${window.PAGE_CONFIG.subtitle || ''} ${window.PAGE_CONFIG.title || ''} ${window.PAGE_CONFIG.footer || ''}`;
                const m = text.match(/(?:Page|صفحة|درس|الدرس)\s*(\d+)/i);
                if (m) return m[1];
            }
            if (window.location && window.location.pathname) {
                if (/remediation\.html/i.test(window.location.pathname)) return 'remediation';
                const pathMatch = window.location.pathname.match(/(\d+)\.html/i);
                if (pathMatch) return pathMatch[1];
            }
        }
        return '1';
    },

    // معالجة حدث تبديل الطالب
    onStudentChanged(student) {
        if (typeof updateActiveStudentPill === 'function') {
            updateActiveStudentPill();
        }
    },

    drawChart() {
        return LessonSummary.drawChart.call(this);
    },

    destroy() {
        this.hideAll();
        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }
    }
};

// تصدير كائن التطبيق العام
if (typeof window !== 'undefined') {
    window.app = app;
    if (window.NurAlBayan) {
        window.NurAlBayan.app = app;
    }
}

// الاستماع لحدث تبديل الطالب لتحديث واجهة الدرس تلقائياً بدون تكرار
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener(NBContracts.EVENTS.STUDENT_CHANGED, (e) => {
        if (typeof app !== 'undefined' && typeof app.onStudentChanged === 'function') {
            app.onStudentChanged(e && e.detail ? e.detail : null);
        }
    });
}

// تشغيل التطبيق تلقائياً عند جاهزية DOM
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (typeof app !== 'undefined') {
                app.init();
            }
        });
    } else {
        if (typeof app !== 'undefined') {
            app.init();
        }
    }
}
