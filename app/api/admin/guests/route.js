import { db } from "@/lib/db";
import { isAdmin, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

const clean = (v, max) => String(v ?? "").trim().slice(0, max);

export async function GET() {
  if (!isAdmin()) return unauthorized();
  try {
    const pool = await db();
    const [rows] = await pool.query("SELECT id, name, table_number, seat_number FROM guests ORDER BY name");
    return Response.json({ guests: rows });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Database error: " + (e.sqlMessage || e.message) }, { status: 500 });
  }
}

export async function POST(req) {
  if (!isAdmin()) return unauthorized();
  const b = await req.json().catch(() => ({}));
  const name = clean(b.name, 255), table = clean(b.table_number, 50), seat = clean(b.seat_number, 20) || null;
  if (!name || !table) return Response.json({ error: "Name and table are required" }, { status: 400 });
  try {
    const pool = await db();
    const [r] = await pool.query("INSERT INTO guests (name, table_number, seat_number) VALUES (?, ?, ?)", [name, table, seat]);
    return Response.json({ id: r.insertId });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Database error: " + (e.sqlMessage || e.message) }, { status: 500 });
  }
}

// Delete ALL guests (requires confirm flag)
export async function DELETE(req) {
  if (!isAdmin()) return unauthorized();
  const b = await req.json().catch(() => ({}));
  if (b.confirm !== "DELETE") return Response.json({ error: "Confirmation missing" }, { status: 400 });
  try {
    const pool = await db();
    await pool.query("DELETE FROM guests");
    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Database error: " + (e.sqlMessage || e.message) }, { status: 500 });
  }
}
