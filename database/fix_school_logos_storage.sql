-- إعداد تخزين شعارات المدارس في Supabase Storage
-- نفّذ هذا الملف مرة واحدة من Supabase SQL Editor
-- الغرض: تمكين لوحة مدير النظام من رفع شعار المدرسة وحفظ رابطه العام في جدول schools

-- 1) إنشاء Bucket عام للشعارات إن لم يكن موجودًا
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'school-logos',
  'school-logos',
  true,
  5242880,
  array['image/png','image/jpeg','image/webp','image/svg+xml']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/png','image/jpeg','image/webp','image/svg+xml'];

-- 2) السماح بقراءة الشعارات العامة
-- ملاحظة: PostgreSQL في Supabase لا يدعم create policy if not exists؛ لذلك نحذف السياسة ثم نعيد إنشاءها.
drop policy if exists "school_logos_public_read" on storage.objects;
create policy "school_logos_public_read"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'school-logos');

-- 3) السماح برفع الشعارات من لوحة مدير النظام في مرحلة الاختبار
drop policy if exists "school_logos_public_insert" on storage.objects;
create policy "school_logos_public_insert"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'school-logos');

-- 4) السماح بتحديث واستبدال الشعارات في مرحلة الاختبار
drop policy if exists "school_logos_public_update" on storage.objects;
create policy "school_logos_public_update"
on storage.objects
for update
to anon, authenticated
using (bucket_id = 'school-logos')
with check (bucket_id = 'school-logos');

-- 5) السماح بحذف شعار إذا احتجنا لاحقًا
drop policy if exists "school_logos_public_delete" on storage.objects;
create policy "school_logos_public_delete"
on storage.objects
for delete
to anon, authenticated
using (bucket_id = 'school-logos');

-- ملاحظة أمنية:
-- هذه السياسات مناسبة للاختبار الحالي لأن لوحة مدير النظام تعمل بدون تسجيل دخول حقيقي.
-- بعد اعتماد النظام نهائيًا سنستبدلها بصلاحيات أكثر أمانًا مرتبطة بمدير النظام فقط.
