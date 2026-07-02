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

## 2. ملفات فُحصت ولم تكن موجودة في فرع التنظيف

```text
school-settings.html
messages.html
admin.html
system.html
```

ملاحظة: ظهرت هذه الملفات في نتائج أو إصدارات سابقة، لكنها غير موجودة في فرع cleanup-production-1.0 وقت الفحص.

## 3. ملفات تم أرشفتها في المرحلة الأولى

تم نقل الملفات التالية إلى:

```text
archive/experimental-fixes/
```

ثم حُذفت نسخها من جذر المشروع داخل فرع التنظيف فقط.

| الملف الأصلي | مكان الأرشيف | السبب |
|---|---|---|
| viewer-no-default-school.js | archive/experimental-fixes/viewer-no-default-school.js | ملف إصلاح قديم لم يعد محملًا في index.html |
| system-admin-delete-school.js | archive/experimental-fixes/system-admin-delete-school.js | ملف حذف مرحلي تم تجاوزه |
| system-admin-delete-verify.js | archive/experimental-fixes/system-admin-delete-verify.js | ملف تحقق حذف مرحلي تم تجاوزه |

## 4. نتيجة فحص الصفحات القديمة

تم الانتهاء من فحص صفحات الإدارة القديمة المرشحة. لا توجد في فرع التنظيف الحالي:

```text
school-settings.html
messages.html
admin.html
system.html
```

لذلك لا توجد صفحات قديمة إضافية تحتاج نقلًا في هذه المرحلة.

## 5. سبب ترشيح الملفات للأرشفة

### school-settings.html

يبدو من نسخة قديمة لتعديل بيانات المدرسة. يستخدم أسماء ملفات وإعدادات قديمة مثل config.js و school-settings.js.

### messages.html

يبدو من نسخة قديمة لإدارة الرسائل، بينما إدارة الرسائل الحالية مدمجة داخل dashboard-v2.html عبر ملفات dashboard-messages.js.

### admin.html و system.html

ظهرت كصفحات قديمة في نتائج البحث أو الإصدارات السابقة، لكنها غير موجودة في فرع cleanup-production-1.0.

### viewer-no-default-school.js

ملف إصلاح قديم لم يظهر ضمن ملفات التحميل الحالية في index.html.

### system-admin-delete-school.js و system-admin-delete-verify.js

ملفات إصلاح مرحلية، وتم تجاوزها بعد دمج منطق التحقق من الحذف في المسار الحالي.

## 6. قاعدة التعامل مع الملفات المرشحة

1. لا حذف مباشر دون أرشفة.
2. نقل إلى archive فقط.
3. اختبار التطبيق بعد النقل.
4. إذا ظهر خلل نعيد الملف فورًا.
5. بعد أسبوع استقرار يمكن حذف ملفات archive إن رغبت.

## 7. اختبارات مطلوبة بعد هذه المرحلة

- فتح شاشة الهاتف لمدرسة الشيخ سيف.
- فتح شاشة الهاتف لمدرسة أخرى.
- فتح لوحة مدير المدرسة.
- فتح لوحة مدير النظام.
- التأكد من زر حذف المدرسة.
- التأكد من صفحة التثبيت.

## 8. المرحلة القادمة

فحص ملفات CSS والصور والملفات المتكررة، ثم الانتقال إلى تنظيم الملفات الأساسية أو دمج بعض ملفات الإصلاح بعد الاختبار.
