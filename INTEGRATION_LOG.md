# Integration Log (Week 10)

Downstream partner: **Strathmore Cafeteria** calls our `/medicines` and `/pharmacies` with the key we issued them (stored in their `server/.env`, called from their server).

| # | What broke (symptom) | Root cause | Fix | Whose code, who fixed it |
| :-- | :--- | :--- | :--- | :--- |
| 1 | Cafeteria's calls to `/medicines` got 404 | We served `/api/stock/search` instead of the contract paths | Implemented `/medicines` and `/pharmacies` as in `openapi.yaml` (Week 6) | Ours, fixed by us |
| 2 | Cafeteria showed blank prices | They read `price`; our contract says `unitPrice` | They changed their mapping; our contract was already clear | Theirs, fixed by them |
| 3 | Cafeteria asked for a reservation endpoint | Not in our contract | Logged as a feature request, not built | Contract gap |

What our terminal showed while they tested: their 401s when they ran with a wrong key, then 200s with the right key; no 429s at 100/minute.

Our upstream partner: _fill in the team whose API we consume, and the bugs from that integration._
