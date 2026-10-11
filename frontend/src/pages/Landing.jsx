import { Link } from 'react-router-dom';
import { Logo } from '../components/Shell.jsx';
import {
  IconBarChart, IconCheckCircle, IconClock, IconQrCode, IconRegistry, IconShieldCheck,
} from '../components/Icons.jsx';

const STEPS = [
  { n: '01', t: 'Create an account', d: 'Sign up and verify your email with a one-time code.' },
  { n: '02', t: 'Upload a certificate', d: 'Drop in a PDF, PNG or JPG — up to 5 MB.' },
  { n: '03', t: 'Get an instant result', d: "We check it against the issuer's registry and answer in seconds." },
];

const FEATURES = [
  { icon: IconShieldCheck, t: 'Exact fingerprint match', d: 'Every upload is hashed with SHA-256. The same file always produces the same fingerprint, byte for byte.' },
  { icon: IconRegistry, t: 'Batch template matching', d: 'Certificates issued from the same template share wording and layout — caught even when the file itself differs.' },
  { icon: IconQrCode, t: 'Scan-to-verify QR codes', d: "Every registered certificate gets a public link and QR code, so anyone can confirm it with no account." },
  { icon: IconBarChart, t: 'Admin analytics', d: 'Issuers see verification trends and genuine-vs-flagged ratios at a glance.' },
  { icon: IconClock, t: 'Full audit trail', d: 'Every check — who ran it, what it matched, when — stays logged for the institution to review.' },
  { icon: IconCheckCircle, t: 'Nothing sensitive stored', d: 'Only a hash and normalised text are kept for matching, never used to recreate or alter the original.' },
];

export default function Landing() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <Link to="/" className="brand"><Logo size={28} /> <span>CertVerify</span></Link>
        <nav className="landing-nav-links">
          <Link to="/login">Sign in</Link>
          <Link to="/register" className="btn btn--sm">Create account</Link>
        </nav>
      </header>

      <main className="landing-hero">
        <span className="eyebrow">Certificate verification platform</span>
        <h1>Know in seconds if a certificate is genuine.</h1>
        <p className="lead">
          CertVerify checks every upload against an issuer-maintained registry — by exact
          fingerprint and by the template it was printed from — so no one has to take
          anyone's word for it.
        </p>
        <div className="landing-cta">
          <Link to="/register" className="btn">Get started free</Link>
          <Link to="/login" className="btn btn--ghost">Sign in</Link>
        </div>
      </main>

      <section className="landing-steps">
        {STEPS.map((s) => (
          <div className="step" key={s.n}>
            <span className="step-n">{s.n}</span>
            <h3>{s.t}</h3>
            <p>{s.d}</p>
          </div>
        ))}
      </section>

      <section className="landing-features">
        <h2>Built for more than a yes/no check</h2>
        <div className="feature-grid">
          {FEATURES.map(({ icon: Icon, t, d }) => (
            <div className="feature-card" key={t}>
              <span className="feature-ico"><Icon /></span>
              <h3>{t}</h3>
              <p>{d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="landing-foot">
        <span><Logo size={20} /> CertVerify</span>
        <span className="muted">Fingerprint and template matching against an issuer-maintained registry.</span>
      </footer>
    </div>
  );
}
