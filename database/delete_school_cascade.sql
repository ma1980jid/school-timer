-- دالة حذف مدرسة من النظام مع البيانات المرتبطة بها
-- شغّل هذا الملف مرة واحدة من Supabase SQL Editor.
-- مهم: غيّر قيمة SYSTEM_ADMIN_DELETE_CODE إلى رمز خاص بك قبل التشغيل.

create or replace function public.delete_school_cascade(
  p_school_slug text,
  p_confirm_slug text,
  p_system_code text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  SYSTEM_ADMIN_DELETE_CODE constant text := 'CHANGE_THIS_CODE';
  v_slug text := trim(coalesce(p_school_slug, ''));
begin
  if v_slug = '' then
    raise exception 'school_slug is required';
  end if;

  if v_slug <> trim(coalesce(p_confirm_slug, '')) then
    raise exception 'confirmation slug does not match';
  end if;

  if coalesce(p_system_code, '') <> SYSTEM_ADMIN_DELETE_CODE then
    raise exception 'invalid system admin delete code';
  end if;

  delete from public.school_display_messages where school_slug = v_slug;
  delete from public.school_messages where school_slug = v_slug;
  delete from public.school_schedule_rows where school_slug = v_slug;
  delete from public.school_alert_settings where school_slug = v_slug;

  begin
    delete from public.school_timer_settings where school_slug = v_slug;
  exception when undefined_table then
    null;
  end;

  begin
    delete from public.school_devices where school_slug = v_slug;
  exception when undefined_table then
    null;
  end;

  begin
    delete from public.device_activations where school_slug = v_slug;
  exception when undefined_table then
    null;
  end;

  delete from public.schools where school_slug = v_slug;

  return not exists (
    select 1 from public.schools where school_slug = v_slug
  );
end;
$$;

grant execute on function public.delete_school_cascade(text, text, text) to anon, authenticated;
