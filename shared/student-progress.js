/** القواعد النقية لسجلات الدروس وسياسات الدرجات. */
(function (global) {
    'use strict';

    function nonNegativeInteger(number) {
        return Math.max(0, Math.floor(Number(number) || 0));
    }

    function normalizedRecord(record = {}) {
        const legacyScore = nonNegativeInteger(record.score);
        return {
            score: legacyScore,
            bestScore: nonNegativeInteger(record.bestScore ?? legacyScore),
            latestScore: nonNegativeInteger(record.latestScore ?? legacyScore),
            cumulativeScore: nonNegativeInteger(record.cumulativeScore ?? legacyScore),
            accuracy: Math.min(100, nonNegativeInteger(record.accuracy ?? 100)),
            stars: Math.min(3, nonNegativeInteger(record.stars)),
            attempts: Math.max(1, nonNegativeInteger(record.attempts) || 1),
            lastStudiedAt: Number(record.lastStudiedAt) || Date.now()
        };
    }

    function scoreForPolicy(record, policy) {
        const normalized = normalizedRecord(record);
        if (policy === 'latest') return normalized.latestScore;
        if (policy === 'cumulative') return normalized.cumulativeScore;
        return normalized.bestScore;
    }

    function completion(previousRecord, attempt, policy) {
        const previous = previousRecord ? normalizedRecord(previousRecord) : null;
        const attemptScore = nonNegativeInteger(attempt.score);
        const attemptAccuracy = Math.min(100, nonNegativeInteger(attempt.accuracy));
        const attemptStars = Math.min(3, nonNegativeInteger(attempt.stars));
        const attempts = (previous?.attempts || 0) + 1;
        const bestScore = Math.max(previous?.bestScore || 0, attemptScore);
        const latestScore = attemptScore;
        const cumulativeScore = (previous?.cumulativeScore || 0) + attemptScore;
        const accuracy = policy === 'cumulative' && previous
            ? Math.round(((previous.accuracy * previous.attempts) + attemptAccuracy) / attempts)
            : policy === 'best'
                ? Math.max(previous?.accuracy || 0, attemptAccuracy)
                : attemptAccuracy;

        const completed = {
            score: 0,
            bestScore,
            latestScore,
            cumulativeScore,
            accuracy,
            stars: Math.max(previous?.stars || 0, attemptStars),
            attempts,
            lastStudiedAt: Number(attempt.completedAt) || Date.now()
        };
        completed.score = scoreForPolicy(completed, policy);
        return completed;
    }

    function totalScore(completedLessons, policy) {
        return Object.values(completedLessons || {}).reduce(
            (total, record) => total + scoreForPolicy(record, policy),
            0
        );
    }

    const StudentProgress = Object.freeze({
        completion,
        normalizedRecord,
        scoreForPolicy,
        totalScore
    });
    global.StudentProgress = StudentProgress;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = StudentProgress;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
