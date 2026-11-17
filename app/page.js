"use client";

import { useEffect, useRef, useState } from "react";

const COLORS = ["#b3141f", "#c8ff2e", "#1d4a33", "#ff4fd8", "#ebe6da"];

function formatSeat(v) {
  v = String(v ?? "").trim();
  if (!v) return "";
  if (/^\d+$/.test(v)) return "SEAT " + v.padStart(2, "0");
  if (/^(chair|seat)\b/i.test(v)) return v.toUpperCase();
  return "CHAIR " + v.toUpperCase();
}

function formatTable(v) {
  v = String(v).trim();
  if (/^\d+$/.test(v)) return "TABLE " + v.padStart(2, "0");
  if (/^table\b/i.test(v)) return v.toUpperCase();
  return "TABLE " + v.toUpperCase();
}

export default function Home() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null); // null = nothing yet
  const [picked, setPicked] = useState(null);
  const [error, setError] = useState("");
  const [bulbs, setBulbs] = useState(10);
  const [mates, setMates] = useState(null); // names of the other guests at the same table
  const seq = useRef(0);
  const input = useRef(null);
  const revealRef = useRef(null);

  useEffect(() => { setBulbs(Math.max(8, Math.floor(window.innerWidth / 48))); }, []);

  useEffect(() => {
    const term = q.trim();
    setPicked(null);
    setError("");
    if (term.length < 2) { setResults(null); return; }
    const mine = ++seq.current;
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/search?q=" + encodeURIComponent(term));
        const data = await res.json();
        if (mine !== seq.current) return;
        if (!res.ok) { setError("Naay problema sa connection. Try again!"); setResults(null); return; }
        setResults(data.results);
      } catch {
        if (mine === seq.current) { setError("Naay problema sa connection. Try again!"); setResults(null); }
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (picked && revealRef.current) revealRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [picked]);

  // when a guest is picked, load who else sits at the same table
  useEffect(() => {
    setMates(null);
    if (!picked) return;
    let cancelled = false;
    fetch("/api/table?table=" + encodeURIComponent(picked.table_number) + "&name=" + encodeURIComponent(picked.name))
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setMates(Array.isArray(d.names) ? d.names : []); })
      .catch(() => { if (!cancelled) setMates([]); });
    return () => { cancelled = true; };
  }, [picked]);

  const reset = () => { setQ(""); setResults(null); setPicked(null); input.current?.focus(); };
  const tape = ["SMCT Presents", "Tambay sa Pasko", "SMCT Christmas Party 2026", "Lingaw ta", "Walay stress", "Tambay lang"];

  return (
    <>
      <div className="tape" aria-hidden="true">
        <div className="tape-track">
          {[...tape, ...tape].map((t, i) => <span key={i}>{t}</span>)}
        </div>
      </div>

      <div className="lights" aria-hidden="true">
        {Array.from({ length: bulbs }).map((_, i) => (
          <span key={i} className="bulb" style={{ "--c": COLORS[i % COLORS.length], "--d": ((i * 0.37) % 2.4) + "s" }} />
        ))}
      </div>

      <header className="hero">
        <svg className="sticker star" viewBox="0 0 100 100" aria-hidden="true">
          <polygon points="50,4 62,36 96,38 69,59 79,93 50,73 21,93 31,59 4,38 38,36" fill="#c8ff2e" stroke="#0d0d0d" strokeWidth="5" strokeLinejoin="round" />
          <text x="50" y="58" textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize="20" fill="#0d0d0d">PASKO</text>
        </svg>

        <span className="presents">SMCT PRESENTS</span>
        <h1 className="title">TAMBAY<span className="t2">SA PASKO</span></h1>
        <p className="subtitle-tag"><b>CHRISTMAS PARTY</b><i>2026</i></p>

        {/* <div className="round-sticker" aria-hidden="true">NICE LIST<br />✔<br />NAKIT-AN</div> */}

        <svg className="sticker sneaker" viewBox="0 0 260 150" aria-hidden="true">
          <path d="M12 104 C12 70 30 52 52 50 L82 24 C92 14 108 14 118 26 L132 46 C150 56 196 60 232 82 C248 92 250 112 240 122 L22 122 C14 122 12 114 12 104Z" fill="#b3141f" stroke="#0d0d0d" strokeWidth="6" strokeLinejoin="round" />
          <path d="M14 108 L244 108 L240 130 C238 136 232 138 226 138 L30 138 C20 138 14 132 14 124Z" fill="#ebe6da" stroke="#0d0d0d" strokeWidth="6" strokeLinejoin="round" />
          <path d="M52 50 C74 56 92 62 104 80 C112 92 130 100 160 102" fill="none" stroke="#0d0d0d" strokeWidth="5" strokeLinecap="round" />
          <path d="M100 30 L112 44 M118 40 L128 52 M130 52 L140 62" stroke="#ebe6da" strokeWidth="6" strokeLinecap="round" />
          <path d="M150 86 L226 92" stroke="#1d4a33" strokeWidth="9" strokeLinecap="round" />
          <circle cx="40" cy="80" r="8" fill="#c8ff2e" stroke="#0d0d0d" strokeWidth="4" />
        </svg>
      </header>

      <main className="search-zone">
        <section className="street-sign" aria-labelledby="q">
          <p className="small">Guest Seating • Street Directory</p>
          <h2 className="big-q" id="q">ASA IMONG <em>TAMBAY?</em></h2>
          <p className="lead">Search your name, and find your table!</p>
        </section>

        <div className="search-wrap">
          <span className="search-label">SEARCH</span>
          <form className="search-box" role="search" autoComplete="off" onSubmit={(e) => { e.preventDefault(); input.current?.blur(); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#0d0d0d" strokeWidth="3.2" strokeLinecap="round" aria-hidden="true"><circle cx="10" cy="10" r="6.5" /><path d="M15 15l6 6" /></svg>
            <input
              ref={input}
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search your name here..."
              aria-label="Search your name"
              enterKeyHint="search"
              autoCapitalize="words"
              spellCheck={false}
            />
            <button type="button" className={"search-clear" + (q ? " show" : "")} aria-label="Clear search" onClick={reset}>×</button>
          </form>
        </div>

        <div aria-live="polite">
          {error && <div className="msg err">{error}</div>}

          {!picked && results && results.length === 0 && (
            <div className="msg">Wala nakit-i ang imong ngalan. Try a different spelling or ask the registration desk.</div>
          )}

          {!picked && results && results.length > 0 && (
            <ul className="results">
              {results.map((g, i) => (
                <li key={g.name + i}>
                  <button type="button" className="result-btn" style={{ animationDelay: i * 40 + "ms" }} onClick={() => setPicked(g)}>
                    <span>{g.name}</span><span className="go">TAP →</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {picked && (
            <div className="reveal" ref={revealRef}>
              <div className="guest-name">{picked.name}</div>
              <div className="spot-label">YOUR TAMBAY SPOT</div>
              <div className="table-no">{formatTable(picked.table_number)}</div>
              {picked.seat_number ? <div className="seat-no">{formatSeat(picked.seat_number)}</div> : null}
              {mates && mates.length > 0 && (
                <div className="mates">
                  <div className="mates-title">AT YOUR TABLE</div>
                  <p className="mates-names">{mates.join(", ")}</p>
                </div>
              )}
              <button className="again" type="button" onClick={reset}>← Search again</button>
            </div>
          )}
        </div>
      </main>

      <footer className="closing">
        <p>LINGAW TA! <span>TAMBAY LANG</span> SA PASKO! 🎄</p>
        <small>SMCT CHRISTMAS PARTY 2026 • December 18, 2026 • 6:00 PM• Sacred Heart Village, J.A. Clarin St., Cogon District, Tagbilaran City</small>
      </footer>
    </>
  );
}