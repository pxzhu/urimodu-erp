# ADR 0002: HWPX First, Legacy HWP Fallback

- Status: Accepted
- Date: 2026-03-13

## Context

Korean document workflows require practical support for Hangul formats.

## Decision

Treat HWPX as first-class for structured document handling. Keep legacy HWP support as adapter/fallback only.

## Consequences

- Better long-term maintainability for document pipelines
- Legacy compatibility remains possible without dominating core architecture
