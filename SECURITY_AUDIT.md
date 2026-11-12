# Security Audit (Week 9)

## Keys
- Consumers: Strathmore Cafeteria team (one key) and our own team for testing (one key). Each has its own key, so one can be revoked without breaking the other.
- Keys live in `backend/.env` as `API_KEYS=...`. `.env` is in `.gitignore`; `.env.example` has placeholders only. The server prints how many keys it loaded, never the keys.
- `/medicines` and `/pharmacies` (every partner route, reads and writes) need `X-API-Key`. Open on purpose: `/health` (returns only `{"status":"ok"}`) and `/docs` (the contract we already publish).

Proof against the running server:
```
no key: 401
wrong key: 401
real key: 200
```

## Rate limit
100 requests per minute per key (in memory). The cafeteria app calls us a few times per page load; 100 a minute leaves room for a busy lunch hour but stops a runaway loop within a minute. Demo with the limit set to 3, five requests:
```
200 200 200 429 429
Retry-After: 60
{"message":"Too many requests","retryAfter":60}
```
Then set back to 100. Limits: resets when the server restarts, and is not shared between several server copies.

## Self-audit

| Checked | Found | Fixed |
| :--- | :--- | :--- |
| Sensitive fields in responses | `/pharmacies` is built from an explicit field list; `password_hash` is never returned (checked by a test). Login response has no hash | Nothing to fix |
| Other people's data by changing an id | Stock and pharmacy data is meant to be public to consumers. On the website routes, `PATCH /api/inventory/{id}` trusts the `pharmacy_id` in the body, so anyone could edit another pharmacy's stock | **Not fixed yet.** Needs a login session token for pharmacies; our top follow-up |
| Error messages | The 500 handler returned `detail: error.message`, which can show SQL, table and column names | Fixed: 500 now returns only `{ "message": "Server error" }` (test added) |
| Extra fields on writes (`id`, `verified`) | Validation copies only named fields, so extras are ignored (test added) | Nothing to fix |
| Keys in the wrong place | None in the repo, git history, README or logs | Nothing to fix |
| Website routes (`/api/...`) | No partner key, because the public website calls them from the browser, where a key would be readable by anyone. Now rate limited per IP | Partly, see the `PATCH /api/inventory` row |

Tests: `backend/__tests__/security.test.js` covers 401 with no key, 401 with a wrong key, 200 with a valid key, 429 with Retry-After, and the 500 message. Whole suite: 85 passed.
