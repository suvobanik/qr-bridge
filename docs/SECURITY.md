# Security and Privacy Requirements

## Secrets
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_RELAY_URL` are renderer-visible configuration. Only public project URL and publishable/anon key belong there.
- `SUPABASE_SERVICE_ROLE_KEY` is a server-only secret in `relay/.env`. Never bundle it in Electron renderer files, expose it through preload, use a `VITE_` prefix, commit it, or log it.
- Ensure `.env`, `relay/.env`, build output, upload temp files, and credentials are excluded from version control as appropriate.

## Authentication and authorization
- Vendor socket must authenticate using Supabase Auth and only receive jobs for the matching vendor profile.
- Customer public slug is an identifier, not an authentication credential and not permission to change profile settings.
- Expose only public-safe vendor fields to anonymous clients.
- Never trust vendor IDs, job IDs, MIME types, file sizes, filenames, or print options supplied by a client without validation.
- Protect profile writes with RLS. Keep anon read access limited to the intended public lookup method/fields.

## File handling
- Current intended max file size: 25 MiB. Enforce limits at customer, relay, and vendor receiver.
- Current relay allowlist: PDF, JPEG, PNG. Verify actual file signatures/content, not just browser MIME declarations.
- Sanitize filenames; never use client filename as an unrestricted filesystem path.
- Stream with bounded memory/backpressure. Do not concatenate unbounded chunks into RAM.
- If temporary files are necessary for local printing, create them in a controlled directory, use random names, and delete them after the print pipeline finishes or fails.
- Do not persist customer files to Supabase Storage or a cloud job database.
- Do not log file content or sensitive document metadata unnecessarily.

## Relay abuse controls required before public deployment
- Rate limit connection attempts, upload starts, and total bytes per IP/vendor.
- Limit concurrent sockets and concurrent transfers.
- Enforce per-message payload limits and transfer deadlines/no-progress timeouts.
- Use HTTPS/WSS in production; never send credentials over plain public `ws://`.
- Set a deliberate CORS/origin policy for the HTTP page. WebSocket `Origin` must also be validated where appropriate; Origin alone is not authentication.
- Handle invalid slugs, unknown vendors, offline vendor, busy vendor, oversized files, malformed messages, disconnects, and internal errors safely.
- Avoid returning raw stack traces or secret-bearing error messages to clients.
- Do not deploy publicly until the current server code has been reviewed and these controls are implemented.

## Printing risk
Auto-Approve means untrusted public uploads may be printed automatically. Default it OFF, validate file types/content, limit rate/size, and require vendor approval unless the vendor knowingly enables automatic printing.

## Privacy claim
The design goal is non-persistent file forwarding, not “the relay never sees the file.” File bytes transit through the relay server and may exist briefly in process/network buffers. Do not promise end-to-end encryption between customer and vendor independent of the relay; WSS encrypts each connection to the relay, so the relay endpoint can access plaintext unless a separate end-to-end encryption scheme is designed.
