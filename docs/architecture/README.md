# Architecture Overview

This document summarizes the current implementation topology for PROMPT02-PROMPT07.

## System Topology

```mermaid
graph TD
    User["Web User"] --> Web["apps/web (Next.js)"]
    Web --> API["apps/api (NestJS modular monolith)"]
    API --> DB[("PostgreSQL")]
    API --> Redis[("Redis")]
    API --> MinIO[("MinIO")]
    API --> DocsSvc["apps/docs-service"]

    EdgeAgent["agents/edge-agent (Go)"] --> Gateway["apps/connector-gateway"]
    Gateway --> API

    Worker["apps/worker"] --> DB
    Worker --> API
```

## Document and Approval Flow

```mermaid
sequenceDiagram
    participant U as User (Web)
    participant A as API
    participant M as MinIO
    participant D as Docs Service

    U->>A: Upload attachment
    A->>M: Store object
    A->>A: Create FileObject metadata + AuditLog
    U->>A: Create Document from Template
    A->>A: Create Document + DocumentVersion + ApprovalLine
    U->>A: Submit approval
    A->>A: Create ApprovalAction + update step status + AuditLog
    U->>A: Render PDF
    A->>D: POST /render/pdf (html payload)
    D-->>A: PDF bytes
    A->>M: Store rendered PDF
    A-->>U: Download link
```

## Attendance Integration Flow

```mermaid
sequenceDiagram
    participant Device as Attendance Source (ADT/S1-like)
    participant Edge as Edge Agent
    participant Gw as Connector Gateway
    participant Api as API
    participant W as Worker

    Device->>Edge: CSV/raw records
    Edge->>Gw: Generic attendance payload (signed header)
    Gw->>Api: Raw event ingest
    Api->>Api: Save immutable AttendanceRawEvent (dedupe-safe)
    W->>Api: Pull unnormalized raw events
    W->>Api: Normalize to AttendanceLedger with policy version
```

## Design Constraints

- Core business API remains a modular monolith.
- HWPX is first-class document strategy; legacy HWP stays fallback-only.
- Raw attendance events are immutable sources; ledgers are normalized views.
- Important mutations produce audit logs.

## Related ADRs

- `docs/adr/0001-modular-monolith.md`
- `docs/adr/0002-hwpx-first.md`
- `docs/adr/0003-edge-agent-strategy.md`
- `docs/adr/0004-attendance-raw-vs-ledger.md`
- `docs/adr/0005-self-hosted-topology.md`
