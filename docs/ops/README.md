# Operations Notes

This section is the practical runbook for local development and self-hosted operations.

## Runbook Index

- Seeding and sample accounts: `docs/ops/seeding.md`
- Backup and restore: `docs/ops/backup-restore.md`
- Production environment notes: `docs/ops/production.md`
- Security checklist: `docs/ops/security-checklist.md`
- Smoke tests: `docs/testing/smoke-tests.md`

## Deployment Docs

- Docker Compose guide: `docs/deploy/docker-compose.md`
- Helm values guide: `docs/deploy/helm-values.md`
- Helm wrapper script (local/dockerd fallback): `scripts/helmw.sh`

## Service Health Endpoints

- Web: `GET /health`
- API: `GET /health`
- Connector gateway: `GET /health`
- Worker: `GET /health`
- Docs service: `GET /health`

## API Discovery

- Swagger UI: `http://localhost:4000/swagger`
- OpenAPI JSON: `http://localhost:4000/swagger-json`
