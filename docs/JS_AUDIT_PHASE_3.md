# فحص ملفات JavaScript — المرحلة الثالثة

الفرع:

```text
cleanup-production-1.0
```

## الهدف

فحص ملفات JavaScript المستخدمة في النسخة الحالية قبل أي حذف أو دمج، وتحديد الملفات الأساسية والملفات المساندة وملفات الإصلاح التي لا تزال مهمة.

## 1. ملفات شاشة العرض المحملة مباشرة من index.html

يتم تحميل ملفات شاشة العرض الأساسية من `index.html`، وتشمل:

```text
viewer-multischool-identity.js
script.js
script-optimizations.js
ticker-messages.js
viewer-multischool-message-guard.js
text-corrections.js
viewer-alerts-external-fix.js
viewer-phone-notification-android-fix.js
pwa-register.js
```

### القرار

```text
لا يُحذف أي ملف من هذه الملفات الآن.
```

### سبب القرار

هذه الملفات مسؤولة عن:

- تحميل هوية المدرسة.
- تشغيل المؤقت الأساسي.
- منع ظهور بيانات مدرسة أخرى.
- رسائل الشريط والإعلانات.
- تنبيهات الهاتف.
- دعم PWA.

## 2. ملفات شاشة العرض المحملة ديناميكيًا من supabase-config.js

يتم تحميل ملفات إضافية لشاشة العرض من `supabase-config.js` عند عدم فتح لوحة مدير المدرسة:

```text
mobile-current-row-clean.css
viewer-schedule-sync.js
viewer-alerts-v2.js
```

### القرار

```text
لا تُحذف الآن.
```

### سبب القرار

هذه الملفات مرتبطة بتحسينات الهاتف ومزامنة الجداول والتنبيهات، وقد تؤثر على شاشة العرض مباشرة إذا حُذفت.

## 3. ملفات لوحة مدير المدرسة المحملة من supabase-config.js

عند فتح `dashboard-v2.html` يقوم `supabase-config.js` بتحميل:

```text
dashboard-messages.js
dashboard-v2-fixes.js
dashboard-title-layout-fix.js
dashboard-links-compact-fix.js
dashboard-center-school-name.js
dashboard-stable-links.js
dashboard-schedule-sync.js
dashboard-alert-settings.js
dashboard-single-design-lock.js
```

### القرار

```text
لا تُحذف الآن.
```

### سبب القرار

هذه الملفات تضبط وظائف حساسة في لوحة مدير المدرسة:

- إدارة الرسائل.
- إصلاح الروابط حسب school_slug.
- حفظ الجداول.
- إعدادات التنبيهات.
- تنسيق واجهة اللوحة.

## 4. ملف الإعلانات المجدولة

الملف:

```text
scheduled-announcements-admin.js
```

لا يتم تحميله مباشرة من `supabase-config.js`، لكنه يُحمّل ديناميكيًا من داخل `dashboard-v2-fixes.js`.

وظيفته:

- إضافة زر الإعلانات المجدولة.
- فتح نافذة الإعلانات المجدولة.
- تنظيف كاش الإعلانات القديمة.
- حفظ الإعلانات المجدولة في `school_messages`.

### القرار

```text
لا يُحذف.
```

### ملاحظة

هذا الملف مهم حتى لو لم يظهر في قائمة تحميل `supabase-config.js`؛ لأنه يتم حقنه برمجيًا من `dashboard-v2-fixes.js`.

## 5. ملفات لوحة مدير النظام

الملفات الأساسية:

```text
system-admin.js
system-install-link-fix.js
```

### القرار

```text
لا تُحذف.
```

### سبب القرار

- `system-admin.js` مسؤول عن إدارة المدارس والروابط والحفظ والتفعيل.
- `system-install-link-fix.js` أصبح يحتوي أيضًا على إصلاح رابط التثبيت والتحقق من الحذف الفعلي.

## 6. ملفات تم أرشفتها سابقًا ولا تعود إلى الجذر الآن

```text
archive/experimental-fixes/viewer-no-default-school.js
archive/experimental-fixes/system-admin-delete-school.js
archive/experimental-fixes/system-admin-delete-verify.js
```

### القرار

تبقى في الأرشيف فقط.

لا تعاد إلى الجذر إلا إذا ظهر خلل محدد بعد الاختبار.

## 7. ملاحظات هندسية

### أ. كثرة ملفات الإصلاح

يوجد عدد من ملفات JavaScript التي بدأت كإصلاحات صغيرة، لكنها أصبحت جزءًا من التشغيل اليومي.

أمثلة:

```text
script-optimizations.js
viewer-multischool-message-guard.js
viewer-alerts-external-fix.js
viewer-phone-notification-android-fix.js
dashboard-v2-fixes.js
system-install-link-fix.js
```

لا تُحذف الآن، لكن لاحقًا يمكن دمجها في ملفات منظمة.

### ب. المقترح الإنتاجي لاحقًا

بعد التأكد من الاستقرار، يمكن إنشاء هيكل جديد:

```text
assets/js/viewer.js
assets/js/dashboard.js
assets/js/system-admin.js
assets/js/shared.js
```

أو مرحلة أكثر احترافية:

```text
/src/viewer
/src/dashboard
/src/system
/src/shared
```

ثم البناء باستخدام أداة مثل Vite مستقبلًا.

### ج. لا دمج الآن

في هذه المرحلة لا يتم دمج ملفات JavaScript، لأن أي دمج قد يكسر وظيفة مخفية مثل:

- تحديث الروابط.
- تنظيف الكاش.
- التنبيهات.
- الإعلانات المجدولة.
- حماية school_slug.

## 8. نتيجة المرحلة الثالثة

لا توجد ملفات JavaScript إضافية مرشحة للحذف الآن.

الملفات القديمة التي كانت مرشحة تم التعامل معها في المرحلة الأولى.

الملفات الحالية مصنفة كالتالي:

| التصنيف | القرار |
|---|---|
| ملفات شاشة العرض | لا تُحذف |
| ملفات لوحة مدير المدرسة | لا تُحذف |
| ملفات الإعلانات المجدولة | لا تُحذف |
| ملفات لوحة مدير النظام | لا تُحذف |
| ملفات الأرشيف | تبقى في archive |

## 9. الخطوة القادمة

بعد هذه المرحلة، يمكن الانتقال إلى:

1. اختبار فرع التنظيف كاملًا.
2. مقارنة فرع `cleanup-production-1.0` مع `small-fixes`.
3. فتح Pull Request أو دمج التغييرات عند الاطمئنان.
4. بعد الدمج، إعادة نفس اختبار الروابط.
