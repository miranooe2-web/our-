/**
 * Cloudflare Worker for the "Ours" app.
 *
 * - GET  /sync  → returns the shared app data (stored in KV)
 * - PUT/POST /sync → replaces the shared app data
 * - OPTIONS /sync → CORS preflight
 * - everything else → serves the built static site from dist/
 *
 * The /sync route is the live-sync endpoint: every device that opens the
 * app on this URL polls it and pushes its changes to it. No third-party
 * services, no bot walls, no URLs to share.
 */
const SYNC_KEY = "sync-payload";
const MAX_PAYLOAD = 2_000_000; // 2 MB — plenty for photos + voice notes

const json = (body, status = 200) =>
  new Response(body, {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    },
  });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ── Live-sync endpoint ─────────────────────────────────
    if (url.pathname === "/sync") {
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Max-Age": "86400",
          },
        });
      }
      if (!env.OURS_KV) {
        return json('{"ok":false,"error":"KV namespace not configured"}', 503);
      }
      if (request.method === "GET") {
        const val = await env.OURS_KV.get(SYNC_KEY);
        return json(val ?? "{}");
      }
      if (request.method === "PUT" || request.method === "POST") {
        const body = await request.text();
        if (!body || body.length > MAX_PAYLOAD) {
          return json('{"ok":false,"error":"payload too large"}', 413);
        }
        await env.OURS_KV.put(SYNC_KEY, body);
        return json('{"ok":true}');
      }
      return json('{"ok":false,"error":"method not allowed"}', 405);
    }

    // ── Everything else: serve the built app ───────────────
    return env.ASSETS.fetch(request);
  },
};
