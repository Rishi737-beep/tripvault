import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { fmt, fmtDate } from "../money";

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AUD"];
const blank = { destination: "", startDate: "", endDate: "", budget: "", currency: "INR", description: "" };

export default function Trips() {
  const [trips, setTrips] = useState(null);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState(null);
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
      const request = { ...f, destination: f.destination.trim(), description: f.description.trim(), budget: Number(f.budget) };
      if (editingId) {
        const updated = await api.updateTrip(editingId, request);
        setTrips((p) => p.map((trip) => trip.id === updated.id ? updated : trip));
      } else {
        const created = await api.addTrip(request);
        setTrips((p) => [created, ...(p || [])]);
      }
      setF(blank); setOpen(false); setEditingId(null);
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  }

  function edit(trip) {
    setErr("");
    setEditingId(trip.id);
    setF({
      destination: trip.destination,
      startDate: trip.startDate,
      endDate: trip.endDate,
      budget: String(trip.budget),
      currency: trip.currency,
      description: trip.description || "",
    });
    setOpen(true);
  }

  function cancel() {
    setOpen(false);
    setEditingId(null);
    setF(blank);
    setErr("");
  }

  async function remove(trip) {
    if (!window.confirm(`Delete ${trip.destination} and all of its expenses and photos? This cannot be undone.`)) return;
    setErr("");
    try {
      await api.deleteTrip(trip.id);
      setTrips((p) => p.filter((item) => item.id !== trip.id));
    } catch (ex) { setErr(ex.message); }
  }

  return (
    <>
      <div className="row">
        <h1>Your trips</h1>
        <button className="btn" onClick={() => open ? cancel() : setOpen(true)}>{open ? "Cancel" : "+ New trip"}</button>
      </div>
      {err && <p className="msg err" role="alert">{err}</p>}

      {open && (
        <form className="sheet" onSubmit={create} noValidate>
          <h2>{editingId ? "Edit trip" : "Plan a trip"}</h2>
          <label>Destination<input value={f.destination} onChange={set("destination")} maxLength={80} /></label>
          <div className="grid2">
            <label>From<input type="date" value={f.startDate} onChange={set("startDate")} /></label>
            <label>To<input type="date" value={f.endDate} min={f.startDate} onChange={set("endDate")} /></label>
          </div>
          <div className="grid2">
            <label>Budget<input type="number" min="1" step="0.01" inputMode="decimal" value={f.budget} onChange={set("budget")} /></label>
            <label>Currency
              <select value={f.currency} onChange={set("currency")}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select>
            </label>
          </div>
          <label>Notes<textarea rows="2" maxLength={300} value={f.description} onChange={set("description")} /></label>
          <button className="btn" disabled={busy}>{busy ? "Saving…" : editingId ? "Update trip" : "Save trip"}</button>
        </form>
      )}

      {trips === null && !err && <p className="muted">Loading…</p>}
      {trips?.length === 0 && <p className="muted">No trips yet. Plan the first one.</p>}
      <ul className="tickets">
        {trips?.map((t) => (
          <li key={t.id}>
            <div className="ticket-wrap">
              <Link to={`/trips/${t.id}`} className="ticket">
                <span className="stub">TRIP<br />№ {String(t.id).padStart(3, "0")}</span>
                <span className="body">
                  <strong>{t.destination}</strong>
                  <small>{fmtDate(t.startDate)} → {fmtDate(t.endDate)}</small>
                </span>
                <span className="amt">{fmt(Math.round(Number(t.budget) * 100), t.currency)}</span>
              </Link>
              <div className="trip-actions">
                <button className="link" onClick={() => edit(t)}>Edit</button>
                <button className="link" onClick={() => remove(t)}>Delete</button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
