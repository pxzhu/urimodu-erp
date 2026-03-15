# Bootstrap Plan (Foundation Phase)

Date: 2026-03-13  
Scope source: `PROMPT01.md` + `korean-self-hosted-erp-starter-structure-and-schema.md` + `PROMPT02.md`

## Objective

Create a clean, public OSS-ready repository foundation for a self-hosted Korean ERP/work platform using a pnpm + Turborepo monorepo, with runnable baseline services and deployment scaffolding.

## In Scope (This Run)

- Repository bootstrap and conventions
- Public OSS governance files
- Monorepo workspace scaffolding
- Basic runnable services with health checks
- Swagger bootstrap in API
- Docker Compose stack and Helm chart skeleton
- Example env files, task runner, CI skeleton
- Initial ADRs and bilingual README alignment
- Prisma schema baseline placement (from source-of-truth document)

## Out of Scope (This Run)

- Deep business module implementation (auth/org/employee/approval/attendance finance workflows)
- Full vertical ERP feature completion
- Advanced production hardening and SRE automation

## Execution Steps

1. Establish docs-first baseline (`docs/PLAN.md`) before code changes.
2. Scaffold root monorepo config (`pnpm-workspace.yaml`, `turbo.json`, root scripts, shared TS config, Makefile).
3. Scaffold apps:
   - `apps/web` (Next.js landing + `/health`)
   - `apps/api` (NestJS + `/health` + Swagger)
   - `apps/worker`, `apps/docs-service`, `apps/connector-gateway` (runnable health-enabled skeletons)
4. Scaffold shared packages:
   - `packages/ui`, `packages/domain`, `packages/contracts`, `packages/sdk`, `packages/shared`, `packages/config`
5. Add deployment foundation:
   - `deploy/compose/docker-compose.yml`
   - `deploy/helm/korean-erp/*` chart skeleton
6. Add governance and community files:
   - Apache-2.0 `LICENSE`
   - `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`
   - `.editorconfig`, `.gitignore`, GitHub issue templates, PR template
7. Add docs and conventions:
   - `README.md` (EN), `README.ko.md` (KO), `README.en.md` (EN mirror), `docs/adr/*`, concise root `AGENTS.md`
8. Run scaffold checks and record results.

## Acceptance Checklist

- [x] pnpm workspace + Turborepo configured
- [x] Required app/package/agent/deploy folders created
- [x] API boots with `/health` and Swagger
- [x] Web boots with landing page and `/health`
- [x] Docker Compose includes `postgres`, `redis`, `minio`, `api`, `web`, `worker`
- [x] Helm chart skeleton installable with configurable images/env/ingress/persistence/secrets refs
- [x] OSS governance files added
- [x] README EN/KO aligned for setup and architecture
- [x] CI skeleton added for lint + typecheck + test
- [x] Example env files and Makefile added
- [x] Relevant checks executed and reported

## Bootstrap Output Summary

- Monorepo foundation created with required apps, packages, deploy folders, docs, and scripts.
- API scaffold includes NestJS bootstrap, `/health`, and Swagger at `/swagger`.
- Web scaffold includes landing page and `/health` route.
- Worker, docs-service, and connector-gateway run as health-enabled service stubs.
- Edge-agent (Go) scaffold supports generic CSV -> gateway event flow.
- Prisma baseline schema copied from source-of-truth document and `0001_init` SQL baseline generated.
- Public OSS repo files added (`LICENSE` Apache-2.0, contribution/community/security docs, templates).

## Validation Results

- `corepack pnpm -r lint`: passed
- `corepack pnpm -r typecheck`: passed
- `corepack pnpm -r test`: passed (scaffold placeholders + API utility tests)
- `corepack pnpm -r build`: passed
- `corepack pnpm --filter @korean-erp/api prisma:generate`: passed
- `docker compose -f deploy/compose/docker-compose.yml config`: passed
- `cd agents/edge-agent && GOCACHE=/tmp/go-build go test ./...`: passed
- `helm lint deploy/helm/korean-erp`: not run (`helm` binary not installed in this environment)
- `pnpm lint` via root turbo script: not runnable in this sandbox because turbo could not resolve a `pnpm` binary path

## Boot Commands

```bash
make bootstrap
cp .env.example .env
pnpm dev
```

Compose:

```bash
cp deploy/compose/.env.example deploy/compose/.env
make compose-up
```

## Next Implementation Steps (Phase 2)

1. Implement foundational business modules in API: `auth`, `org`, `employee`, `audit`.
2. Add local auth + OIDC-ready abstraction and RBAC role enforcement.
3. Implement company/department/employee CRUD with audit logging and masking helpers.
4. Add web screens for login, org/dept/employee management.
5. Expand Swagger docs and real tests for module flows.

Recommended next run prompt: `PROMPT03.md`.

## Status Log

- Completed bootstrap/foundation phase on 2026-03-13.

---

# PROMPT03 Execution (Foundational Business Modules)

Date: 2026-03-13

## Scope for This Run

- Implement `auth`, `org`, `employee`, `audit` modules only
- Keep global architecture constraints from `PROMPT01.md`

## Implemented

- API:
  - Local auth login/logout/me with session token storage (`UserSession`)
  - OIDC-ready auth provider interface/stub for future enterprise extension
  - RBAC guard + role decorator (`SUPER_ADMIN`, `ORG_ADMIN`, `HR_MANAGER`, `APPROVER`, `EMPLOYEE`)
  - Swagger company-context header docs on secured endpoints (`x-company-id`)
  - Org APIs: company/legal entity/business site/department CRUD + tree
  - Employee APIs: employee CRUD + position/job-title APIs
  - Audit log write path for create/update/delete and auth-sensitive actions
  - Masking helpers for sensitive employee fields
  - Swagger docs for implemented endpoints
- Web:
  - Login page
  - Company list/detail pages
  - Department list/tree page
  - Employee list/detail/create/edit pages
- Seeds:
  - Seeded users and credentials for local auth
  - Korean sample org structure, employees, departments, positions, titles
- Tests:
  - API utility tests for password hashing/verification, masking, and header parsing
  - API service tests for auth login flow, org access/tree logic, and employee masking/audit behavior
  - API guard tests for role enforcement and session auth context resolution (valid, missing token, expired session, invalid company context)

## Validation Snapshot

- `corepack pnpm -r lint` passed
- `corepack pnpm -r typecheck` passed
- `corepack pnpm -r test` passed (scaffold placeholders in some apps/packages + API utility tests)
- `corepack pnpm --filter @korean-erp/api test` passed (real PROMPT03 utility tests)
- `corepack pnpm --filter @korean-erp/api test` passed (utility + service tests)
- `corepack pnpm -r build` passed
- `corepack pnpm --filter @korean-erp/api exec tsc --noEmit --target ES2022 --module CommonJS --moduleResolution Node --esModuleInterop prisma/seeds/core.seed.ts prisma/seeds/korean-sample.seed.ts` passed

## Next Recommended Prompt

- `PROMPT04.md`

---

# PROMPT04 Execution Plan (Document / File / Approval Vertical Slice)

Date: 2026-03-13
Scope source: `PROMPT01.md` + `korean-self-hosted-erp-starter-structure-and-schema.md` + `PROMPT04.md`

## Objective

Implement a working end-to-end slice for files, documents, approvals, and signatures with JSON+HTML+PDF canonical document flow.

## In Scope (This Run)

- API modules: `files`, `documents`, `approvals`, `signatures`
- MinIO-backed file upload/download + metadata persistence (`FileObject`)
- Document creation from template + versioning + attachment linking
- Approval line/step/action workflow: submit, approve, reject, cancel, resubmit
- Signature asset registration from uploaded files
- HTML template rendering + PDF generation pipeline
- Sample document templates:
  - leave request
  - expense approval
  - attendance correction
  - employment certificate
  - overtime request
- Web UI for upload, document create/submit, approval action, PDF download
- Swagger docs for new endpoints
- Seed updates for templates/sample approvals
- Tests for core service/flow behavior
- HWPX-first adapter scaffolding note + legacy HWP fallback TODO boundary

## Out of Scope (This Run)

- PROMPT05+ domains (attendance normalization deepening, finance expansion, etc.)
- Full OCR/editor workflows
- Large workflow engine generalization beyond required approval actions

## Execution Steps

1. Implement storage abstraction and MinIO adapter in API (`common/storage`) and wire env config.
2. Build `files` module endpoints for upload/download/metadata and audit logging.
3. Build `documents` module endpoints for template listing, document draft creation, versioning, attachments, PDF rendering.
4. Build `approvals` module endpoints for line setup + submit/approve/reject/cancel/resubmit with status transitions and audit logs.
5. Build `signatures` module endpoints for signature/seal asset registration and listing.
6. Extend `docs-service` with HTML-to-PDF generation endpoint and template artifacts.
7. Add web screens/routes for file upload, document create, approval routing/action, PDF download.
8. Update seeds (templates + sample records), API docs references, and README sections if setup/architecture changes.
9. Add/extend tests for service flows and run full workspace validation.

## Validation Targets

- `pnpm -r lint`
- `pnpm -r typecheck`
- `pnpm -r test`
- `pnpm -r build`

## Acceptance Checklist

- [ ] File upload/download works against local MinIO stack
- [ ] Document can be created from template and stored with version
- [ ] Document version attachments can be added/listed
- [ ] Approval submit/approve/reject flow works with status updates
- [ ] Rendered PDF is generated and downloadable
- [ ] Audit logs are written for key mutations in this slice
- [ ] Swagger includes file/document/approval/signature endpoints
- [ ] Web screens exist for the required user flow

---

# PROMPT04 Completion Plan (Validation-Green Then Scope Completion)

Date: 2026-03-13
Scope source: `PROMPT01.md` + `korean-self-hosted-erp-starter-structure-and-schema.md` + `PROMPT04.md`

## Objective

Complete remaining PROMPT04 vertical-slice deliverables on top of current baseline without expanding into PROMPT05+.

## Ordered Steps

1. Re-validate current repository state with:
   - `pnpm -r lint`
   - `pnpm -r typecheck`
   - `pnpm -r test`
   - `pnpm -r build`
2. If any command fails, apply minimal scope fixes only until all four are green.
3. Complete PROMPT04 only:
   - finish document/approval web UI flow (upload, create, route, submit, approve/reject, PDF download)
   - ensure templates/seeds/migrations/tests and Swagger docs are aligned
   - keep modular-monolith boundary and audit-first mutations
   - keep HWPX-first adapter boundary with legacy HWP fallback scaffold only
4. Re-run the same four validation commands and require green before finish.

## Out of Scope

- Any PROMPT05+ domain work
- Premature module/service splitting beyond modular monolith

## Completion Notes

- Re-validation before implementation:
  - `pnpm -r lint` passed
  - `pnpm -r typecheck` passed
  - `pnpm -r test` passed
  - `pnpm -r build` passed
- PROMPT04 completion in this run:
  - web UI routes implemented: `/files`, `/documents`, `/approvals`
  - Korean sample seeds expanded to 5 required document templates
  - PROMPT04-focused API tests added
  - docs/api endpoint reference updated
- Final validation after implementation:
  - `pnpm -r lint` passed
  - `pnpm -r typecheck` passed
  - `pnpm -r test` passed
  - `pnpm -r build` passed

---

# PROMPT05 Execution Plan (Attendance / Leave / Integrations / Edge-Agent)

Date: 2026-03-14  
Scope source: `PROMPT01.md` + `korean-self-hosted-erp-starter-structure-and-schema.md` + `PROMPT05.md`

## Objective

Deliver a working vertical slice for attendance ingestion and normalization, leave/correction requests, generic attendance integration contracts, and a practical Go edge-agent CSV flow.

## Ordered Steps

1. Re-validate workspace before implementation:
   - `pnpm -r lint`
   - `pnpm -r typecheck`
   - `pnpm -r test`
   - `pnpm -r build`
2. Implement API attendance and leave domain endpoints:
   - raw attendance ingestion (single + CSV import)
   - raw event list / normalized ledger list
   - shift policy list/create/update
   - leave request create/list
   - attendance correction create/list
3. Implement normalization worker flow:
   - immutable raw event preservation
   - dedupe-safe normalization to ledger
   - policy version capture in ledger rows
4. Integrations boundary:
   - add generic ADT/S1-like ingestion contract types + service adapter entrypoint
   - keep vendor-specific logic in clearly marked stubs only
5. Edge-agent scaffold hardening (Go):
   - watch local CSV directory
   - map external IDs via config mapping file
   - send events to integration ingress
   - persist failed sends in local buffer and retry
6. Web UI additions:
   - raw attendance events page
   - attendance ledger page
   - leave request page
   - attendance correction page
   - basic shift policy page
7. Update Swagger docs, seeds, and tests for the new slice.
8. Re-run validations and keep all green:
   - `pnpm -r lint`
   - `pnpm -r typecheck`
   - `pnpm -r test`
   - `pnpm -r build`

## Constraints

- Keep API as modular monolith.
- Reuse existing document/approval flow where practical for leave/correction workflows.
- Write audit logs for important mutations.
- Preserve HWPX-first posture and HWP fallback boundary.
- Do not start PROMPT06 or later in this run.

## Completion Snapshot

- Implemented API endpoints:
  - `/integrations/attendance/raw`, `/integrations/attendance/raw/batch`, `/integrations/attendance/raw/csv`
  - `/attendance/raw-events`, `/attendance/ledgers`, `/attendance/shift-policies` (list/create/version update)
  - `/leave/policies`, `/leave/requests` (create/list), `/attendance-corrections` (create/list)
- Added worker attendance normalization job:
  - converts immutable raw events into ledger rows
  - records policy version used for normalization
  - links source raw events and writes audit logs
- Added integration/edge flow:
  - generic ADT/S1-like adapter contract and normalization
  - connector-gateway forwarding to API ingress with shared key
  - edge-agent CSV directory watch, external ID mapping, and local failed-send buffer retry
- Added web screens:
  - `/attendance/raw`
  - `/attendance/ledger`
  - `/leave`
  - `/attendance/corrections`
  - `/attendance/shift-policies`
- Added/updated seed and tests:
  - employee external identity + shift assignment seed data
  - API tests for attendance service, integrations service, leave service

## Final Validation

- `pnpm -r lint` passed
- `pnpm -r typecheck` passed
- `pnpm -r test` passed
- `pnpm -r build` passed

---

# PROMPT06 Execution Plan (Expenses / Finance / Import-Export)

Date: 2026-03-14  
Scope source: `PROMPT01.md` + `korean-self-hosted-erp-starter-structure-and-schema.md` + `PROMPT06.md`

## Objective

Deliver a working vertical slice for expense claims, starter accounting (COA + journal entry), and import/export job flows with audit logs and Swagger coverage.

## Ordered Steps

1. Re-validate current repository baseline:
   - `pnpm -r lint`
   - `pnpm -r typecheck`
   - `pnpm -r test`
   - `pnpm -r build`
2. Implement API scope for `expenses`, `finance`, `import-export`:
   - expense claim create/list/detail (+ `ExpenseItem`, `FileObject` receipt linking)
   - chart of accounts list
   - journal entry create/list/detail (`JournalEntry`, `JournalEntryLine`)
   - import job create/list/detail with CSV/XLSX starter parser for at least one entity type
   - import row-level validation/error reporting (`ImportJobRow`)
   - export job create/list/detail with CSV/JSON starter output for at least one list view
3. Ensure mutation audit logs for finance + import/export actions.
4. Update seeds/docs:
   - confirm starter COA seed and add PROMPT06 endpoint docs
5. Add/extend tests for core service behaviors in this slice.
6. Implement web UI screens:
   - expense claim create/list/detail
   - chart of accounts list
   - journal entry create/list/detail
   - import jobs
   - export jobs
7. Re-run final validations and require all green:
   - `pnpm -r lint`
   - `pnpm -r typecheck`
   - `pnpm -r test`
   - `pnpm -r build`

## Constraints

- Keep API as modular monolith.
- Reuse existing file/document infrastructure where practical.
- Keep finance scope minimal but extensible.
- Do not start PROMPT07 or later in this run.

## Validation Snapshot (Pre-Implementation)

- `pnpm -r lint` passed
- `pnpm -r typecheck` passed
- `pnpm -r test` passed
- `pnpm -r build` passed

---

# PROMPT07 Execution Plan (Finalization / Docs / Operability)

Date: 2026-03-14  
Scope source: `PROMPT01.md` + `korean-self-hosted-erp-starter-structure-and-schema.md` + `PROMPT07.md`

## Objective

Finalize the repository so another engineer can clone, run, seed, and explore the system confidently, with clear architecture/ops/security documentation and minimal smoke coverage.

## Ordered Steps

1. Re-validate current repository baseline:
   - `pnpm -r lint`
   - `pnpm -r typecheck`
   - `pnpm -r test`
   - `pnpm -r build`
2. Refresh docs and runbook quality for public OSS usability:
   - improve README language split and setup/architecture alignment
   - add architecture diagrams and clear phase roadmap
   - extend ADR and operations docs (seed, backup/restore, production env, security checklist, compose/helm notes)
3. Add minimal smoke/e2e-style tests for boot-time confidence:
   - API `/health` and Swagger/OpenAPI availability checks
   - docs-service `/health` and `/render` contract smoke checks
4. Ensure sample environment files and template/seed guidance are explicit and reproducible.
5. Re-run validations and keep all green:
   - `pnpm -r lint`
   - `pnpm -r typecheck`
   - `pnpm -r test`
   - `pnpm -r build`

## Constraints

- Implement only PROMPT07 scope.
- Keep API as modular monolith.
- Keep README setup and architecture sections aligned between English and Korean.
- Preserve HWPX-first posture and OSS hygiene.

## Completion Snapshot

- Added PROMPT07 finalization documentation:
  - architecture diagrams
  - deployment/runbook docs (compose + helm values)
  - seeding, backup/restore, production notes, security checklist
  - roadmap and smoke-test runbook
- Added smoke/e2e baseline:
  - docs-service runtime smoke tests (`apps/docs-service/test/server.smoke.test.ts`)
  - stack smoke script (`scripts/smoke-stack.sh`, `make smoke`)
- README structure normalized:
  - `README.md` (English canonical)
  - `README.ko.md` (Korean)
  - `README.en.md` (English mirror)
- Validation:
  - `pnpm -r lint` passed
  - `pnpm -r typecheck` passed
  - `pnpm -r test` passed
  - `pnpm -r build` passed
  - `docker compose -f deploy/compose/docker-compose.yml config` passed

---

# v0.1.0-alpha.0 Prerelease Preparation Plan

Date: 2026-03-14  
Scope source: `PROMPT01.md` + `AGENTS.md` + release-prep request

## Objective

Prepare the first public prerelease documentation and presentation layer for `v0.1.0-alpha.0` without changing product scope or remote GitHub state.

## Ordered Steps

1. Re-validate baseline (`lint`, `typecheck`, `test`, `build`) and keep current green status.
2. Improve `README.md` (EN) and `README.ko.md` (KO) for public prerelease presentation:
   - project status
   - implemented core modules
   - screenshots
   - quickstart
   - roadmap
   - support/contributing links
3. Handle screenshots with practical fallback policy:
   - capture real screenshots only if stable in this environment
   - otherwise add repeatable capture guide under `docs/screenshots/README.md` and README TODO placeholders
4. Add release-prep docs:
   - `CHANGELOG.md`
   - `docs/releases/v0.1.0-alpha.0.md` (draft prerelease notes)
   - `docs/releases/README.md` (release checklist)
5. Re-run validations and keep all passing.

## Constraints

- No new product scope beyond release prep.
- No remote GitHub mutations (no tags/releases/push-side actions).
- Keep README EN/KO structure aligned.

## Completion Snapshot

- Updated prerelease-facing README structure for both EN/KO:
  - project status
  - implemented module summary
  - screenshots section
  - quickstart
  - roadmap
  - support/contributing links
- Screenshot outcome for this run: fallback documentation (no fabricated images)
  - added `docs/screenshots/README.md` with repeatable capture guide
  - added TODO screenshot path placeholders in README files
- Added release prep docs:
  - `CHANGELOG.md`
  - `docs/releases/v0.1.0-alpha.0.md` (draft prerelease notes)
  - `docs/releases/README.md` (release checklist)
- Added `VISION.ko.md` compatibility alias pointing to Korean canonical vision doc.
- Validation (pre and post implementation):
  - `pnpm -r lint` passed
  - `pnpm -r typecheck` passed
  - `pnpm -r test` passed
  - `pnpm -r build` passed
