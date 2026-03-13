Continue the self-hosted Korean ERP platform project.

Task:
Implement the foundational business modules:
- auth
- org
- employee
- audit

Requirements:
- NestJS API modules for auth, org, employee, audit
- Prisma models and migrations
- local auth for development
- OIDC-ready abstraction interface for future enterprise auth
- RBAC with roles such as:
  - super_admin
  - org_admin
  - hr_manager
  - approver
  - employee
- company / legal entity / business site / department / employee models
- employee number support
- position and title as separate concepts
- Korean sample seed data
- audit logs for create/update/delete and auth-sensitive actions
- masked serialization helpers for sensitive data fields
- basic web UI screens for:
  - login
  - company list/detail
  - department list/tree
  - employee list/detail/create/edit
- Swagger docs for all endpoints

Acceptance:
- Seeded admin can sign in
- Company, department, employee CRUD works
- Audit logs are written
- Seed data contains realistic Korean examples
- README and Swagger reflect the auth and org flow
Do not stay at architecture-only level. Create actual code, migrations, tests, seeds, Docker files, Helm files, and runnable documentation. Prefer a working vertical slice over broad placeholders.
