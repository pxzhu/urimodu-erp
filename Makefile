.PHONY: bootstrap dev build lint typecheck test compose-up compose-down seed reset

bootstrap:
	corepack enable
	pnpm install

dev:
	pnpm dev

build:
	pnpm build

lint:
	pnpm lint

typecheck:
	pnpm typecheck

test:
	pnpm test

compose-up:
	docker compose -f deploy/compose/docker-compose.yml up -d --build

compose-down:
	docker compose -f deploy/compose/docker-compose.yml down -v

seed:
	pnpm --filter @korean-erp/api prisma:seed

reset:
	rm -rf node_modules apps/*/node_modules packages/*/node_modules
