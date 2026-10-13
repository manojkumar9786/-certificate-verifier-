import { useState } from 'react';
import { api } from '../api.js';
import { IconSparkles } from './Icons.jsx';

/** Optional, separate from the real hash/template result: asks a vision model whether
 * the certificate LOOKS visually consistent (fonts, alignment, spelling, colour). This is
 * an opinion about appearance only — it has no registry to check against and can be wrong
 * in either direction, so it never claims "genuine" or "fake". */
export default function AiCheck({ file, token }) {
  const [state, setState] = useState('idle'); // idle | busy | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function run() {
    setState('busy');
    setError('');
    try {
      const form = new FormData();
      form.append('certificate', file);
      const data = await api('/certificates/ai-check', { method: 'POST', form, token });
      setResult(data);
      setState('done');
    } catch (err) {
      setError(err.message);
      setState('error');
    }
  }

  if (state === 'idle') {
    return (
      <button type="button" className="ghost ai-check-btn" onClick={run}>
        <IconSparkles /> <span>Run AI plausibility check</span>
      </button>
    );
  }

  return (
    <div className="ai-check">
      <p className="ai-check-head"><IconSparkles /> AI plausibility check <span className="beta-pill">beta</span></p>
      {state === 'busy' && <p className="sub">Looking for visual inconsistencies…</p>}
      {state === 'error' && <p className="error">{error}</p>}
      {state === 'done' && (
        <>
          {result.flags.length === 0 ? (
            <p className="sub">No obvious visual red flags found.</p>
          ) : (
            <ul className="ai-flag-list">
              {result.flags.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          )}
          {result.note && <p className="sub">{result.note}</p>}
          <p className="ai-check-caveat">
            This is an AI opinion on visual appearance only — not proof the document is genuine or fake.
          </p>
        </>
      )}
    </div>
  );
}
