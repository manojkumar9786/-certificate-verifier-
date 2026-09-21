import { useState } from 'react';

/** Floating-label input. Password fields get a show/hide toggle. */
export default function Field({ label, type = 'text', ...rest }) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div className="field">
      <input {...rest} type={isPassword && show ? 'text' : type} placeholder=" " />
      <label>{label}</label>
      {isPassword && (
        <button type="button" className="eye" onClick={() => setShow((s) => !s)} tabIndex={-1}>
          {show ? 'Hide' : 'Show'}
        </button>
      )}
    </div>
  );
}

export function strength(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) s++;
  return s;
}

export function StrengthBar({ password }) {
  if (!password) return null;
  const s = strength(password);
  const labels = ['Too weak', 'Weak', 'Okay', 'Good', 'Strong'];
  return (
    <div className={`strength s${s}`}>
      <div className="bars">{[0, 1, 2, 3].map((i) => <i key={i} className={i < s ? 'fill' : ''} />)}</div>
      <small>{labels[s]}</small>
    </div>
  );
}

export function Button({ busy, children, ...rest }) {
  return (
    <button className="btn" disabled={busy || rest.disabled} {...rest}>
      {busy && <span className="spin" />}
      <span>{children}</span>
    </button>
  );
}
