# ADR 0004: Attendance Raw Event vs Ledger Split

- Status: Accepted
- Date: 2026-03-13

## Context

Auditability requires immutable source records and deterministic normalization.

## Decision

Store immutable `AttendanceRawEvent` records first. Normalize them into `AttendanceLedger` with policy/version traceability.

## Consequences

- Strong audit and correction support
- Clear reprocessing path when policies change
