# QR Print Bridge

QR Print Bridge is a Windows-first print station for stationery shops and cybercafés. A vendor runs a desktop app and displays a stable QR code. Customers scan it on their phones, upload a supported document, and send it to the vendor's live desktop session for local printing.

## Product rules

- Customer and vendor can be on different networks.
- Vendor must have the desktop app open and connected. If offline, the customer submission fails; there is no offline queue.
- Supabase handles vendor login, private temporary file storage, and the print
  job queue.
- Customer documents are deleted after a successful print; expired uploads are
  cleaned up separately.
- The WebSocket relay remains available as a temporary fallback while the
  Supabase job flow is verified.
- The vendor's computer prints through its locally configured Windows printer.

## Current implementation status

The Supabase upload and vendor job-consumer flow is implemented alongside the
temporary relay fallback. A real phone-on-mobile-data to vendor-on-another-
network print test is still required before calling the product end-to-end
verified.

See:

- [`AGENTS.md`](AGENTS.md) — rules for future coding agents
- [`docs/PROJECT_CONTEXT.md`](docs/PROJECT_CONTEXT.md) — source of truth for product and current state
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — target architecture
- [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) — next steps

## Project structure (observed)

```text
src/
  guest.tsx
  main.tsx
  vite-env.d.ts
  lib/
    supabase.ts
    vendorRelay.ts
  ui/
    App.tsx
    guest.css
    styles.css
relay/
  package.json
  server.cjs
```

The `relay/` files were created during implementation. Check the actual repository before assuming every listed file exists.

## Environment variables

### Root `.env` (Vite/desktop renderer)

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
VITE_RELAY_URL=ws://localhost:47832/ws
VITE_GUEST_BASE_URL=https://printbridge.example
```

Use `ws://` only for local development. Production should use `wss://` with a publicly reachable TLS endpoint, and `VITE_GUEST_BASE_URL` should be the HTTPS domain hosting `guest.html`. Vite environment variables are exposed to the client; never put a service-role/secret key in a `VITE_*` variable.

### `relay/.env` (server only)

```env
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SECRET_SERVICE_ROLE_KEY
PORT=47832
ALLOWED_ORIGINS=https://printbridge.example
MAX_CONNECTIONS=500
```

Keep `relay/.env` private and out of version control. The service-role key must never be shipped with the desktop app or customer web page.

## Development

From project root:

```powershell
npm install
npm run dev
```

In another terminal, run the relay:

```powershell
cd relay
npm install
npm run dev
```

Check relay health locally at `http://localhost:47832/health`. `onlineVendors: 1` means one vendor WebSocket is registered with the relay; it does not prove customer upload or printing works.

## Supabase

Supabase Auth owns password handling and sessions. `src/lib/supabase.ts` configures persistent sessions. The `public.vendor_profiles` table links its `id` to `auth.users.id` and has a unique `slug` used for public vendor identity. The signup trigger should create a profile automatically; verify it exists in the actual Supabase project.

## Existing local printing behavior

The current Electron host code includes a local print server and print integration. Some of that legacy code may remain while the live relay path is built. Do not remove it until the replacement path is integrated and tested.

## Before public deployment

Before public deployment, confirm the hosting provider supports WebSockets and configure TLS (`wss://`). Set `ALLOWED_ORIGINS` to the customer HTTPS origin, review provider-level rate limits, and test offline, disconnect, oversized, invalid-signature, approval, and printer-failure paths.
