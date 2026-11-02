import { Routes, Route, Navigate, Link } from "react-router-dom";
import { useAuth } from "./auth.jsx";
import Login from "./pages/Login.jsx";
import Trips from "./pages/Trips.jsx";
import Trip from "./pages/Trip.jsx";

function Guard({ children }) {
  const { authed } = useAuth();
  return authed ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { authed, logout } = useAuth();
  return (
    <>
      <header className="masthead">
        <Link to="/" className="brand">
          <svg className="mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10.5" /><path d="M12 5.5 14 12l-2 6.5L10 12z" /></svg>
          <span>Travel Memory <em>Vault</em></span>
        </Link>
        {authed && <button className="link" onClick={logout}>Log out</button>}
      </header>
      <main>
        <Routes>
          <Route path="/login" element={authed ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/" element={<Guard><Trips /></Guard>} />
          <Route path="/trips/:tripId" element={<Guard><Trip /></Guard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
