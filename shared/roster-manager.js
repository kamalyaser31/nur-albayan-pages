/**
 * Nour Al-Bayan Interactive Platform - Student Roster Manager
 * Manages the student roster modal, active student state, and mistaken words.
 * Clean, declarative (data-i18n*), accessible (WCAG 2.1 AA) and protected against XSS & memory leaks.
 */

/**
 * Roster Dashboard Manager - محرك لوحة إدارة ومتابعة الطلاب
 */
const rosterManager = {
    _isInitialized: false,
    _lastFocusedElement: null,
    _activeTab: 'students', // 'students' | 'add' | 'backup'
    _selectedStudentIdForView: null,
    _selectedAvatar: '👦',
    _selectedColor: '#059669',
    _useFirstLetter: false,
    _editingStudentId: null,
    _editSelectedAvatar: '👦',
    _editSelectedColor: '#059669',
    _availableAvatars: ['👦', '👧', '🌟', '🦁', '🦅', '👑', '🚀', '🎯', '🦄', '🐬', '🏆', '🌸', '📖', '💡', '✨', '⭐'],
    _availableColors: [
        { hex: '#059669', key: 'color_emerald', name: 'زمردي' },
        { hex: '#0d9488', key: 'color_teal', name: 'فيروزي' },
        { hex: '#2563eb', key: 'color_blue', name: 'أزرق' },
        { hex: '#4f46e5', key: 'color_indigo', name: 'نيلي' },
        { hex: '#7c3aed', key: 'color_purple', name: 'بنفسجي' },
        { hex: '#d97706', key: 'color_amber', name: 'عنبري' },
        { hex: '#e11d48', key: 'color_rose', name: 'وردي' },
        { hex: '#0891b2', key: 'color_cyan', name: 'سماوي' }
    ],

    /**
     * دالة حراسة آمنة للترجمة تمنع أخطاء ReferenceError
     * @private
     */
    _t(key, fallback = null, params = {}) {
        if (typeof i18n !== 'undefined' && typeof i18n.t === 'function') {
            try {
                return i18n.t(key, fallback, params);
            } catch (e) {
                return fallback || key;
            }
        }
        let res = fallback || key;
        if (params && typeof params === 'object') {
            Object.entries(params).forEach(([pKey, pVal]) => {
                const valStr = String(pVal !== undefined && pVal !== null ? pVal : '');
                res = res.replace(new RegExp(`\\{${pKey}\\}`, 'g'), () => valStr);
            });
        }
        return res;
    },

    /**
     * تعقيم وترميز النصوص لمنع ثغرات XSS وحماية سمات ARIA
     * @private
     */
    _escapeHTML(str) {
        if (str === null || str === undefined) return '';
        if (typeof escapeHTML === 'function') return escapeHTML(str);
        if (typeof studentManager !== 'undefined' && typeof studentManager.escapeHTML === 'function') {
            return studentManager.escapeHTML(str);
        }
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    ensureModalDOM() {
        const existing = document.getElementById('student-roster-modal');
        if (existing) {
            const currentDir = (typeof i18n !== 'undefined' && i18n.getActiveMeta) ? i18n.getActiveMeta().dir : 'rtl';
            const modalCard = existing.querySelector('.max-w-3xl');
            if (modalCard) modalCard.setAttribute('dir', currentDir);
            if (typeof i18n !== 'undefined' && typeof i18n.translateDOM === 'function') {
                i18n.translateDOM(existing);
            }
            return;
        }

        const currentDir = (typeof i18n !== 'undefined' && i18n.getActiveMeta) ? i18n.getActiveMeta().dir : 'rtl';
        const modalWrapper = document.createElement('div');
        modalWrapper.innerHTML = `<div id="student-roster-modal" class="hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm items-center justify-center p-3 sm:p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="roster-modal-title">
  <div class="bg-white w-full max-w-3xl rounded-[2rem] shadow-2xl border border-emerald-100 overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in duration-150" dir="${currentDir}">
    
    <!-- Modal Header -->
    <div class="bg-gradient-to-l from-emerald-700 via-emerald-600 to-teal-700 p-4 sm:p-5 text-white flex items-center justify-between shadow-md">
      <div class="flex items-center gap-3">
        <span class="text-2xl sm:text-3xl" aria-hidden="true">👥</span>
        <div>
          <h2 id="roster-modal-title" data-i18n="roster_modal_title" class="text-lg sm:text-xl font-black tracking-tight leading-tight">${this._escapeHTML(this._t("roster_modal_title", "لوحة إدارة ومتابعة الطلاب"))}</h2>
          <p data-i18n="roster_modal_subtitle" class="text-xs text-emerald-100 font-medium">${this._escapeHTML(this._t("roster_modal_subtitle", "سجلات الدرجات وسجل العثرات الشفوية والحفظ المحلي"))}</p>
        </div>
      </div>
      <button id="roster-modal-close-btn" data-action="close" data-i18n-aria="close" class="p-2 rounded-full hover:bg-white/20 text-white/90 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white cursor-pointer" aria-label="${this._escapeHTML(this._t('close', 'إغلاق'))}">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>
    </div>

    <!-- Navigation Tabs -->
    <div class="flex items-center border-b border-slate-200 bg-slate-50 px-4 sm:px-6 pt-2 overflow-x-auto gap-2" role="tablist" aria-label="${this._escapeHTML(this._t('roster_tabs_aria', 'أقسام لوحة الطلاب'))}">
      <button id="tab-btn-students" data-action="switch-tab" data-tab="students" class="roster-tab-btn active cursor-pointer" role="tab" aria-selected="true" aria-controls="roster-tab-content">
        <span aria-hidden="true">👥</span>
        <span data-i18n="tab_students_list">${this._escapeHTML(this._t("tab_students_list", "قائمة الطلاب والتقدم"))}</span>
      </button>
      <button id="tab-btn-add" data-action="switch-tab" data-tab="add" class="roster-tab-btn cursor-pointer" role="tab" aria-selected="false" aria-controls="roster-tab-content">
        <span aria-hidden="true">➕</span>
        <span data-i18n="tab_add_student">${this._escapeHTML(this._t("tab_add_student", "إضافة طالب جديد"))}</span>
      </button>
      <button id="tab-btn-backup" data-action="switch-tab" data-tab="backup" class="roster-tab-btn cursor-pointer" role="tab" aria-selected="false" aria-controls="roster-tab-content">
        <span aria-hidden="true">💾</span>
        <span data-i18n="tab_backup">${this._escapeHTML(this._t("tab_backup", "النسخ الاحتياطي"))}</span>
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
            if (typeof i18n !== 'undefined' && typeof i18n.translateDOM === 'function') {
                i18n.translateDOM(modalWrapper.firstElementChild);
            }
        }
    },

    init() {
        this.ensureModalDOM();
        if (typeof studentManager !== 'undefined') {
            studentManager.init();
        }
        this.updateHeaderBar();
        if (!this._isInitialized) {
            this.setupEventListeners();
            this._isInitialized = true;
        }
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

        window.addEventListener(NBContracts.EVENTS.STUDENT_CHANGED, updateAll);
        window.addEventListener(NBContracts.EVENTS.STUDENT_CREATED, updateAll);
        window.addEventListener(NBContracts.EVENTS.STUDENT_UPDATED, updateAll);
        window.addEventListener(NBContracts.EVENTS.STUDENT_DELETED, updateAll);
        window.addEventListener(NBContracts.EVENTS.STUDENT_PROGRESS_UPDATED, updateAll);
        window.addEventListener(NBContracts.EVENTS.LESSON_COMPLETED, updateAll);
        
        window.addEventListener(NBContracts.EVENTS.LOCALE_CHANGED, () => {
            this.updateHeaderBar();
            const modal = document.getElementById('student-roster-modal');
            if (modal) {
                const currentDir = (typeof i18n !== 'undefined' && i18n.getActiveMeta) ? i18n.getActiveMeta().dir : 'rtl';
                const modalCard = modal.querySelector('.max-w-3xl');
                if (modalCard) modalCard.setAttribute('dir', currentDir);
                if (typeof i18n !== 'undefined' && typeof i18n.translateDOM === 'function') {
                    i18n.translateDOM(modal);
                }
            }
            if (this.isOpen()) {
                this.renderContent();
            }
        });

        // مزامنة الطالب النشط مع موزع الحالة المركزي nbStore
        if (typeof nbStore !== 'undefined' && typeof nbStore.subscribe === 'function') {
            nbStore.subscribe('activeStudentId', (newId) => {
                if (typeof studentManager !== 'undefined' && studentManager.getActiveStudentId() !== newId) {
                    studentManager.setActiveStudent(newId);
                }
                this.updateHeaderBar();
                if (this.isOpen()) {
                    this.renderContent();
                }
            });
        }

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen()) {
                this.close();
            }
        });

        const modal = document.getElementById('student-roster-modal');
        if (modal) {
            // تفويض أحداث النقر (Click Event Delegation)
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.close();
                    return;
                }

                const actionTarget = e.target.closest('[data-action]');
                if (!actionTarget || !modal.contains(actionTarget)) return;

                const action = actionTarget.getAttribute('data-action');
                const studentId = actionTarget.getAttribute('data-student-id');
                const word = actionTarget.getAttribute('data-word');
                const lessonId = actionTarget.getAttribute('data-lesson-id');
                const tab = actionTarget.getAttribute('data-tab');
                const avatar = actionTarget.getAttribute('data-avatar');
                const color = actionTarget.getAttribute('data-color');

                switch (action) {
                    case 'close':
                        this.close();
                        break;
                    case 'switch-tab':
                        if (tab) this.switchTab(tab);
                        break;
                    case 'activate-student':
                        this.handleActivateStudent(studentId || null);
                        break;
                    case 'delete-student':
                        if (studentId) this.handleDeleteStudent(studentId);
                        break;
                    case 'view-profile':
                        if (studentId) this.viewStudentProfile(studentId);
                        break;
                    case 'back-to-list':
                        this.backToStudentsList();
                        break;
                    case 'export-json':
                        this.handleExportJSON();
                        break;
                    case 'import-text':
                        this.handleImportText();
                        break;
                    case 'trigger-file-input':
                        const fileIn = document.getElementById('roster-import-file-input');
                        if (fileIn) fileIn.click();
                        break;
                    case 'select-avatar':
                        if (avatar) this.selectAvatar(avatar);
                        break;
                    case 'select-first-letter':
                        this.selectFirstLetter();
                        break;
                    case 'select-color':
                        if (color) this.selectColor(color);
                        break;
                    case 'edit-student':
                        if (studentId) this.openEditStudentForm(studentId);
                        break;
                    case 'select-edit-avatar':
                        if (avatar) this.selectEditAvatar(avatar);
                        break;
                    case 'select-edit-color':
                        if (color) this.selectEditColor(color);
                        break;
                    case 'print-report':
                        if (studentId) this.printStudentReport(studentId);
                        break;
                    case 'launch-remediation':
                        if (studentId) this.launchRemediationSession(studentId);
                        break;
                    case 'remove-mistake':
                        if (studentId && word) this.removeMistake(studentId, word, lessonId);
                        break;
                    case 'clear-mistakes':
                        if (studentId) this.clearAllMistakes(studentId);
                        break;
                    case 'delete-lesson-progress':
                        if (studentId && lessonId) this.handleDeleteLessonProgress(studentId, lessonId);
                        break;
                    case 'toggle-first-letter':
                        this.toggleFirstLetter(!this._useFirstLetter);
                        break;
                }
            });

            // تفويض أحداث الإرسال للنماذج (Submit Event Delegation)
            modal.addEventListener('submit', (e) => {
                const form = e.target;
                if (form.id === 'roster-add-student-form') {
                    this.handleCreateStudent(e);
                } else if (form.id === 'roster-edit-student-form') {
                    const studentId = form.getAttribute('data-student-id');
                    this.handleSaveEditedStudent(e, studentId);
                }
            });

            // تفويض أحداث الإدخال لتحديث المعاينة الحية (Input Event Delegation)
            modal.addEventListener('input', (e) => {
                if (e.target.id === 'new-student-name-input') {
                    this.updateNewStudentPreview();
                } else if (e.target.id === 'edit-student-name-input') {
                    this.updateEditStudentPreview();
                }
            });

            // تفويض أحداث التغيير لملفات الاستيراد (Change Event Delegation)
            modal.addEventListener('change', (e) => {
                if (e.target.id === 'roster-import-file-input') {
                    this.handleImportFile(e.target);
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
            const studentName = active.name || this._t('student_name_fallback', 'طالب');
            const totalScore = active.totalScore || 0;
            if (avatarEl) avatarEl.textContent = active.avatar || '👤';
            if (nameEl) nameEl.textContent = studentName;
            if (scoreEl) scoreEl.textContent = `⭐ ${totalScore}`;
            if (btnEl) btnEl.setAttribute('aria-label', this._t('aria_active_student_info', `الطالب الحالي: ${studentName}، إجمالي النقاط: ${totalScore}`, { name: studentName, score: totalScore }));
        } else {
            if (avatarEl) avatarEl.textContent = '👤';
            if (nameEl) nameEl.textContent = this._t('guest_session', 'حصة عامة (ضيف)');
            if (scoreEl) scoreEl.textContent = '⭐ 0';
            if (btnEl) btnEl.setAttribute('aria-label', this._t('aria_guest_session_info', 'وضع الضيف / حصة عامة. انقر لاختيار أو إضافة طالب'));
        }
    },

    isOpen() {
        const modal = document.getElementById('student-roster-modal');
        return modal && !modal.classList.contains('hidden');
    },

    open(tab = 'students', studentId = null) {
        this.ensureModalDOM();
        this._lastFocusedElement = document.activeElement;
        this._activeTab = tab;
        this._selectedStudentIdForView = studentId;

        const modal = document.getElementById('student-roster-modal');
        if (!modal) return;

        if (typeof i18n !== 'undefined' && typeof i18n.translateDOM === 'function') {
            i18n.translateDOM(modal);
        }

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

    selectEditAvatar(av) {
        this._editSelectedAvatar = av;
        const grid = document.getElementById('edit-roster-avatar-grid');
        if (grid) {
            grid.querySelectorAll('.avatar-option-btn').forEach(btn => {
                const matches = btn.getAttribute('data-avatar') === av;
                btn.classList.toggle('selected', matches);
                btn.setAttribute('aria-pressed', matches ? 'true' : 'false');
            });
        }
        this.updateEditStudentPreview();
    },

    selectEditColor(hex) {
        this._editSelectedColor = hex;
        const grid = document.getElementById('edit-roster-color-grid');
        if (grid) {
            grid.querySelectorAll('.color-swatch-btn').forEach(btn => {
                const matches = btn.getAttribute('data-color') === hex;
                btn.classList.toggle('selected', matches);
                btn.setAttribute('aria-pressed', matches ? 'true' : 'false');
            });
        }
        this.updateEditStudentPreview();
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

    /**
     * تحديث بطاقة المعاينة للطالب في وضعي الإضافة والتعديل
     * @private
     */
    _updatePreviewCard(avatarElId, nameElId, inputElId, selectedAvatar, selectedColor, useFirstLetter = false) {
        const nameInput = document.getElementById(inputElId);
        const nameEl = document.getElementById(nameElId);
        const avEl = document.getElementById(avatarElId);
        const enteredName = nameInput ? nameInput.value.trim() : '';

        let displayAvatar = selectedAvatar;
        if (useFirstLetter) {
            displayAvatar = enteredName ? enteredName.charAt(0) : 'أ';
        }

        const fallbackName = this._t('student_name_fallback', 'اسم الطالب');
        if (nameEl) nameEl.textContent = enteredName || fallbackName;
        if (avEl) {
            avEl.textContent = displayAvatar;
            const bgTarget = (avEl.parentElement && avEl.parentElement.classList.contains('shadow-inner')) ? avEl.parentElement : avEl;
            bgTarget.style.background = `linear-gradient(135deg, ${selectedColor}, #0f172a)`;
        }
    },

    updateNewStudentPreview() {
        this._updatePreviewCard('new-student-preview-avatar', 'new-student-preview-name', 'new-student-name-input', this._selectedAvatar, this._selectedColor, this._useFirstLetter);
    },

    updateEditStudentPreview() {
        this._updatePreviewCard('edit-student-preview-avatar', 'edit-student-preview-name', 'edit-student-name-input', this._editSelectedAvatar, this._editSelectedColor, false);
    },

    /**
     * توليد شفرة HTML لشبكة اختيار الأيقونات التعبيرية (Avatars) مع تفويض الأحداث
     * @private
     */
    _renderAvatarPicker(selectedAvatar, isEdit = false, useFirstLetter = false) {
        const actionName = isEdit ? 'select-edit-avatar' : 'select-avatar';
        return (this._availableAvatars || []).map(av => {
            const isSel = !useFirstLetter && av === selectedAvatar;
            const safeAv = this._escapeHTML(av);
            const label = this._t('aria_select_avatar', `اختيار الرمز ${safeAv}`, { avatar: safeAv });
            return `
            <button type="button" data-action="${actionName}" data-avatar="${safeAv}" class="avatar-option-btn ${isSel ? 'selected' : ''} cursor-pointer" aria-pressed="${isSel ? 'true' : 'false'}" aria-label="${this._escapeHTML(label)}">
              <span aria-hidden="true">${safeAv}</span>
            </button>`;
        }).join('');
    },

    /**
     * توليد شفرة HTML لشبكة اختيار الألوان المميزة (Colors) مع تفويض الأحداث
     * @private
     */
    _renderColorPicker(selectedColor, isEdit = false) {
        const actionName = isEdit ? 'select-edit-color' : 'select-color';
        return (this._availableColors || []).map(c => {
            const hex = typeof c === 'object' ? c.hex : c;
            const name = typeof c === 'object' ? (c.key ? this._t(c.key, c.name) : c.name) : c;
            const isSel = hex === selectedColor;
            const safeHex = this._escapeHTML(hex);
            const safeName = this._escapeHTML(name);
            const label = this._t('aria_select_color', `اختيار اللون ${safeName}`, { color: safeName });
            return `
            <button type="button" data-action="${actionName}" data-color="${safeHex}" class="color-swatch-btn ${isSel ? 'selected' : ''} cursor-pointer" style="background-color: ${safeHex}" aria-pressed="${isSel ? 'true' : 'false'}" aria-label="${this._escapeHTML(label)}">
            </button>`;
        }).join('');
    },

    handleCreateStudent(e) {
        if (e && e.preventDefault) e.preventDefault();
        const nameInput = document.getElementById('new-student-name-input');
        if (!nameInput) return;

        const name = nameInput.value.trim();
        if (!name) {
            alert(this._t('toast_enter_student_name', 'يرجى إدخال اسم الطالب أولاً.'));
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

            // ربط تنشيط الطالب الجديد بموزع الحالة المركزي
            if (typeof nbStore !== 'undefined' && typeof nbStore.set === 'function') {
                nbStore.set('activeStudentId', created.id);
            }

            nameInput.value = '';
            this._activeTab = 'students';
            this._selectedStudentIdForView = created.id;
            this.renderContent();
        }
    },

    handleActivateStudent(studentId) {
        // ربط تنشيط وتغيير الطالب بموزع الحالة المركزي nbStore
        if (typeof nbStore !== 'undefined' && typeof nbStore.set === 'function') {
            nbStore.set('activeStudentId', studentId || null);
        }

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
        const name = student ? student.name : this._t('student_name_fallback', 'الطالب');

        const confirmMsg = this._t('confirm_delete_student', `هل أنت متأكد من حذف الطالب (${name})؟`, { name });
        if (confirm(confirmMsg)) {
            // إذا كان المحذوف هو النشط نقوم بتحديث موزع الحالة
            if (typeof nbStore !== 'undefined' && typeof nbStore.set === 'function') {
                if (nbStore.get('activeStudentId') === studentId) {
                    nbStore.set('activeStudentId', null);
                }
            }

            studentManager.deleteStudent(studentId);
            if (this._selectedStudentIdForView === studentId) {
                this._selectedStudentIdForView = null;
            }
            this.updateHeaderBar();
            studentManager.updateIndexBadges();
            this.renderContent();
        }
    },

    handleRemoveMistake(studentId, word, lessonId) {
        if (typeof studentManager !== 'undefined') {
            studentManager.removeMistake(studentId, word, lessonId);
            this.renderContent();
        }
    },

    handleClearAllMistakes(studentId) {
        if (typeof studentManager === 'undefined') return;
        const student = studentManager.getStudent(studentId);
        const name = student ? student.name : this._t('student_name_fallback', 'الطالب');

        const confirmMsg = this._t('confirm_clear_mistakes', `هل تريد مسح كافة الكلمات المتعثرة من بنك أخطاء (${name})؟`, { name });
        if (confirm(confirmMsg)) {
            if (typeof studentManager.clearStudentMistakes === 'function') {
                studentManager.clearStudentMistakes(studentId);
            } else if (student && Array.isArray(student.mistakeBank)) {
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
                const errMsg = this._t('toast_file_read_failed', ('فشل قراءة الملف: ' + err.message), { err: err.message });
                alert(errMsg);
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
            alert(this._t('toast_paste_json', 'يرجى لصق نص JSON في الحقل المخصص أولاً.'));
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
        if (typeof nbStore !== 'undefined' && typeof nbStore.set === 'function') {
            nbStore.set('activeStudentId', studentId);
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
        // تحديث حالة أزرار التبويب
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

        // ترجمة تصريحية لكافة العناصر الموسومة في الحاوية
        if (typeof i18n !== 'undefined' && typeof i18n.translateDOM === 'function') {
            i18n.translateDOM(container);
        }
    },

    renderStudentsList(container) {
        return RosterViews.renderStudentsList.call(this, container);
    },

    renderStudentProfile(container, studentId) {
        return RosterViews.renderStudentProfile.call(this, container, studentId);
    },

    renderAddStudentForm(container) {
        return RosterViews.renderAddStudentForm.call(this, container);
    },

    openEditStudentForm(studentId) {
        if (typeof studentManager === 'undefined') return;
        const student = studentManager.getStudent(studentId);
        if (!student) return;

        this._editingStudentId = studentId;
        this._editSelectedAvatar = student.avatar || '👤';
        this._editSelectedColor = student.color || '#059669';

        const container = document.getElementById('roster-tab-content');
        if (!container) return;

        const avatarsHtml = this._renderAvatarPicker(this._editSelectedAvatar, true, false);
        const colorsHtml = this._renderColorPicker(this._editSelectedColor, true);
        const safeStudentId = this._escapeHTML(student.id);
        const safeStudentName = this._escapeHTML(student.name);
        const safeAvatar = this._escapeHTML(this._editSelectedAvatar);
        const safeColor = this._escapeHTML(this._editSelectedColor);

        const html = `
        <form id="roster-edit-student-form" data-student-id="${safeStudentId}" class="space-y-4 max-w-lg mx-auto bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          
          <div class="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 class="font-black text-slate-800 text-sm flex items-center gap-2">
              <span>✏️</span> <span data-i18n="edit_student_title">${this._escapeHTML(this._t('edit_student_title', 'تعديل بيانات الطالب'))}</span>
            </h3>
            <button type="button" data-action="view-profile" data-student-id="${safeStudentId}" class="text-xs text-slate-500 hover:text-slate-800 font-bold cursor-pointer">
              <span data-i18n="cancel">${this._escapeHTML(this._t('cancel', 'إلغاء'))}</span> ✕
            </button>
          </div>

          <!-- Preview Card -->
          <div class="p-4 rounded-2xl text-center flex flex-col items-center justify-center gap-2 transition-all shadow-inner" style="background: linear-gradient(135deg, ${safeColor}, #0f172a)">
            <div id="edit-student-preview-avatar" class="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-black text-white shadow-md border-2 border-white/40">
              ${safeAvatar}
            </div>
            <h4 id="edit-student-preview-name" class="font-black text-base text-white">${safeStudentName}</h4>
          </div>

          <!-- Student Name Input -->
          <div>
            <label for="edit-student-name-input" class="block font-black text-slate-800 text-xs mb-1.5">
              <span data-i18n="add_student_label">${this._escapeHTML(this._t('add_student_label', 'اسم الطالب'))}</span> <span class="text-rose-500">*</span>
            </label>
            <input type="text" id="edit-student-name-input" required value="${safeStudentName}" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 font-bold text-sm text-slate-800 outline-none focus:border-emerald-500 focus:bg-white transition-colors" autocomplete="off">
          </div>

          <!-- Avatar Selection Grid -->
          <div>
            <label class="block font-black text-slate-800 text-xs mb-1.5">
              <span data-i18n="avatar_picker_title">${this._escapeHTML(this._t('avatar_picker_title', 'الأيقونة'))}</span>
            </label>
            <div id="edit-roster-avatar-grid" class="avatar-picker-grid">
              ${avatarsHtml}
            </div>
          </div>

          <!-- Color Palette Selection -->
          <div>
            <label class="block font-black text-slate-800 text-xs mb-1.5">
              <span data-i18n="color_palette_title">${this._escapeHTML(this._t('color_palette_title', 'اللون المميز'))}</span>
            </label>
            <div id="edit-roster-color-grid" class="color-picker-grid">
              ${colorsHtml}
            </div>
          </div>

          <!-- Submit Button -->
          <div class="pt-2 flex gap-3">
            <button type="button" data-action="view-profile" data-student-id="${safeStudentId}" class="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer">
              <span data-i18n="cancel">${this._escapeHTML(this._t('cancel', 'إلغاء'))}</span>
            </button>
            <button type="submit" class="w-2/3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer">
              <span>💾</span> <span data-i18n="save">${this._escapeHTML(this._t('save', 'حفظ التعديلات'))}</span>
            </button>
          </div>

        </form>
        `;

        container.innerHTML = html;
        if (typeof i18n !== 'undefined' && typeof i18n.translateDOM === 'function') {
            i18n.translateDOM(container);
        }
    },

    handleSaveEditedStudent(e, studentId) {
        if (e && e.preventDefault) e.preventDefault();
        const nameInput = document.getElementById('edit-student-name-input');
        if (!nameInput) return;
        const name = nameInput.value.trim();
        if (!name) return;

        if (typeof studentManager !== 'undefined') {
            studentManager.updateStudent(studentId, {
                name: name,
                avatar: this._editSelectedAvatar,
                color: this._editSelectedColor
            });
            this.updateHeaderBar();
            studentManager.updateIndexBadges();
            this.viewStudentProfile(studentId);
        }
    },

    handleDeleteLessonProgress(studentId, lessonId) {
        if (typeof studentManager === 'undefined') return;
        const confirmMsg = this._t('confirm_delete_lesson_progress', `أتريد إلغاء نتيجة ونجوم الصفحة (${lessonId}) لهذا الطالب؟`, { lesson: lessonId });

        if (confirm(confirmMsg)) {
            studentManager.deleteLessonProgress(studentId, lessonId);
            this.updateHeaderBar();
            studentManager.updateIndexBadges();
            this.viewStudentProfile(studentId);
        }
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
                <h3 data-i18n="export_backup" class="font-black text-slate-800 text-sm">${this._escapeHTML(this._t('export_backup', 'تصدير نسخة احتياطية (JSON)'))}</h3>
                <p data-i18n="export_backup_desc" class="text-xs text-slate-500 font-medium">${this._escapeHTML(this._t('export_backup_desc', `حفظ سجلات (${students.length}) طلاب مع نقاطهم وبنوك أخطائهم في ملف خارجي.`, { count: students.length }))}</p>
              </div>
            </div>
            <button type="button" data-action="export-json" class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer">
              <span>📥</span> <span data-i18n="export_backup_btn">${this._escapeHTML(this._t('export_backup_btn', 'تصدير وتنزيل ملف النسخة الاحتياطية'))}</span>
            </button>
          </div>

          <!-- Import Card -->
          <div class="bg-slate-50 border border-slate-200 p-4 sm:p-5 rounded-2xl space-y-3">
            <div class="flex items-center gap-3">
              <span class="text-2xl" aria-hidden="true">📤</span>
              <div>
                <h3 data-i18n="import_backup" class="font-black text-slate-800 text-sm">${this._escapeHTML(this._t('import_backup', 'استيراد نسخة احتياطية (JSON)'))}</h3>
                <p data-i18n="import_backup_desc" class="text-xs text-slate-500 font-medium">${this._escapeHTML(this._t('import_backup_desc', 'استعادة بيانات الطلاب من ملف JSON مع التحقق الصارم من صحتها.'))}</p>
              </div>
            </div>

            <!-- File Upload Input -->
            <input type="file" id="roster-import-file-input" accept=".json,application/json" class="hidden">
            <button type="button" data-action="trigger-file-input" class="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer">
              <span>📂</span> <span data-i18n="choose_backup_file">${this._escapeHTML(this._t('choose_backup_file', 'اختيار ملف JSON من جهازك للاستيراد'))}</span>
            </button>

            <!-- Paste Area -->
            <div class="pt-2 border-t border-slate-200">
              <label for="roster-import-textarea" data-i18n="paste_json_label" class="block font-bold text-slate-700 text-xs mb-1">${this._escapeHTML(this._t('paste_json_label', 'أو الصق نص JSON هنا مباشرة:'))}</label>
              <textarea id="roster-import-textarea" rows="3" placeholder='{"app": "nur-albayan-pages", "students": [...]}' class="w-full bg-white border border-slate-300 rounded-xl p-2 font-mono text-xs text-slate-700 outline-none focus:border-teal-500"></textarea>
              <button type="button" data-action="import-text" class="mt-2 w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer">
                <span data-i18n="import_pasted_json">${this._escapeHTML(this._t('import_pasted_json', 'استيراد النص المنسوخ 📋'))}</span>
              </button>
            </div>
          </div>

        </div>
        `;

        container.innerHTML = html;
    },

    /**
     * طباعة بطاقة تقرير إنجاز الطالب بتنسيق A4 أنيق
     * @param {string} studentId
     */
    printStudentReport(studentId) {
        if (typeof StudentReport === 'undefined') return;
        return StudentReport.print(studentId, this._escapeHTML.bind(this));
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
