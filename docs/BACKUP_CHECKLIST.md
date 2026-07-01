# قائمة النسخ الاحتياطي — مؤقت الحصص المدرسي

خاص بالنسخة التجريبية المستقرة 1.0.

## 1. نسخة GitHub الاحتياطية

تم إنشاء فرع احتياطي باسم:

```text
backup-stable-1.0-2026-07-01
```

يعتمد هذا الفرع على الفرع التشغيلي:

```text
small-fixes
```

### طريقة تنزيل نسخة ZIP يدويًا

1. افتح مستودع GitHub.
2. اختر الفرع:

```text
backup-stable-1.0-2026-07-01
```

3. اضغط Code.
4. اختر Download ZIP.
5. احفظ الملف باسم:

```text
school-timer-stable-1.0-2026-07-01.zip
```

## 2. نسخة Supabase الاحتياطية

### الجداول المطلوب تصديرها

صدّر الجداول التالية من Supabase:

```text
schools
school_messages
school_display_messages
school_schedule_rows
school_alert_settings
system_logs
school_timer_settings
school_devices
device_activations
school_theme_settings
```

إذا كان بعض الجداول غير موجود، تجاهله.

### طريقة التصدير اليدوي

1. افتح Supabase.
2. انتقل إلى Table Editor.
3. افتح كل جدول.
4. اضغط Export أو Download CSV حسب المتاح.
5. احفظ الملفات داخل مجلد باسم:

```text
supabase-backup-stable-1.0-2026-07-01
```

## 3. نسخة SQL من البنية

من Supabase SQL Editor أو Database tools، احفظ نسخة من:

- الجداول.
- الدوال.
- السياسات RLS.
- Storage policies.

## 4. نسخة Storage

احفظ نسخة من bucket الشعارات:

```text
school-logos
```

وتأكد من حفظ:

- شعارات المدارس.
- أيقونات التطبيق.
- أي ملفات صوت مستقبلية إن وجدت.

## 5. ملف معلومات النسخة

احفظ ملفًا نصيًا مع النسخة يحتوي:

```text
اسم النسخة: stable 1.0
تاريخ النسخة: 2026-07-01
فرع GitHub: backup-stable-1.0-2026-07-01
قاعدة Supabase: Production
آخر اختبار: إضافة مدرسة / حذف مدرسة / رسائل / إعلانات / تثبيت
```

## 6. قاعدة ذهبية

قبل أي تنظيف ملفات أو إعادة تنظيم:

```text
لا تحذف أي ملف من المشروع قبل التأكد أن نسخة GitHub ونسخة Supabase محفوظتان.
```
