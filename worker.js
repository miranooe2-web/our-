/**
 * Cloudflare Worker for the "Ours" app.
 *
 * - GET  /sync         → returns the shared app data (stored in KV)
 * - PUT/POST /sync     → replaces the shared app data
 * - GET  /media/<hash> → returns one photo / voice note
 * - HEAD /media/<hash> → "do you already have this?" (skips re-uploads)
 * - PUT  /media/<hash> → stores one photo / voice note
 * - everything else    → serves the built static site from dist/
 *
 * The /sync route is the live-sync endpoint: every device that opens the
 * app on this URL polls it and pushes its changes to it. No third-party
 * services, no bot walls, no URLs to share.
 *
 * ── Why /media exists ─────────────────────────────────────────────────
 * Photos and voice notes used to be inlined into the /sync JSON as base64
 * data-URLs. That made the payload grow without bound: it blew past the
 * size limit (HTTP 413), past the browsers' ~5 MB localStorage quota, and
 * it re-sent every photo on every poll. Now each media file is stored ONCE
 * under the hash of its own bytes, and /sync only carries short
 * "media:<hash>" references. The JSON stays a few kilobytes no matter how
 * many photos there are, and browsers cache the media immutably.
 */
const SYNC_KEY = "sync-payload";

/**
 * Maximum size of one /sync payload, in BYTES.
 *
 * With media offloaded to /media this is now only text (names, letters,
 * notes and hash references), so it should stay in the kilobytes. The
 * generous ceiling is here purely so an older client that still inlines
 * its photos can finish migrating instead of being locked out with a 413.
 * Cloudflare KV caps a single value at 25 MiB — do not raise this past it.
 */
const MAX_PAYLOAD = 24_000_000; // 24 MB

/** KV key prefix for media objects (keeps them clear of SYNC_KEY). */
const MEDIA_PREFIX = "media:";

/** Maximum size of a single photo / voice note, in BYTES. */
const MAX_MEDIA = 20_000_000; // 20 MB, under KV's 25 MiB per-value cap

/** Media is content-addressed, so its URL can be cached forever. */
const MEDIA_CACHE = "public, max-age=31536000, immutable";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, PUT, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

const json = (body, status = 200) =>
  new Response(body, {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    },
  });

const preflight = () => new Response(null, { status: 204, headers: CORS });

/** Only lowercase hex SHA-256 digests are valid media names. */
const isHash = (s) => /^[a-f0-9]{64}$/.test(s);

/** Media must be a picture or a sound — nothing else gets stored. */
const isMediaType = (t) =>
  typeof t === "string" && (t.startsWith("image/") || t.startsWith("audio/") || t.startsWith("video/"));

/** ── /media/<hash> ─────────────────────────────────────────────────── */
async function handleMedia(request, env, hash) {
  if (request.method === "OPTIONS") return preflight();
  if (!isHash(hash)) {
    return json('{"ok":false,"error":"bad media id"}', 400);
  }
  const key = MEDIA_PREFIX + hash;

  if (request.method === "GET" || request.method === "HEAD") {
    const { value, metadata } = await env.OURS_KV.getWithMetadata(key, {
      type: "arrayBuffer",
    });
    if (!value) return json('{"ok":false,"error":"not found"}', 404);
    const headers = {
      "Content-Type": (metadata && metadata.ct) || "application/octet-stream",
      "Content-Length": String(value.byteLength),
      "Cache-Control": MEDIA_CACHE,
      "Access-Control-Allow-Origin": "*",
    };
    // HEAD must not carry a body, but keeps the same headers — that's how
    // the client checks whether an upload can be skipped.
    return new Response(request.method === "HEAD" ? null : value, { status: 200, headers });
  }

  if (request.method === "PUT" || request.method === "POST") {
    const ct = request.headers.get("Content-Type") || "";
    if (!isMediaType(ct)) {
      return json('{"ok":false,"error":"unsupported media type"}', 415);
    }
    const body = await request.arrayBuffer();
    if (body.byteLength === 0) {
      return json('{"ok":false,"error":"empty media"}', 400);
    }
    if (body.byteLength > MAX_MEDIA) {
      return json(
        JSON.stringify({
          ok: false,
          error: "media too large",
          bytes: body.byteLength,
          limit: MAX_MEDIA,
        }),
        413
      );
    }
    // Content-addressed: the same bytes always land on the same key, so a
    // re-upload is harmless and duplicate photos cost storage only once.
    await env.OURS_KV.put(key, body, { metadata: { ct } });
    return json(JSON.stringify({ ok: true, id: hash, bytes: body.byteLength }), 201);
  }

  return json('{"ok":false,"error":"method not allowed"}', 405);
}

/** ── /sync ─────────────────────────────────────────────────────────── */
async function handleSync(request, env) {
  if (request.method === "OPTIONS") return preflight();

  if (request.method === "GET") {
    const val = await env.OURS_KV.get(SYNC_KEY);
    return json(val ?? "{}");
  }

  if (request.method === "PUT" || request.method === "POST") {
    const body = await request.text();
    if (!body) {
      return json('{"ok":false,"error":"empty payload"}', 400);
    }
    // Measure real bytes (not UTF-16 code units) — hash references are
    // ASCII, but emoji and accents in the letters are multi-byte.
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const needsKv = url.pathname === "/sync" || url.pathname.startsWith("/media/");
    if (needsKv && !env.OURS_KV) {
      return json('{"ok":false,"error":"KV namespace not configured"}', 503);
    }

    if (url.pathname === "/sync") return handleSync(request, env);

    if (url.pathname.startsWith("/media/")) {
      return handleMedia(request, env, url.pathname.slice("/media/".length));
    }

    // ── Everything else: serve the built app ───────────────
    return env.ASSETS.fetch(request);
  },
};
