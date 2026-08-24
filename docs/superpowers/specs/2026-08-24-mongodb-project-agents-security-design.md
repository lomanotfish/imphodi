# MongoDB, Project Agents, and Calorie Progress Design

Date: 2026-08-24
Status: Approved

## Goal

Finish the MongoDB work started in the prior session, prepare the repository for Git and a later Vercel deployment, create project-specific Codex guidance, and verify the calorie progress indicator. Deployment and pushing to GitHub are out of scope.

## Existing Architecture

The application is a Next.js 16 App Router project using React 19, TypeScript, Bun, and server actions. Server-only domain modules obtain the current user from a signed session cookie and call a `DataStore` interface. `store.ts` selects the file store for local fallback or the MongoDB store when `MONGODB_URI` is set. The prior session already added the MongoDB adapter, schema definitions, setup script, environment template, and a regression test for the calorie ring.

The implementation will preserve this adapter architecture. Adding Mongoose or a new HTTP API layer would duplicate existing boundaries without improving the requested outcome.

## MongoDB Schema and Security

Use database `imphodi` with these collections:

- `users`: normalized unique `nameKey`, display `name`, scrypt salt/hash, optional profile, theme, and timestamps.
- `foodEntries`: globally unique `entryId`, owner `userKey`, Bangkok-local date key, meal slot, immutable food snapshot, servings, nutrition totals, and creation time.

The setup script must create or update `$jsonSchema` validators and apply these indexes:

- unique `users.nameKey`
- compound `foodEntries.userKey + date`
- unique `foodEntries.entryId`

Database validation is a second boundary; server-side validation remains mandatory. Every food read, update, and delete must include the owner key derived from the authenticated session. Client input must never supply or override ownership. Mongo `_id`, password hashes, salts, connection strings, auth secrets, and model keys must never cross the server/client boundary.

The runtime connection uses a cached `MongoClient` suitable for serverless reuse, bounded selection/connect timeouts, TLS through the Atlas SRV connection, and a small pool. The schema setup command may use a credential with index/validator privileges. Before production deployment, use a least-privilege runtime database user and rotate credentials that have been shared through interactive channels.

## Environment Handling

`.env.local` will contain the real `MONGODB_URI`, `MONGODB_DB`, `AUTH_SECRET`, and `MODEL_API_KEY`. It stays ignored by Git. `.env.example` will contain names, safe placeholders, and setup notes only. No variable is prefixed with `NEXT_PUBLIC_`.

The model key will be stored for future server-side use but will not be wired into a client or endpoint because the current application has no model-backed feature. A generated, stable, high-entropy `AUTH_SECRET` will be used locally and documented as a required Vercel variable.

## Server Actions and Authentication

Continue using server actions as untrusted public mutation entry points. Each action delegates to domain validation and revalidates the page after a successful mutation. Security review will verify:

- authorization is checked inside every mutation, not only in the UI;
- object ownership filters are present in both file and Mongo stores;
- invalid dates, meal slots, food IDs, serving counts, profiles, themes, names, and passwords are rejected;
- authentication responses do not reveal whether a username exists;
- secrets and complete database documents are not serialized to Client Components.

Durable distributed rate limiting, revocable server-side sessions, and a full CSP are valuable production hardening items. They will be documented as deployment follow-ups unless a directly exploitable defect in the requested flow requires a focused fix now.

## Calorie Progress Indicator

The daily food budget must be calculated from the saved profile independently of whether the user has opened the calculation result panel. The result panel may remain gated by the `revealed` state, but `FoodLog` must always receive the saved-profile budget. Its ring fraction is `min(consumed kcal / target kcal, 1)` and must update monotonically as optimistic entries change.

The current checkout appears to contain this fix already. Verification will add or strengthen a behavioral regression test covering a saved profile with food entries before the Calculate button is pressed, then confirm that adding or changing servings increases the displayed fraction. If that test fails, the smallest data-flow fix will be applied.

## Project Skill and Agent Roles

Create one focused skill at `.agents/skills/calories-app-guardrails/SKILL.md`. It will route future changes through the project’s non-obvious invariants: Next.js 16 local documentation, server/client boundaries, DataStore ownership rules, nutrition snapshots, Bangkok date keys, theme/contrast coupling, and the verification commands.

Create three narrow role files:

- `.agents/roles/domain-data.md`: schema, store, auth, food-log, ownership, and invariant-first tests.
- `.agents/roles/ui-accessibility.md`: app/components/styles, client/server boundaries, Thai UI, theme consistency, contrast, and progress behavior.
- `.agents/roles/verification.md`: read-only review, focused tests, full verification, build, and secret scanning.

Update `AGENTS.md` with a concise project map and pointers while preserving the generated Next.js rules exactly.

The skill will be developed with a baseline scenario, then validated against realistic project tasks and the bundled skill validator. Agent role files will be checked with independent read-only review prompts.

## Git Readiness

Change the local `origin` URL to the requested `impodee` repository after all verification passes. Do not push and do not deploy. Confirm that only `.env.example` is tracked, `.env.local` and `data/` are ignored, no supplied secret value appears in tracked files or generated output, and the working tree contains only intentional changes.

## Verification

Run focused tests during implementation, followed by:

1. MongoDB schema setup and a cleanup-safe connectivity/CRUD verification.
2. `bun run lint`
3. `bun run typecheck`
4. `bun test`
5. `bun run build`
6. Git-tracked secret scan and ignore checks.

Database verification must not leave probe users or food entries behind. A failure is reported with sanitized diagnostics that omit connection strings, credentials, hashes, and API keys.

## Success Criteria

- Atlas contains validated `users` and `foodEntries` collections with required indexes.
- Local runtime selects MongoDB and can perform owner-scoped operations.
- Real secrets exist only in ignored local environment configuration.
- The calorie ring regression is proven by tests and tracks consumed calories.
- Project skill, role files, and `AGENTS.md` accurately describe the repository.
- Lint, typecheck, unit tests, production build, and secret scan pass.
- The repo targets the requested GitHub repository and is ready for a later Vercel deployment without being pushed or deployed now.
