import { PrismaClient, type AttendanceLedgerStatus, type ShiftPolicy } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_TIMEZONE = "Asia/Seoul";
const BATCH_SIZE = Number(process.env.ATTENDANCE_NORMALIZE_BATCH_SIZE ?? 500);

type NormalizationLedgerStatus =
  | "NORMAL"
  | "LATE"
  | "EARLY_LEAVE"
  | "ABSENT"
  | "ON_LEAVE"
  | "HOLIDAY"
  | "WEEKEND"
  | "NEEDS_REVIEW";

interface NormalizationInputEvent {
  eventType: string;
  eventTimestamp: Date;
}

export interface NormalizationShiftPolicy {
  workStartMinutes: number;
  workEndMinutes: number;
  breakMinutes: number;
  graceMinutes: number;
}

interface NormalizedAttendanceResult {
  checkInAt: Date | null;
  checkOutAt: Date | null;
  breakMinutes: number;
  workedMinutes: number;
  overtimeMinutes: number;
  status: NormalizationLedgerStatus;
  needsReview: boolean;
  notes?: string;
}

interface PendingRawEvent {
  id: string;
  companyId: string;
  businessSiteId: string | null;
  employeeId: string;
  eventType: string;
  eventTimestamp: Date;
  companyTimezone: string;
}

interface GroupedEvents {
  companyId: string;
  employeeId: string;
  workDate: string;
  timezone: string;
  events: PendingRawEvent[];
}

interface LocalDateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
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

function formatDateKey(parts: Pick<LocalDateTimeParts, "year" | "month" | "day">): string {
  return `${parts.year.toString().padStart(4, "0")}-${parts.month.toString().padStart(2, "0")}-${parts.day
    .toString()
    .padStart(2, "0")}`;
}

function shiftDateKey(dateKey: string, deltaDays: number): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return date.toISOString().slice(0, 10);
}

function getLocalDateTimeParts(date: Date, timezone: string): LocalDateTimeParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  });
  const parts = formatter.formatToParts(date);

  const byType = new Map(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(byType.get("year") ?? "1970"),
    month: Number(byType.get("month") ?? "1"),
    day: Number(byType.get("day") ?? "1"),
    hour: Number(byType.get("hour") ?? "0"),
    minute: Number(byType.get("minute") ?? "0")
  };
}

export function resolveWorkDateKeyForEvent(input: {
  eventTimestamp: Date;
  timezone: string;
  shiftPolicy?: NormalizationShiftPolicy | null;
}): string {
  const local = getLocalDateTimeParts(input.eventTimestamp, input.timezone);
  const localDateKey = formatDateKey(local);

  if (!input.shiftPolicy) {
    return localDateKey;
  }

  const isOvernightShift = input.shiftPolicy.workEndMinutes <= input.shiftPolicy.workStartMinutes;
  if (!isOvernightShift) {
    return localDateKey;
  }

  const localMinutes = local.hour * 60 + local.minute;
  const carryoverCutoffMinutes = input.shiftPolicy.workEndMinutes + Math.max(input.shiftPolicy.graceMinutes, 0);

  if (localMinutes < carryoverCutoffMinutes) {
    return shiftDateKey(localDateKey, -1);
  }

  return localDateKey;
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
    .find((event) => event.eventType.toUpperCase() === "OUT")?.eventTimestamp;

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
    status = "NEEDS_REVIEW";
    needsReview = true;
  } else if (!shiftPolicy) {
    status = "NEEDS_REVIEW";
    needsReview = true;
  } else {
    const shiftReference = checkIn ?? sorted[0]?.eventTimestamp ?? new Date();
    const shiftStart = toShiftDate(shiftReference, shiftPolicy.workStartMinutes);
    const shiftStartWithGrace = new Date(shiftStart.getTime() + Math.max(shiftPolicy.graceMinutes, 0) * 60_000);
    const shiftEnd = toShiftDate(shiftReference, shiftPolicy.workEndMinutes);
    const isOvernightShift = shiftPolicy.workEndMinutes <= shiftPolicy.workStartMinutes;

    if (isOvernightShift || shiftEnd.getTime() <= shiftStart.getTime()) {
      shiftEnd.setUTCDate(shiftEnd.getUTCDate() + 1);
    }

    const scheduledSpanMinutes = minutesBetween(shiftStart, shiftEnd);
    const scheduledMinutes = Math.max(0, scheduledSpanMinutes - Math.max(shiftPolicy.breakMinutes, 0));

    overtimeMinutes = Math.max(0, workedMinutes - scheduledMinutes);

    if (checkIn.getTime() > shiftStartWithGrace.getTime()) {
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

function toDateStringInTimezone(date: Date, timezone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  return formatter.format(date);
}

function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

async function resolvePolicy(input: {
  companyId: string;
  employeeId: string;
  workDate: Date;
  cache: Map<string, ShiftPolicy | null>;
}): Promise<ShiftPolicy | null> {
  const key = `${input.companyId}:${input.employeeId}:${input.workDate.toISOString().slice(0, 10)}`;
  const cached = input.cache.get(key);
  if (cached !== undefined) {
    return cached;
  }

  const assignment = await prisma.employeeShiftPolicyAssignment.findFirst({
    where: {
      employeeId: input.employeeId,
      effectiveFrom: { lte: input.workDate },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: input.workDate } }]
    },
    include: {
      shiftPolicy: true
    },
    orderBy: {
      effectiveFrom: "desc"
    }
  });

  if (assignment?.shiftPolicy) {
    input.cache.set(key, assignment.shiftPolicy);
    return assignment.shiftPolicy;
  }

  const fallback = await prisma.shiftPolicy.findFirst({
    where: {
      companyId: input.companyId,
      isDefault: true
    },
    orderBy: {
      version: "desc"
    }
  });

  input.cache.set(key, fallback ?? null);
  return fallback ?? null;
}

async function groupPendingEvents(events: PendingRawEvent[], policyCache: Map<string, ShiftPolicy | null>): Promise<GroupedEvents[]> {
  const groups = new Map<string, GroupedEvents>();

  for (const event of events) {
    const localDateKey = toDateStringInTimezone(event.eventTimestamp, event.companyTimezone);
    const localDate = parseDateOnly(localDateKey);
    let policy = await resolvePolicy({
      companyId: event.companyId,
      employeeId: event.employeeId,
      workDate: localDate,
      cache: policyCache
    });

    let workDate = resolveWorkDateKeyForEvent({
      eventTimestamp: event.eventTimestamp,
      timezone: event.companyTimezone,
      shiftPolicy: policy
        ? {
            workStartMinutes: policy.workStartMinutes,
            workEndMinutes: policy.workEndMinutes,
            breakMinutes: policy.breakMinutes,
            graceMinutes: policy.graceMinutes
          }
        : undefined
    });

    if (workDate !== localDateKey) {
      const adjustedDate = parseDateOnly(workDate);
      const adjustedPolicy = await resolvePolicy({
        companyId: event.companyId,
        employeeId: event.employeeId,
        workDate: adjustedDate,
        cache: policyCache
      });

      if (adjustedPolicy) {
        policy = adjustedPolicy;
      }
    }

    const key = `${event.companyId}:${event.employeeId}:${workDate}`;

    const existing = groups.get(key);
    if (existing) {
      existing.events.push(event);
      continue;
    }

    groups.set(key, {
      companyId: event.companyId,
      employeeId: event.employeeId,
      workDate,
      timezone: event.companyTimezone,
      events: [event]
    });
  }

  return [...groups.values()];
}

export async function normalizeAttendanceJob(): Promise<void> {
  const pending = await prisma.attendanceRawEvent.findMany({
    where: {
      normalized: false,
      employeeId: {
        not: null
      }
    },
    select: {
      id: true,
      companyId: true,
      businessSiteId: true,
      employeeId: true,
      eventType: true,
      eventTimestamp: true,
      company: {
        select: {
          timezone: true
        }
      }
    },
    orderBy: [{ eventTimestamp: "asc" }, { createdAt: "asc" }],
    take: BATCH_SIZE
  });

  if (pending.length === 0) {
    return;
  }

  const mappedEvents: PendingRawEvent[] = [];
  for (const event of pending) {
    if (!event.employeeId) {
      continue;
    }

    mappedEvents.push({
      id: event.id,
      companyId: event.companyId,
      businessSiteId: event.businessSiteId,
      employeeId: event.employeeId,
      eventType: event.eventType,
      eventTimestamp: event.eventTimestamp,
      companyTimezone: event.company.timezone || DEFAULT_TIMEZONE
    });
  }

  const policyCache = new Map<string, ShiftPolicy | null>();
  const grouped = await groupPendingEvents(mappedEvents, policyCache);

  let processedGroups = 0;
  let processedEvents = 0;

  for (const group of grouped) {
    const workDate = parseDateOnly(group.workDate);
    const policy = await resolvePolicy({
      companyId: group.companyId,
      employeeId: group.employeeId,
      workDate,
      cache: policyCache
    });

    const normalized = normalizeAttendanceEvents(
      group.events.map((event) => ({
        eventType: event.eventType,
        eventTimestamp: event.eventTimestamp
      })),
      policy
        ? {
            workStartMinutes: policy.workStartMinutes,
            workEndMinutes: policy.workEndMinutes,
            breakMinutes: policy.breakMinutes,
            graceMinutes: policy.graceMinutes
          }
        : undefined
    );

    const firstSiteId = group.events.find((event) => event.businessSiteId)?.businessSiteId;

    const ledger = await prisma.$transaction(async (transaction) => {
      const upserted = await transaction.attendanceLedger.upsert({
        where: {
          companyId_employeeId_workDate: {
            companyId: group.companyId,
            employeeId: group.employeeId,
            workDate
          }
        },
        create: {
          companyId: group.companyId,
          businessSiteId: firstSiteId,
          employeeId: group.employeeId,
          workDate,
          shiftPolicyId: policy?.id,
          status: normalized.status as AttendanceLedgerStatus,
          checkInAt: normalized.checkInAt,
          checkOutAt: normalized.checkOutAt,
          breakMinutes: normalized.breakMinutes,
          workedMinutes: normalized.workedMinutes,
          overtimeMinutes: normalized.overtimeMinutes,
          nightMinutes: 0,
          holidayMinutes: 0,
          policyVersion: policy?.version,
          needsReview: normalized.needsReview,
          notes: normalized.notes,
          generatedAt: new Date()
        },
        update: {
          businessSiteId: firstSiteId ?? undefined,
          shiftPolicyId: policy?.id,
          status: normalized.status as AttendanceLedgerStatus,
          checkInAt: normalized.checkInAt,
          checkOutAt: normalized.checkOutAt,
          breakMinutes: normalized.breakMinutes,
          workedMinutes: normalized.workedMinutes,
          overtimeMinutes: normalized.overtimeMinutes,
          nightMinutes: 0,
          holidayMinutes: 0,
          policyVersion: policy?.version,
          needsReview: normalized.needsReview,
          notes: normalized.notes,
          generatedAt: new Date()
        }
      });

      const rawEventIds = group.events.map((event) => event.id);

      await transaction.attendanceLedgerSource.createMany({
        data: rawEventIds.map((rawEventId) => ({
          attendanceLedgerId: upserted.id,
          rawEventId
        })),
        skipDuplicates: true
      });

      await transaction.attendanceRawEvent.updateMany({
        where: {
          id: {
            in: rawEventIds
          }
        },
        data: {
          normalized: true
        }
      });

      await transaction.auditLog.create({
        data: {
          companyId: group.companyId,
          entityType: "AttendanceLedger",
          entityId: upserted.id,
          action: "ATTENDANCE_LEDGER_NORMALIZE",
          afterJson: {
            workDate: group.workDate,
            employeeId: group.employeeId,
            status: normalized.status,
            checkInAt: normalized.checkInAt,
            checkOutAt: normalized.checkOutAt,
            workedMinutes: normalized.workedMinutes,
            overtimeMinutes: normalized.overtimeMinutes,
            needsReview: normalized.needsReview
          },
          metadataJson: {
            sourceRawEventIds: rawEventIds,
            sourceEventCount: rawEventIds.length,
            policyId: policy?.id,
            policyVersion: policy?.version
          }
        }
      });

      return upserted;
    });

    processedGroups += 1;
    processedEvents += group.events.length;

    console.log(
      `[worker] normalized attendance ledger ${ledger.id} (company=${group.companyId} employee=${group.employeeId} date=${group.workDate} events=${group.events.length})`
    );
  }

  console.log(`[worker] attendance normalization complete groups=${processedGroups} events=${processedEvents}`);
}
