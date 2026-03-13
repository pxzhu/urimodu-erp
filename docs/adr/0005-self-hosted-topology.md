# ADR 0005: Self-hosted Deployment Topology

- Status: Accepted
- Date: 2026-03-13

## Context

Project target includes customer-managed infrastructure from small single-node to Kubernetes.

## Decision

Provide Docker Compose for local/small deployments and Helm chart skeleton for Kubernetes environments.

## Consequences

- Low-friction local bootstrap
- Production path available without redesign
