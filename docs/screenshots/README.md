# Screenshot Inventory And Capture Guide

This directory contains real UI screenshots captured for the `v0.1.0-alpha.0` prerelease branch.

## Inventory

| File | Route | Description |
| --- | --- | --- |
| `docs/screenshots/01-employees-directory.png` | `/employees` | Seeded employee directory |
| `docs/screenshots/02-documents-and-templates.png` | `/documents` | Document list + template-driven document flow UI |
| `docs/screenshots/03-approvals-inbox.png` | `/approvals` | Pending approval inbox with actionable row |
| `docs/screenshots/04-attendance-ledger.png` | `/attendance/ledger` | Normalized attendance ledger row from raw source events |
| `docs/screenshots/05-expense-claims.png` | `/expenses` | Expense claim list with seeded/sample claim |

## Capture Method Used

- Capture date: 2026-03-14 (Asia/Seoul)
- Viewport: desktop, `1440x900`
- Browser automation: Playwright (`@playwright/test` via `pnpm dlx`)
- Login account: `admin@acme.local / ChangeMe123!`

## Recapture Steps

1. Prepare environment and seed data:

```bash
cp .env.example .env
cp deploy/compose/.env.example deploy/compose/.env
docker compose -f deploy/compose/docker-compose.yml up -d postgres redis minio minio-init
pnpm --filter @korean-erp/api prisma:migrate:deploy
pnpm --filter @korean-erp/api prisma:seed
```

2. Run app services (separate terminals):

```bash
pnpm --filter @korean-erp/docs-service start
pnpm --filter @korean-erp/api start
pnpm --filter @korean-erp/worker start
pnpm --filter @korean-erp/web start
```

3. Capture screenshots:

```bash
pnpm dlx @playwright/test test scripts/capture-readme-screenshots.spec.ts --reporter=line --workers=1
```

4. Verify output files in `docs/screenshots/`.

## Notes

- Do not fabricate screenshots. Use real UI from a running local stack only.
- Keep seeded/sample rows visible (avoid empty-state captures).
- Avoid exposing private local data in browser chrome or OS UI.
