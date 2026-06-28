-- ============================================================
-- School Timer Database Schema V1
-- المرحلة: تنظيم الجداول قبل نقل البيانات
-- النسخة المرجعية: stable-before-database-tables
-- التاريخ: 2026-06-29
--
-- مهم:
-- هذا الملف لا يحذف الجداول القديمة.
-- لا تحذف school_messages الآن.
-- نفّذ هذا الملف في Supabase SQL Editor لإنشاء الجداول الجديدة فقط.
-- ============================================================

-- تفعيل امتداد UUID عند الحاجة
create extension if not exists pgcrypto;

-- ============================================================
-- 1) جدول حصص المدرسة
-- بديل منظم عن الرسالة النظامية: __SCHEDULE_ROWS__
-- ============================================================
create table if not exists public.school_schedule_rows (
  id uuid primary key default gen_random_uuid(),
  school_slug text not null,
  schedule_name text not null default 'default',
  period_name text not null,
  period_type text not null default 'lesson',
  start_time time not null,
  end_time time not null,
  duration_minutes integer,
  order_index integer not null default 0,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_schedule_rows_period_type_check check (
    period_type in ('assembly','lesson','break','prayer','activity','custom')
  )
);

create index if not exists idx_school_schedule_rows_slug
  on public.school_schedule_rows (school_slug);

create index if not exists idx_school_schedule_rows_slug_active_order
  on public.school_schedule_rows (school_slug, is_active, order_index);

create unique index if not exists uq_school_schedule_rows_active_order
  on public.school_schedule_rows (school_slug, schedule_name, order_index)
  where is_active = true;

-- ============================================================
-- 2) جدول إعدادات التصاميم لكل مدرسة
-- بديل منظم عن جزء من schools وعن __AUTO_THEME__
-- ============================================================
create table if not exists public.school_theme_settings (
  id uuid primary key default gen_random_uuid(),
  school_slug text not null unique,
  selected_theme text not null default 'omani',
  default_theme text not null default 'omani',
  auto_theme_enabled boolean not null default false,
  auto_theme_days integer not null default 20,
  auto_theme_start_date date,
  auto_theme_sequence jsonb not null default '["omani","white","green","gold"]'::jsonb,
  manual_theme_locked boolean not null default false,
  last_theme_changed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_theme_settings_selected_theme_check check (
    selected_theme in ('omani','white','green','gold')
  ),
  constraint school_theme_settings_default_theme_check check (
    default_theme in ('omani','white','green','gold')
  ),
  constraint school_theme_settings_auto_days_check check (auto_theme_days between 1 and 90)
);

create index if not exists idx_school_theme_settings_slug
  on public.school_theme_settings (school_slug);

-- ============================================================
-- 3) جدول تصميم المناسبات العامة
-- بديل منظم عن الرسالة النظامية: __GLOBAL_EVENT_THEME__
-- ============================================================
create table if not exists public.system_event_themes (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  theme_key text not null default 'gold',
  start_date date not null,
  end_date date not null,
  is_active boolean not null default true,
  applies_to_all boolean not null default true,
  selected_school_slugs text[] default null,
  priority integer not null default 100,
  notes text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint system_event_themes_theme_key_check check (
    theme_key in ('omani','white','green','gold')
  ),
  constraint system_event_themes_date_check check (end_date >= start_date)
);

create index if not exists idx_system_event_themes_active_dates
  on public.system_event_themes (is_active, start_date, end_date, priority);

-- ============================================================
-- 4) جدول إعدادات التنبيهات لكل مدرسة
-- بديل منظم عن الرسالة النظامية: __ALERT_SETTINGS__
-- ============================================================
create table if not exists public.school_alert_settings (
  id uuid primary key default gen_random_uuid(),
  school_slug text not null unique,
  enabled boolean not null default false,
  before_end_enabled boolean not null default true,
  before_end_minutes integer not null default 5,
  end_enabled boolean not null default true,
  phone_notification_enabled boolean not null default true,
  sound_enabled boolean not null default false,
  sound_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_alert_settings_before_end_check check (before_end_minutes between 1 and 30)
);

create index if not exists idx_school_alert_settings_slug
  on public.school_alert_settings (school_slug);

-- ============================================================
-- 5) جدول رسائل المدرسة المنظم
-- الهدف: الرسائل العادية فقط، بدون رسائل نظامية مخفية
-- ملاحظة: لا نحذف school_messages القديم الآن.
-- ============================================================
create table if not exists public.school_display_messages (
  id uuid primary key default gen_random_uuid(),
  school_slug text not null,
  message_text text not null,
  message_type text not null default 'ticker',
  target_area text not null default 'ticker',
  sort_order integer not null default 100,
  is_active boolean not null default true,
  start_date date,
  end_date date,
  is_annual boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_display_messages_type_check check (
    message_type in ('ticker','card','scheduled','announcement')
  ),
  constraint school_display_messages_target_check check (
    target_area in ('ticker','right_card','left_card','all')
  ),
  constraint school_display_messages_date_check check (
    end_date is null or start_date is null or end_date >= start_date
  )
);

create index if not exists idx_school_display_messages_slug_active_order
  on public.school_display_messages (school_slug, is_active, sort_order);

-- ============================================================
-- 6) سجل العمليات
-- لمعرفة من عدّل ومتى وماذا عدّل
-- ============================================================
create table if not exists public.system_logs (
  id uuid primary key default gen_random_uuid(),
  actor_type text not null default 'system_admin',
  actor_name text,
  school_slug text,
  action text not null,
  entity_type text,
  entity_id text,
  old_data jsonb,
  new_data jsonb,
  details text,
  created_at timestamptz not null default now(),
  constraint system_logs_actor_type_check check (
    actor_type in ('system_admin','school_admin','system','viewer')
  )
);

create index if not exists idx_system_logs_school_created
  on public.system_logs (school_slug, created_at desc);

create index if not exists idx_system_logs_action_created
  on public.system_logs (action, created_at desc);

-- ============================================================
-- 7) جدول النسخ الاحتياطي للمدرسة
-- يستخدم لاحقًا لتصدير/استيراد إعدادات مدرسة كاملة
-- ============================================================
create table if not exists public.school_backups (
  id uuid primary key default gen_random_uuid(),
  school_slug text not null,
  backup_name text not null,
  backup_type text not null default 'manual',
  backup_data jsonb not null,
  notes text,
  created_by text,
  created_at timestamptz not null default now(),
  constraint school_backups_type_check check (
    backup_type in ('manual','auto','before_migration','restore_point')
  )
);

create index if not exists idx_school_backups_slug_created
  on public.school_backups (school_slug, created_at desc);

-- ============================================================
-- 8) دالة تحديث updated_at
-- ============================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================
-- 9) Triggers لتحديث updated_at
-- ============================================================
drop trigger if exists trg_school_schedule_rows_updated_at on public.school_schedule_rows;
create trigger trg_school_schedule_rows_updated_at
before update on public.school_schedule_rows
for each row execute function public.set_updated_at();

drop trigger if exists trg_school_theme_settings_updated_at on public.school_theme_settings;
create trigger trg_school_theme_settings_updated_at
before update on public.school_theme_settings
for each row execute function public.set_updated_at();

drop trigger if exists trg_system_event_themes_updated_at on public.system_event_themes;
create trigger trg_system_event_themes_updated_at
before update on public.system_event_themes
for each row execute function public.set_updated_at();

drop trigger if exists trg_school_alert_settings_updated_at on public.school_alert_settings;
create trigger trg_school_alert_settings_updated_at
before update on public.school_alert_settings
for each row execute function public.set_updated_at();

drop trigger if exists trg_school_display_messages_updated_at on public.school_display_messages;
create trigger trg_school_display_messages_updated_at
before update on public.school_display_messages
for each row execute function public.set_updated_at();

-- ============================================================
-- 10) ملاحظات RLS
-- ============================================================
-- لم يتم تفعيل RLS في هذا الملف حتى لا يتوقف النظام الحالي فجأة.
-- بعد نجاح الربط الجديد يمكن إضافة سياسات RLS تدريجيًا.

-- ============================================================
-- 11) نهاية الملف
-- ============================================================
