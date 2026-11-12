import { makeTestApp, withKey } from "../test-support/testApp.js";

let app;
let pool;

beforeAll(async () => {
  ({ app, pool } = await makeTestApp());
});
afterAll(() => pool.end());

const PHARMACY_FIELDS = ["area", "distance", "eta", "id", "latitude", "longitude", "name", "verified"];

function expectPharmacyShape(p) {
  expect(Object.keys(p).sort()).toEqual(PHARMACY_FIELDS);
  expect(Number.isInteger(p.id)).toBe(true);
  expect(typeof p.name).toBe("string");
  expect(typeof p.latitude).toBe("number");
  expect(typeof p.longitude).toBe("number");
  expect(typeof p.verified).toBe("boolean");
}

describe("GET /pharmacies", () => {
  it("returns 200 and every pharmacy, sorted by name", async () => {
    const res = await withKey(app).get("/pharmacies");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(6);
    res.body.forEach(expectPharmacyShape);
    const names = res.body.map((p) => p.name);
    expect(names).toEqual([...names].sort());
  });

  it("never returns the password hash", async () => {
    const res = await withKey(app).get("/pharmacies");
    expect(JSON.stringify(res.body)).not.toMatch(/password|\$2[aby]\$/);
  });

  it("filters by area", async () => {
    const res = await withKey(app).get("/pharmacies?area=Westlands");
    expect(res.status).toBe(200);
    expect(res.body.map((p) => p.name)).toEqual(["Westlands MedPoint"]);
  });

  it("edge case: returns an empty list for an area with no pharmacies", async () => {
    const res = await withKey(app).get("/pharmacies?area=Nakuru");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("GET /pharmacies/{id}", () => {
  it("returns 200 and the pharmacy", async () => {
    const res = await withKey(app).get("/pharmacies/1");
    expect(res.status).toBe(200);
    expectPharmacyShape(res.body);
    expect(res.body).toMatchObject({ id: 1, name: "AfyaCare Pharmacy", area: "Nairobi CBD", verified: true });
  });

  it("returns 404 for an id that does not exist", async () => {
    const res = await withKey(app).get("/pharmacies/999");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "Pharmacy 999 not found" });
  });

  it("returns 400 for an id that is not a number", async () => {
    const res = await withKey(app).get("/pharmacies/afyacare");
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("message");
  });
});

describe("unknown routes", () => {
  it("return 404 JSON", async () => {
    const res = await withKey(app).get("/nothing-here");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "Route not found" });
  });
});
