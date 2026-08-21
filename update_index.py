# -*- coding: utf-8 -*-
"""يفحص مجلد pages ويولّد روابط الصفحات بأسماء الملفات داخل index.html تلقائياً."""
from pathlib import Path

ROOT = Path(__file__).parent
PAGES_DIR = ROOT / "pages"
INDEX = ROOT / "index.html"
START = "<!-- LINKS-START -->"
END = "<!-- LINKS-END -->"


def get_title(path: Path) -> str:
    # يعتمد اسم الملف (stem) كما هو مكتوب
    return path.stem


def main() -> None:
    if not PAGES_DIR.is_dir():
        PAGES_DIR.mkdir()
    
    # فحص كافة ملفات html بغض النظر عن حالة الأحرف
    files = sorted([f for f in PAGES_DIR.iterdir() if f.suffix.lower() == '.html'])
    
    links = []
    for f in files:
        title = get_title(f)
        links.append(f'    <li><a href="pages/{f.name}">{title}</a></li>')
    
    if links:
        block = '  <ul class="pages">\n' + "\n".join(links) + '\n  </ul>'
    else:
        block = '  <div class="empty">لا توجد صفحات بعد — أضف ملفات HTML إلى مجلد pages ثم شغّل update_index.py</div>'
    
    html = INDEX.read_text(encoding="utf-8")
    if START in html and END in html:
        html = html[: html.index(START) + len(START)] + "\n" + block + "\n  " + html[html.index(END):]
        INDEX.write_text(html, encoding="utf-8")
        print(f"تم تحديث index.html — عدد الصفحات: {len(files)}")
    else:
        print("خطأ: وسوم LINKS-START و LINKS-END غير موجودة في index.html")


if __name__ == "__main__":
    main()
