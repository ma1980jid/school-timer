# stable-after-alert-settings

تاريخ التثبيت: 2026-06-29
الفرع: small-fixes

## الهدف من هذه النسخة

هذه نقطة رجوع مستقرة بعد نجاح نقل إعدادات التنبيهات إلى الجدول الجديد:

```text
school_alert_settings
```

## الحالة المستقرة المثبتة

تم حتى هذه النقطة نقل الأجزاء التالية بنجاح:

```text
1. جدول الحصص → school_schedule_rows
2. الرسائل → school_display_messages
3. التنبيهات → school_alert_settings
```

## إعدادات التنبيهات

### الشاشة

ملف شاشة العرض:

```text
viewer-alerts-v2.js
```

أصبح يقرأ أولًا من:

```text
school_alert_settings
```

وإذا لم يجد بيانات يرجع إلى النسخة القديمة:

```text
__ALERT_SETTINGS__
```

### لوحة المدير

ملف لوحة المدير:

```text
dashboard-alert-settings.js
```

أصبح يحفظ في:

```text
school_alert_settings
```

وكذلك يحفظ مؤقتًا في:

```text
__ALERT_SETTINGS__ داخل school_messages
```

## الاختبار المنفذ

- تم فتح تنبيهات الهاتف من لوحة مدير المدرسة.
- تم تغيير القيم.
- بعد إصلاح صلاحيات RLS ووجود قيد unique على `school_slug`، تغيّرت القيم في جدول `school_alert_settings` بنجاح.

## ملاحظات مهمة

لا يتم حذف `__ALERT_SETTINGS__` الآن؛ يبقى كنسخة رجوع مؤقتة حتى الانتهاء من نقل بقية الإعدادات.

## الخطوة التالية

نقل إعدادات التصاميم إلى:

```text
school_theme_settings
```

مع الحفاظ على fallback آمن من الطريقة القديمة.
