# S3-09 Test Evidence - My Orders Page

**Requirement:** S3-09 - My orders page (supports FR-17, FR-18)  
**Issue:** #80  
**Sprint:** Sprint 3 (2-6 Nov 2026)  
**Owner:** G H Pramod (PES1UG24CS162)  
**Verification date:** 2026-11-06  

## Summary of Implementation

- **Page Component:** Created `client/src/pages/Orders.jsx` displaying the authenticated buyer's order history using `GET /api/v1/orders`.
- **Navigation:** Added `Orders` navigation link for `BUYER` accounts in `client/src/components/Header.jsx`.
- **Routing:** Registered `/orders` and `/my-orders` routes in `client/src/App.jsx`.
- **API Tests:** Added comprehensive automated tests in `server/tests/api/orders.api.test.js`.

## Test Execution

Test suites and verification commands:
```bash
# Server API tests and linting
npm run lint
npm test -- server/tests/api/orders.api.test.js

# Client build verification
npm run build
```

## Acceptance Criteria Verification

- **Order Listing Retrieval:** PASS (`GET /api/v1/orders` returns only orders belonging to the authenticated buyer).
- **Chronological Sorting:** PASS (Orders are sorted in descending order of creation time, newest first).
- **Required Fields Displayed:** PASS (Each order includes order number, order date, order status, total amount, shipping fee, discount, and destination city).
- **Direct Navigation to Details:** PASS (Order numbers and action buttons link directly to `/orders/:id` for full lifecycle tracking, invoice download, cancellations, and returns).
- **User Isolation:** PASS (Orders belonging to other buyers are strictly excluded).
- **Authentication Guard:** PASS (Unauthenticated requests to the API return HTTP 401; unauthenticated page visitors are prompted to sign in).
- **Role-Based Guard:** PASS (SELLER and ADMIN roles are rejected with HTTP 403 on API and shown appropriate restriction notice on page).
- **Empty State:** PASS (Buyers without any orders receive an empty list with a helpful prompt and link to browse the catalogue).
- **Code Quality:** PASS (Client build succeeds without errors, and server lint checks pass).

## Result

- `client` build: PASS
- `orders.api.test.js`: PASS (5 passing tests, 0 failures)
- Lint check: PASS (0 errors)
