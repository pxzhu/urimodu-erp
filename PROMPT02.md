Continue the self-hosted Korean ERP platform project.

Task:
Create the repository skeleton and deployment/dev foundations first.

Deliverables:
- pnpm workspace + Turborepo monorepo
- apps/web (Next.js)
- apps/api (NestJS)
- apps/worker
- apps/docs-service
- apps/connector-gateway
- agents/edge-agent (Go)
- packages/ui, packages/domain, packages/contracts, packages/shared, packages/config
- deploy/compose
- deploy/helm
- docs/adr
- scripts
- README.md and README.ko.md
- example env files
- Makefile or task runner

Requirements:
- Docker Compose must include postgres, redis, minio, api, web, worker
- Helm chart must be installable with configurable image tags, env vars, ingress, persistence, secrets references
- API and web should boot with placeholder health endpoints/pages
- Add `/health` endpoint and a basic landing page
- Add Swagger bootstrapping in API
- Add CI skeleton for lint + test + typecheck
- Add docs/PLAN.md and initial ADRs

Important:
- Use clean monorepo conventions
- Make local bootstrap simple
- Keep it production-minded, not demo-only
- Do not implement business modules deeply yet; focus on solid scaffolding

When done:
Summarize repo structure, boot commands, and next implementation steps in docs/PLAN.md.
Do not stay at architecture-only level. Create actual code, migrations, tests, seeds, Docker files, Helm files, and runnable documentation. Prefer a working vertical slice over broad placeholders.
