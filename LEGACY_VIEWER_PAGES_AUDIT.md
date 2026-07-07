# تقرير فحص صفحات viewer القديمة

تاريخ الفحص: 2026-07-07

الفرع: `audit-legacy-viewer-pages` من آخر `small-fixes`

نطاق الفحص: الصفحات التالية فقط دون حذف أو نقل أو تعديل أي ملف تشغيل:

- `viewer-clean.html`
- `viewer-clean2.html`
- `viewer-old-design.html`
- `viewer-original.html`

ملخص سريع:

- كل الصفحات الأربع موجودة في المستودع.
- `viewer-clean.html` و `viewer-clean2.html` تعتمدان على محرك مستقل هو `viewer-clean.js` وتصميم مستقل هو `viewer-clean.css`.
- `viewer-old-design.html` تعتمد على ملفات التشغيل الرئيسية الحالية، لكنها تستخدم أرقام نسخ قديمة وبعض منطق قديم داخل الصفحة.
- `viewer-original.html` تحتوي اعتمادًا مباشرًا على ملف غير موجود: `viewer-original.js`، لذلك لا يتوقع أن تعمل وظيفيًا بشكل كامل.
- لم يظهر أن هذه الصفحات مرتبطة من `index.html` أو لوحة مدير النظام كمسار تشغيل أساسي.

## أولًا: حالة كل صفحة

| اسم الصفحة | موجودة / غير موجودة | هل تفتح نظريًا | الملفات التي تعتمد عليها | هل توجد ملفات مفقودة |
|---|---|---|---|---|
| `viewer-clean.html` | موجودة | نعم نظريًا بشرط وجود `school=slug` واتصال Supabase | `viewer-clean.css`, Supabase CDN, `supabase-config.js`, `viewer-clean.js`, `icons/school_logo.png`, و `mobile-bg.webp` عبر CSS | لا توجد ملفات محلية مفقودة واضحة |
| `viewer-clean2.html` | موجودة | نعم نظريًا بشرط وجود `school=slug` واتصال Supabase | `viewer-clean.css`, Supabase CDN, `supabase-config.js`, `viewer-clean.js`, `icons/school_logo.png`, و `mobile-bg.webp` عبر CSS | لا توجد ملفات محلية مفقودة واضحة |
| `viewer-old-design.html` | موجودة | نعم نظريًا، لكنها تعتمد على مسار قديم من ملفات العرض وقد تحتاج اختبارًا يدويًا | `style.css`, `ticker-fix.css`, Supabase CDN, `supabase-config.js`, `viewer-multischool-identity.js`, `script.js`, `script-optimizations.js`, `ticker-messages.js`, `viewer-multischool-message-guard.js`, `text-corrections.js`, `viewer-alerts-external-fix.js`, `viewer-phone-notification-android-fix.js`, `desktop-bg.webp`, `mobile-bg.webp`, `icons/school_logo.png` | لا توجد ملفات محلية مفقودة واضحة، لكن أرقام النسخ قديمة مقارنة بمسار `index.html` الحالي |
| `viewer-original.html` | موجودة | لا يتوقع أن تعمل وظيفيًا بشكل كامل | `style.css`, `ticker-fix.css`, Supabase CDN, `supabase-config.js`, `viewer-original.js`, `desktop-bg.webp`, `mobile-bg.webp`, `icons/school_logo.png` | نعم: `viewer-original.js` غير موجود في شجرة `small-fixes` |

## ثانيًا: الملفات المرتبطة بكل صفحة

| الصفحة | CSS المستخدم | JS المستخدم | هل الملف موجود |
|---|---|---|---|
| `viewer-clean.html` | `viewer-clean.css?v=clean-01` | Supabase CDN | CSS موجود، وSupabase ملف خارجي |
| `viewer-clean.html` | — | `supabase-config.js?v=clean-01` | موجود |
| `viewer-clean.html` | — | `viewer-clean.js?v=clean-01` | موجود |
| `viewer-clean2.html` | `viewer-clean.css?v=clean-02` | Supabase CDN | CSS موجود، وSupabase ملف خارجي |
| `viewer-clean2.html` | — | `supabase-config.js?v=clean-02` | موجود |
| `viewer-clean2.html` | — | `viewer-clean.js?v=clean-02` | موجود |
| `viewer-old-design.html` | `style.css?v=optimized-02` | Supabase CDN | موجود، وSupabase ملف خارجي |
| `viewer-old-design.html` | `ticker-fix.css?v=loop-10` | `supabase-config.js?v=old-design-02` | موجود |
| `viewer-old-design.html` | — | `viewer-multischool-identity.js?v=multi-identity-04` | موجود |
| `viewer-old-design.html` | — | `script.js?v=optimized-02` | موجود |
| `viewer-old-design.html` | — | `script-optimizations.js?v=no-default-school-01` | موجود |
| `viewer-old-design.html` | — | `ticker-messages.js?v=optimized-11` | موجود |
| `viewer-old-design.html` | — | `viewer-multischool-message-guard.js?v=multi-message-03` | موجود |
| `viewer-old-design.html` | — | `text-corrections.js?v=text-corrections-05` | موجود |
| `viewer-old-design.html` | — | `viewer-alerts-external-fix.js?v=external-alerts-02` | موجود |
| `viewer-old-design.html` | — | `viewer-phone-notification-android-fix.js?v=android-phone-alerts-01` | موجود |
| `viewer-original.html` | `style.css?v=optimized-02` | Supabase CDN | موجود، وSupabase ملف خارجي |
| `viewer-original.html` | `ticker-fix.css?v=loop-10` | `supabase-config.js?v=original-01` | موجود |
| `viewer-original.html` | — | `viewer-original.js?v=original-01` | غير موجود |

ملاحظات على الصور والموارد:

| الصفحة | الصور أو الموارد المرئية | الحالة |
|---|---|---|
| `viewer-clean.html` | `icons/school_logo.png`, و `mobile-bg.webp` من `viewer-clean.css` | موجودة |
| `viewer-clean2.html` | `icons/school_logo.png`, و `mobile-bg.webp` من `viewer-clean.css` | موجودة |
| `viewer-old-design.html` | `desktop-bg.webp`, `mobile-bg.webp`, `icons/school_logo.png` | موجودة |
| `viewer-original.html` | `desktop-bg.webp`, `mobile-bg.webp`, `icons/school_logo.png` | موجودة |

## ثالثًا: هل الصفحة مستخدمة داخل المشروع؟

نتائج البحث داخل ملفات المشروع النصية على فرع `small-fixes`:

| الصفحة | أين ذُكرت داخل الملفات | هل يوجد رابط مباشر لها |
|---|---|---|
| `viewer-clean.html` | مذكورة في `viewer-clean.js` داخل رسالة مثال عند غياب `school`، ومذكورة في `PRODUCTION_CLEANUP_AUDIT.md` كتقرير سابق | لا يظهر رابط تشغيل مباشر من `index.html` أو لوحات الإدارة |
| `viewer-clean2.html` | مذكورة في `PRODUCTION_CLEANUP_AUDIT.md` فقط | لا يظهر رابط تشغيل مباشر من `index.html` أو لوحات الإدارة |
| `viewer-old-design.html` | مذكورة في `PRODUCTION_CLEANUP_AUDIT.md` فقط | لا يظهر رابط تشغيل مباشر من `index.html` أو لوحات الإدارة |
| `viewer-original.html` | مذكورة في `PRODUCTION_CLEANUP_AUDIT.md` فقط | لا يظهر رابط تشغيل مباشر من `index.html` أو لوحات الإدارة |

استنتاج هذه النقطة: لا توجد إشارة واضحة أن الصفحات الأربع جزء من مسار التشغيل الحالي، لكن وجود روابط منشورة خارجيًا خارج المستودع لا يمكن نفيه من داخل الكود وحده.

## رابعًا: قرار مبدئي

| الصفحة | إبقاء / أرشفة لاحقًا / حذف لاحقًا | درجة الخطورة | السبب |
|---|---|---|---|
| `viewer-clean.html` | أرشفة لاحقًا بعد اختبار يدوي | متوسطة | صفحة تجريبية/بديلة تعتمد على `viewer-clean.js`، وكل ملفاتها موجودة، لكنها ليست مرتبطة من مسار التشغيل الأساسي. لا يُنصح بحذفها قبل التأكد من عدم وجود روابط منشورة لها. |
| `viewer-clean2.html` | أرشفة لاحقًا بعد اختبار يدوي | متوسطة | نسخة ثانية شبيهة جدًا بـ `viewer-clean.html` وتعتمد على نفس CSS/JS. الاشتباه قوي أنها نسخة تكرارية للاختبار. |
| `viewer-old-design.html` | إبقاء الآن، ثم اختبار يدوي قبل أي أرشفة | عالية | تعتمد على ملفات التشغيل الرئيسية مثل `script.js` و`viewer-multischool-identity.js`. أي قرار بشأنها قد يختلط مع مسار العرض الحالي، كما أنها تحمل منطقًا قديمًا وأرقام نسخ قديمة. |
| `viewer-original.html` | أرشفة لاحقًا بعد التأكد من عدم وجود رابط خارجي | متوسطة إلى عالية | الصفحة تستدعي `viewer-original.js` وهو غير موجود، لذلك يرجح أنها لا تعمل. الخطر ليس تقنيًا فقط، بل احتمال وجود رابط خارجي قديم إليها. |

## خامسًا: التوصية النهائية

### الصفحات الآمنة للأرشفة لاحقًا

| الصفحة | سبب الترشيح للأرشفة لاحقًا |
|---|---|
| `viewer-clean2.html` | تبدو نسخة ثانية تكرارية من `viewer-clean.html` مع اختلاف رقم النسخة فقط تقريبًا. |
| `viewer-original.html` | تعتمد على ملف JS مفقود، لذلك ليست صفحة تشغيل مكتملة حاليًا. |

### الصفحات التي تحتاج اختبارًا يدويًا أولًا

| الصفحة | سبب الحاجة لاختبار يدوي |
|---|---|
| `viewer-clean.html` | تعمل بمحرك مستقل `viewer-clean.js` وقد تكون استُخدمت كرابط اختبار أو رابط بديل لبعض المدارس. |
| `viewer-clean2.html` | لأنها تستخدم نفس محرك `viewer-clean.js` وربما كانت نسخة اختبار هاتف/حاسوب. |
| `viewer-old-design.html` | لأنها تستخدم ملفات التشغيل الرئيسية وقد تفتح بشكل قريب من العرض الحالي، لكن بأرقام نسخ ومنطق قديم. |
| `viewer-original.html` | للتأكد فقط من عدم وجود اعتماد خارجي، رغم أن `viewer-original.js` مفقود. |

### الصفحات التي لا يجب لمسها الآن

| الصفحة | السبب |
|---|---|
| `viewer-old-design.html` | لا تُنقل ولا تُحذف في المرحلة الحالية لأنها تتشارك ملفات كثيرة مع مسار العرض الحالي، وتحتاج قرارًا منفصلًا بعد اختبار رابط مباشر. |
| `viewer-clean.html` | لا تُحذف الآن لأن `viewer-clean.js` يشير إليها صراحة في رسالة الخطأ، ولأنها قد تكون صفحة اختبار مفيدة. |

### توصيات تنفيذ آمنة لاحقًا

1. اختبار فتح كل صفحة يدويًا بروابط تحتوي `school=school-mr7hmic2&view=mobile` و`view=desktop`.
2. تسجيل نتيجة كل صفحة: هل تعرض الهوية؟ هل تعرض الجدول؟ هل تظهر رسائل خطأ؟
3. إذا لم توجد روابط خارجية لهذه الصفحات، يمكن نقل `viewer-clean2.html` و`viewer-original.html` إلى أرشيف في مرحلة لاحقة.
4. لا يُنصح بحذف أي ملف CSS أو JS مرتبط بهذه الصفحات في نفس المرحلة؛ إن حدثت أرشفة لاحقًا فلتكن للصفحات HTML فقط أولًا.
5. قبل أي حذف نهائي، يجب فحص GitHub Pages أو أي روابط منشورة للمدارس للتأكد أنها لا تشير إلى هذه الصفحات.

## نتيجة الالتزام بالقيود

- لم يتم حذف أي ملف.
- لم يتم نقل أي ملف.
- لم يتم تعديل `index.html`.
- لم يتم تعديل `style.css`.
- لم يتم تعديل أي JavaScript.
- لم يتم تعديل PWA أو Manifest أو Service Worker.
- لم يتم تعديل Supabase.
- التغيير الوحيد المقترح في هذا الفرع هو إضافة هذا التقرير فقط.
