import { Link } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export function Logo({ size = 40 }) {
  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M24 3 6 10v13c0 11 7.5 19.5 18 22 10.5-2.5 18-11 18-22V10L24 3Z" fill="#4f46e5" />
      <path className="tick" d="m15.5 24 6 6 11-12" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Plain page wrapper shared by every screen. */
export function Shell({ children }) {
  return <div className="bg">{children}</div>;
}

/** Centered glass card used by login / register / OTP. */
export function AuthCard({ title, subtitle, children, footer }) {
  return (
    <Shell>
      <main className="auth">
        <div className="glass auth-card">
          <div className="auth-head">
            <Logo size={52} />
            <h1>{title}</h1>
            {subtitle && <p className="sub">{subtitle}</p>}
          </div>
          {children}
          {footer && <p className="foot">{footer}</p>}
        </div>
      </main>
    </Shell>
  );
}

export function TopBar({ active }) {
  const { user, logout } = useAuth();
  return (
    <header className="topbar glass">
      <Link to="/" className="brand">
        <Logo size={28} /> <span>CertVerify</span>
      </Link>
      <nav>
        <Link to="/" className={active === 'verify' ? 'on' : ''}>Verify</Link>
        {user?.role === 'admin' && <Link to="/admin" className={active === 'admin' ? 'on' : ''}>Admin</Link>}
      </nav>
      <div className="who">
        <span className="avatar">{user?.name?.[0]?.toUpperCase() || '?'}</span>
        <span className="who-name">{user?.name}</span>
        {user?.role === 'admin' && <span className="pill">admin</span>}
        <button className="ghost" onClick={logout}>Logout</button>
      </div>
    </header>
  );
}
