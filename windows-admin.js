(function () {
  "use strict";

  const GRACE_DAYS = 20;
  const DAY = 86400000;
  const TABLES = {
    schools: "schools",
    codes: "school_activation_codes",
    devices: "school_activated_devices",
  };

  const state = {
    client: null,
    schools: [],
    codes: [],
    devices: [],
    selected: null,
  };

  const $ = (id) => document.getElementById(id);
  const text = (value) => String(value ?? "");
  const escapeHtml = (value) =>
    text(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  function setStatus(message, type = "success") {
    const element = $("status");
    element.textContent = message;
    element.className = `notice${type === "error" ? " error" : type === "loading" ? " loading" : ""}`;
  }

  function showToast(message) {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2300);
  }

  function getClient() {
    if (state.client) return state.client;
    if (window.SYSTEM_ADMIN_SUPABASE_CLIENT) {
      state.client = window.SYSTEM_ADMIN_SUPABASE_CLIENT;
      return state.client;
    }
    if (!window.supabase || !window.SCHOOL_TIMER_SUPABASE_URL || !window.SCHOOL_TIMER_SUPABASE_ANON_KEY) return null;

    state.client = window.supabase.createClient(
      window.SCHOOL_TIMER_SUPABASE_URL,
      window.SCHOOL_TIMER_SUPABASE_ANON_KEY,
      { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
    );
    return state.client;
  }

  function isDemoSchool(school) {
    const haystack = `${school?.school_slug || ""} ${school?.school_name || ""}`.toLowerCase();
    return (
      /(^|[\s_-])(sample|demo|test|preview|default|example|trial)([\s_-]|$)/i.test(haystack) ||
      /(تجريب|اختبار|افتراضي|نموذج|مثال)/.test(haystack)
    );
  }

  function realSchools() {
    return state.schools
      .filter((school) => school && school.school_slug && !isDemoSchool(school))
      .sort(
        (a, b) =>
          Number(b.is_active !== false) - Number(a.is_active !== false) ||
          text(a.school_name).localeCompare(text(b.school_name), "ar"),
      );
  }

  function toDate(value) {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }

  function formatDate(value) {
    const parsed = toDate(value);
    return parsed
      ? new Intl.DateTimeFormat("ar-OM", { dateStyle: "medium", timeStyle: "short" }).format(parsed)
      : "—";
  }

  function connectedToday(value) {
    const parsed = toDate(value);
    const now = new Date();
    return Boolean(
      parsed &&
        parsed.getFullYear() === now.getFullYear() &&
        parsed.getMonth() === now.getMonth() &&
        parsed.getDate() === now.getDate(),
    );
  }

  function gracePeriod(value) {
    const parsed = toDate(value);
    if (!parsed) return { label: "لم يسجل اتصالًا", className: "expired" };

    const left = GRACE_DAYS * DAY - Math.max(0, Date.now() - parsed.getTime());
    if (left <= 0) return { label: "انتهت المهلة", className: "expired" };

    const days = Math.ceil(left / DAY);
    const label = `متبقي ${days} ${days === 1 ? "يوم" : "يومًا"}`;
    return { label, className: days <= 3 ? "warn" : "" };
  }

  const codesFor = (slug) => state.codes.filter((row) => row.school_slug === slug);
  const devicesFor = (slug) => state.devices.filter((row) => row.school_slug === slug);
  const activeCodesFor = (slug) => codesFor(slug).filter((row) => row.is_active !== false);
  const activeDevicesFor = (slug) => devicesFor(slug).filter((row) => row.is_active !== false);

  function pluralCount(count, singular, dual, plural) {
    if (count === 1) return `1 ${singular}`;
    if (count === 2) return `2 ${dual}`;
    return `${count} ${plural}`;
  }

  function renderStats() {
    const slugs = new Set(realSchools().map((school) => school.school_slug));
    const activeCodes = state.codes.filter((row) => slugs.has(row.school_slug) && row.is_active !== false);
    const activeDevices = state.devices.filter((row) => slugs.has(row.school_slug) && row.is_active !== false);

    $("schoolsStat").textContent = slugs.size;
    $("codesStat").textContent = activeCodes.length;
    $("devicesStat").textContent = activeDevices.length;
    $("todayStat").textContent = activeDevices.filter((row) => connectedToday(row.last_seen_at)).length;
    $("schoolsCount").textContent = pluralCount(slugs.size, "مدرسة", "مدرستان", "مدارس");
  }

  function matchesFilter(school, filter) {
    if (filter === "licensed") return activeCodesFor(school.school_slug).length > 0;
    if (filter === "devices") return activeDevicesFor(school.school_slug).length > 0;
    if (filter === "inactive") return school.is_active === false;
    return true;
  }

  function renderSchools() {
    const query = text($("search").value).trim().toLowerCase();
    const filter = $("schoolFilter").value;
    const rows = realSchools().filter((school) => {
      const searchable = `${school.school_name || ""} ${school.school_slug || ""} ${school.governorate || ""} ${school.wilayat || ""}`.toLowerCase();
      return (!query || searchable.includes(query)) && matchesFilter(school, filter);
    });

    $("schoolsList").innerHTML = rows.length
      ? rows
          .map((school) => {
            const codes = activeCodesFor(school.school_slug).length;
            const devices = activeDevicesFor(school.school_slug).length;
            return `
              <article class="school ${state.selected === school.school_slug ? "active" : ""}" data-slug="${escapeHtml(school.school_slug)}" tabindex="0" role="button">
                <div class="school-top">
                  <div class="school-name">${escapeHtml(school.school_name || school.school_slug)}</div>
                  <span class="badge ${school.is_active === false ? "off" : "on"}">${school.is_active === false ? "موقوفة" : "مفعلة"}</span>
                </div>
                <div class="meta">${escapeHtml(school.school_slug)}<br>${codes} كود نشط · ${devices} جهاز مفعل</div>
              </article>`;
          })
          .join("")
      : '<div class="empty"><div class="empty-mark">⌕</div>لا توجد مدارس مطابقة للبحث أو التصفية.</div>';
  }

  function renderCodes(school) {
    const codes = codesFor(school.school_slug).sort(
      (a, b) => Number(b.is_active !== false) - Number(a.is_active !== false),
    );
    $("codesCount").textContent = pluralCount(codes.length, "كود", "كودان", "أكواد");

    $("codesList").innerHTML = codes.length
      ? codes
          .map((code) => {
            const activeDevices = devicesFor(school.school_slug).filter(
              (device) => device.activation_code === code.activation_code && device.is_active !== false,
            ).length;
            const limit = Math.max(1, Number(code.max_devices || 1));
            const usage = Math.min(100, Math.round((activeDevices / limit) * 100));
            return `
              <article class="card">
                <div class="card-top">
                  <div class="code">${escapeHtml(code.activation_code || "—")}</div>
                  <span class="badge ${code.is_active === false ? "off" : "on"}">${code.is_active === false ? "موقوف" : "نشط"}</span>
                </div>
                <div class="usage" title="استخدام الأجهزة">
                  <div class="usage-track"><div class="usage-bar" style="width:${usage}%"></div></div>
                </div>
                <div class="code-actions">
                  <div class="small-text">الأجهزة: ${activeDevices} من ${limit}</div>
                  <button class="btn small copy-code" type="button" data-code="${escapeHtml(code.activation_code || "")}">نسخ الكود</button>
                </div>
                <div class="small-text">الإنشاء: ${formatDate(code.created_at)}<br>الانتهاء: ${code.expires_at ? formatDate(code.expires_at) : "بدون تاريخ انتهاء"}</div>
              </article>`;
          })
          .join("")
      : '<div class="empty"><div class="empty-mark">#</div>لا توجد أكواد تفعيل لهذه المدرسة.</div>';
  }

  function renderDevices(school) {
    const devices = devicesFor(school.school_slug).sort((a, b) =>
      text(b.last_seen_at).localeCompare(text(a.last_seen_at)),
    );
    $("devicesCount").textContent = pluralCount(devices.length, "جهاز", "جهازان", "أجهزة");

    $("devicesBody").innerHTML = devices.length
      ? devices
          .map((device) => {
            const grace = gracePeriod(device.last_seen_at);
            const stateLabel = device.is_active === false ? "موقوف" : connectedToday(device.last_seen_at) ? "متصل اليوم" : "مصرح";
            const stateClass = device.is_active === false ? "off" : connectedToday(device.last_seen_at) ? "on" : "warn";
            return `
              <tr>
                <td><div class="device">${escapeHtml(device.device_name || "جهاز بدون اسم")}</div><div class="device-id" title="${escapeHtml(device.device_id || "")}">${escapeHtml(device.device_id || "—")}</div></td>
                <td><span class="badge ${stateClass}">${stateLabel}</span></td>
                <td>${formatDate(device.last_seen_at)}</td>
                <td><span class="grace ${grace.className}">${device.is_active === false ? "الجهاز موقوف" : grace.label}</span></td>
                <td>${escapeHtml(device.app_version || "—")}</td>
              </tr>`;
          })
          .join("")
      : '<tr><td colspan="5" class="empty">لا توجد أجهزة مسجلة لهذه المدرسة.</td></tr>';
  }

  function renderDetails() {
    const school = realSchools().find((row) => row.school_slug === state.selected);
    if (!school) {
      $("empty").hidden = false;
      $("details").hidden = true;
      return;
    }

    $("empty").hidden = true;
    $("details").hidden = false;
    $("schoolName").textContent = school.school_name || school.school_slug;
    $("schoolMeta").textContent = [school.school_slug, school.governorate, school.wilayat].filter(Boolean).join(" · ");

    const schoolState = $("schoolState");
    schoolState.textContent = school.is_active === false ? "المدرسة موقوفة" : "المدرسة مفعلة";
    schoolState.className = `badge school-state ${school.is_active === false ? "off" : "on"}`;

    renderCodes(school);
    renderDevices(school);
  }

  function selectSchool(slug) {
    if (!realSchools().some((school) => school.school_slug === slug)) return;
    state.selected = slug;
    renderSchools();
    renderDetails();
  }

  async function copyCode(code) {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      showToast("تم نسخ كود التفعيل.");
    } catch (_error) {
      const input = document.createElement("textarea");
      input.value = code;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
      showToast("تم نسخ كود التفعيل.");
    }
  }

  function randomDigits(count) {
    const values = new Uint32Array(count);
    window.crypto.getRandomValues(values);
    return Array.from(values, (value) => String(value % 10)).join("");
  }

  function generateActivationCode() {
    return `ST-OM-${randomDigits(4)}-${randomDigits(4)}`;
  }

  function selectedSchool() {
    return realSchools().find((school) => school.school_slug === state.selected) || null;
  }

  function openCreateCodeDialog() {
    const school = selectedSchool();
    if (!school) {
      showToast("اختر مدرسة أولًا.");
      return;
    }
    if (school.is_active === false) {
      showToast("لا يمكن إنشاء كود لمدرسة موقوفة.");
      return;
    }

    $("dialogSchoolName").textContent = school.school_name || school.school_slug;
    $("newActivationCode").value = generateActivationCode();
    $("newMaxDevices").value = "2";
    $("newExpiresAt").value = "";
    $("disableOldCodes").checked = false;
    $("createCodeDialog").showModal();
  }

  function closeCreateCodeDialog() {
    if ($("saveCodeBtn").disabled) return;
    $("createCodeDialog").close();
  }

  async function createActivationCode(event) {
    event.preventDefault();
    const school = selectedSchool();
    const database = getClient();
    if (!school || !database) return;

    const code = text($("newActivationCode").value).trim().toUpperCase();
    const maxDevices = Math.max(1, Math.min(50, Number($("newMaxDevices").value || 2)));
    const expiresValue = $("newExpiresAt").value;
    const disableOld = $("disableOldCodes").checked;

    if (!/^ST-[A-Z0-9]{2,8}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
      showToast("صيغة الكود غير صحيحة.");
      return;
    }
    if (state.codes.some((row) => text(row.activation_code).toUpperCase() === code)) {
      showToast("هذا الكود موجود مسبقًا. ولّد كودًا آخر.");
      return;
    }

    const confirmText = disableOld
      ? `سيتم إنشاء الكود الجديد وإيقاف الأكواد القديمة النشطة لمدرسة «${school.school_name || school.school_slug}». هل تريد المتابعة؟`
      : `هل تريد إنشاء كود جديد لمدرسة «${school.school_name || school.school_slug}»؟`;
    if (!window.confirm(confirmText)) return;

    const saveButton = $("saveCodeBtn");
    saveButton.disabled = true;
    saveButton.textContent = "جارٍ الحفظ…";

    try {
      const now = new Date().toISOString();
      const payload = {
        activation_code: code,
        school_slug: school.school_slug,
        max_devices: maxDevices,
        is_active: true,
        expires_at: expiresValue ? new Date(expiresValue).toISOString() : null,
        updated_at: now,
      };

      const { error: insertError } = await database.from(TABLES.codes).insert(payload);
      if (insertError) throw insertError;

      let oldCodesStopped = true;
      if (disableOld) {
        const oldIds = state.codes
          .filter((row) => row.school_slug === school.school_slug && row.is_active !== false)
          .map((row) => row.id)
          .filter(Boolean);
        if (oldIds.length) {
          const { error: updateError } = await database
            .from(TABLES.codes)
            .update({ is_active: false, updated_at: now })
            .in("id", oldIds);
          if (updateError) {
            oldCodesStopped = false;
            console.error(updateError);
          }
        }
      }

      $("createCodeDialog").close();
      await loadData();
      if (oldCodesStopped) {
        showToast("تم إنشاء كود التفعيل بنجاح.");
      } else {
        setStatus("تم إنشاء الكود الجديد، لكن تعذر إيقاف الأكواد القديمة. راجعها قبل إرسال الكود للمدرسة.", "error");
      }
    } catch (error) {
      console.error(error);
      setStatus(`تعذر إنشاء الكود: ${error.message || error}`, "error");
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = "حفظ الكود";
    }
  }

  async function loadData() {
    const button = $("refreshBtn");
    button.disabled = true;
    setStatus("جارٍ تحميل بيانات برنامج Windows…", "loading");

    try {
      const database = getClient();
      if (!database) throw new Error("تعذر تحميل إعدادات الاتصال بقاعدة البيانات.");

      const [schoolsResponse, codesResponse, devicesResponse] = await Promise.all([
        database.from(TABLES.schools).select("*").order("school_name", { ascending: true }),
        database.from(TABLES.codes).select("*"),
        database.from(TABLES.devices).select("*"),
      ]);

      if (schoolsResponse.error) throw schoolsResponse.error;
      if (codesResponse.error) throw codesResponse.error;
      if (devicesResponse.error) throw devicesResponse.error;

      state.schools = schoolsResponse.data || [];
      state.codes = codesResponse.data || [];
      state.devices = devicesResponse.data || [];

      const schools = realSchools();
      if (!schools.some((school) => school.school_slug === state.selected)) {
        state.selected = schools[0]?.school_slug || null;
      }

      renderStats();
      renderSchools();
      renderDetails();
      setStatus(`تم تحديث البيانات بنجاح · ${new Intl.DateTimeFormat("ar-OM", { timeStyle: "short" }).format(new Date())}`);
    } catch (error) {
      console.error(error);
      setStatus(`تعذر تحميل البيانات: ${error.message || error}`, "error");
      $("schoolsList").innerHTML = '<div class="empty"><div class="empty-mark">!</div>تعذر تحميل المدارس. تحقق من الاتصال ثم حاول مرة أخرى.</div>';
      state.selected = null;
      renderDetails();
    } finally {
      button.disabled = false;
    }
  }

  function handleSchoolActivation(event) {
    const item = event.target.closest("[data-slug]");
    if (item) selectSchool(item.dataset.slug);
  }

  function init() {
    $("refreshBtn").addEventListener("click", loadData);
    $("search").addEventListener("input", renderSchools);
    $("schoolFilter").addEventListener("change", renderSchools);
    $("schoolsList").addEventListener("click", handleSchoolActivation);
    $("schoolsList").addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") handleSchoolActivation(event);
    });
    $("codesList").addEventListener("click", (event) => {
      const button = event.target.closest(".copy-code");
      if (button) copyCode(button.dataset.code);
    });
    $("createCodeBtn").addEventListener("click", openCreateCodeDialog);
    $("generateCodeBtn").addEventListener("click", () => {
      $("newActivationCode").value = generateActivationCode();
    });
    $("closeCodeDialog").addEventListener("click", closeCreateCodeDialog);
    $("cancelCreateCode").addEventListener("click", closeCreateCodeDialog);
    $("createCodeForm").addEventListener("submit", createActivationCode);
    $("createCodeDialog").addEventListener("click", (event) => {
      if (event.target === $("createCodeDialog")) closeCreateCodeDialog();
    });
    loadData();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
