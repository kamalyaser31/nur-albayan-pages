"""اختبارات رجوع مستقلة لمنصة نور البيان، صالحة لنسخة checkout نظيفة."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import time
from pathlib import Path
from typing import Callable

ROOT = Path(__file__).resolve().parent


def run_node_scenario(source: str) -> str:
    """تشغيل سيناريو JavaScript داخل بيئة Node.js مع إرجاع المخرجات والتقاط الأخطاء."""
    completed = subprocess.run(
        ["node", "-e", source],
        cwd=ROOT,
        check=False,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    if completed.returncode != 0:
        error_msg = completed.stderr.strip() or completed.stdout.strip()
        raise AssertionError(f"Node execution failed:\n{error_msg}")
    return completed.stdout.strip()


def check_javascript_syntax(source: str, label: str) -> None:
    """فحص الصياغة النحوية لشفرات JavaScript عبر Node.js --check."""
    completed = subprocess.run(
        ["node", "--check", "-"],
        cwd=ROOT,
        input=source,
        check=False,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    if completed.returncode != 0:
        raise AssertionError(f"Syntax error in {label}:\n{completed.stderr.strip()}")


# ==============================================================================
# 1. اختبار منظومة الطلاب وسجلات التقدم والحفظ الذري
# ==============================================================================
def test_student_progress_and_atomic_storage() -> None:
    """التحقق من صحة عقود التقييم، وسياسات احتساب النقاط، والتراجع الذري عند امتلاء الذاكرة."""
    scenario = r"""
const assert = require('assert');
const records = new Map();
let rejectWrites = false;
global.localStorage = {
    getItem: key => records.has(key) ? records.get(key) : null,
    setItem: (key, value) => {
        if (rejectWrites) throw Object.assign(new Error('quota'), { name: 'QuotaExceededError' });
        records.set(key, value);
    }
};
let policy = 'best';
global.settingsManager = { get: () => ({ repeatGradingPolicy: policy }) };

require('./shared/contracts.js');
require('./shared/student-repository.js');
require('./shared/student-progress.js');
require('./shared/mistake-bank.js');
require('./shared/student-backup.js');
const studentManager = require('./shared/student-manager.js');

// 1. فحص صلابة العقود ورفض المدخلات المشوهة
assert.throws(() => NBContracts.cardEvaluationRequest({ lessonId: '7', isCorrect: 'yes' }), TypeError);
assert.throws(() => NBContracts.cardEvaluationRequest({ lessonId: '7', isCorrect: true }), TypeError);
assert.throws(() => NBContracts.requireScorePolicy('unknown'), TypeError);

// 2. إنشاء واستيراد وتنشيط الطالب
assert.strictEqual(studentManager.importJSON({ students: [{ id: 's1', name: 'أحمد' }] }).success, true);
studentManager.setActiveStudent('s1');

// 3. تسجيل تقييم بطاقة في بنك الأخطاء
studentManager.recordCardEvaluation({
    lessonId: '7', isCorrect: false, pointsAwarded: 0,
    wordData: { segs: ['ك', 'تَ', 'بَ'], theme: 'yellow' }, cardIndex: 0, totalCards: 2
});
assert.strictEqual(studentManager.getActiveStudent().totalScore, 0);
assert.strictEqual(studentManager.getActiveStudent().mistakeBank.length, 1);
assert.deepStrictEqual(studentManager.getActiveStudent().mistakeBank[0].item.segs, ['ك', 'تَ', 'بَ']);
assert.strictEqual(studentManager.getActiveStudent().mistakeBank[0].item.theme, 'yellow');

// 4. اختبار سياسات احتساب الدرجات الثلاث (best, latest, cumulative)
studentManager.recordLessonCompletion('7', 10, 90, 2);
studentManager.recordLessonCompletion('7', 5, 80, 1);
assert.strictEqual(studentManager.getActiveStudent().totalScore, 10);
policy = 'latest';
assert.strictEqual(studentManager.recalculateStudentScore('s1'), 5);
policy = 'cumulative';
assert.strictEqual(studentManager.recalculateStudentScore('s1'), 15);

// 5. المعالجة لا تغير مجموع الدروس، وكل عمليات البنك ذرية عند فشل التخزين
const mistakeWord = studentManager.getActiveStudent().mistakeBank[0].word;
let remediation = studentManager.recordRemediationAttempt('s1', mistakeWord, true);
assert.strictEqual(remediation.saved, true);
assert.strictEqual(studentManager.getActiveStudent().totalScore, 15);
const beforeBankFailure = JSON.stringify(studentManager.getActiveStudent());
rejectWrites = true;
remediation = studentManager.recordRemediationAttempt('s1', mistakeWord, true);
assert.strictEqual(remediation.saved, false);
assert.strictEqual(JSON.stringify(studentManager.getActiveStudent()), beforeBankFailure);
studentManager.removeMistake('s1', mistakeWord);
assert.strictEqual(JSON.stringify(studentManager.getActiveStudent()), beforeBankFailure);
assert.strictEqual(studentManager.markMistakeMastered('s1', mistakeWord), false);
assert.strictEqual(JSON.stringify(studentManager.getActiveStudent()), beforeBankFailure);
assert.strictEqual(studentManager.clearStudentMistakes('s1'), false);
assert.strictEqual(JSON.stringify(studentManager.getActiveStudent()), beforeBankFailure);
rejectWrites = false;
remediation = studentManager.recordRemediationAttempt('s1', mistakeWord, true);
assert.strictEqual(remediation.mastered, true);
assert.strictEqual(studentManager.getActiveStudent().totalScore, 15);

// 6. اختبار التراجع الذري عند حدوث خطأ QuotaExceededError
const beforeFailure = JSON.stringify(studentManager.getActiveStudent());
rejectWrites = true;
assert.strictEqual(studentManager.recordLessonCompletion('8', 9, 100, 3), null);
assert.strictEqual(JSON.stringify(studentManager.getActiveStudent()), beforeFailure);
assert.strictEqual(studentManager.createStudent({ name: 'لن يحفظ' }), null);
assert.strictEqual(studentManager.deleteStudent('s1'), false);
assert.strictEqual(JSON.stringify(studentManager.getActiveStudent()), beforeFailure);
assert.strictEqual(studentManager.importJSON({ students: [{ id: 's2', name: 'بديل' }] }).success, false);
assert.strictEqual(JSON.stringify(studentManager.getActiveStudent()), beforeFailure);

// 7. استعادة التخزين وحذف تقدم درس
rejectWrites = false;
assert.strictEqual(studentManager.deleteLessonProgress('s1', '7'), true);
assert.strictEqual(studentManager.getActiveStudent().totalScore, 0);

// 8. ترحيل بيانات المخطط القديم v1 إلى v2 ورفض المعرفات المكررة
policy = 'best';
assert.strictEqual(studentManager.importJSON({
    version: 1,
    students: [{
        id: 'legacy', name: 'قديم', totalScore: 999,
        completedLessons: { '9': { score: 7, attempts: 1, stars: 2, accuracy: 80 } }
    }]
}).success, true);
studentManager.setActiveStudent('legacy');
assert.strictEqual(studentManager.getActiveStudent().totalScore, 7);
assert.strictEqual(JSON.parse(records.get('nb_students_data')).version, 2);
assert.strictEqual(studentManager.importJSON({
    students: [{ id: 'same', name: 'أ' }, { id: 'same', name: 'ب' }]
}).success, false);
"""
    run_node_scenario(scenario)


# ==============================================================================
# 2. اختبار قيم الإعدادات وتفضيلات المعلم
# ==============================================================================
def test_settings_values_and_clamping() -> None:
    """يفحص تقييد القيم، والسمة، وإعلان فشل الحفظ وإرجاع النموذج."""
    scenario = r"""
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const records = new Map();
let rejectWrites = false;
global.localStorage = {
    getItem: key => records.get(key) || null,
    setItem: (key, value) => {
        if (rejectWrites) throw new Error('quota');
        records.set(key, value);
    },
    removeItem: key => records.delete(key)
};
global.window = global;
global.addEventListener = () => {};
const rootAttributes = new Map();
global.document = {
    readyState: 'loading',
    addEventListener: () => {},
    documentElement: {
        classList: { remove: () => {}, add: () => {} },
        setAttribute: (key, value) => rootAttributes.set(key, value),
        removeAttribute: key => rootAttributes.delete(key)
    },
    getElementById: () => null
};
let synced = null;
let toast = '';
global.SettingsDialog = {
    syncFormWithSettings: settings => { synced = settings; },
    showToast: message => { toast = message; }
};
require('./shared/contracts.js');
require('./shared/settings-values.js');
assert.strictEqual(SettingsValues.persist({ volume: 200 }).volume, 100);
assert.strictEqual(SettingsValues.persist({ volume: -50 }).volume, 0);
assert.strictEqual(SettingsValues.persist({ themeMode: 'dark' }).themeMode, 'dark');
assert.strictEqual(SettingsValues.persist({ themeMode: 'invalid' }).themeMode, 'system');
rejectWrites = true;
assert.throws(() => SettingsValues.persist({ volume: 20 }));
assert.strictEqual(SettingsValues.get().themeMode, 'system');

rejectWrites = false;
SettingsValues.persist({ volume: 80, themeMode: 'system' });
vm.runInThisContext(
    fs.readFileSync('./shared/settings.js', 'utf8') +
    '\n;global.settingsManager = settingsManager;',
    { filename: 'shared/settings.js' }
);
settingsManager.apply({ ...settingsManager.get(), themeMode: 'dark' });
assert.strictEqual(rootAttributes.get('data-theme'), 'dark');
settingsManager.apply({ ...settingsManager.get(), themeMode: 'system' });
assert.strictEqual(rootAttributes.has('data-theme'), false);

rejectWrites = true;
const returned = settingsManager.save({ volume: 20 }, { silent: true });
assert.strictEqual(returned.volume, 80);
assert.strictEqual(synced.volume, 80);
assert.ok(toast.includes('تعذر حفظ الإعدادات'));
"""
    run_node_scenario(scenario)


# ==============================================================================
# 3. اختبار عقود التدويل والترجمة وسجل القواعد
# ==============================================================================
def _load_locale_bundle(code: str) -> dict[str, str]:
    source = f"""
global.i18n = {{ register: (locale, meta, strings) => {{
    if (locale === {json.dumps(code)}) console.log(JSON.stringify(strings));
}} }};
require('./shared/locales/{code}.js');
"""
    return json.loads(run_node_scenario(source))


def test_translation_and_rules_contract() -> None:
    """يتحقق من تكافؤ المصادر والحزم والمتغيرات وسجل القواعد المتتبع."""
    ar_entries = json.loads((ROOT / "locales/ar.json").read_text(encoding="utf-8"))[
        "strings"
    ]
    en_entries = json.loads((ROOT / "locales/en.json").read_text(encoding="utf-8"))[
        "strings"
    ]

    assert (
        ar_entries.keys() == en_entries.keys()
    ), "Arabic and English locale keys mismatch"
    assert _load_locale_bundle("ar") == ar_entries, "Arabic bundle is stale"
    assert _load_locale_bundle("en") == en_entries, "English bundle is stale"

    for key in ar_entries:
        ar_placeholders = set(
            re.findall(r"\{([A-Za-z][A-Za-z0-9_]*)\}", ar_entries[key])
        )
        en_placeholders = set(
            re.findall(r"\{([A-Za-z][A-Za-z0-9_]*)\}", en_entries[key])
        )
        assert (
            ar_placeholders == en_placeholders
        ), f"Placeholder mismatch in key '{key}': {ar_placeholders} vs {en_placeholders}"

    # فحص المفاتيح المستخدمة في شفرات HTML و JS
    used_keys: set[str] = set()
    for path in [
        ROOT / "index.html",
        ROOT / "guide.html",
        *ROOT.glob("pages/*.html"),
        *ROOT.glob("shared/*.js"),
    ]:
        text = path.read_text(encoding="utf-8")
        used_keys.update(re.findall(r'data-i18n(?:-[\w-]+)?="([\w.-]+)"', text))
        used_keys.update(re.findall(r"\bi18n\.t\(\s*['\"]([\w.-]+)['\"]", text))
    missing = sorted(used_keys - ar_entries.keys())
    missing = [key for key in missing if key != "key"]
    assert not missing, f"Missing translation keys in codebase: {', '.join(missing)}"

    # فحص كتالوج POT
    pot_path = ROOT / "nur_albayan_strings.pot"
    if pot_path.is_file():
        pot = pot_path.read_text(encoding="utf-8")
        assert set(re.findall(r'^msgctxt "([^"]+)"', pot, re.MULTILINE)) == set(
            ar_entries
        ), "POT msgctxt mismatch"

    rules_source = """
global.window = global;
require('./shared/rules-data.js');
console.log(JSON.stringify(global.RULES_REGISTRY));
"""
    compiled_rules = json.loads(run_node_scenario(rules_source))
    source_rules = {
        code: json.loads((ROOT / f"rules/{code}.json").read_text(encoding="utf-8"))
        for code in ("ar", "en")
    }
    assert compiled_rules == source_rules, "Rules bundle is stale"


# ==============================================================================
# 4. اختبار محرك تصيير الكلمات القرآنية وتعقيم الوسوم (WordRenderer)
# ==============================================================================
def test_word_renderer_and_sanitization() -> None:
    """التحقق من صحة تصيير الكلمات المشكولة والمقطعة وتطهير شفرات HTML من XSS."""
    scenario = r"""
const assert = require('assert');
require('./shared/word-renderer.js');

// 1. تصيير كلمة نصية بسيطة
const html1 = WordRenderer.toHTML('ءَادَمُ', { theme: 'yellow' });
assert.ok(html1.includes('ءَادَمُ'), 'Word text missing in rendered HTML');
assert.ok(html1.includes('theme-yellow'), 'Theme missing in rendered HTML');

// 2. تصيير كلمة ذات وسوم تلوين قرآنية
const item2 = {
    w: "<span class='quran-special-font'><span class='c-red'>ءَا</span><span class='c-black'>دَمُ</span></span>",
    theme: 'pink'
};
const html2 = WordRenderer.toHTML(item2);
assert.ok(html2.includes('c-red'), 'c-red class missing in colored word');
assert.ok(html2.includes('c-black'), 'c-black class missing in colored word');

// 3. تصيير كلمة مقطعة (segmented boxes)
const item3 = {
    segs: ['أُ', 'ذِ', 'نَ'],
    plain: 'أُذِنَ',
    theme: 'green'
};
const html3 = WordRenderer.toHTML(item3);
assert.ok(html3.includes('أُ') && html3.includes('ذِ') && html3.includes('نَ'), 'Segments missing in rendered HTML');

// 4. تعقيم الوسوم والحماية ضد ثغرات XSS
const malicious = "<span onclick=\"alert('xss')\" class='c-black'>سَلَامٌ</span><script>evil()</script>";
const sanitized = WordRenderer.toHTML(malicious);
assert.ok(!sanitized.includes('<script>'), 'Script tag was not sanitized');
assert.ok(!sanitized.includes('onclick'), 'Inline event handler was not stripped');
assert.ok(sanitized.includes('سَلَامٌ'), 'Safe text content missing after sanitization');

// 5. لا يجوز لنسخة احتياطية أن تحقن سمة في خاصية class
const themeInjection = WordRenderer.toHTML({ w: 'آمِن', theme: 'x\" onmouseover=\"alert(1)' });
assert.ok(themeInjection.includes('theme-pink'), 'Unknown theme did not fall back');
assert.ok(!themeInjection.includes('onmouseover'), 'Theme attribute injection was not rejected');
"""
    run_node_scenario(scenario)


# ==============================================================================
# 5. اختبار منطق الذكاء الاصطناعي وألعاب الألواح (gameAI & xoGame)
# ==============================================================================
def test_game_ai_and_board_rules() -> None:
    """التحقق من قرارات الخصم الآلي ومستويات الصعوبة وحالة ألعاب الألواح."""
    scenario = r"""
const assert = require('assert');
global.window = global;
global.document = {
    getElementById: () => null,
    addEventListener: () => {}
};
require('./shared/contracts.js');
require('./shared/game-ai.js');
require('./shared/games-board.js');

// 1. فحص تبديل وضع اللعب والصعوبة
assert.strictEqual(gameAI.mode, 'computer');
gameAI.toggleMode('xo');
assert.strictEqual(gameAI.mode, 'teacher');
gameAI.toggleMode('xo');
assert.strictEqual(gameAI.mode, 'computer');

assert.strictEqual(gameAI.difficulty, 'easy');
gameAI.toggleDifficulty();
assert.strictEqual(gameAI.difficulty, 'smart');
gameAI.toggleDifficulty();
assert.strictEqual(gameAI.difficulty, 'easy');

// 2. فحص إعادة ضبط لوح إكس-أو
xoGame.reset();
assert.deepStrictEqual(xoGame.board, ['', '', '', '', '', '', '', '', '']);
assert.strictEqual(xoGame.currentPlayer, 'X');
assert.strictEqual(xoGame.gameActive, true);
"""
    run_node_scenario(scenario)


# ==============================================================================
# 6. اختبار استقرار محرك الصوت في البيئات المجردة (Headless Audio Resilience)
# ==============================================================================
def test_headless_sound_engine_resilience() -> None:
    """التحقق من عمل محرك الصوت بسلاسة دون أخطاء في البيئات المجردة وانعدام تسريب العقد."""
    scenario = r"""
const assert = require('assert');
global.window = global;
require('./shared/contracts.js');
require('./shared/sound.js');

assert.strictEqual(typeof Sound.getVol, 'function');
assert.ok(Sound.getVol() >= 0 && Sound.getVol() <= 1, 'Volume out of bounds');

// فحص استدعاء المؤثرات الصوتية دون وجود عتاد صوتي حقيقي
assert.doesNotThrow(() => {
    Sound.fail();
    Sound.danger();
    Sound.stepUp(1, 5);
    Sound.stepDown(1, 5);
});
"""
    run_node_scenario(scenario)


# ==============================================================================
# 7. اختبار بنية ومخطط كافة صفحات الدروس الـ 91 (All Lesson Pages Schema)
# ==============================================================================
def test_all_lesson_pages_schema_and_integrity() -> None:
    """التحقق الشامل من مطابقة كافة صفحات الدروس (91 صفحة) للمخطط القياسي وسلامة بياناتها."""
    pages = sorted(ROOT.glob("pages/*.html"))
    assert len(pages) == 91, f"Expected 91 lesson pages, found {len(pages)}"

    for page_path in pages:
        content = page_path.read_text(encoding="utf-8")
        rel_name = page_path.name

        # 1. منع وسم تعطيل التكبير
        assert (
            "user-scalable=no" not in content
        ), f"{rel_name}: user-scalable=no found (WCAG violation)"

        # 2. التحقق من وسم الربط المركزي core.js وتعريف البيانات للصفحات القياسية
        if rel_name != "6.html":
            assert (
                'src="../shared/core.js"' in content
            ), f"{rel_name}: missing shared/core.js script link"
            assert (
                "window.PAGE_CONFIG" in content or "PAGE_CONFIG" in content
            ), f"{rel_name}: missing PAGE_CONFIG definition"
            assert (
                "dataset =" in content or "dataset=" in content
            ), f"{rel_name}: missing dataset definition"

        # 3. استخراج عناصر dataset والتحقق من الحقول الإلزامية عبر Node.js
        if rel_name != "6.html":
            eval_script = f"""
const fs = require('fs');
const code = fs.readFileSync({json.dumps(str(page_path))}, 'utf-8');
global.window = {{}};
try {{
    const scriptMatch = code.match(/<script(?![^>]*\\bsrc=)[^>]*>([\\s\\S]*?)<\\/script>/i);
    if (scriptMatch) {{
        eval(scriptMatch[1] + '\\n;globalThis.__lessonDataset = typeof dataset !== "undefined" ? dataset : null;');
        const cfg = window.PAGE_CONFIG || {{}};
        if (!cfg.title && !code.includes('remediation')) throw new Error('Missing title in PAGE_CONFIG');
        const lessonDataset = globalThis.__lessonDataset;
        if (!Array.isArray(lessonDataset) && !code.includes('remediation')) throw new Error('Dataset was not exported');
        if (Array.isArray(lessonDataset)) {{
            if (lessonDataset.length === 0 && !code.includes('remediation')) throw new Error('Empty dataset array');
            for (let i = 0; i < lessonDataset.length; i++) {{
                const item = lessonDataset[i];
                if (!item.w && !item.segs && !item.cardHtml) throw new Error('Item ' + i + ' missing w or segs');
            }}
        }}
    }}
}} catch (e) {{
    console.error(e.message);
    process.exit(1);
}}
"""
            completed = subprocess.run(
                ["node", "-e", eval_script],
                cwd=ROOT,
                check=False,
                capture_output=True,
                text=True,
                encoding="utf-8",
            )
            assert (
                completed.returncode == 0
            ), f"{rel_name} failed schema validation:\n{completed.stderr.strip()}"


# ==============================================================================
# 8. اختبار معايير الوصولية العالمية (W3C WCAG 2.1 AA HTML/A11y Audit)
# ==============================================================================
def test_html_accessibility_baseline() -> None:
    """يفحص خط الأساس الساكن؛ ولا يدعي أنه تدقيق WCAG كامل."""
    all_html = [ROOT / "index.html", ROOT / "guide.html", *ROOT.glob("pages/*.html")]
    assert len(all_html) == 93, f"Expected 93 HTML files, found {len(all_html)}"

    for html_path in all_html:
        text = html_path.read_text(encoding="utf-8")
        rel_name = html_path.name

        # 1. فحص وسم DOCTYPE
        assert (
            "<!DOCTYPE html>" in text or "<!doctype html>" in text
        ), f"{rel_name}: Missing <!DOCTYPE html>"

        # 2. فحص لغة واتجاه المستند
        assert (
            'lang="ar"' in text or "lang='ar'" in text
        ), f"{rel_name}: Missing or invalid lang attribute"
        assert (
            'dir="rtl"' in text or "dir='rtl'" in text
        ), f"{rel_name}: Missing or invalid dir attribute"

        # 3. فحص ترميز UTF-8
        assert (
            'charset="UTF-8"' in text
            or "charset='UTF-8'" in text
            or 'charset="utf-8"' in text
        ), f"{rel_name}: Missing UTF-8 charset"

        # 4. فحص النفاذية وحرية تكبير الشاشة (WCAG 1.4.4)
        assert (
            "user-scalable=no" not in text
        ), f"{rel_name}: Prohibited user-scalable=no found"
        assert (
            "maximum-scale=1" not in text
        ), f"{rel_name}: Prohibited maximum-scale=1 found"


# ==============================================================================
# 9. فحص سلامة الروابط والأصول المحلية بنسبة 100% (Zero Broken Links)
# ==============================================================================
def test_static_asset_and_relative_link_integrity() -> None:
    """التحقق من وجود كافة الأصول والملفات المرتبطة محلياً في صفحات HTML دون أي رابط مكسور."""
    all_html = [ROOT / "index.html", ROOT / "guide.html", *ROOT.glob("pages/*.html")]
    broken_links: list[str] = []

    for html_path in all_html:
        text = html_path.read_text(encoding="utf-8")
        links = re.findall(r'(?:href|src)=["\']([^"\':#?]+)["\']', text)
        for link in links:
            if (
                link.startswith("http")
                or link.startswith("data:")
                or link.startswith("javascript:")
                or link.startswith("mailto:")
            ):
                continue
            clean_link = link.split("#")[0]
            if not clean_link:
                continue
            target = (html_path.parent / clean_link).resolve()
            if not target.exists():
                broken_links.append(f"{html_path.name} -> {clean_link}")

    assert not broken_links, "Found broken asset/page links:\n" + "\n".join(
        broken_links
    )


# ==============================================================================
# 10. اختبار ملف تعريف التطبيق ودورة حياة عامل الخدمة (PWA & Offline Contract)
# ==============================================================================
def test_pwa_manifest_and_offline_lifecycle() -> None:
    """التحقق من صحة أبعاد أيقونة PWA الحقيقية وعقد إبطال الكاش القديم في عامل الخدمة."""
    manifest_path = ROOT / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

    assert (
        "screenshots" not in manifest
    ), "Abandoned screenshots field found in manifest.json"
    assert manifest.get("icons"), "Manifest missing icons list"

    icon_rel = manifest["icons"][0]["src"]
    icon_file = ROOT / icon_rel
    assert icon_file.is_file(), f"Manifest icon file not found: {icon_rel}"

    png_bytes = icon_file.read_bytes()
    width = int.from_bytes(png_bytes[16:20], "big")
    height = int.from_bytes(png_bytes[20:24], "big")
    assert (
        manifest["icons"][0]["sizes"] == f"{width}x{height}"
    ), f"Icon size declared '{manifest['icons'][0]['sizes']}' does not match actual PNG '{width}x{height}'"

    worker = (ROOT / "sw.js").read_text(encoding="utf-8")
    assert (
        "CACHE_VERSION" in worker or "CACHE_NAME" in worker
    ), "Cache versioning missing in sw.js"
    assert "caches.delete" in worker, "Stale cache cleanup missing on activate event"


# ==============================================================================
# 11. اختبار سلامة الصياغة والفضاء الاسمي وتخزين الكاش (ServiceWorker Precache Contract)
# ==============================================================================
def test_module_syntax_and_namespace_contract() -> None:
    """التحقق من الصياغة النحوية لـ 34 ملفاً وعقد الفضاء الاسمي NurAlBayan وعقد Precache."""
    js_files = (
        list(ROOT.glob("shared/*.js"))
        + list(ROOT.glob("shared/locales/*.js"))
        + [ROOT / "sw.js"]
    )
    for js_path in js_files:
        check_javascript_syntax(js_path.read_text(encoding="utf-8"), js_path.name)

    core_content = (ROOT / "shared/core.js").read_text(encoding="utf-8")
    assert (
        "root.NurAlBayan" in core_content
    ), "NurAlBayan root namespace missing in core.js"
    assert (
        "version: '2.0.0'" in core_content
    ), "NurAlBayan version contract 2.0.0 missing"

    required_getters = [
        "i18n",
        "app",
        "rules",
        "rulesRegistry",
        "roster",
        "studentManager",
        "sound",
        "renderer",
        "games",
    ]
    for getter in required_getters:
        assert (
            f"get {getter}()" in core_content
        ), f"Missing getter '{getter}' in window.NurAlBayan"

    # التحقق الثنائي الصارم من مطابقة كافة صفحات الدروس والأصول في sw.js
    worker = (ROOT / "sw.js").read_text(encoding="utf-8")
    assert (
        "cache.addAll(PRECACHE_ASSETS)" in worker
    ), "ServiceWorker missing cache.addAll call"

    assets_block = re.search(r"const PRECACHE_ASSETS = \[(.*?)\];", worker, re.DOTALL)
    assert assets_block, "Precache asset list missing in sw.js"
    assets = set(re.findall(r"['\"]\./([^'\"]+)['\"]", assets_block.group(1)))

    missing_on_disk = [
        asset for asset in sorted(assets) if not (ROOT / asset).is_file()
    ]
    assert (
        not missing_on_disk
    ), f"Missing precache assets on disk: {', '.join(missing_on_disk)}"

    disk_pages = {p.relative_to(ROOT).as_posix() for p in ROOT.glob("pages/*.html")}
    missing_pages_in_sw = sorted(disk_pages - assets)
    assert (
        not missing_pages_in_sw
    ), f"Pages missing from sw.js PRECACHE_ASSETS: {', '.join(missing_pages_in_sw)}"

    essential_assets = {
        "index.html",
        "guide.html",
        "manifest.json",
        "shared/core.js",
        "shared/core.css",
        "shared/i18n.js",
        "shared/rules-data.js",
        "shared/rule-manager.js",
        "shared/locales/ar.js",
        "shared/locales/en.js",
    }
    missing_essential = sorted(essential_assets - assets)
    assert (
        not missing_essential
    ), f"Essential assets missing from sw.js: {', '.join(missing_essential)}"


# ==============================================================================
# محرك الاختبار والتقارير التشخيصية
# ==============================================================================
class TestSuiteRunner:
    def __init__(self) -> None:
        self.tests: list[tuple[str, Callable[[], None]]] = []
        self.passed = 0
        self.failed = 0
        self.failures: list[tuple[str, str]] = []

    def add(self, name: str, fn: Callable[[], None]) -> None:
        self.tests.append((name, fn))

    def run(self) -> int:
        print("=" * 65)
        print("  تشغيل حزمة الاختبارات المعيارية المتقدمة — منصة نور البيان")
        print("=" * 65)

        total_start = time.perf_counter()

        for name, fn in self.tests:
            start_time = time.perf_counter()
            try:
                fn()
                elapsed = time.perf_counter() - start_time
                self.passed += 1
                print(f"  ✓ PASS [{elapsed * 1000:6.1f}ms] {name}")
            except Exception as e:
                elapsed = time.perf_counter() - start_time
                self.failed += 1
                err_str = str(e)
                self.failures.append((name, err_str))
                print(f"  ✗ FAIL [{elapsed * 1000:6.1f}ms] {name}")

        total_elapsed = time.perf_counter() - total_start
        print("-" * 65)
        print(
            f"📊 النتيجة: {self.passed} ناجح | {self.failed} فاشل | الوقت الكلي: {total_elapsed:.2f}s"
        )

        if self.failures:
            print("\n❌ تفاصيل الإخفاقات:")
            for idx, (name, err) in enumerate(self.failures, 1):
                print(f"\n[{idx}] {name}:")
                print(f"    {err}")
            return 1

        print("✅ اجتازت كافة الاختبارات المعيارية بنجاح تام (100% Passed).")
        return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.parse_args()

    runner = TestSuiteRunner()
    runner.add(
        "test_student_progress_and_atomic_storage",
        test_student_progress_and_atomic_storage,
    )
    runner.add("test_settings_values_and_clamping", test_settings_values_and_clamping)
    runner.add(
        "test_translation_and_rules_contract", test_translation_and_rules_contract
    )
    runner.add(
        "test_word_renderer_and_sanitization", test_word_renderer_and_sanitization
    )
    runner.add("test_game_ai_and_board_rules", test_game_ai_and_board_rules)
    runner.add(
        "test_headless_sound_engine_resilience", test_headless_sound_engine_resilience
    )
    runner.add(
        "test_all_lesson_pages_schema_and_integrity",
        test_all_lesson_pages_schema_and_integrity,
    )
    runner.add("test_html_accessibility_baseline", test_html_accessibility_baseline)
    runner.add(
        "test_static_asset_and_relative_link_integrity",
        test_static_asset_and_relative_link_integrity,
    )
    runner.add(
        "test_pwa_manifest_and_offline_lifecycle",
        test_pwa_manifest_and_offline_lifecycle,
    )
    runner.add(
        "test_module_syntax_and_namespace_contract",
        test_module_syntax_and_namespace_contract,
    )

    return runner.run()


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as error:
        print(f"FATAL: {error}", file=sys.stderr)
        sys.exit(1)
