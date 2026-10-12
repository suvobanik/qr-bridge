# Security Requirements

## Authentication and Ownership

- Vendors authenticate through Supabase Auth.
- Every job belongs to exactly one vendor.
- RLS restricts vendor data to its owner.
- A public slug identifies a shop but is not an authorization secret.

## File Uploads

- Private Storage bucket only.
- Allow PDF, JPEG, and PNG only.
- Enforce file size and request rate limits.
- Validate MIME type and file signature.
- Generate non-guessable storage paths.
- Prevent cross-vendor upload, download, listing, and deletion.

## Print Safety

- Treat customer print options as untrusted input.
- Enforce maximum copies, file size, and page limits.
- Validate page ranges and printer capabilities.
- Prevent duplicate queue insertion and duplicate printing.
- Auto-approval must obey vendor-configured safety limits.
- Provide an emergency pause/disable control.

## QR Abuse

A permanent QR can be photographed and used remotely. Do not treat QR possession as proof of physical presence.

Mitigations include active shop sessions, rate limits, per-session quotas, optional rotating codes, and vendor availability checks.

## Realtime and Recovery

Realtime notifications are not authoritative job records. Verify ownership and current status from Postgres before processing. Reconcile after reconnect and deduplicate jobs.

## Secrets

- Never expose the Supabase service-role key to guest pages, browser bundles, or Electron renderer code.
- Store cleanup credentials in GitHub Actions secrets.
- Limit cleanup credentials and operations to what is necessary.
- Never log access tokens or sensitive document contents.

## Retention

Delete Storage objects after successful printing and clean up expired files older than 24 hours. Cleanup must be idempotent and remove real objects.

## Failure Handling

On download, database, or printer errors, update job status accurately. Do not mark a file printed until the local print workflow confirms success.
