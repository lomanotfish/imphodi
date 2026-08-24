# MongoDB Security and Git Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Secure persistence, initialize Atlas, verify the calorie progress behavior, and add durable project guidance without exposing secrets.

**Architecture:** Retain the DataStore adapter. store.ts selects mongoStore only when MONGODB_URI is configured; domain code derives ownership from the signed session. MongoDB schema validation/indexes add a second integrity boundary while server validation remains the authority for server-action input.

**Tech Stack:** Next.js 16.3.2 App Router, React 19.2.8, TypeScript, Bun 1.3.14, MongoDB Driver 7.5.0, MongoDB Atlas.

**Spec:** docs/superpowers/specs/2026-08-24-mongodb-project-agents-security-design.md

## Global Constraints

- Read relevant Next.js 16 docs under node_modules/next/dist/docs before changing Next behavior.
- Keep MongoDB URI, model key, and auth secret in ignored .env.local; never use NEXT_PUBLIC_.
- Preserve DataStore; no direct MongoDB/filesystem calls outside persistence modules.
- Derive all food-entry ownership from getSessionKey(), never server-action input.
- Preserve immutable nutrition snapshots and Bangkok YYYY-MM-DD date keys.
- Database verification must remove its sentinel records and print sanitized diagnostics.
- Do not push or deploy. Set the requested Git remote after verification passes.

---

## File Structure

- src/lib/db/schema.ts: document types, indexes, and strict MongoDB validators.
- scripts/db-setup.ts: idempotent schema/index setup plus cleanup-safe Atlas check.
- tests/schema-security.test.ts: pure validator/index security assertions.
- src/lib/auth.ts: password policy and production session-secret invariant.
- src/lib/security-headers.ts: tested response-header definition.
- next.config.ts: Next.js 16 app-wide response headers.
- tests/security-headers.test.ts: header regression coverage.
- tests/food-ring.test.tsx: target-versus-revealed regression coverage.
- .agents/skills/calories-app-guardrails/SKILL.md: concise project guardrails.
- .agents/roles/*.md: data, UI/accessibility, and verification roles.
- AGENTS.md: project map without altering generated Next.js guidance.
- .env.local: ignored secret configuration.

## Task 1: Harden the MongoDB schema contract

**Files:**

- Create: tests/schema-security.test.ts
- Modify: src/lib/db/schema.ts
- Verify: scripts/db-setup.ts

**Interfaces:**

- Consumes: COLLECTIONS, INDEXES, VALIDATORS from src/lib/db/schema.ts.
- Produces: validators that permit declared fields plus Mongo _id only, and required index definitions.

- [ ] **Step 1: Write the failing schema-security tests**

~~~
import { describe, expect, test } from "bun:test";
import { INDEXES, VALIDATORS } from "@/lib/db/schema";

describe("MongoDB persistence contract", () => {
  test("rejects undeclared fields and requires complete food snapshots", () => {
    const food = VALIDATORS.foodEntries.$jsonSchema;
    expect(food.additionalProperties).toBe(false);
    expect(food.properties._id).toEqual({ bsonType: "objectId" });
    expect(food.required).toEqual(expect.arrayContaining([
      "entryId", "userKey", "date", "meal", "foodId", "name", "serving",
      "servings", "kcal", "protein", "carbs", "fat", "createdAt",
    ]));
  });

  test("uses unique identity plus owner/date indexes", () => {
    expect(INDEXES.users).toContainEqual(
      expect.objectContaining({ key: { nameKey: 1 }, unique: true }),
    );
    expect(INDEXES.foodEntries).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: { userKey: 1, date: -1 } }),
      expect.objectContaining({ key: { entryId: 1 }, unique: true }),
    ]));
  });
});
~~~

- [ ] **Step 2: Run the new test to verify it fails**

Run: bun test tests/schema-security.test.ts

Expected: FAIL because the existing validator allows undeclared fields and omits at least one persisted food-snapshot field.

- [ ] **Step 3: Implement the minimal validator tightening**

Add additionalProperties: false to user and food-entry validators, declaring _id as { bsonType: "objectId" }. Require all fields written by emptyUser() and addEntry(). Model a non-null profile as an object requiring gender, age, weight, height, activity, and goal; apply the same allowed values/ranges as parseProfile(), then set its additionalProperties to false. Keep profile nullable. For numeric fields allow ["double", "int", "long"] so writes from the Node driver pass validation.

- [ ] **Step 4: Verify focused tests**

Run: bun test tests/schema-security.test.ts && bun run typecheck

Expected: PASS.

- [ ] **Step 5: Commit**

~~~
git add src/lib/db/schema.ts scripts/db-setup.ts tests/schema-security.test.ts
git commit -m "feat: harden MongoDB collection validators"
~~~

## Task 2: Strengthen session configuration, password policy, and browser headers

**Files:**

- Create: src/lib/security-headers.ts
- Create: tests/security-headers.test.ts
- Modify: src/lib/auth.ts
- Modify: tests/auth.test.ts
- Modify: next.config.ts

**Interfaces:**

- Consumes: NextConfig, PASSWORD_RULE, and existing test cookie mocks.
- Produces: SECURITY_HEADERS and a production auth-secret invariant.

- [ ] **Step 1: Write the failing security tests**

~~~
import { expect, test } from "bun:test";
import { PASSWORD_RULE, validatePassword } from "@/lib/auth";
import { SECURITY_HEADERS } from "@/lib/security-headers";

test("requires an eight-character password minimum", () => {
  expect(PASSWORD_RULE.min).toBe(8);
  expect(validatePassword("1234567")).toContain("8");
  expect(validatePassword("12345678")).toBeNull();
});

test("sends baseline protection headers without broad CORS", () => {
  expect(SECURITY_HEADERS).toEqual(expect.arrayContaining([
    expect.objectContaining({ key: "X-Content-Type-Options", value: "nosniff" }),
    expect.objectContaining({ key: "Referrer-Policy" }),
    expect.objectContaining({ key: "Permissions-Policy" }),
    expect.objectContaining({ key: "Content-Security-Policy" }),
  ]));
  expect(SECURITY_HEADERS.some((h) => h.key === "Access-Control-Allow-Origin")).toBe(false);
});
~~~

- [ ] **Step 2: Run the focused tests to verify failure**

Run: bun test tests/auth.test.ts tests/security-headers.test.ts

Expected: FAIL because the password minimum is six and the header module does not exist.

- [ ] **Step 3: Implement only the defined hardening**

Set PASSWORD_RULE.min to 8. In loadSecret(), use AUTH_SECRET when it is at least 32 characters; if NODE_ENV is production and it is absent/short, throw Error("AUTH_SECRET must be set in production") rather than create a filesystem fallback. Preserve the local-development fallback.

Create src/lib/security-headers.ts:

~~~
export const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests" },
] as const;
~~~

Update next.config.ts to return that constant from async headers() for source "/(.*)". Do not add CORS headers: the project has no route handlers/cross-origin API. Do not add HSTS locally; its final domain policy must be set by the production host.

- [ ] **Step 4: Verify focused security checks**

Run: bun test tests/auth.test.ts tests/security-headers.test.ts && bun run lint && bun run typecheck

Expected: PASS.

- [ ] **Step 5: Commit**

~~~
git add src/lib/auth.ts src/lib/security-headers.ts next.config.ts tests/auth.test.ts tests/security-headers.test.ts
git commit -m "feat: strengthen runtime and browser security"
~~~

## Task 3: Validate the calorie progress regression

**Files:**

- Modify if needed: tests/food-ring.test.tsx
- Modify only if a regression test fails: src/components/dashboard.tsx, src/components/food-log.tsx

**Interfaces:**

- Consumes: saved Profile, calculate(profile), LoggedEntry[], and FoodLog target.
- Produces: a target independent of revealed state and a ring fraction clamped to [0, 1].

- [ ] **Step 1: Run the existing regression suite first**

Run: bun test tests/food-ring.test.tsx

Expected: PASS. It must prove that Dashboard calculates budget from savedProfile and passes it to FoodLog independently of revealed.

- [ ] **Step 2: Add a failing assertion only if the existing test misses this flow**

Assert FoodLog receives target={budget} and the budget expression occurs outside the revealed conditional. Keep monotonic and clamping assertions for ringFraction.

- [ ] **Step 3: Apply a repair only if the added test fails**

~~~
const result = revealed && savedProfile ? calculate(savedProfile) : null;
const budget = savedProfile ? calculate(savedProfile) : null;

<FoodLog target={budget} ... />
~~~

BudgetCard must calculate ratio as goal > 0 ? totals.kcal / goal : 0 and render Math.min(ratio, 1).

- [ ] **Step 4: Verify**

Run: bun test tests/food-ring.test.tsx

Expected: PASS with nonzero progress before opening the calculation result panel.

- [ ] **Step 5: Commit only if tracked files changed**

~~~
git add tests/food-ring.test.tsx src/components/dashboard.tsx src/components/food-log.tsx
git commit -m "fix: keep food budget independent of result panel"
~~~

## Task 4: Create and validate project-specific agent guidance

**Files:**

- Create: .agents/skills/calories-app-guardrails/SKILL.md
- Create: .agents/roles/domain-data.md
- Create: .agents/roles/ui-accessibility.md
- Create: .agents/roles/verification.md
- Modify: AGENTS.md

**Interfaces:**

- Consumes: AGENTS.md, README.md, DataStore, existing tests, and bun run verify.
- Produces: one auto-discoverable focused skill and three non-overlapping roles.

- [ ] **Step 1: Establish a baseline guidance failure**

Ask an isolated agent to plan adding food persistence and changing a theme without the project guidance. Record any omission of session-derived owner key, immutable nutrition snapshot, DataStore boundary, theme/CSS/contrast coupling, or the verification command. Use only observed omissions to scope the skill.

- [ ] **Step 2: Write minimal skill and roles**

Use calories-app-guardrails. Its frontmatter description starts with "Use when..." and names MongoDB, server actions, calorie tracking, theme, or security changes. Keep body below 500 words and state: Next.js 16 docs, server/client boundary, DataStore-only persistence, session-derived owner key, immutable snapshot, Bangkok date key, theme/contrast file coupling, .env.local/data treatment, and bun run verify.

domain-data covers lib/schema/store/auth/food-log plus invariant-first tests. ui-accessibility covers app/components/globals, Thai UI, Client/Server boundaries, theme/contrast, and progress behavior. verification is read-only and reports focused tests, full verification, build, and secret scan. Add a project-map pointer to AGENTS.md while preserving its generated Next.js block byte-for-byte.

- [ ] **Step 3: Validate behavior**

Run:

~~~
python C:/Users/witch/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/calories-app-guardrails
~~~

Give an independent read-only agent the same request with the skill/roles available. It must identify all observed baseline omissions. If not, narrow/tighten only the missing instruction, then re-run validation.

- [ ] **Step 4: Commit**

~~~
git add AGENTS.md .agents
git commit -m "docs: add calories app agent guardrails"
~~~

## Task 5: Configure Atlas locally and initialize the database

**Files:**

- Modify: .env.local (ignored; never stage)
- Modify only if verified evidence requires it: scripts/db-setup.ts
- Verify: .env.example, .gitignore

**Interfaces:**

- Consumes: MONGODB_URI, MONGODB_DB="imphodi", and db:setup.
- Produces: Atlas users and foodEntries collections with validators/indexes and no retained sentinels.

- [ ] **Step 1: Configure local server-only values**

Set the supplied Atlas SRV URI in ignored .env.local and MONGODB_DB="imphodi". Generate AUTH_SECRET with:

~~~
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
~~~

Keep the supplied model key solely as MODEL_API_KEY; do not import it into a Client Component. Confirm variable names and lengths only, never values.

- [ ] **Step 2: Confirm Git secret safety**

Run:

~~~
git check-ignore -v .env.local
git ls-files '.env*'
git grep -n -E 'mongodb\+srv://|AUTH_SECRET="[^" ]{32,}|MODEL_API_KEY="[^" ]+' -- . ':!docs/superpowers/plans/*'
~~~

Expected: .env.local ignored, only .env.example tracked, and no tracked secret value.

- [ ] **Step 3: Run idempotent Atlas setup**

Run: bun run db:setup

Expected: collections created/updated, indexes verified, a sentinel validation write deleted, and sanitized output.

- [ ] **Step 4: Preserve template safety**

If inspection finds a template gap, keep .env.example limited to placeholders, MONGODB_DB="imphodi", and Vercel instructions. Never commit real URI/username/password/auth secret/model key.

- [ ] **Step 5: Do not commit .env.local**

Run: git status --short

Expected: .env.local does not appear. Commit only a genuine tracked setup/template fix.

## Task 6: Verify readiness and set the requested Git target

**Files:**

- Modify: .git/config through git remote set-url only after all checks pass.

**Interfaces:**

- Consumes: project verification and requested remote https://github.com/witchagorn/impodee.git.
- Produces: verified local repository target without push/deployment.

- [ ] **Step 1: Run the full automated suite**

Run: bun run verify

Expected: lint, typecheck, and all Bun suites pass.

- [ ] **Step 2: Run production build**

Run: bun run build

Expected: Next.js build completes without server/client boundary or configuration errors.

- [ ] **Step 3: Run final boundary/secret scans**

~~~
git grep -n -E 'mongodb\+srv://|MONGODB_URI="mongodb|MODEL_API_KEY="[^" ]+|AUTH_SECRET="[^" ]{32,}' -- . ':!docs/superpowers/plans/*'
rg -n 'fs\.(readFile|writeFile|mkdir|rename)' src -g '*.ts' -g '*.tsx'
rg -n 'deleteOne\(|deleteMany\(|updateOne\(|findOne\(' src/lib/db/mongo-store.ts
~~~

Expected: no tracked real secrets; filesystem persistence stays inside store.ts and auth's development fallback; Mongo food mutations use { entryId, userKey } or { userKey, date } filters.

- [ ] **Step 4: Set and verify the requested remote**

~~~
git remote set-url origin https://github.com/witchagorn/impodee.git
git remote -v
git status --short
git log --oneline -5
~~~

Expected: origin uses impodee.git. Do not run git push, create a Vercel project, or deploy.

- [ ] **Step 5: Report Vercel handoff**

Report the server-only variable names MONGODB_URI, MONGODB_DB, AUTH_SECRET, MODEL_API_KEY and advise rotation of all credentials shared through interactive channels before public deployment.

