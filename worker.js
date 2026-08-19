/**
 * Minimal Cloudflare Worker entry point.
 * It serves the built static site (the `dist` folder) via the ASSETS
 * binding configured in wrangler.jsonc.
 */
export default {
  fetch(request, env) {
    return env.ASSETS.fetch(request);
  },
};
