# 한국형 사용자 설치형 ERP/업무플랫폼 청사진  
### (SAP급 통합 방향 + WEHAGO/NAVER WORKS/JANDI/하이웍스 감각 + Codex 빌드용 초안)

- 버전: 0.1
- 작성일: 2026-03-13 (Asia/Seoul)
- 문서 목적: **고객이 직접 서버를 운영하는 사용자 설치형(self-hosted / customer-managed) ERP+협업 플랫폼**을 설계하고, 이 문서를 그대로 **Codex 작업지시서/PRD/기술 설계 초안**으로 쓸 수 있게 만드는 것.

---

## 1. 한 줄 정의

이 제품은 다음처럼 정의하면 된다.

> **“고객이 직접 관리하는 서버 위에 설치되지만, 사용자는 웹과 모바일에서 SaaS처럼 쓰는 한국형 통합 ERP/업무플랫폼”**

즉:

- **설치형** = 서버/DB/스토리지는 고객이 직접 관리
- **웹 기반** = 직원은 브라우저/모바일 앱으로 사용
- **한국형** = 회계, 인사, 근태, 전자결재, 문서, 한글(HWP/HWPX), MS Office, PDF, 출입근태 연동 등에 강함
- **모듈형** = SAP처럼 넓은 범위를 목표로 하되, 처음부터 전부 만들지 않고 모듈을 잘라서 확장
- **오픈소스 친화** = 코어를 공개하고, 커넥터/문서 포맷/배포 스택까지 외부 기여가 가능하게 설계

---

## 2. 제품 포지셔닝

이 제품은 “SAP를 그대로 복제”하는 게 아니라, **SAP의 통합성**을 가져오되 **한국 실무 UX**와 **설치형 배포성**, **문서 친화성**을 강화한 플랫폼으로 잡는 게 맞다.

### 벤치마킹 방향

- **SAP**: 전사 통합 구조, 재무/인사/승인/마스터데이터 중심 사고
- **WEHAGO**: 회계/인사/근태/전자결재/모바일 실무 흐름
- **NAVER WORKS**: 협업, 알림, API/봇/외부 서비스 연동 감각
- **JANDI**: 메신저 중심 협업과 웹훅/조직 연동
- **하이웍스**: 전자결재/인사/메일/회계 API, 실제 ADT 출퇴근 연동 사례

### 핵심 차별점

1. **Self-hosted first**
2. **한국 문서 포맷 우선**
3. **출입근태/전자결재/문서 보존에 강함**
4. **Docker/Kubernetes 배포**
5. **커넥터 에이전트 구조**
6. **오픈소스 커뮤니티가 붙기 쉬운 구조**

---

## 3. 제품 원칙

### 3.1 기본 원칙

1. **단일 제품처럼 보여야 한다**  
   회계, 인사, 근태, 전자결재, 파일, 알림이 따로 노는 느낌이 아니라 하나의 시스템처럼 동작해야 한다.

2. **처음부터 마이크로서비스 과투자 금지**  
   ERP 초기 버전은 기능 간 트랜잭션이 많으므로 **모듈형 모놀리스**가 유리하다.  
   비동기 작업(알림, 인덱싱, 문서변환, 배치)만 별도 워커로 분리한다.

3. **설치형이지만 운영 난이도는 SaaS처럼 낮춰야 한다**  
   작은 고객은 `docker compose up -d` 수준, 큰 고객은 Helm/Kubernetes로 운영 가능해야 한다.

4. **한국 실무를 엔티티 레벨에서 반영해야 한다**  
   단순 번역 수준이 아니라 다음을 기본 모델로 반영:
   - 법인 / 사업장 / 부서
   - 직위 / 직책 / 직군
   - 사번 / 비용센터 / 프로젝트
   - 결재선 / 협조 / 합의 / 참조 / 수신
   - 휴가 / 대체휴무 / 연장 / 야간 / 휴일근로
   - 지급 / 공제 / 비과세 / 증명서 / 근로계약

5. **문서가 단순 첨부가 아니라 업무의 중심이어야 한다**
   - 업로드
   - 추출
   - 승인
   - 서명
   - 보관
   - 감사 추적
   - PDF/HWPX/DOCX 재출력

6. **공개 API + 에이전트 + 배치 import를 같이 가져가야 한다**
   한국 현장 시스템은 공개 REST API만으로는 안 풀리는 경우가 많다.

---

## 4. 현실적인 목표 설정

SAP급 범위는 크다. 따라서 처음부터 다음을 전부 노리면 실패 확률이 높다.

### 4.1 1차 제품(MVP)에서 반드시 잡을 것

- 조직/권한/SSO
- 직원 마스터
- 근태/휴가/출퇴근 이벤트
- 전자결재
- 문서 저장/서명/감사로그
- 비용/경비/기초 회계
- 데이터 import/export
- 알림/협업 연동
- Docker/K8s 배포

### 4.2 2차 제품에서 확장

- 급여 계산 엔진 고도화
- 세금/신고 보조
- 구매/판매/AP/AR
- 프로젝트/원가
- 모바일 앱
- 대시보드/BI
- 외부 그룹웨어/메신저 양방향 연동

### 4.3 3차 제품 이후

- 제조/MRP
- 재고/물류/WMS
- 다법인 연결회계
- 고급 예산/자금
- SCM/EDI
- AI 비서/에이전트 자동화

---

## 5. 추천 아키텍처

## 5.1 전체 방향

**권장 구조:**
- **웹 앱:** Next.js + TypeScript
- **백엔드 코어:** NestJS 기반 모듈형 모놀리스
- **비동기 작업:** Worker (BullMQ/Redis)
- **DB:** PostgreSQL
- **캐시/큐:** Redis
- **파일 저장:** MinIO 또는 고객 S3 호환 스토리지
- **검색:** 초기엔 PostgreSQL Full Text Search, 이후 OpenSearch 확장
- **문서 변환/추출:** 별도 document service
- **커넥터 에이전트:** Go 또는 .NET 기반의 경량 에이전트
- **배포:** Docker Compose + Helm Chart + (추후) Operator
- **GitOps:** Argo CD 선택 가능

### 왜 이 구성이 좋은가

- ERP는 초기에는 기능 간 결합이 높아서 **모듈형 모놀리스**가 개발 속도와 안정성 모두 유리
- 문서 변환, 검색 인덱싱, 배치 처리, 알림은 **비동기 워커**로 빼는 게 좋음
- 한국형 출입근태 시스템 연동은 종종 **Windows 로컬 프로그램/DB**와 맞물리므로, 본체와 별도로 **에이전트**를 두는 게 현실적임
- Docker/Kubernetes로 OS 제약을 줄일 수 있지만, **실제 프로덕션은 Linux를 1순위 표준**으로 잡는 게 안전함  
  (Windows/macOS는 개발환경 또는 Edge Agent 쪽에 우선 적용)

---

## 5.2 배포 토폴로지

### A. 소규모 / PoC / 단일 고객
- Docker Compose
- 단일 VM
- 내부 Reverse Proxy
- PostgreSQL / Redis / MinIO 같이 올림

### B. 표준 운영
- Kubernetes
- Helm chart 배포
- 외부 PostgreSQL 또는 StatefulSet
- 외부 object storage 또는 MinIO
- Ingress + TLS
- 백업/복구 Job

### C. 엔터프라이즈 / 폐쇄망
- Kubernetes 또는 OpenShift 계열
- Air-gapped 이미지 번들
- 내부 인증서/사설 CA
- 외부 인터넷 없는 업데이트 패키지
- 감사로그/백업/감사보고서 강화

---

## 5.3 ASCII 아키텍처

```text
[Browser / Mobile]
        |
   [Ingress / Proxy]
        |
     [Web App]
        |
      [API]
   ____/ |  \________________________
  /      |                           \
[DB]   [Redis]                    [MinIO/Object Storage]
         |
      [Worker]
         |
  ----------------------------
  |            |             |
[Docs]     [Search]    [Notification]
 Service      Index        Service
  |
[Template / PDF / HWPX / DOCX pipeline]

             [Integration Hub API]
                    ^
                    |
      ------------------------------------
      |                  |               |
[Windows/Linux Agent] [Webhook/API] [CSV/SFTP Import]
      ^
      |
[ADT / 에스원 / 기타 출입관리 / 레거시 DB]
```

---

## 5.4 모노레포 예시

```text
/apps
  /web                 # Next.js
  /api                 # NestJS core
  /worker              # queue workers
  /docs-service        # conversion / extraction / rendering
  /connector-gateway   # external integration ingress
/agents
  /edge-agent          # Go or .NET, Windows/Linux compatible
/packages
  /ui
  /domain
  /contracts
  /sdk
  /shared
/deploy
  /compose
  /helm
/docs
  /adr
  /api
  /ops
```

---

## 6. 핵심 도메인 설계

## 6.1 공통 마스터 데이터

가장 먼저 잘 잡아야 할 것:

- 회사
- 법인
- 사업장
- 부서
- 직위
- 직책
- 직원
- 사번
- 비용센터
- 프로젝트
- 거래처
- 계정과목
- 문서 템플릿
- 결재 템플릿
- 근무정책
- 휴가정책
- 서명/도장 자산

이 마스터가 흔들리면 ERP 전체가 흔들린다.

---

## 6.2 모듈 권장 순서

| 우선순위 | 모듈 | 이유 |
|---|---|---|
| 1 | 조직/사용자/권한 | 모든 기능의 기반 |
| 2 | 문서/파일/전자결재 | 한국 실무의 핵심 |
| 3 | 근태/휴가/출퇴근 | ADT/에스원 등과 직접 연결 가능 |
| 4 | 경비/지출/기초회계 | ERP다운 가치를 바로 보여줌 |
| 5 | 알림/협업 연동 | NAVER WORKS/JANDI/하이웍스와 연결 가능 |
| 6 | 급여/정산 | 법/규정 반영이 어려워 2차로 확장 추천 |
| 7 | 구매/판매/AP/AR | 재무 확장 |
| 8 | 제조/물류 | 후순위 |

---

## 6.3 MVP에 넣을 엔티티 예시

### HR/근태
- Employee
- EmploymentContract
- AttendanceRawEvent
- AttendanceLedger
- ShiftPolicy
- LeaveRequest
- OvertimeRequest
- AttendanceCorrection

### 결재/문서
- Document
- DocumentVersion
- ApprovalLine
- ApprovalAction
- SignatureAsset
- SealAsset
- ExportJob
- AuditTrail

### 재무
- Account
- JournalEntry
- ExpenseClaim
- Vendor
- CostCenter
- Project
- AttachmentEvidence

---

## 7. 한국 친화 기능 요구사항

## 7.1 한국 조직/결재 UX

반드시 한국식으로 느껴져야 하는 부분:

- 사번 중심 직원 식별
- 부서/직위/직책 분리
- 결재 / 협조 / 합의 / 참조 / 수신
- 회사 직인 / 부서 도장 / 개인 서명
- 기안문/품의서/지출결의서/출장신청/휴가신청/근로계약/증명서
- 조직도 기반 결재선 자동 추천
- 한글 이름/영문 이름 동시 지원
- 주민등록번호 등 민감정보는 마스킹/권한 분리

---

## 7.2 한국 근무제도 친화

초기부터 옵션화해야 하는 정책:

- 주 5일 / 교대 / 시차 / 선택 / 탄력 / 재택
- 휴게시간 규칙
- 연장근로
- 야간근로
- 휴일근로
- 대체휴무
- 연차 / 반차 / 반반차
- 사업장별 캘린더
- 근무장소 / 원격근무
- 카드/지문/얼굴인식/모바일 출입 기록

> 중요한 점: **근태 규칙과 급여 규칙은 코드에 하드코딩하지 말고 버전 가능한 정책 엔진**으로 분리하는 게 좋다.

---

## 7.3 한국 문서 포맷 지원

최소 지원 목표:

### 입력
- CSV
- XLSX
- DOCX
- PDF
- PNG/JPG
- HWPX
- HWP (fallback 또는 옵션)

### 출력
- CSV
- XLSX
- JSON
- PDF
- DOCX
- HWPX(가능하면)
- HWP(옵션/커넥터 기반)

### 중요한 판단

1. **HWPX를 1급 시민(first-class) 포맷으로 다룬다**
2. **HWP는 별도 호환/변환 레이어로 분리한다**
3. 내부 업무 모델은 **JSON + HTML + PDF**를 중심 표준으로 둔다

이렇게 해야 문서 처리 파이프라인이 단단해진다.

---

## 8. 문서 업로드 / 추출 / 서명 설계

## 8.1 업로드 파이프라인

```text
Upload
 -> antivirus scan
 -> checksum/hash
 -> metadata extraction
 -> parser/converter
 -> normalized text/table/json
 -> human validation (optional)
 -> business workflow binding
 -> archive / retention policy
```

### 필수 기능

- Drag & Drop / 다중 업로드
- 대용량 업로드
- 버전관리
- 원본 보존
- 해시값 저장
- MIME/확장자 검증
- 미리보기
- 접근권한 제어
- 다운로드 워터마크(추후)

---

## 8.2 데이터 추출 전략

### 우선순위
1. **구조화 파일(CSV/XLSX/JSON)**
2. **디지털 문서(HWPX/DOCX/PDF text)**
3. **스캔 문서(PDF image/JPG/PNG) OCR**

### 현실적인 권장 사항
- MVP에서는 **OCR을 핵심 의존성으로 두지 말고**, 디지털 원본 추출 중심으로 가는 게 좋다.
- HWPX는 XML 기반이라 추출이 유리하다.
- PDF도 텍스트 PDF와 이미지 PDF를 구분해서 처리한다.
- 스캔 문서는 “추출 후보 제시 + 사람 검토” 흐름이 낫다.

---

## 8.3 서명/전자결재 설계

### 1차 버전
- 내부 결재용 전자서명
- 이름/직책/시각/의견/결정 상태
- 개인 서명 이미지/도장 이미지
- PDF 증빙본 생성
- 감사로그 저장

### 2차 버전
- 외부 수신자 서명 요청
- 링크 기반 서명
- OTP/이메일/SMS 인증
- 다자 서명
- 만료일/재서명

### 증빙 패키지에 포함할 것
- 원문 해시
- 서명 후 PDF
- 서명자 식별자
- 결재선
- IP / User-Agent
- 생성/수정/결재 시각
- 문서 버전

> 법적 효력 이슈는 문서 종류마다 다르므로, “전자문서/전자서명 일반 효력”은 활용하되 **특정 계약/노무/금융 문서는 별도 법무 검토**가 필요하다.

---

## 9. HWP/HWPX 대응 원칙

공개된 한컴 자료 기준으로 보면:

- **HWP 포맷 사양은 공개되어 있음**
- **HWPX는 개방형 포맷이며 국가표준(KS X 6101)**
- **HWP는 바이너리, HWPX는 XML 기반**
- **HWPX가 데이터 추출/멀티플랫폼 호환에 유리**

따라서 제품 전략은 아래가 맞다.

### 권장 전략

#### A. 무조건 HWPX 우선
- 문서 저장/템플릿/추출의 기준 포맷을 HWPX로 생각
- 공문/양식/보존 문서도 HWPX/PDF/A 중심

#### B. HWP는 별도 호환 레이어
- HWP 원본 보존
- 텍스트/메타데이터 추출은 가능 범위만 지원
- 편집/재저장은 별도 변환기 또는 라이선스 컴포넌트 사용

#### C. 문서 편집과 문서 보존을 분리
- 보존 포맷: PDF/A + 원본
- 편집 포맷: HTML / DOCX / HWPX
- 배포본: PDF

### 아주 중요한 현실 메모
**HWPX는 오픈소스 친화적으로 다루기 쉽지만, HWP 완전 편집 호환은 난이도가 높다.**  
그래서 “완전 HWP 편집기”를 처음부터 코어 목표로 잡기보다:

1. HWPX 처리 강화  
2. HWP import/preview/변환은 별도 서비스  
3. 고객이 원하면 한컴 SDK/상용 커넥터 연결  

이 3단 구조가 현실적이다.

---

## 10. 출입근태(ADT, 에스원/S1 등) 연동 전략

이 부분은 한국형 ERP에서 꽤 중요하다.

## 10.1 설계 결론

> **ADT/에스원 연동은 ‘공개 REST API만 기대하는 방식’보다 ‘로컬 프로그램/DB/export를 읽는 Edge Agent 방식’이 현실적이다.**

검증 가능한 공개 자료들을 보면, 실제 운영 가이드/사례는 다음 패턴을 보여준다.

- ADT 관련 연동은 **Access Server Manager / Remote Access Manager / 외부전송 DB** 같은 로컬 구성에 의존
- 에스원(SECOM) 연동은 **세콤매니저(근태·식당)** 같은 로컬 프로그램과 DB 접근을 전제로 함
- 하이웍스 사례 역시 **보안 단말기 로컬 DB -> API 서버 -> 근태 DB** 구조를 설명함

즉, 우리 시스템도 이렇게 설계하는 게 맞다.

---

## 10.2 권장 연동 구조

```text
출입기기
 -> 벤더 로컬 서버/프로그램
 -> Edge Agent (Windows/Linux)
 -> Integration Hub
 -> AttendanceRawEvent
 -> 규칙 엔진
 -> AttendanceLedger
 -> 예외/보정 결재
 -> 급여/통계/리포트
```

### Edge Agent 역할
- 로컬 DB read-only 접근
- 파일 export 감시
- 주기 동기화
- 사번/직원 매핑
- 중복 제거
- 재전송/버퍼링
- 네트워크 장애 시 local queue 저장
- TLS/토큰 기반 전송

### 하지 말아야 할 것
- ADT/에스원 원본 DB에 직접 write
- 고객사 운영 PC 설정을 깨는 설치
- 본체 ERP가 출입기기 DB에 직접 붙는 구조

---

## 10.3 커넥터 우선순위

| 단계 | 방식 | 설명 |
|---|---|---|
| 1 | Edge Agent + DB/export 연동 | 가장 현실적 |
| 2 | 벤더 공식 API/계약 API | 가능 시 사용 |
| 3 | CSV 배치 import | 예비 수단 |
| 4 | 수동 보정 UI | 필수 안전장치 |

---

## 10.4 근태 처리 모델

출입 이벤트를 그대로 출근/퇴근으로 쓰면 안 된다.  
반드시 아래 2단계로 나눈다.

### Raw Layer
- 기기 시각
- 사용자 ID
- 이벤트 종류
- 장치 ID
- 위치
- 원본 payload

### Ledger Layer
- 출근 시각
- 퇴근 시각
- 지각/조퇴
- 휴게 반영
- 연장/야간/휴일
- 정책 버전
- 보정 여부
- 승인 문서 링크

이렇게 해야 나중에 규칙이 바뀌어도 재계산이 가능하다.

---

## 11. 외부 서비스 연동 방향

## 11.1 연동 카테고리

### 협업/알림
- NAVER WORKS
- JANDI
- 하이웍스 메신저/메일
- SMTP/Teams/Slack (선택)

### 그룹웨어/조직 동기화
- 하이웍스
- JANDI 조직 API
- OIDC/LDAP/AD

### ERP/회계/인사 이전 데이터
- CSV/XLSX
- 기존 ERP export 파일
- DB dump mapping
- 파트너용 migration SDK

---

## 11.2 공개 정보 기준의 현실적 난이도

| 시스템 | 공개 연동 표면 | 추천 역할 |
|---|---|---|
| NAVER WORKS | 공개 API/개발자 문서 분명함 | 알림/봇/조직/캘린더 레퍼런스 |
| JANDI | 웹훅 + 조직 Open API(조건부) | 메신저 알림/조직 연동 |
| 하이웍스 | 공개 개발자센터/API 범위 넓음 | 전자결재/인사/메일/조직 연동 레퍼런스 |
| WEHAGO | 공식 자료에서 서비스 API 연동 언급, 다만 공개 개발자 표면은 비교적 덜 명확 | 제품 레퍼런스, 파트너 연동 검토 대상 |
| ADT/에스원 | 공개 범용 API보다 현장형 로컬 연동 패턴이 더 뚜렷 | Edge Agent 구조로 접근 |

---

## 12. 보안 / 감사 / 컴플라이언스

## 12.1 기본 보안 요구사항

- OIDC / SAML SSO
- 2FA
- RBAC
- 민감정보 필드 마스킹
- 파일 접근권한
- 모든 변경 이력 Audit Trail
- API Token / OAuth Scope
- Secret externalization
- DB/스토리지 암호화
- TLS 기본
- 백업/복구 테스트
- 삭제 정책 / 보존 정책
- 관리자 행위 감사로그

---

## 12.2 한국 실무상 특히 중요한 항목

- 근로계약/휴가/근태 보정 문서 이력
- 급여 관련 접근 권한 분리
- 직원 개인정보 동의 이력
- 전자결재의 수정/반려/재기안 추적
- 문서 해시 보관
- 법인/사업장 단위 데이터 분리
- 수출용 파일 마스킹/익명화

---

## 12.3 법/제도 관련 설계 메모 (법률 자문 아님)

공식 법령 자료를 기준으로 제품 수준에서 참고할 만한 포인트는 아래와 같다.

1. **전자서명은 전자적 형태라는 이유만으로 효력이 부인되지 않는다**
2. **전자문서는 전자적 형태라는 이유만으로 법적 효력이 부인되지 않는다**
3. **개인정보 동의도 전자문서 형태를 활용할 수 있으나, 중요 내용을 명확히 표시해야 한다**
4. **근태/급여 시스템은 연장·야간·휴일근로 가산 규칙을 반드시 모델링해야 한다**

따라서 제품에는 최소한 다음이 있어야 한다.

- 동의서 템플릿 버전관리
- 동의 화면/문서 아카이브
- 서명/동의 시각 및 주체 로그
- 근태 정책 버전관리
- 계산 근거 추적

---

## 13. 파일 포맷 및 문서 엔진 제안

## 13.1 내부 표준 포맷

내부적으로는 아래 3개를 핵심 표준으로 두는 게 좋다.

- **JSON**: 업무 데이터
- **HTML**: 렌더링/템플릿
- **PDF**: 배포/보존

### 외부 포맷은 어댑터로 처리
- HWPX
- HWP
- DOCX
- XLSX
- CSV
- PDF
- 이미지

---

## 13.2 문서 템플릿 엔진

권장 방향:

- 템플릿은 HTML 기반
- PDF는 HTML -> PDF 렌더링
- DOCX/HWPX export는 별도 adapter
- 표/도장/서명/승인 이력은 공통 block component로 표준화

### 템플릿 예시
- 근로계약서
- 재직증명서
- 경력증명서
- 휴가신청서
- 품의서
- 지출결의서
- 출장신청서
- 급여명세서
- 근태정정요청서

---

## 14. 데이터 import/export 센터

이 기능은 반드시 별도 제품처럼 다뤄야 한다.

## 14.1 Import
- CSV/XLSX 템플릿 다운로드
- 컬럼 매핑
- 미리보기
- validation 결과
- 에러 행만 재업로드
- 대량 사번/조직/휴가 잔액/거래처 import
- 문서 대량 첨부

## 14.2 Export
- CSV/XLSX/PDF/JSON
- 필터 저장
- 예약 export
- 암호화 압축
- 다운로드 만료
- export 감사로그

## 14.3 Migration Toolkit
- 기존 ERP/그룹웨어/출입근태 시스템에서 이관
- 부서/직원/결재양식/첨부파일/휴가잔액/거래처/계정과목 이관
- dry-run 모드 제공

---

## 15. 오픈소스 전략

사용자 설치형 제품을 만들면서 오픈소스까지 염두에 두려면, 처음부터 레포 구조와 공개 범위를 분리해야 한다.

## 15.1 공개하기 좋은 영역

1. **Core schema / API contracts**
2. **Connector SDK**
3. **HWPX parser / document normalization**
4. **CSV/XLSX import engine**
5. **Helm/Compose 배포 스택**
6. **Audit log middleware**
7. **Approval workflow engine**
8. **Sample template packs**

## 15.2 처음부터 닫아두지 않는 게 좋은 이유

- 설치형은 고객별 커스터마이징 수요가 많다
- 한국형 출입근태/문서 포맷은 커뮤니티 기여 포인트가 많다
- 해외 오픈소스 ERP에는 한국 실무 기능이 비어있는 경우가 많아 기여 여지가 큼

## 15.3 라이선스 추천

### 선택지 A: Apache-2.0
- 기업 도입 친화적
- 외부 기여 유도 쉬움
- 파트너 생태계 만들기 좋음

### 선택지 B: AGPLv3
- 네트워크 배포 재공개 압박 가능
- “오픈코어 잠식 방지”에는 유리
- 엔터프라이즈 도입 장벽은 더 큼

### 개인적인 추천
- **코어/SDK/배포도구는 Apache-2.0**
- 고객사 전용 커스텀이나 유상 지원은 별도 계약
- 아주 민감한 상용 커넥터만 옵션화

---

## 16. 바로 기여하기 좋은 오픈소스 경로

처음부터 완전 신규 ERP를 만드는 것과 별개로, 아래 경로는 지금 바로 시작하기 좋다.

### 경로 1. 기존 ERP에 한국형 기여
- ERPNext/Frappe
- Odoo Community / OCA

기여 포인트:
- 한국어 로컬라이제이션
- HWPX import/export
- 한국 전자결재 템플릿
- 근태/휴가 한국 정책 pack
- 출입근태 connector

### 경로 2. 독립 컴포넌트부터 공개
- HWPX parser
- Approval workflow engine
- Attendance normalization engine
- ADT/에스원 edge agent
- Helm chart / GitOps 배포 패키지

### 경로 3. “ERP 본체”보다 “도구 체인”을 먼저 공개
이게 오히려 커뮤니티 반응이 좋을 수 있다.

---

## 17. 개발 로드맵 제안

## 17.1 0~4주
- 모노레포 생성
- Compose/Helm 초안
- 인증/권한
- 회사/부서/직원 CRUD
- 파일 업로드/MinIO
- 감사로그 기반

## 17.2 5~8주
- 전자결재 엔진
- 문서 템플릿
- PDF export
- 서명/도장/결재선
- import/export 센터

## 17.3 9~12주
- AttendanceRawEvent / Ledger
- 휴가/근태 정책
- CSV import 기반 출퇴근
- Edge Agent 프로토타입
- 근태 보정 결재

## 17.4 13~18주
- 경비/지출
- 계정과목/전표
- 첨부 증빙 연결
- 통계/대시보드 초안

## 17.5 19주 이후
- ADT/에스원 실연동
- 하이웍스/JANDI/NAVER WORKS 알림 연동
- 급여/정산 고도화
- 다법인/프로젝트/원가
- 모바일 앱

---

## 18. Codex 작업지시용 스타터 프롬프트

아래 프롬프트는 Codex에게 넘겨서 초기 골격을 만드는 데 쓸 수 있다.

```md
You are building a self-hosted, Korean-friendly ERP and work platform.

Primary goal:
- Customer-managed deployment (self-hosted)
- Web-based UX for employees/admins
- Modular ERP architecture with finance, HR, attendance, approvals, documents, import/export, integrations
- Docker Compose for small installs
- Helm/Kubernetes for standard production
- Open-source friendly structure

Technical constraints:
- Monorepo
- Next.js + TypeScript for web
- NestJS modular monolith for core API
- PostgreSQL + Redis + MinIO
- Separate worker services for async processing
- Separate edge-agent for attendance/access-control integrations
- API-first design
- Strong audit logging
- Korean-first UX and document flows

Modules to scaffold:
1. Auth / RBAC / Org
2. Employee master
3. Document storage + versioning
4. Approval workflow
5. Signature / seal / PDF export
6. Attendance raw event ingestion + normalization
7. Import/export center
8. Expense / journal entry starter
9. Integration hub
10. Deploy stack (Compose + Helm)

Rules:
- Do not start with microservices everywhere.
- Use modular monolith boundaries with clear domain packages.
- Every entity change must emit audit logs.
- Every module must have OpenAPI schemas, tests, migrations, seed data.
- Build synthetic fixtures for Korean HR/attendance examples.
- Keep HWPX as first-class import/export target; treat legacy HWP as adapter/fallback.
- Provide docs and ADRs.

Deliverables:
- repository structure
- Docker Compose
- Helm chart
- initial database schema
- auth flow
- employee CRUD
- document upload/download/versioning
- approval line engine
- attendance raw event table and normalization job
- seed data and sample templates
```

---

## 19. Codex용 첫 이슈 목록

1. `feat(repo): create monorepo skeleton`
2. `feat(auth): oidc-ready auth and RBAC`
3. `feat(org): company/department/employee master`
4. `feat(storage): minio-backed file service`
5. `feat(audit): global audit trail middleware`
6. `feat(approval): approval line + approval action engine`
7. `feat(docs): html template to pdf export`
8. `feat(import): csv/xlsx import wizard`
9. `feat(attendance): raw event ingestion + normalization`
10. `feat(agent): edge-agent PoC for CSV/DB sync`
11. `feat(finance): chart of accounts + journal entry starter`
12. `ops(deploy): compose + helm + backup job`

---

## 20. 리스크와 회피 전략

## 20.1 “처음부터 SAP처럼 전부 만들겠다”
- 위험: 너무 넓어서 실패
- 대응: **HR/문서/근태/결재/기초회계부터**

## 20.2 “HWP 완전 편집을 코어 기능으로”
- 위험: 개발 복잡도 폭증
- 대응: **HWPX 우선 + HWP adapter 분리**

## 20.3 “모든 고객 커스텀을 코어에 반영”
- 위험: 제품이 붕괴
- 대응: **plugin/extension point 설계**

## 20.4 “마이크로서비스를 일찍 도입”
- 위험: 운영 복잡도와 디버깅 비용 증가
- 대응: **모듈형 모놀리스 + 비동기 워커**

## 20.5 “출입근태는 API 하나면 되겠지”
- 위험: 현장 시스템과 안 맞음
- 대응: **Edge Agent + DB/export 수용**

---

## 21. 최종 추천 결론

이 프로젝트의 가장 좋은 시작점은 다음이다.

### 제품 정의
- **한국형 사용자 설치형 ERP + 문서/결재 + 출입근태 허브**

### 기술 정의
- **Next.js + NestJS + PostgreSQL + Redis + MinIO**
- **Docker Compose + Helm**
- **모듈형 모놀리스**
- **Edge Agent 구조**
- **HWPX 우선, HWP는 어댑터**
- **Audit-first**

### 사업/오픈소스 정의
- **코어는 오픈소스 친화적으로**
- **고객별 커스터마이징은 플러그인/커넥터로**
- **처음 공개할 건 HWPX, 결재엔진, 출입근태 에이전트 같은 독립 부품부터**

---

## 22. 내가 이 문서에서 중요하게 본 포인트 요약

- 사용자 설치형은 곧 **고객이 서버를 운영**한다는 뜻이다.
- 그래도 사용자는 **웹에서 그냥 SaaS처럼 써야** 한다.
- 운영체제 제약은 Docker/Kubernetes로 **최소화**하되, 프로덕션 표준은 Linux가 좋다.
- 한국형 ERP는 **문서, 결재, 근태, 사번, 도장, 증빙**이 강해야 한다.
- ADT/에스원 연동은 **API 환상보다 Edge Agent 현실주의**가 맞다.
- 문서 포맷은 **HWPX 우선**이 가장 전략적이다.
- SAP처럼 넓게 가되, 제품은 **작게 쪼개서 깊게** 시작해야 한다.
- 오픈소스 기여는 충분히 가능하고, 오히려 **문서 포맷/근태 커넥터/배포스택**부터가 좋은 출발점이다.

---

## 23. 검증된 레퍼런스에서 뽑은 설계 힌트

### 23.1 NAVER WORKS
- 공식 문서상 NAVER WORKS 데이터에 접근하고 제어하는 API를 제공
- 봇/인증/API 호출 문서가 분리되어 있어 외부 연동 레퍼런스로 좋음

### 23.2 하이웍스
- 공식 개발자센터에서 전자결재, 인사, 메일, 메신저 알림, 회계 정보, SSO, 조직 연동 API를 제공
- 실제 ADT 캡스와 출퇴근 연동 사례를 공개하고 있어 “로컬 DB -> API 서버 -> 근태관리” 구조 힌트를 줌

### 23.3 JANDI
- 웹훅과 커넥트 기능이 명확
- 1000명 이상 팀 대상 조직도 Open API 정보를 공개
- 메신저/알림/조직 동기화 레이어의 레퍼런스로 적합

### 23.4 WEHAGO
- 공식 자료에서 회계/인사/근태/전자결재/모바일(NAHAGO) 흐름을 강하게 보여줌
- 공식 자료에서 서비스 API 연동을 언급
- 다만 내가 공개적으로 확인한 범위에서는 NAVER WORKS/하이웍스처럼 공개 개발자 문서 표면이 또렷하진 않아서, 초기에는 “경쟁/레퍼런스 제품”으로 두는 것이 안전

### 23.5 한컴 HWP/HWPX
- HWP 사양 공개 자료 존재
- HWPX는 개방형 문서 포맷이며 XML 기반
- 한국형 문서 처리에서 HWPX 우선을 정당화해 줌

### 23.6 ADT/에스원 현장 연동
- 공개 가이드들에서 로컬 관리 프로그램, 외부전송 DB, 세콤매니저, Access Server Manager 등과 연동하는 패턴이 보임
- 따라서 “Windows 근처 에이전트 + 핵심 ERP 본체는 Linux/K8s” 구조가 매우 현실적

---

## 24. 참고자료 / 확인한 문서

### 공식/공식에 준하는 레퍼런스
1. NAVER WORKS 개요  
   https://api-gov.ncloud-docs.com/docs/naverworks-overview

2. NAVER WORKS Developers  
   https://developers.worksmobile.com/kr/index

3. 하이웍스 개발자센터  
   https://developers.hiworks.com/docs

4. 하이웍스 ADT 캡스 연동 사례  
   https://developers.hiworks.com/case-studies/adt

5. JANDI 조직도 Open API 가이드  
   https://support.jandi.com/ko/articles/%EC%A1%B0%EC%A7%81%EB%8F%84-JANDI-OPEN-API-%EC%97%B0%EB%8F%99-%EB%B0%A9%EB%B2%95%EC%9D%84-%EC%95%8C%EA%B3%A0-%EC%8B%B6%EC%8A%B5%EB%8B%88%EB%8B%A4-ddeaa481

6. JANDI Connect 카테고리  
   https://support.jandi.com/ko/categories/%EC%BB%A4%EB%84%A5%ED%8A%B8-3c9dda43

7. WEHAGO 공식 자료(회계/인사/근태/API 연동/NAHAGO 언급)  
   https://www.wehago.com/event/seminar/2025/ai/c/

8. 한컴 HWP 파일 형식 공개  
   https://store.hancom.com/etc/hwpDownload.do

9. 한컴 HWPX FAQ  
   https://www.hancom.com/support/faqCenter/faq/detail/2784

10. 한컴 SDK  
    https://stg.sdk.hancom.com/sdks/1

11. Docker Compose 공식 문서  
    https://docs.docker.com/compose/

12. Kubernetes Operator 공식 문서  
    https://kubernetes.io/docs/concepts/extend-kubernetes/operator/

13. Helm Charts 공식 문서  
    https://helm.sh/docs/topics/charts/

14. Argo CD 공식 문서  
    https://argo-cd.readthedocs.io/en/stable/

15. 전자서명법  
    https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=236201

16. 전자문서 및 전자거래 기본법  
    https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=236053

17. 개인정보 보호법 관련 조문/동의 방식  
    https://www.law.go.kr/LSW//lsLawLinkInfo.do?chrClsCd=010202&lsId=011357&lsJoLnkSeq=900077468&print=print

18. 근로기준법 제56조  
    https://www.law.go.kr/LSW//lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0056&lsiSeq=265959&urlMode=lsScJoRltInfoR

19. ERPNext 공식 소개  
    https://frappe.io/erpnext

20. ERPNext GitHub  
    https://github.com/frappe/erpnext

21. Odoo Community GitHub  
    https://github.com/odoo/odoo

22. Odoo on-premise source install 문서  
    https://www.odoo.com/documentation/19.0/administration/on_premise/source.html

### 현장 운영 패턴 참고용 (비공식이지만 실무 흐름 확인에 유용)
23. flex ADT 캡스 연동 가이드  
    https://guide.flex.team/ko/articles/10293435-adt%EC%BA%A1%EC%8A%A4-%EC%97%B0%EB%8F%99-%EA%B0%80%EC%9D%B4%EB%93%9C

24. flex 세콤(에스원) 연동 가이드  
    https://guide.flex.team/ko/articles/10293826-%EC%84%B8%EC%BD%A4-%EC%97%90%EC%8A%A4%EC%9B%90-%EC%97%B0%EB%8F%99-%EA%B0%80%EC%9D%B4%EB%93%9C

25. JOBCAN ADT 캡스 연동 설치 가이드  
    https://jobcan-global-am.zendesk.com/hc/ko-kr/articles/12824984070287-ADT-%EC%BA%A1%EC%8A%A4-%EC%97%B0%EB%8F%99-%EC%B6%9C%ED%87%B4%EA%B7%BC%EC%B2%B4%ED%81%AC-%ED%94%84%EB%A1%9C%EA%B7%B8%EB%9E%A8-%EC%84%A4%EC%B9%98

26. JOBCAN 에스원 SECOM 연동 설치 가이드  
    https://jobcan-global-am.zendesk.com/hc/ko-kr/articles/14287045891343-%EC%97%90%EC%8A%A4%EC%9B%90SECOM-%EC%97%B0%EB%8F%99-%EC%B6%9C%ED%87%B4%EA%B7%BC%EC%B2%B4%ED%81%AC-%ED%94%84%EB%A1%9C%EA%B7%B8%EB%9E%A8-%EC%84%A4%EC%B9%98

---

## 25. 마지막 메모

이 문서는 “기술 문서”이면서 동시에 “제품 전략 문서”다.  
정리하면, 가장 좋은 시작은 이렇다.

> **SAP처럼 넓게 보되, 한국형 실무 흐름(문서/결재/근태/회계)을 중심으로 작게 시작하고, 배포는 Self-hosted, UX는 SaaS처럼, 문서는 HWPX 우선, 현장 연동은 Edge Agent 중심, 코어는 오픈소스 친화적으로 설계한다.**
Do not stay at architecture-only level. Create actual code, migrations, tests, seeds, Docker files, Helm files, and runnable documentation. Prefer a working vertical slice over broad placeholders.
