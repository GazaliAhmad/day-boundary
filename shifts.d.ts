import { Temporal } from "@js-temporal/polyfill";
import type { BoundaryStrategy, BoundaryWindow, ExactTime } from "./index.js";

export interface ShiftEndComparison {
  readonly elapsedEnd: Temporal.ZonedDateTime;
  readonly wallClockEnd: Temporal.ZonedDateTime;
  readonly sameInstant: boolean;
  readonly differenceMinutes: number;
}

export interface StartTolerance {
  readonly before?: Temporal.Duration;
  readonly after?: Temporal.Duration;
}

export interface ResolveShiftStartOptions {
  readonly startTolerance?: StartTolerance;
}

export type ShiftStartClassification =
  | "early-within-tolerance"
  | "on-start-boundary"
  | "late-within-tolerance"
  | "outside-start-tolerance";

export interface ShiftStartResult {
  readonly window: BoundaryWindow;
  readonly logicalDay: Temporal.PlainDate;
  readonly eventTime: Temporal.ZonedDateTime;
  readonly shiftStart: Temporal.ZonedDateTime;
  readonly matchedStartTolerance: boolean;
  readonly assignmentAdjusted: boolean;
  readonly classification: ShiftStartClassification;
  readonly offsetFromShiftStart: Temporal.Duration;
  readonly startTolerance: {
    readonly before: Temporal.Duration;
    readonly after: Temporal.Duration;
  };
}

export interface LateLogOffTolerance {
  readonly after?: Temporal.Duration;
}

export interface MissingLogOffOptions {
  readonly allowInference?: boolean;
  readonly autoCloseAfter?: Temporal.Duration;
}

export interface OvertimeOptions {
  /**
   * Neutral post-end threshold retained under the `overtime` option name for
   * API stability. This library does not treat it as payroll or legal overtime
   * by itself.
   */
  readonly startsAfter?: Temporal.Duration;
}

export interface ResolveShiftEndOptions {
  readonly lateLogOffTolerance?: LateLogOffTolerance;
  readonly missingLogOff?: MissingLogOffOptions;
  readonly overtime?: OvertimeOptions;
}

export type ShiftEndCompletionStatus =
  | "on-time-log-off"
  | "late-log-off"
  | "missing-log-off"
  | "forgot-to-log-off";

export interface ShiftEndOvertime {
  /**
   * Neutral post-end measurement retained under the `overtime` name for API
   * stability. This library does not treat it as payroll or legal overtime by
   * itself.
   */
  readonly hasOvertime: boolean;
  readonly startsAt: Temporal.ZonedDateTime | null;
  readonly duration: Temporal.Duration;
}

export interface ShiftEndPolicy {
  readonly lateLogOffToleranceAfter: Temporal.Duration;
  readonly autoCloseAfter: Temporal.Duration | null;
  readonly overtimeStartsAfter: Temporal.Duration;
}

export interface ShiftEndResult {
  readonly scheduledShiftEnd: Temporal.ZonedDateTime;
  readonly actualLogOffTime: Temporal.ZonedDateTime | null;
  readonly resolvedLogOffTime: Temporal.ZonedDateTime | null;
  readonly completionStatus: ShiftEndCompletionStatus;
  readonly inferredLogOff: boolean;
  readonly matchedLateLogOffTolerance: boolean;
  readonly offsetFromScheduledEnd: Temporal.Duration | null;
  /**
   * Neutral post-end measurement retained under the `overtime` field name for
   * API stability. Downstream payroll or compliance rules may interpret this
   * value differently.
   */
  readonly overtime: ShiftEndOvertime;
  readonly policy: ShiftEndPolicy;
}

export declare function getShiftEndByElapsedDuration(
  start: Temporal.ZonedDateTime,
  duration: Temporal.Duration,
): Temporal.ZonedDateTime;

export declare function getShiftEndByWallClockDuration(
  start: Temporal.ZonedDateTime,
  duration: Temporal.Duration,
): Temporal.ZonedDateTime;

export declare function compareShiftEndings(
  start: Temporal.ZonedDateTime,
  duration: Temporal.Duration,
): ShiftEndComparison;

export declare function resolveShiftStart(
  eventTime: ExactTime,
  strategy: BoundaryStrategy,
  options?: ResolveShiftStartOptions,
): ShiftStartResult;

export declare function resolveShiftEnd(
  logOffTime: ExactTime | null | undefined,
  scheduledShiftEnd: Temporal.ZonedDateTime,
  options?: ResolveShiftEndOptions,
): ShiftEndResult;
