import { Temporal } from "@js-temporal/polyfill";
import {
  assertToleranceDoesNotOverlap,
  durationToNanoseconds,
  getResolvedWindow,
  toInstant,
  toTimeOnlyDuration,
  validateStrategy,
} from "./shared.js";

/**
 * Resolve a shift start using a configurable tolerance window around the boundary.
 * Exact comparisons use instants so early/late tolerances remain DST-safe.
 *
 * @param {Temporal.Instant | Temporal.ZonedDateTime} eventTime
 * @param {{ timeZone?: string, getWindowForInstant: (instant: Temporal.Instant) => { start: Temporal.ZonedDateTime, end: Temporal.ZonedDateTime, label: string, metadata: Record<string, unknown> } }} strategy
 * @param {{
 *   startTolerance?: {
 *     before?: Temporal.Duration,
 *     after?: Temporal.Duration,
 *   },
 * }} [options]
 * @returns {{
 *   window: { start: Temporal.ZonedDateTime, end: Temporal.ZonedDateTime, label: string, metadata: Record<string, unknown> },
 *   logicalDay: Temporal.PlainDate,
 *   eventTime: Temporal.ZonedDateTime,
 *   shiftStart: Temporal.ZonedDateTime,
 *   matchedStartTolerance: boolean,
 *   assignmentAdjusted: boolean,
 *   classification: "early-within-tolerance" | "on-start-boundary" | "late-within-tolerance" | "outside-start-tolerance",
 *   offsetFromShiftStart: Temporal.Duration,
 *   startTolerance: { before: Temporal.Duration, after: Temporal.Duration },
 * }}
 */
export function resolveShiftStart(eventTime, strategy, options = {}) {
  const exactEventTime = toInstant(eventTime);
  const boundaryStrategy = validateStrategy(strategy);
  const before = toTimeOnlyDuration("startTolerance.before", options.startTolerance?.before);
  const after = toTimeOnlyDuration("startTolerance.after", options.startTolerance?.after);

  const currentWindow = getResolvedWindow(boundaryStrategy, exactEventTime);
  const currentStart = currentWindow.start;
  const nextStart = currentWindow.end;
  const eventAfterCurrentStartNanoseconds =
    exactEventTime.epochNanoseconds - currentStart.toInstant().epochNanoseconds;
  const eventBeforeNextStartNanoseconds =
    nextStart.toInstant().epochNanoseconds - exactEventTime.epochNanoseconds;
  const afterToleranceNanoseconds = durationToNanoseconds(after);
  const beforeToleranceNanoseconds = durationToNanoseconds(before);

  let window = currentWindow;
  let shiftStart = currentStart;
  let matchedStartTolerance = false;
  let assignmentAdjusted = false;
  let classification = "outside-start-tolerance";

  if (eventAfterCurrentStartNanoseconds === 0n) {
    matchedStartTolerance = true;
    classification = "on-start-boundary";
  } else if (
    eventAfterCurrentStartNanoseconds > 0n &&
    eventAfterCurrentStartNanoseconds <= afterToleranceNanoseconds
  ) {
    matchedStartTolerance = true;
    classification = "late-within-tolerance";
  } else if (
    eventBeforeNextStartNanoseconds > 0n &&
    eventBeforeNextStartNanoseconds <= beforeToleranceNanoseconds
  ) {
    window = getResolvedWindow(boundaryStrategy, nextStart.toInstant());
    shiftStart = nextStart;
    matchedStartTolerance = true;
    assignmentAdjusted = true;
    classification = "early-within-tolerance";
  } else {
    const distanceFromCurrentStartNanoseconds = eventAfterCurrentStartNanoseconds;
    const distanceFromNextStartNanoseconds = eventBeforeNextStartNanoseconds;

    if (distanceFromNextStartNanoseconds < distanceFromCurrentStartNanoseconds) {
      shiftStart = nextStart;
    }
  }

  let previousGapNanoseconds;
  let nextGapNanoseconds;

  if (Temporal.Instant.compare(shiftStart.toInstant(), currentStart.toInstant()) === 0) {
    const previousWindow = getResolvedWindow(
      boundaryStrategy,
      currentStart.toInstant().subtract({ nanoseconds: 1 }),
    );

    previousGapNanoseconds =
      currentStart.toInstant().epochNanoseconds - previousWindow.start.toInstant().epochNanoseconds;
    nextGapNanoseconds =
      currentWindow.end.toInstant().epochNanoseconds - currentStart.toInstant().epochNanoseconds;
  } else {
    const nextWindow =
      Temporal.Instant.compare(window.start.toInstant(), nextStart.toInstant()) === 0
        ? window
        : getResolvedWindow(boundaryStrategy, nextStart.toInstant());

    previousGapNanoseconds =
      nextStart.toInstant().epochNanoseconds - currentWindow.start.toInstant().epochNanoseconds;
    nextGapNanoseconds =
      nextWindow.end.toInstant().epochNanoseconds - nextStart.toInstant().epochNanoseconds;
  }

  assertToleranceDoesNotOverlap(
    shiftStart,
    before,
    after,
    previousGapNanoseconds,
    nextGapNanoseconds,
  );

  const normalizedEventTime = exactEventTime.toZonedDateTimeISO(shiftStart.timeZoneId);

  return {
    window,
    logicalDay: window.start.toPlainDate(),
    eventTime: normalizedEventTime,
    shiftStart,
    matchedStartTolerance,
    assignmentAdjusted,
    classification,
    offsetFromShiftStart: exactEventTime.since(shiftStart.toInstant(), { largestUnit: "hour" }),
    startTolerance: {
      before,
      after,
    },
  };
}
