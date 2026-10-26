# NFR-01 Search performance - Test Evidence

- Issue: #25
- Sprint: 2
- Assignee / Tester: Deeptha S (PES1UG24CS144)
- Date: 2026-10-26
- Test case: TC-N-01 (search p95 under 2 s)

## How it was tested
Tool: autocannon. 200 concurrent connections for 30 seconds against GET /api/v1/books?q=<keyword>&page=<1-20>,
using 10 different keywords. The server ran on localhost and used the MongoDB Atlas free cluster.
Autocannon reports p97.5 instead of p95. If p97.5 is under 2 s, then p95 is also under 2 s.
Repeated queries can be served from the in-server cache (TC-C-02).

## Results
| Measure | Value |
|---|---|
| Total requests | 41086 |
| Requests per second (average) | 1369.7 |
| Successful (2xx) | 98 |
| Non-2xx | 40988 |
| Errors | 2 |
| Timeouts | 2 |
| Latency p50 (ms) | 78 |
| Latency p97.5 (ms) | 607 |
| Latency p99 (ms) | 772 |
| Latency max (ms) | 8577 |

## Result
FAIL: see the numbers above.

## Deviations
To be explained.
