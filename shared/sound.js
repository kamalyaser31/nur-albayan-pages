/**
 * Nour Al-Bayan Interactive Platform - Shared Audio & FX Engine
 * Refactored & Hardened (Zero Memory Leaks, Zero Frame Drops, Perceptual Volume, Mobile Unlock)
 */

const Sound = {
    ctx: null,
    _unlocked: false,

    // تهيئة السياق الصوتي وفك تعليقه بطريقة آمنة
    getCtx() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return null;
            this.ctx = new AudioCtx();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        } else if (this.ctx.state === 'closed') {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = AudioCtx ? new AudioCtx() : null;
        }
        return this.ctx;
    },

    // فك تعليق الصوت التلقائي عند أول تفاعل للمستخدم على شاشات اللمس
    setupUnlock() {
        if (this._unlocked) return;
        const unlock = () => {
            const ctx = this.getCtx();
            if (ctx && ctx.state === 'suspended') {
                ctx.resume().then(() => {
                    this._unlocked = true;
                }).catch(() => {});
            } else {
                this._unlocked = true;
            }
            window.removeEventListener('pointerdown', unlock, { capture: true });
            window.removeEventListener('keydown', unlock, { capture: true });
        };
        window.addEventListener('pointerdown', unlock, { capture: true, once: true });
        window.addEventListener('keydown', unlock, { capture: true, once: true });
    },

    // استخراج شدة الصوت الحقيقية مع تصحيح علة الصفر الزائف وتطبيق المنحنى الإدراكي
    getVol() {
        if (typeof settingsManager !== 'undefined') {
            const s = settingsManager.get();
            if (!s.soundEnabled) return 0;
            const rawVol = (typeof s.volume === 'number') ? s.volume : 80;
            if (rawVol <= 0) return 0;
            const normalized = Math.max(0, Math.min(100, rawVol)) / 100;
            return normalized * normalized; // منحنى تربيعي إدراكي مريح
        }
        return 0.64; // 0.8^2
    },

    // تنظيف وفصل عقد الصوت فور انتهاء النغمة لمنع تسريب الذاكرة
    _cleanup(osc, gainNode) {
        osc.onended = () => {
            try {
                osc.disconnect();
                gainNode.disconnect();
            } catch (_) {}
        };
    },

    init() {
        this.getCtx();
        this.setupUnlock();
    },

    playChime() {
        const vol = this.getVol();
        if (vol <= 0) return;
        const ctx = this.getCtx();
        if (!ctx) return;

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'sine';
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.1);
        osc.frequency.setValueAtTime(783.99, now + 0.2);
        osc.frequency.setValueAtTime(1046.50, now + 0.3);

        gainNode.gain.setValueAtTime(0.0001, now);
        gainNode.gain.linearRampToValueAtTime(0.18 * vol, now + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
        gainNode.gain.setValueAtTime(0, now + 0.51);

        this._cleanup(osc, gainNode);
        osc.start(now);
        osc.stop(now + 0.51);
    },

    tone(freq, d = 0.2, type = 'sine') {
        const vol = this.getVol();
        if (vol <= 0) return;
        const ctx = this.getCtx();
        if (!ctx) return;

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        gainNode.gain.setValueAtTime(0.0001, now);
        gainNode.gain.linearRampToValueAtTime(0.18 * vol, now + 0.015);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + d);
        gainNode.gain.setValueAtTime(0, now + d + 0.01);

        this._cleanup(osc, gainNode);
        osc.start(now);
        osc.stop(now + d + 0.01);
    },

    danger() { this.tone(220, 0.3, 'sawtooth'); },
    fail() { this.tone(180, 0.25, 'sawtooth'); },

    stepUp(step = 1, max = 5) {
        const freqs = [392, 440, 493.88, 523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77, 1046.50];
        const f = freqs[Math.min(step, freqs.length - 1)] || (392 + step * 45);
        this.tone(f, 0.16, 'triangle');
    },

    stepDown() {
        const vol = this.getVol();
        if (vol <= 0) return;
        const ctx = this.getCtx();
        if (!ctx) return;

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(330, now);
        osc.frequency.linearRampToValueAtTime(220, now + 0.18);
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        // منع النقر الصوتي (Audio Pop) عبر الصعود الميكروي من 0.0001
        gainNode.gain.setValueAtTime(0.0001, now);
        gainNode.gain.linearRampToValueAtTime(0.15 * vol, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
        gainNode.gain.setValueAtTime(0, now + 0.19);

        this._cleanup(osc, gainNode);
        osc.start(now);
        osc.stop(now + 0.19);
    }
};

// تهيئة مستمعات اللمس تلقائياً
if (typeof window !== 'undefined') {
    Sound.setupUnlock();
}

/**
 * دالة الاحتفال المطورة والمحمية من تجميد الإطارات (Throttled & Allocated-Hoisted)
 */
const _CELEBRATION_COLORS = ['#3b82f6', '#10b981', '#fb7185', '#facc15'];
const _CONF_LEFT = { particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: _CELEBRATION_COLORS };
const _CONF_RIGHT = { particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: _CELEBRATION_COLORS };

let _celebrationActive = false;
let _celebrationTimer = null;

function fireCelebration() {
    if (typeof confetti !== 'function') return;
    if (_celebrationActive) return; // حماية ضد الاستدعاء المتزامن المتكرر

    _celebrationActive = true;
    const duration = 2400;
    const intervalMs = 120; // إطلاق دفعات منتظمة كل 120ms بدلاً من كل إطار rAF
    const endTime = Date.now() + duration;

    _celebrationTimer = setInterval(() => {
        if (Date.now() > endTime) {
            clearInterval(_celebrationTimer);
            _celebrationTimer = null;
            _celebrationActive = false;
            return;
        }
        confetti(_CONF_LEFT);
        confetti(_CONF_RIGHT);
    }, intervalMs);
}

const wordwallColors = ['#e11d48', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1', '#06b6d4', '#f97316', '#84cc16', '#a855f7', '#64748b', '#059669', '#d97706'];
