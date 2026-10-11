# Agent Instructions — QR Print Bridge

## Mission
Build a simple Windows-first print station. A vendor signs in to the desktop app, leaves it running, and displays a permanent vendor QR code. A customer scans it on a phone, selects a PDF/image and print options, and submits. The customer's file should be streamed live to the vendor's running desktop app, which uses the local Windows printer.

## Hard product constraints
- Keep the product simple; vendor setup should be minimal.
- Customers must be able to use any network. Do not require the customer's phone and vendor laptop to share Wi-Fi.
- Vendor QR/URL must be stable across app restarts; do not use per-launch LAN IPs or session tokens in the permanent QR.
- Supabase is for vendor authentication and vendor profile identity only. Do not use Supabase Storage for customer files.
- Do not create a persistent print-job database or offline queue for this MVP.
- If the vendor desktop app is not connected, customer submission must fail with a clear unavailable message. Do not claim a job was accepted when it was not.
- Files may pass through a relay in transit, but the relay must not persist them to disk or object storage.
- Windows is the initial target. Preserve the existing Electron + React + TypeScript architecture unless a change is necessary.
- Keep the user's aggressive TLDR preference: concise, direct, one step at a time. Do not jump ahead or rewrite unrelated areas.

## Working rules for agents
1. Before changing code, inspect `README.md`, this file, and the relevant files under `docs/`.
2. Inspect the actual current source. Do not assume prior assistant-generated snippets were successfully pasted or that the repository matches a prior ZIP.
3. Make one coherent change at a time. State exactly which files to edit and provide complete code for each requested file when asked.
4. Preserve existing UI and working behavior unless the task explicitly changes it.
5. Never invent filenames, APIs, IPC methods, environment variables, or database columns. Confirm them in source first.
6. Do not expose `SUPABASE_SERVICE_ROLE_KEY` in any `VITE_*` variable, renderer code, customer page, committed file, or logs.
7. Validate message type, vendor identity, MIME type, file size, and transfer state on the server. Treat all customer input as untrusted.
8. Do not trust client-supplied vendor IDs. Resolve the vendor using the permanent public slug and the authenticated vendor session.
9. Do not log document bytes, access tokens, passwords, or customer file contents.
10. Do not claim file transfer or printing works until an end-to-end test has passed. `print:received` means relay receipt only; a printer result is a separate state.
11. After edits, run available typecheck/build/tests and report what was actually run and what remains unverified.
12. Keep docs updated when architecture, protocol, environment variables, or implementation status changes.

## Current architecture target
- Desktop host: Electron + React + TypeScript; uses existing `window.printHost` preload bridge for local print operations.
- Vendor identity: Supabase Auth plus `public.vendor_profiles`.
- Customer page: browser page, no customer account required.
- Live connection: WebSocket relay hosted publicly, using `wss://` in production.
- File flow: customer browser -> relay memory/buffers -> connected vendor desktop -> local print handling.
- No offline queue or durable file/job storage.

## Current caveats
The relay and client code are in-progress. The customer page has not yet been integrated with the relay. The vendor helper currently handles connection status but not incoming print messages. The existing dashboard QR still comes from `window.printHost.getState()` and is the old local-network URL. Do not describe cross-network printing as complete.
