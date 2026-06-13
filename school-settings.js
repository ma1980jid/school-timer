// school-settings.js

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const params = new URLSearchParams(window.location.search);
const schoolSlug = params.get("school");

let currentSchool = null;

loadSchool();


// =========================
// تحميل بيانات المدرسة
// =========================
async function loadSchool() {

  const { data, error } = await supabaseClient
    .from("schools")
    .select("*")
    .eq("school_slug", schoolSlug)
    .single();

  if (error || !data) {
    alert("تعذر تحميل بيانات المدرسة");
    return;
  }

  currentSchool = data;

  document.getElementById("settingsSchoolName").textContent =
    data.school_name;

  document.getElementById("schoolNameInput").value =
    data.school_name || "";

  document.getElementById("schoolSlugInput").value =
    data.school_slug || "";

  document.getElementById("governorateInput").value =
    data.governorate || "";

  document.getElementById("wilayatInput").value =
    data.wilayat || "";

  document.getElementById("primaryColorInput").value =
    data.primary_color || "#0f766e";

  document.getElementById("secondaryColorInput").value =
    data.secondary_color || "#14b8a6";

  document.getElementById("backgroundColorInput").value =
    data.background_color || "#eaf6f1";

  document.getElementById("themeStyleInput").value =
    data.theme_style || "omani";

  document.getElementById("isActiveInput").checked =
    data.is_active;

  if (data.logo_url) {
    document.getElementById("logoPreview").src =
      data.logo_url;
  }

  if (data.app_icon_url) {
    document.getElementById("iconPreview").src =
      data.app_icon_url;
  }
}


// =========================
// رفع صورة إلى Storage
// =========================
async function uploadImage(file, folder) {

  if (!file) return null;

  const fileName =
    folder + "/" + Date.now() + "-" + file.name;

  const { error } = await supabaseClient.storage
    .from("school-logos")
    .upload(fileName, file, {
      upsert: true
    });

  if (error) {
    alert("فشل رفع الصورة");
    return null;
  }

  const { data } = supabaseClient.storage
    .from("school-logos")
    .getPublicUrl(fileName);

  return data.publicUrl;
}


// =========================
// حفظ البيانات
// =========================
async function saveSchoolSettings() {

  const logoFile =
    document.getElementById("logoFile").files[0];

  const iconFile =
    document.getElementById("iconFile").files[0];

  let logoUrl = currentSchool.logo_url;
  let iconUrl = currentSchool.app_icon_url;

  // رفع شعار المدرسة
  if (logoFile) {

    const uploadedLogo =
      await uploadImage(logoFile, "logos");

    if (uploadedLogo) {
      logoUrl = uploadedLogo;
    }
  }

  // رفع أيقونة التطبيق
  if (iconFile) {

    const uploadedIcon =
      await uploadImage(iconFile, "icons");

    if (uploadedIcon) {
      iconUrl = uploadedIcon;
    }
  }


  const updates = {

    school_name:
      document.getElementById("schoolNameInput").value,

    school_slug:
      document.getElementById("schoolSlugInput").value,

    governorate:
      document.getElementById("governorateInput").value,

    wilayat:
      document.getElementById("wilayatInput").value,

    primary_color:
      document.getElementById("primaryColorInput").value,

    secondary_color:
      document.getElementById("secondaryColorInput").value,

    background_color:
      document.getElementById("backgroundColorInput").value,

    theme_style:
      document.getElementById("themeStyleInput").value,

    logo_url:
      logoUrl,

    app_icon_url:
      iconUrl,

    is_active:
      document.getElementById("isActiveInput").checked
  };


  const { error } = await supabaseClient
    .from("schools")
    .update(updates)
    .eq("id", currentSchool.id);

  if (error) {

    alert("فشل حفظ البيانات");

    console.error(error);

    return;
  }

  alert("تم حفظ بيانات المدرسة بنجاح");

  loadSchool();

}



// =========================
// العودة
// =========================
function goBack() {

  window.location.href = "admin.html";

}
