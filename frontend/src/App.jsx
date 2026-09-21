import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Register from './pages/Register.jsx';
import Login from './pages/Login.jsx';
import VerifyOtp from './pages/VerifyOtp.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Admin from './pages/Admin.jsx';
import { Shell } from './components/Shell.jsx';

function Protected({ children, admin = false }) {
  const { token, user, loading } = useAuth();
  if (loading) return <Shell><p className="loading">Loading…</p></Shell>;
  if (!token) return <Navigate to="/login" replace />;
  if (admin && user?.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/admin" element={<Protected admin><Admin /></Protected>} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/verify" element={<VerifyOtp />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
