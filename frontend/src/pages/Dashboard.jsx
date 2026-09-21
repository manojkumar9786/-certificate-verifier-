import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Shell, TopBar } from '../components/Shell.jsx';
import { Button } from '../components/Field.jsx';

export const fmt = (d) => new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const sizeOf = (b) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

function ResultIcon({ ok }) {
  return ok ? (
    <svg className="ricon ok" viewBox="0 0 52 52" aria-hidden="true">
      <circle cx="26" cy="26" r="24" />
      <path d="m15 27 8 8 15-16" />
    </svg>
  ) : (
    <svg className="ricon warn" viewBox="0 0 52 52" aria-hidden="true">
      <circle cx="26" cy="26" r="24" />
      <path d="M26 14v16M26 37v1" />
    </svg>
  );
}

export default function Dashboard() {
  const { token } = useAuth();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadHistory = useCallback(() => {
    api('/certificates/history', { token }).then((d) => setHistory(d.checks)).catch(() => {});
  }, [token]);

  useEffect(loadHistory, [loadHistory]);

  function pick(f) {
    setFile(f || null);
    setResult(null);
    setError('');
  }

  async function submit(e) {
    e.preventDefault();
    if (!file) return;
    setError('');
    setResult(null);
    setBusy(true);
    try {
      const form = new FormData();
      form.append('certificate', file);
      setResult(await api('/certificates/verify', { method: 'POST', form, token }));
      loadHistory();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <div className="page">
        <TopBar active="verify" />

        <section className="glass card rise">
          <h2>Verify a certificate</h2>
          <p className="sub">Upload a PDF, PNG or JPG (max 5 MB) and we'll tell you if it's an original or a duplicate.</p>

          <form onSubmit={submit}>
            <div
              className={`drop ${drag ? 'over' : ''} ${file ? 'has' : ''}`}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
            >
              <input ref={inputRef} type="file" hidden accept="application/pdf,image/png,image/jpeg" onChange={(e) => pick(e.target.files[0])} />
              <svg viewBox="0 0 48 48" className="up-ico" aria-hidden="true">
                <path d="M24 32V10M15 19l9-9 9 9M8 34v4a2 2 0 0 0 2 2h28a2 2 0 0 0 2-2v-4" />
              </svg>
              {file ? (
                <p><strong>{file.name}</strong><br /><span className="sub">{sizeOf(file.size)} · click to change</span></p>
              ) : (
                <p><strong>Drop your certificate here</strong><br /><span className="sub">or click to browse</span></p>
              )}
            </div>

            {error && <p className="error" key={error}>{error}</p>}
            <Button busy={busy} disabled={!file}>{busy ? 'Checking…' : 'Verify certificate'}</Button>
          </form>

          {result && (
            <div className={`result ${result.status}`} key={result.hash + history.length}>
              <ResultIcon ok={result.status === 'original'} />
              <div>
                {result.status === 'original' ? (
                  <>
                    <h3>Original</h3>
                    <p>This certificate hasn't been seen before. It's now registered under your account.</p>
                  </>
                ) : (
                  <>
                    <h3>Duplicate</h3>
                    <p>
                      This exact certificate was already uploaded {result.firstUploadedByYou ? 'by you' : 'by another user'} on{' '}
                      {fmt(result.firstUploadedAt)}.
                    </p>
                  </>
                )}
                <small className="hash">SHA-256 · {result.hash}</small>
              </div>
            </div>
          )}
        </section>

        <section className="glass card rise d2">
          <h2>Recent checks</h2>
          {history.length === 0 ? (
            <p className="sub">Nothing yet. Your verifications will show up here.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>File</th><th>Result</th><th>When</th></tr></thead>
                <tbody>
                  {history.map((c) => (
                    <tr key={c.id}>
                      <td className="ellipsis">{c.fileName}</td>
                      <td><span className={`badge ${c.status}`}>{c.status}</span></td>
                      <td className="nowrap">{fmt(c.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </Shell>
  );
}
