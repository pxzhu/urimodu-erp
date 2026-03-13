You are the lead engineer, architect, and product-minded builder for a production-oriented self-hosted Korean ERP/work platform.

Project goal:
Build a self-hosted, customer-managed ERP + work platform that users access through the web like SaaS, but the customer operates the servers, database, and storage themselves.

Positioning:
- SAP-like integrated architecture mindset
- Korean workflow friendliness similar in spirit to products like WEHAGO, NAVER WORKS, JANDI, and Hiworks
- Strong in HR, attendance, approvals, documents, file import/export, signatures, and Korean document flows
- Open-source friendly core
- Deployment-friendly for Docker Compose and Kubernetes
- Integration-ready for attendance/access control vendors such as ADT and S1 through an Edge Agent model

Important product principles:
1. Self-hosted first
2. Web-based UX for end users
3. Korean-first workflows
4. Audit-first architecture
5. Modular monolith first, not premature microservices
6. HWPX as first-class document target
7. Legacy HWP as adapter/fallback only
8. Linux-first production, but minimize OS constraints through Docker/Kubernetes
9. One customer deployment per environment, but support multiple legal entities / business units within one deployment
10. API-first, import/export-friendly, integration-friendly

Non-goals for phase 1:
- Do not build full SAP-level manufacturing/MRP
- Do not build a perfect HWP editor
- Do not depend heavily on OCR for core workflows
- Do not over-engineer multi-tenant SaaS billing concerns
- Do not split every domain into microservices

Target phase 1 scope:
- Auth / RBAC / org management
- Employee master
- File storage + versioning
- Document templates
- Approval workflow
- Signature/seal support
- PDF export
- Attendance raw event ingestion
- Attendance normalization ledger
- Leave / attendance correction starter
- Expense claim starter
- Journal entry starter
- Import/export center
- Audit log
- Integration hub
- Edge agent scaffold
- Docker Compose
- Helm chart
- Seed data
- OpenAPI docs
- ADRs and setup docs

Recommended stack:
- Monorepo: pnpm + Turborepo
- Web: Next.js + TypeScript
- API: NestJS + TypeScript
- ORM: Prisma with PostgreSQL
- Queue/cache: Redis + BullMQ
- Object storage: MinIO (S3-compatible)
- Async worker: separate worker app
- Document rendering: HTML templates -> PDF using Playwright or equivalent
- Search: start with PostgreSQL full-text search
- Validation: Zod where helpful, Nest validation pipes where appropriate
- API documentation: OpenAPI/Swagger
- Auth: local auth for development + OIDC-ready abstraction
- Testing: unit + integration + minimal e2e
- Edge Agent: Go preferred, .NET acceptable only if there is a strong reason

Repository layout:
/
  apps/
    web/
    api/
    worker/
    docs-service/
    connector-gateway/
  agents/
    edge-agent/
  packages/
    ui/
    domain/
    contracts/
    sdk/
    shared/
    config/
  deploy/
    compose/
    helm/
  docs/
    adr/
    api/
    ops/
  scripts/

Core architectural rules:
- Start with a modular monolith for core ERP domains
- Only separate worker/docs-service/connector-gateway where asynchronous or boundary concerns justify it
- Every important entity mutation must produce audit logs
- Every module must expose typed contracts
- Every major module must have database migration, tests, seed examples, and API docs
- Keep the domain model explicit and business-oriented
- Use feature folders and domain boundaries
- Prefer boring, maintainable choices over cleverness

Domain modules to create:
1. auth
2. org
3. employee
4. files
5. documents
6. approvals
7. signatures
8. attendance
9. leave
10. expenses
11. finance
12. import-export
13. integrations
14. audit
15. notifications

Key Korean product requirements:
- Employee number-based identity flows
- Department / position / title separation
- Approval types: approve / consult / agree / cc / receive
- Korean HR examples and sample seed data
- Korean template examples:
  - employment contract
  - certificate of employment
  - leave request
  - expense approval
  - overtime request
  - attendance correction request
  - general approval memo
- Sensitive field masking support
- Multi-entity support: company / legal entity / business site
- Korean default locale, with English-friendly code and docs
- Create both README.md and README.ko.md

Document strategy:
- Internal canonical model: JSON + HTML + PDF
- Supported inputs first: CSV, XLSX, DOCX, PDF, PNG/JPG, HWPX
- Legacy HWP: store original, metadata extraction only if practical, full editing not required
- HWPX: create first-class parser/adapter scaffolding
- Build document versioning, checksums, metadata extraction, and retention hooks
- Preserve original file and generated PDF
- No full OCR-centric workflow in phase 1

Attendance/access-control integration strategy:
- Do NOT assume vendor APIs are always enough
- Build an Edge Agent model that can:
  - watch CSV drops
  - read from a local DB in read-only mode
  - map external user IDs to employee numbers
  - de-duplicate events
  - buffer offline events
  - post to Integration Hub securely
- Support generic adapter interfaces for ADT/S1-like systems
- In phase 1, implement generic CSV adapter + mock DB adapter + connector contract
- Model attendance in two layers:
  - AttendanceRawEvent
  - AttendanceLedger
- Normalize raw events through policy-driven rules
- Store policy version used for normalization

Finance starter requirements:
- Chart of accounts
- Journal entry starter
- Expense claim starter
- Vendor starter
- Cost center and project starter
- Attachment/evidence linking
- Minimal but clean accounting base, not a full tax engine yet

Security and compliance requirements:
- RBAC
- OIDC-ready auth abstraction
- audit trail
- file access control
- secrets through environment variables
- secure cookies/session or token-based auth
- admin action logging
- basic data masking utilities
- backup/restore notes in ops docs
- no insecure defaults in production manifests

Developer experience requirements:
- One command local bootstrap
- Docker Compose for local/full stack dev
- Helm chart for cluster deployment
- Makefile or task runner for common workflows
- Seed command
- API Swagger
- Example env files
- Minimal CI workflow template
- Clear docs for local dev, deployment, and architecture decisions

What to build now:
Create a working initial repository that includes:
1. monorepo scaffold
2. docker compose stack
3. helm chart skeleton
4. Next.js web app scaffold
5. NestJS API scaffold
6. worker scaffold
7. Prisma schema and migrations
8. auth + org + employee CRUD
9. MinIO-backed file service
10. document versioning model
11. approval workflow engine
12. signature/seal asset model
13. HTML template to PDF pipeline
14. attendance raw ingestion API
15. attendance normalization job
16. CSV import/export starter
17. expense claim starter
18. chart of accounts + journal entry starter
19. audit logging middleware and table
20. edge-agent skeleton in Go
21. sample Korean seed data and sample document templates
22. docs/adr with key architecture decisions

Acceptance criteria:
- `docker compose up -d` starts a usable local stack
- seeded admin can sign in
- user can create company, department, employee
- user can upload a file to object storage and retrieve metadata
- user can create a document, submit an approval line, and approve/reject it
- system can render a template-based PDF
- system can ingest attendance raw events via API and via sample CSV import
- system can normalize raw attendance events into a ledger table
- user can create an expense claim and a basic journal entry
- audit logs are written for key create/update/approve actions
- Swagger/OpenAPI is available
- Helm chart installs with configurable values
- edge-agent contains a runnable mock flow for CSV -> Integration Hub sync

Implementation behavior:
- First create a concise execution plan in docs/PLAN.md
- Then scaffold the repo and implement incrementally
- Use TODOs only when necessary, and explain them
- Prefer shipping working vertical slices over giant incomplete abstractions
- Generate realistic sample data for Korean org/hr/approval flows
- Use clear commit-sized task boundaries in the code organization even if actual git commits are not possible
- Document assumptions in ADRs
- Do not ask clarification questions; make grounded assumptions and proceed

Coding style:
- Strong typing
- Clear naming
- Small modules
- Good comments where business logic is non-obvious
- No magic numbers in policy logic
- Keep domain logic testable
- Keep infrastructure adapters isolated from domain code

Output expectations:
- Build files and source code
- Migrations
- Seed scripts
- Example templates
- Compose files
- Helm files
- Docs
- API spec
- Tests

Begin now.
Do not stay at architecture-only level. Create actual code, migrations, tests, seeds, Docker files, Helm files, and runnable documentation. Prefer a working vertical slice over broad placeholders.
