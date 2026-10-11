import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { publicVerifyUrl } from '../api.js';
import { IconCopy, IconExternalLink } from './Icons.jsx';

/** QR code + copyable link for a registered certificate's public, no-login verify page. */
export default function QrPanel({ certId }) {
  const url = publicVerifyUrl(certId);
  const [dataUrl, setDataUrl] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(url, { width: 220, margin: 1, color: { dark: '#12131a', light: '#ffffff' } })
      .then((d) => active && setDataUrl(d))
      .catch(() => {});
    return () => { active = false; };
  }, [url]);

  async function copy(e) {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      e.currentTarget.previousElementSibling?.select?.();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="qr-panel">
      {dataUrl ? (
        <img src={dataUrl} alt="QR code linking to this certificate's public verification page" className="qr-img" />
      ) : (
        <div className="qr-img qr-loading" />
      )}
      <p className="qr-hint">
        Print this on the certificate, or share the link. Anyone who scans it can confirm this
        certificate is registered — no account needed.
      </p>
      <div className="qr-link-row">
        <input readOnly value={url} onFocus={(e) => e.target.select()} />
        <button type="button" className="ghost" onClick={copy}><IconCopy /> <span>{copied ? 'Copied' : 'Copy'}</span></button>
      </div>
      <a href={url} target="_blank" rel="noreferrer" className="qr-open"><IconExternalLink /> Open the public page</a>
    </div>
  );
}
