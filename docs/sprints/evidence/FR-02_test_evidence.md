\# FR-02 — E-mail OTP Verification



\## Requirement

Verify a user's email using a six-digit OTP.



\## Acceptance criteria

\- OTP expires after 10 minutes.

\- Three incorrect attempts invalidate the OTP.

\- Maximum three resends per hour.



\## Test evidence

\- Test file: `server/tests/api/auth.api.test.js`

\- OTP implementation: `server/services/otpService.js`

\- Test status: Authentication tests passed locally (12/12).



\## Implementation status

Existing OTP implementation and tests were verified locally. This document records test evidence; it does not introduce new OTP functionality.

