import { useState } from "react";
import { useAuth } from "../auth.jsx";
import { api } from "../api";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const { login } = useAuth();
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setErr(""); setInfo("");
    const email = f.email.trim();
    if (!EMAIL.test(email)) return setErr("Enter a valid email.");
    if (f.password.length < 8) return setErr("Password must be at least 8 characters.");
    if (mode === "register" && f.name.trim().length < 2) return setErr("Enter your name.");
    setBusy(true);
    try {
      if (mode === "register") {
        await api.register({ fullName: f.name.trim(), email, password: f.password });
        setMode("login");
        setInfo("Account created. Signing you in…");
        await login({ email, password: f.password });
      } else {
        await login({ email, password: f.password });
      }
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth">
      <h1>{mode === "login" ? "Open your vault." : "Start a new vault."}</h1>
      <p className="muted">Every trip, every rupee, in one place.</p>
      <form onSubmit={submit} noValidate>
        {mode === "register" && (
          <label>Name<input value={f.name} onChange={set("name")} autoComplete="name" maxLength={80} /></label>
        )}
        <label>Email<input type="email" value={f.email} onChange={set("email")} autoComplete="email" maxLength={120} /></label>
        <label>Password
          <input type="password" value={f.password} onChange={set("password")} maxLength={72}
            autoComplete={mode === "login" ? "current-password" : "new-password"} />
        </label>
        {err && <p className="msg err" role="alert">{err}</p>}
        {info && <p className="msg ok" role="status">{info}</p>}
        <button className="btn" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}</button>
      </form>
      <button className="link" onClick={() => { setMode(mode === "login" ? "register" : "login"); setErr(""); setInfo(""); }}>
        {mode === "login" ? "New here? Create an account" : "Have an account? Log in"}
      </button>
    </section>
  );
}
