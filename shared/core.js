/**
 * Nour Al-Bayan Interactive Platform - Shared Core Engine
 */

const Sound = {
    ctx: null,
    getCtx() {
        if (!this.ctx) {
            const A = window.AudioContext || window.webkitAudioContext;
            if (A) this.ctx = new A();
        }
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
        return this.ctx;
    },
    init() { this.getCtx(); },
    playChime() {
        const c = this.getCtx(); if (!c) return;
        const now = c.currentTime, o = c.createOscillator(), g = c.createGain();
        o.type = 'sine'; o.connect(g); g.connect(c.destination);
        o.frequency.setValueAtTime(523.25, now); o.frequency.setValueAtTime(659.25, now + 0.1);
        o.frequency.setValueAtTime(783.99, now + 0.2); o.frequency.setValueAtTime(1046.50, now + 0.3);
        g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(0.2, now + 0.05);
        g.gain.exponentialRampToValueAtTime(0.01, now + 0.5); o.start(now); o.stop(now + 0.5);
    },
    tone(freq, d = 0.2, type = 'sine') {
        const c = this.getCtx(); if (!c) return;
        const now = c.currentTime, o = c.createOscillator(), g = c.createGain();
        o.type = type; o.frequency.setValueAtTime(freq, now); o.connect(g); g.connect(c.destination);
        g.gain.setValueAtTime(0.15, now); g.gain.exponentialRampToValueAtTime(0.001, now + d);
        o.start(now); o.stop(now + d);
    },
    nav() { this.tone(520, 0.05); },
    tap() { this.tone(600, 0.04); },
    golden() { this.playChime(); },
    danger() { this.tone(220, 0.3, 'sawtooth'); },
    flip() { this.tone(440, 0.08, 'triangle'); },
    drop() { this.tone(300, 0.08); },
    win() { this.playChime(); },
    success() { this.playChime(); },
    fail() { this.tone(180, 0.25, 'sawtooth'); }
};

function playCelebrationSound() { Sound.playChime(); }

function fireCelebration() {
    if (typeof confetti !== 'function') return;
    const end = Date.now() + 3000;
    (function frame() {
        confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#3b82f6', '#10b981', '#fb7185', '#facc15'] });
        confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#3b82f6', '#10b981', '#fb7185', '#facc15'] });
        if (Date.now() < end) requestAnimationFrame(frame);
    }());
}

const wordwallColors = ['#e11d48', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1', '#06b6d4', '#f97316', '#84cc16', '#a855f7', '#64748b', '#059669', '#d97706'];

function buildAppUI() {
    if (document.getElementById('learning-stage')) return; // Already exists

    const cfg = window.PAGE_CONFIG || {};
    const title = cfg.title || document.title || 'Nour Al-Bayan';
    const subtitle = cfg.subtitle || 'Harakat & Reading Practice';
    const footerText = cfg.footer || 'Nour Al-Bayan Learning System';
    const hasRules = (typeof rulesData !== 'undefined' && rulesData.length > 0) || (cfg.rules && cfg.rules.length > 0);
    const game3Type = cfg.game3 || (document.getElementById('riddles-stage') || typeof riddlesGame !== 'undefined' ? 'riddles' : (hasRules ? 'riddles' : 'memory'));

    const rulesButtonHtml = hasRules ? `
        <button onclick="app.jumpTo('rules')" class="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 px-6 rounded-[1.5rem] text-xl shadow-md transition-transform active:scale-95 flex items-center justify-between">
            <span>📖 Lesson Rules</span>
            <span class="text-2xl">➡</span>
        </button>` : '';

    const ruleStageHtml = hasRules ? `
        <!-- STAGE 0: LESSON RULES -->
        <section id="rule-stage" class="hidden w-full h-full flex flex-col justify-center items-center gap-4 py-4 overflow-hidden shrink-0">
            <div class="text-center shrink-0">
                <span id="rule-step-indicator" class="text-xs font-bold text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full uppercase tracking-wider">LESSON RULE</span>
                <h2 id="rule-title" class="text-2xl sm:text-3xl font-black text-slate-800 mt-3">Rule Title</h2>
                <p id="rule-desc" class="text-sm sm:text-base text-slate-500 max-w-md mx-auto mt-2 leading-relaxed">Description of current rule</p>
            </div>
            <div class="w-full max-w-3xl bg-white border-8 border-emerald-400 rounded-[3rem] shadow-xl p-6 flex flex-col justify-center items-center h-[40vh] min-h-[220px] max-h-[350px]">
                <span id="rule-big-text" class="quran-font text-center text-slate-800 leading-normal tracking-wide select-text px-4 w-full break-words" style="font-size: clamp(3.5rem, 11vh, 7rem);">
                    Rule Content
                </span>
            </div>
            <div class="flex justify-center gap-4 w-full max-w-sm mt-4 shrink-0">
                <button id="rule-prev-btn" onclick="ruleManager.prev()" class="hidden bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3.5 px-6 rounded-2xl text-sm transition-colors shadow-sm">
                    ⬅ Back
                </button>
                <button id="rule-next-btn" onclick="ruleManager.next()" class="bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 px-8 rounded-2xl text-sm transition-transform active:scale-95 shadow-md flex-1">
                    Start Challenge! 🚀
                </button>
            </div>
        </section>` : '';

    const game3StageHtml = (game3Type === 'riddles') ? `
        <!-- STAGE 3C: MIDPOINT GAME 3 (SECRET RIDDLES) -->
        <section id="riddles-stage" class="hidden w-full h-full flex flex-col justify-center items-center text-center p-6 rounded-[3rem] shadow-2xl text-white bg-gradient-to-b from-indigo-900 to-purple-900 shrink-0 z-10">
            <h2 class="text-4xl font-black text-amber-400 mt-2">👑 Secret Riddles Box 👑</h2>
            <div id="riddle-container" class="bg-white/10 p-6 rounded-3xl backdrop-blur-sm border border-white/20 min-h-[200px] w-full max-w-2xl flex flex-col justify-center gap-4 mt-4">
                <p id="riddle-question" class="text-xl sm:text-2xl font-bold leading-normal"></p>
                <div id="riddle-options" class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4"></div>
            </div>
            <p id="riddle-feedback" class="text-xl font-bold h-8 text-emerald-400 mt-4"></p>
            <div class="flex flex-wrap justify-center gap-3 w-full mt-2 max-w-md">
                <button onclick="riddlesGame.reset()" class="bg-purple-800/40 hover:bg-purple-800/60 border border-purple-400/30 text-white px-6 py-2.5 rounded-full font-bold text-sm backdrop-blur-sm">Reset 🔄</button>
                <button id="riddles-resume-btn" onclick="app.resume(3)" class="bg-yellow-400 hover:bg-yellow-300 text-purple-900 px-8 py-2.5 rounded-full font-black text-sm shadow-md transition transform hover:-translate-y-0.5">Skip to Wordwall ⏭️</button>
            </div>
        </section>` : `
        <!-- STAGE 3C: MIDPOINT GAME 3 (MEMORY MATCH) -->
        <section id="memory-stage" class="hidden w-full h-full flex flex-col justify-center items-center text-center p-4 rounded-[2.5rem] shadow-2xl text-white bg-gradient-to-br from-indigo-800 to-purple-900 relative overflow-hidden shrink-0 z-10">
            <h2 class="text-3xl font-black text-amber-400 drop-shadow-md mt-2">Memory Match 🧠</h2>
            <div id="memory-board" class="mem-board mt-4"></div>
            <div class="bg-black/20 py-1.5 px-6 rounded-full inline-block backdrop-blur-sm border border-white/10 shadow-sm mt-5">
                <h3 id="memory-status" class="text-sm font-bold text-white tracking-wide">Find all matching pairs!</h3>
            </div>
            <div class="flex flex-wrap justify-center gap-3 w-full mt-5 max-w-md">
                <button onclick="memoryGame.reset()" class="bg-purple-800/40 hover:bg-purple-800/60 border border-purple-400/30 text-white px-6 py-2.5 rounded-full font-bold text-sm backdrop-blur-sm">Reset 🔄</button>
                <button id="memory-resume-btn" onclick="app.resume(3)" class="bg-yellow-400 hover:bg-yellow-300 text-purple-900 px-8 py-2.5 rounded-full font-black text-sm shadow-md transition transform hover:-translate-y-0.5">Skip to Wordwall ⏭️</button>
            </div>
        </section>`;

    const fullHtml = `
    <!-- Interactive Feedback Badge -->
    <div id="badge-ui" class="feedback-badge bg-white shadow-xl px-8 py-3 rounded-full text-2xl sm:text-3xl font-black border-4 border-emerald-400 whitespace-nowrap"></div>

    <!-- Navigation Header -->
    <header id="top-nav" class="w-full bg-white border-b px-4 py-2 flex flex-col sm:flex-row justify-between items-center shadow-sm shrink-0 z-30 relative">
        <div class="w-full flex justify-between items-center">
            <div class="flex items-center gap-4">
                <div class="flex flex-col items-center">
                    <span class="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Score</span>
                    <span id="score-val" class="text-xl font-black text-emerald-600 leading-none">0</span>
                </div>
                <div id="challenge-timer" class="hidden bg-amber-100 text-amber-700 px-2.5 py-1 rounded-lg font-mono font-bold text-sm shadow-inner">
                    ⏱ <span id="timer-val">10.0</span>s
                </div>
            </div>

            <!-- Teacher Manual Feedback Triggers -->
            <div class="hidden md:flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
                <button onclick="app.triggerFeedback('⭐', '#f59e0b', true)" class="p-1.5 bg-amber-100 text-amber-500 rounded-full hover:bg-amber-200 hover:scale-110 transition-all shadow-sm text-lg leading-none">⭐</button>
                <button onclick="app.triggerFeedback('❤️', '#ef4444', true)" class="p-1.5 bg-rose-100 text-rose-500 rounded-full hover:bg-rose-200 hover:scale-110 transition-all shadow-sm text-lg leading-none">❤️</button>
                <div class="w-px h-5 bg-slate-300 mx-1 hidden sm:block"></div>
                <button onclick="app.triggerFeedback('Perfect! 🌟', '#8b5cf6', true)" class="hidden sm:inline-block px-2 py-0.5 bg-purple-100 text-purple-700 rounded-md font-bold text-[10px] hover:bg-purple-200 transition-colors">Perfect</button>
                <button onclick="app.triggerFeedback('Excellent! 🏆', '#10b981', true)" class="hidden sm:inline-block px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md font-bold text-[10px] hover:bg-emerald-200 transition-colors">Excellent</button>
            </div>

            <!-- Dropdown Navigator -->
            <div id="selector-wrapper" class="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 w-auto">
                <select id="example-navigator" onchange="app.jumpTo(this.value)" class="bg-transparent text-emerald-600 font-bold text-xs sm:text-sm outline-none cursor-pointer w-full text-center">
                </select>
            </div>
        </div>
    </header>

    <main class="flex-1 w-full max-w-5xl px-4 flex flex-col justify-center items-center overflow-hidden relative">

        <!-- STAGE -1: MAIN MENU -->
        <section id="main-menu-stage" class="w-full h-full flex flex-col justify-center items-center gap-8 py-4 overflow-hidden shrink-0">
            <div class="text-center">
                <h1 class="text-5xl sm:text-6xl font-black text-emerald-600 drop-shadow-sm mb-2">${title}</h1>
                <p class="text-slate-500 font-bold text-base sm:text-lg">${subtitle}</p>
            </div>

            <div class="grid grid-cols-1 gap-5 w-full max-w-sm px-4">
                ${rulesButtonHtml}
                <button onclick="app.jumpTo('word_0')" class="bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black py-5 px-6 rounded-[1.5rem] text-2xl shadow-lg transition-transform active:scale-95 flex items-center justify-between animate-pulse">
                    <span>🚀 Start Challenge</span>
                    <span class="text-3xl">➡</span>
                </button>
                <button onclick="app.jumpTo('ww_box')" class="bg-white border-4 border-amber-400 hover:bg-amber-50 text-amber-500 font-black py-4 px-6 rounded-[1.5rem] text-xl shadow-md transition-transform active:scale-95 flex items-center justify-between">
                    <span>🎡 Word Games</span>
                    <span class="text-2xl">➡</span>
                </button>
            </div>
        </section>

        ${ruleStageHtml}

        <!-- STAGE 0.5: GAME TRANSITION -->
        <section id="game-transition-stage" class="hidden w-full h-full flex flex-col justify-center items-center text-center p-6 rounded-[2.5rem] shadow-xl text-white bg-gradient-to-br from-indigo-500 to-purple-600 relative overflow-hidden shrink-0 z-20">
            <h2 class="text-4xl sm:text-5xl font-black text-yellow-300 drop-shadow-md mb-4 animate-bounce">Amazing Job! 🌟</h2>
            <p class="text-xl sm:text-2xl font-bold text-white mb-8">You are an excellent student!<br>You deserve a game break!</p>
            <div class="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                <button id="btn-play-game" class="flex-1 bg-yellow-400 hover:bg-yellow-300 text-indigo-900 py-4 rounded-2xl text-lg font-black shadow-[0_6px_0_#ca8a04] active:translate-y-[6px] active:shadow-none transition-all">
                    🎮 Play <span id="transition-game-name">Game</span>
                </button>
                <button id="btn-skip-game" onclick="app.skipGameAndResume()" class="flex-1 bg-white/20 hover:bg-white/30 text-white border-2 border-white/50 py-4 rounded-2xl text-lg font-bold transition-all backdrop-blur-sm">
                    ⏭️ Skip & Read
                </button>
            </div>
        </section>

        <!-- STAGE 1: LEARNING / READING CHALLENGE -->
        <section id="learning-stage" class="hidden w-full flex flex-col justify-between items-center gap-2 py-2 flex-1 overflow-hidden relative">
            <div class="w-full flex justify-between items-center px-4 shrink-0 h-8">
                <span id="progress-text" class="text-slate-400 font-black text-xs tracking-widest uppercase">Card 1</span>
                <div id="status-banner" class="text-center py-1 px-4 rounded-full font-bold text-white shadow-md hidden text-[10px] uppercase tracking-wide"></div>
            </div>

            <div class="segmented-container flex-1 flex items-center justify-center w-full" id="word-display-area"></div>

            <div class="w-full max-w-lg space-y-3 shrink-0 pb-4 mt-2">
                <div class="grid grid-cols-2 gap-4 px-2">
                    <button onclick="app.evaluate(false)" class="bg-rose-500 hover:bg-rose-600 text-white py-4 rounded-[2rem] text-xl shadow-[0_6px_0_#be123c] active:translate-y-[6px] active:shadow-none transition-all flex items-center justify-center gap-2 font-black">
                        ❌ Incorrect
                    </button>
                    <button onclick="app.evaluate(true)" class="bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-[2rem] text-xl shadow-[0_6px_0_#047857] active:translate-y-[6px] active:shadow-none transition-all flex items-center justify-center gap-2 font-black">
                        ✔ Correct
                    </button>
                </div>
                <div class="flex justify-center mt-1">
                    <button onclick="app.prev()" class="bg-slate-200 hover:bg-slate-300 text-slate-600 py-1.5 px-6 rounded-full text-xs font-bold transition-colors shadow-sm">
                        ⬅ Previous Card
                    </button>
                </div>
            </div>
        </section>

        <!-- STAGE 2: MIDPOINT GAME 1 (TIC-TAC-TOE) -->
        <section id="xo-stage" class="hidden w-full h-full flex flex-col justify-center items-center text-center p-2 sm:p-4 rounded-[2.5rem] text-white bg-gradient-to-br from-teal-600 via-emerald-600 to-green-700 relative overflow-hidden shrink-0 z-10">
            <div class="relative z-10 flex flex-col items-center justify-center h-full w-full max-w-3xl gap-2 sm:gap-4">
                <h2 class="text-4xl font-black text-yellow-300 drop-shadow-md">Tic-Tac-Toe! 🎮</h2>
                <div class="xo-board-container mt-2">
                    <div id="xo-board" class="grid grid-cols-3 gap-3 bg-white/20 p-4 rounded-[2rem] backdrop-blur-md shadow-inner border border-white/25 w-full h-full"></div>
                </div>
                <div class="bg-black/20 py-2 px-8 rounded-full inline-block backdrop-blur-sm border border-white/10 shadow-sm mt-2">
                    <h3 id="xo-status" class="text-lg font-bold text-white tracking-wide">Player X Turn!</h3>
                </div>
                <div class="flex flex-wrap justify-center gap-4 w-full mt-2">
                    <button onclick="xoGame.reset()" class="bg-white/20 hover:bg-white/30 text-white border border-white/30 px-6 py-3 rounded-full font-bold text-sm transition-transform hover:scale-105 backdrop-blur-sm">Reset 🔄</button>
                    <button id="xo-resume-btn" onclick="app.resume(1)" class="bg-yellow-400 hover:bg-yellow-300 text-teal-900 px-8 py-3 rounded-full font-black text-sm shadow-md transform transition hover:-translate-y-0.5">Skip & Read ⏭️</button>
                </div>
            </div>
        </section>

        <!-- STAGE 3B: MIDPOINT GAME 2 (CONNECT 4) -->
        <section id="c4-stage" class="hidden w-full h-full flex flex-col justify-center items-center text-center p-4 rounded-[2.5rem] shadow-xl text-white bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-700 relative overflow-hidden shrink-0 z-10">
            <div class="relative z-10 flex flex-col items-center gap-3">
                <h2 class="text-3xl font-black text-yellow-300 drop-shadow-md">Connect 4 🔴🟡</h2>
                <div id="c4-board-container" class="c4-board-new grid-cols-7 mx-auto mt-2"></div>
                <div class="bg-black/20 py-1.5 px-6 rounded-full inline-block backdrop-blur-sm border border-white/10 shadow-sm mt-3">
                    <h3 id="c4-status" class="text-sm font-bold text-white tracking-wide">Select any column</h3>
                </div>
                <div class="flex flex-wrap justify-center gap-3 w-full mt-4">
                    <button onclick="c4Game.reset()" class="bg-blue-800/40 hover:bg-blue-800/60 border border-blue-400/30 text-white px-6 py-2.5 rounded-full font-bold text-sm backdrop-blur-sm">Reset 🔄</button>
                    <button id="c4-resume-btn" onclick="app.resume(2)" class="bg-yellow-400 hover:bg-yellow-300 text-blue-900 px-8 py-2.5 rounded-full font-black text-sm shadow-md transition transform hover:-translate-y-0.5">Skip & Read ⏭️</button>
                </div>
            </div>
        </section>

        ${game3StageHtml}

        <!-- STAGE 4: WORDWALL PLAYROOM -->
        <section id="wordwall-stage" class="hidden w-full h-full flex flex-col items-center py-4 px-2 overflow-hidden bg-slate-50 rounded-3xl border border-slate-200 shadow-inner">
            <div class="w-full max-w-4xl flex flex-col sm:flex-row justify-between items-center mb-4 shrink-0 gap-4 px-4">
                <h2 class="text-2xl sm:text-3xl font-black text-emerald-600 drop-shadow-sm flex items-center gap-2">
                    <span>🎡</span> Games Room
                </h2>
                <nav class="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 flex gap-2">
                    <button onclick="wordwallRoom.switchMode('box')" id="tab-box" class="game-tab active py-2 px-4 rounded-xl font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 flex items-center justify-center gap-2 text-sm border border-transparent">
                        <span class="text-xl">🎁</span> <span class="hidden sm:inline">Box</span>
                    </button>
                    <button onclick="wordwallRoom.switchMode('wheel')" id="tab-wheel" class="game-tab py-2 px-4 rounded-xl font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 flex items-center justify-center gap-2 text-sm border border-transparent">
                        <span class="text-xl">🎡</span> <span class="hidden sm:inline">Wheel</span>
                    </button>
                    <button onclick="wordwallRoom.switchMode('cards')" id="tab-cards" class="game-tab py-2 px-4 rounded-xl font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 flex items-center justify-center gap-2 text-sm border border-transparent">
                        <span class="text-xl">🃏</span> <span class="hidden sm:inline">Cards</span>
                    </button>
                </nav>
            </div>

            <div class="flex-1 w-full flex flex-col items-center justify-center overflow-hidden relative">
                <div id="ww-box-container" class="w-full h-full flex flex-col items-center">
                    <div class="bg-indigo-100 text-indigo-800 px-4 py-1.5 rounded-full text-xs font-bold mb-2 shrink-0 shadow-sm border border-indigo-200">
                        Tap any box to reveal the hidden word!
                    </div>
                    <div id="box-grid" class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4 w-full max-w-5xl overflow-y-auto p-4 custom-scrollbar pb-20"></div>
                </div>

                <div id="ww-wheel-container" class="hidden w-full h-full flex flex-col justify-center items-center gap-6">
                    <div class="bg-amber-100 text-amber-800 px-4 py-1.5 rounded-full text-xs font-bold shrink-0 shadow-sm border border-amber-200">
                        Tap SPIN or the center circle to rotate!
                    </div>
                    <div class="relative w-[85vw] max-w-[360px] aspect-square flex items-center justify-center shrink-0 drop-shadow-2xl">
                        <canvas id="wheel-canvas" width="400" height="400" class="w-full h-full object-contain"></canvas>
                        <div class="absolute -top-3 left-1/2 -translate-x-1/2 w-10 h-12 bg-rose-600 z-10 border-4 border-white pointer-events-none drop-shadow-md" style="clip-path: polygon(50% 100%, 0 0, 100% 0);"></div>
                        <button onclick="wheelGame.spin()" id="spin-btn" class="absolute w-20 h-20 sm:w-24 sm:h-24 bg-white hover:bg-slate-50 border-[6px] border-emerald-400 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.3)] z-20 cursor-pointer font-black text-emerald-600 text-lg hover:scale-105 active:scale-95 transition-all">
                            SPIN
                        </button>
                    </div>
                </div>

                <div id="ww-cards-container" class="hidden w-full h-full flex flex-col justify-center items-center gap-8">
                    <div class="bg-rose-100 text-rose-800 px-4 py-1.5 rounded-full text-xs font-bold shrink-0 shadow-sm border border-rose-200">
                        Tap the deck to deal a random card!
                    </div>
                    <div class="card-pile flex justify-center items-center shrink-0 mt-4">
                        <div class="stacked-card bg-rose-700 border-[3px] border-white/50 transform rotate-6 translate-x-4 translate-y-3"></div>
                        <div class="stacked-card bg-rose-500 border-[3px] border-white/70 transform -rotate-3 -translate-x-3 -translate-y-2"></div>
                        <div id="active-deck-card" class="stacked-card bg-gradient-to-br from-rose-500 to-pink-600 border-4 border-white flex flex-col items-center justify-center text-white cursor-pointer hover:-translate-y-8 hover:rotate-2 transition-all duration-300 z-10 shadow-2xl">
                            <span class="text-7xl drop-shadow-md">🃏</span>
                            <span class="font-black mt-6 text-sm tracking-[0.2em] bg-black/20 px-4 py-1.5 rounded-full">DEAL</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="flex justify-center w-full mt-4 shrink-0 pt-3 border-t border-slate-200">
                <button onclick="app.finishToSummary()" class="bg-slate-800 hover:bg-slate-900 text-white px-8 py-3 rounded-full font-black text-sm shadow-lg transition-transform hover:-translate-y-1 flex items-center gap-2">
                    <span>View Final Report</span> <span class="text-lg">🏆</span>
                </button>
            </div>
        </section>

        <!-- GIGANTIC WORD DISPLAY MODAL OVERLAY -->
        <div id="word-overlay" class="hidden fixed inset-0 bg-slate-900/90 z-50 flex flex-col justify-center items-center p-4 backdrop-blur-sm">
            <div class="giant-word-overlay bg-white rounded-[2.5rem] w-full max-w-3xl max-h-[90vh] p-6 sm:p-10 flex flex-col justify-between items-center shadow-2xl border-4 border-emerald-400 overflow-visible">
                <div class="w-full flex justify-between items-center px-2 shrink-0 mb-4">
                    <span id="revealed-info" class="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-bold text-xs uppercase tracking-wider">Question</span>
                    <button onclick="app.closeOverlay()" class="bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-600 px-3 py-1 rounded-full text-sm font-black transition-colors">✕ Close</button>
                </div>
                <div class="flex-1 flex items-center justify-center w-full py-8 overflow-visible">
                    <span id="giant-arabic-word" class="quran-font text-center text-slate-800 tracking-wide select-text px-2 w-full break-words" style="font-size: clamp(4rem, 12vmin, 8rem); line-height: 1.8;">
                    </span>
                </div>
                <div class="w-full max-w-sm shrink-0 mt-6">
                    <div class="grid grid-cols-2 gap-4">
                        <button onclick="app.gradeResult(false)" class="bg-rose-500 hover:bg-rose-600 text-white py-4 rounded-2xl text-lg shadow-[0_6px_0_#be123c] active:translate-y-1 active:shadow-[0_3px_0_#be123c] transition-all flex items-center justify-center gap-2 font-black">
                            ❌ Missed
                        </button>
                        <button onclick="app.gradeResult(true)" class="bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl text-lg shadow-[0_6px_0_#047857] active:translate-y-1 active:shadow-[0_3px_0_#047857] transition-all flex items-center justify-center gap-2 font-black">
                            ✔ Perfect
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- STAGE 5: FINAL SUMMARY SCREEN -->
        <section id="summary-screen" class="hidden w-full max-w-2xl bg-white rounded-[3rem] p-8 shadow-2xl text-center space-y-6 border-4 border-emerald-100 shrink-0 my-auto z-10">
            <h2 class="text-4xl font-black text-slate-800">Challenge Completed! 🎉</h2>
            <div class="grid grid-cols-2 gap-6 items-center">
                <div class="space-y-3">
                    <span class="text-slate-400 font-bold uppercase text-sm tracking-wider">Points Gathered</span>
                    <div id="final-score" class="text-7xl font-black text-emerald-600 drop-shadow-sm leading-none">0</div>
                </div>
                <div class="flex flex-col items-center">
                    <div class="chart-container"><canvas id="summaryChart"></canvas></div>
                </div>
            </div>
            <div class="flex justify-center pt-4 gap-4">
                <button onclick="app.jumpTo('ww_box')" class="bg-slate-200 text-slate-700 text-lg font-bold py-4 px-8 rounded-full shadow-md hover:bg-slate-300 transition-all">Games Room 🎮</button>
                <button onclick="location.reload()" class="bg-slate-900 text-white text-lg font-bold py-4 px-10 rounded-full shadow-lg hover:bg-black transition-all">Play Again 🔄</button>
            </div>
        </section>

    </main>

    <footer class="text-center text-[10px] text-slate-400 py-1 shrink-0 h-6">
        ${footerText}
    </footer>
    `;

    // Prepend to body before scripts
    const container = document.createElement('div');
    container.className = 'w-full h-full flex flex-col items-center overflow-hidden';
    container.innerHTML = fullHtml;
    document.body.insertBefore(container, document.body.firstChild);
}

const app = {
    idx: 0, score: 0, stats: { ok: 0, err: 0 }, clock: 10.0, timer: null, wordRenderTime: 0,
    hasPlayedGame1: false, hasPlayedGame2: false, hasPlayedGame3: false, currentActiveIndex: null, pendingGame: 0, chartInstance: null,

    init() {
        buildAppUI();
        this.populateSelector();
        this.jumpTo('menu');
        if (typeof xoGame !== 'undefined') xoGame.init();
        if (typeof c4Game !== 'undefined') c4Game.init();
        if (typeof memoryGame !== 'undefined' && document.getElementById('memory-stage')) memoryGame.init();
        if (typeof riddlesGame !== 'undefined' && document.getElementById('riddles-stage')) riddlesGame.init();
        if (typeof wordwallRoom !== 'undefined') wordwallRoom.init();
        if (typeof ruleManager !== 'undefined' && typeof rulesData !== 'undefined' && rulesData.length > 0) ruleManager.init();
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
            let plainWord = item.plain;
            if (!plainWord && item.w) plainWord = item.w.replace(/<[^>]*>?/gm, '').replace(/&zwj;/g, '').replace(/&nbsp;/g, ' ').trim();
            if (!plainWord) plainWord = `Word ${index + 1}`;
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
        const w2 = document.createElement('option'); w2.value = 'ww_wheel'; w2.text = '🎡 Spin The Wheel'; optGroupWW.appendChild(w2);
        const w3 = document.createElement('option'); w3.value = 'ww_cards'; w3.text = '🃏 Random Cards'; optGroupWW.appendChild(w3);
        selector.appendChild(optGroupWW);
        const optGroupEnd = document.createElement('optgroup'); optGroupEnd.label = '🏆 Finish Line';
        const e1 = document.createElement('option'); e1.value = 'summary'; e1.text = '📊 Final Summary'; optGroupEnd.appendChild(e1);
        selector.appendChild(optGroupEnd);
    },

    render() {
        if (typeof dataset === 'undefined' || !dataset[this.idx]) return;
        this.wordRenderTime = Date.now();
        const item = dataset[this.idx];
        const area = document.getElementById('word-display-area');
        const banner = document.getElementById('status-banner');
        const timerBox = document.getElementById('challenge-timer');
        const navSelect = document.getElementById('example-navigator');
        const progText = document.getElementById('progress-text');
        if (navSelect) navSelect.value = `word_${this.idx}`;
        if (progText) progText.innerText = `Card ${this.idx + 1} of ${dataset.length}`;
        if (area) {
            area.innerHTML = '';
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
                area.appendChild(wrap);
            } else {
                const box = document.createElement('div');
                box.className = `letter-box theme-${currentTheme}`;
                box.innerHTML = `<span class="word-wrapper quran-font text-center">${item.w}</span>`;
                area.appendChild(box);
            }
        }
        if (banner) { banner.classList.add('hidden'); banner.classList.remove('pulse-danger'); }
        if (timerBox) timerBox.classList.add('hidden');
        clearInterval(this.timer);
        if (item.t === 'golden') {
            Sound.golden();
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
            this.showBadge(randomFeedback, '#10b981', true);
            const third1 = Math.floor(dataset.length / 3) - 1;
            const third2 = Math.floor((dataset.length * 2) / 3) - 1;
            if (this.idx === third1 && !this.hasPlayedGame1) {
                setTimeout(() => this.jumpTo('transition_1'), 600);
            } else if (this.idx === third2 && !this.hasPlayedGame2) {
                setTimeout(() => this.jumpTo('transition_2'), 600);
            } else if (this.idx === dataset.length - 1 && !this.hasPlayedGame3) {
                setTimeout(() => this.jumpTo('transition_3'), 600);
            } else {
                if (this.idx < dataset.length - 1) { this.idx++; setTimeout(() => this.render(), 600); }
                else { setTimeout(() => this.playWordwall(), 600); }
            }
        } else {
            this.stats.err++;
            let points = (type === 'danger') ? -5 : -2;
            this.score += points; if (this.score < 0) this.score = 0;
            this.showBadge('Try Again! 🔄', '#f43f5e', false);
        }
        const scoreEl = document.getElementById('score-val'); if (scoreEl) scoreEl.innerText = this.score;
    },

    prev() { if (this.idx > 0) { this.idx--; this.render(); } },

    showBadge(txt, color, playSound = false) {
        if (playSound) { playCelebrationSound(); if (typeof confetti === 'function') confetti({ particleCount: 40, spread: 50, origin: { y: 0.2 } }); }
        const badge = document.getElementById('badge-ui'); if (!badge) return;
        badge.innerText = txt; badge.style.color = color; badge.style.borderColor = color; badge.classList.add('active'); badge.style.opacity = '1';
        setTimeout(() => { badge.classList.remove('active'); badge.style.opacity = '0'; }, 1200);
    },

    triggerFeedback(txt, color, playSound = false) { this.showBadge(txt, color, playSound); },

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
            if (item.segs && Array.isArray(item.segs)) {
                const colorClasses = ['c-red', 'c-blue', 'c-black'];
                giantSpan.innerHTML = '<div style="display:flex;flex-direction:row-reverse;justify-content:center;align-items:center;gap:0.2em;flex-wrap:wrap; padding: 10px 0;">' +
                    item.segs.map((ch, i) => `<span class="quran-font ${colorClasses[i % 3]}" style="display:inline-block; padding:0.2em 0.1em; line-height: 1.5;">${ch}</span>`).join('') + '</div>';
            } else {
                giantSpan.innerHTML = item.w;
            }
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
        const summary = document.getElementById('summary-screen'); if (summary) summary.classList.remove('hidden');
        const finalScore = document.getElementById('final-score'); if (finalScore) finalScore.innerText = this.score;
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
        container.innerHTML = '';
        dataset.forEach((item, index) => {
            const box = document.createElement('div');
            box.className = `wordwall-box relative aspect-square w-full flex items-center justify-center rounded-2xl ${this.openedBoxes.has(index) ? 'opened opacity-50 grayscale-[50%]' : ''}`;
            box.id = `box-${index}`;
            const color = wordwallColors[index % wordwallColors.length];
            box.innerHTML = `
                <div class="wordwall-box-inner relative w-full h-full duration-500">
                    <div class="box-front rounded-2xl flex flex-col items-center justify-center text-white border-[3px] border-white/40 shadow-lg hover:scale-105 transition-transform" style="background-color: ${color}">
                        <span class="text-4xl sm:text-5xl lg:text-6xl font-black drop-shadow-md">${index + 1}</span>
                        <span class="text-[10px] sm:text-xs font-bold uppercase tracking-wider mt-2 bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">Open</span>
                    </div>
                    <div class="box-back rounded-2xl flex items-center justify-center text-slate-400 bg-slate-100 border-[3px] border-slate-300 shadow-inner"><span class="text-4xl">✔</span></div>
                </div>`;
            box.onclick = () => { if (!this.openedBoxes.has(index)) app.revealWord(index, 'box'); };
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
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save(); this.ctx.translate(radius, radius); this.ctx.rotate(this.angle);
        for (let i = 0; i < numSlices; i++) {
            this.ctx.beginPath(); this.ctx.moveTo(0, 0); this.ctx.arc(0, 0, radius - 8, i * sliceAngle, (i + 1) * sliceAngle); this.ctx.closePath();
            this.ctx.fillStyle = wordwallColors[i % wordwallColors.length]; this.ctx.fill(); this.ctx.lineWidth = 2; this.ctx.strokeStyle = '#ffffff'; this.ctx.stroke();
            this.ctx.save(); this.ctx.rotate(i * sliceAngle + sliceAngle / 2); this.ctx.fillStyle = '#ffffff'; this.ctx.font = 'bold 18px Fredoka'; this.ctx.textAlign = 'right'; this.ctx.fillText((i + 1).toString(), radius - 25, 6); this.ctx.restore();
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

const xoGame = {
    board: ['', '', '', '', '', '', '', '', ''], currentPlayer: 'X', gameActive: true,
    init() {
        const container = document.getElementById('xo-board'); if (!container) return; container.innerHTML = '';
        for (let i = 0; i < 9; i++) { let cell = document.createElement('div'); cell.className = 'xo-cell-new'; cell.onclick = () => this.play(i, cell); container.appendChild(cell); }
    },
    play(idx, cell) {
        if (this.board[idx] !== '' || !this.gameActive) return;
        this.board[idx] = this.currentPlayer; cell.innerText = this.currentPlayer; cell.classList.add(this.currentPlayer === 'X' ? 'xo-x' : 'xo-o');
        let winLine = this.checkWin();
        if (winLine) {
            const status = document.getElementById('xo-status'); if (status) { status.innerText = `${this.currentPlayer} Won! 🎉`; status.classList.add('text-yellow-300'); }
            this.gameActive = false; fireCelebration();
            let resumeBtn = document.getElementById('xo-resume-btn');
            if (resumeBtn) { resumeBtn.innerHTML = "Continue Reading 📖"; resumeBtn.classList.add('animate-bounce', 'bg-emerald-400', 'text-white'); resumeBtn.classList.remove('bg-yellow-400', 'text-teal-900'); }
            const container = document.getElementById('xo-board');
            if (container) { const cells = container.children; winLine.forEach(i => { if (cells[i]) cells[i].classList.add('win-anim'); }); }
            return;
        }
        if (!this.board.includes('')) {
            const status = document.getElementById('xo-status'); if (status) status.innerText = "Draw Game! 🤝";
            this.gameActive = false; return;
        }
        this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
        const status = document.getElementById('xo-status'); if (status) { status.innerText = `Player ${this.currentPlayer} Turn`; status.classList.remove('text-yellow-300'); }
    },
    checkWin() {
        const winCond = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
        for (let comb of winCond) { if (this.board[comb[0]] && this.board[comb[0]] === this.board[comb[1]] && this.board[comb[1]] === this.board[comb[2]]) return comb; }
        return null;
    },
    reset() {
        this.board = ['', '', '', '', '', '', '', '', '']; this.currentPlayer = 'X'; this.gameActive = true;
        const status = document.getElementById('xo-status'); if (status) { status.innerText = 'Player X Turn!'; status.classList.remove('text-yellow-300'); }
        let resumeBtn = document.getElementById('xo-resume-btn');
        if (resumeBtn) { resumeBtn.innerHTML = "Skip & Read ⏭️"; resumeBtn.classList.remove('animate-bounce', 'bg-emerald-400', 'text-white'); resumeBtn.classList.add('bg-yellow-400', 'text-teal-900'); }
        this.init();
    }
};

const c4Game = {
    rows: 6, cols: 7, board: [], currentPlayer: 'red', gameActive: true,
    init() {
        const container = document.getElementById('c4-board-container'); if (!container) return; container.innerHTML = '';
        this.board = Array(this.rows).fill(null).map(() => Array(this.cols).fill(null));
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                let cell = document.createElement('div'); cell.className = 'c4-cell-new'; cell.id = `c4-${r}-${c}`; cell.onclick = () => this.drop(c); container.appendChild(cell);
            }
        }
    },
    drop(col) {
        if (!this.gameActive) return;
        for (let r = this.rows - 1; r >= 0; r--) {
            if (!this.board[r][col]) {
                this.board[r][col] = this.currentPlayer;
                let cell = document.getElementById(`c4-${r}-${col}`);
                if (cell) {
                    let piece = document.createElement('div'); piece.className = `absolute inset-0 rounded-full w-full h-full ${this.currentPlayer === 'red' ? 'c4-red-new' : 'c4-yellow-new'}`; cell.appendChild(piece);
                }
                let winCells = this.checkWin(r, col);
                if (winCells) {
                    let colorName = this.currentPlayer === 'red' ? 'Red 🔴' : 'Yellow 🟡';
                    const status = document.getElementById('c4-status'); if (status) status.innerHTML = `<span class="text-yellow-300">${colorName} Wins! 🎉</span>`;
                    this.gameActive = false;
                    let resumeBtn = document.getElementById('c4-resume-btn');
                    if (resumeBtn) { resumeBtn.innerHTML = "Continue Reading 📖"; resumeBtn.classList.add('animate-bounce', 'bg-emerald-400', 'text-white'); resumeBtn.classList.remove('bg-yellow-400', 'text-blue-900'); }
                    setTimeout(() => {
                        fireCelebration();
                        winCells.forEach(([wr, wc]) => {
                            const cEl = document.getElementById(`c4-${wr}-${wc}`); if (cEl && cEl.firstElementChild) cEl.firstElementChild.classList.add('win-anim');
                        });
                    }, 500);
                    return;
                }
                this.currentPlayer = this.currentPlayer === 'red' ? 'yellow' : 'red';
                let nextColorName = this.currentPlayer === 'red' ? 'Red 🔴' : 'Yellow 🟡';
                const status = document.getElementById('c4-status'); if (status) status.innerText = `${nextColorName}'s Turn`;
                return;
            }
        }
    },
    checkWin(r, c) {
        const color = this.board[r][c];
        const check = (dr, dc) => {
            let count = 0; let winningCells = [];
            for (let i = -3; i <= 3; i++) {
                let nr = r + i * dr, nc = c + i * dc;
                if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols && this.board[nr][nc] === color) {
                    winningCells.push([nr, nc]); count++; if (count >= 4) return winningCells.slice(-4);
                } else { count = 0; winningCells = []; }
            }
            return null;
        };
        return check(0, 1) || check(1, 0) || check(1, 1) || check(1, -1);
    },
    reset() {
        this.currentPlayer = 'red'; this.gameActive = true;
        const status = document.getElementById('c4-status'); if (status) status.innerText = `Your Turn! Drop a red piece`;
        let resumeBtn = document.getElementById('c4-resume-btn');
        if (resumeBtn) { resumeBtn.innerHTML = "Skip & Read ⏭️"; resumeBtn.classList.remove('animate-bounce', 'bg-emerald-400', 'text-white'); resumeBtn.classList.add('bg-yellow-400', 'text-blue-900'); }
        this.init();
    }
};

const memoryGame = {
    iconSets: [
        ['🍎', '🍌', '🍉', '🍇', '🍓', '🥑', '🥕', '🌽'],
        ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼'],
        ['🚗', '🚕', '🚙', '🚌', '🚓', '🚑', '🚒', '🚜'],
        ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏐', '🎱'],
        ['🌞', '🌝', '🌛', '🌜', '🌙', '⭐', '🌟', '☄️']
    ],
    currentSetIndex: 0, cards: [], hasFlippedCard: false, lockBoard: false, firstCard: null, secondCard: null, matchedPairs: 0, gameActive: true,
    init() {
        this.cards = [...this.iconSets[this.currentSetIndex], ...this.iconSets[this.currentSetIndex]];
        this.shuffleCards(); this.renderBoard();
        this.matchedPairs = 0; this.hasFlippedCard = false; this.lockBoard = false; this.firstCard = null; this.secondCard = null; this.gameActive = true;
        const status = document.getElementById('memory-status'); if (status) { status.innerHTML = "Find all matching pairs! 🧠"; status.classList.remove('text-yellow-300'); }
        let resumeBtn = document.getElementById('memory-resume-btn');
        if (resumeBtn) { resumeBtn.innerHTML = "Skip to Wordwall ⏭️"; resumeBtn.classList.remove('animate-bounce', 'bg-emerald-400', 'text-white'); resumeBtn.classList.add('bg-yellow-400', 'text-purple-900'); }
    },
    shuffleCards() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1)); [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    },
    renderBoard() {
        const board = document.getElementById('memory-board'); if (!board) return; board.innerHTML = '';
        this.cards.forEach((icon) => {
            const scene = document.createElement('div'); scene.className = 'mem-scene';
            const card = document.createElement('div'); card.className = 'mem-card'; card.dataset.icon = icon; card.onclick = () => this.flipCard(card);
            const front = document.createElement('div'); front.className = 'mem-face mem-face-front'; front.innerText = '❓';
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
            const status = document.getElementById('memory-status'); if (status) { status.innerHTML = "🏆 Fantastic! You matched them all!"; status.classList.add('text-yellow-300'); }
            fireCelebration();
            let resumeBtn = document.getElementById('memory-resume-btn');
            if (resumeBtn) { resumeBtn.innerHTML = "Wordwall Games 🎡"; resumeBtn.classList.add('animate-bounce', 'bg-emerald-400', 'text-white'); resumeBtn.classList.remove('bg-yellow-400', 'text-purple-900'); }
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
        { q: "What speaks all languages in the world but has no tongue?", opts: ["A telephone", "An echo", "A book", "A flag"], ans: 1 },
        { q: "What gets larger the more you take away from it, and smaller if you add to it?", opts: ["A hole", "Time", "Age", "Money"], ans: 0 },
        { q: "What has many teeth but cannot bite?", opts: ["A crocodile", "A saw", "A comb", "A key"], ans: 2 }
    ],
    init() { this.idx = 0; },
    reset() {
        this.init();
        let resumeBtn = document.getElementById('riddles-resume-btn');
        if (resumeBtn) { resumeBtn.innerHTML = "Skip to Wordwall ⏭️"; resumeBtn.classList.remove('animate-bounce', 'bg-emerald-400', 'text-white'); resumeBtn.classList.add('bg-yellow-400', 'text-purple-900'); }
        this.loadNext();
    },
    loadNext() {
        if (this.idx >= this.data.length) {
            fireCelebration();
            const qEl = document.getElementById('riddle-question'); if (qEl) qEl.innerText = "🏆 Unbelievable! You solved all the riddles and earned the Quran Genius Badge!";
            const optsDiv = document.getElementById('riddle-options'); if (optsDiv) optsDiv.innerHTML = '';
            let resumeBtn = document.getElementById('riddles-resume-btn');
            if (resumeBtn) { resumeBtn.innerHTML = "Wordwall Room 🎡"; resumeBtn.classList.add('animate-bounce', 'bg-emerald-400', 'text-white'); resumeBtn.classList.remove('bg-yellow-400', 'text-purple-900'); }
            return;
        }
        const riddle = this.data[this.idx];
        const qEl = document.getElementById('riddle-question'); if (qEl) qEl.innerText = riddle.q;
        const optsDiv = document.getElementById('riddle-options'); if (optsDiv) optsDiv.innerHTML = '';
        const fbEl = document.getElementById('riddle-feedback'); if (fbEl) fbEl.innerText = '';
        if (optsDiv) {
            riddle.opts.forEach((opt, i) => {
                let btn = document.createElement('button');
                btn.className = "bg-white/20 hover:bg-white/30 text-xl font-bold py-5 rounded-2xl shadow-md transition-all active:scale-95 text-left px-6 flex justify-between items-center";
                btn.innerHTML = `<span>${opt}</span><span class="text-sm opacity-55">Option ${i + 1}</span>`;
                btn.onclick = () => this.check(i, btn);
                optsDiv.appendChild(btn);
            });
        }
    },
    check(selectedIdx, btn) {
        const correctIdx = this.data[this.idx].ans;
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

const ruleManager = {
    step: 0,
    init() { this.step = 0; this.render(); },
    render() {
        if (typeof rulesData === 'undefined' || rulesData.length === 0) return;
        const data = rulesData[this.step];
        const indicator = document.getElementById('rule-step-indicator');
        if (indicator) indicator.innerText = rulesData.length === 1 ? 'LESSON RULE' : `RULE ${this.step + 1} OF ${rulesData.length}`;
        const titleEl = document.getElementById('rule-title'); if (titleEl) titleEl.innerText = data.title;
        const descEl = document.getElementById('rule-desc'); if (descEl) descEl.innerText = data.desc;
        const bigText = document.getElementById('rule-big-text'); if (bigText) bigText.innerHTML = data.html;
        const prevBtn = document.getElementById('rule-prev-btn');
        if (prevBtn) { if (this.step > 0) prevBtn.classList.remove('hidden'); else prevBtn.classList.add('hidden'); }
        const nextBtn = document.getElementById('rule-next-btn');
        if (nextBtn) {
            if (this.step === rulesData.length - 1) {
                nextBtn.innerText = "Start Challenge! 🚀";
                nextBtn.className = "bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black py-4 px-8 rounded-2xl text-sm transition-transform active:scale-95 shadow-lg flex-1 animate-pulse";
            } else {
                nextBtn.innerText = "Next Rule ➡";
                nextBtn.className = "bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 px-8 rounded-2xl text-sm transition-transform active:scale-95 shadow-md flex-1";
            }
        }
    },
    next() {
        if (typeof rulesData === 'undefined') return;
        if (this.step < rulesData.length - 1) { this.step++; this.render(); }
        else { app.startChallenge(); }
    },
    prev() {
        if (this.step > 0) { this.step--; this.render(); }
    }
};

window.onload = () => { app.init(); };
