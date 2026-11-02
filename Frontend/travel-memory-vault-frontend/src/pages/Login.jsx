import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth.jsx";
import { api } from "../api";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ORDER = ["name", "email", "password"];

export default function Login() {
  const { login } = useAuth();
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [fe, setFe] = useState({}); // per-field validation messages
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const refs = { name: useRef(null), email: useRef(null), password: useRef(null) };
  const mounted = useRef(false);
  const isLogin = mode === "login";

  const set = (k) => (e) => {
    setF({ ...f, [k]: e.target.value });
    if (fe[k]) setFe({ ...fe, [k]: "" });
  };

  // Move focus to the sensible field when the form switches mode (not on first render).
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    const next = mode === "register" ? "name" : info ? "password" : "email";
    refs[next].current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  function validate(email) {
    const v = {};
    if (!isLogin && f.name.trim().length < 2) v.name = "Enter your name.";
    if (!EMAIL.test(email)) v.email = "Enter a valid email.";
    if (f.password.length < 8) v.password = "Password must be at least 8 characters.";
    return v;
  }

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setErr(""); setInfo(""); setShow(false);
    const email = f.email.trim();
    const v = validate(email);
    setFe(v);
    const first = ORDER.find((k) => v[k]);
    if (first) { refs[first].current?.focus(); return; }
    setBusy(true);
    try {
      if (mode === "register") {
        await api.register({ fullName: f.name.trim(), name: f.name.trim(), email, password: f.password });
        setMode("login"); setInfo("Account created. Log in to continue.");
        setF({ name: "", email, password: "" });
      } else {
        await login({ email, password: f.password });
      }
    } catch (ex) {
      setErr(ex.message);
      if (mode === "login") refs.password.current?.focus();
    } finally {
      setBusy(false);
    }
  }

  const banner = err ? "auth-err" : info ? "auth-info" : "";
  const desc = (k, extra) => [fe[k] && `auth-${k}-err`, extra, banner].filter(Boolean).join(" ") || undefined;
  const FieldErr = ({ k }) => (fe[k] ? <span className="field-err" id={`auth-${k}-err`}>{fe[k]}</span> : null);

  return (
    <section className="auth" aria-labelledby="auth-title">
      <aside className="auth-side" aria-hidden="true">
        <p className="side-tag">TRAVEL MEMORY VAULT</p>
        <p className="side-big">Every trip.<br />Every rupee.</p>
        <div className="mini">
          <i><u /></i>
        </div>
      </aside>
      <div className="auth-form">
        <p className="eyebrow">{isLogin ? "Welcome back" : "Begin your journal"}</p>
        <h1 id="auth-title">{isLogin ? "Open your vault." : "Start a new vault."}</h1>
        <p className="lede">Every trip, every rupee, in one place.</p>

        <form onSubmit={submit} noValidate aria-busy={busy}>
          {!isLogin && (
            <div className="field">
              <label htmlFor="auth-name">Name</label>
              <input id="auth-name" ref={refs.name} value={f.name} onChange={set("name")} autoComplete="name" maxLength={80}
                aria-invalid={!!fe.name} aria-describedby={desc("name")} />
              <FieldErr k="name" />
            </div>
          )}
          <div className="field">
            <label htmlFor="auth-email">Email</label>
            <input id="auth-email" ref={refs.email} type="email" inputMode="email" autoCapitalize="none" spellCheck={false}
              value={f.email} onChange={set("email")} autoComplete="email" maxLength={120}
              aria-invalid={!!fe.email} aria-describedby={desc("email")} />
            <FieldErr k="email" />
          </div>
          <div className="field">
            <label htmlFor="auth-password">Password</label>
            <div className="pw">
              <input id="auth-password" ref={refs.password} type={show ? "text" : "password"} autoCapitalize="none" spellCheck={false}
                value={f.password} onChange={set("password")} maxLength={72}
                onKeyDown={(e) => setCaps(!!e.getModifierState?.("CapsLock"))} onKeyUp={(e) => setCaps(!!e.getModifierState?.("CapsLock"))}
                onBlur={() => setCaps(false)}
                autoComplete={isLogin ? "current-password" : "new-password"}
                aria-invalid={!!fe.password} aria-describedby={desc("password", !isLogin ? "auth-pw-hint" : undefined)} />
              <button type="button" className="eye" onClick={() => setShow(!show)} aria-pressed={show} aria-controls="auth-password"
                aria-label="Show password" title={show ? "Hide password" : "Show password"}>
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />
                  {show && <path d="M3 3l18 18" />}
                </svg>
              </button>
            </div>
            <FieldErr k="password" />
            {caps && <span className="hint warn" role="status">Caps Lock is on.</span>}
            {!isLogin && <span className="hint" id="auth-pw-hint">At least 8 characters.</span>}
          </div>
          {err && <p className="msg err" id="auth-err" role="alert">{err}</p>}
          {info && <p className="msg ok" id="auth-info" role="status">{info}</p>}
          <button className="btn btn-block" disabled={busy}>
            {busy && <span className="spin" aria-hidden="true" />}
            {busy ? (isLogin ? "Logging in…" : "Creating account…") : isLogin ? "Log in" : "Create account"}
          </button>
        </form>

        <p className="switch">
          <button type="button" className="link" onClick={() => { setMode(isLogin ? "register" : "login"); setErr(""); setInfo(""); setFe({}); setShow(false); }}>
            {isLogin ? "New here? Create an account" : "Have an account? Log in"}
          </button>
        </p>
      </div>
    </section>
  );
}
