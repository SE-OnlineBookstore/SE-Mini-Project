# FR-16 Online payment (sandbox) - Test Evidence

- Issue: #16
- Sprint: 1 (19-23 Oct)
- Assignee / Tester: G H Pramod (PES1UG24CS162)
- Date: 23 Oct 2026
- Test case: TC-O-04 (online payment sandbox, attempts limit & HMAC signed webhook)

## How it was tested
Commands run in the `server` folder:
```bash
npm run lint
npx jest --runInBand tests/api/payment.api.test.js tests/unit/paymentSchema.test.js
npm run test:coverage
```

## Result
- Lint: 0 errors
- Test Suites: 15 passed, 15 total
- Tests: 109 passed, 109 total
- Payment tests: 17 passed (TC-O-04)
- Server Coverage: 88.47% Statements (exceeds NFR-06 70% threshold)

## Acceptance criteria check
- Payment intent creation: PASS
- Order confirmed only after a verified HMAC-SHA256 webhook: PASS
- Forged or missing webhook signature rejected with 401 INVALID_SIGNATURE: PASS
- Failed payment leaves order in PLACED state and does not decrement stock: PASS
- Maximum 3 payment attempts per order enforced (4th attempt returns 400 MAX_ATTEMPTS_EXCEEDED): PASS
- Atomic stock decrement upon successful payment: PASS
- Out-of-stock status updated when inventory drops to 0: PASS
- Idempotent duplicate webhook calls: PASS
- Sandbox payment simulation endpoint for test payments: PASS

## Deviations
None.
