# Requirement Traceability Matrix (RTM)

This matrix maps SRS v1.1 requirements to architecture components, design specifications, code implementations, test suites, and system verification cases as specified in SRS Appendix C and SAD Section 3.8.

## Sprint 2 Status Update

| Sl. No | Req ID | Brief Description of Requirement | Architecture Reference | Design Reference | Code File Reference | Test Case ID | System Test Case ID | Status | Owner |
|---|---|---|---|---|---|---|---|---|---|
| 1 | FR-01 | Buyer and seller registration with server-side validation | Auth & User Service | SAD 3.4, 4.2.1 | `server/routes/auth.routes.js`, `server/services/authService.js` | TC-A-01 | STC-01 | PASS | Koushik |
| 2 | FR-02 | E-mail OTP verification before activation | Auth Service, Notification | SAD 3.4, 4.2.1 | `server/services/otpService.js`, `server/models/Notification.js` | TC-A-02 | STC-01 | PASS | Koushik |
| 3 | FR-03 | Login and logout with access and refresh tokens | Auth & User Service | SAD 3.4, 4.2.1 | `server/middleware/verifyJWT.js`, `server/services/tokenService.js` | TC-A-03 | STC-02 | PASS | Koushik |
| 4 | FR-04 | Password recovery through a single-use reset link | Auth Service, Notification | SAD 4.3 | `server/services/authService.js` | TC-A-04 | STC-02 | PASS | Koushik |
| 5 | FR-05 | Profile and delivery address book maintenance | Auth & User Service | SAD 4.3 | `server/models/Address.js`, `server/services/userService.js` | TC-A-05 | STC-03 | PASS | Koushik |
| 6 | FR-06 | Role-based access control on every protected route | Auth Service middleware | SAD 3.9 | `server/middleware/authorizeRoles.js` | TC-A-06 | STC-03 | PASS | Koushik |
| 7 | FR-07 | Paged catalogue browsing (20 titles per page) | Catalogue Service | SAD 3.4, 4.3 | `server/services/catalogueService.js` | TC-C-01 | STC-04 | PASS | Deeptha |
| 8 | FR-08 | Keyword search with compound text index | Catalogue Service | SAD 3.4, 4.3 | `server/services/catalogueService.js` | TC-C-02 | STC-04 | PASS | Deeptha |
| 9 | FR-09 | Multi-facet filtering and sorting | Catalogue Service | SAD 3.4, 4.3 | `server/services/catalogueService.js` | TC-C-03 | STC-05 | PASS | Deeptha |
| 10 | FR-10 | Book detail with active offers and conditions | Catalogue Service | SAD 3.4, 4.3 | `server/services/catalogueService.js` | TC-C-04 | STC-05 | PASS | Deeptha |
| 11 | FR-11 | Verified-purchase rating and reviews | Catalogue Service | SAD 3.4, 4.3 | `server/services/reviewService.js` | TC-C-05 | STC-06 | PENDING | Deeptha |
| 12 | FR-12 | Related titles recommendations (author & category) | Catalogue Service | SAD 3.4, 4.3 | `server/services/catalogueService.js` | TC-C-06 | STC-06 | PASS | Deeptha |
| 13 | FR-13 | Shopping cart with quantity limits and persistence | Cart & Order Service | SAD 3.4, 5.3 | `server/services/cartService.js`, `client/src/pages/Cart.jsx` | TC-O-01 | STC-07 | PASS | Pramod |
| 14 | FR-14 | Wishlist with single-action move-to-cart | Cart & Order Service | SAD 3.4, 5.3 | `server/services/wishlistService.js` | TC-O-02 | STC-07 | PASS | Pramod |
| 15 | FR-15 | Checkout with address validation and optional coupon | Cart & Order Service | SAD 3.4, 5.3 | `server/services/checkoutService.js`, `orderService.js` | TC-O-03 | STC-08 | PASS | Pramod |
| 16 | FR-16 | Online payment sandbox, retry limit & signed HMAC webhook | Cart & Order Service | SAD 3.4, 4.2.2 | `server/services/paymentService.js`, `client/src/pages/OrderDetail.jsx` | TC-O-04 | STC-08 | PASS | Pramod |
| 17 | **FR-17** | **PDF invoice on confirmation, downloadable and e-mailed** | **Cart & Order Service, Notification** | **SAD 3.4, 3.8, 5.3** | `server/services/invoiceService.js`, `server/routes/order.routes.js`, `client/src/pages/OrderDetail.jsx`, `server/services/paymentService.js` | **TC-O-05** | **STC-09** | **CLOSED (PASS)** | **Pramod** |
| 18 | **FR-18** | **Order tracking, cancellation and return lifecycle** | **Cart & Order Service** | **SAD 3.4, 5.3** | `server/services/orderService.js`, `server/routes/order.routes.js`, `client/src/pages/OrderDetail.jsx` | **TC-O-06** | **STC-09** | **CLOSED (PASS)** | **Pramod** |
| 19 | FR-19 | Create listing from ISBN-13 with catalogue auto-fill | Seller & Admin Service | SAD 3.4, 4.3 | `server/services/listingService.js` | TC-S-01 | STC-10 | PASS | Hardhick |
| 20 | FR-20 | Stock and price management with low-stock alerts | Seller & Admin Service | SAD 3.4, 4.3 | `server/services/listingService.js` | TC-S-02 | STC-10 | PASS | Hardhick |
| 21 | FR-21 | Order fulfilment, packaging and courier dispatch | Seller & Admin Service | SAD 3.4, 4.3 | `server/services/fulfilmentService.js` | TC-S-03 | STC-11 | PASS | Hardhick |
| 22 | FR-22 | Seller sales dashboard with settlement summary | Seller & Admin Service | SAD 3.4, 4.3 | `server/services/sellerService.js` | TC-S-04 | STC-11 | PENDING | Hardhick |
| 23 | FR-23 | Administrator moderation and audit logging | Seller & Admin Service | SAD 3.4, 3.9 | `server/services/adminService.js` | TC-S-05 | STC-12 | PENDING | Hardhick |
| 24 | **FR-24** | **Monthly platform analytics export (CSV & PDF)** | **Seller & Admin Service** | **SAD 3.4, 4.3** | `server/services/analyticsService.js`, `server/controllers/analyticsController.js`, `server/routes/analytics.routes.js` | **TC-S-06** | **STC-12** | **PASS** | **Hardhick** |
| 25 | NFR-01 | Catalogue search performance (p95 < 2s under 200 users) | Catalogue + Redis | SAD 3.6, 3.8 | `server/services/catalogueService.js` | TC-N-01 | STC-13 | PASS | Deeptha |
| 26 | NFR-02 | Availability monitoring (99% SLA, 5-min health polling) | Deployment + Monitor | SAD 3.6, 3.8 | `server/routes/health.routes.js` | TC-N-02 | STC-13 | IN PROGRESS | Hardhick |
| 27 | NFR-03 | Password hashing with bcrypt at cost factor 12 | Auth Service | SAD 3.6, 3.9 | `server/services/authService.js` | TC-N-03 | STC-14 | PASS | Koushik |
| 28 | NFR-04 | Usability of checkout within 4 screens & 360px viewport | React Presentation Tier | SAD 3.4, 3.8 | `client/src/pages/Cart.jsx`, `OrderDetail.jsx` | TC-N-04 | STC-14 | PASS | Pramod |
| 29 | **NFR-05** | **Atomic stock decrement at confirmation (no overselling)** | **Cart & Order + MongoDB** | **SAD 3.7, 3.8** | `server/services/paymentService.js`, `server/tests/api/payment.api.test.js` | **TC-N-05** | **STC-15** | **CLOSED (PASS)** | **Pramod** |
| 30 | NFR-06 | Code quality gate (zero ESLint errors, >= 70% coverage) | CI / Quality Pipeline | SAD 3.6, 3.8 | `.github/workflows/ci.yml` | TC-N-06 | STC-15 | PASS | Hardhick |
| 31 | NFR-07 | Cross-browser compatibility (Chrome, Edge, Firefox, Safari) | React Presentation Tier | SAD 3.4, 3.8 | `client/vite.config.js` | TC-N-07 | STC-16 | PASS | Deeptha |
| 32 | NFR-08 | Append-only audit logging for admin and payment events | Audit Log Service | SAD 3.9, 4.1.1 | `server/services/auditService.js` | TC-N-08 | STC-16 | PASS | Koushik |

---

### Verification Summary for FR-17 (PDF Invoice)

- **Status:** CLOSED (PASS)
- **Unit Tests:** `server/tests/unit/invoiceService.test.js` (7 passed)
- **API Tests:** `server/tests/api/invoice.api.test.js` (4 passed)
- **Acceptance Criteria Verification:**
  - Automated test `TC-O-05` confirms invoice PDF generation, content validation, email delivery with attachment, and download endpoint.
  - Ownership isolation (SR-06) verified against cross-buyer attempts.
  - PDF layout satisfies SRS v1.1 section 5.3.3 including order number, buyer/delivery details, itemized line totals, shipping fee, discount, and statutory tax summary.

---

### Verification Summary for FR-18 (Order Tracking, Cancel and Return)

- **Status:** CLOSED (PASS)
- **Unit Tests:** `server/tests/unit/orderTracking.test.js` (13 passed)
- **API Tests:** `server/tests/api/orderTracking.api.test.js` (10 passed)
- **Acceptance Criteria Verification:**
  - Automated test `TC-O-06` confirms order lifecycle tracking (`PLACED`, `CONFIRMED`, `PACKED`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `RETURNED`) with timestamps and shipment consignment details.
  - Cancellation allowed before dispatch (`PLACED`, `CONFIRMED`, `PACKED`); stock is restored atomically to listings (NFR-05, BR-11).
  - Cancellation refused once dispatched (`SHIPPED`, `DELIVERED`) with HTTP 400 `CANNOT_CANCEL_DISPATCHED_ORDER`.
  - Return requests allowed within 7 days of delivery (`DELIVERED`); status transitions to `RETURNED`.
  - Return requests refused after 7-day window with HTTP 400 `RETURN_WINDOW_EXPIRED`, and refused prior to delivery with HTTP 400 `ORDER_NOT_DELIVERED`.
  - Object-level ownership (SR-06) verified: cross-buyer access returns HTTP 404.

### Verification Summary for FR-24 (Monthly Platform Analytics Export)

- **Status:** PASS
- **Unit Tests:** `server/tests/unit/analyticsService.test.js`
- **API Tests:** `server/tests/api/analytics.api.test.js`
- **Acceptance Criteria Verification:**
  - Automated tests verify monthly date filtering, analytics calculations, CSV formatting, PDF generation, download headers, and invalid month handling.
  - Access control verifies that unauthenticated requests are rejected and non-admin users cannot access the export endpoints.
  - Full test suite passed: 199 tests across 27 suites.
  - ESLint checks passed.

---

### Verification Summary for NFR-05 (No Overselling - Atomic Stock Decrement)

- **Status:** CLOSED (PASS)
- **API Tests:** `server/tests/api/payment.api.test.js` (9 passed, including concurrent race test `TC-N-05`), `server/tests/api/cart.api.test.js` (7 passed)
- **Check Script:** `docs/sprints/evidence/NFR-05_concurrency_check.js` (3/3 automated checks passed)
- **Acceptance Criteria Verification:**
  - Automated concurrency test confirms that when two concurrent orders attempt to confirm the last remaining copy of an inventory item (`stock_qty: 1`), exactly one order succeeds and transitions to `CONFIRMED`.
  - The second concurrent order fails stock reservation, remains in `PLACED` state, and initiates `REFUND_PENDING` without overselling.
  - Inventory quantity is guaranteed never to go below 0 (final `stock_qty: 0`, status transitioned to `OUT_OF_STOCK`).
  - Cancellation of unfulfilled orders restores inventory stock atomically (BR-11).
