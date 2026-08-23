# -*- coding: utf-8 -*-
"""
استخراج بيانات وقواعد وكلمات صفحات نور البيان التفاعلية إلى ملفات JSON مستقلة.

يقوم السكربت بقراءة ملفات HTML من مجلد pages/ واستخلاص:
  1. إعدادات الصفحة (PAGE_CONFIG)
  2. قواعد وشروح الدرس (rulesData إن وُجدت)
  3. مصفوفة الكلمات والبطاقات التفاعلية (dataset)
  4. بيانات أشكال الحروف ومسابقات المجموعات (الصفحة 6)
ثم تصدير كل صفحة إلى ملف JSON مستقل داخل مجلد فرعي محدد.
"""

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path


def extract_page_data_with_node(file_path: Path) -> dict:
    """
    يستخرج البيانات البرمجية من ملف HTML عبر تمرير الكود لبيئة Node.js معزولة عبر stdin.
    """
    content = file_path.read_text(encoding="utf-8")
    page_num_match = re.search(r"(\d+)", file_path.stem)
    page_num = int(page_num_match.group(1)) if page_num_match else 0

    # استخراج كود الجافا سكريبت داخل وسم <script> للبيانات
    script_match = re.search(r"<script>([\s\S]*?)</script>", content, re.IGNORECASE)
    if not script_match:
        return {
            "page": page_num,
            "file": file_path.name,
            "error": "لم يُعثر على وسم <script> للبيانات في الملف."
        }

    raw_js = script_match.group(1)

    # لصفحة أشكال الحروف، نقتطع جزء مصفوفات البيانات فقط دون تشغيل منطق الواجهة التفاعلية
    if page_num == 6 and "let score" in raw_js:
        raw_js = raw_js.split("let score")[0]

    # قالب تشغيل معزول يُعيد المتغيرات المعرفة بـ const و let بدقة
    runner_js = f"""
const process = require('process');

// بيئة محاكاة خفيفة
const window = {{
    addEventListener: () => {{}}
}};
const dummyEl = {{
    innerText: '',
    innerHTML: '',
    value: '',
    style: {{}},
    classList: {{ add: () => {{}}, remove: () => {{}}, contains: () => false }},
    addEventListener: () => {{}},
    appendChild: () => {{}},
    setAttribute: () => {{}},
    getAttribute: () => '',
    onclick: null,
    dataset: {{}}
}};
const document = {{
    getElementById: () => dummyEl,
    createElement: () => dummyEl,
    querySelectorAll: () => [],
    querySelector: () => dummyEl,
    addEventListener: () => {{}}
}};
const h = (l) => `<span class="highlight">${{l}}</span>`;
const qh = (l) => `<span class="text-green-500">${{l}}</span>`;

try {{
    const result = (function() {{
        {raw_js}

        return {{
            config: (typeof PAGE_CONFIG !== 'undefined' ? PAGE_CONFIG : (window.PAGE_CONFIG || {{}})),
            rules: (typeof rulesData !== 'undefined' ? rulesData : []),
            dataset: (typeof dataset !== 'undefined' ? dataset : []),
            alphabetData: (typeof alphabetData !== 'undefined' ? alphabetData : []),
            quizzes: (typeof quizzes !== 'undefined' ? quizzes : [])
        }};
    }})();

    const output = {{
        page: {page_num},
        file: {json.dumps(file_path.name)},
        type: {json.dumps('alphabet_shapes' if page_num == 6 else 'standard_lesson')},
        config: result.config || {{}},
        rules: result.rules || [],
        dataset: result.dataset || []
    }};

    if ({page_num} === 6) {{
        output.alphabetData = result.alphabetData || [];
        output.quizzes = result.quizzes || [];
        output.config = {{
            title: "Nour Al-Bayan",
            subtitle: "Page 6 • Letter Shapes (أشكال الحروف)",
            footer: "Nour Al-Bayan Learning System • Page 6 (Letter Shapes)",
            game3: "memory"
        }};
    }}

    process.stdout.write(JSON.stringify(output));
}} catch (err) {{
    process.stderr.write("JS Execution Error: " + (err.stack || err.message));
    process.exit(1);
}}
"""

    try:
        proc = subprocess.run(
            ["node"],
            input=runner_js,
            capture_output=True,
            text=True,
            encoding="utf-8",
            check=True
        )
        data = json.loads(proc.stdout.strip())
        return data
    except subprocess.CalledProcessError as e:
        return {
            "page": page_num,
            "file": file_path.name,
            "error": f"خطأ تنفيذ Node.js: {e.stderr.strip()}"
        }
    except Exception as e:
        return {
            "page": page_num,
            "file": file_path.name,
            "error": f"خطأ غير متوقع: {str(e)}"
        }


def process_pages(pages_dir: Path, output_dir: Path, page_range: str = None, combined: bool = True, indent: int = 2):
    """
    يعالج ملفات الدروس ويحفظ ملفات JSON داخل المجلد المستهدف.
    """
    if not pages_dir.exists():
        print(f"خطأ: المجلد المصدر {pages_dir} غير موجود.", file=sys.stderr)
        sys.exit(1)

    output_dir.mkdir(parents=True, exist_ok=True)

    files = sorted(
        [f for f in pages_dir.glob("*.html")],
        key=lambda p: int(re.search(r"(\d+)", p.stem).group(1)) if re.search(r"(\d+)", p.stem) else 999
    )

    # تصفية النطاق إذا حُدد
    min_page, max_page = None, None
    if page_range:
        parts = page_range.split("-")
        min_page = int(parts[0]) if len(parts) > 0 and parts[0].isdigit() else None
        max_page = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else min_page

    all_data = []
    success_count = 0
    error_count = 0

    print("==================================================")
    print(f"  بدء استخراج بيانات الدروس من {pages_dir} إلى {output_dir}")
    print("==================================================")

    for f in files:
        page_num_match = re.search(r"(\d+)", f.stem)
        page_num = int(page_num_match.group(1)) if page_num_match else 0

        if min_page is not None and page_num < min_page:
            continue
        if max_page is not None and page_num > max_page:
            continue

        data = extract_page_data_with_node(f)

        if "error" in data:
            print(f"  ❌ الدرس {page_num} ({f.name}): {data['error']}", file=sys.stderr)
            error_count += 1
            continue

        # كتابة ملف JSON الفردي للدرس
        out_file = output_dir / f"{page_num}.json"
        out_file.write_text(json.dumps(data, ensure_ascii=False, indent=indent), encoding="utf-8")

        items_count = len(data.get("dataset", [])) if "dataset" in data and data["dataset"] else len(data.get("alphabetData", []))
        rules_count = len(data.get("rules", []))
        rules_info = f" | قواعد: {rules_count}" if rules_count > 0 else ""

        print(f"  ✓ الدرس {page_num:02d} ({f.name}) ⬅️ {out_file.name} (عناصر: {items_count}{rules_info})")
        all_data.append(data)
        success_count += 1

    # توليد ملف مجمّع اختياري لكافة الدروس
    if combined and all_data:
        combined_file = output_dir / "all_pages.json"
        combined_file.write_text(json.dumps(all_data, ensure_ascii=False, indent=indent), encoding="utf-8")
        print(f"\n✓ أُنشئ الملف المجمّع لكافة الدروس: {combined_file.name} ({len(all_data)} درساً)")

    print("\n--------------------------------------------------")
    print(f"اكتمل الاستخراج بنجاح: {success_count} ملف JSON تم توليده | الأخطاء: {error_count}")
    print(f"المسار المخرَج: {output_dir.resolve()}")
    print("--------------------------------------------------")


def main():
    root = Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser(
        description="استخراج بيانات وقواعد وكلمات صفحات نور البيان إلى ملفات JSON مستقلة ومجمعة."
    )
    parser.add_argument(
        "--pages-dir",
        type=Path,
        default=root / "pages",
        help="مسار مجلد صفحات HTML الأصلية (الافتراضي: pages)"
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=root / "data",
        help="مسار المجلد الفرعي لتصدير ملفات JSON (الافتراضي: data)"
    )
    parser.add_argument(
        "--range",
        type=str,
        default=None,
        help="نطاق الصفحات المراد استخراجها (مثال: 8-39 أو 6-39)"
    )
    parser.add_argument(
        "--no-combined",
        action="store_true",
        help="تعطيل توليد الملف المجمّع all_pages.json"
    )
    parser.add_argument(
        "--indent",
        type=int,
        default=2,
        help="مقدار الإزاحة لتنسيق JSON (الافتراضي: 2)"
    )

    args = parser.parse_args()
    process_pages(
        pages_dir=args.pages_dir,
        output_dir=args.output_dir,
        page_range=args.range,
        combined=not args.no_combined,
        indent=args.indent
    )


if __name__ == "__main__":
    main()
