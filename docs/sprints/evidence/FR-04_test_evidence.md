\# FR-04 — Password Recovery



\## Requirement

Provide a single-use password reset link valid for 30 minutes and invalidate all refresh tokens after password change.



\## Requirement ID

FR-04



\## Test Case ID

TC-A-04



\## Test Evidence

\- Test file: `server/tests/api/auth.api.test.js`

\- Command: `npx jest --runInBand tests/api/auth.api.test.js -t "password recovery"`

\- Result: 2 tests passed.



\## Verified Behaviors

\- Same response for known and unknown email addresses.

\- Password reset can be completed only once.

\- Expired reset links are rejected.

\- Outstanding tokens and sessions are invalidated after reset.

