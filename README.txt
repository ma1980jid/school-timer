نسخة مؤقت الحصص V3

طريقة التشغيل:
1) افتح index.html?school=alsheikh-saif

المطلوب في Supabase:
- schools.school_slug = alsheikh-saif
- schools.active_schedule_id = رقم التوقيت المناسب
- schedules يحتوي اسم التوقيت
- schedule_items يحتوي فترات اليوم

ملاحظات:
- أيقونة الهاتف تستخدم app_icon_url أو logo_url إذا كان موجودًا في جدول schools.
- هذه نسخة تجريبية محلية. عند النشر على Vercel ستعمل كرابط رسمي.

V4 - روابط المدارس المختصرة على Vercel:
بعد رفع هذا المجلد على Vercel يمكنك استخدام:
/s/alsheikh-saif
بدلاً من:
/index.html?school=alsheikh-saif
