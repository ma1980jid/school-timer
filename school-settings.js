const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const params = new URLSearchParams(window.location.search);
const schoolId = params.get("id");

let currentSchool = null;

async function loadSchoolSettings() {
  if (!schoolId) {
    showSettingsStatus("لم يتم تحديد رقم المدرسة.", true);
    return;
  }

  const { data, error } = await supabaseClient
    .from("schools")
    .select("*")
    .eq("id", schoolId)
    .single();

  if (error || !data) {
    showSettingsStatus("تعذر تحميل بيانات المدرسة.", true);
    return;
  }

  currentSchool = data;
  fillForm(data);
}

function fillForm(school) {
  document.getElementById("settingsSchoolName").textContent = school.school_name || "مدرسة";
  document.getElementById("schoolNameInput").value = school.school_name || "";
  document.getElementById("schoolSlugInput").value = school.school_slug || "";
  document.getElementById("governorateInput").value = school.governorate || "";
  document.getElementById("wilayatInput").value = school.wilayat || "";
  document.getElementById("logoUrlInput").value = school.logo_url || "";
  document.getElementById("appIconUrlInput").value = school.app_icon_url || "";
  document.getElementById("primaryColorInput").value = school.primary_color || "#0f766e";
  document.getElementById("secondaryColorInput").value = school.secondary_color || "#b7791f";
  document.getElementById("backgroundColorInput").value = school.background_color || "#ecfdf5";
  document.getElementById("themeStyleInput").value = school.theme_style || "omani";
  document.getElementById("isActiveInput").checked = school.is_active === true;
}

async function saveSchoolSettings() {
  if (!currentSchool) return;

  const updates = {
    school_name: document.getElementById("schoolNameInput").value.trim(),
    school_slug: document.getElementById("schoolSlugInput").value.trim(),
    governorate: document.getElementById("governorateInput").value.trim(),
    wilayat: document.getElementById("wilayatInput").value.trim(),
    logo_url: document.getElementById("logoUrlInput").value.trim(),
    app_icon_url: document.getElementById("appIconUrlInput").value.trim(),
    primary_color: document.getElementById("primaryColorInput").value,
    secondary_color: document.getElementById("secondaryColorInput").value,
    background_color: document.getElementById("backgroundColorInput").value,
    theme_style: document.getElementById("themeStyleInput").value.trim() || "omani",
    is_active: document.getElementById("isActiveInput").checked
  };

  if (!updates.school_name || !updates.school_slug) {
    showSettingsStatus("اسم المدرسة والرابط المختصر مطلوبان.", true);
    return;
  }

  const { error } = await supabaseClient
    .from("schools")
    .update(updates)
    .eq("id", currentSchool.id);

  if (error) {
    showSettingsStatus("تعذر حفظ التعديلات. تأكد أن school_slug غير مكرر.", true);
    return;
  }

  showSettingsStatus("تم حفظ بيانات المدرسة بنجاح.", false);
  loadSchoolSettings();
}

function goBack() {
  location.href = "system.html";
}

function showSettingsStatus(message, isError = false) {
  const box = document.getElementById("settingsStatus");
  box.classList.remove("hidden", "danger");
  if (isError) box.classList.add("danger");
  box.textContent = message;
}

loadSchoolSettings();
