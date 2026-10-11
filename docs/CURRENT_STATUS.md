# Current Implementation Status

Last updated: 2026-10-12

## Confirmed from source and local checks

- [x] Root React app contains Supabase login/signup UI in `src/ui/App.tsx`.
- [x] `src/lib/supabase.ts` uses Supabase Auth and persistent local session settings.
- [x] Vendor signup passes `display_name` as user metadata.
- [x] `src/lib/vendorRelay.ts` receives concurrent metadata/chunks, routes framed data by `jobId`, streams each file through Electron IPC, and reports accepted/print results.
- [x] `relay/server.cjs` authenticates vendors, resolves public slugs, forwards independently keyed bounded chunks, validates signatures, and handles transfer cleanup.
- [x] Multiple customers can upload concurrently to one vendor; job-ID framing prevents chunk mixing or overwrites.
- [x] `src/guest.tsx` connects using `/v/<slug>` and streams PDF/JPEG/PNG files.
- [x] Dashboard QR generation uses `vendor_profiles.slug` and `VITE_GUEST_BASE_URL`.
- [x] `npm.cmd run build` and Node syntax checks pass locally.

## In progress / not yet end-to-end verified

- [ ] Supabase profile RLS/trigger is verified in the deployed project.
- [ ] Public relay deployment with TLS/WSS is configured.
- [ ] Public customer page is hosted on HTTPS.
- [ ] End-to-end test across different networks is completed.
- [ ] Provider-level rate limiting and monitoring are configured before public use.

## Existing legacy functionality preserved

- `window.printHost.getState()` and local host service.
- Existing printer selection display, Auto-Approve toggle, local job queue, approve/reject actions.
- Existing local guest HTTP routes remain in the Electron host for backward compatibility, but the permanent QR now targets the public relay page.

## Test meaning

- `GET /health` returning `{ "status": "ok", "onlineVendors": 1 }` confirms the relay sees one vendor socket in its in-memory map.
- It does **not** confirm customer connection, file transfer, file assembly, print job creation, or physical printing.
