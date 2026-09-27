import { certificateFileUrl } from '../api.js';

/** Renders an image inline, a PDF inline via <embed>, or a placeholder when there's nothing to show. */
export default function FilePreview({ src, mimeType, height = 220, empty = 'No preview available' }) {
  if (!src) return <div className="file-preview file-preview-empty" style={{ height }}>{empty}</div>;
  if (mimeType?.startsWith('image/')) {
    return <img src={src} alt="Certificate preview" className="file-preview" style={{ maxHeight: height }} />;
  }
  if (mimeType === 'application/pdf') {
    return <embed src={src} type="application/pdf" className="file-preview" style={{ height }} />;
  }
  return <div className="file-preview file-preview-empty" style={{ height }}>{empty}</div>;
}

/** Small clickable thumbnail for a table row — image crop, a "PDF" badge, or a dash when there's nothing stored. */
export function Thumb({ hasPreview, certificateId, mimeType }) {
  if (!hasPreview) return <span className="thumb thumb-empty" title="No preview available">—</span>;
  const url = certificateFileUrl(certificateId);
  return (
    <a href={url} target="_blank" rel="noreferrer" title="Open full size">
      {mimeType?.startsWith('image/') ? (
        <img src={url} alt="" className="thumb" />
      ) : (
        <span className="thumb thumb-pdf">PDF</span>
      )}
    </a>
  );
}
