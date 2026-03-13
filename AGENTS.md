# AGENTS.md

## Read Order (Always First)

1. `korean-self-hosted-erp-blueprint.md`
2. `korean-self-hosted-erp-starter-structure-and-schema.md`
3. `PROMPT01.md`
4. `PROMPT02.md` (or active phase prompt)

## Repository Conventions

- Package manager: `pnpm`
- Task orchestration: `turbo`
- Git workflow is mandatory: create a task-specific branch first, then commit and push, then merge into `main`
- Use branch prefix `codex/` for agent-created branches
- Repository default branch is `main`; CI/Dependabot targets must stay aligned to `main`
- Dependabot baseline policy: patch/minor automation by default, major upgrades are reviewed manually
- Core API architecture: modular monolith (NestJS)
- API auth convention: `Authorization: Bearer <session-token>` + `x-company-id` header
- Secured API controllers should expose `x-company-id` in Swagger via shared decorator
- Mutation endpoints (create/update/delete + auth-sensitive actions) must write `AuditLog`
- Employee response payloads should keep sensitive fields masked by default
- API tests use Node test runner via `tsx --test` for lightweight TypeScript coverage
- Prefer service-level tests with mocked Prisma/Audit dependencies before heavier e2e wiring
- Guard tests should use lightweight `ExecutionContext` stubs to keep auth/RBAC checks fast
- Keep vendor attendance integrations generic via adapters/stubs
- HWPX is first-class; legacy HWP is fallback only
- Keep `README.md` (EN) and `README.ko.md` (KO) aligned for setup and architecture
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
