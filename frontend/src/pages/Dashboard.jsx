import { useCallback, useEffect, useRef, useState } from 'react';
import { api, certificateFileUrl } from '../api.js';
import { useAuth } from '../auth.jsx';
import { AppShell, EmptyState } from '../components/Shell.jsx';
import { Button } from '../components/Field.jsx';
import FilePreview, { Thumb } from '../components/FilePreview.jsx';
import { IconList, IconUpload } from '../components/Icons.jsx';

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
  const [previewUrl, setPreviewUrl] = useState(null);
  const [drag, setDrag] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadHistory = useCallback(() => {
    api('/certificates/history', { token }).then((d) => setHistory(d.checks)).catch(() => {});
  }, [token]);

  useEffect(loadHistory, [loadHistory]);

  // Preview the locally chosen file before it's ever uploaded.
  useEffect(() => {
    if (!file) return undefined;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pick(f) {
    setFile(f || null);
    if (!f) setPreviewUrl(null);
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
    <AppShell
      active="verify"
      title="Verify a certificate"
      subtitle="Upload a PDF, PNG or JPG and we'll match it against the registry of genuine certificates."
    >
      <section className="card">
        <header className="card-head">
          <h2><IconUpload className="card-ico" /> Upload to verify</h2>
          <span className="card-note">Max 5 MB</span>
        </header>

        <form onSubmit={submit} className="stack">
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
            {file ? (
              <>
                <FilePreview src={previewUrl} mimeType={file.type} height={190} />
                <p className="drop-file"><strong>{file.name}</strong><span className="sub">{sizeOf(file.size)} · click to change</span></p>
              </>
            ) : (
              <>
                <span className="drop-ico"><IconUpload /></span>
                <p className="drop-file"><strong>Drop your certificate here</strong><span className="sub">or click to browse</span></p>
              </>
            )}
          </div>

          {error && <p className="error" key={error}>{error}</p>}
          <Button busy={busy} disabled={!file}>{busy ? 'Checking…' : 'Verify certificate'}</Button>
        </form>

        {result && (
          <div className={`result ${result.status}`} key={result.hash + history.length}>
            <ResultIcon ok={result.status === 'genuine'} />
            <div className="result-body">
              {result.status === 'genuine' ? (
                <>
                  <h3>Genuine certificate</h3>
                  <p>
                    This matches a certificate registered to <strong>{result.holderName}</strong>
                    {result.certNumber && <> (No. {result.certNumber})</>}, added on {fmt(result.registeredAt)}.
                  </p>
                  {result.hasPreview && (
                    <FilePreview src={certificateFileUrl(result.certificateId)} mimeType={result.mimeType} height={240} />
                  )}
                </>
              ) : (
                <>
                  <h3>Not verified</h3>
                  <p>This file doesn't match any certificate in the registry. It may be altered, a copy of a copy, or not genuine.</p>
                </>
              )}
              <small className="hash">SHA-256 · {result.hash}</small>
            </div>
          </div>
        )}
      </section>

      <section className="card">
        <header className="card-head">
          <h2><IconList className="card-ico" /> Recent checks</h2>
          {history.length > 0 && <span className="card-note">{history.length} shown</span>}
        </header>

        {history.length === 0 ? (
          <EmptyState text="Nothing yet. Your verifications will show up here." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Preview</th><th>File</th><th>Result</th><th>When</th></tr>
              </thead>
              <tbody>
                {history.map((c) => (
                  <tr key={c.id}>
                    <td data-label="Preview"><Thumb hasPreview={c.hasPreview} certificateId={c.certificateId} mimeType={c.mimeType} /></td>
                    <td data-label="File" className="ellipsis">{c.fileName}</td>
                    <td data-label="Result">
                      <span className={`badge ${c.status === 'genuine' ? 'genuine' : 'not_verified'}`}>
                        {c.status === 'genuine' ? 'Genuine' : 'Not verified'}
                      </span>
                    </td>
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
