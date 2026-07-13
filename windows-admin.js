(function () {
  "use strict";

  const GRACE_DAYS = 20;
  const DAY = 86400000;
  const TABLES = {
    schools: "schools",
    codes: "school_activation_codes",
    devices: "school_activated_devices",
    globalSettings: "windows_global_settings",
  };
  const GLOBAL_ASSETS_BUCKET = "windows-assets";
  const MAX_GLOBAL_ASSET_SIZE = 15 * 1024 * 1024;
  const GLOBAL_ASSETS = Object.freeze({
    desktopBackground: {
      kind: "image",
      cardId: "desktopBackgroundCard",
      inputId: "desktopBackgroundInput",
      previewId: "desktopBackgroundPreview",
      emptyId: "desktopBackgroundEmpty",
      nameId: "desktopBackgroundName",
      urlColumn: "desktop_background_url",
      pathColumn: "desktop_background_path",
      nameColumn: "desktop_background_name",
      pathPrefix: "desktop-background",
      fallbackName: "لا توجد خلفية عامة",
    },
    mobileBackground: {
      kind: "image",
      cardId: "mobileBackgroundCard",
      inputId: "mobileBackgroundInput",
      previewId: "mobileBackgroundPreview",
      emptyId: "mobileBackgroundEmpty",
      nameId: "mobileBackgroundName",
      urlColumn: "mobile_background_url",
      pathColumn: "mobile_background_path",
      nameColumn: "mobile_background_name",
      pathPrefix: "mobile-background",
      fallbackName: "تستخدم خلفية الحاسوب العامة تلقائيًا",
    },
    startSound: {
      kind: "audio",
      cardId: "startSoundCard",
      inputId: "startSoundInput",
      previewId: "startSoundPreview",
      emptyId: "startSoundEmpty",
      nameId: "startSoundName",
      urlColumn: "start_sound_url",
      pathColumn: "start_sound_path",
      nameColumn: "start_sound_name",
      pathPrefix: "start-sound",
      fallbackName: "جرس البداية الاحتياطي المرفق",
    },
    endSound: {
      kind: "audio",
      cardId: "endSoundCard",
      inputId: "endSoundInput",
      previewId: "endSoundPreview",
      emptyId: "endSoundEmpty",
      nameId: "endSoundName",
      urlColumn: "end_sound_url",
      pathColumn: "end_sound_path",
      nameColumn: "end_sound_name",
      pathPrefix: "end-sound",
      fallbackName: "جرس النهاية الاحتياطي المرفق",
    },
    warningSound: {
      kind: "audio",
      cardId: "warningSoundCard",
      inputId: "warningSoundInput",
      previewId: "warningSoundPreview",
      emptyId: "warningSoundEmpty",
      nameId: "warningSoundName",
      urlColumn: "warning_sound_url",
      pathColumn: "warning_sound_path",
      nameColumn: "warning_sound_name",
      pathPrefix: "warning-sound",
      fallbackName: "صوت التنبيه الاحتياطي المرفق",
    },
  });

  const state = {
    client: null,
    schools: [],
    codes: [],
    devices: [],
    selected: null,
    globalSettings: null,
    globalSettingsReady: false,
    globalDraft: createEmptyGlobalDraft(),
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

  function createEmptyGlobalDraft() {
    return Object.fromEntries(
      Object.keys(GLOBAL_ASSETS).map((key) => [key, { file: null, remove: false, objectUrl: "" }]),
    );
  }

  function setGlobalNotice(message, type = "info") {
    const notice = $("globalSettingsNotice");
    if (!notice) return;
    notice.textContent = message;
    notice.className = `global-info${type === "error" ? " error" : ""}`;
  }

  function globalDefaultNotice() {
    return "أصوات المدرسة التي تضيفها محليًا تبقى أعلى أولوية. أما الخلفية المنشورة هنا فتُطبّق على جميع المدارس.";
  }

  function hasGlobalChanges() {
    return Object.values(state.globalDraft).some((draft) => draft.file || draft.remove);
  }

  function revokeDraftUrl(draft) {
    if (!draft?.objectUrl) return;
    try {
      URL.revokeObjectURL(draft.objectUrl);
    } catch (_error) {}
    draft.objectUrl = "";
  }

  function clearGlobalDraft({ render = true } = {}) {
    Object.values(state.globalDraft).forEach(revokeDraftUrl);
    state.globalDraft = createEmptyGlobalDraft();
    Object.values(GLOBAL_ASSETS).forEach((config) => {
      const input = $(config.inputId);
      if (input) input.value = "";
    });
    if (render) renderGlobalSettings();
  }

  function renderGlobalAsset(key) {
    const config = GLOBAL_ASSETS[key];
    const draft = state.globalDraft[key];
    const current = state.globalSettings || {};
    const currentUrl = text(current[config.urlColumn]).trim();
    const source = draft.file ? draft.objectUrl : draft.remove ? "" : currentUrl;
    const currentName = text(current[config.nameColumn]).trim();
    const preview = $(config.previewId);
    const empty = $(config.emptyId);
    const name = $(config.nameId);
    const card = $(config.cardId);
    const input = $(config.inputId);
    const removeButton = document.querySelector(`[data-remove-global="${key}"]`);

    card?.classList.toggle("pending", Boolean(draft.file || draft.remove));
    if (input) input.disabled = !state.globalSettingsReady;

    if (preview) {
      if (source) {
        if (preview.dataset.source !== source) {
          if (config.kind === "audio") preview.pause?.();
          preview.src = source;
          preview.dataset.source = source;
          if (config.kind === "audio") preview.load?.();
        }
        preview.hidden = false;
        if (empty) empty.hidden = true;
      } else {
        if (config.kind === "audio") preview.pause?.();
        preview.removeAttribute("src");
        delete preview.dataset.source;
        preview.hidden = true;
        if (empty) empty.hidden = false;
      }
    }

    if (name) {
      name.classList.toggle("remove", draft.remove);
      if (draft.file) name.textContent = `جاهز للنشر: ${draft.file.name}`;
      else if (draft.remove) name.textContent = "سيتم إلغاء الملف العام عند النشر";
      else name.textContent = currentName || config.fallbackName;
    }

    if (removeButton) {
      removeButton.disabled = !state.globalSettingsReady || (!currentUrl && !draft.file && !draft.remove);
      removeButton.textContent = draft.remove ? "تراجع عن الإزالة" : "إزالة العامة";
    }
  }

  function renderGlobalSettings() {
    Object.keys(GLOBAL_ASSETS).forEach(renderGlobalAsset);

    const changed = hasGlobalChanges();
    const version = Number(state.globalSettings?.config_version || 0);
    const versionElement = $("globalVersion");
    const updatedElement = $("globalUpdatedAt");
    if (versionElement) {
      versionElement.textContent = version ? `الإصدار ${version}` : "الإصدار —";
      versionElement.classList.toggle("changed", changed);
    }
    if (updatedElement) {
      updatedElement.textContent = state.globalSettings?.updated_at
        ? `آخر نشر: ${formatDate(state.globalSettings.updated_at)}`
        : "لم تُنشر إعدادات بعد";
    }

    const publishButton = $("publishGlobalBtn");
    const resetButton = $("resetGlobalDraftBtn");
    if (publishButton) publishButton.disabled = !state.globalSettingsReady || !changed;
    if (resetButton) resetButton.disabled = !changed;
  }

  function globalSettingsErrorMessage(error) {
    const message = text(error?.message || error).trim();
    if (/windows_global_settings|relation .* does not exist|schema cache|PGRST205|42P01/i.test(message)) {
      return "الإدارة المركزية غير مهيأة بعد. نفّذ ملف windows_global_settings.sql في Supabase أولًا؛ بقية أدوات الأكواد والأجهزة ستستمر في العمل.";
    }
    return `تعذر تحميل الإعدادات العامة: ${message || "خطأ غير معروف"}`;
  }

  async function loadGlobalSettings(database) {
    try {
      const { data, error } = await database
        .from(TABLES.globalSettings)
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;

      state.globalSettings = data || { id: 1, config_version: 1 };
      state.globalSettingsReady = true;
      clearGlobalDraft({ render: false });
      renderGlobalSettings();
      setGlobalNotice(globalDefaultNotice());
      return true;
    } catch (error) {
      console.error("[WindowsAdmin] global settings load failed", error);
      state.globalSettings = null;
      state.globalSettingsReady = false;
      clearGlobalDraft({ render: false });
      renderGlobalSettings();
      setGlobalNotice(globalSettingsErrorMessage(error), "error");
      return false;
    }
  }

  function fileMatchesKind(file, kind) {
    const mime = text(file?.type).toLowerCase();
    const extension = text(file?.name).split(".").pop().toLowerCase();
    if (kind === "image") {
      return ["image/png", "image/jpeg", "image/webp"].includes(mime) || ["png", "jpg", "jpeg", "webp"].includes(extension);
    }
    return ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/wave", "audio/ogg", "application/ogg"].includes(mime)
      || ["mp3", "wav", "ogg"].includes(extension);
  }

  function validateGlobalFile(file, config) {
    if (!file || file.size <= 0) return "الملف المختار فارغ أو غير صالح.";
    if (file.size > MAX_GLOBAL_ASSET_SIZE) return "حجم الملف أكبر من 15 ميجابايت.";
    if (!fileMatchesKind(file, config.kind)) {
      return config.kind === "image" ? "اختر صورة PNG أو JPG أو WebP." : "اختر ملف MP3 أو WAV أو OGG.";
    }
    return "";
  }

  function chooseGlobalAsset(key, event) {
    const config = GLOBAL_ASSETS[key];
    const file = event.target.files?.[0];
    if (!file) return;

    const validationError = validateGlobalFile(file, config);
    if (validationError) {
      event.target.value = "";
      showToast(validationError);
      return;
    }

    const draft = state.globalDraft[key];
    revokeDraftUrl(draft);
    draft.file = file;
    draft.remove = false;
    draft.objectUrl = URL.createObjectURL(file);
    renderGlobalSettings();
    setGlobalNotice("التعديل جاهز للمعاينة ولم يصل إلى المدارس بعد. اضغط «نشر إلى جميع المدارس» لاعتماده.");
  }

  function toggleRemoveGlobalAsset(key) {
    const config = GLOBAL_ASSETS[key];
    const draft = state.globalDraft[key];
    const currentUrl = text(state.globalSettings?.[config.urlColumn]).trim();

    if (draft.remove) {
      draft.remove = false;
      renderGlobalSettings();
      return;
    }

    if (draft.file && !currentUrl) {
      revokeDraftUrl(draft);
      draft.file = null;
      const input = $(config.inputId);
      if (input) input.value = "";
      renderGlobalSettings();
      showToast("تم إلغاء الملف المختار.");
      return;
    }

    if (!currentUrl && !draft.file) {
      showToast("لا يوجد ملف عام لإزالته.");
      return;
    }

    revokeDraftUrl(draft);
    draft.file = null;
    draft.remove = true;
    const input = $(config.inputId);
    if (input) input.value = "";
    renderGlobalSettings();
    setGlobalNotice("سيتم الرجوع إلى الملف الاحتياطي أو إعداد المدرسة بعد النشر. لم يُطبق التغيير بعد.");
  }

  function extensionForUpload(file, kind) {
    const mimeExtensions = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/webp": "webp",
      "audio/mpeg": "mp3",
      "audio/mp3": "mp3",
      "audio/wav": "wav",
      "audio/x-wav": "wav",
      "audio/wave": "wav",
      "audio/ogg": "ogg",
      "application/ogg": "ogg",
    };
    const extension = mimeExtensions[text(file?.type).toLowerCase()]
      || text(file?.name).split(".").pop().toLowerCase();
    if (kind === "image" && ["png", "jpg", "jpeg", "webp"].includes(extension)) return extension === "jpeg" ? "jpg" : extension;
    if (kind === "audio" && ["mp3", "wav", "ogg"].includes(extension)) return extension;
    return kind === "image" ? "webp" : "mp3";
  }

  function uploadMimeType(file, extension) {
    const declared = text(file?.type).trim().toLowerCase();
    if (declared) return declared;
    return {
      png: "image/png",
      jpg: "image/jpeg",
      webp: "image/webp",
      mp3: "audio/mpeg",
      wav: "audio/wav",
      ogg: "audio/ogg",
    }[extension] || "application/octet-stream";
  }

  async function removeStoragePaths(storage, paths) {
    const unique = [...new Set(paths.filter(Boolean))];
    if (!unique.length || typeof storage?.remove !== "function") return;
    const { error } = await storage.remove(unique);
    if (error) console.warn("[WindowsAdmin] storage cleanup failed", error);
  }

  async function publishGlobalSettings() {
    if (!state.globalSettingsReady || !hasGlobalChanges()) return;
    if (!window.confirm("سيصل هذا التغيير إلى جميع نسخ Windows عند اتصالها بالإنترنت. هل تريد نشره الآن؟")) return;

    const database = getClient();
    const storage = database?.storage?.from?.(GLOBAL_ASSETS_BUCKET);
    if (!database || !storage) {
      setGlobalNotice("تعذر تجهيز خدمة رفع الملفات في Supabase.", "error");
      return;
    }

    const button = $("publishGlobalBtn");
    const uploadedPaths = [];
    const oldPathsToRemove = [];
    const payload = {};
    button.disabled = true;
    button.textContent = "جارٍ الرفع والنشر…";
    setGlobalNotice("جارٍ رفع الملفات الجديدة ثم تحديث الإصدار العام…");

    try {
      for (const [key, config] of Object.entries(GLOBAL_ASSETS)) {
        const draft = state.globalDraft[key];
        if (!draft.file && !draft.remove) continue;

        const oldPath = text(state.globalSettings?.[config.pathColumn]).trim();
        if (draft.remove) {
          payload[config.urlColumn] = null;
          payload[config.pathColumn] = null;
          payload[config.nameColumn] = null;
          if (oldPath) oldPathsToRemove.push(oldPath);
          continue;
        }

        const extension = extensionForUpload(draft.file, config.kind);
        const suffix = `${Date.now()}-${randomDigits(6)}`;
        const path = `global/${config.pathPrefix}-${suffix}.${extension}`;
        const { error: uploadError } = await storage.upload(path, draft.file, {
          cacheControl: "31536000",
          contentType: uploadMimeType(draft.file, extension),
          upsert: false,
        });
        if (uploadError) throw new Error(`تعذر رفع «${draft.file.name}»: ${uploadError.message || uploadError}`);
        uploadedPaths.push(path);

        const publicResult = storage.getPublicUrl(path);
        const publicUrl = text(publicResult?.data?.publicUrl).trim();
        if (!publicUrl) throw new Error(`تعذر إنشاء رابط عام للملف «${draft.file.name}».`);

        payload[config.urlColumn] = publicUrl;
        payload[config.pathColumn] = path;
        payload[config.nameColumn] = draft.file.name;
        if (oldPath && oldPath !== path) oldPathsToRemove.push(oldPath);
      }

      const { data, error } = await database
        .from(TABLES.globalSettings)
        .upsert({ id: 1, ...payload }, { onConflict: "id" })
        .select("*")
        .single();
      if (error) throw error;

      state.globalSettings = data || { ...state.globalSettings, ...payload };
      state.globalSettingsReady = true;
      await removeStoragePaths(storage, oldPathsToRemove);
      clearGlobalDraft({ render: false });
      renderGlobalSettings();
      setGlobalNotice("تم النشر بنجاح. ستلتقط نسخ Windows الإعداد الجديد عند اتصالها وتحفظه للعمل دون إنترنت.");
      showToast("تم نشر إعدادات Windows لجميع المدارس.");
    } catch (error) {
      console.error("[WindowsAdmin] global settings publish failed", error);
      await removeStoragePaths(storage, uploadedPaths);
      setGlobalNotice(`تعذر النشر: ${error.message || error}`, "error");
      renderGlobalSettings();
    } finally {
      button.textContent = "نشر إلى جميع المدارس";
      button.disabled = !state.globalSettingsReady || !hasGlobalChanges();
    }
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
            const allDevices = devicesFor(school.school_slug).filter(
              (device) => device.activation_code === code.activation_code,
            ).length;
            const limit = Math.max(1, Number(code.max_devices || 1));
            const usage = Math.min(100, Math.round((activeDevices / limit) * 100));
            return `
              <article class="card" data-code-id="${escapeHtml(code.id || "")}">
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
                <div class="code-management">
                  <div class="limit-control">
                    <label>الحد الأقصى للأجهزة</label>
                    <input class="code-limit" type="number" min="${Math.max(1, activeDevices)}" max="50" value="${limit}" aria-label="الحد الأقصى للأجهزة">
                    <button class="btn small save-limit" type="button">حفظ العدد</button>
                  </div>
                  <div class="manage-actions">
                    <button class="btn small toggle-code ${code.is_active === false ? "success" : "warning"}" type="button">${code.is_active === false ? "إعادة تفعيل الكود" : "إيقاف الكود"}</button>
                    <button class="btn small replace-code" type="button">إصدار كود بديل</button>
                    <button class="btn small danger delete-code" type="button" ${code.is_active !== false || allDevices > 0 ? "disabled" : ""} title="${code.is_active !== false ? "أوقف الكود أولًا" : allDevices > 0 ? "لا يمكن حذف كود مرتبط بأجهزة" : "حذف الكود نهائيًا"}">حذف الكود</button>
                  </div>
                </div>
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
                <td>
                  <div class="device-actions" data-device-id="${escapeHtml(device.id || "")}">
                    <button class="btn small toggle-device ${device.is_active === false ? "success" : "warning"}" type="button">${device.is_active === false ? "إعادة تفعيل الجهاز" : "إيقاف الجهاز"}</button>
                    <button class="btn small danger release-device" type="button" ${device.is_active === false ? "" : "disabled"} title="${device.is_active === false ? "تحرير مقعد الجهاز نهائيًا" : "أوقف الجهاز أولًا"}">تحرير المقعد</button>
                  </div>
                </td>
              </tr>`;
          })
          .join("")
      : '<tr><td colspan="6" class="empty">لا توجد أجهزة مسجلة لهذه المدرسة.</td></tr>';
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

  function openCreateCodeDialog(options = {}) {
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
    $("newMaxDevices").value = String(options.maxDevices || 2);
    $("newExpiresAt").value = "";
    $("disableOldCodes").checked = Boolean(options.disableOld);
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

  async function updateCodeLimit(card) {
    const database = getClient();
    const id = card?.dataset.codeId;
    const code = state.codes.find((row) => text(row.id) === text(id));
    if (!database || !code) return;

    const used = state.devices.filter(
      (device) => device.activation_code === code.activation_code && device.is_active !== false,
    ).length;
    const input = card.querySelector(".code-limit");
    const value = Math.max(1, Math.min(50, Number(input?.value || 1)));
    if (value < used) {
      showToast(`لا يمكن تقليل العدد عن الأجهزة المستخدمة حاليًا (${used}).`);
      input.value = String(Math.max(used, Number(code.max_devices || 1)));
      return;
    }
    if (value === Number(code.max_devices || 1)) {
      showToast("لم يتغير عدد الأجهزة.");
      return;
    }
    if (!window.confirm(`هل تريد تغيير عدد الأجهزة المسموح بها إلى ${value}؟`)) return;

    const { error } = await database
      .from(TABLES.codes)
      .update({ max_devices: value, updated_at: new Date().toISOString() })
      .eq("id", code.id);
    if (error) throw error;
    await loadData();
    showToast("تم تحديث عدد الأجهزة.");
  }

  async function toggleActivationCode(card) {
    const database = getClient();
    const id = card?.dataset.codeId;
    const code = state.codes.find((row) => text(row.id) === text(id));
    if (!database || !code) return;

    const nextActive = code.is_active === false;
    const message = nextActive
      ? "هل تريد إعادة تفعيل هذا الكود؟"
      : "عند إيقاف الكود سيتوقف البرنامج على أجهزته عند أول تحقق متصل. هل تريد المتابعة؟";
    if (!window.confirm(message)) return;

    const { error } = await database
      .from(TABLES.codes)
      .update({ is_active: nextActive, updated_at: new Date().toISOString() })
      .eq("id", code.id);
    if (error) throw error;
    await loadData();
    showToast(nextActive ? "تمت إعادة تفعيل الكود." : "تم إيقاف الكود.");
  }

  function replaceActivationCode(card) {
    const id = card?.dataset.codeId;
    const code = state.codes.find((row) => text(row.id) === text(id));
    if (!code) return;
    if (!window.confirm("سيتم تجهيز كود بديل مع تحديد خيار إيقاف الأكواد القديمة. يمكنك إلغاء العملية قبل الحفظ. هل تريد المتابعة؟")) return;
    openCreateCodeDialog({ maxDevices: Number(code.max_devices || 2), disableOld: true });
  }

  async function deleteActivationCode(card) {
    const database = getClient();
    const id = card?.dataset.codeId;
    const code = state.codes.find((row) => text(row.id) === text(id));
    if (!database || !code) return;

    if (code.is_active !== false) {
      showToast("يجب إيقاف الكود قبل حذفه.");
      return;
    }
    const linkedDevices = state.devices.filter(
      (device) => device.activation_code === code.activation_code,
    ).length;
    if (linkedDevices > 0) {
      showToast("لا يمكن حذف كود مرتبط بأجهزة مسجلة.");
      return;
    }

    const typed = window.prompt(
      `الحذف نهائي ولا يمكن التراجع عنه. للتأكيد اكتب كود التفعيل كاملًا:\n${code.activation_code}`,
      "",
    );
    if (typed === null) return;
    if (text(typed).trim().toUpperCase() !== text(code.activation_code).trim().toUpperCase()) {
      showToast("لم يتطابق كود التأكيد. لم يتم الحذف.");
      return;
    }

    const { error } = await database.from(TABLES.codes).delete().eq("id", code.id);
    if (error) throw error;
    await loadData();
    showToast("تم حذف الكود المتوقف نهائيًا.");
  }

  async function handleCodeManagement(event) {
    const target = event.target;
    const card = target.closest("[data-code-id]");
    if (!card) return;
    try {
      if (target.closest(".save-limit")) await updateCodeLimit(card);
      else if (target.closest(".toggle-code")) await toggleActivationCode(card);
      else if (target.closest(".replace-code")) replaceActivationCode(card);
      else if (target.closest(".delete-code")) await deleteActivationCode(card);
    } catch (error) {
      console.error(error);
      setStatus(`تعذر تنفيذ العملية: ${error.message || error}`, "error");
    }
  }

  function deviceFromActions(actions) {
    const id = actions?.dataset.deviceId;
    return state.devices.find((device) => text(device.id) === text(id)) || null;
  }

  async function toggleDevice(actions) {
    const database = getClient();
    const device = deviceFromActions(actions);
    if (!database || !device) return;

    const nextActive = device.is_active === false;
    const label = device.device_name || device.device_id || "الجهاز";
    const message = nextActive
      ? `هل تريد إعادة تفعيل الجهاز «${label}»؟`
      : `سيتم إيقاف الجهاز «${label}» فقط دون إيقاف كود المدرسة. هل تريد المتابعة؟`;
    if (!window.confirm(message)) return;

    const button = actions.querySelector(".toggle-device");
    button.disabled = true;
    try {
      const { error } = await database
        .from(TABLES.devices)
        .update({ is_active: nextActive })
        .eq("id", device.id);
      if (error) throw error;
      await loadData();
      showToast(nextActive ? "تمت إعادة تفعيل الجهاز." : "تم إيقاف الجهاز.");
    } finally {
      button.disabled = false;
    }
  }

  async function releaseDeviceSeat(actions) {
    const database = getClient();
    const device = deviceFromActions(actions);
    if (!database || !device) return;

    if (device.is_active !== false) {
      showToast("يجب إيقاف الجهاز قبل تحرير مقعده.");
      return;
    }

    const deviceName = text(device.device_name).trim();
    const deviceId = text(device.device_id).trim();
    const confirmationLabel = deviceName || deviceId;
    const typed = window.prompt(
      `سيُحذف تسجيل الجهاز ويُحرر مقعده نهائيًا. للتأكيد اكتب اسم الجهاز أو معرّفه كاملًا:\n${confirmationLabel}`,
      "",
    );
    if (typed === null) return;

    const normalized = text(typed).trim();
    if (normalized !== deviceName && normalized !== deviceId) {
      showToast("لم يتطابق اسم الجهاز أو معرّفه. لم يتم تحرير المقعد.");
      return;
    }

    const button = actions.querySelector(".release-device");
    button.disabled = true;
    try {
      const { error } = await database.from(TABLES.devices).delete().eq("id", device.id);
      if (error) throw error;
      await loadData();
      showToast("تم تحرير مقعد الجهاز وتحديث عدد الأجهزة المستخدمة.");
    } finally {
      button.disabled = false;
    }
  }

  async function handleDeviceManagement(event) {
    const target = event.target;
    const actions = target.closest("[data-device-id]");
    if (!actions) return;
    try {
      if (target.closest(".toggle-device")) await toggleDevice(actions);
      else if (target.closest(".release-device")) await releaseDeviceSeat(actions);
    } catch (error) {
      console.error(error);
      setStatus(`تعذر تنفيذ عملية الجهاز: ${error.message || error}`, "error");
    }
  }

  async function loadData() {
    const button = $("refreshBtn");
    button.disabled = true;
    setStatus("جارٍ تحميل بيانات برنامج Windows…", "loading");

    try {
      const database = getClient();
      if (!database) throw new Error("تعذر تحميل إعدادات الاتصال بقاعدة البيانات.");

      const globalSettingsPromise = loadGlobalSettings(database);

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
      await globalSettingsPromise;
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
    $("refreshBtn").addEventListener("click", () => {
      if (hasGlobalChanges() && !window.confirm("توجد تعديلات عامة لم تُنشر. هل تريد إلغاءها وتحديث البيانات؟")) return;
      loadData();
    });
    Object.entries(GLOBAL_ASSETS).forEach(([key, config]) => {
      $(config.inputId).addEventListener("change", (event) => chooseGlobalAsset(key, event));
    });
    $("globalSettingsPanel").addEventListener("click", (event) => {
      const removeButton = event.target.closest("[data-remove-global]");
      if (removeButton) toggleRemoveGlobalAsset(removeButton.dataset.removeGlobal);
    });
    $("resetGlobalDraftBtn").addEventListener("click", () => {
      clearGlobalDraft();
      setGlobalNotice(globalDefaultNotice());
      showToast("تم إلغاء التعديلات غير المنشورة.");
    });
    $("publishGlobalBtn").addEventListener("click", publishGlobalSettings);
    $("search").addEventListener("input", renderSchools);
    $("schoolFilter").addEventListener("change", renderSchools);
    $("schoolsList").addEventListener("click", handleSchoolActivation);
    $("schoolsList").addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") handleSchoolActivation(event);
    });
    $("codesList").addEventListener("click", (event) => {
      const button = event.target.closest(".copy-code");
      if (button) {
        copyCode(button.dataset.code);
        return;
      }
      handleCodeManagement(event);
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
    $("devicesBody").addEventListener("click", handleDeviceManagement);
    window.addEventListener("beforeunload", (event) => {
      if (!hasGlobalChanges()) return;
      event.preventDefault();
      event.returnValue = "";
    });
    renderGlobalSettings();
    loadData();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
