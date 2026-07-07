# Stable Release: Alerts Android PWA Fix

## اسم النسخة
stable-alerts-android-pwa-fix

## سبب التثبيت
تم تثبيت هذه النسخة بعد تنفيذ إصلاحات خاصة بالتنبيهات، واجهة الهاتف والحاسوب، ودعم تثبيت التطبيق على Android.

## ما تم اعتماده
- تثبيت لون عبارة "متبقي من الحصة" باللون الأبيض في الهاتف والحاسوب.
- إغلاق تنبيه "باقي من الحصة" تلقائيًا عند بداية الحصة التالية.
- إضافة Service Worker لدعم تثبيت البرنامج كتطبيق PWA.
- تسجيل Service Worker من صفحة المؤقت وصفحة التثبيت.
- إضافة طبقة دعم لإشعارات الهاتف على Android عبر Service Worker.
- إبقاء النظام القديم للإشعارات كاحتياط.

## الملفات المرتبطة بهذه المرحلة
- `viewer-design-themes.css`
- `text-corrections.js`
- `viewer-alerts-v2.js`
- `viewer-alerts-external-fix.js`
- `viewer-phone-notification-android-fix.js`
- `sw.js`
- `pwa-register.js`
- `index.html`
- `install.html`

## روابط الفحص
- مدير النظام: `https://ma1980jid.github.io/school-timer/system-admin.html`
- مدير المدرسة: `https://ma1980jid.github.io/school-timer/dashboard-v2.html?school=alsheikh-saif`
- شاشة الهاتف: `https://ma1980jid.github.io/school-timer/index.html?school=alsheikh-saif&view=mobile`
- شاشة الحاسوب: `https://ma1980jid.github.io/school-timer/index.html?school=alsheikh-saif&view=desktop`
- صفحة التثبيت: `https://ma1980jid.github.io/school-timer/install.html?school=alsheikh-saif`

## ملاحظة
هذه النسخة لا تغيّر قاعدة البيانات ولا تحذف أي جداول. التغييرات محصورة في ملفات الواجهة والتنبيهات والتثبيت كتطبيق.

## الحالة
تم تثبيتها بعد نجاح الاختبارات الأساسية وقبل الانتقال لاختبار تعدد المدارس.
