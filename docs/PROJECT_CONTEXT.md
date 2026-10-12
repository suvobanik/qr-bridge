# Project Context

## Product

QR Print Bridge is a Windows-first application for stationery and print shops.

Customers scan a permanent vendor QR using any phone browser, upload PDF/JPG/PNG files, and choose supported print settings. The vendor desktop app receives jobs and prints them using the shop's local printer.

## Product Requirements

- No customer app installation.
- Permanent QR per vendor.
- Multiple customers can submit jobs.
- Vendor controls approval and auto-approval.
- Print settings are selected by the customer and validated by the vendor app.
- Files are temporarily stored in a private Supabase Storage bucket.
- Vendor jobs are persisted in Postgres.
- Realtime notifications are backed by startup/reconnect recovery.
- Fallback polling occurs only when Realtime is disconnected.
- Files are deleted after successful printing, with a 24-hour cleanup fallback.
- Keep costs and operational complexity low.

## Abuse Prevention

A permanent QR can be photographed and shared. It does not prove physical presence.

Use vendor availability/session controls, upload and print quotas, rate limits, file validation, and a vendor emergency pause. Consider rotating shop codes if stronger physical-presence checks are required.

## Development Philosophy

- Aggressive TLDR responses.
- One implementation step at a time.
- Minimal, targeted changes.
- Preserve existing UI and printing behavior.
- No unnecessary redesign or refactoring.
- Verify each step before moving on.
- Explicitly distinguish code changes from manual deployment steps.

## Current Migration

The existing project contains relay-based transfer code. The target is Supabase Storage + Postgres + Realtime + GitHub Actions cleanup. Remove old relay code only after the replacement path works and has been validated.
