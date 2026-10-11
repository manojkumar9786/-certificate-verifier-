import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { AppShell, EmptyState } from '../components/Shell.jsx';
import { IconClock, IconDownload } from '../components/Icons.jsx';
import { fmt } from './Dashboard.jsx';

function toCsv(rows) {
  const headers = ['ID', 'User', 'Email', 'File', 'Result', 'Matched holder', 'Hash', 'When'];
  const lines = [headers.join(',')];
  for (const r of rows) {
    const cells = [r.id, r.userName, r.userEmail, r.fileName, r.status, r.matchedHolder || '', r.hash, r.createdAt]
      .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`);
    lines.push(cells.join(','));
  }
  return lines.join('\n');
}

export default function AuditLog() {
  const { token } = useAuth();
  const [checks, setChecks] = useState([]);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api('/admin/checks', { token }).then((d) => setChecks(d.checks)).catch((e) => setError(e.message));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  function exportCsv() {
    const blob = new Blob([toCsv(checks)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certverify-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell
      active="audit"
      eyebrow="Administration"
      title="Audit log"
      subtitle="Every verification attempt across every account, newest first."
    >
      {error && <p className="error">{error}</p>}

      <section className="card">
        <header className="card-head">
          <h2><IconClock className="card-ico" /> All checks</h2>
          {checks.length > 0 && (
            <span className="card-actions">
              <span className="card-note">{checks.length} shown</span>
              <button type="button" className="ghost" onClick={exportCsv}><IconDownload /> <span>Export CSV</span></button>
            </span>
          )}
        </header>

        {checks.length === 0 ? (
          <EmptyState text="No checks have been run yet." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>User</th><th>File</th><th>Result</th><th>Matched</th><th>When</th></tr>
              </thead>
              <tbody>
                {checks.map((c) => (
                  <tr key={c.id}>
                    <td data-label="User">
                      <span className="who-stack">
                        <span>{c.userName}</span>
                        <span className="muted">{c.userEmail}</span>
                      </span>
                    </td>
                    <td data-label="File" className="ellipsis">{c.fileName}</td>
                    <td data-label="Result">
                      <span className={`badge ${c.status === 'genuine' ? 'genuine' : 'not_verified'}`}>
                        {c.status === 'genuine' ? 'Genuine' : 'Not verified'}
                      </span>
                    </td>
                    <td data-label="Matched">{c.matchedHolder || <span className="muted">—</span>}</td>
                    <td data-label="When" className="nowrap muted">{fmt(c.createdAt)}</td>
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
