# Efficient Editing and Word Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Innovation Academy branding, reusable custom score subjects, inline autosaving notebooks, adjacent-student navigation, and polished full-archive Word export.

**Architecture:** Add normalized score-subject/value tables while retaining legacy score columns, expose dynamic subjects through existing authenticated Worker routes, and introduce focused React components for autosave and DOCX generation. Word files are produced client-side from the existing archive JSON and verified structurally and through LibreOffice rendering.

**Tech Stack:** React 19, TypeScript, Hono, Cloudflare D1/Workers, Zod, `docx`, Vitest, Testing Library, Playwright, LibreOffice rendering.

## Global Constraints

- No grade-template administration; subjects are global reusable candidates.
- Empty score subjects never appear in cards, API score values, or Word output.
- Existing records edit inline with 800ms autosave, blur save, Ctrl+Enter save, visible state, and draft preservation on failure.
- New notebook records still use explicit create dialogs; delete remains confirmed.
- DOCX is A4 portrait, contains the full current-student archive, and uses deliberate section page breaks.
- Existing score columns remain for rollback compatibility; migrations only add or copy data.

---

### Task 1: Brand asset and shell placement

**Files:**
- Create: `public/brand/innovation-academy-logo.jpg`
- Modify: `src/auth/LoginPage.tsx`, `src/layout/StudentDirectory.tsx`, `src/styles.css`
- Test: `src/auth/LoginPage.test.tsx`, `src/layout/StudentDirectory.test.tsx`

**Interfaces:**
- Produces: stable `/brand/innovation-academy-logo.jpg` URL reused by screen UI and Word builder.

- [ ] Copy the supplied logo into `public/brand/innovation-academy-logo.jpg` and write failing UI tests for branded accessible images.
- [ ] Run the two UI test files and confirm missing-logo failures.
- [ ] Add full login branding, compact directory branding, and responsive sizing without altering logo colors.
- [ ] Rerun the focused UI tests and visual-check 1440×900 and 390×844.
- [ ] Commit `feat: add Innovation Academy branding`.

### Task 2: Dynamic score subject schema and API

**Files:**
- Create: `migrations/0002_dynamic_score_subjects.sql`
- Modify: `shared/contracts.ts`, `shared/validation.ts`, `worker/routes/scores.ts`, `worker/routes/archive.ts`
- Test: `worker/test/scores.test.ts`, `worker/test/archive.test.ts`

**Interfaces:**
- Produces: `ScoreSubject { id, name, is_default, created_at }`, `ScoreValue { subject_id, subject_name, value }`, `Score.values`, `GET /api/score-subjects`, `POST /api/score-subjects`, and score create/update `values` payloads.

- [ ] Write failing Worker tests for seeded defaults, custom creation/reuse, duplicate normalization, dynamic value CRUD, 0, empty omission, and archive aggregation.
- [ ] Run the focused Worker tests and verify failures come from absent tables/routes/types.
- [ ] Add migration tables, default rows, and legacy-value migration inserts.
- [ ] Add schemas/contracts and repository helpers that hydrate values in deterministic subject order.
- [ ] Update score and archive routes; synchronize `score_values` transactionally through D1 batch operations.
- [ ] Rerun focused and full Worker suites; verify migrations apply from an empty database.
- [ ] Commit `feat: support reusable score subjects`.

### Task 3: Dynamic score editing UI

**Files:**
- Modify: `src/features/scores/ScoreForm.tsx`, `src/features/scores/ScoreTimeline.tsx`, `src/features/scores/ScorePage.tsx`
- Test: `src/features/scores/ScorePage.test.tsx`

**Interfaces:**
- Consumes: Task 2 subject/value APIs and contracts.
- Produces: reusable subject picker, custom subject creation, empty-value omission, and dynamic score cards.

- [ ] Write failing UI tests for default subjects, adding a custom subject, reusing it, rendering 0, omitting empty values, and clearing an existing value.
- [ ] Run the focused UI test and confirm expected failures.
- [ ] Implement subject loading/creation and stable controlled score-value rows.
- [ ] Replace fixed timeline fields with `score.values` rendering.
- [ ] Rerun focused and full UI suites.
- [ ] Commit `feat: edit custom score subjects`.

### Task 4: Reusable inline autosave state machine

**Files:**
- Create: `src/hooks/useAutosaveDraft.ts`
- Test: `src/hooks/useAutosaveDraft.test.tsx`

**Interfaces:**
- Produces: `useAutosaveDraft<T>({ initial, save, delay })` with `draft`, `setDraft`, `status`, `saveNow`, `retry`, and `isDirty`.

- [ ] Write fake-timer tests for 800ms debounce, blur/manual save, Ctrl+Enter caller behavior, edits during in-flight save, failure draft retention, retry, and unload warning.
- [ ] Run the hook test and verify missing-hook failure.
- [ ] Implement serialized latest-draft persistence without stale-response overwrite.
- [ ] Rerun the hook test and refactor state names for UI clarity.
- [ ] Commit `feat: add resilient autosave drafts`.

### Task 5: Inline study and course notebooks

**Files:**
- Create: `src/components/AutosaveStatus.tsx`
- Modify: `src/features/study/StudyNotebook.tsx`, `src/features/courses/CourseNotebook.tsx`, `src/styles.css`
- Test: `src/features/study/StudyNotebook.test.tsx`, `src/features/courses/CourseNotebook.test.tsx`

**Interfaces:**
- Consumes: Task 4 autosave hook.
- Produces: inline date/content/feedback fields and status indicators; create/delete behavior stays intact.

- [ ] Replace old edit-modal expectations with failing inline-autosave tests, including reorder and retry.
- [ ] Run focused tests and confirm the current read-only pages fail.
- [ ] Implement inline study inputs and autosave integration; keep create dialog only for new records.
- [ ] Implement inline course date/topic/feedback inputs and autosave integration.
- [ ] Add accessible status visuals and prevent page navigation while save fails.
- [ ] Rerun focused and full UI suites.
- [ ] Commit `feat: streamline notebook editing`.

### Task 6: Adjacent-student workflow

**Files:**
- Modify: `src/layout/StudentHeader.tsx`, `src/layout/StudentWorkspace.tsx`, `src/styles.css`
- Test: `src/layout/StudentWorkspace.test.tsx`

**Interfaces:**
- Produces: previous/next student controls preserving `scores`, `study`, or `courses/:subject` suffix.

- [ ] Write failing route tests for boundaries and suffix-preserving navigation.
- [ ] Implement deterministic previous/next lookup using the directory order.
- [ ] Add compact keyboard-friendly controls with disabled boundary states.
- [ ] Run focused and full UI tests.
- [ ] Commit `feat: navigate adjacent student archives`.

### Task 7: DOCX archive builder

**Files:**
- Create: `src/features/export/buildArchiveDocx.ts`, `src/features/export/buildArchiveDocx.test.ts`, `src/features/export/ExportWordButton.tsx`
- Modify: `src/layout/StudentHeader.tsx`, `src/layout/StudentWorkspace.tsx`, `src/App.tsx`, `package.json`
- Remove: screen entry to `src/features/print/PrintArchivePage.tsx` route (source may remain for migration reference)

**Interfaces:**
- Consumes: `StudentArchive` and `/brand/innovation-academy-logo.jpg`.
- Produces: `buildArchiveDocx(archive, logoBytes): Promise<Blob>` and sanitized download filename.

- [ ] Install `docx` and write failing structural tests that unzip output and assert logo relationship, cover, dynamic score headers, empty omissions, section breaks, headers, footers, and PAGE fields.
- [ ] Run the builder tests and confirm missing implementation failure.
- [ ] Implement branded A4 cover, dynamic score table, study pages, and nonempty course sections with keep-next/keep-lines/page-break controls.
- [ ] Implement download state/error UI and replace “打印档案” with “导出 Word”.
- [ ] Redirect old print route to the corresponding student score page.
- [ ] Rerun builder and full UI tests.
- [ ] Commit `feat: export branded Word archives`.

### Task 8: DOCX visual verification and end-to-end acceptance

**Files:**
- Modify: `e2e/archive.spec.ts`, `README.md`, `docs/acceptance-matrix.md`
- Create: `scripts/generate-docx-fixture.mjs` only if browser download cannot serve as the deterministic fixture source.

**Interfaces:**
- Produces: downloadable nonempty DOCX, responsive screenshots, and LibreOffice-rendered QA pages.

- [ ] Update Playwright flow for Logo, custom “生物” score, inline study/course autosave, adjacent navigation, and Word download.
- [ ] Run E2E and confirm old UI expectations fail before updating implementation selectors.
- [ ] Run passing E2E and preserve downloaded DOCX as a test artifact.
- [ ] Render the DOCX with the Documents skill renderer and inspect every page for clipping, orphan headings, split records, missing Logo, and inconsistent spacing; fix and repeat until clean.
- [ ] Update README and acceptance matrix with the new workflow and Word behavior.
- [ ] Run final gates: `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:e2e`, `npm run build`, `npm audit --audit-level=high`.
- [ ] Verify `git diff --check`, commit `test: verify efficient archive workflow`, and leave unrelated root files untouched.
