# Contract Deviations

Changes made to `openapi.yaml` (now version 1.1.0) while implementing the API in Weeks 5 and 6. Each row says what the Week 4 contract said, what the API does now, and why. Every row is reflected in `openapi.yaml`.

## Week 6

| # | Endpoint | Week 4 contract | Now | Why |
| :-- | :--- | :--- | :--- | :--- |
| 1 | All | The backend served `/api/stock/search`, `/api/inventory` and `/api/pharmacies`, not the contract paths | `/medicines`, `/medicines/{id}`, `/pharmacies` and `/pharmacies/{id}` are implemented exactly as named in the contract. The `/api/...` routes stay, but only for our own website | Our partner builds against the contract, so the contract paths have to exist |
| 2 | All | No error responses or error body defined | Every error is `{ "message": "..." }` with 400, 404 or 409 | A consumer needs to tell failure from success without guessing |
| 3 | GET responses | 200 had a description only, no schema | `Medicine` and `Pharmacy` schemas with types, required fields and examples | The response shape was undefined |
| 4 | `/medicines/{id}`, `/pharmacies/{id}` | `id` was a string | `id` is a positive integer. Anything else (for example `abc`) gets 400 | Our ids are database integers |
| 5 | GET /medicines | Only `q` | Added optional `area`, `pharmacyId` and `inStock` filters | Lets the cafeteria app show stock at one pharmacy, or only items in stock |
| 6 | POST /medicines | No `pharmacyId` | `pharmacyId` is required and must be an existing pharmacy, otherwise 400 | A stock line always belongs to a pharmacy; without it the row cannot be stored |
| 7 | POST /medicines | `name`, `category` were only "string"; `stockLevel` only "integer"; `unitPrice` only "number" | `name` 1 to 120 characters and `category` 1 to 60 (after trimming spaces); `stockLevel` a whole number from 0 to 100000; `unitPrice` above 0, at most 1000000, at most 2 decimal places | An empty name or a negative stock is present but not usable |
| 8 | POST /medicines | 201 had no body | 201 returns the created `Medicine` and a `Location` header | The client can use the new record without another request |
| 9 | POST /medicines | Nothing said about duplicates | 409 if that pharmacy already lists a medicine with the same name (case-insensitive) | Two stock lines for the same medicine at one pharmacy would give two different stock levels |
| 10 | PUT /medicines/{id} | Not in the contract | Added. Replaces name, category, stockLevel and unitPrice; 200, or 404 if the id does not exist (it never creates) | Pharmacies need to correct stock after a delivery or sale. A PUT sets absolute values, so it is idempotent |
| 11 | DELETE /medicines/{id} | Not in the contract | Added. 204 with no body, or 404 if the id does not exist | A pharmacy that stops stocking a medicine needs to remove it |
| 12 | Medicine schema | No `status` | `status` is `in_stock`, `low_stock` (1 to 9) or `out_of_stock` (0), worked out from `stockLevel` | The cafeteria app needs to block checkout when stock is depleted (API_NEEDS.md, need 4) |
| 13 | Pharmacy schema | Undefined | `id, name, area, distance, eta, latitude, longitude, verified`. The password hash is never returned | The map page needs coordinates; nothing else in the table is the consumer's business |

Validation always runs before the database is touched. For PUT and DELETE the id and body are checked first, then the record is looked up.
