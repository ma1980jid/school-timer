// school-settings.js

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const params = new URLSearchParams(window.location.search);
const schoolSlug = params.get("school");
const schoolId = params.get("id");

let currentSchool = null;

loadSchool();


// =========================
// تحميل بيانات المدرسة
// =========================
async function loadSchool() {

  let query = supabaseClient
    .from("schools")
    .select("*");

  if (schoolSlug) {
    query = query.eq("school_slug", schoolSlug);
  } else if (schoolId) {
    query = query.eq("id", schoolId);
  } else {
    alert("رابط المدرسة غير مكتمل");
    return;
  }

  const { data, error } = await query.single();

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

  const logoPreview = document.getElementById("logoPreview");
  const iconPreview = document.getElementById("iconPreview");

  if (data.logo_url && logoPreview) {
    logoPreview.src = data.logo_url;
  }

  if (iconPreview) {
    iconPreview.src = data.app_icon_url || data.logo_url || "";
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
      upsert: true,
      contentType: file.type || "image/png"
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
// إنشاء أيقونة مربعة من الشعار
// =========================
function createAppIconFromLogo(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("لم يتم اختيار شعار"));
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = () => {
        try {
          const size = 512;
          const padding = 48;
          const canvas = document.createElement("canvas");
          canvas.width = size;
          canvas.height = size;

          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, size, size);

          const width = Number(img.naturalWidth || img.width || 1);
          const height = Number(img.naturalHeight || img.height || 1);
          const maxDraw = size - padding * 2;
          const scale = Math.min(maxDraw / width, maxDraw / height);
          const drawWidth = Math.max(1, Math.round(width * scale));
          const drawHeight = Math.max(1, Math.round(height * scale));
          const x = Math.round((size - drawWidth) / 2);
          const y = Math.round((size - drawHeight) / 2);

          ctx.drawImage(img, x, y, drawWidth, drawHeight);

          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error("تعذر إنشاء أيقونة التطبيق"));
              return;
            }

            const safeName = (file.name || "school-logo.png")
              .replace(/\.[^.]+$/, "")
              .replace(/[^a-zA-Z0-9-_ء-ي]/g, "-");

            const iconFile = new File(
              [blob],
              safeName + "-app-icon-512.png",
              { type: "image/png" }
            );

            resolve(iconFile);
          }, "image/png");
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error("تعذر قراءة الشعار"));
      img.src = reader.result;
    };

    reader.onerror = () => reject(new Error("تعذر قراءة ملف الشعار"));
    reader.readAsDataURL(file);
  });
}


// =========================
// معاينة مباشرة للشعار والأيقونة
// =========================
const logoFileInput = document.getElementById("logoFile");
if (logoFileInput) {
  logoFileInput.addEventListener("change", async () => {
    const file = logoFileInput.files[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    const logoPreview = document.getElementById("logoPreview");
    if (logoPreview) logoPreview.src = localUrl;

    try {
      const iconFile = await createAppIconFromLogo(file);
      const iconPreview = document.getElementById("iconPreview");
      if (iconPreview) iconPreview.src = URL.createObjectURL(iconFile);
    } catch (error) {
      console.warn(error);
    }
  });
}


// =========================
// حفظ البيانات
// =========================
async function saveSchoolSettings() {

  const logoFile =
    document.getElementById("logoFile").files[0];

  let logoUrl = currentSchool.logo_url;
  let iconUrl = currentSchool.app_icon_url || currentSchool.logo_url;

  // رفع شعار المدرسة مرة واحدة، وإنشاء أيقونة التطبيق تلقائيًا منه
  if (logoFile) {

    const uploadedLogo =
      await uploadImage(logoFile, "logos");

    if (uploadedLogo) {
      logoUrl = uploadedLogo;
    }

    try {
      const generatedIconFile = await createAppIconFromLogo(logoFile);
      const uploadedIcon = await uploadImage(generatedIconFile, "icons");

      if (uploadedIcon) {
        iconUrl = uploadedIcon;
      }
    } catch (error) {
      console.warn("تعذر إنشاء أيقونة التطبيق تلقائيًا، سيتم استخدام الشعار نفسه.", error);
      iconUrl = uploadedLogo || logoUrl;
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

  alert("تم حفظ بيانات المدرسة بنجاح، وتم تحديث شعار الصفحة وأيقونة التطبيق تلقائيًا");

  loadSchool();

}



// =========================
// العودة
// =========================
function goBack() {

  window.location.href = "admin.html";

}