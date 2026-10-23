# FR-10 Book detail with all seller offers - Test Evidence

- Issue: #10
- Sprint: 1
- Assignee / Tester: Deeptha S (PES1UG24CS144)
- Date: 21 Oct 2026
- Test case: TC-C-04 (only ACTIVE offers, cheapest first)

## How it was tested
Command run in the server folder:
npx jest --runInBand tests/api/catalogue.api.test.js

## Result
Test Suites: 1 passed
Tests: 6 passed

## Acceptance criteria check
- Book detail shows full metadata: PASS
- Only ACTIVE offers are listed: PASS
- Offers are ordered cheapest first, with condition, seller name and stock: PASS
- Unknown book returns 404 BOOK_NOT_FOUND: PASS

## Deviations
None.
