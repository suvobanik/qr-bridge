# Architecture Decisions

## D1 — Windows Desktop Printing

**Decision:** Keep Electron as the vendor-side printing application.

**Reason:** Printer access and printing remain local to the shop.

## D2 — Permanent Vendor QR

**Decision:** Use a stable URL based on a unique vendor slug.

**Reason:** The QR should survive logouts, restarts, and application updates.

## D3 — Supabase Storage

**Decision:** Use a private Supabase Storage bucket for temporary uploads.

**Reason:** Avoid maintaining a separate public file-transfer relay.

## D4 — Database as Source of Truth

**Decision:** Store job metadata and status in Postgres.

**Reason:** Pending jobs must survive missed notifications and application restarts.

## D5 — Realtime Plus Recovery

**Decision:** Use Supabase Realtime for job notifications. Fetch pending jobs on startup/reconnect and poll every 60 seconds only while Realtime is disconnected.

**Reason:** Reduce unnecessary database requests without losing jobs when notifications are missed.

## D6 — Temporary File Retention

**Decision:** Delete files after confirmed successful printing and run a 24-hour fallback cleanup through GitHub Actions.

**Reason:** Minimize retained customer documents.

## D7 — Customer Print Options

**Decision:** Allow customers to select supported print settings before submitting a job.

**Reason:** Reduce manual work for vendors.

**Constraint:** The desktop application must validate and apply options. Unsupported options must be reported clearly.

## D8 — Auto-Approval Safety

**Decision:** Auto-approval must respect configurable limits and vendor controls.

**Reason:** A permanent QR can be photographed and used remotely.

**Constraint:** A permanent QR does not prove physical presence. Active-session controls, quotas, and optional rotating codes may reduce abuse.

## D9 — Minimal Changes

**Decision:** Preserve existing UI, architecture, and printing workflow unless the requested feature requires a change.

**Reason:** Reduce regressions and implementation time.

## D10 — Deployment

**Decision:** Use Vercel for the guest page, Supabase for backend services, and GitHub Actions for scheduled cleanup.

**Constraint:** Free-tier quotas apply. No claim of unlimited usage or guaranteed zero cost is made.
