/**
 * Build-time helper — runs on Cloudflare CI *before* `wrangler deploy`.
 *
 * Reads the KV_NAMESPACE_ID environment variable (set in:
 *   Cloudflare dashboard → your project → Settings → Environment variables
 * ) and writes it into wrangler.jsonc automatically.
 *
 * This means the repo never needs the namespace ID typed in by hand —
 * the value lives in one plain dashboard text field instead.
 */
import fs from "node:fs";

const id = (process.env.KV_NAMESPACE_ID || "").trim();

if (!id) {
  console.error(
    "set-kv-id: KV_NAMESPACE_ID is missing.\n" +
      "Fix: Cloudflare dashboard → your project → Settings → Environment variables\n" +
      "→ Add: name = KV_NAMESPACE_ID, value = your OURS_KV Namespace ID.\n" +
      "Then re-run the build."
  );
  process.exit(1);
}

const cfgPath = "wrangler.jsonc";
let cfg = fs.readFileSync(cfgPath, "utf8");

// Replace whatever sits on the "id" line (placeholder or old ID).
cfg = cfg.replace(/("id"\s*:\s*")[^"]*(")/, `$1${id}$2`);
fs.writeFileSync(cfgPath, cfg);

console.log(`set-kv-id: OK — wrangler.jsonc now uses KV namespace ID ${id.slice(0, 6)}…`);
