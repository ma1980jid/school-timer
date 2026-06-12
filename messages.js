const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const params = new URLSearchParams(window.location.search);
const schoolSlug = params.get("school") || DEFAULT_SCHOOL_SLUG;

let currentSchool = null;

async function loadPage() {
  const { data: school, error } = await supabaseClient
    .from("schools")
    .select("*")
    .eq("school_slug", schoolSlug)
    .eq("is_active", true)
    .single();

  if (error || !school) {
    showStatus("لم يتم العثور على المدرسة.", true);
    return;
  }

  currentSchool = school;
  document.getElementById("schoolName").textContent = school.school_name;

  loadMessages();
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
  const list = document.getElementById("messagesList");
  list.innerHTML = "";

  messages.forEach(msg => {
    const div = document.createElement("div");
    div.className = msg.is_active ? "item active" : "item";

    div.innerHTML = `
      <span class="icon">${msg.is_active ? "✅" : "○"}</span>
      <span class="name">${msg.message_text}</span>
      <span class="time">${msg.message_type || "عام"}</span>
      <span class="status">
        <button onclick="toggleMessage(${msg.id}, ${msg.is_active})">
          ${msg.is_active ? "تعطيل" : "تفعيل"}
        </button>
        <button onclick="deleteMessage(${msg.id})">حذف</button>
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

function showStatus(message, isError = false) {
  const box = document.getElementById("statusBox");
  box.classList.remove("hidden", "danger");
  if (isError) box.classList.add("danger");
  box.textContent = message;
}

loadPage();
