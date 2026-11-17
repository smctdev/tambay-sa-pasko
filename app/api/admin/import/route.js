
import { db } from "@/lib/db";
import { isAdmin, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req) {
  if (!isAdmin()) return unauthorized();

  const b = await req.json().catch(() => ({}));
  const mode = b.mode === "replace" ? "replace" : "append";

  const rows = (Array.isArray(b.rows) ? b.rows : [])
    .map((r) => [
      String(r.name ?? "").trim().slice(0, 255),
      String(r.table_number ?? "").trim().slice(0, 50),
      String(r.seat_number ?? "").trim().slice(0, 20) || null,
    ])
    .filter((r) => r[0] && r[1]);

  if (!rows.length) {
    return Response.json(
      { error: "No valid rows" },
      { status: 400 }
    );
  }

  if (rows.length > 5000) {
    return Response.json(
      { error: "Max 5000 rows per import" },
      { status: 400 }
    );
  }

  let conn;

  try {
    const pool = await db();
    conn = await pool.getConnection();

    await conn.beginTransaction();

    if (mode === "replace") {
      await conn.query("DELETE FROM guests");
    }

    let newRows = rows;
    let skipped = 0;

    if (mode === "append") {
      // Remove duplicate names inside uploaded file
      const seen = new Set();

      newRows = newRows.filter((row) => {
        const key = row[0].toLowerCase();

        if (seen.has(key)) return false;

        seen.add(key);
        return true;
      });

      skipped += rows.length - newRows.length;

      // Check existing guest names in database
      const names = newRows.map((r) => r[0]);

      const [existing] = await conn.query(
        `SELECT name
         FROM guests
         WHERE LOWER(TRIM(name)) IN (${names.map(() => "?").join(",")})`,
        names
      );

      const existingNames = new Set(
        existing.map((r) => r.name.trim().toLowerCase())
      );

      const before = newRows.length;

      newRows = newRows.filter(
        (row) => !existingNames.has(row[0].toLowerCase())
      );

      skipped += before - newRows.length;
    }

    // Insert only new guest records
    for (let i = 0; i < newRows.length; i += 500) {
      await conn.query(
        "INSERT INTO guests (name, table_number, seat_number) VALUES ?",
        [newRows.slice(i, i + 500)]
      );
    }

    await conn.commit();

    return Response.json({
      success: true,
      imported: newRows.length,
      skipped,
      mode,
      message: `${newRows.length} new guests saved. ${skipped} existing or duplicate guests skipped.`,
    });

  } catch (e) {
    if (conn) await conn.rollback().catch(() => {});

    console.error(e);

    return Response.json(
      {
        error: "Import failed: " + (e.sqlMessage || e.message),
      },
      { status: 500 }
    );

  } finally {
    if (conn) conn.release();
  }
}
