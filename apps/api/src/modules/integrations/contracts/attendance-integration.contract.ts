import { AttendanceEventType, AttendanceIngestionSource, IntegrationType } from "@prisma/client";

export interface AttendanceInboundEvent {
  externalUserId: string;
  employeeNumber?: string;
  eventType: string;
  eventTimestamp: string;
  deviceId?: string;
  siteCode?: string;
  dedupeKey?: string;
  rawPayload?: Record<string, unknown>;
}

export interface AttendanceIngressRequest {
  companyId?: string;
  companyCode?: string;
  provider: IntegrationType;
  source?: AttendanceIngestionSource;
  event: AttendanceInboundEvent;
}

export interface AttendanceIngressBatchRequest {
  companyId?: string;
  companyCode?: string;
  provider: IntegrationType;
  source?: AttendanceIngestionSource;
  events: AttendanceInboundEvent[];
}

export interface AttendanceNormalizedEvent {
  externalUserId: string;
  employeeNumber?: string;
  eventType: AttendanceEventType;
  eventTimestamp: Date;
  deviceId?: string;
  siteCode?: string;
  dedupeKey?: string;
  rawPayload: Record<string, unknown>;
}

export interface AttendanceIntegrationAdapter {
  readonly provider: IntegrationType;
  normalize(event: AttendanceInboundEvent): AttendanceNormalizedEvent;
}
