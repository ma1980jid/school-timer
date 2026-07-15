-- Windows central audio management — version 3 upgrade.
-- Run after database/windows_audio_central_v2.sql.
-- Scope: adds one guarded RPC for deleting an audio release and its database rows.
-- It does not alter timer schedules, school schedules, or viewer-facing tables.

begin;

do $$
begin
  if to_regclass('public.windows_audio_channels') is null
     or to_regclass('public.windows_audio_audit_log') is null then
    raise exception 'Run database/windows_audio_central_v2.sql before this v3 upgrade';
  end if;
end;
$$;

create or replace function public.delete_windows_audio_release(
  p_release_id uuid,
  p_confirmation text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_release public.windows_audio_releases;
  expected_confirmation text;
  release_storage_paths jsonb;
begin
  if not public.is_windows_programmer() then
    raise exception 'Not authorized to delete Windows audio releases';
  end if;

  select * into target_release
  from public.windows_audio_releases
  where id = p_release_id
  for update;

  if target_release.id is null then
    raise exception 'Audio release was not found';
  end if;

  expected_confirmation := 'حذف v' || target_release.version_number::text;
  if btrim(coalesce(p_confirmation, '')) <> expected_confirmation then
    raise exception 'The release deletion confirmation is invalid';
  end if;

  select coalesce(jsonb_agg(asset.storage_path order by asset.sort_order), '[]'::jsonb)
  into release_storage_paths
  from public.windows_audio_assets asset
  where asset.release_id = target_release.id;

  -- These foreign keys already use ON DELETE SET NULL. Updating explicitly keeps
  -- the intended state visible inside the same transaction and is safe to repeat.
  update public.windows_audio_channels
  set active_release_id = null,
      updated_by = auth.uid(),
      updated_at = now()
  where active_release_id = target_release.id;

  update public.windows_audio_settings
  set active_release_id = null,
      updated_by = auth.uid(),
      updated_at = now()
  where active_release_id = target_release.id;

  delete from public.windows_audio_releases
  where id = target_release.id;

  insert into public.windows_audio_audit_log (
    actor_type, action, entity_type, entity_id, details
  ) values (
    'programmer', 'release_deleted', 'audio_release', target_release.id::text,
    jsonb_build_object(
      'audience_key', target_release.audience_key,
      'version_number', target_release.version_number,
      'previous_status', target_release.status,
      'storage_file_count', jsonb_array_length(release_storage_paths)
    )
  );

  return jsonb_build_object(
    'deleted', true,
    'release_id', target_release.id,
    'version_number', target_release.version_number,
    'audience_key', target_release.audience_key,
    'previous_status', target_release.status,
    'storage_paths', release_storage_paths
  );
end;
$$;

revoke all on function public.delete_windows_audio_release(uuid, text) from public;
grant execute on function public.delete_windows_audio_release(uuid, text) to authenticated;

commit;
