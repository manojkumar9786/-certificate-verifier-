import { IconQrCode } from './Icons.jsx';

const isUrl = (s) => /^https?:\/\//i.test(s);

/** Shows any QR code(s) printed on the certificate itself — e.g. the issuer's own
 * verification QR — decoded server-side. A second trust signal independent of our
 * own hash/template match. */
export default function QrFound({ codes }) {
  if (!codes || codes.length === 0) return null;
  return (
    <div className="qr-found">
      <p className="result-note">
        <IconQrCode /> This certificate has its own embedded QR code{codes.length > 1 ? 's' : ''} — decoded below:
      </p>
      <ul className="qr-found-list">
        {codes.map((code, i) => (
          <li key={i}>
            {isUrl(code) ? (
              <a href={code} target="_blank" rel="noreferrer">{code}</a>
            ) : (
              <span className="mono">{code}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
