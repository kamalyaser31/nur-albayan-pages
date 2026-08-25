(function (global) {
    'use strict';

    const StudentReport = {
    print(studentId, escapeHTML) {
        if (typeof studentManager === 'undefined') return;
        const student = studentManager.getStudent(studentId);
        if (!student) return;

        const isAr = (typeof i18n !== 'undefined' && i18n.getLocale() === 'ar');
        const dir = (typeof i18n !== 'undefined' && i18n.getActiveMeta) ? i18n.getActiveMeta().dir : (isAr ? 'rtl' : 'ltr');
        const lang = (typeof i18n !== 'undefined' && i18n.getLocale) ? i18n.getLocale() : (isAr ? 'ar' : 'en');

        const studentName = escapeHTML(student.name);
        const studentIdShort = escapeHTML(student.id ? student.id.substring(0, 8) : '');
        const totalScoreSafe = Math.max(0, Math.floor(Number(student.totalScore) || 0));

        const completedLessons = student.completedLessons || {};
        const completedKeys = Object.keys(completedLessons);
        const mistakes = Array.isArray(student.mistakeBank) ? student.mistakeBank : [];

        let rowsHtml = '';
        completedKeys.forEach(k => {
            const l = completedLessons[k] || {};
            const cleanKey = escapeHTML(k);
            const scoreVal = Math.max(0, Math.floor(Number(l.score || l.bestScore) || 0));
            const accVal = Math.min(100, Math.max(0, Math.round(Number(l.accuracy) || 0)));
            const starCount = Math.min(3, Math.max(0, Math.floor(Number(l.stars) || 1)));
            const stars = '⭐'.repeat(starCount);
            rowsHtml += `
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 12px; font-weight: bold;">${isAr ? `الدرس / الصفحة ${cleanKey}` : `Lesson / Page ${cleanKey}`}</td>
                <td style="padding: 8px 12px; text-align: center; font-family: monospace;">${scoreVal}</td>
                <td style="padding: 8px 12px; text-align: center;">${accVal}%</td>
                <td style="padding: 8px 12px; text-align: center;">${stars}</td>
            </tr>`;
        });

        if (completedKeys.length === 0) {
            rowsHtml = `<tr><td colspan="4" style="padding: 16px; text-align: center; color: #64748b;">${isAr ? 'لم يكتمل تسجيل أي دروس بعد' : 'No lessons recorded yet'}</td></tr>`;
        }

        let mistakesHtml = '';
        if (mistakes.length > 0) {
            mistakesHtml = `
            <div style="margin-top: 24px; padding: 16px; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 16px;">
                <h3 style="margin: 0 0 12px 0; color: #9f1239; font-size: 15px;">📌 ${isAr ? 'الكلمات المستهدفة للمراجعة والتثبيت (سجل العثرات)' : 'Target Words for Review (Mistake Bank)'}</h3>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${mistakes.map(m => {
                        const cleanWord = escapeHTML(m.word);
                        return `<span style="display: inline-block; padding: 6px 14px; background: #ffffff; border: 1px solid #fda4af; border-radius: 12px; font-size: 20px; font-family: 'Amiri', serif; color: #1e293b;">${cleanWord}</span>`;
                    }).join('')}
                </div>
            </div>`;
        }

        const printHtml = `
<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
    <meta charset="UTF-8">
    <title>${isAr ? 'وثيقة إنجاز الطالب' : 'Student Achievement Certificate'} - ${studentName}</title>
    <style>
        @page { size: A4; margin: 15mm; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; line-height: 1.5; margin: 0; padding: 10px; background: #ffffff; }
        .cert-card { border: 4px double #059669; border-radius: 24px; padding: 28px; max-width: 800px; margin: 0 auto; }
        .cert-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #10b981; padding-bottom: 16px; margin-bottom: 20px; }
        .cert-title { font-size: 24px; font-weight: 900; color: #047857; margin: 0; }
        .cert-sub { font-size: 13px; color: #64748b; margin: 4px 0 0 0; }
        .student-hero { display: flex; align-items: center; justify-content: space-between; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 18px; padding: 16px 20px; margin-bottom: 20px; }
        .student-name { font-size: 22px; font-weight: 900; color: #065f46; margin: 0; }
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; text-align: center; }
        .stat-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px; }
        .stat-val { font-size: 20px; font-weight: 900; color: #047857; display: block; font-family: monospace; }
        .stat-label { font-size: 11px; color: #64748b; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
        th { background: #f1f5f9; padding: 8px 12px; text-align: ${dir === 'rtl' ? 'right' : 'left'}; font-weight: 900; color: #334155; }
        .footer-sig { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; border-top: 1px solid #cbd5e1; font-size: 13px; font-weight: bold; color: #475569; }
        @media print {
            .no-print { display: none; }
            body { padding: 0; }
        }
    </style>
</head>
<body>
    <div class="cert-card">
        <div class="cert-header">
            <div>
                <h1 class="cert-title">${isAr ? 'منظومة نور البيان التعليمية' : 'Nour Al-Bayan Learning System'}</h1>
                <p class="cert-sub">${isAr ? 'وثيقة تقرير ومتابعة إنجاز الطالب في القراءة والقرآن الكريم' : 'Student Reading & Quranic Phonetics Achievement Report'}</p>
            </div>
            <div style="font-size: 32px;">📖 ⭐</div>
        </div>

        <div class="student-hero">
            <div>
                <div style="font-size: 11px; color: #059669; font-weight: bold;">${isAr ? 'اسم الطالب / الطالبة' : 'Student Name'}</div>
                <h2 class="student-name">${studentName}</h2>
            </div>
            <div style="text-align: ${dir === 'rtl' ? 'left' : 'right'}; font-size: 12px; color: #64748b;">
                <div>${isAr ? 'تاريخ الإصدار:' : 'Issue Date:'} <strong>${new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</strong></div>
                <div>${isAr ? 'الرقم التعريفي:' : 'Student ID:'} <span style="font-family: monospace;">#${studentIdShort}</span></div>
            </div>
        </div>

        <div class="stats-grid">
            <div class="stat-box">
                <span class="stat-val">⭐ ${totalScoreSafe}</span>
                <span class="stat-label">${isAr ? 'مجموع النقاط المحققة' : 'Total Points'}</span>
            </div>
            <div class="stat-box">
                <span class="stat-val">📖 ${completedKeys.length}</span>
                <span class="stat-label">${isAr ? 'الدروس المتقنة' : 'Completed Lessons'}</span>
            </div>
            <div class="stat-box">
                <span class="stat-val" style="color: ${mistakes.length > 0 ? '#e11d48' : '#059669'};">📌 ${mistakes.length}</span>
                <span class="stat-label">${isAr ? 'سجل الكلمات المتعثرة' : 'Active Mistakes'}</span>
            </div>
        </div>

        <h3 style="font-size: 15px; font-weight: 900; color: #1e293b; margin: 16px 0 6px 0;">📊 ${isAr ? 'تفاصيل الدروس والتقييم' : 'Lessons Assessment Breakdown'}</h3>
        <table>
            <thead>
                <tr>
                    <th>${isAr ? 'الدرس / الصفحة' : 'Lesson / Page'}</th>
                    <th style="text-align: center;">${isAr ? 'الدرجة' : 'Score'}</th>
                    <th style="text-align: center;">${isAr ? 'معدل الإتقان' : 'Accuracy'}</th>
                    <th style="text-align: center;">${isAr ? 'التقدير' : 'Rating'}</th>
                </tr>
            </thead>
            <tbody>
                ${rowsHtml}
            </tbody>
        </table>

        ${mistakesHtml}

        <div class="footer-sig">
            <div>${isAr ? 'إشراف المعلم: __________________' : 'Teacher Signature: __________________'}</div>
            <div>${isAr ? 'ختم الاعتماد: __________________' : 'Stamp / Approval: __________________'}</div>
        </div>
    </div>
</body>
</html>`;

        const printWin = window.open('', '_blank');
        if (printWin) {
            printWin.document.write(printHtml);
            printWin.document.close();
            setTimeout(() => {
                printWin.focus();
                printWin.print();
            }, 300);
        }
    }
    };

    global.StudentReport = StudentReport;
})(typeof window !== 'undefined' ? window : globalThis);
