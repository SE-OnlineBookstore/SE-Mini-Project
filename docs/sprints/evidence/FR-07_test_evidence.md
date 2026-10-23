# FR-07 Paged catalogue - verification (Sprint 1)

Date: 19 Oct 2026. Owner: Deeptha S. Issue: #7. Test Plan: TC-C-01.

Command (MongoDB Atlas test cluster):
    npx jest --runInBand tests/api/catalogue.api.test.js

Result: PASS, 6 tests, 0 failed.

| Test case | Requirement | Result |
|---|---|---|
| TC-C-01 returns 20 per page with the required fields and the lowest active price | FR-07 | Pass |
| TC-C-02 keyword search finds, ranks and suggests a category | FR-08 | Pass |
| TC-C-02 repeated query served from cache | FR-08 / NFR-01 | Pass |
| TC-C-03 filters and sorting combine correctly | FR-09 | Pass |
| TC-C-04 only ACTIVE offers, cheapest first | FR-10 | Pass |
| TC-C-06 related titles | FR-12 | Pass |

Acceptance criteria (issue #7): 20 titles per page with correct total; lowest active price shown. Both met.
Manual check: http://localhost:5173 shows 20 books per page with prices.
