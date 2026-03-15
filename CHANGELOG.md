# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and follows Semantic Versioning for release naming.

## [0.1.1-alpha.1] - 2026-03-15 (Draft)

Post-release stabilization hardening after `v0.1.0-alpha.0`.

### Changed

- approval outcomes now synchronize linked business statuses:
  - `LeaveRequest`
  - `AttendanceCorrection`
- shift policy starter accepts overnight windows and worker normalization covers cross-midnight grouping for covered starter scenarios
- import/export execution moved to asynchronous worker flow with lifecycle transitions:
  - `PENDING` -> `RUNNING` -> `SUCCEEDED|FAILED`

### Added

- worker job processing for queued vendor import jobs:
  - row-level `ImportJobRow` success/failure persistence
  - summary/error updates and audit logs
- worker job processing for queued expense export jobs:
  - result file creation and `resultFileId` tracking
  - summary/error updates and audit logs
- worker test baseline:
  - overnight normalization behavior
  - import job row-level failure lifecycle
  - export job result-file persistence lifecycle
- smoke-stack coverage expansion:
  - login/authenticated checks
  - core API visibility checks
  - core web route load checks

### Documentation

- added `docs/releases/v0.1.1-alpha.1.md` draft notes
- updated API/testing/ops/security docs for stabilization behavior
- updated plan log for stabilization execution

### Known Limitations

- import/export job polling remains interval-based worker starter behavior (not a full external queue broker yet)
- e2e browser automation remains intentionally minimal in alpha stage

## [0.1.0-alpha.0] - 2026-03-14 (Draft)

First public prerelease candidate.

### Added

- PROMPT02 bootstrap foundation:
  - pnpm + Turborepo monorepo
  - apps/web, apps/api, apps/worker, apps/docs-service, apps/connector-gateway
  - agents/edge-agent scaffold (Go)
  - Docker Compose and Helm skeleton
  - OSS governance files and CI skeleton
- PROMPT03 foundational business modules:
  - auth/session + RBAC
  - org/department/legal-entity/business-site
  - employee master + masking + audit logging
- PROMPT04 document and approval vertical slice:
  - MinIO-backed file object flow
  - document template/version/attachment models
  - approval submit/approve/reject flows
  - signature asset registration
  - HTML template to PDF rendering pipeline
- PROMPT05 attendance and leave vertical slice:
  - raw attendance ingestion API + CSV import
  - attendance ledger normalization worker
  - shift policies, leave requests, attendance corrections
  - generic integration contract + edge-agent CSV flow
- PROMPT06 expenses, finance, and import/export vertical slice:
  - expense claims and evidence linking
  - chart of accounts starter + journal entries
  - import job + row-level validation/reporting
  - export job starter for list views
- PROMPT07 finalization baseline:
  - architecture ADR enrichment
  - operations/security docs
  - smoke test script and docs-service smoke tests

### Documentation

- English/Korean README alignment for setup and architecture
- Vision documents and roadmap notes
- Deployment and ops runbooks (compose, helm values, backup/restore, security)
- Real prerelease README screenshots captured under `docs/screenshots/` with recapture guide

### Known Limitations

- This is an alpha prerelease, not production GA.
- Some package-level tests remain placeholders where domain logic has not yet been implemented.
- Helm linting depends on local Helm binary availability.
