# FR-08 Keyword search - verification (Sprint 1)

Date: 19 Oct 2026. Owner: Deeptha S. Issue: #8. Test Plan: TC-C-02.

Command (MongoDB Atlas test cluster):
    npx jest --runInBand tests/api/catalogue.api.test.js

Result: PASS, 6 tests, 0 failed.

| Test case | Result |
|---|---|
| TC-C-02 finds by title, author, ISBN and publisher, ranks the best match first, suggests a category when empty | Pass |
| TC-C-02 serves a repeated query from cache | Pass |

Acceptance criteria (issue #8): results ranked by relevance; a no-match search shows a message and the nearest category. Both met.
Manual check: searched by title, author and ISBN on http://localhost:5173.
