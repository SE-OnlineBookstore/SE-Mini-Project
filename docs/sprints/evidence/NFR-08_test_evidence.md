\# NFR-08 — Append-only Audit Log



\## Requirement

Audit records must be append-only, with no update or delete operations exposed by the audit service.



\## Requirement ID

NFR-08



\## Test Evidence

\- Test files:

&#x20; - `server/tests/unit/middleware.test.js`

&#x20; - `server/tests/api/auth.api.test.js`

\- Command: `npx jest --runInBand tests/unit/middleware.test.js tests/api/auth.api.test.js`

\- Result: 2 test suites passed; 19 tests passed.



\## Verified Behaviors

\- Unauthorized role access is rejected with HTTP 403.

\- Access-denial events are written to the audit service.

\- Audit records can be queried through the audit service.



Note: These test results verify the behaviors exercised by the listed tests; they do not independently establish every append-only property.



