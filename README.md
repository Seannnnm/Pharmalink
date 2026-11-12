# PharmaLink API

PharmaLink tells you which pharmacies have a medicine in stock, how many units, and at what price. This API is for partner apps, such as the Strathmore Cafeteria ordering app, that need live medicine stock and pharmacy locations. It also powers our own website in `frontend/`.

- Docs site (every endpoint, request and response shape): open `docs/index.html` via GitHub Pages, or run the API and go to http://localhost:5000/docs
- Contract: `openapi.yaml` (copy for the docs site in `docs/openapi.yaml`; keep them the same)

## Run it locally (clean clone)

Needs Node.js 18+ and MySQL 8 (or MariaDB).

```bash
git clone https://github.com/Seannnnm/Pharmalink.git
cd Pharmalink/backend
cp .env.example .env          # then set DB_USER, DB_PASSWORD and API_KEYS
npm install
npm run init-db               # creates the "pharmalink" database with demo data
npm start                     # API on http://localhost:5000
```

Check it works:

```bash
curl -H "X-API-Key: <your-api-key>" "http://localhost:5000/medicines?q=paracetamol"
```

Run the tests (uses a separate `pharmalink_test` database): `npm test`

## Authentication

Every request except `/health` and `/docs` needs your team's key in the `X-API-Key` header. Ask us for a key privately; each consuming team gets its own. Never put a key in a repo, README or browser code.

```bash
curl -H "X-API-Key: <your-api-key>" http://localhost:5000/medicines
```

| Situation | Response |
| :--- | :--- |
| No key or wrong key | `401 { "message": "Missing or invalid API key" }` |
| More than 100 requests in one minute with one key | `429 { "message": "Too many requests", "retryAfter": 42 }` plus a `Retry-After: 42` header (seconds) |

Running it yourself: put your keys in `.env` as `API_KEYS=key1,key2` (see `.env.example`). Generate a key with `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`.

## Examples

**List medicines** — `GET /medicines?q=amox`

```
200
[
  { "id": 1, "name": "Amoxicillin", "category": "Antibiotic", "stockLevel": 24, "unitPrice": 180,
    "status": "in_stock", "pharmacyId": 1, "pharmacyName": "AfyaCare Pharmacy", "area": "Nairobi CBD",
    "updatedAt": "2026-11-12T05:07:11.000Z" },
  ...
]
```

Filters (all optional): `q` (name), `area`, `pharmacyId`, `inStock=true|false`. `status` is `out_of_stock` at 0, `low_stock` from 1 to 9, `in_stock` from 10.

**One medicine** — `GET /medicines/1` → `200` with one object like the above. `GET /medicines/9999` → `404 { "message": "Medicine 9999 not found" }`

**Add stock** — `POST /medicines`

```
body: { "name": "Cetirizine 10mg", "category": "Allergy", "stockLevel": 15, "unitPrice": 80, "pharmacyId": 2 }
201  Location: /medicines/12
     { "id": 12, "name": "Cetirizine 10mg", ..., "status": "in_stock", "pharmacyName": "Westlands MedPoint" }
```

**Change stock** — `PUT /medicines/12` with `{ "name": "Cetirizine 10mg", "category": "Allergy", "stockLevel": 3, "unitPrice": 85 }` → `200` and the updated object.

**Remove stock** — `DELETE /medicines/12` → `204` (no body)

**Pharmacies** — `GET /pharmacies` → `200` list; `GET /pharmacies/1` →

```
{ "id": 1, "name": "AfyaCare Pharmacy", "area": "Nairobi CBD", "distance": "0.7 km", "eta": "7 min",
  "latitude": -1.2864, "longitude": 36.8172, "verified": true }
```

## Monitoring: GET /stats

Needs a key like every other route. Counts reset when the server restarts.

```bash
curl -H "X-API-Key: <your-api-key>" http://localhost:5000/stats
```
```
{ "startedAt": "2026-11-12T05:19:18.119Z", "uptimeSeconds": 73, "total": 181, "clientErrors": 74, "serverErrors": 0,
  "errorRatePercent": 0, "avgMs": 1.7,
  "routes": { "GET /medicines/:id": { "count": 40, "clientErrors": 21, "serverErrors": 0, "avgMs": 1.6, "maxMs": 3.2 }, ... } }
```

Every request is also logged as one JSON line (no keys, no query strings). To keep a log: `node server.js | tee requests.log` (`*.log` is git-ignored). Generate test traffic: `API=http://localhost:5000 KEY=<your-api-key> node traffic.js`.

## Errors

Every error has the same body: `{ "message": "<what went wrong>" }`

| Status | When | Example |
| :--- | :--- | :--- |
| 400 | Missing field, wrong type, bad value, bad id, invalid JSON | `{ "message": "stockLevel must be an integer" }` |
| 401 | Missing or invalid `X-API-Key` | `{ "message": "Missing or invalid API key" }` |
| 404 | No record with that id, or unknown path | `{ "message": "Medicine 9999 not found" }` |
| 409 | That pharmacy already lists the medicine | `{ "message": "Pharmacy 2 already lists Cetirizine 10mg. Use PUT /medicines/{id} to change it." }` |
| 429 | Rate limit hit | `{ "message": "Too many requests", "retryAfter": 42 }` |
| 500 | Our bug | `{ "message": "Server error" }` |

## Website (frontend/)

```bash
cd frontend
npm install
npm run dev     # http://localhost:5173, talks to the API at http://localhost:5000/api
```

Seeded pharmacies (AfyaCare Pharmacy, Westlands MedPoint, ...) log in with password `demo1234`. The `/api/...` routes are only for this website; partners use the routes above.

## Course files

`CONTRACT_DEVIATIONS.md`, `WEEK6_WRITE_CHECKS.md`, `PARTNER_TEST_RESULTS.md`, `BLIND_TEST_REPORT.md`, `SECURITY_AUDIT.md`, `INTEGRATION_LOG.md`, `RESILIENCE_NOTES.md`, `MONITORING_NOTES.md`
