# MySQL Browser Leak — Final Fix

Root cause confirmed by Chrome:
`mysql2_promise.js` was being executed in the browser during TanStack hydration.

This build changes `src/lib/mysql.server.ts` so the actual mysql2 module is loaded lazily inside async server execution instead of at module import time. That makes the entire codebase resilient even when TanStack/Vite touches server-function or API route modules while building the client route graph.

Also fixed two route-tree-wide imports (`/api/chat` and Flutterwave webhook) and reused the already-working `/api/public/property-categories` endpoint for homepage data via `?bundle=home`.

After replacing the project:

```bash
rm -rf node_modules/.vite .tanstack .output dist
npm install
npm run dev
```

Hard reload Chrome with Cmd+Shift+R.

Tests:

```bash
curl -sS 'http://localhost:8080/api/public/property-categories?bundle=home' | python3 -m json.tool | head -80
curl -sS 'http://localhost:8080/api/public/property-categories' | python3 -m json.tool
```
