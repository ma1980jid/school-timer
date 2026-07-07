# تقرير تدقيق تنظيف الإنتاج لمشروع مؤقت الحصص

تاريخ التقرير: 2026-07-07  
الفرع الأساسي المفحوص: `small-fixes`  
فرع التقرير: `production-cleanup-audit`

هذا التقرير تدقيق فقط. لم يتم حذف أو نقل أو تعديل ملفات التشغيل أو التصميم أو PWA أو Supabase. الملف الوحيد المضاف في هذا الفرع هو هذا التقرير.

## ملخص سريع

- شاشة العرض الأساسية تبدأ من `index.html`.
- `index.html` يحمّل `style.css` و`ticker-fix.css` مباشرة، ثم يحمّل ملفات JavaScript الأساسية للعرض.
- `supabase-config.js` ليس مجرد ملف إعدادات؛ هو أيضًا محمّل ديناميكي لملفات إضافية حسب الصفحة:
  - في `index.html`: يضيف `mobile-current-row-clean.css` و`viewer-schedule-sync.js`، ثم بعد تحميل الصفحة يضيف `viewer-alerts-v2.js`.
  - في `dashboard-v2.html`: يضيف عدة ملفات dashboard مساعدة.
  - في `install.html`: يتجنب تحميل ملفات العرض الثقيلة.
- `viewer-schedule-sync.js` يحمّل `viewer-schedule-direct.js` ديناميكيًا.
- `text-corrections.js` يحمّل `viewer-school-identity.js` و`viewer-theme-manager.js` و`viewer-db-schedule-loader.js` ديناميكيًا.
- `pwa-register.js` يسجل `sw.js`، و`sw.js` بسيط ولا يطبق كاش فعلي حاليًا.
- توجد ملفات قديمة/تجريبية واضحة مثل صفحات `viewer-clean*` و`viewer-old*` وملفات داخل `archive/experimental-fixes`، لكنها تحتاج عدم حذف مباشر قبل اختبار الروابط المنشورة.

## ملفات CSS و JavaScript المحملة فعليًا من `index.html`

### CSS مباشر من `index.html`

| الملف | طريقة التحميل | ملاحظة |
|---|---|---|
| Google Font: `Aref Ruqaa` | `<link href="https://fonts.googleapis.com/...">` | خاص بخط اسم المدرسة. |
| `style.css?v=aref-ruqaa-01` | مباشر | التصميم الأساسي لشاشة العرض. |
| `ticker-fix.css?v=loop-10` | مباشر | إصلاح/تنسيق شريط الرسائل. |

### JavaScript مباشر من `index.html`

| الملف | طريقة التحميل | ملاحظة |
|---|---|---|
| Supabase CDN | مباشر | مكتبة Supabase. |
| `supabase-config.js?v=optimized-04` | مباشر | إعدادات Supabase وتحميل ديناميكي حسب الصفحة. |
| `viewer-multischool-identity.js?v=stable-manifest-03` | مباشر | هوية المدرسة، الشعار، manifest ديناميكي عند عدم وجود manifest ثابت. |
| `script.js?v=optimized-02` | مباشر | محرك المؤقت والجدول الأساسي. |
| `script-optimizations.js?v=after-school-01` | مباشر | تحسينات/تصحيحات تشغيلية فوق `script.js`. |
| `ticker-messages.js?v=optimized-12` | مباشر | رسائل الشريط. |
| `viewer-multischool-message-guard.js?v=multi-message-03` | مباشر | حماية رسائل المدرسة حسب slug. |
| `text-corrections.js?v=text-corrections-06` | مباشر | تصحيحات نصية وتحميل هوية/ثيم/محمّل جدول DB. |
| `viewer-alerts-external-fix.js?v=external-alerts-02` | مباشر | إصلاح تنبيهات خارجية. |
| `viewer-phone-notification-android-fix.js?v=android-phone-alerts-01` | مباشر | إصلاح إشعارات الهاتف/Android. |
| `pwa-register.js?v=stable-proof-01` | مباشر | تسجيل Service Worker. |

### ملفات يضيفها التشغيل ديناميكيًا في شاشة العرض

| الملف | من يحمّله | ملاحظة |
|---|---|---|
| `mobile-current-row-clean.css?v=mobile-row-01` | `supabase-config.js` | يحمّل في غير `install.html` وغير dashboard. |
| `viewer-schedule-sync.js?v=schedule-sync-05` | `supabase-config.js` | وسيط تحميل جدول العرض المباشر. |
| `viewer-alerts-v2.js?v=viewer-alerts-04` | `supabase-config.js` بعد حدث `load` | نظام تنبيهات العرض. |
| `viewer-schedule-direct.js?v=schedule-direct-05` | `viewer-schedule-sync.js` | يستبدل دوال الجدول فقط عند توفر صفوف صحيحة. |
| `viewer-school-identity.js?v=identity-01` | `text-corrections.js` | هوية إضافية/قديمة للمدرسة. |
| `viewer-theme-manager.js?v=theme-01` | `text-corrections.js` | إدارة الثيم. |
| `viewer-db-schedule-loader.js?v=db-schedule-01` | `text-corrections.js` | قراءة `school_schedule_rows` عند استخدامها. |

## أولًا: ملفات أساسية لا تُلمس

| اسم الملف | السبب | أين يُستخدم |
|---|---|---|
| `index.html` | نقطة دخول شاشة المؤقت الأساسية. | روابط المدارس للهاتف والحاسوب. |
| `style.css` | التصميم الأساسي للخلفيات، البطاقات، الجدول، الهاتف والحاسوب. | محمّل مباشرة من `index.html` ونسخ العرض القديمة. |
| `script.js` | محرك المؤقت الأساسي والـ fallback للجدول. | محمّل مباشرة من `index.html`. |
| `script-optimizations.js` | تحسينات مهمة فوق محرك العرض، ومنها نصوص نهاية اليوم. | محمّل مباشرة من `index.html`. |
| `supabase-config.js` | إعداد URL/key/slug وتحميل ملفات ديناميكية للعرض واللوحة. | `index.html`, `install.html`, `dashboard-v2.html`, `system-admin.html`, صفحات viewer-clean. |
| `viewer-multischool-identity.js` | جلب هوية المدرسة، الشعار، الكاش، manifest الديناميكي عند الحاجة. | `index.html`, `install.html`, `viewer-old-design.html`. |
| `viewer-multischool-message-guard.js` | يمنع خلط رسائل المدارس. | `index.html`. |
| `ticker-messages.js` | رسائل الشريط في شاشة العرض. | `index.html`. |
| `ticker-fix.css` | إصلاح عرض شريط الرسائل. | `index.html`. |
| `text-corrections.js` | تصحيحات نصية وتحميل `viewer-school-identity.js` و`viewer-theme-manager.js` و`viewer-db-schedule-loader.js`. | `index.html`. |
| `viewer-schedule-sync.js` | يحمّل `viewer-schedule-direct.js` عند العرض. | محمّل ديناميكيًا من `supabase-config.js`. |
| `viewer-schedule-direct.js` | مصدر جدول مباشر عند وجود صفوف صحيحة. | محمّل من `viewer-schedule-sync.js`. |
| `viewer-db-schedule-loader.js` | تجهيز قراءة `school_schedule_rows` مع fallback آمن. | محمّل من `text-corrections.js`. |
| `viewer-alerts-v2.js` | نظام التنبيهات الحديث. | محمّل ديناميكيًا من `supabase-config.js`. |
| `viewer-alerts-external-fix.js` | إصلاح تنبيهات خارجية/تكاملية. | `index.html`. |
| `viewer-phone-notification-android-fix.js` | إصلاح مرتبط بالهاتف/Android. | `index.html`. |
| `mobile-current-row-clean.css` | تنظيف عرض الصف الحالي في الهاتف. | محمّل ديناميكيًا من `supabase-config.js`. |
| `pwa-register.js` | تسجيل Service Worker. | `index.html`. |
| `sw.js` | Service Worker بسيط لدعم قابلية PWA. | مسجل من `pwa-register.js`. |
| `manifest.json` | manifest ثابت عام، حتى لو توجد manifests خاصة. | متاح للمراجعة/السيناريوهات العامة. |
| `manifests/school-mr7hmic2.webmanifest` | manifest ثابت لإثبات تثبيت PWA للمدرسة التجريبية. | يضاف مبكرًا من `index.html` عند `school=school-mr7hmic2`. |
| `icons/pwa-192.png` | أيقونة PWA عامة 192. | manifests / fallback. |
| `icons/pwa-512.png` | أيقونة PWA عامة 512. | manifests / fallback. |
| `icons/school_logo.png` | شعار/أيقونة عامة حالية. | favicons وmanifest القديم وبعض fallbacks. |
| `desktop-bg.webp` | خلفية الحاسوب. | `style.css`. |
| `mobile-bg.webp` | خلفية الهاتف. | `style.css`. |
| `install.html` | صفحة توليد روابط التثبيت والQR. | روابط التثبيت من لوحة النظام. |
| `install-page.js` | توليد روابط الهاتف والحاسوب والQR في صفحة التثبيت. | `install.html`. |
| `dashboard-v2.html` | لوحة المدرسة/إدارة التواقيت، بداخلها CSS/JS كبير مدمج. | روابط إدارة المدرسة. |
| `dashboard-schedule-sync.js` | مزامنة جدول اللوحة مع Supabase. | محمّل ديناميكيًا في `dashboard-v2.html` عبر `supabase-config.js`. |
| `dashboard-alert-settings.js` | إعدادات التنبيهات من لوحة المدرسة. | ديناميكيًا عبر `supabase-config.js`. |
| `dashboard-messages.js` | رسائل لوحة المدرسة. | ديناميكيًا عبر `supabase-config.js`. |
| `dashboard-v2-fixes.js` | إصلاحات واجهة لوحة المدرسة. | ديناميكيًا عبر `supabase-config.js`. |
| `dashboard-title-layout-fix.js` | إصلاح عنوان اللوحة. | ديناميكيًا عبر `supabase-config.js`. |
| `dashboard-links-compact-fix.js` | إصلاح عرض الروابط في اللوحة. | ديناميكيًا عبر `supabase-config.js`. |
| `dashboard-center-school-name.js` | ضبط اسم المدرسة في اللوحة. | ديناميكيًا عبر `supabase-config.js`. |
| `dashboard-stable-links.js` | تثبيت روابط العرض في اللوحة. | ديناميكيًا عبر `supabase-config.js`. |
| `dashboard-single-design-lock.js` | قفل التصميم الواحد في اللوحة. | ديناميكيًا عبر `supabase-config.js`. |
| `system-admin.html` | لوحة مدير النظام. | دخول مدير النظام. |
| `system-admin.js` | منطق إدارة المدارس والرفع والروابط. | `system-admin.html`. |
| `system-install-link-fix.js` | إصلاح روابط التثبيت/المشاركة وحذف المدارس المساعد. | `system-admin.html`. |
| `database/*.sql` | SQL migrations/إصلاحات مهمة. | تنفيذ يدوي في Supabase عند الحاجة. |
| `supabase/config.toml` | إعداد Supabase functions. | Supabase CLI/functions. |
| `supabase/functions/school-share/index.ts` | Edge Function لمعاينة المشاركة، غير مستخدمة حاليًا في الروابط حسب القرار الأخير لكنها موجودة. | Supabase functions، إن نُشرت أو استُخدمت لاحقًا. |
| `vercel.json` | إعداد نشر محتمل على Vercel. | فقط إذا كان Vercel مستخدمًا. |

## ثانيًا: ملفات مشكوك أنها قديمة

| اسم الملف | سبب الاشتباه | درجة الخطورة إذا حذفناه |
|---|---|---|
| `after-school-label-fix.js` | لا يظهر محمّلًا من `index.html` الحالي، ومنطق نهاية الدوام أصبح موجودًا في `script.js`/`script-optimizations.js`/`viewer-schedule-direct.js`. | متوسطة: قد يكون رابط قديم أو صفحة قديمة ما زالت تعتمد عليه. |
| `activity-no-redistribute.js` | لا يظهر في التحميل المباشر أو الديناميكي الحالي. | متوسطة: قد يكون تجربة قديمة لحصة النشاط. |
| `middle-cards-content.js` | لا يظهر في التحميل الحالي؛ `index.html` يحتوي منطق بطاقات وسطية داخليًا. | متوسطة. |
| `mobile-school-heading.js` | لا يظهر في التحميل الحالي؛ قد يكون استبدل بمنطق `text-corrections.js`/identity. | متوسطة. |
| `pwa-dynamic-icon.js` | لا يظهر محمّلًا حاليًا، وربما من تجارب PWA السابقة. | متوسطة إلى عالية: لا يحذف قبل اختبار Android/iPhone. |
| `pwa-school-redirect.js` | لا يظهر محمّلًا حاليًا، وقد يكون من تجارب start_url/redirect القديمة. | متوسطة إلى عالية. |
| `viewer-alerts.js` | يوجد `viewer-alerts-v2.js` مستخدم حاليًا؛ النسخة القديمة لا تظهر محملة. | متوسطة. |
| `viewer-auto-theme-v2.js` | لا يظهر محمّلًا؛ المستخدم الحالي عبر `viewer-theme-manager.js`/`viewer-auto-theme.js`. | متوسطة. |
| `system-admin-single-design-cleanup.js` | لا يظهر محمّلًا من `system-admin.html`. | متوسطة. |
| `system-auto-theme-admin.js` | يذكر `system-admin.html` في داخله أو حسب البحث، لكنه غير محمّل مباشرة من `system-admin.html`. | متوسطة. |
| `dashboard-display-message-sync.js` | لا يظهر في تحميل `dashboard-v2.html` أو `supabase-config.js` الحالي. | متوسطة. |
| `viewer-old-design.html` | صفحة عرض قديمة تحمل ملفات قديمة الإصدار. | عالية إذا كانت روابط قديمة منشورة تستخدمها. |
| `viewer-original.html` | صفحة عرض أصلية/قديمة وتعتمد على `viewer-original.js` غير موجود في الشجرة الحالية. | عالية: وجود مرجع لملف غير موجود يعني إما صفحة مهجورة أو نقص ملف. |
| `viewer-clean.html` | صفحة تجربة/تصميم نظيف منفصل. | متوسطة إلى عالية إذا كانت مستخدمة للاختبار أو روابط خارجية. |
| `viewer-clean2.html` | نسخة ثانية من صفحة viewer clean. | متوسطة إلى عالية. |
| `viewer-clean.css` | مرتبط بصفحات `viewer-clean*.html`. | متوسطة. |
| `viewer-clean.js` | مرتبط بصفحات `viewer-clean*.html`. | متوسطة. |
| `viewer-old-design-fix.css` | لا يظهر محمّلًا من `viewer-old-design.html` الحالي. | متوسطة. |
| `viewer-old-table-v2.css` | لا يظهر محمّلًا حاليًا. | متوسطة. |
| `viewer-design-themes.css` | يظهر فقط كإشارة في `text-corrections.js` وليس واضحًا هل يحمّل دائمًا. | متوسطة. |

## ثالثًا: ملفات يمكن نقلها للأرشيف لاحقًا

| اسم الملف | السبب | هل تحتاج مراجعة قبل النقل |
|---|---|---|
| `archive/experimental-fixes/system-admin-delete-school.js` | موجود أصلًا داخل archive/experimental-fixes. | نعم، للتأكد أنه غير مطلوب كمرجع. |
| `archive/experimental-fixes/system-admin-delete-verify.js` | تجربة حذف/تحقق قديمة. | نعم. |
| `archive/experimental-fixes/viewer-no-default-school.js` | تجربة منع المدرسة الافتراضية القديمة. | نعم. |
| `viewer-clean.html` | صفحة تجربة/بديل وليست ضمن مسار الإنتاج الأساسي. | نعم، افحص الروابط المنشورة أولًا. |
| `viewer-clean2.html` | نسخة تجربة ثانية. | نعم. |
| `viewer-old-design.html` | صفحة قديمة، لكن قد توجد روابط خارجية لها. | نعم، عالية الحساسية. |
| `viewer-original.html` | صفحة أصلية/قديمة وبها مرجع إلى `viewer-original.js` غير موجود. | نعم. |
| `viewer-clean.css` | تابع لصفحات viewer-clean. | نعم. |
| `viewer-clean.js` | تابع لصفحات viewer-clean. | نعم. |
| `viewer-old-design-fix.css` | يبدو مرتبطًا بتصميم قديم وليس محمّلًا. | نعم. |
| `viewer-old-table-v2.css` | يبدو تجربة جدول قديمة. | نعم. |
| `docs/*` | وثائق مراحل وتدقيق سابقة. | لا تُحذف؛ يمكن تنظيمها داخل docs/archive فقط بعد موافقة. |
| `STABLE_*.md` | توثيق نسخ مستقرة سابقة في الجذر. | نعم، يفضل نقلها إلى `docs/stable/` لاحقًا بدل الحذف. |
| `OPTIMIZATION_REPORT.txt` | تقرير قديم. | نعم. |
| `pages-rebuild.txt` | ملاحظة/تقرير قديم محتمل. | نعم. |

## رابعًا: ملفات لا يعرف Codex هل هي مستخدمة أم لا

| اسم الملف | سبب عدم التأكد |
|---|---|
| `reset.html` | موجود كصفحة مستقلة، ولم يظهر تحميله من صفحة رئيسية، لكن قد يكون رابطًا يدويًا لإعادة ضبط المستخدمين. |
| `vercel.json` | لا يمكن الجزم إن كان النشر على Vercel ما زال مستخدمًا بجانب GitHub Pages. |
| `manifest.json` | `index.html` لا يضع link ثابت عام حاليًا إلا manifest خاص لمدرسة محددة، لكن الملف قد يلزم كfallback أو لتجارب/متصفحات. |
| `supabase/functions/school-share/index.ts` | القرار الأخير كان عدم استخدام رابط Edge Function في لوحة النظام، لكن قد تكون الدالة منشورة أو مستخدمة خارجيًا. |
| `supabase/config.toml` | تابع للدالة أعلاه؛ لا ينقل قبل حسم مصير Edge Function. |
| `viewer-school-identity.js` | محمّل ديناميكيًا من `text-corrections.js`، لكن هناك تداخل وظيفي مع `viewer-multischool-identity.js`. لا يُحذف قبل مراجعة الدمج. |
| `viewer-db-schedule-loader.js` | محمّل ديناميكيًا من `text-corrections.js`، لكنه ليس المصدر الأساسي الحالي دائمًا. يحتاج قرار معماري. |
| `viewer-theme-manager.js` | محمّل من `text-corrections.js`; دوره العملي يحتاج اختبار ثيمات المدارس. |
| `viewer-auto-theme.js` | يحمّله `viewer-school-identity.js`، لذلك لا يظهر من HTML مباشرة. |
| `viewer-auto-theme-v2.js` | لا يظهر محمّلًا؛ غير واضح هل متروك لتجربة لاحقة. |
| `scheduled-announcements-admin.js` | يظهر كإشارة من `dashboard-v2-fixes.js`، لكن لم يتأكد التقرير هل يُحمّل في كل الحالات أو عند ميزة معينة فقط. |
| `system-auto-theme-admin.js` | غير محمّل مباشرة من `system-admin.html`، وقد يكون تجربة إدارة ثيمات. |
| `dashboard-display-message-sync.js` | اسمه يوحي بالمزامنة، لكنه غير ظاهر في قائمة تحميل dashboard الحالية. |
| `activity-no-redistribute.js` | لا يظهر في مسار التحميل الحالي، لكن قد يكون محفوظًا لحالة نشاط محددة. |
| `mobile-school-heading.js` | لا يظهر محمّلًا، لكن قد يكون مطلوبًا لتصحيح سابق في فرع آخر. |
| `middle-cards-content.js` | محتوى البطاقات الوسطية قد صار داخل `index.html`/Supabase، لكن لا يُحذف قبل اختبار. |

## خامسًا: توصيات لتخفيف البرنامج

| المجال | التوصية | درجة الأمان |
|---|---|---|
| حذف تحميلات غير ضرورية | راقب `index.html` + التحميلات الديناميكية من `supabase-config.js` في المتصفح، ثم أثبت أي ملفات لا تُطلب Network قبل إزالة تحميلها. | آمن إذا بدأ برصد فقط. |
| دمج ملفات العرض | يمكن لاحقًا دمج بعض تصحيحات `script-optimizations.js` و`text-corrections.js` داخل `script.js` بعد اختبار حالات قبل/أثناء/بعد الدوام. | متوسط؛ يحتاج اختبارات وقتية. |
| دمج هوية المدرسة | يوجد تداخل بين `viewer-multischool-identity.js` و`viewer-school-identity.js`. الأفضل تحديد ملف هوية واحد مسؤول عن الاسم/الشعار/الكاش ثم إزالة الطبقات الزائدة تدريجيًا. | متوسط إلى عالٍ. |
| توحيد مصدر الجدول | حاليًا يوجد `script.js` fallback، و`viewer-schedule-direct.js`، و`viewer-db-schedule-loader.js`. يفضل اعتماد ترتيب واضح: DB rows إن صحت، direct message/cache إن صحت، ثم fallback. | متوسط. |
| تقليل الكاش | وثّق مفاتيح localStorage المستخدمة (`school_timer_identity_`, `school_timer_settings_`, `school_timer_direct_schedule_`, إلخ) وأضف إصدار schema موحد بدل تنظيف متفرق. | متوسط. |
| تحسين الصور | راجع أبعاد وحجم `desktop-bg.webp`, `mobile-bg.webp`, `icons/school_logo.png`, `icons/pwa-*.png`. لا تستبدل قبل مقارنة بصرية. | آمن إذا بدأ بقياس فقط. |
| تحسين الخطوط | تحميل Google Font يجب أن يبقى محصورًا في اسم المدرسة فقط. يمكن إضافة `font-display=swap` موجودة بالفعل في رابط Aref Ruqaa. | آمن. |
| تنظيم الوثائق | نقل `STABLE_*.md` إلى `docs/stable/` لاحقًا يقلل ازدحام الجذر دون حذف محتوى. | آمن بعد موافقة. |
| تنظيم التجارب | نقل صفحات `viewer-clean*`, `viewer-old*` إلى `archive/viewers/` بعد التأكد من عدم وجود روابط منشورة. | متوسط. |
| فحص الروابط المنشورة | قبل أي حذف أو نقل: ابحث في GitHub Pages، لوحة النظام، QR، ووثائق المدارس عن روابط للصفحات القديمة. | ضروري. |

## ملاحظات خاصة على الملفات المطلوبة في الطلب

| الملف | نتيجة الفحص |
|---|---|
| `manifest.json` | موجود، يحتوي start_url عام `index.html?view=mobile&pwa=1` وأيقونات `icons/school_logo.png`. لا يظهر كـ manifest ثابت عام مبكر في `index.html` الحالي، بسبب وجود manifest خاص للمدرسة التجريبية ومنطق manifest ديناميكي. |
| `sw.js` | بسيط جدًا: `skipWaiting`, `clients.claim`, وfetch listener فارغ. لا يوجد كاش فعلي. |
| `pwa-register.js` | يسجل `sw.js` بـ scope `./`. مستخدم من `index.html`. |
| `viewer-multischool-identity.js` | أساسي للهوية والكاش والشعار وmanifest الديناميكي، ويحتوي حماية للmanifest الثابت الخاص بـ `school-mr7hmic2`. |
| `viewer-school-identity.js` | محمّل من `text-corrections.js`، وقد يكرر جزءًا من الهوية. لا يُحذف قبل توحيد الهوية. |
| `viewer-schedule-direct.js` | مستخدم فعليًا عبر `viewer-schedule-sync.js`. لا يلمس إلا بعد اختبار fallback. |
| `viewer-db-schedule-loader.js` | مستخدم فعليًا عبر `text-corrections.js`، لكنه ليس مصدر التشغيل الأساسي دائمًا. |
| `install.html` | صفحة تثبيت خفيفة نسبيًا؛ تحمل `install-page.js`, Supabase CDN, `supabase-config.js`, `viewer-multischool-identity.js`. |
| `dashboard.html` | غير موجود في الشجرة الحالية. البديل الظاهر هو `dashboard-v2.html`. |
| `dashboard-v2.html` | موجود ومستخدم كلوحة مدرسة، ويحتوي قدرًا كبيرًا من CSS/JS الداخلي، ويستدعي Supabase config. |
| `system-admin.html` | موجود ومستخدم كلوحة مدير النظام، ويحمل `system-admin.js` و`system-install-link-fix.js`. |
| `system-install-link-fix.js` | مستخدم من `system-admin.html`. يحتوي منطق روابط تثبيت وحذف/تنظيف كاش، ويشير إلى `database/delete_school_cascade.sql`. |

## خطة تنظيف آمنة مقترحة لاحقًا

1. مرحلة رصد فقط:
   - افتح `index.html`, `install.html`, `dashboard-v2.html`, `system-admin.html` على GitHub Pages.
   - سجّل كل ملفات Network المحمّلة فعليًا في الهاتف والحاسوب.

2. مرحلة أرشفة بدون حذف:
   - انقل فقط الملفات التجريبية الواضحة إلى `archive/` بعد موافقة، مع تحديث أي روابط إن وجدت.
   - لا تنقل ملفات PWA أو Supabase أو الملفات المحملة ديناميكيًا.

3. مرحلة توحيد الهوية:
   - اختر مسؤولية واحدة بين `viewer-multischool-identity.js` و`viewer-school-identity.js`.
   - اختبر: بدون كاش، مع كاش صحيح، مع كاش قديم، install.html، iPhone، Android.

4. مرحلة توحيد الجدول:
   - وثّق ترتيب مصادر الجدول.
   - لا تلغِ `script.js` fallback.
   - اختبر: لا كاش، كاش فاسد، DB rows صحيحة، رسالة direct صحيحة.

5. مرحلة تخفيف dashboard:
   - `dashboard-v2.html` ضخم ومضمّن. يمكن لاحقًا فصل CSS/JS إلى ملفات، لكن هذا تغيير كبير ولا يدخل في تنظيف سريع.

## خلاصة قرار التنظيف

لا أوصي بحذف أي ملف مباشرة الآن. أفضل أول خطوة آمنة هي:

- إبقاء ملفات التشغيل كما هي.
- أرشفة الوثائق القديمة فقط بعد موافقة.
- اختبار الصفحات القديمة `viewer-clean*`, `viewer-old*`, `viewer-original.html` لمعرفة هل لها روابط منشورة.
- توحيد ملفات الهوية والجدول في مراحل منفصلة بعد اختبارات واضحة.
