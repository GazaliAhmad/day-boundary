import { Temporal } from "@js-temporal/polyfill";
import { toDuration, toZonedDateTime } from "./shared.js";

/**
 * Resolve shift end by exact elapsed duration.
 * Useful for payroll or compliance rules that care about real elapsed time.
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
 * Useful for rota-style rules that care about local labeled clock time.
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
 * Compare exact elapsed-time and wall-clock schedule interpretations for the same shift.
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
