import { Temporal } from "@js-temporal/polyfill";

export const ZERO_DURATION = new Temporal.Duration();
const NANOSECONDS_PER_HOUR = 3_600_000_000_000n;
const NANOSECONDS_PER_MINUTE = 60_000_000_000n;
const NANOSECONDS_PER_SECOND = 1_000_000_000n;
const NANOSECONDS_PER_MILLISECOND = 1_000_000n;
const NANOSECONDS_PER_MICROSECOND = 1_000n;

/**
 * @param {unknown} value
 * @returns {Temporal.ZonedDateTime}
 */
export function toZonedDateTime(value) {
  if (value instanceof Temporal.ZonedDateTime) {
    return value;
  }

  throw new TypeError("Expected a Temporal.ZonedDateTime.");
}

/**
 * @param {unknown} value
 * @returns {Temporal.Instant}
 */
export function toInstant(value) {
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
 * @returns {Temporal.Duration}
 */
export function toDuration(value) {
  const duration = value instanceof Temporal.Duration ? value : Temporal.Duration.from(value);

  if (
    duration.years !== 0 ||
    duration.months !== 0 ||
    duration.weeks !== 0
  ) {
    throw new RangeError("Shift duration helpers do not support years, months, or weeks.");
  }

  return duration;
}

/**
 * @param {Temporal.Duration} duration
 * @returns {bigint}
 */
export function durationToNanoseconds(duration) {
  return (
    BigInt(duration.hours) * NANOSECONDS_PER_HOUR +
    BigInt(duration.minutes) * NANOSECONDS_PER_MINUTE +
    BigInt(duration.seconds) * NANOSECONDS_PER_SECOND +
    BigInt(duration.milliseconds) * NANOSECONDS_PER_MILLISECOND +
    BigInt(duration.microseconds) * NANOSECONDS_PER_MICROSECOND +
    BigInt(duration.nanoseconds)
  );
}

/**
 * @param {string} label
 * @param {unknown} value
 * @param {Temporal.Duration | null} [fallback]
 * @returns {Temporal.Duration | null}
 */
export function toTimeOnlyDuration(label, value, fallback = ZERO_DURATION) {
  if (value === undefined) {
    return fallback;
  }

  if (!(value instanceof Temporal.Duration)) {
    throw new TypeError(`${label} must be a Temporal.Duration.`);
  }

  if (
    value.years !== 0 ||
    value.months !== 0 ||
    value.weeks !== 0 ||
    value.days !== 0
  ) {
    throw new RangeError(`${label} must only use time-based units smaller than one day.`);
  }

  if (
    value.hours < 0 ||
    value.minutes < 0 ||
    value.seconds < 0 ||
    value.milliseconds < 0 ||
    value.microseconds < 0 ||
    value.nanoseconds < 0
  ) {
    throw new RangeError(`${label} must be zero or positive.`);
  }

  return value;
}

/**
 * @param {unknown} strategy
 * @returns {{ timeZone?: string, getWindowForInstant: (instant: Temporal.Instant) => { start: Temporal.ZonedDateTime, end: Temporal.ZonedDateTime, label: string, metadata: Record<string, unknown> } }}
 */
export function validateStrategy(strategy) {
  if (!strategy || typeof strategy.getWindowForInstant !== "function") {
    throw new TypeError("strategy must implement getWindowForInstant(instant).");
  }

  return strategy;
}

/**
 * @param {{ start: Temporal.ZonedDateTime, end: Temporal.ZonedDateTime, label: string, metadata: Record<string, unknown> }} window
 * @returns {{ start: Temporal.ZonedDateTime, end: Temporal.ZonedDateTime, label: string, metadata: Record<string, unknown> }}
 */
export function validateWindow(window) {
  if (!window || !(window.start instanceof Temporal.ZonedDateTime) || !(window.end instanceof Temporal.ZonedDateTime)) {
    throw new TypeError("strategy.getWindowForInstant must return a window with ZonedDateTime start and end.");
  }

  if (Temporal.Instant.compare(window.end.toInstant(), window.start.toInstant()) <= 0) {
    throw new RangeError("Resolved shift window is invalid.");
  }

  return window;
}

/**
 * @param {{ timeZone?: string, getWindowForInstant: (instant: Temporal.Instant) => { start: Temporal.ZonedDateTime, end: Temporal.ZonedDateTime, label: string, metadata: Record<string, unknown> } }} strategy
 * @param {Temporal.Instant} instant
 */
export function getResolvedWindow(strategy, instant) {
  return validateWindow(strategy.getWindowForInstant(instant));
}

/**
 * @param {Temporal.ZonedDateTime} boundaryStart
 * @param {Temporal.Duration} before
 * @param {Temporal.Duration} after
 * @param {bigint} previousGapNanoseconds
 * @param {bigint} nextGapNanoseconds
 */
export function assertToleranceDoesNotOverlap(
  boundaryStart,
  before,
  after,
  previousGapNanoseconds,
  nextGapNanoseconds,
) {
  const toleranceSpanNanoseconds = durationToNanoseconds(before) + durationToNanoseconds(after);

  if (toleranceSpanNanoseconds >= previousGapNanoseconds || toleranceSpanNanoseconds >= nextGapNanoseconds) {
    throw new RangeError(
      `Start tolerance around ${boundaryStart.toString()} overlaps an adjacent shift window.`,
    );
  }
}
