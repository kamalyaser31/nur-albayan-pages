/** قواعد بنك العثرات النقية المشتركة بين التسجيل والمعالجة. */
(function (global) {
    'use strict';

    function recordIncorrect(mistakes, lessonId, word, timestamp) {
        if (!word) return mistakes;
        const existing = mistakes.find(entry => entry.word === word && String(entry.lessonId) === lessonId);
        if (existing) {
            existing.count = (existing.count || 1) + 1;
            existing.timestamp = timestamp;
            existing.mastered = false;
            existing.consecutiveCorrect = 0;
            return mistakes;
        }
        mistakes.push({
            word,
            lessonId,
            timestamp,
            count: 1,
            mastered: false,
            consecutiveCorrect: 0
        });
        return mistakes;
    }

    const MistakeBank = Object.freeze({ recordIncorrect });
    global.MistakeBank = MistakeBank;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = MistakeBank;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
