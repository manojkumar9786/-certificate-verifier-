import { useCallback, useEffect, useRef, useState } from 'react';
import { api, certificateFileUrl } from '../api.js';
import { useAuth } from '../auth.jsx';
import { AppShell, EmptyState } from '../components/Shell.jsx';
import Field, { Button } from '../components/Field.jsx';
import { Thumb } from '../components/FilePreview.jsx';
import Modal from '../components/Modal.jsx';
import QrPanel from '../components/QrPanel.jsx';
import {
  IconAlertTriangle, IconCheckCircle, IconLink, IconList, IconPlus,
  IconQrCode, IconRegistry, IconShieldCheck, IconSparkles, IconTrash, IconUsers, IconWand,
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
  const [qrCert, setQrCert] = useState(null);
  const [extracting, setExtracting] = useState(false);

  const [ledgerBlocks, setLedgerBlocks] = useState([]);
  const [ledgerStatus, setLedgerStatus] = useState(null);
  const [ledgerBusy, setLedgerBusy] = useState(false);

  const [genTitle, setGenTitle] = useState('');
  const [genBody, setGenBody] = useState('');
  const [genDate, setGenDate] = useState('');
  const [genNames, setGenNames] = useState('');
  const [genBusy, setGenBusy] = useState(false);
  const [genResult, setGenResult] = useState(null);

  const load = useCallback(async () => {
    try {
      const [s, u, c, l] = await Promise.all([
        api('/admin/stats', { token }),
        api('/admin/users', { token }),
        api('/admin/certificates', { token }),
        api('/admin/ledger', { token }),
      ]);
      setStats(s);
      setUsers(u.users);
      setCerts(c.certificates);
      setLedgerBlocks(l.blocks);
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
      const added = await api('/admin/certificates', { method: 'POST', form, token });
      const qrNote = added.embeddedQrCodes?.length
        ? ` It also has its own embedded QR code${added.embeddedQrCodes.length > 1 ? 's' : ''} — visible on the Verify screen when checked.`
        : '';
      setInfo(`Registered "${file.name}" for ${holderName.trim()}.${qrNote}`);
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

  async function autoFill() {
    if (!file) return;
    setError('');
    setExtracting(true);
    try {
      const form = new FormData();
      form.append('certificate', file);
      const data = await api('/admin/certificates/extract', { method: 'POST', form, token });
      if (data.holderName) setHolderName(data.holderName);
      if (data.certNumber) setCertNumber(data.certNumber);
    } catch (err) {
      setError(err.message);
    } finally {
      setExtracting(false);
    }
  }

  async function verifyLedger() {
    setError('');
    setLedgerBusy(true);
    try {
      setLedgerStatus(await api('/admin/ledger/verify', { token }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLedgerBusy(false);
    }
  }

  async function generate(e) {
    e.preventDefault();
    if (!genTitle.trim() || !genBody.trim() || !genDate.trim() || !genNames.trim()) return;
    setError('');
    setGenResult(null);
    setGenBusy(true);
    try {
      const form = new FormData();
      form.append('event_title', genTitle.trim());
      form.append('body', genBody.trim());
      form.append('issue_date', genDate.trim());
      form.append('names', genNames);
      const result = await api('/admin/certificates/generate', { method: 'POST', form, token });
      setGenResult(result.created);
      setGenNames('');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setGenBusy(false);
    }
  }

  return (
    <AppShell
      active="admin"
      eyebrow="Administration"
      title="Registry control"
      subtitle="Add the certificates your institution issued, and see every account and check running through CertVerify."
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
          <h2><IconPlus className="card-ico" /> Register a sample certificate</h2>
        </header>
        <p className="sub">
          Upload one sample from a batch. Every certificate issued from the same template — same wording and
          layout, different name — will then verify as genuine.
        </p>

        <form onSubmit={register} className="reg-form">
          <Field label="Certificate / batch name" value={holderName} onChange={(e) => setHolderName(e.target.value)} placeholder="e.g. Hackathon 2026 — Participation" required />
          <Field label="Reference number" value={certNumber} onChange={(e) => setCertNumber(e.target.value)} placeholder="Optional" />
          <div className="field field--file">
            <label htmlFor="cert-file">Sample certificate file</label>
            <input
              id="cert-file"
              ref={inputRef}
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              onChange={(e) => setFile(e.target.files[0] || null)}
              required
            />
            <small className="field-hint">PDF, PNG or JPG · max 5 MB · text-based PDFs match a whole batch; images and scans match exactly only</small>
          </div>
          <div className="reg-actions">
            <Button busy={busy} disabled={!file || !holderName.trim()}>{busy ? 'Registering…' : 'Register sample'}</Button>
            <Button type="button" variant="ghost" busy={extracting} disabled={!file} onClick={autoFill}>
              <IconWand /> {extracting ? 'Reading file…' : 'Auto-fill from file'}
            </Button>
            {info && <p className="success">{info}</p>}
          </div>
        </form>
      </section>

      <section className="card">
        <header className="card-head">
          <h2><IconSparkles className="card-ico" /> Generate a batch of certificates</h2>
        </header>
        <p className="sub">
          No design file yet? Fill in the template once and get a ready-to-print, QR-verified certificate for
          every name below — each is registered straight into the registry, tamper-proof ledger included.
        </p>

        <form onSubmit={generate} className="reg-form">
          <Field label="Event / certificate title" value={genTitle} onChange={(e) => setGenTitle(e.target.value)} placeholder="e.g. Hackathon 2026 — Participation" required />
          <Field label="Issue date" value={genDate} onChange={(e) => setGenDate(e.target.value)} placeholder="e.g. 19 Oct 2026" required />
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="gen-body">Certificate text</label>
            <textarea
              id="gen-body"
              value={genBody}
              onChange={(e) => setGenBody(e.target.value)}
              placeholder="This is to certify that {name} has successfully completed..."
              rows={3}
              required
            />
            <small className="field-hint">Use <code>{'{name}'}</code> where the recipient's name should go — it's filled in per certificate.</small>
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="gen-names">Recipient names</label>
            <textarea
              id="gen-names"
              value={genNames}
              onChange={(e) => setGenNames(e.target.value)}
              placeholder={'One name per line, e.g.\nArun Kumar\nDivya Sree'}
              rows={4}
              required
            />
            <small className="field-hint">One per line (or comma-separated) · up to 100 at a time</small>
          </div>
          <div className="reg-actions">
            <Button busy={genBusy} disabled={!genTitle.trim() || !genBody.trim() || !genDate.trim() || !genNames.trim()}>
              {genBusy ? 'Generating…' : 'Generate & register'}
            </Button>
            {genResult && <p className="success">{genResult.length} certificate{genResult.length > 1 ? 's' : ''} generated and registered.</p>}
          </div>
        </form>

        {genResult && (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Holder</th><th>Download</th></tr></thead>
              <tbody>
                {genResult.map((c) => (
                  <tr key={c.id}>
                    <td data-label="Holder">{c.holderName}</td>
                    <td data-label="Download"><a className="ghost" href={certificateFileUrl(c.id)} target="_blank" rel="noreferrer">PDF</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
                      <button type="button" className="ghost" onClick={() => setQrCert(c)}><IconQrCode /> <span>QR</span></button>
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
          <h2><IconLink className="card-ico" /> Tamper-proof ledger</h2>
          {ledgerBlocks.length > 0 && <span className="card-note">{ledgerBlocks.length} blocks</span>}
        </header>
        <p className="sub">
          Every registration — manual or generated — is chained to the one before it, like a blockchain ledger.
          Editing or deleting any past entry's data would break every block after it; the registry's history
          can only ever grow.
        </p>

        <div className="reg-actions">
          <Button type="button" variant="ghost" busy={ledgerBusy} onClick={verifyLedger}>
            {ledgerBusy ? 'Checking…' : 'Verify chain integrity'}
          </Button>
          {ledgerStatus && (
            <span className={`badge ${ledgerStatus.valid ? 'genuine' : 'not_verified'}`}>
              {ledgerStatus.valid
                ? `Verified — all ${ledgerStatus.blocks} blocks intact`
                : `Tampered — chain breaks at block #${ledgerStatus.brokenAt}`}
            </span>
          )}
        </div>

        {ledgerBlocks.length === 0 ? (
          <EmptyState text="No ledger blocks yet." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>#</th><th>Holder</th><th>Certificate hash</th><th>Block hash</th><th>Recorded</th></tr>
              </thead>
              <tbody>
                {ledgerBlocks.map((b) => (
                  <tr key={b.idx}>
                    <td data-label="#">{b.idx}</td>
                    <td data-label="Holder">{b.holderName || <span className="muted">—</span>}</td>
                    <td data-label="Certificate hash" className="mono" title={b.certHash}>{b.certHash.slice(0, 10)}…</td>
                    <td data-label="Block hash" className="mono" title={b.blockHash}>{b.blockHash.slice(0, 10)}…</td>
                    <td data-label="Recorded" className="nowrap muted">{fmt(b.createdAt)}</td>
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

      {qrCert && (
        <Modal title={`Verify link — ${qrCert.holderName || qrCert.fileName}`} onClose={() => setQrCert(null)}>
          <QrPanel certId={qrCert.id} />
        </Modal>
      )}
    </AppShell>
  );
}
