# Docker Compose Guide

Compose file: `deploy/compose/docker-compose.yml`

## Start Local Stack

```bash
cp deploy/compose/.env.example deploy/compose/.env
docker compose -f deploy/compose/docker-compose.yml up -d --build
```

Services included:

- `postgres`
- `redis`
- `minio`
- `minio-init`
- `api`
- `web`
- `worker`
- `connector-gateway`
- `docs-service`

## Validate Configuration

```bash
docker compose -f deploy/compose/docker-compose.yml config
```

## Stop and Clean

```bash
docker compose -f deploy/compose/docker-compose.yml down -v
```

## Post-Boot Quick Checks

- `http://localhost:3000/health`
- `http://localhost:4000/health`
- `http://localhost:4000/swagger`
- `http://localhost:4100/health`
- `http://localhost:4200/health`
- `http://localhost:4300/health`
