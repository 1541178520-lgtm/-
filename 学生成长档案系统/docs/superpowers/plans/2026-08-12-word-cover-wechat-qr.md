# Word Cover WeChat QR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the supplied WeChat QR image and the copy “任何学业问题，扫码咨询” to the bottom of the first Word cover page.

**Architecture:** Store the original image as a public brand asset, fetch it during export, and pass its bytes into the existing DOCX builder. The builder adds a small centered image/caption block after the student information table while preserving the existing section break.

**Tech Stack:** React, TypeScript, docx, Vitest, Playwright, Microsoft Word render verification.

## Global Constraints

- Do not crop, redraw, or otherwise alter the QR pixels.
- Keep the cover on one page.
- Do not change any other archive content or chapter layout.

---

### Task 1: QR Word cover block

**Files:**
- Create: `public/brand/innovation-academy-wechat-qr.jpg`
- Modify: `src/features/export/archiveDocx.ts`
- Modify: `src/layout/StudentWorkspace.tsx`
- Test: `src/features/export/archiveDocx.test.ts`

**Interfaces:**
- Consumes: `buildArchiveDocx(archive, logoBytes, qrBytes)`.
- Produces: a DOCX Blob containing both brand images and the cover caption.

- [ ] Add a failing DOCX package test for the caption and second image.
- [ ] Run the focused test and confirm the expected failure.
- [ ] Copy the original QR asset and pass it through the export data flow.
- [ ] Add the compact centered QR/caption block to the cover.
- [ ] Run the focused test and typecheck.
- [ ] Run lint, all tests, production build, and browser export.
- [ ] Render the downloaded DOCX with Word and inspect every page, especially page 1.
- [ ] Commit the verified change.
