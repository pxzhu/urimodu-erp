# Security Checklist

Use this checklist before merging major changes or cutting a release.

## Repository Hygiene

- [ ] No plaintext credentials, API keys, or private certificates committed
- [ ] `.env` files with real secrets are ignored
- [ ] `SECURITY.md` includes vulnerability reporting process
- [ ] Dependabot and CodeQL are enabled

## Runtime Configuration

- [ ] Production secrets are injected from secret stores
- [ ] Default dev keys/passwords are replaced
- [ ] Access tokens and shared keys are rotated periodically
- [ ] CORS and ingress exposure are limited to required origins

## Data and Audit

- [ ] Sensitive fields are masked in API responses where required
- [ ] Critical mutations write `AuditLog`
- [ ] Approval terminal outcomes are synchronized to linked leave/correction records with audit logs
- [ ] Backup/restore drill was executed recently
- [ ] Raw attendance source records remain immutable

## Document and File Pipeline

- [ ] MinIO bucket policy restricts public object access
- [ ] File uploads validate metadata and expected content types
- [ ] PDF render endpoints are internal or authenticated
- [ ] HWPX parser path remains primary; legacy HWP path remains fallback-only

## CI/CD Controls

- [ ] Required status checks pass (`lint`, `typecheck`, `test`, `build`)
- [ ] PR diff reviewed for accidental README rename/language regressions
- [ ] Dependency upgrades with major version bumps reviewed manually
- [ ] Worker services are included in deployment topology for async import/export lifecycle handling
