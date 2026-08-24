/**
 * Nour Al-Bayan Interactive Platform - Student Roster Manager
 * Manages the student roster modal, active student state, and mistaken words.
 */

/**
 * Roster Dashboard Manager - محرك لوحة إدارة ومتابعة الطلاب
 */
const rosterManager = {
    ensureModalDOM() {
        if (document.getElementById('student-roster-modal')) return;
        const modalWrapper = document.createElement('div');
        modalWrapper.innerHTML = `<div id="student-roster-modal" class="hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm items-center justify-center p-3 sm:p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="roster-modal-title">
  <div class="bg-white w-full max-w-3xl rounded-[2rem] shadow-2xl border border-emerald-100 overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in duration-150" dir="rtl">
    
    <!-- Modal Header -->
    <div class="bg-gradient-to-l from-emerald-700 via-emerald-600 to-teal-700 p-4 sm:p-5 text-white flex items-center justify-between shadow-md">
      <div class="flex items-center gap-3">
        <span class="text-2xl sm:text-3xl" aria-hidden="true">👥</span>
        <div>
          <h2 id="roster-modal-title" class="text-lg sm:text-xl font-black tracking-tight leading-tight">${i18n.t("roster_modal_title")}</h2>
          <p class="text-xs text-emerald-100 font-medium">${i18n.t("roster_modal_subtitle")}</p>
        </div>
      </div>
      <button id="roster-modal-close-btn" onclick="rosterManager.close()" class="p-2 rounded-full hover:bg-white/20 text-white/90 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white" aria-label="${i18n.t('close')}">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>
    </div>

    <!-- Navigation Tabs -->
    <div class="flex items-center border-b border-slate-200 bg-slate-50 px-4 sm:px-6 pt-2 overflow-x-auto gap-2" role="tablist" aria-label="أقسام لوحة الطلاب">
      <button id="tab-btn-students" onclick="rosterManager.switchTab('students')" class="roster-tab-btn active" role="tab" aria-selected="true" aria-controls="roster-tab-content">
        <span aria-hidden="true">👥</span>
        <span>${i18n.t("tab_students_list")}</span>
      </button>
      <button id="tab-btn-add" onclick="rosterManager.switchTab('add')" class="roster-tab-btn" role="tab" aria-selected="false" aria-controls="roster-tab-content">
        <span aria-hidden="true">➕</span>
        <span>${i18n.t("tab_add_student")}</span>
      </button>
      <button id="tab-btn-backup" onclick="rosterManager.switchTab('backup')" class="roster-tab-btn" role="tab" aria-selected="false" aria-controls="roster-tab-content">
        <span aria-hidden="true">💾</span>
        <span>${i18n.t("tab_backup")}</span>
      </button>
    </div>

    <!-- Tab Body Content -->
    <div id="roster-tab-content" class="p-4 sm:p-6 overflow-y-auto max-h-[72vh] text-slate-700 text-sm">
      <!-- Content is dynamically rendered by rosterManager -->
    </div>

  </div>
</div>`;
        if (modalWrapper.firstElementChild) {
            document.body.appendChild(modalWrapper.firstElementChild);
        }
    },

    _lastFocusedElement: null,
    _activeTab: 'students', // 'students' | 'add' | 'backup'
    _selectedStudentIdForView: null,
    _selectedAvatar: '👦',
    _selectedColor: '#059669',
    _useFirstLetter: false,
    _availableAvatars: ['👦', '👧', '🌟', '🦁', '🦅', '👑', '🚀', '🎯', '🦄', '🐬', '🏆', '🌸', '📖', '💡', '✨', '⭐'],
    _availableColors: [
        { hex: '#059669', name: 'زمردي' },
        { hex: '#0d9488', name: 'فيروزي' },
        { hex: '#2563eb', name: 'أزرق' },
        { hex: '#4f46e5', name: 'نيلي' },
        { hex: '#7c3aed', name: 'بنفسجي' },
        { hex: '#d97706', name: 'عنبري' },
        { hex: '#e11d48', name: 'وردي' },
        { hex: '#0891b2', name: 'سماوي' }
    ],

    init() {
        this.ensureModalDOM();
        if (typeof studentManager !== 'undefined') {
            studentManager.init();
        }
        this.updateHeaderBar();
        this.setupEventListeners();
        if (typeof studentManager !== 'undefined') {
            studentManager.updateIndexBadges();
        }
    },

    setupEventListeners() {
        const updateAll = () => {
            this.updateHeaderBar();
            if (typeof studentManager !== 'undefined') {
                studentManager.updateIndexBadges();
            }
            if (this.isOpen()) {
                this.renderContent();
            }
        };

        window.addEventListener('nb:student-changed', updateAll);
        window.addEventListener('nb:student-created', updateAll);
        window.addEventListener('nb:student-updated', updateAll);
        window.addEventListener('nb:student-deleted', updateAll);
        window.addEventListener('nb:student-progress-updated', updateAll);
        window.addEventListener('nb:lesson-completed', updateAll);

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen()) {
                this.close();
            }
        });

        const modal = document.getElementById('student-roster-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.close();
                }
            });
        }
    },

    updateHeaderBar() {
        if (typeof studentManager === 'undefined') return;
        const active = studentManager.getActiveStudent();
        const avatarEl = document.getElementById('active-student-avatar');
        const nameEl = document.getElementById('active-student-name');
        const scoreEl = document.getElementById('active-student-score');
        const btnEl = document.getElementById('active-student-btn');

        if (active) {
            if (avatarEl) avatarEl.textContent = active.avatar || '👤';
            if (nameEl) nameEl.textContent = active.name || 'طالب';
            if (scoreEl) scoreEl.textContent = `⭐ ${active.totalScore || 0}`;
            if (btnEl) btnEl.setAttribute('aria-label', `الطالب الحالي: ${active.name}، إجمالي النقاط: ${active.totalScore}`);
        } else {
            if (avatarEl) avatarEl.textContent = '👤';
            if (nameEl) nameEl.textContent = 'حصة عامة (ضيف)';
            if (scoreEl) scoreEl.textContent = '⭐ 0';
            if (btnEl) btnEl.setAttribute('aria-label', 'وضع الضيف / حصة عامة. انقر لاختيار أو إضافة طالب');
        }
    },

    isOpen() {
        const modal = document.getElementById('student-roster-modal');
        return modal && !modal.classList.contains('hidden');
    },

    open(tab = 'students', studentId = null) {
        this._lastFocusedElement = document.activeElement;
        this._activeTab = tab;
        this._selectedStudentIdForView = studentId;

        const modal = document.getElementById('student-roster-modal');
        if (!modal) return;

        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.body.style.overflow = 'hidden';

        this.renderContent();
        this.trapFocus(modal);

        const closeBtn = document.getElementById('roster-modal-close-btn');
        if (closeBtn) closeBtn.focus();
    },

    close() {
        const modal = document.getElementById('student-roster-modal');
        if (!modal) return;
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.body.style.overflow = '';

        if (this._lastFocusedElement && typeof this._lastFocusedElement.focus === 'function') {
            this._lastFocusedElement.focus();
        }
    },

    switchTab(tabName) {
        this._activeTab = tabName;
        if (tabName !== 'students') {
            this._selectedStudentIdForView = null;
        }
        this.renderContent();
    },

    viewStudentProfile(studentId) {
        this._selectedStudentIdForView = studentId;
        this._activeTab = 'students';
        this.renderContent();
    },

    backToStudentsList() {
        this._selectedStudentIdForView = null;
        this.renderContent();
    },

    selectAvatar(emoji) {
        this._selectedAvatar = emoji;
        this._useFirstLetter = false;
        this.updateAvatarSelectionUI();
    },

    toggleFirstLetter(useLetter) {
        this._useFirstLetter = !!useLetter;
        this.updateAvatarSelectionUI();
    },

    selectColor(hex) {
        this._selectedColor = hex;
        this.updateColorSelectionUI();
    },

    updateAvatarSelectionUI() {
        const grid = document.getElementById('roster-avatar-grid');
        if (grid) {
            const buttons = grid.querySelectorAll('.avatar-option-btn');
            buttons.forEach(btn => {
                const avatar = btn.getAttribute('data-avatar');
                if (!this._useFirstLetter && avatar === this._selectedAvatar) {
                    btn.classList.add('selected');
                    btn.setAttribute('aria-pressed', 'true');
                } else {
                    btn.classList.remove('selected');
                    btn.setAttribute('aria-pressed', 'false');
                }
            });
        }
        const letterBtn = document.getElementById('roster-letter-btn');
        if (letterBtn) {
            if (this._useFirstLetter) {
                letterBtn.classList.add('selected');
                letterBtn.setAttribute('aria-pressed', 'true');
            } else {
                letterBtn.classList.remove('selected');
                letterBtn.setAttribute('aria-pressed', 'false');
            }
        }
        this.updateNewStudentPreview();
    },

    updateColorSelectionUI() {
        const grid = document.getElementById('roster-color-grid');
        if (grid) {
            const buttons = grid.querySelectorAll('.color-swatch-btn');
            buttons.forEach(btn => {
                const col = btn.getAttribute('data-color');
                if (col === this._selectedColor) {
                    btn.classList.add('selected');
                    btn.setAttribute('aria-pressed', 'true');
                } else {
                    btn.classList.remove('selected');
                    btn.setAttribute('aria-pressed', 'false');
                }
            });
        }
        this.updateNewStudentPreview();
    },

    updateNewStudentPreview() {
        const previewAvatar = document.getElementById('new-student-preview-avatar');
        const previewName = document.getElementById('new-student-preview-name');
        const nameInput = document.getElementById('new-student-name-input');

        const enteredName = nameInput ? nameInput.value.trim() : '';
        let displayAvatar = this._selectedAvatar;

        if (this._useFirstLetter) {
            displayAvatar = enteredName ? enteredName.charAt(0) : 'أ';
        }

        if (previewAvatar) {
            previewAvatar.textContent = displayAvatar;
            previewAvatar.style.background = `linear-gradient(135deg, ${this._selectedColor}, #0f172a)`;
        }
        if (previewName) {
            previewName.textContent = enteredName || 'اسم الطالب';
        }
    },

    handleCreateStudent(e) {
        if (e && e.preventDefault) e.preventDefault();
        const nameInput = document.getElementById('new-student-name-input');
        if (!nameInput) return;

        const name = nameInput.value.trim();
        if (!name) {
            alert('يرجى إدخال اسم الطالب أولاً.');
            nameInput.focus();
            return;
        }

        let avatar = this._selectedAvatar;
        if (this._useFirstLetter) {
            avatar = name.charAt(0);
        }

        if (typeof studentManager !== 'undefined') {
            const created = studentManager.createStudent({
                name: name,
                avatar: avatar,
                color: this._selectedColor
            });

            nameInput.value = '';
            this._activeTab = 'students';
            this._selectedStudentIdForView = created.id;
            this.renderContent();
        }
    },

    handleActivateStudent(studentId) {
        if (typeof studentManager !== 'undefined') {
            studentManager.setActiveStudent(studentId);
            this.updateHeaderBar();
            studentManager.updateIndexBadges();
            this.renderContent();
        }
    },

    handleDeleteStudent(studentId) {
        if (typeof studentManager === 'undefined') return;
        const student = studentManager.getStudent(studentId);
        const name = student ? student.name : 'الطالب';

        if (confirm(`هل أنت متأكد من حذف الطالب (${name}) وجميع سجلاته ودرجاته وبنك أخطائه نهائياً؟`)) {
            studentManager.deleteStudent(studentId);
            if (this._selectedStudentIdForView === studentId) {
                this._selectedStudentIdForView = null;
            }
            this.updateHeaderBar();
            studentManager.updateIndexBadges();
            this.renderContent();
        }
    },

    handleRemoveMistake(studentId, word) {
        if (typeof studentManager !== 'undefined') {
            studentManager.removeMistake(studentId, word);
            this.renderContent();
        }
    },

    handleClearAllMistakes(studentId) {
        if (typeof studentManager === 'undefined') return;
        const student = studentManager.getStudent(studentId);
        const name = student ? student.name : 'الطالب';

        if (confirm(`هل تريد مسح كافة الكلمات المتعثرة من بنك أخطاء (${name})؟`)) {
            if (student && Array.isArray(student.mistakeBank)) {
                student.mistakeBank.forEach(m => {
                    studentManager.removeMistake(studentId, m.word);
                });
            }
            this.renderContent();
        }
    },

    handleExportJSON() {
        if (typeof studentManager !== 'undefined') {
            studentManager.exportJSON();
        }
    },

    handleImportFile(input) {
        if (!input || !input.files || input.files.length === 0) return;
        const file = input.files[0];
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const content = e.target.result;
                if (typeof studentManager !== 'undefined') {
                    const res = studentManager.importJSON(content);
                    if (res && res.success) {
                        this.renderContent();
                        studentManager.updateIndexBadges();
                        this.updateHeaderBar();
                    }
                }
            } catch (err) {
                alert('فشل قراءة الملف: ' + err.message);
            }
            input.value = '';
        };

        reader.readAsText(file, 'utf-8');
    },

    handleImportText() {
        const textarea = document.getElementById('roster-import-textarea');
        if (!textarea) return;
        const raw = textarea.value.trim();
        if (!raw) {
            alert('يرجى لصق نص JSON في الحقل المخصص أولاً.');
            return;
        }

        if (typeof studentManager !== 'undefined') {
            const res = studentManager.importJSON(raw);
            if (res && res.success) {
                textarea.value = '';
                this.renderContent();
                studentManager.updateIndexBadges();
                this.updateHeaderBar();
            }
        }
    },

    launchRemediation(studentId) {
        if (typeof studentManager !== 'undefined') {
            studentManager.setActiveStudent(studentId);
        }
        window.location.href = 'pages/remediation.html';
    },

    trapFocus(modal) {
        const focusableSelector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
        
        modal.onkeydown = (e) => {
            if (e.key !== 'Tab') return;
            const focusable = Array.from(modal.querySelectorAll(focusableSelector));
            if (focusable.length === 0) return;

            const firstEl = focusable[0];
            const lastEl = focusable[focusable.length - 1];

            if (e.shiftKey) {
                if (document.activeElement === firstEl) {
                    e.preventDefault();
                    lastEl.focus();
                }
            } else {
                if (document.activeElement === lastEl) {
                    e.preventDefault();
                    firstEl.focus();
                }
            }
        };
    },

    renderContent() {
        // Update tab buttons active state
        ['students', 'add', 'backup'].forEach(tab => {
            const btn = document.getElementById(`tab-btn-${tab}`);
            if (btn) {
                const isActive = this._activeTab === tab;
                if (isActive) {
                    btn.classList.add('active');
                    btn.setAttribute('aria-selected', 'true');
                } else {
                    btn.classList.remove('active');
                    btn.setAttribute('aria-selected', 'false');
                }
            }
        });

        const container = document.getElementById('roster-tab-content');
        if (!container) return;

        if (this._activeTab === 'students') {
            if (this._selectedStudentIdForView) {
                this.renderStudentProfile(container, this._selectedStudentIdForView);
            } else {
                this.renderStudentsList(container);
            }
        } else if (this._activeTab === 'add') {
            this.renderAddStudentForm(container);
        } else if (this._activeTab === 'backup') {
            this.renderBackupSection(container);
        }
    },

    renderStudentsList(container) {
        const students = (typeof studentManager !== 'undefined') ? studentManager.getStudents() : [];
        const activeId = (typeof studentManager !== 'undefined') ? studentManager.getActiveStudentId() : null;
        const activeStudent = students.find(s => s.id === activeId);

        let html = '';

        // Active Mode Status Banner
        if (activeStudent) {
            html += `
            <div class="flex flex-wrap items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl mb-5 gap-3">
              <div class="flex items-center gap-3">
                <span class="text-xs font-bold text-emerald-800">الطالب النشط حالياً:</span>
                <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 text-white rounded-full font-black text-xs shadow-xs">
                  <span>${activeStudent.avatar || '👤'}</span>
                  <span>${activeStudent.name}</span>
                  <span class="bg-emerald-800/60 px-1.5 py-0.5 rounded-full font-mono text-[10px]">⭐ ${activeStudent.totalScore || 0}</span>
                </span>
              </div>
              <button onclick="rosterManager.handleActivateStudent(null)" class="text-xs font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-xs">
                <span>👤</span><span>التبديل إلى حصة عامة (ضيف)</span>
              </button>
            </div>
            `;
        } else {
            html += `
            <div class="flex flex-wrap items-center justify-between p-3.5 bg-amber-50 border border-amber-200 rounded-2xl mb-5 gap-3">
              <div class="flex items-center gap-2.5">
                <span class="text-xs font-bold text-amber-800">الوضع الحالي:</span>
                <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-600 text-white rounded-full font-black text-xs shadow-xs">
                  <span>👤</span><span>حصة عامة (وضع الضيف)</span>
                </span>
              </div>
              <span class="text-xs text-amber-900 font-bold">اختر طالباً أدناه لتفعيل تسجيل درجاته وبنك أخطائه</span>
            </div>
            `;
        }

        // Students Cards Grid
        if (students.length > 0) {
            html += `
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-black text-slate-800 text-sm flex items-center gap-2">
                <span>👥</span> <span>الطلاب المسجلون (${students.length})</span>
              </h3>
              <button onclick="rosterManager.switchTab('add')" class="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-xl transition-colors flex items-center gap-1">
                <span>➕</span> <span>طالب جديد</span>
              </button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            `;

            students.forEach(s => {
                const isActive = s.id === activeId;
                const completedCount = s.completedLessons ? Object.keys(s.completedLessons).length : 0;
                const mistakesCount = Array.isArray(s.mistakeBank) ? s.mistakeBank.length : 0;
                const studentColor = s.color || '#059669';

                html += `
                <div class="bg-white border-2 ${isActive ? 'border-emerald-500 bg-emerald-50/30 ring-2 ring-emerald-500/20' : 'border-slate-200 hover:border-emerald-300'} rounded-2xl p-3.5 transition-all flex flex-col justify-between gap-3 shadow-xs">
                  
                  <div class="flex items-center justify-between gap-2.5">
                    <div class="flex items-center gap-3 min-w-0">
                      <div class="w-11 h-11 rounded-2xl flex items-center justify-center text-white text-xl font-black shrink-0 shadow-sm" style="background: linear-gradient(135deg, ${studentColor}, #0f172a)">
                        ${s.avatar || s.name.charAt(0) || '👤'}
                      </div>
                      <div class="min-w-0">
                        <h4 class="font-black text-slate-900 text-sm truncate">${s.name}</h4>
                        <div class="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                          ${isActive ? '<span class="text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.2 rounded">نشط</span>' : '<span>مسجل</span>'}
                          <span>•</span>
                          <span class="font-mono text-emerald-700 font-bold">⭐ ${s.totalScore || 0} نقطة</span>
                        </div>
                      </div>
                    </div>

                    <button onclick="rosterManager.handleDeleteStudent('${s.id}')" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors" title="حذف الطالب" aria-label="حذف الطالب ${s.name}">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>

                  <div class="grid grid-cols-2 gap-2 text-center text-xs py-1.5 px-2 bg-slate-50 rounded-xl border border-slate-100 font-bold">
                    <div class="text-slate-600">
                      <span class="text-slate-400 text-[10px] block font-normal">الدروس المكتملة</span>
                      <span class="text-slate-800 font-black">📖 ${completedCount}</span>
                    </div>
                    <div class="text-slate-600">
                      <span class="text-slate-400 text-[10px] block font-normal">بنك الأخطاء</span>
                      <span class="${mistakesCount > 0 ? 'text-rose-600' : 'text-emerald-600'} font-black">📌 ${mistakesCount}</span>
                    </div>
                  </div>

                  <div class="flex items-center gap-2 pt-1">
                    ${isActive ? `
                      <span class="flex-1 text-center py-1.5 bg-emerald-100 text-emerald-800 rounded-xl font-black text-xs select-none">✓ الطالب النشط</span>
                    ` : `
                      <button onclick="rosterManager.handleActivateStudent('${s.id}')" class="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors">
                        تفعيل كطالب نشط ⭐
                      </button>
                    `}
                    <button onclick="rosterManager.viewStudentProfile('${s.id}')" class="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors" aria-label="عرض ملف الطالب وبنك أخطائه">
                      الملف والأخطاء 📋
                    </button>
                  </div>

                </div>
                `;
            });

            html += `</div>`;
        } else {
            // Empty State
            html += `
            <div class="text-center py-10 px-4 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
              <span class="text-4xl block mb-2" aria-hidden="true">🌱</span>
              <h3 class="font-black text-slate-800 text-base mb-1">لم يتم تسجيل أي طالب حتى الآن</h3>
              <p class="text-xs text-slate-500 font-medium max-w-sm mx-auto mb-4">
                أضف طلابك لمتابعة إنجازاتهم، رصد النجوم والدرجات على بطاقات الدروس، وبناء بنك مخصص للكلمات المتعثرة.
              </p>
              <button onclick="rosterManager.switchTab('add')" class="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all">
                <span>➕</span> <span>إضافة أول طالب الآن</span>
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
        const studentColor = student.color || '#059669';

        let html = `
        <div>
          <!-- Top Back Bar -->
          <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
            <button onclick="rosterManager.backToStudentsList()" class="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl transition-colors">
              <span aria-hidden="true">←</span> <span>العودة لقائمة الطلاب</span>
            </button>

            <div>
              ${isActive ? `
                <span class="text-xs font-black text-emerald-700 bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-full">✓ الطالب النشط حالياً</span>
              ` : `
                <button onclick="rosterManager.handleActivateStudent('${student.id}')" class="text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1 rounded-full shadow-xs transition-colors">
                  تفعيل كطالب نشط ⭐
                </button>
              `}
            </div>
          </div>

          <!-- Hero Profile Card -->
          <div class="bg-gradient-to-l from-slate-900 to-slate-800 text-white p-5 rounded-3xl mb-6 shadow-lg flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center gap-4">
              <div class="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-black shrink-0 border-2 border-white/30 shadow-md" style="background: linear-gradient(135deg, ${studentColor}, #047857)">
                ${student.avatar || student.name.charAt(0) || '👤'}
              </div>
              <div>
                <h3 class="font-black text-lg sm:text-xl text-white">${student.name}</h3>
                <p class="text-xs text-slate-300 font-medium">تاريخ التسجيل: ${new Date(student.createdAt || Date.now()).toLocaleDateString('ar-EG')}</p>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <div class="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl text-center border border-white/15">
                <span class="text-[10px] text-emerald-300 block font-bold">إجمالي النقاط</span>
                <span class="font-mono text-base font-black text-amber-300">⭐ ${student.totalScore || 0}</span>
              </div>
              <div class="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl text-center border border-white/15">
                <span class="text-[10px] text-emerald-300 block font-bold">دروس منجزة</span>
                <span class="font-mono text-base font-black text-white">📖 ${completedKeys.length}</span>
              </div>
            </div>
          </div>

          <!-- Mistake Bank Section -->
          <div class="bg-rose-50/60 border border-rose-200 rounded-3xl p-4 sm:p-5 mb-6">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h4 class="font-black text-rose-900 text-sm sm:text-base flex items-center gap-2">
                  <span aria-hidden="true">📌</span> <span>${i18n.t("mistake_bank_title")}</span>
                </h4>
                <p class="text-xs text-rose-700 font-medium mt-0.5">كلمات واجه الطالب صعوبة في قراءتها. تُعرض مشكولة بالرسم القرآني لمراجعتها شفوياً وتثبيتها.</p>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-rose-800 bg-rose-100 px-2.5 py-1 rounded-full border border-rose-200">${mistakes.length} كلمات</span>
                ${mistakes.length > 0 ? `
                  <button onclick="rosterManager.launchRemediation('${student.id}')" class="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs px-3.5 py-1 rounded-full shadow-xs transition-transform hover:scale-105" aria-label="إطلاق جلسة تدريب الأخطاء التفاعلية">
                    <span aria-hidden="true">🚀</span> <span>إطلاق التدريب التفاعلي</span>
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
                const safeWord = m.word ? m.word.replace(/'/g, "\\'") : '';
                html += `
                <div class="mistake-word-card">
                  <div class="text-[10px] text-rose-700 font-bold bg-rose-100/80 px-2 py-0.5 rounded-full mb-1">
                    درس ${m.lessonId || '-'} • تكرار (${m.count || 1})
                  </div>
                  <div class="mistake-quran-text">
                    ${m.word}
                  </div>
                  <button onclick="rosterManager.handleRemoveMistake('${student.id}', '${safeWord}')" class="mt-2 text-[11px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 px-2.5 py-1 rounded-xl transition-colors flex items-center gap-1 w-full justify-center shadow-2xs" aria-label="تمييز الكلمة كمتقنة وحذفها">
                    <span aria-hidden="true">✓</span> <span>تم الإتقان</span>
                  </button>
                </div>
                `;
            });

            html += `
            </div>
            <div class="mt-4 pt-3 border-t border-rose-200/80 text-left">
              <button onclick="rosterManager.handleClearAllMistakes('${student.id}')" class="text-xs text-rose-600 hover:text-rose-800 font-bold underline transition-colors">
                مسح كافة الكلمات المتعثرة من بنك هذا الطالب 🧹
              </button>
            </div>
            `;
        } else {
            html += `
            <div class="text-center py-6 px-4 bg-white/80 rounded-2xl border border-rose-200/60">
              <span class="text-3xl block mb-1" aria-hidden="true">🎉</span>
              <p class="font-black text-rose-900 text-sm">ما شاء الله! بنك الأخطاء فارغ لهذا الطالب حالياً.</p>
              <p class="text-xs text-rose-700 mt-0.5">عند تقييم أي كلمة بـ (مراجعة / خطأ) أثناء الحصة، ستُسجل تلقائياً هنا للقراءة الشفوية.</p>
            </div>
            `;
        }

        html += `
          </div>

          <!-- Completed Lessons Section -->
          <div class="bg-slate-50 border border-slate-200 rounded-3xl p-4 sm:p-5">
            <h4 class="font-black text-slate-800 text-sm sm:text-base mb-3 flex items-center gap-2">
              <span aria-hidden="true">🏆</span> <span>سجل الدروس المنجزة والنجوم المحرزة</span>
            </h4>
        `;

        if (completedKeys.length > 0) {
            html += `
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            `;
            completedKeys.forEach(lId => {
                const rec = completedLessons[lId];
                const starsCount = Math.min(3, Math.max(0, rec.stars || 0));
                const starsStr = starsCount > 0 ? '⭐'.repeat(starsCount) : '✓';

                html += `
                <div class="bg-white p-3 rounded-2xl border border-slate-200 flex items-center justify-between gap-2 shadow-2xs">
                  <div>
                    <span class="font-black text-slate-800 text-xs block">الصفحة ${lId}</span>
                    <span class="text-[11px] text-slate-500 font-medium">الدرجة: ${rec.score || rec.bestScore || 0} • دقة: ${rec.accuracy || 100}%</span>
                  </div>
                  <div class="flex flex-col items-end gap-1">
                    <span class="text-amber-500 font-bold text-xs">${starsStr}</span>
                    <a href="pages/${lId}.html" class="text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md transition-colors">فتح ↗</a>
                  </div>
                </div>
                `;
            });
            html += `</div>`;
        } else {
            html += `
            <p class="text-xs text-slate-500 text-center py-4 font-medium">لم يتم إتمام أي دروس بعد لهذا الطالب. افتح أي درس وابدأ القراءة لتسجيل الإنجازات فورياً.</p>
            `;
        }

        html += `
          </div>
        </div>
        `;

        container.innerHTML = html;
    },

    renderAddStudentForm(container) {
        let avatarsHtml = '';
        this._availableAvatars.forEach(av => {
            const isSel = !this._useFirstLetter && av === this._selectedAvatar;
            avatarsHtml += `
            <button type="button" onclick="rosterManager.selectAvatar('${av}')" class="avatar-option-btn ${isSel ? 'selected' : ''}" data-avatar="${av}" aria-pressed="${isSel ? 'true' : 'false'}" aria-label="اختيار الرمز ${av}">
              ${av}
            </button>
            `;
        });

        let colorsHtml = '';
        this._availableColors.forEach(col => {
            const isSel = col.hex === this._selectedColor;
            colorsHtml += `
            <button type="button" onclick="rosterManager.selectColor('${col.hex}')" class="color-swatch-btn ${isSel ? 'selected' : ''}" data-color="${col.hex}" style="background-color: ${col.hex}" aria-pressed="${isSel ? 'true' : 'false'}" aria-label="اختيار اللون ${col.name}">
            </button>
            `;
        });

        const html = `
        <form onsubmit="rosterManager.handleCreateStudent(event)" class="space-y-5 max-w-lg mx-auto">
          
          <!-- Live Preview Card -->
          <div class="bg-gradient-to-l from-slate-900 to-slate-800 text-white p-4 rounded-2xl flex items-center gap-3.5 shadow-md">
            <div id="new-student-preview-avatar" class="w-13 h-13 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0 border-2 border-white/30 shadow-sm" style="background: linear-gradient(135deg, ${this._selectedColor}, #0f172a)">
              ${this._selectedAvatar}
            </div>
            <div>
              <span class="text-[10px] text-emerald-400 font-bold block">معاينة بطاقة الطالب</span>
              <h4 id="new-student-preview-name" class="font-black text-base text-white">اسم الطالب</h4>
            </div>
          </div>

          <!-- Student Name Input -->
          <div>
            <label for="new-student-name-input" class="block font-black text-slate-800 text-xs mb-1.5">
              اسم الطالب / الطالبة <span class="text-rose-500">*</span>
            </label>
            <input type="text" id="new-student-name-input" required placeholder="مثال: عبد الرحمن، فاطمة، زياد..." oninput="rosterManager.updateNewStudentPreview()" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 font-bold text-sm text-slate-800 outline-none focus:border-emerald-500 focus:bg-white transition-colors" autocomplete="off">
          </div>

          <!-- Avatar Selection Grid -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="block font-black text-slate-800 text-xs">
                الرمز التعبيري للأفاتار (الأيقونة)
              </label>
              <button type="button" id="roster-letter-btn" onclick="rosterManager.toggleFirstLetter(!rosterManager._useFirstLetter)" class="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors">
                🔤 الحرف الأول من الاسم
              </button>
            </div>
            <div id="roster-avatar-grid" class="avatar-picker-grid">
              ${avatarsHtml}
            </div>
          </div>

          <!-- Color Palette Selection -->
          <div>
            <label class="block font-black text-slate-800 text-xs mb-1.5">
              اللون المميز للملف الشخصي
            </label>
            <div id="roster-color-grid" class="color-picker-grid">
              ${colorsHtml}
            </div>
          </div>

          <!-- Submit Button -->
          <div class="pt-2">
            <button type="submit" class="w-full py-3 bg-gradient-to-l from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-sm rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2">
              <span>💾</span> <span>حفظ وإضافة الطالب</span>
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

    renderBackupSection(container) {
        const students = (typeof studentManager !== 'undefined') ? studentManager.getStudents() : [];

        const html = `
        <div class="space-y-5 max-w-xl mx-auto">
          
          <!-- Export Card -->
          <div class="bg-slate-50 border border-slate-200 p-4 sm:p-5 rounded-2xl space-y-3">
            <div class="flex items-center gap-3">
              <span class="text-2xl" aria-hidden="true">📥</span>
              <div>
                <h3 class="font-black text-slate-800 text-sm">تصدير نسخة احتياطية (JSON)</h3>
                <p class="text-xs text-slate-500 font-medium">حفظ سجلات (${students.length}) طلاب مع نقاطهم وبنوك أخطائهم في ملف خارجي.</p>
              </div>
            </div>
            <button onclick="rosterManager.handleExportJSON()" class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2">
              <span>📥</span> <span>تصدير وتنزيل ملف النسخة الاحتياطية</span>
            </button>
          </div>

          <!-- Import Card -->
          <div class="bg-slate-50 border border-slate-200 p-4 sm:p-5 rounded-2xl space-y-3">
            <div class="flex items-center gap-3">
              <span class="text-2xl" aria-hidden="true">📤</span>
              <div>
                <h3 class="font-black text-slate-800 text-sm">استيراد نسخة احتياطية (JSON)</h3>
                <p class="text-xs text-slate-500 font-medium">استعادة بيانات الطلاب من ملف JSON مع التحقق الصارم من صحتها.</p>
              </div>
            </div>

            <!-- File Upload Input -->
            <input type="file" id="roster-import-file-input" accept=".json,application/json" onchange="rosterManager.handleImportFile(this)" class="hidden">
            <button onclick="document.getElementById('roster-import-file-input').click()" class="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2">
              <span>📂</span> <span>اختيار ملف JSON من جهازك للاستيراد</span>
            </button>

            <!-- Paste Area -->
            <div class="pt-2 border-t border-slate-200">
              <label for="roster-import-textarea" class="block font-bold text-slate-700 text-xs mb-1">أو الصق نص JSON هنا مباشرة:</label>
              <textarea id="roster-import-textarea" rows="3" placeholder='{"app": "nur-albayan-pages", "students": [...]}' class="w-full bg-white border border-slate-300 rounded-xl p-2 font-mono text-xs text-slate-700 outline-none focus:border-teal-500"></textarea>
              <button onclick="rosterManager.handleImportText()" class="mt-2 w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors">
                استيراد النص المنسوخ 📋
              </button>
            </div>
          </div>

        </div>
        `;

        container.innerHTML = html;
    }
};

// تشغيل وتهيئة محرك لوحة الطلاب عند اكتمال تحميل الصفحة
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => rosterManager.init());
    } else {
        rosterManager.init();
    }
}
