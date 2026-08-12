# Offline Desktop EXE Design

## Goal

Build a Windows desktop version of the student growth archive system that runs without network access and can be packaged as an EXE for teachers to use on a single computer.

## Scope

The first desktop release keeps the existing teacher-facing React UI and document export workflow. Cloudflare Worker and D1 remain in the repository for future web deployment, but the desktop runtime uses Electron and local file persistence.

## Architecture

The React app keeps calling the existing `api(path, init)` helper. In a browser/web deployment, `api()` continues to call `/api`. In Electron, `api()` detects the preload bridge and sends requests to the main process. The main process owns local persistence, validates requests, and returns JSON-shaped responses matching the current API contracts.

Local data is stored in the Electron `userData` directory as `archive-data.json`. The file contains students, tags, score subjects, scores, study records, and course records. A lightweight repository module handles ids, timestamps, cascading deletes, sorting, and archive aggregation.

## Data Model

The local JSON model mirrors the shared TypeScript contracts:

- `students` include basic profile fields and tag links.
- `tags` are unique by case-insensitive name.
- `scoreSubjects` starts with the default subjects and supports custom subjects.
- `scores` include dynamic `values`; empty score subjects are not exported.
- `studyRecords` and `courseRecords` keep the existing notebook workflows.

## Desktop Behavior

The desktop version keeps a simple login gate for familiarity. It accepts the default local account and does not require internet:

- Username: `archive-admin`
- Password: `archive-admin`

This is not strong security. It is only a local entry screen for a single-machine internal tool. Real multi-user access should be handled later by the cloud version.

## Packaging

Use Electron for the desktop shell and `electron-builder` for Windows packaging. The generated installer or portable EXE should include the built Vite assets and local main/preload scripts.

## Future Web Path

The desktop API bridge deliberately keeps the existing API surface. Later, the same React UI can still target a cloud API for parent lookup pages, teacher web access, or mini-program integration. Future cloud sync should be added as a separate feature instead of coupling parent access to the offline app.

## Testing

Verification must cover:

- Typecheck and existing UI tests.
- Electron main-process repository tests for local CRUD and archive aggregation.
- Production Vite build.
- Electron packaging command or at least a packaged directory build if installer tooling is unavailable.
