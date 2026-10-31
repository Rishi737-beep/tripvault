import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { api, setToken, setUnauthorizedHandler } from "./api";

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

const IDLE_MS = 15 * 60 * 1000; // auto-logout after 15 min of inactivity
const ACTIVITY = ["click", "keydown", "mousemove", "touchstart"];

export function AuthProvider({ children }) {
  const [authed, setAuthed] = useState(false);

  const logout = useCallback(() => { setToken(null); setAuthed(false); }, []);
  const login = useCallback(async (creds) => {
    const res = await api.login(creds);
    if (!res || typeof res.token !== "string") throw new Error("Login failed.");
    setToken(res.token);
    setAuthed(true);
  }, []);

  useEffect(() => { setUnauthorizedHandler(logout); }, [logout]);

  useEffect(() => {
    if (!authed) return;
    let t;
    const reset = () => { clearTimeout(t); t = setTimeout(logout, IDLE_MS); };
    ACTIVITY.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => { clearTimeout(t); ACTIVITY.forEach((e) => window.removeEventListener(e, reset)); };
  }, [authed, logout]);

  return <Ctx.Provider value={{ authed, login, logout }}>{children}</Ctx.Provider>;
}
