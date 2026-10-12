# Relay Protocol

This is the implemented contract shared by `relay/server.cjs`, `vendor-desktop/src/lib/vendorRelay.ts`, and `guest/src/guest.tsx`.

## Connection

- Local development URL: `ws://localhost:47832/ws`
- Production URL: `wss://<public-relay-host>/ws`
- Vendor connects with `?role=vendor`, then sends JSON `vendor:auth` with a Supabase access token.
- Customer connects with `?role=customer&slug=<vendor-profile-slug>`.
- Relay resolves the slug server-side to the vendor's `auth.users.id`.

## JSON messages

### Vendor -> relay

```json
{ "type": "vendor:auth", "accessToken": "<Supabase access token>" }
{ "type": "print:accepted", "jobId": "<id>" }
{ "type": "print:result", "jobId": "<id>", "success": true, "message": "Print request completed" }
```

The vendor receiver maintains one local stream per `jobId` and sends terminal results correlated to that same ID.

### Customer -> relay

```json
{
  "type": "print:start",
  "name": "document.pdf",
  "mimeType": "application/pdf",
  "size": 12345,
  "options": { "copies": 1 }
}
{ "type": "print:end" }
{ "type": "print:cancel" }
```

The current relay allows `application/pdf`, `image/jpeg`, and `image/png`, with a maximum declared size of 25 MiB. These limits must be enforced again on the receiving desktop side.

### Relay -> customer

```json
{ "type": "connected" }
{ "type": "print:ready", "jobId": "<id>", "chunkSize": 262144 }
{ "type": "print:received", "jobId": "<id>" }
{ "type": "print:accepted", "jobId": "<id>" }
{ "type": "print:result", "jobId": "<id>", "success": true, "message": "..." }
{ "type": "error", "message": "..." }
```

### Relay -> vendor

```json
{ "type": "vendor:ready" }
{
  "type": "print:start",
  "jobId": "<id>",
  "name": "document.pdf",
  "mimeType": "application/pdf",
  "size": 12345,
  "options": { "copies": 1 }
}
{ "type": "print:end", "jobId": "<id>" }
{ "type": "print:cancel", "jobId": "<id>" }
```

Binary WebSocket messages from the customer are forwarded to the vendor as binary messages. Each vendor-bound frame is `[1-byte jobId length][UTF-8 jobId][chunk bytes]`; chunks are at most 256 KiB. Multiple customer transfers may be active on one vendor socket, and the vendor routes each frame by its job ID. The relay validates declared type/size, PDF/JPEG/PNG signatures, completion state, and a five-minute transfer deadline.

## Semantics and remaining deployment work

- `print:received` means the relay received the declared byte count and forwarded `print:end`; it is not a print result.
- `print:accepted` means the vendor assembled and accepted the file into its local job workflow.
- `print:result` is emitted only after the local approval/print path reaches a terminal state.
- The relay releases the active transfer on result, cancellation, disconnect, timeout, or forwarding failure.
- The vendor reconnects with the session token supplied by the current Supabase session. A long-running desktop session should still be tested across token refresh/expiry.
- Provider-level rate limiting and monitoring remain deployment responsibilities in addition to the relay connection cap and origin allowlist.
