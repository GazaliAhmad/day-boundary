import { Temporal } from "@js-temporal/polyfill";

export type ExactTime = Temporal.Instant | Temporal.ZonedDateTime;

export type BoundaryDisambiguation =
  | "compatible"
  | "earlier"
  | "later"
  | "reject";

export interface DayBoundaryConfig {
  readonly timeZone: string;
}

export interface BoundaryWindow {
  readonly start: Temporal.ZonedDateTime;
  readonly end: Temporal.ZonedDateTime;
  readonly label: string;
  readonly metadata: Record<string, unknown>;
}

export interface FixedTimeBoundaryStrategyConfig extends DayBoundaryConfig {
  readonly boundaryTime?: Temporal.PlainTime;
  readonly label?: string;
  readonly disambiguation?: BoundaryDisambiguation;
}

export interface DailyBoundaryResolverContext {
  readonly timeZone: string;
  readonly disambiguation: BoundaryDisambiguation;
  readonly calendar: "iso8601";
}

export interface DailyBoundaryStrategyConfig extends DayBoundaryConfig {
  readonly label?: string;
  readonly disambiguation?: BoundaryDisambiguation;
  readonly getBoundaryForDate: (
    date: Temporal.PlainDate,
    context: DailyBoundaryResolverContext,
  ) => Temporal.ZonedDateTime;
}

export interface PlainDateTimeResolutionOptions {
  readonly timeZone?: string;
  readonly disambiguation?: BoundaryDisambiguation;
}

export interface BoundaryWindowIdentity {
  readonly start: Temporal.ZonedDateTime;
  readonly end: Temporal.ZonedDateTime;
}

export interface BoundaryWindowGroup<T> {
  readonly window: BoundaryWindow;
  readonly items: T[];
}

export declare abstract class BoundaryStrategy {
  protected readonly __dayBoundaryBrand: symbol;
  readonly timeZone: string;

  protected constructor(options: DayBoundaryConfig);

  abstract getWindowForInstant(instant: Temporal.Instant): BoundaryWindow;
}

export declare class FixedTimeBoundaryStrategy extends BoundaryStrategy {
  readonly boundaryTime: Temporal.PlainTime;
  readonly label: string;
  readonly disambiguation: BoundaryDisambiguation;

  constructor(options: FixedTimeBoundaryStrategyConfig);

  getBoundaryForDate(date: Temporal.PlainDate): Temporal.ZonedDateTime;

  getWindowForInstant(instant: Temporal.Instant): BoundaryWindow;
}

export declare class DailyBoundaryStrategy extends BoundaryStrategy {
  readonly label: string;
  readonly disambiguation: BoundaryDisambiguation;

  constructor(options: DailyBoundaryStrategyConfig);

  getBoundaryForDate(date: Temporal.PlainDate): Temporal.ZonedDateTime;

  getWindowForInstant(instant: Temporal.Instant): BoundaryWindow;
}

export declare function getWindowForInstant(
  instant: Temporal.Instant,
  strategy: BoundaryStrategy,
): BoundaryWindow;

export declare function getWindowForZonedDateTime(
  zonedDateTime: Temporal.ZonedDateTime,
  strategy: BoundaryStrategy,
): BoundaryWindow;

export declare function getWindowForPlainDateTime(
  plainDateTime: Temporal.PlainDateTime,
  strategy: BoundaryStrategy,
  options?: PlainDateTimeResolutionOptions,
): BoundaryWindow;

export declare function getWindowProgress(
  instant: ExactTime,
  window: BoundaryWindowIdentity,
): number;

export declare function getWindowId(window: BoundaryWindowIdentity): string;

export declare function isSameWindow(
  a: ExactTime,
  b: ExactTime,
  strategy: BoundaryStrategy,
): boolean;

export declare function groupByWindow<T>(
  items: readonly T[],
  getInstant: (item: T) => ExactTime,
  strategy: BoundaryStrategy,
): BoundaryWindowGroup<T>[];
