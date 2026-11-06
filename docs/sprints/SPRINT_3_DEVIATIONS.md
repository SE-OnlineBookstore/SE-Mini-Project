# Sprint 3 deviations (2-6 Nov 2026)

## Scope
- Three items (S3-08 mark delivered, S3-09 My orders page, S3-10 profile and address book page) were added during the sprint, taking Sprint 3 from 19 to 25 story points.

## Testing
- TC-12 (administrator moderation and reporting) was executed through the API because the admin page was not merged at the time; the admin page was merged afterwards.
- TC-13 (search performance) ran with the per-IP rate limit and request logging off, with one repeated query (results largely cached), on a single machine.
- TC-14 (security): TLS could not be tested on localhost; HSTS and security headers were confirmed present.
- Coverage: services at 88.61 per cent statements (gate 70 per cent met). orderService.js is individually at 68.22 per cent and remains a known gap. The client has no automated tests; it is covered by system validation.

## Defects
- DEF-01: price above MRP was accepted on listing create; fixed in PR 87 and retested.
- DEF-02: Add to cart and Wishlist buttons needed sideways scrolling at 360 px; fixed in PR 91 and retested.

Evidence: `docs/testing/` (reports, Test Case Document v1.1, execution logs and screenshots).
