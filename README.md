# Ours — a little private app for us 💗

A single-file React app (Vite + Tailwind) served by a Cloudflare Worker
named **our**, with live sync between devices backed by the **OURS_KV**
KV namespace (`/sync` endpoint in `worker.js`).

## How sync stores photos and voice notes

Media is **not** carried inside the sync payload. Each photo and recording
is uploaded once to `/media/<sha256-of-its-bytes>` and the synced JSON
keeps only a short `media:<hash>` reference, so the payload stays a few
kilobytes no matter how much media there is.

Why it works this way — inlining media as base64 made the payload grow
without bound, which meant `413 payload too large` from `/sync`, a blown
localStorage quota on each device, and every photo re-sent on every
15-second poll.

Because a file's name is the hash of its content:

- the same photo added twice is stored once,
- an upload is skipped when the server already has those bytes (`HEAD`),
- media URLs are immutable, so browsers cache them forever.

Limits live at the top of `worker.js`: `MAX_MEDIA` (20 MB per file) and
`MAX_PAYLOAD` (24 MB for the JSON — generous only so older clients that
still inline media can finish migrating). Cloudflare KV caps a single
value at 25 MiB; don't raise either past that.

Migration is automatic and safe: existing inline photos are offloaded on
the next push, and if an endpoint has no `/media` route the app keeps the
media inline instead of storing a reference that resolves to nothing.

## Local development

Requires **Node.js 20.19+** (Node 22 recommended — see `.nvmrc`). Wrangler
is pinned to 4.86.x so installs also work on Cloudflare's Node 20 builders.

```bash
npm install
npm run dev
```

## Deploy

```bash
npm run deploy
```

What `npm run deploy` does:

1. `vite build` → bundles the whole app into `dist/index.html`
2. `node set-kv-id.js` → replaces the KV placeholder in `wrangler.jsonc`
   with the real `OURS_KV` namespace ID (from `KV_NAMESPACE_ID`,
   `CLOUDFLARE_API_TOKEN`, or your local `wrangler login` token — and it
   creates the namespace automatically if it doesn't exist yet)
3. `wrangler deploy` → uploads the Worker + static assets

First deploy only: run `npx wrangler login` once so Wrangler can reach your
Cloudflare account. If the Worker named `our` doesn't exist yet, the
first deploy creates it. Production URL: https://our.miranooe2.workers.dev

### Deploying from Cloudflare's Git integration (Workers Builds)

Cloudflare runs `npm install` + `npm run build` + deploy automatically and
injects `CLOUDFLARE_API_TOKEN` into the build — `set-kv-id.js` picks that up
and resolves the namespace ID, so no manual steps are needed beyond making
sure the token's account contains (or can create) a KV namespace named
`OURS_KV`.
