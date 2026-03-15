# Smoke Tests

Use smoke checks after local boot or deployment changes.

## Run

```bash
./scripts/smoke-stack.sh
```

Optional overrides:

```bash
API_BASE_URL=http://localhost:4000 \
WEB_BASE_URL=http://localhost:3000 \
WORKER_BASE_URL=http://localhost:4100 \
GATEWAY_BASE_URL=http://localhost:4200 \
DOCS_BASE_URL=http://localhost:4300 \
SMOKE_LOGIN_EMAIL=admin@acme.local \
SMOKE_LOGIN_PASSWORD=ChangeMe123! \
./scripts/smoke-stack.sh
```

## What It Verifies

- Health endpoints for web/api/worker/gateway/docs-service
- Swagger OpenAPI JSON availability (`/swagger-json`)
- Docs-service template listing endpoint
- Docs-service PDF render endpoint contract
- API login flow (`/auth/login`) and authenticated context (`/auth/me`)
- Authenticated API visibility checks:
  - documents (`/documents`)
  - approvals inbox (`/approvals/inbox`)
  - attendance ledger (`/attendance/ledgers`)
  - expense claims (`/expenses/claims`)
- Web route load checks:
  - `/`
  - `/documents`
  - `/approvals`
  - `/attendance/ledger`
  - `/expenses`

If a check fails, review logs and run the command again after fixing service startup issues.
