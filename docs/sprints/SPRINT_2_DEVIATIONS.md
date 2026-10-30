# Sprint 2 Deviations (26-30 Oct 2026)

Group 2 - Online Bookstore.

## 1. NFR-01: Search performance testing

- The Test Plan specified k6 for TC-N-01. Autocannon was used instead.
- The load test ran against a local API server and a shared MongoDB Atlas free cluster, rather than a dedicated production deployment.
- The global rate limiter was disabled using `NODE_ENV=test` because simulated users shared one IP address. The initial run with the limiter enabled returned mostly HTTP 429 responses and was discarded.
- The cold-cache test after the search optimisation reported p97.5 latency of 166 ms at 200 concurrent users. The slowest requests were observed immediately after startup.
- The five-minute cache expiry was not separately load-tested, and the database query plan was not re-checked during this run.

These limitations are recorded in `docs/sprints/evidence/NFR-01_test_evidence.md`.

## 2. NFR-02: Availability monitoring

- UptimeRobot was configured to poll the deployed health endpoint every five minutes.
- The evidence captured on 29 October 2026 showed the service Up, with 2h 27m of monitor history and no recorded incidents at that time.
- This capture does not establish 99% availability over the complete evaluation window.
- The full monitoring report is still required before the SLA can be marked as verified.

**Status:** IN PROGRESS.

Evidence: `docs/sprints/evidence/NFR-02_test_evidence.md`.

## 3. NFR-07: Cross-browser compatibility

The following deviations were recorded and approved in the pull request:

- The Safari application was not tested because no Apple device was available. Playwright WebKit was used to check the Safari rendering engine instead.
- Only the latest installed version of each browser was tested, not the latest two versions required by the SRS.
- Manual main-flow testing was performed in Chrome, Edge and Firefox. WebKit testing covered the public pages.

The automated checks passed 40 of 40 page and viewport combinations. These limitations remain part of the verification record.

Evidence: `docs/sprints/evidence/NFR-07_test_evidence.md`.

## 4. NFR-08: Audit-log verification scope

- The available NFR-08 evidence covers access-denial event logging and querying through the audit service.
- The evidence explicitly notes that the listed tests do not independently establish every append-only property.
- Sprint 2 moderation tests also verify that moderation actions create audit records containing the actor and reason.

This is recorded as a verification limitation. The evidence should not be interpreted as proving properties that were not directly tested.

Evidence:
- `docs/sprints/evidence/NFR-08_test_evidence.md`
- `server/tests/api/moderation.api.test.js`

## 5. Overall note

These deviations document differences between the planned verification approach and the tests actually performed. Requirement statuses in `docs/sprints/RTM.md` should be interpreted together with their corresponding evidence files.
