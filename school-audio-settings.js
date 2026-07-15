(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(window.location.search);
  const schoolSlug = (params.get("school") || window.SCHOOL_TIMER_SLUG || "").trim();
  const PROFILE_LABELS = {
    end_only: "النهايات فقط",
    start_and_end: "البداية والنهاية",
  };
  const AUDIENCE_LABELS = { boys: "مدارس البنين", girls: "مدارس البنات" };
  let client = null;
  let currentPreference = null;
  let busy = false;

  function errorText(error) {
    return error?.message || error?.details || String(error || "خطأ غير معروف");
  }

  function sessionKey() {
    return `school_timer_admin_code_${schoolSlug}`;
  }

  function savedSessionCode() {
    try { return sessionStorage.getItem(sessionKey()) || ""; }
    catch (_) { return ""; }
  }

  function storeSessionCode(code) {
    try { sessionStorage.setItem(sessionKey(), code); }
    catch (_) { /* Session storage is optional. */ }
  }

  function forgetSessionCode() {
    try { sessionStorage.removeItem(sessionKey()); }
    catch (_) { /* Session storage is optional. */ }
  }

  function showNotice(message, type = "success", sticky = false) {
    const notice = $("pageNotice");
    clearTimeout(showNotice.timer);
    notice.textContent = message;
    notice.className = `notice ${type}`;
    notice.hidden = false;
    if (!sticky) showNotice.timer = setTimeout(() => { notice.hidden = true; }, 6500);
  }

  function setView(name) {
    $("loadingView").hidden = name !== "loading";
    $("errorView").hidden = name !== "error";
    $("settingsView").hidden = name !== "settings";
  }

  function showError(message) {
    $("errorMessage").textContent = message;
    setView("error");
  }

  function createClient() {
    if (client) return client;
    if (!window.supabase?.createClient || !window.SCHOOL_TIMER_SUPABASE_URL || !window.SCHOOL_TIMER_SUPABASE_ANON_KEY) {
      throw new Error("تعذر تجهيز اتصال Supabase. تأكد من وجود supabase.min.js وsupabase-config.js.");
    }
    client = window.supabase.createClient(
      window.SCHOOL_TIMER_SUPABASE_URL,
      window.SCHOOL_TIMER_SUPABASE_ANON_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    return client;
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(`${value}T12:00:00+04:00`);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("ar-OM", { day: "numeric", month: "short", year: "numeric" }).format(date);
  }

  function selectedProfile() {
    return document.querySelector('input[name="profile"]:checked')?.value || "";
  }

  function markSelectedProfile(profileKey) {
    const input = document.querySelector(`input[name="profile"][value="${profileKey}"]`);
    if (input) input.checked = true;
  }

  function renderGuidance(preference) {
    const rotation = preference.weekly_guidance || {};
    const titles = Array.isArray(preference.weekly_guidance_titles)
      ? preference.weekly_guidance_titles
      : (rotation.selected_asset_keys || []);
    const list = $("guidanceTitles");
    if (!rotation.available || !titles.length) {
      list.innerHTML = "<p>لم يُنشر زوج الإرشادات بعد.</p>";
      $("rotationTitle").textContent = "غير متاح حاليًا";
      $("weekStart").textContent = "الأحد";
      $("nextRotation").textContent = "—";
      $("rotationNote").textContent = "سيظهر تلقائيًا عند نشر الإصدار الرسمي للفئة.";
      return;
    }
    list.replaceChildren(...titles.map((title) => {
      const paragraph = document.createElement("p");
      paragraph.textContent = title;
      return paragraph;
    }));
    $("rotationTitle").textContent = rotation.rotation_enabled ? "مقطعان من الدورة الأسبوعية" : "مقطعان ثابتان";
    $("weekStart").textContent = formatDate(rotation.week_starts_on);
    $("nextRotation").textContent = rotation.rotation_enabled ? formatDate(rotation.next_rotation_on) : "لا يوجد تدوير";
    $("rotationNote").textContent = rotation.rotation_enabled
      ? `يتم اختيار مقطعين من أصل ${rotation.pool_size}، ويتغيران تلقائيًا مع بداية يوم الأحد.`
      : "الحزمة تحتوي مقطعين فقط؛ لذلك يبقيهما النظام ثابتين دون تدوير.";
  }

  function renderPreference(preference) {
    currentPreference = preference;
    $("schoolName").textContent = preference.school_name || preference.school_slug;
    $("schoolSlug").textContent = preference.school_slug;
    $("schoolStatus").textContent = preference.school_active ? "المدرسة مفعلة" : "المدرسة موقوفة";
    $("schoolStatus").classList.toggle("off", !preference.school_active);
    $("audienceLabel").textContent = AUDIENCE_LABELS[preference.audience_key] || "غير محددة";
    $("releaseLabel").textContent = preference.release_available
      ? `v${preference.release_version} · ${preference.release_title || "الإصدار الرسمي"}`
      : "لم يُنشر بعد";
    $("sourceLabel").textContent = preference.updated_source === "school_manager"
      ? "اختيار مدير المدرسة"
      : preference.is_customized ? "تخصيص سابق" : "إعداد الفئة الافتراضي";
    markSelectedProfile(preference.profile_key || "end_only");
    renderGuidance(preference);

    const disabled = !preference.school_active;
    $("profileOptions").disabled = disabled;
    $("adminCode").disabled = disabled;
    $("saveButton").disabled = disabled;
    $("sessionCodeHint").hidden = !savedSessionCode();
    setView("settings");
    if (!preference.release_available) {
      showNotice("يمكن حفظ الاختيار الآن، وسيعمل تلقائيًا عند نشر الإصدار الصوتي الرسمي لهذه الفئة.", "warn", true);
    } else if (disabled) {
      showNotice("المدرسة موقوفة حاليًا، لذلك لا يمكن تغيير النظام الصوتي.", "warn", true);
    }
  }

  async function loadPreference(options = {}) {
    if (!schoolSlug || schoolSlug === "__neutral__") {
      showError("رابط المدرسة غير مكتمل. افتح الصفحة من لوحة المدرسة ليُضاف رمزها إلى الرابط تلقائيًا.");
      return;
    }
    setView("loading");
    $("pageNotice").hidden = true;
    try {
      const db = createClient();
      const { data, error } = await db.rpc("get_school_audio_preference", { p_school_slug: schoolSlug });
      if (error) throw error;
      if (!data?.available) throw new Error(data?.message || "المدرسة غير موجودة أو لم تجهز ترقية الصوتيات بعد.");
      renderPreference(data);
      if (!options.silent) showNotice("تم تحديث بيانات النظام الصوتي.");
    } catch (error) {
      console.error(error);
      const message = errorText(error);
      const missingMigration = /get_school_audio_preference|schema cache|does not exist|PGRST202|42883/i.test(message);
      showError(missingMigration
        ? "لم تُنفذ ترقية قاعدة بيانات الصوتيات v2 بعد. نفّذ ملف windows_audio_central_v2.sql ثم أعد المحاولة."
        : `تعذر تحميل إعدادات المدرسة: ${message}`);
    }
  }

  async function savePreference(event) {
    event.preventDefault();
    if (busy || !currentPreference?.school_active) return;
    const profileKey = selectedProfile();
    const typedCode = $("adminCode").value.trim();
    const adminCode = typedCode || savedSessionCode();
    if (!profileKey) {
      showNotice("اختر النظام الصوتي أولًا.", "warn");
      return;
    }
    if (!adminCode) {
      showNotice("أدخل رمز إدارة المدرسة لتأكيد الحفظ.", "warn");
      $("adminCode").focus();
      return;
    }

    busy = true;
    const button = $("saveButton");
    button.disabled = true;
    button.textContent = "جارٍ التحقق والحفظ…";
    try {
      const db = createClient();
      const { data, error } = await db.rpc("update_school_audio_preference", {
        p_school_slug: schoolSlug,
        p_admin_code: adminCode,
        p_profile_key: profileKey,
      });
      if (error) throw error;
      if (!data?.success) {
        forgetSessionCode();
        $("adminCode").value = "";
        throw new Error(data?.message || "تعذر حفظ النظام الصوتي.");
      }
      storeSessionCode(adminCode);
      $("adminCode").value = "";
      renderPreference(data);
      showNotice(`تم حفظ «${PROFILE_LABELS[profileKey]}» بنجاح. سيصل إلى برنامج Windows عند المزامنة التالية.`, "success", true);
    } catch (error) {
      console.error(error);
      showNotice(errorText(error), "error", true);
    } finally {
      busy = false;
      button.textContent = "حفظ النظام الصوتي";
      button.disabled = !currentPreference?.school_active;
    }
  }

  function toggleCodeVisibility() {
    const input = $("adminCode");
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    $("toggleCode").textContent = show ? "إخفاء" : "إظهار";
  }

  function init() {
    const backUrl = new URL("dashboard-v2.html", window.location.href);
    if (schoolSlug && schoolSlug !== "__neutral__") backUrl.searchParams.set("school", schoolSlug);
    $("backToDashboard").href = backUrl.href;
    $("profileForm").addEventListener("submit", savePreference);
    $("refreshButton").addEventListener("click", () => loadPreference());
    $("retryButton").addEventListener("click", () => loadPreference());
    $("toggleCode").addEventListener("click", toggleCodeVisibility);
    loadPreference({ silent: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
