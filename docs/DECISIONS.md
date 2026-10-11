# Architecture Decision Record

## Accepted decisions

### D-001 — Windows-first desktop host

**Decision:** Build the initial vendor host using Electron + React + TypeScript, targeting Windows 10/11.
**Reason:** Existing local printing implementation is Windows-oriented; keep the MVP focused.

### D-002 — Supabase Auth + one vendor profile table

**Decision:** Use Supabase Auth for login/signup and `public.vendor_profiles` for vendor metadata. Do not create a custom password table.
**Reason:** Minimize setup and avoid handling passwords directly.

### D-003 — Persist vendor session locally

**Decision:** Use Supabase client session persistence (`persistSession: true`, `storage: localStorage`) so the app can restore login after closing/reopening.
**Constraint:** Logout should clear the session. Desktop app and PWA/browser origins maintain separate sessions.

### D-004 — Stable QR identity

**Decision:** QR URL must use a stable vendor slug, not a LAN IP or per-launch session token.
**Reason:** Vendor prints/sticks the QR at the shop; it must survive restarts and network changes.

### D-005 — Live relay, no file persistence

**Decision:** Use a public WebSocket relay to stream files to a connected vendor device. Do not store file contents in Supabase Storage or a persistent job queue.
**Reason:** User wants cross-network delivery without cloud file storage.

### D-006 — Offline means unavailable

**Decision:** If vendor is disconnected, reject/fail customer submission. No offline queue or delayed delivery.
**Reason:** User explicitly prefers live-only delivery and simplicity.

### D-007 — Relay over pure P2P for MVP

**Decision:** Use a relay server for cross-network connections.
**Reason:** Browser-to-laptop connections across NAT/firewalls are unreliable; a relay is simpler than WebRTC signaling and ICE handling.

## Not yet decided

- Production hosting provider and relay domain.
- Permanent public web domain and final customer route.
- Email confirmation policy in Supabase.
- Maximum concurrent customers per vendor is bounded by the vendor connection and local host capacity; transfers are independently keyed by `jobId`.
- Final supported file MIME types and print options.
- Exact end-to-end acknowledgement states and timeout values.
- Whether customer can see printer busy vs vendor offline.
