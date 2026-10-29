// NFR-07 cross-browser check (TC-N-07). Usage: node browser_check.js <repo-root>
const { chromium, firefox, webkit } = require('playwright');
const fs = require('fs');
const path = require('path');

const WEB = process.env.WEB_URL || 'http://localhost:5173';
const API = process.env.API_URL || 'http://localhost:5000';
const repo = process.argv[2];
if (!repo) { console.error('Usage: node browser_check.js <repo-root>'); process.exit(1); }
const evidenceDir = path.join(repo, 'docs', 'sprints', 'evidence');
const shotDir = path.join(evidenceDir, 'NFR-07');
fs.mkdirSync(shotDir, { recursive: true });

// A visitor who is not logged in gets 401 from the session check on every page, and Chromium asks for a favicon.
const isExpected = (status, url) => (status === 401 && /\/api\/v1\/auth\/refresh$/.test(url)) || /\/favicon\.ico$/.test(url);

const BROWSERS = [
  { id: 'chrome', name: 'Chrome', launch: () => chromium.launch({ channel: 'chrome' }) },
  { id: 'edge', name: 'Edge', launch: () => chromium.launch({ channel: 'msedge' }) },
  { id: 'firefox', name: 'Firefox', launch: () => firefox.launch() },
  { id: 'webkit', name: 'WebKit (Safari engine)', launch: () => webkit.launch() },
];
const VIEWPORTS = [
  { id: 'desktop', label: 'Desktop 1280x800', size: { width: 1280, height: 800 } },
  { id: 'phone', label: 'Phone 360x740', size: { width: 360, height: 740 } },
];

(async () => {
  const res = await fetch(`${API}/api/v1/books?page=1&limit=1`);
  const data = await res.json();
  const bookId = data.items && data.items[0] ? data.items[0].id : null;
  const PAGES = [
    { id: 'catalogue', url: '/', label: 'Catalogue' },
    ...(bookId ? [{ id: 'book', url: `/books/${bookId}`, label: 'Book detail' }] : []),
    { id: 'login', url: '/login', label: 'Login' },
    { id: 'register', url: '/register', label: 'Register' },
    { id: 'forgot', url: '/forgot-password', label: 'Forgot password' },
  ];

  const rows = [];
  const versions = [];
  let total = 0;
  let passed = 0;

  for (const b of BROWSERS) {
    let browser;
    try {
      browser = await b.launch();
    } catch (e) {
      rows.push(`| ${b.name} | - | - | not run | ${e.message.split('\n')[0]} |`);
      continue;
    }
    const version = browser.version();
    versions.push(`${b.name} ${version}`);
    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({ viewport: vp.size });
      for (const pg of PAGES) {
        const page = await ctx.newPage();
        const errors = [];
        const unexpected = [];
        page.on('console', (m) => {
          if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push(m.text());
        });
        page.on('pageerror', (e) => errors.push(String(e)));
        page.on('response', (r) => {
          if (r.status() >= 400 && !isExpected(r.status(), r.url())) unexpected.push(`${r.status()} ${r.url()}`);
        });
        let rendered = false;
        let noOverflow = true;
        let note = '';
        try {
          await page.goto(WEB + pg.url, { waitUntil: 'networkidle', timeout: 30000 });
          rendered = await page.evaluate(() => document.body.innerText.trim().length > 0);
          noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
          await page.screenshot({ path: path.join(shotDir, `${b.id}_${vp.id}_${pg.id}.png`), fullPage: true });
        } catch (e) {
          note = e.message.split('\n')[0];
        }
        const ok = rendered && noOverflow && errors.length === 0 && unexpected.length === 0 && !note;
        if (!rendered && !note) note = 'page is empty';
        if (!noOverflow) note += ' horizontal scrolling';
        if (errors.length) note += ` ${errors.length} console error(s): ${errors[0].slice(0, 80)}`;
        if (unexpected.length) note += ` failed request: ${unexpected[0].slice(0, 90)}`;
        total += 1;
        if (ok) passed += 1;
        rows.push(`| ${b.name} ${version} | ${vp.label} | ${pg.label} | ${ok ? 'Pass' : 'FAIL'} | ${note.trim()} |`);
        await page.close();
      }
      await ctx.close();
    }
    await browser.close();
  }

  const date = new Date().toISOString().slice(0, 10);
  const md = `# NFR-07 Cross-browser support - Test Evidence

- Issue: #31
- Sprint: 2
- Assignee / Tester: Deeptha S (PES1UG24CS144)
- Date: ${date}
- Test case: TC-N-07 (main flows in Chrome, Edge, Firefox and Safari)

## How it was tested
Part 1 (automated): a Playwright script opened each public page in each browser at a desktop size (1280x800) and a phone size (360x740). A page passes when it renders content, has no browser console errors, has no failed requests and has no horizontal scrolling. Full-page screenshots are in docs/sprints/evidence/NFR-07/.
Two requests are expected and ignored: the 401 from /api/v1/auth/refresh (the session check, which correctly answers 401 for a visitor who is not logged in) and the browser's favicon request.
Browsers and versions used: ${versions.join('; ')}.

## Results: automated page checks
| Browser | Viewport | Page | Result | Notes |
|---|---|---|---|---|
${rows.join('\n')}

Automated page checks: ${passed} of ${total} passed.
`;
  fs.writeFileSync(path.join(evidenceDir, 'NFR-07_test_evidence.md'), md, { encoding: 'utf8' });
  console.log(`Done: ${passed} of ${total} checks passed. Evidence written to docs/sprints/evidence/NFR-07_test_evidence.md`);
})().catch((e) => { console.error('Failed:', e.message); process.exit(1); });
