function buildAppUI() {
    if (document.getElementById('learning-stage')) return; // Already exists

    const cfg = window.PAGE_CONFIG || {};
    const title = cfg.title || document.title || 'Nour Al-Bayan';
    const subtitle = cfg.subtitle || 'Harakat & Reading Practice';
    const footerText = cfg.footer || 'Nour Al-Bayan Learning System';
    const hasRules = (typeof rulesData !== 'undefined' && rulesData.length > 0) || (cfg.rules && cfg.rules.length > 0);
    const game3Type = cfg.game3 || (document.getElementById('riddles-stage') || typeof riddlesGame !== 'undefined' ? 'riddles' : (hasRules ? 'riddles' : 'memory'));

    const rulesButtonHtml = hasRules ? `
        <button onclick="app.jumpTo('rules')" class="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3.5 px-6 rounded-[1.5rem] text-lg shadow-[0_4px_0_#3730a3] active:translate-y-1 active:shadow-none transition-all flex items-center justify-between">
            <span class="flex items-center gap-2">📖 <span>Lesson Rules</span></span>
            <span class="text-xl">➡</span>
        </button>` : '';

    const ruleStageHtml = hasRules ? `
        <!-- STAGE 0: LESSON RULES -->
        <section id="rule-stage" class="hidden w-full h-full flex flex-col justify-center items-center gap-4 py-4 overflow-hidden shrink-0">
            <div class="text-center shrink-0">
                <span id="rule-step-indicator" class="text-xs font-bold text-emerald-600 bg-emerald-100 px-3.5 py-1 rounded-full uppercase tracking-wider">LESSON RULE</span>
                <h2 id="rule-title" class="text-2xl sm:text-3xl font-black text-slate-800 mt-2">Rule Title</h2>
                <p id="rule-desc" class="text-sm sm:text-base text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">Description of current rule</p>
            </div>
            <div class="w-full max-w-3xl bg-white border-4 sm:border-8 border-emerald-400 rounded-[2.5rem] shadow-xl p-6 flex flex-col justify-center items-center h-[38vh] min-h-[200px] max-h-[340px]">
                <span id="rule-big-text" class="quran-font text-center text-slate-800 leading-normal tracking-wide select-text px-4 w-full break-words" style="font-size: clamp(3rem, 10vh, 6.5rem);">
                    Rule Content
                </span>
            </div>
            <div class="flex justify-center gap-4 w-full max-w-sm mt-3 shrink-0">
                <button id="rule-prev-btn" onclick="ruleManager.prev()" class="hidden bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3.5 px-6 rounded-2xl text-sm transition-colors shadow-sm">
                    ⬅ Back
                </button>
                <button id="rule-next-btn" onclick="ruleManager.next()" class="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black py-4 px-8 rounded-2xl text-sm shadow-[0_4px_0_#047857] active:translate-y-1 active:shadow-none transition-all flex-1">
                    Start Challenge! 🚀
                </button>
            </div>
        </section>` : '';

    const game3StageHtml = (game3Type === 'riddles') ? `
        <!-- STAGE 3C: MIDPOINT GAME 3 (SECRET RIDDLES) -->
        <section id="riddles-stage" class="hidden w-full h-full flex flex-col justify-center items-center text-center p-4 sm:p-6 rounded-[2.5rem] shadow-2xl text-white bg-gradient-to-b from-indigo-900 to-purple-900 shrink-0 z-10">
            <h2 class="text-3xl sm:text-4xl font-black text-amber-400 mt-2">👑 Secret Riddles Box 👑</h2>
            <div id="riddle-container" class="bg-white/10 p-5 rounded-3xl backdrop-blur-sm border border-white/20 min-h-[180px] w-full max-w-2xl flex flex-col justify-center gap-4 mt-3">
                <p id="riddle-question" class="text-lg sm:text-2xl font-bold leading-normal"></p>
                <div id="riddle-options" class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3"></div>
            </div>
            <p id="riddle-feedback" class="text-lg sm:text-xl font-bold h-8 text-emerald-400 mt-3"></p>
            <div class="flex flex-wrap justify-center gap-3 w-full mt-2 max-w-md">
                <button onclick="riddlesGame.reset()" class="bg-purple-800/40 hover:bg-purple-800/60 border border-purple-400/30 text-white px-6 py-2.5 rounded-full font-bold text-sm backdrop-blur-sm">Reset 🔄</button>
                <button id="riddles-resume-btn" onclick="app.resume(3)" class="bg-yellow-400 hover:bg-yellow-300 text-purple-900 px-8 py-2.5 rounded-full font-black text-sm shadow-md transition transform hover:-translate-y-0.5">Skip to Wordwall ⏭️</button>
            </div>
        </section>` : `
        <!-- STAGE 3C: MIDPOINT GAME 3 (MEMORY MATCH) -->
        <section id="memory-stage" class="hidden w-full h-full flex flex-col justify-center items-center text-center p-4 rounded-[2.5rem] shadow-2xl text-white bg-gradient-to-br from-indigo-800 to-purple-900 relative overflow-hidden shrink-0 z-10">
            <h2 class="text-2xl sm:text-3xl font-black text-amber-400 drop-shadow-md mt-1">Memory Match 🧠</h2>
            <div id="memory-board" class="mem-board mt-3"></div>
            <div class="bg-black/20 py-1.5 px-6 rounded-full inline-block backdrop-blur-sm border border-white/10 shadow-sm mt-3">
                <h3 id="memory-status" class="text-xs sm:text-sm font-bold text-white tracking-wide">Find all matching pairs!</h3>
            </div>
            <div class="flex flex-wrap justify-center gap-3 w-full mt-4 max-w-md">
                <button onclick="memoryGame.reset()" class="bg-purple-800/40 hover:bg-purple-800/60 border border-purple-400/30 text-white px-6 py-2.5 rounded-full font-bold text-sm backdrop-blur-sm">Reset 🔄</button>
                <button id="memory-resume-btn" onclick="app.resume(3)" class="bg-yellow-400 hover:bg-yellow-300 text-purple-900 px-8 py-2.5 rounded-full font-black text-sm shadow-md transition transform hover:-translate-y-0.5">Skip to Wordwall ⏭️</button>
            </div>
        </section>`;

    const fullHtml = `
    <!-- Interactive Feedback Badge -->
    <div id="badge-ui" class="feedback-badge bg-white shadow-xl px-8 py-3 rounded-full text-2xl sm:text-3xl font-black border-4 border-emerald-400 whitespace-nowrap"></div>

    <!-- Navigation Header with Interactive Progress Bar -->
    <header id="top-nav" class="w-full bg-white/95 backdrop-blur-sm border-b border-slate-200/80 px-3 sm:px-6 py-2 flex justify-between items-center shadow-sm shrink-0 z-30 relative">
        <div id="progress-bar" style="width: 0%;"></div>
        <div class="w-full max-w-5xl mx-auto flex justify-between items-center gap-2">
            <!-- Score & Timer Pill -->
            <div class="flex items-center gap-2 sm:gap-3">
                <div class="flex items-center gap-2 bg-emerald-50/80 border border-emerald-200 px-3 py-1 rounded-full shadow-inner">
                    <span class="text-slate-400 text-[10px] sm:text-xs font-black uppercase tracking-wider">Score</span>
                    <span id="score-val" class="text-base sm:text-lg font-black text-emerald-600 leading-none" aria-live="polite" aria-label="Current score">0</span>
                </div>
                <div id="challenge-timer" class="hidden bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-mono font-bold text-xs shadow-inner">
                    ⏱ <span id="timer-val">10.0</span>s
                </div>
            </div>

            <!-- Teacher Manual Feedback Triggers -->
            <div class="flex items-center gap-1 sm:gap-1.5 bg-slate-50 px-2 sm:px-2.5 py-1 rounded-full border border-slate-200">
                <button onclick="app.triggerFeedback('⭐', '#f59e0b', true)" class="p-1 sm:p-1.5 bg-amber-100 text-amber-500 rounded-full hover:bg-amber-200 hover:scale-110 transition-all shadow-sm text-base sm:text-lg leading-none" aria-label="Star praise" title="Star">⭐</button>
                <button onclick="app.triggerFeedback('❤️', '#ef4444', true)" class="p-1 sm:p-1.5 bg-rose-100 text-rose-500 rounded-full hover:bg-rose-200 hover:scale-110 transition-all shadow-sm text-base sm:text-lg leading-none" aria-label="Heart praise" title="Heart">❤️</button>
                <div class="w-px h-4 bg-slate-200 mx-0.5"></div>
                <button onclick="app.triggerFeedback('Perfect! 🌟', '#8b5cf6', true)" class="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-md font-black text-[10px] sm:text-xs hover:bg-purple-200 transition-colors" aria-label="Perfect praise">Perfect</button>
                <button onclick="app.triggerFeedback('Excellent! 🏆', '#10b981', true)" class="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md font-black text-[10px] sm:text-xs hover:bg-emerald-200 transition-colors" aria-label="Excellent praise">Excellent</button>
            </div>

            <!-- Dropdown Navigator -->
            <div id="selector-wrapper" class="flex items-center bg-slate-50 px-2 sm:px-3 py-1 rounded-full border border-slate-200 max-w-[130px] sm:max-w-[200px]">
                <select id="example-navigator" onchange="app.jumpTo(this.value)" class="bg-transparent text-emerald-700 font-bold text-xs sm:text-sm outline-none cursor-pointer w-full text-center truncate" aria-label="Lesson section navigator">
                </select>
            </div>
        </div>
    </header>

    <main class="flex-1 w-full max-w-5xl px-3 sm:px-4 flex flex-col justify-center items-center overflow-hidden relative">

        <!-- STAGE -1: MAIN MENU -->
        <section id="main-menu-stage" class="w-full h-full flex flex-col justify-center items-center gap-4 sm:gap-5 py-4 overflow-y-auto shrink-0 custom-scrollbar">
            <div class="text-center">
                <h1 class="text-4xl sm:text-5xl md:text-6xl font-black text-emerald-600 drop-shadow-sm mb-1 sm:mb-2">${title}</h1>
                <p class="text-slate-500 font-bold text-sm sm:text-base md:text-lg">${subtitle}</p>
            </div>

            <!-- Developer & Dedication Card -->
            <div class="w-full max-w-sm sm:max-w-md bg-white border-2 border-emerald-200/90 rounded-[2rem] p-4 sm:p-5 shadow-sm text-left relative overflow-hidden">
                <div class="space-y-1 text-xs sm:text-sm text-slate-600 font-medium">
                    <p><span class="text-slate-400">Developed by:</span> <strong class="text-slate-800 font-black">Sheikh Gehad Elsayad</strong></p>
                    <p><span class="text-slate-400">Phone / WhatsApp:</span> <strong class="text-slate-800 font-black tracking-wide">01147992249</strong></p>
                </div>
                <hr class="my-2.5 border-slate-100">
                <div class="space-y-1">
                    <p class="text-[11px] sm:text-xs text-slate-400 italic">Please pray for my father and brother Mohammed (RIP)</p>
                    <p class="text-xs sm:text-sm text-slate-600 font-bold leading-relaxed text-center" style="font-family: 'Amiri', 'Traditional Arabic', serif; direction: rtl;">نسألكم الدعاء لوالدي ولأخي محمد رحمهما الله</p>
                </div>
            </div>

            <!-- Menu Action Buttons -->
            <div class="grid grid-cols-1 gap-3 w-full max-w-sm sm:max-w-md px-2">
                ${rulesButtonHtml}
                <button onclick="app.jumpTo('word_0')" class="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black py-4 px-6 rounded-[1.5rem] text-xl shadow-[0_5px_0_#047857] active:translate-y-[5px] active:shadow-none transition-all flex items-center justify-between">
                    <span class="flex items-center gap-2">🚀 <span>Start Challenge</span></span>
                    <span class="text-2xl">➡</span>
                </button>
                <button onclick="app.jumpTo('ww_box')" class="bg-white border-4 border-amber-400 hover:bg-amber-50 text-amber-500 font-black py-3.5 px-6 rounded-[1.5rem] text-lg shadow-[0_5px_0_#d97706] active:translate-y-[5px] active:shadow-none transition-all flex items-center justify-between">
                    <span class="flex items-center gap-2">🎡 <span>Word Games</span></span>
                    <span class="text-2xl">➡</span>
                </button>
            </div>
        </section>

        ${ruleStageHtml}

        <!-- STAGE 0.5: GAME TRANSITION -->
        <section id="game-transition-stage" class="hidden w-full h-full flex flex-col justify-center items-center text-center p-6 rounded-[2.5rem] shadow-xl text-white bg-gradient-to-br from-indigo-500 to-purple-600 relative overflow-hidden shrink-0 z-20">
            <h2 class="text-3xl sm:text-5xl font-black text-yellow-300 drop-shadow-md mb-3 animate-bounce">Amazing Job! 🌟</h2>
            <p class="text-lg sm:text-2xl font-bold text-white mb-6">You are an excellent student!<br>You deserve a game break!</p>
            <div class="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full max-w-md">
                <button id="btn-play-game" class="flex-1 bg-yellow-400 hover:bg-yellow-300 text-indigo-900 py-3.5 sm:py-4 rounded-2xl text-lg font-black shadow-[0_5px_0_#ca8a04] active:translate-y-[5px] active:shadow-none transition-all">
                    🎮 Play <span id="transition-game-name">Game</span>
                </button>
                <button id="btn-skip-game" onclick="app.skipGameAndResume()" class="flex-1 bg-white/20 hover:bg-white/30 text-white border-2 border-white/50 py-3.5 sm:py-4 rounded-2xl text-lg font-bold transition-all backdrop-blur-sm">
                    ⏭️ Skip & Read
                </button>
            </div>
        </section>

        <!-- STAGE 1: LEARNING / READING CHALLENGE -->
        <section id="learning-stage" class="hidden w-full flex flex-col justify-between items-center gap-2 py-2 flex-1 overflow-hidden relative">
            <div class="w-full max-w-4xl flex justify-between items-center px-4 shrink-0 h-8">
                <span id="progress-text" class="text-slate-400 font-black text-xs sm:text-sm tracking-widest uppercase">Card 1</span>
                <div id="status-banner" class="text-center py-1 px-4 rounded-full font-bold text-white shadow-md hidden text-xs uppercase tracking-wide"></div>
            </div>

            <div class="flex-1 flex items-center justify-center w-full px-2 py-1 overflow-hidden" id="word-display-area"></div>

            <div class="w-full max-w-md sm:max-w-lg space-y-2 shrink-0 pb-3 px-2">
                <div class="grid grid-cols-2 gap-3 sm:gap-4">
                    <button onclick="app.evaluate(false)" class="bg-rose-500 hover:bg-rose-600 text-white py-3.5 sm:py-4 rounded-[1.75rem] text-lg sm:text-xl shadow-[0_5px_0_#be123c] active:translate-y-[5px] active:shadow-none transition-all flex items-center justify-center gap-2 font-black">
                        ❌ Incorrect
                    </button>
                    <button onclick="app.evaluate(true)" class="bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 sm:py-4 rounded-[1.75rem] text-lg sm:text-xl shadow-[0_5px_0_#047857] active:translate-y-[5px] active:shadow-none transition-all flex items-center justify-center gap-2 font-black">
                        ✔ Correct
                    </button>
                </div>
                <div class="flex justify-center pt-1">
                    <button onclick="app.prev()" class="bg-slate-200/90 hover:bg-slate-300 text-slate-600 py-1.5 px-5 rounded-full text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5">
                        <span>⬅</span> <span>Previous Card</span>
                    </button>
                </div>
            </div>
        </section>

        <!-- STAGE 2: MIDPOINT GAME 1 (TIC-TAC-TOE) -->
        <section id="xo-stage" class="hidden w-full h-full flex flex-col justify-center items-center text-center p-2 sm:p-4 rounded-[2.5rem] text-white bg-gradient-to-br from-teal-600 via-emerald-600 to-green-700 relative overflow-hidden shrink-0 z-10">
            <div class="relative z-10 flex flex-col items-center justify-center h-full w-full max-w-3xl gap-2 sm:gap-4">
                <h2 class="text-3xl sm:text-4xl font-black text-yellow-300 drop-shadow-md">Tic-Tac-Toe! 🎮</h2>
                <div class="xo-board-container mt-1">
                    <div id="xo-board" class="grid grid-cols-3 gap-2.5 sm:gap-3 bg-white/20 p-3 sm:p-4 rounded-[2rem] backdrop-blur-md shadow-inner border border-white/25 w-full h-full"></div>
                </div>
                <div class="bg-black/20 py-1.5 px-6 rounded-full inline-block backdrop-blur-sm border border-white/10 shadow-sm mt-1">
                    <h3 id="xo-status" class="text-sm sm:text-base font-bold text-white tracking-wide">Player X Turn!</h3>
                </div>
                <div class="flex flex-wrap justify-center gap-3 w-full mt-2">
                    <button onclick="xoGame.reset()" class="bg-white/20 hover:bg-white/30 text-white border border-white/30 px-6 py-2.5 rounded-full font-bold text-sm transition-transform hover:scale-105 backdrop-blur-sm">Reset 🔄</button>
                    <button id="xo-resume-btn" onclick="app.resume(1)" class="bg-yellow-400 hover:bg-yellow-300 text-teal-900 px-8 py-2.5 rounded-full font-black text-sm shadow-md transform transition hover:-translate-y-0.5">Skip & Read ⏭️</button>
                </div>
            </div>
        </section>

        <!-- STAGE 3B: MIDPOINT GAME 2 (CONNECT 4) -->
        <section id="c4-stage" class="hidden w-full h-full flex flex-col justify-center items-center text-center p-3 sm:p-4 rounded-[2.5rem] shadow-xl text-white bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-700 relative overflow-hidden shrink-0 z-10">
            <div class="relative z-10 flex flex-col items-center gap-2 sm:gap-3">
                <h2 class="text-2xl sm:text-3xl font-black text-yellow-300 drop-shadow-md">Connect 4 🔴🟡</h2>
                <div id="c4-board-container" class="c4-board-new grid-cols-7 mx-auto mt-1"></div>
                <div class="bg-black/20 py-1.5 px-6 rounded-full inline-block backdrop-blur-sm border border-white/10 shadow-sm mt-2">
                    <h3 id="c4-status" class="text-xs sm:text-sm font-bold text-white tracking-wide">Select any column</h3>
                </div>
                <div class="flex flex-wrap justify-center gap-3 w-full mt-3">
                    <button onclick="c4Game.reset()" class="bg-blue-800/40 hover:bg-blue-800/60 border border-blue-400/30 text-white px-6 py-2.5 rounded-full font-bold text-sm backdrop-blur-sm">Reset 🔄</button>
                    <button id="c4-resume-btn" onclick="app.resume(2)" class="bg-yellow-400 hover:bg-yellow-300 text-blue-900 px-8 py-2.5 rounded-full font-black text-sm shadow-md transition transform hover:-translate-y-0.5">Skip & Read ⏭️</button>
                </div>
            </div>
        </section>

        ${game3StageHtml}

        <!-- STAGE 4: WORDWALL PLAYROOM -->
        <section id="wordwall-stage" class="hidden w-full h-full flex flex-col items-center py-3 px-2 overflow-hidden bg-slate-50 rounded-3xl border border-slate-200 shadow-inner">
            <div class="w-full max-w-4xl flex flex-col sm:flex-row justify-between items-center mb-3 shrink-0 gap-3 px-3">
                <h2 class="text-xl sm:text-2xl font-black text-emerald-600 drop-shadow-sm flex items-center gap-2">
                    <span>🎡</span> Games Room
                </h2>
                <nav class="bg-white p-1 rounded-2xl shadow-sm border border-slate-200 flex gap-1.5">
                    <button onclick="wordwallRoom.switchMode('box')" id="tab-box" class="game-tab active py-1.5 px-3.5 rounded-xl font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 flex items-center justify-center gap-1.5 text-xs sm:text-sm border border-transparent">
                        <span class="text-base sm:text-lg">🎁</span> <span class="hidden sm:inline">Box</span>
                    </button>
                    <button onclick="wordwallRoom.switchMode('wheel')" id="tab-wheel" class="game-tab py-1.5 px-3.5 rounded-xl font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 flex items-center justify-center gap-1.5 text-xs sm:text-sm border border-transparent">
                        <span class="text-base sm:text-lg">🎡</span> <span class="hidden sm:inline">Wheel</span>
                    </button>
                    <button onclick="wordwallRoom.switchMode('cards')" id="tab-cards" class="game-tab py-1.5 px-3.5 rounded-xl font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 flex items-center justify-center gap-1.5 text-xs sm:text-sm border border-transparent">
                        <span class="text-base sm:text-lg">🃏</span> <span class="hidden sm:inline">Cards</span>
                    </button>
                </nav>
            </div>

            <div class="flex-1 w-full flex flex-col items-center justify-center overflow-hidden relative">
                <div id="ww-box-container" class="w-full h-full flex flex-col items-center">
                    <div class="bg-indigo-100 text-indigo-800 px-3.5 py-1 rounded-full text-xs font-bold mb-2 shrink-0 shadow-sm border border-indigo-200">
                        Tap any box to reveal the hidden word!
                    </div>
                    <div id="box-grid" class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5 sm:gap-3.5 w-full max-w-5xl overflow-y-auto p-3 custom-scrollbar pb-16"></div>
                </div>

                <div id="ww-wheel-container" class="hidden w-full h-full flex flex-col justify-center items-center gap-4">
                    <div class="bg-amber-100 text-amber-800 px-3.5 py-1 rounded-full text-xs font-bold shrink-0 shadow-sm border border-amber-200">
                        Tap SPIN or the center circle to rotate!
                    </div>
                    <div class="relative w-[80vw] max-w-[340px] aspect-square flex items-center justify-center shrink-0 drop-shadow-2xl">
                        <canvas id="wheel-canvas" width="400" height="400" class="w-full h-full object-contain"></canvas>
                        <div class="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-10 bg-rose-600 z-10 border-4 border-white pointer-events-none drop-shadow-md" style="clip-path: polygon(50% 100%, 0 0, 100% 0);"></div>
                        <button onclick="wheelGame.spin()" id="spin-btn" class="absolute w-18 h-18 sm:w-22 sm:h-22 bg-white hover:bg-slate-50 border-[5px] border-emerald-400 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.3)] z-20 cursor-pointer font-black text-emerald-600 text-base sm:text-lg hover:scale-105 active:scale-95 transition-all">
                            SPIN
                        </button>
                    </div>
                </div>

                <div id="ww-cards-container" class="hidden w-full h-full flex flex-col justify-center items-center gap-6">
                    <div class="bg-rose-100 text-rose-800 px-3.5 py-1 rounded-full text-xs font-bold shrink-0 shadow-sm border border-rose-200">
                        Tap the deck to deal a random card!
                    </div>
                    <div class="card-pile flex justify-center items-center shrink-0 mt-2">
                        <div class="stacked-card bg-rose-700 border-[3px] border-white/50 transform rotate-6 translate-x-4 translate-y-3"></div>
                        <div class="stacked-card bg-rose-500 border-[3px] border-white/70 transform -rotate-3 -translate-x-3 -translate-y-2"></div>
                        <div id="active-deck-card" class="stacked-card bg-gradient-to-br from-rose-500 to-pink-600 border-4 border-white flex flex-col items-center justify-center text-white cursor-pointer hover:-translate-y-6 hover:rotate-2 transition-all duration-300 z-10 shadow-2xl">
                            <span class="text-6xl drop-shadow-md">🃏</span>
                            <span class="font-black mt-4 text-xs tracking-[0.2em] bg-black/20 px-3.5 py-1 rounded-full">DEAL</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="flex justify-center w-full mt-2 shrink-0 pt-2 border-t border-slate-200">
                <button onclick="app.finishToSummary()" class="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2.5 rounded-full font-black text-xs sm:text-sm shadow-md transition-transform hover:-translate-y-0.5 flex items-center gap-2">
                    <span>View Final Report</span> <span class="text-base">🏆</span>
                </button>
            </div>
        </section>

        <!-- GIGANTIC WORD DISPLAY MODAL OVERLAY -->
        <div id="word-overlay" class="hidden fixed inset-0 bg-slate-900/80 z-50 flex flex-col justify-center items-center p-3 sm:p-6 backdrop-blur-md">
            <div class="giant-word-overlay bg-white rounded-[2.5rem] w-full max-w-3xl max-h-[90vh] p-5 sm:p-8 flex flex-col justify-between items-center shadow-2xl border-4 border-emerald-400 overflow-y-auto custom-scrollbar">
                <div class="w-full flex justify-between items-center px-2 shrink-0 mb-3">
                    <span id="revealed-info" class="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-bold text-xs uppercase tracking-wider">Question</span>
                    <button onclick="app.closeOverlay()" class="bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-600 px-3.5 py-1 rounded-full text-xs font-black transition-colors">✕ Close</button>
                </div>
                <div id="giant-arabic-word" class="flex-1 flex items-center justify-center w-full py-4 min-h-[160px]">
                </div>
                <div class="w-full max-w-sm shrink-0 mt-4">
                    <div class="grid grid-cols-2 gap-3">
                        <button onclick="app.gradeResult(false)" class="bg-rose-500 hover:bg-rose-600 text-white py-3.5 rounded-2xl text-base shadow-[0_4px_0_#be123c] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 font-black">
                            ❌ Missed
                        </button>
                        <button onclick="app.gradeResult(true)" class="bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-2xl text-base shadow-[0_4px_0_#047857] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 font-black">
                            ✔ Perfect
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- STAGE 5: FINAL SUMMARY SCREEN -->
        <section id="summary-screen" class="hidden w-full max-w-2xl bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-2xl text-center space-y-5 border-4 border-emerald-100 shrink-0 my-auto z-10">
            <h2 class="text-3xl sm:text-4xl font-black text-slate-800">Challenge Completed! 🎉</h2>
            <div class="grid grid-cols-2 gap-4 items-center">
                <div class="space-y-2">
                    <span class="text-slate-400 font-bold uppercase text-xs sm:text-sm tracking-wider">Points Gathered</span>
                    <div id="final-score" class="text-5xl sm:text-6xl font-black text-emerald-600 drop-shadow-sm leading-none">0</div>
                </div>
                <div class="flex flex-col items-center">
                    <div class="chart-container"><canvas id="summaryChart"></canvas></div>
                </div>
            </div>
            <div class="flex flex-wrap justify-center pt-2 gap-3">
                <button id="btn-review-mistakes" onclick="app.startReview()" class="hidden bg-rose-500 hover:bg-rose-600 text-white text-base font-bold py-3 px-8 rounded-full shadow-lg transition-all flex items-center gap-2">
                    <span>Review Mistakes</span> <span>🎯</span>
                </button>
                <button onclick="app.jumpTo('ww_box')" class="bg-slate-200 text-slate-700 text-base font-bold py-3 px-6 rounded-full shadow-md hover:bg-slate-300 transition-all">Games Room 🎮</button>
                <button onclick="location.reload()" class="bg-slate-900 text-white text-base font-bold py-3 px-8 rounded-full shadow-lg hover:bg-black transition-all">Play Again 🔄</button>
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
