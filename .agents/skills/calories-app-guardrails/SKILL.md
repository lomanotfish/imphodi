---
name: calories-app-guardrails
description: Use when changing MongoDB, server actions, calorie tracking, theme behavior, or security in this calories app.
---

# Calories app guardrails

Read the relevant Next.js 16 documentation under `node_modules/next/dist/docs/` before changing Next.js behavior. Keep Server and Client Component boundaries explicit; server actions are the authority for sensitive input and ownership.

## Data and ownership

- Keep all persistence behind the `DataStore` boundary. Domain or UI code must not call MongoDB or the filesystem directly.
- For food entries, derive the owner from `getSessionKey()` on the server. Never accept a user or owner key from client input.
- Persist the food name and nutrition values as immutable snapshots with each entry; later catalog changes must not rewrite history.
- Use Bangkok-local `YYYY-MM-DD` keys for food-log dates.

## Theme and progress changes

- A theme change is a coordinated change: keep `src/lib/theme.ts`, `src/app/globals.css`, and the SSR `data-theme` in `src/app/layout.tsx` aligned with saved-theme and cookie behavior. Update or run the theme and contrast tests.
- The calorie ring is based on its `budget`, independently of whether the calculation result is `revealed`; retain clamping for displayed progress.

## Secrets and verification

- Keep `.env.local` and `data/` ignored. Tracked environment templates contain placeholders only—never credentials, connection strings, or generated secrets.
- Run `bun run verify` for the normal full verification pass.
