# Security and reliability audit

Audit date: 2026-07-20

Scope: Next.js application, route handlers, authentication, RBAC, business transactions, PostgreSQL schema/migrations, dependency tree, CI and Vercel/Supabase deployment configuration.

## Executive summary

The audit found no known critical issue. All identified application high-severity findings were remediated in the repository. One high-severity operational blocker remains outside the codebase: the configured hosted Supabase project is unavailable, so migrations and authenticated production flows cannot be verified until a project is restored or replaced.

The final local gate passed ESLint, TypeScript, 10 tests, `npm audit` with zero vulnerabilities and a Next.js 16.2.10 production build. All seven migrations and the seed command passed against disposable PostgreSQL 17, including an idempotent migration rerun. Chromium completed login, request creation, 96-point matching, assignment, comment and status progression through `done`, with no console warnings/errors. Desktop and 390 px mobile checks also confirmed the nonce-based CSP and baseline security headers.

## Findings

| ID | Severity | Status | Finding |
| --- | --- | --- | --- |
| SEC-001 | High | Resolved | Signed sessions could remain usable after logout, role changes or account deactivation |
| SEC-002 | High | Resolved | Mutation routes lacked a uniform same-origin and request-body security contract |
| SEC-003 | Medium | Resolved | Login throttling was process-local/optional and ineffective across serverless instances |
| SEC-004 | Medium | Resolved | No strict CSP protected the application from injected scripts and inline style sinks |
| BIZ-001 | High | Resolved | Expert workload counters could drift when requests completed, were rejected or deleted |
| BIZ-002 | High | Resolved | Client input could write workflow/operational fields owned by the server |
| DATA-001 | High | Resolved | Expert identity and active assignment uniqueness were not fully enforced |
| SUPA-001 | Medium | Resolved | Public-schema tables could be exposed through legacy Supabase Data API grants |
| DEP-001 | Medium | Resolved | Vulnerable PostCSS and obsolete esbuild tooling appeared in the dependency tree |
| TEST-001 | Medium | Resolved | The repository had no automated tests or CI quality gate |
| OPS-001 | High | Blocked externally | Configured Supabase database project/tenant is unavailable |

## Detailed remediation

### SEC-001 — revocable, database-backed sessions

**Evidence.** Session JWTs previously carried user claims without a revocation generation. Logout deleted only the browser cookie, and protected requests did not re-check active state or the current role.

**Impact.** A copied token could remain valid after logout; a deactivated user or changed role could retain stale access until token expiry.

**Resolution.** JWTs now contain a validated `sessionVersion`; every authenticated request loads the current user and compares that version. Logout atomically advances the database version before deleting the cookie. See [`session.ts` lines 16–120](../src/server/auth/session.ts#L16), [`user-repository.ts` lines 28–38](../src/server/repositories/user-repository.ts#L28) and migration [`0003_session_revocation.sql`](../src/server/db/migrations/0003_session_revocation.sql).

### SEC-002 — same-origin mutation and bounded JSON parsing

**Evidence.** Mutation handlers independently parsed JSON and relied primarily on SameSite cookie behaviour.

**Impact.** Inconsistent content-type, size and origin checks enlarged the CSRF and denial-of-service surface.

**Resolution.** All unsafe browser calls carry an application marker. Handlers verify both the marker and exact request origin, require JSON, enforce per-route byte limits, validate UUIDs and return stable error classes. See [`request-security.ts` lines 14–50](../src/server/services/request-security.ts#L14), [`api-client.ts`](../src/lib/api-client.ts), tests in [`same-origin.test.ts`](../tests/same-origin.test.ts) and representative routes under [`src/app/api`](../src/app/api).

### SEC-003 — persistent login throttling

**Evidence.** The limiter depended on instance memory or optional Redis, so new serverless instances could receive fresh counters.

**Impact.** Distributed password guessing could bypass effective limits.

**Resolution.** Account and IP keys are SHA-256 hashed and consumed through an atomic PostgreSQL upsert with a 15-minute window. Vercel-forwarded client IPs are trusted only inside Vercel. See [`rate-limit.ts` lines 7–69](../src/server/auth/rate-limit.ts#L7), schema [`auth_rate_limits`](../src/server/db/schema.ts#L227) and migration [`0006_persistent_login_rate_limit.sql`](../src/server/db/migrations/0006_persistent_login_rate_limit.sql).

### SEC-004 — strict content security policy

**Evidence.** Baseline response headers existed, but there was no CSP and several UI elements emitted inline style attributes.

**Impact.** A future injection bug would have had fewer browser-side containment controls.

**Resolution.** The proxy now generates a fresh nonce for each document, forwards it to Next.js and emits `strict-dynamic`, `style-src-attr 'none'`, `object-src 'none'`, `frame-ancestors 'none'` and related directives. Inline chart/progress styles were replaced by SVG attributes. See [`proxy.ts` lines 18–103](../src/proxy.ts#L18) and [`layout.tsx` lines 12–27](../src/app/layout.tsx#L12). Chromium response-header and console verification passed.

### BIZ-001 — atomic workload accounting

**Evidence.** Status transitions and deletion did not consistently reconcile `experts.current_load`; related request, assignment and audit writes were not one atomic operation.

**Impact.** Matching and capacity decisions could use incorrect workload data, especially after completion, rejection or deletion.

**Resolution.** Delete, transition and assignment paths now lock relevant rows and update request state, assignments, counters and audit records inside transactions. Final completion increments the completed count once; leaving an active state decrements load once. See [`request-repository.ts` lines 381–478](../src/server/repositories/request-repository.ts#L381) and [`0004_assignment_integrity.sql`](../src/server/db/migrations/0004_assignment_integrity.sql).

### BIZ-002 — server-owned operational fields

**Evidence.** Request/expert input contracts accepted workflow state, assignee and calculated counters from clients.

**Impact.** An authorised editor could bypass dedicated workflow rules or corrupt operational metrics through mass assignment.

**Resolution.** Request status/assignee and expert load/completion counters were removed from writable schemas. Creation assigns safe defaults and updates preserve system-owned values. See [`request.ts` lines 9–36](../src/server/validators/request.ts#L9), [`expert.ts` lines 17–43](../src/server/validators/expert.ts#L17), and validation tests in [`authorization-and-validation.test.ts`](../tests/authorization-and-validation.test.ts).

### DATA-001 — expert and assignment integrity

**Evidence.** Multiple expert profiles could link to the same user and historical assignment rows could remain simultaneously active.

**Impact.** Permissions, workload and ownership could become ambiguous.

**Resolution.** Expert links require an active `expert`-role user, capacity cannot be reduced below current load, database uniqueness protects expert users, and only one `assigned` row may exist for a request. Reassignment declines the former active assignment transactionally. See [`expert-repository.ts` lines 63–92 and 218–318](../src/server/repositories/expert-repository.ts#L63), [`user-repository.ts` lines 41–62](../src/server/repositories/user-repository.ts#L41), and migrations [`0004`](../src/server/db/migrations/0004_assignment_integrity.sql) / [`0005`](../src/server/db/migrations/0005_expert_user_integrity.sql).

### SUPA-001 — Supabase Data API hardening

**Evidence.** Application tables live in the default `public` schema. Supabase projects using legacy automatic grants can expose new public tables to Data API roles.

**Impact.** A future public key or client integration could unintentionally create a second data-access path outside application RBAC.

**Resolution.** The application continues to use server-side PostgreSQL only. The hardening migration enables RLS with no public policies, revokes all table privileges from `PUBLIC`, `anon` and `authenticated`, and revokes their default table privileges. See [`20260720104425_supabase_api_hardening.sql`](../src/server/db/migrations/20260720104425_supabase_api_hardening.sql).

### DEP-001 — dependency remediation

**Evidence.** The dependency tree contained an affected nested PostCSS version and an obsolete `@esbuild-kit` chain pulled only by optional Drizzle development tooling.

**Impact.** Known moderate vulnerabilities remained in both production and development dependency reports.

**Resolution.** Next.js is on 16.2.10, its nested PostCSS is overridden to 8.5.20, and unused generator/studio tooling was removed because the project has a standalone migration runner. Both full and production-only `npm audit` now report zero vulnerabilities. See [`package.json`](../package.json) and [`scripts/migrate.ts`](../scripts/migrate.ts).

### TEST-001 — automated regression gate

**Evidence.** No test command, tests or continuous integration workflow existed.

**Impact.** Permission transitions, request contracts and scoring regressions could reach production undetected.

**Resolution.** Ten deterministic tests cover workflow permissions, safe redirects, mass-assignment rejection, boolean validation, matching score boundaries and same-origin rules. GitHub Actions runs locked install, lint, type-check, tests, dependency audit and build. See [`tests`](../tests) and [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).

### OPS-001 — unavailable hosted database

**Evidence.** On 2026-07-20, both configured Supabase API/database hostnames returned DNS `NXDOMAIN`; the pooler responded that the configured tenant/user was not found. Supabase CLI 2.109.1 had no authenticated access token. The migration runner therefore failed before opening a transaction, so it did not modify a database.

**Impact.** Authenticated pages, login throttling and all business workflows are unavailable in production even though the Vercel build itself can be deployed.

**Required resolution.** Restore the intended Supabase project or provision a replacement under the owner's account, rotate and update all database/service credentials, run `npm run db:migrate`, then perform the role and end-to-end workflow checks in [`production-checklist.md`](production-checklist.md). Do not treat a Vercel `Ready` state as a successful application deployment until this passes.

## Verification record

| Check | Result |
| --- | --- |
| `npm run lint` | Pass |
| `npm run typecheck` | Pass |
| `npm test` | 10 passed, 0 failed |
| `npm audit` | 0 vulnerabilities |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `npm run build` | Pass, Next.js 16.2.10 |
| Test-module line coverage | 97.71% |
| PostgreSQL 17 migrations | 7 applied; second run skipped 7 safely |
| Disposable database seed | Pass: 4 users, 8 experts, 20 requests |
| Authenticated Chromium workflow | Login → create → match → assign → comment → `done` passed |
| Transaction invariants after E2E | Load returned to 2; completed count 43; one active assignment |
| Chromium desktop login | HTTP 200, no console warnings/errors |
| Chromium mobile login | 390 px viewport, no horizontal overflow |
| Security response headers | CSP nonce and baseline headers present |
| Production database migrations | Blocked: hosted Supabase project unavailable |

## Residual risks

- No production end-to-end workflow can be certified until OPS-001 is resolved.
- Unit tests cover critical pure contracts but not transaction behaviour against a disposable PostgreSQL instance.
- File uploads, notifications, multi-tenancy and organisation-level isolation are intentionally out of scope.
- Operational error monitoring, database backups and recovery drills require owner-managed service configuration.
