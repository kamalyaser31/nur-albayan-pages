/** صياغة النسخ الاحتياطية والتحقق من غلافها بعيداً عن DOM. */
(function (global) {
    'use strict';

    function parse(input) {
        const payload = typeof input === 'string' ? JSON.parse(input) : input;
        if (!payload || typeof payload !== 'object') {
            throw new TypeError('صيغة الملف غير صالحة، يجب أن يكون كائناً بصيغة JSON.');
        }
        const students = Array.isArray(payload) ? payload : payload.students;
        if (!Array.isArray(students)) {
            throw new TypeError('لم يتم العثور على مصفوفة طلاب صالحة داخل الملف.');
        }
        return { activeStudentId: payload.activeStudentId || null, students };
    }

    function stringify(state) {
        return JSON.stringify({
            app: 'nur-albayan-pages',
            schemaVersion: global.NBContracts.DATA_SCHEMA_VERSION,
            exportedAt: new Date().toISOString(),
            activeStudentId: state.activeStudentId,
            students: state.students
        }, null, 2);
    }

    const StudentBackup = Object.freeze({ parse, stringify });
    global.StudentBackup = StudentBackup;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = StudentBackup;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
