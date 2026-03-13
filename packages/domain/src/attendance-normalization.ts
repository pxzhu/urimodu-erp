export type NormalizationLedgerStatus =
  | "NORMAL"
  | "LATE"
  | "EARLY_LEAVE"
  | "ABSENT"
  | "ON_LEAVE"
  | "HOLIDAY"
  | "WEEKEND"
  | "NEEDS_REVIEW";

export interface NormalizationInputEvent {
  eventType: string;
  eventTimestamp: Date;
}

export interface NormalizationShiftPolicy {
  workStartMinutes: number;
  workEndMinutes: number;
  breakMinutes: number;
  graceMinutes: number;
}

export interface NormalizedAttendanceResult {
  checkInAt: Date | null;
  checkOutAt: Date | null;
  breakMinutes: number;
  workedMinutes: number;
  overtimeMinutes: number;
  status: NormalizationLedgerStatus;
  needsReview: boolean;
  notes?: string;
}

function minutesBetween(start: Date, end: Date): number {
  const diffMs = end.getTime() - start.getTime();
  return Math.max(0, Math.floor(diffMs / 60000));
}

function eventPriority(type: string): number {
  const normalized = type.toUpperCase();
  if (normalized === "IN" || normalized === "ACCESS_GRANTED") {
    return 1;
  }

  if (normalized === "BREAK_OUT") {
    return 2;
  }

  if (normalized === "BREAK_IN") {
    return 3;
  }

  if (normalized === "OUT") {
    return 4;
  }

  return 9;
}

function toShiftDate(date: Date, minutes: number): Date {
  const shifted = new Date(date.getTime());
  shifted.setUTCHours(0, 0, 0, 0);
  shifted.setUTCMinutes(minutes);
  return shifted;
}

export function normalizeAttendanceEvents(
  events: NormalizationInputEvent[],
  shiftPolicy?: NormalizationShiftPolicy
): NormalizedAttendanceResult {
  if (events.length === 0) {
    return {
      checkInAt: null,
      checkOutAt: null,
      breakMinutes: 0,
      workedMinutes: 0,
      overtimeMinutes: 0,
      status: "NEEDS_REVIEW",
      needsReview: true,
      notes: "No source events"
    };
  }

  const sorted = [...events].sort((left, right) => {
    const timeDiff = left.eventTimestamp.getTime() - right.eventTimestamp.getTime();
    if (timeDiff !== 0) {
      return timeDiff;
    }

    return eventPriority(left.eventType) - eventPriority(right.eventType);
  });

  const checkIn = sorted.find((event) => {
    const type = event.eventType.toUpperCase();
    return type === "IN" || type === "ACCESS_GRANTED";
  })?.eventTimestamp;

  const checkOut = [...sorted]
    .reverse()
    .find((event) => {
      const type = event.eventType.toUpperCase();
      return type === "OUT";
    })?.eventTimestamp;

  let breakMinutes = 0;
  let breakStartedAt: Date | null = null;
  for (const event of sorted) {
    const normalizedType = event.eventType.toUpperCase();

    if (normalizedType === "BREAK_OUT") {
      breakStartedAt = event.eventTimestamp;
      continue;
    }

    if (normalizedType === "BREAK_IN" && breakStartedAt) {
      breakMinutes += minutesBetween(breakStartedAt, event.eventTimestamp);
      breakStartedAt = null;
    }
  }

  let workedMinutes = 0;
  if (checkIn && checkOut) {
    workedMinutes = Math.max(0, minutesBetween(checkIn, checkOut) - breakMinutes);
  }

  let overtimeMinutes = 0;
  let status: NormalizationLedgerStatus = "NEEDS_REVIEW";
  let needsReview = false;

  if (!checkIn || !checkOut) {
    needsReview = true;
    status = "NEEDS_REVIEW";
  } else if (!shiftPolicy) {
    needsReview = true;
    status = "NEEDS_REVIEW";
  } else {
    const shiftStart = toShiftDate(checkIn, shiftPolicy.workStartMinutes + Math.max(shiftPolicy.graceMinutes, 0));
    const shiftEnd = toShiftDate(checkIn, shiftPolicy.workEndMinutes);
    const scheduledMinutes = Math.max(
      0,
      shiftPolicy.workEndMinutes - shiftPolicy.workStartMinutes - Math.max(shiftPolicy.breakMinutes, 0)
    );

    overtimeMinutes = Math.max(0, workedMinutes - scheduledMinutes);

    if (checkIn.getTime() > shiftStart.getTime()) {
      status = "LATE";
    } else if (checkOut.getTime() < shiftEnd.getTime()) {
      status = "EARLY_LEAVE";
    } else {
      status = "NORMAL";
    }
  }

  return {
    checkInAt: checkIn ?? null,
    checkOutAt: checkOut ?? null,
    breakMinutes,
    workedMinutes,
    overtimeMinutes,
    status,
    needsReview,
    notes: needsReview ? "Manual review required" : undefined
  };
}
