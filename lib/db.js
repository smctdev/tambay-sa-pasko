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
    ready = (async () => {
      await p.query(`CREATE TABLE IF NOT EXISTS guests (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        table_number VARCHAR(50) NOT NULL,
        seat_number VARCHAR(20) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_guests_name (name),
        INDEX idx_guests_table (table_number)
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      // Older installs: add the seat column if it's missing
      const [c] = await p.query(
        "SELECT COUNT(*) AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'guests' AND COLUMN_NAME = 'seat_number'"
      );
      if (!c[0].n) await p.query("ALTER TABLE guests ADD COLUMN seat_number VARCHAR(20) NULL AFTER table_number");
    })().catch((e) => { console.error("Auto-setup skipped:", e.message); });
    globalThis.__smctReady = ready;
  }
  await ready;
  return p;
}
