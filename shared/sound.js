/**
 * Nour Al-Bayan Interactive Platform - Shared Core Engine
 */

const Sound = {
    ctx: null,
    getCtx() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) this.ctx = new AudioCtx();
        }
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
        return this.ctx;
    },
    init() { this.getCtx(); },
    playChime() {
        const ctx = this.getCtx(); if (!ctx) return;
        const now = ctx.currentTime, osc = ctx.createOscillator(), gainNode = ctx.createGain();
        osc.type = 'sine'; osc.connect(gainNode); gainNode.connect(ctx.destination);
        osc.frequency.setValueAtTime(523.25, now); osc.frequency.setValueAtTime(659.25, now + 0.1);
        osc.frequency.setValueAtTime(783.99, now + 0.2); osc.frequency.setValueAtTime(1046.50, now + 0.3);
        gainNode.gain.setValueAtTime(0, now); gainNode.gain.linearRampToValueAtTime(0.18, now + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5); osc.start(now); osc.stop(now + 0.5);
    },
    tone(freq, d = 0.2, type = 'sine') {
        const ctx = this.getCtx(); if (!ctx) return;
        const now = ctx.currentTime, osc = ctx.createOscillator(), gainNode = ctx.createGain();
        osc.type = type; osc.frequency.setValueAtTime(freq, now); osc.connect(gainNode); gainNode.connect(ctx.destination);
        gainNode.gain.setValueAtTime(0, now); gainNode.gain.linearRampToValueAtTime(0.18, now + 0.015);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + d);
        osc.start(now); osc.stop(now + d);
    },
    danger() { this.tone(220, 0.3, 'sawtooth'); },
    fail() { this.tone(180, 0.25, 'sawtooth'); },
    stepUp(step = 1, max = 5) {
        const freqs = [392, 440, 493.88, 523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77, 1046.50];
        const f = freqs[Math.min(step, freqs.length - 1)] || (392 + step * 45);
        this.tone(f, 0.16, 'triangle');
    },
    stepDown() {
        const ctx = this.getCtx(); if (!ctx) return;
        const now = ctx.currentTime, osc = ctx.createOscillator(), gainNode = ctx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(330, now); osc.frequency.linearRampToValueAtTime(220, now + 0.18);
        osc.connect(gainNode); gainNode.connect(ctx.destination);
        gainNode.gain.setValueAtTime(0.15, now); gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now); osc.stop(now + 0.18);
    }
};

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
