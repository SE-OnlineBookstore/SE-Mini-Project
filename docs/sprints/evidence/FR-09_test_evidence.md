# FR-09 Filters and sorting - Test Evidence

- Issue: #9
- Sprint: 1
- Assignee / Tester: Deeptha S (PES1UG24CS144)
- Date: 20 Oct 2026
- Test case: TC-C-03 (filters combine correctly, price sort, min price above max price returns 400)

## How it was tested
Command run in the server folder:
npx jest --runInBand tests/api/catalogue.api.test.js

## Result
Test Suites: 1 passed
Tests: 6 passed

## Acceptance criteria check
- Filters by category, price range, condition, language and rating work together: PASS
- Sort by price, rating and recency: PASS
- Lowest matching offer used for price sort: PASS
- Min price above max price returns 400: PASS

## Deviations
None.
