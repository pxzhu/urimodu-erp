# Production Environment Notes

This repository is self-hosted first. Use Docker Compose for single-node/small setups and Helm for Kubernetes.

## Environment Baseline

At minimum configure:

- `DATABASE_URL`
- `REDIS_URL`
- `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`
- `DOCS_SERVICE_BASE_URL`
- `INTEGRATION_INGEST_API_KEY`
- `EDGE_AGENT_SHARED_KEY`
- `DEFAULT_COMPANY_CODE`

Do not use development defaults in production.

## Production Checklist

- Run with managed PostgreSQL backup policy or scheduled dumps
- Use TLS termination (ingress/proxy)
- Use secret manager or Kubernetes Secrets (never plaintext in repo)
- Restrict API access by network policy/security group
- Enable log retention and audit-log review process
- Pin container image tags (avoid floating `latest`)

## Prisma and Migrations

Use deploy migration in CI/CD or release job:

```bash
pnpm --filter @korean-erp/api prisma:migrate:deploy
```

Seed only for initial non-production bootstrap or controlled tenant setup.

## Edge-Agent in Production

- Keep agent near attendance data source network
- Rotate gateway API keys
- Persist failed-send buffer on durable volume
- Treat vendor-specific attendance logic as adapter plugin scope
