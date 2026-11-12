# Week 6: write endpoint checks

Run against a freshly seeded database (`npm run init-db`, then `npm start` in `backend/`). Each block is the request, then the status code and body that came back.

## Valid requests

```
curl -X POST http://localhost:5000/medicines -H 'Content-Type: application/json' -d '{"name":"Cetirizine 10mg","category":"Allergy","stockLevel":15,"unitPrice":80,"pharmacyId":2}'
201 {"id":12,"name":"Cetirizine 10mg","category":"Allergy","stockLevel":15,"unitPrice":80,"status":"in_stock","pharmacyId":2,"pharmacyName":"Westlands MedPoint","area":"Westlands","updatedAt":"2026-11-12T05:08:51.000Z"}
```

Re-fetch to confirm it was stored:

```
curl -X GET http://localhost:5000/medicines/12
200 {"id":12,"name":"Cetirizine 10mg","category":"Allergy","stockLevel":15,"unitPrice":80,"status":"in_stock","pharmacyId":2,"pharmacyName":"Westlands MedPoint","area":"Westlands","updatedAt":"2026-11-12T05:08:51.000Z"}
```

```
curl -X PUT http://localhost:5000/medicines/12 -H 'Content-Type: application/json' -d '{"name":"Cetirizine 10mg","category":"Allergy","stockLevel":3,"unitPrice":85}'
200 {"id":12,"name":"Cetirizine 10mg","category":"Allergy","stockLevel":3,"unitPrice":85,"status":"low_stock","pharmacyId":2,"pharmacyName":"Westlands MedPoint","area":"Westlands","updatedAt":"2026-11-12T05:08:51.000Z"}
```

Same PUT again gives the same end state:

```
curl -X PUT http://localhost:5000/medicines/12 -H 'Content-Type: application/json' -d '{"name":"Cetirizine 10mg","category":"Allergy","stockLevel":3,"unitPrice":85}'
200 {"id":12,"name":"Cetirizine 10mg","category":"Allergy","stockLevel":3,"unitPrice":85,"status":"low_stock","pharmacyId":2,"pharmacyName":"Westlands MedPoint","area":"Westlands","updatedAt":"2026-11-12T05:08:51.000Z"}
```

```
curl -X DELETE http://localhost:5000/medicines/12
204 
```

Re-fetch to confirm it is gone:

```
curl -X GET http://localhost:5000/medicines/12
404 {"message":"Medicine 12 not found"}
```

## Invalid requests (must not change anything)

```
curl -X POST http://localhost:5000/medicines -H 'Content-Type: application/json' -d '{"category":"Allergy"}'
400 {"message":"name, stockLevel, unitPrice, pharmacyId are required"}
```

```
curl -X POST http://localhost:5000/medicines -H 'Content-Type: application/json' -d '{"name":"Cetirizine","category":"Allergy","stockLevel":"15","unitPrice":80,"pharmacyId":2}'
400 {"message":"stockLevel must be an integer"}
```

```
curl -X POST http://localhost:5000/medicines -H 'Content-Type: application/json' -d '{"name":"   ","category":"Allergy","stockLevel":1,"unitPrice":80,"pharmacyId":2}'
400 {"message":"name must not be empty"}
```

```
curl -X POST http://localhost:5000/medicines -H 'Content-Type: application/json' -d '{"name":"Cetirizine","category":"Allergy","stockLevel":-4,"unitPrice":80,"pharmacyId":2}'
400 {"message":"stockLevel must be between 0 and 100000"}
```

```
curl -X POST http://localhost:5000/medicines -H 'Content-Type: application/json' -d '{"name":"Cetirizine","category":"Allergy","stockLevel":4,"unitPrice":0,"pharmacyId":2}'
400 {"message":"unitPrice must be greater than 0 and at most 1000000"}
```

```
curl -X POST http://localhost:5000/medicines -H 'Content-Type: application/json' -d '{"name":"Cetirizine","category":"Allergy","stockLevel":4,"unitPrice":80,"pharmacyId":99}'
400 {"message":"pharmacyId 99 does not match a registered pharmacy"}
```

```
curl -X POST http://localhost:5000/medicines -H 'Content-Type: application/json' -d '{"name":"Amoxicillin","category":"Antibiotic","stockLevel":4,"unitPrice":80,"pharmacyId":1}'
409 {"message":"Pharmacy 1 already lists Amoxicillin. Use PUT /medicines/{id} to change it."}
```

```
curl -X POST http://localhost:5000/medicines -H 'Content-Type: application/json' -d '{not json'
400 {"message":"Request body is not valid JSON"}
```

```
curl -X PUT http://localhost:5000/medicines/999 -H 'Content-Type: application/json' -d '{"name":"Z","category":"Allergy","stockLevel":3,"unitPrice":85}'
404 {"message":"Medicine 999 not found"}
```

```
curl -X PUT http://localhost:5000/medicines/1 -H 'Content-Type: application/json' -d '{"name":"Amoxicillin"}'
400 {"message":"category, stockLevel, unitPrice are required"}
```

```
curl -X PUT http://localhost:5000/medicines/abc -H 'Content-Type: application/json' -d '{"name":"Z","category":"Allergy","stockLevel":3,"unitPrice":85}'
400 {"message":"id must be a positive integer"}
```

```
curl -X DELETE http://localhost:5000/medicines/999
404 {"message":"Medicine 999 not found"}
```

After all the invalid requests, the list still has the 11 seeded rows:

```
curl http://localhost:5000/medicines
(response is an array of 11 medicines)
```
