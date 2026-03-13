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

## Auth and RBAC Notes

- Use bearer token from `/auth/login` response: `Authorization: Bearer <token>`
- Pass selected company context: `x-company-id: <companyId>`
- Role enforcement is enabled for write/admin endpoints.
- Swagger secured endpoints include a shared `x-company-id` header doc for company-scoped access.
