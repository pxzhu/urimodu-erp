Continue the self-hosted Korean ERP platform project.

Task:
Finalize the project so it is understandable and runnable by another engineer.

Requirements:
- improve README.md and README.ko.md
- add architecture diagrams in docs
- add ADRs for:
  - modular monolith choice
  - HWPX-first strategy
  - Edge Agent strategy
  - attendance raw vs ledger model
  - self-hosted deployment topology
- add seed instructions
- add backup/restore notes
- add production environment notes
- add security checklist
- add smoke tests / minimal e2e tests
- ensure Swagger is available
- ensure Docker Compose instructions are correct
- ensure Helm values are documented
- add sample `.env.example`
- add sample Korean templates and seed users
- add a clear roadmap section for next phases:
  - payroll
  - advanced accounting
  - deeper ADT/S1 adapters
  - HWPX export hardening
  - mobile app
  - notification integrations

Acceptance:
- Another engineer can clone, boot, seed, and explore the app
- Docs are coherent
- Tests pass or clearly document known gaps
- Remaining TODOs are explicit and prioritized
Do not stay at architecture-only level. Create actual code, migrations, tests, seeds, Docker files, Helm files, and runnable documentation. Prefer a working vertical slice over broad placeholders.
