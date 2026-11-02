import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { fmt, fmtDate } from "../money";
import { Cover } from "../cover.jsx";

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AUD"];
const blank = { destination: "", startDate: "", endDate: "", budget: "", currency: "INR", description: "" };

export default function Trips() {
  const [trips, setTrips] = useState(null);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(blank);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    let live = true;
    api.trips().then((d) => live && setTrips(Array.isArray(d) ? d : [])).catch((e) => live && setErr(e.message));
    return () => { live = false; };
  }, []);

  async function create(e) {
    e.preventDefault();
    setErr("");
    if (f.destination.trim().length < 2) return setErr("Enter a destination.");
    if (!f.startDate || !f.endDate || f.endDate < f.startDate) return setErr("Check the travel dates.");
    if (!(Number(f.budget) > 0)) return setErr("Budget must be more than zero.");
    setBusy(true);
    try {
      const t = await api.addTrip({ ...f, destination: f.destination.trim(), description: f.description.trim(), budget: Number(f.budget) });
      setTrips((p) => [t, ...(p || [])]);
      setF(blank); setOpen(false);
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Your vault</p>
          <h1>Trips{trips ? <span className="count">{trips.length}</span> : null}</h1>
        </div>
        <button className="btn" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? "Close" : "+ New trip"}</button>
      </div>
      {err && <p className="msg err" role="alert">{err}</p>}

      {open && (
        <form className="panel" onSubmit={create} noValidate>
          <div className="field"><label htmlFor="t-dest">Where to?</label>
            <input id="t-dest" value={f.destination} onChange={set("destination")} maxLength={80} placeholder="Goa" /></div>
          <div className="grid2">
            <div className="field"><label htmlFor="t-from">From</label><input id="t-from" type="date" value={f.startDate} onChange={set("startDate")} /></div>
            <div className="field"><label htmlFor="t-to">To</label><input id="t-to" type="date" value={f.endDate} min={f.startDate} onChange={set("endDate")} /></div>
          </div>
          <div className="grid2">
            <div className="field"><label htmlFor="t-bud">Budget</label>
              <input id="t-bud" type="number" min="1" step="0.01" inputMode="decimal" value={f.budget} onChange={set("budget")} /></div>
            <div className="field"><label htmlFor="t-cur">Currency</label>
              <select id="t-cur" value={f.currency} onChange={set("currency")}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></div>
          </div>
          <div className="field"><label htmlFor="t-note">Notes</label>
            <textarea id="t-note" rows="2" maxLength={300} value={f.description} onChange={set("description")} /></div>
          <button className="btn" disabled={busy}>{busy ? "Saving…" : "Save trip"}</button>
        </form>
      )}

      {trips === null && !err && <div className="grid-cards">{[0, 1, 2].map((i) => <div key={i} className="skeleton" />)}</div>}
      {trips?.length === 0 && (
        <div className="empty"><b>No trips yet.</b><span>Plan your first one and start tracking every rupee.</span></div>
      )}
      <ul className="grid-cards">
        {trips?.map((t) => (
          <li key={t.id}>
            <Link to={`/trips/${t.id}`} className="pass" aria-label={`${t.destination}, open trip`}>
              <Cover trip={t}>
                <span className="chip">TRIP {String(t.id).padStart(3, "0")}</span>
                <span className="pass-body">
                  <strong>{t.destination}</strong>
                  <small>{fmtDate(t.startDate)} → {fmtDate(t.endDate)}</small>
                </span>
                <span className="pass-foot"><em>Budget</em><b>{fmt(Math.round(Number(t.budget) * 100), t.currency)}</b></span>
              </Cover>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
