import { Temporal } from "@js-temporal/polyfill";
import {
  compareWindowEndings,
  getWindowEndByElapsedDuration,
  getWindowEndByWallClockDuration,
} from "./window-durations.js";

const VALID_DISAMBIGUATION = new Set(["compatible", "earlier", "later", "reject"]);

/**
 * Return a friendly window label.
 * @param {Temporal.ZonedDateTime} start
 * @param {Temporal.ZonedDateTime} end
 * @returns {string}
 */
function defaultWindowLabel(start, end) {
  return `${start.toString()} -> ${end.toString()}`;
}

/**
 * @param {unknown} value
 * @returns {Temporal.Instant}
 */
function toInstant(value) {
  if (value instanceof Temporal.Instant) {
    return value;
  }

  if (value instanceof Temporal.ZonedDateTime) {
    return value.toInstant();
  }

  throw new TypeError("Expected a Temporal.Instant or Temporal.ZonedDateTime.");
}

/**
 * @param {unknown} value
 * @returns {Temporal.PlainDateTime}
 */
function toPlainDateTime(value) {
  if (value instanceof Temporal.PlainDateTime) {
    return value;
  }

  throw new TypeError("Expected a Temporal.PlainDateTime.");
}

/**
 * @param {unknown} value
 * @returns {Temporal.PlainTime}
 */
function toPlainTime(value) {
  if (value instanceof Temporal.PlainTime) {
    return value;
  }

  if (typeof value === "string") {
    return Temporal.PlainTime.from(value);
  }

  throw new TypeError("boundaryTime must be a string or Temporal.PlainTime.");
}

/**
 * @param {string} timeZone
 * @returns {string}
 */
function validateTimeZone(timeZone) {
  if (typeof timeZone !== "string" || !timeZone.trim()) {
    throw new TypeError("timeZone must be a non-empty IANA time zone identifier.");
  }

  Temporal.Now.zonedDateTimeISO(timeZone);
  return timeZone;
}

/**
 * @param {string | undefined} disambiguation
 * @returns {"compatible" | "earlier" | "later" | "reject"}
 */
function validateDisambiguation(disambiguation) {
  const result = disambiguation ?? "compatible";

  if (!VALID_DISAMBIGUATION.has(result)) {
    throw new RangeError("disambiguation must be compatible, earlier, later, or reject.");
  }

  return result;
}

/**
 * Convert a PlainDateTime into a ZonedDateTime in the provided zone.
 * @param {Temporal.PlainDateTime} plainDateTime
 * @param {string} timeZone
 * @param {"compatible" | "earlier" | "later" | "reject"} disambiguation
 * @returns {Temporal.ZonedDateTime}
 */
function plainDateTimeToZonedDateTime(plainDateTime, timeZone, disambiguation) {
  return Temporal.ZonedDateTime.from(
    {
      timeZone,
      year: plainDateTime.year,
      month: plainDateTime.month,
      day: plainDateTime.day,
      hour: plainDateTime.hour,
      minute: plainDateTime.minute,
      second: plainDateTime.second,
      millisecond: plainDateTime.millisecond,
      microsecond: plainDateTime.microsecond,
      nanosecond: plainDateTime.nanosecond,
    },
    { disambiguation },
  );
}

/**
 * Base strategy interface.
 */
class BoundaryStrategy {
  /**
   * @param {{ timeZone: string }} options
   */
  constructor(options = {}) {
    this.timeZone = validateTimeZone(options.timeZone);
  }

  /**
   * @param {Temporal.Instant} _instant
   */
  getWindowForInstant(_instant) {
    throw new Error("BoundaryStrategy#getWindowForInstant must be implemented by subclasses.");
  }
}

/**
 * Fixed boundary strategy that resolves a local wall-clock boundary every day.
 */
class FixedTimeBoundaryStrategy extends BoundaryStrategy {
  /**
   * @param {{
   *   timeZone: string,
   *   boundaryTime?: string | Temporal.PlainTime,
   *   label?: string,
   *   disambiguation?: "compatible" | "earlier" | "later" | "reject",
   * }} options
   */
  constructor(options = {}) {
    super(options);

    const {
      boundaryTime = "00:00",
      label = "operational-day",
      disambiguation,
    } = options;

    this.boundaryTime = toPlainTime(boundaryTime);
    this.label = label;
    this.disambiguation = validateDisambiguation(disambiguation);
  }

  /**
   * @param {Temporal.PlainDate} date
   * @returns {Temporal.ZonedDateTime}
   */
  getBoundaryForDate(date) {
    const plainDateTime = date.toPlainDateTime(this.boundaryTime);
    return plainDateTimeToZonedDateTime(
      plainDateTime,
      this.timeZone,
      this.disambiguation,
    );
  }

  /**
   * @param {Temporal.Instant} instant
   * @returns {{
   *   start: Temporal.ZonedDateTime,
   *   end: Temporal.ZonedDateTime,
   *   label: string,
   *   metadata: Record<string, unknown>,
   * }}
   */
  getWindowForInstant(instant) {
    const exactInstant = toInstant(instant);
    const zonedNow = exactInstant.toZonedDateTimeISO(this.timeZone);
    const today = zonedNow.toPlainDate();
    const yesterday = today.subtract({ days: 1 });
    const tomorrow = today.add({ days: 1 });

    const boundaryYesterday = this.getBoundaryForDate(yesterday);
    const boundaryToday = this.getBoundaryForDate(today);
    const boundaryTomorrow = this.getBoundaryForDate(tomorrow);

    let start;
    let end;

    if (Temporal.Instant.compare(exactInstant, boundaryToday.toInstant()) >= 0) {
      start = boundaryToday;
      end = boundaryTomorrow;
    } else {
      start = boundaryYesterday;
      end = boundaryToday;
    }

    if (Temporal.Instant.compare(end.toInstant(), start.toInstant()) <= 0) {
      throw new RangeError("Resolved boundary window is invalid.");
    }

    return {
      start,
      end,
      label: defaultWindowLabel(start, end),
      metadata: {
        strategy: "fixed-time-v2",
        kind: this.label,
        boundaryTime: this.boundaryTime.toString(),
        disambiguation: this.disambiguation,
      },
    };
  }
}

/**
 * Daily boundary strategy backed by a caller-provided boundary resolver.
 */
class DailyBoundaryStrategy extends BoundaryStrategy {
  /**
   * @param {{
   *   timeZone: string,
   *   label?: string,
   *   disambiguation?: "compatible" | "earlier" | "later" | "reject",
   *   getBoundaryForDate: (
   *     date: Temporal.PlainDate,
   *     context: {
   *       timeZone: string,
   *       disambiguation: "compatible" | "earlier" | "later" | "reject",
   *       calendar: "iso8601",
   *     }
   *   ) => Temporal.ZonedDateTime,
   * }} options
   */
  constructor(options = {}) {
    super(options);

    const {
      getBoundaryForDate,
      label = "daily-boundary",
      disambiguation,
    } = options;

    if (typeof getBoundaryForDate !== "function") {
      throw new TypeError("getBoundaryForDate must be a function.");
    }

    this.getBoundaryForDateResolver = getBoundaryForDate;
    this.label = label;
    this.disambiguation = validateDisambiguation(disambiguation);
  }

  /**
   * @param {Temporal.PlainDate} date
   * @returns {Temporal.ZonedDateTime}
   */
  getBoundaryForDate(date) {
    const boundary = this.getBoundaryForDateResolver(date, {
      timeZone: this.timeZone,
      disambiguation: this.disambiguation,
      calendar: "iso8601",
    });

    if (!(boundary instanceof Temporal.ZonedDateTime)) {
      throw new TypeError("getBoundaryForDate must return a Temporal.ZonedDateTime.");
    }

    if (boundary.timeZoneId !== this.timeZone) {
      throw new RangeError("Resolved boundary must use the strategy time zone.");
    }

    return boundary;
  }

  /**
   * @param {Temporal.Instant} instant
   * @returns {{
   *   start: Temporal.ZonedDateTime,
   *   end: Temporal.ZonedDateTime,
   *   label: string,
   *   metadata: Record<string, unknown>,
   * }}
   */
  getWindowForInstant(instant) {
    const exactInstant = toInstant(instant);
    const zonedNow = exactInstant.toZonedDateTimeISO(this.timeZone);
    const today = zonedNow.toPlainDate();
    const yesterday = today.subtract({ days: 1 });
    const tomorrow = today.add({ days: 1 });

    const boundaryYesterday = this.getBoundaryForDate(yesterday);
    const boundaryToday = this.getBoundaryForDate(today);
    const boundaryTomorrow = this.getBoundaryForDate(tomorrow);

    let start;
    let end;

    if (Temporal.Instant.compare(exactInstant, boundaryToday.toInstant()) >= 0) {
      start = boundaryToday;
      end = boundaryTomorrow;
    } else {
      start = boundaryYesterday;
      end = boundaryToday;
    }

    if (Temporal.Instant.compare(end.toInstant(), start.toInstant()) <= 0) {
      throw new RangeError("Resolved boundary window is invalid.");
    }

    return {
      start,
      end,
      label: defaultWindowLabel(start, end),
      metadata: {
        strategy: "daily-boundary-v2",
        kind: this.label,
        disambiguation: this.disambiguation,
      },
    };
  }
}

/**
 * @param {unknown} strategy
 */
function validateStrategy(strategy) {
  if (!strategy || typeof strategy.getWindowForInstant !== "function") {
    throw new TypeError("strategy must implement getWindowForInstant(instant).");
  }
}

/**
 * @param {Temporal.Instant} instant
 * @param {BoundaryStrategy} strategy
 */
function getWindowForInstant(instant, strategy) {
  validateStrategy(strategy);
  return strategy.getWindowForInstant(instant);
}

/**
 * @param {Temporal.ZonedDateTime} zonedDateTime
 * @param {BoundaryStrategy} strategy
 */
function getWindowForZonedDateTime(zonedDateTime, strategy) {
  validateStrategy(strategy);

  if (!(zonedDateTime instanceof Temporal.ZonedDateTime)) {
    throw new TypeError("Expected a Temporal.ZonedDateTime.");
  }

  return strategy.getWindowForInstant(zonedDateTime.toInstant());
}

/**
 * @param {Temporal.PlainDateTime} plainDateTime
 * @param {BoundaryStrategy} strategy
 * @param {{
 *   timeZone?: string,
 *   disambiguation?: "compatible" | "earlier" | "later" | "reject",
 * }} [options]
 */
function getWindowForPlainDateTime(plainDateTime, strategy, options = {}) {
  validateStrategy(strategy);

  const localDateTime = toPlainDateTime(plainDateTime);
  const timeZone = validateTimeZone(options.timeZone ?? strategy.timeZone);
  const disambiguation = validateDisambiguation(options.disambiguation);
  const zonedDateTime = plainDateTimeToZonedDateTime(
    localDateTime,
    timeZone,
    disambiguation,
  );

  return strategy.getWindowForInstant(zonedDateTime.toInstant());
}

/**
 * @param {Temporal.Instant | Temporal.ZonedDateTime} instant
 * @param {{ start: Temporal.ZonedDateTime, end: Temporal.ZonedDateTime }} window
 */
function getWindowProgress(instant, window) {
  const current = toInstant(instant);
  const start = toInstant(window.start);
  const end = toInstant(window.end);
  const total = end.epochMilliseconds - start.epochMilliseconds;

  if (total <= 0) {
    throw new RangeError("Window end must be later than window start.");
  }

  const raw = (current.epochMilliseconds - start.epochMilliseconds) / total;
  return Math.max(0, Math.min(1, raw));
}

/**
 * @param {{ start: Temporal.ZonedDateTime, end: Temporal.ZonedDateTime }} window
 */
function getWindowId(window) {
  return `${window.start.toString()}__${window.end.toString()}`;
}

/**
 * @param {Temporal.Instant | Temporal.ZonedDateTime} a
 * @param {Temporal.Instant | Temporal.ZonedDateTime} b
 * @param {BoundaryStrategy} strategy
 */
function isSameWindow(a, b, strategy) {
  validateStrategy(strategy);

  const windowA = strategy.getWindowForInstant(toInstant(a));
  const windowB = strategy.getWindowForInstant(toInstant(b));

  return (
    Temporal.Instant.compare(windowA.start.toInstant(), windowB.start.toInstant()) === 0 &&
    Temporal.Instant.compare(windowA.end.toInstant(), windowB.end.toInstant()) === 0
  );
}

/**
 * @template T
 * @param {T[]} items
 * @param {(item: T) => Temporal.Instant | Temporal.ZonedDateTime} getInstant
 * @param {BoundaryStrategy} strategy
 * @returns {{ window: { start: Temporal.ZonedDateTime, end: Temporal.ZonedDateTime, label: string, metadata: Record<string, unknown> }, items: T[] }[]}
 */
function groupByWindow(items, getInstant, strategy) {
  if (!Array.isArray(items)) {
    throw new TypeError("items must be an array.");
  }

  if (typeof getInstant !== "function") {
    throw new TypeError("getInstant must be a function.");
  }

  validateStrategy(strategy);

  const grouped = new Map();

  for (const item of items) {
    const instant = toInstant(getInstant(item));
    const window = strategy.getWindowForInstant(instant);
    const key = getWindowId(window);

    if (!grouped.has(key)) {
      grouped.set(key, {
        window,
        items: [],
      });
    }

    grouped.get(key).items.push(item);
  }

  return Array.from(grouped.values());
}

export {
  BoundaryStrategy,
  FixedTimeBoundaryStrategy,
  DailyBoundaryStrategy,
  getWindowForInstant,
  getWindowForZonedDateTime,
  getWindowForPlainDateTime,
  getWindowProgress,
  getWindowEndByElapsedDuration,
  getWindowEndByWallClockDuration,
  compareWindowEndings,
  getWindowId,
  isSameWindow,
  groupByWindow,
};
