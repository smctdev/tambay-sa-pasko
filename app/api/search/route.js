import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const esc = (s) => s.replace(/[\\%_]/g, (m) => "\\" + m);

// Public: returns name + table only, min 2 chars, max 10 results.
export async function GET(req) {
  const q = (new URL(req.url).searchParams.get("q") || "").trim().slice(0, 80);
  if (q.length < 2) return Response.json({ results: [] });
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6);
  try {
    const pool = await db();
    const where = tokens.map(() => "name LIKE ?").join(" AND ");
    const params = tokens.map((t) => `%${esc(t)}%`);
    const [rows] = await pool.query(
      `SELECT name, table_number, seat_number FROM guests WHERE ${where} ORDER BY name LIMIT 10`,
      params
    );
    return Response.json({ results: rows });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Database error: " + (e.sqlMessage || e.message) }, { status: 500 });
  }
}
