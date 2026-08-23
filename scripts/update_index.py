# -*- coding: utf-8 -*-
"""
يفحص مجلد pages ويولّد شبكة بطاقات تفاعلية حديثة داخل index.html تلقائياً.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGES_DIR = ROOT / "pages"
INDEX = ROOT / "index.html"


def extract_page_info(file_path: Path):
    content = file_path.read_text(encoding="utf-8")

    # Extract page number
    match = re.search(r"(\d+)", file_path.stem)
    num = int(match.group(1)) if match else 0

    # Extract subtitle
    sub_match = re.search(r"subtitle:\s*['\"]([^'\"]+)['\"]", content)
    subtitle = sub_match.group(1).strip() if sub_match else ""

    # Extract title
    title_match = re.search(r"<title>([^<]+)</title>", content, re.IGNORECASE)
    title = title_match.group(1).strip() if title_match else f"Nour Al-Bayan {num}"
    title = title.replace("Nour Al-Bayan -", "").replace("Noor Al-Bayan -", "").strip()

    display_desc = subtitle if subtitle else title
    return num, display_desc


def build_card(file_name: str, num: int, desc: str) -> str:
    return f"""    <a href="pages/{file_name}" class="lesson-card" aria-label="Nour Al-Bayan Page {num}: {desc}">
      <div class="card-num">{num}</div>
      <div class="card-info">
        <span class="card-badge">Page {num}</span>
        <h2 class="card-title">{desc}</h2>
      </div>
      <div class="card-arrow" aria-hidden="true">➡</div>
    </a>"""


def build_index_template(cards_html: str, count: int) -> str:
    return f"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>صفحات نور البيان التفاعلية</title>
<meta name="description" content="منظومة صفحات نور البيان التفاعلية لتعليم القراءة وضبط الحركات والقرآن الكريم">
<link rel="stylesheet" href="shared/core.css">
<style>
  :root {{
    --primary: #047857;
    --primary-hover: #059669;
    --primary-light: #ecfdf5;
    --accent: #d97706;
    --bg: #f8fafc;
    --card-bg: #ffffff;
    --text-main: #0f172a;
    --text-muted: #64748b;
    --border-color: #e2e8f0;
  }}

  body {{
    color: var(--text-main);
    line-height: 1.6;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    overflow-x: hidden;
    overflow-y: auto;
    -webkit-font-smoothing: antialiased;
  }}

  header {{
    background: linear-gradient(135deg, #065f46 0%, #047857 50%, #0d9488 100%);
    color: #ffffff;
    text-align: center;
    padding: 44px 20px 36px;
    box-shadow: 0 4px 20px rgba(4, 120, 87, 0.15);
    position: relative;
    overflow: hidden;
  }}

  header::after {{
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #fbbf24, #10b981, #d97706);
  }}

  header h1 {{
    font-size: clamp(1.8rem, 4vw, 2.5rem);
    font-weight: 900;
    letter-spacing: -0.5px;
    margin-bottom: 6px;
  }}

  header p {{
    font-size: clamp(0.95rem, 2vw, 1.15rem);
    opacity: 0.92;
    font-weight: 500;
  }}

  .stats-pill {{
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(255, 255, 255, 0.18);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.3);
    padding: 6px 18px;
    border-radius: 9999px;
    margin-top: 14px;
    font-size: 0.88rem;
    font-weight: 700;
  }}

  main {{
    flex: 1;
    width: 100%;
    max-width: 1100px;
    margin: 0 auto;
    padding: 32px 16px 48px;
  }}

  .grid-container {{
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
  }}

  .lesson-card {{
    background: var(--card-bg);
    border: 2px solid var(--border-color);
    border-radius: 20px;
    padding: 16px 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    text-decoration: none;
    color: inherit;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
    direction: ltr;
  }}

  .lesson-card:hover {{
    transform: translateY(-3px);
    border-color: #34d399;
    box-shadow: 0 12px 24px -6px rgba(16, 185, 129, 0.18);
    background: #ffffff;
  }}

  .lesson-card:active {{
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }}

  .card-num {{
    width: 52px;
    height: 52px;
    border-radius: 16px;
    background: linear-gradient(135deg, #10b981, #059669);
    color: #ffffff;
    font-size: 1.5rem;
    font-weight: 900;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3);
  }}

  .card-info {{
    flex: 1;
    min-width: 0;
    text-align: left;
  }}

  .card-badge {{
    font-size: 0.72rem;
    font-weight: 800;
    color: var(--primary);
    background: var(--primary-light);
    padding: 2px 8px;
    border-radius: 6px;
    display: inline-block;
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }}

  .card-title {{
    font-size: 0.98rem;
    font-weight: 700;
    color: var(--text-main);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }}

  .card-arrow {{
    font-size: 1.25rem;
    color: #cbd5e1;
    transition: transform 0.2s ease, color 0.2s ease;
    flex-shrink: 0;
  }}

  .lesson-card:hover .card-arrow {{
    color: var(--primary);
    transform: translateX(4px);
  }}

  .empty {{
    grid-column: 1 / -1;
    text-align: center;
    color: var(--text-muted);
    padding: 48px 20px;
    background: #ffffff;
    border: 2px dashed var(--border-color);
    border-radius: 20px;
    font-size: 1.1rem;
    font-weight: 600;
  }}

  footer {{
    text-align: center;
    padding: 24px 20px;
    font-size: 0.85rem;
    color: var(--text-muted);
    border-top: 1px solid var(--border-color);
    background: #ffffff;
  }}

  footer p {{
    margin-top: 4px;
    font-size: 0.8rem;
    color: #94a3b8;
  }}
</style>
</head>
<body>

<header>
  <h1>صفحات نور البيان التفاعلية</h1>
  <p>المنظومة التعليمية الرقمية الشاملة لضبط قراءة الكلمات والقرآن الكريم</p>
  <div class="stats-pill" id="count">
    <span>📚 إجمالي الدروس: {count} صفحة تفاعلية</span>
  </div>
</header>

<main>
  <!-- LINKS-START -->
  <div class="grid-container">
{cards_html}
  </div>
  <!-- LINKS-END -->
</main>

<footer>
  <strong>منظومة نور البيان التفاعلية</strong>
  <p>تطوير الشيخ جهاد الصياد • نسألكم الدعاء لوالده ولأخيه محمد رحمهما الله</p>
</footer>

</body>
</html>
"""


def main() -> None:
    if not PAGES_DIR.is_dir():
        PAGES_DIR.mkdir()

    # فحص كافة ملفات html وفرزها عددياً
    files = [f for f in PAGES_DIR.iterdir() if f.suffix.lower() == ".html"]
    files = sorted(
        files,
        key=lambda f: int("".join(filter(str.isdigit, f.stem)) or 0),
    )

    cards = []
    for f in files:
        num, desc = extract_page_info(f)
        cards.append(build_card(f.name, num, desc))

    cards_block = "\n".join(cards) if cards else '    <div class="empty">لا توجد صفحات بعد</div>'
    new_index_html = build_index_template(cards_block, len(files))

    INDEX.write_text(new_index_html, encoding="utf-8")
    print(f"تم تحديث index.html بنجاح — إجمالي الدروس: {len(files)} درساً")


if __name__ == "__main__":
    main()

