# Seeding Guide

## Prerequisites

- PostgreSQL is reachable by `DATABASE_URL`
- Prisma client generated (`pnpm --filter @korean-erp/api prisma:generate`)

## Run Seeds

```bash
pnpm --filter @korean-erp/api prisma:seed
```

Seed order:

1. `apps/api/prisma/seeds/core.seed.ts`
2. `apps/api/prisma/seeds/korean-sample.seed.ts`

## Seeded Login Users

Default password: `ChangeMe123!` (override with `SEED_DEFAULT_PASSWORD`)

- `admin@acme.local` (`SUPER_ADMIN`)
- `hr@acme.local` (`HR_MANAGER`)
- `manager@acme.local` (`APPROVER`)
- `employee@acme.local` (`EMPLOYEE`)

## Seeded Korean Document Templates

- `leave-request` (휴가 신청서)
- `expense-approval` (경비 승인 요청서)
- `attendance-correction` (근태 정정 요청서)
- `employment-certificate` (재직증명서)
- `overtime-request` (연장근무 신청서)

These are available in API template entities and mirrored by docs-service HTML files under `apps/docs-service/src/templates`.

## Seeded Integration Mapping Data

- `EmployeeExternalIdentity` examples for `GENERIC` provider
- Shift policy baseline: `DEFAULT_9_TO_6`
- Leave policy baseline: `ANNUAL`, `HALF_AM`, `HALF_PM`, `HOURLY`
- Starter chart of accounts and finance master data
