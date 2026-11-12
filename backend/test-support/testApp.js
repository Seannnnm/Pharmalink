// Shared setup for the test suites: a separate database (pharmalink_test by default),
// reset to the seed data whenever resetDb() is called, so tests never touch real data.
import request from "supertest";
import { createApp } from "../app.js";
import { createPool } from "../db.js";
import { initDb } from "../scripts/init-db.js";

export const TEST_KEY = "test-key-for-jest";

// Like request(app), but every call sends a valid X-API-Key header.
export function withKey(app, key = TEST_KEY) {
  const methods = ["get", "post", "put", "patch", "delete"];
  return Object.fromEntries(methods.map((m) => [m, (url) => request(app)[m](url).set("X-API-Key", key)]));
}

export const TEST_DB = process.env.TEST_DB_NAME || "pharmalink_test";

export async function makeTestApp() {
  await initDb(TEST_DB);
  const pool = createPool({ database: TEST_DB });
  const app = createApp({ pool, apiKeys: [TEST_KEY], rateLimitMax: 100000 });
  return { app, pool, resetDb: () => initDb(TEST_DB) };
}
