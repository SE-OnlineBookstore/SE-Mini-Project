# NFR-05 No Overselling (Atomic Stock Decrement) - Test Evidence

- **Issue:** #29
- **Sprint:** Sprint 2 (26-30 Oct)
- **Assignee / Tester:** G H Pramod (PES1UG24CS162)
- **Date:** 2026-10-30
- **Requirement:** NFR-05 (SRS v1.1 section 5.3.3, SAD 3.7 & 3.8)
- **Test case:** TC-N-05 (Two concurrent orders for the last copy: exactly one succeeds and stock never goes below 0)
- **System test case:** STC-15

---

## 1. Requirement & Acceptance Criteria

**Requirement (SRS v1.1, NFR-05):**
> Stock is decremented atomically at confirmation so that a listing cannot be oversold.

**Acceptance criteria:**
- Two concurrent orders for the last copy: exactly one succeeds and stock never goes below 0
- TC-N-05 passes

---

## 2. Technical Architecture & Implementation

To prevent overselling across concurrent checkout flows without heavy distributed locks:
1. **Atomic Conditional Update Guard:**
   Stock deduction occurs during payment webhook verification in `server/services/paymentService.js` using MongoDB's atomic document update:
   ```javascript
   const updatedListing = await Listing.findOneAndUpdate(
     { _id: item.listing_id, stock_qty: { $gte: item.quantity } },
     { $inc: { stock_qty: -item.quantity } },
     { new: true }
   );
   ```
2. **Race Condition Handling & Stock Guard:**
   - If `stock_qty >= item.quantity`, MongoDB executes the atomic `$inc` decrement and returns the updated listing document.
   - If concurrent buyers attempt to confirm orders for the same inventory, the first request atomically decrements `stock_qty` to `0` and transitions status to `OUT_OF_STOCK`.
   - The second concurrent request fails the `{ stock_qty: { $gte: item.quantity } }` filter and returns `null`.
3. **Rollback & Refund Initiation:**
   - If stock reservation fails for any item in the order, any items already decremented in that transaction are rolled back (`$inc: { stock_qty: quantity }`).
   - The failed order remains in `PLACED` state (never transitions to `CONFIRMED`).
   - Payment status is set to `REFUND_PENDING` with an audit record (`STOCK_EXHAUSTED`).
   - The response returns `{ status: 'error', code: 'INSUFFICIENT_STOCK' }`.
4. **Lifecycle Restoration (BR-11):**
   - If a confirmed or placed order is cancelled prior to shipment dispatch (`orderService.js`), inventory stock is restored atomically (`stock_qty += item.quantity`).

---

## 3. How It Was Tested

1. **Automated Concurrency Race Test (`TC-N-05`):**
   - Implemented in `server/tests/api/payment.api.test.js`:
     - Created a listing with `stock_qty: 1`.
     - Two distinct buyers (`buyer` and `otherBuyer`) created two placed orders (`order1` and `order2`) for that same single item.
     - Generated payment intents and valid HMAC-SHA256 signatures for both orders.
     - Dispatched webhook payment confirmation requests simultaneously using `Promise.all([ ... ])`.
     - Verified that exactly one order succeeded (`orderStatus: 'CONFIRMED'`, `paymentStatus: 'SUCCESS'`).
     - Verified that the second order failed confirmation (`orderStatus: 'PLACED'`, `paymentStatus: 'REFUND_PENDING'`, `code: 'INSUFFICIENT_STOCK'`).
     - Verified that the database record for `stock_qty` is exactly `0` (never went below 0) and status is `OUT_OF_STOCK`.
2. **Verification Check Script:**
   - Ran `node docs/sprints/evidence/NFR-05_concurrency_check.js` (all 3 automated checks passed).
3. **Full Test Suite & Code Quality:**
   - Ran `npx jest tests/api/payment.api.test.js` (9/9 passed).
   - Ran `npx jest tests/api/cart.api.test.js` (7/7 passed).
   - Ran `npm run lint` in `server` (0 errors).

---

## 4. Verification Check Script Output

```
Verifying NFR-05 No Overselling (Atomic Stock) in repository: SE-Mini-Project
┌─────────┬────────────────────────────────────────────────────────┬───────────────────────────────────────────────────────────────────────────────────────────────────┬─────────────────────────────────────────────────────────────────────────────────┬────────┐
│ (index) │ check                                                  │ criteria                                                                                          │ observed                                                                        │ status │
├─────────┼────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┼────────┤
│ 0       │ 'Atomic Conditional Stock Update in paymentService.js' │ 'Listing.findOneAndUpdate with stock_qty >= item.quantity, atomic decrement, rollback on failure' │ 'Atomic $gte query, rollback loop, and REFUND_PENDING status fully implemented' │ 'PASS' │
│ 1       │ 'Automated Concurrency Test Suite (TC-N-05)'           │ 'Promise.all concurrent webhook dispatch for last copy, exactly one success, stock never below 0' │ 'Comprehensive concurrent race test added to payment.api.test.js'               │ 'PASS' │
│ 2       │ 'Order Cancellation Stock Restoration (BR-11)'         │ 'Restores inventory stock atomically if order is cancelled prior to dispatch'                     │ 'Atomic stock restoration on cancellation implemented'                          │ 'PASS' │
└─────────┴────────────────────────────────────────────────────────┴───────────────────────────────────────────────────────────────────────────────────────────────────┴─────────────────────────────────────────────────────────────────────────────────┴────────┘

OVERALL TC-N-05 VERIFICATION: ALL CHECKS PASSED (PASS)
```

---

## 5. Result Summary

| Check Item | Acceptance Standard | Observed Result | Status |
|---|---|---|---|
| Concurrent Order Execution | 2 concurrent orders for last copy | Exactly 1 confirmed, 1 rejected with `INSUFFICIENT_STOCK` | **PASS** |
| Inventory Floor Guarantee | Stock never drops below 0 | Final `stock_qty` = 0; status = `OUT_OF_STOCK` | **PASS** |
| Payment API Test Suite | 100% pass | 9 / 9 tests passed (`payment.api.test.js`) | **PASS** |
| Cart API Test Suite | 100% pass | 7 / 7 tests passed (`cart.api.test.js`) | **PASS** |
| ESLint Code Quality Gate | 0 lint errors | Passed with 0 errors | **PASS** |

---

## 6. Deviations from Submitted Documents

None.
