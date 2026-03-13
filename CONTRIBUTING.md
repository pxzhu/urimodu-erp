# Contributing

Thank you for your interest in contributing to this project.

## Before You Start

- Read the architecture baseline documents:
  - `korean-self-hosted-erp-blueprint.md`
  - `korean-self-hosted-erp-starter-structure-and-schema.md`
  - `PROMPT01.md`
- Follow repository conventions in `AGENTS.md`.
- Open an issue before large or breaking changes.

## Local Setup

```bash
make bootstrap
cp .env.example .env
pnpm dev
```

## Development Rules

- Use `pnpm` and `turbo` commands.
- Keep the API as a modular monolith unless a separation is justified.
- Preserve HWPX-first strategy; keep legacy HWP support as fallback adapter only.
- Keep docs and setup aligned across `README.md` and `README.en.md`.
- Never commit secrets or customer/vendor-private assets.

## Pull Request Checklist

- [ ] Change is scoped and documented
- [ ] Lint, typecheck, and test pass
- [ ] Docs updated (README/ADR/ops/api as needed)
- [ ] No sensitive data or credentials included
- [ ] Backward compatibility impact is described

## Commit and PR Style

- Prefer small, focused PRs.
- Use clear commit messages (`feat:`, `fix:`, `docs:`, `chore:`).
- Include screenshots or logs when changing behavior.
