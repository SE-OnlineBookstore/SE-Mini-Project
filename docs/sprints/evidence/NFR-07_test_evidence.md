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
PASS (with deviations approved by the Development Lead in the pull request): all 40 automated page checks passed in the latest installed Chrome, Edge, Firefox and the Safari engine (WebKit) at desktop and phone width, and the main flows worked by hand in Chrome, Edge and Firefox. The SRS also requires the latest two versions of each browser and the Safari application, which were not tested (see Deviations), so these are recorded as approved deviations and NFR-07 is marked PASS in the RTM.

## Deviations
- Safari application: not tested. Safari only runs on macOS and iOS and no Apple device was available to the team. The Safari rendering engine (WebKit) was tested through Playwright, which is evidence for rendering but is not the same as testing the Safari app.
- Previous versions: only the latest installed version of each browser (listed under How it was tested) was tested, not the latest two versions required by the SRS.
- Manual main flows: checked in Chrome, Edge and Firefox only. The WebKit run covers the public pages only.
- These deviations were approved by the Development Lead in the pull request conversation.

## How to run the automated check
The script is docs/sprints/evidence/NFR-07_browser_check.js.
1. Install Playwright in a folder outside the repository: npm i playwright, then npx playwright install firefox webkit. Chrome and Edge must be installed on the machine.
2. Start the server (npm run dev in server) and the client (npm run dev in client). The script expects the client on http://localhost:5173 and the server on http://localhost:5000; set WEB_URL and API_URL to change this.
3. From the repository root run: NODE_PATH=$HOME/perf/node_modules node docs/sprints/evidence/NFR-07_browser_check.js .
   (use the folder where Playwright was installed in place of $HOME/perf)
The script writes the automated part of this file and the screenshots in docs/sprints/evidence/NFR-07/. Running it again overwrites this file, so the manual section and deviations above would have to be added again.
