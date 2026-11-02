// All HTTP lives here. The JWT is kept in module memory only (never localStorage/sessionStorage),
// so an XSS bug cannot read it from storage. Trade-off: a page refresh requires login again.
const BASE = import.meta.env.VITE_API_URL || "/api";
const TIMEOUT_MS = 10000;

let token = null;
let onUnauthorized = () => {};
export const setToken = (t) => { token = t; };
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

// Never show raw server text to the user: it can leak internals.
const MESSAGES = {
  400: "Please check the details you entered.",
  401: "Invalid email or password.",
  403: "You are not allowed to do that.",
  404: "Not found.",
  409: "That already exists.",
};

const id = (v) => {
  const n = Number(v);
  if (!Number.isSafeInteger(n) || n <= 0) throw new Error("Invalid id.");
  return n;
};

async function request(path, { method = "GET", body, as = "json" } = {}) {
  const isForm = body instanceof FormData;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(BASE + path, {
      method,
      signal: ctrl.signal,
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        ...(body && !isForm && { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    });
    if (res.status === 401 && token) {
      onUnauthorized();
      throw new Error("Session expired. Please log in again.");
    }
    if (!res.ok) throw new Error(MESSAGES[res.status] || "Something went wrong. Try again.");
    if (res.status === 204) return null;
    return as === "blob" ? await res.blob() : await res.json();
  } catch (e) {
    if (e.name === "AbortError") throw new Error("Request timed out.");
    if (e instanceof TypeError) throw new Error("Cannot reach the server.");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  register: (b) => request("/auth/register", { method: "POST", body: b }),
  login: (b) => request("/auth/login", { method: "POST", body: b }), // expects { token }
  trips: () => request("/trips"),
  trip: (t) => request(`/trips/${id(t)}`),
  addTrip: (b) => request("/trips", { method: "POST", body: b }),
  deleteTrip: (t) => request(`/trips/${id(t)}`, { method: "DELETE" }),
  expenses: (t) => request(`/trips/${id(t)}/expenses`),
  addExpense: (t, b) => request(`/trips/${id(t)}/expenses`, { method: "POST", body: b }),
  cover: (t) => request(`/trips/${id(t)}/cover`, { as: "blob" }),
  uploadCover: (t, file) => { const fd = new FormData(); fd.append("file", file); return request(`/trips/${id(t)}/cover`, { method: "POST", body: fd }); },
  photos: (t) => request(`/trips/${id(t)}/photos`), // -> [{ id, ... }] metadata only
  photo: (t, p) => request(`/trips/${id(t)}/photos/${id(p)}`, { as: "blob" }), // image bytes, fetched with the auth header
  uploadPhoto: (t, file) => { const fd = new FormData(); fd.append("file", file); return request(`/trips/${id(t)}/photos`, { method: "POST", body: fd }); },
  deletePhoto: (t, p) => request(`/trips/${id(t)}/photos/${id(p)}`, { method: "DELETE" }),
  deleteExpense: (t, e) => request(`/trips/${id(t)}/expenses/${id(e)}`, { method: "DELETE" }),
};
