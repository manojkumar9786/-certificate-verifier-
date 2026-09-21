import { useEffect, useRef } from 'react';

/** Six separate digit boxes with auto-advance, backspace and paste support. */
export default function OtpInput({ value, onChange, length = 6 }) {
  const refs = useRef([]);

  useEffect(() => refs.current[0]?.focus(), []);

  const focus = (i) => refs.current[Math.max(0, Math.min(i, length - 1))]?.focus();

  function handleChange(i, e) {
    let digits = e.target.value.replace(/\D/g, '');
    if (!digits) return;
    if (value[i] && digits.length === 2) digits = digits.replace(value[i], ''); // typed over an existing digit
    const tail = digits.length === 1 ? value.slice(i + 1) : '';
    const next = (value.slice(0, i) + digits + tail).slice(0, length);
    onChange(next);
    focus(i + digits.length);
  }

  function handleKeyDown(i, e) {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (value[i]) {
        onChange(value.slice(0, i) + value.slice(i + 1));
      } else if (i > 0) {
        onChange(value.slice(0, i - 1) + value.slice(i));
        focus(i - 1);
      }
    } else if (e.key === 'ArrowLeft') focus(i - 1);
    else if (e.key === 'ArrowRight') focus(i + 1);
  }

  function handlePaste(e) {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    onChange(digits);
    focus(digits.length);
  }

  return (
    <div className="otp-row" onPaste={handlePaste}>
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          className={value[i] ? 'filled' : ''}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={`Digit ${i + 1}`}
          value={value[i] || ''}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}
