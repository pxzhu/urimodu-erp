# ADR 0004: Attendance Raw Event vs Ledger Split

- Status: Accepted
- Date: 2026-03-13

## Context

Attendance data can arrive duplicated, delayed, or corrected. HR/legal workflows require immutable source evidence and reproducible normalization rules.

## Decision

Store immutable `AttendanceRawEvent` records first, with dedupe keys and source metadata. Normalize raw events into `AttendanceLedger` through worker jobs, capturing the policy version used for each normalized entry.

## Alternatives Considered

- Write directly to ledger only: rejected because auditability and reprocessing would be weak.
- Mutate raw events when corrections arrive: rejected because it breaks source-of-truth lineage.

## Consequences

- Strong audit/replay semantics.
- Clear separation between ingest concerns and policy interpretation.
- Additional storage and normalization job complexity (accepted trade-off).

## Follow-up

- Add deterministic reprocessing tools for policy updates.
- Add discrepancy reports for raw-vs-ledger reconciliation.
