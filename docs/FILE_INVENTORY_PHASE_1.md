# جرد ملفات المشروع — المرحلة الأولى

هذا الجرد مبدئي، والغرض منه منع الحذف العشوائي قبل تنظيف المشروع.

## 1. ملفات لا تُحذف في هذه المرحلة

### صفحات تشغيلية

```text
index.html
dashboard-v2.html
system-admin.html
install.html
manifest.json
sw.js
```

### إعدادات واتصال

```text
supabase-config.js
pwa-register.js
pwa-school-redirect.js
```

### شاشة العرض

```text
style.css
ticker-fix.css
mobile-current-row-clean.css
script.js
script-optimizations.js
viewer-multischool-identity.js
viewer-multischool-message-guard.js
ticker-messages.js
viewer-schedule-sync.js
viewer-alerts-v2.js
viewer-alerts-external-fix.js
viewer-phone-notification-android-fix.js
text-corrections.js
```

### لوحة مدير المدرسة

```text
dashboard-messages.js
dashboard-v2-fixes.js
dashboard-stable-links.js
dashboard-schedule-sync.js
scheduled-announcements-admin.js
dashboard-alert-settings.js
dashboard-title-layout-fix.js
dashboard-links-compact-fix.js
dashboard-center-school-name.js
dashboard-single-design-lock.js
```

### لوحة مدير النظام

```text
system-admin.js
system-install-link-fix.js
```

### قاعدة البيانات والتوثيق

```text
database/delete_school_cascade.sql
docs/RELEASE_1.0_STABLE.md
docs/SUPABASE_TABLES.md
docs/SCHOOL_LINKS.md
docs/OPERATIONS_GUIDE.md
docs/BACKUP_CHECKLIST.md
docs/PRODUCTION_1.0_CLEANUP_PLAN.md
```

## 2. ملفات مرشحة للأرشفة

لا تُحذف الآن. يتم نقلها إلى archive بعد الفحص.

```text
school-settings.html
messages.html
admin.html
system.html
viewer-no-default-school.js
system-admin-delete-school.js
system-admin-delete-verify.js
```

## 3. سبب ترشيح الملفات للأرشفة

### school-settings.html

يبدو من نسخة قديمة لتعديل بيانات المدرسة. يستخدم أسماء ملفات وإعدادات قديمة مثل config.js و school-settings.js.

### messages.html

يبدو من نسخة قديمة لإدارة الرسائل، بينما إدارة الرسائل الحالية مدمجة داخل dashboard-v2.html عبر ملفات dashboard-messages.js.

### admin.html و system.html

ظهرت كصفحات قديمة في نتائج البحث أو الإصدارات السابقة، ويجب التأكد من وجودها في الفرع الحالي قبل نقلها.

### viewer-no-default-school.js

ملف إصلاح قديم لم يظهر ضمن ملفات التحميل الحالية في index.html.

### system-admin-delete-school.js و system-admin-delete-verify.js

ملفات إصلاح مرحلية، وتم تجاوزها بعد دمج منطق التحقق من الحذف في المسار الحالي.

## 4. قاعدة التعامل مع الملفات المرشحة

1. لا حذف مباشر.
2. نقل إلى archive فقط.
3. اختبار التطبيق بعد النقل.
4. إذا ظهر خلل نعيد الملف فورًا.
5. بعد أسبوع استقرار يمكن حذف ملفات archive إن رغبت.

## 5. المرحلة القادمة

المرحلة القادمة هي إنشاء مجلدات الأرشيف، ثم نقل ملف أو ملفين فقط في كل مرة مع الاختبار.
