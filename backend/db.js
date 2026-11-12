import mysql from "mysql2/promise";

export function createPool(overrides = {}) {
  return mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "pharmalink",
    waitForConnections: true,
    connectionLimit: 10,
    decimalNumbers: true,
    ...overrides
  });
}
