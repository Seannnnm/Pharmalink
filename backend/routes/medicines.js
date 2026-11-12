import { Router } from "express";
import { parseId, validateMedicineQuery, validateMedicineReplace, validateNewMedicine } from "../validation.js";

// A "medicine" in the partner API is one stock line: one medicine at one pharmacy.
const SELECT_MEDICINE = `
  SELECT i.id, i.medicine, i.category, i.quantity, i.price, i.updated_at,
         p.id AS pharmacy_id, p.name AS pharmacy_name, p.area
  FROM inventory i
  JOIN pharmacies p ON p.id = i.pharmacy_id`;

export function stockStatus(stockLevel) {
  if (stockLevel === 0) return "out_of_stock";
  if (stockLevel < 10) return "low_stock";
  return "in_stock";
}

// The label stored in inventory.status, which the PharmaLink website shows.
export function stockLabel(stockLevel) {
  return { out_of_stock: "Out of stock", low_stock: "Low stock", in_stock: "In stock" }[stockStatus(stockLevel)];
}

// Map a database row to the Medicine shape in openapi.yaml. Never send raw rows.
export function toMedicine(row) {
  return {
    id: row.id,
    name: row.medicine,
    category: row.category,
    stockLevel: row.quantity,
    unitPrice: Number(row.price),
    status: stockStatus(row.quantity),
    pharmacyId: row.pharmacy_id,
    pharmacyName: row.pharmacy_name,
    area: row.area,
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

async function findMedicine(pool, id) {
  const [rows] = await pool.query(`${SELECT_MEDICINE} WHERE i.id = ?`, [id]);
  return rows[0] || null;
}

async function nameTakenAtPharmacy(pool, pharmacyId, name, exceptId = 0) {
  const [rows] = await pool.query(
    "SELECT id FROM inventory WHERE pharmacy_id = ? AND LOWER(medicine) = LOWER(?) AND id <> ?",
    [pharmacyId, name, exceptId]
  );
  return rows.length > 0;
}

export function medicinesRouter(pool) {
  const router = Router();

  router.get("/", async (req, res) => {
    const { error, value } = validateMedicineQuery(req.query);
    if (error) return res.status(400).json({ message: error });

    const conditions = [];
    const params = [];
    if (value.q) {
      conditions.push("i.medicine LIKE ?");
      params.push(`%${value.q}%`);
    }
    if (value.area) {
      conditions.push("p.area LIKE ?");
      params.push(`%${value.area}%`);
    }
    if (value.pharmacyId) {
      conditions.push("p.id = ?");
      params.push(value.pharmacyId);
    }
    if (value.inStock !== undefined) conditions.push(value.inStock ? "i.quantity > 0" : "i.quantity = 0");

    const where = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";
    const [rows] = await pool.query(`${SELECT_MEDICINE}${where} ORDER BY i.quantity DESC, i.price ASC, i.id ASC`, params);
    res.status(200).json(rows.map(toMedicine));
  });

  router.get("/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "id must be a positive integer" });
    const row = await findMedicine(pool, id);
    if (!row) return res.status(404).json({ message: `Medicine ${id} not found` });
    res.status(200).json(toMedicine(row));
  });

  router.post("/", async (req, res) => {
    // 1. Validate the body. Nothing is written if this fails.
    const { error, value } = validateNewMedicine(req.body);
    if (error) return res.status(400).json({ message: error });

    // 2. The pharmacy it belongs to must exist.
    const [pharmacies] = await pool.query("SELECT id FROM pharmacies WHERE id = ?", [value.pharmacyId]);
    if (!pharmacies.length) {
      return res.status(400).json({ message: `pharmacyId ${value.pharmacyId} does not match a registered pharmacy` });
    }

    // 3. One stock line per medicine per pharmacy. Update the existing one with PUT instead.
    if (await nameTakenAtPharmacy(pool, value.pharmacyId, value.name)) {
      return res.status(409).json({ message: `Pharmacy ${value.pharmacyId} already lists ${value.name}. Use PUT /medicines/{id} to change it.` });
    }

    const [result] = await pool.query(
      "INSERT INTO inventory (pharmacy_id, medicine, category, quantity, price, status) VALUES (?, ?, ?, ?, ?, ?)",
      [value.pharmacyId, value.name, value.category, value.stockLevel, value.unitPrice, stockLabel(value.stockLevel)]
    );
    const created = await findMedicine(pool, result.insertId);
    res.status(201).location(`/medicines/${result.insertId}`).json(toMedicine(created));
  });

  router.put("/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "id must be a positive integer" });
    const { error, value } = validateMedicineReplace(req.body);
    if (error) return res.status(400).json({ message: error });

    // PUT never creates: a missing id is a 404, not a new record.
    const existing = await findMedicine(pool, id);
    if (!existing) return res.status(404).json({ message: `Medicine ${id} not found` });

    if (await nameTakenAtPharmacy(pool, existing.pharmacy_id, value.name, id)) {
      return res.status(409).json({ message: `Pharmacy ${existing.pharmacy_id} already lists ${value.name}` });
    }

    // Sets absolute values, so sending the same PUT twice gives the same end state.
    await pool.query("UPDATE inventory SET medicine = ?, category = ?, quantity = ?, price = ?, status = ? WHERE id = ?", [
      value.name,
      value.category,
      value.stockLevel,
      value.unitPrice,
      stockLabel(value.stockLevel),
      id
    ]);
    res.status(200).json(toMedicine(await findMedicine(pool, id)));
  });

  router.delete("/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "id must be a positive integer" });
    const [result] = await pool.query("DELETE FROM inventory WHERE id = ?", [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: `Medicine ${id} not found` });
    res.status(204).end();
  });

  return router;
}
