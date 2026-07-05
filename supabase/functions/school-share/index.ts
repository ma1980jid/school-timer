import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TIMER_BASE = 'https://ma1980jid.github.io/school-timer/';
const FALLBACK_IMAGE = `${TIMER_BASE}icons/pwa-512.png`;

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function validHttpsImage(value: unknown): string {
  try {
    const url = new URL(String(value ?? ''));
    return url.protocol === 'https:' ? url.href : FALLBACK_IMAGE;
  } catch {
    return FALLBACK_IMAGE;
  }
}

Deno.serve(async (request) => {
  const requestUrl = new URL(request.url);
  const slug = String(requestUrl.searchParams.get('school') ?? '').trim().toLowerCase();
  const safeSlug = /^[a-z0-9-]+$/.test(slug) ? slug : '';
  const timerUrl = `${TIMER_BASE}index.html?school=${encodeURIComponent(safeSlug)}&view=mobile&v=no-default-logo-01`;

  let schoolName = 'مؤقت الحصص';
  let imageUrl = FALLBACK_IMAGE;

  if (safeSlug) {
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '';
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
      const { data } = await supabase
        .from('schools')
        .select('school_name,logo_url')
        .eq('school_slug', safeSlug)
        .maybeSingle();
      if (data?.school_name) schoolName = String(data.school_name).trim();
      imageUrl = validHttpsImage(data?.logo_url);
    } catch {
      imageUrl = FALLBACK_IMAGE;
    }
  }

  const title = escapeHtml(schoolName);
  const target = escapeHtml(timerUrl);
  const image = escapeHtml(imageUrl);
  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
  <meta property="og:type" content="website">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="مؤقت الحصص">
  <meta property="og:image" content="${image}">
  <meta property="og:url" content="${target}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="مؤقت الحصص">
  <meta name="twitter:image" content="${image}">
  <meta http-equiv="refresh" content="0;url=${target}">
  <script>location.replace(${JSON.stringify(timerUrl)});</script>
</head>
<body><a href="${target}">فتح مؤقت الحصص</a></body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=300'
    }
  });
});
