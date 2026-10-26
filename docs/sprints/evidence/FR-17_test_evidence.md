# FR-17 PDF invoice - Test Evidence

- Issue: #17
- Sprint: Sprint 2 (26-30 Oct)
- Assignee / Tester: G H Pramod (PES1UG24CS162)
- Date: 26 Oct 2026
- Test case: TC-O-05 (PDF invoice generation, downloadable & e-mailed)
- System test case: STC-09 (Invoice e-mailed; order tracked; cancellation window enforced)

## How it was tested
Commands run in the `server` folder:
```bash
npm run lint
npx jest --runInBand tests/unit/invoiceService.test.js tests/api/invoice.api.test.js
npm run test:coverage
```
Command run in the `client` folder:
```bash
npm run build
```

## Result
- Lint: 0 errors
- Unit Test Suite: 1 passed (7/7 tests passed)
- API Test Suite: 1 passed (4/4 tests passed)
- Full Test Suite: 20 passed, 20 total suites (144 passed, 144 total tests)
- Statements Coverage for `invoiceService.js`: 95.33% (exceeds NFR-06 70% threshold)
- Client Production Build: PASS (0 errors)

## Acceptance criteria check
- **Invoice downloadable from the order page:** PASS (`GET /api/v1/orders/:id/invoice` streams PDF buffer with `Content-Type: application/pdf` and `Content-Disposition: attachment; filename="Invoice-...pdf"`; UI exposes "Download Invoice (PDF)" action for confirmed orders).
- **Invoice e-mailed to buyer:** PASS (Triggered upon payment confirmation via verified webhook in `paymentService.js`; `notificationService` records `ORDER_INVOICE` notification and delivers email with PDF invoice attachment to buyer).
- **Figures match the order:** PASS (Every line item carries unit price, quantity and line total; items subtotal, shipping fee, coupon discount and net grand total match the persistent order record exactly in paise and formatted INR).
- **Statutory tax summary included:** PASS (Tax summary block details HSN 4901 0% GST exempt rating for printed books, handling/shipping charges, CGST, SGST and total tax = Rs. 0.00).
- **Refusal of unconfirmed orders:** PASS (Orders in `PLACED` state return 400 `ORDER_NOT_CONFIRMED`).
- **Security & Authorization (SR-06):** PASS (Object-level ownership checks reject cross-buyer downloads with 403 `FORBIDDEN`; unauthenticated access rejected with 401 `UNAUTHORIZED`; administrators permitted to download for audit).
- **TC-O-05 passes:** PASS (All unit and integration tests for TC-O-05 pass with 100% success rate).

## Deviations
None.
