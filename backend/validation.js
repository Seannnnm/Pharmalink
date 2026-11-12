// Validation for every write endpoint. Each function returns { error } or { value }.
// Routes call these first and answer 400 before anything touches the database.

export const LIMITS = {
  nameMax: 120,
  categoryMax: 60,
  stockMax: 100000,
  priceMax: 1000000
};

export function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isMissing(value) {
  return value === undefined || value === null;
}

function missingFields(body, fields) {
  return fields.filter((f) => isMissing(body[f]));
}

function requiredMessage(missing) {
  return `${missing.join(", ")} ${missing.length > 1 ? "are" : "is"} required`;
}

function checkText(body, field, max) {
  const value = body[field];
  if (typeof value !== "string") return `${field} must be a string`;
  if (value.trim().length === 0) return `${field} must not be empty`;
  if (value.trim().length > max) return `${field} must be ${max} characters or fewer`;
  return null;
}

function checkInteger(body, field, min, max) {
  const value = body[field];
  if (typeof value !== "number" || !Number.isInteger(value)) return `${field} must be an integer`;
  if (value < min || value > max) return `${field} must be between ${min} and ${max}`;
  return null;
}

function checkPrice(body, field) {
  const value = body[field];
  if (typeof value !== "number" || !Number.isFinite(value)) return `${field} must be a number`;
  if (value <= 0 || value > LIMITS.priceMax) return `${field} must be greater than 0 and at most ${LIMITS.priceMax}`;
  if (Math.abs(Math.round(value * 100) - value * 100) > 1e-6) return `${field} can have at most 2 decimal places`;
  return null;
}

// Path ids like /medicines/12. Anything that is not a positive whole number is a 400.
export function parseId(raw) {
  if (!/^[0-9]+$/.test(String(raw))) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

// Fields shared by POST /medicines and PUT /medicines/{id}.
function validateMedicineFields(body) {
  return (
    checkText(body, "name", LIMITS.nameMax) ||
    checkText(body, "category", LIMITS.categoryMax) ||
    checkInteger(body, "stockLevel", 0, LIMITS.stockMax) ||
    checkPrice(body, "unitPrice")
  );
}

function pickMedicine(body) {
  // Only these fields are ever read from the body, so extra fields (id, verified, ...) are ignored.
  return {
    name: body.name.trim(),
    category: body.category.trim(),
    stockLevel: body.stockLevel,
    unitPrice: body.unitPrice
  };
}

export function validateNewMedicine(body) {
  if (!isPlainObject(body)) return { error: "Request body must be a JSON object" };
  const missing = missingFields(body, ["name", "category", "stockLevel", "unitPrice", "pharmacyId"]);
  if (missing.length) return { error: requiredMessage(missing) };
  const problem = validateMedicineFields(body) || checkInteger(body, "pharmacyId", 1, Number.MAX_SAFE_INTEGER);
  if (problem) return { error: problem };
  return { value: { ...pickMedicine(body), pharmacyId: body.pharmacyId } };
}

export function validateMedicineReplace(body) {
  if (!isPlainObject(body)) return { error: "Request body must be a JSON object" };
  const missing = missingFields(body, ["name", "category", "stockLevel", "unitPrice"]);
  if (missing.length) return { error: requiredMessage(missing) };
  const problem = validateMedicineFields(body);
  if (problem) return { error: problem };
  return { value: pickMedicine(body) };
}

// Query string filters for GET /medicines.
export function validateMedicineQuery(query) {
  const value = {};
  for (const key of ["q", "area"]) {
    if (query[key] !== undefined) {
      if (typeof query[key] !== "string") return { error: `${key} must be given once` };
      if (query[key].length > LIMITS.nameMax) return { error: `${key} must be ${LIMITS.nameMax} characters or fewer` };
      value[key] = query[key].trim();
    }
  }
  if (query.pharmacyId !== undefined) {
    const id = parseId(query.pharmacyId);
    if (!id) return { error: "pharmacyId must be a positive integer" };
    value.pharmacyId = id;
  }
  if (query.inStock !== undefined) {
    if (query.inStock !== "true" && query.inStock !== "false") return { error: "inStock must be true or false" };
    value.inStock = query.inStock === "true";
  }
  return { value };
}

// ----- Validation for the PharmaLink website's own routes (/api/...) -----

export const STOCK_LABELS = ["In stock", "Low stock", "Out of stock"];

export function validateInventoryWrite(body, { requireMedicine }) {
  if (!isPlainObject(body)) return { error: "Request body must be a JSON object" };
  const required = requireMedicine ? ["medicine", "quantity", "price", "status"] : ["quantity", "price", "status"];
  const missing = missingFields(body, required);
  if (missing.length) return { error: requiredMessage(missing) };
  const problem =
    (requireMedicine ? checkText(body, "medicine", LIMITS.nameMax) : null) ||
    checkInteger(body, "quantity", 0, LIMITS.stockMax) ||
    checkPrice(body, "price") ||
    (STOCK_LABELS.includes(body.status) ? null : `status must be one of: ${STOCK_LABELS.join(", ")}`);
  if (problem) return { error: problem };
  if (body.category !== undefined) {
    const categoryProblem = checkText(body, "category", LIMITS.categoryMax);
    if (categoryProblem) return { error: categoryProblem };
  }
  return {
    value: {
      medicine: requireMedicine ? body.medicine.trim() : undefined,
      category: typeof body.category === "string" ? body.category.trim() : undefined,
      quantity: body.quantity,
      price: body.price,
      status: body.status
    }
  };
}

export function validateReservation(body) {
  if (!isPlainObject(body)) return { error: "Request body must be a JSON object" };
  const missing = missingFields(body, ["pharmacy_id", "medicine", "patient_initials", "pickup_window", "reservation_code"]);
  if (missing.length) return { error: requiredMessage(missing) };
  const problem =
    checkInteger(body, "pharmacy_id", 1, Number.MAX_SAFE_INTEGER) ||
    checkText(body, "medicine", LIMITS.nameMax) ||
    checkText(body, "patient_initials", 10) ||
    checkText(body, "pickup_window", 120) ||
    checkText(body, "reservation_code", 30);
  if (problem) return { error: problem };
  return {
    value: {
      pharmacyId: body.pharmacy_id,
      medicine: body.medicine.trim(),
      patientInitials: body.patient_initials.trim().toUpperCase(),
      pickupWindow: body.pickup_window.trim(),
      reservationCode: body.reservation_code.trim()
    }
  };
}

export function validatePayment(body) {
  if (!isPlainObject(body)) return { error: "Request body must be a JSON object" };
  const missing = missingFields(body, ["type", "amount"]);
  if (missing.length) return { error: requiredMessage(missing) };
  const problem = checkText(body, "type", 120) || checkPrice(body, "amount");
  if (problem) return { error: problem };
  return { value: { type: body.type.trim(), amount: body.amount } };
}

export function validateRegistration(body) {
  if (!isPlainObject(body)) return { error: "Request body must be a JSON object" };
  const missing = missingFields(body, ["name", "area", "password"]);
  if (missing.length) return { error: "Pharmacy name, area, and password are required" };
  const problem = checkText(body, "name", LIMITS.nameMax) || checkText(body, "area", 80);
  if (problem) return { error: problem };
  if (typeof body.password !== "string" || body.password.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }
  return { value: { name: body.name.trim(), area: body.area.trim(), password: body.password } };
}
