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
          <img className="brand-logo" src="/logo.png" alt="" />
          <span>TripVault</span>
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
