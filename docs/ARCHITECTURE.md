# Architecture

## Target topology

```text
Customer phone browser
  | HTTPS page; WSS live connection using public vendor slug
  v
Public WebSocket relay (stateless for file content)
  | vendor WebSocket; authenticated with Supabase access token
  v
Vendor Electron desktop app
  | controlled IPC/preload bridge
  v
Windows local print service -> configured printer

Supabase Auth + vendor_profiles
  └── vendor account and stable public vendor slug only
```

## Components

### Supabase

- Auth manages credentials and session lifecycle.
- `public.vendor_profiles.id` references `auth.users.id`.
- `slug` is unique and stable; it is the public routing identity used in the QR URL.
- Only public-safe fields such as `slug` and `display_name` should be exposed to anonymous customers.
- No customer document storage, job table, or offline queue.

### Vendor desktop app

- Restores Supabase session across app restarts.
- Connects to relay using the current access token.
- Receives a stream only when the vendor is connected and available.
- Uses existing Electron preload APIs for local printing; renderer code should not access Node APIs directly.
- Must report accepted/failed/printed status distinctly.

### Customer page

- Served from a public HTTPS domain.
- URL contains stable vendor slug, for example `https://printbridge.example/v/vendor-some-slug`.
- Does not require customer login.
- Checks live availability and fails clearly when vendor is offline.
- Uploads supported file bytes in chunks through WSS. It must not claim a successful submission until the protocol confirms the intended stage.

### Relay

- Hosted on a public service that supports persistent WebSocket connections and TLS.
- Authenticates vendor socket using Supabase Auth.
- Resolves a public slug to a vendor ID; never trusts a client-provided vendor ID.
- Tracks active vendor connections in memory.
- Routes customer messages/chunks to the matching live vendor.
- Does not write file bytes to disk, Supabase Storage, or a database.
- Disconnects/aborts active transfer when either endpoint closes.

## File transfer shape

1. Customer opens `wss://relay-host/ws?role=customer&slug=<public-slug>`.
2. Relay rejects unknown slug or unavailable vendor.
3. Customer sends `print:start` metadata: filename, MIME type, byte size, options.
4. Relay validates metadata and registers the transfer under its generated `jobId`.
5. Relay sends `print:start` to vendor.
6. Customer sends binary chunks (maximum 256 KiB).
7. Relay forwards each chunk to vendor with a job-ID binary frame, without persistent storage.
8. Customer sends `print:end`; relay checks declared bytes equal received bytes.
9. Vendor acknowledges transfer completion and passes file to local print pipeline.
10. Vendor reports a separate print result. Both sides release the transfer state.

Each customer connection owns at most one upload, while a vendor socket may carry multiple uploads concurrently. The precise acknowledgement ordering is implemented consistently across relay, customer, and vendor clients.

## Availability semantics

- `online` means the vendor socket is connected and authenticated.
- `available` means the vendor socket is connected; multiple active transfers are allowed. Printer capacity and local print queue state remain separate.
- `offline` means no live vendor connection is registered.
- Connection presence is not a guarantee that the printer is online or can print.

## Why use a relay

A customer browser cannot reliably reach a vendor laptop's private LAN address across arbitrary networks. A public WebSocket relay allows both endpoints to create outbound connections. The relay forwards bytes but need not persist them. A pure peer-to-peer WebRTC design is not the chosen initial MVP because it adds signaling and NAT traversal complexity.
