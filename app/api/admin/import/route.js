import { db } from "@/lib/db";
import { isAdmin, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req) {
  if (!isAdmin()) return unauthorized();
  const b = await req.json().catch(() => ({}));
  const mode = b.mode === "replace" ? "replace" : "append";
  const rows = (Array.isArray(b.rows) ? b.rows : [])
    .map((r) => [String(r.name ?? "").trim().slice(0, 255), String(r.table_number ?? "").trim().slice(0, 50)])
    .filter((r) => r[0] && r[1]);
  if (!rows.length) return Response.json({ error: "No valid rows" }, { status: 400 });
  if (rows.length > 5000) return Response.json({ error: "Max 5000 rows per import" }, { status: 400 });

  let conn;
  try {
    const pool = await db();
    conn = await pool.getConnection();
    await conn.beginTransaction();
    if (mode === "replace") await conn.query("DELETE FROM guests");
    for (let i = 0; i < rows.length; i += 500) {
      await conn.query("INSERT INTO guests (name, table_number) VALUES ?", [rows.slice(i, i + 500)]);
    }
    await conn.commit();
    return Response.json({ imported: rows.length });
  } catch (e) {
    if (conn) await conn.rollback().catch(() => {});
    console.error(e);
    return Response.json({ error: "Import failed: " + (e.sqlMessage || e.message) }, { status: 500 });
  } finally {
    if (conn) conn.release();
  }
}
