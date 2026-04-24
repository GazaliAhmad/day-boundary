import assert from "node:assert/strict";

import {
  FixedTimeBoundaryStrategy,
  getActiveWindow,
  getWindowForTimestamp,
  getWindowId,
  groupByWindow,
  isSameWindow,
} from "../../lib/ver-01/day-boundary.js";

function localDate(year, month, day, hour = 0, minute = 0, second = 0) {
  return new Date(year, month - 1, day, hour, minute, second, 0);
}

export function runGroupingTests(run) {
  run("getActiveWindow and getWindowForTimestamp resolve the same window", () => {
    const strategy = new FixedTimeBoundaryStrategy({ startHour: 9, startMinute: 0 });
    const timestamp = localDate(2026, 4, 19, 7, 45);

    const active = getActiveWindow(timestamp, strategy);
    const direct = getWindowForTimestamp(timestamp, strategy);

    assert.equal(active.start.getTime(), direct.start.getTime());
    assert.equal(active.end.getTime(), direct.end.getTime());
  });

  run("isSameWindow distinguishes timestamps on opposite sides of the boundary", () => {
    const strategy = new FixedTimeBoundaryStrategy({ startHour: 9, startMinute: 0 });

    assert.equal(
      isSameWindow(localDate(2026, 4, 19, 8, 30), localDate(2026, 4, 19, 8, 59), strategy),
      true,
    );
    assert.equal(
      isSameWindow(localDate(2026, 4, 19, 8, 59), localDate(2026, 4, 19, 9, 1), strategy),
      false,
    );
  });

  run("groupByWindow buckets records into operational-day windows", () => {
    const strategy = new FixedTimeBoundaryStrategy({ startHour: 9, startMinute: 0 });
    const events = [
      { id: "evt-1", timestamp: localDate(2026, 4, 19, 8, 15) },
      { id: "evt-2", timestamp: localDate(2026, 4, 19, 8, 50) },
      { id: "evt-3", timestamp: localDate(2026, 4, 19, 9, 10) },
      { id: "evt-4", timestamp: localDate(2026, 4, 20, 7, 40) },
      { id: "evt-5", timestamp: localDate(2026, 4, 20, 9, 5) },
    ];

    const groups = groupByWindow(events, (item) => item.timestamp, strategy);

    assert.equal(groups.length, 3);
    assert.deepEqual(groups.map((group) => group.items.map((item) => item.id)), [
      ["evt-1", "evt-2"],
      ["evt-3", "evt-4"],
      ["evt-5"],
    ]);
  });

  run("getWindowId returns a stable identifier derived from window boundaries", () => {
    const strategy = new FixedTimeBoundaryStrategy({ startHour: 9, startMinute: 0 });
    const window = strategy.getWindow(localDate(2026, 4, 19, 12, 0));

    assert.equal(
      getWindowId(window),
      `${window.start.toISOString()}__${window.end.toISOString()}`,
    );
  });

  run("top-level helpers reject an invalid strategy", () => {
    assert.throws(() => getWindowForTimestamp(localDate(2026, 4, 19, 12, 0), null), TypeError);
    assert.throws(() => isSameWindow(localDate(2026, 4, 19, 12, 0), localDate(2026, 4, 19, 13, 0), {}), TypeError);
    assert.throws(() => groupByWindow([], () => localDate(2026, 4, 19, 12, 0), undefined), TypeError);
  });
}
