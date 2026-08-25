(function (global) {
    'use strict';

    const IndexProgressView = {
        update(activeStudent) {
            if (typeof document === 'undefined') return;
            const cards = document.querySelectorAll('.lesson-card, a[href*="pages/"]');
            cards.forEach(card => {
                card.querySelectorAll('.nb-student-lesson-badge').forEach(badge => badge.remove());
                if (!activeStudent || !activeStudent.completedLessons) return;

                const hrefMatch = (card.getAttribute('href') || '').match(/pages\/(\d+)\.html/);
                const numberElement = card.querySelector('.card-num');
                const lessonId = hrefMatch?.[1] || numberElement?.textContent?.trim();
                const lesson = lessonId ? activeStudent.completedLessons[lessonId] : null;
                if (!lesson || lesson.attempts <= 0) return;

                const stars = Math.min(3, Math.max(0, Number(lesson.stars) || 0));
                const score = Number(lesson.score ?? lesson.bestScore) || 0;
                const badge = document.createElement('div');
                badge.className = 'nb-student-lesson-badge inline-flex items-center gap-1.5 text-[11px] font-bold mt-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200/80 shadow-xs select-none';
                const ariaText = global.i18n
                    ? i18n.t('aria_student_lesson_badge', null, { stars, score })
                    : `${stars} stars, ${score} points`;
                badge.setAttribute('aria-label', ariaText);

                const starText = document.createElement('span');
                starText.className = 'text-amber-500 font-bold';
                starText.textContent = stars ? '⭐'.repeat(stars) : '✓';
                starText.setAttribute('aria-hidden', 'true');
                const scoreText = document.createElement('span');
                scoreText.className = 'text-slate-600 font-mono text-[10px]';
                scoreText.textContent = `(${score})`;
                badge.append(starText, scoreText);
                (card.querySelector('.card-info') || card).appendChild(badge);
            });
        }
    };

    global.IndexProgressView = IndexProgressView;
})(typeof window !== 'undefined' ? window : globalThis);
