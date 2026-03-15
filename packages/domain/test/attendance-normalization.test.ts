import assert from "node:assert/strict";
import test from "node:test";

import { AttendanceEventType, normalizeAttendanceEvents } from "../src";

test("normalizeAttendanceEvents marks normal attendance under shift policy", () => {
  const result = normalizeAttendanceEvents(
    [
      {
        eventType: AttendanceEventType.IN,
        eventTimestamp: new Date("2026-03-15T09:00:00.000Z")
      },
      {
        eventType: AttendanceEventType.OUT,
        eventTimestamp: new Date("2026-03-15T18:00:00.000Z")
      }
    ],
    {
      workStartMinutes: 9 * 60,
      workEndMinutes: 18 * 60,
      breakMinutes: 60,
      graceMinutes: 0
    }
  );

  assert.equal(result.status, "NORMAL");
  assert.equal(result.workedMinutes, 540);
  assert.equal(result.overtimeMinutes, 60);
});

test("normalizeAttendanceEvents requests review when source events are empty", () => {
  const result = normalizeAttendanceEvents([]);
  assert.equal(result.needsReview, true);
  assert.equal(result.status, "NEEDS_REVIEW");
});
