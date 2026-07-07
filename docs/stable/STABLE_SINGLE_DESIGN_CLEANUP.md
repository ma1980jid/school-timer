# Stable Release: Single Design Cleanup

## النسخة
stable-single-design-cleanup

## الهدف
تثبيت حالة المشروع بعد اعتماد تصميم واحد فقط وإخفاء خيارات التصاميم المتعددة من لوحة مدير المدرسة.

## الحالة المعتمدة
- جدول الحصص يعمل من `school_schedule_rows` مع بقاء النظام القديم كنسخة أمان.
- الرسائل تعمل من `school_display_messages` مع مزامنة من `school_messages`.
- التنبيهات تعمل من `school_alert_settings`.
- تم إخفاء خيارات نمط الواجهة المتعددة من لوحة مدير المدرسة.
- لم يتم حذف جدول `school_theme_settings` من قاعدة البيانات؛ يبقى احتياطيًا للمستقبل.

## الملفات المهمة في هذه المرحلة
- `dashboard-single-design-lock.js`
- `supabase-config.js`
- `dashboard-v2.html`
- `index.html`
- `viewer-schedule-sync.js`
- `viewer-alerts-v2.js`
- `dashboard-schedule-sync.js`
- `dashboard-alert-settings.js`

## ملاحظات
هذه النسخة تعتمد تصميمًا عامًا واحدًا لكل المدارس، مع بقاء اسم المدرسة وشعارها والجداول والرسائل والتنبيهات ديناميكية لكل مدرسة.

## المرحلة التالية
فحص لوحة مدير النظام ثم تطويرها لإدارة المدارس المتعددة: إضافة مدرسة، رفع الشعار، توليد الروابط، التفعيل والإيقاف.
