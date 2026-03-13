# ADR 0003: Edge Agent for Attendance Integrations

- Status: Accepted
- Date: 2026-03-13

## Context

On-prem attendance systems often require local file/database integration patterns.

## Decision

Adopt a generic edge-agent model (Go) for CSV/watcher and mock DB adapter paths, posting normalized events to connector-gateway.

## Consequences

- Supports environments where vendor APIs are limited
- Keeps vendor-specific logic isolated behind generic adapters
