(function (global) {
    'use strict';

    const RemediationSession = {
    evaluateItem(drillItem, origIndex, item, isCorrect, isAr) {
        const drillMode = (typeof settingsManager !== 'undefined' && settingsManager.get().remediationDrillMode)
            ? settingsManager.get().remediationDrillMode
            : 'loop';
        let shouldAdvance = true;

        if (isCorrect) {
            this.stats.ok++;
            this.score += 2;

            if (drillMode === 'instant_repeat' && drillItem._hasFailed) {
                drillItem._inPlaceSuccessCount = (drillItem._inPlaceSuccessCount || 0) + 1;
                if (drillItem._inPlaceSuccessCount < 3) {
                    const stepMsg = (typeof i18n !== 'undefined' && i18n.t)
                        ? i18n.t('drill_step_success', `أحسنت! (${drillItem._inPlaceSuccessCount}/3) ⭐`, { current: drillItem._inPlaceSuccessCount, total: 3 })
                        : (isAr ? `أحسنت! (${drillItem._inPlaceSuccessCount}/3) ⭐` : `Well done! (${drillItem._inPlaceSuccessCount}/3) ⭐`);
                    this.triggerFeedback(stepMsg, '#10b981', true);
                    shouldAdvance = false;
                } else {
                    const masteredMsg = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('fb_mastered') : 'أتقنت الكلمة! 🌟';
                    this.triggerFeedback(masteredMsg, '#10b981', true);
                    this.mistakeIndices = this.mistakeIndices.filter(idx => idx !== origIndex);
                }
            } else {
                const masteredMsg = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('fb_mastered') : 'أتقنت الكلمة! 🌟';
                this.triggerFeedback(masteredMsg, '#10b981', true);
            }

            // شطب الكلمة ذرياً من بنك الأخطاء وتحديث الدقة والنجوم في studentManager
            if (typeof studentManager !== 'undefined') {
                const studentId = studentManager.getActiveStudentId ? studentManager.getActiveStudentId() : null;
                if (item) studentManager.recordRemediationAttempt(studentId, item, true);
                if (studentManager.hasActiveStudent && studentManager.hasActiveStudent()) {
                    const lessonId = this.getLessonId();
                    const total = this.stats.ok + this.stats.err;
                    const accuracy = total > 0 ? Math.round((this.stats.ok / total) * 100) : 100;
                    const stars = accuracy >= 90 ? 3 : (accuracy >= 70 ? 2 : 1);
                    studentManager.recordLessonCompletion(lessonId, this.score, accuracy, stars);
                }
            }
        } else {
            this.stats.err++;
            const feedbackText = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('fb_needs_practice') : 'تحتاج تدريباً إضافياً ⭐';
            this.triggerFeedback(feedbackText, '#f43f5e', false);
            if (typeof Sound !== 'undefined' && typeof Sound.fail === 'function') Sound.fail();

            if (drillMode === 'loop') {
                this.sessionDrillQueue.push({ index: origIndex, _inPlaceSuccessCount: 0, _hasFailed: true });
                shouldAdvance = true;
            } else if (drillMode === 'instant_repeat') {
                drillItem._hasFailed = true;
                drillItem._inPlaceSuccessCount = 0;
                shouldAdvance = false;
            } else if (drillMode === 'single_pass') {
                shouldAdvance = true;
            }

            if (typeof studentManager !== 'undefined' && item) {
                const studentId = studentManager.getActiveStudentId ? studentManager.getActiveStudentId() : null;
                studentManager.recordRemediationAttempt(studentId, item, false);
            }
        }

        this.updateScoreUI();
        this.updateDrillNavOption();

        if (shouldAdvance) {
            this.sessionDrillIdx++;
        }
        this.scheduleAdvance(() => this.renderSessionDrill());
    },

    start() {
        const hasMistakes = (this.mistakeIndices && this.mistakeIndices.length > 0);
        const hasHistory = (this.sessionMistakesHistory && this.sessionMistakesHistory.length > 0);

        if (!hasMistakes && !hasHistory) {
            const isAr = (typeof i18n !== 'undefined' && i18n.getLocale() === 'ar');
            const noMistakesMsg = (typeof i18n !== 'undefined' && i18n.t)
                ? i18n.t('no_session_mistakes_toast', isAr ? 'ما شاء الله! لا توجد عثرات لمعالجتها في هذه الجلسة! 🌟' : 'Excellent! No mistakes to drill in this session! 🌟')
                : (isAr ? 'ما شاء الله! لا توجد عثرات لمعالجتها في هذه الجلسة! 🌟' : 'Excellent! No mistakes to drill in this session! 🌟');
            this.triggerFeedback(noMistakesMsg, '#10b981', true);
            this.jumpTo('menu');
            return;
        }

        if (!hasMistakes && hasHistory) {
            this.mistakeIndices = [...this.sessionMistakesHistory];
        }

        if (typeof dataset === 'undefined' || dataset.length === 0) return;

        this.isSessionDrill = true;

        // حفظ نسخة أصلية من عثرات الجلسة لتمكين التراجع عند الإلغاء
        this.initialSessionMistakes = [...this.mistakeIndices];

        // تهيئة طابور المعالجة الفورية وخلط الكلمات عشوائياً
        this.sessionDrillQueue = this.mistakeIndices.map(idx => ({
            index: idx,
            _inPlaceSuccessCount: 0,
            _hasFailed: false
        }));
        this.shuffle(this.sessionDrillQueue);
        this.sessionDrillIdx = 0;

        // إيقاف وإخفاء مؤقت السرعة تماماً أثناء طور المعالجة
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        const timerPill = document.getElementById('challenge-timer');
        if (timerPill) timerPill.classList.add('hidden');

        this.hideAll();
        const topNav = document.getElementById('top-nav');
        if (topNav) topNav.classList.remove('hidden');
        const stage = document.getElementById('learning-stage');
        if (stage) stage.classList.remove('hidden');

        // إبقاء شريط تحفيز المعلم مفعلاً وظاهراً
        const praiseBar = document.getElementById('teacher-praise-bar');
        if (praiseBar) praiseBar.classList.remove('hidden');

        this.renderSessionDrill();
    },

    render() {
        if (!this.sessionDrillQueue || this.sessionDrillIdx >= this.sessionDrillQueue.length) {
            this.finishSessionDrill();
            return;
        }

        const drillItem = this.sessionDrillQueue[this.sessionDrillIdx];
        const origIndex = (typeof drillItem === 'object' && drillItem !== null) ? drillItem.index : drillItem;
        const item = dataset[origIndex];
        if (!item) {
            this.sessionDrillIdx++;
            this.renderSessionDrill();
            return;
        }

        const area = document.getElementById('word-display-area');
        this.hideAll();
        const topNav = document.getElementById('top-nav');
        if (topNav) topNav.classList.remove('hidden');
        const stage = document.getElementById('learning-stage');
        if (stage) stage.classList.remove('hidden');

        const isAr = (typeof i18n !== 'undefined' && i18n.getLocale() === 'ar');
        const progressLabel = (typeof i18n !== 'undefined' && i18n.t)
            ? i18n.t('session_drill_title', isAr ? 'معالجة العثرات' : 'Remediation Drill')
            : (isAr ? 'معالجة العثرات' : 'Remediation Drill');
        this.updateProgress(this.sessionDrillIdx + 1, this.sessionDrillQueue.length, progressLabel);

        // إظهار شريط المعالجة الفورية وتحديث العدادات
        const drillBanner = document.getElementById('session-drill-banner');
        if (drillBanner) {
            drillBanner.classList.remove('hidden');
            const drillCur = document.getElementById('drill-cur');
            const drillTotal = document.getElementById('drill-total');
            if (drillCur) drillCur.textContent = String(this.sessionDrillIdx + 1);
            if (drillTotal) drillTotal.textContent = String(this.sessionDrillQueue.length);
        }

        // إخفاء مؤقت التحدي أثناء المعالجة
        const timerPill = document.getElementById('challenge-timer');
        if (timerPill) timerPill.classList.add('hidden');

        // إبقاء شريط تحفيز المعلم مفعلاً وظاهراً
        const praiseBar = document.getElementById('teacher-praise-bar');
        if (praiseBar) praiseBar.classList.remove('hidden');

        if (area) {
            this.renderWordInto(area, item);
            const plain = this.getPlainWord(item);
            const stepOf = (typeof i18n !== 'undefined' && i18n.t)
                ? i18n.t('progress_step_indicator', `${progressLabel} ${this.sessionDrillIdx + 1} ${isAr ? 'من' : 'of'} ${this.sessionDrillQueue.length}`, { prefix: progressLabel, current: this.sessionDrillIdx + 1, total: this.sessionDrillQueue.length })
                : `${progressLabel} ${this.sessionDrillIdx + 1} ${isAr ? 'من' : 'of'} ${this.sessionDrillQueue.length}`;
            area.setAttribute('aria-label', `${stepOf}: ${plain}`);
            area.tabIndex = -1;
            area.focus({ preventScroll: true });
        }
    },

    finish() {
        this.isSessionDrill = false;
        if (typeof fireCelebration === 'function') fireCelebration();
        if (typeof Sound !== 'undefined' && typeof Sound.playChime === 'function') Sound.playChime();

        const isAr = (typeof i18n !== 'undefined' && i18n.getLocale() === 'ar');
        const congratsMsg = (typeof i18n !== 'undefined' && i18n.t)
            ? i18n.t('session_drill_completed', isAr ? 'رائع جداً! تم إتقان جميع عثرات الجلسة بنجاح! 🏆' : 'Great Job! All session mistakes mastered! 🏆')
            : (isAr ? 'رائع جداً! تم إتقان جميع عثرات الجلسة بنجاح! 🏆' : 'Great Job! All session mistakes mastered! 🏆');
        this.triggerFeedback(congratsMsg, '#10b981', true);
        this.updateDrillNavOption();

        // انتقال تلقائي بعد ثانيتين إلى ساحة الألعاب Wordwall مع ربطه بمؤقت قابل للإبطال
        if (this.drillTransitionTimer) {
            clearTimeout(this.drillTransitionTimer);
            this.drillTransitionTimer = null;
        }
        this.drillTransitionTimer = setTimeout(() => {
            this.drillTransitionTimer = null;
            if (!this.isSessionDrill) {
                this.playWordwall();
            }
        }, 2000);
    },

    };

    global.RemediationSession = RemediationSession;
})(typeof window !== 'undefined' ? window : globalThis);
