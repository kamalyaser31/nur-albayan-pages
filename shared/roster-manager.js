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

        window.addEventListener('nb:student-changed', updateAll);
        window.addEventListener('nb:student-created', updateAll);
        window.addEventListener('nb:student-updated', updateAll);
        window.addEventListener('nb:student-deleted', updateAll);
        window.addEventListener('nb:student-progress-updated', updateAll);
        window.addEventListener('nb:lesson-completed', updateAll);
        
        window.addEventListener('nb:locale-changed', () => {
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
                  <div class="mistake-quran-text">
                    ${safeWord}
                  </div>
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
        if (typeof studentManager === 'undefined') return;
        const student = studentManager.getStudent(studentId);
        if (!student) return;

        const isAr = (typeof i18n !== 'undefined' && i18n.getLocale() === 'ar');
        const dir = (typeof i18n !== 'undefined' && i18n.getActiveMeta) ? i18n.getActiveMeta().dir : (isAr ? 'rtl' : 'ltr');
        const lang = (typeof i18n !== 'undefined' && i18n.getLocale) ? i18n.getLocale() : (isAr ? 'ar' : 'en');

        const studentName = this._escapeHTML(student.name);
        const studentIdShort = this._escapeHTML(student.id ? student.id.substring(0, 8) : '');
        const totalScoreSafe = Math.max(0, Math.floor(Number(student.totalScore) || 0));

        const completedLessons = student.completedLessons || {};
        const completedKeys = Object.keys(completedLessons);
        const mistakes = Array.isArray(student.mistakeBank) ? student.mistakeBank : [];

        let rowsHtml = '';
        completedKeys.forEach(k => {
            const l = completedLessons[k] || {};
            const cleanKey = this._escapeHTML(k);
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
                        const cleanWord = this._escapeHTML(m.word);
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

// تشغيل وتهيئة محرك لوحة الطلاب عند اكتمال تحميل الصفحة
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => rosterManager.init());
    } else {
        rosterManager.init();
    }
}
