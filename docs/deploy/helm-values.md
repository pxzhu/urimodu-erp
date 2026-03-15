# Helm Values Reference

Chart path: `deploy/helm/korean-erp`

## Core Values

- `api.image.repository`, `api.image.tag`, `api.image.pullPolicy`
- `web.image.repository`, `web.image.tag`, `web.image.pullPolicy`
- `worker.image.repository`, `worker.image.tag`, `worker.image.pullPolicy`

## Environment Values

- `api.env.*`
- `web.env.*`
- `worker.env.*`
- `api.envFromSecrets[]`, `web.envFromSecrets[]`, `worker.envFromSecrets[]`

Use `envFromSecrets` for production secrets and keep plaintext values for non-sensitive defaults only.

## Networking

- `api.service.type`, `api.service.port`
- `web.service.type`, `web.service.port`
- `ingress.enabled`
- `ingress.className`
- `ingress.annotations`
- `ingress.hosts[]`
- `ingress.tls[]`

## Persistence

- `persistence.enabled`
- `persistence.storageClassName`
- `persistence.accessMode`
- `persistence.size`
- `persistence.mountPath`

## Resources and Scheduling

- `resources`
- `nodeSelector`
- `tolerations`
- `affinity`

## Example Installation

```bash
./scripts/helmw.sh install korean-erp deploy/helm/korean-erp \
  --set api.image.repository=ghcr.io/your-org/korean-erp-api \
  --set web.image.repository=ghcr.io/your-org/korean-erp-web \
  --set worker.image.repository=ghcr.io/your-org/korean-erp-worker
```

## Local Helm Dependency Reduction

- Preferred wrapper: `./scripts/helmw.sh`
  - uses local `helm` if installed
  - otherwise runs `alpine/helm` through Docker
- Make targets:
  - `make helm-lint`
  - `make helm-template`
