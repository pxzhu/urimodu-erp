# Production Environment Notes

This repository is self-hosted first. Use Docker Compose for single-node/small setups and Helm for Kubernetes.

## Helm Tooling Path

- Use `./scripts/helmw.sh` to avoid hard local Helm dependency in day-to-day flows.
- Wrapper behavior:
  - local `helm` exists -> uses local binary
  - local `helm` missing + Docker exists -> runs `alpine/helm` container
- Helpful targets:
  - `make helm-lint`
  - `make helm-template`

## Environment Baseline

At minimum configure:

- `DATABASE_URL`
- `REDIS_URL`
- `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`
- `DOCS_SERVICE_BASE_URL`
- `INTEGRATION_INGEST_API_KEY`
- `EDGE_AGENT_SHARED_KEY`
- `DEFAULT_COMPANY_CODE`
- `WORKER_TICK_MS` (optional; default `60000`)
- `WORKER_JOB_STALE_MS` (optional; default `600000`, stale RUNNING import/export retry window)

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

## Import/Export Background Jobs

- Import/export create API calls enqueue jobs in `PENDING` state.
- Worker processes jobs asynchronously and advances lifecycle:
  - `PENDING` -> `RUNNING` -> `SUCCEEDED|FAILED`
- Keep worker service running in production; otherwise import/export jobs remain queued.
- Monitor worker logs and `ImportJob`/`ExportJob` status tables for stuck jobs.
