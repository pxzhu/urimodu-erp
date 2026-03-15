import type { IncomingHttpHeaders } from "node:http";

export interface EdgeAttendanceEvent {
  companyCode?: string;
  provider?: string;
  source?: string;
  externalUserId?: string;
  employeeNumber?: string;
  eventType?: string;
  eventTimestamp?: string;
  deviceId?: string;
  siteCode?: string;
  dedupeHash?: string;
  rawPayloadCsv?: string;
}

export function resolveEdgeAgentKey(headers: IncomingHttpHeaders): string | undefined {
  const requestKey = headers["x-edge-agent-key"];
  return typeof requestKey === "string" ? requestKey : requestKey?.[0];
}

export function toIngressPayload(event: EdgeAttendanceEvent, defaultCompanyCode: string) {
  return {
    companyCode: event.companyCode ?? defaultCompanyCode,
    provider: (event.provider ?? "GENERIC").toUpperCase(),
    source: (event.source ?? "AGENT_CSV").toUpperCase(),
    event: {
      externalUserId: event.externalUserId,
      employeeNumber: event.employeeNumber,
      eventType: event.eventType,
      eventTimestamp: event.eventTimestamp,
      deviceId: event.deviceId,
      siteCode: event.siteCode,
      dedupeKey: event.dedupeHash,
      rawPayload: {
        rawPayloadCsv: event.rawPayloadCsv
      }
    }
  };
}

export function normalizeIngestionPayload(payload: EdgeAttendanceEvent | EdgeAttendanceEvent[]): EdgeAttendanceEvent[] {
  return Array.isArray(payload) ? payload : [payload];
}
