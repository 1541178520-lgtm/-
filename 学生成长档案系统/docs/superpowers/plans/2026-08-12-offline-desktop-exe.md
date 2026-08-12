# Offline Desktop EXE Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Windows Electron EXE version of the student growth archive system that works without network access.

**Architecture:** Keep the React app and route structure. Add an Electron main process with a secure preload bridge and a local JSON repository that implements the same API response shapes as the current web API.

**Tech Stack:** React 19, Vite, TypeScript, Electron, electron-builder, Node fs persistence, Vitest.

## Global Constraints

- Keep existing web/Cloudflare files available for future online deployment.
- Do not require network access at runtime.
- Store desktop data under Electron `userData`.
- Preserve existing API paths from the React client.
- Package for Windows as an EXE.

---

### Task 1: Electron Build Shell

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`
- Create: `tsconfig.electron.json`
- Create: `electron/main.ts`
- Create: `electron/preload.ts`
- Create: `vite.desktop.config.ts`

**Interfaces:**
- Produces: `window.archiveDesktop.request(path, init)` preload API.
- Produces: `npm run electron:dev`, `npm run desktop:build`, and `npm run desktop:pack`.

- [ ] Add Electron and packaging dependencies.
- [ ] Add Vite desktop config without the Cloudflare plugin.
- [ ] Add Electron TypeScript config targeting Node.
- [ ] Create a main window that loads `dist-desktop/index.html` in production and Vite dev URL in development.
- [ ] Create a preload bridge exposing `archiveDesktop.request`.
- [ ] Run `npm run typecheck`.

### Task 2: Local Data Repository

**Files:**
- Create: `electron/localStore.ts`
- Create: `electron/localApi.ts`
- Create: `electron/localApi.test.ts`

**Interfaces:**
- Consumes: shared contract types.
- Produces: `createLocalApi(dataPath: string): { handle(path: string, init: DesktopRequestInit): Promise<DesktopApiResponse> }`.

- [ ] Define the local JSON data shape.
- [ ] Seed default score subjects.
- [ ] Implement CRUD for students, tags, scores, study records, and course records.
- [ ] Implement archive aggregation for Word export.
- [ ] Implement local auth responses for `/auth/me`, `/auth/login`, and `/auth/logout`.
- [ ] Add Vitest coverage for create/list/update/delete and archive aggregation.

### Task 3: Desktop Client Bridge

**Files:**
- Modify: `src/api/client.ts`
- Create: `src/api/desktop.d.ts`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: `window.archiveDesktop.request`.
- Produces: browser-compatible API behavior for web and desktop.

- [ ] Teach `api()` to call the Electron bridge when present.
- [ ] Preserve fetch behavior for web deployment.
- [ ] Use hash routing in Electron so reloads work from local files.
- [ ] Run UI tests that exercise existing API mock points.

### Task 4: Package and Verify

**Files:**
- Modify: `README.md`
- Modify: `.gitignore` if packaging output needs ignoring.

**Interfaces:**
- Produces: Windows EXE or unpacked desktop app in `release/`.

- [ ] Document desktop commands and default offline login.
- [ ] Run `npm run test:ui`.
- [ ] Run `npm run desktop:build`.
- [ ] Run `npm run desktop:pack`.
- [ ] Verify the built app launches or packaging output exists.
