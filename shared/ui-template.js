function escapeHTML(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function buildAppUI() {
    if (document.getElementById('learning-stage')) return; // Already exists

    const cfg = window.PAGE_CONFIG || {};
    const isAr = (typeof i18n !== 'undefined' && i18n.getLocale() === 'ar');
    const title = escapeHTML(isAr ? (i18n.t('app_title') || 'نور البيان') : (cfg.title || 'Nour Al-Bayan'));

    let rawSub = cfg.subtitle || '';
    if (isAr) {
        const pageMatch = rawSub.match(/Page\s+(\d+)/i);
        const arBracketMatch = rawSub.match(/\(([\u0600-\u06FF\s]+)\)/);
        if (pageMatch && arBracketMatch) {
            rawSub = `الصفحة ${pageMatch[1]} • ${arBracketMatch[1]}`;
        } else if (arBracketMatch) {
            rawSub = arBracketMatch[1];
        }
    }
    const subtitle = escapeHTML(rawSub || (isAr ? 'تعليم القراءة وضبط الحركات' : 'Harakat & Reading Practice'));
    const footerText = escapeHTML(isAr ? `منظومة نور البيان التعليمية • ${subtitle}` : (cfg.footer || 'Nour Al-Bayan Learning System'));
    const hasRules = (typeof rulesData !== 'undefined' && rulesData.length > 0) || (cfg.rules && cfg.rules.length > 0);
    const game3Type = cfg.game3 || (typeof riddlesGame !== 'undefined' ? 'riddles' : (hasRules ? 'riddles' : 'memory'));

    const rulesButtonHtml = hasRules ? `
        <button onclick="app.jumpTo('rules')" class="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3.5 px-6 rounded-[1.5rem] text-lg shadow-[0_4px_0_#3730a3] active:translate-y-1 active:shadow-none transition-all flex items-center justify-between" aria-label="${i18n.t('aria_open_rules')}">
            <span class="flex items-center gap-2">📖 <span>${i18n.t('lesson_rules')}</span></span>
            <span class="text-xl" aria-hidden="true">➡</span>
        </button>` : '';

    const ruleStageHtml = hasRules ? `
        <!-- STAGE 0: LESSON RULES -->
        <section id="rule-stage" class="hidden w-full h-full flex flex-col justify-center items-center gap-4 py-4 overflow-hidden shrink-0" role="region" aria-label="${i18n.t('aria_rules_container')}">
            <div class="text-center shrink-0">
                <span id="rule-step-indicator" class="text-xs font-bold text-emerald-600 bg-emerald-100 px-3.5 py-1 rounded-full uppercase tracking-wider" aria-live="polite">LESSON RULE</span>
                <h2 id="rule-title" class="text-2xl sm:text-3xl font-black text-slate-800 mt-2">Rule Title</h2>
                <p id="rule-desc" class="text-sm sm:text-base text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">Description of current rule</p>
            </div>
            <div class="w-full max-w-3xl bg-white border-4 sm:border-8 border-emerald-400 rounded-[2.5rem] shadow-xl p-6 flex flex-col justify-center items-center h-[38vh] min-h-[200px] max-h-[340px]">
                <span id="rule-big-text" class="quran-font text-center text-slate-800 leading-relaxed select-text px-4 w-full break-words" style="font-size: clamp(3rem, 10vh, 6.5rem);" role="region" aria-label="${i18n.t('aria_current_word')}" aria-live="polite">
                    Rule Content
                </span>
            </div>
            <div class="flex justify-center gap-4 w-full max-w-sm mt-3 shrink-0">
                <button id="rule-prev-btn" onclick="ruleManager.prev()" class="hidden bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3.5 px-6 rounded-2xl text-sm transition-colors shadow-sm" aria-label="${i18n.t('aria_prev_rule')}">
                    ⬅ Back
                </button>
                <button id="rule-next-btn" onclick="ruleManager.next()" class="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black py-4 px-8 rounded-2xl text-sm shadow-[0_4px_0_#047857] active:translate-y-1 active:shadow-none transition-all flex-1" aria-label="${i18n.t('aria_next_rule')}">
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
                <h3 id="memory-status" class="text-xs sm:text-sm font-bold text-white tracking-wide" aria-live="polite">${i18n.t('prompt_memory')}</h3>
            </div>
            <div class="flex flex-wrap justify-center gap-3 w-full mt-4 max-w-md">
                <button onclick="memoryGame.reset()" class="bg-purple-800/40 hover:bg-purple-800/60 border border-purple-400/30 text-white px-6 py-2.5 rounded-full font-bold text-sm backdrop-blur-sm">Reset 🔄</button>
                <button id="memory-resume-btn" onclick="app.resume(3)" class="bg-yellow-400 hover:bg-yellow-300 text-purple-900 px-8 py-2.5 rounded-full font-black text-sm shadow-md transition transform hover:-translate-y-0.5">Skip to Wordwall ⏭️</button>
            </div>
        </section>`;

    const fullHtml = `
    <!-- Accessibility Skip Link -->
    <a href="#word-display-area" class="skip-link sr-only focus:not-sr-only">${i18n.t('skip_to_content') || 'تجاوز إلى المحتوى الرئيسي'}</a>

    <!-- Interactive Feedback Badge -->
    <div id="badge-ui" class="feedback-badge bg-white shadow-xl px-8 py-3 rounded-full text-2xl sm:text-3xl font-black border-4 border-emerald-400 whitespace-nowrap" role="status" aria-live="assertive"></div>

    <!-- Navigation Header with Interactive Progress Bar -->
    <header id="top-nav" class="w-full bg-white/95 backdrop-blur-sm border-b border-slate-200/80 px-3 sm:px-6 py-2 flex justify-between items-center shadow-sm shrink-0 z-30 relative">
        <div id="progress-bar" style="width: 0%;" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" aria-label="${i18n.t('progress_aria')}"></div>
        <div class="w-full max-w-5xl mx-auto flex justify-between items-center gap-2">
            <!-- Score & Timer Pill -->
            <div class="flex items-center gap-2 sm:gap-3">
                <div class="flex items-center gap-2 bg-emerald-50/80 border border-emerald-200 px-3 py-1 rounded-full shadow-inner">
                    <span class="text-slate-600 text-[10px] sm:text-xs font-black uppercase tracking-wider">${i18n.t('score')}</span>
                    <span id="score-val" class="text-base sm:text-lg font-black text-emerald-600 leading-none" aria-live="polite" aria-label="${i18n.t('score')}">0</span>
                </div>
                <div id="challenge-timer" class="hidden bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-mono font-bold text-xs shadow-inner" role="timer">
                    ⏱ <span id="timer-val">10.0</span>s
                </div>
                <div id="active-student-pill" class="flex items-center gap-1.5 bg-emerald-50/90 border border-emerald-200 px-2.5 sm:px-3 py-1 rounded-full shadow-inner text-xs sm:text-sm font-bold text-emerald-800" role="status" aria-label="${i18n.t('active_badge')}">
                    <span id="active-student-avatar-icon" class="text-sm">👤</span>
                    <span id="active-student-name-text" class="max-w-[80px] sm:max-w-[120px] truncate font-black">${i18n.t('general_session')}</span>
                </div>
            </div>

            <!-- Teacher Manual Feedback Triggers -->
            <div class="flex items-center gap-1 sm:gap-1.5 bg-slate-50 px-2 sm:px-2.5 py-1 rounded-full border border-slate-200" role="toolbar" aria-label="${i18n.t('aria_teacher_praise_toolbar')}">
                <button onclick="app.triggerFeedback('⭐', '#f59e0b', true)" class="p-1 sm:p-1.5 bg-amber-100 text-amber-500 rounded-full hover:bg-amber-200 hover:scale-110 transition-all shadow-sm text-base sm:text-lg leading-none" aria-label="${i18n.t('praise_star')}" title="⭐">⭐</button>
                <button onclick="app.triggerFeedback('❤️', '#ef4444', true)" class="p-1 sm:p-1.5 bg-rose-100 text-rose-500 rounded-full hover:bg-rose-200 hover:scale-110 transition-all shadow-sm text-base sm:text-lg leading-none" aria-label="${i18n.t('praise_heart')}" title="❤️">❤️</button>
                <div class="w-px h-4 bg-slate-200 mx-0.5" aria-hidden="true"></div>
                <button onclick="app.triggerFeedback(i18n.t('txt_perfect') + ' 🌟', '#8b5cf6', true)" class="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-md font-black text-[10px] sm:text-xs hover:bg-purple-200 transition-colors" aria-label="${i18n.t('praise_perfect')}">${i18n.t('txt_perfect')}</button>
                <button onclick="app.triggerFeedback(i18n.t('txt_excellent') + ' 🏆', '#10b981', true)" class="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md font-black text-[10px] sm:text-xs hover:bg-emerald-200 transition-colors" aria-label="${i18n.t('praise_excellent')}">${i18n.t('txt_excellent')}</button>
            </div>

            <!-- Dropdown Navigator & Settings Button & Language Switcher -->
            <div class="flex items-center gap-1.5">
                <div id="selector-wrapper" class="flex items-center bg-slate-50 px-2 sm:px-3 py-1 rounded-full border border-slate-200 max-w-[130px] sm:max-w-[200px]">
                    <select id="example-navigator" onchange="app.jumpTo(this.value)" class="bg-transparent text-emerald-700 font-bold text-xs sm:text-sm outline-none cursor-pointer w-full text-center truncate" aria-label="${i18n.t('nav_section_aria')}">
                    </select>
                </div>
                <!-- زر تبديل اللغة السريع -->
                <button id="top-nav-lang-btn" onclick="if(typeof i18n !== 'undefined') i18n.toggleLocale()" class="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full transition-colors font-bold text-xs shadow-sm flex items-center gap-1 cursor-pointer" aria-label="${(typeof i18n !== 'undefined' && i18n.getLocale() === 'ar') ? 'التحويل إلى اللغة الإنجليزية' : 'Switch to Arabic language'}">
                    <span aria-hidden="true">🌐</span>
                    <span id="top-nav-lang-text">${(typeof i18n !== 'undefined' && i18n.getLocale() === 'ar') ? 'EN' : 'عربي'}</span>
                </button>
                <button onclick="if(typeof settingsManager!=='undefined')settingsManager.open()" class="p-1.5 sm:p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition-colors shadow-sm text-sm sm:text-base leading-none cursor-pointer" aria-label="${i18n.t('open_settings_btn')}" title="Teacher Settings">⚙️</button>
            </div>
        </div>
    </header>

    <main class="flex-1 w-full max-w-5xl px-3 sm:px-4 flex flex-col justify-center items-center overflow-hidden relative">

        <!-- STAGE -1: MAIN MENU -->
        <section id="main-menu-stage" class="w-full h-full flex flex-col justify-center items-center gap-3 sm:gap-4 py-3 overflow-y-auto shrink-0 custom-scrollbar">
            <div class="text-center mb-1">
                <h1 class="text-3xl sm:text-4xl md:text-5xl font-black text-emerald-600 drop-shadow-sm tracking-tight mb-1 leading-tight">${title}</h1>
                <p class="text-slate-500 font-bold text-xs sm:text-sm md:text-base leading-relaxed">${subtitle}</p>
            </div>

            <!-- Developer & Dedication Card -->
            <div class="w-full max-w-sm sm:max-w-md bg-white border-2 border-emerald-200/90 rounded-[2rem] p-4 sm:p-5 shadow-sm relative overflow-hidden">
                <div class="space-y-1 text-xs sm:text-sm text-slate-600 font-medium">
                    <p><span class="text-slate-600">${i18n.t('developed_by')}</span> <strong class="text-slate-800 font-black">${i18n.t('author_name')}</strong></p>
                    <p><span class="text-slate-600">${i18n.t('phone_whatsapp')}</span> <strong class="text-slate-800 font-black tracking-wide" dir="ltr">01147992249</strong></p>
                </div>
                <hr class="my-2.5 border-slate-100">
                <div class="space-y-1 text-center">
                    <p class="text-xs sm:text-sm text-slate-600 font-bold leading-relaxed quran-font">${i18n.t('dedication_prayer')}</p>
                </div>
            </div>

            <!-- Mid-Lesson Game Breaks Option -->
            <div class="w-full max-w-sm sm:max-w-md px-4 py-2 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center justify-between shadow-inner">
                <label for="toggle-game-breaks" class="flex items-center gap-2 cursor-pointer text-xs sm:text-sm font-bold text-emerald-900 select-none">
                    <span>🎮</span>
                    <span>${i18n.t('enable_game_breaks')}</span>
                </label>
                <input type="checkbox" id="toggle-game-breaks" onchange="app.toggleGameBreaks(this.checked)" class="w-5 h-5 accent-emerald-600 rounded cursor-pointer" aria-label="${i18n.t('enable_game_breaks')}">
            </div>

            <!-- Menu Action Buttons -->
            <div class="grid grid-cols-1 gap-2.5 w-full max-w-sm sm:max-w-md px-2" role="group" aria-label="${i18n.t('nav_section_aria')}">
                ${rulesButtonHtml}
                <button onclick="app.startChallenge()" class="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black py-3.5 px-6 rounded-[1.5rem] text-lg shadow-[0_5px_0_#047857] active:translate-y-[5px] active:shadow-none transition-all flex items-center justify-between" aria-label="${i18n.t('start_challenge')}">
                    <span class="flex items-center gap-2">🚀 <span>${i18n.t('start_challenge')}</span></span>
                    <span class="text-2xl" aria-hidden="true">➡</span>
                </button>
                <button onclick="app.jumpTo('ww_box')" class="bg-white border-4 border-amber-400 hover:bg-amber-50 text-amber-500 font-black py-3 px-6 rounded-[1.5rem] text-base shadow-[0_5px_0_#d97706] active:translate-y-[5px] active:shadow-none transition-all flex items-center justify-between" aria-label="${i18n.t('open_word_games')}">
                    <span class="flex items-center gap-2">🎡 <span>${i18n.t('open_word_games')}</span></span>
                    <span class="text-2xl" aria-hidden="true">➡</span>
                </button>
            </div>
        </section>

        ${ruleStageHtml}

        <!-- STAGE 0.5: GAME TRANSITION -->
        <section id="game-transition-stage" class="hidden w-full h-full flex flex-col justify-center items-center text-center p-6 rounded-[2.5rem] shadow-xl text-white bg-gradient-to-br from-indigo-500 to-purple-600 relative overflow-hidden shrink-0 z-20" role="dialog" aria-modal="true" aria-labelledby="transition-title">
            <h2 id="transition-title" class="text-3xl sm:text-5xl font-black text-yellow-300 drop-shadow-md mb-3 animate-bounce">${i18n.t('amazing_job')}</h2>
            <p class="text-lg sm:text-2xl font-bold text-white mb-6">${i18n.t('break_message')}</p>
            <div class="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full max-w-md">
                <button id="btn-play-game" onclick="app.enterGame()" class="flex-1 bg-yellow-400 hover:bg-yellow-300 text-indigo-900 py-3.5 sm:py-4 rounded-2xl text-lg font-black shadow-[0_5px_0_#ca8a04] active:translate-y-[5px] active:shadow-none transition-all" aria-label="${i18n.t('play_game')}">
                    🎮 ${i18n.t('play_game')}
                </button>
                <button id="btn-skip-game" onclick="app.resume(app.pendingGame)" class="flex-1 bg-white/20 hover:bg-white/30 text-white border-2 border-white/50 py-3.5 sm:py-4 rounded-2xl text-lg font-bold transition-all backdrop-blur-sm" aria-label="${i18n.t('aria_skip_game')}">
                    ⏭️ ${i18n.t('skip_and_read')}
                </button>
            </div>
        </section>

        <!-- STAGE 1: LEARNING / READING CHALLENGE -->
        <section id="learning-stage" class="hidden w-full flex flex-col justify-between items-center gap-2 py-2 flex-1 overflow-hidden relative">
            <div class="w-full max-w-4xl flex justify-between items-center px-4 shrink-0 h-8">
                <span id="progress-text" class="text-slate-600 font-black text-xs sm:text-sm tracking-widest uppercase" aria-live="polite">Card 1</span>
                <div id="status-banner" class="text-center py-1 px-4 rounded-full font-bold text-white shadow-md hidden text-xs uppercase tracking-wide" role="status" aria-live="polite"></div>
            </div>

            <!-- Session Drill Active Banner -->
            <div id="session-drill-banner" class="hidden w-full max-w-2xl mx-auto px-4 py-2 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-600 text-white rounded-2xl shadow-md flex items-center justify-between gap-3 shrink-0" role="region" aria-label="${i18n.t('session_drill_title')}" aria-live="polite">
                <div class="flex items-center gap-2 font-black text-xs sm:text-sm">
                    <span class="text-base sm:text-lg animate-pulse" aria-hidden="true">🎯</span>
                    <span id="session-drill-title">${i18n.t('session_drill_title')}</span>
                </div>
                <div class="flex items-center gap-3">
                    <span id="session-drill-step-indicator" class="bg-black/25 px-3 py-1 rounded-full text-xs font-bold font-mono tracking-wide" aria-live="polite">
                        ${i18n.t('session_drill_banner_step', { current: '<span id="drill-cur">1</span>', total: '<span id="drill-total">3</span>' })}
                    </span>
                    <button type="button" onclick="app.openEarlyExitModal()" class="w-7 h-7 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center font-black text-xs transition-colors cursor-pointer" aria-label="${i18n.t('close')}" title="${i18n.t('close')}">✕</button>
                </div>
            </div>

            <div class="flex-1 flex items-center justify-center w-full px-2 py-1 overflow-hidden" id="word-display-area" role="region" aria-label="${i18n.t('aria_current_word')}" aria-live="polite" aria-atomic="true"></div>

            <div class="w-full max-w-md sm:max-w-lg space-y-2 shrink-0 pb-3 px-2">
                <div class="grid grid-cols-2 gap-3 sm:gap-4">
                    <button onclick="app.evaluate(false)" class="bg-rose-500 hover:bg-rose-600 text-white py-3.5 sm:py-4 rounded-[1.75rem] text-lg sm:text-xl shadow-[0_5px_0_#be123c] active:translate-y-[5px] active:shadow-none transition-all flex items-center justify-center gap-2 font-black" aria-label="${i18n.t('mark_incorrect_aria')}">
                        ❌ ${i18n.t('btn_incorrect')}
                    </button>
                    <button onclick="app.evaluate(true)" class="bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 sm:py-4 rounded-[1.75rem] text-lg sm:text-xl shadow-[0_5px_0_#047857] active:translate-y-[5px] active:shadow-none transition-all flex items-center justify-center gap-2 font-black" aria-label="${i18n.t('mark_correct_aria')}">
                        ✔ ${i18n.t('btn_correct')}
                    </button>
                </div>
                <div class="flex justify-center pt-1">
                    <button onclick="app.prev()" class="bg-slate-200/90 hover:bg-slate-300 text-slate-600 py-1.5 px-5 rounded-full text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5" aria-label="${i18n.t('prev_card_aria')}">
                        <span>⬅</span> <span>${i18n.t('prev_card_btn')}</span>
                    </button>
                </div>
            </div>
        </section>

        <!-- STAGE 2: MIDPOINT GAME 1 (TIC-TAC-TOE) -->
        <section id="xo-stage" class="hidden w-full h-full flex flex-col justify-center items-center text-center p-2 sm:p-4 rounded-[2.5rem] text-white bg-gradient-to-br from-teal-600 via-emerald-600 to-green-700 relative overflow-hidden shrink-0 z-10">
            <div class="relative z-10 flex flex-col items-center justify-center h-full w-full max-w-3xl gap-2 sm:gap-3">
                <div class="flex flex-col items-center gap-1">
                    <h2 class="text-3xl sm:text-4xl font-black text-yellow-300 drop-shadow-md">${i18n.t('game_xo')} 🎮</h2>
                    <!-- Controls Toolbar -->
                    <div class="flex items-center justify-center gap-2 mt-1" role="toolbar" aria-label="${i18n.t('aria_game_mode_controls')}">
                        <button id="xo-mode-btn" onclick="if(typeof gameAI!=='undefined')gameAI.toggleMode('xo')" class="bg-emerald-500/80 hover:bg-emerald-500 text-white border border-emerald-300/40 px-3.5 py-1.5 rounded-full font-bold text-xs shadow-sm transition-all" aria-label="${i18n.t('aria_toggle_opponent')}">🤖 ${i18n.t('ai_mode_vs_computer')}</button>
                        <button id="xo-diff-btn" onclick="if(typeof gameAI!=='undefined')gameAI.toggleDifficulty()" class="bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold px-3 py-1.5 rounded-full text-xs shadow-sm transition-all" aria-label="${i18n.t('aria_toggle_diff')}">${i18n.t('diff_easy')}</button>
                    </div>
                </div>
                <div class="xo-board-container mt-1">
                    <div id="xo-board" class="grid grid-cols-3 gap-2.5 sm:gap-3 bg-white/20 p-3 sm:p-4 rounded-[2rem] backdrop-blur-md shadow-inner border border-white/25 w-full h-full"></div>
                </div>
                <div class="bg-black/20 py-1.5 px-6 rounded-full inline-block backdrop-blur-sm border border-white/10 shadow-sm mt-1">
                    <h3 id="xo-status" class="text-sm sm:text-base font-bold text-white tracking-wide" aria-live="polite">${i18n.t('xo_default_turn')}</h3>
                </div>
                <div class="flex flex-wrap justify-center gap-3 w-full mt-2">
                    <button onclick="xoGame.reset()" class="bg-white/20 hover:bg-white/30 text-white border border-white/30 px-6 py-2.5 rounded-full font-bold text-sm transition-transform hover:scale-105 backdrop-blur-sm">${i18n.t('reset')} 🔄</button>
                    <button id="xo-resume-btn" onclick="app.resume(1)" class="bg-yellow-400 hover:bg-yellow-300 text-teal-900 px-8 py-2.5 rounded-full font-black text-sm shadow-md transform transition hover:-translate-y-0.5">${i18n.t('skip_and_read')} ⏭️</button>
                </div>
            </div>
        </section>

        <!-- STAGE 3B: MIDPOINT GAME 2 (CONNECT 4) -->
        <section id="c4-stage" class="hidden w-full h-full flex flex-col justify-center items-center text-center p-3 sm:p-4 rounded-[2.5rem] shadow-xl text-white bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-700 relative overflow-hidden shrink-0 z-10">
            <div class="relative z-10 flex flex-col items-center gap-2 sm:gap-3">
                <div class="flex flex-col items-center gap-1">
                    <h2 class="text-2xl sm:text-3xl font-black text-yellow-300 drop-shadow-md">${i18n.t('game_c4')} 🔴🟡</h2>
                    <!-- Controls Toolbar -->
                    <div class="flex items-center justify-center gap-2 mt-1" role="toolbar" aria-label="${i18n.t('aria_game_mode_controls')}">
                        <button id="c4-mode-btn" onclick="if(typeof gameAI!=='undefined')gameAI.toggleMode('c4')" class="bg-sky-500/80 hover:bg-sky-500 text-white border border-sky-300/40 px-3.5 py-1.5 rounded-full font-bold text-xs shadow-sm transition-all" aria-label="${i18n.t('aria_toggle_opponent')}">🤖 ${i18n.t('ai_mode_vs_computer')}</button>
                        <button id="c4-diff-btn" onclick="if(typeof gameAI!=='undefined')gameAI.toggleDifficulty()" class="bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold px-3 py-1.5 rounded-full text-xs shadow-sm transition-all" aria-label="${i18n.t('aria_toggle_diff')}">${i18n.t('diff_easy')}</button>
                    </div>
                </div>
                <div id="c4-board-container" class="c4-board-new grid-cols-7 mx-auto mt-1"></div>
                <div class="bg-black/20 py-1.5 px-6 rounded-full inline-block backdrop-blur-sm border border-white/10 shadow-sm mt-2">
                    <h3 id="c4-status" class="text-xs sm:text-sm font-bold text-white tracking-wide" aria-live="polite">${i18n.t('c4_select_column')}</h3>
                </div>
                <div class="flex flex-wrap justify-center gap-3 w-full mt-3">
                    <button onclick="c4Game.reset()" class="bg-blue-800/40 hover:bg-blue-800/60 border border-blue-400/30 text-white px-6 py-2.5 rounded-full font-bold text-sm backdrop-blur-sm">${i18n.t('reset')} 🔄</button>
                    <button id="c4-resume-btn" onclick="app.resume(2)" class="bg-yellow-400 hover:bg-yellow-300 text-blue-900 px-8 py-2.5 rounded-full font-black text-sm shadow-md transition transform hover:-translate-y-0.5">${i18n.t('skip_and_read')} ⏭️</button>
                </div>
            </div>
        </section>

        ${game3StageHtml}

        <!-- STAGE 4: WORDWALL PLAYROOM -->
        <section id="wordwall-stage" class="hidden w-full h-full flex flex-col items-center py-3 px-2 overflow-hidden bg-slate-50 rounded-3xl border border-slate-200 shadow-inner">
            <div class="w-full max-w-4xl flex flex-col sm:flex-row justify-between items-center mb-3 shrink-0 gap-3 px-3">
                <div class="flex items-center gap-2.5 flex-wrap">
                    <h2 class="text-xl sm:text-2xl font-black text-emerald-600 drop-shadow-sm flex items-center gap-2">
                        <span>🎡</span> ${i18n.t('games_room_title')}
                    </h2>
                    <button type="button" id="btn-ww-mistakes-filter" onclick="if(typeof wordwallRoom !== 'undefined' && wordwallRoom.toggleMistakesFilter) wordwallRoom.toggleMistakesFilter();" class="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-full font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer" aria-label="${i18n.t('aria_ww_filter_mistakes')}" title="${i18n.t('ww_filter_session_mistakes')}">
                        <span aria-hidden="true">🎯</span>
                        <span id="ww-filter-text">${i18n.t('ww_filter_session_mistakes')}</span>
                    </button>
                </div>
                <nav class="bg-white p-1 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-1">
                    <button onclick="wordwallRoom.switchMode('box')" id="tab-box" class="game-tab active py-1.5 px-3 rounded-xl font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 flex items-center justify-center gap-1.5 text-xs sm:text-sm border border-transparent" aria-label="${i18n.t('game_box_tab')}">
                        <span class="text-base sm:text-lg">🎁</span> <span class="hidden sm:inline">${i18n.t('game_box_tab')}</span>
                    </button>
                    <button onclick="wordwallRoom.switchMode('curtain')" id="tab-curtain" class="game-tab py-1.5 px-3 rounded-xl font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 flex items-center justify-center gap-1.5 text-xs sm:text-sm border border-transparent" aria-label="${i18n.t('game_curtain_tab')}">
                        <span class="text-base sm:text-lg">🎭</span> <span class="hidden sm:inline">${i18n.t('game_curtain_tab')}</span>
                    </button>
                    <button onclick="wordwallRoom.switchMode('ladder')" id="tab-ladder" class="game-tab py-1.5 px-3 rounded-xl font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 flex items-center justify-center gap-1.5 text-xs sm:text-sm border border-transparent" aria-label="${i18n.t('game_ladder_tab')}">
                        <span class="text-base sm:text-lg">🪜</span> <span class="hidden sm:inline">${i18n.t('game_ladder_tab')}</span>
                    </button>
                    <button onclick="wordwallRoom.switchMode('wheel')" id="tab-wheel" class="game-tab py-1.5 px-3 rounded-xl font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 flex items-center justify-center gap-1.5 text-xs sm:text-sm border border-transparent" aria-label="${i18n.t('game_wheel_tab')}">
                        <span class="text-base sm:text-lg">🎡</span> <span class="hidden sm:inline">${i18n.t('game_wheel_tab')}</span>
                    </button>
                    <button onclick="wordwallRoom.switchMode('cards')" id="tab-cards" class="game-tab py-1.5 px-3 rounded-xl font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 flex items-center justify-center gap-1.5 text-xs sm:text-sm border border-transparent" aria-label="${i18n.t('game_cards_tab')}">
                        <span class="text-base sm:text-lg">🃏</span> <span class="hidden sm:inline">${i18n.t('game_cards_tab')}</span>
                    </button>
                    <button onclick="wordwallRoom.switchMode('tiles')" id="tab-tiles" class="game-tab py-1.5 px-3 rounded-xl font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 flex items-center justify-center gap-1.5 text-xs sm:text-sm border border-transparent" aria-label="${i18n.t('game_tiles_tab')}">
                        <span class="text-base sm:text-lg">🀄</span> <span class="hidden sm:inline">${i18n.t('game_tiles_tab')}</span>
                    </button>
                    <button onclick="wordwallRoom.switchMode('honeycomb')" id="tab-honeycomb" class="game-tab py-1.5 px-3 rounded-xl font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 flex items-center justify-center gap-1.5 text-xs sm:text-sm border border-transparent" aria-label="${i18n.t('game_honeycomb_tab')}">
                        <span class="text-base sm:text-lg">⬡</span> <span class="hidden sm:inline">${i18n.t('game_honeycomb_tab')}</span>
                    </button>
                </nav>
            </div>

            <div class="flex-1 w-full flex flex-col items-center justify-center overflow-hidden relative min-h-0">
                <div id="ww-box-container" class="w-full h-full flex flex-col items-center min-h-0 overflow-hidden">
                    <div id="box-prompt-text" class="bg-indigo-100 text-indigo-800 px-3.5 py-1 rounded-full text-xs font-bold mb-2 shrink-0 shadow-sm border border-indigo-200">
                        ${i18n.t('prompt_box')}
                    </div>
                    <div id="box-grid" class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5 sm:gap-3.5 w-full max-w-5xl flex-1 overflow-y-auto p-3 custom-scrollbar pb-20"></div>
                </div>

                <div id="ww-ladder-container" class="hidden w-full h-full flex flex-col items-center justify-between p-2 max-w-4xl mx-auto overflow-y-auto custom-scrollbar" role="region" aria-label="${i18n.t('aria_ladder_game')}">
                    <!-- Live Region for Blind Teacher: Announces step and word -->
                    <div id="ladder-live-announcer" class="sr-only" aria-live="assertive" aria-atomic="true"></div>

                    <!-- Header with Round Selector & Step Counter -->
                    <div class="w-full flex justify-between items-center bg-white/80 border border-slate-200 rounded-2xl px-4 py-2 shrink-0 shadow-sm">
                        <div class="flex items-center gap-2">
                            <span class="text-xs font-black text-slate-500 uppercase tracking-wider">${i18n.t('ladder_round_label')}</span>
                            <button id="ladder-btn-5" onclick="ladderGame.setTarget(5)" class="py-1 px-3.5 rounded-full font-bold text-xs bg-emerald-500 text-white shadow-sm transition-all" aria-label="${i18n.t('ladder_target_5_aria')}">5 ${i18n.t('ladder_steps_unit')}</button>
                            <button id="ladder-btn-10" onclick="ladderGame.setTarget(10)" class="py-1 px-3.5 rounded-full font-bold text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all" aria-label="${i18n.t('ladder_target_10_aria')}">10 ${i18n.t('ladder_steps_unit')}</button>
                        </div>
                        <span id="ladder-step-indicator" class="text-xs sm:text-sm font-black text-emerald-700 bg-emerald-100/80 px-3 py-1 rounded-full" aria-live="polite">الدرجة 0 من 5</span>
                    </div>

                    <!-- Main Play Area: Ladder Visualization on Left, Big Word Card on Right -->
                    <div class="grid grid-cols-1 md:grid-cols-12 gap-3 w-full flex-1 my-2 min-h-0 items-center">
                        <div class="md:col-span-4 flex flex-col gap-1.5 w-full max-h-[260px] md:max-h-[340px] overflow-y-auto custom-scrollbar p-2 bg-slate-100/80 rounded-2xl border border-slate-200" id="ladder-rungs" role="region" aria-label="${i18n.t('aria_ladder_steps')}">
                        </div>

                        <div class="md:col-span-8 flex flex-col justify-center items-center bg-white border-4 border-emerald-400 rounded-3xl shadow-xl p-4 min-h-[180px] md:min-h-[280px] w-full">
                            <div id="ladder-word-display" class="w-full flex-1 flex items-center justify-center text-center" role="region" aria-label="${i18n.t('aria_ladder_challenge_word')}" aria-live="polite">
                            </div>
                        </div>
                    </div>

                    <!-- Control & Grading Buttons -->
                    <div class="w-full max-w-md shrink-0 space-y-2 pb-1">
                        <div class="grid grid-cols-2 gap-3">
                            <button onclick="ladderGame.grade(false)" class="bg-rose-500 hover:bg-rose-600 text-white py-3 rounded-2xl text-base font-black shadow-[0_4px_0_#be123c] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2" aria-label="${i18n.t('aria_step_down')}">
                                ❌ ${i18n.t('btn_incorrect')} (1)
                            </button>
                            <button onclick="ladderGame.grade(true)" class="bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-2xl text-base font-black shadow-[0_4px_0_#047857] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2" aria-label="${i18n.t('aria_step_up')}">
                                ✔ ${i18n.t('btn_correct')} (2)
                            </button>
                        </div>
                        <div class="flex justify-center">
                            <button id="ladder-reset-btn" onclick="ladderGame.reset()" class="bg-slate-200 hover:bg-slate-300 text-slate-700 py-1.5 px-6 rounded-full text-xs font-bold transition-colors shadow-sm" aria-label="${i18n.t('reset_ladder_round')}">
                                ${i18n.t('reset_ladder_round')} 🔄
                            </button>
                        </div>
                    </div>
                </div>

                <div id="ww-wheel-container" class="hidden w-full h-full flex flex-col justify-center items-center gap-4" role="region" aria-label="${i18n.t('game_wheel_tab')}">
                    <div class="bg-amber-100 text-amber-800 px-3.5 py-1 rounded-full text-xs font-bold shrink-0 shadow-sm border border-amber-200" id="wheel-status" role="status" aria-live="polite">
                        ${i18n.t('wheel_tap_spin')}
                    </div>
                    <div class="relative w-[80vw] max-w-[340px] aspect-square flex items-center justify-center shrink-0 drop-shadow-2xl">
                        <canvas id="wheel-canvas" width="400" height="400" class="w-full h-full object-contain" role="img" aria-label="${i18n.t('aria_wheel_canvas')}"></canvas>
                        <div class="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-10 bg-rose-600 z-10 border-4 border-white pointer-events-none drop-shadow-md" style="clip-path: polygon(50% 100%, 0 0, 100% 0);" aria-hidden="true"></div>
                        <button onclick="wheelGame.spin()" id="spin-btn" class="absolute w-18 h-18 sm:w-22 sm:h-22 bg-white hover:bg-slate-50 border-[5px] border-emerald-400 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.3)] z-20 cursor-pointer font-black text-emerald-600 text-base sm:text-lg hover:scale-105 active:scale-95 transition-all" aria-label="${i18n.t('aria_spin_wheel')}">
                            ${i18n.t('spin_btn')}
                        </button>
                    </div>
                </div>

                <div id="ww-cards-container" class="hidden w-full h-full flex flex-col justify-center items-center gap-6" role="region" aria-label="${i18n.t('game_cards_tab')}">
                    <div class="bg-rose-100 text-rose-800 px-3.5 py-1 rounded-full text-xs font-bold shrink-0 shadow-sm border border-rose-200">
                        ${i18n.t('prompt_cards')}
                    </div>
                    <div class="card-pile flex justify-center items-center shrink-0 mt-2">
                        <div class="stacked-card bg-rose-700 border-[3px] border-white/50 transform rotate-6 translate-x-4 translate-y-3" aria-hidden="true"></div>
                        <div class="stacked-card bg-rose-500 border-[3px] border-white/70 transform -rotate-3 -translate-x-3 -translate-y-2" aria-hidden="true"></div>
                        <button type="button" onclick="cardsGame.dealNextCard()" id="active-deck-card" class="stacked-card bg-gradient-to-br from-rose-500 to-pink-600 border-4 border-white flex flex-col items-center justify-center text-white cursor-pointer hover:-translate-y-6 hover:rotate-2 transition-all duration-300 z-10 shadow-2xl" aria-label="${i18n.t('aria_deal_card')}">
                            <span class="text-6xl drop-shadow-md" aria-hidden="true">🃏</span>
                            <span class="font-black mt-4 text-xs tracking-[0.2em] bg-black/20 px-3.5 py-1 rounded-full">${i18n.t('deal_card_btn')}</span>
                        </button>
                    </div>
                </div>

                <!-- 3D FLIP TILES CONTAINER -->
                <div id="ww-tiles-container" class="hidden w-full h-full flex flex-col items-center min-h-0 overflow-hidden" role="region" aria-label="${i18n.t('aria_tiles_game')}">
                    <div class="w-full flex flex-col sm:flex-row justify-between items-center bg-white/90 border border-slate-200 rounded-2xl px-4 py-2 mb-2 shrink-0 shadow-sm max-w-5xl gap-2">
                        <div id="tiles-prompt-text" class="bg-indigo-100 text-indigo-900 px-3.5 py-1 rounded-full text-xs font-black shadow-xs border border-indigo-200">
                            ${i18n.t('prompt_tiles')}
                        </div>
                        <div class="flex items-center gap-2">
                            <button onclick="tilesGame.flipAll()" class="bg-slate-100 hover:bg-slate-200 text-slate-800 font-black px-3.5 py-1 rounded-full text-xs shadow-xs transition-colors" aria-label="${i18n.t('aria_flip_all_tiles')}">🔄 ${i18n.t('flip_all_tiles')}</button>
                            <button onclick="tilesGame.reset()" class="bg-amber-100 hover:bg-amber-200 text-amber-900 font-black px-3.5 py-1 rounded-full text-xs shadow-xs transition-colors" aria-label="${i18n.t('aria_reset_tiles')}">⚡ ${i18n.t('reset_tiles')}</button>
                        </div>
                    </div>
                    <div id="tiles-grid" class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5 sm:gap-3.5 w-full max-w-5xl flex-1 overflow-y-auto p-3 custom-scrollbar pb-20"></div>
                </div>

                <!-- HONEYCOMB MATRIX CONTAINER -->
                <div id="ww-honeycomb-container" class="hidden w-full h-full flex flex-col items-center min-h-0 overflow-hidden" role="region" aria-label="${i18n.t('aria_honeycomb_game')}">
                    <div class="w-full flex justify-between items-center bg-white/90 border border-slate-200 rounded-2xl px-4 py-2 mb-2 shrink-0 shadow-sm max-w-5xl">
                        <div class="flex items-center gap-2">
                            <span class="text-amber-600 font-black text-sm">⬡ ${i18n.t('honeycomb_map_title')}</span>
                            <span id="hex-progress-badge" class="bg-amber-100 text-amber-950 px-3 py-0.5 rounded-full text-xs font-black">المتقن: 0 من 0</span>
                        </div>
                        <button onclick="honeycombGame.reset()" class="bg-amber-100 hover:bg-amber-200 text-amber-900 font-black px-3.5 py-1 rounded-full text-xs shadow-xs transition-colors" aria-label="${i18n.t('aria_reset_honeycomb')}">🔄 ${i18n.t('reset_honeycomb')}</button>
                    </div>
                    <div id="honeycomb-grid-container" class="w-full max-w-5xl flex-1 overflow-y-auto p-3 custom-scrollbar pb-20">
                        <div id="honeycomb-board" class="honeycomb-grid"></div>
                    </div>
                </div>
            </div>
            
            <div class="flex justify-center w-full mt-2 shrink-0 pt-2 border-t border-slate-200">
                <button onclick="app.finishToSummary()" class="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2.5 rounded-full font-black text-xs sm:text-sm shadow-md transition-transform hover:-translate-y-0.5 flex items-center gap-2" aria-label="${i18n.t('view_final_report_aria')}">
                    <span>${i18n.t('view_final_report_btn')}</span> <span class="text-base" aria-hidden="true">🏆</span>
                </button>
            </div>
        </section>

        <!-- GIGANTIC WORD DISPLAY MODAL OVERLAY -->
        <div id="word-overlay" class="hidden fixed inset-0 bg-slate-900/80 z-50 flex flex-col justify-center items-center p-3 sm:p-6 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="revealed-info">
            <div class="giant-word-overlay bg-white rounded-[2.5rem] w-full max-w-3xl max-h-[90vh] p-5 sm:p-8 flex flex-col justify-between items-center shadow-2xl border-4 border-emerald-400 overflow-y-auto custom-scrollbar">
                <div class="w-full flex justify-between items-center px-2 shrink-0 mb-3">
                    <span id="revealed-info" class="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-bold text-xs uppercase tracking-wider">${i18n.t('question_card_badge')}</span>
                    <button onclick="app.closeOverlay()" class="bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-600 px-3.5 py-1 rounded-full text-xs font-black transition-colors" aria-label="${i18n.t('close')}">✕ ${i18n.t('close')}</button>
                </div>
                <div id="giant-arabic-word" class="flex-1 flex items-center justify-center w-full py-4 min-h-[160px]" role="region" aria-label="${i18n.t('aria_revealed_word')}" aria-live="polite">
                </div>
                <div class="w-full max-w-sm shrink-0 mt-4">
                    <div class="grid grid-cols-2 gap-3">
                        <button onclick="app.gradeResult(false)" class="bg-rose-500 hover:bg-rose-600 text-white py-3.5 rounded-2xl text-base shadow-[0_4px_0_#be123c] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 font-black" aria-label="${i18n.t('aria_mark_missed')}">
                            ❌ ${i18n.t('btn_incorrect')}
                        </button>
                        <button onclick="app.gradeResult(true)" class="bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-2xl text-base shadow-[0_4px_0_#047857] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 font-black" aria-label="${i18n.t('aria_mark_perfect')}">
                            ✔ ${i18n.t('txt_perfect')}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- EARLY EXIT MODAL FOR SESSION DRILL -->
        <div id="early-exit-modal" class="hidden fixed inset-0 bg-slate-900/80 z-50 flex flex-col justify-center items-center p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="early-exit-title">
            <div class="bg-white rounded-[2.5rem] w-full max-w-md p-6 sm:p-7 flex flex-col items-center text-center shadow-2xl border-4 border-rose-200 animate-in fade-in zoom-in duration-150" dir="${(typeof i18n !== 'undefined' && i18n.getActiveMeta) ? i18n.getActiveMeta().dir : 'rtl'}">
                <div class="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-3xl mb-3 shadow-inner" aria-hidden="true">
                    ⚠️
                </div>
                <h3 id="early-exit-title" class="text-xl sm:text-2xl font-black text-slate-800 mb-2">
                    ${i18n.t('early_exit_title')}
                </h3>
                <p id="early-exit-desc" class="text-slate-600 font-bold text-xs sm:text-sm leading-relaxed mb-6">
                    ${i18n.t('early_exit_desc')}
                </p>
                <div class="w-full flex flex-col gap-2.5">
                    <button type="button" id="btn-early-exit-save" onclick="app.confirmEarlyExit('save')" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 px-4 rounded-2xl text-sm shadow-[0_3px_0_#047857] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer">
                        <span>💾</span> <span>${i18n.t('early_exit_save_btn')}</span>
                    </button>
                    <button type="button" id="btn-early-exit-cancel" onclick="app.confirmEarlyExit('cancel')" class="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-black py-3 px-4 rounded-2xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer">
                        <span>🔄</span> <span>${i18n.t('early_exit_cancel_btn')}</span>
                    </button>
                    <button type="button" id="btn-early-exit-resume" onclick="app.closeEarlyExitModal()" class="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-2xl text-xs transition-colors cursor-pointer mt-1">
                        ${i18n.t('early_exit_resume_btn')}
                    </button>
                </div>
            </div>
        </div>

        <!-- STAGE 5: FINAL SUMMARY SCREEN -->
        <section id="summary-screen" class="hidden w-full max-w-2xl bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-2xl text-center space-y-5 border-4 border-emerald-100 shrink-0 my-auto z-10" role="region" aria-label="${i18n.t('aria_final_summary')}">
            <h2 class="text-3xl sm:text-4xl font-black text-slate-800">${i18n.t('challenge_completed_title')}</h2>
            <div class="grid grid-cols-2 gap-4 items-center">
                <div class="space-y-2">
                    <span class="text-slate-600 font-bold uppercase text-xs sm:text-sm tracking-wider">${i18n.t('points_gathered_label')}</span>
                    <div id="final-score" class="text-5xl sm:text-6xl font-black text-emerald-600 drop-shadow-sm leading-none" role="status" aria-live="polite">0</div>
                </div>
                <div class="flex flex-col items-center">
                    <div class="chart-container"><canvas id="summaryChart" role="img" aria-label="${i18n.t('aria_chart_summary')}"></canvas></div>
                </div>
            </div>
            <div class="flex flex-wrap justify-center pt-2 gap-3">
                <button type="button" id="btn-review-mistakes" onclick="app.startSessionDrill()" class="hidden bg-rose-500 hover:bg-rose-600 text-white text-base font-bold py-3 px-8 rounded-full shadow-lg transition-all flex items-center gap-2 cursor-pointer" aria-label="${i18n.t('aria_review_mistakes')}" title="${i18n.t('review_mistakes_btn')}">
                    <span>${i18n.t('review_mistakes_btn')}</span> <span aria-hidden="true">🎯</span>
                </button>
                <button onclick="app.jumpTo('ww_box')" class="bg-slate-200 text-slate-700 text-base font-bold py-3 px-6 rounded-full shadow-md hover:bg-slate-300 transition-all" aria-label="${i18n.t('aria_open_games')}">${i18n.t('games_room_title')} 🎮</button>
                <button onclick="location.reload()" class="bg-slate-900 text-white text-base font-bold py-3 px-8 rounded-full shadow-lg hover:bg-black transition-all" aria-label="${i18n.t('aria_replay_challenge')}">${i18n.t('play_again_btn')}</button>
            </div>
        </section>

    </main>

    <footer class="text-center text-[10px] text-slate-600 py-1 shrink-0 h-6">
        ${footerText}
    </footer>
    `;

    // Prepend to body before scripts
    const container = document.createElement('div');
    container.className = 'w-full h-full flex flex-col items-center overflow-hidden';
    container.innerHTML = fullHtml;
    document.body.insertBefore(container, document.body.firstChild);

    // Update active student pill automatically
    updateActiveStudentPill();

    // Setup Focus Trap & Restoration for modals
    setupModalAccessibility();
}

/**
 * تطبيق حصر واستعادة التركيز (Focus Trap & Restoration) للنوافذ المنبثقة التفاعلية
 */
function setupModalAccessibility() {
    const modalIds = ['word-overlay', 'game-transition-stage', 'early-exit-modal'];
    const focusableSelector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    let lastFocusedElement = null;
    document.addEventListener('focusin', (e) => {
        const isInsideModal = modalIds.some(id => {
            const el = document.getElementById(id);
            return el && el.contains(e.target);
        });
        if (!isInsideModal) {
            lastFocusedElement = e.target;
        }
    }, true);

    modalIds.forEach(id => {
        const modal = document.getElementById(id);
        if (!modal || modal._hasAccessibilityObs) return;
        modal._hasAccessibilityObs = true;

        let prevClassHidden = modal.classList.contains('hidden');
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(() => {
                const isHidden = modal.classList.contains('hidden');
                if (prevClassHidden && !isHidden) {
                    // Modal opened: record trigger & focus first element
                    modal._savedTrigger = lastFocusedElement || document.activeElement;
                    const focusables = Array.from(modal.querySelectorAll(focusableSelector)).filter(el => el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0);
                    if (focusables.length > 0) {
                        focusables[0].focus();
                    }
                } else if (!prevClassHidden && isHidden) {
                    // Modal closed: restore focus
                    if (modal._savedTrigger && typeof modal._savedTrigger.focus === 'function' && document.body.contains(modal._savedTrigger)) {
                        modal._savedTrigger.focus();
                    }
                    modal._savedTrigger = null;
                }
                prevClassHidden = isHidden;
            });
        });
        observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
    });

    if (!window._nbModalKeydownBound) {
        window._nbModalKeydownBound = true;
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Tab') return;
            const activeModal = modalIds.map(id => document.getElementById(id)).find(el => el && !el.classList.contains('hidden'));
            if (!activeModal) return;

            const focusables = Array.from(activeModal.querySelectorAll(focusableSelector)).filter(el => el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0);
            if (focusables.length === 0) return;

            const firstEl = focusables[0];
            const lastEl = focusables[focusables.length - 1];

            if (e.shiftKey) {
                if (document.activeElement === firstEl || !activeModal.contains(document.activeElement)) {
                    e.preventDefault();
                    lastEl.focus();
                }
            } else {
                if (document.activeElement === lastEl || !activeModal.contains(document.activeElement)) {
                    e.preventDefault();
                    firstEl.focus();
                }
            }
        });
    }
}

/**
 * تحديث زر اللغة وشارة الطالب النشط في ترويسة الدرس تلقائياً
 */
function updateTopNavLang() {
    if (typeof i18n === 'undefined') return;
    const isAr = i18n.getLocale() === 'ar';
    const langBtnText = document.getElementById('top-nav-lang-text');
    const langBtn = document.getElementById('top-nav-lang-btn');
    if (langBtnText) {
        langBtnText.textContent = isAr ? 'EN' : 'عربي';
    }
    if (langBtn) {
        langBtn.setAttribute('aria-label', isAr ? 'التحويل إلى اللغة الإنجليزية' : 'Switch to Arabic language');
    }
}

/**
 * تحديث شارة الطالب النشط في ترويسة الدرس تلقائياً عبر studentManager
 */
function updateActiveStudentPill() {
    const pill = document.getElementById('active-student-pill');
    const nameEl = document.getElementById('active-student-name-text');
    const avatarEl = document.getElementById('active-student-avatar-icon');
    if (!nameEl || !avatarEl) return;

    if (typeof studentManager !== 'undefined' && typeof studentManager.getActiveStudent === 'function') {
        const student = studentManager.getActiveStudent();
        if (student && (student.name || student.id)) {
            nameEl.textContent = student.name || (typeof i18n !== 'undefined' ? i18n.t('student_name_placeholder') : 'طالب');
            avatarEl.textContent = student.avatar || '👤';
            if (pill) {
                pill.setAttribute('aria-label', `${typeof i18n !== 'undefined' ? i18n.t('active_badge') : 'الطالب الحالي'}: ${student.name}`);
                pill.title = student.name;
            }
            return;
        }
    }

    const defaultText = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('general_session') : 'حصة عامة';
    nameEl.textContent = defaultText;
    avatarEl.textContent = '👤';
    if (pill) {
        pill.setAttribute('aria-label', defaultText);
        pill.title = defaultText;
    }
}

// إتاحة الدوال عالمياً وتحديث الشارة عند جاهزية الصفحة
window.updateActiveStudentPill = updateActiveStudentPill;
window.updateTopNavLang = updateTopNavLang;
window.setupModalAccessibility = setupModalAccessibility;

if (typeof document !== 'undefined') {
    const initTopBar = () => {
        updateActiveStudentPill();
        updateTopNavLang();
        setupModalAccessibility();
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTopBar);
    } else {
        initTopBar();
    }
}

if (typeof window !== 'undefined') {
    window.addEventListener('nb:locale-changed', () => {
        updateActiveStudentPill();
        updateTopNavLang();
    });
}

