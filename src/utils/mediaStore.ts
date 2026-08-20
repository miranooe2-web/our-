import type { CoupleData, Memory, VoiceNote } from "../types";

/**
 * Content-addressed media store.
 *
 * Photos and voice notes used to travel inside the /sync JSON as base64
 * data-URLs. The payload grew without bound — 413s from the endpoint, a
 * blown localStorage quota, and every photo re-sent on every poll.
 *
 * Now each file is uploaded ONCE to `/media/<sha256-of-its-bytes>` and the
 * data keeps only a short reference:
 *
 *     "media:6f4e…c1"   (69 characters, regardless of the file size)
 *
 * Because the name IS the hash of the content:
 *  - the same photo added twice is stored once,
 *  - an upload can be skipped when the server already has those bytes,
 *  - the URL can be cached by the browser forever (immutable).
 *
 * Everything degrades gracefully: if a reference can't be uploaded or
 * fetched, the original data-URL is kept/returned so nothing is ever lost.
 */

const REF_PREFIX = "media:";

/** True for a "media:<hash>" reference produced by this module. */
export function isMediaRef(v: string | null | undefined): v is string {
  return typeof v === "string" && v.startsWith(REF_PREFIX) && /^[a-f0-9]{64}$/.test(v.slice(REF_PREFIX.length));
}

/** True for an inline base64 payload (the old, heavy format). */
export function isDataUrl(v: string | null | undefined): v is string {
  return typeof v === "string" && v.startsWith("data:");
}

/** True for a picture / sound content-type — anything else isn't media. */
function isMediaType(t: string | null): boolean {
  return !!t && (t.startsWith("image/") || t.startsWith("audio/") || t.startsWith("video/"));
}

/**
 * Derives the media base URL from the configured sync endpoint.
 * `https://host/sync` → `https://host/media`
 */
export function mediaBase(endpoint: string | null | undefined): string | null {
  if (!endpoint) return null;
  try {
    const u = new URL(endpoint, window.location.href);
    if (!u.pathname.endsWith("/sync")) return null; // e.g. a jsonblob URL — no media host
    u.pathname = u.pathname.slice(0, -"/sync".length) + "/media";
    u.search = "";
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}

/** Absolute URL a reference resolves to, or null when unavailable. */
export function refToUrl(ref: string, endpoint: string | null | undefined): string | null {
  const base = mediaBase(endpoint);
  if (!base || !isMediaRef(ref)) return null;
  return base + "/" + ref.slice(REF_PREFIX.length);
}

/**
 * What a component should put in `src`: a media reference becomes a URL,
 * an inline data-URL is passed straight through, anything else is null.
 */
export function resolveMedia(
  value: string | null | undefined,
  endpoint: string | null | undefined
): string | null {
  if (!value) return null;
  if (isMediaRef(value)) return refToUrl(value, endpoint);
  return value; // data-URL or a plain http(s) URL
}

/* ---------------- data-URL ⇄ bytes ---------------- */

interface Decoded {
  bytes: Uint8Array;
  type: string;
}

/** Splits a data-URL into its raw bytes and MIME type. */
export function decodeDataUrl(dataUrl: string): Decoded | null {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return null;
  const header = dataUrl.slice(5, comma); // strip "data:"
  const isB64 = header.endsWith(";base64");
  const type = (isB64 ? header.slice(0, -";base64".length) : header) || "application/octet-stream";
  const payload = dataUrl.slice(comma + 1);
  try {
    if (!isB64) {
      return { bytes: new TextEncoder().encode(decodeURIComponent(payload)), type };
    }
    const bin = atob(payload);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return { bytes, type };
  } catch {
    return null;
  }
}

/** SHA-256 of the bytes, lowercase hex — the media's permanent name. */
async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ---------------- upload ---------------- */

/** Hashes already confirmed present on the server this session. */
const uploaded = new Set<string>();

/**
 * Uploads one data-URL and returns its "media:<hash>" reference.
 * Returns the original data-URL unchanged if the upload isn't possible,
 * so a failure degrades to the old behaviour instead of losing the photo.
 */
export async function uploadDataUrl(
  dataUrl: string,
  endpoint: string | null | undefined
): Promise<string> {
  const base = mediaBase(endpoint);
  if (!base) return dataUrl;
  const decoded = decodeDataUrl(dataUrl);
  if (!decoded) return dataUrl;

  const hash = await sha256Hex(decoded.bytes);
  const ref = REF_PREFIX + hash;
  if (uploaded.has(hash)) return ref;

  const url = base + "/" + hash;

  // Already on the server? Then this is a duplicate — skip the bytes.
  //
  // The content-type guard matters: an endpoint WITHOUT the /media route
  // (an older deployment of the Worker) falls through to the static-asset
  // handler and can answer 200 with index.html. Trusting that would store
  // a reference to media that was never saved — i.e. lose the photo. Only
  // a real image/audio response counts as "already there".
  try {
    const head = await fetch(url, { method: "HEAD" });
    if (head.ok && isMediaType(head.headers.get("Content-Type"))) {
      uploaded.add(hash);
      return ref;
    }
  } catch {
    /* offline or blocked — fall through and try the upload */
  }

  const body = new Blob([decoded.bytes as unknown as BlobPart], { type: decoded.type });
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": decoded.type },
    body,
  });
  if (res.status === 413) {
    throw new Error(
      "That file is too large to sync — try a shorter recording or a smaller photo."
    );
  }
  // Same guard on the way in: only a genuine {"ok":true} from the media
  // route proves the bytes were stored. Anything else (404/405, or an HTML
  // page from an endpoint that has no media store) means we must keep the
  // photo inline rather than swap in a reference that resolves to nothing.
  if (!res.ok || !(await storedOk(res))) {
    return dataUrl;
  }
  uploaded.add(hash);
  return ref;
}

/** True when the media route confirmed the write with {"ok":true}. */
async function storedOk(res: Response): Promise<boolean> {
  if (!(res.headers.get("Content-Type") || "").includes("application/json")) return false;
  try {
    const body = (await res.json()) as { ok?: boolean };
    return body.ok === true;
  } catch {
    return false;
  }
}

/* ---------------- whole-payload offloading ---------------- */

/**
 * Replaces every inline data-URL in the data set with a media reference,
 * uploading anything the server doesn't have yet.
 *
 * Runs before each push. Already-referenced media costs nothing, so this
 * is cheap to call repeatedly; only genuinely new files are sent.
 */
export async function offloadMedia(
  data: CoupleData,
  endpoint: string | null | undefined
): Promise<CoupleData> {
  if (!mediaBase(endpoint)) return data;

  const put = async (v: string | null): Promise<string | null> =>
    isDataUrl(v) ? await uploadDataUrl(v, endpoint) : v;

  const [heroImage, memories, voiceNotes] = await Promise.all([
    put(data.heroImage),
    Promise.all(
      data.memories.map(async (m): Promise<Memory> => ({ ...m, image: await put(m.image) }))
    ),
    Promise.all(
      data.voiceNotes.map(async (n): Promise<VoiceNote> => ({
        ...n,
        audio: (await put(n.audio)) ?? n.audio,
      }))
    ),
  ]);

  return { ...data, heroImage, memories, voiceNotes };
}

/**
 * Rough size of the JSON that would be pushed, in bytes. Used by the admin
 * panel to show how much lighter the payload is now that media is external.
 */
export function payloadBytes(data: CoupleData): number {
  return new TextEncoder().encode(JSON.stringify(data)).length;
}

/** Counts media still inlined as base64 (i.e. not yet offloaded). */
export function inlineMediaCount(data: CoupleData): number {
  let n = isDataUrl(data.heroImage) ? 1 : 0;
  for (const m of data.memories) if (isDataUrl(m.image)) n++;
  for (const v of data.voiceNotes) if (isDataUrl(v.audio)) n++;
  return n;
}
