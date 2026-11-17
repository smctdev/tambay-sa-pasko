import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Public: names of the OTHER guests at the same table (names only, no seat numbers).
// GET /api/table?table=8&name=Juan%20Dela%20Cruz
export async function GET(req) {
  const sp = new URL(req.url).searchParams;
  const table = (sp.get("table") || "").trim().slice(0, 50);
  const me = (sp.get("name") || "").trim().slice(0, 255);
  if (!table) return Response.json({ names: [] });
  try {
    const pool = await db();
    const [rows] = await pool.query(
      "SELECT name FROM guests WHERE table_number = ? AND name <> ? ORDER BY name LIMIT 50",
      [table, me]
    );
    return Response.json({ names: rows.map((r) => r.name) });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Database error" }, { status: 500 });
  }
}