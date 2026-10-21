# Sprint 1 Test Report

- Date: 2026-10-21
- Tester: Koushik
- Repository: SE-OnlineBookstore/SE-Mini-Project
- Tested commit: 7b79c69d3887e337d1a0c6a3305d68a85efacace
- Test command: `cd server && npx jest --runInBand tests/api/auth.api.test.js`
- Result: PASS
- Test suites: 1 passed, 1 total
- Tests: 12 passed, 12 total
- Failures: 0

## Coverage observed

- TC-A-01: Buyer and seller registration
- TC-A-02: E-mail OTP verification
- TC-A-03: Login, refresh-token rotation, and logout
- TC-A-04: Password recovery
- TC-A-06: Role-based access control

## Evidence

Terminal screenshot showing the successful authentication test run is retained separately.

## Notes

The test suite passed against the existing implementation. No application code was changed as part of this test run.
