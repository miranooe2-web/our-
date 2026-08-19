/**
 * Build-time helper — runs right after the Vite build, before
 * `wrangler deploy`. It injects the real KV namespace ID into
 * wrangler.jsonc automatically, so the repo never needs the ID
 * typed in by hand.
 *
 * Source of the ID, in order:
 *   1. KV_NAMESPACE_ID environment variable (if set in the dashboard),
 *   2. the Cloudflare API using the token Cloudflare injects into CI —
 *      finds the namespace named OURS_KV in your account automatically.
 *
 * Local builds (no Cloudflare env) are skipped gracefully.
 */
import fs from "node:fs";

function fail(msg) {
  console.error("set-kv-id: " + msg);
  process.exit(1);
}

let id = (process.env.KV_NAMESPACE_ID || "").trim();

const isCi = Boolean(process.env.CLOUDFLARE_API_TOKEN || process.env.CF_BUILD);

if (!id && !isCi) {
  console.log("set-kv-id: skipping (local build, no Cloudflare environment).");
  process.exit(0);
}

if (!id) {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) {
    fail(
      "No KV_NAMESPACE_ID env var and no CLOUDFLARE_API_TOKEN in this build.\n" +
        "Set KV_NAMESPACE_ID in the project's Environment variables (value = your OURS_KV Namespace ID)."
    );
  }
  const H = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const get = async (url) => {
    const r = await fetch(url, { headers: H });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) fail(`Cloudflare API error ${r.status}: ${j.errors?.[0]?.message || r.statusText}`);
    return j;
  };
  const accts = await get("https://api.cloudflare.com/client/v4/accounts");
  const acct = accts.result?.[0];
  if (!acct) fail("The build token could not see any account.");
  const ns = await get(
    `https://api.cloudflare.com/client/v4/accounts/${acct.id}/storage/kv/namespaces`
  );
  const all = ns.result || [];
  const ours = all.find((n) => n.name === "OURS_KV");
  if (!ours)
    fail(
      "No KV namespace named OURS_KV was found (names in account: " +
        (all.map((n) => n.name).join(", ") || "none") +
        "). Create it: Storage & Databases → Key-Value → Create namespace → name it exactly OURS_KV."
    );
  id = ours.id;
}

const cfgPath = "wrangler.jsonc";
const cfg = fs.readFileSync(cfgPath, "utf8");
const updated = cfg.replace(/("id"\s*:\s*")[^"]*(")/, `$1${id}$2`);
fs.writeFileSync(cfgPath, updated);
console.log(`set-kv-id: OK — wrangler.jsonc now uses KV namespace ID ${id.slice(0, 6)}…`);
