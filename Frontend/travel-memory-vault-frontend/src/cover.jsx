import { useEffect, useState } from "react";
import { api } from "./api";

const PAL = [
  ["#ff5a3c", "#ff9a5a", "#ffd166"], ["#6c4cff", "#4f8cff", "#7be0ff"], ["#00a88f", "#2fd4a1", "#c8f56a"],
  ["#ff3d81", "#ff8a5c", "#ffc14d"], ["#1f2a6b", "#3b5bdb", "#9775fa"], ["#0b8f6b", "#1098ad", "#74c0fc"],
];
const OK = ["image/jpeg", "image/png", "image/webp"];

// Destination picks a base colour; the trip id shifts it so neighbouring trips never look identical.
export function palette(name, id) {
  let h = 2166136261;
  for (const ch of String(name)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return PAL[(h + (Number(id) || 0)) % PAL.length];
}

// Generative cover by default. A photo is used if the user just picked one (`local`)
// or the server says the trip has one (`trip.hasCover`, fetched with the auth header, then shown from a blob URL).
export function Cover({ trip, local, hero, children }) {
  const [remote, setRemote] = useState(null);
  const [coverError, setCoverError] = useState(false);
  useEffect(() => {
    if (!trip?.hasCover) { setRemote(null); setCoverError(false); return; }
    let live = true, url;
    setRemote(null);
    setCoverError(false);
    api.cover(trip.id).then((b) => {
      if (!live) return;
      if (b && OK.includes(b.type)) { url = URL.createObjectURL(b); setRemote(url); }
      else setCoverError(true);
    }).catch(() => { if (live) setCoverError(true); });
    return () => { live = false; if (url) URL.revokeObjectURL(url); };
  }, [trip?.id, trip?.hasCover, trip?.coverUpdatedAt]);

  const [a, b, c] = palette(trip?.destination, trip?.id);
  const img = local || remote;
  return (
    <div className={`cover${hero ? " hero" : ""}${img ? " photo" : ""}`} style={{ "--a": a, "--b": b, "--c": c }}>
      {img && <img src={img} alt="" />}
      {coverError && <span className="cover-error" role="status">Cover photo unavailable</span>}
      <svg className="route" viewBox="0 0 300 120" aria-hidden="true" focusable="false">
        <path d="M10 100 C 80 10, 170 130, 290 20" />
        <circle cx="10" cy="100" r="5" /><circle cx="290" cy="20" r="5" />
      </svg>
      {children}
    </div>
  );
}
