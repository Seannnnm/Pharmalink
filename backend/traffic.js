// traffic.js: sends a mix of requests to the API, to give /stats some data.
// Run: API=http://localhost:5000 KEY=<your-key> node traffic.js     (N=200 for more)
const API = process.env.API || 'http://localhost:5000';
const KEY = process.env.KEY;
const N = Number(process.env.N || 60);

const mix = [
  { method: 'GET', path: '/medicines', key: true },
  { method: 'GET', path: '/medicines?q=amox', key: true },
  { method: 'GET', path: '/medicines/1', key: true },
  { method: 'GET', path: '/medicines/999', key: true }, // no such id
  { method: 'GET', path: '/pharmacies', key: true },
  { method: 'GET', path: '/pharmacies/2', key: true },
  { method: 'GET', path: '/medicines', key: false }, // no key at all
  { method: 'GET', path: '/not-a-route', key: true } // no such path
];

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  const counts = {};
  for (let i = 0; i < N; i++) {
    const r = mix[Math.floor(Math.random() * mix.length)];
    try {
      const res = await fetch(API + r.path, { method: r.method, headers: r.key ? { 'X-API-Key': KEY } : {} });
      counts[res.status] = (counts[res.status] || 0) + 1;
    } catch (err) {
      counts.failed = (counts.failed || 0) + 1;
    }
    await pause(50);
  }
  console.log('Status codes received:', counts);
})();
