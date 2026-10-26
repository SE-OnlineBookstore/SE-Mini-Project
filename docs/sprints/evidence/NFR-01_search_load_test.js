const autocannon = require('autocannon');
const fs = require('fs');

const outFile = process.argv[2];
const levels = [200, 50, 20];
const words = ['garden', 'monsoon', 'compilers', 'hidden', 'golden', 'essential', 'midnight', 'narayan', 'lahiri', 'volume'];

function run(connections) {
  return new Promise((resolve, reject) => {
    autocannon({
      url: 'http://localhost:5000',
      connections,
      duration: 20,
      requests: [{
        method: 'GET',
        setupRequest: (req) => {
          const w = words[Math.floor(Math.random() * words.length)];
          const p = 1 + Math.floor(Math.random() * 20);
          req.path = '/api/v1/books?q=' + w + '&page=' + p;
          return req;
        },
      }],
    }, (err, r) => (err ? reject(err) : resolve({ connections, r })));
  });
}

async function main() {
  const rows = [];
  for (const c of levels) {
    console.log('Running with ' + c + ' concurrent connections for 20 s...');
    rows.push(await run(c));
  }
  const isOk = ({ r }) => r.latency.p97_5 < 2000 && (r.non2xx + r.errors + r.timeouts) === 0;
  const tableRows = rows.map(({ connections, r }) => '| ' + [
    connections, r.requests.total, r['2xx'], r.non2xx + r.errors + r.timeouts,
    r.latency.p50, r.latency.p97_5, r.latency.p99, r.latency.max, isOk({ r }) ? 'Yes' : 'No',
  ].join(' | ') + ' |');
  const pass200 = isOk(rows[0]);
  const okLevels = rows.filter(isOk).map((x) => x.connections);
  const md = [
    '# NFR-01 Search performance - Test Evidence',
    '',
    '- Issue: #25',
    '- Sprint: 2',
    '- Assignee / Tester: Deeptha S (PES1UG24CS144)',
    '- Date: ' + new Date().toISOString().slice(0, 10),
    '- Test case: TC-N-01 (search p95 under 2 s with 200 users)',
    '',
    '## How it was tested',
    'Tool: autocannon. Each load level ran for 20 seconds against GET /api/v1/books?q=<keyword>&page=<1-20>, using 10 different keywords.',
    'The API server ran on the same laptop as the load tool and used the MongoDB Atlas free (shared) cluster over the internet.',
    'Autocannon reports p97.5 instead of p95. If p97.5 is under 2 s, then p95 is also under 2 s.',
    'Repeated queries can be served from the in-server cache (TC-C-02).',
    '',
    '## Results',
    '| Concurrent users | Total requests | Successful (2xx) | Failed (non-2xx, errors, timeouts) | p50 (ms) | p97.5 (ms) | p99 (ms) | max (ms) | p97.5 under 2000 ms |',
    '|---|---|---|---|---|---|---|---|---|',
    ...tableRows,
    '',
    '## Result',
    pass200
      ? 'PASS: at 200 concurrent users p97.5 is under 2000 ms, so p95 is under 2 s, with no failed requests.'
      : 'NOT MET at 200 concurrent users (p97.5 = ' + rows[0].r.latency.p97_5 + ' ms, above 2000 ms). Target met at: ' + (okLevels.length ? okLevels.join(', ') : 'none of the tested levels') + ' concurrent users.',
    '',
    '## Notes',
    'The server global rate limiter (SR-10, 100 requests per minute per IP) was switched off for this test by starting the server with NODE_ENV=test, because simulated users from one machine share one IP address. A first run with the limiter on returned mostly HTTP 429 responses and was discarded.',
    'The load tool, the API server and the database connection all ran from one laptop against a shared free-tier database, so a dedicated deployment would be expected to perform better. This was not tested.',
    '',
    '## Deviations',
    pass200 ? 'None.' : 'The NFR-01 target (p95 under 2 s at 200 concurrent users) was not met in this test environment. It is recorded as a known limitation and reported in the Sprint 2 deviations.',
    '',
  ].join('\n');
  if (outFile) fs.writeFileSync(outFile, md);
  console.log(md);
}

main().catch((e) => { console.error(e); process.exit(1); });
