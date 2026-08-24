/**
 * Game AI Module - وحدة الخصم الآلي ومستويات اللعب لألعاب الاستراحة
 * المنظومة: نور البيان
 *
 * الخصائص:
 * 1. وضع اللعب: ضد الكمبيوتر (🤖 ضد الكمبيوتر) / مع المعلم (👨‍🏫 مع المعلم)
 * 2. مستويات الصعوبة: سهل (😊 حركات عفوية ممتعة) / ذكي (🧠 حركات متوازنة بحذر)
 * 3. استقلالية تامة: ملف منفصل يُستدعى اختيارياً دون تضخيم المنطق الأساسي للألعاب
 */

const gameAI = {
    mode: 'computer', // 'computer' (ضد الكمبيوتر) | 'teacher' (مع المعلم)
    difficulty: 'easy', // 'easy' (سهل عشوائي) | 'smart' (ذكي خفيف)

    // تبديل وضع اللعب (كمبيوتر / معلم)
    toggleMode(gameType) {
        this.mode = this.mode === 'computer' ? 'teacher' : 'computer';
        this.updateUI();
        if (gameType === 'xo' && typeof xoGame !== 'undefined') xoGame.reset();
        if (gameType === 'c4' && typeof c4Game !== 'undefined') c4Game.reset();
    },

    // تبديل مستوى الصعوبة (سهل / ذكي)
    toggleDifficulty() {
        this.difficulty = this.difficulty === 'easy' ? 'smart' : 'easy';
        this.updateUI();
    },

    // حركة الكمبيوتر في لعبة إكس-أو (Tic-Tac-Toe)
    makeXOMove() {
        if (this.mode !== 'computer' || !xoGame.gameActive || xoGame.currentPlayer !== 'O') return;

        const available = xoGame.board.map((v, i) => v === '' ? i : null).filter(v => v !== null);
        if (available.length === 0) return;

        let move = -1;

        // في المستوى الذكي: فحص الفوز أو الحجب
        if (this.difficulty === 'smart') {
            const winCond = [
                [0, 1, 2], [3, 4, 5], [6, 7, 8],
                [0, 3, 6], [1, 4, 7], [2, 5, 8],
                [0, 4, 8], [2, 4, 6]
            ];

            // 1. فرصة فوز للكمبيوتر
            for (const [a, b, c] of winCond) {
                const line = [xoGame.board[a], xoGame.board[b], xoGame.board[c]];
                if (line.filter(x => x === 'O').length === 2 && line.includes('')) {
                    move = [a, b, c][line.indexOf('')];
                    break;
                }
            }

            // 2. حجب فوز الطفل
            if (move === -1) {
                for (const [a, b, c] of winCond) {
                    const line = [xoGame.board[a], xoGame.board[b], xoGame.board[c]];
                    if (line.filter(x => x === 'X').length === 2 && line.includes('')) {
                        move = [a, b, c][line.indexOf('')];
                        break;
                    }
                }
            }

            // 3. اختيار المركز
            if (move === -1 && xoGame.board[4] === '' && Math.random() > 0.4) {
                move = 4;
            }
        }

        // في المستوى السهل أو في غياب شروط الفوز: اختيار خانة عشوائية ليفوز الطفل بسهولة
        if (move === -1) {
            move = available[Math.floor(Math.random() * available.length)];
        }

        const container = document.getElementById('xo-board');
        if (container && container.children[move]) {
            xoGame.play(move, container.children[move]);
        }
    },

    // حركة الكمبيوتر في لعبة Connect 4 (أربعة في خط)
    makeC4Move() {
        if (this.mode !== 'computer' || !c4Game.gameActive || c4Game.currentPlayer !== 'yellow') return;

        const validCols = [];
        for (let c = 0; c < c4Game.cols; c++) {
            if (c4Game.board[0][c] === null) validCols.push(c);
        }
        if (validCols.length === 0) return;

        let bestCol = -1;

        if (this.difficulty === 'smart') {
            // 1. فحص الفوز للكمبيوتر (أصفر)
            for (const col of validCols) {
                const r = this.getC4LowestRow(col);
                if (r !== -1) {
                    c4Game.board[r][col] = 'yellow';
                    if (c4Game.checkWin(r, col)) bestCol = col;
                    c4Game.board[r][col] = null;
                    if (bestCol !== -1) break;
                }
            }

            // 2. حجب فوز الطفل (أحمر)
            if (bestCol === -1) {
                for (const col of validCols) {
                    const r = this.getC4LowestRow(col);
                    if (r !== -1) {
                        c4Game.board[r][col] = 'red';
                        if (c4Game.checkWin(r, col)) bestCol = col;
                        c4Game.board[r][col] = null;
                        if (bestCol !== -1) break;
                    }
                }
            }

            // 3. تجنب إهداء الفوز للخصم في الصف الأعلى (Avoid Suicidal Blunder)
            if (bestCol === -1) {
                const safeCols = validCols.filter(col => {
                    const r = this.getC4LowestRow(col);
                    if (r <= 0) return true;
                    c4Game.board[r][col] = 'yellow';
                    c4Game.board[r - 1][col] = 'red';
                    const wouldEnableLoss = !!c4Game.checkWin(r - 1, col);
                    c4Game.board[r - 1][col] = null;
                    c4Game.board[r][col] = null;
                    return !wouldEnableLoss;
                });
                if (safeCols.length > 0) {
                    bestCol = safeCols[Math.floor(Math.random() * safeCols.length)];
                }
            }
        }

        // في المستوى السهل أو غياب الشروط: اختيار عمود عشوائي خفيف
        if (bestCol === -1) {
            bestCol = validCols[Math.floor(Math.random() * validCols.length)];
        }

        c4Game.drop(bestCol);
    },

    // دالة مساعدة لمعرفة أدنى صف فارغ في العمود
    getC4LowestRow(col) {
        for (let r = c4Game.rows - 1; r >= 0; r--) {
            if (!c4Game.board[r][col]) return r;
        }
        return -1;
    },

    // تحديث مظهر وتسميات أزرار التحكم
    updateUI() {
        const isComp = this.mode === 'computer';
        const modeLabel = isComp
            ? (typeof i18n !== 'undefined' ? i18n.t("mode_vs_computer", "🤖 ضد الكمبيوتر") : "🤖 ضد الكمبيوتر")
            : (typeof i18n !== 'undefined' ? i18n.t("mode_vs_teacher", "👨‍🏫 مع المعلم") : "👨‍🏫 مع المعلم");
        const diffText = this.difficulty === 'easy'
            ? (typeof i18n !== 'undefined' ? i18n.t("diff_easy", "سهل 😊") : "سهل 😊")
            : (typeof i18n !== 'undefined' ? i18n.t("diff_smart", "ذكي 🧠") : "ذكي 🧠");
        const diffLabel = typeof i18n !== 'undefined'
            ? i18n.t("level_label", `مستوى: ${diffText}`, { level: diffText })
            : `مستوى: ${diffText}`;

        // أزرار XO
        const xoModeBtn = document.getElementById('xo-mode-btn');
        const xoDiffBtn = document.getElementById('xo-diff-btn');
        if (xoModeBtn) {
            xoModeBtn.innerText = modeLabel;
            xoModeBtn.className = isComp
                ? 'bg-emerald-500/80 hover:bg-emerald-500 text-white border border-emerald-300/40 px-3.5 py-1.5 rounded-full font-bold text-xs shadow-sm transition-all'
                : 'bg-indigo-500/80 hover:bg-indigo-500 text-white border border-indigo-300/40 px-3.5 py-1.5 rounded-full font-bold text-xs shadow-sm transition-all';
        }
        if (xoDiffBtn) {
            xoDiffBtn.style.display = isComp ? 'inline-block' : 'none';
            xoDiffBtn.innerText = diffLabel;
        }

        // أزرار Connect 4
        const c4ModeBtn = document.getElementById('c4-mode-btn');
        const c4DiffBtn = document.getElementById('c4-diff-btn');
        if (c4ModeBtn) {
            c4ModeBtn.innerText = modeLabel;
            c4ModeBtn.className = isComp
                ? 'bg-sky-500/80 hover:bg-sky-500 text-white border border-sky-300/40 px-3.5 py-1.5 rounded-full font-bold text-xs shadow-sm transition-all'
                : 'bg-indigo-500/80 hover:bg-indigo-500 text-white border border-indigo-300/40 px-3.5 py-1.5 rounded-full font-bold text-xs shadow-sm transition-all';
        }
        if (c4DiffBtn) {
            c4DiffBtn.style.display = isComp ? 'inline-block' : 'none';
            c4DiffBtn.innerText = diffLabel;
        }
    }
};

// تهيئة تلقائية للواجهة عند التحميل وتحديثها عند تبديل اللغة
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        if (typeof gameAI !== 'undefined') gameAI.updateUI();
    });
}
if (typeof window !== 'undefined') {
    window.addEventListener('nb:locale-changed', () => {
        if (typeof gameAI !== 'undefined') gameAI.updateUI();
    });
}
