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
  409: "An account with that email already exists. Log in instead.",
  500: "The server encountered a problem. Check that the backend is running and its database settings are correct.",
};

const id = (v) => {
  const n = Number(v);
  if (!Number.isSafeInteger(n) || n <= 0) throw new Error("Invalid id.");
  return n;
};

async function request(path, { method = "GET", body, responseType = "json" } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const formData = body instanceof FormData;
  try {
    const res = await fetch(BASE + path, {
      method,
      signal: ctrl.signal,
      credentials: "same-origin",
      headers: {
        Accept: responseType === "blob" ? "image/*" : "application/json",
        ...(body && !formData && { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body ? (formData ? body : JSON.stringify(body)) : undefined,
    });
    if (res.status === 401 && token) {
      onUnauthorized();
      throw new Error("Session expired. Please log in again.");
    }
    if (!res.ok) {
      if (res.status === 400) {
        const error = await res.json().catch(() => null);
        const fieldErrors = error?.fieldErrors;
        if (fieldErrors && typeof fieldErrors === "object") {
          const messages = Object.values(fieldErrors)
            .filter((message) => typeof message === "string");
          if (messages.length) throw new Error(messages.join(" "));
        }
        if (typeof error?.message === "string") throw new Error(error.message);
      }
      if (res.status >= 500 && !res.headers.get("Content-Type")?.includes("application/json")) {
        throw new Error("The backend is not responding. Start it with Backend\\run-local.ps1.");
      }
      throw new Error(MESSAGES[res.status] || "Something went wrong. Try again.");
    }
    if (res.status === 204) return null;
    return responseType === "blob" ? await res.blob() : await res.json();
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
  updateTrip: (t, b) => request(`/trips/${id(t)}`, { method: "PUT", body: b }),
  deleteTrip: (t) => request(`/trips/${id(t)}`, { method: "DELETE" }),
  expenses: (t) => request(`/trips/${id(t)}/expenses`),
  addExpense: (t, b) => request(`/trips/${id(t)}/expenses`, { method: "POST", body: b }),
  deleteExpense: (t, e) => request(`/trips/${id(t)}/expenses/${id(e)}`, { method: "DELETE" }),
  photos: (t) => request(`/trips/${id(t)}/photos`),
  photo: (t, p) => request(`/trips/${id(t)}/photos/${id(p)}`, { responseType: "blob" }),
  uploadPhoto: (t, file) => {
    const body = new FormData();
    body.append("file", file);
    return request(`/trips/${id(t)}/photos`, { method: "POST", body });
  },
  deletePhoto: (t, p) => request(`/trips/${id(t)}/photos/${id(p)}`, { method: "DELETE" }),
};
