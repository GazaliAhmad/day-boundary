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

export function runDayBoundaryV3Tests(run) {
  run("v3 getWindowForInstant rejects legacy Date inputs with migration guidance", () => {
    const strategy = new FixedTimeBoundaryStrategy({
      timeZone: "Asia/Singapore",
      boundaryTime: "09:00",
    });

    assert.throws(
      () => getWindowForInstant(new Date("2026-04-19T01:00:00Z"), strategy),
      (error) =>
        error instanceof TypeError &&
        error.message ===
          "Legacy Date, string, and numeric timestamp inputs are no longer accepted in v3. Convert the value to a Temporal.Instant or Temporal.ZonedDateTime first.",
    );
  });

  run("v3 getWindowForPlainDateTime rejects legacy string inputs with migration guidance", () => {
    const strategy = new FixedTimeBoundaryStrategy({
      timeZone: "Asia/Singapore",
      boundaryTime: "09:00",
    });

    assert.throws(
      () => getWindowForPlainDateTime("2026-04-19T09:00:00", strategy),
      (error) =>
        error instanceof TypeError &&
        error.message ===
          "Legacy Date, string, and numeric timestamp inputs are no longer accepted in v3. Use Temporal.PlainDateTime.from(...) for wall-clock input, or convert the value to a Temporal.Instant and call getWindowForInstant(...).",
    );
  });

  run("v3 getWindowForInstant rejects null inputs with a typed runtime error", () => {
    const strategy = new FixedTimeBoundaryStrategy({
      timeZone: "Asia/Singapore",
      boundaryTime: "09:00",
    });

    assert.throws(
      () => getWindowForInstant(null, strategy),
      (error) =>
        error instanceof TypeError &&
        error.message === "Expected a Temporal.Instant or Temporal.ZonedDateTime.",
    );
  });

  run("v3 getWindowForPlainDateTime rejects undefined inputs with a typed runtime error", () => {
    const strategy = new FixedTimeBoundaryStrategy({
      timeZone: "Asia/Singapore",
      boundaryTime: "09:00",
    });

    assert.throws(
      () => getWindowForPlainDateTime(undefined, strategy),
      (error) =>
        error instanceof TypeError &&
        error.message === "Expected a Temporal.PlainDateTime.",
    );
  });

  run("v3 FixedTimeBoundaryStrategy rejects empty boundaryTime with a library-owned error", () => {
    assert.throws(
      () =>
        new FixedTimeBoundaryStrategy({
          timeZone: "Asia/Singapore",
          boundaryTime: "",
        }),
      (error) =>
        error instanceof TypeError &&
        error.message === "boundaryTime must be a non-empty string or Temporal.PlainTime.",
    );
  });

  run("v3 FixedTimeBoundaryStrategy rejects legacy boundary keys before timeZone validation", () => {
    assert.throws(
      () => new FixedTimeBoundaryStrategy({ hour: 6, minute: 0, second: 0 }),
      (error) =>
        error instanceof TypeError &&
        error.message ===
          'FixedTimeBoundaryStrategy no longer accepts legacy boundary keys ("hour", "minute", "second") in v3. Use { timeZone: "Asia/Singapore", boundaryTime: "06:00" } instead.',
    );
  });

  run("v3 FixedTimeBoundaryStrategy rejects mixed legacy and current fixed-time options", () => {
    assert.throws(
      () =>
        new FixedTimeBoundaryStrategy({
          timeZone: "Asia/Singapore",
          hour: 6,
          minute: 0,
          boundaryTime: "06:00",
        }),
      (error) =>
        error instanceof TypeError &&
        error.message ===
          'FixedTimeBoundaryStrategy no longer accepts legacy boundary keys ("hour", "minute") in v3. Use { timeZone: "Asia/Singapore", boundaryTime: "06:00" } instead.',
    );
  });

  run("v3 FixedTimeBoundaryStrategy resolves the previous window before the boundary", () => {
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
    assert.equal(window.metadata.strategy, "fixed-time-v3");
  });

  run("v3 FixedTimeBoundaryStrategy resolves a 23-hour window across spring-forward DST", () => {
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

  run("v3 FixedTimeBoundaryStrategy resolves a 25-hour window across fall-back DST", () => {
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

  run("v3 FixedTimeBoundaryStrategy resolves a skipped spring-forward boundary with compatible disambiguation", () => {
    const strategy = new FixedTimeBoundaryStrategy({
      timeZone: "America/New_York",
      boundaryTime: "02:30",
    });

    const window = getWindowForInstant(
      Temporal.Instant.from("2026-03-08T07:15:00Z"),
      strategy,
    );

    assert.equal(
      window.start.toString(),
      "2026-03-07T02:30:00-05:00[America/New_York]",
    );
    assert.equal(
      window.end.toString(),
      "2026-03-08T03:30:00-04:00[America/New_York]",
    );
    assert.equal(durationHours(window), 24);
    assert.equal(window.metadata.disambiguation, "compatible");
  });

  run("v3 FixedTimeBoundaryStrategy can fail fast on a skipped spring-forward boundary with reject disambiguation", () => {
    const strategy = new FixedTimeBoundaryStrategy({
      timeZone: "America/New_York",
      boundaryTime: "02:30",
      disambiguation: "reject",
    });

    assert.throws(
      () => getWindowForInstant(Temporal.Instant.from("2026-03-08T07:15:00Z"), strategy),
      RangeError,
    );
  });

  run("v3 getWindowForPlainDateTime can distinguish repeated fall-back local times with earlier and later disambiguation", () => {
    const strategy = new FixedTimeBoundaryStrategy({
      timeZone: "America/New_York",
      boundaryTime: "01:45",
      disambiguation: "earlier",
    });

    const localInput = Temporal.PlainDateTime.from("2026-11-01T01:30:00");
    const earlierWindow = getWindowForPlainDateTime(localInput, strategy, {
      disambiguation: "earlier",
    });
    const laterWindow = getWindowForPlainDateTime(localInput, strategy, {
      disambiguation: "later",
    });

    assert.equal(
      earlierWindow.start.toString(),
      "2026-10-31T01:45:00-04:00[America/New_York]",
    );
    assert.equal(
      earlierWindow.end.toString(),
      "2026-11-01T01:45:00-04:00[America/New_York]",
    );
    assert.equal(
      laterWindow.start.toString(),
      "2026-11-01T01:45:00-04:00[America/New_York]",
    );
    assert.equal(
      laterWindow.end.toString(),
      "2026-11-02T01:45:00-05:00[America/New_York]",
    );
    assert.notEqual(getWindowId(earlierWindow), getWindowId(laterWindow));
  });

  run("v3 can resolve the same instant to different operational dates across International Date Line zones", () => {
    const instant = Temporal.Instant.from("2026-05-01T10:30:00Z");
    const kiritimati = new FixedTimeBoundaryStrategy({
      timeZone: "Pacific/Kiritimati",
      boundaryTime: "06:00",
    });
    const honolulu = new FixedTimeBoundaryStrategy({
      timeZone: "Pacific/Honolulu",
      boundaryTime: "06:00",
    });

    const kiritimatiWindow = getWindowForInstant(instant, kiritimati);
    const honoluluWindow = getWindowForInstant(instant, honolulu);

    assert.equal(
      kiritimatiWindow.start.toString(),
      "2026-05-01T06:00:00+14:00[Pacific/Kiritimati]",
    );
    assert.equal(
      honoluluWindow.start.toString(),
      "2026-04-30T06:00:00-10:00[Pacific/Honolulu]",
    );
    assert.equal(kiritimatiWindow.start.toPlainDate().toString(), "2026-05-01");
    assert.equal(honoluluWindow.start.toPlainDate().toString(), "2026-04-30");
  });

  run("v3 helper entry points resolve the same window identity", () => {
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

  run("v3 getWindowProgress uses exact elapsed time across a 25-hour DST window", () => {
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

  run("v3 DailyBoundaryStrategy resolves a shifting boundary window", () => {
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
    assert.equal(window.metadata.strategy, "daily-boundary-v3");
  });

  run("v3 DailyBoundaryStrategy rejects a missing boundary resolver", () => {
    assert.throws(
      () => new DailyBoundaryStrategy({ timeZone: "Asia/Singapore" }),
      TypeError,
    );
  });

  run("v3 DailyBoundaryStrategy rejects legacy constructor usage without an explicit timeZone", () => {
    assert.throws(
      () =>
        new DailyBoundaryStrategy({
          getBoundaryForDate() {
            return Temporal.ZonedDateTime.from("2026-04-19T19:00:00+08:00[Asia/Singapore]");
          },
        }),
      (error) =>
        error instanceof TypeError &&
        error.message ===
          'DailyBoundaryStrategy requires an explicit non-empty IANA timeZone in v3. Use { timeZone: "Asia/Singapore", getBoundaryForDate(date, context) { return Temporal.ZonedDateTime.from(...); } } instead.',
    );
  });

  run("v3 DailyBoundaryStrategy throws when the resolver does not return ZonedDateTime", () => {
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

  run("v3 DailyBoundaryStrategy rejects legacy Date resolver results with migration guidance", () => {
    const strategy = new DailyBoundaryStrategy({
      timeZone: "Asia/Singapore",
      getBoundaryForDate() {
        return new Date("2026-04-19T11:00:00Z");
      },
    });

    assert.throws(
      () => getWindowForInstant(Temporal.Instant.from("2026-04-19T10:00:00Z"), strategy),
      (error) =>
        error instanceof TypeError &&
        error.message ===
          "DailyBoundaryStrategy#getBoundaryForDate no longer accepts legacy Date, string, or numeric results in v3. Return a Temporal.ZonedDateTime in the strategy time zone instead.",
    );
  });

  run("v3 DailyBoundaryStrategy throws when resolved boundaries do not form a valid window", () => {
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

  run("v3 isSameWindow distinguishes timestamps on opposite sides of the boundary", () => {
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

  run("v3 groupByWindow buckets records into boundary windows", () => {
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
