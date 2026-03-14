# ADR 0003: Edge Agent Strategy for Attendance Integrations

- Status: Accepted
- Date: 2026-03-13

## Context

Attendance systems in Korean enterprises often expose data through local CSV exports, LAN-only DB access, or constrained vendor channels. Direct cloud pull models are not always practical.

## Decision

Use a Go-based edge agent that runs near customer infrastructure. The agent watches local data sources (CSV first), maps external IDs, sends normalized payloads to connector-gateway, and buffers failed sends locally for retry.

## Alternatives Considered

- Direct API-only integration from core backend: rejected due to network/installation constraints.
- Vendor-specific integration logic embedded in core API: rejected to avoid lock-in and coupling.

## Consequences

- Better fit for self-hosted/on-prem integration reality.
- Vendor specifics remain adapter-level, while core ingestion remains generic.
- Operational responsibility includes edge deployment and key rotation.

## Follow-up

- Add deeper provider adapters behind shared contracts.
- Improve edge observability (metrics, dead-letter tooling, diagnostics).
