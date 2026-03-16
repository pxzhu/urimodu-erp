# Screenshot Inventory And Capture Guide

This directory contains real UI screenshots captured from a seeded local stack.
Current default theme baseline is light mode (dark mode remains toggleable in UI).

For full PR/release QA evidence across all pages/features, use `docs/qa/README.md` and archive captures under `docs/qa/runs/<run-id>/screenshots/`.

## Inventory

### Admin View

| File | Route | Description |
| --- | --- | --- |
| `docs/screenshots/admin-00-ai-native-landing.png` | `/` | 2026 AI-native ERP landing with hero/story/parallax/cards/CTA flow |
| `docs/screenshots/admin-01-employees-directory.png` | `/employees` | Employee directory with admin actions (create/edit/deactivate) |
| `docs/screenshots/admin-02-documents-and-templates.png` | `/documents` | Template-field table based document flow |
| `docs/screenshots/admin-03-approvals-inbox.png` | `/approvals` | Approval inbox with action controls |
| `docs/screenshots/admin-04-attendance-ledger.png` | `/attendance/ledger` | Normalized attendance ledger with seeded rows |
| `docs/screenshots/admin-05-expense-claims.png` | `/expenses` | Expense claim list and receipt upload-friendly form |
| `docs/screenshots/admin-06-workspace-hub.png` | `/workspace` | WEHAGO-inspired module launcher workspace with favorites/search |
| `docs/screenshots/admin-07-collaboration-hub.png` | `/collaboration` | Collaboration hub tabs (messenger/meeting/mail/drive/notes/board) |

### User View

| File | Route | Description |
| --- | --- | --- |
| `docs/screenshots/user-00-ai-native-landing.png` | `/` | 2026 AI-native ERP landing in user session |
| `docs/screenshots/user-01-employees-directory.png` | `/employees` | Employee directory in user view (restricted actions) |
| `docs/screenshots/user-02-documents-and-templates.png` | `/documents` | Document flow in user view |
| `docs/screenshots/user-03-approvals-inbox.png` | `/approvals` | Personal approvals inbox view |
| `docs/screenshots/user-04-attendance-ledger.png` | `/attendance/ledger` | Attendance ledger in user view |
| `docs/screenshots/user-05-expense-claims.png` | `/expenses` | Expense claims in user view |
| `docs/screenshots/user-06-workspace-hub.png` | `/workspace` | Workspace hub in user role |
| `docs/screenshots/user-07-collaboration-hub.png` | `/collaboration` | Collaboration hub in user role |

## Capture Method Used

- Capture date: 2026-03-16 (Asia/Seoul)
- Viewport: desktop, `1512x982`
- Browser automation: Playwright (`@playwright/test` via `pnpm dlx`)
- Mode: headed (`--headed`) to visually verify UI before capture
- Accounts:
  - admin: `admin@acme.local`
  - user: `employee@acme.local`

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
set -a; source .env; set +a; pnpm --filter @korean-erp/api start
pnpm --filter @korean-erp/web dev
```

3. Capture screenshots:

```bash
set -a; source .env; set +a
pnpm dlx @playwright/test test scripts/capture-role-screenshots.spec.ts --headed --reporter=line --workers=1
```

4. Verify output files in `docs/screenshots/`.

## Notes

- Do not fabricate screenshots. Use real UI from a running local stack only.
- The capture script waits for data rows and loading text disappearance before taking screenshots.
- Keep seeded/sample rows visible (avoid empty-state captures).
