(function () {
  if (window.__teacherSchedulesAdminLoaded) return;
  window.__teacherSchedulesAdminLoaded = true;

  const MAX_FILE_BYTES = 6 * 1024 * 1024;
  const state = {
    file: null,
    pdf: null,
    teachers: [],
    current: null,
    busy: false,
    pdfjs: null,
  };

  const $ = (id) => document.getElementById(id);

  function schoolSlug() {
    return new URLSearchParams(location.search).get('school') || window.SCHOOL_TIMER_SLUG || 'alsheikh-saif';
  }

  function endpoint() {
    const root = String(window.SCHOOL_TIMER_SUPABASE_URL || '').replace(/\/$/, '');
    return root ? `${root}/functions/v1/teacher-schedules` : '';
  }

  function formatBytes(bytes) {
    const value = Number(bytes || 0);
    if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} كيلوبايت`;
    return `${(value / (1024 * 1024)).toFixed(1)} ميجابايت`;
  }

  function formatDate(value) {
    if (!value) return '--';
    try {
      return new Intl.DateTimeFormat('ar-OM', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
    } catch {
      return String(value);
    }
  }

  function normalizeArabic(value) {
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

  function showStatus(message, kind = '') {
    const box = $('tsAnalysisStatus');
    if (!box) return;
    box.textContent = message;
    box.className = `ts-analysis-status${kind ? ` ${kind}` : ''}`;
  }

  function ensureStyle() {
    if (document.getElementById('teacherSchedulesAdminStyle')) return;
    const link = document.createElement('link');
    link.id = 'teacherSchedulesAdminStyle';
    link.rel = 'stylesheet';
    link.href = 'teacher-schedules-admin.css?v=teacher-schedules-01';
    document.head.appendChild(link);
  }

  function ensureDialog() {
    if ($('teacherSchedulesAdminDialog')) return;
    const dialog = document.createElement('div');
    dialog.id = 'teacherSchedulesAdminDialog';
    dialog.className = 'ts-admin-dialog';
    dialog.setAttribute('aria-hidden', 'true');
    dialog.innerHTML = `
      <section class="ts-admin-shell" role="dialog" aria-modal="true" aria-labelledby="tsAdminTitle">
        <header class="ts-admin-header">
          <div class="ts-admin-title">
            <span class="ts-admin-icon" aria-hidden="true">▦</span>
            <div>
              <h2 id="tsAdminTitle">إدارة جداول المعلمين</h2>
              <p>ارفع ملف PDF، راجع أسماء المعلمين، ثم انشره لهواتف معلمي المدرسة.</p>
            </div>
          </div>
          <button class="ts-admin-close" id="tsAdminCloseTop" type="button" aria-label="إغلاق">×</button>
        </header>

        <div class="ts-admin-body">
          <div class="ts-admin-grid">
            <div>
              <article class="ts-panel">
                <div class="ts-panel-head">
                  <h3>الجدول المنشور حاليًا</h3>
                  <p>يحتفظ النظام بإصدار منشور واحد فقط لكل مدرسة.</p>
                </div>
                <div class="ts-panel-body" id="tsCurrentSchedule">
                  <div class="ts-current-card"><span class="ts-badge off">جارٍ التحقق</span></div>
                </div>
              </article>

              <article class="ts-panel" style="margin-top:14px">
                <div class="ts-panel-head">
                  <h3>رفع ملف PDF جديد</h3>
                  <p>لن يُحذف الملف السابق إلا بعد نجاح نشر الملف الجديد.</p>
                </div>
                <div class="ts-panel-body">
                  <label class="ts-upload-zone" id="tsUploadZone" for="tsPdfInput">
                    <span class="ts-upload-plus">+</span>
                    <strong>اختيار ملف جداول المعلمين</strong>
                    <span>PDF فقط، وبحد أقصى 6 ميجابايت</span>
                  </label>
                  <input id="tsPdfInput" type="file" accept="application/pdf,.pdf" hidden>
                  <div class="ts-file-summary" id="tsFileSummary" hidden></div>
                  <div class="ts-preview-wrap" id="tsPreviewWrap">
                    <div class="ts-preview-placeholder">تظهر هنا معاينة الصفحة المختارة بعد تحليل الملف.</div>
                  </div>
                  <p class="ts-preview-caption" id="tsPreviewCaption">لا توجد معاينة حاليًا.</p>
                </div>
              </article>
            </div>

            <article class="ts-panel">
              <div class="ts-panel-head">
                <h3>مراجعة أسماء المعلمين</h3>
                <p>يمكن تعديل الاسم أو حذف الصفحة أو تغيير ترتيب ظهور الأسماء قبل النشر.</p>
              </div>
              <div class="ts-panel-body">
                <div class="ts-analysis-status" id="tsAnalysisStatus">اختر ملف PDF لبدء التحليل التلقائي.</div>
                <div class="ts-teachers-toolbar">
                  <strong>الأسماء المستخرجة</strong>
                  <span id="tsTeacherCount">0 معلم</span>
                </div>
                <div class="ts-teachers-list" id="tsTeachersList">
                  <div class="ts-preview-placeholder">لم تُستخرج أسماء بعد.</div>
                </div>
              </div>
            </article>
          </div>
        </div>

        <footer class="ts-admin-footer">
          <div class="ts-footer-note">النشر والاستبدال والحذف محمية برمز إدارة المدرسة.</div>
          <div class="ts-footer-actions">
            <button class="ts-button danger" id="tsDeletePublished" type="button" disabled>حذف الجدول المنشور</button>
            <button class="ts-button secondary" id="tsReanalyze" type="button" disabled>إعادة التحليل</button>
            <button class="ts-button" id="tsPublish" type="button" disabled>نشر جداول المعلمين</button>
            <button class="ts-button secondary" id="tsAdminCloseBottom" type="button">إغلاق</button>
          </div>
        </footer>
      </section>`;
    document.body.appendChild(dialog);
    bindDialogEvents();
  }

  function addDashboardButton() {
    if ($('teacherSchedulesAdminBtn')) return;
    const actions = document.querySelector('.left-panel .actions, .actions');
    if (!actions) return;
    const button = document.createElement('button');
    button.id = 'teacherSchedulesAdminBtn';
    button.type = 'button';
    button.className = 'btn light';
    button.textContent = 'إدارة جداول المعلمين';
    button.addEventListener('click', openDialog);
    actions.appendChild(button);
  }

  function addGuideCard() {
    const grid = document.querySelector('.guide-grid');
    if (!grid || $('teacherSchedulesGuideCard')) return;
    const card = document.createElement('article');
    card.id = 'teacherSchedulesGuideCard';
    card.className = 'guide-card';
    card.innerHTML = `
      <span class="guide-number">7</span>
      <h4>جداول المعلمين</h4>
      <p>ارفع ملف PDF، راجع الأسماء المستخرجة، ثم انشره. يمكن استبدال الإصدار الحالي أو حذفه بأمان.</p>`;
    grid.appendChild(card);
  }

  async function pdfjs() {
    if (state.pdfjs) return state.pdfjs;
    const module = await import('./vendor/pdfjs/pdf.min.mjs');
    module.GlobalWorkerOptions.workerSrc = new URL('vendor/pdfjs/pdf.worker.min.mjs', location.href).href;
    state.pdfjs = module;
    return module;
  }

  function chooseTeacherName(items, height) {
    const excluded = /مدير المدرسة|المدرسة|وزارة التعليم|الفسحة|الصلاة|الأحد|الاثنين|الثلاثاء|الأربعاء|الخميس/i;
    const candidates = items
      .map((item) => {
        const text = normalizeArabic(item.str);
        const transform = Array.isArray(item.transform) ? item.transform : [];
        const y = Number(transform[5] || 0);
        const fontSize = Math.max(Math.abs(Number(transform[0] || 0)), Math.abs(Number(transform[3] || 0)));
        return { text, y, fontSize, dir: item.dir || '' };
      })
      .filter((item) => item.text && /[\u0600-\u06ff]/.test(item.text))
      .filter((item) => item.y >= height * 0.86)
      .filter((item) => !excluded.test(item.text))
      .filter((item) => !/[0-9٠-٩]/.test(item.text));

    candidates.sort((a, b) => (b.fontSize * 100 + b.y + b.text.length) - (a.fontSize * 100 + a.y + a.text.length));
    return candidates[0]?.text || '';
  }

  async function analyzeFile(file) {
    if (!file) return;
    state.busy = true;
    state.file = file;
    state.pdf = null;
    state.teachers = [];
    updateControls();
    showStatus('جارٍ فتح ملف PDF والتحقق من صفحاته…');

    try {
      const module = await pdfjs();
      const bytes = new Uint8Array(await file.arrayBuffer());
      const signature = new TextDecoder().decode(bytes.slice(0, 5));
      if (signature !== '%PDF-') throw new Error('الملف المختار ليس ملف PDF صالحًا.');
      const documentTask = module.getDocument({ data: bytes });
      const document = await documentTask.promise;
      if (!document.numPages || document.numPages > 400) throw new Error('عدد صفحات الملف غير مدعوم.');

      state.pdf = document;
      const extracted = [];
      let manualCount = 0;
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
        showStatus(`جارٍ تحليل الصفحة ${pageNumber} من ${document.numPages}…`);
        const page = await document.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1 });
        const content = await page.getTextContent();
        const automaticName = chooseTeacherName(content.items, viewport.height);
        if (!automaticName) manualCount += 1;
        extracted.push({
          name: automaticName || `المعلم - الصفحة ${pageNumber}`,
          page: pageNumber,
          automatic: Boolean(automaticName),
        });
      }

      state.teachers = extracted;
      renderFileSummary();
      renderTeachers();
      await renderPreview(1);
      showStatus(
        manualCount
          ? `اكتمل التحليل. تحتاج ${manualCount} صفحة إلى إدخال الاسم يدويًا قبل النشر.`
          : `اكتمل التحليل بنجاح واستخراج ${extracted.length} اسمًا. راجع الأسماء قبل النشر.`,
        manualCount ? 'warn' : 'success',
      );
    } catch (error) {
      state.file = null;
      state.pdf = null;
      state.teachers = [];
      renderFileSummary();
      renderTeachers();
      showStatus(error instanceof Error ? error.message : 'تعذر تحليل ملف PDF.', 'error');
    } finally {
      state.busy = false;
      updateControls();
    }
  }

  function renderFileSummary() {
    const summary = $('tsFileSummary');
    if (!summary) return;
    if (!state.file || !state.pdf) {
      summary.hidden = true;
      summary.replaceChildren();
      return;
    }
    summary.hidden = false;
    summary.innerHTML = `
      <div class="ts-file-line"><b>${escapeHtml(state.file.name)}</b><span>${formatBytes(state.file.size)}</span></div>
      <div class="ts-file-line"><b>عدد الصفحات</b><span>${state.pdf.numPages} صفحة</span></div>`;
  }

  function renderTeachers() {
    const list = $('tsTeachersList');
    const count = $('tsTeacherCount');
    if (!list || !count) return;
    count.textContent = `${state.teachers.length} معلم`;
    if (!state.teachers.length) {
      list.innerHTML = '<div class="ts-preview-placeholder">لم تُستخرج أسماء بعد.</div>';
      updateControls();
      return;
    }
    list.innerHTML = state.teachers.map((teacher, index) => `
      <div class="ts-teacher-row" data-teacher-index="${index}">
        <span class="ts-page-number">ص ${teacher.page}</span>
        <label class="ts-name-field">
          <input type="text" value="${escapeHtml(teacher.name)}" maxlength="140" data-teacher-name="${index}" aria-label="اسم معلم الصفحة ${teacher.page}">
          <span class="ts-name-source">${teacher.automatic ? 'مستخرج تلقائيًا' : 'يحتاج مراجعة يدوية'}</span>
        </label>
        <div class="ts-row-actions">
          <button class="ts-mini-button" type="button" data-preview-page="${teacher.page}" title="معاينة الصفحة">◉</button>
          <button class="ts-mini-button" type="button" data-move="up" data-index="${index}" ${index === 0 ? 'disabled' : ''} title="تحريك لأعلى">↑</button>
          <button class="ts-mini-button" type="button" data-move="down" data-index="${index}" ${index === state.teachers.length - 1 ? 'disabled' : ''} title="تحريك لأسفل">↓</button>
          <button class="ts-mini-button danger" type="button" data-remove="${index}" title="حذف الاسم">×</button>
        </div>
      </div>`).join('');

    list.querySelectorAll('[data-teacher-name]').forEach((input) => {
      input.addEventListener('input', () => {
        const index = Number(input.dataset.teacherName);
        state.teachers[index].name = normalizeArabic(input.value);
        state.teachers[index].automatic = !state.teachers[index].name.startsWith('المعلم - الصفحة');
        updateControls();
      });
    });
    list.querySelectorAll('[data-preview-page]').forEach((button) => {
      button.addEventListener('click', () => renderPreview(Number(button.dataset.previewPage)));
    });
    list.querySelectorAll('[data-move]').forEach((button) => {
      button.addEventListener('click', () => moveTeacher(Number(button.dataset.index), button.dataset.move));
    });
    list.querySelectorAll('[data-remove]').forEach((button) => {
      button.addEventListener('click', () => {
        state.teachers.splice(Number(button.dataset.remove), 1);
        renderTeachers();
      });
    });
    updateControls();
  }

  function moveTeacher(index, direction) {
    const next = direction === 'up' ? index - 1 : index + 1;
    if (next < 0 || next >= state.teachers.length) return;
    [state.teachers[index], state.teachers[next]] = [state.teachers[next], state.teachers[index]];
    renderTeachers();
  }

  async function renderPreview(pageNumber, externalPdf = null) {
    const pdfDocument = externalPdf || state.pdf;
    const wrap = $('tsPreviewWrap');
    if (!pdfDocument || !wrap) return;
    try {
      const page = await pdfDocument.getPage(pageNumber);
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(1.8, 680 / base.width);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(viewport.width * ratio);
      canvas.height = Math.round(viewport.height * ratio);
      canvas.style.width = `${Math.round(viewport.width)}px`;
      canvas.style.height = `${Math.round(viewport.height)}px`;
      const context = canvas.getContext('2d', { alpha: false });
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      await page.render({ canvasContext: context, viewport }).promise;
      wrap.replaceChildren(canvas);
      $('tsPreviewCaption').textContent = `معاينة الصفحة ${pageNumber}`;
    } catch {
      wrap.innerHTML = '<div class="ts-preview-placeholder">تعذر إنشاء معاينة هذه الصفحة.</div>';
    }
  }

  function validTeachers() {
    if (!state.file || !state.pdf || !state.teachers.length) return false;
    const names = state.teachers.map((teacher) => normalizeArabic(teacher.name));
    if (names.some((name) => name.length < 2 || name.startsWith('المعلم - الصفحة'))) return false;
    return new Set(names).size === names.length;
  }

  function updateControls() {
    const publish = $('tsPublish');
    const reanalyze = $('tsReanalyze');
    const deleteButton = $('tsDeletePublished');
    if (publish) {
      publish.disabled = state.busy || !validTeachers();
      publish.textContent = state.current?.published ? 'استبدال الجداول الحالية' : 'نشر جداول المعلمين';
    }
    if (reanalyze) reanalyze.disabled = state.busy || !state.file;
    if (deleteButton) deleteButton.disabled = state.busy || !state.current?.published;
  }

  async function loadCurrent() {
    const host = $('tsCurrentSchedule');
    if (!host) return;
    host.innerHTML = '<div class="ts-current-card"><span class="ts-badge off">جارٍ التحقق</span><div class="ts-current-meta">يتم الاتصال بالخدمة…</div></div>';
    const url = endpoint();
    if (!url) {
      state.current = null;
      host.innerHTML = '<div class="ts-current-card"><span class="ts-badge warn">غير مهيأ</span><div class="ts-current-meta">لم يتم ضبط اتصال Supabase.</div></div>';
      updateControls();
      return;
    }
    try {
      const response = await fetch(`${url}?school=${encodeURIComponent(schoolSlug())}`, { cache: 'no-store' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.message || 'تعذر تحميل الحالة الحالية.');
      state.current = result;
      if (!result.published) {
        host.innerHTML = `
          <div class="ts-current-card">
            <div class="ts-current-top"><b class="ts-current-name">لا توجد جداول منشورة</b><span class="ts-badge off">غير منشور</span></div>
            <div class="ts-current-meta">يمكنك رفع أول ملف PDF وتحليله ثم نشره.</div>
          </div>`;
      } else {
        const manifest = result.manifest;
        host.innerHTML = `
          <div class="ts-current-card">
            <div class="ts-current-top"><b class="ts-current-name">${escapeHtml(manifest.original_file_name)}</b><span class="ts-badge">منشور</span></div>
            <div class="ts-current-meta">${manifest.teachers.length} معلم · ${manifest.page_count} صفحة<br>آخر تحديث: ${escapeHtml(formatDate(manifest.updated_at))}</div>
            <button class="ts-button secondary" id="tsPreviewCurrent" type="button">معاينة الجدول الحالي</button>
          </div>`;
        $('tsPreviewCurrent').addEventListener('click', previewCurrent);
      }
    } catch (error) {
      state.current = null;
      host.innerHTML = `
        <div class="ts-current-card">
          <span class="ts-badge warn">تحتاج تفعيل</span>
          <div class="ts-current-meta">${escapeHtml(error instanceof Error ? error.message : 'تعذر الاتصال بالخدمة.')}</div>
        </div>`;
    }
    updateControls();
  }

  async function previewCurrent() {
    const signedUrl = state.current?.manifest?.signed_pdf_url;
    if (!signedUrl) return;
    showStatus('جارٍ تحميل معاينة الجدول المنشور…');
    try {
      const module = await pdfjs();
      const response = await fetch(signedUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error();
      const bytes = new Uint8Array(await response.arrayBuffer());
      const currentPdf = await module.getDocument({ data: bytes }).promise;
      await renderPreview(1, currentPdf);
      showStatus('تم عرض الصفحة الأولى من الجدول المنشور.', 'success');
    } catch {
      showStatus('تعذر تحميل معاينة الجدول المنشور.', 'error');
    }
  }

  function savedAdminCode() {
    return sessionStorage.getItem(`school_timer_admin_code_${schoolSlug()}`) || '';
  }

  function requireAdminCode() {
    const current = savedAdminCode();
    if (current) return current;
    return String(prompt('أدخل رمز إدارة المدرسة') || '').trim();
  }

  async function publishSchedules() {
    if (!validTeachers() || state.busy) return;
    if (state.current?.published && !confirm('سيتم استبدال جداول المعلمين الحالية بعد نجاح رفع الملف الجديد. هل تريد المتابعة؟')) return;
    const code = requireAdminCode();
    if (!code) return showStatus('لم يتم إدخال رمز إدارة المدرسة.', 'warn');

    state.busy = true;
    updateControls();
    const button = $('tsPublish');
    button.textContent = 'جارٍ النشر…';
    showStatus('جارٍ رفع ملف PDF واعتماد الإصدار الجديد…');

    try {
      const form = new FormData();
      form.append('school_slug', schoolSlug());
      form.append('admin_code', code);
      form.append('file', state.file, state.file.name);
      form.append('page_count', String(state.pdf.numPages));
      form.append('teachers', JSON.stringify(state.teachers.map(({ name, page }) => ({ name: normalizeArabic(name), page }))));
      const response = await fetch(endpoint(), { method: 'POST', body: form });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        if (response.status === 401) sessionStorage.removeItem(`school_timer_admin_code_${schoolSlug()}`);
        throw new Error(result.message || 'تعذر نشر جداول المعلمين.');
      }
      sessionStorage.setItem(`school_timer_admin_code_${schoolSlug()}`, code);
      showStatus(result.message || 'تم نشر جداول المعلمين.', 'success');
      state.file = null;
      state.pdf = null;
      state.teachers = [];
      $('tsPdfInput').value = '';
      renderFileSummary();
      renderTeachers();
      $('tsPreviewWrap').innerHTML = '<div class="ts-preview-placeholder">اختر ملفًا جديدًا عند الحاجة إلى إصدار آخر.</div>';
      $('tsPreviewCaption').textContent = 'تم اعتماد الإصدار المنشور.';
      await loadCurrent();
    } catch (error) {
      showStatus(error instanceof Error ? error.message : 'تعذر نشر جداول المعلمين.', 'error');
    } finally {
      state.busy = false;
      updateControls();
    }
  }

  async function deletePublished() {
    if (!state.current?.published || state.busy) return;
    const confirmation = String(prompt('سيختفي الجدول من هواتف المعلمين. اكتب كلمة حذف للتأكيد.') || '').trim();
    if (confirmation !== 'حذف') return showStatus('تم إلغاء الحذف.', 'warn');
    const code = requireAdminCode();
    if (!code) return showStatus('لم يتم إدخال رمز إدارة المدرسة.', 'warn');

    state.busy = true;
    updateControls();
    showStatus('جارٍ حذف الجدول المنشور…');
    try {
      const response = await fetch(endpoint(), {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ school_slug: schoolSlug(), admin_code: code, confirmation }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        if (response.status === 401) sessionStorage.removeItem(`school_timer_admin_code_${schoolSlug()}`);
        throw new Error(result.message || 'تعذر حذف الجدول المنشور.');
      }
      sessionStorage.setItem(`school_timer_admin_code_${schoolSlug()}`, code);
      showStatus(result.message, 'success');
      await loadCurrent();
    } catch (error) {
      showStatus(error instanceof Error ? error.message : 'تعذر حذف الجدول المنشور.', 'error');
    } finally {
      state.busy = false;
      updateControls();
    }
  }

  function acceptFile(file) {
    if (!file) return;
    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') {
      return showStatus('اختر ملفًا بصيغة PDF فقط.', 'error');
    }
    if (file.size > MAX_FILE_BYTES) return showStatus('حجم الملف أكبر من 6 ميجابايت.', 'error');
    analyzeFile(file);
  }

  function bindDialogEvents() {
    $('tsAdminCloseTop').addEventListener('click', closeDialog);
    $('tsAdminCloseBottom').addEventListener('click', closeDialog);
    $('tsPublish').addEventListener('click', publishSchedules);
    $('tsDeletePublished').addEventListener('click', deletePublished);
    $('tsReanalyze').addEventListener('click', () => analyzeFile(state.file));
    $('tsPdfInput').addEventListener('change', (event) => acceptFile(event.target.files?.[0]));
    const zone = $('tsUploadZone');
    ['dragenter', 'dragover'].forEach((name) => zone.addEventListener(name, (event) => {
      event.preventDefault();
      zone.classList.add('is-dragging');
    }));
    ['dragleave', 'drop'].forEach((name) => zone.addEventListener(name, (event) => {
      event.preventDefault();
      zone.classList.remove('is-dragging');
    }));
    zone.addEventListener('drop', (event) => acceptFile(event.dataTransfer?.files?.[0]));
    $('teacherSchedulesAdminDialog').addEventListener('click', (event) => {
      if (event.target === $('teacherSchedulesAdminDialog')) closeDialog();
    });
  }

  async function openDialog() {
    ensureStyle();
    ensureDialog();
    const dialog = $('teacherSchedulesAdminDialog');
    dialog.classList.add('is-open');
    dialog.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
    await loadCurrent();
  }

  function closeDialog() {
    const dialog = $('teacherSchedulesAdminDialog');
    if (!dialog) return;
    dialog.classList.remove('is-open');
    dialog.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
  }

  function start() {
    ensureStyle();
    addDashboardButton();
    addGuideCard();
    setTimeout(addDashboardButton, 400);
    setTimeout(addGuideCard, 700);
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && $('teacherSchedulesAdminDialog')?.classList.contains('is-open')) closeDialog();
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
