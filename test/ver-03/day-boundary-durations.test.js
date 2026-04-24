import assert from "node:assert/strict";

import { Temporal } from "@js-temporal/polyfill";

import {
  compareWindowEndings,
  getWindowEndByElapsedDuration,
  getWindowEndByWallClockDuration,
} from "../../lib/ver-03/day-boundary.js";

export function runDayBoundaryDurationTests(run) {
  run("duration helpers distinguish elapsed and wall-clock endings across London fall-back DST", () => {
    const start = Temporal.ZonedDateTime.from("2026-10-25T00:00:00+01:00[Europe/London]");
    const duration = Temporal.Duration.from({ hours: 8 });

    const elapsedEnd = getWindowEndByElapsedDuration(start, duration);
    const wallClockEnd = getWindowEndByWallClockDuration(start, duration);

    assert.equal(elapsedEnd.toString(), "2026-10-25T07:00:00+00:00[Europe/London]");
    assert.equal(wallClockEnd.toString(), "2026-10-25T08:00:00+00:00[Europe/London]");
  });

  run("duration helpers match each other in a zone with no DST change", () => {
    const start = Temporal.ZonedDateTime.from("2026-04-19T00:00:00+08:00[Asia/Singapore]");
    const duration = { hours: 8 };

    const comparison = compareWindowEndings(start, duration);

    assert.equal(comparison.elapsedEnd.toString(), "2026-04-19T08:00:00+08:00[Asia/Singapore]");
    assert.equal(comparison.wallClockEnd.toString(), "2026-04-19T08:00:00+08:00[Asia/Singapore]");
    assert.equal(comparison.sameInstant, true);
    assert.equal(comparison.differenceMinutes, 0);
  });

  run("duration comparison reports the DST-induced difference in minutes", () => {
    const start = Temporal.ZonedDateTime.from("2026-10-25T00:00:00+01:00[Europe/London]");
    const comparison = compareWindowEndings(start, { hours: 8 });

    assert.equal(comparison.sameInstant, false);
    assert.equal(comparison.differenceMinutes, 60);
  });

  run("duration helpers reject calendar-scale durations", () => {
    const start = Temporal.ZonedDateTime.from("2026-04-19T00:00:00+08:00[Asia/Singapore]");

    assert.throws(
      () => getWindowEndByElapsedDuration(start, { months: 1 }),
      RangeError,
    );
  });
}
