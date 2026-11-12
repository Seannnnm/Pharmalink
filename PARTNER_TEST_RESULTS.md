# Partner Test Results (Week 7)

## Our own suite
`cd backend && npm test` runs 77 jest + supertest tests in `backend/__tests__/` against a separate `pharmalink_test` database that is reset from the seed data before each test. They cover every partner endpoint (happy path, validation failures, 404s, edge cases such as empty results and stock level 0) and the website's `/api` routes. All pass.

## Strathmore Cafeteria's tests against our API
The cafeteria team wrote 16 tests from our contract alone and ran them against our running server: **16 of 16 passed**.

| Finding | Type | Outcome |
| :--- | :--- | :--- |
| Before Week 6 the contract paths (`/medicines`, `/pharmacies`) did not exist; the server only had `/api/...` routes | Real bug: implementation did not match our own contract | Fixed in Week 6 |
| Contract said `id` was a string; our ids are integers | Contract ambiguity | Contract now says integer (CONTRACT_DEVIATIONS.md row 4) |
| Contract gave no response schema, so a consumer could not know field names | Contract ambiguity | Schemas added in v1.1.0 |

## Our tests against the cafeteria API
_Fill in after running tests written from their contract against their server._
