# Architecture

## Overview

QR Print Bridge consists of a customer-facing web page, a Windows Electron application, and Supabase services.

## Components

- **Guest page:** Hosted on Vercel. Customers scan a permanent vendor QR, select print options, and upload supported files.
- **Vendor application:** Electron + React. Handles authentication, printer selection, job review, approval, local downloading, and printing.
- **Supabase Auth:** Authenticates vendors.
- **vendor_profiles:** Stores vendor identity, display name, and permanent unique slug.
- **Supabase Storage:** Stores uploaded files temporarily in a private bucket.
- **Postgres jobs table:** Stores job metadata, requested print options, vendor ownership, timestamps, and status.
- **Supabase Realtime:** Notifies the vendor when job records change.
- **GitHub Actions:** Runs scheduled cleanup for files older than 24 hours.

## Upload and Print Flow

1. Customer opens the permanent URL `/v/<vendor-slug>`.
2. Guest page verifies that the vendor is accepting jobs.
3. Customer selects a file and print options.
4. The upload is authorized and the file is stored in the private bucket.
5. A job record is created with vendor ID, storage path, file metadata, print options, and initial status.
6. Realtime notifies the vendor application.
7. The vendor fetches authoritative job data from Postgres.
8. The desktop application validates and deduplicates the job.
9. The existing approval/auto-approval rules determine whether it can print.
10. The desktop app downloads the file, applies supported print settings, and prints locally.
11. After confirmed successful printing, the app deletes the Storage object and updates job status.

## Recovery

- Fetch pending jobs on startup and after reconnect.
- Reconcile pending jobs after Realtime reconnects.
- Poll every 60 seconds only while Realtime is disconnected.
- Never rely exclusively on notifications for job delivery.
- Prevent duplicate queue insertion and repeated printing.

## Expiration

GitHub Actions periodically deletes Storage objects older than 24 hours as a fallback. Cleanup must remove actual Storage objects, not only database rows.

## Trust Boundaries

- Browser clients are untrusted.
- Vendors can access only their own jobs and files.
- Realtime messages are signals, not proof of authorization.
- File metadata and print options must be validated before printing.
- Physical printer operations remain local to the vendor's Windows machine.

## Deployment

- Guest page: Vercel.
- Authentication, database, Realtime, and Storage: Supabase.
- Cleanup workflow: GitHub Actions.
- Printing: vendor's Windows desktop application.

This architecture is the target design. Features are not considered implemented until verified in source code and tested.
