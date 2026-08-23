const app = {
    idx: 0, score: 0, stats: { ok: 0, err: 0 }, clock: 10.0, timer: null,
    hasPlayedGame1: false, hasPlayedGame2: false, hasPlayedGame3: false, currentActiveIndex: null, pendingGame: 0, chartInstance: null,
    mistakeIndices: [], isReviewMode: false, reviewQueue: [], reviewIdx: 0, keyboardBound: false,
    enableGameBreaks: false,

    init() {
        buildAppUI();
        try {
            const saved = localStorage.getItem('nour_enable_game_breaks');
            if (saved !== null) this.enableGameBreaks = (saved === '1');
        } catch(e) {}
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

        if (!this.keyboardBound) {
            this.keyboardBound = true;
            document.addEventListener('keydown', (e) => {
                const overlay = document.getElementById('word-overlay');
                const isOverlayOpen = overlay && !overlay.classList.contains('hidden');
                const learningStage = document.getElementById('learning-stage');
                const isLearning = learningStage && !learningStage.classList.contains('hidden');

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
                    else if (e.key === '1' || e.key === 'ArrowDown') app.evaluate(false);
                    else if (e.key === '2' || e.key === ' ' || e.key === 'Enter') { e.preventDefault(); app.evaluate(true); }
                }
            });
        }
    },

    hideAll() {
        ['main-menu-stage', 'rule-stage', 'game-transition-stage', 'learning-stage', 'xo-stage', 'c4-stage', 'memory-stage', 'riddles-stage', 'wordwall-stage', 'summary-screen'].forEach(id => {
            const el = document.getElementById(id); if (el) el.classList.add('hidden');
        });
    },

    jumpTo(val) {
        this.hideAll();
        const topNav = document.getElementById('top-nav'); if (topNav) topNav.classList.remove('hidden');
        if (val.startsWith('word_')) {
            this.idx = parseInt(val.split('_')[1], 10);
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
        else if (val === 'summary') { this.finishToSummary(); }
        const sel = document.getElementById('example-navigator'); if (sel) sel.value = val;
    },

    startChallenge() {
        this.idx = 0; this.score = 0; this.stats = { ok: 0, err: 0 }; this.hasPlayedGame1 = false; this.hasPlayedGame2 = false; this.hasPlayedGame3 = false;
        const scoreEl = document.getElementById('score-val'); if (scoreEl) scoreEl.innerText = '0';
        this.jumpTo('word_0');
    },

    populateSelector() {
        const selector = document.getElementById('example-navigator');
        if (!selector || typeof dataset === 'undefined') return;
        selector.innerHTML = '';
        const createOpt = (val, text) => { const opt = document.createElement('option'); opt.value = val; opt.text = text; selector.appendChild(opt); };
        createOpt('menu', '🏠 Main Menu');
        if (typeof rulesData !== 'undefined' && rulesData.length > 0) createOpt('rules', '📖 Lesson Rules');
        const optGroupWords = document.createElement('optgroup'); optGroupWords.label = '📚 Reading Words';
        dataset.forEach((item, index) => {
            const plainWord = this.getPlainWord(item) || `Word ${index + 1}`;
            const opt = document.createElement('option'); opt.value = `word_${index}`; opt.text = `${index + 1}: ${plainWord}`; optGroupWords.appendChild(opt);
        });
        selector.appendChild(optGroupWords);
        const optGroupGames = document.createElement('optgroup'); optGroupGames.label = '🎮 Break Games';
        const g1 = document.createElement('option'); g1.value = 'game_xo'; g1.text = '❌ Tic-Tac-Toe'; optGroupGames.appendChild(g1);
        const g2 = document.createElement('option'); g2.value = 'game_c4'; g2.text = '🔴 Connect 4'; optGroupGames.appendChild(g2);
        if (document.getElementById('riddles-stage')) {
            const g3 = document.createElement('option'); g3.value = 'game_riddles'; g3.text = '👑 Secret Riddles'; optGroupGames.appendChild(g3);
        } else {
            const g3 = document.createElement('option'); g3.value = 'game_memory'; g3.text = '🧠 Memory Match'; optGroupGames.appendChild(g3);
        }
        selector.appendChild(optGroupGames);
        const optGroupWW = document.createElement('optgroup'); optGroupWW.label = '🧩 Wordwall Activities';
        const w1 = document.createElement('option'); w1.value = 'ww_box'; w1.text = '🎁 Open The Box'; optGroupWW.appendChild(w1);
        const w1b = document.createElement('option'); w1b.value = 'ww_curtain'; w1b.text = '🎭 Curtain Reveal'; optGroupWW.appendChild(w1b);
        const w1c = document.createElement('option'); w1c.value = 'ww_ladder'; w1c.text = '🪜 Mastery Ladder'; optGroupWW.appendChild(w1c);
        const w2 = document.createElement('option'); w2.value = 'ww_wheel'; w2.text = '🎡 Spin The Wheel'; optGroupWW.appendChild(w2);
        const w3 = document.createElement('option'); w3.value = 'ww_cards'; w3.text = '🃏 Random Cards'; optGroupWW.appendChild(w3);
        selector.appendChild(optGroupWW);
        const optGroupEnd = document.createElement('optgroup'); optGroupEnd.label = '🏆 Finish Line';
        const e1 = document.createElement('option'); e1.value = 'summary'; e1.text = '📊 Final Summary'; optGroupEnd.appendChild(e1);
        selector.appendChild(optGroupEnd);
    },

    shuffle(arr) {
        if (!Array.isArray(arr)) return arr;
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    },

    setSafeHTML(el, htmlStr) {
        if (!el) return;
        const doc = new DOMParser().parseFromString(htmlStr || '', 'text/html');
        doc.querySelectorAll('script, iframe, object, embed, style, link').forEach(e => e.remove());
        const elements = doc.body.getElementsByTagName('*');
        for (let i = 0; i < elements.length; i++) {
            const child = elements[i];
            for (let j = child.attributes.length - 1; j >= 0; j--) {
                const attr = child.attributes[j];
                if (attr.name.startsWith('on') || attr.name === 'javascript:') child.removeAttribute(attr.name);
            }
        }
        el.innerHTML = doc.body.innerHTML;
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
        if (typeof dataset === 'undefined' || !dataset[this.idx]) return;
        const item = dataset[this.idx];
        const area = document.getElementById('word-display-area');
        const banner = document.getElementById('status-banner');
        const timerBox = document.getElementById('challenge-timer');
        const navSelect = document.getElementById('example-navigator');
        if (navSelect) navSelect.value = `word_${this.idx}`;
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
        clearInterval(this.timer);
        if (item.t === 'golden') {
            Sound.playChime();
            if (banner) {
                banner.innerText = "🌟 Golden Word! (+10)";
                banner.className = "text-center py-1 px-4 rounded-full font-bold text-white shadow-md w-fit bg-amber-500 block animate-bounce uppercase tracking-wide text-xs shrink-0";
                banner.classList.remove('hidden');
            }
        } else if (item.t === 'danger') {
            Sound.danger();
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

    startClock() {
        this.clock = 10.0;
        const el = document.getElementById('timer-val');
        if (el) el.innerText = this.clock.toFixed(1);
        this.timer = setInterval(() => {
            this.clock -= 0.1;
            if (this.clock <= 0) { this.clock = 0; clearInterval(this.timer); }
            if (el) el.innerText = this.clock.toFixed(1);
        }, 100);
    },

    updateProgress(current, total, prefix = 'Card') {
        const progText = document.getElementById('progress-text');
        const pBar = document.getElementById('progress-bar');
        if (progText) progText.innerText = `${prefix} ${current} of ${total}`;
        if (pBar && total > 0) pBar.style.width = `${(current / total) * 100}%`;
    },

    evaluate(isCorrect) {
        if (typeof dataset === 'undefined' || !dataset[this.idx]) return;
        const item = dataset[this.idx];
        const type = item.t;
        if (isCorrect) {
            this.stats.ok++;
            let points = (type === 'golden') ? 10 : (type === 'speed' && this.clock > 0) ? 5 : 2;
            this.score += points;
            const feedbacks = ['Excellent! 🌟', 'Awesome! 🏆', 'Hero! 🧠', 'Great Job! ❤️⭐', 'Very Good! ⭐', 'Genius! 🎓', 'Perfect! 👏', '⭐⭐⭐⭐⭐', '❤️❤️❤️❤️❤️'];
            const randomFeedback = feedbacks[Math.floor(Math.random() * feedbacks.length)];
            this.triggerFeedback(randomFeedback, '#10b981', true);

            if (this.isReviewMode) {
                this.reviewIdx++;
                if (this.reviewIdx < this.reviewQueue.length) {
                    setTimeout(() => this.renderReview(), 600);
                } else {
                    this.isReviewMode = false;
                    setTimeout(() => this.finishToSummary(), 600);
                }
                const scoreEl = document.getElementById('score-val'); if (scoreEl) scoreEl.innerText = this.score;
                return;
            }

            const third1 = Math.floor(dataset.length / 3) - 1;
            const third2 = Math.floor((dataset.length * 2) / 3) - 1;
            if (this.enableGameBreaks && this.idx === third1 && !this.hasPlayedGame1) {
                setTimeout(() => this.jumpTo('transition_1'), 600);
            } else if (this.enableGameBreaks && this.idx === third2 && !this.hasPlayedGame2) {
                setTimeout(() => this.jumpTo('transition_2'), 600);
            } else if (this.enableGameBreaks && this.idx === dataset.length - 1 && !this.hasPlayedGame3) {
                setTimeout(() => this.jumpTo('transition_3'), 600);
            } else {
                if (this.idx < dataset.length - 1) { this.idx++; setTimeout(() => this.render(), 600); }
                else { setTimeout(() => this.playWordwall(), 600); }
            }
        } else {
            this.stats.err++;
            if (!this.mistakeIndices.includes(this.idx)) {
                this.mistakeIndices.push(this.idx);
            }
            let points = (type === 'danger') ? -5 : -2;
            this.score += points; if (this.score < 0) this.score = 0;
            this.triggerFeedback('Try Again! 🔄', '#f43f5e', false);
        }
        const scoreEl = document.getElementById('score-val'); if (scoreEl) scoreEl.innerText = this.score;
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
        this.idx = this.reviewQueue[this.reviewIdx];
        this.hideAll();
        const stage = document.getElementById('learning-stage');
        if (stage) stage.classList.remove('hidden');
        const area = document.getElementById('word-display-area');
        const banner = document.getElementById('status-banner');
        if (banner) banner.classList.add('hidden');
        this.updateProgress(this.reviewIdx + 1, this.reviewQueue.length, 'Review');
        if (area && dataset[this.idx]) {
            const item = dataset[this.idx];
            this.renderWordInto(area, item);
            const plain = this.getPlainWord(item);
            area.setAttribute('aria-label', `Review Card ${this.reviewIdx + 1} of ${this.reviewQueue.length}: ${plain}`);
            area.tabIndex = -1;
            area.focus({ preventScroll: true });
        }
    },

    toggleGameBreaks(enabled) {
        this.enableGameBreaks = enabled;
        try { localStorage.setItem('nour_enable_game_breaks', enabled ? '1' : '0'); } catch(e) {}
    },

    prev() { if (this.idx > 0) { this.idx--; this.render(); } },

    triggerFeedback(txt, color, playSound = false) {
        if (playSound) {
            if (typeof Sound !== 'undefined') Sound.playChime();
            if (typeof confetti === 'function') confetti({ particleCount: 40, spread: 50, origin: { y: 0.2 } });
        }
        const badge = document.getElementById('badge-ui'); if (!badge) return;
        badge.innerText = txt; badge.style.color = color; badge.style.borderColor = color; badge.classList.add('active'); badge.style.opacity = '1';
        setTimeout(() => { badge.classList.remove('active'); badge.style.opacity = '0'; }, 1200);
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
        if (gameNum === 2) gameName = "Connect 4";
        if (gameNum === 3) gameName = document.getElementById('riddles-stage') ? "Secret Riddles" : "Memory Match";
        const nameEl = document.getElementById('transition-game-name'); if (nameEl) nameEl.innerText = gameName;
        const skipBtn = document.getElementById('btn-skip-game');
        if (skipBtn) skipBtn.innerHTML = gameNum === 3 ? "⏭️ Skip to Wordwall" : "⏭️ Skip & Read";
        const playBtn = document.getElementById('btn-play-game');
        if (playBtn) {
            playBtn.onclick = () => {
                if (this.pendingGame === 1) this.jumpTo('game_xo');
                else if (this.pendingGame === 2) this.jumpTo('game_c4');
                else if (this.pendingGame === 3) {
                    if (document.getElementById('riddles-stage')) this.jumpTo('game_riddles');
                    else this.jumpTo('game_memory');
                }
            };
        }
    },

    skipGameAndResume() { this.resume(this.pendingGame); },

    resume(gameNum) {
        if (gameNum === 1) this.hasPlayedGame1 = true;
        if (gameNum === 2) this.hasPlayedGame2 = true;
        if (gameNum === 3) { this.hasPlayedGame3 = true; this.playWordwall(); return; }
        if (typeof dataset !== 'undefined' && this.idx < dataset.length - 1) { this.idx++; this.jumpTo(`word_${this.idx}`); }
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
        const overlay = document.getElementById('word-overlay'); if (overlay) overlay.classList.remove('hidden');
        if (triggerType === 'box' && typeof wordwallRoom !== 'undefined') {
            const boxEl = document.getElementById(`box-${index}`); if (boxEl) boxEl.classList.add('opened');
            wordwallRoom.openedBoxes.add(index);
        }
    },

    closeOverlay() { const overlay = document.getElementById('word-overlay'); if (overlay) overlay.classList.add('hidden'); },

    gradeResult(isCorrect) {
        if (isCorrect) { this.score += 5; this.stats.ok++; this.triggerFeedback('Magnificent! ❤️⭐', '#10b981', true); }
        else { this.stats.err++; this.triggerFeedback('Keep Trying! ⭐', '#f43f5e', false); }
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
        this.drawChart();
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
