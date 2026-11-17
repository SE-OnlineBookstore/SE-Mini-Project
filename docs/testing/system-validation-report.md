# System Validation Report

## 1. Objective

To verify that the Online Bookstore system satisfies the functional and non-functional requirements documented in SRS v1.1.

System validation is mapped through the Requirement Traceability Matrix (RTM), which connects requirements to system test cases, implementation components and supporting test evidence.

## 2. System Under Test

- Project: Online Bookstore
- Repository: SE-OnlineBookstore/SE-Mini-Project
- Architecture: MERN stack
- Backend testing framework: Jest
- API testing library: Supertest
- Frontend: React

## 3. Validation Approach

System validation used:
- Automated API tests
- Automated unit and service tests supporting requirement verification
- Non-functional performance tests
- Checkout usability checks
- Cross-browser compatibility checks
- Deployment health monitoring
- Security-related automated checks and documented manual checks

## 4. Functional Requirement Validation

The following requirements are recorded as PASS in docs/sprints/RTM.md:

| Requirement | Description | RTM Status |
|---|---|---|
| FR-01 to FR-06 | Registration, authentication and access control | PASS |
| FR-07 to FR-12 | Catalogue, search, filtering and reviews | PASS |
| FR-13 to FR-18 | Cart, wishlist, checkout, payments and order lifecycle | PASS |
| FR-19 | Seller listing creation | PASS |
| FR-20 | Seller stock and price management | PASS |
| FR-21 | Seller order fulfilment | PASS |
| FR-22 | Seller sales dashboard | PASS |
| FR-23 | Administrator moderation | PASS |
| FR-24 | Monthly analytics export | PASS |

Supporting evidence is maintained in docs/sprints/evidence/.

## 5. Non-Functional Requirement Validation

| Requirement | Validation | RTM Status |
|---|---|---|
| NFR-01 | Search performance under concurrent users | PASS |
| NFR-02 | Availability monitoring and 99% SLA | IN PROGRESS |
| NFR-03 | Password hashing using bcrypt | PASS |
| NFR-04 | Checkout usability and accessibility | CLOSED (PASS) |
| NFR-05 | Atomic stock decrement and prevention of overselling | PASS |
| NFR-06 | Automated code quality gate | PASS |
| NFR-07 | Cross-browser compatibility | PASS, with documented limitations |
| NFR-08 | Append-only audit logging | PASS, with documented verification scope |

## 6. Automated Test Execution

The recorded full-suite Jest execution produced:

| Metric | Result |
|---|---:|
| Test suites passed | 30 |
| Tests passed | 233 |
| Failed test suites | 0 |
| Failed tests | 0 |

Separate test executions:

- Unit tests: 13 suites, 89 tests passed.
- API tests: 17 suites, 144 tests passed.

## 7. Non-Functional Validation Evidence

### Search Performance (NFR-01)

- Tool: Autocannon
- Concurrent users: 200
- Successful requests: 29,707
- Failed requests: 0
- p97.5 latency: 166 ms

The recorded test result satisfies the stated latency target for that test run.

### Checkout Usability (NFR-04)

The evidence records:
- Checkout completed in three screens.
- Responsive layout checked at 360 px.
- Automated usability checks: 4/4 passed.
- Keyboard accessibility and contrast checks documented.

### Concurrency (NFR-05)

The evidence records:
- Three out of three concurrency checks passed.
- Concurrent attempts to purchase the last available copy did not result in overselling.

### Cross-Browser Compatibility (NFR-07)

The evidence records 40/40 automated page and viewport combinations passing.

Limitations:
- Safari was represented using Playwright WebKit.
- Only the latest installed browser versions were tested.
- Manual main-flow testing was performed in Chrome, Edge and Firefox.

## 8. Outstanding Validation

### NFR-02: Availability

UptimeRobot was configured to monitor the staging health endpoint at five-minute intervals.

The available evidence confirms that monitoring was active and the endpoint was Up at the recorded capture time.

However, the complete evaluation-window report is still required to establish the 99% availability target.

Status: IN PROGRESS.

### Other Manual Checks

The following manual activities are listed in docs/testing/manual-cases.md:

- TC-N-02: Full-window uptime report export.
- TC-N-04: Manual checkout walkthrough and accessibility validation.
- TC-N-07: Edge and Safari validation.
- TC-SEC-02: TLS and HSTS validation.
- TC-SEC-03: Sensitive test-card data inspection.
- TC-SEC-05: Token-tampering and IDOR checks.
- TC-SEC-06: OWASP ZAP active scan.
- TC-SEC-10: Security checklist and dependency/history scans.

Their final outcomes must be recorded using the corresponding test evidence before being declared complete.

## 9. Deviations and Limitations

The documented sprint deviations include:

- Autocannon was used instead of the planned k6 for search performance testing.
- Tests used a MongoDB Atlas free cluster rather than a local or in-memory database.
- NFR-02 availability verification remains pending.
- Playwright WebKit was used instead of testing Safari on an Apple device.
- Some audit-log properties require further verification.

Refer to:
- docs/sprints/SPRINT_1_DEVIATIONS.md
- docs/sprints/SPRINT_2_DEVIATIONS.md

## 10. Conclusion

The recorded automated test execution completed with 30 test suites and 233 tests passing.

The RTM records the functional requirements as PASS and most non-functional requirements as PASS, subject to their documented limitations.

NFR-02 remains IN PROGRESS until the complete availability evaluation report is available.

The system validation results should therefore be interpreted together with the RTM, sprint evidence files and documented deviations.
