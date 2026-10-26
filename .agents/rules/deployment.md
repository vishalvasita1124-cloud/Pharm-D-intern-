# Deployment Rule

After every code change or update, **always deploy to all three platforms**:

1. **GitHub** — `git add -A && git commit -m "<message>" && git push origin main`
2. **Cloudflare Workers** — `npm run build`, then remove `dist/_redirects` if it exists, then `npx wrangler deploy`
3. **Supabase** — Run any new migration SQL files via Supabase dashboard or CLI

## Important Notes
- The production URL is: https://pharm-d-intern.vishalvasita1124.workers.dev
- Cloudflare Pages preview URLs are at: *.pharm-d-intern.pages.dev
- The `_redirects` file in `public/` causes infinite loop errors with Cloudflare Workers — always remove it from `dist/` before `wrangler deploy`
- The `wrangler.json` has `"not_found_handling": "single-page-application"` which handles SPA routing, so `_redirects` is not needed
- Always do a fresh `npm run build` before deploying to ensure the latest code is in `dist/`
