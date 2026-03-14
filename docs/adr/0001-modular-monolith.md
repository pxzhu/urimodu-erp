# ADR 0001: Modular Monolith for Core API

- Status: Accepted
- Date: 2026-03-13

## Context

Phase-1 ERP domains (auth, org, employee, approvals, attendance, expenses, finance) share transactional boundaries and evolve together. Premature service splitting would increase operational overhead (service discovery, distributed tracing, eventual consistency handling) before product-market fit of each module is clear.

## Decision

Use a NestJS modular monolith as the core API. Keep modules separated by bounded responsibilities inside one deployable service. Split out only clear boundary services (`worker`, `docs-service`, `connector-gateway`) where asynchronous or edge-integration concerns justify it.

## Alternatives Considered

- Full microservices from day one: rejected due to high complexity and weak early-stage leverage.
- Single unstructured codebase: rejected due to maintainability and growth risk.

## Consequences

- Faster vertical-slice delivery with lower infrastructure burden.
- Strong local development ergonomics and easier onboarding.
- Clear extraction path later when scaling constraints become measurable.

## Follow-up

Review this ADR when one of these becomes persistent:

- independent scaling needs per module
- separate release cadence with isolated ownership
- sustained blast-radius issues in single-deploy model
