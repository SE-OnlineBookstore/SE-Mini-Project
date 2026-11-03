# S3-02 Test Evidence - Seller Orders API

**Requirement:** S3-02 - Seller orders API (supports FR-21)
**Issue:** #73
**Sprint:** Sprint 3 (2-6 Nov 2026)
**Owner:** G H Pramod (PES1UG24CS162)
**Verification date:** 2026-11-03

## Test execution

Test file:
- `server/tests/api/sellerOrders.api.test.js`

Commands:
```bash
npm run lint
npm test -- server/tests/api/sellerOrders.api.test.js
```

## Acceptance criteria check

- **Seller order items retrieval:** PASS (`GET /api/v1/seller/orders` returns only order items belonging to the authenticated seller).
- **Required fields present:** PASS (Each returned item includes `id`, `orderNo` / `orderNumber`, `title`, `quantity`, and `itemStatus` / `status`).
- **Status filtering:** PASS (Optional `?status=<status>` query parameter filters results by item state, e.g. `PLACED`, `CONFIRMED`, `SHIPPED`, `DELIVERED`).
- **Case-insensitive status query:** PASS (Supports both uppercase and lowercase filter values, e.g., `?status=shipped`).
- **Isolation across sellers:** PASS (Items belonging to other sellers are never exposed to the requester).
- **Authentication enforcement:** PASS (Unauthenticated requests are rejected with HTTP 401).
- **Role-based authorization:** PASS (Requests from buyers and administrators are rejected with HTTP 403).
- **Empty list handling:** PASS (Sellers with no order items receive an empty list with HTTP 200).

## Result

- `sellerOrders.api.test.js`: PASS (6 passing tests, 0 failures)
- Lint check: PASS (0 errors)
