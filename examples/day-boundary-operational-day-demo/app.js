import { Temporal } from "@js-temporal/polyfill";
import {
  FixedTimeBoundaryStrategy,
  compareWindowEndings,
  getWindowEndByElapsedDuration,
  getWindowEndByWallClockDuration,
  getWindowForInstant,
  getWindowId,
  groupByWindow,
} from "../lib/day-boundary.js";

const strategy = new FixedTimeBoundaryStrategy({
  timeZone: "Europe/London",
  boundaryTime: "06:00",
});

const resolveInstant = Temporal.Instant.from("2026-10-25T05:45:00Z");
const resolvedWindow = getWindowForInstant(resolveInstant, strategy);

const sampleEvents = [
  {
    label: "Pre-boundary prep",
    instant: Temporal.Instant.from("2026-10-24T04:15:00Z"),
  },
  {
    label: "Morning handover note",
    instant: Temporal.Instant.from("2026-10-24T05:40:00Z"),
  },
  {
    label: "BST overnight inspection",
    instant: Temporal.Instant.from("2026-10-25T00:30:00Z"),
  },
  {
    label: "Repeated 01:30 after fall-back",
    instant: Temporal.Instant.from("2026-10-25T01:30:00Z"),
  },
  {
    label: "Final checks before 06:00 boundary",
    instant: Temporal.Instant.from("2026-10-25T05:10:00Z"),
  },
  {
    label: "Next operational day begins",
    instant: Temporal.Instant.from("2026-10-25T06:20:00Z"),
  },
];

const dstStart = Temporal.ZonedDateTime.from(
  "2026-10-25T00:00:00+01:00[Europe/London]",
);
const dstDuration = { hours: 8 };
const dstComparison = compareWindowEndings(dstStart, dstDuration);

const flowSteps = [
  "Pick a boundary strategy that matches the operational day instead of assuming midnight.",
  "Resolve exact timestamps with getWindowForInstant(...) to get one stable [start, end) window.",
  "If a report needs a bucket date or Logical_Date, derive it from window.start in the strategy time zone.",
  "Reuse the same strategy in groupByWindow(...) so reports and exports match the exact same definition.",
  "Choose elapsed or wall-clock duration semantics explicitly when DST can change the exact end instant.",
  "Handle skipped times, repeated times, and cross-zone date differences as explicit policy cases, not ad hoc fixes.",
];

const resolveCode = `import { Temporal } from "@js-temporal/polyfill";
import {
  FixedTimeBoundaryStrategy,
  getWindowForInstant,
  getWindowId,
} from "day-boundary";

const strategy = new FixedTimeBoundaryStrategy({
  timeZone: "Europe/London",
  boundaryTime: "06:00",
});

const instant = Temporal.Instant.from("2026-10-25T05:45:00Z");
const window = getWindowForInstant(instant, strategy);
const windowId = getWindowId(window);
const logicalDate = window.start.toPlainDate().toString();`;

const groupCode = `const grouped = groupByWindow(
  events,
  (event) => event.instant,
  strategy,
);`;

const durationCode = `const start = Temporal.ZonedDateTime.from(
  "2026-10-25T00:00:00+01:00[Europe/London]"
);

const elapsedEnd = getWindowEndByElapsedDuration(start, { hours: 8 });
const wallClockEnd = getWindowEndByWallClockDuration(start, { hours: 8 });`;

function $(id) {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`Missing required example element: #${id}`);
  }

  return element;
}

function renderResolvePanel() {
  $("resolve-strategy").textContent = "Fixed boundary at 06:00 in Europe/London";
  $("resolve-input").textContent = resolveInstant.toString();
  $("resolve-start").textContent = resolvedWindow.start.toString();
  $("resolve-end").textContent = resolvedWindow.end.toString();
  $("resolve-logical-date").textContent = resolvedWindow.start.toPlainDate().toString();
  $("resolve-id").textContent = getWindowId(resolvedWindow);
  $("resolve-metadata").textContent = JSON.stringify(resolvedWindow.metadata);
  $("resolve-code").textContent = resolveCode;
}

function renderGroupingPanel() {
  const groups = groupByWindow(sampleEvents, (event) => event.instant, strategy);
  const rows = groups
    .map(({ window, items }) => {
      const eventsMarkup = items
        .map((item) => {
          const localTime = item.instant
            .toZonedDateTimeISO("Europe/London")
            .toString();

          return `<div class="event-line"><span class="mono">${localTime}</span><br>${item.label}</div>`;
        })
        .join("");

      return `
        <tr>
          <td class="mono">${window.start.toString()}<br>to<br>${window.end.toString()}</td>
          <td class="mono">${window.start.toPlainDate().toString()}</td>
          <td>${eventsMarkup}</td>
        </tr>`;
    })
    .join("");

  $("group-table-body").innerHTML = rows;
  $("group-code").textContent = groupCode;
}

function renderDurationPanel() {
  $("duration-start").textContent = dstStart.toString();
  $("duration-input").textContent = JSON.stringify(dstDuration);
  $("elapsed-end").textContent = getWindowEndByElapsedDuration(
    dstStart,
    dstDuration,
  ).toString();
  $("wallclock-end").textContent = getWindowEndByWallClockDuration(
    dstStart,
    dstDuration,
  ).toString();
  $("same-instant").textContent = String(dstComparison.sameInstant);
  $("difference-minutes").textContent = `${dstComparison.differenceMinutes} minutes`;
  $("duration-code").textContent = durationCode;
}

function renderFlow() {
  const items = flowSteps
    .map((step) => `<li>${step}</li>`)
    .join("");

  $("flow-list").innerHTML = items;
}

for (const button of document.querySelectorAll(".copy-button")) {
  button.addEventListener("click", async () => {
    const targetId = button.getAttribute("data-copy-target");

    if (!targetId) {
      return;
    }

    const target = document.getElementById(targetId);

    if (!target) {
      return;
    }

    try {
      await navigator.clipboard.writeText(target.textContent ?? "");
      button.textContent = "Copied";
    } catch {
      button.textContent = "Unavailable";
    }

    window.setTimeout(() => {
      button.textContent = "Copy";
    }, 1600);
  });
}

renderResolvePanel();
renderGroupingPanel();
renderDurationPanel();
renderFlow();
