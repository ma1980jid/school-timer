const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const params = new URLSearchParams(window.location.search);
const schoolSlug = params.get("school") || DEFAULT_SCHOOL_SLUG;

let currentSchool = null;
let allSchedules = [];
let teacherUrl = "";
let classroomUrl = "";

async function loadDashboard() {
  const { data: school, error: schoolError } = await supabaseClient
    .from("schools")
    .select("*")
    .eq("school_slug", schoolSlug)
    .eq("is_active", true)
    .single();

  if (schoolError || !school) {
    showStatus("لم يتم العثور على المدرسة.", true);
    return;
  }

  currentSchool = school;
  document.getElementById("dashboardSchoolName").textContent = school.school_name;

  fillSchoolForm(school);

  const baseUrl = window.location.origin;

  teacherUrl = `${baseUrl}/?school=${school.school_slug}`;
  classroomUrl = `${baseUrl}/classroom.html?school=${school.school_slug}`;

  document.getElementById("teacherLink").textContent = teacherUrl;
  document.getElementById("classroomDisplayLink").textContent = classroomUrl;

  await loadSchedules();
  await loadMessages();
}

function fillSchoolForm(school) {
  document.getElementById("schoolNameInput").value = school.school_name || "";
  document.getElementById("governorateInput").value = school.governorate || "";
  document.getElementById("wilayatInput").value = school.wilayat || "";
  document.getElementById("logoUrlInput").value = school.logo_url || "";
  document.getElementById("appIconUrlInput").value = school.app_icon_url || "";
  document.getElementById("primaryColorInput").value = school.primary_color || "#0f766e";
  document.getElementById("secondaryColorInput").value = school.secondary_color || "#b7791f";
  document.getElementById("backgroundColorInput").value = school.background_color || "#ecfdf5";
  document.getElementById("themeStyleInput").value = school.theme_style || "omani";
}

async function saveSchoolData() {
  if (!currentSchool) return;

  const updates = {
    school_name: document.getElementById("schoolNameInput").value.trim(),
    governorate: document.getElementById("governorateInput").value.trim(),
    wilayat: document.getElementById("wilayatInput").value.trim(),
    logo_url: document.getElementById("logoUrlInput").value.trim(),
    app_icon_url: document.getElementById("appIconUrlInput").value.trim(),
    primary_color: document.getElementById("primaryColorInput").value,
    secondary_color: document.getElementById("secondaryColorInput").value,
    background_color: document.getElementById("backgroundColorInput").value,
    theme_style: document.getElementById("themeStyleInput").value.trim() || "omani"
  };

  const { error } = await supabaseClient
    .from("schools")
    .update(updates)
    .eq("id", currentSchool.id);

  if (error) {
    showStatus("تعذر حفظ بيانات المدرسة.", true);
    return;
  }

  showStatus("تم حفظ بيانات المدرسة بنجاح.", false);
  loadDashboard();
}

async function loadSchedules() {
  const { data: schedulesData, error: schedulesError } = await supabaseClient
    .from("schedules")
    .select("*")
    .order("id", { ascending: true });

  if (schedulesError || !schedulesData) {
    showStatus("تعذر تحميل جدول schedules.", true);
    return;
  }

  allSchedules = schedulesData;

  const { data: schoolSchedules, error: schoolSchedulesError } = await supabaseClient
    .from("school_schedules")
    .select("*")
    .eq("school_id", currentSchool.id)
    .order("id", { ascending: true });

  if (schoolSchedulesError || !schoolSchedules) {
    showStatus("تعذر تحميل التوقيتات.", true);
    return;
  }

  renderSchedules(schoolSchedules);
}

function renderSchedules(rows) {
  const container = document.getElementById("dashboardSchedules");
  container.innerHTML = "";

  rows.forEach(row => {
    const schedule = allSchedules.find(s => Number(s.id) === Number(row.schedule_id));

    const div = document.createElement("div");
    div.className = row.is_active ? "item active" : "item";

    div.innerHTML = `
      <span class="icon">${row.is_active ? "✅" : "○"}</span>
      <span class="name">${schedule?.schedule_name || "توقيت بدون اسم"}</span>
      <span class="time">${schedule?.description || ""}</span>
      <span class="status">
        <button class="admin-btn" onclick="activateSchedule(${row.id})">
          ${row.is_active ? "نشط الآن" : "تفعيل"}
        </button>
      </span>
    `;

    container.appendChild(div);
  });
}

async function activateSchedule(rowId) {
  if (!currentSchool) return;

  await supabaseClient
    .from("school_schedules")
    .update({ is_active: false })
    .eq("school_id", currentSchool.id);

  const { error } = await supabaseClient
    .from("school_schedules")
    .update({ is_active: true })
    .eq("id", rowId);

  if (error) {
    showStatus("تعذر تفعيل التوقيت.", true);
    return;
  }

  showStatus("تم تفعيل التوقيت بنجاح.", false);
  loadSchedules();
}

async function loadMessages() {
  const { data, error } = await supabaseClient
    .from("messages")
    .select("*")
    .eq("school_id", currentSchool.id)
    .order("id", { ascending: true });

  if (error) {
    showStatus("تعذر تحميل الرسائل.", true);
    return;
  }

  renderMessages(data || []);
}

function renderMessages(messages) {
  const list = document.getElementById("dashboardMessages");
  list.innerHTML = "";

  messages.forEach(msg => {
    const div = document.createElement("div");
    div.className = msg.is_active ? "item active" : "item";

    div.innerHTML = `
      <span class="icon">${msg.is_active ? "✅" : "○"}</span>
      <span class="name">${msg.message_text}</span>
      <span class="time">${msg.message_type || "عام"}</span>
      <span class="status">
        <button class="admin-btn" onclick="toggleMessage(${msg.id}, ${msg.is_active})">
          ${msg.is_active ? "تعطيل" : "تفعيل"}
        </button>
        <button class="admin-btn" onclick="deleteMessage(${msg.id})">حذف</button>
      </span>
    `;

    list.appendChild(div);
  });
}

async function addMessage() {
  const text = document.getElementById("messageText").value.trim();
  const type = document.getElementById("messageType").value.trim() || "تربوية";

  if (!text) {
    showStatus("اكتب الرسالة أولًا.", true);
    return;
  }

  const { error } = await supabaseClient
    .from("messages")
    .insert({
      school_id: currentSchool.id,
      message_text: text,
      message_type: type,
      is_active: true
    });

  if (error) {
    showStatus("تعذر إضافة الرسالة.", true);
    return;
  }

  document.getElementById("messageText").value = "";
  document.getElementById("messageType").value = "";

  showStatus("تمت إضافة الرسالة بنجاح.", false);
  loadMessages();
}

async function toggleMessage(id, currentState) {
  const { error } = await supabaseClient
    .from("messages")
    .update({ is_active: !currentState })
    .eq("id", id);

  if (error) {
    showStatus("تعذر تغيير حالة الرسالة.", true);
    return;
  }

  loadMessages();
}

async function deleteMessage(id) {
  const confirmed = confirm("هل تريد حذف هذه الرسالة؟");
  if (!confirmed) return;

  const { error } = await supabaseClient
    .from("messages")
    .delete()
    .eq("id", id);

  if (error) {
    showStatus("تعذر حذف الرسالة.", true);
    return;
  }

  showStatus("تم حذف الرسالة.", false);
  loadMessages();
}

function copyTeacherLink() {
  copyText(teacherUrl, "تم نسخ رابط المعلمين.");
}

function copyClassroomLink() {
  copyText(classroomUrl, "تم نسخ رابط الشاشة التفاعلية.");
}

function openTeacherLink() {
  window.open(teacherUrl, "_blank");
}

function openClassroomLink() {
  window.open(classroomUrl, "_blank");
}

async function copyText(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
    showStatus(successMessage, false);
  } catch (error) {
    showStatus("تعذر النسخ. انسخ الرابط يدويًا.", true);
  }
}

function showStatus(message, isError = false) {
  const box = document.getElementById("dashboardStatus");
  box.classList.remove("hidden", "danger");
  if (isError) box.classList.add("danger");
  box.textContent = message;
}

loadDashboard();
