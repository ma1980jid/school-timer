(function () {
  "use strict";

  const ADMIN_UID = "1e32db69-d286-49c7-8a56-3e6eb7b02590";
  const LOGIN_PAGE = "system-login.html";

  function authClient() {
    if (window.SYSTEM_ADMIN_SUPABASE_CLIENT) return window.SYSTEM_ADMIN_SUPABASE_CLIENT;
    if (!window.supabase?.createClient || !window.SCHOOL_TIMER_SUPABASE_URL || !window.SCHOOL_TIMER_SUPABASE_ANON_KEY) {
      return null;
    }

    window.SYSTEM_ADMIN_SUPABASE_CLIENT = window.supabase.createClient(
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
    return window.SYSTEM_ADMIN_SUPABASE_CLIENT;
  }

  function loginUrl() {
    const current = location.pathname.split("/").pop() || "system-admin.html";
    return `${LOGIN_PAGE}?return=${encodeURIComponent(current)}`;
  }

  function redirectToLogin() {
    location.replace(loginUrl());
  }

  function showAccessError(message) {
    document.body.classList.remove("auth-pending");
    document.body.innerHTML = `
      <main style="min-height:100vh;display:grid;place-items:center;padding:20px;background:#f4f7fb;font-family:Tahoma,Arial,sans-serif;direction:rtl">
        <section style="width:min(520px,100%);padding:28px;border:1px solid #dce4ec;border-radius:20px;background:#fff;box-shadow:0 18px 40px #0f172a18;text-align:center">
          <h1 style="margin:0 0 12px;color:#0b1f33">تعذر فتح لوحة الإدارة</h1>
          <p style="margin:0 0 18px;color:#667085;line-height:1.8;font-weight:700">${message}</p>
          <a href="${LOGIN_PAGE}" style="display:inline-block;padding:11px 18px;border-radius:12px;background:#087f72;color:#fff;text-decoration:none;font-weight:900">العودة إلى تسجيل الدخول</a>
        </section>
      </main>`;
  }

  function addLogoutButton(client) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "تسجيل الخروج";
    button.setAttribute("aria-label", "تسجيل الخروج من لوحة مدير النظام");
    Object.assign(button.style, {
      position: "fixed",
      zIndex: "9999",
      left: "16px",
      bottom: "16px",
      minHeight: "42px",
      padding: "9px 15px",
      border: "1px solid rgba(255,255,255,.25)",
      borderRadius: "12px",
      background: "#0b1f33",
      color: "#fff",
      fontFamily: "Tahoma,Arial,sans-serif",
      fontWeight: "900",
      cursor: "pointer",
      boxShadow: "0 12px 28px rgba(11,31,51,.24)",
    });
    button.addEventListener("click", async () => {
      button.disabled = true;
      button.textContent = "جارٍ الخروج…";
      await client.auth.signOut();
      location.replace(LOGIN_PAGE);
    });
    document.body.appendChild(button);
  }

  function loadProtectedScripts() {
    const loader = document.currentScript || document.querySelector('script[src*="system-auth.js"]');
    const scripts = String(loader?.dataset.protectedScripts || "")
      .split("|")
      .map((value) => value.trim())
      .filter(Boolean);

    return scripts.reduce(
      (chain, src) =>
        chain.then(
          () =>
            new Promise((resolve, reject) => {
              const script = document.createElement("script");
              script.src = src;
              script.onload = resolve;
              script.onerror = () => reject(new Error(`تعذر تحميل ${src}`));
              document.body.appendChild(script);
            }),
        ),
      Promise.resolve(),
    );
  }

  async function guard() {
    const client = authClient();
    if (!client?.auth) {
      showAccessError("تعذر تجهيز خدمة تسجيل الدخول. تحقق من الاتصال بالإنترنت ثم أعد المحاولة.");
      return;
    }

    try {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      const user = data?.session?.user;

      if (!user) {
        redirectToLogin();
        return;
      }

      if (user.id !== ADMIN_UID) {
        await client.auth.signOut();
        showAccessError("هذا الحساب غير مصرح له بالدخول إلى لوحة مدير النظام.");
        return;
      }

      document.body.classList.remove("auth-pending");
      addLogoutButton(client);
      await loadProtectedScripts();
    } catch (error) {
      console.error(error);
      showAccessError(error?.message || "حدث خطأ أثناء التحقق من صلاحية الدخول.");
    }
  }

  guard();
})();
