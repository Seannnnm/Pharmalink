// Routes used by the PharmaLink website itself (frontend/). Partner teams use /medicines and
// /pharmacies instead, which are the routes described in openapi.yaml.
import bcrypt from "bcryptjs";
import { Router } from "express";
import {
  parseId,
  validateInventoryWrite,
  validatePayment,
  validateRegistration,
  validateReservation
} from "../validation.js";

const AREA_COORDINATES = {
  "Nairobi CBD": [-1.2864, 36.8172],
  Westlands: [-1.2647, 36.803],
  Eastleigh: [-1.274, 36.846],
  Kisumu: [-0.0917, 34.768],
  Mombasa: [-4.0526, 39.665]
};

function coordinatesForArea(area) {
  const [lat, lng] = AREA_COORDINATES[area] || AREA_COORDINATES["Nairobi CBD"];
  const jitter = () => (Math.random() - 0.5) * 0.01;
  return [lat + jitter(), lng + jitter()];
}

const SELECT_INVENTORY = "SELECT id, pharmacy_id, medicine, category, quantity, price, status, updated_at FROM inventory";

export function webappRouter(pool) {
  const router = Router();

  router.get("/health", (req, res) => {
    res.json({ status: "ok", service: "PharmaLink API" });
  });

  router.get("/stock/search", async (req, res) => {
    const medicine = `%${String(req.query.medicine || "")}%`;
    const area = `%${String(req.query.area || "")}%`;
    const [rows] = await pool.query(
      `SELECT p.id, p.name, p.area, p.distance, p.eta, p.latitude, p.longitude, p.verified,
              i.medicine, i.quantity, i.price
       FROM inventory i
       JOIN pharmacies p ON p.id = i.pharmacy_id
       WHERE i.medicine LIKE ? AND p.area LIKE ?
       ORDER BY i.quantity DESC, i.price ASC`,
      [medicine, area]
    );
    res.json(rows);
  });

  router.post("/auth/register", async (req, res) => {
    const { error, value } = validateRegistration(req.body);
    if (error) return res.status(400).json({ message: error });

    const [existing] = await pool.query("SELECT id FROM pharmacies WHERE name = ?", [value.name]);
    if (existing.length > 0) {
      return res.status(409).json({ message: "A pharmacy with that name is already registered" });
    }

    const passwordHash = await bcrypt.hash(value.password, 10);
    const [lat, lng] = coordinatesForArea(value.area);
    const [result] = await pool.query(
      `INSERT INTO pharmacies (name, password_hash, area, distance, eta, latitude, longitude, verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, FALSE)`,
      [value.name, passwordHash, value.area, "Distance varies", "Varies by pickup", lat, lng]
    );
    res.status(201).json({ id: result.insertId, name: value.name, area: value.area, verified: false });
  });

  router.post("/auth/login", async (req, res) => {
    const { name, password } = req.body || {};
    if (typeof name !== "string" || typeof password !== "string" || !name || !password) {
      return res.status(400).json({ message: "Pharmacy name and password are required" });
    }
    const [rows] = await pool.query("SELECT id, name, area, verified, password_hash FROM pharmacies WHERE name = ?", [name]);
    const pharmacy = rows[0];
    const passwordMatches = pharmacy ? await bcrypt.compare(password, pharmacy.password_hash) : false;
    if (!pharmacy || !passwordMatches) {
      return res.status(401).json({ message: "Incorrect pharmacy name or password" });
    }
    res.json({ id: pharmacy.id, name: pharmacy.name, area: pharmacy.area, verified: !!pharmacy.verified });
  });

  router.get("/pharmacies", async (req, res) => {
    const [rows] = await pool.query("SELECT id, name, area, verified FROM pharmacies ORDER BY name");
    res.json(rows.map((r) => ({ ...r, verified: !!r.verified })));
  });

  router.get("/inventory", async (req, res) => {
    if (req.query.pharmacy_id === undefined) {
      const [rows] = await pool.query(`${SELECT_INVENTORY} ORDER BY updated_at DESC`);
      return res.json(rows);
    }
    const pharmacyId = parseId(req.query.pharmacy_id);
    if (!pharmacyId) return res.status(400).json({ message: "pharmacy_id must be a positive integer" });
    const [rows] = await pool.query(`${SELECT_INVENTORY} WHERE pharmacy_id = ? ORDER BY updated_at DESC`, [pharmacyId]);
    res.json(rows);
  });

  router.post("/inventory", async (req, res) => {
    const { error, value } = validateInventoryWrite(req.body, { requireMedicine: true });
    if (error) return res.status(400).json({ message: error });
    const pharmacyId = parseId(req.body.pharmacy_id);
    if (!pharmacyId) return res.status(400).json({ message: "pharmacy_id is required and must be a positive integer" });

    const [pharmacies] = await pool.query("SELECT id FROM pharmacies WHERE id = ?", [pharmacyId]);
    if (!pharmacies.length) return res.status(400).json({ message: `Pharmacy ${pharmacyId} does not exist` });

    const [result] = await pool.query(
      "INSERT INTO inventory (pharmacy_id, medicine, category, quantity, price, status) VALUES (?, ?, ?, ?, ?, ?)",
      [pharmacyId, value.medicine, value.category || "General", value.quantity, value.price, value.status]
    );
    const [rows] = await pool.query(`${SELECT_INVENTORY} WHERE id = ?`, [result.insertId]);
    res.status(201).json(rows[0]);
  });

  router.patch("/inventory/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "id must be a positive integer" });
    const { error, value } = validateInventoryWrite(req.body, { requireMedicine: false });
    if (error) return res.status(400).json({ message: error });

    const [found] = await pool.query("SELECT id, pharmacy_id FROM inventory WHERE id = ?", [id]);
    const pharmacyId = req.body.pharmacy_id === undefined ? null : parseId(req.body.pharmacy_id);
    if (!found.length || (pharmacyId && found[0].pharmacy_id !== pharmacyId)) {
      return res.status(404).json({ message: "Inventory item not found" });
    }

    await pool.query("UPDATE inventory SET quantity = ?, price = ?, status = ? WHERE id = ?", [
      value.quantity,
      value.price,
      value.status,
      id
    ]);
    const [rows] = await pool.query(`${SELECT_INVENTORY} WHERE id = ?`, [id]);
    res.json(rows[0]);
  });

  router.post("/reservations", async (req, res) => {
    const { error, value } = validateReservation(req.body);
    if (error) return res.status(400).json({ message: error });

    const [pharmacies] = await pool.query("SELECT id FROM pharmacies WHERE id = ?", [value.pharmacyId]);
    if (!pharmacies.length) return res.status(400).json({ message: `Pharmacy ${value.pharmacyId} does not exist` });

    const [taken] = await pool.query("SELECT id FROM reservations WHERE reservation_code = ?", [value.reservationCode]);
    if (taken.length) return res.status(409).json({ message: "That reservation code is already in use" });

    const [result] = await pool.query(
      `INSERT INTO reservations (pharmacy_id, medicine, patient_initials, pickup_window, reservation_code)
       VALUES (?, ?, ?, ?, ?)`,
      [value.pharmacyId, value.medicine, value.patientInitials, value.pickupWindow, value.reservationCode]
    );
    res.status(201).json({ id: result.insertId, reservation_code: value.reservationCode, status: "Reserved" });
  });

  router.post("/payments", async (req, res) => {
    const { error, value } = validatePayment(req.body);
    if (error) return res.status(400).json({ message: error });
    const [result] = await pool.query("INSERT INTO payments (type, amount, status) VALUES (?, ?, ?)", [
      value.type,
      value.amount,
      "Confirmed"
    ]);
    res.status(201).json({
      id: result.insertId,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      type: value.type,
      amount: value.amount,
      status: "Confirmed"
    });
  });

  return router;
}
