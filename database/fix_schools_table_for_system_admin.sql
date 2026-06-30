-- إصلاح جدول المدارس لاختبار تعدد المدارس من لوحة مدير النظام
-- نفّذ هذا الملف مرة واحدة من Supabase SQL Editor

-- 1) إنشاء الجدول إذا لم يكن موجودًا
create table if not exists public.schools (
  id bigserial primary key,
  school_name text not null,
  school_slug text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2) إضافة الأعمدة التي تحتاجها لوحة مدير النظام إذا كانت غير موجودة
alter table public.schools add column if not exists governorate text;
alter table public.schools add column if not exists wilayat text;
alter table public.schools add column if not exists admin_code text;
alter table public.schools add column if not exists logo_url text;
alter table public.schools add column if not exists app_icon_url text;
alter table public.schools add column if not exists primary_color text default '#0f766e';
alter table public.schools add column if not exists secondary_color text default '#b7791f';
alter table public.schools add column if not exists background_color text default '#f8f2e8';
alter table public.schools add column if not exists theme_style text default 'omani';
alter table public.schools add column if not exists updated_at timestamptz;

-- 3) ضمان عدم تكرار الرابط المختصر
create unique index if not exists schools_school_slug_key on public.schools (school_slug);

-- 4) تفعيل RLS مع سياسات تسمح للواجهة الحالية بالقراءة والإضافة والتعديل
-- ملاحظة: هذه السياسات مناسبة لمرحلة الاختبار الحالية لأن لوحة مدير النظام تعمل بدون تسجيل دخول حقيقي.
-- لاحقًا سنستبدلها بمدير نظام محمي أو Supabase Auth/Edge Function.
alter table public.schools enable row level security;

drop policy if exists "schools_select_public" on public.schools;
create policy "schools_select_public"
on public.schools
for select
to anon, authenticated
using (true);

drop policy if exists "schools_insert_system_admin_test" on public.schools;
create policy "schools_insert_system_admin_test"
on public.schools
for insert
to anon, authenticated
with check (true);

drop policy if exists "schools_update_system_admin_test" on public.schools;
create policy "schools_update_system_admin_test"
on public.schools
for update
to anon, authenticated
using (true)
with check (true);

-- 5) صلاحيات مباشرة للـ anon/authenticated على الجدول
 grant usage on schema public to anon, authenticated;
 grant select, insert, update on public.schools to anon, authenticated;
 grant usage, select on sequence public.schools_id_seq to anon, authenticated;

-- 6) صف اختباري اختياري لمدرسة الشيخ سيف إذا لم يكن موجودًا
insert into public.schools (
  school_name,
  school_slug,
  governorate,
  wilayat,
  admin_code,
  is_active,
  primary_color,
  secondary_color,
  background_color,
  theme_style
)
values (
  'مدرسة الشيخ سيف بن حمد الأغبري',
  'alsheikh-saif',
  'مسقط',
  'السيب',
  '6508',
  true,
  '#0f766e',
  '#b7791f',
  '#f8f2e8',
  'omani'
)
on conflict (school_slug) do update set
  school_name = excluded.school_name,
  governorate = coalesce(public.schools.governorate, excluded.governorate),
  wilayat = coalesce(public.schools.wilayat, excluded.wilayat),
  admin_code = coalesce(public.schools.admin_code, excluded.admin_code),
  is_active = true,
  updated_at = now();
