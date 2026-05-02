import { Temporal } from "@js-temporal/polyfill";
import {
  FixedTimeBoundaryStrategy,
  compareWindowEndings,
  getWindowEndByElapsedDuration,
  getWindowEndByWallClockDuration,
  getWindowForInstant,
  getWindowForPlainDateTime,
  getWindowId,
} from "../lib/day-boundary.js";

const springGap = (() => {
  const referenceInstant = Temporal.Instant.from("2026-03-08T07:15:00Z");
  const compatibleStrategy = new FixedTimeBoundaryStrategy({
    timeZone: "America/New_York",
    boundaryTime: "02:30",
    disambiguation: "compatible",
  });
  const rejectStrategy = new FixedTimeBoundaryStrategy({
    timeZone: "America/New_York",
    boundaryTime: "02:30",
    disambiguation: "reject",
  });
  const window = getWindowForInstant(referenceInstant, compatibleStrategy);

  let rejectMessage = "";

  try {
    getWindowForInstant(referenceInstant, rejectStrategy);
  } catch (error) {
    rejectMessage = `${error.name}: ${error.message}`;
  }

  return {
    boundary: "02:30 local in America/New_York",
    referenceInstant,
    window,
    compatibleResolution:
      "compatible resolves the missing 02:30 boundary to the first valid later instant: 03:30 EDT.",
    rejectMessage,
  };
})();

const fallBack = (() => {
  const strategy = new FixedTimeBoundaryStrategy({
    timeZone: "America/New_York",
    boundaryTime: "01:45",
    disambiguation: "earlier",
  });
  const localInput = Temporal.PlainDateTime.from("2026-11-01T01:30:00");
  const earlierTimestamp = Temporal.ZonedDateTime.from(
    {
      timeZone: "America/New_York",
      year: 2026,
      month: 11,
      day: 1,
      hour: 1,
      minute: 30,
    },
    { disambiguation: "earlier" },
  );
  const laterTimestamp = Temporal.ZonedDateTime.from(
    {
      timeZone: "America/New_York",
      year: 2026,
      month: 11,
      day: 1,
      hour: 1,
      minute: 30,
    },
    { disambiguation: "later" },
  );
  const earlierWindow = getWindowForPlainDateTime(localInput, strategy, {
    disambiguation: "earlier",
  });
  const laterWindow = getWindowForPlainDateTime(localInput, strategy, {
    disambiguation: "later",
  });

  return {
    boundary: "01:45 local in America/New_York",
    rows: [
      {
        policy: "earlier",
        localTimestamp: `${localInput.toString()} (first occurrence)`,
        exactInstant: earlierTimestamp.toInstant().toString(),
        window: `${earlierWindow.start.toString()} -> ${earlierWindow.end.toString()}`,
        windowId: getWindowId(earlierWindow),
      },
      {
        policy: "later",
        localTimestamp: `${localInput.toString()} (second occurrence)`,
        exactInstant: laterTimestamp.toInstant().toString(),
        window: `${laterWindow.start.toString()} -> ${laterWindow.end.toString()}`,
        windowId: getWindowId(laterWindow),
      },
    ],
    differentWindowIds:
      getWindowId(earlierWindow) !== getWindowId(laterWindow) ? "Yes" : "No",
  };
})();

const durationDrift = (() => {
  const start = Temporal.ZonedDateTime.from(
    "2026-10-25T00:00:00+01:00[Europe/London]",
  );
  const duration = { hours: 8 };
  const comparison = compareWindowEndings(start, duration);

  return {
    start,
    duration,
    elapsedEnd: getWindowEndByElapsedDuration(start, duration),
    wallClockEnd: getWindowEndByWallClockDuration(start, duration),
    comparison,
  };
})();

const springCode = `const strategy = new FixedTimeBoundaryStrategy({
  timeZone: "America/New_York",
  boundaryTime: "02:30",
  disambiguation: "compatible",
});

const instant = Temporal.Instant.from("2026-03-08T07:15:00Z");
const window = getWindowForInstant(instant, strategy);

console.log(window.end.toString());
// 2026-03-08T03:30:00-04:00[America/New_York]`;

const fallbackCode = `const strategy = new FixedTimeBoundaryStrategy({
  timeZone: "America/New_York",
  boundaryTime: "01:45",
  disambiguation: "earlier",
});

const localInput = Temporal.PlainDateTime.from("2026-11-01T01:30:00");

const firstWindow = getWindowForPlainDateTime(localInput, strategy, {
  disambiguation: "earlier",
});

const secondWindow = getWindowForPlainDateTime(localInput, strategy, {
  disambiguation: "later",
});`;

const durationCode = `const start = Temporal.ZonedDateTime.from(
  "2026-10-25T00:00:00+01:00[Europe/London]"
);

const result = compareWindowEndings(start, { hours: 8 });

console.log(result.elapsedEnd.toString());
// 2026-10-25T07:00:00+00:00[Europe/London]

console.log(result.wallClockEnd.toString());
// 2026-10-25T08:00:00+00:00[Europe/London]`;

function $(id) {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`Missing required example element: #${id}`);
  }

  return element;
}

function renderSpringGap() {
  $("spring-boundary").textContent = springGap.boundary;
  $("spring-reference").textContent = springGap.referenceInstant.toString();
  $("spring-start").textContent = springGap.window.start.toString();
  $("spring-end").textContent = springGap.window.end.toString();
  $("spring-compatible").textContent = springGap.compatibleResolution;
  $("spring-reject").textContent = springGap.rejectMessage;
  $("spring-code").textContent = springCode;
}

function renderFallBack() {
  const rows = fallBack.rows
    .map(
      (row) => `
        <tr>
          <td class="mono">${row.policy}</td>
          <td class="mono">${row.localTimestamp}</td>
          <td class="mono">${row.exactInstant}</td>
          <td class="mono">${row.window}<br><br>ID: ${row.windowId}</td>
        </tr>`,
    )
    .join("");

  $("fallback-table-body").innerHTML = rows;
  $("fallback-boundary").textContent = fallBack.boundary;
  $("fallback-window-check").textContent = fallBack.differentWindowIds;
  $("fallback-code").textContent = fallbackCode;
}

function renderDurationDrift() {
  $("duration-start").textContent = durationDrift.start.toString();
  $("duration-input").textContent = JSON.stringify(durationDrift.duration);
  $("duration-elapsed").textContent = durationDrift.elapsedEnd.toString();
  $("duration-wallclock").textContent = durationDrift.wallClockEnd.toString();
  $("duration-same").textContent = String(durationDrift.comparison.sameInstant);
  $("duration-difference").textContent =
    `${durationDrift.comparison.differenceMinutes} minutes`;
  $("duration-code").textContent = durationCode;
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

renderSpringGap();
renderFallBack();
renderDurationDrift();
