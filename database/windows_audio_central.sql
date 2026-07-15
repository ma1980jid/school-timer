-- Central Windows audio management for School Timer.
-- Safe scope: creates new tables, functions, policies, and one Storage bucket.
-- It does not alter schools, schedules, timer settings, or school-facing tables.

begin;

create extension if not exists pgcrypto;

create sequence if not exists public.windows_audio_release_version_seq start 1;

create table if not exists public.windows_audio_releases (
  id uuid primary key default gen_random_uuid(),
  version_number bigint not null default nextval('public.windows_audio_release_version_seq'),
  title text not null,
  notes text,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  manifest jsonb not null default '{}'::jsonb
    check (jsonb_typeof(manifest) = 'object'),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  unique (version_number)
);

create table if not exists public.windows_audio_assets (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.windows_audio_releases(id) on delete cascade,
  asset_key text not null,
  kind text not null check (kind in ('system_event', 'guidance')),
  category text not null,
  title_ar text not null,
  storage_path text not null,
  mime_type text not null default 'audio/mpeg',
  file_size_bytes bigint not null check (file_size_bytes > 0),
  duration_seconds numeric(10,3) check (duration_seconds is null or duration_seconds > 0),
  checksum_sha256 text check (checksum_sha256 is null or checksum_sha256 ~ '^[0-9a-f]{64}$'),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique (release_id, asset_key),
  unique (release_id, storage_path)
);

create table if not exists public.windows_audio_settings (
  id smallint primary key default 1 check (id = 1),
  active_release_id uuid references public.windows_audio_releases(id) on delete set null,
  default_profile_key text not null default 'end_only'
    check (default_profile_key in ('end_only', 'start_and_end')),
  updated_by uuid default auth.uid(),
  updated_at timestamptz not null default now()
);

create table if not exists public.windows_school_audio_profiles (
  school_slug text primary key,
  profile_key text not null
    check (profile_key in ('end_only', 'start_and_end')),
  updated_by uuid default auth.uid(),
  updated_at timestamptz not null default now()
);

create index if not exists windows_audio_assets_release_idx
  on public.windows_audio_assets(release_id, kind, sort_order);

create unique index if not exists windows_audio_single_published_idx
  on public.windows_audio_releases(status)
  where status = 'published';

insert into public.windows_audio_settings (id, default_profile_key)
values (1, 'end_only')
on conflict (id) do nothing;

create or replace function public.is_windows_programmer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() = '1e32db69-d286-49c7-8a56-3e6eb7b02590'::uuid;
$$;

create or replace function public.touch_windows_audio_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists windows_audio_releases_touch on public.windows_audio_releases;
create trigger windows_audio_releases_touch
before update on public.windows_audio_releases
for each row execute function public.touch_windows_audio_updated_at();

drop trigger if exists windows_audio_settings_touch on public.windows_audio_settings;
create trigger windows_audio_settings_touch
before update on public.windows_audio_settings
for each row execute function public.touch_windows_audio_updated_at();

drop trigger if exists windows_school_audio_profiles_touch on public.windows_school_audio_profiles;
create trigger windows_school_audio_profiles_touch
before update on public.windows_school_audio_profiles
for each row execute function public.touch_windows_audio_updated_at();

alter table public.windows_audio_releases enable row level security;
alter table public.windows_audio_assets enable row level security;
alter table public.windows_audio_settings enable row level security;
alter table public.windows_school_audio_profiles enable row level security;

drop policy if exists windows_audio_releases_read on public.windows_audio_releases;
create policy windows_audio_releases_read
on public.windows_audio_releases
for select
to anon, authenticated
using (status = 'published' or public.is_windows_programmer());

drop policy if exists windows_audio_releases_programmer_write on public.windows_audio_releases;
create policy windows_audio_releases_programmer_write
on public.windows_audio_releases
for all
to authenticated
using (public.is_windows_programmer())
with check (public.is_windows_programmer());

drop policy if exists windows_audio_assets_read on public.windows_audio_assets;
create policy windows_audio_assets_read
on public.windows_audio_assets
for select
to anon, authenticated
using (
  public.is_windows_programmer()
  or exists (
    select 1
    from public.windows_audio_releases release
    where release.id = windows_audio_assets.release_id
      and release.status = 'published'
  )
);

drop policy if exists windows_audio_assets_programmer_write on public.windows_audio_assets;
create policy windows_audio_assets_programmer_write
on public.windows_audio_assets
for all
to authenticated
using (public.is_windows_programmer())
with check (public.is_windows_programmer());

drop policy if exists windows_audio_settings_read on public.windows_audio_settings;
create policy windows_audio_settings_read
on public.windows_audio_settings
for select
to anon, authenticated
using (true);

drop policy if exists windows_audio_settings_programmer_write on public.windows_audio_settings;
create policy windows_audio_settings_programmer_write
on public.windows_audio_settings
for all
to authenticated
using (public.is_windows_programmer())
with check (public.is_windows_programmer());

drop policy if exists windows_school_audio_profiles_read on public.windows_school_audio_profiles;
create policy windows_school_audio_profiles_read
on public.windows_school_audio_profiles
for select
to anon, authenticated
using (true);

drop policy if exists windows_school_audio_profiles_programmer_write on public.windows_school_audio_profiles;
create policy windows_school_audio_profiles_programmer_write
on public.windows_school_audio_profiles
for all
to authenticated
using (public.is_windows_programmer())
with check (public.is_windows_programmer());

grant usage, select on sequence public.windows_audio_release_version_seq to authenticated;
grant select on public.windows_audio_releases to anon, authenticated;
grant insert, update, delete on public.windows_audio_releases to authenticated;
grant select on public.windows_audio_assets to anon, authenticated;
grant insert, update, delete on public.windows_audio_assets to authenticated;
grant select on public.windows_audio_settings to anon, authenticated;
grant insert, update, delete on public.windows_audio_settings to authenticated;
grant select on public.windows_school_audio_profiles to anon, authenticated;
grant insert, update, delete on public.windows_school_audio_profiles to authenticated;
grant execute on function public.is_windows_programmer() to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'windows-audio',
  'windows-audio',
  true,
  15728640,
  array['audio/mpeg', 'audio/mp3']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists windows_audio_objects_public_read on storage.objects;
create policy windows_audio_objects_public_read
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'windows-audio');

drop policy if exists windows_audio_objects_programmer_insert on storage.objects;
create policy windows_audio_objects_programmer_insert
on storage.objects
for insert
to authenticated
with check (bucket_id = 'windows-audio' and public.is_windows_programmer());

drop policy if exists windows_audio_objects_programmer_update on storage.objects;
create policy windows_audio_objects_programmer_update
on storage.objects
for update
to authenticated
using (bucket_id = 'windows-audio' and public.is_windows_programmer())
with check (bucket_id = 'windows-audio' and public.is_windows_programmer());

drop policy if exists windows_audio_objects_programmer_delete on storage.objects;
create policy windows_audio_objects_programmer_delete
on storage.objects
for delete
to authenticated
using (bucket_id = 'windows-audio' and public.is_windows_programmer());

create or replace function public.publish_windows_audio_release(p_release_id uuid)
returns public.windows_audio_releases
language plpgsql
security definer
set search_path = public
as $$
declare
  target_release public.windows_audio_releases;
  awareness_sequence jsonb;
  selected_default_profile text;
  required_missing integer;
begin
  if not public.is_windows_programmer() then
    raise exception 'Not authorized to publish Windows audio releases';
  end if;

  select * into target_release
  from public.windows_audio_releases
  where id = p_release_id
  for update;

  if target_release.id is null then
    raise exception 'Audio release was not found';
  end if;

  if target_release.status <> 'draft' then
    raise exception 'Only a draft release can be published';
  end if;

  awareness_sequence := target_release.manifest #> '{central_config,awareness_sequence}';
  if awareness_sequence is null
     or jsonb_typeof(awareness_sequence) <> 'array'
     or jsonb_array_length(awareness_sequence) <> 2
     or awareness_sequence->>0 = awareness_sequence->>1 then
    raise exception 'Exactly two different awareness clips must be selected';
  end if;

  selected_default_profile := target_release.manifest #>> '{central_config,default_profile}';
  if selected_default_profile is null
     or selected_default_profile not in ('end_only', 'start_and_end') then
    raise exception 'The default audio profile is invalid';
  end if;

  if exists (
    select 1
    from jsonb_array_elements_text(awareness_sequence) selected(asset_key)
    where not exists (
      select 1
      from public.windows_audio_assets asset
      where asset.release_id = p_release_id
        and asset.asset_key = selected.asset_key
        and asset.kind = 'guidance'
        and asset.is_active
    )
  ) then
    raise exception 'A selected awareness clip is missing or inactive';
  end if;

  select count(*) into required_missing
  from (
    values
      ('assembly_start'), ('break_start'), ('break_end'),
      ('period_01_start'), ('period_02_start'), ('period_03_start'), ('period_04_start'),
      ('period_05_start'), ('period_06_start'), ('period_07_start'), ('period_08_start'),
      ('period_01_end'), ('period_02_end'), ('period_03_end'), ('period_04_end'),
      ('period_05_end'), ('period_06_end'), ('period_07_end'), ('period_08_end')
  ) as required(asset_key)
  where not exists (
    select 1
    from public.windows_audio_assets asset
    where asset.release_id = p_release_id
      and asset.asset_key = required.asset_key
      and asset.kind = 'system_event'
  );

  if required_missing > 0 then
    raise exception 'The release is missing % required system audio files', required_missing;
  end if;

  update public.windows_audio_releases
  set status = 'archived'
  where status = 'published';

  update public.windows_audio_releases
  set status = 'published', published_at = now()
  where id = p_release_id
  returning * into target_release;

  update public.windows_audio_settings
  set active_release_id = p_release_id,
      default_profile_key = selected_default_profile,
      updated_by = auth.uid()
  where id = 1;

  return target_release;
end;
$$;

revoke all on function public.publish_windows_audio_release(uuid) from public;
grant execute on function public.publish_windows_audio_release(uuid) to authenticated;

create or replace function public.get_windows_audio_bootstrap(p_school_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  current_settings public.windows_audio_settings;
  current_release public.windows_audio_releases;
  selected_profile text;
  release_assets jsonb;
begin
  select * into current_settings
  from public.windows_audio_settings
  where id = 1;

  if current_settings.active_release_id is null then
    return jsonb_build_object('available', false);
  end if;

  select * into current_release
  from public.windows_audio_releases
  where id = current_settings.active_release_id
    and status = 'published';

  if current_release.id is null then
    return jsonb_build_object('available', false);
  end if;

  select coalesce(profile.profile_key, current_settings.default_profile_key)
  into selected_profile
  from (select 1) seed
  left join public.windows_school_audio_profiles profile
    on profile.school_slug = p_school_slug;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'asset_key', asset.asset_key,
        'kind', asset.kind,
        'category', asset.category,
        'title_ar', asset.title_ar,
        'storage_bucket', 'windows-audio',
        'storage_path', asset.storage_path,
        'mime_type', asset.mime_type,
        'file_size_bytes', asset.file_size_bytes,
        'duration_seconds', asset.duration_seconds,
        'checksum_sha256', asset.checksum_sha256,
        'sort_order', asset.sort_order
      ) order by asset.kind, asset.sort_order, asset.asset_key
    ),
    '[]'::jsonb
  ) into release_assets
  from public.windows_audio_assets asset
  where asset.release_id = current_release.id
    and asset.is_active;

  return jsonb_build_object(
    'available', true,
    'release_id', current_release.id,
    'version_number', current_release.version_number,
    'published_at', current_release.published_at,
    'profile_key', selected_profile,
    'manifest', current_release.manifest,
    'assets', release_assets
  );
end;
$$;

revoke all on function public.get_windows_audio_bootstrap(text) from public;
grant execute on function public.get_windows_audio_bootstrap(text) to anon, authenticated;

commit;
