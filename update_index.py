# -*- coding: utf-8 -*-
"""يفحص مجلد pages ويولّد روابط الصفحات داخل index.html تلقائياً."""
import re
from pathlib import Path

ROOT = Path(__file__).parent
PAGES_DIR = ROOT / "pages"
INDEX = ROOT / "index.html"
START = "<!-- LINKS-START -->"
END = "<!-- LINKS-END -->"


def get_title(path: Path) -> str:
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
        m = re.search(r"<title[^>]*>(.*?)</title>", text, re.IGNORECASE | re.DOTALL)
        if m and m.group(1).strip():
            return re.sub(r"\s+", " ", m.group(1)).strip()
    except OSError:
        pass
    return path.stem


def main() -> None:
    if not PAGES_DIR.is_dir():
        PAGES_DIR.mkdir()
    files = sorted(PAGES_DIR.glob("*.html"))
    links = []
    for f in files:
        title = get_title(f)
        links.append(f'      <li><a href="pages/{f.name}">{title}</a></li>')
    block = "\n".join(links) if links else (
        '  <div class="empty">لا توجد صفحات بعد — أضف ملفات HTML إلى مجلد pages ثم شغّل update_index.py</div>'
    )
    html = INDEX.read_text(encoding="utf-8")
    html = html[: html.index(START) + len(START)] + "\n" + block + "\n    " + html[html.index(END):]
    INDEX.write_text(html, encoding="utf-8")
    print(f"تم تحديث index.html — عدد الصفحات: {len(files)}")


if __name__ == "__main__":
    main()
