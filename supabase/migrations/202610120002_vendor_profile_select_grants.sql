grant select on public.vendor_profiles to anon, authenticated;

grant select, update, delete on public.print_jobs to authenticated;

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
	returning
		public.print_jobs.id,
		public.print_jobs.vendor_id,
		public.print_jobs.storage_path;
end;
$$;