# ADR 0001: Modular Monolith for Core API

- Status: Accepted
- Date: 2026-03-13

## Context

ERP phase-1 domains are tightly coupled with transactional consistency needs.

## Decision

Use a NestJS modular monolith as the core API. Separate worker/docs-service/connector-gateway only for boundary and asynchronous concerns.

## Consequences

- Faster delivery with lower operational complexity
- Clear path to extract services later where justified
