import assert from "node:assert/strict";

import {
  FixedTimeBoundaryStrategy,
  getWindowProgress,
} from "../lib/day-boundary-v1.js";

function localDate(year, month, day, hour = 0, minute = 0, second = 0) {
  return new Date(year, month - 1, day, hour, minute, second, 0);
}

export function runFixedTimeBoundaryTests(run) {
  run("FixedTimeBoundaryStrategy resolves the previous operational day before the boundary", () => {
    const strategy = new FixedTimeBoundaryStrategy({ startHour: 9, startMinute: 0 });
    const window = strategy.getWindow(localDate(2026, 4, 19, 8, 59));

    assert.equal(window.start.getTime(), localDate(2026, 4, 18, 9, 0).getTime());
    assert.equal(window.end.getTime(), localDate(2026, 4, 19, 9, 0).getTime());
    assert.equal(window.metadata.strategy, "fixed-time");
    assert.equal(window.metadata.startHour, 9);
    assert.equal(window.metadata.startMinute, 0);
  });

  run("FixedTimeBoundaryStrategy resolves the new operational day at the exact boundary", () => {
    const strategy = new FixedTimeBoundaryStrategy({ startHour: 9, startMinute: 0 });
    const window = strategy.getWindow(localDate(2026, 4, 19, 9, 0));

    assert.equal(window.start.getTime(), localDate(2026, 4, 19, 9, 0).getTime());
    assert.equal(window.end.getTime(), localDate(2026, 4, 20, 9, 0).getTime());
  });

  run("getWindowProgress computes fractional progress and clamps outside the window", () => {
    const strategy = new FixedTimeBoundaryStrategy({ startHour: 9, startMinute: 0 });
    const window = strategy.getWindow(localDate(2026, 4, 19, 12, 0));

    assert.equal(getWindowProgress(localDate(2026, 4, 19, 12, 0), window), 0.125);
    assert.equal(getWindowProgress(localDate(2026, 4, 19, 8, 0), window), 0);
    assert.equal(getWindowProgress(localDate(2026, 4, 20, 10, 0), window), 1);
  });

  run("FixedTimeBoundaryStrategy rejects invalid startHour and startMinute values", () => {
    assert.throws(
      () => new FixedTimeBoundaryStrategy({ startHour: 24 }),
      RangeError,
    );
    assert.throws(
      () => new FixedTimeBoundaryStrategy({ startMinute: 60 }),
      RangeError,
    );
  });
}
