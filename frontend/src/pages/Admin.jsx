import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Shell, TopBar } from '../components/Shell.jsx';
import { fmt } from './Dashboard.jsx';

const STATS = [
  ['users', 'Users'],
  ['verifiedUsers', 'Verified'],
  ['certificates', 'Certificates'],
  ['checks', 'Checks run'],
  ['duplicates', 'Duplicates caught'],
];

export default function Admin() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [certs, setCerts] = useState([]);
  const [error, setError] = useState('');

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

  async function remove(c) {
    if (!window.confirm(`Delete "${c.fileName}"? The same file can then be registered as original again.`)) return;
    try {
      await api(`/admin/certificates/${c.id}`, { method: 'DELETE', token });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Shell>
      <div className="page wide">
        <TopBar active="admin" />
        {error && <p className="error">{error}</p>}

        <div className="stats">
          {STATS.map(([key, label], i) => (
            <div className="glass stat rise" style={{ animationDelay: `${i * 70}ms` }} key={key}>
              <span className="num">{stats ? stats[key] : '–'}</span>
              <span className="sub">{label}</span>
            </div>
          ))}
        </div>

        <section className="glass card rise d2">
          <h2>Certificates</h2>
          {certs.length === 0 ? (
            <p className="sub">No certificates registered yet.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>File</th><th>Uploaded by</th><th>Hash</th><th>When</th><th /></tr></thead>
                <tbody>
                  {certs.map((c) => (
                    <tr key={c.id}>
                      <td className="ellipsis">{c.fileName}</td>
                      <td>{c.uploadedBy}<br /><span className="sub">{c.uploadedByEmail}</span></td>
                      <td className="mono" title={c.hash}>{c.hash.slice(0, 12)}…</td>
                      <td className="nowrap">{fmt(c.createdAt)}</td>
                      <td><button className="danger" onClick={() => remove(c)}>Delete</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="glass card rise d3">
          <h2>Users</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td><span className={`pill ${u.role}`}>{u.role}</span></td>
                    <td><span className={`badge ${u.verified ? 'original' : 'duplicate'}`}>{u.verified ? 'verified' : 'unverified'}</span></td>
                    <td className="nowrap">{fmt(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </Shell>
  );
}
