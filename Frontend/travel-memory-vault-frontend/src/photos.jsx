import { useEffect, useRef, useState } from "react";
import { api } from "./api";
import { looksLikeImage, OK_TYPES } from "./image";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 10; // per selection

export default function Gallery({ tripId }) {
  const [photos, setPhotos] = useState(null); // null = loading
  const [urls, setUrls] = useState({});       // id -> blob URL | false (failed)
  const [note, setNote] = useState(null);     // { kind: "ok" | "err", text }
  const [progress, setProgress] = useState("");
  const [idx, setIdx] = useState(null);       // open lightbox index
  const urlsRef = useRef({});                 // undefined = not started, null = loading, string = ready, false = failed
  const alive = useRef(true);
  const fileRef = useRef(null);
  const dlg = useRef(null);

  useEffect(() => {
    alive.current = true;
    api.photos(tripId)
      .then((d) => alive.current && setPhotos(Array.isArray(d) ? d.filter((p) => Number.isSafeInteger(Number(p?.id))) : []))
      .catch(() => { if (alive.current) { setPhotos([]); setNote({ kind: "err", text: "Couldn't load photos." }); } });
    return () => {
      alive.current = false;
      Object.values(urlsRef.current).forEach((u) => typeof u === "string" && URL.revokeObjectURL(u));
    };
  }, [tripId]);

  // Fetch each image with the auth header (an <img src> can't send one), then show it from a blob URL.
  useEffect(() => {
    (async () => {
      for (const p of photos || []) {
        if (urlsRef.current[p.id] !== undefined) continue;
        urlsRef.current[p.id] = null;
        let val = false;
        try {
          const b = await api.photo(tripId, p.id);
          if (b && OK_TYPES.includes(b.type)) val = URL.createObjectURL(b);
        } catch { /* leave as failed */ }
        if (!alive.current) { if (val) URL.revokeObjectURL(val); return; }
        urlsRef.current[p.id] = val;
        setUrls((x) => ({ ...x, [p.id]: val }));
      }
    })();
  }, [photos, tripId]);

  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    if (idx === null) { if (d.open) d.close(); } else if (!d.open) d.showModal();
  }, [idx]);

  async function onPick(e) {
    const all = [...(e.target.files || [])];
    e.target.value = "";
    if (!all.length) return;
    const files = all.slice(0, MAX_FILES);
    const problems = all.length > MAX_FILES ? [`Only the first ${MAX_FILES} photos were used.`] : [];
    let added = 0;
    for (const [i, file] of files.entries()) {
      setProgress(`Uploading ${i + 1} of ${files.length}…`);
      const name = file.name.slice(0, 40);
      if (file.size > MAX_BYTES) { problems.push(`${name}: over 5 MB.`); continue; }
      if (!(await looksLikeImage(file))) { problems.push(`${name}: not a JPG, PNG or WebP.`); continue; }
      try {
        const meta = await api.uploadPhoto(tripId, file);
        if (!Number.isSafeInteger(Number(meta?.id))) throw new Error("bad response");
        if (alive.current) setPhotos((p) => [meta, ...(p || [])]);
        added++;
      } catch { problems.push(`${name}: upload failed.`); }
    }
    if (!alive.current) return;
    setProgress("");
    setNote(problems.length ? { kind: "err", text: `${added ? `${added} added. ` : ""}${problems.join(" ")}` } : { kind: "ok", text: `${added} photo${added === 1 ? "" : "s"} added.` });
  }

  async function remove(p) {
    if (!window.confirm("Delete this photo?")) return;
    try {
      await api.deletePhoto(tripId, p.id);
      const u = urlsRef.current[p.id];
      if (typeof u === "string") URL.revokeObjectURL(u);
      delete urlsRef.current[p.id];
      setPhotos((l) => l.filter((x) => x.id !== p.id));
      setIdx(null);
    } catch (ex) { setNote({ kind: "err", text: ex.message }); }
  }

  const n = photos?.length || 0;
  const cur = idx !== null ? photos?.[idx] : null;
  const go = (d) => setIdx((i) => (i + d + n) % n);

  return (
    <section className="memories noprint" aria-label="Trip photos">
      <div className="row-between">
        <h2 className="sec">Memories{photos ? <span className="count sm">{n}</span> : null}</h2>
        <button type="button" className="ghost" onClick={() => fileRef.current?.click()} disabled={!!progress}>+ Add photos</button>
        <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={onPick} hidden />
      </div>
      {progress && <p className="msg ok" role="status">{progress}</p>}
      {note && !progress && <p className={`msg ${note.kind === "ok" ? "ok" : "err"}`} role={note.kind === "ok" ? "status" : "alert"}>{note.text}</p>}

      {photos === null && <div className="skeleton" />}
      {photos?.length === 0 && <div className="empty"><b>No photos yet.</b><span>Add JPG, PNG or WebP photos (up to 5 MB each).</span></div>}
      {n > 0 && (
        <ul className="gallery">
          {photos.map((p, i) => (
            <li key={p.id}>
              <button type="button" className="thumb" onClick={() => setIdx(i)} aria-label={`Open photo ${i + 1} of ${n}`}>
                {urls[p.id] ? <img src={urls[p.id]} alt="" /> : <span className={`ph${urls[p.id] === false ? " bad" : ""}`}>{urls[p.id] === false ? "Can't load" : ""}</span>}
              </button>
              <button type="button" className="del" onClick={() => remove(p)} aria-label={`Delete photo ${i + 1}`}>✕</button>
            </li>
          ))}
        </ul>
      )}

      <dialog ref={dlg} className="lightbox" aria-label="Photo viewer"
        onClose={() => setIdx(null)}
        onClick={(e) => { if (e.target === dlg.current) setIdx(null); }}
        onKeyDown={(e) => { if (n > 1 && e.key === "ArrowLeft") go(-1); if (n > 1 && e.key === "ArrowRight") go(1); }}>
        {cur && (
          <>
            {urls[cur.id] ? <img src={urls[cur.id]} alt={`Trip photo ${idx + 1} of ${n}`} /> : <p>Can't load this photo.</p>}
            <div className="lb-bar">
              <span>{idx + 1} / {n}</span>
              <span className="lb-actions">
                {n > 1 && <button type="button" className="lb-btn" onClick={() => go(-1)}>← Prev</button>}
                {n > 1 && <button type="button" className="lb-btn" onClick={() => go(1)}>Next →</button>}
                <button type="button" className="lb-btn" onClick={() => remove(cur)}>Delete</button>
                <button type="button" className="lb-btn primary" autoFocus onClick={() => setIdx(null)}>Close</button>
              </span>
            </div>
          </>
        )}
      </dialog>
    </section>
  );
}
