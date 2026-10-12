# Implementation Plan

Implement in small, independently verifiable steps.

## Step 1 — Supabase Schema and Security

- Verify vendor_profiles, unique slug, and RLS.
- Create or verify the jobs table and required indexes.
- Create a private Storage bucket.
- Add ownership and access policies.
- Define upload limits and allowed file types.

**Exit criteria:** SQL applies successfully and cross-vendor access is denied.

## Step 2 — Guest Upload

- Generate stable guest URLs from vendor slugs.
- Check whether the vendor accepts jobs.
- Add customer print settings.
- Upload files to private Storage.
- Create a job record with metadata and options.

**Exit criteria:** A customer can upload a valid file and create one job for the correct vendor.

## Step 3 — Vendor Job Retrieval

- Fetch pending jobs at startup and login.
- Subscribe to relevant Realtime events.
- Fetch authoritative records after notifications.
- Add 60-second fallback polling only while Realtime is disconnected.
- Reconcile pending jobs after reconnect.

**Exit criteria:** New jobs appear and missed notifications do not lose jobs.

## Step 4 — Printing Integration

- Preserve existing approval and auto-approval behavior.
- Validate print settings.
- Apply supported settings through the Windows printing workflow.
- Add duplicate protection and failure recovery.
- Delete files after confirmed successful printing.

**Exit criteria:** End-to-end print tests pass without duplicate jobs or incorrect settings.

## Step 5 — Expiration Cleanup

- Add an authenticated GitHub Actions cleanup script.
- Store secrets in GitHub Actions secrets.
- Delete actual Storage objects older than 24 hours.
- Make cleanup safe to rerun.

**Exit criteria:** Expired files are deleted and recent files are retained.

## Step 6 — Deployment

- Deploy the guest page to Vercel.
- Configure production Supabase environment variables.
- Configure GitHub Actions secrets and schedule.
- Build and package the Windows application.
- Test the installed application on a clean Windows environment.

**Exit criteria:** Production upload, retrieval, approval, printing, and cleanup work.

## Step 7 — Abuse and Recovery Testing

Test vendor offline, invalid files, oversized files, duplicate submissions, remote use of a photographed QR, Realtime disconnects, printer failures, and Storage cleanup.

Do not mark the project production-ready until all critical paths are verified.
