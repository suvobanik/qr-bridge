create extension if not exists pgcrypto;

create table if not exists public.vendor_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  slug text not null unique,
  display_name text not null default 'Print Vendor',
  accepting_jobs boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.vendor_profiles
  add column if not exists accepting_jobs boolean not null default true;

alter table public.vendor_profiles enable row level security;

drop policy if exists "Public can view accepting vendor profiles" on public.vendor_profiles;
create policy "Public can view accepting vendor profiles"
  on public.vendor_profiles
  for select
  to anon, authenticated
  using (accepting_jobs = true);

drop policy if exists "Vendors can manage their profile" on public.vendor_profiles;
create policy "Vendors can manage their profile"
  on public.vendor_profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.vendor_profiles (id, slug, display_name)
  values (
    new.id,
    'vendor-' || replace(new.id::text, '-', ''),
    left(
      coalesce(
        nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
        'Print Vendor'
      ),
      80
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.vendor_profiles (id, slug, display_name)
select
  users.id,
  'vendor-' || replace(users.id::text, '-', ''),
  left(
    coalesce(
      nullif(trim(users.raw_user_meta_data ->> 'display_name'), ''),
      'Print Vendor'
    ),
    80
  )
from auth.users as users
where not exists (
  select 1
  from public.vendor_profiles as profiles
  where profiles.id = users.id
)
on conflict (id) do nothing;

create table if not exists public.print_jobs (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendor_profiles(id) on delete cascade,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png')),
  file_size bigint not null check (file_size between 1 and 26214400),
  print_settings jsonb not null default '{}'::jsonb check (jsonb_typeof(print_settings) = 'object'),
  status text not null default 'uploading' check (status in ('uploading', 'pending', 'queued', 'printing', 'printed', 'failed', 'rejected')),
  error_message text,
  result_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create index if not exists print_jobs_vendor_status_idx
  on public.print_jobs (vendor_id, status, created_at desc);
drop index if exists print_jobs_expiry_idx;
create index print_jobs_expiry_idx
  on public.print_jobs (expires_at)
  where status <> 'printed';

create or replace function public.set_print_jobs_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists print_jobs_set_updated_at on public.print_jobs;
create trigger print_jobs_set_updated_at
before update on public.print_jobs
for each row execute function public.set_print_jobs_updated_at();

alter table public.print_jobs enable row level security;

drop policy if exists "Vendors can view their print jobs" on public.print_jobs;
create policy "Vendors can view their print jobs"
  on public.print_jobs
  for select
  to authenticated
  using (vendor_id = auth.uid());

drop policy if exists "Vendors can update their print jobs" on public.print_jobs;
create policy "Vendors can update their print jobs"
  on public.print_jobs
  for update
  to authenticated
  using (vendor_id = auth.uid())
  with check (vendor_id = auth.uid());

drop policy if exists "Vendors can delete their print jobs" on public.print_jobs;
create policy "Vendors can delete their print jobs"
  on public.print_jobs
  for delete
  to authenticated
  using (vendor_id = auth.uid());

create or replace function public.reserve_guest_print_job(
  p_vendor_slug text,
  p_original_name text,
  p_mime_type text,
  p_file_size bigint,
  p_print_settings jsonb default '{}'::jsonb
)
returns table (job_id uuid, vendor_id uuid, storage_path text)
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_vendor uuid;
  new_job_id uuid := gen_random_uuid();
  safe_name text := regexp_replace(replace(p_original_name, chr(92), '/'), '^.*/', '');
begin
  if p_vendor_slug is null or length(trim(p_vendor_slug)) = 0 or length(p_vendor_slug) > 100 then
    raise exception 'Invalid vendor slug';
  end if;
  if p_original_name is null or length(safe_name) = 0 or length(safe_name) > 200 then
    raise exception 'Invalid file name';
  end if;
  if p_mime_type not in ('application/pdf', 'image/jpeg', 'image/png') then
    raise exception 'Unsupported file type';
  end if;
  if p_file_size is null or p_file_size < 1 or p_file_size > 26214400 then
    raise exception 'File must be between 1 byte and 25 MB';
  end if;
  if jsonb_typeof(coalesce(p_print_settings, '{}'::jsonb)) <> 'object' then
    raise exception 'Invalid print settings';
  end if;

  select id into selected_vendor
  from public.vendor_profiles
  where slug = p_vendor_slug and accepting_jobs = true;

  if selected_vendor is null then
    raise exception 'Print station is unavailable';
  end if;

  return query
  insert into public.print_jobs (
    id, vendor_id, storage_path, original_name, mime_type, file_size, print_settings
  )
  values (
    new_job_id,
    selected_vendor,
    selected_vendor::text || '/' || new_job_id::text || '/' || safe_name,
    safe_name,
    p_mime_type,
    p_file_size,
    coalesce(p_print_settings, '{}'::jsonb)
  )
  returning id, vendor_id, storage_path;
end;
$$;

revoke all on function public.reserve_guest_print_job(text, text, text, bigint, jsonb) from public;
grant execute on function public.reserve_guest_print_job(text, text, text, bigint, jsonb) to anon, authenticated;

create or replace function public.complete_guest_print_job(p_job_id uuid)
returns public.print_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  completed_job public.print_jobs;
begin
  update public.print_jobs as jobs
  set status = 'pending'
  where jobs.id = p_job_id
    and jobs.status = 'uploading'
    and exists (
      select 1
      from storage.objects
      where bucket_id = 'print-jobs'
        and name = jobs.storage_path
    )
  returning jobs.* into completed_job;

  if completed_job.id is null then
    raise exception 'Upload is missing or job is no longer active';
  end if;
  return completed_job;
end;
$$;

revoke all on function public.complete_guest_print_job(uuid) from public;
grant execute on function public.complete_guest_print_job(uuid) to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'print-jobs',
  'print-jobs',
  false,
  26214400,
  array['application/pdf', 'image/jpeg', 'image/png']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.can_upload_guest_print_job(p_storage_path text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.print_jobs
    where storage_path = p_storage_path
      and status = 'uploading'
  );
$$;

revoke all on function public.can_upload_guest_print_job(text) from public;
grant execute on function public.can_upload_guest_print_job(text) to anon, authenticated;

drop policy if exists "Guest uploads reserved print jobs" on storage.objects;
create policy "Guest uploads reserved print jobs"
  on storage.objects
  for insert
  to anon, authenticated
  with check (
    bucket_id = 'print-jobs'
    and public.can_upload_guest_print_job(name)
  );

drop policy if exists "Vendors can read their print files" on storage.objects;
create policy "Vendors can read their print files"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'print-jobs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Vendors can delete their print files" on storage.objects;
create policy "Vendors can delete their print files"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'print-jobs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'print_jobs'
  ) then
    alter publication supabase_realtime add table public.print_jobs;
  end if;
end;
$$;