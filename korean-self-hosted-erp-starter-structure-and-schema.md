# 한국형 사용자 설치형 ERP 스타터 문서
## 폴더 구조 + DB 스키마 초안 + Codex 전달용 실행 텍스트

- 버전: 0.1
- 목적: 바로 개발을 시작할 수 있게 **모노레포 구조**, **모듈 경계**, **Prisma DB 스키마 초안**, **시드 우선순위**, **Codex 실행 지시문**을 한 문서에 묶는다.
- 범위: Phase 1 기준
  - 포함: 인증, 조직, 직원, 파일, 문서, 전자결재, 서명/도장, 근태 raw/ledger, 휴가, 근태정정, 경비, 회계 기초, import/export, 감사로그, 연동 허브, Edge Agent
  - 제외: 급여 정산 엔진 완성판, 세무 신고 자동화, 제조/MRP, 완전한 HWP 편집기

---

## 1. 개발 기본 원칙

1. **모듈형 모놀리스**로 시작한다.  
   API 코어는 하나의 NestJS 앱으로 두고, 비동기 처리만 worker/docs-service/connector-gateway로 분리한다.

2. **Self-hosted**가 기본이다.  
   고객이 DB/스토리지/인프라를 운영하지만, 사용자는 웹에서 SaaS처럼 사용해야 한다.

3. **한국 실무 중심**으로 간다.  
   사번, 부서/직위/직책, 결재선, 도장, 근태 정정, 휴가, 증빙 파일, HWPX, PDF를 핵심으로 둔다.

4. **HWPX 우선, HWP는 어댑터**로 처리한다.  
   내부 canonical format은 JSON + HTML + PDF로 둔다.

5. **Audit-first** 설계를 한다.  
   주요 생성/수정/결재/정정/업로드/내보내기 행위는 모두 감사로그에 남긴다.

---

## 2. 추천 레포 구조

```text
/
├─ apps/
│  ├─ web/                          # Next.js
│  │  ├─ src/
│  │  │  ├─ app/
│  │  │  │  ├─ (auth)/
│  │  │  │  │  └─ login/
│  │  │  │  ├─ (dashboard)/
│  │  │  │  │  ├─ companies/
│  │  │  │  │  ├─ departments/
│  │  │  │  │  ├─ employees/
│  │  │  │  │  ├─ documents/
│  │  │  │  │  ├─ approvals/
│  │  │  │  │  ├─ attendance/
│  │  │  │  │  ├─ leave/
│  │  │  │  │  ├─ expenses/
│  │  │  │  │  ├─ accounting/
│  │  │  │  │  ├─ imports/
│  │  │  │  │  ├─ exports/
│  │  │  │  │  └─ settings/
│  │  │  ├─ components/
│  │  │  ├─ features/
│  │  │  ├─ lib/
│  │  │  ├─ hooks/
│  │  │  ├─ styles/
│  │  │  └─ types/
│  │  ├─ public/
│  │  └─ package.json
│  │
│  ├─ api/                          # NestJS modular monolith
│  │  ├─ src/
│  │  │  ├─ main.ts
│  │  │  ├─ app.module.ts
│  │  │  ├─ common/
│  │  │  │  ├─ auth/
│  │  │  │  ├─ guards/
│  │  │  │  ├─ decorators/
│  │  │  │  ├─ interceptors/
│  │  │  │  ├─ filters/
│  │  │  │  ├─ pipes/
│  │  │  │  ├─ prisma/
│  │  │  │  ├─ storage/
│  │  │  │  ├─ audit/
│  │  │  │  └─ utils/
│  │  │  ├─ config/
│  │  │  └─ modules/
│  │  │     ├─ auth/
│  │  │     ├─ org/
│  │  │     ├─ employee/
│  │  │     ├─ files/
│  │  │     ├─ documents/
│  │  │     ├─ approvals/
│  │  │     ├─ signatures/
│  │  │     ├─ attendance/
│  │  │     ├─ leave/
│  │  │     ├─ expenses/
│  │  │     ├─ finance/
│  │  │     ├─ import-export/
│  │  │     ├─ integrations/
│  │  │     ├─ notifications/
│  │  │     └─ audit/
│  │  ├─ prisma/
│  │  │  ├─ schema.prisma
│  │  │  ├─ migrations/
│  │  │  └─ seeds/
│  │  │     ├─ core.seed.ts
│  │  │     └─ korean-sample.seed.ts
│  │  └─ package.json
│  │
│  ├─ worker/                       # BullMQ workers
│  │  ├─ src/
│  │  │  ├─ main.ts
│  │  │  ├─ jobs/
│  │  │  │  ├─ attendance-normalize.job.ts
│  │  │  │  ├─ pdf-render.job.ts
│  │  │  │  ├─ import-parse.job.ts
│  │  │  │  ├─ export-generate.job.ts
│  │  │  │  └─ notification-dispatch.job.ts
│  │  │  └─ queues/
│  │  └─ package.json
│  │
│  ├─ docs-service/                 # 문서 변환/파싱/렌더링
│  │  ├─ src/
│  │  │  ├─ main.ts
│  │  │  ├─ parsers/
│  │  │  │  ├─ csv/
│  │  │  │  ├─ xlsx/
│  │  │  │  ├─ docx/
│  │  │  │  ├─ pdf/
│  │  │  │  ├─ hwpx/
│  │  │  │  └─ images/
│  │  │  ├─ renderers/
│  │  │  │  └─ html-to-pdf/
│  │  │  └─ adapters/
│  │  │     ├─ hwpx/
│  │  │     └─ hwp/                # fallback adapter only
│  │  └─ package.json
│  │
│  └─ connector-gateway/            # 외부/에이전트 수신점
│     ├─ src/
│     │  ├─ main.ts
│     │  ├─ modules/
│     │  │  ├─ ingestion/
│     │  │  ├─ mapping/
│     │  │  ├─ security/
│     │  │  └─ integrations/
│     └─ package.json
│
├─ agents/
│  └─ edge-agent/                   # Go 권장
│     ├─ cmd/agent/main.go
│     ├─ internal/
│     │  ├─ config/
│     │  ├─ csvwatcher/
│     │  ├─ dbadapter/
│     │  ├─ sender/
│     │  ├─ buffer/
│     │  ├─ mapping/
│     │  └─ models/
│     ├─ samples/
│     │  └─ attendance/
│     └─ go.mod
│
├─ packages/
│  ├─ ui/                           # shared UI components
│  ├─ domain/                       # domain enums/value objects/policies
│  ├─ contracts/                    # DTO/OpenAPI/SDK contract
│  ├─ sdk/                          # frontend/internal SDK
│  ├─ shared/                       # utils/constants/helpers
│  └─ config/                       # eslint/tsconfig/prettier
│
├─ deploy/
│  ├─ compose/
│  │  ├─ docker-compose.yml
│  │  └─ .env.example
│  └─ helm/
│     └─ korean-erp/
│        ├─ Chart.yaml
│        ├─ values.yaml
│        └─ templates/
│
├─ docs/
│  ├─ PLAN.md
│  ├─ README.ko.md
│  ├─ adr/
│  │  ├─ 0001-modular-monolith.md
│  │  ├─ 0002-hwpx-first.md
│  │  ├─ 0003-edge-agent-strategy.md
│  │  ├─ 0004-attendance-raw-vs-ledger.md
│  │  └─ 0005-self-hosted-topology.md
│  ├─ architecture/
│  ├─ api/
│  └─ ops/
│
├─ scripts/
│  ├─ bootstrap.sh
│  ├─ seed.sh
│  └─ dev-reset.sh
│
├─ package.json
├─ pnpm-workspace.yaml
├─ turbo.json
├─ tsconfig.json
├─ Makefile
└─ README.md
```

---

## 3. API 모듈 내부 구조 규칙

각 API 모듈은 아래 구조를 공통으로 가진다.

```text
modules/<module-name>/
├─ controllers/
├─ dto/
├─ services/
├─ repositories/
├─ domain/
├─ policies/
├─ mappers/
├─ listeners/
└─ <module-name>.module.ts
```

예시:

```text
modules/attendance/
├─ controllers/
│  ├─ attendance-ingestion.controller.ts
│  ├─ attendance-ledger.controller.ts
│  └─ attendance-correction.controller.ts
├─ dto/
├─ services/
│  ├─ attendance-ingestion.service.ts
│  ├─ attendance-normalization.service.ts
│  └─ attendance-policy.service.ts
├─ repositories/
├─ domain/
├─ policies/
├─ listeners/
└─ attendance.module.ts
```

---

## 4. 패키지 경계 원칙

### packages/domain
- enum
- value object
- domain event
- 공통 정책 계산기
- 근태 계산 규칙 인터페이스
- 승인 상태 전이 규칙

### packages/contracts
- DTO
- OpenAPI schema
- queue payload
- integration payload
- typed SDK contract

### packages/shared
- 날짜/시간 유틸
- 한국 로케일 포매터
- 금액/통화 유틸
- file MIME 검사
- checksum helper
- env parser

### packages/ui
- 테이블
- 트리
- 승인선 컴포넌트
- 상태 배지
- 업로드 컴포넌트
- 문서 미리보기 컴포넌트

---

## 5. DB 스키마 초안 (Prisma)

> 이 스키마는 **Phase 1용 초안**이다.  
> 급여, 세무, 제조, 고급 BI, 모바일 푸시 등은 일부러 뺐다.  
> 먼저 이 뼈대로 vertical slice를 만드는 것이 목표다.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserStatus {
  ACTIVE
  INVITED
  DISABLED
}

enum MembershipRole {
  SUPER_ADMIN
  ORG_ADMIN
  HR_MANAGER
  APPROVER
  EMPLOYEE
}

enum EmploymentType {
  FULL_TIME
  CONTRACT
  PART_TIME
  INTERN
  FREELANCER
}

enum EmploymentStatus {
  ACTIVE
  ON_LEAVE
  TERMINATED
}

enum FileStatus {
  ACTIVE
  ARCHIVED
  DELETED
}

enum DocumentStatus {
  DRAFT
  IN_REVIEW
  APPROVED
  REJECTED
  CANCELED
  ARCHIVED
}

enum ApprovalLineStatus {
  DRAFT
  IN_REVIEW
  APPROVED
  REJECTED
  CANCELED
}

enum ApprovalStepType {
  APPROVE
  CONSULT
  AGREE
  CC
  RECEIVE
}

enum ApprovalStepStatus {
  PENDING
  WAITING
  APPROVED
  REJECTED
  SKIPPED
  CANCELED
}

enum ApprovalActionType {
  SUBMIT
  APPROVE
  REJECT
  CANCEL
  RESUBMIT
  COMMENT
}

enum SignatureAssetType {
  SIGNATURE
  SEAL
}

enum AttendanceIngestionSource {
  API
  CSV
  AGENT_CSV
  AGENT_DB
  MANUAL
}

enum AttendanceEventType {
  IN
  OUT
  BREAK_OUT
  BREAK_IN
  ACCESS_GRANTED
  ACCESS_DENIED
  UNKNOWN
}

enum AttendanceLedgerStatus {
  NORMAL
  LATE
  EARLY_LEAVE
  ABSENT
  ON_LEAVE
  HOLIDAY
  WEEKEND
  NEEDS_REVIEW
}

enum LeaveUnit {
  DAY
  HALF_DAY_AM
  HALF_DAY_PM
  HOUR
}

enum LeaveRequestStatus {
  REQUESTED
  APPROVED
  REJECTED
  CANCELED
}

enum CorrectionStatus {
  REQUESTED
  APPROVED
  REJECTED
  CANCELED
}

enum ExpenseStatus {
  DRAFT
  SUBMITTED
  APPROVED
  REJECTED
  POSTED
}

enum AccountType {
  ASSET
  LIABILITY
  EQUITY
  REVENUE
  EXPENSE
}

enum JournalEntryStatus {
  DRAFT
  POSTED
  REVERSED
}

enum JobStatus {
  PENDING
  RUNNING
  SUCCEEDED
  FAILED
  CANCELED
}

enum IntegrationType {
  NAVER_WORKS
  JANDI
  HIWORKS
  ADT
  S1
  GENERIC
}

enum IntegrationStatus {
  ACTIVE
  DISABLED
  ERROR
}

enum IntegrationDirection {
  INBOUND
  OUTBOUND
}

model Company {
  id                    String                  @id @default(cuid())
  code                  String                  @unique
  name                  String
  defaultLocale         String                  @default("ko-KR")
  timezone              String                  @default("Asia/Seoul")
  createdAt             DateTime                @default(now())
  updatedAt             DateTime                @updatedAt

  memberships           CompanyMembership[]
  legalEntities         LegalEntity[]
  businessSites         BusinessSite[]
  departments           Department[]
  positions             Position[]
  jobTitles             JobTitle[]
  employees             Employee[]
  fileObjects           FileObject[]
  documentTemplates     DocumentTemplate[]
  documents             Document[]
  signatureAssets       SignatureAsset[]
  shiftPolicies         ShiftPolicy[]
  leavePolicies         LeavePolicy[]
  leaveRequests         LeaveRequest[]
  attendanceCorrections AttendanceCorrection[]
  attendanceRawEvents   AttendanceRawEvent[]
  attendanceLedgers     AttendanceLedger[]
  vendors               Vendor[]
  costCenters           CostCenter[]
  projects              Project[]
  accounts              Account[]
  journalEntries        JournalEntry[]
  expenseClaims         ExpenseClaim[]
  importJobs            ImportJob[]
  exportJobs            ExportJob[]
  integrations          IntegrationConnection[]
  integrationEvents     IntegrationEvent[]
  auditLogs             AuditLog[]
}

model User {
  id                     String               @id @default(cuid())
  email                  String               @unique
  name                   String
  locale                 String               @default("ko-KR")
  status                 UserStatus           @default(ACTIVE)
  lastLoginAt            DateTime?
  createdAt              DateTime             @default(now())
  updatedAt              DateTime             @updatedAt

  credentials            PasswordCredential?
  identities             AuthIdentity[]
  sessions               UserSession[]
  memberships            CompanyMembership[]
  employees              Employee[]           @relation("EmployeeUser")
  uploadedFiles          FileObject[]
  signatureAssets        SignatureAsset[]
  documentVersionsAuthored DocumentVersion[]  @relation("DocumentVersionAuthor")
  approvalActions        ApprovalAction[]     @relation("ApprovalActionActor")
  submittedExpenseClaims ExpenseClaim[]       @relation("ExpenseClaimSubmitter")
  importJobsRequested    ImportJob[]          @relation("ImportJobRequester")
  exportJobsRequested    ExportJob[]          @relation("ExportJobRequester")
  createdJournalEntries  JournalEntry[]       @relation("JournalEntryCreator")
  postedJournalEntries   JournalEntry[]       @relation("JournalEntryPoster")
  auditLogs              AuditLog[]           @relation("AuditActor")
}

model PasswordCredential {
  id           String    @id @default(cuid())
  userId       String    @unique
  passwordHash String
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model AuthIdentity {
  id             String    @id @default(cuid())
  userId         String
  provider       String
  providerUserId String
  email          String?
  metadata       Json?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerUserId])
}

model UserSession {
  id         String    @id @default(cuid())
  userId     String
  tokenHash  String    @unique
  expiresAt  DateTime
  ipAddress  String?
  userAgent  String?
  createdAt  DateTime  @default(now())

  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model CompanyMembership {
  id         String          @id @default(cuid())
  companyId  String
  userId     String
  role       MembershipRole
  active     Boolean         @default(true)
  createdAt  DateTime        @default(now())
  updatedAt  DateTime        @updatedAt

  company    Company         @relation(fields: [companyId], references: [id], onDelete: Cascade)
  user       User            @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([companyId, userId])
}

model LegalEntity {
  id                   String         @id @default(cuid())
  companyId            String
  code                 String
  name                 String
  registrationNumber   String?
  representativeName   String?
  createdAt            DateTime       @default(now())
  updatedAt            DateTime       @updatedAt

  company              Company        @relation(fields: [companyId], references: [id], onDelete: Cascade)
  businessSites        BusinessSite[]
  employees            Employee[]
  vendors              Vendor[]
  costCenters          CostCenter[]
  projects             Project[]
  accounts             Account[]
  journalEntries       JournalEntry[]
  expenseClaims        ExpenseClaim[]

  @@unique([companyId, code])
}

model BusinessSite {
  id                   String                @id @default(cuid())
  companyId            String
  legalEntityId        String?
  code                 String
  name                 String
  address              String?
  timezone             String                @default("Asia/Seoul")
  createdAt            DateTime              @default(now())
  updatedAt            DateTime              @updatedAt

  company              Company               @relation(fields: [companyId], references: [id], onDelete: Cascade)
  legalEntity          LegalEntity?          @relation(fields: [legalEntityId], references: [id], onDelete: SetNull)
  departments          Department[]
  employees            Employee[]
  shiftPolicies        ShiftPolicy[]
  attendanceRawEvents  AttendanceRawEvent[]
  attendanceLedgers    AttendanceLedger[]

  @@unique([companyId, code])
}

model Department {
  id                 String          @id @default(cuid())
  companyId          String
  businessSiteId     String?
  code               String
  name               String
  parentId           String?
  managerEmployeeId  String?
  sortOrder          Int             @default(0)
  createdAt          DateTime        @default(now())
  updatedAt          DateTime        @updatedAt

  company            Company         @relation(fields: [companyId], references: [id], onDelete: Cascade)
  businessSite       BusinessSite?   @relation(fields: [businessSiteId], references: [id], onDelete: SetNull)
  parent             Department?     @relation("DepartmentHierarchy", fields: [parentId], references: [id], onDelete: SetNull)
  children           Department[]    @relation("DepartmentHierarchy")
  manager            Employee?       @relation("DepartmentManager", fields: [managerEmployeeId], references: [id], onDelete: SetNull)
  employees          Employee[]

  @@unique([companyId, code])
}

model Position {
  id          String      @id @default(cuid())
  companyId   String
  code        String
  name        String
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  company     Company     @relation(fields: [companyId], references: [id], onDelete: Cascade)
  employees   Employee[]  @relation("EmployeePosition")

  @@unique([companyId, code])
}

model JobTitle {
  id          String      @id @default(cuid())
  companyId   String
  code        String
  name        String
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  company     Company     @relation(fields: [companyId], references: [id], onDelete: Cascade)
  employees   Employee[]  @relation("EmployeeJobTitle")

  @@unique([companyId, code])
}

model Employee {
  id                    String                         @id @default(cuid())
  companyId             String
  legalEntityId         String?
  businessSiteId        String?
  departmentId          String?
  userId                String?
  positionId            String?
  jobTitleId            String?
  managerId             String?

  employeeNumber        String
  nameKr                String
  nameEn                String?
  workEmail             String?
  mobilePhone           String?
  nationalIdMasked      String?
  hireDate              DateTime                       @db.Date
  terminationDate       DateTime?                      @db.Date
  employmentType        EmploymentType
  employmentStatus      EmploymentStatus               @default(ACTIVE)
  createdAt             DateTime                       @default(now())
  updatedAt             DateTime                       @updatedAt

  company               Company                        @relation(fields: [companyId], references: [id], onDelete: Cascade)
  legalEntity           LegalEntity?                   @relation(fields: [legalEntityId], references: [id], onDelete: SetNull)
  businessSite          BusinessSite?                  @relation(fields: [businessSiteId], references: [id], onDelete: SetNull)
  department            Department?                    @relation(fields: [departmentId], references: [id], onDelete: SetNull)
  user                  User?                          @relation("EmployeeUser", fields: [userId], references: [id], onDelete: SetNull)
  position              Position?                      @relation("EmployeePosition", fields: [positionId], references: [id], onDelete: SetNull)
  jobTitle              JobTitle?                      @relation("EmployeeJobTitle", fields: [jobTitleId], references: [id], onDelete: SetNull)
  manager               Employee?                      @relation("EmployeeManager", fields: [managerId], references: [id], onDelete: SetNull)
  subordinates          Employee[]                     @relation("EmployeeManager")
  managedDepartments    Department[]                   @relation("DepartmentManager")
  contracts             EmploymentContract[]
  externalIdentities    EmployeeExternalIdentity[]
  ownedDocuments        Document[]                     @relation("DocumentOwnerEmployee")
  submittedApprovalLines ApprovalLine[]                @relation("ApprovalLineSubmitterEmployee")
  approvalSteps         ApprovalStep[]                 @relation("ApprovalStepApproverEmployee")
  attendanceRawEvents   AttendanceRawEvent[]
  attendanceLedgers     AttendanceLedger[]
  leaveRequests         LeaveRequest[]
  attendanceCorrections AttendanceCorrection[]
  expenseClaims         ExpenseClaim[]                 @relation("ExpenseClaimEmployee")
  shiftPolicyAssignments EmployeeShiftPolicyAssignment[]

  @@unique([companyId, employeeNumber])
  @@index([companyId, departmentId])
}

model EmploymentContract {
  id           String      @id @default(cuid())
  employeeId   String
  fileId       String?
  contractType String
  startDate    DateTime    @db.Date
  endDate      DateTime?   @db.Date
  isCurrent    Boolean     @default(true)
  metadata     Json?
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  employee     Employee    @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  file         FileObject? @relation(fields: [fileId], references: [id], onDelete: SetNull)
}

model EmployeeExternalIdentity {
  id             String           @id @default(cuid())
  employeeId     String
  provider       IntegrationType
  externalUserId String
  externalName   String?
  metadata       Json?
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt

  employee       Employee         @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  @@unique([provider, externalUserId])
  @@index([employeeId, provider])
}

model FileObject {
  id                   String                     @id @default(cuid())
  companyId            String
  uploadedById         String
  bucket               String
  storageKey           String                     @unique
  originalName         String
  mimeType             String
  extension            String?
  sizeBytes            BigInt
  checksumSha256       String
  status               FileStatus                 @default(ACTIVE)
  metadata             Json?
  createdAt            DateTime                   @default(now())
  updatedAt            DateTime                   @updatedAt

  company              Company                    @relation(fields: [companyId], references: [id], onDelete: Cascade)
  uploadedBy           User                       @relation(fields: [uploadedById], references: [id], onDelete: Restrict)
  documentVersionAttachments DocumentVersionAttachment[]
  receiptItems         ExpenseItem[]              @relation("ExpenseReceipt")
  importSourceOf       ImportJob[]                @relation("ImportSourceFile")
  exportResultOf       ExportJob[]                @relation("ExportResultFile")
  signatureAssets      SignatureAsset[]
  contractFiles        EmploymentContract[]
  generatedFromVersions DocumentVersion[]         @relation("DocumentVersionPdfFile")
}

model DocumentTemplate {
  id            String      @id @default(cuid())
  companyId     String?
  key           String
  name          String
  category      String
  version       Int         @default(1)
  schemaJson    Json
  htmlTemplate  String
  isSystem      Boolean     @default(false)
  isActive      Boolean     @default(true)
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  company       Company?    @relation(fields: [companyId], references: [id], onDelete: SetNull)
  documents     Document[]

  @@unique([companyId, key, version])
}

model Document {
  id              String          @id @default(cuid())
  companyId       String
  ownerEmployeeId String?
  templateId      String?
  title           String
  category        String?
  status          DocumentStatus  @default(DRAFT)
  currentVersionNo Int            @default(1)
  submittedAt     DateTime?
  completedAt     DateTime?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  company         Company         @relation(fields: [companyId], references: [id], onDelete: Cascade)
  ownerEmployee   Employee?       @relation("DocumentOwnerEmployee", fields: [ownerEmployeeId], references: [id], onDelete: SetNull)
  template        DocumentTemplate? @relation(fields: [templateId], references: [id], onDelete: SetNull)
  versions        DocumentVersion[]
  approvalLine    ApprovalLine?
  leaveRequests   LeaveRequest[]
  attendanceCorrections AttendanceCorrection[]
  expenseClaims   ExpenseClaim[]

  @@index([companyId, status])
}

model DocumentVersion {
  id            String                     @id @default(cuid())
  documentId    String
  versionNo     Int
  authoredById  String
  contentJson   Json
  htmlSnapshot  String
  pdfFileId     String?
  createdAt     DateTime                   @default(now())

  document      Document                   @relation(fields: [documentId], references: [id], onDelete: Cascade)
  authoredBy    User                       @relation("DocumentVersionAuthor", fields: [authoredById], references: [id], onDelete: Restrict)
  pdfFile       FileObject?                @relation("DocumentVersionPdfFile", fields: [pdfFileId], references: [id], onDelete: SetNull)
  attachments   DocumentVersionAttachment[]

  @@unique([documentId, versionNo])
}

model DocumentVersionAttachment {
  id                String           @id @default(cuid())
  documentVersionId String
  fileId            String
  label             String?
  createdAt         DateTime         @default(now())

  documentVersion   DocumentVersion  @relation(fields: [documentVersionId], references: [id], onDelete: Cascade)
  file              FileObject       @relation(fields: [fileId], references: [id], onDelete: Cascade)

  @@unique([documentVersionId, fileId])
}

model ApprovalLine {
  id                   String              @id @default(cuid())
  documentId           String              @unique
  submittedByEmployeeId String?
  status               ApprovalLineStatus  @default(DRAFT)
  currentOrder         Int?
  submittedAt          DateTime?
  completedAt          DateTime?
  createdAt            DateTime            @default(now())
  updatedAt            DateTime            @updatedAt

  document             Document            @relation(fields: [documentId], references: [id], onDelete: Cascade)
  submittedByEmployee  Employee?           @relation("ApprovalLineSubmitterEmployee", fields: [submittedByEmployeeId], references: [id], onDelete: SetNull)
  steps                ApprovalStep[]
  actions              ApprovalAction[]
}

model ApprovalStep {
  id                 String               @id @default(cuid())
  lineId             String
  orderNo            Int
  type               ApprovalStepType
  approverEmployeeId String
  status             ApprovalStepStatus   @default(PENDING)
  actedAt            DateTime?
  comment            String?
  createdAt          DateTime             @default(now())
  updatedAt          DateTime             @updatedAt

  line               ApprovalLine         @relation(fields: [lineId], references: [id], onDelete: Cascade)
  approverEmployee   Employee             @relation("ApprovalStepApproverEmployee", fields: [approverEmployeeId], references: [id], onDelete: Restrict)
  actions            ApprovalAction[]

  @@unique([lineId, orderNo])
}

model ApprovalAction {
  id          String              @id @default(cuid())
  lineId      String
  stepId      String?
  actorId     String
  actionType  ApprovalActionType
  comment     String?
  payload     Json?
  createdAt   DateTime            @default(now())

  line        ApprovalLine        @relation(fields: [lineId], references: [id], onDelete: Cascade)
  step        ApprovalStep?       @relation(fields: [stepId], references: [id], onDelete: SetNull)
  actor       User                @relation("ApprovalActionActor", fields: [actorId], references: [id], onDelete: Restrict)
}

model SignatureAsset {
  id          String               @id @default(cuid())
  companyId   String
  ownerUserId String
  fileId      String
  type        SignatureAssetType
  label       String
  isDefault   Boolean              @default(false)
  createdAt   DateTime             @default(now())
  updatedAt   DateTime             @updatedAt

  company     Company              @relation(fields: [companyId], references: [id], onDelete: Cascade)
  ownerUser   User                 @relation(fields: [ownerUserId], references: [id], onDelete: Cascade)
  file        FileObject           @relation(fields: [fileId], references: [id], onDelete: Cascade)

  @@index([companyId, ownerUserId])
}

model ShiftPolicy {
  id                  String                        @id @default(cuid())
  companyId           String
  businessSiteId      String?
  code                String
  name                String
  version             Int                           @default(1)
  timezone            String                        @default("Asia/Seoul")
  workStartMinutes    Int
  workEndMinutes      Int
  breakMinutes        Int                           @default(60)
  graceMinutes        Int                           @default(0)
  rulesJson           Json?
  isDefault           Boolean                       @default(false)
  createdAt           DateTime                      @default(now())
  updatedAt           DateTime                      @updatedAt

  company             Company                       @relation(fields: [companyId], references: [id], onDelete: Cascade)
  businessSite        BusinessSite?                 @relation(fields: [businessSiteId], references: [id], onDelete: SetNull)
  employeeAssignments EmployeeShiftPolicyAssignment[]
  attendanceLedgers   AttendanceLedger[]

  @@unique([companyId, code, version])
}

model EmployeeShiftPolicyAssignment {
  id            String       @id @default(cuid())
  employeeId    String
  shiftPolicyId String
  effectiveFrom DateTime     @db.Date
  effectiveTo   DateTime?    @db.Date
  createdAt     DateTime     @default(now())

  employee      Employee     @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  shiftPolicy   ShiftPolicy  @relation(fields: [shiftPolicyId], references: [id], onDelete: Cascade)

  @@index([employeeId, effectiveFrom])
}

model AttendanceRawEvent {
  id              String                     @id @default(cuid())
  companyId       String
  businessSiteId  String?
  employeeId      String?
  provider        IntegrationType
  source          AttendanceIngestionSource
  externalUserId  String
  eventType       AttendanceEventType
  eventTimestamp  DateTime
  deviceId        String?
  siteCode        String?
  dedupeHash      String
  rawPayload      Json
  receivedAt      DateTime                   @default(now())
  normalized      Boolean                    @default(false)
  createdAt       DateTime                   @default(now())

  company         Company                    @relation(fields: [companyId], references: [id], onDelete: Cascade)
  businessSite    BusinessSite?              @relation(fields: [businessSiteId], references: [id], onDelete: SetNull)
  employee        Employee?                  @relation(fields: [employeeId], references: [id], onDelete: SetNull)
  ledgerSources   AttendanceLedgerSource[]

  @@unique([companyId, dedupeHash])
  @@index([companyId, eventTimestamp])
}

model AttendanceLedger {
  id              String                  @id @default(cuid())
  companyId       String
  businessSiteId  String?
  employeeId      String
  workDate        DateTime                @db.Date
  shiftPolicyId   String?
  status          AttendanceLedgerStatus  @default(NEEDS_REVIEW)
  checkInAt       DateTime?
  checkOutAt      DateTime?
  breakMinutes    Int                     @default(0)
  workedMinutes   Int                     @default(0)
  overtimeMinutes Int                     @default(0)
  nightMinutes    Int                     @default(0)
  holidayMinutes  Int                     @default(0)
  policyVersion   Int?
  needsReview     Boolean                 @default(true)
  notes           String?
  generatedAt     DateTime                @default(now())
  updatedAt       DateTime                @updatedAt

  company         Company                 @relation(fields: [companyId], references: [id], onDelete: Cascade)
  businessSite    BusinessSite?           @relation(fields: [businessSiteId], references: [id], onDelete: SetNull)
  employee        Employee                @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  shiftPolicy     ShiftPolicy?            @relation(fields: [shiftPolicyId], references: [id], onDelete: SetNull)
  sourceEvents    AttendanceLedgerSource[]
  corrections     AttendanceCorrection[]

  @@unique([companyId, employeeId, workDate])
  @@index([companyId, workDate])
}

model AttendanceLedgerSource {
  id                 String             @id @default(cuid())
  attendanceLedgerId String
  rawEventId         String

  attendanceLedger   AttendanceLedger   @relation(fields: [attendanceLedgerId], references: [id], onDelete: Cascade)
  rawEvent           AttendanceRawEvent @relation(fields: [rawEventId], references: [id], onDelete: Cascade)

  @@unique([attendanceLedgerId, rawEventId])
}

model LeavePolicy {
  id                    String      @id @default(cuid())
  companyId             String
  code                  String
  name                  String
  unit                  LeaveUnit   @default(DAY)
  annualAllocationDays  Decimal?    @db.Decimal(10, 2)
  maxCarryoverDays      Decimal?    @db.Decimal(10, 2)
  isPaid                Boolean     @default(true)
  rulesJson             Json?
  createdAt             DateTime    @default(now())
  updatedAt             DateTime    @updatedAt

  company               Company     @relation(fields: [companyId], references: [id], onDelete: Cascade)
  leaveRequests         LeaveRequest[]

  @@unique([companyId, code])
}

model LeaveRequest {
  id            String             @id @default(cuid())
  companyId     String
  employeeId    String
  leavePolicyId String
  documentId    String?
  status        LeaveRequestStatus @default(REQUESTED)
  startDate     DateTime           @db.Date
  endDate       DateTime           @db.Date
  unit          LeaveUnit
  quantity      Decimal            @db.Decimal(10, 2)
  reason        String?
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt

  company       Company            @relation(fields: [companyId], references: [id], onDelete: Cascade)
  employee      Employee           @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  leavePolicy   LeavePolicy        @relation(fields: [leavePolicyId], references: [id], onDelete: Restrict)
  document      Document?          @relation(fields: [documentId], references: [id], onDelete: SetNull)

  @@index([companyId, employeeId, status])
}

model AttendanceCorrection {
  id                 String            @id @default(cuid())
  companyId          String
  employeeId         String
  attendanceLedgerId String?
  documentId         String?
  status             CorrectionStatus  @default(REQUESTED)
  workDate           DateTime          @db.Date
  requestedCheckInAt DateTime?
  requestedCheckOutAt DateTime?
  reason             String
  createdAt          DateTime          @default(now())
  updatedAt          DateTime          @updatedAt

  company            Company           @relation(fields: [companyId], references: [id], onDelete: Cascade)
  employee           Employee          @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  attendanceLedger   AttendanceLedger? @relation(fields: [attendanceLedgerId], references: [id], onDelete: SetNull)
  document           Document?         @relation(fields: [documentId], references: [id], onDelete: SetNull)

  @@index([companyId, employeeId, workDate])
}

model Vendor {
  id                 String              @id @default(cuid())
  companyId          String
  legalEntityId      String?
  code               String
  name               String
  registrationNumber String?
  isActive           Boolean             @default(true)
  createdAt          DateTime            @default(now())
  updatedAt          DateTime            @updatedAt

  company            Company             @relation(fields: [companyId], references: [id], onDelete: Cascade)
  legalEntity        LegalEntity?        @relation(fields: [legalEntityId], references: [id], onDelete: SetNull)
  expenseItems       ExpenseItem[]
  journalEntryLines  JournalEntryLine[]

  @@unique([companyId, code])
}

model CostCenter {
  id                 String              @id @default(cuid())
  companyId          String
  legalEntityId      String?
  code               String
  name               String
  isActive           Boolean             @default(true)
  createdAt          DateTime            @default(now())
  updatedAt          DateTime            @updatedAt

  company            Company             @relation(fields: [companyId], references: [id], onDelete: Cascade)
  legalEntity        LegalEntity?        @relation(fields: [legalEntityId], references: [id], onDelete: SetNull)
  expenseClaims      ExpenseClaim[]
  journalEntryLines  JournalEntryLine[]

  @@unique([companyId, code])
}

model Project {
  id                 String              @id @default(cuid())
  companyId          String
  legalEntityId      String?
  code               String
  name               String
  status             String?
  startDate          DateTime?           @db.Date
  endDate            DateTime?           @db.Date
  createdAt          DateTime            @default(now())
  updatedAt          DateTime            @updatedAt

  company            Company             @relation(fields: [companyId], references: [id], onDelete: Cascade)
  legalEntity        LegalEntity?        @relation(fields: [legalEntityId], references: [id], onDelete: SetNull)
  expenseClaims      ExpenseClaim[]
  journalEntryLines  JournalEntryLine[]

  @@unique([companyId, code])
}

model ExpenseClaim {
  id            String          @id @default(cuid())
  companyId     String
  legalEntityId String?
  employeeId    String
  submittedById String
  documentId    String?
  costCenterId  String?
  projectId     String?
  title         String
  status        ExpenseStatus   @default(DRAFT)
  currency      String          @default("KRW")
  totalAmount   Decimal         @default(0) @db.Decimal(18, 2)
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  company       Company         @relation(fields: [companyId], references: [id], onDelete: Cascade)
  legalEntity   LegalEntity?    @relation(fields: [legalEntityId], references: [id], onDelete: SetNull)
  employee      Employee        @relation("ExpenseClaimEmployee", fields: [employeeId], references: [id], onDelete: Restrict)
  submittedBy   User            @relation("ExpenseClaimSubmitter", fields: [submittedById], references: [id], onDelete: Restrict)
  document      Document?       @relation(fields: [documentId], references: [id], onDelete: SetNull)
  costCenter    CostCenter?     @relation(fields: [costCenterId], references: [id], onDelete: SetNull)
  project       Project?        @relation(fields: [projectId], references: [id], onDelete: SetNull)
  items         ExpenseItem[]
  journalEntries JournalEntry[]

  @@index([companyId, employeeId, status])
}

model ExpenseItem {
  id            String       @id @default(cuid())
  claimId       String
  incurredOn    DateTime     @db.Date
  category      String
  description   String?
  vendorId      String?
  amount        Decimal      @db.Decimal(18, 2)
  vatAmount     Decimal?     @db.Decimal(18, 2)
  receiptFileId String?
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  claim         ExpenseClaim @relation(fields: [claimId], references: [id], onDelete: Cascade)
  vendor        Vendor?      @relation(fields: [vendorId], references: [id], onDelete: SetNull)
  receiptFile   FileObject?  @relation("ExpenseReceipt", fields: [receiptFileId], references: [id], onDelete: SetNull)
}

model Account {
  id                 String              @id @default(cuid())
  companyId          String
  legalEntityId      String?
  parentId           String?
  code               String
  name               String
  type               AccountType
  isPosting          Boolean             @default(true)
  isActive           Boolean             @default(true)
  createdAt          DateTime            @default(now())
  updatedAt          DateTime            @updatedAt

  company            Company             @relation(fields: [companyId], references: [id], onDelete: Cascade)
  legalEntity        LegalEntity?        @relation(fields: [legalEntityId], references: [id], onDelete: SetNull)
  parent             Account?            @relation("AccountHierarchy", fields: [parentId], references: [id], onDelete: SetNull)
  children           Account[]           @relation("AccountHierarchy")
  journalEntryLines  JournalEntryLine[]

  @@unique([companyId, code])
}

model JournalEntry {
  id            String             @id @default(cuid())
  companyId     String
  legalEntityId String?
  expenseClaimId String?
  number        String
  entryDate     DateTime           @db.Date
  description   String?
  status        JournalEntryStatus @default(DRAFT)
  totalDebit    Decimal            @default(0) @db.Decimal(18, 2)
  totalCredit   Decimal            @default(0) @db.Decimal(18, 2)
  createdById   String
  postedById    String?
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt

  company       Company            @relation(fields: [companyId], references: [id], onDelete: Cascade)
  legalEntity   LegalEntity?       @relation(fields: [legalEntityId], references: [id], onDelete: SetNull)
  expenseClaim  ExpenseClaim?      @relation(fields: [expenseClaimId], references: [id], onDelete: SetNull)
  createdBy     User               @relation("JournalEntryCreator", fields: [createdById], references: [id], onDelete: Restrict)
  postedBy      User?              @relation("JournalEntryPoster", fields: [postedById], references: [id], onDelete: SetNull)
  lines         JournalEntryLine[]

  @@unique([companyId, number])
  @@index([companyId, entryDate])
}

model JournalEntryLine {
  id            String        @id @default(cuid())
  journalEntryId String
  lineNo        Int
  accountId     String
  vendorId      String?
  costCenterId  String?
  projectId     String?
  description   String?
  debit         Decimal       @default(0) @db.Decimal(18, 2)
  credit        Decimal       @default(0) @db.Decimal(18, 2)
  createdAt     DateTime      @default(now())

  journalEntry  JournalEntry  @relation(fields: [journalEntryId], references: [id], onDelete: Cascade)
  account       Account       @relation(fields: [accountId], references: [id], onDelete: Restrict)
  vendor        Vendor?       @relation(fields: [vendorId], references: [id], onDelete: SetNull)
  costCenter    CostCenter?   @relation(fields: [costCenterId], references: [id], onDelete: SetNull)
  project       Project?      @relation(fields: [projectId], references: [id], onDelete: SetNull)

  @@unique([journalEntryId, lineNo])
}

model ImportJob {
  id            String        @id @default(cuid())
  companyId     String
  requestedById String
  type          String
  status        JobStatus     @default(PENDING)
  sourceFileId  String?
  mappingJson   Json?
  summaryJson   Json?
  errorMessage  String?
  startedAt     DateTime?
  finishedAt    DateTime?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  company       Company       @relation(fields: [companyId], references: [id], onDelete: Cascade)
  requestedBy   User          @relation("ImportJobRequester", fields: [requestedById], references: [id], onDelete: Restrict)
  sourceFile    FileObject?   @relation("ImportSourceFile", fields: [sourceFileId], references: [id], onDelete: SetNull)
  rows          ImportJobRow[]
}

model ImportJobRow {
  id            String        @id @default(cuid())
  importJobId   String
  rowNo         Int
  status        JobStatus     @default(PENDING)
  rawData       Json
  errorMessage  String?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  importJob     ImportJob     @relation(fields: [importJobId], references: [id], onDelete: Cascade)

  @@unique([importJobId, rowNo])
}

model ExportJob {
  id            String        @id @default(cuid())
  companyId     String
  requestedById String
  type          String
  status        JobStatus     @default(PENDING)
  resultFileId  String?
  filterJson    Json?
  summaryJson   Json?
  errorMessage  String?
  startedAt     DateTime?
  finishedAt    DateTime?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  company       Company       @relation(fields: [companyId], references: [id], onDelete: Cascade)
  requestedBy   User          @relation("ExportJobRequester", fields: [requestedById], references: [id], onDelete: Restrict)
  resultFile    FileObject?   @relation("ExportResultFile", fields: [resultFileId], references: [id], onDelete: SetNull)
}

model IntegrationConnection {
  id            String             @id @default(cuid())
  companyId     String
  type          IntegrationType
  name          String
  status        IntegrationStatus  @default(ACTIVE)
  configJson    Json
  lastSyncAt    DateTime?
  lastError     String?
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt

  company       Company            @relation(fields: [companyId], references: [id], onDelete: Cascade)
  events        IntegrationEvent[]

  @@index([companyId, type, status])
}

model IntegrationEvent {
  id            String               @id @default(cuid())
  companyId     String
  connectionId  String?
  direction     IntegrationDirection
  eventType     String
  status        JobStatus            @default(PENDING)
  payload       Json
  receivedAt    DateTime             @default(now())
  processedAt   DateTime?
  errorMessage  String?

  company       Company              @relation(fields: [companyId], references: [id], onDelete: Cascade)
  connection    IntegrationConnection? @relation(fields: [connectionId], references: [id], onDelete: SetNull)

  @@index([companyId, receivedAt])
}

model AuditLog {
  id            String      @id @default(cuid())
  companyId     String?
  actorId       String?
  entityType    String
  entityId      String
  action        String
  beforeJson    Json?
  afterJson     Json?
  metadataJson  Json?
  ipAddress     String?
  userAgent     String?
  createdAt     DateTime    @default(now())

  company       Company?    @relation(fields: [companyId], references: [id], onDelete: SetNull)
  actor         User?       @relation("AuditActor", fields: [actorId], references: [id], onDelete: SetNull)

  @@index([companyId, entityType, entityId])
  @@index([createdAt])
}
```

---

## 6. 이 스키마에서 바로 구현해야 할 첫 기능 순서

### 1단계
- User / PasswordCredential / Company / CompanyMembership
- Department / Position / JobTitle / Employee
- FileObject
- AuditLog

### 2단계
- DocumentTemplate / Document / DocumentVersion
- ApprovalLine / ApprovalStep / ApprovalAction
- SignatureAsset
- PDF render job

### 3단계
- ShiftPolicy / AttendanceRawEvent / AttendanceLedger
- LeavePolicy / LeaveRequest / AttendanceCorrection
- Edge Agent CSV ingest

### 4단계
- Vendor / CostCenter / Project
- ExpenseClaim / ExpenseItem
- Account / JournalEntry / JournalEntryLine

### 5단계
- ImportJob / ExportJob
- IntegrationConnection / IntegrationEvent

---

## 7. 최소 시드 데이터 제안

### 회사/조직
- Company: `ACME_KR`, `Acme Korea`
- LegalEntity: `ACME-KR-LE1`, `주식회사 에이씨미코리아`
- BusinessSite:
  - `SEOUL-HQ`, `서울 본사`
  - `BUSAN-OPS`, `부산 운영센터`

### 부서
- `HR`, `인사팀`
- `FIN`, `재무회계팀`
- `ENG`, `개발팀`
- `OPS`, `운영팀`
- `SALES`, `영업팀`

### 직위
- 사원
- 대리
- 과장
- 차장
- 부장

### 직책
- 팀원
- 파트리드
- 팀장
- 실장

### 사용자
- `admin@acme.local`
- `hr@acme.local`
- `manager@acme.local`
- `employee@acme.local`

### 직원
- 사번 `10000001` 관리자
- 사번 `10000002` HR 관리자
- 사번 `10000003` 결재자
- 사번 `10000004` 일반 직원

### 문서 템플릿
- 휴가신청서
- 근태정정요청서
- 지출결의서
- 경비청구서
- 재직증명서
- 연장근무신청서

### 근태 정책
- 기본 09:00 ~ 18:00
- 점심 60분
- 지각 grace 10분

### 휴가 정책
- 연차
- 반차 오전
- 반차 오후
- 시간차

### 계정과목(최소)
- 1100 현금및현금성자산
- 1200 매출채권
- 2100 매입채무
- 3100 자본금
- 4100 매출
- 5100 급여
- 5200 복리후생비
- 5300 여비교통비
- 5400 소모품비

---

## 8. 구현 시 중요한 설계 메모

1. **문서 상태와 결재 상태를 분리해서 저장하되**, UI에서는 하나처럼 보이게 한다.
2. **AttendanceRawEvent**는 원본 이벤트 저장소다.
3. **AttendanceLedger**는 정규화된 일자 기준 원장이다.
4. 출입기기 원본 데이터는 수정하지 말고, 정정은 **AttendanceCorrection + Approval + Ledger 재계산**으로 처리한다.
5. 회계는 Phase 1에서 **전표와 경비**까지만 잡고, 세금계산/신고 자동화는 다음 단계로 미룬다.
6. 문서 첨부, 경비 영수증, 계약서, 서명 이미지 모두 **FileObject**를 중심으로 연결한다.
7. HWPX는 **docs-service/adapters/hwpx**에서 파서/변환기 스캐폴드를 만들고, HWP는 fallback adapter만 둔다.
8. ADT/S1류 연동은 **IntegrationConnection + Edge Agent + AttendanceRawEvent**로 이어지는 구조를 유지한다.

---

## 9. 첫 API 라우트 제안

```text
POST   /auth/login
POST   /auth/logout
GET    /auth/me

GET    /companies
POST   /companies
GET    /companies/:id

GET    /departments
POST   /departments
PATCH  /departments/:id

GET    /employees
POST   /employees
GET    /employees/:id
PATCH  /employees/:id

POST   /files
GET    /files/:id
GET    /files/:id/download

GET    /document-templates
POST   /documents
GET    /documents/:id
POST   /documents/:id/versions
POST   /documents/:id/submit

POST   /approval-lines/:id/approve
POST   /approval-lines/:id/reject
POST   /approval-lines/:id/cancel

POST   /attendance/raw-events
GET    /attendance/raw-events
GET    /attendance/ledgers
POST   /attendance/corrections

POST   /leave-requests
GET    /leave-requests

POST   /expense-claims
GET    /expense-claims
POST   /journal-entries
GET    /journal-entries

POST   /import-jobs
GET    /import-jobs
POST   /export-jobs
GET    /export-jobs

GET    /audit-logs
GET    /health
GET    /swagger
```

---

## 10. 바로 Codex에 붙여넣을 실행 지시문

```md
Use the folder structure and Prisma schema in this document as the exact starting baseline.

Build a production-oriented self-hosted Korean ERP/work platform with these constraints:

- Monorepo with pnpm + Turborepo
- Next.js web app
- NestJS modular monolith API
- PostgreSQL + Prisma
- Redis + BullMQ worker
- MinIO-backed object storage
- Docker Compose for local/full-stack
- Helm chart for Kubernetes
- Go-based Edge Agent scaffold
- Korean-first HR/attendance/document workflows
- Audit-first architecture
- HWPX-first adapter scaffolding
- Legacy HWP as fallback adapter only

Implementation priorities:
1. Scaffold the full monorepo and deployment files
2. Implement auth, org, employee, and audit modules
3. Implement files, documents, approvals, signatures, and PDF generation
4. Implement attendance raw ingestion, normalization, leave, and attendance correction
5. Implement expenses, accounts, journal entries, import/export
6. Implement integration connection models and Edge Agent mock flow
7. Add seed data, Swagger, tests, ADR docs, README.md, README.ko.md

Important rules:
- Do not redesign the schema unless required for correctness
- Keep a modular monolith for the core API
- Use the schema as the migration baseline
- Create actual code, migrations, seeds, DTOs, services, controllers, tests, and docs
- Prefer working vertical slices over placeholders
- Every important mutation must write audit logs
- Keep company/legal-entity/business-site boundaries explicit
- Treat AttendanceRawEvent as immutable source events
- Normalize into AttendanceLedger through a background job
- Use Document + DocumentVersion + ApprovalLine + ApprovalStep as the document approval backbone
- Use FileObject as the storage backbone for all files
- Keep README and setup instructions runnable by another engineer

Deliverables:
- repository structure
- package/workspace config
- docker compose
- helm chart
- prisma schema and migrations
- seed scripts
- auth flow
- employee CRUD
- file upload/download
- document creation/versioning
- approval flow
- attendance raw ingestion and ledger normalization
- leave request and attendance correction starter
- expense claim starter
- account and journal entry starter
- import/export starter
- edge-agent CSV watcher mock
- Swagger/OpenAPI
- README.md / README.ko.md / PLAN.md / ADRs

Start by creating:
- docs/PLAN.md
- monorepo scaffold
- prisma migration from this schema
- core seed data
- working health checks
- working Swagger bootstrap
- docker compose stack
```

---

## 11. 마지막 정리

이 문서는 다음 3가지를 한 번에 해결하기 위한 것이다.

1. **폴더를 어떻게 나눌지**
2. **DB를 어떤 엔티티로 시작할지**
3. **Codex에 무엇을 기준으로 구현하라고 할지**

가장 중요한 시작점은 아래다.

- `Company / Employee / FileObject / Document / Approval / AttendanceRawEvent / AttendanceLedger / ExpenseClaim / JournalEntry / AuditLog`

처음부터 SAP 전체를 만들려고 하지 말고,  
**직원 + 문서 + 결재 + 근태 + 경비 + 전표**가 실제로 이어지는 하나의 흐름을 먼저 만드는 게 맞다.
