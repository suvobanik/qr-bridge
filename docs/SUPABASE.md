# Supabase Setup

## Tables
- `auth.users`: managed by Supabase Auth. Do not create a custom password/auth table.
- `public.vendor_profiles`: one profile per auth user.

Expected profile fields:
- `id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`
- `slug TEXT UNIQUE NOT NULL`
- `display_name TEXT NOT NULL`
- `created_at TIMESTAMPTZ NOT NULL`

The SQL used in this project created a trigger to add a vendor profile after signup, generating a stable unique slug. Confirm the trigger exists in the actual Supabase project before relying on it.

## Client setup
`src/lib/supabase.ts` reads:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Session settings currently used:
- `persistSession: true`
- `autoRefreshToken: true`
- `detectSessionInUrl: true`
- `storage: localStorage`

Supabase Auth should handle passwords. Never store plaintext passwords in `vendor_profiles` or elsewhere.

## Relay server setup
The relay uses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in its private server environment to validate vendor tokens and look up vendor slugs. The service-role key bypasses RLS; only use it server-side and only for narrowly defined operations.

## Access policy principles
- Vendors may read/update only their own profile under RLS.
- Anonymous customer lookup must expose only public-safe vendor information.
- Do not expose email, auth metadata, account settings, or other private data in the public lookup.
- A slug is not authorization for vendor management.
- Never let a customer submit a vendor UUID and have the server trust it; resolve the stable slug on the server.

## Email confirmation
Signup may return no active session when email confirmation is enabled. The UI should tell the vendor to confirm email and then log in. Test both confirmation-enabled and confirmation-disabled behavior in the real project.
