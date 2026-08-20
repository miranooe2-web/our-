import type { CoupleData } from "../types";
import type { SyncPayload } from "./media";
import { offloadMedia } from "./mediaStore";

/**
 * Live sync.
 *
 * Preferred: this app's own Cloudflare Worker at `<origin>/sync`, which
 * also serves `<origin>/media/<hash>` for photos and voice notes.
 *
 * Also supported: jsonblob.com — a free JSON store that needs no account.
 *
 * - POST /api/jsonBlob        → creates a blob, returns its URL in `Location`
 * - GET  /api/jsonBlob/{id}   → reads the current payload
 * - PUT  /api/jsonBlob/{id}   → replaces the payload
 *
 * CORS is open (`access-control-allow-origin: *`, Location is exposed),
 * so the app can create, read and write the endpoint directly from the
 * browser. The endpoint stores { v, at, data } — `at` is the revision
 * stamp; newest always wins.
 *
 * Media never travels inside this payload: `pushRemote` offloads every
 * photo and recording to the media store first and sends only short
 * `media:<hash>` references, so the JSON stays small forever.
 */

const BASE = "https://jsonblob.com/api/jsonBlob";

/** Bytes → megabytes, one decimal, for human-readable error messages. */
const mb = (bytes: number) => (bytes / 1_000_000).toFixed(1);

export type RemoteState = "off" | "working" | "live" | "error";

export interface RemoteStatus {
  state: RemoteState;
  message: string | null;
  /** ISO time of the last successful check / push. */
  lastSync: string | null;
}

/**
 * Creates the shared endpoint and returns its URL.
 *
 * Note: jsonblob has no media store, so this path still inlines photos.
 * The app's own Worker endpoint is the recommended one.
 */
export async function createRemoteEndpoint(data: CoupleData): Promise<string> {
  const payload = { v: 1, at: new Date().toISOString(), data };
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("The service is busy (code " + res.status + "). Try again.");
  const loc = res.headers.get("Location");
  if (!loc) throw new Error("The service didn't return an endpoint URL. Try again.");
  return loc;
}

/** Reads the endpoint. Returns null if it's empty (shouldn't happen). */
export async function fetchRemote(endpoint: string): Promise<SyncPayload | null> {
  const res = await fetch(endpoint, { headers: { Accept: "application/json" } });
  if (res.status === 404)
    throw new Error("Endpoint not found (404) — it was likely deleted. Tap Disconnect, then create a new one.");
  if (res.status === 403)
    throw new Error("The sync service blocked the request (403) — usually temporary. Wait a couple of minutes and retry.");
  if (!res.ok) throw new Error("Endpoint error (code " + res.status + ").");
  const obj = (await res.json()) as Record<string, unknown>;
  if (obj && obj.data && typeof obj.at === "string") {
    return { data: obj.data as unknown as CoupleData, at: obj.at };
  }
  if (obj && obj.startDate !== undefined) {
    return { data: obj as unknown as CoupleData, at: new Date().toISOString() };
  }
  return null;
}

/**
 * Writes the whole data set to the endpoint.
 *
 * Photos and voice notes are uploaded to the media store first and swapped
 * for `media:<hash>` references, so the JSON that goes over the wire is a
 * few kilobytes of text no matter how much media exists.
 *
 * Returns the offloaded copy of the data — the caller should keep it, so
 * the local device also stops carrying the heavy base64 around.
 */
export async function pushRemote(endpoint: string, data: CoupleData): Promise<CoupleData> {
  const lean = await offloadMedia(data, endpoint);
  const payload = { v: 1, at: lean.updatedAt, data: lean };
  const res = await fetch(endpoint, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    if (res.status === 413) {
      // The Worker reports the actual size + limit so the message is concrete.
      let detail = "";
      try {
        const info = (await res.json()) as { bytes?: number; limit?: number };
        if (typeof info.bytes === "number" && typeof info.limit === "number") {
          detail = ` (${mb(info.bytes)} MB of a ${mb(info.limit)} MB limit)`;
        }
      } catch {
        /* no JSON body — keep the generic message */
      }
      throw new Error(
        "Data too large to sync (413)" +
          detail +
          " — photos and voice notes have grown past the limit. Remove some media, or raise MAX_PAYLOAD in worker.js and redeploy."
      );
    }
    throw new Error("Push failed (code " + res.status + ").");
  }
  return lean;
}
