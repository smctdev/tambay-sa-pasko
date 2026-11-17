"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";

const NAME_KEYS = ["name", "fullname", "guest", "guestname", "employee", "employeename", "pangalan"];
const TABLE_KEYS = ["table", "tableno", "tablenumber", "tablenum", "tbl", "no", "number", "seat", "mesa"];
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");

function parseMatrix(matrix) {
  matrix = matrix.filter((r) => r && r.some((c) => String(c).trim() !== ""));
  if (!matrix.length) return { rows: [], skipped: 0 };
  const head = matrix[0].map(norm);
  let ni = head.findIndex((h) => NAME_KEYS.includes(h));
  let ti = head.findIndex((h) => TABLE_KEYS.includes(h));
  let start = 1;
  if (ni === -1 || ti === -1) {
    ni = 0; ti = 1;
    start = /name|guest|pangalan/i.test(String(matrix[0][0])) ? 1 : 0;
  }
  const rows = []; let skipped = 0;
  for (let i = start; i < matrix.length; i++) {
    const name = String(matrix[i][ni] ?? "").trim();
    const table_number = String(matrix[i][ti] ?? "").trim();
    if (!name || !table_number) { skipped++; continue; }
    rows.push({ name, table_number });
  }
  return { rows, skipped };
}

function tblSort(a, b) {
  const na = parseFloat(a), nb = parseFloat(b);
  if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb;
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}

function download(name, text, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
}

export default function Admin() {
  const [authed, setAuthed] = useState(null);
  const [password, setPassword] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [guests, setGuests] = useState([]);
  const [filter, setFilter] = useState("");
  const [addName, setAddName] = useState("");
  const [addTable, setAddTable] = useState("");
  const [editing, setEditing] = useState(null);
  const [pending, setPending] = useState([]);
  const [preview, setPreview] = useState("");
  const [mode, setMode] = useState("append");
  const [busy, setBusy] = useState(false);
  const [qrUrl, setQrUrl] = useState("");
  const [qrImg, setQrImg] = useState("");
  const [toast, setToast] = useState(null);
  const fileRef = useRef(null);
  const toastTimer = useRef(null);

  const say = useCallback((msg, err = false) => {
    setToast({ msg, err });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  const api = useCallback(async (path, opts = {}) => {
    const res = await fetch(path, {
      ...opts,
      headers: { "Content-Type": "application/json" },
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && !path.includes("login")) setAuthed(false);
    if (!res.ok) throw new Error(data.error || "Server error (HTTP " + res.status + "). Check your Vercel/server logs and DATABASE_URL.");
    return data;
  }, []);

  const load = useCallback(async () => {
    try { setGuests((await api("/api/admin/guests")).guests); }
    catch (e) { say(e.message, true); }
  }, [api, say]);

  useEffect(() => {
    setQrUrl(window.location.origin + "/");
    fetch("/api/admin/session").then((r) => r.json()).then((d) => setAuthed(!!d.admin)).catch(() => setAuthed(false));
  }, []);
  useEffect(() => { if (authed) load(); }, [authed, load]);

  useEffect(() => {
    if (!qrUrl) return;
    QRCode.toDataURL(qrUrl, { width: 220, margin: 1, errorCorrectionLevel: "H", color: { dark: "#0d0d0d", light: "#ffffff" } })
      .then(setQrImg).catch(() => setQrImg(""));
  }, [qrUrl]);

  async function login(e) {
    e.preventDefault(); setLoginErr("");
    try { await api("/api/admin/login", { method: "POST", body: { password } }); setPassword(""); setAuthed(true); }
    catch (err) { setLoginErr(err.message); }
  }
  async function logout() { await api("/api/admin/logout", { method: "POST" }); setGuests([]); setAuthed(false); }

  async function add(e) {
    e.preventDefault();
    try {
      await api("/api/admin/guests", { method: "POST", body: { name: addName, table_number: addTable } });
      say("Added " + addName.trim()); setAddName(""); setAddTable(""); load();
    } catch (err) { say(err.message, true); }
  }
  async function saveEdit(e) {
    e.preventDefault();
    try {
      await api("/api/admin/guests/" + editing.id, { method: "PUT", body: { name: editing.name, table_number: editing.table_number } });
      setEditing(null); say("Saved"); load();
    } catch (err) { say(err.message, true); }
  }
  async function remove(g) {
    if (!confirm("Delete " + g.name + "?")) return;
    try { await api("/api/admin/guests/" + g.id, { method: "DELETE" }); say("Deleted"); load(); }
    catch (err) { say(err.message, true); }
  }
  async function wipe() {
    if (!guests.length) return;
    if (prompt("This deletes ALL " + guests.length + " guests. Type DELETE to confirm.") !== "DELETE") return;
    try { await api("/api/admin/guests", { method: "DELETE", body: { confirm: "DELETE" } }); say("All guests deleted"); load(); }
    catch (err) { say(err.message, true); }
  }

  async function onFile(e) {
    const f = e.target.files[0];
    setPending([]); setPreview("");
    if (!f) return;
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await f.arrayBuffer(), { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false });
      const { rows, skipped } = parseMatrix(matrix);
      setPending(rows);
      setPreview(rows.length
        ? `Ready: ${rows.length} guests${skipped ? ` (${skipped} incomplete rows skipped)` : ""}. Sample: ` +
          rows.slice(0, 3).map((r) => `${r.name} → ${r.table_number}`).join("  |  ")
        : "No valid rows found. Need columns: Name, Table.");
    } catch (err) { setPreview("Couldn't read that file: " + err.message); }
  }
  async function doImport() {
    if (!pending.length) return;
    if (mode === "replace" && !confirm(`Replace ALL existing guests with these ${pending.length}?`)) return;
    setBusy(true);
    try {
      const r = await api("/api/admin/import", { method: "POST", body: { rows: pending, mode } });
      say("Imported " + r.imported + " guests");
      setPending([]); setPreview(""); if (fileRef.current) fileRef.current.value = "";
      load();
    } catch (err) { say(err.message, true); }
    setBusy(false);
  }

  const sortedExport = () =>
    [...guests].sort((a, b) => tblSort(a.table_number, b.table_number) || a.name.localeCompare(b.name))
      .map((g) => ({ Name: g.name, Table: g.table_number }));
  async function exportAs(kind) {
    if (!guests.length) return say("No guests to export", true);
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet(sortedExport());
    if (kind === "csv") download("tambay-sa-pasko-guests.csv", "﻿" + XLSX.utils.sheet_to_csv(ws), "text/csv;charset=utf-8");
    else { const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Guests"); XLSX.writeFile(wb, "tambay-sa-pasko-guests.xlsx"); }
  }
  async function downloadQr() {
    if (!qrUrl) return;
    const url = await QRCode.toDataURL(qrUrl, { width: 1024, margin: 2, errorCorrectionLevel: "H" });
    const a = document.createElement("a"); a.href = url; a.download = "tambay-sa-pasko-qr.png";
    document.body.appendChild(a); a.click(); a.remove();
  }

  const stats = useMemo(() => {
    const c = {};
    guests.forEach((g) => { const k = String(g.table_number).trim().toLowerCase(); c[k] = (c[k] || 0) + 1; });
    const v = Object.values(c);
    return { guests: guests.length, tables: v.length, big: v.length ? Math.max(...v) : 0 };
  }, [guests]);

  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return guests.filter((g) => !q || g.name.toLowerCase().includes(q) || String(g.table_number).toLowerCase().includes(q));
  }, [guests, filter]);

  const tape = ["SMCT Admin", "Tambay sa Pasko 2026", "Guest list control"];

  return (
    <>
      <div className="tape" aria-hidden="true">
        <div className="tape-track">{[...tape, ...tape].map((t, i) => <span key={i}>{t}</span>)}</div>
      </div>

      {authed === null && <main className="admin-wrap"><div className="empty">Loading...</div></main>}

      {authed === false && (
        <main className="admin-wrap">
          <div className="panel login-card">
            <h2>Admin Login</h2>
            <form onSubmit={login}>
              <div style={{ marginBottom: ".9rem" }}>
                <label className="lbl" htmlFor="pw">Password</label>
                <input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" autoFocus />
              </div>
              <button className="btn red" style={{ width: "100%" }} type="submit">Enter</button>
              {loginErr && <p className="hint" style={{ color: "var(--red)", margin: ".7rem 0 0", fontWeight: 700 }}>{loginErr}</p>}
            </form>
          </div>
        </main>
      )}

      {authed && (
        <main className="admin-wrap">
          <div className="admin-head">
            <h1><span>SMCT PRESENTS</span>TAMBAY SA PASKO<br />ADMIN</h1>
            <div className="row-gap">
              <a className="btn ghost small" href="/" target="_blank" rel="noopener">View guest page</a>
              <button className="btn small" onClick={logout}>Log out</button>
            </div>
          </div>

          <div className="stats">
            <div className="stat"><b>{stats.guests}</b><span>Guests</span></div>
            <div className="stat"><b>{stats.tables}</b><span>Tables</span></div>
            <div className="stat"><b>{stats.big}</b><span>Biggest table</span></div>
          </div>

          <section className="panel">
            <h2>One QR for everyone</h2>
            <p className="hint">Put this QR on posters, tickets and screens. Everyone scans the same code. Set the URL to your live website address.</p>
            <div className="qr-box">
              <div id="qrcode">{qrImg && <img src={qrImg} width="220" height="220" alt="QR code for the guest page" />}</div>
              <div style={{ flex: "1 1 260px" }}>
                <label className="lbl" htmlFor="qrUrl">Guest page URL</label>
                <input type="text" id="qrUrl" value={qrUrl} onChange={(e) => setQrUrl(e.target.value)} />
                <div className="row-gap" style={{ marginTop: ".7rem" }}>
                  <button className="btn neon small" onClick={downloadQr}>Download QR (PNG)</button>
                </div>
              </div>
            </div>
          </section>

          <section className="panel">
            <h2>Add guest</h2>
            <form className="field-row" onSubmit={add}>
              <div><label className="lbl" htmlFor="addName">Full name</label><input type="text" id="addName" value={addName} onChange={(e) => setAddName(e.target.value)} required placeholder="Juan Dela Cruz" /></div>
              <div><label className="lbl" htmlFor="addTable">Table number</label><input type="text" id="addTable" value={addTable} onChange={(e) => setAddTable(e.target.value)} required placeholder="8" /></div>
              <button className="btn green" type="submit" style={{ alignSelf: "flex-end" }}>Add</button>
            </form>
          </section>

          <section className="panel">
            <h2>Import &amp; export</h2>
            <p className="hint">Upload a <b>.csv</b> or <b>.xlsx</b> file with two columns: <b>Name</b> and <b>Table</b>. The first row should be the header.</p>
            <div className="drop">
              <input type="file" ref={fileRef} accept=".csv,.xlsx,.xls" onChange={onFile} />
              <div className="preview">{preview}</div>
              {pending.length > 0 && (
                <div className="row-gap" style={{ justifyContent: "center", marginTop: ".7rem" }}>
                  <select value={mode} onChange={(e) => setMode(e.target.value)} style={{ width: "auto" }}>
                    <option value="append">Add to existing guests</option>
                    <option value="replace">Replace ALL existing guests</option>
                  </select>
                  <button className="btn red" onClick={doImport} disabled={busy}>{busy ? "Importing..." : "Import now"}</button>
                </div>
              )}
            </div>
            <div className="row-gap" style={{ marginTop: ".9rem" }}>
              <button className="btn ghost small" onClick={() => download("guest-template.csv", "Name,Table\nJuan Dela Cruz,1\nMaria Santos,1\nPedro Reyes,2\n", "text/csv")}>Download CSV template</button>
              <button className="btn ghost small" onClick={() => exportAs("csv")}>Export CSV</button>
              <button className="btn ghost small" onClick={() => exportAs("xlsx")}>Export Excel</button>
            </div>
          </section>

          <section className="panel">
            <h2>Guest list</h2>
            <div className="field-row" style={{ marginBottom: ".7rem" }}>
              <input type="search" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter by name or table..." />
              <button className="btn red small" onClick={wipe} style={{ flex: "0 0 auto" }}>Delete all</button>
            </div>
            <div className="table-scroll">
              <table className="guests">
                <thead><tr><th>Name</th><th>Table</th><th style={{ textAlign: "right" }}>Actions</th></tr></thead>
                <tbody>
                  {shown.map((g) => (
                    <tr key={g.id}>
                      <td>{g.name}</td>
                      <td className="tbl">{g.table_number}</td>
                      <td className="actions">
                        <button className="btn small ghost" onClick={() => setEditing({ ...g })}>Edit</button>
                        <button className="btn small red" onClick={() => remove(g)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {shown.length === 0 && <div className="empty">No guests yet. Add one or import a file.</div>}
            </div>
          </section>
        </main>
      )}

      <div className={"modal-bg" + (editing ? " show" : "")} onClick={(e) => { if (e.target === e.currentTarget) setEditing(null); }}>
        {editing && (
          <form className="modal" onSubmit={saveEdit}>
            <h3>Edit guest</h3>
            <div className="field-row"><div><label className="lbl" htmlFor="eN">Full name</label><input type="text" id="eN" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required autoFocus /></div></div>
            <div className="field-row"><div><label className="lbl" htmlFor="eT">Table number</label><input type="text" id="eT" value={editing.table_number} onChange={(e) => setEditing({ ...editing, table_number: e.target.value })} required /></div></div>
            <div className="row-gap"><button className="btn green" type="submit">Save</button><button className="btn ghost" type="button" onClick={() => setEditing(null)}>Cancel</button></div>
          </form>
        )}
      </div>

      <div className={"toast" + (toast ? " show" : "") + (toast?.err ? " err" : "")} role="status">{toast?.msg}</div>
    </>
  );
}
