# Ours — a little private app for us 💗

A single-file React app (Vite + Tailwind) served by a Cloudflare Worker
named **our**, with live sync between devices backed by the **OURS_KV**
KV namespace (`/sync` endpoint in `worker.js`).

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
