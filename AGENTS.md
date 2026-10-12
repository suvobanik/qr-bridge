# QR Print Bridge — Agent Instructions

## Product Goal

QR Print Bridge is a Windows desktop application for print shops. Customers scan a permanent vendor QR code, configure print settings, and upload PDF/JPG/PNG files through a browser. The vendor desktop app receives jobs, applies supported settings, and prints locally.

## Architecture

- **Frontend:** React + TypeScript + Vite.
- **Desktop:** Electron on Windows.
- **Authentication and database:** Supabase Auth + Postgres.
- **File storage:** Private Supabase Storage bucket.
- **Job notifications:** Supabase Realtime.
- **Recovery:** Fetch pending jobs on startup/reconnect; poll every 60 seconds only when Realtime is disconnected.
- **Guest hosting:** Vercel.
- **Cleanup:** Delete files after successful printing; GitHub Actions performs fallback deletion of files older than 24 hours.
- Do not introduce a separate relay server unless explicitly requested.

## Development Rules

1. Inspect relevant source files and documentation before editing.
2. Make the smallest change that solves the requested problem.
3. Preserve existing architecture, UI, naming, and printing workflow unless change is necessary.
4. Do not redesign, refactor unrelated code, add dependencies, or introduce features without approval.
5. Work in small, verifiable steps. Do not jump ahead.
6. Never claim code, deployment, SQL, or configuration was tested unless it actually was.
7. Distinguish implemented, tested, deployed, and manually configured functionality.
8. If a dashboard action, secret, or SQL migration is required, provide exact instructions.
9. Keep documentation synchronized with implementation.
10. Prefer concise responses and low-cost solutions.

## Security

- Never expose the Supabase service-role key in browser code, Electron renderer code, or public environment variables.
- Use a private Storage bucket and restrictive RLS policies.
- Every job must be associated with the correct vendor.
- Validate file type, size, job ownership, and print options.
- Treat Realtime messages as notifications, not authoritative job records.
- Prevent duplicate queue insertion and printing.
- Do not automatically print arbitrary remote jobs without the vendor's configured approval and safety limits.

## Print Settings

Customers may request copies, page range, orientation, color/grayscale, and duplex.
The desktop app must validate and apply supported options. Never silently claim an unsupported option was applied.

## Validation

After changes, run relevant type checks, builds, and tests. Report exact results and remaining manual steps. Do not proceed to the next implementation step until the current step is validated or its blockers are documented.
