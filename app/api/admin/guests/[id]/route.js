import { db } from "@/lib/db";
import { isAdmin, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

const clean = (v, max) => String(v ?? "").trim().slice(0, max);

export async function PUT(req, { params }) {
  if (!isAdmin()) return unauthorized();
  const id = Number(params.id);
  const b = await req.json().catch(() => ({}));
  const name = clean(b.name, 255), table = clean(b.table_number, 50);
  if (!id || !name || !table) return Response.json({ error: "Invalid data" }, { status: 400 });
  try {
    const pool = await db();
    await pool.query("UPDATE guests SET name = ?, table_number = ? WHERE id = ?", [name, table, id]);
    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Database error: " + (e.sqlMessage || e.message) }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  if (!isAdmin()) return unauthorized();
  const id = Number(params.id);
  if (!id) return Response.json({ error: "Invalid id" }, { status: 400 });
  try {
    const pool = await db();
    await pool.query("DELETE FROM guests WHERE id = ?", [id]);
    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Database error: " + (e.sqlMessage || e.message) }, { status: 500 });
  }
}
