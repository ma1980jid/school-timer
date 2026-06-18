const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let schools = [];

async function loadSchools() {
  const { data, error } = await supabaseClient
    .from("schools")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    showSystemStatus("تعذر تحميل المدارس.", true);
    return;
  }

  schools = data || [];
  document.getElementById("schoolsCount").textContent = `${schools.length} مدرسة`;
  renderSchools();
}

function renderSchools() {
  const list = document.getElementById("schoolsList");
  list.innerHTML = "";

  schools.forEach(school => {
    const teacherLink = `${window.location.origin}/?school=${school.school_slug}`;
    const dashboardLink = `${window.location.origin}/dashboard.html?school=${school.school_slug}`;
    const settingsLink = `${window.location.origin}/school-settings.html?id=${school.id}`;

    const div = document.createElement("div");
    div.className = school.is_active ? "item active" : "item";

    div.innerHTML = `
      <span class="icon">${school.is_active ? "✅" : "⛔"}</span>
      <span class="name">${school.school_name || "مدرسة بدون اسم"}</span>
      <span class="time">${school.governorate || ""} - ${school.wilayat || ""}</span>
      <span class="status">
        <button class="admin-btn" onclick="copyText('${teacherLink}')">رابط المعلمين</button>
        <button class="admin-btn" onclick="copyText('${dashboardLink}')">رابط المدير</button>
        <button class="admin-btn" onclick="location.href='${settingsLink}'">تعديل</button>
        <button class="admin-btn" onclick="toggleSchool(${school.id}, ${school.is_active})">
          ${school.is_active ? "إيقاف" : "تفعيل"}
        </button>
      </span>
    `;

    list.appendChild(div);
  });
}

async function addSchool() {
  const schoolName = document.getElementById("schoolNameInput").value.trim();
  const schoolSlug = document.getElementById("schoolSlugInput").value.trim();
  const governorate = document.getElementById("governorateInput").value.trim();
  const wilayat = document.getElementById("wilayatInput").value.trim();

  if (!schoolName || !schoolSlug) {
    showSystemStatus("أدخل اسم المدرسة والرابط المختصر.", true);
    return;
  }

  const { error } = await supabaseClient
    .from("schools")
    .insert({
      school_name: schoolName,
      school_slug: schoolSlug,
      governorate,
      wilayat,
      is_active: true,
      primary_color: "#0f766e",
      secondary_color: "#b7791f",
      background_color: "#ecfdf5",
      theme_style: "omani"
    });

  if (error) {
    showSystemStatus("تعذر إضافة المدرسة. تأكد أن school_slug غير مكرر.", true);
    return;
  }

  clearForm();
  showSystemStatus("تمت إضافة المدرسة بنجاح.", false);
  loadSchools();
}

async function toggleSchool(id, currentState) {
  const { error } = await supabaseClient
    .from("schools")
    .update({ is_active: !currentState })
    .eq("id", id);

  if (error) {
    showSystemStatus("تعذر تغيير حالة المدرسة.", true);
    return;
  }

  loadSchools();
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    showSystemStatus("تم نسخ الرابط.", false);
  } catch {
    showSystemStatus("تعذر النسخ.", true);
  }
}

function clearForm() {
  document.getElementById("schoolNameInput").value = "";
  document.getElementById("schoolSlugInput").value = "";
  document.getElementById("governorateInput").value = "";
  document.getElementById("wilayatInput").value = "";
}

function showSystemStatus(message, isError = false) {
  const box = document.getElementById("systemStatus");
  box.classList.remove("hidden", "danger");
  if (isError) box.classList.add("danger");
  box.textContent = message;
}

loadSchools();
