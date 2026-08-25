/**
 * Game AI Module - وحدة الخصم الآلي ومستويات اللعب لألعاب الاستراحة
 * المنظومة: نور البيان
 *
 * الخصائص:
 * 1. وضع اللعب: ضد الكمبيوتر (🤖 ضد الكمبيوتر) / مع المعلم (👨‍🏫 مع المعلم)
 * 2. مستويات الصعوبة: سهل (😊 حركات عفوية ممتعة) / ذكي (🧠 شجرة قرارات تكتيكية حتمية)
 * 3. استقلالية تامة: ملف منفصل يُستدعى اختيارياً دون تضخيم المنطق الأساسي للألعاب
 */

const gameAI = {
    mode: 'computer', // 'computer' (ضد الكمبيوتر) | 'teacher' (مع المعلم)
    difficulty: 'easy', // 'easy' (سهل عشوائي) | 'smart' (ذكي حتمي وتكتيكي)

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
        if (this.mode !== 'computer' || typeof xoGame === 'undefined' || !xoGame.gameActive || xoGame.currentPlayer !== 'O') return;

        // التحقق من وجود عناصر DOM للوح قبل تنفيذ النقلة
        const container = document.getElementById('xo-board');
        if (!container || !container.children || container.children.length < 9) return;

        const available = xoGame.board.map((v, i) => v === '' ? i : null).filter(v => v !== null);
        if (available.length === 0) return;

        let move = -1;

        // في المستوى الذكي: شجرة قرارات تكتيكية حتمية (الفوز -> الحجب -> المركز -> الزوايا -> الأطراف)
        if (this.difficulty === 'smart') {
            const winCond = [
                [0, 1, 2], [3, 4, 5], [6, 7, 8],
                [0, 3, 6], [1, 4, 7], [2, 5, 8],
                [0, 4, 8], [2, 4, 6]
            ];

            // 1. فرصة فوز حتمية للكمبيوتر ('O')
            for (const [a, b, c] of winCond) {
                const line = [xoGame.board[a], xoGame.board[b], xoGame.board[c]];
                if (line.filter(x => x === 'O').length === 2 && line.includes('')) {
                    move = [a, b, c][line.indexOf('')];
                    break;
                }
            }

            // 2. حجب فوز الطفل ('X')
            if (move === -1) {
                for (const [a, b, c] of winCond) {
                    const line = [xoGame.board[a], xoGame.board[b], xoGame.board[c]];
                    if (line.filter(x => x === 'X').length === 2 && line.includes('')) {
                        move = [a, b, c][line.indexOf('')];
                        break;
                    }
                }
            }

            // 3. السيطرة على خانة المركز (4)
            if (move === -1 && xoGame.board[4] === '') {
                move = 4;
            }

            // 4. السيطرة على الزوايا الحتمية [0, 2, 6, 8]
            if (move === -1) {
                const corners = [0, 2, 6, 8];
                const freeCorner = corners.find(idx => xoGame.board[idx] === '');
                if (freeCorner !== undefined) {
                    move = freeCorner;
                }
            }

            // 5. السيطرة على الأطراف [1, 3, 5, 7]
            if (move === -1) {
                const edges = [1, 3, 5, 7];
                const freeEdge = edges.find(idx => xoGame.board[idx] === '');
                if (freeEdge !== undefined) {
                    move = freeEdge;
                }
            }
        }

        // في المستوى السهل أو في غياب الشروط: اختيار خانة عشوائية ليفوز الطفل بسهولة
        if (move === -1) {
            move = available[Math.floor(Math.random() * available.length)];
        }

        if (container.children[move]) {
            xoGame.play(move, container.children[move]);
        }
    },

    // حركة الكمبيوتر في لعبة Connect 4 (أربعة في خط) بأولويات استراتيجية وتطويق try/finally
    makeC4Move() {
        if (this.mode !== 'computer' || typeof c4Game === 'undefined' || !c4Game.gameActive || c4Game.currentPlayer !== 'yellow') return;

        const validCols = [];
        for (let c = 0; c < c4Game.cols; c++) {
            if (c4Game.board[0] && c4Game.board[0][c] === null) validCols.push(c);
        }
        if (validCols.length === 0) return;

        let bestCol = -1;
        const STRATEGIC_COL_ORDER = [3, 2, 4, 1, 5, 0, 6];

        if (this.difficulty === 'smart') {
            // 1. فحص الفوز الفوري للكمبيوتر (أصفر) بترتيب الأولويات
            for (const col of STRATEGIC_COL_ORDER) {
                if (!validCols.includes(col)) continue;
                const r = this.getC4LowestRow(col);
                if (r !== -1) {
                    c4Game.board[r][col] = 'yellow';
                    try {
                        if (c4Game.checkWin(r, col)) {
                            bestCol = col;
                            break;
                        }
                    } finally {
                        c4Game.board[r][col] = null;
                    }
                }
            }

            // 2. حجب فوز الطفل (أحمر) بترتيب الأولويات
            if (bestCol === -1) {
                for (const col of STRATEGIC_COL_ORDER) {
                    if (!validCols.includes(col)) continue;
                    const r = this.getC4LowestRow(col);
                    if (r !== -1) {
                        c4Game.board[r][col] = 'red';
                        try {
                            if (c4Game.checkWin(r, col)) {
                                bestCol = col;
                                break;
                            }
                        } finally {
                            c4Game.board[r][col] = null;
                        }
                    }
                }
            }

            // 3. تجنب إهداء الفوز للخصم في الصف الأعلى (Avoid Suicidal Blunder)
            if (bestCol === -1) {
                const safeCols = STRATEGIC_COL_ORDER.filter(col => {
                    if (!validCols.includes(col)) return false;
                    const r = this.getC4LowestRow(col);
                    if (r <= 0) return true;
                    c4Game.board[r][col] = 'yellow';
                    try {
                        c4Game.board[r - 1][col] = 'red';
                        try {
                            const wouldEnableLoss = Boolean(c4Game.checkWin(r - 1, col));
                            return !wouldEnableLoss;
                        } finally {
                            c4Game.board[r - 1][col] = null;
                        }
                    } finally {
                        c4Game.board[r][col] = null;
                    }
                });

                if (safeCols.length > 0) {
                    bestCol = safeCols[0]; // اختيار العمود الأفضل استراتيجياً والأكثر أماناً
                }
            }
        }

        // في المستوى السهل أو غياب الشروط: اختيار عمود عشوائي
        if (bestCol === -1) {
            bestCol = validCols[Math.floor(Math.random() * validCols.length)];
        }

        c4Game.drop(bestCol);
    },

    // دالة مساعدة لمعرفة أدنى صف فارغ في العمود
    getC4LowestRow(col) {
        if (!c4Game.board || !Array.isArray(c4Game.board)) return -1;
        for (let r = c4Game.rows - 1; r >= 0; r--) {
            if (c4Game.board[r] && !c4Game.board[r][col]) return r;
        }
        return -1;
    },

    // دالة مساعدة لتحديث أزرار التحكم في ألعاب المنافسة (XO / C4)
    _updateGameControlButtons(prefix, compBgClass) {
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

        const modeBtn = document.getElementById(`${prefix}-mode-btn`);
        const diffBtn = document.getElementById(`${prefix}-diff-btn`);

        if (modeBtn) {
            modeBtn.innerText = modeLabel;
            modeBtn.className = isComp
                ? `${compBgClass} text-white px-3.5 py-1.5 rounded-full font-bold text-xs shadow-sm transition-all`
                : 'bg-indigo-500/80 hover:bg-indigo-500 text-white border border-indigo-300/40 px-3.5 py-1.5 rounded-full font-bold text-xs shadow-sm transition-all';
        }
        if (diffBtn) {
            diffBtn.style.display = isComp ? 'inline-block' : 'none';
            diffBtn.innerText = diffLabel;
        }
    },

    // تحديث مظهر وتسميات أزرار التحكم للألعاب التنافسية
    updateUI() {
        this._updateGameControlButtons('xo', 'bg-emerald-500/80 hover:bg-emerald-500 border border-emerald-300/40');
        this._updateGameControlButtons('c4', 'bg-sky-500/80 hover:bg-sky-500 border border-sky-300/40');
    }
};

// تهيئة تلقائية للواجهة عند التحميل وتحديثها عند تبديل اللغة
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        if (typeof gameAI !== 'undefined') gameAI.updateUI();
    });
}
if (typeof window !== 'undefined') {
    window.addEventListener(NBContracts.EVENTS.LOCALE_CHANGED, () => {
        if (typeof gameAI !== 'undefined') gameAI.updateUI();
    });
    window.gameAI = gameAI;
}
