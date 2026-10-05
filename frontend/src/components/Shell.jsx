import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { IconClose, IconInbox, IconLogout, IconMenu, IconRegistry, IconShieldCheck } from './Icons.jsx';

export function Logo({ size = 30 }) {
  return (
    <span className="logo-mark" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 48 48" fill="none">
        <path d="M24 3 6 10v13c0 11 7.5 19.5 18 22 10.5-2.5 18-11 18-22V10L24 3Z" fill="currentColor" />
        <path className="tick" d="m15.5 24 6 6 11-12" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/** Bare wrapper for full-page states like the initial auth check. */
export function Shell({ children }) {
  return <div className="plain-page">{children}</div>;
}

/** Split layout for login / register / OTP: brand panel on the left, form on the right. */
export function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth-layout">
      <aside className="auth-brand">
        <Link to="/" className="auth-brand-mark">
          <Logo size={32} /> <span>CertVerify</span>
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
          <Link to="/" className="auth-mark-sm"><Logo size={28} /> <span>CertVerify</span></Link>
          <header className="auth-head">
            <h1>{title}</h1>
            {subtitle && <p className="lead">{subtitle}</p>}
          </header>
          {children}
          {footer && <p className="auth-foot">{footer}</p>}
        </div>
      </main>
    </div>
  );
}

export function EmptyState({ text }) {
  return (
    <div className="empty-state">
      <span className="empty-ico"><IconInbox /></span>
      <p>{text}</p>
    </div>
  );
}

export function PageHeader({ eyebrow, title, subtitle, children }) {
  return (
    <header className="page-head">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
      {subtitle && <p className="lead">{subtitle}</p>}
      {children}
    </header>
  );
}

function NavItem({ to, active, icon: Icon, label, onClick }) {
  return (
    <Link to={to} className={`nav-item ${active ? 'on' : ''}`} onClick={onClick}>
      <Icon /> <span>{label}</span>
    </Link>
  );
}

/**
 * Light top navigation + centred content column. The nav collapses into a
 * sheet under 760px rather than a sidebar.
 */
export function AppShell({ active, eyebrow, title, subtitle, header, children }) {
  const { user, logout } = useAuth();
  const [menu, setMenu] = useState(false);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setMenu(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const close = () => setMenu(false);

  return (
    <div className={`app ${menu ? 'menu-open' : ''}`}>
      <header className="topnav">
        <div className="topnav-inner">
          <Link to="/" className="brand" onClick={close}>
            <Logo size={28} /> <span>CertVerify</span>
          </Link>

          <nav className="nav-links">
            <NavItem to="/" active={active === 'verify'} icon={IconShieldCheck} label="Verify" onClick={close} />
            {isAdmin && <NavItem to="/admin" active={active === 'admin'} icon={IconRegistry} label="Admin" onClick={close} />}
          </nav>

          <div className="topnav-end">
            <span className="who">
              <span className="who-name">{user?.name}</span>
              <span className="who-role">{isAdmin ? 'Administrator' : 'Member'}</span>
            </span>
            <span className="avatar">{user?.name?.[0]?.toUpperCase() || '?'}</span>
            <button className="icon-btn logout" onClick={logout} title="Log out" aria-label="Log out"><IconLogout /></button>
            <button className="icon-btn menu-toggle" onClick={() => setMenu((m) => !m)} aria-label="Menu">
              {menu ? <IconClose /> : <IconMenu />}
            </button>
          </div>
        </div>

        <div className="nav-sheet">
          <NavItem to="/" active={active === 'verify'} icon={IconShieldCheck} label="Verify" onClick={close} />
          {isAdmin && <NavItem to="/admin" active={active === 'admin'} icon={IconRegistry} label="Admin" onClick={close} />}
          <button className="sheet-logout" onClick={logout}><IconLogout /> <span>Log out</span></button>
        </div>
      </header>

      <main className="content">
        <PageHeader eyebrow={eyebrow} title={title} subtitle={subtitle}>{header}</PageHeader>
        {children}
      </main>

      <footer className="site-foot">
        <IconShieldCheck />
        <span>Certificates are matched by exact fingerprint and by issued template against an issuer-maintained registry.</span>
      </footer>
    </div>
  );
}
