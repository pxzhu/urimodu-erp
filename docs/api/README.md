# API Docs

- Swagger UI: `/swagger` on the API service
- Health endpoint: `/health`

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

### Signatures

- `GET /signatures/mine`
- `POST /signatures`

## Auth and RBAC Notes

- Use bearer token from `/auth/login` response: `Authorization: Bearer <token>`
- Pass selected company context: `x-company-id: <companyId>`
- Role enforcement is enabled for write/admin endpoints.
- Swagger secured endpoints include a shared `x-company-id` header doc for company-scoped access.
