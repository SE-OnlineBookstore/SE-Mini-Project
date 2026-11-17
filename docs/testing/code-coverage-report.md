# Code Coverage Report

## 1. Objective

To measure how much of the server-side source code is executed by the automated test suite.

## 2. Testing Tool

- Framework: Jest
- Coverage provider: Jest coverage instrumentation
- Execution mode: Sequential (`--runInBand`)
- Command: `npx jest --runInBand --coverage --coverageReporters=json-summary`

## 3. Overall Coverage Results

| Metric | Covered | Total | Coverage |
|---|---:|---:|---:|
| Statements | 1,284 | 1,473 | 87.16% |
| Branches | 625 | 865 | 72.25% |
| Functions | 172 | 193 | 89.11% |
| Lines | 1,216 | 1,373 | 88.56% |

## 4. Coverage by Source Category

| Source Category | Statement Coverage | Branch Coverage | Function Coverage | Line Coverage |
|---|---:|---:|---:|---:|
| Middleware | 95.23% | 85.45% | 100% | 94.59% |
| Services | 86.81% | 71.30% | 89.30% | 88.26% |
| Utils | 82.97% | 73.68% | 82.60% | 86.84% |

## 5. Areas Requiring Additional Coverage

The coverage report identifies some source files with comparatively low coverage:

- `auditService.js`: 50% statement coverage and 0% branch coverage.
- `userService.js`: 65.95% statement coverage and 36.36% branch coverage.
- `orderService.js`: 68.22% statement coverage.
- `money.js`: 0% statement, function and line coverage.

These areas may be considered for additional tests in future iterations.

## 6. Test Execution Summary

- Test suites passed: 30
- Tests passed: 233
- Failed tests: 0
- Snapshots: 0
- Execution time: 85.827 seconds for the JSON-summary run.

## 7. Evidence

The generated Jest coverage summary is available at:

`server/coverage/coverage-summary.json`

The detailed HTML coverage report is available at:

`server/coverage/lcov-report/index.html`

## 8. Conclusion

The automated test suite achieved 87.16% statement coverage, 72.25% branch coverage, 89.11% function coverage and 88.56% line coverage. All 233 tests across 30 test suites passed during the recorded run.


