const SUPABASE_URL = 'https://geuxjndwuqhmwnmnfczj.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdldXhqbmR3dXFobXdubW5mY3pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4MzUwMjYsImV4cCI6MjEwNTQxMTAyNn0.3k_KH2bPIcVpOSyWB71rFWxKHDsI-K8wccgWXzsUAy0';

async function pingSupabase() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/categories?select=id&limit=1`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  } catch (err) {
    return { ok: false, status: 500, text: err?.message || String(err) };
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Live endpoint so you can test Supabase connectivity directly in your browser anytime:
    // https://pharm-d-intern.vishalvasita1124.workers.dev/api/ping-supabase
    if (url.pathname === '/api/ping-supabase' || url.pathname === '/api/health') {
      const pingResult = await pingSupabase();
      return new Response(
        JSON.stringify(
          {
            service: 'Pharm-D-Intern Worker',
            status: 'online',
            cronSchedule: 'Every day at 00:00 UTC',
            supabasePing: pingResult,
            timestamp: new Date().toISOString(),
          },
          null,
          2
        ),
        {
          headers: {
            'content-type': 'application/json; charset=utf-8',
          },
        }
      );
    }

    // Serve static frontend assets and SPA routes
    return env.ASSETS.fetch(request);
  },

  // Native Cloudflare Worker Cron Trigger: runs automatically in the background
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      (async () => {
        console.log(`[Supabase Cron Keep-Alive] Scheduled run at ${new Date().toISOString()}`);
        const result = await pingSupabase();
        console.log(`[Supabase Cron Keep-Alive] Result: status ${result.status}, ok: ${result.ok}`);
      })()
    );
  },
};
