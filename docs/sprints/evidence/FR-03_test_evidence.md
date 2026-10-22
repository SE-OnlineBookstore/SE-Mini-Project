\# FR-03 — Login, Logout and Token Refresh



\## Requirement

Users can log in, refresh their session tokens, and log out securely.



\## Test Evidence

\- Test file: `server/tests/api/auth.api.test.js`

\- Test command: `npx jest --runInBand tests/api/auth.api.test.js`

\- Result: 12 tests passed in the local authentication test run.



\## Verified Behaviors

\- Login issues access and refresh tokens.

\- Refresh rotates the refresh token.

\- Reuse of an old refresh token is detected.

\- Logout revokes the session token.

\- Incorrect credentials are handled securely.

