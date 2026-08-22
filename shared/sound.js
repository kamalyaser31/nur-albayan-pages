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
        g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(0.18, now + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.5); o.start(now); o.stop(now + 0.5);
    },
    tone(freq, d = 0.2, type = 'sine') {
        const c = this.getCtx(); if (!c) return;
        const now = c.currentTime, o = c.createOscillator(), g = c.createGain();
        o.type = type; o.frequency.setValueAtTime(freq, now); o.connect(g); g.connect(c.destination);
        g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(0.18, now + 0.015);
        g.gain.exponentialRampToValueAtTime(0.001, now + d);
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
