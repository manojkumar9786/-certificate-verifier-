import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { AuthCard } from '../components/Shell.jsx';
import Field, { Button, StrengthBar } from '../components/Field.jsx';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api('/auth/register', { method: 'POST', body: form });
      navigate('/verify', { state: { email: form.email } });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Verify certificates in seconds"
      footer={<>Already have an account? <Link to="/login">Sign in</Link></>}
    >
      <form onSubmit={submit} className="stagger">
        <Field label="Full name" value={form.name} onChange={set('name')} required autoComplete="name" />
        <Field label="Email address" type="email" value={form.email} onChange={set('email')} required autoComplete="email" />
        <div>
          <Field label="Password" type="password" value={form.password} onChange={set('password')} required minLength={8} autoComplete="new-password" />
          <StrengthBar password={form.password} />
        </div>
        {error && <p className="error" key={error}>{error}</p>}
        <Button busy={busy}>{busy ? 'Sending code…' : 'Create account'}</Button>
      </form>
    </AuthCard>
  );
}
