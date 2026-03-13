Continue the self-hosted Korean ERP platform project.

Task:
Implement the document and approval vertical slice.

Modules:
- files
- documents
- approvals
- signatures

Requirements:
- MinIO-backed file upload service
- file metadata table with checksum, MIME type, original name, size, uploader, storage key
- document entity with versioning
- approval line model that supports:
  - approve
  - consult
  - agree
  - cc
  - receive
- approval actions:
  - submit
  - approve
  - reject
  - cancel
  - resubmit
- signature/seal asset model
- HTML template-based documents
- PDF rendering pipeline
- sample templates:
  - leave request
  - expense claim approval
  - attendance correction request
  - employment certificate
  - overtime request
- web UI:
  - upload file
  - create document
  - choose approval line
  - submit for approval
  - approve/reject with comment
  - download rendered PDF
- audit logs for file upload, document changes, approval actions
- keep canonical internal rendering model as JSON + HTML + PDF
- add HWPX adapter scaffolding and a clear TODO boundary for legacy HWP fallback

Acceptance:
- User can upload files
- User can create a document from a template
- User can submit an approval line
- Approver can approve/reject
- PDF can be generated and downloaded
- Document versions and audit trail are visible
Do not stay at architecture-only level. Create actual code, migrations, tests, seeds, Docker files, Helm files, and runnable documentation. Prefer a working vertical slice over broad placeholders.
