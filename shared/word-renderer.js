/**
 * Nour Al-Bayan Interactive Platform - Universal Quranic Word Renderer
 * Centralized rendering engine for segmented boxes, letter groups, and color styles.
 */
(function (global) {
    'use strict';

    function _escapeHTML(str) {
        if (!str && str !== 0) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function _sanitizeHTML(htmlStr) {
        if (!htmlStr && htmlStr !== 0) return '';
        const allowedTags = ['span', 'bdi', 'bdo', 'div', 'p', 'strong', 'em', 'small', 'sup', 'sub'];
        const allowedAttrs = ['class', 'style', 'dir', 'lang', 'aria-label', 'aria-hidden'];
        const tagPattern = /<\/?([a-zA-Z0-9]+)([^>]*)>/gi;

        return String(htmlStr).replace(tagPattern, (match, tagName, attrs) => {
            const lowerTag = tagName.toLowerCase();
            if (!allowedTags.includes(lowerTag)) return '';
            if (match.startsWith('</')) return `</${lowerTag}>`;

            let cleanAttrs = '';
            const attrPattern = /([a-zA-Z0-9_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
            let attrMatch;
            while ((attrMatch = attrPattern.exec(attrs)) !== null) {
                const attrName = attrMatch[1].toLowerCase();
                const attrValue = attrMatch[2] || attrMatch[3] || attrMatch[4] || '';
                if (allowedAttrs.includes(attrName)) {
                    if (attrName === 'style' && /(expression|javascript|url|behaviour|include-source)/i.test(attrValue)) {
                        continue;
                    }
                    cleanAttrs += ` ${attrName}="${_escapeHTML(attrValue)}"`;
                }
            }
            return `<${lowerTag}${cleanAttrs}>`;
        });
    }

    const ALLOWED_THEMES = new Set([
        'amber', 'blue', 'danger', 'emerald', 'golden', 'green',
        'pink', 'purple', 'yellow'
    ]);

    function _normalizeTheme(theme) {
        const candidate = String(theme || '').trim().toLowerCase();
        return ALLOWED_THEMES.has(candidate) ? candidate : 'pink';
    }

    const WordRenderer = {
        /**
         * توليد شفرة HTML نقية تمثل الكلمة بكامل صناديقها وألوانها
         * @param {Object|string} item كائن الكلمة
         * @param {Object} [options] خيارات إضافية (مثل السمة أو التحجيم)
         * @returns {string} شفرة HTML
         */
        toHTML(item, options = {}) {
            if (!item) return '';

            // إذا كان المدخل نصاً بسيطاً
            if (typeof item === 'string') {
                const currentTheme = _normalizeTheme(options.theme);
                return `<div class="letter-box theme-${currentTheme}"><span class="word-wrapper quran-font text-center">${_sanitizeHTML(item)}</span></div>`;
            }

            const currentTheme = _normalizeTheme(item.theme || options.theme);
            const plain = this.getPlainWord(item);
            const words = plain ? plain.split(/\s+/).filter(Boolean) : [];
            const charCount = plain ? plain.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '').length : 0;
            let lengthClass = '';
            if (charCount > 16 || words.length >= 4) {
                lengthClass = 'text-xlong';
            } else if (charCount > 10 || words.length === 3) {
                lengthClass = 'text-long';
            } else if (charCount > 5 || words.length === 2) {
                lengthClass = 'text-medium';
            }

            if (item.segs && Array.isArray(item.segs)) {
                const colorClasses = ['c-red', 'c-blue', 'c-black'];
                const segsHtml = item.segs.map((ch, i) => {
                    const colorClass = colorClasses[i % 3];
                    return `<div class="seg-box theme-${currentTheme} quran-font ${colorClass}">${_escapeHTML(ch)}</div>`;
                }).join('');
                return `<div class="segmented-container">${segsHtml}</div>`;
            }

            if (item.boxes && Array.isArray(item.boxes)) {
                const boxesHtml = item.boxes.map(segments => {
                    const inner = segments.map(([t, c]) => `<span class="color-${_escapeHTML(c)}">${_escapeHTML(t)}</span>`).join('');
                    return `<div class="seg-box theme-${currentTheme} quran-font" style="direction: rtl;"><bdi style="white-space:nowrap">${inner}</bdi></div>`;
                }).join('');
                return `<div class="segmented-container">${boxesHtml}</div>`;
            }

            if (item.multiBox && Array.isArray(item.w)) {
                const boxesHtml = item.w.map((char, i) => {
                    return `<div class="seg-box theme-${currentTheme} quran-font color-${i % 3}">${_escapeHTML(char)}</div>`;
                }).join('');
                return `<div class="segmented-container">${boxesHtml}</div>`;
            }

            if (item.groups && Array.isArray(item.groups)) {
                const inner = item.groups.map(g => `<span class="${_escapeHTML(g[1])}" style="margin:0 .25em">${_escapeHTML(g[0])}</span>`).join('');
                return `<div class="letter-box quran-font theme-${currentTheme} ${lengthClass}" style="direction: rtl;">${inner}</div>`;
            }

            if (item.html) {
                return `<div class="letter-box quran-font theme-${currentTheme} ${lengthClass}" style="direction: rtl;">${_sanitizeHTML(item.html)}</div>`;
            }

            if (Array.isArray(item.w)) {
                const inner = item.w.map((seg, i) => `<span class="color-${i % 3}">${_sanitizeHTML(seg)}</span>`).join('');
                return `<div class="letter-box quran-font theme-${currentTheme} ${lengthClass}" style="direction: rtl;"><bdi style="white-space:nowrap">${inner}</bdi></div>`;
            }

            if (item.w) {
                return `<div class="letter-box theme-${currentTheme} ${lengthClass}"><span class="word-wrapper quran-font text-center">${_sanitizeHTML(item.w)}</span></div>`;
            }

            return `<div class="letter-box theme-${currentTheme}"><span class="word-wrapper quran-font text-center">${_escapeHTML(plain)}</span></div>`;
        },

        /**
         * حقن الكلمة بجميع صناديقها داخل عنصر DOM
         * @param {HTMLElement} container الحاوية
         * @param {Object|string} item كائن الكلمة
         * @param {Object} [options] خيارات إضافية
         */
        renderInto(container, item, options = {}) {
            if (!container) return;
            container.innerHTML = this.toHTML(item, options);
        },

        /**
         * استخراج النص المجرد المقروء للكلمة للوصولية (Aria Labels)
         * @param {Object|string} item كائن الكلمة
         * @returns {string} النص المقروء
         */
        getPlainWord(item) {
            if (!item) return '';
            if (typeof item === 'string') {
                return item.replace(/<[^>]+>/g, '').replace(/&zwj;/g, '').replace(/&nbsp;/g, ' ').trim();
            }
            if (item.plain) return String(item.plain).trim();
            if (item.segs && Array.isArray(item.segs)) {
                return item.segs.join('').replace(/<[^>]+>/g, '').replace(/&zwj;/g, '').replace(/&nbsp;/g, ' ').replace(/ـ/g, '').trim();
            }
            if (item.boxes && Array.isArray(item.boxes)) {
                return item.boxes.map(b => Array.isArray(b) ? b.map(s => s[0]).join('') : '').join(' ').trim();
            }
            if (item.groups && Array.isArray(item.groups)) {
                return item.groups.map(g => Array.isArray(g) ? g[0] : g).join('').trim();
            }
            if (Array.isArray(item.w)) {
                return item.w.join('').replace(/<[^>]+>/g, '').replace(/&zwj;/g, '').replace(/&nbsp;/g, ' ').replace(/ـ/g, '').trim();
            }
            if (typeof item.w === 'string') {
                return item.w.replace(/<[^>]+>/g, '').replace(/&zwj;/g, '').replace(/&nbsp;/g, ' ').trim();
            }
            if (item.html) {
                return item.html.replace(/<[^>]+>/g, '').replace(/&zwj;/g, '').replace(/&nbsp;/g, ' ').trim();
            }
            return String(item.word || '').replace(/<[^>]+>/g, '').replace(/&zwj;/g, '').replace(/&nbsp;/g, ' ').trim();
        }
    };

    global.WordRenderer = WordRenderer;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = WordRenderer;
    }
})(typeof window !== 'undefined' ? window : globalThis);
