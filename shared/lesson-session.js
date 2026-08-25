(function (global) {
    'use strict';

    const LessonSession = {
    recordMistake(origIndex) {
        if (origIndex === null || origIndex === undefined) return;
        if (!this.mistakeIndices.includes(origIndex)) {
            this.mistakeIndices.push(origIndex);
        }
        if (!this.sessionMistakesHistory) this.sessionMistakesHistory = [];
        if (!this.sessionMistakesHistory.includes(origIndex)) {
            this.sessionMistakesHistory.push(origIndex);
        }
        this.updateDrillNavOption();
    },

    startClock() {
        let dur = 10.0;
        if (typeof settingsManager !== 'undefined') {
            const s = settingsManager.get();
            if (s.timerDuration) dur = parseFloat(s.timerDuration);
        }
        this.clock = dur;
        const el = document.getElementById('timer-val');
        if (el) el.innerText = this.clock.toFixed(1);
        if (this.timer) clearInterval(this.timer);
        this.timer = setInterval(() => {
            this.clock = Math.max(0, this.clock - 0.1);
            if (this.clock <= 0) { clearInterval(this.timer); this.timer = null; }
            if (el) el.innerText = this.clock.toFixed(1);
        }, 100);
    },

    updateProgress(current, total, prefix = 'Card') {
        const progText = document.getElementById('progress-text');
        const pBar = document.getElementById('progress-bar');
        if (progText) {
            const isAr = (typeof i18n !== 'undefined' && i18n.getLocale() === 'ar');
            if (typeof i18n !== 'undefined' && i18n.t) {
                progText.innerText = i18n.t('progress_step_indicator', `${prefix} ${current} ${isAr ? 'من' : 'of'} ${total}`, { prefix, current, total });
            } else {
                progText.innerText = `${prefix} ${current} ${isAr ? 'من' : 'of'} ${total}`;
            }
        }
        if (pBar && total > 0) {
            const pct = Math.round((current / total) * 100);
            pBar.style.setProperty('--progress', (current / total));
            pBar.setAttribute('aria-valuenow', pct);
        }
    },

    evaluate(isCorrect) {
        if (this._isAdvancing) return; // حماية ضد السباق وتعدد الضغطات

        // مسار طور المعالجة الفورية لعثرات الجلسة (Session Remediation Drill)
        if (this.isSessionDrill) {
            if (!this.sessionDrillQueue || this.sessionDrillIdx >= this.sessionDrillQueue.length) return;
            const drillItem = this.sessionDrillQueue[this.sessionDrillIdx];
            const origIndex = (typeof drillItem === 'object' && drillItem !== null) ? drillItem.index : drillItem;
            const currentWord = (typeof dataset !== 'undefined' && dataset[origIndex]) ? dataset[origIndex] : null;
            const isAr = (typeof i18n !== 'undefined' && i18n.getLocale() === 'ar');
            this._evaluateDrillItem(drillItem, origIndex, currentWord, isCorrect, isAr);
            return;
        }

        // مسار تقييم صفحة المعالجة المخصصة حصراً لمنع تكرار النقاط ومضاعفة مدخلات البنك
        if (typeof PAGE_CONFIG !== 'undefined' && PAGE_CONFIG.pageNumber === 'remediation') {
            const currentItemIdx = (this.order && this.order[this.idx] !== undefined) ? this.order[this.idx] : this.idx;
            const currentWord = (typeof dataset !== 'undefined' && dataset[currentItemIdx]) ? dataset[currentItemIdx] : null;
            if (currentWord && typeof studentManager !== 'undefined') {
                const res = studentManager.recordRemediationAttempt(studentManager.getActiveStudentId(), currentWord, isCorrect);
                if (isCorrect) {
                    this.stats.ok++;
                    this.score += res.mastered ? 5 : 2;
                    const feedback = res.mastered ? ((typeof i18n !== 'undefined' && i18n.t) ? i18n.t('fb_mastered') : 'أتقنت الكلمة! 🌟') : ((typeof i18n !== 'undefined' && i18n.t) ? i18n.t('fb_well_done') : 'أحسنت! ⭐');
                    this.triggerFeedback(feedback, '#10b981', true);
                } else {
                    this.stats.err++;
                    this.triggerFeedback((typeof i18n !== 'undefined' && i18n.t) ? i18n.t('fb_needs_practice') : 'تحتاج تدريباً إضافياً ⭐', '#f43f5e', false);
                    if (typeof Sound !== 'undefined' && typeof Sound.fail === 'function') Sound.fail();
                }
            } else if (isCorrect) {
                this.stats.ok++;
                this.score += 2;
                this.triggerFeedback((typeof i18n !== 'undefined' && i18n.t) ? i18n.t('fb_well_done') : 'أحسنت! ⭐', '#10b981', true);
            } else {
                this.stats.err++;
                this.triggerFeedback((typeof i18n !== 'undefined' && i18n.t) ? i18n.t('fb_needs_practice') : 'تحتاج تدريباً إضافياً ⭐', '#f43f5e', false);
                if (typeof Sound !== 'undefined' && typeof Sound.fail === 'function') Sound.fail();
            }
            this.updateScoreUI();
            this.scheduleAdvance();
            return;
        }

        if (typeof dataset === 'undefined' || dataset.length === 0) return;
        const currentItemIdx = (this.order && this.order[this.idx] !== undefined) ? this.order[this.idx] : this.idx;
        const item = dataset[currentItemIdx];
        if (!item) return;

        const settings = (typeof settingsManager !== 'undefined') ? settingsManager.get() : {};
        const points = isCorrect ? ((item.t === 'golden') ? 10 : (item.t === 'speed' && this.clock > 0) ? 5 : 2) : 0;

        // التسجيل اللحظي فورياً للطالب النشط بالنقاط الفعلية
        if (typeof studentManager !== 'undefined' && studentManager.hasActiveStudent()) {
            const lessonId = this.getLessonId();
            studentManager.recordCardEvaluation({
                lessonId,
                isCorrect,
                pointsAwarded: points,
                wordData: item,
                cardIndex: this.idx,
                totalCards: dataset.length
            });
        }

        if (isCorrect) {
            this.stats.ok++;
            this.score += points;
            const perfWord = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('txt_perfect') : 'Perfect';
            const excWord = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('txt_excellent') : 'Excellent';
            const wellDone = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('fb_well_done') : 'Well done! ⭐';
            const magnif = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('fb_magnificent') : 'Magnificent! ❤️⭐';
            const feedbacks = [`${excWord}! 🌟`, `${perfWord}! 🏆`, wellDone, magnif, '⭐⭐⭐⭐⭐', '❤️❤️❤️❤️❤️'];
            const randomFeedback = feedbacks[Math.floor(Math.random() * feedbacks.length)];
            this.triggerFeedback(randomFeedback, '#10b981', true);
        } else {
            this.stats.err++;
            this.recordMistake(currentItemIdx);
            const penalty = settings.noPenaltyMode ? 0 : ((item.t === 'danger') ? 5 : 2);
            this.score = Math.max(0, this.score - penalty);
            const feedbackText = settings.noPenaltyMode
                ? ((item.t === 'danger') ? ((typeof i18n !== 'undefined' && i18n.t) ? i18n.t('warning_danger_penalty') : 'High Focus! ⚠️') : ((typeof i18n !== 'undefined' && i18n.t) ? i18n.t('fb_needs_practice') : 'Needs Practice ⭐'))
                : ((item.t === 'danger') ? ((typeof i18n !== 'undefined' && i18n.t) ? i18n.t('warning_danger_penalty') : '-5 Warning! ⚠️') : ((typeof i18n !== 'undefined' && i18n.t) ? i18n.t('fb_needs_practice') : '-2 Needs Practice'));
            this.triggerFeedback(feedbackText, '#f43f5e', false);
            if (typeof Sound !== 'undefined' && typeof Sound.fail === 'function') Sound.fail();
        }

        this.updateScoreUI();
        this.scheduleAdvance();
    },

    next() {
        this.clearAdvanceTimer();
        this.updateScoreUI();

        if (this.isSessionDrill) {
            this.renderSessionDrill();
            return;
        }

        if (typeof dataset === 'undefined' || dataset.length === 0) return;
        if (this.idx < dataset.length - 1) {
            const third1 = Math.floor(dataset.length / 3) - 1;
            const third2 = Math.floor((dataset.length * 2) / 3) - 1;
            if (this.enableGameBreaks && this.idx === third1 && !this.hasPlayedGame1 && dataset.length >= 3) {
                this.jumpTo('transition_1');
            } else if (this.enableGameBreaks && this.idx === third2 && !this.hasPlayedGame2 && dataset.length >= 3) {
                this.jumpTo('transition_2');
            } else {
                this.idx++;
                this.render();
            }
        } else {
            if (this.enableGameBreaks && !this.hasPlayedGame3 && dataset.length >= 3) {
                this.jumpTo('transition_3');
            } else {
                this.playWordwall();
            }
        }
    },

    prev() {
        this.clearAdvanceTimer();
        this.updateScoreUI();
        if (this.isSessionDrill) {
            if (this.sessionDrillIdx > 0) {
                this.sessionDrillIdx--;
                this.renderSessionDrill();
            }
            return;
        }
        if (this.idx > 0) {
            this.idx--;
            this.render();
        }
    },

    };

    global.LessonSession = LessonSession;
})(typeof window !== 'undefined' ? window : globalThis);
