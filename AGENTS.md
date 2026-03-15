# AGENTS.md

## Read Order (Always First)

1. `korean-self-hosted-erp-blueprint.md`
2. `korean-self-hosted-erp-starter-structure-and-schema.md`
3. `PROMPT01.md`
4. `PROMPT02.md` (or active phase prompt)

## Repository Conventions

- Package manager: `pnpm`
- Task orchestration: `turbo`
- Git workflow is mandatory for every task
- Git workflow checklist:
  0. Always start from `main` and sync latest first (`git switch main && git pull --ff-only`)
  1. Create a task-specific branch from `main` (use `codex/<task-name>`)
  2. Implement the task on that branch
  3. Run QA/validation before commit (`pnpm -r lint`, `pnpm -r typecheck`, `pnpm -r test`, `pnpm -r build`, plus Go tests when touched)
  4. Commit changes with clear messages
  5. Push branch to `origin`
  6. Verify final PR diff before merge (especially README language/file-name conventions and accidental file renames/deletes)
  7. Agent must create PR targeting `main` directly via CLI (`gh pr create`)
  8. Merge via PR after required checks pass (prefer squash merge)
  9. After merge, switch back to `main` and sync local state (`git switch main && git pull --ff-only`)
- If PR creation fails due token scope, refresh GitHub auth/token first and retry PR creation before asking for manual action
- Use branch prefix `codex/` for agent-created branches
- Repository default branch is `main`; CI/Dependabot targets must stay aligned to `main`
- Dependabot baseline policy: patch/minor automation by default, major upgrades are reviewed manually
- Core API architecture: modular monolith (NestJS)
- API auth convention: `Authorization: Bearer <session-token>` + `x-company-id` header
- Secured API controllers should expose `x-company-id` in Swagger via shared decorator
- Mutation endpoints (create/update/delete + auth-sensitive actions) must write `AuditLog`
- Import/export APIs enqueue jobs as `PENDING`; worker processes lifecycle transitions (`RUNNING` -> `SUCCEEDED|FAILED`)
- Employee response payloads should keep sensitive fields masked by default
- API tests use Node test runner via `tsx --test` for lightweight TypeScript coverage
- Prefer service-level tests with mocked Prisma/Audit dependencies before heavier e2e wiring
- Guard tests should use lightweight `ExecutionContext` stubs to keep auth/RBAC checks fast
- Keep vendor attendance integrations generic via adapters/stubs
- HWPX is first-class; legacy HWP is fallback only
- Keep `README.md` in English and `README.ko.md` in Korean, with setup/architecture sections aligned
- Keep `README.en.md` as an English mirror of `README.md`; when a PROMPT run is completed, reflect the update in both files
- Web UI baseline is Korean-first + light mode default, with in-app dark mode and English toggles
- UI screenshot QA should wait until data rows are visible and loading text is gone before capture
- QA gate for every task/PR:
  1. Validate all API surfaces (OpenAPI endpoint inventory + execution evidence)
  2. Validate all web pages/routes with screenshot evidence
  3. Validate all core feature flows with per-feature step/result notes
  4. Store QA artifacts under `docs/qa/runs/<run-id>/` (not external-only)
  5. Include role-specific captures (`admin`, `user`) where behavior differs
- QA artifact minimum structure:
  - `docs/qa/runs/<run-id>/report.md`
  - `docs/qa/runs/<run-id>/api/openapi-endpoints.csv`
  - `docs/qa/runs/<run-id>/pages/page-checklist.csv`
  - `docs/qa/runs/<run-id>/features/*.md`
  - `docs/qa/runs/<run-id>/screenshots/admin/*.png`
  - `docs/qa/runs/<run-id>/screenshots/user/*.png`
- Every page screenshot should include a short Korean description for later whitepaper reuse
- Public OSS hygiene required: no secrets, no proprietary credentials, no vendor-private SDK assets

## Structure Baseline

- Apps: `apps/web`, `apps/api`, `apps/worker`, `apps/docs-service`, `apps/connector-gateway`
- Agent: `agents/edge-agent` (Go)
- Shared packages: `packages/ui`, `packages/domain`, `packages/contracts`, `packages/sdk`, `packages/shared`, `packages/config`
- Deployment: `deploy/compose`, `deploy/helm`

## Before Finishing Any Run

- Run relevant checks (`lint`, `typecheck`, `test`, and targeted build/start checks)
- Update docs impacted by changes (`docs/PLAN.md`, README(s), ADR/ops/api as needed)
- Summarize changed files, what passed, and what remains
