/**
 * العقود العامة لمنظومة نور البيان.
 * هذا الملف هو المرجع الوحيد لمخطط البيانات وأسماء الأحداث والقيم المقيدة.
 */
(function (global) {
    'use strict';

    const SCORE_POLICIES = Object.freeze({
        BEST: 'best',
        LATEST: 'latest',
        CUMULATIVE: 'cumulative'
    });

    const GAME_MODES = Object.freeze({
        TEACHER: 'teacher',
        COMPUTER: 'computer'
    });

    const EVENTS = Object.freeze({
        LOCALE_CHANGED: 'nb:locale-changed',
        SETTINGS_CHANGED: 'nb:settings-changed',
        STUDENT_CHANGED: 'nb:student-changed',
        STUDENT_CREATED: 'nb:student-created',
        STUDENT_UPDATED: 'nb:student-updated',
        STUDENT_DELETED: 'nb:student-deleted',
        STUDENT_PROGRESS_UPDATED: 'nb:student-progress-updated',
        LESSON_COMPLETED: 'nb:lesson-completed',
        LESSON_PROGRESS_DELETED: 'nb:lesson-progress-deleted',
        RULE_COMPLETED: 'nb:rule-completed',
        STORE_CHANGED: 'nb:store-changed'
    });

    /** @typedef {'best'|'latest'|'cumulative'} ScorePolicy */

    /**
     * @typedef {Object} StudentRecord
     * @property {string} id
     * @property {string} name
     * @property {number} totalScore
     * @property {Object.<string, LessonRecord>} completedLessons
     * @property {ErrorRecord[]} mistakeBank
     */

    /**
     * @typedef {Object} ErrorRecord
     * @property {string} word
     * @property {string} lessonId
     * @property {number} count
     * @property {number} consecutiveCorrect
     * @property {Object} [item]
     */

    /**
     * @typedef {Object} CardEvaluationRequest
     * @property {string|number} lessonId
     * @property {boolean} isCorrect
     * @property {number} pointsAwarded
     * @property {string|Object} wordData
     * @property {number} cardIndex
     * @property {number} totalCards
     */

    /**
     * @typedef {Object} LessonRecord
     * @property {number} score
     * @property {number} bestScore
     * @property {number} latestScore
     * @property {number} cumulativeScore
     * @property {number} accuracy
     * @property {number} stars
     * @property {number} attempts
     * @property {number} lastStudiedAt
     */

    function normalizeScorePolicy(policy) {
        return Object.values(SCORE_POLICIES).includes(policy)
            ? policy
            : SCORE_POLICIES.BEST;
    }

    function requireScorePolicy(policy) {
        if (!Object.values(SCORE_POLICIES).includes(policy)) {
            throw new TypeError(`Unknown score policy: ${policy}`);
        }
        return policy;
    }

    function cardEvaluationRequest(request) {
        if (!request || typeof request !== 'object') {
            throw new TypeError('Card evaluation requires a request object.');
        }
        if (request.lessonId === undefined || request.lessonId === null || String(request.lessonId).trim() === '') {
            throw new TypeError('Card evaluation requires lessonId.');
        }
        if (typeof request.isCorrect !== 'boolean') {
            throw new TypeError('Card evaluation requires a boolean isCorrect.');
        }
        for (const field of ['pointsAwarded', 'wordData', 'cardIndex', 'totalCards']) {
            if (!Object.prototype.hasOwnProperty.call(request, field)) {
                throw new TypeError(`Card evaluation requires ${field}.`);
            }
        }
        if (!Number.isFinite(Number(request.pointsAwarded))) {
            throw new TypeError('Card evaluation requires numeric pointsAwarded.');
        }
        if (!Number.isInteger(Number(request.cardIndex)) || Number(request.cardIndex) < 0) {
            throw new TypeError('Card evaluation requires a non-negative integer cardIndex.');
        }
        if (!Number.isInteger(Number(request.totalCards)) || Number(request.totalCards) < 1) {
            throw new TypeError('Card evaluation requires a positive integer totalCards.');
        }

        return {
            lessonId: String(request.lessonId).trim(),
            isCorrect: request.isCorrect,
            pointsAwarded: Number(request.pointsAwarded),
            wordData: request.wordData || '',
            cardIndex: Number(request.cardIndex),
            totalCards: Number(request.totalCards)
        };
    }

    const NBContracts = Object.freeze({
        DATA_SCHEMA_VERSION: 2,
        EVENTS,
        GAME_MODES,
        SCORE_POLICIES,
        cardEvaluationRequest,
        normalizeScorePolicy,
        requireScorePolicy
    });

    global.NBContracts = NBContracts;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = NBContracts;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
