// Creates the database named in DB_NAME and loads database/schema.sql and database/seed.sql into it.
// Usage: npm run init-db            (uses DB_NAME from .env, default "pharmalink")
//        DB_NAME=pharmalink_test npm run init-db
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

const here = path.dirname(fileURLToPath(import.meta.url));
const databaseDir = path.join(here, "..", "..", "database");

function readSql(file) {
  // The SQL files start with "CREATE DATABASE pharmalink; USE pharmalink;" so they can be pasted
  // into MySQL Workbench. Drop those lines here so the script can load any database name.
  return fs
    .readFileSync(path.join(databaseDir, file), "utf8")
    .split("\n")
    .filter((line) => !/^\s*(CREATE DATABASE|USE)\b/i.test(line))
    .join("\n");
}

export async function initDb(dbName = process.env.DB_NAME || "pharmalink") {
  if (!/^[A-Za-z0-9_]+$/.test(dbName)) throw new Error("DB_NAME may only contain letters, digits and _");
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    multipleStatements: true
  });
  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await conn.query(`USE \`${dbName}\``);
    await conn.query(readSql("schema.sql"));
    await conn.query(readSql("seed.sql"));
  } finally {
    await conn.end();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  dotenv.config();
  initDb()
    .then(() => console.log(`Database "${process.env.DB_NAME || "pharmalink"}" created and seeded.`))
    .catch((err) => {
      console.error("Could not set up the database:", err.message);
      process.exit(1);
    });
}
