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
                const saved = localStorage.getItem('nb_teacher_settings') || localStorage.getItem('nour_enable_game_breaks');
                if (saved !== null) this.enableGameBreaks = (saved === '1' || JSON.parse(saved).gameBreaksEnabled);
            } catch(e) {}
        }
        const toggleEl = document.getElementById('toggle-game-breaks');
        if (toggleEl) toggleEl.checked = this.enableGameBreaks;

        this.populateSelector();
        this.jumpTo('menu');
        if (typeof xoGame !== 'undefined') xoGame.init();
        if (typeof c4Game !== 'undefined') c4Game.init();
        if (typeof memoryGame !== 'undefined' && document.getElementById('memory-stage')) memoryGame.init();
        if (typeof riddlesGame !== 'undefined' && document.getElementById('riddles-stage')) riddlesGame.init();
        if (typeof wordwallRoom !== 'undefined') wordwallRoom.init();
        if (typeof ruleManager !== 'undefined' && typeof rulesData !== 'undefined' && rulesData.length > 0) ruleManager.init();

        if (!this._localeBound) {
            this._localeBound = true;
            window.addEventListener('nb:locale-changed', () => {
                this.populateSelector();
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
        if (!container || !item) return;
        container.innerHTML = '';
        const currentTheme = item.theme || 'pink';

        const plain = this.getPlainWord(item);
        const words = plain ? plain.split(/\s+/).filter(Boolean) : [];
        const charCount = plain ? plain.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '').length : 0;
        let lengthClass = '';
        if (charCount > 16 || words.length >= 4) {
            lengthClass = 'text-xlong';
        } else if (charCount > 10 || words.length === 3) {
            lengthClass = 'text-long';
        } else if (charCount > 5 || words.length === 2) {
            lengthClass = 'text-medium';
        }

        if (item.segs && Array.isArray(item.segs)) {
            const colorClasses = ['c-red', 'c-blue', 'c-black'];
            const wrap = document.createElement('div');
            wrap.className = 'segmented-container';
            item.segs.forEach((ch, i) => {
                const sb = document.createElement('div');
                sb.className = `seg-box theme-${currentTheme} quran-font ${colorClasses[i % 3]}`;
                sb.innerText = ch;
                wrap.appendChild(sb);
            });
            container.appendChild(wrap);
        } else if (item.boxes && Array.isArray(item.boxes)) {
            const wrap = document.createElement('div');
            wrap.className = 'segmented-container';
            item.boxes.forEach(segments => {
                const sb = document.createElement('div');
                sb.className = `seg-box theme-${currentTheme} quran-font`;
                sb.style.direction = 'rtl';
                const inner = segments.map(([t, c]) => `<span class="color-${c}">${t}</span>`).join('');
                this.setSafeHTML(sb, `<bdi style="white-space:nowrap">${inner}</bdi>`);
                wrap.appendChild(sb);
            });
            container.appendChild(wrap);
        } else if (item.multiBox && Array.isArray(item.w)) {
            const wrap = document.createElement('div');
            wrap.className = 'segmented-container';
            item.w.forEach((char, i) => {
                const sb = document.createElement('div');
                sb.className = `seg-box theme-${currentTheme} quran-font color-${i % 3}`;
                sb.innerText = char;
                wrap.appendChild(sb);
            });
            container.appendChild(wrap);
        } else if (item.groups && Array.isArray(item.groups)) {
            const box = document.createElement('div');
            box.className = `letter-box quran-font theme-${currentTheme} ${lengthClass}`.trim();
            box.style.direction = 'rtl';
            this.setSafeHTML(box, item.groups.map(g => `<span class="${g[1]}" style="margin:0 .25em">${g[0]}</span>`).join(''));
            container.appendChild(box);
        } else if (item.html) {
            const box = document.createElement('div');
            box.className = `letter-box quran-font theme-${currentTheme} ${lengthClass}`.trim();
            box.style.direction = 'rtl';
            this.setSafeHTML(box, item.html);
            container.appendChild(box);
        } else if (Array.isArray(item.w)) {
            const box = document.createElement('div');
            box.className = `letter-box quran-font theme-${currentTheme} ${lengthClass}`.trim();
            box.style.direction = 'rtl';
            const inner = item.w.map((seg, i) => `<span class="color-${i % 3}">${seg}</span>`).join('');
            this.setSafeHTML(box, `<bdi style="white-space:nowrap">${inner}</bdi>`);
            container.appendChild(box);
        } else {
            const box = document.createElement('div');
            box.className = `letter-box theme-${currentTheme} ${lengthClass}`.trim();
            this.setSafeHTML(box, `<span class="word-wrapper quran-font text-center">${item.w}</span>`);
            container.appendChild(box);
        }
    },

    getPlainWord(item) {
        if (!item) return '';
        if (item.plain) return item.plain;
        if (item.html) return item.html.replace(/<[^>]+>/g, '').replace(/&zwj;/g, '').replace(/&nbsp;/g, ' ').trim();
        if (Array.isArray(item.w)) return item.w.join('').replace(/<[^>]+>/g, '').replace(/&zwj;/g, '').replace(/&nbsp;/g, ' ').replace(/ـ/g, '').trim();
        if (typeof item.w === 'string') return item.w.replace(/<[^>]+>/g, '').replace(/&zwj;/g, '').replace(/&nbsp;/g, ' ').trim();
        if (item.boxes) return item.boxes.map(b => b.map(s => s[0]).join('')).join(' ').trim();
        if (item.groups) return item.groups.map(g => g[0]).join('').trim();
        return '';
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
        if (origIndex === null || origIndex === undefined) return;
        if (!this.mistakeIndices.includes(origIndex)) {
            this.mistakeIndices.push(origIndex);
        }
        if (!this.sessionMistakesHistory) this.sessionMistakesHistory = [];
        if (!this.sessionMistakesHistory.includes(origIndex)) {
            this.sessionMistakesHistory.push(origIndex);
        }
        this.updateDrillNavOption();
    },

    _evaluateDrillItem(drillItem, origIndex, item, isCorrect, isAr) {
        const drillMode = (typeof settingsManager !== 'undefined' && settingsManager.get().remediationDrillMode)
            ? settingsManager.get().remediationDrillMode
            : 'loop';
        let shouldAdvance = true;

        if (isCorrect) {
            this.stats.ok++;
            this.score += 2;

            if (drillMode === 'instant_repeat' && drillItem._hasFailed) {
                drillItem._inPlaceSuccessCount = (drillItem._inPlaceSuccessCount || 0) + 1;
                if (drillItem._inPlaceSuccessCount < 3) {
                    const stepMsg = (typeof i18n !== 'undefined' && i18n.t)
                        ? i18n.t('drill_step_success', `أحسنت! (${drillItem._inPlaceSuccessCount}/3) ⭐`, { current: drillItem._inPlaceSuccessCount, total: 3 })
                        : (isAr ? `أحسنت! (${drillItem._inPlaceSuccessCount}/3) ⭐` : `Well done! (${drillItem._inPlaceSuccessCount}/3) ⭐`);
                    this.triggerFeedback(stepMsg, '#10b981', true);
                    shouldAdvance = false;
                } else {
                    const masteredMsg = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('fb_mastered') : 'أتقنت الكلمة! 🌟';
                    this.triggerFeedback(masteredMsg, '#10b981', true);
                    this.mistakeIndices = this.mistakeIndices.filter(idx => idx !== origIndex);
                }
            } else {
                const masteredMsg = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('fb_mastered') : 'أتقنت الكلمة! 🌟';
                this.triggerFeedback(masteredMsg, '#10b981', true);
            }

            // شطب الكلمة ذرياً من بنك الأخطاء وتحديث الدقة والنجوم في studentManager
            if (typeof studentManager !== 'undefined') {
                const studentId = studentManager.getActiveStudentId ? studentManager.getActiveStudentId() : null;
                if (item) studentManager.recordRemediationAttempt(studentId, item, true);
                if (studentManager.hasActiveStudent && studentManager.hasActiveStudent()) {
                    const lessonId = this.getLessonId();
                    const total = this.stats.ok + this.stats.err;
                    const accuracy = total > 0 ? Math.round((this.stats.ok / total) * 100) : 100;
                    const stars = accuracy >= 90 ? 3 : (accuracy >= 70 ? 2 : 1);
                    studentManager.recordLessonCompletion(lessonId, this.score, accuracy, stars);
                }
            }
        } else {
            this.stats.err++;
            const feedbackText = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('fb_needs_practice') : 'تحتاج تدريباً إضافياً ⭐';
            this.triggerFeedback(feedbackText, '#f43f5e', false);
            if (typeof Sound !== 'undefined' && typeof Sound.fail === 'function') Sound.fail();

            if (drillMode === 'loop') {
                this.sessionDrillQueue.push({ index: origIndex, _inPlaceSuccessCount: 0, _hasFailed: true });
                shouldAdvance = true;
            } else if (drillMode === 'instant_repeat') {
                drillItem._hasFailed = true;
                drillItem._inPlaceSuccessCount = 0;
                shouldAdvance = false;
            } else if (drillMode === 'single_pass') {
                shouldAdvance = true;
            }

            if (typeof studentManager !== 'undefined' && item) {
                const studentId = studentManager.getActiveStudentId ? studentManager.getActiveStudentId() : null;
                studentManager.recordRemediationAttempt(studentId, item, false);
            }
        }

        this.updateScoreUI();
        this.updateDrillNavOption();

        if (shouldAdvance) {
            this.sessionDrillIdx++;
        }
        this.scheduleAdvance(() => this.renderSessionDrill());
    },

    startClock() {
        let dur = 10.0;
        if (typeof settingsManager !== 'undefined') {
            const s = settingsManager.get();
            if (s.timerDuration) dur = parseFloat(s.timerDuration);
        }
        this.clock = dur;
        const el = document.getElementById('timer-val');
        if (el) el.innerText = this.clock.toFixed(1);
        if (this.timer) clearInterval(this.timer);
        this.timer = setInterval(() => {
            this.clock = Math.max(0, this.clock - 0.1);
            if (this.clock <= 0) { clearInterval(this.timer); this.timer = null; }
            if (el) el.innerText = this.clock.toFixed(1);
        }, 100);
    },

    updateProgress(current, total, prefix = 'Card') {
        const progText = document.getElementById('progress-text');
        const pBar = document.getElementById('progress-bar');
        if (progText) {
            const isAr = (typeof i18n !== 'undefined' && i18n.getLocale() === 'ar');
            if (typeof i18n !== 'undefined' && i18n.t) {
                progText.innerText = i18n.t('progress_step_indicator', `${prefix} ${current} ${isAr ? 'من' : 'of'} ${total}`, { prefix, current, total });
            } else {
                progText.innerText = `${prefix} ${current} ${isAr ? 'من' : 'of'} ${total}`;
            }
        }
        if (pBar && total > 0) {
            const pct = Math.round((current / total) * 100);
            pBar.style.setProperty('--progress', (current / total));
            pBar.setAttribute('aria-valuenow', pct);
        }
    },

    evaluate(isCorrect) {
        if (this._isAdvancing) return; // حماية ضد السباق وتعدد الضغطات

        // مسار طور المعالجة الفورية لعثرات الجلسة (Session Remediation Drill)
        if (this.isSessionDrill) {
            if (!this.sessionDrillQueue || this.sessionDrillIdx >= this.sessionDrillQueue.length) return;
            const drillItem = this.sessionDrillQueue[this.sessionDrillIdx];
            const origIndex = (typeof drillItem === 'object' && drillItem !== null) ? drillItem.index : drillItem;
            const currentWord = (typeof dataset !== 'undefined' && dataset[origIndex]) ? dataset[origIndex] : null;
            const isAr = (typeof i18n !== 'undefined' && i18n.getLocale() === 'ar');
            this._evaluateDrillItem(drillItem, origIndex, currentWord, isCorrect, isAr);
            return;
        }

        // مسار تقييم صفحة المعالجة المخصصة حصراً لمنع تكرار النقاط ومضاعفة مدخلات البنك
        if (typeof PAGE_CONFIG !== 'undefined' && PAGE_CONFIG.pageNumber === 'remediation') {
            const currentItemIdx = (this.order && this.order[this.idx] !== undefined) ? this.order[this.idx] : this.idx;
            const currentWord = (typeof dataset !== 'undefined' && dataset[currentItemIdx]) ? dataset[currentItemIdx] : null;
            if (currentWord && typeof studentManager !== 'undefined') {
                const res = studentManager.recordRemediationAttempt(studentManager.getActiveStudentId(), currentWord, isCorrect);
                if (isCorrect) {
                    this.stats.ok++;
                    this.score += res.mastered ? 5 : 2;
                    const feedback = res.mastered ? ((typeof i18n !== 'undefined' && i18n.t) ? i18n.t('fb_mastered') : 'أتقنت الكلمة! 🌟') : ((typeof i18n !== 'undefined' && i18n.t) ? i18n.t('fb_well_done') : 'أحسنت! ⭐');
                    this.triggerFeedback(feedback, '#10b981', true);
                } else {
                    this.stats.err++;
                    this.triggerFeedback((typeof i18n !== 'undefined' && i18n.t) ? i18n.t('fb_needs_practice') : 'تحتاج تدريباً إضافياً ⭐', '#f43f5e', false);
                    if (typeof Sound !== 'undefined' && typeof Sound.fail === 'function') Sound.fail();
                }
            } else if (isCorrect) {
                this.stats.ok++;
                this.score += 2;
                this.triggerFeedback((typeof i18n !== 'undefined' && i18n.t) ? i18n.t('fb_well_done') : 'أحسنت! ⭐', '#10b981', true);
            } else {
                this.stats.err++;
                this.triggerFeedback((typeof i18n !== 'undefined' && i18n.t) ? i18n.t('fb_needs_practice') : 'تحتاج تدريباً إضافياً ⭐', '#f43f5e', false);
                if (typeof Sound !== 'undefined' && typeof Sound.fail === 'function') Sound.fail();
            }
            this.updateScoreUI();
            this.scheduleAdvance();
            return;
        }

        if (typeof dataset === 'undefined' || dataset.length === 0) return;
        const currentItemIdx = (this.order && this.order[this.idx] !== undefined) ? this.order[this.idx] : this.idx;
        const item = dataset[currentItemIdx];
        if (!item) return;

        const settings = (typeof settingsManager !== 'undefined') ? settingsManager.get() : {};
        const points = isCorrect ? ((item.t === 'golden') ? 10 : (item.t === 'speed' && this.clock > 0) ? 5 : 2) : 0;

        // التسجيل اللحظي فورياً للطالب النشط بالنقاط الفعلية
        if (typeof studentManager !== 'undefined' && studentManager.hasActiveStudent()) {
            const lessonId = this.getLessonId();
            studentManager.recordCardEvaluation(lessonId, isCorrect, points, item, this.idx, dataset.length);
        }

        if (isCorrect) {
            this.stats.ok++;
            this.score += points;
            const perfWord = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('txt_perfect') : 'Perfect';
            const excWord = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('txt_excellent') : 'Excellent';
            const wellDone = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('fb_well_done') : 'Well done! ⭐';
            const magnif = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('fb_magnificent') : 'Magnificent! ❤️⭐';
            const feedbacks = [`${excWord}! 🌟`, `${perfWord}! 🏆`, wellDone, magnif, '⭐⭐⭐⭐⭐', '❤️❤️❤️❤️❤️'];
            const randomFeedback = feedbacks[Math.floor(Math.random() * feedbacks.length)];
            this.triggerFeedback(randomFeedback, '#10b981', true);
        } else {
            this.stats.err++;
            this.recordMistake(currentItemIdx);
            const penalty = settings.noPenaltyMode ? 0 : ((item.t === 'danger') ? 5 : 2);
            this.score = Math.max(0, this.score - penalty);
            const feedbackText = settings.noPenaltyMode
                ? ((item.t === 'danger') ? ((typeof i18n !== 'undefined' && i18n.t) ? i18n.t('warning_danger_penalty') : 'High Focus! ⚠️') : ((typeof i18n !== 'undefined' && i18n.t) ? i18n.t('fb_needs_practice') : 'Needs Practice ⭐'))
                : ((item.t === 'danger') ? ((typeof i18n !== 'undefined' && i18n.t) ? i18n.t('warning_danger_penalty') : '-5 Warning! ⚠️') : ((typeof i18n !== 'undefined' && i18n.t) ? i18n.t('fb_needs_practice') : '-2 Needs Practice'));
            this.triggerFeedback(feedbackText, '#f43f5e', false);
            if (typeof Sound !== 'undefined' && typeof Sound.fail === 'function') Sound.fail();
        }

        this.updateScoreUI();
        this.scheduleAdvance();
    },

    next() {
        this.clearAdvanceTimer();
        this.updateScoreUI();

        if (this.isSessionDrill) {
            this.renderSessionDrill();
            return;
        }

        if (typeof dataset === 'undefined' || dataset.length === 0) return;
        if (this.idx < dataset.length - 1) {
            const third1 = Math.floor(dataset.length / 3) - 1;
            const third2 = Math.floor((dataset.length * 2) / 3) - 1;
            if (this.enableGameBreaks && this.idx === third1 && !this.hasPlayedGame1 && dataset.length >= 3) {
                this.jumpTo('transition_1');
            } else if (this.enableGameBreaks && this.idx === third2 && !this.hasPlayedGame2 && dataset.length >= 3) {
                this.jumpTo('transition_2');
            } else {
                this.idx++;
                this.render();
            }
        } else {
            if (this.enableGameBreaks && !this.hasPlayedGame3 && dataset.length >= 3) {
                this.jumpTo('transition_3');
            } else {
                this.playWordwall();
            }
        }
    },

    startSessionDrill() {
        const hasMistakes = (this.mistakeIndices && this.mistakeIndices.length > 0);
        const hasHistory = (this.sessionMistakesHistory && this.sessionMistakesHistory.length > 0);

        if (!hasMistakes && !hasHistory) {
            const isAr = (typeof i18n !== 'undefined' && i18n.getLocale() === 'ar');
            const noMistakesMsg = (typeof i18n !== 'undefined' && i18n.t)
                ? i18n.t('no_session_mistakes_toast', isAr ? 'ما شاء الله! لا توجد عثرات لمعالجتها في هذه الجلسة! 🌟' : 'Excellent! No mistakes to drill in this session! 🌟')
                : (isAr ? 'ما شاء الله! لا توجد عثرات لمعالجتها في هذه الجلسة! 🌟' : 'Excellent! No mistakes to drill in this session! 🌟');
            this.triggerFeedback(noMistakesMsg, '#10b981', true);
            this.jumpTo('menu');
            return;
        }

        if (!hasMistakes && hasHistory) {
            this.mistakeIndices = [...this.sessionMistakesHistory];
        }

        if (typeof dataset === 'undefined' || dataset.length === 0) return;

        this.isSessionDrill = true;

        // حفظ نسخة أصلية من عثرات الجلسة لتمكين التراجع عند الإلغاء
        this.initialSessionMistakes = [...this.mistakeIndices];

        // تهيئة طابور المعالجة الفورية وخلط الكلمات عشوائياً
        this.sessionDrillQueue = this.mistakeIndices.map(idx => ({
            index: idx,
            _inPlaceSuccessCount: 0,
            _hasFailed: false
        }));
        this.shuffle(this.sessionDrillQueue);
        this.sessionDrillIdx = 0;

        // إيقاف وإخفاء مؤقت السرعة تماماً أثناء طور المعالجة
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        const timerPill = document.getElementById('timer-pill') || document.getElementById('challenge-timer');
        if (timerPill) timerPill.classList.add('hidden');

        this.hideAll();
        const topNav = document.getElementById('top-nav');
        if (topNav) topNav.classList.remove('hidden');
        const stage = document.getElementById('learning-stage');
        if (stage) stage.classList.remove('hidden');

        // إبقاء شريط تحفيز المعلم مفعلاً وظاهراً
        const praiseBar = document.getElementById('teacher-praise-bar');
        if (praiseBar) praiseBar.classList.remove('hidden');

        this.renderSessionDrill();
    },

    renderSessionDrill() {
        if (!this.sessionDrillQueue || this.sessionDrillIdx >= this.sessionDrillQueue.length) {
            this.finishSessionDrill();
            return;
        }

        const drillItem = this.sessionDrillQueue[this.sessionDrillIdx];
        const origIndex = (typeof drillItem === 'object' && drillItem !== null) ? drillItem.index : drillItem;
        const item = dataset[origIndex];
        if (!item) {
            this.sessionDrillIdx++;
            this.renderSessionDrill();
            return;
        }

        const area = document.getElementById('word-display-area');
        this.hideAll();
        const topNav = document.getElementById('top-nav');
        if (topNav) topNav.classList.remove('hidden');
        const stage = document.getElementById('learning-stage');
        if (stage) stage.classList.remove('hidden');

        const isAr = (typeof i18n !== 'undefined' && i18n.getLocale() === 'ar');
        const progressLabel = (typeof i18n !== 'undefined' && i18n.t)
            ? i18n.t('session_drill_title', isAr ? 'معالجة العثرات' : 'Remediation Drill')
            : (isAr ? 'معالجة العثرات' : 'Remediation Drill');
        this.updateProgress(this.sessionDrillIdx + 1, this.sessionDrillQueue.length, progressLabel);

        // إظهار شريط المعالجة الفورية وتحديث العدادات
        const drillBanner = document.getElementById('session-drill-banner');
        if (drillBanner) {
            drillBanner.classList.remove('hidden');
            const drillCur = document.getElementById('drill-cur');
            const drillTotal = document.getElementById('drill-total');
            if (drillCur) drillCur.textContent = String(this.sessionDrillIdx + 1);
            if (drillTotal) drillTotal.textContent = String(this.sessionDrillQueue.length);
        }

        // إخفاء مؤقت التحدي أثناء المعالجة
        const timerPill = document.getElementById('timer-pill') || document.getElementById('challenge-timer');
        if (timerPill) timerPill.classList.add('hidden');

        // إبقاء شريط تحفيز المعلم مفعلاً وظاهراً
        const praiseBar = document.getElementById('teacher-praise-bar');
        if (praiseBar) praiseBar.classList.remove('hidden');

        if (area) {
            this.renderWordInto(area, item);
            const plain = this.getPlainWord(item);
            const stepOf = (typeof i18n !== 'undefined' && i18n.t)
                ? i18n.t('progress_step_indicator', `${progressLabel} ${this.sessionDrillIdx + 1} ${isAr ? 'من' : 'of'} ${this.sessionDrillQueue.length}`, { prefix: progressLabel, current: this.sessionDrillIdx + 1, total: this.sessionDrillQueue.length })
                : `${progressLabel} ${this.sessionDrillIdx + 1} ${isAr ? 'من' : 'of'} ${this.sessionDrillQueue.length}`;
            area.setAttribute('aria-label', `${stepOf}: ${plain}`);
            area.tabIndex = -1;
            area.focus({ preventScroll: true });
        }
    },

    finishSessionDrill() {
        this.isSessionDrill = false;
        if (typeof fireCelebration === 'function') fireCelebration();
        if (typeof Sound !== 'undefined' && typeof Sound.playChime === 'function') Sound.playChime();

        const isAr = (typeof i18n !== 'undefined' && i18n.getLocale() === 'ar');
        const congratsMsg = (typeof i18n !== 'undefined' && i18n.t)
            ? i18n.t('session_drill_completed', isAr ? 'رائع جداً! تم إتقان جميع عثرات الجلسة بنجاح! 🏆' : 'Great Job! All session mistakes mastered! 🏆')
            : (isAr ? 'رائع جداً! تم إتقان جميع عثرات الجلسة بنجاح! 🏆' : 'Great Job! All session mistakes mastered! 🏆');
        this.triggerFeedback(congratsMsg, '#10b981', true);
        this.updateDrillNavOption();

        // انتقال تلقائي بعد ثانيتين إلى ساحة الألعاب Wordwall مع ربطه بمؤقت قابل للإبطال
        if (this.drillTransitionTimer) {
            clearTimeout(this.drillTransitionTimer);
            this.drillTransitionTimer = null;
        }
        this.drillTransitionTimer = setTimeout(() => {
            this.drillTransitionTimer = null;
            if (!this.isSessionDrill) {
                this.playWordwall();
            }
        }, 2000);
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
        this.clearAdvanceTimer();
        this.updateScoreUI();
        if (this.isSessionDrill) {
            if (this.sessionDrillIdx > 0) {
                this.sessionDrillIdx--;
                this.renderSessionDrill();
            }
            return;
        }
        if (this.idx > 0) {
            this.idx--;
            this.render();
        }
    },

    triggerFeedback(txt, color, playSound = false) {
        if (playSound) {
            if (typeof Sound !== 'undefined') Sound.playChime();
            if (typeof confetti === 'function') confetti({ particleCount: 40, spread: 50, origin: { y: 0.2 } });
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
            studentManager.recordCardEvaluation(lessonId, isCorrect, isCorrect ? 5 : 0, currentWord, this.currentActiveIndex, dataset ? dataset.length : 0);
        }

        this.updateScoreUI();
        this.closeOverlay();
    },

    finishToSummary() {
        this.hideAll();
        const summary = document.getElementById('summary-screen'); if (summary) summary.classList.remove('hidden');
        const finalScore = document.getElementById('final-score'); if (finalScore) finalScore.innerText = this.score;
        const reviewBtn = document.getElementById('btn-review-mistakes');
        if (reviewBtn) {
            const hasMistakes = (this.mistakeIndices && this.mistakeIndices.length > 0);
            const hasHistory = (this.sessionMistakesHistory && this.sessionMistakesHistory.length > 0);
            const isAr = (typeof i18n !== 'undefined' && i18n.getLocale() === 'ar');
            if (hasMistakes || hasHistory) {
                reviewBtn.classList.remove('hidden');
                reviewBtn.onclick = () => {
                    if (this.mistakeIndices.length === 0 && this.sessionMistakesHistory.length > 0) {
                        this.mistakeIndices = [...this.sessionMistakesHistory];
                    }
                    this.startSessionDrill();
                };
                const btnText = (typeof i18n !== 'undefined' && i18n.t)
                    ? i18n.t('btn_repeat_drill', isAr ? '🔄 إعادة مراجعة عثرات اليوم' : '🔄 Review Today\'s Mistakes')
                    : (isAr ? '🔄 إعادة مراجعة عثرات اليوم' : '🔄 Review Today\'s Mistakes');
                reviewBtn.innerHTML = `<span>${btnText}</span> <span aria-hidden="true">🎯</span>`;
            } else {
                reviewBtn.classList.add('hidden');
            }
        }

        // استدعاء إتمام الدرس وحفظ النتائج للطالب النشط
        if (typeof studentManager !== 'undefined' && studentManager.hasActiveStudent()) {
            const lessonId = this.getLessonId();
            const total = this.stats.ok + this.stats.err;
            const accuracy = total > 0 ? Math.round((this.stats.ok / total) * 100) : 0;
            const stars = accuracy >= 90 ? 3 : (accuracy >= 70 ? 2 : 1);
            studentManager.recordLessonCompletion(lessonId, this.score, accuracy, stars);
        }

        this.drawChart();
    },

    // استخلاص معرف أو رقم الدرس من PAGE_CONFIG أو مسار الصفحة
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
        if (typeof Chart === 'undefined') return;
        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }
        const canvas = document.getElementById('summaryChart'); if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const isAr = (typeof i18n !== 'undefined' && i18n.getLocale() === 'ar');
        const labelCorrect = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('btn_correct', isAr ? 'صحيح' : 'Correct') : (isAr ? 'صحيح' : 'Correct');
        const labelIncorrect = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('btn_incorrect', isAr ? 'خطأ' : 'Incorrect') : (isAr ? 'خطأ' : 'Incorrect');
        this.chartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: { labels: [labelCorrect, labelIncorrect], datasets: [{ data: [this.stats.ok, this.stats.err], backgroundColor: ['#10b981', '#f43f5e'], borderWidth: 0, hoverOffset: 6 }] },
            options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { family: 'Fredoka', weight: 'bold' } } } } }
        });
    },

    // تابع تنظيف شامل للمؤقتات والألعاب والرسم البياني
    destroy() {
        this.hideAll();
        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }
    }
};

// الاستماع لحدث تبديل الطالب لتحديث واجهة الدرس تلقائياً بدون تكرار
if (typeof window !== 'undefined') {
    window.addEventListener('nb:student-changed', (e) => {
        if (typeof app !== 'undefined' && typeof app.onStudentChanged === 'function') {
            app.onStudentChanged(e && e.detail ? e.detail : null);
        }
    });
}

// تشغيل التطبيق تلقائياً عند جاهزية DOM
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        if (typeof app !== 'undefined') {
            app.init();
        }
    });
}

