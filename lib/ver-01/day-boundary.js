// day-boundary-v1.js
// Small library for resolving operational windows when the day boundary
// does not start at midnight.

/**
 * @typedef {Object} TimeWindow
 * @property {Date} start
 * @property {Date} end
 * @property {string} label
 * @property {Object<string, unknown>} metadata
 */

/**
 * Clone a Date safely.
 * @param {Date} value
 * @returns {Date}
 */
function cloneDate(value) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new TypeError("Expected a valid Date instance.");
  }
  return new Date(value.getTime());
}

/**
 * Convert unknown input into a Date.
 * @param {Date|string|number} value
 * @returns {Date}
 */
function toDate(value) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError("Expected a valid date-like value.");
  }
  return date;
}

/**
 * Return YYYY-MM-DD in local time.
 * @param {Date} date
 * @returns {string}
 */
function formatLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Return a friendly window label.
 * @param {Date} start
 * @param {Date} end
 * @returns {string}
 */
function defaultWindowLabel(start, end) {
  return `${formatLocalDateKey(start)} ${start.toTimeString().slice(0, 5)} -> ${formatLocalDateKey(end)} ${end.toTimeString().slice(0, 5)}`;
}

/**
 * Base strategy interface.
 * A strategy must implement getWindow(dateLike): TimeWindow
 */
class BoundaryStrategy {
  /**
   * @param {Date|string|number} _dateLike
   * @returns {TimeWindow}
   */
  getWindow(_dateLike) {
    throw new Error("BoundaryStrategy#getWindow must be implemented by subclasses.");
  }
}

/**
 * Fixed daily boundary strategy.
 * Example: day starts at 09:00 local time.
 */
class FixedTimeBoundaryStrategy extends BoundaryStrategy {
  /**
   * @param {{startHour?: number, startMinute?: number, label?: string}} options
   */
  constructor(options = {}) {
    super();
    const { startHour = 0, startMinute = 0, label = "operational-day" } = options;

    if (!Number.isInteger(startHour) || startHour < 0 || startHour > 23) {
      throw new RangeError("startHour must be an integer from 0 to 23.");
    }
    if (!Number.isInteger(startMinute) || startMinute < 0 || startMinute > 59) {
      throw new RangeError("startMinute must be an integer from 0 to 59.");
    }

    this.startHour = startHour;
    this.startMinute = startMinute;
    this.label = label;
  }

  /**
   * @param {Date|string|number} dateLike
   * @returns {TimeWindow}
   */
  getWindow(dateLike) {
    const now = toDate(dateLike);

    const boundaryToday = cloneDate(now);
    boundaryToday.setHours(this.startHour, this.startMinute, 0, 0);

    let start;
    let end;

    if (now >= boundaryToday) {
      start = boundaryToday;
      end = cloneDate(boundaryToday);
      end.setDate(end.getDate() + 1);
    } else {
      end = boundaryToday;
      start = cloneDate(boundaryToday);
      start.setDate(start.getDate() - 1);
    }

    return {
      start,
      end,
      label: defaultWindowLabel(start, end),
      metadata: {
        strategy: "fixed-time",
        kind: this.label,
        startHour: this.startHour,
        startMinute: this.startMinute,
      },
    };
  }
}

/**
 * Daily boundary strategy backed by a caller-provided boundary resolver.
 *
 * The caller provides a function that returns the boundary timestamp for any
 * given civil date. The library then resolves yesterday/today/tomorrow and
 * derives the active operational window.
 */
class DailyBoundaryStrategy extends BoundaryStrategy {
  /**
   * @param {{getBoundaryForDate: (date: Date) => Date|string|number, label?: string}} options
   */
  constructor(options = {}) {
    super();
    const { getBoundaryForDate, label = "daily-boundary" } = options;

    if (typeof getBoundaryForDate !== "function") {
      throw new TypeError("getBoundaryForDate must be a function.");
    }

    this.getBoundaryForDate = getBoundaryForDate;
    this.label = label;
  }

  /**
   * @param {Date|string|number} dateLike
   * @returns {TimeWindow}
   */
  getWindow(dateLike) {
    const now = toDate(dateLike);

    const today = cloneDate(now);
    today.setHours(0, 0, 0, 0);

    const yesterday = cloneDate(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const tomorrow = cloneDate(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const boundaryYesterday = toDate(this.getBoundaryForDate(cloneDate(yesterday)));
    const boundaryToday = toDate(this.getBoundaryForDate(cloneDate(today)));
    const boundaryTomorrow = toDate(this.getBoundaryForDate(cloneDate(tomorrow)));

    let start;
    let end;

    if (now >= boundaryToday) {
      start = boundaryToday;
      end = boundaryTomorrow;
    } else {
      start = boundaryYesterday;
      end = boundaryToday;
    }

    if (end.getTime() <= start.getTime()) {
      throw new RangeError("Resolved boundary window is invalid.");
    }

    return {
      start,
      end,
      label: defaultWindowLabel(start, end),
      metadata: {
        strategy: "daily-boundary",
        kind: this.label,
      },
    };
  }
}

/**
 * Resolve the active window for a timestamp using a strategy.
 * @param {Date|string|number} now
 * @param {BoundaryStrategy} strategy
 * @returns {TimeWindow}
 */
function getActiveWindow(now, strategy) {
  validateStrategy(strategy);
  return strategy.getWindow(now);
}

/**
 * Alias for semantic clarity when resolving historical or arbitrary timestamps.
 * @param {Date|string|number} timestamp
 * @param {BoundaryStrategy} strategy
 * @returns {TimeWindow}
 */
function getWindowForTimestamp(timestamp, strategy) {
  validateStrategy(strategy);
  return strategy.getWindow(timestamp);
}

/**
 * Return progress from 0 to 1 within the given window.
 * @param {Date|string|number} now
 * @param {TimeWindow} window
 * @returns {number}
 */
function getWindowProgress(now, window) {
  const current = toDate(now);
  const start = toDate(window.start);
  const end = toDate(window.end);
  const total = end.getTime() - start.getTime();

  if (total <= 0) {
    throw new RangeError("Window end must be later than window start.");
  }

  const raw = (current.getTime() - start.getTime()) / total;
  return Math.max(0, Math.min(1, raw));
}

/**
 * Compare whether two timestamps belong to the same resolved window.
 * @param {Date|string|number} a
 * @param {Date|string|number} b
 * @param {BoundaryStrategy} strategy
 * @returns {boolean}
 */
function isSameWindow(a, b, strategy) {
  validateStrategy(strategy);
  const windowA = strategy.getWindow(a);
  const windowB = strategy.getWindow(b);
  return (
    windowA.start.getTime() === windowB.start.getTime() &&
    windowA.end.getTime() === windowB.end.getTime()
  );
}

/**
 * Group arbitrary items by resolved window.
 * @template T
 * @param {T[]} items
 * @param {(item: T) => Date|string|number} getTimestamp
 * @param {BoundaryStrategy} strategy
 * @returns {{ window: TimeWindow, items: T[] }[]}
 */
function groupByWindow(items, getTimestamp, strategy) {
  if (!Array.isArray(items)) {
    throw new TypeError("items must be an array.");
  }
  if (typeof getTimestamp !== "function") {
    throw new TypeError("getTimestamp must be a function.");
  }
  validateStrategy(strategy);

  const grouped = new Map();

  for (const item of items) {
    const timestamp = getTimestamp(item);
    const window = strategy.getWindow(timestamp);
    const key = `${window.start.toISOString()}__${window.end.toISOString()}`;

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

/**
 * Build a stable identifier for a resolved window.
 * @param {TimeWindow} window
 * @returns {string}
 */
function getWindowId(window) {
  return `${toDate(window.start).toISOString()}__${toDate(window.end).toISOString()}`;
}

/**
 * @param {unknown} strategy
 */
function validateStrategy(strategy) {
  if (!strategy || typeof strategy.getWindow !== "function") {
    throw new TypeError("strategy must implement getWindow(dateLike).");
  }
}

export {
  BoundaryStrategy,
  FixedTimeBoundaryStrategy,
  DailyBoundaryStrategy,
  getActiveWindow,
  getWindowForTimestamp,
  getWindowProgress,
  isSameWindow,
  groupByWindow,
  getWindowId,
};
