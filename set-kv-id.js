/**
 * Build-time helper — runs right after the Vite build, before
 * `wrangler deploy` (wired in as part of `npm run build`). It injects the
 * real KV namespace ID into wrangler.jsonc automatically, so the repo
 * never needs the ID typed in by hand and a deploy can't go out with the
 * placeholder ID.
 *
 * Source of the ID, in order:
 *   1. KV_NAMESPACE_ID environment variable (if set in the dashboard/CI),
 *   2. a Cloudflare token — either the CLOUDFLARE_API_TOKEN that Cloudflare
 *      injects into its CI builds, or the OAuth token saved locally by
 *      `wrangler login` — finds the namespace named OURS_KV in your account,
 *      creating it automatically if it doesn't exist yet.
 *
 * Plain local builds (no Cloudflare environment at all) are skipped
 * gracefully so `npm run build` always works offline.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function fail(msg) {
  console.error("set-kv-id: " + msg);
  process.exit(1);
}
function info(msg) {
  console.log("set-kv-id: " + msg);
}

const NAMESPACE_NAME = "OURS_KV";
const PLACEHOLDER = "PASTE_YOUR_KV_NAMESPACE_ID_HERE";
const cfgPath = "wrangler.jsonc";

const cfg = fs.readFileSync(cfgPath, "utf8");
if (!cfg.includes(PLACEHOLDER)) {
  info("wrangler.jsonc already has a real KV namespace ID — nothing to do.");
  process.exit(0);
}

/** Reads the OAuth token that `wrangler login` stores locally. */
function readLocalWranglerToken() {
  const candidates = [
    path.join(os.homedir(), ".wrangler", "config", "default.toml"),
    path.join(os.homedir(), ".config", ".wrangler", "config", "default.toml"),
  ];
  for (const file of candidates) {
    try {
      const text = fs.readFileSync(file, "utf8");
      const m = text.match(/^oauth_token\s*=\s*"([^"]+)"/m);
      if (m?.[1]) return m[1];
    } catch {
      /* file doesn't exist — keep looking */
    }
  }
  return "";
}

async function callApi(token, url, options = {}) {
  const r = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    fail(`Cloudflare API error ${r.status}: ${j.errors?.[0]?.message || r.statusText}`);
  }
  return j;
}

/** Finds OURS_KV in the account, creating it if it doesn't exist yet. */
async function findOrCreateNamespace(token) {
  const accts = await callApi(token, "https://api.cloudflare.com/client/v4/accounts");
  const acct = accts.result?.[0];
  if (!acct) fail("The Cloudflare token could not see any account.");
  const listUrl = `https://api.cloudflare.com/client/v4/accounts/${acct.id}/storage/kv/namespaces`;
  const existing = await callApi(token, listUrl);
  const ours = (existing.result || []).find((n) => n.name === NAMESPACE_NAME || n.title === NAMESPACE_NAME);
  if (ours) return ours.id;

  info(`No KV namespace named ${NAMESPACE_NAME} yet — creating it now.`);
  try {
    const created = await callApi(token, listUrl, {
      method: "POST",
      body: JSON.stringify({ name: NAMESPACE_NAME }),
    });
    return created.result.id;
  } catch {
    fail(
      `The token could not create the ${NAMESPACE_NAME} KV namespace (may lack permissions).\n` +
        `Create it manually: Cloudflare dashboard → Storage & Databases → Key-Value → Create namespace → name it exactly ${NAMESPACE_NAME}.`
    );
  }
}

let id = (process.env.KV_NAMESPACE_ID || "").trim();
let token = (process.env.CLOUDFLARE_API_TOKEN || "").trim();
const isCi = Boolean(process.env.CF_BUILD || process.env.CF_PAGES || token);

if (!id) {
  if (!token) token = readLocalWranglerToken();
  if (!token) {
    if (isCi) {
      fail(
        "No KV_NAMESPACE_ID env var and no Cloudflare token in this build.\n" +
          "Set KV_NAMESPACE_ID in the project's Environment variables (value = your OURS_KV Namespace ID)."
      );
    }
    info("skipping (local build, no Cloudflare environment).");
    process.exit(0);
  }
  id = await findOrCreateNamespace(token);
}

if (!/^[a-f0-9]{32}$/i.test(id)) {
  fail(`"${id}" doesn't look like a valid KV namespace ID (expected 32 hex characters).`);
}

// Replace only the "id" value inside the OURS_KV binding (never comments).
const bindingRe = new RegExp(
  `("binding"\\s*:\\s*"${NAMESPACE_NAME}"[^}]*"id"\\s*:\\s*")[^"]*(")`
);
const updated = cfg.replace(bindingRe, `$1${id}$2`);
if (updated === cfg) {
  fail(`Could not find the ${NAMESPACE_NAME} KV binding in wrangler.jsonc to patch.`);
}
fs.writeFileSync(cfgPath, updated);
info(`OK — wrangler.jsonc now uses KV namespace ID ${id.slice(0, 6)}…`);
