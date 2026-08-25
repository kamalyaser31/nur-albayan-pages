/** تخزين بيانات الطلاب واستعادتها دون أي شأن بالواجهة أو قواعد الدرجات. */
(function (global) {
    'use strict';

    function clone(state) {
        if (typeof structuredClone === 'function') return structuredClone(state);
        return JSON.parse(JSON.stringify(state));
    }

    function read(storageKey) {
        if (typeof localStorage === 'undefined') return null;
        const serialized = localStorage.getItem(storageKey);
        return serialized ? JSON.parse(serialized) : null;
    }

    function write(storageKey, state) {
        if (typeof localStorage === 'undefined') return false;
        localStorage.setItem(storageKey, JSON.stringify(state));
        return true;
    }

    const StudentRepository = Object.freeze({ clone, read, write });
    global.StudentRepository = StudentRepository;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = StudentRepository;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
