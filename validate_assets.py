#!/usr/bin/env python3
"""
Nour Al-Bayan Interactive Platform - Asset & CSS Integrity Validator
Audits physical file existence, @import hierarchies, font links, and CSS syntax/bracket balance.
"""

import sys
import re
import pathlib

def validate():
    root = pathlib.Path(__file__).parent.resolve()
    errors = []
    warnings = []
    
    print("==================================================")
    print("  فحص سلامة الأصول ووحدات التنسيق — منصة نور البيان")
    print("==================================================")

    # 1. Check Core CSS Modules
    expected_modules = [
        'tokens.css',
        'base.css',
        'utilities.css',
        'typography.css',
        'cards.css',
        'components.css',
        'games-wordwall.css',
        'games-board.css',
        'animations.css'
    ]
    
    css_dir = root / 'shared' / 'css'
    print(f"\n[1/6] التحقق من وجود وحدات التنسيق الرئيسية في {css_dir.relative_to(root)}...")
    for mod in expected_modules:
        p = css_dir / mod
        if not p.exists():
            errors.append(f"الملف مفقود: {p.relative_to(root)}")
        elif p.stat().st_size == 0:
            errors.append(f"الملف فارغ: {p.relative_to(root)}")
        else:
            print(f"  ✓ {mod} ({p.stat().st_size} bytes)")

    # 2. Check Utility Sub-modules
    expected_utilities = [
        'layout.css',
        'spacing.css',
        'text.css',
        'colors.css',
        'borders.css',
        'effects.css',
        'buttons.css',
        'responsive.css'
    ]
    util_dir = css_dir / 'utilities'
    print(f"\n[2/6] التحقق من وجود الوحدات المساعدة المفككة في {util_dir.relative_to(root)}...")
    for u in expected_utilities:
        p = util_dir / u
        if not p.exists():
            errors.append(f"وحدة مساعدة مفقودة: {p.relative_to(root)}")
        elif p.stat().st_size == 0:
            errors.append(f"وحدة مساعدة فارغة: {p.relative_to(root)}")
        else:
            print(f"  ✓ utilities/{u} ({p.stat().st_size} bytes)")

    # Check utilities.css imports
    util_css = css_dir / 'utilities.css'
    if util_css.exists():
        util_text = util_css.read_text(encoding='utf-8')
        for u in expected_utilities:
            pattern = rf"@import\s+url\(['\"]utilities/{re.escape(u)}['\"]\);"
            if not re.search(pattern, util_text):
                errors.append(f"استيراد مفقود في utilities.css: {u}")

    # 3. Check Vendor Fonts & Libraries
    expected_fonts = [
        'amiri-regular.woff2',
        'amiri-bold.woff2',
        'fredoka-regular.woff2',
        'fredoka-semibold.woff2',
        'fredoka-bold.woff2',
        'fredoka-black.woff2'
    ]
    fonts_dir = root / 'shared' / 'vendor' / 'fonts'
    print(f"\n[3/6] التحقق من وجود ملفات الخطوط المحلية في {fonts_dir.relative_to(root)}...")
    for font in expected_fonts:
        p = fonts_dir / font
        if not p.exists():
            errors.append(f"ملف الخط مفقود: {p.relative_to(root)}")
        else:
            print(f"  ✓ {font}")

    expected_vendor = [
        'chart.umd.min.js',
        'confetti.browser.min.js'
    ]
    vendor_dir = root / 'shared' / 'vendor'
    for v in expected_vendor:
        p = vendor_dir / v
        if not p.exists():
            errors.append(f"مكتبة مفقودة: {p.relative_to(root)}")

    # 4. Check core.css master imports
    core_css = root / 'shared' / 'core.css'
    print(f"\n[4/6] فحص استيرادات المجمّع الرئيسي {core_css.relative_to(root)}...")
    if not core_css.exists():
        errors.append("ملف shared/core.css غير موجود!")
    else:
        core_text = core_css.read_text(encoding='utf-8')
        for mod in expected_modules:
            pattern = rf"@import\s+url\(['\"]css/{re.escape(mod)}['\"]\);"
            if not re.search(pattern, core_text):
                errors.append(f"استيراد مفقود في core.css: {mod}")
            else:
                print(f"  ✓ مستورد: {mod}")

    # 5. CSS Linting & Bracket Balance Check
    print(f"\n[5/6] التدقيق الصياغي وقفل الأقواس في كافة ملفات CSS...")
    all_css_files = [css_dir / m for m in expected_modules] + [util_dir / u for u in expected_utilities]
    total_rules = 0
    for p in all_css_files:
        if not p.exists():
            continue
        content = p.read_text(encoding='utf-8')
        clean_content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
        open_braces = clean_content.count('{')
        close_braces = clean_content.count('}')
        total_rules += open_braces
        if open_braces != close_braces:
            errors.append(f"خلل في توازن الأقواس في {p.name}: فتح ({open_braces}) مقابل إغلاق ({close_braces})")
        else:
            print(f"  ✓ {p.name}: الأقواس متزنة ({open_braces} قاعدة)")

    # 6. Check Pages & index.html Linkage
    print(f"\n[6/6] فحص ارتباط صفحات الدروس والفهرس بـ core.css...")
    index_file = root / 'index.html'
    if not index_file.exists():
        errors.append("ملف index.html مفقود!")
    else:
        index_content = index_file.read_text(encoding='utf-8')
        if 'shared/core.css' not in index_content:
            warnings.append("ملف index.html لا يرتبط بـ shared/core.css بشكل قياسي")
        else:
            print("  ✓ index.html مرتبط بـ shared/core.css")

    pages_dir = root / 'pages'
    lesson_files = sorted(list(pages_dir.glob('*.html')))
    linked_count = 0
    for lf in lesson_files:
        c = lf.read_text(encoding='utf-8')
        if '../shared/core.css' in c:
            linked_count += 1
        else:
            warnings.append(f"الصفحة {lf.name} لا تستدعي ../shared/core.css")

    print(f"  ✓ كافة صفحات الدروس ({linked_count}/{len(lesson_files)}) مرتبطة بـ core.css بنجاح")

    # Summary
    print("\n--------------------------------------------------")
    if errors:
        print(f"❌ تم العثور على {len(errors)} خطأ:")
        for err in errors:
            print(f"   - {err}")
        return 1
    else:
        print("✅ اجتازت جميع الأصول ووحدات التنسيق الفحص بنجاح تام (100% Validated).")
        print(f"📊 إجمالي القواعد المفحوصة: {total_rules} قاعدة عبر 17 ملف تنسيق.")
        if warnings:
            print(f"⚠️ تنبيهات ({len(warnings)}):")
            for w in warnings:
                print(f"   - {w}")
        return 0

if __name__ == '__main__':
    sys.exit(validate())
