import { makeTestApp, withKey } from "../test-support/testApp.js";

let app;
let pool;
let resetDb;

beforeAll(async () => {
  ({ app, pool, resetDb } = await makeTestApp());
});
beforeEach(() => resetDb());
afterAll(() => pool.end());

const MEDICINE_FIELDS = ["area", "category", "id", "name", "pharmacyId", "pharmacyName", "status", "stockLevel", "unitPrice", "updatedAt"];

function expectMedicineShape(m) {
  expect(Object.keys(m).sort()).toEqual(MEDICINE_FIELDS);
  expect(Number.isInteger(m.id)).toBe(true);
  expect(typeof m.name).toBe("string");
  expect(typeof m.category).toBe("string");
  expect(Number.isInteger(m.stockLevel)).toBe(true);
  expect(typeof m.unitPrice).toBe("number");
  expect(["in_stock", "low_stock", "out_of_stock"]).toContain(m.status);
  expect(Number.isInteger(m.pharmacyId)).toBe(true);
  expect(typeof m.pharmacyName).toBe("string");
  expect(Number.isNaN(Date.parse(m.updatedAt))).toBe(false);
}

const newMedicine = (overrides = {}) => ({
  name: "Cetirizine 10mg",
  category: "Allergy",
  stockLevel: 15,
  unitPrice: 80,
  pharmacyId: 2,
  ...overrides
});

describe("GET /medicines", () => {
  it("returns 200 and every seeded stock line in the contract shape", async () => {
    const res = await withKey(app).get("/medicines");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(11);
    res.body.forEach(expectMedicineShape);
  });

  it("filters by name with q, case-insensitively", async () => {
    const res = await withKey(app).get("/medicines?q=AMOX");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    expect(res.body.every((m) => m.name === "Amoxicillin")).toBe(true);
  });

  it("sorts by stock level, highest first", async () => {
    const res = await withKey(app).get("/medicines?q=amox");
    expect(res.body.map((m) => m.stockLevel)).toEqual([24, 8, 0]);
  });

  it("works out status from the stock level", async () => {
    const res = await withKey(app).get("/medicines?q=amox");
    expect(res.body.map((m) => m.status)).toEqual(["in_stock", "low_stock", "out_of_stock"]);
  });

  it("filters by pharmacyId and inStock", async () => {
    const res = await withKey(app).get("/medicines?pharmacyId=1&inStock=true");
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.every((m) => m.pharmacyId === 1 && m.stockLevel > 0)).toBe(true);
  });

  it("edge case: returns 200 and an empty list when nothing matches", async () => {
    const res = await withKey(app).get("/medicines?q=does-not-exist");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it.each([
    ["pharmacyId=abc", "pharmacyId must be a positive integer"],
    ["pharmacyId=0", "pharmacyId must be a positive integer"],
    ["inStock=yes", "inStock must be true or false"],
    [`q=${"x".repeat(121)}`, "q must be 120 characters or fewer"]
  ])("returns 400 for ?%s", async (query, message) => {
    const res = await withKey(app).get(`/medicines?${query}`);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message });
  });
});

describe("GET /medicines/{id}", () => {
  it("returns 200 and the stock line", async () => {
    const res = await withKey(app).get("/medicines/1");
    expect(res.status).toBe(200);
    expectMedicineShape(res.body);
    expect(res.body).toMatchObject({ id: 1, name: "Amoxicillin", stockLevel: 24, unitPrice: 180, pharmacyId: 1 });
  });

  it("returns 404 for an id that does not exist", async () => {
    const res = await withKey(app).get("/medicines/9999");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "Medicine 9999 not found" });
  });

  it.each(["abc", "0", "-1", "1.5"])("returns 400 for the id %s", async (id) => {
    const res = await withKey(app).get(`/medicines/${id}`);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("message");
  });
});

describe("POST /medicines", () => {
  it("creates the stock line: 201, Location header and the new record", async () => {
    const res = await withKey(app).post("/medicines").send(newMedicine());
    expect(res.status).toBe(201);
    expectMedicineShape(res.body);
    expect(res.body).toMatchObject({ name: "Cetirizine 10mg", category: "Allergy", stockLevel: 15, unitPrice: 80, status: "in_stock", pharmacyId: 2, pharmacyName: "Westlands MedPoint" });
    expect(res.headers.location).toBe(`/medicines/${res.body.id}`);

    const check = await withKey(app).get(`/medicines/${res.body.id}`);
    expect(check.status).toBe(200);
    expect(check.body.name).toBe("Cetirizine 10mg");
  });

  it("trims spaces and accepts a price with 2 decimal places", async () => {
    const res = await withKey(app).post("/medicines").send(newMedicine({ name: "  Loratadine  ", unitPrice: 19.99 }));
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Loratadine");
    expect(res.body.unitPrice).toBe(19.99);
  });

  it("edge case: accepts a stock level of 0 and marks it out_of_stock", async () => {
    const res = await withKey(app).post("/medicines").send(newMedicine({ stockLevel: 0 }));
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("out_of_stock");
  });

  it("ignores extra fields such as id", async () => {
    const res = await withKey(app).post("/medicines").send(newMedicine({ id: 1, verified: true }));
    expect(res.status).toBe(201);
    expect(res.body.id).not.toBe(1);
    expect(res.body).not.toHaveProperty("verified");
  });

  it("returns 409 if the pharmacy already lists that medicine", async () => {
    const res = await withKey(app).post("/medicines").send(newMedicine({ name: "amoxicillin", pharmacyId: 1 }));
    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty("message");
  });

  it.each([
    ["an empty body", {}, "name, category, stockLevel, unitPrice, pharmacyId are required"],
    ["a missing name", newMedicine({ name: undefined }), "name is required"],
    ["a missing pharmacyId", newMedicine({ pharmacyId: undefined }), "pharmacyId is required"],
    ["name as a number", newMedicine({ name: 5 }), "name must be a string"],
    ["an empty name", newMedicine({ name: "   " }), "name must not be empty"],
    ["a name over 120 characters", newMedicine({ name: "x".repeat(121) }), "name must be 120 characters or fewer"],
    ["stockLevel as a string", newMedicine({ stockLevel: "15" }), "stockLevel must be an integer"],
    ["stockLevel 2.5", newMedicine({ stockLevel: 2.5 }), "stockLevel must be an integer"],
    ["a negative stockLevel", newMedicine({ stockLevel: -1 }), "stockLevel must be between 0 and 100000"],
    ["unitPrice as a string", newMedicine({ unitPrice: "80" }), "unitPrice must be a number"],
    ["unitPrice 0", newMedicine({ unitPrice: 0 }), "unitPrice must be greater than 0 and at most 1000000"],
    ["unitPrice with 3 decimals", newMedicine({ unitPrice: 1.234 }), "unitPrice can have at most 2 decimal places"],
    ["pharmacyId as a string", newMedicine({ pharmacyId: "2" }), "pharmacyId must be an integer"],
    ["a pharmacy that does not exist", newMedicine({ pharmacyId: 99 }), "pharmacyId 99 does not match a registered pharmacy"]
  ])("returns 400 for %s and stores nothing", async (label, body, message) => {
    const res = await withKey(app).post("/medicines").send(body);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message });
    const all = await withKey(app).get("/medicines");
    expect(all.body).toHaveLength(11);
  });

  it("returns 400 for malformed JSON", async () => {
    const res = await withKey(app).post("/medicines").set("Content-Type", "application/json").send("{ not json");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "Request body is not valid JSON" });
  });

  it("returns 400 when the body is an array", async () => {
    const res = await withKey(app).post("/medicines").send([newMedicine()]);
    expect(res.status).toBe(400);
  });
});

describe("PUT /medicines/{id}", () => {
  const update = { name: "Amoxicillin", category: "Antibiotic", stockLevel: 5, unitPrice: 175 };

  it("replaces the values: 200 and the updated record", async () => {
    const res = await withKey(app).put("/medicines/1").send(update);
    expect(res.status).toBe(200);
    expectMedicineShape(res.body);
    expect(res.body).toMatchObject({ id: 1, stockLevel: 5, unitPrice: 175, status: "low_stock" });
    const check = await withKey(app).get("/medicines/1");
    expect(check.body.stockLevel).toBe(5);
  });

  it("is idempotent: the same PUT twice leaves the same end state", async () => {
    const first = await withKey(app).put("/medicines/1").send(update);
    const second = await withKey(app).put("/medicines/1").send(update);
    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);
  });

  it("returns 404 for an id that does not exist, and does not create it", async () => {
    const res = await withKey(app).put("/medicines/9999").send(update);
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("message");
    expect((await withKey(app).get("/medicines/9999")).status).toBe(404);
  });

  it("returns 400 for a missing field and changes nothing", async () => {
    const before = (await withKey(app).get("/medicines/1")).body;
    const res = await withKey(app).put("/medicines/1").send({ name: "Amoxicillin", stockLevel: 3 });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "category, unitPrice are required" });
    expect((await withKey(app).get("/medicines/1")).body).toEqual(before);
  });

  it("returns 400 for a wrong type", async () => {
    const res = await withKey(app).put("/medicines/1").send({ ...update, stockLevel: "5" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for a bad id", async () => {
    const res = await withKey(app).put("/medicines/abc").send(update);
    expect(res.status).toBe(400);
  });

  it("returns 409 when renaming to a medicine the pharmacy already lists", async () => {
    const res = await withKey(app).put("/medicines/1").send({ ...update, name: "Losartan" });
    expect(res.status).toBe(409);
  });

  it("cannot move the stock line to another pharmacy", async () => {
    const res = await withKey(app).put("/medicines/1").send({ ...update, pharmacyId: 3 });
    expect(res.status).toBe(200);
    expect(res.body.pharmacyId).toBe(1);
  });
});

describe("DELETE /medicines/{id}", () => {
  it("deletes: 204 with no body, then GET returns 404", async () => {
    const res = await withKey(app).delete("/medicines/7");
    expect(res.status).toBe(204);
    expect(res.text).toBe("");
    expect((await withKey(app).get("/medicines/7")).status).toBe(404);
  });

  it("returns 404 the second time", async () => {
    await withKey(app).delete("/medicines/7");
    const res = await withKey(app).delete("/medicines/7");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "Medicine 7 not found" });
  });

  it("returns 400 for a bad id", async () => {
    const res = await withKey(app).delete("/medicines/xyz");
    expect(res.status).toBe(400);
  });
});
