Continue the self-hosted Korean ERP platform project.

Task:
Implement attendance ingestion and normalization.

Modules:
- attendance
- leave
- integrations
- edge-agent scaffold

Requirements:
- Create Prisma models for:
  - AttendanceRawEvent
  - AttendanceLedger
  - ShiftPolicy
  - LeaveRequest
  - AttendanceCorrection
- API endpoint for raw attendance ingestion
- CSV import flow for raw events
- background normalization job that converts raw events to ledger entries
- store policy version on normalized results
- support event source metadata such as:
  - external vendor name
  - device ID
  - external user ID
  - event timestamp
  - raw payload
- web UI:
  - raw event list
  - normalized ledger list
  - leave request form
  - attendance correction request form
- create a generic integration contract for ADT/S1-like connectors
- Edge Agent in Go should:
  - watch a local CSV directory
  - parse sample attendance events
  - map external IDs to employee numbers through config
  - send events securely to the Integration Hub
  - buffer failed sends locally
- implement a mock DB adapter interface, but CSV adapter is enough for the working demo
- do not write vendor-specific production logic unless stubbed clearly

Acceptance:
- Sample CSV can be imported
- Raw events are stored
- Normalization job produces ledger rows
- Leave and correction requests exist
- Edge Agent mock flow runs end-to-end
Do not stay at architecture-only level. Create actual code, migrations, tests, seeds, Docker files, Helm files, and runnable documentation. Prefer a working vertical slice over broad placeholders.
