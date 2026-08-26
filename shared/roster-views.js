(function (global) {
    'use strict';

    const RosterViews = {
    renderStudentsList(container) {
        const students = (typeof studentManager !== 'undefined') ? studentManager.getStudents() : [];
        const activeId = (typeof studentManager !== 'undefined') ? studentManager.getActiveStudentId() : null;
        const activeStudent = students.find(s => s.id === activeId);

        let html = '';

        // شريط حالة الطالب النشط
        if (activeStudent) {
            const safeActiveName = this._escapeHTML(activeStudent.name);
            const safeActiveAvatar = this._escapeHTML(activeStudent.avatar || '👤');
            const safeScore = Math.max(0, Math.floor(Number(activeStudent.totalScore) || 0));

            html += `
            <div class="flex flex-wrap items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl mb-5 gap-3">
              <div class="flex items-center gap-3">
                <span data-i18n="active_student_label" class="text-xs font-bold text-emerald-800">${this._escapeHTML(this._t('active_student_label', 'الطالب النشط حالياً:'))}</span>
                <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 text-white rounded-full font-black text-xs shadow-xs">
                  <span>${safeActiveAvatar}</span>
                  <span>${safeActiveName}</span>
                  <span class="bg-emerald-800/60 px-1.5 py-0.5 rounded-full font-mono text-[10px]">⭐ ${safeScore}</span>
                </span>
              </div>
              <button type="button" data-action="activate-student" data-student-id="" class="text-xs font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer">
                <span>👤</span><span data-i18n="switch_to_guest">${this._escapeHTML(this._t('switch_to_guest', 'التبديل إلى حصة عامة (ضيف)'))}</span>
              </button>
            </div>
            `;
        } else {
            html += `
            <div class="flex flex-wrap items-center justify-between p-3.5 bg-amber-50 border border-amber-200 rounded-2xl mb-5 gap-3">
              <div class="flex items-center gap-2.5">
                <span data-i18n="current_mode_label" class="text-xs font-bold text-amber-800">${this._escapeHTML(this._t('current_mode_label', 'الوضع الحالي:'))}</span>
                <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-600 text-white rounded-full font-black text-xs shadow-xs">
                  <span>👤</span><span data-i18n="guest_session">${this._escapeHTML(this._t('guest_session', 'حصة عامة (وضع الضيف)'))}</span>
                </span>
              </div>
              <span data-i18n="select_student_hint" class="text-xs text-amber-900 font-bold">${this._escapeHTML(this._t('select_student_hint', 'اختر طالباً أدناه لتفعيل تسجيل درجاته وبنك أخطائه'))}</span>
            </div>
            `;
        }

        // شبكة بطاقات الطلاب
        if (students.length > 0) {
            html += `
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-black text-slate-800 text-sm flex items-center gap-2">
                <span aria-hidden="true">👥</span> <span data-i18n="registered_students">${this._escapeHTML(this._t('registered_students', 'الطلاب المسجلون'))}</span> <span>(${students.length})</span>
              </h3>
              <button type="button" data-action="switch-tab" data-tab="add" class="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-xl transition-colors flex items-center gap-1 cursor-pointer">
                <span aria-hidden="true">➕</span> <span data-i18n="add_student_btn">${this._escapeHTML(this._t('add_student_btn', 'طالب جديد'))}</span>
              </button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            `;

            students.forEach(s => {
                const isActive = s.id === activeId;
                const completedCount = s.completedLessons ? Object.keys(s.completedLessons).length : 0;
                const mistakesCount = Array.isArray(s.mistakeBank) ? s.mistakeBank.length : 0;
                const studentColor = this._escapeHTML(s.color || '#059669');
                const safeId = this._escapeHTML(s.id);
                const safeName = this._escapeHTML(s.name);
                const safeAvatar = this._escapeHTML(s.avatar || s.name.charAt(0) || '👤');
                const safeScore = Math.max(0, Math.floor(Number(s.totalScore) || 0));

                html += `
                <div class="bg-white border-2 ${isActive ? 'border-emerald-500 bg-emerald-50/30 ring-2 ring-emerald-500/20' : 'border-slate-200 hover:border-emerald-300'} rounded-2xl p-3.5 transition-all flex flex-col justify-between gap-3 shadow-xs">
                  
                  <div class="flex items-center justify-between gap-2.5">
                    <div class="flex items-center gap-3 min-w-0">
                      <div class="w-11 h-11 rounded-2xl flex items-center justify-center text-white text-xl font-black shrink-0 shadow-sm" style="background: linear-gradient(135deg, ${studentColor}, #0f172a)">
                        ${safeAvatar}
                      </div>
                      <div class="min-w-0">
                        <h4 class="font-black text-slate-900 text-sm truncate">${safeName}</h4>
                        <div class="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                          ${isActive ? `<span data-i18n="active_badge" class="text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.2 rounded">${this._escapeHTML(this._t('active_badge', 'نشط'))}</span>` : `<span data-i18n="registered_badge">${this._escapeHTML(this._t('registered_badge', 'مسجل'))}</span>`}
                          <span>•</span>
                          <span class="font-mono text-emerald-700 font-bold">⭐ ${safeScore} <span data-i18n="points_unit">${this._escapeHTML(this._t('points_unit', 'نقطة'))}</span></span>
                        </div>
                      </div>
                    </div>

                    <button type="button" data-action="delete-student" data-student-id="${safeId}" data-i18n-title="delete_student" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer" title="${this._escapeHTML(this._t('delete_student', 'حذف'))}" aria-label="${this._escapeHTML(this._t('aria_delete_student', `حذف الطالب ${safeName}`, { name: safeName }))}">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>

                  <div class="grid grid-cols-2 gap-2 text-center text-xs py-1.5 px-2 bg-slate-50 rounded-xl border border-slate-100 font-bold">
                    <div class="text-slate-600">
                      <span data-i18n="total_completed_lessons" class="text-slate-400 text-[10px] block font-normal">${this._escapeHTML(this._t('total_completed_lessons', 'الدروس المكتملة'))}</span>
                      <span class="text-slate-800 font-black">📖 ${completedCount}</span>
                    </div>
                    <div class="text-slate-600">
                      <span data-i18n="mistakes_count" class="text-slate-400 text-[10px] block font-normal">${this._escapeHTML(this._t('mistakes_count', 'بنك الأخطاء'))}</span>
                      <span class="${mistakesCount > 0 ? 'text-rose-600' : 'text-emerald-600'} font-black">📌 ${mistakesCount}</span>
                    </div>
                  </div>

                  <div class="flex items-center gap-2 pt-1">
                    ${isActive ? `
                      <span data-i18n="active_badge" class="flex-1 text-center py-1.5 bg-emerald-100 text-emerald-800 rounded-xl font-black text-xs select-none">✓ ${this._escapeHTML(this._t('active_badge', 'الطالب النشط'))}</span>
                    ` : `
                      <button type="button" data-action="activate-student" data-student-id="${safeId}" class="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer">
                        <span data-i18n="set_active_student">${this._escapeHTML(this._t('set_active_student', 'تفعيل كطالب نشط'))}</span> ⭐
                      </button>
                    `}
                    <button type="button" data-action="view-profile" data-student-id="${safeId}" data-i18n-aria="aria_view_profile" class="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer" aria-label="${this._escapeHTML(this._t('aria_view_profile', 'عرض ملف الطالب وبنك أخطائه'))}">
                      <span data-i18n="mistake_bank_title">${this._escapeHTML(this._t('mistake_bank_title', 'الملف والأخطاء'))}</span> 📋
                    </button>
                  </div>

                </div>
                `;
            });

            html += `</div>`;
        } else {
            // حالة عدم وجود طلاب
            html += `
            <div class="text-center py-10 px-4 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
              <span class="text-4xl block mb-2" aria-hidden="true">🌱</span>
              <h3 data-i18n="no_students_yet" class="font-black text-slate-800 text-base mb-1">${this._escapeHTML(this._t('no_students_yet', 'لم يتم تسجيل أي طالب حتى الآن'))}</h3>
              <p data-i18n="roster_empty_desc" class="text-xs text-slate-500 font-medium max-w-sm mx-auto mb-4">
                ${this._escapeHTML(this._t('roster_empty_desc', 'أضف طلابك لمتابعة إنجازاتهم، رصد النجوم والدرجات على بطاقات الدروس، وبناء بنك مخصص للكلمات المتعثرة.'))}
              </p>
              <button type="button" data-action="switch-tab" data-tab="add" class="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer">
                <span>➕</span> <span data-i18n="add_first_student">${this._escapeHTML(this._t('add_first_student', 'إضافة أول طالب الآن'))}</span>
              </button>
            </div>
            `;
        }

        container.innerHTML = html;
    },

    renderStudentProfile(container, studentId) {
        if (typeof studentManager === 'undefined') return;
        const student = studentManager.getStudent(studentId);

        if (!student) {
            this.backToStudentsList();
            return;
        }

        const activeId = studentManager.getActiveStudentId();
        const isActive = student.id === activeId;
        const mistakes = Array.isArray(student.mistakeBank) ? student.mistakeBank : [];
        const completedLessons = student.completedLessons || {};
        const completedKeys = Object.keys(completedLessons);
        const studentColor = this._escapeHTML(student.color || '#059669');
        const safeStudentId = this._escapeHTML(student.id);
        const safeStudentName = this._escapeHTML(student.name);
        const safeAvatar = this._escapeHTML(student.avatar || student.name.charAt(0) || '👤');
        const safeTotalScore = Math.max(0, Math.floor(Number(student.totalScore) || 0));

        let html = `
        <div>
          <!-- Top Back Bar -->
          <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 gap-2 flex-wrap">
            <button type="button" data-action="back-to-list" class="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl transition-colors cursor-pointer">
              <span aria-hidden="true">←</span> <span data-i18n="back_to_students_list">${this._escapeHTML(this._t('back_to_students_list', 'العودة لقائمة الطلاب'))}</span>
            </button>

            <div class="flex items-center gap-2">
              <button type="button" data-action="edit-student" data-student-id="${safeStudentId}" data-i18n-title="edit_student_title" class="inline-flex items-center gap-1.5 text-xs font-black text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 px-3 py-1.5 rounded-xl shadow-xs transition-colors cursor-pointer" title="${this._escapeHTML(this._t('edit_student_title', 'تعديل بيانات الطالب'))}">
                <span aria-hidden="true">✏️</span> <span data-i18n="edit_student_btn">${this._escapeHTML(this._t('edit_student_btn', 'تعديل البيانات ✏️'))}</span>
              </button>

              <button type="button" data-action="print-report" data-student-id="${safeStudentId}" data-i18n-aria="aria_print_report" class="inline-flex items-center gap-1.5 text-xs font-black text-white bg-teal-600 hover:bg-teal-700 px-3 py-1.5 rounded-xl shadow-xs transition-colors cursor-pointer" aria-label="${this._escapeHTML(this._t('aria_print_report', 'طباعة تقرير الطالب'))}">
                <span aria-hidden="true">🖨️</span> <span data-i18n="print_report_btn">${this._escapeHTML(this._t('print_report_btn', 'طباعة تقرير الطالب 🖨️'))}</span>
              </button>
            </div>
          </div>

          <!-- Student Header Card -->
          <div class="bg-gradient-to-l from-slate-900 to-slate-800 text-white p-4 sm:p-5 rounded-3xl mb-6 shadow-md flex items-center justify-between gap-4 flex-wrap">
            <div class="flex items-center gap-3.5">
              <div class="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-3xl font-black shrink-0 border-2 border-white/30 shadow-inner" style="background: linear-gradient(135deg, ${studentColor}, #0f172a)">
                ${safeAvatar}
              </div>
              <div>
                <div class="flex items-center gap-2 flex-wrap">
                  <h3 class="font-black text-lg sm:text-xl text-white tracking-tight">${safeStudentName}</h3>
                  ${isActive ? `<span data-i18n="active_badge" class="text-emerald-300 bg-emerald-900/60 border border-emerald-500/40 text-[11px] font-bold px-2 py-0.5 rounded-full">${this._escapeHTML(this._t('active_badge', 'نشط الآن ✔'))}</span>` : ''}
                </div>
                <p class="text-xs text-slate-400 font-medium mt-0.5">
                  <span data-i18n="registered_date_label">${this._escapeHTML(this._t('registered_date_label', 'تاريخ التسجيل:'))}</span> ${this._escapeHTML(student.createdAt ? new Date(student.createdAt).toLocaleDateString((typeof i18n !== 'undefined' && i18n.getLocale) ? i18n.getLocale() : 'ar-EG') : '-')}
                </p>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <div class="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-2xl border border-white/10 text-center">
                <span data-i18n="points_gathered_label" class="text-[10px] text-emerald-300 font-bold block">${this._escapeHTML(this._t('points_gathered_label', 'إجمالي النقاط'))}</span>
                <span class="text-base sm:text-lg font-black text-amber-300 font-mono">⭐ ${safeTotalScore}</span>
              </div>
              ${!isActive ? `
                <button type="button" data-action="activate-student" data-student-id="${safeStudentId}" class="bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs px-4 py-2.5 rounded-2xl shadow-sm transition-transform hover:scale-105 cursor-pointer">
                  <span data-i18n="set_active_student">${this._escapeHTML(this._t('set_active_student', 'تفعيل كطالب نشط'))}</span>
                </button>
              ` : ''}
            </div>
          </div>

          <!-- Mistake Bank Section -->
          <div class="bg-rose-50/60 border border-rose-200 rounded-3xl p-4 sm:p-5 mb-6">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h4 class="font-black text-rose-900 text-sm sm:text-base flex items-center gap-2">
                  <span aria-hidden="true">📌</span> <span data-i18n="mistake_bank_title">${this._escapeHTML(this._t("mistake_bank_title", "سجل الكلمات المتعثرة"))}</span>
                </h4>
                <p data-i18n="mistake_bank_desc" class="text-xs text-rose-700 font-medium mt-0.5">${this._escapeHTML(this._t('mistake_bank_desc', 'كلمات واجه الطالب صعوبة في قراءتها. تُعرض مشكولة بالرسم القرآني لمراجعتها شفوياً وتثبيتها.'))}</p>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-rose-800 bg-rose-100 px-2.5 py-1 rounded-full border border-rose-200">${mistakes.length} <span data-i18n="mistakes_count">${this._escapeHTML(this._t('mistakes_count', 'كلمات'))}</span></span>
                ${mistakes.length > 0 ? `
                  <button type="button" data-action="launch-remediation" data-student-id="${safeStudentId}" data-i18n-aria="aria_launch_remediation" class="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs px-3.5 py-1 rounded-full shadow-xs transition-transform hover:scale-105 cursor-pointer" aria-label="${this._escapeHTML(this._t('aria_launch_remediation', 'إطلاق جلسة تدريب الأخطاء التفاعلية'))}">
                    <span aria-hidden="true">🚀</span> <span data-i18n="remediation_btn">${this._escapeHTML(this._t('remediation_btn', 'إطلاق التدريب التفاعلي'))}</span>
                  </button>
                ` : ''}
              </div>
            </div>
        `;

        if (mistakes.length > 0) {
            html += `
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
            `;

            mistakes.forEach(m => {
                const safeWord = this._escapeHTML(m.word || '');
                const safeLessonId = this._escapeHTML(m.lessonId || '');
                const safeCount = Math.max(1, Math.floor(Number(m.count) || 1));
                const lessonLabel = this._t('lesson_label', `درس ${safeLessonId || '-'}`, { num: safeLessonId || '-' });

                html += `
                <div class="mistake-word-card">
                  <div class="text-[10px] text-rose-700 font-bold bg-rose-100/80 px-2 py-0.5 rounded-full mb-1">
                    ${this._escapeHTML(lessonLabel)} • (${safeCount})
                  </div>
                  ${(m.item && typeof WordRenderer !== 'undefined')
                    ? WordRenderer.toHTML(m.item)
                    : `<div class="mistake-quran-text">${safeWord}</div>`}
                  <button type="button" data-action="remove-mistake" data-student-id="${safeStudentId}" data-word="${safeWord}" data-lesson-id="${safeLessonId}" data-i18n-aria="aria_master_mistake" class="mt-2 text-[11px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 px-2.5 py-1 rounded-xl transition-colors flex items-center gap-1 w-full justify-center shadow-2xs cursor-pointer" aria-label="${this._escapeHTML(this._t('aria_master_mistake', 'تمييز الكلمة كمتقنة وحذفها'))}">
                    <span aria-hidden="true">✓</span> <span data-i18n="eval_correct_label">${this._escapeHTML(this._t('eval_correct_label', 'تم الإتقان'))}</span>
                  </button>
                </div>
                `;
            });

            html += `
            </div>
            <div class="mt-4 pt-3 border-t border-rose-200/80 text-left">
              <button type="button" data-action="clear-mistakes" data-student-id="${safeStudentId}" class="text-xs text-rose-600 hover:text-rose-800 font-bold underline transition-colors cursor-pointer">
                <span data-i18n="clear_all_mistakes_btn">${this._escapeHTML(this._t('clear_all_mistakes_btn', 'مسح كافة الكلمات المتعثرة من بنك هذا الطالب 🧹'))}</span>
              </button>
            </div>
            `;
        } else {
            html += `
            <div class="text-center py-6 px-4 bg-white/80 rounded-2xl border border-rose-200/60">
              <span class="text-3xl block mb-1" aria-hidden="true">🎉</span>
              <p data-i18n="mistake_bank_empty_title" class="font-black text-rose-900 text-sm">${this._escapeHTML(this._t('mistake_bank_empty_title', 'ما شاء الله! بنك الأخطاء فارغ لهذا الطالب حالياً.'))}</p>
              <p data-i18n="mistake_bank_empty_desc" class="text-xs text-rose-700 mt-0.5">${this._escapeHTML(this._t('mistake_bank_empty_desc', 'عند تقييم أي كلمة بـ (مراجعة / خطأ) أثناء الحصة، ستُسجل تلقائياً هنا للقراءة الشفوية.'))}</p>
            </div>
            `;
        }

        html += `
          </div>

          <!-- Completed Lessons Section -->
          <div class="bg-slate-50 border border-slate-200 rounded-3xl p-4 sm:p-5">
            <h4 class="font-black text-slate-800 text-sm sm:text-base mb-3 flex items-center gap-2">
              <span aria-hidden="true">🏆</span> <span data-i18n="completed_lessons_title">${this._escapeHTML(this._t('completed_lessons_title', 'سجل الدروس المنجزة والنجوم المحرزة'))}</span>
            </h4>
        `;

        if (completedKeys.length > 0) {
            html += `
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            `;
            completedKeys.forEach(lId => {
                const rec = completedLessons[lId] || {};
                const starsCount = Math.min(3, Math.max(0, Math.floor(Number(rec.stars) || 0)));
                const starsStr = starsCount > 0 ? '⭐'.repeat(starsCount) : '✓';
                const safeLId = this._escapeHTML(lId);
                const safeScoreVal = Math.max(0, Math.floor(Number(rec.score || rec.bestScore) || 0));
                const safeAccuracyVal = Math.min(100, Math.max(0, Math.round(Number(rec.accuracy !== undefined ? rec.accuracy : 100)) || 0));
                const lessonLabel = this._t('lesson_label', `الصفحة ${safeLId}`, { num: safeLId });

                html += `
                <div class="bg-white p-3 rounded-2xl border border-slate-200 flex items-center justify-between gap-2 shadow-2xs">
                  <div>
                    <span class="font-black text-slate-800 text-xs block">${this._escapeHTML(lessonLabel)}</span>
                    <span class="text-[11px] text-slate-500 font-medium"><span data-i18n="score">${this._escapeHTML(this._t('score', 'الدرجة'))}</span>: ${safeScoreVal} • <span data-i18n="accuracy_label">${this._escapeHTML(this._t('accuracy_label', 'دقة'))}</span>: ${safeAccuracyVal}%</span>
                  </div>
                  <div class="flex flex-col items-end gap-1">
                    <span class="text-amber-500 font-bold text-xs">${starsStr}</span>
                    <div class="flex items-center gap-1">
                      <button type="button" data-action="delete-lesson-progress" data-student-id="${safeStudentId}" data-lesson-id="${safeLId}" data-i18n-title="delete_lesson_progress" class="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1 rounded-lg transition-colors cursor-pointer" title="${this._escapeHTML(this._t('delete_lesson_progress', 'إلغاء نتيجة هذا الدرس'))}" aria-label="${this._escapeHTML(this._t('aria_delete_lesson_progress', `إلغاء نتيجة الصفحة ${safeLId}`, { lesson: safeLId }))}">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                      <a href="pages/${safeLId}.html" class="text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md transition-colors"><span data-i18n="open_lesson_link">${this._escapeHTML(this._t('open_lesson_link', 'فتح ↗'))}</span></a>
                    </div>
                  </div>
                </div>
                `;
            });
            html += `</div>`;
        } else {
            html += `
            <p data-i18n="no_completed_lessons_hint" class="text-xs text-slate-500 text-center py-4 font-medium">${this._escapeHTML(this._t('no_completed_lessons_hint', 'لم يتم إتمام أي دروس بعد لهذا الطالب. افتح أي درس وابدأ القراءة لتسجيل الإنجازات فورياً.'))}</p>
            `;
        }

        html += `
          </div>
        </div>
        `;

        container.innerHTML = html;
    },

    renderAddStudentForm(container) {
        const avatarsHtml = this._renderAvatarPicker(this._selectedAvatar, false, this._useFirstLetter);
        const colorsHtml = this._renderColorPicker(this._selectedColor, false);
        const safeAvatar = this._escapeHTML(this._selectedAvatar);
        const safeColor = this._escapeHTML(this._selectedColor);

        const html = `
        <form id="roster-add-student-form" class="space-y-5 max-w-lg mx-auto">
          
          <!-- Live Preview Card -->
          <div class="bg-gradient-to-l from-slate-900 to-slate-800 text-white p-4 rounded-2xl flex items-center gap-3.5 shadow-md">
            <div id="new-student-preview-avatar" class="w-13 h-13 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0 border-2 border-white/30 shadow-sm" style="background: linear-gradient(135deg, ${safeColor}, #0f172a)">
              ${safeAvatar}
            </div>
            <div>
              <span data-i18n="preview_student_card" class="text-[10px] text-emerald-400 font-bold block">${this._escapeHTML(this._t('preview_student_card', 'معاينة بطاقة الطالب'))}</span>
              <h4 id="new-student-preview-name" class="font-black text-base text-white">${this._escapeHTML(this._t('student_name_fallback', 'اسم الطالب'))}</h4>
            </div>
          </div>

          <!-- Student Name Input -->
          <div>
            <label for="new-student-name-input" class="block font-black text-slate-800 text-xs mb-1.5">
              <span data-i18n="add_student_label">${this._escapeHTML(this._t('add_student_label', 'اسم الطالب / الطالبة'))}</span> <span class="text-rose-500">*</span>
            </label>
            <input type="text" id="new-student-name-input" required data-i18n-placeholder="student_name_example_placeholder" placeholder="${this._escapeHTML(this._t('student_name_example_placeholder', 'مثال: عبد الرحمن، فاطمة، زياد...'))}" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 font-bold text-sm text-slate-800 outline-none focus:border-emerald-500 focus:bg-white transition-colors" autocomplete="off">
          </div>

          <!-- Avatar Selection Grid -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="block font-black text-slate-800 text-xs">
                <span data-i18n="avatar_picker_title">${this._escapeHTML(this._t('avatar_picker_title', 'الرمز التعبيري للأفاتار (الأيقونة)'))}</span>
              </label>
              <button type="button" id="roster-letter-btn" data-action="toggle-first-letter" class="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer">
                🔤 <span data-i18n="first_letter_avatar_btn">${this._escapeHTML(this._t('first_letter_avatar_btn', 'الحرف الأول من الاسم'))}</span>
              </button>
            </div>
            <div id="roster-avatar-grid" class="avatar-picker-grid">
              ${avatarsHtml}
            </div>
          </div>

          <!-- Color Palette Selection -->
          <div>
            <label class="block font-black text-slate-800 text-xs mb-1.5">
              <span data-i18n="color_palette_title">${this._escapeHTML(this._t('color_palette_title', 'اللون المميز للملف الشخصي'))}</span>
            </label>
            <div id="roster-color-grid" class="color-picker-grid">
              ${colorsHtml}
            </div>
          </div>

          <!-- Submit Button -->
          <div class="pt-2">
            <button type="submit" class="w-full py-3 bg-gradient-to-l from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-sm rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer">
              <span>💾</span> <span data-i18n="save_student_btn">${this._escapeHTML(this._t('save_student_btn', 'حفظ وإضافة الطالب'))}</span>
            </button>
          </div>

        </form>
        `;

        container.innerHTML = html;
        setTimeout(() => {
            const input = document.getElementById('new-student-name-input');
            if (input) input.focus();
        }, 50);
    },

    };

    global.RosterViews = RosterViews;
})(typeof window !== 'undefined' ? window : globalThis);
