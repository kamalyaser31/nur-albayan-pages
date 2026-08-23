# -*- coding: utf-8 -*-
"""
مجمّع شفرات الجافا سكريبت لمنصة نور البيان (JavaScript Core Bundler).

يقوم السكربت بـ:
  1. قراءة وحدات الجافا سكريبت المنفصلة من مجلد shared/ بالترتيب المنطقي الصارم.
  2. دمجها في ملف رئيسي جامع واحد: shared/core.js
  3. تحديث كافة صفحات الدروس في pages/ لاستدعاء core.js عبر سطر واحد فقط.
"""

import pathlib
import re
import sys

# الترتيب الصارم لوحدات النواة المشتركة
JS_MODULES = [
    "settings.js",
    "sound.js",
    "ui-template.js",
    "app.js",
    "games-wordwall.js",
    "games-board.js",
    "game-ai.js",
    "games-extra.js",
    "rule-manager.js"
]

def build_core_bundle(shared_dir: pathlib.Path) -> pathlib.Path:
    """يدمج ملفات JS في shared/core.js"""
    bundle_parts = [
        "/**\n",
        " * Nour Al-Bayan Interactive Platform - Core Engine Bundle (shared/core.js)\n",
        " * Unified bundle containing all audio, UI templates, state management, and mini-games.\n",
        " * Generated automatically by bundle_js.py.\n",
        " */\n\n"
    ]

    for mod_name in JS_MODULES:
        mod_path = shared_dir / mod_name
        if not mod_path.exists():
            print(f"خطأ: الوحدة المطلوبة {mod_path} غير موجودة!", file=sys.stderr)
            sys.exit(1)
        
        content = mod_path.read_text(encoding="utf-8").strip()
        bundle_parts.append(f"/* ==========================================================================\n")
        bundle_parts.append(f"   MODULE: {mod_name}\n")
        bundle_parts.append(f"   ========================================================================== */\n\n")
        bundle_parts.append(content)
        bundle_parts.append("\n\n")

    core_file = shared_dir / "core.js"
    core_file.write_text("".join(bundle_parts), encoding="utf-8")
    print(f"✓ تم توليد المجمّع الرئيسي: {core_file} (الحجم: {core_file.stat().st_size} بايت)")
    return core_file

def update_html_pages(pages_dir: pathlib.Path):
    """يحدّث صفحات الدروس لاستدعاء core.js بسطر واحد فقط"""
    html_files = sorted(pages_dir.glob("*.html"))
    updated_count = 0

    for file_path in html_files:
        if file_path.name == "6.html":
            # صفحة أشكال الحروف لها منطق داخلي مخصص
            continue

        content = file_path.read_text(encoding="utf-8")

        # نمط مطابقة أسطر السكربتات المتعددة قبل </body>
        # نبحث عن تسلسل وسوم <script src="../shared/...">
        pattern = r'(\s*<script src="\.\./shared/(?:sound|ui-template|app|games-wordwall|games-board|game-ai|games-extra|rule-manager)\.js"></script>)+'
        
        if re.search(pattern, content):
            new_content = re.sub(pattern, '\n    <script src="../shared/core.js"></script>', content)
            if new_content != content:
                file_path.write_text(new_content, encoding="utf-8")
                updated_count += 1
                print(f"  ✓ تم تحديث {file_path.name} ⬅️ استدعاء core.js فقط")
        elif '<script src="../shared/core.js"></script>' in content:
            print(f"  - {file_path.name} محدثة بالفعل.")

    print(f"\nاكتمل تحديث {updated_count} صفحة لاستدعاء core.js الموحد.")

def main():
    root_dir = pathlib.Path(__file__).resolve().parent.parent
    shared_dir = root_dir / "shared"
    pages_dir = root_dir / "pages"

    print("==================================================")
    print("  بدء تجميع شفرات الجافا سكريبت وتوحيد الاستدعاء")
    print("==================================================")

    build_core_bundle(shared_dir)
    update_html_pages(pages_dir)

    print("==================================================")
    print("  اكتمل التجميع والتحديث بنجاح تام!")
    print("==================================================")

if __name__ == "__main__":
    main()
