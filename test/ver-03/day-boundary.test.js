import assert from "node:assert/strict";

import { Temporal } from "@js-temporal/polyfill";

import {
  DailyBoundaryStrategy,
  FixedTimeBoundaryStrategy,
  getWindowForInstant,
  getWindowForPlainDateTime,
  getWindowForZonedDateTime,
  groupByWindow,
  getWindowId,
  getWindowProgress,
  isSameWindow,
} from "../../lib/ver-03/day-boundary.js";

function instantFromZoned(isoString) {
  return Temporal.ZonedDateTime.from(isoString).toInstant();
}

function durationHours(window) {
  return (
    (window.end.toInstant().epochMilliseconds - window.start.toInstant().epochMilliseconds) /
    (60 * 60 * 1000)
  );
}

function zonedBoundary(timeZone, dateString, timeString) {
  const date = Temporal.PlainDate.from(dateString);
  const time = Temporal.PlainTime.from(timeString);

  return Temporal.ZonedDateTime.from({
    timeZone,
    year: date.year,
    month: date.month,
    day: date.day,
    hour: time.hour,
    minute: time.minute,
    second: time.second,
  });
}

export function runDayBoundaryV2Tests(run) {
  run("v2 FixedTimeBoundaryStrategy resolves the previous window before the boundary", () => {
    const strategy = new FixedTimeBoundaryStrategy({
      timeZone: "Asia/Singapore",
      boundaryTime: "09:00",
    });

    const window = getWindowForInstant(
      instantFromZoned("2026-04-19T08:59:00+08:00[Asia/Singapore]"),
      strategy,
    );

    assert.equal(
      window.start.toString(),
      "2026-04-18T09:00:00+08:00[Asia/Singapore]",
    );
    assert.equal(
      window.end.toString(),
      "2026-04-19T09:00:00+08:00[Asia/Singapore]",
    );
    assert.equal(window.metadata.strategy, "fixed-time-v2");
  });

  run("v2 FixedTimeBoundaryStrategy resolves a 23-hour window across spring-forward DST", () => {
    const strategy = new FixedTimeBoundaryStrategy({
      timeZone: "Europe/London",
      boundaryTime: "09:00",
    });

    const window = getWindowForInstant(
      instantFromZoned("2026-03-29T08:30:00+01:00[Europe/London]"),
      strategy,
    );

    assert.equal(
      window.start.toString(),
      "2026-03-28T09:00:00+00:00[Europe/London]",
    );
    assert.equal(
      window.end.toString(),
      "2026-03-29T09:00:00+01:00[Europe/London]",
    );
    assert.equal(durationHours(window), 23);
  });

  run("v2 FixedTimeBoundaryStrategy resolves a 25-hour window across fall-back DST", () => {
    const strategy = new FixedTimeBoundaryStrategy({
      timeZone: "Europe/London",
      boundaryTime: "09:00",
    });

    const window = getWindowForInstant(
      instantFromZoned("2026-10-25T08:30:00+00:00[Europe/London]"),
      strategy,
    );

    assert.equal(
      window.start.toString(),
      "2026-10-24T09:00:00+01:00[Europe/London]",
    );
    assert.equal(
      window.end.toString(),
      "2026-10-25T09:00:00+00:00[Europe/London]",
    );
    assert.equal(durationHours(window), 25);
  });

  run("v2 helper entry points resolve the same window identity", () => {
    const strategy = new FixedTimeBoundaryStrategy({
      timeZone: "Europe/London",
      boundaryTime: "09:00",
    });

    const instant = instantFromZoned("2026-10-24T12:00:00+01:00[Europe/London]");
    const zoned = instant.toZonedDateTimeISO("Europe/London");
    const plainDateTime = Temporal.PlainDateTime.from("2026-10-24T12:00:00");

    const fromInstant = getWindowForInstant(instant, strategy);
    const fromZoned = getWindowForZonedDateTime(zoned, strategy);
    const fromPlain = getWindowForPlainDateTime(plainDateTime, strategy);

    assert.equal(getWindowId(fromInstant), getWindowId(fromZoned));
    assert.equal(getWindowId(fromInstant), getWindowId(fromPlain));
  });

  run("v2 getWindowProgress uses exact elapsed time across a 25-hour DST window", () => {
    const strategy = new FixedTimeBoundaryStrategy({
      timeZone: "Europe/London",
      boundaryTime: "09:00",
    });

    const window = getWindowForInstant(
      instantFromZoned("2026-10-24T12:00:00+01:00[Europe/London]"),
      strategy,
    );

    assert.equal(durationHours(window), 25);

    const midpoint = instantFromZoned("2026-10-24T21:30:00+01:00[Europe/London]");
    assert.equal(getWindowProgress(midpoint, window), 0.5);
  });

  run("v2 DailyBoundaryStrategy resolves a shifting boundary window", () => {
    const boundaries = {
      "2026-04-18": "18:00",
      "2026-04-19": "19:00",
      "2026-04-20": "19:30",
    };

    const strategy = new DailyBoundaryStrategy({
      timeZone: "Asia/Singapore",
      getBoundaryForDate(date, context) {
        return zonedBoundary(context.timeZone, date.toString(), boundaries[date.toString()]);
      },
    });

    const window = getWindowForInstant(
      instantFromZoned("2026-04-19T18:30:00+08:00[Asia/Singapore]"),
      strategy,
    );

    assert.equal(
      window.start.toString(),
      "2026-04-18T18:00:00+08:00[Asia/Singapore]",
    );
    assert.equal(
      window.end.toString(),
      "2026-04-19T19:00:00+08:00[Asia/Singapore]",
    );
    assert.equal(window.metadata.strategy, "daily-boundary-v2");
  });

  run("v2 DailyBoundaryStrategy rejects a missing boundary resolver", () => {
    assert.throws(
      () => new DailyBoundaryStrategy({ timeZone: "Asia/Singapore" }),
      TypeError,
    );
  });

  run("v2 DailyBoundaryStrategy throws when the resolver does not return ZonedDateTime", () => {
    const strategy = new DailyBoundaryStrategy({
      timeZone: "Asia/Singapore",
      getBoundaryForDate() {
        return Temporal.Instant.from("2026-04-19T11:00:00Z");
      },
    });

    assert.throws(
      () => getWindowForInstant(Temporal.Instant.from("2026-04-19T10:00:00Z"), strategy),
      TypeError,
    );
  });

  run("v2 DailyBoundaryStrategy throws when resolved boundaries do not form a valid window", () => {
    const strategy = new DailyBoundaryStrategy({
      timeZone: "Asia/Singapore",
      getBoundaryForDate(_date, context) {
        return zonedBoundary(context.timeZone, "2026-04-19", "19:00");
      },
    });

    assert.throws(
      () => getWindowForInstant(Temporal.Instant.from("2026-04-19T12:00:00Z"), strategy),
      RangeError,
    );
  });

  run("v2 isSameWindow distinguishes timestamps on opposite sides of the boundary", () => {
    const strategy = new FixedTimeBoundaryStrategy({
      timeZone: "Asia/Singapore",
      boundaryTime: "09:00",
    });

    assert.equal(
      isSameWindow(
        instantFromZoned("2026-04-19T08:30:00+08:00[Asia/Singapore]"),
        instantFromZoned("2026-04-19T08:45:00+08:00[Asia/Singapore]"),
        strategy,
      ),
      true,
    );

    assert.equal(
      isSameWindow(
        instantFromZoned("2026-04-19T08:30:00+08:00[Asia/Singapore]"),
        instantFromZoned("2026-04-19T09:30:00+08:00[Asia/Singapore]"),
        strategy,
      ),
      false,
    );
  });

  run("v2 groupByWindow buckets records into boundary windows", () => {
    const strategy = new FixedTimeBoundaryStrategy({
      timeZone: "Asia/Singapore",
      boundaryTime: "09:00",
    });

    const records = [
      { id: "a", instant: instantFromZoned("2026-04-19T08:30:00+08:00[Asia/Singapore]") },
      { id: "b", instant: instantFromZoned("2026-04-19T09:10:00+08:00[Asia/Singapore]") },
      { id: "c", instant: instantFromZoned("2026-04-19T10:15:00+08:00[Asia/Singapore]") },
    ];

    const grouped = groupByWindow(records, (record) => record.instant, strategy);

    assert.equal(grouped.length, 2);
    assert.deepEqual(
      grouped.map((group) => group.items.map((item) => item.id)),
      [["a"], ["b", "c"]],
    );
  });
}
