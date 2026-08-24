<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Calories app project map

Use the focused guardrails at `.agents/skills/calories-app-guardrails/SKILL.md` for MongoDB, server action, calorie tracking, theme, or security work. Match the task to one role before editing:

- `.agents/roles/domain-data.md` for domain models, persistence, authentication, and food-log invariants.
- `.agents/roles/ui-accessibility.md` for the app UI, Thai copy, Client/Server boundaries, themes, contrast, and progress presentation.
- `.agents/roles/verification.md` for read-only verification and release-readiness reporting.
