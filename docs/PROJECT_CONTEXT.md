# Project Context — Source of Truth

## Goal
QR Print Bridge helps print vendors receive documents from customers who scan a QR code. The vendor should install/open the desktop app, sign in, and display the QR. The customer should not need to install an app or create an account.

## Required user journey
1. Vendor signs up or logs in through the desktop app.
2. Supabase restores the session after app restart unless the vendor logs out.
3. Vendor profile has a stable unique slug and public URL.
4. Vendor desktop app establishes a live connection to a publicly reachable relay.
5. Customer scans the stable QR URL on any network and opens the mobile web page.
6. Customer chooses a PDF/JPEG/PNG, chooses available print options, and submits.
7. If the vendor is online, the file streams through the relay to the vendor's desktop app.
8. The desktop app passes the file to its local print pipeline and reports the result.
9. If the vendor is offline or disconnects before the transfer completes, submission fails; no queued retry is stored.

## Non-goals for current MVP
- No customer account.
- No Supabase Storage for print documents.
- No persistent cloud job queue or offline job delivery.
- No same-Wi-Fi requirement.
- No requirement to use a phone app.
- No cross-platform printer implementation initially; Windows first.

## Stack
- Electron desktop application.
- React + TypeScript + Vite renderer.
- Supabase Auth + PostgreSQL `vendor_profiles` for identity/profile only.
- Node.js + Express + `ws` public relay.
- Existing Windows local print implementation behind Electron's preload bridge.

## Existing source facts supplied during this work
- `src/lib/supabase.ts` creates the Supabase client from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Auth config uses `persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: true`, and `storage: localStorage`.
- The UI is at `src/ui/App.tsx`, not `src/App.tsx`.
- `src/ui/App.tsx` has login/signup, calls `window.printHost.getState()`, creates a QR from `state.guestUrl`, and retains old local-host queue/approval UI.
- `src/lib/vendorRelay.ts` was created as a connection helper. Its current version sends `vendor:auth` with the access token and handles `vendor:ready` / `error` status messages, but it does not yet expose incoming print messages to the UI/print host.
- `relay/server.cjs` was created as an in-progress relay. It authenticates vendors, tracks live vendor sockets, resolves a customer's vendor slug from `vendor_profiles`, and forwards chunks in memory.
- The relay health endpoint reports `onlineVendors`. Seeing `1` means one vendor is connected to the relay; it is not an end-to-end test.
- Current QR generation remains based on `window.printHost.getState().guestUrl`, which is from the legacy local-network flow. Permanent cloud QR routing is not implemented yet.

## Known gaps / must not assume
- Customer page (`src/guest.tsx`) is not yet integrated with the WebSocket relay.
- Vendor incoming `print:start`, binary file chunks, `print:end`, cancellation, and print-result handling are not yet wired into the desktop print pipeline.
- A public stable customer route/page must be deployed separately from the desktop app.
- Production relay URL, TLS, deployment, domain, and origin policy are not yet established.
- End-to-end cross-network transfer has not been proven.
- The current relay protocol and code need security review before public exposure.
- Do not state that print files are guaranteed to be deleted from RAM instantly; describe the design as non-persistent/in-memory and ensure cleanup is implemented.
