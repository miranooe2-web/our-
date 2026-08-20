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
/**
 * Maximum size of one sync payload, in BYTES.
 *
 * Cloudflare KV allows a value of up to 25 MiB (26,214,400 bytes), so this
 * sits just under that hard ceiling and leaves a little headroom. Raise it
 * no further — KV itself will start rejecting the write.
 */
const MAX_PAYLOAD = 24_000_000; // 24 MB — hundreds of photos + voice notes

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
        if (!body) {
          return json('{"ok":false,"error":"empty payload"}', 400);
        }
        // Measure real bytes (not UTF-16 code units) — base64 photos and
        // voice notes are ASCII, but emoji/accents in notes are multi-byte.
        const bytes = new TextEncoder().encode(body).length;
        if (bytes > MAX_PAYLOAD) {
          return json(
            JSON.stringify({
              ok: false,
              error: "payload too large",
              bytes,
              limit: MAX_PAYLOAD,
            }),
            413
          );
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
