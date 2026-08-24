const xoGame = {
    board: ['', '', '', '', '', '', '', '', ''], currentPlayer: 'X', gameActive: true, aiTimer: null,
    init() {
        if (this.aiTimer) { clearTimeout(this.aiTimer); this.aiTimer = null; }
        const container = document.getElementById('xo-board'); if (!container) return; container.textContent = '';
        for (let i = 0; i < 9; i++) {
            let cell = document.createElement('button');
            cell.type = 'button';
            cell.className = 'xo-cell-new shadow-[0_4px_0_#047857] active:shadow-none active:translate-y-1';
            cell.setAttribute('aria-label', `Cell ${i + 1}, empty`);
            cell.onclick = () => {
                if (typeof gameAI !== 'undefined' && gameAI.mode === 'computer' && this.currentPlayer === 'O') return;
                this.play(i, cell);
            };
            container.appendChild(cell);
        }
    },
    play(idx, cell) {
        if (this.board[idx] !== '' || !this.gameActive) return;
        this.board[idx] = this.currentPlayer;
        cell.innerText = this.currentPlayer;
        cell.setAttribute('aria-label', `Cell ${idx + 1}, ${this.currentPlayer}`);
        cell.classList.add(this.currentPlayer === 'X' ? 'xo-x' : 'xo-o');
        let winLine = this.checkWin();
        if (winLine) {
            const isComp = typeof gameAI !== 'undefined' && gameAI.mode === 'computer';
            const winner = (this.currentPlayer === 'O' && isComp)
                ? (typeof i18n !== 'undefined' ? i18n.t("computer", "الكمبيوتر 🤖") : "الكمبيوتر 🤖")
                : this.currentPlayer;
            const status = document.getElementById('xo-status');
            if (status) {
                status.innerText = typeof i18n !== 'undefined'
                    ? i18n.t("player_won", `${winner} Won! 🎉`, { player: winner })
                    : `${winner} Won! 🎉`;
                status.classList.add('text-yellow-300');
            }
            this.gameActive = false;
            if (typeof fireCelebration === 'function') fireCelebration();
            if (typeof app !== 'undefined') app.setGameResumeState('xo-resume-btn', true, typeof i18n !== 'undefined' ? i18n.t("continue_reading_btn") : "Continue Reading 📖");
            const container = document.getElementById('xo-board');
            if (container) { const cells = container.children; winLine.forEach(i => { if (cells[i]) cells[i].classList.add('win-anim'); }); }
            return;
        }
        if (!this.board.includes('')) {
            const status = document.getElementById('xo-status');
            if (status) status.innerText = typeof i18n !== 'undefined' ? i18n.t("draw_game", "Draw Game! 🤝") : "Draw Game! 🤝";
            this.gameActive = false;
            if (typeof app !== 'undefined') app.setGameResumeState('xo-resume-btn', true, typeof i18n !== 'undefined' ? i18n.t("continue_reading_btn") : "Continue Reading 📖");
            return;
        }
        this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
        const isComp = typeof gameAI !== 'undefined' && gameAI.mode === 'computer';
        const status = document.getElementById('xo-status');
        if (status) {
            status.innerText = (isComp && this.currentPlayer === 'O')
                ? (typeof i18n !== 'undefined' ? i18n.t("ai_thinking", "Computer is thinking... 🤖") : "Computer is thinking... 🤖")
                : (typeof i18n !== 'undefined' ? i18n.t("player_turn", `Player ${this.currentPlayer} Turn`, { player: this.currentPlayer }) : `Player ${this.currentPlayer} Turn`);
            status.classList.remove('text-yellow-300');
        }
        if (isComp && this.currentPlayer === 'O' && this.gameActive) {
            if (this.aiTimer) clearTimeout(this.aiTimer);
            this.aiTimer = setTimeout(() => {
                this.aiTimer = null;
                if (typeof gameAI !== 'undefined') gameAI.makeXOMove();
            }, 450);
        }
    },
    checkWin() {
        const winCond = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
        for (let winningCombo of winCond) { if (this.board[winningCombo[0]] && this.board[winningCombo[0]] === this.board[winningCombo[1]] && this.board[winningCombo[1]] === this.board[winningCombo[2]]) return winningCombo; }
        return null;
    },
    reset() {
        if (this.aiTimer) { clearTimeout(this.aiTimer); this.aiTimer = null; }
        this.board = ['', '', '', '', '', '', '', '', '']; this.currentPlayer = 'X'; this.gameActive = true;
        const status = document.getElementById('xo-status');
        if (status) {
            status.innerText = typeof i18n !== 'undefined'
                ? i18n.t("player_turn", "Player X Turn", { player: 'X' })
                : "Player X Turn";
            status.classList.remove('text-yellow-300');
        }
        if (typeof app !== 'undefined') app.setGameResumeState('xo-resume-btn', false, '', typeof i18n !== 'undefined' ? i18n.t("skip_and_read", "Skip & Read ⏭️") : "Skip & Read ⏭️");
        if (typeof gameAI !== 'undefined') gameAI.updateUI();
        this.init();
    }
};

const c4Game = {
    rows: 6, cols: 7, board: [], currentPlayer: 'red', gameActive: true, aiTimer: null,
    init() {
        if (this.aiTimer) { clearTimeout(this.aiTimer); this.aiTimer = null; }
        const container = document.getElementById('c4-board-container'); if (!container) return; container.innerHTML = '';
        this.board = Array(this.rows).fill(null).map(() => Array(this.cols).fill(null));
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                let cell = document.createElement('button');
                cell.type = 'button';
                cell.className = 'c4-cell-new';
                cell.id = `c4-${r}-${c}`;
                cell.setAttribute('aria-label', `Row ${r + 1}, Column ${c + 1}`);
                cell.onclick = () => {
                    if (typeof gameAI !== 'undefined' && gameAI.mode === 'computer' && this.currentPlayer === 'yellow') return;
                    this.drop(c);
                };
                container.appendChild(cell);
            }
        }
        if (typeof gameAI !== 'undefined') gameAI.updateUI();
    },
    drop(col) {
        if (!this.gameActive) return;
        for (let row = this.rows - 1; row >= 0; row--) {
            if (!this.board[row][col]) {
                this.board[row][col] = this.currentPlayer;
                let cell = document.getElementById(`c4-${row}-${col}`);
                if (cell) {
                    cell.classList.add(this.currentPlayer === 'red' ? 'c4-red' : 'c4-yellow');
                    cell.setAttribute('aria-label', `Row ${row + 1}, Column ${col + 1}, ${this.currentPlayer}`);
                    let piece = document.createElement('div');
                    piece.className = `absolute inset-0 rounded-full w-full h-full ${this.currentPlayer === 'red' ? 'c4-red-new' : 'c4-yellow-new'}`;
                    cell.appendChild(piece);
                }
                let winCells = this.checkWin(row, col);
                const isComp = typeof gameAI !== 'undefined' && gameAI.mode === 'computer';
                if (winCells) {
                    let winnerName = this.currentPlayer === 'red'
                        ? (typeof i18n !== 'undefined' ? i18n.t("c4_red", "Red 🔴") : "Red 🔴")
                        : (isComp
                            ? (typeof i18n !== 'undefined' ? i18n.t("computer", "الكمبيوتر 🤖") : "الكمبيوتر 🤖")
                            : (typeof i18n !== 'undefined' ? i18n.t("c4_yellow", "Yellow 🟡") : "Yellow 🟡"));
                    const status = document.getElementById('c4-status');
                    if (status) {
                        status.textContent = typeof i18n !== 'undefined'
                            ? i18n.t("player_won", `${winnerName} Wins! 🎉`, { player: winnerName })
                            : `${winnerName} Wins! 🎉`;
                        status.classList.add('text-yellow-300');
                    }
                    this.gameActive = false;
                    if (typeof app !== 'undefined') app.setGameResumeState('c4-resume-btn', true, typeof i18n !== 'undefined' ? i18n.t("continue_reading_btn") : "Continue Reading 📖");
                    setTimeout(() => {
                        if (this.currentPlayer === 'red' && typeof fireCelebration === 'function') fireCelebration();
                        winCells.forEach(([wr, wc]) => {
                            const cEl = document.getElementById(`c4-${wr}-${wc}`);
                            if (cEl && cEl.firstElementChild) cEl.firstElementChild.classList.add('win-anim');
                        });
                    }, 500);
                    return;
                }
                // Check draw
                if (this.board.every(r => r.every(c => c !== null))) {
                    const status = document.getElementById('c4-status');
                    if (status) status.textContent = typeof i18n !== 'undefined' ? i18n.t("draw_game", "Draw Game! 🤝") : "Draw Game! 🤝";
                    this.gameActive = false;
                    if (typeof app !== 'undefined') app.setGameResumeState('c4-resume-btn', true, typeof i18n !== 'undefined' ? i18n.t("continue_reading_btn") : "Continue Reading 📖");
                    return;
                }
                this.currentPlayer = this.currentPlayer === 'red' ? 'yellow' : 'red';
                const status = document.getElementById('c4-status');
                if (status) {
                    const turnLabel = this.currentPlayer === 'red'
                        ? (typeof i18n !== 'undefined' ? i18n.t("c4_turn_red", "Red's Turn 🔴") : "Red's Turn 🔴")
                        : (typeof i18n !== 'undefined' ? i18n.t("c4_turn_yellow", "Yellow's Turn 🟡") : "Yellow's Turn 🟡");
                    status.innerText = (isComp && this.currentPlayer === 'yellow')
                        ? (typeof i18n !== 'undefined' ? i18n.t("ai_thinking", "Computer is thinking... 🤖") : "Computer is thinking... 🤖")
                        : turnLabel;
                    status.classList.remove('text-yellow-300');
                }
                if (isComp && this.currentPlayer === 'yellow' && this.gameActive) {
                    if (this.aiTimer) clearTimeout(this.aiTimer);
                    this.aiTimer = setTimeout(() => {
                        this.aiTimer = null;
                        if (typeof gameAI !== 'undefined') gameAI.makeC4Move();
                    }, 450);
                }
                return;
            }
        }
    },
    checkWin(row, col) {
        const color = this.board[row][col];
        const check = (dr, dc) => {
            let count = 0; let winningCells = [];
            for (let i = -3; i <= 3; i++) {
                let nr = row + i * dr, nc = col + i * dc;
                if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols && this.board[nr][nc] === color) {
                    winningCells.push([nr, nc]); count++; if (count >= 4) return winningCells.slice(-4);
                } else { count = 0; winningCells = []; }
            }
            return null;
        };
        return check(0, 1) || check(1, 0) || check(1, 1) || check(1, -1);
    },
    reset() {
        if (this.aiTimer) { clearTimeout(this.aiTimer); this.aiTimer = null; }
        this.currentPlayer = 'red'; this.gameActive = true;
        const status = document.getElementById('c4-status');
        if (status) {
            status.innerText = typeof i18n !== 'undefined'
                ? i18n.t("c4_turn_red", "Red's Turn 🔴")
                : "Red's Turn 🔴";
            status.classList.remove('text-yellow-300');
        }
        if (typeof app !== 'undefined') app.setGameResumeState('c4-resume-btn', false, '', typeof i18n !== 'undefined' ? i18n.t("skip_and_read", "Skip & Read ⏭️") : "Skip & Read ⏭️");
        this.init();
    }
};
