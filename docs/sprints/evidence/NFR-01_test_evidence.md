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
PARTIAL: with a warm cache, at 200 concurrent users p97.5 is under 2000 ms, so p95 is under 2 s, with no failed requests. With an empty cache the target was not met (see Cold-cache run).

## Notes
The server global rate limiter (SR-10, 100 requests per minute per IP) was switched off for this test by starting the server with NODE_ENV=test, because simulated users from one machine share one IP address. A first run with the limiter on returned mostly HTTP 429 responses and was discarded.
The load tool, the API server and the database connection all ran from one laptop against a shared free-tier database, so a dedicated deployment would be expected to perform better. This was not tested.

## Cold-cache run
An earlier run with an empty cache measured p97.5 = 4532 ms at 200 users, which is above the 2 s target. The 2 s target is met only when repeated queries are served from the cache, so NFR-01 is met for warm-cache searches and is a known limitation for first-time (uncached) queries in this test setup.

## Cache and query plan
- The five-minute cache is implemented as `SEARCH_TTL_SEC = 300` in `server/services/catalogueService.js` (SRS NFR-01). Its expiry was not load-tested separately.
- The query plan (compound text index, no collection scan) was not re-checked in this run.

## Deviations
- The Test Plan (TC-N-01) names k6 as the load tool. This test used autocannon, which reports the same latency percentiles at 200, 50 and 20 concurrent connections.
- The reference load is 10,000 seeded listings. The test ran against 10000 seeded listings.
- The test ran against a local server with the global rate limiter off (NODE_ENV=test) and the shared MongoDB Atlas free cluster, not a production deployment.
- Uncached first-time queries did not meet the 2 s target (see Cold-cache run above).
