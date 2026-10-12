# Current Status

## Target Architecture

- **Desktop:** Electron + React + TypeScript (Windows)
- **Auth / Database:** Supabase Auth + Postgres
- **File storage:** Private Supabase Storage
- **Notifications:** Supabase Realtime + fallback polling
- **Guest page:** Vercel
- **Cleanup:** GitHub Actions (24-hour expiry fallback)

## Existing Implementation

- Vendor authentication and dashboard
- Vendor profile slug and permanent QR generation
- Existing local print workflow and approval controls
- Legacy WebSocket relay implementation

Revalidate these against the current source before relying on them.

## Migration Status

- [x] Add the initial Supabase schema, private Storage bucket, ownership RLS migration (not applied to a project yet)
- [x] Implement customer upload to Storage and job creation
- [x] Implement vendor job retrieval and Realtime notifications
- [x] Add startup/reconnect recovery and disconnected-only polling
- [ ] Apply customer print settings through Windows printing
- [ ] Prevent duplicate jobs and duplicate printing
- [ ] Delete files after successful printing
- [ ] Add GitHub Actions cleanup for files older than 24 hours
- [ ] Deploy guest page to Vercel
- [ ] Build and test the Windows installer
- [ ] Complete cross-network end-to-end testing

The first migration is stored at `supabase/migrations/202610120001_storage_jobs.sql`.
It is intentionally independent of the current WebSocket relay, which remains the
active upload and printing path until the replacement flow is implemented and tested.

## Known Risks

- A permanent QR does not prove physical presence.
- Realtime, Storage, database, and bandwidth have plan limits.
- Printer capabilities vary by hardware and driver.
- Free-tier hosting does not guarantee uninterrupted availability.

## Definition of Done

A customer scans the permanent QR, uploads a valid file, and selects supported print settings. The correct vendor receives the job, applies approval rules, prints it locally, and deletes the file. Missed notifications, duplicate submissions, unauthorized access, and expired uploads are handled safely.

Only mark a task complete after implementation and verification. Clearly distinguish local tests from production tests.
