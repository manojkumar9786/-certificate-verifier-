import { useEffect } from 'react';
import { IconClose } from './Icons.jsx';

/** Centred overlay dialog. Closes on Escape, backdrop click, or the close button. */
export default function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal ${wide ? 'modal--wide' : ''}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><IconClose /></button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
