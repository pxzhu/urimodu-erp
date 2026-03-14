# ADR 0005: Self-hosted Deployment Topology

- Status: Accepted
- Date: 2026-03-13

## Context

Target users range from small teams needing quick local deployment to larger organizations requiring Kubernetes-based operation. The platform must remain deployable without managed-cloud lock-in.

## Decision

Provide two official topology layers:

1. Docker Compose for local and small-team bootstrap.
2. Helm chart skeleton for Kubernetes-based environments.

## Alternatives Considered

- Kubernetes-only: rejected due to steep onboarding cost.
- Compose-only: rejected because it limits production scalability and policy controls.

## Consequences

- Low-friction local adoption path and clear production migration path.
- Documentation and environment-variable management become first-class responsibilities.
- Helm chart evolves incrementally with production learnings.

## Follow-up

- Expand Helm operational defaults (probes/resources/securityContext).
- Add release and rollback runbook examples.
