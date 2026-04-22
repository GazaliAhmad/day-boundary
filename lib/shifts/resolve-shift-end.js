import { Temporal } from "@js-temporal/polyfill";
import {
  ZERO_DURATION,
  durationToNanoseconds,
  toInstant,
  toTimeOnlyDuration,
  toZonedDateTime,
} from "./shared.js";

/**
 * Resolve a shift end against business-defined log-off, inference, and overtime rules.
 * Exact comparisons use instants so end-of-shift logic remains DST-safe.
 *
 * @param {Temporal.Instant | Temporal.ZonedDateTime | null | undefined} logOffTime
 * @param {Temporal.ZonedDateTime} scheduledShiftEnd
 * @param {{
 *   lateLogOffTolerance?: {
 *     after?: Temporal.Duration,
 *   },
 *   missingLogOff?: {
 *     allowInference?: boolean,
 *     autoCloseAfter?: Temporal.Duration,
 *   },
 *   overtime?: {
 *     startsAfter?: Temporal.Duration,
 *   },
 * }} [options]
 * @returns {{
 *   scheduledShiftEnd: Temporal.ZonedDateTime,
 *   actualLogOffTime: Temporal.ZonedDateTime | null,
 *   resolvedLogOffTime: Temporal.ZonedDateTime | null,
 *   completionStatus: "on-time-log-off" | "late-log-off" | "missing-log-off" | "forgot-to-log-off",
 *   inferredLogOff: boolean,
 *   matchedLateLogOffTolerance: boolean,
 *   offsetFromScheduledEnd: Temporal.Duration | null,
 *   overtime: {
 *     hasOvertime: boolean,
 *     startsAt: Temporal.ZonedDateTime | null,
 *     duration: Temporal.Duration,
 *   },
 *   policy: {
 *     lateLogOffToleranceAfter: Temporal.Duration,
 *     autoCloseAfter: Temporal.Duration | null,
 *     overtimeStartsAfter: Temporal.Duration,
 *   },
 * }}
 */
export function resolveShiftEnd(logOffTime, scheduledShiftEnd, options = {}) {
  const scheduledEnd = toZonedDateTime(scheduledShiftEnd);
  const lateLogOffToleranceAfter = toTimeOnlyDuration(
    "lateLogOffTolerance.after",
    options.lateLogOffTolerance?.after,
  );
  const autoCloseAfter = toTimeOnlyDuration(
    "missingLogOff.autoCloseAfter",
    options.missingLogOff?.autoCloseAfter,
    null,
  );
  const overtimeStartsAfter = toTimeOnlyDuration(
    "overtime.startsAfter",
    options.overtime?.startsAfter,
  );
  const allowInference = options.missingLogOff?.allowInference === true;

  if (allowInference && autoCloseAfter === null) {
    throw new TypeError(
      "missingLogOff.autoCloseAfter must be provided when missingLogOff.allowInference is true.",
    );
  }

  const actualLogOffTime =
    logOffTime == null
      ? null
      : toInstant(logOffTime).toZonedDateTimeISO(scheduledEnd.timeZoneId);
  const resolvedLogOffTime =
    actualLogOffTime ??
    (allowInference
      ? scheduledEnd.toInstant().add(autoCloseAfter).toZonedDateTimeISO(scheduledEnd.timeZoneId)
      : null);
  const inferredLogOff = actualLogOffTime === null && resolvedLogOffTime !== null;

  let completionStatus;
  let matchedLateLogOffTolerance = false;

  if (actualLogOffTime === null) {
    completionStatus = inferredLogOff ? "forgot-to-log-off" : "missing-log-off";
  } else if (
    Temporal.Instant.compare(actualLogOffTime.toInstant(), scheduledEnd.toInstant()) <= 0
  ) {
    completionStatus = "on-time-log-off";
  } else {
    completionStatus = "late-log-off";
    const lateOffsetNanoseconds =
      actualLogOffTime.toInstant().epochNanoseconds - scheduledEnd.toInstant().epochNanoseconds;
    matchedLateLogOffTolerance =
      lateOffsetNanoseconds <= durationToNanoseconds(lateLogOffToleranceAfter);
  }

  const overtimeStart = scheduledEnd
    .toInstant()
    .add(overtimeStartsAfter)
    .toZonedDateTimeISO(scheduledEnd.timeZoneId);
  const hasOvertime =
    actualLogOffTime !== null &&
    Temporal.Instant.compare(actualLogOffTime.toInstant(), overtimeStart.toInstant()) > 0;

  return {
    scheduledShiftEnd: scheduledEnd,
    actualLogOffTime,
    resolvedLogOffTime,
    completionStatus,
    inferredLogOff,
    matchedLateLogOffTolerance,
    offsetFromScheduledEnd:
      resolvedLogOffTime === null
        ? null
        : resolvedLogOffTime.toInstant().since(scheduledEnd.toInstant(), {
            largestUnit: "hour",
          }),
    overtime: {
      hasOvertime,
      startsAt: hasOvertime ? overtimeStart : null,
      duration: hasOvertime
        ? actualLogOffTime.toInstant().since(overtimeStart.toInstant(), {
            largestUnit: "hour",
          })
        : ZERO_DURATION,
    },
    policy: {
      lateLogOffToleranceAfter,
      autoCloseAfter,
      overtimeStartsAfter,
    },
  };
}
