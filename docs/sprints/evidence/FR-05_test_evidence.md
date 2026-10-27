\# FR-05 — Profile and Address Book



\## Requirement

Allow a signed-in user to view and edit their profile and manage delivery addresses.



\## Requirement ID

FR-05



\## Test Case ID

TC-A-05



\## Test Evidence

\- Test file: `server/tests/api/user.api.test.js`

\- Command: `npx jest --runInBand tests/api/user.api.test.js`

\- Result: 5 tests passed.



\## Verified Behaviors

\- Exactly one default address is maintained.

\- The first address is automatically set as default.

\- Invalid PIN codes are rejected.

\- The last address cannot be deleted while an order is in flight.

\- A buyer cannot access another buyer's address.

\- Unauthorized role changes are refused.

