Continue the self-hosted Korean ERP platform project.

Task:
Implement the finance starter and import/export center.

Modules:
- expenses
- finance
- import-export

Requirements:
- Prisma models and API for:
  - Vendor
  - CostCenter
  - Project
  - ExpenseClaim
  - Account
  - JournalEntry
  - JournalEntryLine
  - ExportJob
  - ImportJob
- chart of accounts starter seed
- expense claim with file attachment/evidence links
- basic journal entry create/list/detail
- import wizard for CSV/XLSX starter flows
- export to CSV/JSON starter
- web UI:
  - expense claim create/list/detail
  - chart of accounts list
  - journal entry create/list/detail
  - import job screen
  - export job screen
- validation and error reporting for import jobs
- audit logs for import/export and finance mutations
- keep finance scope minimal but clean and extensible

Acceptance:
- User can create an expense claim
- User can create a journal entry
- COA seed exists
- CSV import starter works for at least one entity type
- CSV/JSON export works for at least one list view
Do not stay at architecture-only level. Create actual code, migrations, tests, seeds, Docker files, Helm files, and runnable documentation. Prefer a working vertical slice over broad placeholders.
