# Sprint 1 Deviations Note and Module Report

**Module:** Orders, Checkout & Payment (FR-13 to FR-18, NFR-04, NFR-05)  
**Module Owner:** G H Pramod (PES1UG24CS162)  
**Team:** Group 2 (Online Bookstore, UE24CS341A)  
**Date:** 2026-10-19  
**Branch:** `feature/FR-13-cart`  

---

## 1. Executive Summary

In Sprint 1, Pramod was assigned product ownership of the buying journey:
- **Issue #13 (FR-13):** Shopping Cart (High Priority, 3 Points)
- **Issue #14 (FR-14):** Wishlist (Medium Priority, 2 Points)
- **Issue #15 (FR-15):** Checkout with Address & Coupon (High Priority, 5 Points)
- **Issue #16 (FR-16):** Online Payment Sandbox & HMAC Webhook (High Priority, 8 Points)

All core backend endpoints, business logic validations, data models, and automated test suites for **FR-13, FR-14, FR-15, and FR-16** have been successfully implemented and validated against the SRS v1.1 and SAD v1.0 specifications.

---

## 2. Completed Scope & Acceptance Verification

| Issue ID | Feature | Status | Automated Test Reference | Notes |
|---|---|---|---|---|
| **#13 (FR-13)** | Shopping Cart API | **DONE** | `TC-O-01` | Add to cart, view cart with populated metadata, update quantity (1–10 validation, stock check), remove item, cart persistence across buyer sessions, prevention of seller buying own listing (BR-02). |
| **#14 (FR-14)** | Wishlist API | **DONE** | `TC-O-02` | Save listing to wishlist, list items, remove item, single-action move-to-cart (adds to cart with quantity 1 and deletes from wishlist). |
| **#15 (FR-15)** | Checkout API & Order Preparation | **DONE** | `TC-O-03` | Price/stock revalidation at checkout, address validation, flat and percent coupon application, free shipping threshold (>= ₹500 / 50,000 paise), standard shipping below ₹500, order created in `PLACED` state with unique `OB-YYYYMMDD-XXXXX` format. |
| **#16 (FR-16)** | Sandbox Payment & Signed Webhook | **DONE** | `TC-O-04`, `TC-N-05` | Payment intent generation, max 3 payment attempts limit, HMAC-SHA256 signature verification with constant-time equality check, idempotent webhook handling, atomic stock decrement on success, order transition to `CONFIRMED`. |

---

## 3. Deviations & Deferred Work for Sprint 2

As per the sprint plan and project guidelines:
1. **Invoice Generation (FR-17, 3 points):**
   - *Status:* Scheduled for Sprint 2.
   - *Rationale:* Invoice generation requires rendering PDF documents (`pdfkit` or headless Chromium) using finalized seller GST details and tax rates. The database schema and order line freezing are ready.
2. **Order Lifecycle Tracking, Cancellation & Returns (FR-18, 5 points):**
   - *Status:* Scheduled for Sprint 2.
   - *Rationale:* Lifecycle tracking builds upon the seller dispatch and shipment pipeline (FR-21, owned by Hardhick). The `PLACED` and `CONFIRMED` states are fully wired. `PACKED`, `SHIPPED`, `DELIVERED`, `CANCELLED`, and `RETURNED` transitions will be integrated in Sprint 2 once seller dispatch routes are merged.
3. **Usability of Checkout UI (NFR-04, 2 points):**
   - *Status:* Frontend checkout UI page integration will be connected during Sprint 2 staging runs after backend API approval.

---

## 4. Security & Architecture Compliance

1. **SR-06 Data Isolation:** Every cart, wishlist, and order query is explicitly scoped to `req.user.id`. A buyer can never inspect or manipulate another user's cart or orders.
2. **BR-02 Marketplace Integrity:** A buyer attempting to add or checkout their own listing is rejected with `CANNOT_BUY_OWN_LISTING` (HTTP 400).
3. **NFR-05 No Overselling:** Stock decrement occurs atomically during webhook confirmation via MongoDB conditional update (`stock_qty: { $gte: item.quantity }`), eliminating race conditions between concurrent buyers.
4. **SR-08 / FR-16 Idempotent Payment:** Webhook calls check the unique `gateway_txn_ref` to ensure network retries do not confirm orders or decrement stock twice.
5. **SR-11 Secrets Handling:** `MONGO_URI_TEST` and `PAYMENT_WEBHOOK_SECRET` are kept in environment variables and never committed to version control.
