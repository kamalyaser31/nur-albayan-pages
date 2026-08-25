"""فحوص انحدار صغيرة لمنظومة نور البيان دون إطار اختبار خارجي."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def run_node_scenario(source: str) -> None:
    completed = subprocess.run(
        ["node", "-e", source],
        cwd=ROOT,
        check=False,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    if completed.returncode:
        raise AssertionError(completed.stderr or completed.stdout)


def check_javascript(source: str, label: str) -> None:
    completed = subprocess.run(
        ["node", "--check", "-"],
        cwd=ROOT,
        input=source,
        check=False,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    assert completed.returncode == 0, f"{label}: {completed.stderr}"


def test_student_progress_and_atomic_storage() -> None:
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

assert.throws(() => NBContracts.cardEvaluationRequest({ lessonId: '7', isCorrect: 'yes' }), TypeError);
assert.throws(() => NBContracts.cardEvaluationRequest({ lessonId: '7', isCorrect: true }), TypeError);
assert.throws(() => NBContracts.requireScorePolicy('unknown'), TypeError);
assert.strictEqual(studentManager.importJSON({ students: [{ id: 's1', name: 'أحمد' }] }).success, true);
studentManager.setActiveStudent('s1');
studentManager.recordCardEvaluation({
    lessonId: '7', isCorrect: false, pointsAwarded: 0,
    wordData: 'كَتَبَ', cardIndex: 0, totalCards: 2
});
assert.strictEqual(studentManager.getActiveStudent().totalScore, 0);
assert.strictEqual(studentManager.getActiveStudent().mistakeBank.length, 1);

studentManager.recordLessonCompletion('7', 10, 90, 2);
studentManager.recordLessonCompletion('7', 5, 80, 1);
assert.strictEqual(studentManager.getActiveStudent().totalScore, 10);
policy = 'latest';
assert.strictEqual(studentManager.recalculateStudentScore('s1'), 5);
policy = 'cumulative';
assert.strictEqual(studentManager.recalculateStudentScore('s1'), 15);

const beforeFailure = JSON.stringify(studentManager.getActiveStudent());
rejectWrites = true;
assert.strictEqual(studentManager.recordLessonCompletion('8', 9, 100, 3), null);
assert.strictEqual(JSON.stringify(studentManager.getActiveStudent()), beforeFailure);
assert.strictEqual(studentManager.createStudent({ name: 'لن يحفظ' }), null);
assert.strictEqual(studentManager.deleteStudent('s1'), false);
assert.strictEqual(JSON.stringify(studentManager.getActiveStudent()), beforeFailure);
assert.strictEqual(studentManager.importJSON({ students: [{ id: 's2', name: 'بديل' }] }).success, false);
assert.strictEqual(JSON.stringify(studentManager.getActiveStudent()), beforeFailure);
rejectWrites = false;
assert.strictEqual(studentManager.deleteLessonProgress('s1', '7'), true);
assert.strictEqual(studentManager.getActiveStudent().totalScore, 0);
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
"""
    run_node_scenario(scenario)


def test_settings_values() -> None:
    scenario = r"""
const assert = require('assert');
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
require('./shared/settings-values.js');
assert.strictEqual(SettingsValues.persist({ volume: 200 }).volume, 100);
rejectWrites = true;
assert.throws(() => SettingsValues.persist({ volume: 20 }));
assert.strictEqual(SettingsValues.get().volume, 100);
"""
    run_node_scenario(scenario)


def locale_dictionary(path: Path) -> dict[str, str]:
    entries = re.findall(
        r'^\s*"([^"]+)"\s*:\s*"((?:[^"\\]|\\.)*)"',
        path.read_text(encoding="utf-8"),
        re.MULTILINE,
    )
    return dict(entries)


def placeholders(text: str) -> set[str]:
    return set(re.findall(r"\{([A-Za-z][A-Za-z0-9_]*)\}", text))


def test_translation_contract() -> None:
    arabic = locale_dictionary(ROOT / "shared/locales/ar.js")
    english = locale_dictionary(ROOT / "shared/locales/en.js")
    assert arabic.keys() == english.keys(), "Arabic and English locale keys differ"
    for key in arabic:
        assert placeholders(arabic[key]) == placeholders(english[key]), key
    assert arabic.get("roster_tabs_aria"), "Missing roster_tabs_aria"

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
    missing = sorted(used_keys - arabic.keys())
    missing = [key for key in missing if key != "key"]
    assert not missing, f"Missing translation keys: {', '.join(missing)}"
    pot_path = ROOT / "nur_albayan_strings.pot"
    if pot_path.is_file():
        pot = pot_path.read_text(encoding="utf-8")
        assert set(re.findall(r'^msgctxt "([^"]+)"', pot, re.MULTILINE)) == set(arabic)


def test_manifest_json() -> None:
    manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
    assert "screenshots" not in manifest
    icon = ROOT / manifest["icons"][0]["src"]
    png = icon.read_bytes()
    width, height = int.from_bytes(png[16:20], "big"), int.from_bytes(png[20:24], "big")
    assert manifest["icons"][0]["sizes"] == f"{width}x{height}"


def test_interface_structure() -> None:
    index = (ROOT / "index.html").read_text(encoding="utf-8")
    guide = (ROOT / "guide.html").read_text(encoding="utf-8")
    page6 = (ROOT / "pages/6.html").read_text(encoding="utf-8")
    assert "shortcuts-section" not in index and 'id="shortcuts"' in guide
    assert index.count('class="stage-heading"') == 9
    assert 'id="wordwall-tabs"' in (ROOT / "shared/lesson-template.js").read_text(
        encoding="utf-8"
    )
    assert "bindTabKeyboardNavigation" in (ROOT / "shared/games-wordwall.js").read_text(
        encoding="utf-8"
    )
    assert "user-scalable=no" not in "".join(
        path.read_text(encoding="utf-8") for path in ROOT.glob("pages/*.html")
    )
    for obsolete in ("audioCtx", "tttBoard", "c4Board", "memBoard", "createEffects"):
        assert obsolete not in page6, obsolete
    assert "memoryGame.iconSets = [['🌟', '🎈', '🦸‍♂️', '🚀', '👑', '🎯']]" in page6
    for body in re.findall(
        r"<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>", page6, re.DOTALL | re.IGNORECASE
    ):
        check_javascript(body, "pages/6.html inline script")


def test_module_syntax_and_loading() -> None:
    core = (ROOT / "shared/core.js").read_text(encoding="utf-8")
    expected = (
        "contracts.js",
        "student-repository.js",
        "student-progress.js",
        "mistake-bank.js",
        "student-backup.js",
        "settings-values.js",
        "settings-dialog.js",
        "vendor-loader.js",
        "lesson-template.js",
        "modal-accessibility.js",
        "lesson-session.js",
        "remediation-session.js",
        "lesson-summary.js",
    )
    for module in expected:
        assert f"'{module}'" in core, module
    for path in ROOT.glob("shared/*.js"):
        check_javascript(path.read_text(encoding="utf-8"), path.name)
    check_javascript((ROOT / "sw.js").read_text(encoding="utf-8"), "sw.js")
    eager_vendor_tags = "".join(
        path.read_text(encoding="utf-8") for path in ROOT.glob("pages/*.html")
    )
    assert 'src="../shared/vendor/chart.umd.min.js"' not in eager_vendor_tags
    assert 'src="../shared/vendor/confetti.browser.min.js"' not in eager_vendor_tags


def test_service_worker_contract() -> None:
    worker = (ROOT / "sw.js").read_text(encoding="utf-8")
    assert "cache.addAll(PRECACHE_ASSETS)" in worker
    assert "Promise.allSettled" not in worker
    assets_block = re.search(r"const PRECACHE_ASSETS = \[(.*?)\];", worker, re.DOTALL)
    assert assets_block, "Precache asset list missing"
    assets = re.findall(r"['\"]\./([^'\"]+)['\"]", assets_block.group(1))
    missing = [asset for asset in assets if not (ROOT / asset).is_file()]
    assert not missing, f"Missing precache assets: {', '.join(missing)}"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.parse_args()
    tests = (
        test_student_progress_and_atomic_storage,
        test_settings_values,
        test_translation_contract,
        test_manifest_json,
        test_interface_structure,
        test_module_syntax_and_loading,
        test_service_worker_contract,
    )
    for test in tests:
        test()
        print(f"PASS {test.__name__}")
    print(f"PASS all ({len(tests)})")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (AssertionError, OSError, subprocess.SubprocessError, ValueError) as error:
        print(f"FAIL {error}", file=sys.stderr)
        raise SystemExit(1)
