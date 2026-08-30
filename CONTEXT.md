# Context: Nur Al-Bayan Interactive Platform

## Domain Concepts

### Lesson Page (صفحة الدرس)
A standalone interactive HTML document (`pages/N.html`) representing a single corresponding page of the printed Nur Al-Bayan curriculum. It encapsulates a metadata configuration contract (`PAGE_CONFIG`) and a list of educational word cards (`dataset`).

### Word Card (بطاقة الكلمة)
An individual interactive learning unit within a lesson page. It defines the word's styled display content (`w`), visual color theme (`theme`), and gamified scoring category (`t`: `normal`, `golden`, `speed`, `danger`).

### Font Type (نمط الخط وعقد الرسم)
- **`quran`**: Applied to Quranic lesson pages (81 pages) using the KFGQPC Uthmanic Hafs font with strict Madinah Mushaf orthography (Quranic sukun `\u06E1`, dagger alif `ٰ`, waslah `ٱ`, dotless final Yaa `ى`).
- **`dictation`**: Applied to standard dictation and reading pages (10 pages) using the Noto Naskh font with standard Arabic orthography (orthographic sukun `\u0652`, dotted final Yaa `ي`).
- **`mixed`**: Applied to combined review pages (specifically pages 89 through 95) hosting both Quranic verses (`.quran-special-font`) and Hadiths/stories (`.dictation-font`), configured via `PAGE_CONFIG.fontType = 'mixed'`.

### Execution Strategy (استراتيجية التنفيذ الدفعي)
- **Batch-by-Batch Lifecycle (المسار الدفعي)**: Iterative progression across the 9 batches (Batch 1 through Batch 9). Each batch is fully corrected and audited across all 4 priority levels (P0, P1, P2, P3) before advancing to the next batch.
- **Verification Authority (مرجعية التحقق والاعتماد)**: Verification relies strictly on `docs/comprehensive_audit_report.md` forensic audit logs and automated contract test runners (`run_tests.py`). Re-reading image assets is omitted.
- **Traceability & State Tracking (التوثيق المرحلي المستقل)**: State files (`task.md` and `project_state.md`) are updated per batch, followed by an English Conventional Commit per completed batch.

### Dataset Sanitization Policy (تطهير كائنات البيانات)
- Strict compliance with `NBContracts`: Word cards retain only canonical attributes (`w`, `theme`, `t`, `boxes`). All legacy or redundant fields (`plain`, `info`, `segs`, unparsed `rawWords`) are strictly eliminated.

### Syllabic & Pedagogical Operators (معاملات التقطيع والتهجي)
- **Comparison Separator (`-` / `sep-bar`)**: Delimits contrasting vowel/letter variations within a single drill card (e.g. `بَ - بِ - بُ`).
- **Derivation Arrow (`←`)**: Expresses morphological and syllabic progression from basic forms to expanded/madd forms (e.g. `قَمَ ← قَامَ`).
- **Equivalence Operator (`=`)**: Denotes phonetic spelling equivalence in foundation rules (e.g. `بَنْ = بًا`).

### Semantic Color Tokens (رموز التلوين الدلالي)
- **`.c-red`**: Highlights targeted learning elements (madd letters, target vowels, target sukun, tanween markers).
- **`.c-blue`**: Highlights contrasting syllables in multi-letter drills and qalqalah consonants.
- **`.c-black`**: Standard base text for word bodies and neutral diacritics.
- **`.c-purple`**: Highlights secondary educational distinctions and special phonetic features.
