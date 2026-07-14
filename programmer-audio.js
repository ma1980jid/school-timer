(function () {
  "use strict";

  const ADMIN_UID = "1e32db69-d286-49c7-8a56-3e6eb7b02590";
  const AUDIO_BUCKET = "windows-audio";
  const PROFILE_LABELS = {
    end_only: "النهايات فقط",
    start_and_end: "البداية والنهاية",
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
    localManifest: null,
    localFiles: new Map(),
    localAssets: [],
    packageValid: false,
    assetFilter: "all",
    releases: [],
    remoteAssets: [],
    settings: { default_profile_key: "end_only", active_release_id: null },
    schools: [],
    schoolProfiles: [],
    publishingReleaseId: null,
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

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("ar-OM", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  }

  function formatBytes(value) {
    const bytes = Number(value || 0);
    if (bytes < 1024) return `${bytes} بايت`;
    if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} ك.ب`;
    return `${(bytes / 1024 ** 2).toFixed(1)} م.ب`;
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
    let client;
    try {
      client = createClient();
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
    await loadRemoteData({ silent: true });
  }

  function normalizeSelectedPath(file) {
    const raw = String(file.webkitRelativePath || file.name).replace(/\\/g, "/");
    const pieces = raw.split("/").filter(Boolean);
    return pieces.length > 1 ? pieces.slice(1).join("/") : pieces[0];
  }

  async function parseLocalPackage(fileList) {
    closeAudioPreview();
    state.localManifest = null;
    state.localFiles = new Map();
    state.localAssets = [];
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
        sortOrder: index,
        active: item.active !== false,
      }));
      state.localAssets = [...systemAssets, ...guidanceAssets];

      const missingFiles = state.localAssets.filter((asset) => !state.localFiles.has(asset.filePath));
      const availableSystemKeys = new Set(systemAssets.map((asset) => asset.assetKey));
      const missingSystemKeys = REQUIRED_SYSTEM_KEYS.filter((key) => !availableSystemKeys.has(key));
      const duplicateKeys = state.localAssets
        .map((asset) => asset.assetKey)
        .filter((key, index, all) => all.indexOf(key) !== index);

      state.packageValid = (
        systemAssets.length === REQUIRED_SYSTEM_KEYS.length
        && guidanceAssets.length > 0
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
      populateAwarenessSelectors(guidanceAssets);
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
    $("awarenessFirst").innerHTML = '<option value="">اختر الحزمة أولًا</option>';
    $("awarenessSecond").innerHTML = '<option value="">اختر الحزمة أولًا</option>';
    $("awarenessFirst").disabled = true;
    $("awarenessSecond").disabled = true;
    $("createDraftBtn").disabled = true;
    showStatus(message, "error", true);
  }

  function renderPackageSummary(details) {
    const totalBytes = details.files.reduce((sum, file) => sum + Number(file.size || 0), 0);
    const issues = [];
    if (details.systemAssets.length !== REQUIRED_SYSTEM_KEYS.length) issues.push("عدد أصوات النظام غير مكتمل");
    if (details.missingSystemKeys.length) issues.push(`${details.missingSystemKeys.length} حدث مفقود`);
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
      showStatus(`تم التحقق من ${state.localAssets.length} ملفًا صوتيًا داخل الحزمة.`, "success");
    } else {
      showStatus(`الحزمة غير مكتملة: ${issues.join("، ")}.`, "error", true);
    }
  }

  function populateAwarenessSelectors(guidanceAssets) {
    const options = [
      '<option value="">— اختر مقطعًا —</option>',
      ...guidanceAssets.map((asset) => (
        `<option value="${escapeHtml(asset.assetKey)}">${escapeHtml(asset.titleAr)} · ${escapeHtml(asset.categoryAr)}</option>`
      )),
    ].join("");
    $("awarenessFirst").innerHTML = options;
    $("awarenessSecond").innerHTML = options;
    $("awarenessFirst").disabled = false;
    $("awarenessSecond").disabled = false;
  }

  function validateDraftReadiness() {
    const first = $("awarenessFirst").value;
    const second = $("awarenessSecond").value;
    const selectedAssets = state.localAssets.filter((asset) => first === asset.assetKey || second === asset.assetKey);
    const awarenessReady = Boolean(first && second && first !== second && selectedAssets.length === 2 && selectedAssets.every((asset) => asset.active));
    const titleReady = Boolean($("releaseTitle").value.trim());
    $("createDraftBtn").disabled = state.busy || !state.packageValid || !awarenessReady || !titleReady;
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
      return `<article class="asset-card" data-asset-key="${escapeHtml(asset.assetKey)}">
        <div class="asset-card-top">
          <span class="tag ${asset.kind === "system_event" ? "system" : ""}">${escapeHtml(asset.categoryAr)}</span>
          <label class="asset-check"><input type="checkbox" data-asset-active="${escapeHtml(asset.assetKey)}" ${asset.active ? "checked" : ""}> مفعّل</label>
        </div>
        <h3>${escapeHtml(asset.titleAr)}</h3>
        <p title="${escapeHtml(asset.filePath)}">${escapeHtml(asset.filePath)}</p>
        <div class="asset-card-actions">
          <span class="pill muted">${formatBytes(file?.size || 0)}</span>
          <button class="button secondary small" type="button" data-preview-key="${escapeHtml(asset.assetKey)}">تشغيل</button>
        </div>
      </article>`;
    }).join("");

    $("localAssetsList").querySelectorAll("[data-preview-key]").forEach((button) => {
      button.addEventListener("click", () => previewLocalAsset(button.dataset.previewKey));
    });
    $("localAssetsList").querySelectorAll("[data-asset-active]").forEach((input) => {
      input.addEventListener("change", () => {
        const asset = state.localAssets.find((item) => item.assetKey === input.dataset.assetActive);
        if (asset) asset.active = input.checked;
        validateDraftReadiness();
      });
    });
  }

  function previewLocalAsset(assetKey) {
    const asset = state.localAssets.find((item) => item.assetKey === assetKey);
    const file = asset && state.localFiles.get(asset.filePath);
    if (!asset || !file) return;
    closeAudioPreview();
    state.previewUrl = URL.createObjectURL(file);
    $("audioDockTitle").textContent = asset.titleAr;
    $("audioPreview").src = state.previewUrl;
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
      const finish = (value) => {
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
    manifest.central_config = {
      default_profile: $("releaseDefaultProfile").value,
      awareness_sequence: [$("awarenessFirst").value, $("awarenessSecond").value],
      awareness_rotation: false,
      transition: "start_next_when_current_ends",
      fixed_delay_seconds: 0,
      prevent_overlap: true,
      school_controls: "read_only",
    };
    manifest.assets = Object.fromEntries(state.localAssets.map((asset) => [asset.assetKey, {
      kind: asset.kind,
      category: asset.category,
      title_ar: asset.titleAr,
      file: asset.filePath,
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
    if (!confirm("سيتم رفع جميع ملفات الحزمة إلى مساحة الصوتيات وحفظها كمسودة غير منشورة. هل تريد المتابعة؟")) return;

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
        const storagePath = `releases/${release.id}/${asset.filePath}`;
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
        storage_bucket: AUDIO_BUCKET,
      };
      manifest.assets = Object.fromEntries(assetRows.map((asset) => [asset.asset_key, {
        kind: asset.kind,
        category: asset.category,
        title_ar: asset.title_ar,
        storage_path: asset.storage_path,
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
      showStatus(`تم حفظ الإصدار رقم ${release.version_number} كمسودة. راجعه ثم اضغط «نشر».`, "success", true);
      await loadRemoteData({ silent: true });
    } catch (error) {
      console.error(error);
      await rollbackDraft(releaseId, uploadedPaths);
      $("uploadProgress").hidden = true;
      const missingSql = /does not exist|schema cache|42P01/i.test(errorText(error));
      showStatus(
        missingSql
          ? "جداول الصوتيات غير موجودة. نفّذ ملف database/windows_audio_central.sql في Supabase أولًا."
          : `تعذر إنشاء المسودة، وتم التراجع عن الملفات المرفوعة: ${errorText(error)}`,
        "error",
        true,
      );
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
      const [releasesResult, assetsResult, settingsResult, schoolsResult, profilesResult] = await Promise.all([
        client.from("windows_audio_releases").select("*").order("version_number", { ascending: false }),
        client.from("windows_audio_assets").select("id,release_id,asset_key,kind,is_active,file_size_bytes"),
        client.from("windows_audio_settings").select("*").eq("id", 1).maybeSingle(),
        client.from("schools").select("school_name,school_slug,is_active,school_type").order("school_name", { ascending: true }),
        client.from("windows_school_audio_profiles").select("school_slug,profile_key,updated_at"),
      ]);
      const audioErrors = [releasesResult.error, assetsResult.error, settingsResult.error, profilesResult.error].filter(Boolean);
      if (audioErrors.length) throw audioErrors[0];
      if (schoolsResult.error) throw schoolsResult.error;
      state.releases = releasesResult.data || [];
      state.remoteAssets = assetsResult.data || [];
      state.settings = settingsResult.data || { id: 1, default_profile_key: "end_only", active_release_id: null };
      state.schools = schoolsResult.data || [];
      state.schoolProfiles = profilesResult.data || [];
      renderRemoteData();
      if (!options.silent) showStatus("تم تحديث بيانات الصوتيات المركزية.", "success");
    } catch (error) {
      console.error(error);
      const missingSql = /does not exist|schema cache|42P01|PGRST205/i.test(errorText(error));
      showStatus(
        missingSql
          ? "قاعدة الصوتيات لم تُجهز بعد. نفّذ ملف database/windows_audio_central.sql في Supabase، ثم اضغط تحديث البيانات."
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

  function renderRemoteData() {
    const published = state.releases.find((release) => release.status === "published");
    const drafts = state.releases.filter((release) => release.status === "draft");
    const assetCount = published
      ? state.remoteAssets.filter((asset) => asset.release_id === published.id && asset.is_active).length
      : 0;
    $("statPublishedVersion").textContent = published ? `v${published.version_number}` : "—";
    $("statPublishedAssets").textContent = String(assetCount);
    $("statDrafts").textContent = String(drafts.length);
    $("statSchoolOverrides").textContent = String(state.schoolProfiles.length);
    $("draftsBadge").textContent = String(drafts.length);
    $("globalDefaultProfile").value = state.settings.default_profile_key || "end_only";
    renderPublishedRelease(published, assetCount);
    renderDrafts(drafts);
    renderSchools();
  }

  function renderPublishedRelease(release, assetCount) {
    const card = $("publishedReleaseCard");
    if (!release) {
      card.innerHTML = '<span class="release-state">الإصدار المنشور</span><h3>لا يوجد إصدار منشور</h3><p>أنشئ مسودة مكتملة ثم انشرها.</p>';
      return;
    }
    const awareness = release.manifest?.central_config?.awareness_sequence || [];
    card.innerHTML = `<span class="release-state">الإصدار المنشور</span>
      <h3>v${escapeHtml(release.version_number)} · ${escapeHtml(release.title)}</h3>
      <p>${escapeHtml(release.notes || "بدون ملاحظات")}</p>
      <div class="release-meta">
        <span class="pill success">${assetCount} ملفًا مفعلًا</span>
        <span class="pill muted">${escapeHtml(PROFILE_LABELS[release.manifest?.central_config?.default_profile] || PROFILE_LABELS[state.settings.default_profile_key])}</span>
        <span class="pill muted">${awareness.length} توعيات ثابتة</span>
        <span class="pill muted">${escapeHtml(formatDate(release.published_at))}</span>
      </div>`;
  }

  function renderDrafts(drafts) {
    if (!drafts.length) {
      $("draftsList").innerHTML = '<div class="empty-state">لا توجد مسودات.</div>';
      return;
    }
    $("draftsList").innerHTML = drafts.map((release) => {
      const assets = state.remoteAssets.filter((asset) => asset.release_id === release.id);
      const activeAssets = assets.filter((asset) => asset.is_active).length;
      const awareness = release.manifest?.central_config?.awareness_sequence || [];
      const assetByKey = new Map(assets.map((asset) => [asset.asset_key, asset]));
      const hasRequiredSystemAssets = REQUIRED_SYSTEM_KEYS.every((key) => (
        assetByKey.get(key)?.kind === "system_event"
      ));
      const hasValidAwareness = awareness.length === 2
        && awareness[0] !== awareness[1]
        && awareness.every((key) => {
          const asset = assetByKey.get(key);
          return asset?.kind === "guidance" && asset.is_active;
        });
      const defaultProfile = release.manifest?.central_config?.default_profile;
      const ready = hasRequiredSystemAssets
        && hasValidAwareness
        && Object.hasOwn(PROFILE_LABELS, defaultProfile);
      return `<article class="draft-card">
        <div class="draft-card-top">
          <div><h4>v${escapeHtml(release.version_number)} · ${escapeHtml(release.title)}</h4><p>${escapeHtml(formatDate(release.created_at))}</p></div>
          <span class="release-state draft">مسودة</span>
        </div>
        <div class="release-meta">
          <span class="pill muted">${assets.length} ملفًا</span>
          <span class="pill muted">${activeAssets} مفعّل</span>
          <span class="pill ${ready ? "success" : "warn"}">${ready ? "جاهزة للنشر" : "غير مكتملة"}</span>
        </div>
        <button class="button primary wide" type="button" data-publish-release="${escapeHtml(release.id)}" ${ready ? "" : "disabled"}>مراجعة ونشر</button>
      </article>`;
    }).join("");
    $("draftsList").querySelectorAll("[data-publish-release]").forEach((button) => {
      button.addEventListener("click", () => openPublishDialog(button.dataset.publishRelease));
    });
  }

  function openPublishDialog(releaseId) {
    const release = state.releases.find((item) => item.id === releaseId && item.status === "draft");
    if (!release) return;
    state.publishingReleaseId = releaseId;
    $("publishConfirmation").value = "";
    $("confirmPublishBtn").disabled = true;
    $("publishDialogText").textContent = `سيصبح الإصدار v${release.version_number} «${release.title}» هو المصدر الرسمي الذي تستقبله جميع نسخ Windows عند الاتصال. سيُؤرشف الإصدار السابق تلقائيًا.`;
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
      showStatus(`تم نشر الإصدار v${data.version_number} بنجاح.`, "success", true);
      await loadRemoteData({ silent: true });
    } catch (error) {
      console.error(error);
      showStatus(`تعذر نشر الإصدار: ${errorText(error)}`, "error", true);
    } finally {
      button.textContent = "نشر الإصدار";
      button.disabled = $("publishConfirmation").value.trim() !== "نشر";
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
      const override = state.schoolProfiles.find((profile) => profile.school_slug === school.school_slug);
      const effective = override?.profile_key || state.settings.default_profile_key || "end_only";
      return `<tr>
        <td><div class="school-name">${escapeHtml(school.school_name || school.school_slug)}</div></td>
        <td><div class="school-slug">${escapeHtml(school.school_slug)}</div></td>
        <td><span class="pill ${override ? "success" : "muted"}">${escapeHtml(PROFILE_LABELS[effective])}${override ? " · مخصص" : " · افتراضي"}</span></td>
        <td>
          <select class="row-profile" data-school-profile="${escapeHtml(school.school_slug)}">
            <option value="__default__" ${override ? "" : "selected"}>اتباع الوضع الافتراضي</option>
            <option value="end_only" ${override?.profile_key === "end_only" ? "selected" : ""}>النهايات فقط</option>
            <option value="start_and_end" ${override?.profile_key === "start_and_end" ? "selected" : ""}>البداية والنهاية</option>
          </select>
        </td>
        <td><button class="button secondary small" type="button" data-save-school-profile="${escapeHtml(school.school_slug)}">حفظ</button></td>
      </tr>`;
    }).join("");
    body.querySelectorAll("[data-save-school-profile]").forEach((button) => {
      button.addEventListener("click", () => saveSchoolProfile(button.dataset.saveSchoolProfile, button));
    });
  }

  async function saveSchoolProfile(schoolSlug, button) {
    const select = document.querySelector(`[data-school-profile="${CSS.escape(schoolSlug)}"]`);
    if (!select) return;
    button.disabled = true;
    button.textContent = "جارٍ…";
    try {
      if (select.value === "__default__") {
        const { error } = await state.client.from("windows_school_audio_profiles").delete().eq("school_slug", schoolSlug);
        if (error) throw error;
      } else {
        const { error } = await state.client.from("windows_school_audio_profiles").upsert({
          school_slug: schoolSlug,
          profile_key: select.value,
          updated_at: new Date().toISOString(),
        }, { onConflict: "school_slug" });
        if (error) throw error;
      }
      showStatus("تم حفظ الوضع الصوتي للمدرسة.", "success");
      await loadRemoteData({ silent: true });
    } catch (error) {
      console.error(error);
      showStatus(`تعذر حفظ وضع المدرسة: ${errorText(error)}`, "error", true);
    } finally {
      button.disabled = false;
      button.textContent = "حفظ";
    }
  }

  async function saveGlobalDefault() {
    const button = $("saveGlobalDefaultBtn");
    const profile = $("globalDefaultProfile").value;
    if (!confirm(`سيصبح «${PROFILE_LABELS[profile]}» الوضع الافتراضي للمدارس التي لا تملك تخصيصًا. هل تريد المتابعة؟`)) return;
    button.disabled = true;
    try {
      const { error } = await state.client.from("windows_audio_settings").update({
        default_profile_key: profile,
        updated_at: new Date().toISOString(),
      }).eq("id", 1);
      if (error) throw error;
      showStatus("تم تحديث الوضع الصوتي الافتراضي.", "success");
      await loadRemoteData({ silent: true });
    } catch (error) {
      console.error(error);
      showStatus(`تعذر حفظ الوضع الافتراضي: ${errorText(error)}`, "error", true);
    } finally {
      button.disabled = false;
    }
  }

  function bindEvents() {
    $("loginForm").addEventListener("submit", login);
    $("logoutBtn").addEventListener("click", logout);
    $("refreshBtn").addEventListener("click", () => loadRemoteData());
    $("audioFolderInput").addEventListener("change", (event) => parseLocalPackage(event.target.files));
    $("awarenessFirst").addEventListener("change", validateDraftReadiness);
    $("awarenessSecond").addEventListener("change", validateDraftReadiness);
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
    $("schoolSearch").addEventListener("input", renderSchools);
    $("saveGlobalDefaultBtn").addEventListener("click", saveGlobalDefault);
    $("publishConfirmation").addEventListener("input", () => {
      $("confirmPublishBtn").disabled = $("publishConfirmation").value.trim() !== "نشر";
    });
    $("confirmPublishBtn").addEventListener("click", publishRelease);
    $("cancelPublishBtn").addEventListener("click", closePublishDialog);
    $("closePublishDialog").addEventListener("click", closePublishDialog);
    $("closeAudioDock").addEventListener("click", closeAudioPreview);
    window.addEventListener("beforeunload", closeAudioPreview);
  }

  function init() {
    bindEvents();
    authorizeSession();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
