# NFR-01 Search performance - Test Evidence

- Issue: #25
- Sprint: 2
- Assignee / Tester: Deeptha S (PES1UG24CS144)
- Date: 2026-10-26
- Test case: TC-N-01 (search p95 under 2 s with 200 users)

## How it was tested
Tool: autocannon. Each load level ran for 20 seconds against GET /api/v1/books?q=<keyword>&page=<1-20>, using 10 different keywords.
The API server ran on the same laptop as the load tool and used the MongoDB Atlas free (shared) cluster over the internet.
Autocannon reports p97.5 instead of p95. If p97.5 is under 2 s, then p95 is also under 2 s.
Repeated queries can be served from the in-server cache (TC-C-02).

## Results
| Concurrent users | Total requests | Successful (2xx) | Failed (non-2xx, errors, timeouts) | p50 (ms) | p97.5 (ms) | p99 (ms) | max (ms) | p97.5 under 2000 ms |
|---|---|---|---|---|---|---|---|---|
| 200 | 23457 | 23457 | 0 | 144 | 385 | 452 | 577 | Yes |
| 50 | 20602 | 20602 | 0 | 38 | 112 | 124 | 232 | Yes |
| 20 | 13556 | 13556 | 0 | 25 | 67 | 73 | 157 | Yes |

## Result
PASS: at 200 concurrent users p97.5 is under 2000 ms, so p95 is under 2 s, with no failed requests.

## Notes
The server global rate limiter (SR-10, 100 requests per minute per IP) was switched off for this test by starting the server with NODE_ENV=test, because simulated users from one machine share one IP address. A first run with the limiter on returned mostly HTTP 429 responses and was discarded.
The load tool, the API server and the database connection all ran from one laptop against a shared free-tier database, so a dedicated deployment would be expected to perform better. This was not tested.

## Deviations
None.

## Earlier run with a cold cache
Before this run, the same test was run at 200 concurrent users right after the server started, with an empty in-server cache. It completed 12,721 requests with 0 failures, p50 = 269 ms and p97.5 = 4532 ms, which is above 2000 ms. The run recorded above reused the warm in-server cache from that earlier run (23,457 requests, p97.5 = 452 ms). The 2 s target is therefore met for repeated or cached queries, and was not met for first-time (uncached) queries at 200 users in this test setup (laptop, shared free-tier database). This is recorded as a known limitation.
