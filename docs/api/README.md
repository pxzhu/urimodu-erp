# API Docs

- Swagger UI: `/swagger` on the API service
- OpenAPI JSON: `/swagger-json`
- Health endpoint: `/health`

## Quick Availability Check

```bash
curl -fsS http://localhost:4000/health
curl -fsS http://localhost:4000/swagger-json
```

## Implemented Foundational Endpoints

### Auth

- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

### Org

- `GET /companies`
- `POST /companies`
- `GET /companies/:id`
- `PATCH /companies/:id`
- `GET /legal-entities?companyId=...`
- `POST /legal-entities`
- `GET /business-sites?companyId=...`
- `POST /business-sites`
- `GET /departments?companyId=...`
- `GET /departments/tree?companyId=...`
- `POST /departments`
- `PATCH /departments/:id`
- `DELETE /departments/:id`

### Employee

- `GET /employees?companyId=...`
- `POST /employees`
- `GET /employees/:id`
- `PATCH /employees/:id`
- `DELETE /employees/:id`
- `GET /positions?companyId=...`
- `POST /positions`
- `GET /job-titles?companyId=...`
- `POST /job-titles`

### Audit

- `GET /audit-logs`

## PROMPT04 Endpoints (Document / Approval Vertical Slice)

### Files

- `POST /files/upload`
- `GET /files`
- `GET /files/:id`
- `GET /files/:id/download`

### Documents

- `GET /document-templates`
- `GET /documents`
- `GET /documents/:id`
- `POST /documents`
- `POST /documents/:id/versions`
- `POST /documents/:id/render-pdf`

### Approvals

- `POST /approvals/lines`
- `GET /approvals/lines/:id`
- `POST /approvals/lines/:id/submit`
- `POST /approvals/lines/:id/approve`
- `POST /approvals/lines/:id/reject`
- `POST /approvals/lines/:id/cancel`
- `POST /approvals/lines/:id/resubmit`
- `GET /approvals/inbox`

Approval terminal outcomes are synchronized back to linked business records:

- linked `LeaveRequest` status sync (`APPROVED`, `REJECTED`, `CANCELED`, `REQUESTED`)
- linked `AttendanceCorrection` status sync (`APPROVED`, `REJECTED`, `CANCELED`, `REQUESTED`)

### Signatures

- `GET /signatures/mine`
- `POST /signatures`

## PROMPT05 Endpoints (Attendance / Leave / Integrations / Edge-Agent Slice)

### Integrations

- `POST /integrations/attendance/raw`
- `POST /integrations/attendance/raw/batch`
- `POST /integrations/attendance/raw/csv` (multipart CSV import)

### Attendance

- `GET /attendance/raw-events`
- `GET /attendance/ledgers`
- `GET /attendance/shift-policies`
- `POST /attendance/shift-policies`
- `PATCH /attendance/shift-policies/:id`

Shift policy starter now supports overnight windows (for example `22:00` to `06:00`) and normalization groups post-midnight events into the correct work date for covered scenarios.

### Leave + Corrections

- `GET /leave/policies`
- `GET /leave/requests`
- `POST /leave/requests`
- `GET /attendance-corrections`
- `POST /attendance-corrections`

## PROMPT06 Endpoints (Expenses / Finance / Import-Export Slice)

### Expenses

- `GET /expenses/claims`
- `GET /expenses/claims/:id`
- `POST /expenses/claims`

### Finance

- `GET /finance/accounts`
- `GET /finance/vendors`
- `POST /finance/vendors`
- `GET /finance/cost-centers`
- `POST /finance/cost-centers`
- `GET /finance/projects`
- `POST /finance/projects`
- `GET /finance/journal-entries`
- `GET /finance/journal-entries/:id`
- `POST /finance/journal-entries`

### Import / Export

- `GET /import-export/import-jobs`
- `GET /import-export/import-jobs/:id`
- `POST /import-export/import-jobs/vendors` (source `FileObject` CSV/XLSX)
- `GET /import-export/export-jobs`
- `GET /import-export/export-jobs/:id`
- `POST /import-export/export-jobs/expense-claims` (CSV/JSON)

Job execution model:

- API create endpoints enqueue jobs as `PENDING`
- worker claims and transitions jobs to `RUNNING`
- worker finalizes as `SUCCEEDED` or `FAILED`
- import keeps row-level status/error reporting via `ImportJobRow`
- export persists `resultFileId` and summary metadata

## Auth and RBAC Notes

- Use bearer token from `/auth/login` response: `Authorization: Bearer <token>`
- Pass selected company context: `x-company-id: <companyId>`
- Role enforcement is enabled for write/admin endpoints.
- Swagger secured endpoints include a shared `x-company-id` header doc for company-scoped access.
