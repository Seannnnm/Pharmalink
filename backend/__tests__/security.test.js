import request from "supertest";
import { createApp } from "../app.js";
import { makeTestApp, TEST_KEY } from "../test-support/testApp.js";

let app;
let pool;

beforeAll(async () => {
  ({ app, pool } = await makeTestApp());
});
afterAll(() => pool.end());

describe("API key authentication", () => {
  it("returns 401 with no key", async () => {
    const res = await request(app).get("/medicines");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: "Missing or invalid API key" });
  });

  it("returns 401 with a wrong key", async () => {
    const res = await request(app).get("/pharmacies").set("X-API-Key", "wrong");
    expect(res.status).toBe(401);
  });

  it("returns 401 for a write with no key, and writes nothing", async () => {
    const res = await request(app).post("/medicines").send({ name: "X", category: "Y", stockLevel: 1, unitPrice: 1, pharmacyId: 1 });
    expect(res.status).toBe(401);
    const list = await request(app).get("/medicines?q=X").set("X-API-Key", TEST_KEY);
    expect(list.body.find((m) => m.name === "X")).toBeUndefined();
  });

  it("returns 200 with a valid key", async () => {
    const res = await request(app).get("/medicines").set("X-API-Key", TEST_KEY);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("leaves /health open", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
  });
});

describe("rate limiting", () => {
  it("returns 429 with Retry-After and a JSON body after the limit", async () => {
    const limited = createApp({ pool, apiKeys: ["k1"], rateLimitMax: 3 });
    const codes = [];
    let last;
    for (let i = 0; i < 5; i++) {
      last = await request(limited).get("/pharmacies").set("X-API-Key", "k1");
      codes.push(last.status);
    }
    expect(codes).toEqual([200, 200, 200, 429, 429]);
    expect(Number(last.headers["retry-after"])).toBeGreaterThan(0);
    expect(last.body).toMatchObject({ message: "Too many requests" });
  });

  it("counts each key separately", async () => {
    const limited = createApp({ pool, apiKeys: ["k1", "k2"], rateLimitMax: 1 });
    expect((await request(limited).get("/pharmacies").set("X-API-Key", "k1")).status).toBe(200);
    expect((await request(limited).get("/pharmacies").set("X-API-Key", "k2")).status).toBe(200);
  });
});

describe("error messages", () => {
  it("a 500 does not reveal the database error", async () => {
    const broken = createApp({ pool: { query: () => Promise.reject(new Error("Table 'pharmalink.inventory' doesn't exist")) }, apiKeys: ["k"] });
    const res = await request(broken).get("/medicines").set("X-API-Key", "k");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ message: "Server error" });
  });
});

describe("GET /stats", () => {
  it("needs a key", async () => {
    expect((await request(app).get("/stats")).status).toBe(401);
  });

  it("reports totals and a per-route breakdown", async () => {
    await request(app).get("/medicines/1").set("X-API-Key", TEST_KEY);
    await request(app).get("/medicines/9999").set("X-API-Key", TEST_KEY);
    const res = await request(app).get("/stats").set("X-API-Key", TEST_KEY);
    expect(res.status).toBe(200);
    expect(res.body.routes["GET /medicines/:id"].clientErrors).toBeGreaterThanOrEqual(1);
    expect(res.body).toHaveProperty("errorRatePercent");
    expect(res.body).toHaveProperty("avgMs");
  });
});
