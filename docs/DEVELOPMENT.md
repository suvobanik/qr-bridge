# Development Setup and Troubleshooting

## Project folders

- Root: npm workspaces, Supabase migrations, and documentation.
- `vendor-desktop/src/ui/App.tsx`: vendor login/signup and dashboard.
- `vendor-desktop/src/lib/supabase.ts`: Supabase renderer client.
- `vendor-desktop/src/lib/vendorRelay.ts`: vendor WebSocket connection helper.
- `guest/src/guest.tsx`: customer upload page.
- `relay/`: Node.js WebSocket relay service.

## Environment files

Root `.env` (loaded by both Vite workspaces):

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
VITE_RELAY_URL=ws://localhost:47832/ws
VITE_GUEST_BASE_URL=https://printbridge.example
```

Relay `.env`:

```env
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SECRET_SERVICE_ROLE_KEY
PORT=47832
ALLOWED_ORIGINS=https://printbridge.example
MAX_CONNECTIONS=500
```

## Start locally

Terminal 1, project root:

```powershell
npm install
npm run dev
```

The guest app can be built independently with `npm run build:guest`; the
desktop renderer can be built and checked with `npm run build:desktop` and
`npm run typecheck`.

Terminal 2, relay:

```powershell
cd relay
npm install
npm run dev
```

Health check: open `http://localhost:47832/health`.

## Interpret health output

- `status: ok`: HTTP server is running.
- `onlineVendors: 0`: no authenticated vendor connection currently registered.
- `onlineVendors: 1`: one vendor socket is registered. This is only a connection check, not proof of transfer or printing.

## If the vendor stays offline

1. Confirm relay is running and health endpoint loads.
2. Confirm root `VITE_RELAY_URL` exactly matches relay URL, including `/ws`.
3. Restart Vite/Electron after changing `.env`.
4. Check browser/Electron dev console for WebSocket errors.
5. Check relay terminal for Supabase token/profile errors.
6. Confirm `SUPABASE_URL` and server-only service-role key are valid in `relay/.env`.
7. Confirm the vendor is logged in and has a valid Supabase session.

## Public deployment

A local `localhost` relay only works for processes on the same machine. Deploy the relay to a public WebSocket-capable host with TLS, set root `VITE_RELAY_URL` to `wss://.../ws`, set `VITE_GUEST_BASE_URL` to the HTTPS customer-page origin, and rebuild/redeploy the desktop app. Deploy `guest/` to Vercel with Root Directory `guest`, Build Command `npm run build`, and Output Directory `dist`. The QR format is `https://<guest-host>/v/<vendor-profile-slug>`.

## Windows packaging note

A prior packaging attempt failed while electron-builder extracted `winCodeSign` because Windows symlink privileges were unavailable. If that recurs, enable Windows Developer Mode or run the packaging terminal as Administrator, then clear the electron-builder `winCodeSign` cache and retry. This is a packaging environment issue, not evidence of a relay failure.
