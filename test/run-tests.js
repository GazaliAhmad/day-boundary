import { runDailyBoundaryTests } from "./daily-boundary.test.js";
import { runDayBoundaryShiftTests } from "./day-boundary-shifts.test.js";
import { runDayBoundaryV2Tests } from "./day-boundary-v2.test.js";
import { runFixedTimeBoundaryTests } from "./fixed-time-boundary.test.js";
import { runGroupingTests } from "./grouping.test.js";

const tests = [];

function run(name, fn) {
  tests.push({ name, fn });
}

runFixedTimeBoundaryTests(run);
runDailyBoundaryTests(run);
runGroupingTests(run);
runDayBoundaryV2Tests(run);
runDayBoundaryShiftTests(run);

let passed = 0;

for (const { name, fn } of tests) {
  try {
    await fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error.stack || error);
    process.exitCode = 1;
  }
}

if (process.exitCode) {
  console.error(`\n${passed}/${tests.length} tests passed.`);
} else {
  console.log(`\n${passed}/${tests.length} tests passed.`);
}
