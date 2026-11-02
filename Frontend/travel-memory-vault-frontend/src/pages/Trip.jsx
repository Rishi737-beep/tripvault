import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { fmt, fmtDate, toMinor } from "../money";
import { Cover } from "../cover.jsx";
import { looksLikeImage } from "../image.js";
import Gallery from "../photos.jsx";

const CATS = ["HOTEL", "FOOD", "TRANSPORT", "SHOPPING", "OTHER"];
const COLOR = { HOTEL: "#6c4cff", FOOD: "#ff7a45", TRANSPORT: "#12b5cb", SHOPPING: "#ff3d81", OTHER: "#8b93a7" };
const ICON = {
  HOTEL: "M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7M3 15h18M7 9V7a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2",
  FOOD: "M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 2-3 5-3 8h3v10",
  TRANSPORT: "M5 16l1.5-5a2 2 0 0 1 1.9-1.5h7.2a2 2 0 0 1 1.9 1.5L19 16M4 16h16v3H4zM7.5 19v1.5M16.5 19v1.5",
  SHOPPING: "M6 8h12l1 12H5L6 8zM9 8a3 3 0 0 1 6 0",
  OTHER: "M5 12h.01M12 12h.01M19 12h.01",
};
const blank = { category: "FOOD", amount: "", description: "", date: "" };
const MAX_PHOTO = 3 * 1024 * 1024;

const ms = (s) => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); };
const span = (a, b) => Math.max(1, Math.round((ms(b) - ms(a)) / 864e5) + 1);

function useCount(target) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setV(target); return; }
    let raf, start;
    const step = (now) => {
      start ??= now;
      const p = Math.min((now - start) / 700, 1);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return v;
}

function Icon({ cat }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d={ICON[cat] || ICON.OTHER} /></svg>;
}

function Donut({ parts, total, pct }) {
  const R = 52, C = 2 * Math.PI * R;
  let off = 0;
  return (
    <svg viewBox="0 0 140 140" className="donut" role="img" aria-label={`Spending by category, ${pct}% of budget used`}>
      <g transform="rotate(-90 70 70)">
        <circle cx="70" cy="70" r={R} className="ring" />
        {parts.map((p) => {
          const len = total ? (p.v / total) * C : 0;
          const el = <circle key={p.k} cx="70" cy="70" r={R} className="seg" stroke={COLOR[p.k]} strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off} />;
          off += len;
          return el;
        })}
      </g>
      <text x="70" y="68" textAnchor="middle" className="d-num">{pct}%</text>
      <text x="70" y="86" textAnchor="middle" className="d-lbl">used</text>
    </svg>
  );
}

export default function Trip() {
  const { tripId } = useParams();
  const [trip, setTrip] = useState(null);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [f, setF] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [local, setLocal] = useState(null);
  const fileRef = useRef(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    let live = true;
    Promise.all([api.trip(tripId), api.expenses(tripId)])
      .then(([t, x]) => { if (live) { setTrip(t); setItems(Array.isArray(x) ? x : []); } })
      .catch((e) => live && setErr(e.message));
    return () => { live = false; };
  }, [tripId]);
  useEffect(() => () => { if (local) URL.revokeObjectURL(local); }, [local]);

  const m = useMemo(() => {
    const budget = trip ? toMinor(trip.budget) : 0;
    const spent = items.reduce((a, x) => a + toMinor(x.amount), 0);
    const byCat = CATS.map((k) => ({ k, v: items.filter((x) => x.category === k).reduce((a, x) => a + toMinor(x.amount), 0) })).filter((p) => p.v > 0);
    const days = trip ? span(trip.startDate, trip.endDate) : 1;
    const dates = new Set(items.map((x) => x.date));
    const groups = {};
    items.forEach((x) => { (groups[x.date] ||= []).push(x); });
    const top = [...byCat].sort((a, b) => b.v - a.v)[0];
    return { budget, spent, left: budget - spent, pct: budget ? (spent / budget) * 100 : 0, byCat, days, activeDays: Math.max(dates.size, 1), groups, top };
  }, [trip, items]);
  const leftAnim = useCount(m.left);

  async function add(e) {
    e.preventDefault();
    setErr("");
    if (!(Number(f.amount) > 0)) return setErr("Amount must be more than zero.");
    if (!f.date) return setErr("Pick a date.");
    setBusy(true);
    try {
      const x = await api.addExpense(tripId, { ...f, amount: Number(f.amount), description: f.description.trim() });
      setItems((p) => [x, ...p]); setF(blank);
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  }

  async function remove(x) {
    if (!window.confirm("Delete this expense?")) return;
    try { await api.deleteExpense(tripId, x.id); setItems((p) => p.filter((i) => i.id !== x.id)); }
    catch (ex) { setErr(ex.message); }
  }

  async function pickCover(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr(""); setNote("");
    if (file.size > MAX_PHOTO) return setErr("Photo must be under 3 MB.");
    if (!(await looksLikeImage(file))) return setErr("Use a JPG, PNG or WebP image.");
    setLocal(URL.createObjectURL(file));
    try {
      const updated = await api.uploadCover(tripId, file);
      setTrip((prev) => ({
        ...prev,
        ...(updated || {}),
        hasCover: true,
        coverUpdatedAt: Date.now(),
      }));
      setNote("Cover saved.");
    } catch (ex) {
      setLocal(null);
      setErr(ex.message || "Failed to save cover image.");
    }
  }

  function exportPdf() {
    const prev = document.title;
    document.title = `${trip.destination} trip report`; // becomes the default PDF file name
    const done = () => { document.title = prev; window.removeEventListener("afterprint", done); };
    window.addEventListener("afterprint", done);
    window.print();
  }

  if (!trip) return err ? <p className="msg err" role="alert">{err}</p> : <div className="skeleton tall" />;
  const cur = trip.currency;
  const over = m.left < 0;
  const pct = Math.round(m.pct);
  const state = m.pct > 100 ? ["Over budget", "bad"] : m.pct >= 70 ? ["Watch spending", "warn"] : ["On track", "good"];
  const days = Object.keys(m.groups).sort();

  return (
    <>
      <div className="toolbar">
        <Link to="/" className="back">← All trips</Link>
        <button type="button" className="ghost" onClick={exportPdf}>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19h14" /></svg>
          Export PDF
        </button>
      </div>
      <Cover trip={trip} local={local} hero>
        <span className="chip">{m.days} {m.days === 1 ? "DAY" : "DAYS"}</span>
        <span className="pass-body">
          <strong>{trip.destination}</strong>
          <small>{fmtDate(trip.startDate)} → {fmtDate(trip.endDate)}</small>
        </span>
        <button type="button" className="cover-btn" onClick={() => fileRef.current?.click()}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-2h6l2 2h3v11H4zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" /></svg>
          {local || trip.hasCover ? "Change cover" : "Add cover photo"}
        </button>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={pickCover} hidden />
      </Cover>
      {trip.description && <p className="desc">{trip.description}</p>}
      {note && <p className="msg ok" role="status">{note}</p>}
      {err && <p className="msg err" role="alert">{err}</p>}

      <section className="panel money" aria-label="Budget summary">
        <div className="money-main">
          <div className="row-between"><span className="label">Left to spend</span><span className={`badge ${state[1]}`}>{state[0]}</span></div>
          <p className={`big${over ? " neg" : ""}`}>{fmt(leftAnim, cur)}</p>
          <p className="sub">{fmt(m.spent, cur)} spent of {fmt(m.budget, cur)}</p>
          <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100">
            <i style={{ width: `${Math.min(m.pct, 100)}%` }} className={state[1]} />
          </div>
        </div>
        <div className="money-chart">
          <Donut parts={m.byCat} total={m.spent} pct={pct} />
          <ul className="legend">
            {m.byCat.length === 0 && <li className="muted">No spending yet</li>}
            {m.byCat.map((p) => <li key={p.k}><i style={{ background: COLOR[p.k] }} />{p.k[0] + p.k.slice(1).toLowerCase()}<b>{fmt(p.v, cur)}</b></li>)}
          </ul>
        </div>
        <div className="tiles">
          <div><span>Daily budget</span><b>{fmt(Math.round(m.budget / m.days), cur)}</b></div>
          <div><span>Avg per active day</span><b>{fmt(Math.round(m.spent / m.activeDays), cur)}</b></div>
          <div><span>Top category</span><b>{m.top ? `${m.top.k[0] + m.top.k.slice(1).toLowerCase()} · ${Math.round((m.top.v / m.spent) * 100)}%` : "—"}</b></div>
        </div>
      </section>

      <Gallery tripId={tripId} />

      <form className="panel noprint" onSubmit={add} noValidate>
        <h2>Add expense</h2>
        <div className="cats" role="radiogroup" aria-label="Category">
          {CATS.map((c) => (
            <button type="button" key={c} role="radio" aria-checked={f.category === c} className={f.category === c ? "on" : ""}
              style={{ "--c": COLOR[c] }} onClick={() => setF({ ...f, category: c })}>
              <Icon cat={c} />{c[0] + c.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <div className="grid2">
          <div className="field"><label htmlFor="x-amt">Amount ({cur})</label>
            <input id="x-amt" type="number" min="0.01" step="0.01" inputMode="decimal" value={f.amount} onChange={set("amount")} /></div>
          <div className="field"><label htmlFor="x-date">Date</label>
            <input id="x-date" type="date" value={f.date} min={trip.startDate} max={trip.endDate} onChange={set("date")} /></div>
        </div>
        <div className="field"><label htmlFor="x-what">What for</label>
          <input id="x-what" value={f.description} maxLength={120} onChange={set("description")} /></div>
        <button className="btn" disabled={busy}>{busy ? "Adding…" : "Add expense"}</button>
      </form>

      <h2 className="sec">Timeline</h2>
      {days.length === 0 && <div className="empty"><b>Nothing logged yet.</b><span>Add your first expense above.</span></div>}
      {days.map((d) => {
        const list = m.groups[d];
        const sub = list.reduce((a, x) => a + toMinor(x.amount), 0);
        return (
          <section key={d} className="day">
            <header><span><b>Day {span(trip.startDate, d)}</b> · {fmtDate(d)}</span><span>{fmt(sub, cur)}</span></header>
            <ul>
              {list.map((x) => (
                <li key={x.id}>
                  <span className="ico" style={{ "--c": COLOR[x.category] || COLOR.OTHER }}><Icon cat={x.category} /></span>
                  <span className="what">{x.description || x.category}<small>{x.category}</small></span>
                  <b className="num">{fmt(toMinor(x.amount), cur)}</b>
                  <button className="x" onClick={() => remove(x)} aria-label={`Delete ${x.description || "expense"}`}>✕</button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <p className="print-only">Generated on {new Date().toLocaleDateString("en-GB")} · Travel Memory Vault</p>
    </>
  );
}
