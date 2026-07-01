# توثيق روابط المدارس في مؤقت الحصص

هذا الملف يوثق طريقة بناء روابط المدارس في النسخة التجريبية المستقرة 1.0.

## القاعدة العامة

كل مدرسة تعتمد على قيمة:

```text
school_slug
```

وتوضع في الرابط بهذا الشكل:

```text
?school=school-slug
```

مثال:

```text
?school=alsheikh-saif
?school=abdullahalarqam
```

## رابط شاشة الهاتف والآيباد

```text
https://ma1980jid.github.io/school-timer/index.html?school=school-slug&view=mobile&v=no-default-logo-01
```

## رابط شاشة الحاسوب

```text
https://ma1980jid.github.io/school-timer/index.html?school=school-slug&view=desktop&v=no-default-logo-01
```

## رابط لوحة مدير المدرسة

```text
https://ma1980jid.github.io/school-timer/dashboard-v2.html?school=school-slug
```

## رابط صفحة التثبيت

```text
https://ma1980jid.github.io/school-timer/install.html?school=school-slug
```

## رابط لوحة مدير النظام

```text
https://ma1980jid.github.io/school-timer/system-admin.html
```

## أمثلة عملية

### مدرسة الشيخ سيف بن حمد الأغبري

```text
https://ma1980jid.github.io/school-timer/index.html?school=alsheikh-saif&view=mobile&v=no-default-logo-01
```

```text
https://ma1980jid.github.io/school-timer/dashboard-v2.html?school=alsheikh-saif
```

### مدرسة عبدالله بن الأرقم

```text
https://ma1980jid.github.io/school-timer/index.html?school=abdullahalarqam&view=mobile&v=no-default-logo-01
```

```text
https://ma1980jid.github.io/school-timer/dashboard-v2.html?school=abdullahalarqam
```

## ملاحظات مهمة

- لا تستخدم رابطًا بدون school عند إرسال رابط مدرسة.
- لا تستخدم school=alsheikh-saif إلا لمدرسة الشيخ سيف فقط.
- عند ظهور بيانات مدرسة أخرى، افحص أولًا قيمة school في الرابط.
- عند التثبيت على الهاتف، افتح صفحة التثبيت الخاصة بالمدرسة نفسها.

## قالب جاهز لإرسال الروابط لمدرسة

```text
روابط مؤقت الحصص المدرسي:

رابط الهاتف والآيباد:
https://ma1980jid.github.io/school-timer/index.html?school=school-slug&view=mobile&v=no-default-logo-01

رابط شاشة الحاسوب:
https://ma1980jid.github.io/school-timer/index.html?school=school-slug&view=desktop&v=no-default-logo-01

رابط لوحة مدير المدرسة:
https://ma1980jid.github.io/school-timer/dashboard-v2.html?school=school-slug

رابط التثبيت:
https://ma1980jid.github.io/school-timer/install.html?school=school-slug
```
