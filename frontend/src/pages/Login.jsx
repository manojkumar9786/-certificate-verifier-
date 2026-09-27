import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { AuthLayout } from '../components/Shell.jsx';
import Field, { Button } from '../components/Field.jsx';

export default function Login() {
  const navigate = useNavigate();
  const { token, login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (token) return <Navigate to="/" replace />;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = await api('/auth/login', { method: 'POST', body: form });
      login(data.token, data.user);
      navigate(data.user.role === 'admin' ? '/admin' : '/');
    } catch (err) {
      if (err.data?.needsVerification) {
        navigate('/verify', { state: { email: err.data.email } });
      } else {
        setError(err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Welcome back — verify a certificate in seconds."
      footer={<>New here? <Link to="/register">Create an account</Link></>}
    >
      <form onSubmit={submit} className="stack">
        <Field label="Email address" type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" required autoComplete="email" />
        <Field label="Password" type="password" value={form.password} onChange={set('password')} placeholder="••••••••" required autoComplete="current-password" />
        {error && <p className="error" key={error}>{error}</p>}
        <Button busy={busy}>{busy ? 'Signing in…' : 'Sign in'}</Button>
      </form>
    </AuthLayout>
  );
}
