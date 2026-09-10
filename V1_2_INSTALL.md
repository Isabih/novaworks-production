# NOVAWORKS V1.2 install/update

1. Back up the production code and MySQL database.
2. Install dependencies from the project root with `corepack pnpm install --frozen-lockfile`.
3. Apply `mysql/migrations/2026-09-10-v1-2.sql` once after V1.1 is already present.
4. Run `corepack pnpm build` and resolve any environment-specific errors before deployment.
5. Restart the existing NOVAWORKS application service/container.
6. Sign in as IT/Admin and open **Popup Advertising** to choose properties, positions, timing, image/video overrides and preview the popup.
7. Verify homepage hero, property browsing/details, guided tour, subscriber email and popup behavior on desktop/mobile.
