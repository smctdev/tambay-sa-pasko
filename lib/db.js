import mysql from "mysql2/promise";

let pool = globalThis.__smctPool;
let ready = globalThis.__smctReady;

function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
    const url = new URL(process.env.DATABASE_URL);
    pool = mysql.createPool({
      host: url.hostname,
      port: Number(url.port || 3306),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, ""),
      ssl: process.env.DATABASE_SSL === "true" ? { minVersion: "TLSv1.2", rejectUnauthorized: true } : undefined,
      waitForConnections: true,
      connectionLimit: 5,
      charset: "utf8mb4"
    });
    globalThis.__smctPool = pool;
  }
  return pool;
}

export async function db() {
  const p = getPool();
  if (!ready) {
    ready = p.query(`CREATE TABLE IF NOT EXISTS guests (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      table_number VARCHAR(50) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_guests_name (name),
      INDEX idx_guests_table (table_number)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`).catch((e) => { console.error("Auto-create table skipped:", e.message); });
    globalThis.__smctReady = ready;
  }
  await ready;
  return p;
}
