# Implementation Plan — One Step at a Time

Keep changes small and test each step before continuing.

## Phase 1 — Vendor connection foundation

- [x] Create `relay/package.json` and install dependencies.
- [x] Create initial `relay/server.cjs`.
- [x] Create `src/lib/vendorRelay.ts` connection helper.
- [x] Confirm helper is present in the real working tree and TypeScript compiles.
- [x] Integrate relay status into `src/ui/App.tsx` and confirm status reflects connection lifecycle.
- [x] Reconnect with the current Supabase session and clean logout.

## Phase 2 — Stable vendor identity / QR

- [ ] Verify the signup trigger creates `vendor_profiles` for every new auth user.
- [x] Add a safe way to load the authenticated vendor's slug.
- [x] Define stable public route: `https://<customer-domain>/v/<slug>`.
- [x] Generate QR from that public URL, not `window.printHost.getState().guestUrl`.
- [ ] Add a public-safe vendor lookup that reveals only necessary fields.

## Phase 3 — Customer live connection

- [x] Update `src/guest.tsx` to read vendor slug from route/query.
- [x] Connect to relay with `role=customer&slug=<slug>`.
- [x] Show online/unavailable/busy states clearly.
- [x] Reject submission immediately if vendor is offline.
- [x] Validate file extension, MIME type, and size client-side (server validates independently).

## Phase 4 — Live file streaming

- [x] Implement `print:start` metadata exchange.
- [x] Send file as bounded binary chunks (target 256 KiB per chunk).
- [x] Implement relay backpressure and upload deadlines.
- [x] Implement vendor-side binary receiver and bounded assembly/streaming.
- [x] Connect received file to existing Electron print IPC/local service.
- [x] Support cancellation and cleanup on disconnect/error.
- [x] Make transfer state machine reject out-of-order, duplicate, or excess messages.

## Phase 5 — Printing and acknowledgements

- [x] Respect Auto-Approve OFF by requiring vendor approval before printing.
- [x] Respect Auto-Approve ON only after safety validation and vendor opt-in.
- [x] Report separate states: upload complete, awaiting approval, printing, print command completed, failed/rejected.
- [x] Do not call a job “printed” just because bytes arrived at the relay.
- [x] Release vendor busy state on every terminal path.

## Phase 6 — Deployment and security

- [ ] Deploy relay to a public WebSocket-capable host with TLS/WSS.
- [ ] Host customer page over HTTPS.
- [x] Add rate limits, concurrent connection limits, per-vendor quotas, and timeouts.
- [x] Add MIME/signature validation and safe temporary-file cleanup.
- [x] Validate WebSocket origins and HTTP request behavior.
- [ ] Keep service-role key only in relay server environment.
- [ ] Run cross-network test using phone mobile data and vendor on a different network.
- [ ] Test vendor offline, busy, network loss mid-upload, oversized file, invalid file, rejected job, printer failure, and app restart.

## Definition of done

A customer on a different network can scan a stable QR and send a supported file to a connected vendor app; the relay does not persist the file; offline vendor requests fail clearly; the local print workflow honors approval settings; and the flow has been tested end-to-end with documented limitations.
