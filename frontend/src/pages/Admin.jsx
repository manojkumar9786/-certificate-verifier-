import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { AppShell, EmptyState } from '../components/Shell.jsx';
import Field, { Button } from '../components/Field.jsx';
import { Thumb } from '../components/FilePreview.jsx';
import {
  IconAlertTriangle, IconCheckCircle, IconList, IconPlus,
  IconRegistry, IconShieldCheck, IconTrash, IconUsers,
} from '../components/Icons.jsx';
import { fmt } from './Dashboard.jsx';

const STATS = [
  ['users', 'Users', 'neutral', IconUsers],
  ['verifiedUsers', 'Verified', 'ok', IconCheckCircle],
  ['certificates', 'Registry size', 'neutral', IconRegistry],
  ['checks', 'Checks run', 'neutral', IconList],
  ['genuineMatches', 'Genuine matches', 'ok', IconShieldCheck],
  ['notVerified', 'Not verified', 'warn', IconAlertTriangle],
];

export default function Admin() {
  const { token } = useAuth();
  const inputRef = useRef(null);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [certs, setCerts] = useState([]);
  const [error, setError] = useState('');

  const [holderName, setHolderName] = useState('');
  const [certNumber, setCertNumber] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState('');

  const load = useCallback(async () => {
    try {
      const [s, u, c] = await Promise.all([
        api('/admin/stats', { token }),
        api('/admin/users', { token }),
        api('/admin/certificates', { token }),
      ]);
      setStats(s);
      setUsers(u.users);
      setCerts(c.certificates);
    } catch (err) {
      setError(err.message);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function register(e) {
    e.preventDefault();
    if (!file || !holderName.trim()) return;
    setError('');
    setInfo('');
    setBusy(true);
    try {
      const form = new FormData();
      form.append('certificate', file);
      form.append('holder_name', holderName.trim());
      form.append('cert_number', certNumber.trim());
      await api('/admin/certificates', { method: 'POST', form, token });
      setInfo(`Registered "${file.name}" for ${holderName.trim()}.`);
      setHolderName('');
      setCertNumber('');
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(c) {
    if (!window.confirm(`Remove "${c.fileName}" (${c.holderName}) from the registry? Uploads of this exact file will then show as "Not verified".`)) return;
    try {
      await api(`/admin/certificates/${c.id}`, { method: 'DELETE', token });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <AppShell
      active="admin"
      title="Admin dashboard"
      subtitle="Manage the registry of genuine certificates and see who's using CertVerify."
    >
      {error && <p className="error">{error}</p>}

      <div className="stats">
        {STATS.map(([key, label, tone, Icon]) => (
          <div className={`stat stat--${tone}`} key={key}>
            <span className="stat-ico"><Icon /></span>
            <span className="stat-body">
              <strong>{stats ? stats[key] : '–'}</strong>
              <small>{label}</small>
            </span>
          </div>
        ))}
      </div>

      <section className="card">
        <header className="card-head">
          <h2><IconPlus className="card-ico" /> Register a genuine certificate</h2>
        </header>
        <p className="sub">Only certificates added here will verify as "Genuine" when a user uploads them.</p>

        <form onSubmit={register} className="reg-form">
          <Field label="Holder name" value={holderName} onChange={(e) => setHolderName(e.target.value)} placeholder="e.g. Rahul Verma" required />
          <Field label="Certificate number" value={certNumber} onChange={(e) => setCertNumber(e.target.value)} placeholder="Optional" />
          <div className="field field--file">
            <label htmlFor="cert-file">Certificate file</label>
            <input
              id="cert-file"
              ref={inputRef}
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              onChange={(e) => setFile(e.target.files[0] || null)}
              required
            />
            <small className="field-hint">PDF, PNG or JPG · max 5 MB</small>
          </div>
          <div className="reg-actions">
            <Button busy={busy} disabled={!file || !holderName.trim()}>{busy ? 'Registering…' : 'Register certificate'}</Button>
            {info && <p className="success">{info}</p>}
          </div>
        </form>
      </section>

      <section className="card">
        <header className="card-head">
          <h2><IconRegistry className="card-ico" /> Registry</h2>
          {certs.length > 0 && <span className="card-note">{certs.length} certificates</span>}
        </header>

        {certs.length === 0 ? (
          <EmptyState text="No certificates registered yet." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Preview</th><th>File</th><th>Holder</th><th>Cert no.</th><th>Hash</th><th>Registered</th><th aria-label="Actions" /></tr>
              </thead>
              <tbody>
                {certs.map((c) => (
                  <tr key={c.id}>
                    <td data-label="Preview"><Thumb hasPreview={c.hasPreview} certificateId={c.id} mimeType={c.mimeType} /></td>
                    <td data-label="File" className="ellipsis">{c.fileName}</td>
                    <td data-label="Holder">{c.holderName || <span className="muted">—</span>}</td>
                    <td data-label="Cert no.">{c.certNumber || <span className="muted">—</span>}</td>
                    <td data-label="Hash" className="mono" title={c.hash}>{c.hash.slice(0, 10)}…</td>
                    <td data-label="Registered" className="nowrap muted">{fmt(c.createdAt)}</td>
                    <td data-label="" className="row-actions">
                      <button className="danger" onClick={() => remove(c)}><IconTrash /> <span>Delete</span></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <header className="card-head">
          <h2><IconUsers className="card-ico" /> Users</h2>
          {users.length > 0 && <span className="card-note">{users.length} accounts</span>}
        </header>

        {users.length === 0 ? (
          <EmptyState text="No users yet." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td data-label="Name">{u.name}</td>
                    <td data-label="Email" className="ellipsis muted">{u.email}</td>
                    <td data-label="Role"><span className={`pill ${u.role}`}>{u.role}</span></td>
                    <td data-label="Status">
                      <span className={`badge ${u.verified ? 'genuine' : 'not_verified'}`}>{u.verified ? 'Verified' : 'Unverified'}</span>
                    </td>
                    <td data-label="Joined" className="nowrap muted">{fmt(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}
