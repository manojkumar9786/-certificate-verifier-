import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, certificateFileUrl } from '../api.js';
import { Logo } from '../components/Shell.jsx';
import FilePreview from '../components/FilePreview.jsx';
import QrFound from '../components/QrFound.jsx';
import { IconResult, IconShieldCheck } from '../components/Icons.jsx';
import { fmt } from './Dashboard.jsx';

/** No-login page a QR code or shared link opens. Looks a registered certificate up by id
 * so an employer can confirm it's on file without creating an account. */
export default function PublicVerify() {
  const { certId } = useParams();
  const [cert, setCert] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError('');
    api(`/certificates/${certId}/public`)
      .then(setCert)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [certId]);

  return (
    <div className="public-verify">
      <header className="landing-nav">
        <Link to="/" className="brand"><Logo size={28} /> <span>CertVerify</span></Link>
        <Link to="/login" className="btn btn--ghost btn--sm">Sign in</Link>
      </header>

      <main className="public-card">
        {loading ? (
          <p className="loading">Checking the registry…</p>
        ) : error ? (
          <div className="result not_verified">
            <IconResult ok={false} />
            <div className="result-body">
              <h3>Certificate not found</h3>
              <p>No registry entry matches this link. It may have been removed, or the ID is wrong.</p>
            </div>
          </div>
        ) : (
          <div className="result genuine">
            <IconResult ok />
            <div className="result-body">
              <h3>Registered with CertVerify</h3>
              <p>
                Certificate <strong>#{cert.id}</strong>
                {cert.holderName && <> issued to <strong>{cert.holderName}</strong></>}
                {cert.certNumber && <> (No. {cert.certNumber})</>} is on file with the issuer, registered on {fmt(cert.registeredAt)}.
              </p>
              <p className="result-note">
                This confirms the certificate exists in the issuer's registry. To check whether a
                specific physical or digital copy matches it byte for byte, <Link to="/register">create a free account</Link> and upload it.
              </p>
              {cert.hasPreview && (
                <>
                  <p className="result-note">Registered sample:</p>
                  <FilePreview src={certificateFileUrl(cert.id)} mimeType={cert.mimeType} height={260} />
                </>
              )}
              <QrFound codes={cert.embeddedQrCodes} />
              <small className="hash">SHA-256 · {cert.hash}</small>
            </div>
          </div>
        )}
      </main>

      <p className="public-foot"><IconShieldCheck /> Verified without an account — the way certificate checking should work.</p>
    </div>
  );
}
