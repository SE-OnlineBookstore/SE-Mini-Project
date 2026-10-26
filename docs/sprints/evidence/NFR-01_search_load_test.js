const autocannon = require('autocannon');
const fs = require('fs');

const outFile = process.argv[2];
const words = ['garden', 'monsoon', 'compilers', 'hidden', 'golden', 'essential', 'midnight', 'narayan', 'lahiri', 'volume'];

autocannon({
  url: 'http://localhost:5000',
  connections: 200,
  duration: 30,
  requests: [{
    method: 'GET',
    setupRequest: (req) => {
      const w = words[Math.floor(Math.random() * words.length)];
      const p = 1 + Math.floor(Math.random() * 20);
      req.path = '/api/v1/books?q=' + w + '&page=' + p;
      return req;
    },
  }],
}, (err, r) => {
  if (err) { console.error(err); process.exit(1); }
  const bad = r.non2xx + r.errors + r.timeouts;
  const pass = r.latency.p97_5 < 2000 && bad === 0;
  const md = [
    '# NFR-01 Search performance - Test Evidence',
    '',
    '- Issue: #25',
    '- Sprint: 2',
    '- Assignee / Tester: Deeptha S (PES1UG24CS144)',
    '- Date: ' + new Date().toISOString().slice(0, 10),
    '- Test case: TC-N-01 (search p95 under 2 s)',
    '',
    '## How it was tested',
    'Tool: autocannon. 200 concurrent connections for 30 seconds against GET /api/v1/books?q=<keyword>&page=<1-20>,',
    'using 10 different keywords. The server ran on localhost and used the MongoDB Atlas free cluster.',
    'Autocannon reports p97.5 instead of p95. If p97.5 is under 2 s, then p95 is also under 2 s.',
    'Repeated queries can be served from the in-server cache (TC-C-02).',
    '',
    '## Results',
    '| Measure | Value |',
    '|---|---|',
    '| Total requests | ' + r.requests.total + ' |',
    '| Requests per second (average) | ' + r.requests.average + ' |',
    '| Successful (2xx) | ' + r['2xx'] + ' |',
    '| Non-2xx | ' + r.non2xx + ' |',
    '| Errors | ' + r.errors + ' |',
    '| Timeouts | ' + r.timeouts + ' |',
    '| Latency p50 (ms) | ' + r.latency.p50 + ' |',
    '| Latency p97.5 (ms) | ' + r.latency.p97_5 + ' |',
    '| Latency p99 (ms) | ' + r.latency.p99 + ' |',
    '| Latency max (ms) | ' + r.latency.max + ' |',
    '',
    '## Result',
    pass ? 'PASS: p97.5 is under 2000 ms, so p95 is under 2 s, with no failed requests.' : 'FAIL: see the numbers above.',
    '',
    '## Deviations',
    pass ? 'None.' : 'To be explained.',
    '',
  ].join('\n');
  if (outFile) fs.writeFileSync(outFile, md);
  console.log(md);
});
