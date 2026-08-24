const app = {
    idx: 0, score: 0, stats: { ok: 0, err: 0 }, clock: 10.0, timer: null, feedbackTimer: null, advanceTimer: null, _isAdvancing: false,
    hasPlayedGame1: false, hasPlayedGame2: false, hasPlayedGame3: false, currentActiveIndex: null, pendingGame: 0, chartInstance: null,
    mistakeIndices: [], isReviewMode: false, reviewQueue: [], reviewIdx: 0, keyboardBound: false,
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

        window.addEventListener('nb:locale-changed', () => {
            this.populateSelector();
            if (typeof updateActiveStudentPill === 'function') {
                updateActiveStudentPill();
            }
        });

        if (!this.keyboardBound) {
            this.keyboardBound = true;
            document.addEventListener('keydown', (e) => {
                // حظر التفاعل بالمفاتيح السريعة إذا كان التركيز داخل حقل إدخال
                if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

                // حظر التفاعل بالمفاتيح إذا كانت نافذة الإعدادات مفتوحة
                const settingsModal = document.getElementById('nb-settings-modal');
                if (settingsModal && !settingsModal.classList.contains('hidden')) return;

                // حظر التفاعل بالمفاتيح إذا كانت نافذة قائمة الطلاب مفتوحة
                const rosterModal = document.getElementById('student-roster-modal');
                if (rosterModal && !rosterModal.classList.contains('hidden')) return;

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
                    else if (e.key === '1' || e.key === 'ArrowUp') app.gradeResult(false);
                    else if (e.key === '2' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); app.gradeResult(true); }
                    return;
                }

                const wwStage = document.getElementById('wordwall-stage');
                const isWordwall = wwStage && !wwStage.classList.contains('hidden');
                if (isWordwall && typeof wordwallRoom !== 'undefined' && wordwallRoom.mode === 'ladder' && typeof ladderGame !== 'undefined') {
                    if (e.key === '1' || e.key === 'ArrowDown') ladderGame.grade(false);
                    else if (e.key === '2' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ladderGame.grade(true); }
                    else if (e.key === 'r' || e.key === 'R') ladderGame.reset();
                    return;
                }

                if (isLearning) {
                    if (e.key === 'ArrowRight' || e.key === 'PageUp') app.prev();
                    else if (e.key === 'ArrowLeft' || e.key === 'PageDown' || e.key === 'n' || e.key === 'N') app.next();
                    else if (e.key === '1' || e.key === 'ArrowDown') app.evaluate(false);
                    else if (e.key === '2' || e.key === ' ' || e.key === 'Enter') { e.preventDefault(); app.evaluate(true); }
                }
            });
        }
    },

    hideAll() {
        this.clearAdvanceTimer();
        if (this.timer) { clearInterval(this.timer); this.timer = null; }
        if (this.feedbackTimer) { clearTimeout(this.feedbackTimer); this.feedbackTimer = null; }
        this.closeOverlay();
        ['main-menu-stage', 'rule-stage', 'game-transition-stage', 'learning-stage', 'xo-stage', 'c4-stage', 'memory-stage', 'riddles-stage', 'wordwall-stage', 'summary-screen'].forEach(id => {
            const el = document.getElementById(id); if (el) el.classList.add('hidden');
        });
    },

    jumpTo(val) {
        this.hideAll();
        this.isReviewMode = false;
        const topNav = document.getElementById('top-nav'); if (topNav) topNav.classList.remove('hidden');
        if (val.startsWith('word_')) {
            const targetWordIdx = parseInt(val.split('_')[1], 10);
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
        } else if (val === 'menu') {
            const menu = document.getElementById('main-menu-stage'); if (menu) menu.classList.remove('hidden');
        } else if (val === 'rules') {
            const rStage = document.getElementById('rule-stage'); if (rStage) { rStage.classList.remove('hidden'); if (typeof ruleManager !== 'undefined') ruleManager.render(); }
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
        this.mistakeIndices = []; this.isReviewMode = false; this.reviewQueue = []; this.reviewIdx = 0;
        const scoreEl = document.getElementById('score-val'); if (scoreEl) scoreEl.innerText = '0';

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
            box.className = `letter-box quran-font theme-${currentTheme}`;
            box.style.direction = 'rtl';
            this.setSafeHTML(box, item.groups.map(g => `<span class="${g[1]}" style="margin:0 .25em">${g[0]}</span>`).join(''));
            container.appendChild(box);
        } else if (item.html) {
            const box = document.createElement('div');
            box.className = `letter-box quran-font theme-${currentTheme}`;
            box.style.direction = 'rtl';
            this.setSafeHTML(box, item.html);
            container.appendChild(box);
        } else if (Array.isArray(item.w)) {
            const box = document.createElement('div');
            box.className = `letter-box quran-font theme-${currentTheme}`;
            box.style.direction = 'rtl';
            const inner = item.w.map((seg, i) => `<span class="color-${i % 3}">${seg}</span>`).join('');
            this.setSafeHTML(box, `<bdi style="white-space:nowrap">${inner}</bdi>`);
            container.appendChild(box);
        } else {
            const box = document.createElement('div');
            box.className = `letter-box theme-${currentTheme}`;
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
            area.setAttribute('aria-label', `Card ${this.idx + 1} of ${dataset.length}: ${plain}`);
            area.tabIndex = -1;
            area.focus({ preventScroll: true });
        }
        if (banner) { banner.classList.add('hidden'); banner.classList.remove('pulse-danger'); }
        if (timerBox) timerBox.classList.add('hidden');
        if (this.timer) { clearInterval(this.timer); this.timer = null; }

        if (item.t === 'golden') {
            if (typeof Sound !== 'undefined' && typeof Sound.playChime === 'function') Sound.playChime();
            if (banner) {
                banner.innerText = "🌟 Golden Word! (+10)";
                banner.className = "text-center py-1 px-4 rounded-full font-bold text-white shadow-md w-fit bg-amber-500 block animate-bounce uppercase tracking-wide text-xs shrink-0";
                banner.classList.remove('hidden');
            }
        } else if (item.t === 'danger') {
            if (typeof Sound !== 'undefined' && typeof Sound.danger === 'function') Sound.danger();
            if (banner) {
                banner.innerText = "⚠️ High Focus! (-5)";
                banner.className = "text-center py-1 px-4 rounded-full font-bold text-white shadow-md w-fit bg-rose-600 block pulse-danger uppercase tracking-wide text-xs shrink-0";
                banner.classList.remove('hidden');
            }
        } else if (item.t === 'speed') {
            if (banner) {
                banner.innerText = "⚡ SPEED CHALLENGE!";
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
    },

    clearAdvanceTimer() {
        if (this.advanceTimer) {
            clearTimeout(this.advanceTimer);
            this.advanceTimer = null;
        }
        this._isAdvancing = false;
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
        if (progText) progText.innerText = `${prefix} ${current} of ${total}`;
        if (pBar && total > 0) {
            const pct = Math.round((current / total) * 100);
            pBar.style.width = `${pct}%`;
            pBar.setAttribute('aria-valuenow', pct);
        }
    },

    evaluate(isCorrect) {
        if (this._isAdvancing) return; // حماية ضد السباق وتعدد الضغطات
        const settings = (typeof settingsManager !== 'undefined') ? settingsManager.get() : {};

        // مسار تقييم صفحة المعالجة المخصصة حصراً لمنع تكرار النقاط ومضاعفة مدخلات البنك
        if (typeof PAGE_CONFIG !== 'undefined' && PAGE_CONFIG.pageNumber === 'remediation') {
            const currentItemIdx = (this.order && this.order[this.idx] !== undefined) ? this.order[this.idx] : this.idx;
            const currentWord = (typeof dataset !== 'undefined' && dataset[currentItemIdx]) ? dataset[currentItemIdx] : null;
            if (currentWord && typeof studentManager !== 'undefined') {
                const res = studentManager.recordRemediationAttempt(studentManager.getActiveStudentId(), currentWord, isCorrect);
                if (isCorrect) {
                    this.stats.ok++;
                    this.score += res.mastered ? 5 : 2;
                    const feedback = res.mastered ? 'أتقنت الكلمة تماماً! 👑' : 'خطوة ممتازة (1/2) ⭐';
                    this.triggerFeedback(feedback, '#10b981', true);
                } else {
                    this.stats.err++;
                    this.triggerFeedback('تحتاج تدريباً إضافياً ⭐', '#f43f5e', false);
                    if (typeof Sound !== 'undefined' && typeof Sound.fail === 'function') Sound.fail();
                }
            } else if (isCorrect) {
                this.stats.ok++;
                this.score += 2;
                this.triggerFeedback('أحسنت! ⭐', '#10b981', true);
            } else {
                this.stats.err++;
                this.triggerFeedback('تحتاج تدريباً إضافياً ⭐', '#f43f5e', false);
                if (typeof Sound !== 'undefined' && typeof Sound.fail === 'function') Sound.fail();
            }
            this.updateScoreUI();
            if (!settings.manualAdvance) {
                this._isAdvancing = true;
                this.clearAdvanceTimer();
                this.advanceTimer = setTimeout(() => {
                    this._isAdvancing = false;
                    this.next();
                }, 600);
            }
            return;
        }

        // استدعاء التسجيل اللحظي فورياً للطالب النشط (للدروس العادية)
        if (typeof studentManager !== 'undefined' && studentManager.hasActiveStudent()) {
            const lessonId = this.getLessonId();
            const pts = isCorrect ? ((this.isReviewMode) ? 2 : ((typeof settingsManager !== 'undefined' && settingsManager.get().noPenaltyMode) ? 1 : 1)) : 0;
            let currentWord = null;
            if (this.isReviewMode && this.reviewQueue && this.reviewIdx < this.reviewQueue.length) {
                const rIdx = this.reviewQueue[this.reviewIdx];
                currentWord = (typeof dataset !== 'undefined' && dataset[rIdx]) ? dataset[rIdx] : null;
            } else if (typeof dataset !== 'undefined' && dataset.length > 0) {
                const actualIdx = (this.order && this.order[this.idx] !== undefined) ? this.order[this.idx] : this.idx;
                currentWord = dataset[actualIdx] || null;
            }
            studentManager.recordCardEvaluation(lessonId, isCorrect, isCorrect ? pts : 0, currentWord, this.idx, dataset ? dataset.length : 0);
        }

        if (this.isReviewMode) {
            if (!this.reviewQueue || this.reviewIdx >= this.reviewQueue.length) return;
            if (isCorrect) {
                this.stats.ok++;
                this.score += 2;
                this.triggerFeedback('Mastered! 🌟', '#10b981', true);
            } else {
                this.stats.err++;
                this.triggerFeedback('Keep Practicing ⭐', '#f43f5e', false);
                if (typeof Sound !== 'undefined' && typeof Sound.fail === 'function') Sound.fail();
            }
            this.updateScoreUI();
            if (!settings.manualAdvance) {
                this._isAdvancing = true;
                this.clearAdvanceTimer();
                this.advanceTimer = setTimeout(() => {
                    this._isAdvancing = false;
                    this.next();
                }, 600);
            }
            return;
        }

        if (typeof dataset === 'undefined' || dataset.length === 0) return;
        const currentItemIdx = (this.order && this.order[this.idx] !== undefined) ? this.order[this.idx] : this.idx;
        const item = dataset[currentItemIdx];
        if (!item) return;
        const type = item.t;

        if (isCorrect) {
            this.stats.ok++;
            let points = (type === 'golden') ? 10 : (type === 'speed' && this.clock > 0) ? 5 : 2;
            this.score += points;
            const feedbacks = ['Excellent! 🌟', 'Awesome! 🏆', 'Hero! 🧠', 'Great Job! ❤️⭐', 'Very Good! ⭐', 'Genius! 🎓', 'Perfect! 👏', '⭐⭐⭐⭐⭐', '❤️❤️❤️❤️❤️'];
            const randomFeedback = feedbacks[Math.floor(Math.random() * feedbacks.length)];
            this.triggerFeedback(randomFeedback, '#10b981', true);
        } else {
            this.stats.err++;
            if (!this.mistakeIndices.includes(currentItemIdx)) {
                this.mistakeIndices.push(currentItemIdx);
            }
            let penalty = (settings.noPenaltyMode) ? 0 : ((type === 'danger') ? 5 : 2);
            this.score = Math.max(0, this.score - penalty);
            const feedbackText = (settings.noPenaltyMode) ?
                ((type === 'danger') ? 'High Focus! ⚠️' : 'Needs Practice ⭐') :
                ((type === 'danger') ? '-5 Warning! ⚠️' : '-2 Needs Practice');
            this.triggerFeedback(feedbackText, '#f43f5e', false);
            if (typeof Sound !== 'undefined' && typeof Sound.fail === 'function') Sound.fail();
        }
        this.updateScoreUI();

        if (!settings.manualAdvance) {
            this._isAdvancing = true;
            this.clearAdvanceTimer();
            this.advanceTimer = setTimeout(() => {
                this._isAdvancing = false;
                this.next();
            }, 600);
        }
    },

    next() {
        this.clearAdvanceTimer();
        this.updateScoreUI();

        if (this.isReviewMode) {
            this.reviewIdx++;
            if (this.reviewIdx < this.reviewQueue.length) {
                this.renderReview();
            } else {
                this.isReviewMode = false;
                this.finishToSummary();
            }
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

    startReview() {
        if (this.mistakeIndices.length === 0 || typeof dataset === 'undefined') return;
        this.isReviewMode = true;
        this.reviewQueue = [...this.mistakeIndices];
        this.reviewIdx = 0;
        this.renderReview();
    },

    renderReview() {
        if (this.reviewIdx >= this.reviewQueue.length) {
            this.isReviewMode = false;
            this.finishToSummary();
            return;
        }
        const origIndex = this.reviewQueue[this.reviewIdx];
        const item = dataset[origIndex];
        const area = document.getElementById('word-display-area');
        this.hideAll();
        const stage = document.getElementById('learning-stage'); if (stage) stage.classList.remove('hidden');
        this.updateProgress(this.reviewIdx + 1, this.reviewQueue.length, 'Mistake Review');

        if (area) {
            this.renderWordInto(area, item);
            const plain = this.getPlainWord(item);
            area.setAttribute('aria-label', `Review Card ${this.reviewIdx + 1} of ${this.reviewQueue.length}: ${plain}`);
            area.tabIndex = -1;
            area.focus({ preventScroll: true });
        }
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
        if (this.isReviewMode) {
            if (this.reviewIdx > 0) { this.reviewIdx--; this.renderReview(); }
        } else {
            if (this.idx > 0) { this.idx--; this.render(); }
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
        if (gameNum === 1) gameName = "Tic-Tac-Toe";
        else if (gameNum === 2) gameName = "Connect 4";
        else if (gameNum === 3) gameName = "Wordwall Arena";
        const titleEl = document.getElementById('transition-game-name'); if (titleEl) titleEl.innerText = gameName;
    },

    enterGame() {
        if (this.pendingGame === 1) this.jumpTo('game_xo');
        else if (this.pendingGame === 2) this.jumpTo('game_c4');
        else if (this.pendingGame === 3) this.playWordwall();
    },

    resume(gameNum) {
        if (gameNum === 1) this.hasPlayedGame1 = true;
        if (gameNum === 2) this.hasPlayedGame2 = true;
        if (gameNum === 3) { this.hasPlayedGame3 = true; this.playWordwall(); return; }
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
        const infoEl = document.getElementById('revealed-info'); if (infoEl) infoEl.innerText = `${item.info || 'Card'} • #${index + 1}`;
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
                    const feedback = res.mastered ? 'أتقنت الكلمة تماماً! 👑' : 'خطوة ممتازة (1/2) ⭐';
                    this.triggerFeedback(feedback, '#10b981', true);
                } else {
                    this.stats.err++;
                    this.triggerFeedback('تحتاج تدريباً إضافياً ⭐', '#f43f5e', false);
                }
                if (typeof honeycombGame !== 'undefined' && this.currentActiveIndex !== null) {
                    honeycombGame.markStatus(this.currentActiveIndex, isCorrect);
                }
                const scoreEl = document.getElementById('score-val'); if (scoreEl) scoreEl.innerText = this.score;
                this.closeOverlay();
                return;
            }
        }

        if (isCorrect) {
            this.score += 5;
            this.stats.ok++;
            this.triggerFeedback('Magnificent! ❤️⭐', '#10b981', true);
        } else {
            this.stats.err++;
            if (this.currentActiveIndex !== null && !this.mistakeIndices.includes(this.currentActiveIndex)) {
                this.mistakeIndices.push(this.currentActiveIndex);
            }
            this.triggerFeedback('Keep Trying! ⭐', '#f43f5e', false);
        }

        // تحديث حالة خلية النحل إذا كانت اللعبة نشطة
        if (typeof honeycombGame !== 'undefined' && this.currentActiveIndex !== null) {
            honeycombGame.markStatus(this.currentActiveIndex, isCorrect);
        }

        // التسجيل الذري اللحظي للطالب النشط
        if (typeof studentManager !== 'undefined' && studentManager.hasActiveStudent()) {
            const lessonId = this.getLessonId();
            const currentWord = (typeof dataset !== 'undefined' && this.currentActiveIndex !== null && dataset[this.currentActiveIndex]) ? dataset[this.currentActiveIndex] : null;
            studentManager.recordCardEvaluation(lessonId, isCorrect, isCorrect ? 5 : 0, currentWord, this.currentActiveIndex, dataset ? dataset.length : 0);
        }

        const scoreEl = document.getElementById('score-val'); if (scoreEl) scoreEl.innerText = this.score;
        this.closeOverlay();
    },

    finishToSummary() {
        this.hideAll();
        const summary = document.getElementById('summary-screen'); if (summary) summary.classList.remove('hidden');
        const finalScore = document.getElementById('final-score'); if (finalScore) finalScore.innerText = this.score;
        const reviewBtn = document.getElementById('btn-review-mistakes');
        if (reviewBtn) {
            if (this.mistakeIndices.length > 0) reviewBtn.classList.remove('hidden');
            else reviewBtn.classList.add('hidden');
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
                if (window.PAGE_CONFIG.page) return String(window.PAGE_CONFIG.page);
                const text = `${window.PAGE_CONFIG.subtitle || ''} ${window.PAGE_CONFIG.title || ''} ${window.PAGE_CONFIG.footer || ''}`;
                const m = text.match(/(?:Page|صفحة|درس|الدرس)\s*(\d+)/i);
                if (m) return m[1];
            }
            if (window.location && window.location.pathname) {
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
        if (this.chartInstance) this.chartInstance.destroy();
        const canvas = document.getElementById('summaryChart'); if (!canvas) return;
        const ctx = canvas.getContext('2d');
        this.chartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: { labels: ['Correct', 'Mistakes'], datasets: [{ data: [this.stats.ok, this.stats.err], backgroundColor: ['#10b981', '#f43f5e'], borderWidth: 0, hoverOffset: 6 }] },
            options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { family: 'Fredoka', weight: 'bold' } } } } }
        });
    }
};

// الاستماع لحدث تبديل الطالب لتحديث واجهة الدرس تلقائياً
if (typeof window !== 'undefined') {
    window.addEventListener('nb:student-changed', (e) => {
        if (typeof updateActiveStudentPill === 'function') {
            updateActiveStudentPill();
        }
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
