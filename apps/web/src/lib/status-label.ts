type Translator = (koreanText: string, englishText: string) => string;

const STATUS_LABELS: Record<string, [ko: string, en: string]> = {
  ACTIVE: ["활성", "Active"],
  APPROVED: ["승인", "Approved"],
  ARCHIVED: ["보관", "Archived"],
  ABSENT: ["결근", "Absent"],
  CANCELED: ["취소", "Canceled"],
  COMPLETED: ["완료", "Completed"],
  DRAFT: ["초안", "Draft"],
  EARLY_LEAVE: ["조퇴", "Early Leave"],
  FAILED: ["실패", "Failed"],
  HOLIDAY: ["휴일", "Holiday"],
  IN_REVIEW: ["결재 진행중", "In Review"],
  LATE: ["지각", "Late"],
  NEEDS_REVIEW: ["검토 필요", "Needs Review"],
  NORMAL: ["정상", "Normal"],
  ON_LEAVE: ["휴가", "On Leave"],
  PENDING: ["대기", "Pending"],
  POSTED: ["전표 반영", "Posted"],
  REQUESTED: ["요청", "Requested"],
  REJECTED: ["반려", "Rejected"],
  REVERSED: ["역분개", "Reversed"],
  RUNNING: ["실행중", "Running"],
  SKIPPED: ["건너뜀", "Skipped"],
  SUBMITTED: ["상신됨", "Submitted"],
  SUCCEEDED: ["성공", "Succeeded"],
  TERMINATED: ["비활성", "Inactive"],
  WAITING: ["순번 대기", "Waiting"],
  WEEKEND: ["주말", "Weekend"]
};

const APPROVAL_STEP_TYPE_LABELS: Record<string, [ko: string, en: string]> = {
  APPROVE: ["승인", "Approve"],
  CONSULT: ["협의", "Consult"],
  AGREE: ["합의", "Agree"],
  CC: ["참조", "CC"],
  RECEIVE: ["수신", "Receive"]
};

export function translateStatus(value: string, t: Translator): string {
  const normalized = value.toUpperCase();
  const matched = STATUS_LABELS[normalized];
  if (!matched) {
    return value;
  }

  return t(matched[0], matched[1]);
}

export function translateApprovalStepType(value: string, t: Translator): string {
  const normalized = value.toUpperCase();
  const matched = APPROVAL_STEP_TYPE_LABELS[normalized];
  if (!matched) {
    return value;
  }

  return t(matched[0], matched[1]);
}
