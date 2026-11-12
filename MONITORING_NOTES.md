# Monitoring Notes (Week 12)

## Predictions (written before any data)
1. Slowest endpoint: `GET /medicines`, because it joins two tables and returns every stock line, while the others return one row.
2. Most errors: `GET /medicines/{id}`, because consumers guess or reuse ids that have been deleted.

## How the data was collected
`monitoring.js` logs one JSON line per request (time, method, path without query string, status, ms, caller as a hashed `key-xxxxxx` label) and keeps totals for `GET /stats`. `monitor` runs before the key check, so 401s and 429s are logged too. Traffic: `traffic.js` run twice at the same time with two different keys (our team's and our partner's), plus requests with no key. `grep -c <key> requests.log` printed 0 for every key.

Sample log lines:
```
{"time":"...","method":"GET","path":"...","status":200,"ms":...,"caller":"key-309c3b"}
{"time":"...","method":"GET","path":"...","status":401,"ms":0.8,"caller":"none"}
```

`/stats` after the run:
```json
{
  "startedAt": "2026-11-12T05:19:18.119Z",
  "uptimeSeconds": 73,
  "total": 181,
  "clientErrors": 74,
  "serverErrors": 0,
  "errorRatePercent": 0,
  "avgMs": 1.7,
  "routes": {
    "GET /medicines/": {
      "count": 42,
      "clientErrors": 0,
      "serverErrors": 0,
      "avgMs": 3.2,
      "maxMs": 40.6
    },
    "GET /pharmacies/:id": {
      "count": 21,
      "clientErrors": 0,
      "serverErrors": 0,
      "avgMs": 1.7,
      "maxMs": 4.1
    },
    "GET (no route)": {
      "count": 53,
      "clientErrors": 53,
      "serverErrors": 0,
      "avgMs": 0.7,
      "maxMs": 2.9
    },
    "GET /pharmacies/": {
      "count": 25,
      "clientErrors": 0,
      "serverErrors": 0,
      "avgMs": 1.7,
      "maxMs": 4.4
    },
    "GET /medicines/:id": {
      "count": 40,
      "clientErrors": 21,
      "serverErrors": 0,
      "avgMs": 1.6,
      "maxMs": 3.2
    }
  }
}
```

## Predicted vs actual
Slowest on average: `GET /medicines/` (3.2 ms), as predicted. Most errors: `GET /medicines/:id` (21 of 40), as predicted, though all were 4xx (caller mistakes), not our fault.

## One real pattern
`GET /medicines/` (the full list) was the slowest on average at 3.2 ms with a worst case of 40.6 ms, about twice the single-record routes (1.6–1.7 ms). `GET /medicines/:id` answered 40 calls and 21 of them were 404s, all from the id 999 in the traffic mix. The `(no route)` row holds 53 rejected requests: the requests sent with no key (401, caller `none`) plus `/not-a-route` (404). No 5xx at all, so the error rate is 0%.

## Why, and what I would check next
The list query joins `inventory` with `pharmacies` and sorts; the 40 ms worst case was the first request after start-up (cold MySQL connection). Next I would load a few thousand rows and see whether the average grows with the row count, and run `EXPLAIN` on the query to check it uses an index.

## One production alert
Alert on a 5xx error rate above 2% for 5 minutes on `/medicines`. When it fires, someone checks the database first (every 5xx here so far would be MySQL). Meanwhile the cafeteria app is already showing its saved copy with the 'saved data' banner (their Week 11 fallback), so students are not stuck.

_Replace the numbers with your own run in the lab (with your ring partner's traffic) if they differ._
