# Prisma Migrations

Run the following after setting `DATABASE_URL`:

```bash
pnpm --filter @korean-erp/api prisma:migrate:dev --name init
```

This repository keeps `apps/api/prisma/schema.prisma` as the baseline source of truth for the initial phase.
