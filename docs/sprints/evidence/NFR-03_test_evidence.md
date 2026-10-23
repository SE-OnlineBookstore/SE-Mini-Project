\# NFR-03 — Password Storage Security



\## Requirement

Passwords must be stored using bcrypt with a cost factor of 12.



\## Test Evidence

\- Test file: `server/tests/api/auth.api.test.js`

\- Test command: `npx jest --runInBand tests/api/auth.api.test.js`

\- Result: 12 tests passed in the local authentication test run.



\## Verified Behavior

\- Registration stores a bcrypt cost-12 password hash.

\- Duplicate email registration is rejected.



Note: This document records existing implementation and test results; it does not introduce new password-hashing functionality.



