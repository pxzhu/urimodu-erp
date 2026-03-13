import { BadRequestException } from "@nestjs/common";
import { AttendanceEventType, IntegrationType } from "@prisma/client";

import type { AttendanceInboundEvent, AttendanceIntegrationAdapter, AttendanceNormalizedEvent } from "../contracts/attendance-integration.contract";

function mapEventType(value: string): AttendanceEventType {
  const normalized = value.trim().toUpperCase();

  if (["IN", "CHECK_IN", "ENTRY", "ACCESS_IN", "출근"].includes(normalized)) {
    return AttendanceEventType.IN;
  }

  if (["OUT", "CHECK_OUT", "EXIT", "ACCESS_OUT", "퇴근"].includes(normalized)) {
    return AttendanceEventType.OUT;
  }

  if (["BREAK_OUT", "LUNCH_OUT", "휴게시작"].includes(normalized)) {
    return AttendanceEventType.BREAK_OUT;
  }

  if (["BREAK_IN", "LUNCH_IN", "휴게종료"].includes(normalized)) {
    return AttendanceEventType.BREAK_IN;
  }

  if (["ACCESS_GRANTED", "ALLOW", "SUCCESS"].includes(normalized)) {
    return AttendanceEventType.ACCESS_GRANTED;
  }

  if (["ACCESS_DENIED", "DENY", "FAIL"].includes(normalized)) {
    return AttendanceEventType.ACCESS_DENIED;
  }

  return AttendanceEventType.UNKNOWN;
}

function parseEventTimestamp(value: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`Invalid eventTimestamp: ${value}`);
  }

  return parsed;
}

export class GenericAccessControlAdapter implements AttendanceIntegrationAdapter {
  constructor(public readonly provider: IntegrationType) {}

  normalize(event: AttendanceInboundEvent): AttendanceNormalizedEvent {
    if (!event.externalUserId?.trim()) {
      throw new BadRequestException("externalUserId is required");
    }

    if (!event.eventType?.trim()) {
      throw new BadRequestException("eventType is required");
    }

    if (!event.eventTimestamp?.trim()) {
      throw new BadRequestException("eventTimestamp is required");
    }

    return {
      externalUserId: event.externalUserId.trim(),
      employeeNumber: event.employeeNumber?.trim() || undefined,
      eventType: mapEventType(event.eventType),
      eventTimestamp: parseEventTimestamp(event.eventTimestamp),
      deviceId: event.deviceId?.trim() || undefined,
      siteCode: event.siteCode?.trim() || undefined,
      dedupeKey: event.dedupeKey,
      rawPayload: event.rawPayload ?? {
        externalUserId: event.externalUserId,
        eventType: event.eventType,
        eventTimestamp: event.eventTimestamp,
        deviceId: event.deviceId,
        siteCode: event.siteCode
      }
    };
  }
}

export function createDefaultAttendanceAdapters() {
  return new Map<IntegrationType, AttendanceIntegrationAdapter>([
    [IntegrationType.ADT, new GenericAccessControlAdapter(IntegrationType.ADT)],
    [IntegrationType.S1, new GenericAccessControlAdapter(IntegrationType.S1)],
    [IntegrationType.GENERIC, new GenericAccessControlAdapter(IntegrationType.GENERIC)]
  ]);
}
