import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { AuthCard } from '../components/Shell.jsx';
import { Button } from '../components/Field.jsx';
import OtpInput from '../components/OtpInput.jsx';

export default function VerifyOtp() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { login } = useAuth();
  const email = state?.email;

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(60);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  if (!email) return <Navigate to="/register" replace />;

  async function submit(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    setBusy(true);
    try {
      const data = await api('/auth/verify-otp', { method: 'POST', body: { email, otp } });
      login(data.token, data.user);
      navigate('/');
    } catch (err) {
      setError(err.message);
      setOtp('');
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setError('');
    setInfo('');
    try {
      await api('/auth/resend-otp', { method: 'POST', body: { email } });
      setInfo('A new code is on its way.');
      setCooldown(60);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <AuthCard
      title="Check your email"
      subtitle={<>We sent a 6-digit code to <strong>{email}</strong></>}
      footer={<Link to="/login">← Back to sign in</Link>}
    >
      <form onSubmit={submit} className="stagger">
        <OtpInput value={otp} onChange={setOtp} />
        {error && <p className="error" key={error}>{error}</p>}
        {info && <p className="success">{info}</p>}
        <Button busy={busy} disabled={otp.length !== 6}>{busy ? 'Verifying…' : 'Verify & continue'}</Button>
        <p className="center-text sub">
          Didn't get it?{' '}
          <button type="button" className="link" onClick={resend} disabled={cooldown > 0}>
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
          </button>
        </p>
      </form>
    </AuthCard>
  );
}
