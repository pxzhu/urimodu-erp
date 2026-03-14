# ADR 0002: HWPX First, Legacy HWP Fallback

- Status: Accepted
- Date: 2026-03-13

## Context

Korean document-heavy workflows require practical compatibility with Hangul formats. Legacy HWP support is still needed in some environments, but deep dependency on legacy-only tooling reduces portability and maintainability.

## Decision

Treat HWPX as the first-class document compatibility strategy for structured processing and future export hardening. Keep legacy HWP in adapter/fallback scope only.

## Alternatives Considered

- Legacy HWP first: rejected due to maintainability risk and weaker modern tooling support.
- Ignore Hangul formats entirely: rejected because it fails Korean workflow requirements.

## Consequences

- Better long-term interoperability path.
- Clear plugin boundary for legacy conversion where needed.
- Documentation and templates can target open, structured format strategy.

## Follow-up

- Expand HWPX export validation coverage in later roadmap phases.
- Keep legacy HWP adapters isolated to avoid architectural leakage.
