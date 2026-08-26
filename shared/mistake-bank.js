/** قواعد بنك العثرات النقية المشتركة بين التسجيل والمعالجة. */
(function (global) {
    'use strict';

    function _cloneItem(item) {
        if (!item || typeof item !== 'object') return null;
        try {
            return JSON.parse(JSON.stringify(item));
        } catch (_) {
            return Object.assign({}, item);
        }
    }

    function recordIncorrect(mistakes, lessonId, word, timestamp, rawItem = null) {
        if (!word) return mistakes;
        const existing = mistakes.find(entry => entry.word === word && String(entry.lessonId) === lessonId);
        const clonedItem = _cloneItem(rawItem);
        if (existing) {
            existing.count = (existing.count || 1) + 1;
            existing.timestamp = timestamp;
            existing.mastered = false;
            existing.consecutiveCorrect = 0;
            if (clonedItem) {
                existing.item = clonedItem;
            }
            return mistakes;
        }
        mistakes.push({
            word,
            lessonId,
            timestamp,
            count: 1,
            mastered: false,
            consecutiveCorrect: 0,
            item: clonedItem
        });
        return mistakes;
    }

    const MistakeBank = Object.freeze({ recordIncorrect });
    global.MistakeBank = MistakeBank;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = MistakeBank;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
