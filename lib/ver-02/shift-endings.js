import { Temporal } from "@js-temporal/polyfill";

/**
 * Archived v2 predecessor of `lib/ver-03/window-durations.js`.
 * Kept here under `ver-02` because the original helpers were shift-specific.
 */

/**
 * @param {unknown} value
 * @returns {Temporal.ZonedDateTime}
 */
function toZonedDateTime(value) {
  if (value instanceof Temporal.ZonedDateTime) {
    return value;
  }

  throw new TypeError("Expected a Temporal.ZonedDateTime.");
}

/**
 * @param {unknown} value
 * @returns {Temporal.Duration}
 */
function toDuration(value) {
  const duration = value instanceof Temporal.Duration ? value : Temporal.Duration.from(value);

  if (duration.years !== 0 || duration.months !== 0 || duration.weeks !== 0) {
    throw new RangeError("Shift duration helpers do not support years, months, or weeks.");
  }

  return duration;
}

/**
 * Resolve shift end by exact elapsed duration.
 *
 * @param {Temporal.ZonedDateTime} start
 * @param {Temporal.Duration | Temporal.DurationLike} durationLike
 * @returns {Temporal.ZonedDateTime}
 */
export function getShiftEndByElapsedDuration(start, durationLike) {
  const zonedStart = toZonedDateTime(start);
  const duration = toDuration(durationLike);
  const endInstant = zonedStart.toInstant().add(duration);

  return endInstant.toZonedDateTimeISO(zonedStart.timeZoneId);
}

/**
 * Resolve shift end by wall-clock scheduled duration.
 *
 * @param {Temporal.ZonedDateTime} start
 * @param {Temporal.Duration | Temporal.DurationLike} durationLike
 * @returns {Temporal.ZonedDateTime}
 */
export function getShiftEndByWallClockDuration(start, durationLike) {
  const zonedStart = toZonedDateTime(start);
  const duration = toDuration(durationLike);
  const localEnd = zonedStart.toPlainDateTime().add(duration);

  return Temporal.ZonedDateTime.from({
    timeZone: zonedStart.timeZoneId,
    year: localEnd.year,
    month: localEnd.month,
    day: localEnd.day,
    hour: localEnd.hour,
    minute: localEnd.minute,
    second: localEnd.second,
    millisecond: localEnd.millisecond,
    microsecond: localEnd.microsecond,
    nanosecond: localEnd.nanosecond,
  });
}

/**
 * Compare exact elapsed-time and wall-clock schedule interpretations.
 *
 * @param {Temporal.ZonedDateTime} start
 * @param {Temporal.Duration | Temporal.DurationLike} durationLike
 * @returns {{
 *   elapsedEnd: Temporal.ZonedDateTime,
 *   wallClockEnd: Temporal.ZonedDateTime,
 *   sameInstant: boolean,
 *   differenceMinutes: number,
 * }}
 */
export function compareShiftEndings(start, durationLike) {
  const elapsedEnd = getShiftEndByElapsedDuration(start, durationLike);
  const wallClockEnd = getShiftEndByWallClockDuration(start, durationLike);
  const differenceMinutes =
    (wallClockEnd.toInstant().epochMilliseconds - elapsedEnd.toInstant().epochMilliseconds) /
    (60 * 1000);

  return {
    elapsedEnd,
    wallClockEnd,
    sameInstant:
      Temporal.Instant.compare(elapsedEnd.toInstant(), wallClockEnd.toInstant()) === 0,
    differenceMinutes,
  };
}
