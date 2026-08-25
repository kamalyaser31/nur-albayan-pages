/**
 * تطبيق حصر واستعادة التركيز (Focus Trap & Restoration) للنوافذ المنبثقة التفاعلية مع دعم مفتاح Escape
 */
function setupModalAccessibility() {
    const modalIds = ['word-overlay', 'game-transition-stage', 'early-exit-modal'];
    const focusableSelector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    let lastFocusedElement = null;
    document.addEventListener('focusin', (e) => {
        const isInsideModal = modalIds.some(id => {
            const el = document.getElementById(id);
            return el && el.contains(e.target);
        });
        if (!isInsideModal) {
            lastFocusedElement = e.target;
        }
    }, true);

    modalIds.forEach(id => {
        const modal = document.getElementById(id);
        if (!modal || modal._hasAccessibilityObs) return;
        modal._hasAccessibilityObs = true;

        let prevClassHidden = modal.classList.contains('hidden');
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(() => {
                const isHidden = modal.classList.contains('hidden');
                if (prevClassHidden && !isHidden) {
                    // Modal opened: record trigger & focus first element
                    modal._savedTrigger = lastFocusedElement || document.activeElement;
                    const focusables = Array.from(modal.querySelectorAll(focusableSelector)).filter(el => el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0);
                    if (focusables.length > 0) {
                        focusables[0].focus();
                    }
                } else if (!prevClassHidden && isHidden) {
                    // Modal closed: restore focus
                    if (modal._savedTrigger && typeof modal._savedTrigger.focus === 'function' && document.body.contains(modal._savedTrigger)) {
                        modal._savedTrigger.focus();
                    }
                    modal._savedTrigger = null;
                }
                prevClassHidden = isHidden;
            });
        });
        observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
    });

    if (!window._nbModalKeydownBound) {
        window._nbModalKeydownBound = true;
        document.addEventListener('keydown', (e) => {
            // معالجة مفتاح Escape لإغلاق النوافذ المنبثقة النشطة بأمان
            if (e.key === 'Escape') {
                const activeModal = modalIds.map(id => document.getElementById(id)).find(el => el && !el.classList.contains('hidden'));
                if (activeModal) {
                    e.preventDefault();
                    if (activeModal.id === 'word-overlay' && typeof app !== 'undefined' && typeof app.closeOverlay === 'function') {
                        app.closeOverlay();
                    } else if (activeModal.id === 'early-exit-modal' && typeof app !== 'undefined' && typeof app.closeEarlyExitModal === 'function') {
                        app.closeEarlyExitModal();
                    } else if (activeModal.id === 'game-transition-stage' && typeof app !== 'undefined' && typeof app.enterGame === 'function') {
                        app.enterGame();
                    } else {
                        activeModal.classList.add('hidden');
                    }
                    return;
                }
            }

            if (e.key !== 'Tab') return;
            const activeModal = modalIds.map(id => document.getElementById(id)).find(el => el && !el.classList.contains('hidden'));
            if (!activeModal) return;

            const focusables = Array.from(activeModal.querySelectorAll(focusableSelector)).filter(el => el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0);
            if (focusables.length === 0) return;

            const firstEl = focusables[0];
            const lastEl = focusables[focusables.length - 1];

            if (e.shiftKey) {
                if (document.activeElement === firstEl || !activeModal.contains(document.activeElement)) {
                    e.preventDefault();
                    lastEl.focus();
                }
            } else {
                if (document.activeElement === lastEl || !activeModal.contains(document.activeElement)) {
                    e.preventDefault();
                    firstEl.focus();
                }
            }
        });
    }
}

window.setupModalAccessibility = setupModalAccessibility;
