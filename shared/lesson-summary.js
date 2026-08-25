(function (global) {
    'use strict';

    const LessonSummary = {
    finish() {
        this.hideAll();
        const summary = document.getElementById('summary-screen'); if (summary) summary.classList.remove('hidden');
        const finalScore = document.getElementById('final-score'); if (finalScore) finalScore.innerText = this.score;
        const reviewBtn = document.getElementById('btn-review-mistakes');
        if (reviewBtn) {
            const hasMistakes = (this.mistakeIndices && this.mistakeIndices.length > 0);
            const hasHistory = (this.sessionMistakesHistory && this.sessionMistakesHistory.length > 0);
            const isAr = (typeof i18n !== 'undefined' && i18n.getLocale() === 'ar');
            if (hasMistakes || hasHistory) {
                reviewBtn.classList.remove('hidden');
                reviewBtn.onclick = () => {
                    if (this.mistakeIndices.length === 0 && this.sessionMistakesHistory.length > 0) {
                        this.mistakeIndices = [...this.sessionMistakesHistory];
                    }
                    this.startSessionDrill();
                };
                const btnText = (typeof i18n !== 'undefined' && i18n.t)
                    ? i18n.t('btn_repeat_drill', isAr ? '🔄 إعادة مراجعة عثرات اليوم' : '🔄 Review Today\'s Mistakes')
                    : (isAr ? '🔄 إعادة مراجعة عثرات اليوم' : '🔄 Review Today\'s Mistakes');
                reviewBtn.innerHTML = `<span>${btnText}</span> <span aria-hidden="true">🎯</span>`;
            } else {
                reviewBtn.classList.add('hidden');
            }
        }

        // استدعاء إتمام الدرس وحفظ النتائج للطالب النشط
        if (typeof studentManager !== 'undefined' && studentManager.hasActiveStudent()) {
            const lessonId = this.getLessonId();
            const total = this.stats.ok + this.stats.err;
            const accuracy = total > 0 ? Math.round((this.stats.ok / total) * 100) : 0;
            const stars = accuracy >= 90 ? 3 : (accuracy >= 70 ? 2 : 1);
            studentManager.recordLessonCompletion(lessonId, this.score, accuracy, stars);
        }

        this.drawChart();
    },

    // استخلاص معرف أو رقم الدرس من PAGE_CONFIG أو مسار الصفحة
    drawChart() {
        const isAr = (typeof i18n !== 'undefined' && i18n.getLocale() === 'ar');
        const textSummary = document.getElementById('summary-chart-text');
        if (textSummary) {
            textSummary.textContent = (typeof i18n !== 'undefined' && i18n.t)
                ? i18n.t('summary_numeric_text', null, { correct: this.stats.ok, incorrect: this.stats.err })
                : `${this.stats.ok} correct, ${this.stats.err} incorrect`;
        }
        if (typeof Chart === 'undefined') {
            if (typeof VendorLoader !== 'undefined') {
                VendorLoader.loadChart()
                    .then(() => this.drawChart())
                    .catch(error => console.warn('Chart could not be loaded:', error));
            }
            return;
        }
        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }
        const canvas = document.getElementById('summaryChart'); if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const labelCorrect = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('btn_correct', isAr ? 'صحيح' : 'Correct') : (isAr ? 'صحيح' : 'Correct');
        const labelIncorrect = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('btn_incorrect', isAr ? 'خطأ' : 'Incorrect') : (isAr ? 'خطأ' : 'Incorrect');
        this.chartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: { labels: [labelCorrect, labelIncorrect], datasets: [{ data: [this.stats.ok, this.stats.err], backgroundColor: ['#10b981', '#f43f5e'], borderWidth: 0, hoverOffset: 6 }] },
            options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { family: 'Fredoka', weight: 'bold' } } } } }
        });
    },

    // تابع تنظيف شامل للمؤقتات والألعاب والرسم البياني
    };

    global.LessonSummary = LessonSummary;
})(typeof window !== 'undefined' ? window : globalThis);
