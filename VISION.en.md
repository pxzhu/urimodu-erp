# Vision

## Why this project exists

Many teams need business software that is affordable, transparent, extensible, and truly under their control.

Too often, ERP and work platforms are difficult to customize, expensive to expand, restrictive in their APIs, and intentionally hard to migrate away from. That creates lock-in, slows down growing companies, and puts essential business operations behind opaque pricing and limited integration surfaces.

This project exists to offer a different path.

We are building a Korean-friendly, self-hosted, open-source ERP and work platform that gives organizations control over their infrastructure, their workflows, and their data.

## Our mission

Our mission is to make high-quality ERP and work-platform capabilities available to more teams in Korea without forcing them into vendor lock-in, opaque pricing, or limited extensibility.

We want startups, small businesses, and growing organizations to have access to the kind of operational foundation that was historically available only to much larger companies with much larger budgets.

## What we believe

We believe business software should follow a few basic principles:

### 1. Customers should control their own data
Data should be portable, exportable, and understandable. A business should never feel trapped because its data is difficult to access or migrate.

### 2. APIs should be part of the product, not a premium penalty
Core integration surfaces should be treated as a normal part of the platform. Extensibility should not depend on hidden pricing or artificial restrictions.

### 3. Deployment should be flexible
Some teams want managed services. Some teams need self-hosted deployments. Some teams operate in regulated or security-sensitive environments. Good business software should respect these realities.

### 4. Korean workflows deserve first-class support
Korean teams should not have to choose between global software with weak local workflow support and local software with poor openness or portability. Approvals, attendance, HR, expense workflows, document handling, and Korean-friendly organizational structures should be built in from the start.

### 5. Open architecture matters
The platform should be understandable, documented, extensible, and contributor-friendly. Integrations, adapters, templates, deployment stacks, and workflow engines should be designed so that others can improve them.

## What we are building

This project is building a self-hosted, web-based ERP and work platform with a Korean-first workflow model.

The platform is intended to cover the operational backbone of an organization, including:

- organization and employee management
- approvals and document workflows
- attendance and leave management
- expense and accounting foundations
- import and export tooling
- file and document handling
- integration infrastructure
- deployment for Docker and Kubernetes environments

The goal is not to copy any single existing product. The goal is to build a practical, extensible alternative that fits Korean business operations while remaining modern, open, and developer-friendly.

## Who this is for

This project is for teams that want more control over their business software stack.

That includes:

- startups that have outgrown spreadsheets and disconnected tools
- growing companies that need approvals, attendance, HR, and accounting foundations in one place
- organizations that prefer self-hosted deployment for security, compliance, or operational reasons
- developers and partners who want a platform they can extend instead of a black box they can only configure
- teams that care about portability, auditability, and integration freedom

## What we will optimize for

We will prioritize:

- transparency over hidden complexity
- portability over lock-in
- extensibility over closed customization
- operational realism over feature theater
- Korean workflow quality over superficial localization
- maintainable architecture over unnecessary technical fashion
- working vertical slices over bloated promises

## What we will not optimize for

We are not trying to build everything at once.

We will not optimize for:

- copying every feature from legacy ERP suites in the first phase
- building a perfect all-in-one system before shipping usable workflows
- forcing premature microservices complexity
- using proprietary lock-in as a business model
- making migration in or out artificially difficult

## Product principles

### Self-hosted first, web-native by default
Customers may manage the infrastructure, but the user experience should still feel modern and easy to access from the web.

### Modular monolith first
The core should remain understandable and maintainable. Service boundaries should appear where they create real value, not because of fashion.

### Audit-first
Core business actions should be traceable. Important changes should leave an understandable history.

### Document-centric workflows
Documents are not just attachments. In many Korean business processes, they are the center of approvals, evidence, communication, and compliance.

### HWPX-first Korean document strategy
Where Korean document compatibility matters, we prefer open and modern handling strategies, with HWPX treated as a first-class target and legacy HWP handled as a fallback path.

### Integration-friendly by design
The platform should provide APIs, import/export paths, and connector patterns that allow organizations to adapt the software to their environment rather than the other way around.

## Open-source philosophy

We want this project to be genuinely useful as an open-source project, not just source-visible.

That means:

- the codebase should be readable
- the deployment path should be documented
- contribution paths should be clear
- public APIs and contracts should be understandable
- core functionality should not depend on hidden internal knowledge
- the project should welcome practical improvements from users, partners, and contributors

We also believe open source and commercial sustainability can coexist. Open code, public documentation, paid support, implementation help, migration services, and enterprise-grade operational assistance can all live together without compromising the core values of the project.

## Long-term ambition

Our long-term ambition is simple:

to become a trustworthy, extensible, Korean-friendly alternative for teams that need real business infrastructure without surrendering control of their data, integrations, deployment choices, or future roadmap.

We want to help build a future where more companies in Korea can run on software they understand, adapt, and truly own.

## How to read this vision

This document is not a feature checklist. It is a directional statement.

It exists to help contributors, maintainers, users, and partners answer a few simple questions:

- Why does this project exist?
- What kind of product are we trying to build?
- What values should guide technical and product decisions?
- What trade-offs are we willing to make?
- What kind of ecosystem do we want to create?

When in doubt, choose the path that increases transparency, portability, extensibility, and practical usefulness for real teams.
