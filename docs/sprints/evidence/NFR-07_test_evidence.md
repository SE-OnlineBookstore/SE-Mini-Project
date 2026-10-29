# NFR-07 Cross-browser support - Test Evidence

- Issue: #31
- Sprint: 2
- Assignee / Tester: Deeptha S (PES1UG24CS144)
- Date: 2026-10-29
- Test case: TC-N-07 (main flows in Chrome, Edge, Firefox and Safari)

## How it was tested
Part 1 (automated): a Playwright script opened each public page in each browser at a desktop size (1280x800) and a phone size (360x740). A page passes when it renders content, has no browser console errors, has no failed requests and has no horizontal scrolling. Full-page screenshots are in docs/sprints/evidence/NFR-07/.
Two requests are expected and ignored: the 401 from /api/v1/auth/refresh (the session check, which correctly answers 401 for a visitor who is not logged in) and the browser's favicon request.
Browsers and versions used: Chrome 155.0.8059.85; Edge 156.0.4314.50; Firefox 157.0; WebKit (Safari engine) 27.2.

## Results: automated page checks
| Browser | Viewport | Page | Result | Notes |
|---|---|---|---|---|
| Chrome 155.0.8059.85 | Desktop 1280x800 | Catalogue | Pass |  |
| Chrome 155.0.8059.85 | Desktop 1280x800 | Book detail | Pass |  |
| Chrome 155.0.8059.85 | Desktop 1280x800 | Login | Pass |  |
| Chrome 155.0.8059.85 | Desktop 1280x800 | Register | Pass |  |
| Chrome 155.0.8059.85 | Desktop 1280x800 | Forgot password | Pass |  |
| Chrome 155.0.8059.85 | Phone 360x740 | Catalogue | Pass |  |
| Chrome 155.0.8059.85 | Phone 360x740 | Book detail | Pass |  |
| Chrome 155.0.8059.85 | Phone 360x740 | Login | Pass |  |
| Chrome 155.0.8059.85 | Phone 360x740 | Register | Pass |  |
| Chrome 155.0.8059.85 | Phone 360x740 | Forgot password | Pass |  |
| Edge 156.0.4314.50 | Desktop 1280x800 | Catalogue | Pass |  |
| Edge 156.0.4314.50 | Desktop 1280x800 | Book detail | Pass |  |
| Edge 156.0.4314.50 | Desktop 1280x800 | Login | Pass |  |
| Edge 156.0.4314.50 | Desktop 1280x800 | Register | Pass |  |
| Edge 156.0.4314.50 | Desktop 1280x800 | Forgot password | Pass |  |
| Edge 156.0.4314.50 | Phone 360x740 | Catalogue | Pass |  |
| Edge 156.0.4314.50 | Phone 360x740 | Book detail | Pass |  |
| Edge 156.0.4314.50 | Phone 360x740 | Login | Pass |  |
| Edge 156.0.4314.50 | Phone 360x740 | Register | Pass |  |
| Edge 156.0.4314.50 | Phone 360x740 | Forgot password | Pass |  |
| Firefox 157.0 | Desktop 1280x800 | Catalogue | Pass |  |
| Firefox 157.0 | Desktop 1280x800 | Book detail | Pass |  |
| Firefox 157.0 | Desktop 1280x800 | Login | Pass |  |
| Firefox 157.0 | Desktop 1280x800 | Register | Pass |  |
| Firefox 157.0 | Desktop 1280x800 | Forgot password | Pass |  |
| Firefox 157.0 | Phone 360x740 | Catalogue | Pass |  |
| Firefox 157.0 | Phone 360x740 | Book detail | Pass |  |
| Firefox 157.0 | Phone 360x740 | Login | Pass |  |
| Firefox 157.0 | Phone 360x740 | Register | Pass |  |
| Firefox 157.0 | Phone 360x740 | Forgot password | Pass |  |
| WebKit (Safari engine) 27.2 | Desktop 1280x800 | Catalogue | Pass |  |
| WebKit (Safari engine) 27.2 | Desktop 1280x800 | Book detail | Pass |  |
| WebKit (Safari engine) 27.2 | Desktop 1280x800 | Login | Pass |  |
| WebKit (Safari engine) 27.2 | Desktop 1280x800 | Register | Pass |  |
| WebKit (Safari engine) 27.2 | Desktop 1280x800 | Forgot password | Pass |  |
| WebKit (Safari engine) 27.2 | Phone 360x740 | Catalogue | Pass |  |
| WebKit (Safari engine) 27.2 | Phone 360x740 | Book detail | Pass |  |
| WebKit (Safari engine) 27.2 | Phone 360x740 | Login | Pass |  |
| WebKit (Safari engine) 27.2 | Phone 360x740 | Register | Pass |  |
| WebKit (Safari engine) 27.2 | Phone 360x740 | Forgot password | Pass |  |

Automated page checks: 40 of 40 passed.

## Layout issue found and fixed
The first automated run found horizontal scrolling at 360 px on the Book detail page in all four browsers: the Offers table was 425 px wide. It was fixed with a small CSS rule in client/src/styles.css so the table scrolls inside itself on small screens. The first run also flagged the 401 answer of the session check (/api/v1/auth/refresh), which is the correct answer for a visitor who is not logged in; it is now excluded from the check. After both changes the automated check passed on every page.

## Manual flow check (Chrome, Edge, Firefox)
Flows tried in each browser: browse and search the catalogue and change page; open a book detail page; log in and log out; add to cart and open checkout; open orders and an order detail page; seller dashboard as a seller.

| Browser | Result | Screenshot |
|---|---|---|
| Chrome | Pass | NFR-07/chrome_manual.png |
| Edge | Pass | NFR-07/edge_manual.png |
| Firefox | Pass | NFR-07/firefox_manual.png |

## Result
PASS: all automated page checks passed in Chrome, Edge, Firefox and the Safari engine (WebKit) at desktop and phone width, and the main flows worked in Chrome, Edge and Firefox.

## Deviations
- Safari is not available on Windows and no Mac or iPhone was available. The Safari engine (WebKit) was tested through Playwright instead, which checks rendering but is not the Safari app. Safari itself was not tested.
- Only the latest installed version of each browser was tested, not the latest two versions.
- The main flows were checked by hand in Chrome, Edge and Firefox; the WebKit run covers the public pages only.
