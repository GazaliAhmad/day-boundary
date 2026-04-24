import assert from "node:assert/strict";

import { DailyBoundaryStrategy } from "../../lib/ver-01/day-boundary.js";

function localDate(year, month, day, hour = 0, minute = 0, second = 0) {
  return new Date(year, month - 1, day, hour, minute, second, 0);
}

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function runDailyBoundaryTests(run) {
  run("DailyBoundaryStrategy resolves a window before the current day's boundary", () => {
    const boundaries = {
      "2026-04-18": [18, 0],
      "2026-04-19": [19, 0],
      "2026-04-20": [19, 30],
    };

    const strategy = new DailyBoundaryStrategy({
      getBoundaryForDate(date) {
        const [hour, minute] = boundaries[localDateKey(date)];
        return localDate(date.getFullYear(), date.getMonth() + 1, date.getDate(), hour, minute);
      },
    });

    const window = strategy.getWindow(localDate(2026, 4, 19, 18, 30));

    assert.equal(window.start.getTime(), localDate(2026, 4, 18, 18, 0).getTime());
    assert.equal(window.end.getTime(), localDate(2026, 4, 19, 19, 0).getTime());
    assert.equal(window.metadata.strategy, "daily-boundary");
  });

  run("DailyBoundaryStrategy supports shifting boundaries that create non-24-hour windows", () => {
    const boundaries = {
      "2026-04-19": [19, 0],
      "2026-04-20": [19, 30],
      "2026-04-21": [18, 0],
    };

    const strategy = new DailyBoundaryStrategy({
      getBoundaryForDate(date) {
        const [hour, minute] = boundaries[localDateKey(date)];
        return localDate(date.getFullYear(), date.getMonth() + 1, date.getDate(), hour, minute);
      },
    });

    const window = strategy.getWindow(localDate(2026, 4, 20, 20, 0));
    const durationMs = window.end.getTime() - window.start.getTime();

    assert.equal(window.start.getTime(), localDate(2026, 4, 20, 19, 30).getTime());
    assert.equal(window.end.getTime(), localDate(2026, 4, 21, 18, 0).getTime());
    assert.equal(durationMs, 22.5 * 60 * 60 * 1000);
  });

  run("DailyBoundaryStrategy rejects a missing boundary resolver", () => {
    assert.throws(() => new DailyBoundaryStrategy(), TypeError);
  });

  run("DailyBoundaryStrategy throws when a boundary cannot be resolved into a valid date", () => {
    const strategy = new DailyBoundaryStrategy({
      getBoundaryForDate() {
        return undefined;
      },
    });

    assert.throws(() => strategy.getWindow(localDate(2026, 4, 19, 12, 0)), TypeError);
  });

  run("DailyBoundaryStrategy throws when resolved boundaries do not form a valid window", () => {
    const constantBoundary = localDate(2026, 4, 19, 19, 0);
    const strategy = new DailyBoundaryStrategy({
      getBoundaryForDate() {
        return constantBoundary;
      },
    });

    assert.throws(() => strategy.getWindow(localDate(2026, 4, 19, 20, 0)), RangeError);
  });
}
