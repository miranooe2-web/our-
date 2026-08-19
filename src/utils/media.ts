import type { CoupleData } from "../types";

/** Short unique id for memories / voice notes / emotions. */
export function uid(): string {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

/**
 * Reads an image file, downscales it (max edge `maxDim` px) and returns a
 * JPEG data-URL. Keeps localStorage usage small so photos can be synced.
 */
export function fileToResizedDataUrl(
  file: File,
  maxDim = 760,
  quality = 0.72
): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Canvas unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image"));
    };
    img.src = url;
  });
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/* ---------------- Sync payload (URL-safe base64) ---------------- */

const b64Encode = (s: string) =>
  btoa(unescape(encodeURIComponent(s)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const b64Decode = (s: string) =>
  decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/"))));

export interface SyncPayload {
  data: CoupleData;
  at: string;
}

export function encodeSync(data: CoupleData): string {
  const at = new Date().toISOString();
  return b64Encode(JSON.stringify({ v: 1, at, data }));
}

/** Accepts a full URL with `#sync=…`, a bare code, or raw JSON. */
export function decodeSync(input: string): SyncPayload | null {
  let raw = input.trim();
  const i = raw.indexOf("#sync=");
  if (i >= 0) raw = raw.slice(i + 6);
  if (!raw) return null;
  // Fallback: someone pasted a plain JSON backup.
  if (raw.startsWith("{")) {
    try {
      const obj = JSON.parse(raw);
      if (obj && obj.data && typeof obj.at === "string") {
        return { data: obj.data as CoupleData, at: obj.at };
      }
      if (obj && obj.startDate !== undefined) {
        return { data: obj as CoupleData, at: new Date().toISOString() };
      }
    } catch {
      return null;
    }
    return null;
  }
  try {
    const obj = JSON.parse(b64Decode(raw));
    if (obj && obj.data && typeof obj.at === "string") {
      return { data: obj.data as CoupleData, at: obj.at };
    }
  } catch {
    return null;
  }
  return null;
}

export function buildSyncLink(data: CoupleData): string {
  return window.location.origin + window.location.pathname + "#sync=" + encodeSync(data);
}

/** Downloads the whole data set as a .json backup file. */
export function downloadBackup(data: CoupleData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ours-backup.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
