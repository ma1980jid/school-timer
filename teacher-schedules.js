(function () {
  if (window.__teacherSchedulesPhoneLoaded) return;
  window.__teacherSchedulesPhoneLoaded = true;

  const DB_NAME = 'school_timer_teacher_schedules';
  const DB_VERSION = 1;
  const IMAGE_STORE = 'images';
  const PHONE_SHORT_SIDE_MAX = 540;
  const state = {
    manifest: null,
    response: null,
    selected: null,
    currentBlob: null,
    currentObjectUrl: '',
    currentImageKey: '',
    openRequestId: 0,
    pdfDocument: null,
    pdfVersion: '',
    pdfjs: null,
    refreshTimer: null,
    openedAutomatically: false,
    transform: { scale: 1, x: 0, y: 0 },
    pointers: new Map(),
    gesture: null,
    gestureMoved: false,
  };

  const $ = (id) => document.getElementById(id);

  function slug() {
    return new URLSearchParams(location.search).get('school') || window.SCHOOL_TIMER_SLUG || '__neutral__';
  }

  function isPhone() {
    const shortSide = Math.min(Number(screen.width || innerWidth), Number(screen.height || innerHeight));
    return shortSide <= PHONE_SHORT_SIDE_MAX && (navigator.maxTouchPoints > 0 || 'ontouchstart' in window);
  }

  function endpoint() {
    const root = String(window.SCHOOL_TIMER_SUPABASE_URL || '').replace(/\/$/, '');
    return root ? `${root}/functions/v1/teacher-schedules` : '';
  }

  function manifestKey() { return `school_timer_teacher_manifest_${slug()}`; }
  function selectionKey() { return `school_timer_teacher_selected_${slug()}`; }

  function normalizeName(value) {
    return String(value || '')
      .normalize('NFKC')
      .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '')
      .replace(/ـ/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function readJson(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); }
    catch { return null; }
  }

  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch {}
  }

  function removeLocal(key) {
    try { localStorage.removeItem(key); }
    catch {}
  }

  function cachedManifest() {
    const cached = readJson(manifestKey());
    if (!cached?.manifest || !Array.isArray(cached.manifest.teachers)) return null;
    return cached;
  }

  function cachedSelection() {
    const saved = readJson(selectionKey());
    if (!saved?.name) return null;
    return { name: normalizeName(saved.name), page: Number(saved.page || 0) };
  }

  function saveSelection(teacher) {
    state.selected = { name: normalizeName(teacher.name), page: Number(teacher.page) };
    writeJson(selectionKey(), state.selected);
  }

  function formatDate(value) {
    try {
      return new Intl.DateTimeFormat('ar-OM', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
    } catch {
      return '';
    }
  }

  function ensureWidget() {
    const card = document.querySelector('.school-name-card');
    if (!card || $('teacherSchedulesPhoneWidget')) return Boolean(card);
    card.classList.add('ts-phone-schedules-active');
    const widget = document.createElement('section');
    widget.id = 'teacherSchedulesPhoneWidget';
    widget.className = 'ts-phone-widget';
    widget.setAttribute('aria-label', 'جداول المعلمين');
    card.appendChild(widget);
    renderWidget('loading');
    return true;
  }

  function widgetHeading(badge, badgeClass = '') {
    return `
      <div class="ts-widget-heading">
        <span class="ts-widget-title"><span class="ts-widget-title-icon">▦</span>جداول المعلمين</span>
        <span class="ts-widget-badge${badgeClass ? ` ${badgeClass}` : ''}">${badge}</span>
      </div>`;
  }

  function renderWidget(mode, message = '') {
    const widget = $('teacherSchedulesPhoneWidget');
    if (!widget) return;
    if (mode === 'loading') {
      widget.innerHTML = `${widgetHeading('جارٍ التحقق', 'off')}<div class="ts-widget-message">يتم التحقق من توفر الجداول…</div>`;
      return;
    }
    if (mode === 'empty') {
      widget.innerHTML = `${widgetHeading('غير منشور', 'off')}<div class="ts-widget-message">لم تنشر إدارة المدرسة الجداول بعد.</div>`;
      return;
    }
    if (mode === 'error') {
      widget.innerHTML = `${widgetHeading('غير متاح', 'warn')}<div class="ts-widget-message">${escapeHtml(message || 'تعذر التحقق من الجداول حاليًا.')}</div>`;
      return;
    }

    const teachers = Array.isArray(state.manifest?.teachers) ? state.manifest.teachers : [];
    const saved = selectedTeacher();
    widget.innerHTML = `
      ${widgetHeading(state.response?.offline ? 'نسخة محفوظة' : 'متاح الآن', state.response?.offline ? 'warn' : '')}
      <div class="ts-widget-content">
        <select class="ts-widget-select" id="tsWidgetSelect" aria-label="اختر اسم المعلم">
          <option value="">اختر اسم المعلم</option>
          ${teachers.map((teacher) => `<option value="${teacher.page}"${saved?.page === Number(teacher.page) ? ' selected' : ''}>${escapeHtml(teacher.name)}</option>`).join('')}
        </select>
        <button class="ts-widget-open" id="tsWidgetOpen" type="button" ${saved ? '' : 'disabled'}>عرض</button>
      </div>`;

    const select = $('tsWidgetSelect');
    const open = $('tsWidgetOpen');
    select.addEventListener('change', () => {
      const teacher = teacherByPage(Number(select.value));
      open.disabled = !teacher;
      if (!teacher) return;
      saveSelection(teacher);
      openSchedule(teacher);
    });
    open.addEventListener('click', () => {
      const teacher = teacherByPage(Number(select.value)) || selectedTeacher();
      if (teacher) openSchedule(teacher);
    });
  }

  function teacherByPage(page) {
    return state.manifest?.teachers?.find((teacher) => Number(teacher.page) === Number(page)) || null;
  }

  function selectedTeacher() {
    const saved = state.selected || cachedSelection();
    if (!saved || !state.manifest?.teachers) return null;
    return state.manifest.teachers.find((teacher) => normalizeName(teacher.name) === normalizeName(saved.name)) || null;
  }

  function ensureViewer() {
    if ($('teacherScheduleViewer')) return;
    const viewer = document.createElement('div');
    viewer.id = 'teacherScheduleViewer';
    viewer.className = 'ts-viewer';
    viewer.setAttribute('aria-hidden', 'true');
    viewer.innerHTML = `
      <header class="ts-viewer-header">
        <button class="ts-viewer-close" id="tsViewerClose" type="button" aria-label="إغلاق">×</button>
        <div class="ts-viewer-person"><strong id="tsViewerTeacher">جدول المعلم</strong><span id="tsViewerUpdated"></span></div>
        <button class="ts-viewer-change" id="tsViewerChange" type="button">تغيير المعلم</button>
      </header>
      <main class="ts-viewer-stage" id="tsViewerStage">
        <div class="ts-viewer-state" id="tsViewerState"><span class="ts-viewer-spinner"></span><span id="tsViewerStateText">جارٍ تجهيز الجدول…</span></div>
        <img class="ts-viewer-image" id="tsScheduleImage" alt="جدول المعلم" draggable="false">
      </main>
      <footer class="ts-viewer-footer">
        <div class="ts-viewer-hint" id="tsViewerHint">أدر الهاتف أفقيًا لأفضل مشاهدة، واستخدم إصبعين للتكبير.</div>
        <div class="ts-viewer-tools">
          <button class="ts-tool-button" id="tsZoomOut" type="button">− تصغير</button>
          <button class="ts-tool-button" id="tsZoomReset" type="button">ملاءمة</button>
          <button class="ts-tool-button" id="tsZoomIn" type="button">+ تكبير</button>
          <button class="ts-tool-button" id="tsFullScreen" type="button">ملء الشاشة</button>
          <button class="ts-tool-button" id="tsSaveImage" type="button" disabled>حفظ</button>
          <button class="ts-tool-button primary" id="tsShareImage" type="button" disabled>مشاركة</button>
        </div>
      </footer>`;
    document.body.appendChild(viewer);

    const changePanel = document.createElement('div');
    changePanel.id = 'tsChangePanel';
    changePanel.className = 'ts-change-panel';
    changePanel.innerHTML = `
      <div class="ts-change-card" role="dialog" aria-modal="true" aria-labelledby="tsChangeTitle">
        <h3 id="tsChangeTitle">تغيير المعلم</h3>
        <p>ابحث بالاسم أو اختره من القائمة.</p>
        <input class="ts-change-search" id="tsChangeSearch" type="search" placeholder="ابحث باسم المعلم…" autocomplete="off">
        <select class="ts-change-select" id="tsChangeSelect" aria-label="قائمة المعلمين"></select>
        <div class="ts-change-actions">
          <button class="ts-change-button secondary" id="tsChangeCancel" type="button">إلغاء</button>
          <button class="ts-change-button" id="tsChangeApply" type="button">عرض الجدول</button>
        </div>
      </div>`;
    document.body.appendChild(changePanel);
    bindViewerEvents();
  }

  function showViewerState(text, loading = true) {
    const box = $('tsViewerState');
    const image = $('tsScheduleImage');
    box.hidden = false;
    box.innerHTML = `${loading ? '<span class="ts-viewer-spinner"></span>' : ''}<span id="tsViewerStateText">${escapeHtml(text)}</span>`;
    image.classList.remove('is-visible');
  }

  function clearCurrentImage() {
    if (state.currentObjectUrl) URL.revokeObjectURL(state.currentObjectUrl);
    state.currentBlob = null;
    state.currentObjectUrl = '';
    state.currentImageKey = '';
    const image = $('tsScheduleImage');
    if (image) {
      image.removeAttribute('src');
      image.classList.remove('is-visible');
    }
    if ($('tsSaveImage')) $('tsSaveImage').disabled = true;
    if ($('tsShareImage')) $('tsShareImage').disabled = true;
  }

  function showImage(blob, cached = false, key = '') {
    if (state.currentObjectUrl) URL.revokeObjectURL(state.currentObjectUrl);
    state.currentBlob = blob;
    state.currentObjectUrl = URL.createObjectURL(blob);
    state.currentImageKey = key;
    const image = $('tsScheduleImage');
    image.src = state.currentObjectUrl;
    image.classList.add('is-visible');
    $('tsViewerState').hidden = true;
    $('tsSaveImage').disabled = false;
    $('tsShareImage').disabled = false;
    $('tsViewerHint').textContent = cached && !navigator.onLine
      ? 'تُعرض آخر نسخة محفوظة على هذا الهاتف. أدر الهاتف أفقيًا لأفضل مشاهدة.'
      : 'أدر الهاتف أفقيًا لأفضل مشاهدة، واستخدم إصبعين للتكبير.';
    resetTransform();
  }

  async function pdfjs() {
    if (state.pdfjs) return state.pdfjs;
    const module = await import('./vendor/pdfjs/pdf.min.mjs');
    module.GlobalWorkerOptions.workerSrc = new URL('vendor/pdfjs/pdf.worker.min.mjs', location.href).href;
    state.pdfjs = module;
    return module;
  }

  async function ensurePdfDocument() {
    if (state.pdfDocument && state.pdfVersion === state.manifest.version) return state.pdfDocument;
    if (!state.manifest.signed_pdf_url) throw new Error('لا يتوفر اتصال لتحميل الإصدار الجديد.');
    const response = await fetch(state.manifest.signed_pdf_url, { cache: 'no-store' });
    if (!response.ok) throw new Error('تعذر تحميل ملف الجدول.');
    const bytes = new Uint8Array(await response.arrayBuffer());
    const module = await pdfjs();
    if (state.pdfDocument?.destroy) await state.pdfDocument.destroy().catch(() => {});
    state.pdfDocument = await module.getDocument({ data: bytes }).promise;
    state.pdfVersion = state.manifest.version;
    return state.pdfDocument;
  }

  async function renderTeacherPage(teacher) {
    const pdf = await ensurePdfDocument();
    const page = await pdf.getPage(Number(teacher.page));
    const base = page.getViewport({ scale: 1 });
    const targetWidth = Math.min(2400, Math.max(1600, innerWidth * Math.min(3, devicePixelRatio || 1) * 2));
    const scale = Math.min(3, Math.max(2, targetWidth / base.width));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const context = canvas.getContext('2d', { alpha: false });
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: context, viewport }).promise;
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((value) => value ? resolve(value) : reject(new Error('تعذر إنشاء صورة الجدول.')), 'image/png');
    });
    await putCachedImage(teacher, blob);
    return blob;
  }

  async function openSchedule(teacher) {
    if (!teacher || !state.manifest) return;
    const requestId = ++state.openRequestId;
    const requestedKey = imageKey(teacher);
    ensureViewer();
    saveSelection(teacher);
    const viewer = $('teacherScheduleViewer');
    viewer.classList.add('is-open');
    viewer.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
    $('tsViewerTeacher').textContent = teacher.name;
    $('tsViewerUpdated').textContent = state.manifest.updated_at ? `آخر تحديث: ${formatDate(state.manifest.updated_at)}` : '';
    if (state.currentImageKey !== requestedKey) clearCurrentImage();
    showViewerState('جارٍ تجهيز جدول المعلم…');

    try {
      const cached = await getCachedImage(teacher);
      if (requestId !== state.openRequestId) return;
      if (cached?.blob) showImage(cached.blob, true, requestedKey);
      if (!cached?.blob) {
        const blob = await renderTeacherPage(teacher);
        if (requestId !== state.openRequestId) return;
        showImage(blob, false, requestedKey);
      }
    } catch (error) {
      if (requestId !== state.openRequestId) return;
      if (state.currentBlob && state.currentImageKey === requestedKey) {
        showImage(state.currentBlob, true, requestedKey);
        return;
      }
      showViewerState(error instanceof Error ? error.message : 'تعذر عرض جدول المعلم.', false);
    }
  }

  function closeViewer() {
    const viewer = $('teacherScheduleViewer');
    if (!viewer) return;
    viewer.classList.remove('is-open');
    viewer.setAttribute('aria-hidden', 'true');
    state.openRequestId += 1;
    $('tsChangePanel')?.classList.remove('is-open');
    document.documentElement.style.overflow = '';
  }

  function openChangePanel() {
    const panel = $('tsChangePanel');
    const search = $('tsChangeSearch');
    panel.classList.add('is-open');
    search.value = '';
    renderChangeOptions('');
    setTimeout(() => search.focus(), 80);
  }

  function renderChangeOptions(query) {
    const select = $('tsChangeSelect');
    const term = normalizeName(query).toLowerCase();
    const teachers = (state.manifest?.teachers || []).filter((teacher) => normalizeName(teacher.name).toLowerCase().includes(term));
    const selected = selectedTeacher();
    select.innerHTML = teachers.map((teacher) => `<option value="${teacher.page}"${selected?.page === Number(teacher.page) ? ' selected' : ''}>${escapeHtml(teacher.name)}</option>`).join('');
  }

  function applyTransform() {
    const image = $('tsScheduleImage');
    if (!image) return;
    image.style.transform = `translate3d(${state.transform.x}px, ${state.transform.y}px, 0) scale(${state.transform.scale})`;
  }

  function setScale(value) {
    state.transform.scale = Math.min(5, Math.max(1, value));
    if (state.transform.scale === 1) {
      state.transform.x = 0;
      state.transform.y = 0;
    }
    applyTransform();
  }

  function resetTransform() {
    state.transform = { scale: 1, x: 0, y: 0 };
    applyTransform();
  }

  function pointerDistance() {
    const points = [...state.pointers.values()];
    if (points.length < 2) return 0;
    return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
  }

  function bindStageGestures(stage) {
    stage.addEventListener('pointerdown', (event) => {
      stage.setPointerCapture?.(event.pointerId);
      state.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      state.gestureMoved = false;
      if (state.pointers.size === 2) {
        state.gesture = { type: 'pinch', distance: pointerDistance(), scale: state.transform.scale };
      } else {
        state.gesture = { type: 'pan', x: event.clientX, y: event.clientY, tx: state.transform.x, ty: state.transform.y };
      }
    });
    stage.addEventListener('pointermove', (event) => {
      if (!state.pointers.has(event.pointerId)) return;
      const previous = state.pointers.get(event.pointerId);
      state.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (Math.hypot(event.clientX - previous.x, event.clientY - previous.y) > 2) state.gestureMoved = true;
      if (state.pointers.size >= 2 && state.gesture?.type === 'pinch') {
        const distance = pointerDistance();
        if (state.gesture.distance) setScale(state.gesture.scale * (distance / state.gesture.distance));
      } else if (state.pointers.size === 1 && state.gesture?.type === 'pan' && state.transform.scale > 1) {
        state.transform.x = state.gesture.tx + event.clientX - state.gesture.x;
        state.transform.y = state.gesture.ty + event.clientY - state.gesture.y;
        applyTransform();
      }
    });
    const finish = (event) => {
      state.pointers.delete(event.pointerId);
      if (state.pointers.size === 1) {
        const point = [...state.pointers.values()][0];
        state.gesture = { type: 'pan', x: point.x, y: point.y, tx: state.transform.x, ty: state.transform.y };
      } else if (!state.pointers.size) {
        state.gesture = null;
      }
    };
    stage.addEventListener('pointerup', finish);
    stage.addEventListener('pointercancel', finish);
  }

  function fileName() {
    const name = normalizeName(state.selected?.name || 'المعلم').replace(/[\\/:*?"<>|]/g, '-');
    return `جدول-${name}.png`;
  }

  function saveImage() {
    if (!state.currentBlob) return;
    const url = URL.createObjectURL(state.currentBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName();
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function shareImage() {
    if (!state.currentBlob) return;
    const file = new File([state.currentBlob], fileName(), { type: 'image/png' });
    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      try {
        await navigator.share({ title: `جدول ${state.selected?.name || 'المعلم'}`, files: [file] });
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
      }
    }
    saveImage();
  }

  async function requestFullScreen() {
    const viewer = $('teacherScheduleViewer');
    try {
      if (!document.fullscreenElement) await viewer.requestFullscreen?.();
      else await document.exitFullscreen?.();
    } catch {}
  }

  function bindViewerEvents() {
    $('tsViewerClose').addEventListener('click', closeViewer);
    $('tsViewerChange').addEventListener('click', openChangePanel);
    $('tsZoomOut').addEventListener('click', () => setScale(state.transform.scale - .35));
    $('tsZoomIn').addEventListener('click', () => setScale(state.transform.scale + .35));
    $('tsZoomReset').addEventListener('click', resetTransform);
    $('tsFullScreen').addEventListener('click', requestFullScreen);
    $('tsSaveImage').addEventListener('click', saveImage);
    $('tsShareImage').addEventListener('click', shareImage);
    $('tsScheduleImage').addEventListener('click', () => {
      if (!state.gestureMoved) requestFullScreen();
    });
    $('tsChangeSearch').addEventListener('input', (event) => renderChangeOptions(event.target.value));
    $('tsChangeCancel').addEventListener('click', () => $('tsChangePanel').classList.remove('is-open'));
    $('tsChangeApply').addEventListener('click', () => {
      const teacher = teacherByPage(Number($('tsChangeSelect').value));
      if (!teacher) return;
      $('tsChangePanel').classList.remove('is-open');
      renderWidget('available');
      openSchedule(teacher);
    });
    $('tsChangePanel').addEventListener('click', (event) => {
      if (event.target === $('tsChangePanel')) $('tsChangePanel').classList.remove('is-open');
    });
    bindStageGestures($('tsViewerStage'));
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('indexeddb-unavailable'));
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IMAGE_STORE)) {
          const store = db.createObjectStore(IMAGE_STORE, { keyPath: 'key' });
          store.createIndex('school_slug', 'school_slug', { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function imageKey(teacher) {
    return `${slug()}:${state.manifest.version}:${Number(teacher.page)}`;
  }

  async function getCachedImage(teacher) {
    try {
      const db = await openDatabase();
      return await new Promise((resolve) => {
        const request = db.transaction(IMAGE_STORE, 'readonly').objectStore(IMAGE_STORE).get(imageKey(teacher));
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  async function putCachedImage(teacher, blob) {
    try {
      const db = await openDatabase();
      await new Promise((resolve, reject) => {
        const transaction = db.transaction(IMAGE_STORE, 'readwrite');
        transaction.objectStore(IMAGE_STORE).put({
          key: imageKey(teacher),
          school_slug: slug(),
          version: state.manifest.version,
          page: Number(teacher.page),
          name: normalizeName(teacher.name),
          blob,
          saved_at: Date.now(),
        });
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
      });
    } catch {}
  }

  async function clearSchoolImages(keepVersion = '') {
    try {
      const db = await openDatabase();
      await new Promise((resolve) => {
        const transaction = db.transaction(IMAGE_STORE, 'readwrite');
        const index = transaction.objectStore(IMAGE_STORE).index('school_slug');
        const request = index.openCursor(IDBKeyRange.only(slug()));
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) return;
          if (!keepVersion || cursor.value.version !== keepVersion) cursor.delete();
          cursor.continue();
        };
        transaction.oncomplete = resolve;
        transaction.onerror = resolve;
      });
    } catch {}
  }

  function applyManifest(result, offline = false) {
    const previous = cachedManifest()?.manifest;
    const versionChanged = Boolean(previous?.version && previous.version !== result.manifest?.version);
    state.response = { ...result, offline };
    state.manifest = result.manifest;
    if (!offline) {
      const cacheCopy = {
        ...result,
        manifest: { ...result.manifest, signed_pdf_url: '' },
        saved_at: Date.now(),
      };
      writeJson(manifestKey(), cacheCopy);
    }

    if (versionChanged) {
      if (state.pdfDocument?.destroy) state.pdfDocument.destroy().catch(() => {});
      state.pdfDocument = null;
      state.pdfVersion = '';
      clearSchoolImages(state.manifest.version);
      clearCurrentImage();
    }

    const saved = cachedSelection();
    const matching = saved && state.manifest.teachers.find((teacher) => normalizeName(teacher.name) === normalizeName(saved.name));
    if (matching) saveSelection(matching);
    else if (saved) {
      removeLocal(selectionKey());
      state.selected = null;
    }
    renderWidget('available');

    if (versionChanged && $('teacherScheduleViewer')?.classList.contains('is-open') && matching) {
      openSchedule(matching);
      return;
    }

    if (!state.openedAutomatically && matching) {
      state.openedAutomatically = true;
      setTimeout(() => openSchedule(matching), 350);
    }
  }

  async function refreshManifest(options = {}) {
    const url = endpoint();
    if (!url) return renderWidget('error', 'الخدمة غير مفعلة حاليًا.');
    if (!options.silent) renderWidget('loading');
    try {
      const response = await fetch(`${url}?school=${encodeURIComponent(slug())}`, { cache: 'no-store' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.message || 'تعذر التحقق من الجداول.');
      if (!result.published) {
        state.response = result;
        state.manifest = null;
        state.selected = null;
        removeLocal(manifestKey());
        removeLocal(selectionKey());
        clearSchoolImages();
        closeViewer();
        clearCurrentImage();
        renderWidget('empty');
        return;
      }
      applyManifest(result, false);
    } catch (error) {
      const cached = cachedManifest();
      if (cached?.published) applyManifest(cached, true);
      else renderWidget('error', 'تعذر التحقق من الجداول حاليًا.');
    }
  }

  function start() {
    if (!isPhone() || slug() === '__neutral__') return;
    if (!ensureWidget()) return;
    ensureViewer();
    state.selected = cachedSelection();
    refreshManifest();
    state.refreshTimer = setInterval(() => refreshManifest({ silent: true }), 5 * 60 * 1000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') refreshManifest({ silent: true });
    });
  }

  window.addEventListener('online', () => {
    if (isPhone() && $('teacherSchedulesPhoneWidget')) refreshManifest({ silent: true });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if ($('tsChangePanel')?.classList.contains('is-open')) $('tsChangePanel').classList.remove('is-open');
    else if ($('teacherScheduleViewer')?.classList.contains('is-open')) closeViewer();
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
