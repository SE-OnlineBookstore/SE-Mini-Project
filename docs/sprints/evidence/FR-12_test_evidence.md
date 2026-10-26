# FR-12 Related titles - Test Evidence

- Issue: #12
- Sprint: 2
- Assignee / Tester: Deeptha S (PES1UG24CS144)
- Date: 26 Oct 2026
- Test case: TC-C-06 (related titles)

## How it was tested
Command run in the server folder:
npx jest --runInBand tests/api/catalogue.api.test.js

## Result
Test Suites: 1 passed
Tests: 6 passed

## Acceptance criteria check
- Same-author titles come first, then same-category titles: PASS
- A book never appears in its own related list: PASS
- Unlisted titles are excluded: PASS
- At most six related titles are returned: PASS

## Deviations
None.
