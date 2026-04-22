import assert from "node:assert/strict";

import { Temporal } from "@js-temporal/polyfill";

import { FixedTimeBoundaryStrategy } from "../lib/day-boundary-v2.js";
import {
  compareShiftEndings,
  getShiftEndByElapsedDuration,
  getShiftEndByWallClockDuration,
  resolveShiftEnd,
  resolveShiftStart,
} from "../lib/day-boundary-shifts-v2.js";

export function runDayBoundaryShiftTests(run) {
  run("resolveShiftStart reassigns an early arrival within tolerance to the upcoming shift", () => {
    const strategy = new FixedTimeBoundaryStrategy({
      timeZone: "Asia/Singapore",
      boundaryTime: "08:00",
    });
    const result = resolveShiftStart(
      Temporal.ZonedDateTime.from("2026-04-19T07:50:00+08:00[Asia/Singapore]"),
      strategy,
      {
        startTolerance: {
          before: Temporal.Duration.from({ minutes: 15 }),
          after: Temporal.Duration.from({ minutes: 15 }),
        },
      },
    );

    assert.equal(result.window.start.toString(), "2026-04-19T08:00:00+08:00[Asia/Singapore]");
    assert.equal(result.logicalDay.toString(), "2026-04-19");
    assert.equal(result.shiftStart.toString(), "2026-04-19T08:00:00+08:00[Asia/Singapore]");
    assert.equal(result.matchedStartTolerance, true);
    assert.equal(result.assignmentAdjusted, true);
    assert.equal(result.classification, "early-within-tolerance");
    assert.equal(result.offsetFromShiftStart.total({ unit: "minute" }), -10);
  });

  run("resolveShiftStart classifies an exact boundary clock-in without adjusting assignment", () => {
    const strategy = new FixedTimeBoundaryStrategy({
      timeZone: "Asia/Singapore",
      boundaryTime: "08:00",
    });
    const result = resolveShiftStart(
      Temporal.ZonedDateTime.from("2026-04-19T08:00:00+08:00[Asia/Singapore]"),
      strategy,
      {
        startTolerance: {
          before: Temporal.Duration.from({ minutes: 15 }),
          after: Temporal.Duration.from({ minutes: 15 }),
        },
      },
    );

    assert.equal(result.window.start.toString(), "2026-04-19T08:00:00+08:00[Asia/Singapore]");
    assert.equal(result.matchedStartTolerance, true);
    assert.equal(result.assignmentAdjusted, false);
    assert.equal(result.classification, "on-start-boundary");
    assert.equal(result.offsetFromShiftStart.total({ unit: "minute" }), 0);
  });

  run("resolveShiftStart classifies a late arrival within tolerance on the active shift", () => {
    const strategy = new FixedTimeBoundaryStrategy({
      timeZone: "Asia/Singapore",
      boundaryTime: "08:00",
    });
    const result = resolveShiftStart(
      Temporal.ZonedDateTime.from("2026-04-19T08:10:00+08:00[Asia/Singapore]"),
      strategy,
      {
        startTolerance: {
          before: Temporal.Duration.from({ minutes: 15 }),
          after: Temporal.Duration.from({ minutes: 15 }),
        },
      },
    );

    assert.equal(result.window.start.toString(), "2026-04-19T08:00:00+08:00[Asia/Singapore]");
    assert.equal(result.shiftStart.toString(), "2026-04-19T08:00:00+08:00[Asia/Singapore]");
    assert.equal(result.matchedStartTolerance, true);
    assert.equal(result.assignmentAdjusted, false);
    assert.equal(result.classification, "late-within-tolerance");
    assert.equal(result.offsetFromShiftStart.total({ unit: "minute" }), 10);
  });

  run("resolveShiftStart keeps the normal assignment when an arrival is outside the tolerance window", () => {
    const strategy = new FixedTimeBoundaryStrategy({
      timeZone: "Asia/Singapore",
      boundaryTime: "08:00",
    });
    const result = resolveShiftStart(
      Temporal.ZonedDateTime.from("2026-04-19T07:40:00+08:00[Asia/Singapore]"),
      strategy,
      {
        startTolerance: {
          before: Temporal.Duration.from({ minutes: 15 }),
          after: Temporal.Duration.from({ minutes: 15 }),
        },
      },
    );

    assert.equal(result.window.start.toString(), "2026-04-18T08:00:00+08:00[Asia/Singapore]");
    assert.equal(result.logicalDay.toString(), "2026-04-18");
    assert.equal(result.shiftStart.toString(), "2026-04-19T08:00:00+08:00[Asia/Singapore]");
    assert.equal(result.matchedStartTolerance, false);
    assert.equal(result.assignmentAdjusted, false);
    assert.equal(result.classification, "outside-start-tolerance");
    assert.equal(result.offsetFromShiftStart.total({ unit: "minute" }), -20);
  });

  run("resolveShiftStart uses exact elapsed time across spring-forward DST for early arrivals", () => {
    const strategy = new FixedTimeBoundaryStrategy({
      timeZone: "Europe/London",
      boundaryTime: "09:00",
    });
    const result = resolveShiftStart(
      Temporal.ZonedDateTime.from("2026-03-29T08:50:00+01:00[Europe/London]"),
      strategy,
      {
        startTolerance: {
          before: Temporal.Duration.from({ minutes: 15 }),
          after: Temporal.Duration.from({ minutes: 15 }),
        },
      },
    );

    assert.equal(result.window.start.toString(), "2026-03-29T09:00:00+01:00[Europe/London]");
    assert.equal(result.shiftStart.toString(), "2026-03-29T09:00:00+01:00[Europe/London]");
    assert.equal(result.classification, "early-within-tolerance");
    assert.equal(result.offsetFromShiftStart.total({ unit: "minute" }), -10);
  });

  run("resolveShiftStart rejects a tolerance window that would overlap adjacent starts on a short DST day", () => {
    const strategy = new FixedTimeBoundaryStrategy({
      timeZone: "Europe/London",
      boundaryTime: "09:00",
    });

    assert.throws(
      () =>
        resolveShiftStart(
          Temporal.ZonedDateTime.from("2026-03-29T08:50:00+01:00[Europe/London]"),
          strategy,
          {
            startTolerance: {
              before: Temporal.Duration.from({ hours: 12 }),
              after: Temporal.Duration.from({ hours: 12 }),
            },
          },
        ),
      RangeError,
    );
  });

  run("resolveShiftEnd classifies a small post-shift delay as a late log off without overtime", () => {
    const result = resolveShiftEnd(
      Temporal.ZonedDateTime.from("2026-04-19T17:07:00+08:00[Asia/Singapore]"),
      Temporal.ZonedDateTime.from("2026-04-19T17:00:00+08:00[Asia/Singapore]"),
      {
        lateLogOffTolerance: {
          after: Temporal.Duration.from({ minutes: 15 }),
        },
        overtime: {
          startsAfter: Temporal.Duration.from({ minutes: 15 }),
        },
      },
    );

    assert.equal(result.completionStatus, "late-log-off");
    assert.equal(result.inferredLogOff, false);
    assert.equal(result.matchedLateLogOffTolerance, true);
    assert.equal(
      result.actualLogOffTime?.toString(),
      "2026-04-19T17:07:00+08:00[Asia/Singapore]",
    );
    assert.equal(result.offsetFromScheduledEnd?.total({ unit: "minute" }), 7);
    assert.equal(result.overtime.hasOvertime, false);
    assert.equal(result.overtime.startsAt, null);
    assert.equal(result.overtime.duration.total({ unit: "minute" }), 0);
  });

  run("resolveShiftEnd infers a forgot-to-log-off closure without creating overtime", () => {
    const result = resolveShiftEnd(
      null,
      Temporal.ZonedDateTime.from("2026-04-19T17:00:00+08:00[Asia/Singapore]"),
      {
        missingLogOff: {
          allowInference: true,
          autoCloseAfter: Temporal.Duration.from({ minutes: 15 }),
        },
      },
    );

    assert.equal(result.completionStatus, "forgot-to-log-off");
    assert.equal(result.actualLogOffTime, null);
    assert.equal(result.inferredLogOff, true);
    assert.equal(result.matchedLateLogOffTolerance, false);
    assert.equal(
      result.resolvedLogOffTime?.toString(),
      "2026-04-19T17:15:00+08:00[Asia/Singapore]",
    );
    assert.equal(result.offsetFromScheduledEnd?.total({ unit: "minute" }), 15);
    assert.equal(result.overtime.hasOvertime, false);
    assert.equal(result.overtime.startsAt, null);
    assert.equal(result.overtime.duration.total({ unit: "minute" }), 0);
  });

  run("resolveShiftEnd counts overtime from the scheduled shift end", () => {
    const result = resolveShiftEnd(
      Temporal.ZonedDateTime.from("2026-04-19T18:30:00+08:00[Asia/Singapore]"),
      Temporal.ZonedDateTime.from("2026-04-19T17:00:00+08:00[Asia/Singapore]"),
      {
        lateLogOffTolerance: {
          after: Temporal.Duration.from({ minutes: 15 }),
        },
        overtime: {
          startsAfter: Temporal.Duration.from({ minutes: 0 }),
        },
      },
    );

    assert.equal(result.completionStatus, "late-log-off");
    assert.equal(result.inferredLogOff, false);
    assert.equal(result.matchedLateLogOffTolerance, false);
    assert.equal(
      result.overtime.startsAt?.toString(),
      "2026-04-19T17:00:00+08:00[Asia/Singapore]",
    );
    assert.equal(result.overtime.hasOvertime, true);
    assert.equal(result.overtime.duration.total({ unit: "minute" }), 90);
    assert.equal(result.offsetFromScheduledEnd?.total({ unit: "minute" }), 90);
  });

  run("shift helpers distinguish elapsed and wall-clock endings across London fall-back DST", () => {
    const start = Temporal.ZonedDateTime.from("2026-10-25T00:00:00+01:00[Europe/London]");
    const duration = Temporal.Duration.from({ hours: 8 });

    const elapsedEnd = getShiftEndByElapsedDuration(start, duration);
    const wallClockEnd = getShiftEndByWallClockDuration(start, duration);

    assert.equal(elapsedEnd.toString(), "2026-10-25T07:00:00+00:00[Europe/London]");
    assert.equal(wallClockEnd.toString(), "2026-10-25T08:00:00+00:00[Europe/London]");
  });

  run("shift helpers match each other in a zone with no DST change", () => {
    const start = Temporal.ZonedDateTime.from("2026-04-19T00:00:00+08:00[Asia/Singapore]");
    const duration = { hours: 8 };

    const comparison = compareShiftEndings(start, duration);

    assert.equal(comparison.elapsedEnd.toString(), "2026-04-19T08:00:00+08:00[Asia/Singapore]");
    assert.equal(comparison.wallClockEnd.toString(), "2026-04-19T08:00:00+08:00[Asia/Singapore]");
    assert.equal(comparison.sameInstant, true);
    assert.equal(comparison.differenceMinutes, 0);
  });

  run("shift comparison reports the DST-induced difference in minutes", () => {
    const start = Temporal.ZonedDateTime.from("2026-10-25T00:00:00+01:00[Europe/London]");
    const comparison = compareShiftEndings(start, { hours: 8 });

    assert.equal(comparison.sameInstant, false);
    assert.equal(comparison.differenceMinutes, 60);
  });

  run("shift helpers reject calendar-scale durations", () => {
    const start = Temporal.ZonedDateTime.from("2026-04-19T00:00:00+08:00[Asia/Singapore]");

    assert.throws(
      () => getShiftEndByElapsedDuration(start, { months: 1 }),
      RangeError,
    );
  });
}
