import { Router } from "express";
import { LIMITS, parseId } from "../validation.js";

const SELECT_PHARMACY = `
  SELECT id, name, area, distance, eta, latitude, longitude, verified
  FROM pharmacies`;

// Built from an explicit list of fields: password_hash and created_at are never sent.
export function toPharmacy(row) {
  return {
    id: row.id,
    name: row.name,
    area: row.area,
    distance: row.distance,
    eta: row.eta,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    verified: Boolean(row.verified)
  };
}

export function pharmaciesRouter(pool) {
  const router = Router();

  router.get("/", async (req, res) => {
    const area = req.query.area;
    if (area !== undefined && (typeof area !== "string" || area.length > LIMITS.nameMax)) {
      return res.status(400).json({ message: "area must be a single value of at most 120 characters" });
    }
    const [rows] = area
      ? await pool.query(`${SELECT_PHARMACY} WHERE area LIKE ? ORDER BY name`, [`%${area.trim()}%`])
      : await pool.query(`${SELECT_PHARMACY} ORDER BY name`);
    res.status(200).json(rows.map(toPharmacy));
  });

  router.get("/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "id must be a positive integer" });
    const [rows] = await pool.query(`${SELECT_PHARMACY} WHERE id = ?`, [id]);
    if (!rows.length) return res.status(404).json({ message: `Pharmacy ${id} not found` });
    res.status(200).json(toPharmacy(rows[0]));
  });

  return router;
}
