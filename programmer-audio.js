(function () {
  "use strict";

  const ADMIN_UID = "1e32db69-d286-49c7-8a56-3e6eb7b02590";
  const AUDIO_BUCKET = "windows-audio";
  const PROFILE_LABELS = {
    end_only: "النهايات فقط",
    start_and_end: "البداية والنهاية",
  };
  const AUDIENCE_LABELS = {
    all: "جميع المدارس",
    boys: "مدارس البنين",
    girls: "مدارس البنات",
  };
  const SLOT_LABELS = {
    after_assembly: "بعد الطابور والتوعيات",
    before_first_period: "قبل بداية الحصة الأولى",
    after_break: "بعد انتهاء الفسحة",
    end_of_day: "في نهاية اليوم الدراسي",
  };
  const GUIDANCE_SLOT_LABELS = {
    before_assembly: "قبل الطابور بـ3 دقائق",
    during_break: "أثناء الفسحة",
    during_activity: "أثناء النشاط",
    during_prayer: "أثناء الصلاة",
    end_of_day: "نهاية اليوم الدراسي",
  };
  const GUIDANCE_SLOT_META = {
    before_assembly: { icon: "☀", note: "يبدأ قبل موعد الطابور بثلاث دقائق" },
    during_break: { icon: "◌", note: "يبدأ بعد صوت بداية الفسحة" },
    during_activity: { icon: "◇", note: "يبدأ بعد صوت بداية النشاط عند وجوده" },
    during_prayer: { icon: "◈", note: "يبدأ بعد صوت بداية الصلاة عند وجودها" },
    end_of_day: { icon: "✓", note: "يبدأ بعد انتهاء آخر صوت في اليوم" },
  };
  const DEFAULT_GUIDANCE_SLOTS = {
    guidance_16_avoid_bad_company: "during_break",
    guidance_18_choose_good_friends: "during_break",
    guidance_20_student_absence: "during_break",
    guidance_09_waste: "during_break",
    guidance_24_follow_teacher_explanation: "during_break",
    guidance_22_avoid_wastefulness: "during_break",
    guidance_23_say_bismillah_before_eating: "during_break",
    guidance_04_prayer_pillar_of_faith: "during_prayer",
    guidance_03_safe_classroom_exit: "end_of_day",
    guidance_17_end_of_school_day: "end_of_day",
  };
  const REQUIRED_SYSTEM_KEYS = [
    "assembly_start",
    "break_start",
    "break_end",
    "period_01_start",
    "period_02_start",
    "period_03_start",
    "period_04_start",
    "period_05_start",
    "period_06_start",
    "period_07_start",
    "period_08_start",
    "period_01_end",
    "period_02_end",
    "period_03_end",
    "period_04_end",
    "period_05_end",
    "period_06_end",
    "period_07_end",
    "period_08_end",
  ];

  const state = {
    client: null,
    migrationReady: false,
    localManifest: null,
    localFiles: new Map(),
    localAssets: [],
    awarenessOrder: [],
    packageValid: false,
    assetFilter: "all",
    campaignFilter: "all",
    releases: [],
    remoteAssets: [],
    channels: [],
    campaigns: [],
    schools: [],
    schoolProfiles: [],
    publishingReleaseId: null,
    deletingReleaseId: null,
    previewUrl: null,
    busy: false,
  };

  const $ = (id) => document.getElementById(id);

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    })[character]);
  }

  function errorText(error) {
    return error
      ? [error.message, error.details, error.hint, error.code].filter(Boolean).join(" | ")
      : "";
  }

  function formatDate(value, dateOnly = false) {
    if (!value) return "—";
    const date = dateOnly
      ? new Date(`${String(value).slice(0, 10)}T12:00:00Z`)
      : new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("ar-OM", dateOnly ? {
      dateStyle: "medium",
      timeZone: "Asia/Muscat",
    } : {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Muscat",
    }).format(date);
  }

  function formatBytes(value) {
    const bytes = Number(value || 0);
    if (bytes < 1024) return `${bytes} بايت`;
    if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} ك.ب`;
    return `${(bytes / 1024 ** 2).toFixed(1)} م.ب`;
  }

  function omanDateString(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Muscat",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  function addDays(dateString, days) {
    const date = new Date(`${dateString}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }

  function sundayFor(dateString) {
    const date = new Date(`${dateString}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() - date.getUTCDay());
    return date.toISOString().slice(0, 10);
  }

  function showStatus(message, type = "success", sticky = false) {
    const box = $("pageStatus");
    box.hidden = false;
    box.className = `notice ${type}`;
    box.textContent = message;
    clearTimeout(showStatus.timer);
    if (!sticky) {
      showStatus.timer = setTimeout(() => {
        box.hidden = true;
      }, 6500);
    }
  }

  function createClient() {
    if (state.client) return state.client;
    if (!window.supabase?.createClient || !window.SCHOOL_TIMER_SUPABASE_URL || !window.SCHOOL_TIMER_SUPABASE_ANON_KEY) {
      throw new Error("تعذر تجهيز مكتبة Supabase أو بيانات الاتصال.");
    }
    state.client = window.supabase.createClient(
      window.SCHOOL_TIMER_SUPABASE_URL,
      window.SCHOOL_TIMER_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      },
    );
    return state.client;
  }

  function showLogin(message = "") {
    document.body.classList.remove("auth-pending");
    $("appView").hidden = true;
    $("loginView").hidden = false;
    const box = $("loginMessage");
    box.hidden = !message;
    box.textContent = message;
  }

  async function authorizeSession() {
    try {
      const client = createClient();
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      const user = data?.session?.user;
      if (!user) {
        showLogin();
        return;
      }
      if (user.id !== ADMIN_UID) {
        await client.auth.signOut();
        showLogin("هذا الحساب غير مصرح له بإدارة الصوتيات المركزية.");
        return;
      }
      await showApplication();
    } catch (error) {
      console.error(error);
      showLogin(error?.message || "تعذر التحقق من صلاحية الدخول.");
    }
  }

  async function login(event) {
    event.preventDefault();
    const button = $("loginButton");
    const message = $("loginMessage");
    message.hidden = true;
    button.disabled = true;
    button.textContent = "جارٍ التحقق…";
    try {
      const client = createClient();
      const { data, error } = await client.auth.signInWithPassword({
        email: $("loginEmail").value.trim(),
        password: $("loginPassword").value,
      });
      if (error) throw error;
      if (data?.user?.id !== ADMIN_UID) {
        await client.auth.signOut();
        throw new Error("هذا الحساب غير مصرح له بإدارة الصوتيات المركزية.");
      }
      $("loginPassword").value = "";
      await showApplication();
    } catch (error) {
      console.error(error);
      const invalid = /invalid login credentials/i.test(error?.message || "");
      message.textContent = invalid
        ? "البريد الإلكتروني أو كلمة المرور غير صحيحة."
        : (error?.message || "تعذر تسجيل الدخول.");
      message.hidden = false;
    } finally {
      button.disabled = false;
      button.textContent = "دخول آمن";
    }
  }

  async function logout() {
    const client = createClient();
    $("logoutBtn").disabled = true;
    await client.auth.signOut();
    location.reload();
  }

  async function showApplication() {
    document.body.classList.remove("auth-pending");
    $("loginView").hidden = true;
    $("appView").hidden = false;
    setCampaignDefaultDates();
    await loadRemoteData({ silent: true });
  }

  function selectedAudience() {
    return document.querySelector('input[name="releaseAudience"]:checked')?.value || "boys";
  }

  function normalizeSchoolAudience(schoolType, schoolName = "") {
    return /(بنات|إناث|اناث|female|girls)/i.test(`${schoolType || ""} ${schoolName || ""}`) ? "girls" : "boys";
  }

  function normalizeSelectedPath(file) {
    const raw = String(file.webkitRelativePath || file.name).replace(/\\/g, "/");
    const pieces = raw.split("/").filter(Boolean);
    return pieces.length > 1 ? pieces.slice(1).join("/") : pieces[0];
  }

  function guidanceSlot(item) {
    const configured = String(item?.play_slot || "").trim();
    if (GUIDANCE_SLOT_LABELS[configured]) return configured;
    return DEFAULT_GUIDANCE_SLOTS[item?.id] || "before_assembly";
  }

  function guidanceSequences() {
    const result = Object.fromEntries(Object.keys(GUIDANCE_SLOT_LABELS).map((slot) => [slot, []]));
    result.before_assembly = state.awarenessOrder.filter((assetKey) => {
      const asset = awarenessAsset(assetKey);
      return asset?.active && asset.playSlot === "before_assembly";
    });
    state.localAssets
      .filter((asset) => asset.kind === "guidance"
        && asset.active
        && asset.playSlot !== "before_assembly"
        && GUIDANCE_SLOT_LABELS[asset.playSlot])
      .sort((first, second) => first.sortOrder - second.sortOrder)
      .forEach((asset) => result[asset.playSlot].push(asset.assetKey));
    return result;
  }

  async function parseLocalPackage(fileList) {
    closeAudioPreview();
    state.localManifest = null;
    state.localFiles = new Map();
    state.localAssets = [];
    state.awarenessOrder = [];
    state.packageValid = false;

    const files = Array.from(fileList || []);
    files.forEach((file) => state.localFiles.set(normalizeSelectedPath(file), file));
    const manifestEntry = Array.from(state.localFiles.entries())
      .find(([path]) => path === "catalog/audio-manifest.json" || path.endsWith("/catalog/audio-manifest.json"));

    if (!manifestEntry) {
      renderEmptyPackage("لم يُعثر على catalog/audio-manifest.json. اختر مجلد الحزمة المنظم كاملًا.");
      return;
    }

    try {
      state.localManifest = JSON.parse(await manifestEntry[1].text());
      const systemAssets = Object.entries(state.localManifest.system_events || {}).map(([assetKey, item], index) => ({
        assetKey,
        kind: "system_event",
        category: "system",
        categoryAr: "أصوات النظام",
        titleAr: item.title_ar || assetKey,
        filePath: String(item.file || ""),
        sortOrder: index,
        active: item.active !== false,
      }));
      const guidanceAssets = (state.localManifest.guidance || []).map((item, index) => ({
        assetKey: item.id,
        kind: "guidance",
        category: item.category || "guidance",
        categoryAr: item.category_ar || "الإرشادات",
        titleAr: item.title_ar || item.id,
        filePath: String(item.file || ""),
        playSlot: guidanceSlot(item),
        sortOrder: index,
        active: item.active !== false,
      }));
      state.localAssets = [...systemAssets, ...guidanceAssets];
      state.awarenessOrder = guidanceAssets
        .filter((asset) => asset.active && asset.playSlot === "before_assembly")
        .map((asset) => asset.assetKey);

      const missingFiles = state.localAssets.filter((asset) => !state.localFiles.has(asset.filePath));
      const availableSystemKeys = new Set(systemAssets.map((asset) => asset.assetKey));
      const missingSystemKeys = REQUIRED_SYSTEM_KEYS.filter((key) => !availableSystemKeys.has(key));
      const duplicateKeys = state.localAssets
        .map((asset) => asset.assetKey)
        .filter((key, index, all) => all.indexOf(key) !== index);

      state.packageValid = (
        systemAssets.length === REQUIRED_SYSTEM_KEYS.length
        && guidanceAssets.length >= 2
        && missingFiles.length === 0
        && missingSystemKeys.length === 0
        && duplicateKeys.length === 0
      );

      renderPackageSummary({
        files,
        systemAssets,
        guidanceAssets,
        missingFiles,
        missingSystemKeys,
        duplicateKeys,
      });
      renderAwarenessSelection();
      renderGuidanceRouteOverview();
      renderLocalAssets();
      validateDraftReadiness();
    } catch (error) {
      console.error(error);
      renderEmptyPackage("ملف بيان الصوتيات غير صالح أو لا يمكن قراءته.");
    }
  }

  function renderEmptyPackage(message) {
    $("packageSummary").hidden = true;
    $("localPackageBadge").className = "pill warn";
    $("localPackageBadge").textContent = "الحزمة غير صالحة";
    $("localAssetsList").innerHTML = `<div class="empty-state large">${escapeHtml(message)}</div>`;
    $("awarenessSelectedList").innerHTML = '<div class="empty-state">اختر الحزمة لعرض دورة ما قبل الطابور.</div>';
    $("rotationPreview").innerHTML = '<div class="empty-state">تظهر المعاينة بعد اختيار مقطعين على الأقل.</div>';
    $("awarenessSelectedBadge").textContent = "0 مختارة";
    $("guidanceRouteOverview").hidden = true;
    $("createDraftBtn").disabled = true;
    showStatus(message, "error", true);
  }

  function renderPackageSummary(details) {
    const totalBytes = details.files.reduce((sum, file) => sum + Number(file.size || 0), 0);
    const issues = [];
    if (details.systemAssets.length !== REQUIRED_SYSTEM_KEYS.length) issues.push("عدد أصوات النظام غير مكتمل");
    if (details.missingSystemKeys.length) issues.push(`${details.missingSystemKeys.length} حدث مفقود`);
    if (details.guidanceAssets.length < 2) issues.push("يلزم مقطعا إرشاد على الأقل");
    if (details.missingFiles.length) issues.push(`${details.missingFiles.length} ملف غير موجود`);
    if (details.duplicateKeys.length) issues.push("معرفات مكررة");

    $("packageSummary").hidden = false;
    $("localSystemCount").textContent = `${details.systemAssets.length} / ${REQUIRED_SYSTEM_KEYS.length}`;
    $("localGuidanceCount").textContent = String(details.guidanceAssets.length);
    $("localPackageSize").textContent = formatBytes(totalBytes);
    $("localValidation").textContent = state.packageValid ? "سليمة" : issues.join("، ");
    $("localValidation").style.color = state.packageValid ? "var(--green)" : "var(--red)";
    $("localPackageBadge").className = state.packageValid ? "pill success" : "pill warn";
    $("localPackageBadge").textContent = state.packageValid ? "الحزمة سليمة" : "تحتاج مراجعة";

    if (state.packageValid) {
      showStatus(`تم التحقق من ${state.localAssets.length} ملفًا وتوزيع الإرشادات حسب وقت التشغيل.`, "success");
    } else {
      showStatus(`الحزمة غير مكتملة: ${issues.join("، ")}.`, "error", true);
    }
  }

  function renderGuidanceRouteOverview() {
    const overview = $("guidanceRouteOverview");
    if (!overview) return;
    const guidance = state.localAssets.filter((asset) => asset.kind === "guidance" && asset.active);
    overview.hidden = !guidance.length;
    if (!guidance.length) return;
    overview.innerHTML = Object.entries(GUIDANCE_SLOT_LABELS).map(([slot, label]) => {
      const count = guidance.filter((asset) => asset.playSlot === slot).length;
      const meta = GUIDANCE_SLOT_META[slot];
      const rotation = count > 2 ? "تدوير أسبوعي" : count === 2 ? "مقطعان ثابتان" : count === 1 ? "مقطع ثابت" : "جاهز للإضافة";
      return `<article class="guidance-route-card route-${escapeHtml(slot)}">
        <span class="guidance-route-icon" aria-hidden="true">${escapeHtml(meta.icon)}</span>
        <div><strong>${escapeHtml(label)}</strong><small>${escapeHtml(meta.note)}</small></div>
        <div class="guidance-route-count"><b>${count}</b><span>${escapeHtml(rotation)}</span></div>
      </article>`;
    }).join("");
  }

  function awarenessAsset(assetKey) {
    return state.localAssets.find((asset) => asset.assetKey === assetKey && asset.kind === "guidance");
  }

  function renderAwarenessSelection() {
    const list = $("awarenessSelectedList");
    const validOrder = state.awarenessOrder.filter((assetKey) => awarenessAsset(assetKey));
    state.awarenessOrder = validOrder;
    $("awarenessSelectedBadge").className = `pill ${validOrder.length >= 2 ? "success" : "warn"}`;
    $("awarenessSelectedBadge").textContent = `${validOrder.length} مختارة`;

    if (!validOrder.length) {
      list.innerHTML = '<div class="empty-state">أضف مقطعين على الأقل من بطاقات الإرشادات.</div>';
    } else {
      list.innerHTML = validOrder.map((assetKey, index) => {
        const asset = awarenessAsset(assetKey);
        return `<article class="awareness-row">
          <span class="awareness-order">${index + 1}</span>
          <div class="awareness-row-copy"><strong>${escapeHtml(asset.titleAr)}</strong><small>${escapeHtml(asset.categoryAr)}</small></div>
          <div class="awareness-row-actions">
            <button class="mini-button" type="button" data-awareness-move="up" data-awareness-key="${escapeHtml(assetKey)}" aria-label="تحريك لأعلى" ${index === 0 ? "disabled" : ""}>↑</button>
            <button class="mini-button" type="button" data-awareness-move="down" data-awareness-key="${escapeHtml(assetKey)}" aria-label="تحريك لأسفل" ${index === validOrder.length - 1 ? "disabled" : ""}>↓</button>
            <button class="mini-button danger" type="button" data-awareness-remove="${escapeHtml(assetKey)}" aria-label="إزالة">×</button>
          </div>
        </article>`;
      }).join("");
      list.querySelectorAll("[data-awareness-move]").forEach((button) => {
        button.addEventListener("click", () => moveAwareness(button.dataset.awarenessKey, button.dataset.awarenessMove));
      });
      list.querySelectorAll("[data-awareness-remove]").forEach((button) => {
        button.addEventListener("click", () => toggleAwareness(button.dataset.awarenessRemove, false));
      });
    }

    renderRotationPreview();
    validateDraftReadiness();
  }

  function moveAwareness(assetKey, direction) {
    const index = state.awarenessOrder.indexOf(assetKey);
    if (index < 0) return;
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= state.awarenessOrder.length) return;
    [state.awarenessOrder[index], state.awarenessOrder[target]] = [state.awarenessOrder[target], state.awarenessOrder[index]];
    renderAwarenessSelection();
    renderLocalAssets();
  }

  function toggleAwareness(assetKey, forceValue) {
    const asset = awarenessAsset(assetKey);
    if (!asset) return;
    const exists = state.awarenessOrder.includes(assetKey);
    const shouldAdd = forceValue === undefined ? !exists : forceValue;
    if (shouldAdd && !exists) {
      asset.active = true;
      asset.playSlot = "before_assembly";
      state.awarenessOrder.push(assetKey);
    } else if (!shouldAdd && exists) {
      state.awarenessOrder = state.awarenessOrder.filter((key) => key !== assetKey);
    }
    renderAwarenessSelection();
    renderGuidanceRouteOverview();
    renderLocalAssets();
  }

  function changeGuidanceSlot(assetKey, playSlot) {
    const asset = awarenessAsset(assetKey);
    if (!asset || !GUIDANCE_SLOT_LABELS[playSlot]) return;
    asset.playSlot = playSlot;
    if (playSlot === "before_assembly") {
      if (asset.active && !state.awarenessOrder.includes(assetKey)) state.awarenessOrder.push(assetKey);
    } else {
      state.awarenessOrder = state.awarenessOrder.filter((key) => key !== assetKey);
    }
    renderAwarenessSelection();
    renderGuidanceRouteOverview();
    renderLocalAssets();
  }

  function renderRotationPreview() {
    const preview = $("rotationPreview");
    const order = state.awarenessOrder;
    if (order.length < 2) {
      preview.innerHTML = '<div class="empty-state">تظهر المعاينة بعد اختيار مقطعين على الأقل.</div>';
      return;
    }
    const currentSunday = sundayFor(omanDateString());
    preview.innerHTML = Array.from({ length: 6 }, (_, weekIndex) => {
      const firstIndex = order.length === 2 ? 0 : (weekIndex * 2) % order.length;
      const first = awarenessAsset(order[firstIndex]);
      const second = awarenessAsset(order[(firstIndex + 1) % order.length]);
      const weekDate = addDays(currentSunday, weekIndex * 7);
      return `<article class="rotation-week ${weekIndex === 0 ? "current" : ""}">
        <span>${weekIndex === 0 ? "الأسبوع الحالي" : `أسبوع ${formatDate(weekDate, true)}`}</span>
        <strong>1. ${escapeHtml(first?.titleAr || "—")}</strong>
        <strong>2. ${escapeHtml(second?.titleAr || "—")}</strong>
      </article>`;
    }).join("");
  }

  function validateDraftReadiness() {
    const selectedAssets = state.awarenessOrder.map(awarenessAsset).filter(Boolean);
    const awarenessReady = state.awarenessOrder.length >= 2
      && new Set(state.awarenessOrder).size === state.awarenessOrder.length
      && selectedAssets.length === state.awarenessOrder.length
      && selectedAssets.every((asset) => asset.active);
    const titleReady = Boolean($("releaseTitle").value.trim());
    $("createDraftBtn").disabled = state.busy
      || !state.migrationReady
      || !state.packageValid
      || !awarenessReady
      || !titleReady;
  }

  function renderLocalAssets() {
    if (!state.localAssets.length) {
      $("localAssetsList").innerHTML = '<div class="empty-state large">اختر مجلد الحزمة المنظمة لعرض الأصوات ومعاينتها.</div>';
      return;
    }
    const query = $("assetSearch").value.trim().toLowerCase();
    const filtered = state.localAssets.filter((asset) => {
      const typeMatches = state.assetFilter === "all" || state.assetFilter === asset.kind;
      const textMatches = `${asset.titleAr} ${asset.assetKey} ${asset.categoryAr}`.toLowerCase().includes(query);
      return typeMatches && textMatches;
    });

    if (!filtered.length) {
      $("localAssetsList").innerHTML = '<div class="empty-state large">لا توجد ملفات مطابقة.</div>';
      return;
    }

    $("localAssetsList").innerHTML = filtered.map((asset) => {
      const file = state.localFiles.get(asset.filePath);
      const selected = state.awarenessOrder.includes(asset.assetKey);
      const routeSelect = asset.kind === "guidance" ? `<label class="asset-route">موضع التشغيل
        <select data-guidance-slot="${escapeHtml(asset.assetKey)}">
          ${Object.entries(GUIDANCE_SLOT_LABELS).map(([value, label]) => `<option value="${value}" ${asset.playSlot === value ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
        </select>
      </label>` : "";
      return `<article class="asset-card ${selected ? "selected-for-rotation" : ""}" data-asset-key="${escapeHtml(asset.assetKey)}">
        <div class="asset-card-top">
          <span class="tag ${asset.kind === "system_event" ? "system" : ""}">${escapeHtml(asset.categoryAr)}</span>
          <label class="asset-check"><input type="checkbox" data-asset-active="${escapeHtml(asset.assetKey)}" ${asset.active ? "checked" : ""}> مفعّل</label>
        </div>
        <h3>${escapeHtml(asset.titleAr)}</h3>
        <p title="${escapeHtml(asset.filePath)}">${escapeHtml(asset.filePath)}</p>
        ${routeSelect}
        <div class="asset-card-actions">
          <span class="pill muted">${formatBytes(file?.size || 0)}</span>
          <div class="asset-card-controls">
            ${asset.kind === "guidance" && asset.playSlot === "before_assembly" ? `<button class="button secondary small rotation-toggle ${selected ? "active" : ""}" type="button" data-toggle-awareness="${escapeHtml(asset.assetKey)}">${selected ? "ضمن دورة ما قبل الطابور ✓" : "إضافة لدورة ما قبل الطابور"}</button>` : ""}
            <button class="button secondary small" type="button" data-preview-key="${escapeHtml(asset.assetKey)}">تشغيل</button>
          </div>
        </div>
      </article>`;
    }).join("");

    $("localAssetsList").querySelectorAll("[data-preview-key]").forEach((button) => {
      button.addEventListener("click", () => previewLocalAsset(button.dataset.previewKey));
    });
    $("localAssetsList").querySelectorAll("[data-toggle-awareness]").forEach((button) => {
      button.addEventListener("click", () => toggleAwareness(button.dataset.toggleAwareness));
    });
    $("localAssetsList").querySelectorAll("[data-guidance-slot]").forEach((select) => {
      select.addEventListener("change", () => changeGuidanceSlot(select.dataset.guidanceSlot, select.value));
    });
    $("localAssetsList").querySelectorAll("[data-asset-active]").forEach((input) => {
      input.addEventListener("change", () => {
        const asset = state.localAssets.find((item) => item.assetKey === input.dataset.assetActive);
        if (!asset) return;
        asset.active = input.checked;
        if (!asset.active && state.awarenessOrder.includes(asset.assetKey)) {
          state.awarenessOrder = state.awarenessOrder.filter((key) => key !== asset.assetKey);
          renderAwarenessSelection();
        } else {
          validateDraftReadiness();
        }
        renderGuidanceRouteOverview();
        renderLocalAssets();
      });
    });
  }

  function previewLocalAsset(assetKey) {
    const asset = state.localAssets.find((item) => item.assetKey === assetKey);
    const file = asset && state.localFiles.get(asset.filePath);
    if (!asset || !file) return;
    const previewUrl = URL.createObjectURL(file);
    openAudioPreview(previewUrl, asset.titleAr, true);
  }

  function openAudioPreview(url, title, objectUrl = false) {
    closeAudioPreview();
    if (objectUrl) state.previewUrl = url;
    $("audioDockTitle").textContent = title;
    $("audioPreview").src = url;
    $("audioDock").hidden = false;
    $("audioPreview").play().catch(() => {});
  }

  function closeAudioPreview() {
    const audio = $("audioPreview");
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
    state.previewUrl = null;
    if ($("audioDock")) $("audioDock").hidden = true;
  }

  async function sha256File(file) {
    if (!window.crypto?.subtle) return null;
    const hash = await window.crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function readAudioDuration(file) {
    return new Promise((resolve) => {
      const audio = document.createElement("audio");
      const url = URL.createObjectURL(file);
      let finished = false;
      const finish = (value) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        URL.revokeObjectURL(url);
        audio.removeAttribute("src");
        resolve(Number.isFinite(value) && value > 0 ? Number(value.toFixed(3)) : null);
      };
      const timer = setTimeout(() => finish(null), 8000);
      audio.preload = "metadata";
      audio.onloadedmetadata = () => finish(audio.duration);
      audio.onerror = () => finish(null);
      audio.src = url;
    });
  }

  async function runPool(items, concurrency, worker) {
    let nextIndex = 0;
    let firstError = null;
    const results = new Array(items.length);
    async function runner() {
      while (!firstError && nextIndex < items.length) {
        const current = nextIndex;
        nextIndex += 1;
        try {
          results[current] = await worker(items[current], current);
        } catch (error) {
          firstError ||= error;
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => runner()));
    if (firstError) throw firstError;
    return results;
  }

  function setUploadProgress(done, total, label) {
    const percent = total ? Math.round((done / total) * 100) : 0;
    $("uploadProgress").hidden = false;
    $("uploadProgressText").textContent = label;
    $("uploadProgressPercent").textContent = `${percent}%`;
    $("uploadProgressBar").value = percent;
  }

  function preparedManifest() {
    const manifest = JSON.parse(JSON.stringify(state.localManifest));
    const eventGuidance = guidanceSequences();
    manifest.central_config = {
      schema_version: 3,
      target_audience: selectedAudience(),
      default_profile: $("releaseDefaultProfile").value,
      awareness_sequence: [...eventGuidance.before_assembly],
      awareness_rotation: eventGuidance.before_assembly.length > 2,
      event_guidance: { after_assembly: [], ...eventGuidance },
      clips_per_week: 2,
      week_starts_on: "sunday",
      timezone: "Asia/Muscat",
      before_assembly_offset_seconds: 180,
      transition: "start_next_when_current_ends",
      fixed_delay_seconds: 0,
      prevent_overlap: true,
      school_controls: "profile_only",
    };
    manifest.assets = Object.fromEntries(state.localAssets.map((asset) => [asset.assetKey, {
      kind: asset.kind,
      category: asset.category,
      title_ar: asset.titleAr,
      file: asset.filePath,
      play_slot: asset.playSlot || null,
      active: asset.active,
      sort_order: asset.sortOrder,
    }]));
    return manifest;
  }

  async function rollbackDraft(releaseId, uploadedPaths) {
    try {
      if (uploadedPaths.length) {
        await state.client.storage.from(AUDIO_BUCKET).remove(uploadedPaths);
      }
      if (releaseId) {
        await state.client.from("windows_audio_releases").delete().eq("id", releaseId).eq("status", "draft");
      }
    } catch (rollbackError) {
      console.error("Audio draft rollback failed", rollbackError);
    }
  }

  async function createDraft() {
    validateDraftReadiness();
    if ($("createDraftBtn").disabled || state.busy) return;
    const audience = selectedAudience();
    if (!confirm(`سيتم رفع الحزمة كمسودة مستقلة لـ${AUDIENCE_LABELS[audience]}. هل تريد المتابعة؟`)) return;

    state.busy = true;
    validateDraftReadiness();
    const client = createClient();
    let releaseId = null;
    const uploadedPaths = [];
    try {
      const manifest = preparedManifest();
      const { data: release, error: releaseError } = await client
        .from("windows_audio_releases")
        .insert({
          title: $("releaseTitle").value.trim(),
          notes: $("releaseNotes").value.trim() || null,
          status: "draft",
          audience_key: audience,
          manifest,
        })
        .select("*")
        .single();
      if (releaseError) throw releaseError;
      releaseId = release.id;

      let completed = 0;
      setUploadProgress(0, state.localAssets.length, "تجهيز الملفات…");
      const assetRows = await runPool(state.localAssets, 3, async (asset) => {
        const file = state.localFiles.get(asset.filePath);
        if (!file) throw new Error(`الملف غير موجود: ${asset.filePath}`);
        const storagePath = `releases/${audience}/${release.id}/${asset.filePath}`;
        const [checksum, audioDuration] = await Promise.all([
          sha256File(file),
          readAudioDuration(file),
        ]);
        const { error: uploadError } = await client.storage.from(AUDIO_BUCKET).upload(storagePath, file, {
          cacheControl: "31536000",
          contentType: file.type || "audio/mpeg",
          upsert: false,
        });
        if (uploadError) throw uploadError;
        uploadedPaths.push(storagePath);
        completed += 1;
        setUploadProgress(completed, state.localAssets.length, `رفع ${asset.titleAr}`);
        return {
          release_id: release.id,
          asset_key: asset.assetKey,
          kind: asset.kind,
          category: asset.category,
          title_ar: asset.titleAr,
          storage_path: storagePath,
          mime_type: file.type || "audio/mpeg",
          file_size_bytes: file.size,
          duration_seconds: audioDuration,
          checksum_sha256: checksum,
          is_active: asset.active,
          sort_order: asset.sortOrder,
        };
      });

      const { error: assetsError } = await client.from("windows_audio_assets").insert(assetRows);
      if (assetsError) throw assetsError;

      manifest.release = {
        id: release.id,
        version_number: release.version_number,
        audience_key: audience,
        storage_bucket: AUDIO_BUCKET,
      };
      manifest.assets = Object.fromEntries(assetRows.map((asset) => [asset.asset_key, {
        kind: asset.kind,
        category: asset.category,
        title_ar: asset.title_ar,
        storage_path: asset.storage_path,
        play_slot: state.localAssets.find((item) => item.assetKey === asset.asset_key)?.playSlot || null,
        active: asset.is_active,
        sort_order: asset.sort_order,
        checksum_sha256: asset.checksum_sha256,
      }]));
      const { error: manifestError } = await client
        .from("windows_audio_releases")
        .update({ manifest })
        .eq("id", release.id);
      if (manifestError) throw manifestError;

      setUploadProgress(state.localAssets.length, state.localAssets.length, "اكتمل رفع المسودة");
      showStatus(`تم حفظ الإصدار v${release.version_number} كمسودة لـ${AUDIENCE_LABELS[audience]}.`, "success", true);
      await loadRemoteData({ silent: true });
    } catch (error) {
      console.error(error);
      await rollbackDraft(releaseId, uploadedPaths);
      $("uploadProgress").hidden = true;
      showStatus(`تعذر إنشاء المسودة، وتم التراجع عن الملفات المرفوعة: ${errorText(error)}`, "error", true);
    } finally {
      state.busy = false;
      validateDraftReadiness();
    }
  }

  async function loadRemoteData(options = {}) {
    const client = createClient();
    $("refreshBtn").disabled = true;
    $("refreshBtn").textContent = "جارٍ التحديث…";
    try {
      const [releasesResult, assetsResult, schoolsResult, profilesResult] = await Promise.all([
        client.from("windows_audio_releases").select("*").order("version_number", { ascending: false }),
        client.from("windows_audio_assets").select("id,release_id,asset_key,kind,title_ar,is_active,file_size_bytes"),
        client.from("schools").select("school_name,school_slug,is_active,school_type").order("school_name", { ascending: true }),
        client.from("windows_school_audio_profiles").select("*")
      ]);
      const coreErrors = [releasesResult.error, assetsResult.error, schoolsResult.error, profilesResult.error].filter(Boolean);
      if (coreErrors.length) throw coreErrors[0];

      state.releases = (releasesResult.data || []).map((release) => ({
        ...release,
        audience_key: release.audience_key || "boys",
      }));
      state.remoteAssets = assetsResult.data || [];
      state.schools = schoolsResult.data || [];
      state.schoolProfiles = profilesResult.data || [];

      const [channelsResult, campaignsResult] = await Promise.all([
        client.from("windows_audio_channels").select("*").order("audience_key", { ascending: true }),
        client.from("windows_audio_campaigns").select("*").order("created_at", { ascending: false }),
      ]);
      state.migrationReady = !channelsResult.error && !campaignsResult.error;
      state.channels = channelsResult.data || [];
      state.campaigns = campaignsResult.data || [];
      $("migrationNotice").hidden = state.migrationReady;
      $("campaignForm").querySelectorAll("input,select,button").forEach((control) => {
        control.disabled = !state.migrationReady;
      });
      renderRemoteData();
      validateDraftReadiness();

      if (!state.migrationReady) {
        showStatus("البيانات الأساسية تعمل، لكن ميزات الفئات والتدوير والمناسبات تحتاج تنفيذ ترقية v2 في Supabase.", "warn", true);
      } else if (!options.silent) {
        showStatus("تم تحديث بيانات الصوتيات المركزية.", "success");
      }
    } catch (error) {
      console.error(error);
      const missingSql = /does not exist|schema cache|42P01|PGRST205/i.test(errorText(error));
      showStatus(
        missingSql
          ? "قاعدة الصوتيات لم تُجهز بعد. نفّذ ملفي SQL بالترتيب ثم حدّث الصفحة."
          : `تعذر تحميل بيانات الصوتيات: ${errorText(error)}`,
        "error",
        true,
      );
      renderRemoteData();
    } finally {
      $("refreshBtn").disabled = false;
      $("refreshBtn").textContent = "تحديث البيانات";
    }
  }

  function releaseForAudience(audience) {
    return state.releases.find((release) => release.status === "published" && release.audience_key === audience);
  }

  function channelForAudience(audience) {
    return state.channels.find((channel) => channel.audience_key === audience);
  }

  function guidancePairForRelease(release, weekIndex = null) {
    const sequence = release?.manifest?.central_config?.awareness_sequence || [];
    if (sequence.length < 2) return [];
    let resolvedWeek = weekIndex === null || weekIndex === undefined ? Number.NaN : Number(weekIndex);
    if (!Number.isFinite(resolvedWeek)) {
      const currentSunday = sundayFor(omanDateString());
      const configuredAnchor = release?.manifest?.central_config?.rotation_anchor_sunday;
      const anchorSunday = /^\d{4}-\d{2}-\d{2}$/.test(String(configuredAnchor || ""))
        ? sundayFor(configuredAnchor)
        : currentSunday;
      const elapsedDays = Math.floor((new Date(`${currentSunday}T12:00:00Z`) - new Date(`${anchorSunday}T12:00:00Z`)) / 86400000);
      resolvedWeek = Math.max(0, Math.floor(elapsedDays / 7));
    }
    const firstIndex = sequence.length === 2 ? 0 : (resolvedWeek * 2) % sequence.length;
    return [sequence[firstIndex], sequence[(firstIndex + 1) % sequence.length]];
  }

  function renderRemoteData() {
    const boys = releaseForAudience("boys");
    const girls = releaseForAudience("girls");
    const drafts = state.releases.filter((release) => release.status === "draft");
    const archived = state.releases.filter((release) => release.status === "archived");
    const activeCampaigns = state.campaigns.filter((campaign) => campaignStatus(campaign).key === "active");

    $("statBoysVersion").textContent = boys ? `v${boys.version_number}` : "—";
    $("statGirlsVersion").textContent = girls ? `v${girls.version_number}` : "—";
    $("statActiveCampaigns").textContent = String(activeCampaigns.length);
    $("statDrafts").textContent = String(drafts.length);
    $("statWeeklyGuidance").textContent = `${guidancePairForRelease(boys).length} + ${guidancePairForRelease(girls).length}`;
    $("statSchoolChoices").textContent = String(state.schoolProfiles.length);
    $("draftsBadge").textContent = String(drafts.length);
    $("archivedBadge").textContent = String(archived.length);
    $("campaignsBadge").textContent = `${state.campaigns.length} حملة`;

    renderChannel("boys", boys);
    renderChannel("girls", girls);
    renderPublishedRelease("boys", boys);
    renderPublishedRelease("girls", girls);
    renderDrafts(drafts);
    renderArchivedReleases(archived);
    renderCampaigns();
    renderSchools();
  }

  function renderChannel(audience, release) {
    const title = $(`${audience}ChannelTitle`);
    const meta = $(`${audience}ChannelMeta`);
    if (!release) {
      title.textContent = "لا يوجد إصدار منشور";
      meta.textContent = `ارفع حزمة ${audience === "boys" ? "البنين" : "البنات"} ثم انشرها.`;
      return;
    }
    const sequence = release.manifest?.central_config?.awareness_sequence || [];
    const pair = guidancePairForRelease(release);
    const assetMap = release.manifest?.assets || {};
    title.textContent = `v${release.version_number} · ${release.title}`;
    meta.textContent = `${sequence.length} إرشادًا في الدورة · هذا الأسبوع: ${pair.map((key) => assetMap[key]?.title_ar || key).join(" + ")}`;
  }

  function renderPublishedRelease(audience, release) {
    const card = audience === "boys" ? $("publishedBoysCard") : $("publishedGirlsCard");
    if (!release) {
      card.innerHTML = `<span class="release-state">منشور لـ${AUDIENCE_LABELS[audience]}</span><h3>لا يوجد إصدار</h3><p>أنشئ مسودة مكتملة ثم انشرها.</p>`;
      return;
    }
    const assets = state.remoteAssets.filter((asset) => asset.release_id === release.id && asset.is_active);
    const sequence = release.manifest?.central_config?.awareness_sequence || [];
    const rotating = sequence.length > 2;
    card.innerHTML = `<span class="release-state">منشور لـ${escapeHtml(AUDIENCE_LABELS[audience])}</span>
      <h3>v${escapeHtml(release.version_number)} · ${escapeHtml(release.title)}</h3>
      <p>${escapeHtml(release.notes || "بدون ملاحظات")}</p>
      <div class="release-meta">
        <span class="pill success">${assets.length} ملفًا مفعّلًا</span>
        <span class="pill muted">${sequence.length} إرشادًا</span>
        <span class="pill ${rotating ? "success" : "muted"}">${rotating ? "تدوير أسبوعي" : "مقطعان ثابتان"}</span>
        <span class="pill muted">${escapeHtml(formatDate(release.published_at))}</span>
      </div>
      <div class="release-card-actions">
        <button class="button danger small" type="button" data-delete-release="${escapeHtml(release.id)}">مسح الإصدار</button>
      </div>`;
    card.querySelector("[data-delete-release]")?.addEventListener("click", () => openDeleteReleaseDialog(release.id));
  }

  function releaseReady(release) {
    const assets = state.remoteAssets.filter((asset) => asset.release_id === release.id);
    const assetByKey = new Map(assets.map((asset) => [asset.asset_key, asset]));
    const sequence = release.manifest?.central_config?.awareness_sequence || [];
    const hasSystem = REQUIRED_SYSTEM_KEYS.every((key) => assetByKey.get(key)?.kind === "system_event");
    const hasGuidance = sequence.length >= 2
      && new Set(sequence).size === sequence.length
      && sequence.every((key) => {
        const asset = assetByKey.get(key);
        return asset?.kind === "guidance" && asset.is_active;
      });
    const profile = release.manifest?.central_config?.default_profile;
    return hasSystem && hasGuidance && Object.prototype.hasOwnProperty.call(PROFILE_LABELS, profile);
  }

  function renderDrafts(drafts) {
    if (!drafts.length) {
      $("draftsList").innerHTML = '<div class="empty-state">لا توجد مسودات.</div>';
      return;
    }
    $("draftsList").innerHTML = drafts.map((release) => {
      const assets = state.remoteAssets.filter((asset) => asset.release_id === release.id);
      const activeAssets = assets.filter((asset) => asset.is_active).length;
      const sequence = release.manifest?.central_config?.awareness_sequence || [];
      const ready = releaseReady(release);
      return `<article class="draft-card">
        <div class="draft-card-top">
          <div><h4>v${escapeHtml(release.version_number)} · ${escapeHtml(release.title)}</h4><p>${escapeHtml(formatDate(release.created_at))}</p></div>
          <span class="audience-badge ${escapeHtml(release.audience_key)}">${escapeHtml(AUDIENCE_LABELS[release.audience_key])}</span>
        </div>
        <div class="release-meta">
          <span class="pill muted">${assets.length} ملفًا</span>
          <span class="pill muted">${activeAssets} مفعّل</span>
          <span class="pill muted">${sequence.length} إرشادًا</span>
          <span class="pill ${ready ? "success" : "warn"}">${ready ? "جاهزة للنشر" : "غير مكتملة"}</span>
        </div>
        <div class="release-card-actions split">
          <button class="button primary" type="button" data-publish-release="${escapeHtml(release.id)}" ${ready && state.migrationReady ? "" : "disabled"}>مراجعة ونشر</button>
          <button class="button danger" type="button" data-delete-release="${escapeHtml(release.id)}">مسح المسودة</button>
        </div>
      </article>`;
    }).join("");
    $("draftsList").querySelectorAll("[data-publish-release]").forEach((button) => {
      button.addEventListener("click", () => openPublishDialog(button.dataset.publishRelease));
    });
    $("draftsList").querySelectorAll("[data-delete-release]").forEach((button) => {
      button.addEventListener("click", () => openDeleteReleaseDialog(button.dataset.deleteRelease));
    });
  }

  function renderArchivedReleases(releases) {
    const list = $("archivedReleasesList");
    if (!releases.length) {
      list.innerHTML = '<div class="empty-state compact">لا توجد إصدارات مؤرشفة.</div>';
      return;
    }
    list.innerHTML = releases.map((release) => {
      const assets = state.remoteAssets.filter((asset) => asset.release_id === release.id);
      return `<article class="archived-release-card">
        <div>
          <span class="audience-badge ${escapeHtml(release.audience_key)}">${escapeHtml(AUDIENCE_LABELS[release.audience_key])}</span>
          <strong>v${escapeHtml(release.version_number)} · ${escapeHtml(release.title)}</strong>
          <small>${assets.length} ملفًا · ${escapeHtml(formatDate(release.updated_at || release.created_at))}</small>
        </div>
        <button class="button danger small" type="button" data-delete-release="${escapeHtml(release.id)}">مسح نهائي</button>
      </article>`;
    }).join("");
    list.querySelectorAll("[data-delete-release]").forEach((button) => {
      button.addEventListener("click", () => openDeleteReleaseDialog(button.dataset.deleteRelease));
    });
  }

  function deleteConfirmationPhrase(release) {
    return `حذف v${release.version_number}`;
  }

  function openDeleteReleaseDialog(releaseId) {
    const release = state.releases.find((item) => item.id === releaseId);
    if (!release) return;
    state.deletingReleaseId = release.id;
    const published = release.status === "published";
    const assets = state.remoteAssets.filter((asset) => asset.release_id === release.id);
    const phrase = deleteConfirmationPhrase(release);
    $("deleteReleaseTitle").textContent = published ? "مسح الإصدار المنشور" : release.status === "draft" ? "مسح المسودة" : "مسح الإصدار المؤرشف";
    $("deleteReleaseText").textContent = published
      ? `سيُحذف إصدار ${AUDIENCE_LABELS[release.audience_key]} الحالي وجميع ملفاته (${assets.length}). ستبقى الأجهزة على النسخة المحفوظة محليًا حتى تتصل، ولن يصلها إصدار جديد قبل نشر بديل.`
      : `سيُحذف الإصدار v${release.version_number} وجميع ملفاته (${assets.length}) نهائيًا.`;
    $("deleteReleaseWarning").hidden = !published;
    $("deleteReleasePhrase").textContent = phrase;
    $("deleteReleaseConfirmation").value = "";
    $("confirmDeleteReleaseBtn").disabled = true;
    $("deleteReleaseDialog").showModal();
  }

  function closeDeleteReleaseDialog() {
    state.deletingReleaseId = null;
    $("deleteReleaseDialog").close();
  }

  async function deleteAudioRelease() {
    const release = state.releases.find((item) => item.id === state.deletingReleaseId);
    if (!release) return;
    const phrase = deleteConfirmationPhrase(release);
    if ($("deleteReleaseConfirmation").value.trim() !== phrase) return;
    const button = $("confirmDeleteReleaseBtn");
    button.disabled = true;
    button.textContent = "جارٍ المسح…";
    try {
      const { data, error } = await state.client.rpc("delete_windows_audio_release", {
        p_release_id: release.id,
        p_confirmation: phrase,
      });
      if (error) throw error;
      const storagePaths = Array.isArray(data?.storage_paths) ? data.storage_paths.filter(Boolean) : [];
      let storageWarning = false;
      for (let index = 0; index < storagePaths.length; index += 100) {
        const cleanup = await state.client.storage.from(AUDIO_BUCKET).remove(storagePaths.slice(index, index + 100));
        if (cleanup.error) storageWarning = true;
      }
      closeDeleteReleaseDialog();
      showStatus(
        storageWarning
          ? "تم مسح الإصدار من النظام، وتعذر تنظيف بعض الملفات القديمة من التخزين."
          : `تم مسح الإصدار v${release.version_number} وجميع بياناته بنجاح.`,
        storageWarning ? "warn" : "success",
        true,
      );
      await loadRemoteData({ silent: true });
    } catch (error) {
      console.error(error);
      const needsUpgrade = /delete_windows_audio_release|PGRST202|schema cache|does not exist/i.test(errorText(error));
      showStatus(needsUpgrade
        ? "ميزة مسح الإصدارات تحتاج تنفيذ database/windows_audio_central_v3.sql مرة واحدة في Supabase."
        : `تعذر مسح الإصدار: ${errorText(error)}`, "error", true);
    } finally {
      button.textContent = "مسح الإصدار نهائيًا";
      button.disabled = $("deleteReleaseConfirmation").value.trim() !== phrase;
    }
  }

  function openPublishDialog(releaseId) {
    const release = state.releases.find((item) => item.id === releaseId && item.status === "draft");
    if (!release) return;
    state.publishingReleaseId = releaseId;
    const sequence = release.manifest?.central_config?.awareness_sequence || [];
    $("publishConfirmation").value = "";
    $("confirmPublishBtn").disabled = true;
    $("publishDialogText").textContent = `سيصبح الإصدار v${release.version_number} «${release.title}» المصدر الرسمي لـ${AUDIENCE_LABELS[release.audience_key]}. سيُؤرشف الإصدار السابق للفئة نفسها فقط.`;
    $("publishRotationSummary").innerHTML = `
      <span>الفئة: <strong>${escapeHtml(AUDIENCE_LABELS[release.audience_key])}</strong></span>
      <span>الإرشادات: <strong>${sequence.length}</strong></span>
      <span>آلية التشغيل: <strong>${sequence.length > 2 ? "تدوير مقطعين كل أحد" : "مقطعان ثابتان"}</strong></span>
      <span>الانتقال: <strong>يبدأ التالي فور انتهاء السابق</strong></span>`;
    $("publishDialog").showModal();
  }

  function closePublishDialog() {
    state.publishingReleaseId = null;
    $("publishDialog").close();
  }

  async function publishRelease() {
    const releaseId = state.publishingReleaseId;
    if (!releaseId || $("publishConfirmation").value.trim() !== "نشر") return;
    const button = $("confirmPublishBtn");
    button.disabled = true;
    button.textContent = "جارٍ النشر…";
    try {
      const { data, error } = await state.client.rpc("publish_windows_audio_release", {
        p_release_id: releaseId,
      });
      if (error) throw error;
      closePublishDialog();
      showStatus(`تم نشر الإصدار v${data.version_number} بنجاح لـ${AUDIENCE_LABELS[data.audience_key || "boys"]}.`, "success", true);
      await loadRemoteData({ silent: true });
    } catch (error) {
      console.error(error);
      showStatus(`تعذر نشر الإصدار: ${errorText(error)}`, "error", true);
    } finally {
      button.textContent = "نشر الإصدار";
      button.disabled = $("publishConfirmation").value.trim() !== "نشر";
    }
  }

  function setCampaignDefaultDates() {
    const today = omanDateString();
    if (!$("campaignStartsOn").value) $("campaignStartsOn").value = today;
    if (!$("campaignEndsOn").value) $("campaignEndsOn").value = addDays(today, 6);
  }

  function campaignStatus(campaign) {
    const today = omanDateString();
    if (!campaign.is_active) return { key: "off", label: "موقوفة" };
    if (today < campaign.starts_on) return { key: "scheduled", label: "قادمة" };
    if (today > campaign.ends_on) return { key: "ended", label: "منتهية" };
    return { key: "active", label: "فعالة الآن" };
  }

  function publicStorageUrl(path) {
    try {
      const result = state.client.storage.from(AUDIO_BUCKET).getPublicUrl(path);
      return result?.data?.publicUrl || "";
    } catch (_) {
      return "";
    }
  }

  function safeFileName(name) {
    const extension = String(name || "audio.mp3").toLowerCase().endsWith(".mp3") ? ".mp3" : ".mp3";
    const base = String(name || "campaign")
      .replace(/\.[^.]+$/, "")
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 70) || "campaign";
    return `${base}${extension}`;
  }

  function randomUuid() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
      const random = Math.floor(Math.random() * 16);
      const value = character === "x" ? random : (random & 0x3) | 0x8;
      return value.toString(16);
    });
  }

  async function createCampaign(event) {
    event.preventDefault();
    if (!state.migrationReady || state.busy) return;
    const file = $("campaignFile").files?.[0];
    const title = $("campaignTitle").value.trim();
    const startsOn = $("campaignStartsOn").value;
    const endsOn = $("campaignEndsOn").value;
    if (!file || !title || !startsOn || !endsOn) {
      showStatus("أكمل اسم المناسبة والملف وتاريخي البداية والنهاية.", "error");
      return;
    }
    if (!/\.mp3$/i.test(file.name) && file.type !== "audio/mpeg") {
      showStatus("ملف المناسبة يجب أن يكون بصيغة MP3.", "error");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      showStatus("حجم ملف المناسبة أكبر من 15 ميجابايت.", "error");
      return;
    }
    if (endsOn < startsOn) {
      showStatus("تاريخ النهاية يجب أن يساوي تاريخ البداية أو يأتي بعده.", "error");
      return;
    }
    if (!confirm(`سيتم نشر «${title}» حسب التاريخ والفئة المحددين. هل تريد المتابعة؟`)) return;

    state.busy = true;
    const button = $("createCampaignBtn");
    button.disabled = true;
    button.textContent = "جارٍ النشر…";
    $("campaignProgress").hidden = false;
    $("campaignProgressBar").value = 10;
    $("campaignProgressPercent").textContent = "10%";
    const campaignId = randomUuid();
    const storagePath = `campaigns/${campaignId}/${safeFileName(file.name)}`;
    let uploaded = false;
    try {
      const [checksum, duration] = await Promise.all([sha256File(file), readAudioDuration(file)]);
      $("campaignProgressBar").value = 35;
      $("campaignProgressPercent").textContent = "35%";
      const { error: uploadError } = await state.client.storage.from(AUDIO_BUCKET).upload(storagePath, file, {
        cacheControl: "3600",
        contentType: "audio/mpeg",
        upsert: false,
      });
      if (uploadError) throw uploadError;
      uploaded = true;
      $("campaignProgressBar").value = 75;
      $("campaignProgressPercent").textContent = "75%";

      const payload = {
        id: campaignId,
        title,
        audience_key: $("campaignAudience").value,
        play_slot: $("campaignSlot").value,
        starts_on: startsOn,
        ends_on: endsOn,
        storage_path: storagePath,
        file_name: file.name,
        mime_type: "audio/mpeg",
        file_size_bytes: file.size,
        duration_seconds: duration,
        checksum_sha256: checksum,
        max_plays_per_day: Number($("campaignDailyLimit").value || 1),
        is_active: true,
      };
      const { error: insertError } = await state.client.from("windows_audio_campaigns").insert(payload);
      if (insertError) throw insertError;
      await state.client.from("windows_audio_audit_log").insert({
        actor_type: "programmer",
        action: "campaign_created",
        entity_type: "audio_campaign",
        entity_id: campaignId,
        details: { title, audience_key: payload.audience_key, starts_on: startsOn, ends_on: endsOn },
      });

      $("campaignProgressBar").value = 100;
      $("campaignProgressPercent").textContent = "100%";
      $("campaignForm").reset();
      $("campaignFileName").textContent = "لم يتم اختيار ملف";
      setCampaignDefaultDates();
      showStatus("تم نشر حملة المناسبة وستصل إلى المدارس المستهدفة ضمن مدتها.", "success", true);
      await loadRemoteData({ silent: true });
    } catch (error) {
      console.error(error);
      if (uploaded) await state.client.storage.from(AUDIO_BUCKET).remove([storagePath]);
      showStatus(`تعذر نشر المناسبة: ${errorText(error)}`, "error", true);
    } finally {
      state.busy = false;
      button.disabled = !state.migrationReady;
      button.textContent = "نشر حملة المناسبة";
      setTimeout(() => { $("campaignProgress").hidden = true; }, 1000);
    }
  }

  function renderCampaigns() {
    const list = $("campaignsList");
    const campaigns = state.campaigns.filter((campaign) => {
      if (state.campaignFilter === "all") return true;
      return campaignStatus(campaign).key === state.campaignFilter;
    });
    if (!campaigns.length) {
      list.innerHTML = '<div class="empty-state large">لا توجد حملات ضمن هذه الفئة.</div>';
      return;
    }
    list.innerHTML = campaigns.map((campaign) => {
      const status = campaignStatus(campaign);
      const url = publicStorageUrl(campaign.storage_path);
      return `<article class="campaign-card ${escapeHtml(status.key)}">
        <div>
          <h4>${escapeHtml(campaign.title)}</h4>
          <div class="campaign-meta">
            <span class="campaign-status ${escapeHtml(status.key)}">${escapeHtml(status.label)}</span>
            <span class="audience-badge ${escapeHtml(campaign.audience_key)}">${escapeHtml(AUDIENCE_LABELS[campaign.audience_key])}</span>
            <span>${escapeHtml(SLOT_LABELS[campaign.play_slot] || campaign.play_slot)}</span>
            <span>${escapeHtml(formatDate(campaign.starts_on, true))} — ${escapeHtml(formatDate(campaign.ends_on, true))}</span>
            <span>${escapeHtml(formatBytes(campaign.file_size_bytes))}</span>
          </div>
        </div>
        <div class="campaign-actions">
          <button class="button secondary small" type="button" data-preview-campaign="${escapeHtml(campaign.id)}" ${url ? "" : "disabled"}>تشغيل</button>
          <button class="button secondary small" type="button" data-toggle-campaign="${escapeHtml(campaign.id)}">${campaign.is_active ? "إيقاف" : "إعادة التفعيل"}</button>
          <button class="button danger small" type="button" data-delete-campaign="${escapeHtml(campaign.id)}">حذف</button>
        </div>
      </article>`;
    }).join("");
    list.querySelectorAll("[data-preview-campaign]").forEach((button) => {
      button.addEventListener("click", () => {
        const campaign = state.campaigns.find((item) => item.id === button.dataset.previewCampaign);
        const url = campaign && publicStorageUrl(campaign.storage_path);
        if (url) openAudioPreview(url, campaign.title);
      });
    });
    list.querySelectorAll("[data-toggle-campaign]").forEach((button) => {
      button.addEventListener("click", () => toggleCampaign(button.dataset.toggleCampaign, button));
    });
    list.querySelectorAll("[data-delete-campaign]").forEach((button) => {
      button.addEventListener("click", () => deleteCampaign(button.dataset.deleteCampaign, button));
    });
  }

  async function toggleCampaign(campaignId, button) {
    const campaign = state.campaigns.find((item) => item.id === campaignId);
    if (!campaign) return;
    button.disabled = true;
    try {
      const { error } = await state.client.from("windows_audio_campaigns").update({
        is_active: !campaign.is_active,
        updated_at: new Date().toISOString(),
      }).eq("id", campaignId);
      if (error) throw error;
      showStatus(campaign.is_active ? "تم إيقاف الحملة." : "تمت إعادة تفعيل الحملة.", "success");
      await loadRemoteData({ silent: true });
    } catch (error) {
      console.error(error);
      showStatus(`تعذر تحديث الحملة: ${errorText(error)}`, "error", true);
    } finally {
      button.disabled = false;
    }
  }

  async function deleteCampaign(campaignId, button) {
    const campaign = state.campaigns.find((item) => item.id === campaignId);
    if (!campaign) return;
    if (!confirm(`حذف حملة «${campaign.title}» نهائيًا؟ لن يمكن التراجع عن ذلك.`)) return;
    button.disabled = true;
    try {
      const { error } = await state.client.from("windows_audio_campaigns").delete().eq("id", campaignId);
      if (error) throw error;
      const storageResult = await state.client.storage.from(AUDIO_BUCKET).remove([campaign.storage_path]);
      if (storageResult.error) console.warn("Campaign storage cleanup failed", storageResult.error);
      showStatus("تم حذف حملة المناسبة.", "success");
      await loadRemoteData({ silent: true });
    } catch (error) {
      console.error(error);
      showStatus(`تعذر حذف الحملة: ${errorText(error)}`, "error", true);
    } finally {
      button.disabled = false;
    }
  }

  function renderSchools() {
    const body = $("schoolsTableBody");
    const query = $("schoolSearch").value.trim().toLowerCase();
    const filtered = state.schools.filter((school) => (
      `${school.school_name || ""} ${school.school_slug || ""}`.toLowerCase().includes(query)
    ));
    if (!filtered.length) {
      body.innerHTML = '<tr><td colspan="5"><div class="empty-state">لا توجد مدارس مطابقة.</div></td></tr>';
      return;
    }
    body.innerHTML = filtered.map((school) => {
      const audience = normalizeSchoolAudience(school.school_type, school.school_name);
      const channel = channelForAudience(audience);
      const profile = state.schoolProfiles.find((item) => item.school_slug === school.school_slug);
      const effective = profile?.profile_key || channel?.default_profile_key || "end_only";
      const source = profile?.updated_source === "school_manager"
        ? "اختيار مدير المدرسة"
        : profile ? "تخصيص سابق من المبرمج" : "الوضع الاحتياطي للفئة";
      const settingsUrl = `school-audio-settings.html?school=${encodeURIComponent(school.school_slug)}`;
      return `<tr>
        <td><div class="school-name">${escapeHtml(school.school_name || school.school_slug)}</div><div class="school-slug">${escapeHtml(school.school_slug)}</div></td>
        <td><span class="audience-badge ${escapeHtml(audience)}">${escapeHtml(AUDIENCE_LABELS[audience])}</span></td>
        <td><span class="pill ${profile ? "success" : "muted"}">${escapeHtml(PROFILE_LABELS[effective] || effective)}</span></td>
        <td><span class="school-source">${escapeHtml(source)}</span></td>
        <td><a class="school-settings-link" href="${escapeHtml(settingsUrl)}">فتح صفحة الاختيار</a></td>
      </tr>`;
    }).join("");
  }

  function updateAudienceSelection() {
    document.querySelectorAll(".audience-option").forEach((label) => {
      const input = label.querySelector('input[name="releaseAudience"]');
      label.classList.toggle("active", Boolean(input?.checked));
    });
  }

  function bindEvents() {
    $("loginForm").addEventListener("submit", login);
    $("logoutBtn").addEventListener("click", logout);
    $("refreshBtn").addEventListener("click", () => loadRemoteData());
    $("audioFolderInput").addEventListener("change", (event) => parseLocalPackage(event.target.files));
    document.querySelectorAll('input[name="releaseAudience"]').forEach((input) => {
      input.addEventListener("change", () => {
        updateAudienceSelection();
        validateDraftReadiness();
      });
    });
    $("releaseTitle").addEventListener("input", validateDraftReadiness);
    $("createDraftBtn").addEventListener("click", createDraft);
    $("assetSearch").addEventListener("input", renderLocalAssets);
    $("assetFilter").querySelectorAll("[data-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        state.assetFilter = button.dataset.filter;
        $("assetFilter").querySelectorAll("[data-filter]").forEach((item) => item.classList.toggle("active", item === button));
        renderLocalAssets();
      });
    });
    $("campaignForm").addEventListener("submit", createCampaign);
    $("campaignFile").addEventListener("change", () => {
      const file = $("campaignFile").files?.[0];
      $("campaignFileName").textContent = file ? `${file.name} · ${formatBytes(file.size)}` : "لم يتم اختيار ملف";
    });
    $("campaignFilter").querySelectorAll("[data-campaign-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        state.campaignFilter = button.dataset.campaignFilter;
        $("campaignFilter").querySelectorAll("[data-campaign-filter]").forEach((item) => item.classList.toggle("active", item === button));
        renderCampaigns();
      });
    });
    $("schoolSearch").addEventListener("input", renderSchools);
    $("publishConfirmation").addEventListener("input", () => {
      $("confirmPublishBtn").disabled = $("publishConfirmation").value.trim() !== "نشر";
    });
    $("confirmPublishBtn").addEventListener("click", publishRelease);
    $("cancelPublishBtn").addEventListener("click", closePublishDialog);
    $("closePublishDialog").addEventListener("click", closePublishDialog);
    $("deleteReleaseConfirmation").addEventListener("input", () => {
      const release = state.releases.find((item) => item.id === state.deletingReleaseId);
      $("confirmDeleteReleaseBtn").disabled = !release
        || $("deleteReleaseConfirmation").value.trim() !== deleteConfirmationPhrase(release);
    });
    $("confirmDeleteReleaseBtn").addEventListener("click", deleteAudioRelease);
    $("cancelDeleteReleaseBtn").addEventListener("click", closeDeleteReleaseDialog);
    $("closeDeleteReleaseDialog").addEventListener("click", closeDeleteReleaseDialog);
    $("closeAudioDock").addEventListener("click", closeAudioPreview);
    window.addEventListener("beforeunload", closeAudioPreview);
  }

  function init() {
    bindEvents();
    updateAudienceSelection();
    authorizeSession();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
