# النسخة المستقرة قبل تنظيم الجداول

**اسم النسخة:** stable-before-database-tables  
**التاريخ:** 2026-06-29  
**الفرع:** small-fixes  
**المشروع:** مؤقت الحصص المدرسي متعدد المدارس

---

## الهدف من تثبيت هذه النسخة

تم تثبيت هذه النسخة كنقطة رجوع آمنة قبل البدء في مرحلة تنظيم قاعدة البيانات وإنشاء الجداول النظامية.

لا يتم في هذه المرحلة إضافة ميزات جديدة، وإنما توثيق الحالة الحالية حتى يمكن الرجوع إليها عند الحاجة.

---

## الصفحات الأساسية في النسخة الحالية

1. لوحة مدير النظام
   - system-admin.html

2. لوحة مدير المدرسة
   - dashboard-v2.html

3. واجهة المؤقت للمعلمين والشاشات
   - index.html

4. صفحة تثبيت التطبيق و QR Code
   - install.html

---

## روابط الاختبار الأساسية

لوحة مدير النظام:
https://ma1980jid.github.io/school-timer/system-admin.html

لوحة مدير المدرسة:
https://ma1980jid.github.io/school-timer/dashboard-v2.html?school=alsheikh-saif

واجهة الحاسوب:
https://ma1980jid.github.io/school-timer/index.html?school=alsheikh-saif&view=desktop

واجهة الهاتف والآيباد:
https://ma1980jid.github.io/school-timer/index.html?school=alsheikh-saif&view=mobile

صفحة التثبيت و QR:
https://ma1980jid.github.io/school-timer/install.html?school=alsheikh-saif

---

## الملفات المهمة في النسخة الحالية

### ملفات العرض
- index.html
- style.css
- script.js
- script-optimizations.js
- ticker-messages.js
- text-corrections.js
- viewer-school-identity.js
- viewer-theme-manager.js
- viewer-design-themes.css
- viewer-alerts-external-fix.js
- viewer-auto-theme.js
- viewer-auto-theme-v2.js

### ملفات لوحة مدير المدرسة
- dashboard-v2.html
- dashboard-messages.js
- dashboard-schedule-sync.js
- dashboard-alert-settings.js

### ملفات لوحة مدير النظام
- system-admin.html
- system-admin.js
- system-auto-theme-admin.js
- system-install-link-fix.js

### ملفات التثبيت
- install.html
- install-page.js

### ملفات الاتصال والإعداد
- supabase-config.js
- manifest.json

---

## الوظائف الموجودة حتى هذه النسخة

- مؤقت الحصص للمدرسة حسب الرابط المختصر school_slug.
- شاشة حاسوب.
- شاشة هاتف وآيباد.
- لوحة مدير المدرسة.
- إدارة الرسائل.
- إدارة جدول الحصص من لوحة المدير.
- التنبيهات.
- لوحة مدير النظام.
- إضافة مدرسة وتعديل بياناتها.
- تفعيل وإيقاف المدرسة.
- توليد روابط المدرسة.
- صفحة تثبيت التطبيق و QR Code.
- التصاميم الأربعة.
- تصميم مناسبة عام.
- التغيير التلقائي للتصميم كل 20 يومًا.

---

## ملاحظات مهمة قبل مرحلة الجداول

بعض بيانات النظام ما زالت محفوظة مؤقتًا داخل جدول school_messages بصيغة رسائل نظامية مخفية، مثل:

- __SCHEDULE_ROWS__
- __GLOBAL_EVENT_THEME__
- __AUTO_THEME__
- __ALERT_SETTINGS__

هذه الطريقة كانت مناسبة أثناء البناء السريع، لكنها ليست البنية النهائية.

المرحلة القادمة يجب أن تنقل هذه البيانات إلى جداول منظمة بدل خلطها مع رسائل الشريط.

---

## خطة الجداول بعد هذه النسخة

يبدأ العمل بعد هذه النسخة بإنشاء الجداول التالية تدريجيًا:

1. school_schedule_rows
2. school_theme_settings
3. system_event_themes
4. school_alert_settings
5. school_messages المنظمة للرسائل فقط
6. system_logs
7. school_backups لاحقًا

---

## قاعدة السلامة

لا يتم حذف النظام الحالي مباشرة.

يتم إنشاء الجداول الجديدة أولًا، ثم نقل كل ميزة تدريجيًا، مع اختبار كل خطوة قبل الانتقال للخطوة التالية.

---

## حالة النسخة

هذه النسخة تعتبر نقطة تثبيت قبل مرحلة الجداول.

أي تعديل على قاعدة البيانات أو نقل للجداول يجب أن يبدأ بعد هذا الملف، حتى يمكن التمييز بين النسخة الحالية ومرحلة إعادة تنظيم البيانات.
