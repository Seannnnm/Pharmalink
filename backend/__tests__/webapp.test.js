// Routes used by the PharmaLink website (frontend/).
import request from "supertest";
import { makeTestApp } from "../test-support/testApp.js";

let app;
let pool;
let resetDb;

beforeAll(async () => {
  ({ app, pool, resetDb } = await makeTestApp());
});
beforeEach(() => resetDb());
afterAll(() => pool.end());

describe("GET /api/stock/search", () => {
  it("returns matching stock with pharmacy details", async () => {
    const res = await request(app).get("/api/stock/search?medicine=amox&area=");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    expect(res.body[0]).toMatchObject({ name: "AfyaCare Pharmacy", medicine: "Amoxicillin", quantity: 24 });
  });
});

describe("POST /api/auth/login", () => {
  it("logs in a seeded pharmacy", async () => {
    const res = await request(app).post("/api/auth/login").send({ name: "AfyaCare Pharmacy", password: "demo1234" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 1, name: "AfyaCare Pharmacy" });
    expect(res.body).not.toHaveProperty("password_hash");
  });

  it("returns 401 for a wrong password", async () => {
    const res = await request(app).post("/api/auth/login").send({ name: "AfyaCare Pharmacy", password: "nope1234" });
    expect(res.status).toBe(401);
  });

  it("returns 400 when fields are missing", async () => {
    const res = await request(app).post("/api/auth/login").send({ name: "AfyaCare Pharmacy" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/register", () => {
  it("registers a pharmacy: 201", async () => {
    const res = await request(app).post("/api/auth/register").send({ name: "Madaraka Chemist", area: "Nairobi CBD", password: "secret12" });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: "Madaraka Chemist", verified: false });
  });

  it("returns 409 for a name that is taken", async () => {
    const res = await request(app).post("/api/auth/register").send({ name: "AfyaCare Pharmacy", area: "Nairobi CBD", password: "secret12" });
    expect(res.status).toBe(409);
  });

  it("returns 400 for a short password", async () => {
    const res = await request(app).post("/api/auth/register").send({ name: "New One", area: "Kisumu", password: "123" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/inventory", () => {
  const item = { medicine: "Zinc tablets", quantity: 10, price: 90, status: "In stock", pharmacy_id: 1 };

  it("adds an item: 201", async () => {
    const res = await request(app).post("/api/inventory").send(item);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ medicine: "Zinc tablets", quantity: 10, price: 90, pharmacy_id: 1 });
  });

  it.each([
    ["quantity as a string", { ...item, quantity: "10" }],
    ["a missing price", { ...item, price: undefined }],
    ["an unknown status", { ...item, status: "Plenty" }],
    ["no pharmacy_id", { ...item, pharmacy_id: undefined }]
  ])("returns 400 for %s", async (label, body) => {
    const res = await request(app).post("/api/inventory").send(body);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("message");
  });
});

describe("PATCH /api/inventory/{id}", () => {
  const change = { quantity: 3, price: 175, status: "Low stock", pharmacy_id: 1 };

  it("updates the item: 200", async () => {
    const res = await request(app).patch("/api/inventory/1").send(change);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 1, quantity: 3, price: 175, status: "Low stock" });
  });

  it("returns 404 for an item that does not exist", async () => {
    const res = await request(app).patch("/api/inventory/9999").send(change);
    expect(res.status).toBe(404);
  });

  it("returns 404 when the item belongs to another pharmacy", async () => {
    const res = await request(app).patch("/api/inventory/1").send({ ...change, pharmacy_id: 2 });
    expect(res.status).toBe(404);
  });

  it("returns 400 for a negative quantity", async () => {
    const res = await request(app).patch("/api/inventory/1").send({ ...change, quantity: -1 });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/reservations", () => {
  const reservation = { pharmacy_id: 1, medicine: "Amoxicillin", patient_initials: "jk", pickup_window: "Today, 4-6 PM", reservation_code: "PL-1234" };

  it("creates a reservation: 201", async () => {
    const res = await request(app).post("/api/reservations").send(reservation);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ reservation_code: "PL-1234", status: "Reserved" });
  });

  it("returns 409 for a reservation code that is already used", async () => {
    await request(app).post("/api/reservations").send(reservation);
    const res = await request(app).post("/api/reservations").send(reservation);
    expect(res.status).toBe(409);
  });

  it("returns 400 for a missing field", async () => {
    const res = await request(app).post("/api/reservations").send({ ...reservation, pickup_window: undefined });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/payments", () => {
  it("records a payment: 201", async () => {
    const res = await request(app).post("/api/payments").send({ type: "Sponsored listing", amount: 750 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ type: "Sponsored listing", amount: 750, status: "Confirmed" });
  });

  it("returns 400 for a negative amount", async () => {
    const res = await request(app).post("/api/payments").send({ type: "Sponsored listing", amount: -5 });
    expect(res.status).toBe(400);
  });
});
