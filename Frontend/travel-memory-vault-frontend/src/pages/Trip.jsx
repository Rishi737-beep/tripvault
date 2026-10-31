import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { fmt, fmtDate, toMinor } from "../money";

const CATS = ["HOTEL", "FOOD", "TRANSPORT", "SHOPPING", "OTHER"];
const blank = { category: "FOOD", amount: "", description: "", date: "" };

export default function Trip() {
  const { tripId } = useParams();
  const [trip, setTrip] = useState(null);
  const [items, setItems] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [photosLoading, setPhotosLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [err, setErr] = useState("");
  const [f, setF] = useState(blank);
  const [filter, setFilter] = useState("ALL");
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const photoUrls = useRef(new Set());
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    let live = true;
    setTrip(null);
    setItems([]);
    setPhotos([]);
    setPhotosLoading(true);
    setSelectedPhoto(null);
    Promise.all([api.trip(tripId), api.expenses(tripId)])
      .then(([t, x]) => { if (live) { setTrip(t); setItems(Array.isArray(x) ? x : []); } })
      .catch((e) => live && setErr(e.message));
    api.photos(tripId).then(async (metadata) => {
      const blobs = await Promise.all(metadata.map((photo) => api.photo(tripId, photo.id)));
      const loaded = metadata.map((photo, index) => ({ ...photo, url: URL.createObjectURL(blobs[index]) }));
      loaded.forEach((photo) => photoUrls.current.add(photo.url));
      if (live) {
        setPhotos(loaded);
        setPhotosLoading(false);
      }
      else loaded.forEach((photo) => {
        URL.revokeObjectURL(photo.url);
        photoUrls.current.delete(photo.url);
      });
    }).catch((e) => {
      if (live) {
        setErr(e.message);
        setPhotosLoading(false);
      }
    });
    return () => {
      live = false;
      photoUrls.current.forEach((url) => URL.revokeObjectURL(url));
      photoUrls.current.clear();
    };
  }, [tripId]);

  useEffect(() => {
    if (!selectedPhoto) {
      setPhotoPreview("");
      return;
    }
    const url = URL.createObjectURL(selectedPhoto);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedPhoto]);

  const { budget, spent, left, pct } = useMemo(() => {
    const b = trip ? toMinor(trip.budget) : 0;
    const s = items.reduce((a, x) => a + toMinor(x.amount), 0);
    return { budget: b, spent: s, left: b - s, pct: b ? (s / b) * 100 : 0 };
  }, [trip, items]);

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

  async function uploadPhoto(e) {
    e.preventDefault();
    setErr("");
    if (!selectedPhoto) return setErr("Choose a photo first.");
    if (!["image/jpeg", "image/png", "image/gif"].includes(selectedPhoto.type)) {
      return setErr("Choose a JPEG, PNG, or GIF image.");
    }
    if (selectedPhoto.size > 5 * 1024 * 1024) return setErr("Image must be 5 MB or smaller.");
    setPhotoBusy(true);
    try {
      const metadata = await api.uploadPhoto(tripId, selectedPhoto);
      const blob = await api.photo(tripId, metadata.id);
      const photo = { ...metadata, url: URL.createObjectURL(blob) };
      photoUrls.current.add(photo.url);
      setPhotos((current) => [photo, ...current]);
      setSelectedPhoto(null);
    } catch (ex) { setErr(ex.message); } finally { setPhotoBusy(false); }
  }

  async function removePhoto(photo) {
    if (!window.confirm("Delete this photo?")) return;
    setErr("");
    try {
      await api.deletePhoto(tripId, photo.id);
      URL.revokeObjectURL(photo.url);
      photoUrls.current.delete(photo.url);
      setPhotos((current) => current.filter((item) => item.id !== photo.id));
    } catch (ex) { setErr(ex.message); }
  }

  if (!trip) return err ? <p className="msg err" role="alert">{err}</p> : <p className="muted">Loading…</p>;
  const cur = trip.currency;
  const over = left < 0;
  const shown = filter === "ALL" ? items : items.filter((i) => i.category === filter);

  return (
    <>
      <Link to="/" className="link">← All trips</Link>
      <h1>{trip.destination}</h1>
      <p className="muted">{fmtDate(trip.startDate)} → {fmtDate(trip.endDate)}</p>
      {trip.description && <p>{trip.description}</p>}

      <section className="photo-section" aria-labelledby="photos-heading">
        <h2 id="photos-heading">Trip photos</h2>
        <form className="photo-upload" onSubmit={uploadPhoto}>
          <label>Choose a JPEG, PNG, or GIF (up to 5 MB)
            <input type="file" accept="image/jpeg,image/png,image/gif" onChange={(e) => {
              setSelectedPhoto(e.target.files?.[0] || null);
              e.target.value = "";
            }} />
          </label>
          {photoPreview && <img className="photo-preview" src={photoPreview} alt="Selected photo preview" />}
          <button className="btn" disabled={photoBusy || !selectedPhoto}>{photoBusy ? "Uploading…" : "Upload photo"}</button>
        </form>
        {photosLoading && <p className="muted">Loading photos…</p>}
        {!photosLoading && photos.length === 0 && <p className="muted">No photos saved for this trip yet.</p>}
        <ul className="photo-grid">
          {photos.map((photo) => (
            <li key={photo.id}>
              <img src={photo.url} alt={`Trip photo uploaded ${fmtDate(photo.createdAt?.slice(0, 10))}`} />
              <button className="link" onClick={() => removePhoto(photo)}>Delete photo</button>
            </li>
          ))}
        </ul>
      </section>

      <section className="ledger" aria-label="Budget summary">
        <p className="eq">
          <span>Budget <b>{fmt(budget, cur)}</b></span> − <span>Spent <b>{fmt(spent, cur)}</b></span> = <span>Left <b className={over ? "neg" : ""}>{fmt(left, cur)}</b></span>
        </p>
        <progress className={`rule ${pct > 85 ? "hot" : ""}`} value={Math.min(pct, 100)} max="100" aria-label="Budget used" />
        <small>{pct.toFixed(1)}% used</small>
        {over && <span className="stamp">OVER BUDGET</span>}
      </section>

      {err && <p className="msg err" role="alert">{err}</p>}

      <form className="sheet" onSubmit={add} noValidate>
        <div className="grid2">
          <label>Category<select value={f.category} onChange={set("category")}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label>Amount<input type="number" min="0.01" step="0.01" inputMode="decimal" value={f.amount} onChange={set("amount")} /></label>
        </div>
        <div className="grid2">
          <label>What for<input value={f.description} maxLength={120} onChange={set("description")} /></label>
          <label>Date<input type="date" value={f.date} min={trip.startDate} max={trip.endDate} onChange={set("date")} /></label>
        </div>
        <button className="btn" disabled={busy}>{busy ? "Adding…" : "Add expense"}</button>
      </form>

      <div className="tabs">
        {["ALL", ...CATS].map((c) => (
          <button key={c} className={c === filter ? "on" : ""} onClick={() => setFilter(c)}>{c}</button>
        ))}
      </div>
      {shown.length === 0 && <p className="muted">Nothing here yet.</p>}
      <ul className="receipt">
        {shown.map((x) => (
          <li key={x.id}>
            <span className="tag">{x.category}</span>
            <span className="what">{x.description || "—"}<small>{fmtDate(x.date)}</small></span>
            <span className="dots" />
            <span className="num">{fmt(toMinor(x.amount), cur)}</span>
            <button className="link" onClick={() => remove(x)} aria-label="Delete expense">✕</button>
          </li>
        ))}
      </ul>
    </>
  );
}
