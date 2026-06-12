const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const params = new URLSearchParams(window.location.search);
const schoolSlug = params.get("school") || DEFAULT_SCHOOL_SLUG;

let currentSchool = null;
let allSchedules = [];

async function loadAdmin() {
  const { data: school, error: schoolError } = await supabaseClient
    .from("schools")
    .select("*")
    .eq("school_slug", schoolSlug)
    .eq("is_active", true)
    .single();

  if (schoolError || !school) {
    showAdminStatus("لم يتم العثور على المدرسة.", true);
    return;
  }

  currentSchool = school;
  document.getElementById("adminSchoolName").textContent = school.school_name;

  const { data: schedulesData, error: schedulesError } = await supabaseClient
    .from("schedules")
    .select("*")
    .order("id", { ascending: true });

  if (schedulesError || !schedulesData) {
    showAdminStatus("تعذر تحميل جدول schedules.", true);
    return;
  }

  allSchedules = schedulesData;

  const { data: schoolSchedules, error: schoolSchedulesError } = await supabaseClient
    .from("school_schedules")
    .select("*")
    .eq("school_id", school.id)
    .order("id", { ascending: true });

  if (schoolSchedulesError || !schoolSchedules) {
    showAdminStatus("تعذر تحميل التوقيتات.", true);
    return;
  }

  renderSchedules(schoolSchedules);
}

function renderSchedules(rows) {
  const container = document.getElementById("adminSchedules");
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
    showAdminStatus("تعذر تفعيل التوقيت.", true);
    return;
  }

  showAdminStatus("تم تفعيل التوقيت بنجاح.", false);
  loadAdmin();
}

function showAdminStatus(message, isError = false) {
  const box = document.getElementById("adminStatus");
  box.classList.remove("hidden", "danger");
  if (isError) box.classList.add("danger");
  box.textContent = message;
}

loadAdmin();
