# Supabase Setup

## Services Used

- Supabase Auth for vendor accounts.
- Postgres for vendor profiles and job metadata.
- Private Storage bucket for temporary files.
- Realtime for job-change notifications.

## Required Data

### vendor_profiles

- `id`: vendor user ID referencing `auth.users`.
- `slug`: unique, permanent public identifier.
- `display_name`: vendor/shop name.
- `created_at`: creation timestamp.

### jobs

The final schema must include:

- Unique job ID.
- Vendor owner ID.
- Storage object path.
- Original filename, MIME type, and size.
- Requested print options.
- Job status.
- Created, updated, and expiry timestamps.
- Error/result information where appropriate.

Finalize exact types and constraints in the migration SQL before implementation.

The initial migration is `supabase/migrations/202610120001_storage_jobs.sql`.
It creates `print_jobs`, adds `vendor_profiles.accepting_jobs`, and enables the
`print-jobs` private bucket. Apply it in the Supabase SQL Editor before implementing
the guest Storage upload or vendor Realtime consumer.

The migration uses `status = 'uploading'` while a guest upload is in progress.
The guest client must call `reserve_guest_print_job(...)`, upload to the returned
`storage_path`, and then call `complete_guest_print_job(...)`. The completion RPC
only changes the job to `pending` when the object exists, which prevents an
anonymous client from creating an arbitrary vendor job through direct table access.

## Storage

Create a private `print-jobs` bucket for uploads. Use object paths scoped to
`<vendor-id>/<job-id>/<filename>`; the UUID job ID makes the path non-guessable.
Do not make uploaded files public.

Authorize upload, download, and deletion through appropriate RLS policies or a trusted server-side process. Never expose the service-role key in frontend code.

## Realtime

Subscribe only to the records/events needed by the signed-in vendor. Notifications should contain identifiers, not file contents or long-lived access tokens.

After a notification, fetch the authoritative job record. Fetch pending jobs on startup and reconnect.

## Security Verification

- Vendor A cannot read or download Vendor B's files.
- Guest uploads cannot create arbitrary jobs for another vendor.
- File size, MIME type, and file signatures are validated.
- Print options and job status transitions are validated.
- Anonymous users cannot list the bucket.
- Service-role credentials remain server-side.

## Dashboard and deployment setup

1. Open Supabase Dashboard -> SQL Editor and run the migration file once.
2. Confirm Storage -> `print-jobs` is private and accepts only PDF, JPEG, and PNG up to 25 MiB.
3. Enable `print_jobs` in Database -> Publications if the migration cannot update the `supabase_realtime` publication automatically.
4. Keep `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` limited to the publishable/anon values. Do not add a service-role key to Vite, Electron, or any browser environment.

The later cleanup workflow will require `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` as GitHub Actions secrets. Those secrets are not
needed for this migration and must not be committed.

## Retention

Delete the actual Storage object after confirmed successful printing. A scheduled GitHub Actions workflow deletes objects older than 24 hours as a fallback.

Do not assume deleting a job row deletes the corresponding Storage object.
