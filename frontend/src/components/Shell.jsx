import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { IconClose, IconInbox, IconLogout, IconMenu, IconRegistry, IconShieldCheck } from './Icons.jsx';

export function Logo({ size = 32 }) {
  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M24 3 6 10v13c0 11 7.5 19.5 18 22 10.5-2.5 18-11 18-22V10L24 3Z" fill="currentColor" />
      <path className="tick" d="m15.5 24 6 6 11-12" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Bare wrapper, used for full-page states like the initial auth check. */
export function Shell({ children }) {
  return <div className="plain-page">{children}</div>;
}

/** Split layout for login / register / OTP: brand panel on the left, form on the right. */
export function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth-layout">
      <aside className="auth-brand">
        <Link to="/" className="auth-brand-mark">
          <Logo size={34} /> <span>CertVerify</span>
        </Link>
        <div className="auth-brand-copy">
          <h2>Certificate verification you can trust</h2>
          <p>Every upload is matched against a registry of genuine certificates — no guesswork, no manual checking.</p>
        </div>
        <ul className="auth-points">
          <li><IconShieldCheck /> Tamper-proof SHA-256 matching</li>
          <li><IconRegistry /> Issuer-maintained registry</li>
          <li><IconInbox /> Email-verified accounts</li>
        </ul>
      </aside>

      <main className="auth-panel">
        <div className="auth-card">
          <Link to="/" className="auth-mark-sm"><Logo size={30} /> <span>CertVerify</span></Link>
          <header className="auth-head">
            <h1>{title}</h1>
            {subtitle && <p className="sub">{subtitle}</p>}
          </header>
          {children}
          {footer && <p className="auth-foot">{footer}</p>}
        </div>
      </main>
    </div>
  );
}

/** "Nothing here yet" placeholder for empty tables. */
export function EmptyState({ text }) {
  return (
    <div className="empty-state">
      <IconInbox />
      <p>{text}</p>
    </div>
  );
}

export function PageHeader({ title, subtitle }) {
  return (
    <div className="page-head">
      <h1>{title}</h1>
      {subtitle && <p className="sub">{subtitle}</p>}
    </div>
  );
}

function SideLink({ to, active, icon: Icon, label, onClick }) {
  return (
    <Link to={to} className={`side-link ${active ? 'on' : ''}`} onClick={onClick}>
      <Icon /> <span>{label}</span>
    </Link>
  );
}

/**
 * App chrome for signed-in pages: a dark sidebar on desktop that becomes a
 * slide-in drawer under 900px, plus a compact top bar on small screens.
 */
export function AppShell({ active, title, subtitle, children }) {
  const { user, logout } = useAuth();
  const [drawer, setDrawer] = useState(false);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setDrawer(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const close = () => setDrawer(false);

  return (
    <div className={`shell ${drawer ? 'drawer-open' : ''}`}>
      <aside className="sidebar">
        <div className="side-top">
          <Link to="/" className="side-brand" onClick={close}>
            <Logo size={28} /> <span>CertVerify</span>
          </Link>
          <button className="icon-btn side-close" onClick={close} aria-label="Close menu"><IconClose /></button>
        </div>

        <nav className="side-nav">
          <p className="side-label">Menu</p>
          <SideLink to="/" active={active === 'verify'} icon={IconShieldCheck} label="Verify" onClick={close} />
          {isAdmin && <SideLink to="/admin" active={active === 'admin'} icon={IconRegistry} label="Admin" onClick={close} />}
        </nav>

        <div className="side-user">
          <span className="avatar">{user?.name?.[0]?.toUpperCase() || '?'}</span>
          <span className="side-user-info">
            <strong>{user?.name}</strong>
            <small>{isAdmin ? 'Administrator' : 'Member'}</small>
          </span>
          <button className="icon-btn" onClick={logout} title="Log out" aria-label="Log out"><IconLogout /></button>
        </div>
      </aside>

      <div className="scrim" onClick={close} aria-hidden="true" />

      <div className="main">
        <header className="appbar">
          <button className="icon-btn" onClick={() => setDrawer(true)} aria-label="Open menu"><IconMenu /></button>
          <Link to="/" className="appbar-brand"><Logo size={24} /> <span>CertVerify</span></Link>
          <span className="avatar sm">{user?.name?.[0]?.toUpperCase() || '?'}</span>
        </header>

        <main className="content">
          <PageHeader title={title} subtitle={subtitle} />
          {children}
        </main>
      </div>
    </div>
  );
}
