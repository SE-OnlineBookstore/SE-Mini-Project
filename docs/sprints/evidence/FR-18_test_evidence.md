# FR-18 Order tracking, cancel and return - Test Evidence

- Issue: #18
- Sprint: Sprint 2 (26-30 Oct 2026)
- Assignee / Tester: G H Pramod (PES1UG24CS162)
- Date: 27 Oct 2026
- Test case: TC-O-06 (Order lifecycle tracking, cancel before dispatch, return within 7 days of delivery)
- System test case: STC-09 (Invoice e-mailed; order tracked; cancellation window enforced)

## How it was tested
Commands run in the `server` folder:
```bash
npm run lint
npx jest --runInBand tests/unit/orderTracking.test.js tests/api/orderTracking.api.test.js
npm run test:coverage
```
Command run in the `client` folder:
```bash
npm run build
```

## Result
- Lint: 0 errors
- Unit Test Suite: 1 passed (13/13 tests passed in `orderTracking.test.js`)
- API Test Suite: 1 passed (10/10 tests passed in `orderTracking.api.test.js`)
- Full Test Suite: All suites passing, 0 failed
- Statements Coverage for `orderService.js`: > 85% (exceeds NFR-06 70% threshold)
- Client Production Build: PASS (0 errors)

## Acceptance criteria check
- **Order lifecycle exposed to buyer with timestamps:** PASS (Order state history records each status transition `PLACED`, `CONFIRMED`, `PACKED`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `RETURNED` with ISO UTC timestamps, rendered to buyer in IST).
- **Shipment tracking details:** PASS (Courier name, consignment tracking number, and dispatch timestamp displayed upon seller dispatch).
- **Cancellation allowed before dispatch:** PASS (Buyer can cancel order while in `PLACED`, `CONFIRMED`, or `PACKED` state; order and line items transition to `CANCELLED`).
- **Stock restored on cancel:** PASS (Inventory count `stock_qty` on each affected listing is incremented atomically; listings in `OUT_OF_STOCK` reactivate to `ACTIVE`).
- **Cancellation refused after dispatch:** PASS (Attempts to cancel `SHIPPED` or `DELIVERED` orders return HTTP 400 `CANNOT_CANCEL_DISPATCHED_ORDER`).
- **Return allowed within 7 days of delivery:** PASS (Buyer holding a `DELIVERED` order can submit a return request if within 7 calendar days; order transitions to `RETURNED`).
- **Return refused after 7-day window:** PASS (Attempts to return after 7 days from delivery timestamp return HTTP 400 `RETURN_WINDOW_EXPIRED`).
- **Return refused before delivery:** PASS (Attempts to return orders not yet `DELIVERED` return HTTP 400 `ORDER_NOT_DELIVERED`).
- **Security & Authorization (SR-06):** PASS (Object-level ownership checks reject cross-buyer access to tracking, cancel, and return with HTTP 404).
- **TC-O-06 passes:** PASS (All unit and API integration tests for TC-O-06 pass with 100% success rate).

## Deviations
None.
