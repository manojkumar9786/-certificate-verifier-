import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { IconChat, IconClose, IconSend } from './Icons.jsx';

const GREETING = "Hi! Ask me how CertVerify works, or why a certificate of yours didn't verify.";

/** Floating help-chat widget, grounded in how CertVerify actually works and (for a
 * "why didn't mine verify" question) the signed-in user's own recent checks. */
export default function ChatWidget() {
  const { token, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'assistant', text: GREETING }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open, busy]);

  if (!token || !user) return null;

  async function send(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setError('');
    const next = [...messages, { role: 'user', text }];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      const history = next.slice(-8).map((m) => ({ role: m.role, text: m.text }));
      const data = await api('/assistant/chat', { method: 'POST', body: { message: text, history }, token });
      setMessages((m) => [...m, { role: 'assistant', text: data.reply }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="chat-widget">
      {open && (
        <div className="chat-panel" role="dialog" aria-label="Ask CertVerify">
          <header className="chat-head">
            <span><IconChat /> Ask CertVerify</span>
            <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label="Close chat"><IconClose /></button>
          </header>
          <div className="chat-list" ref={listRef}>
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg chat-msg--${m.role}`}>{m.text}</div>
            ))}
            {busy && <div className="chat-msg chat-msg--assistant chat-msg--typing">Thinking…</div>}
          </div>
          {error && <p className="error chat-error">{error}</p>}
          <form className="chat-input" onSubmit={send}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question…"
              disabled={busy}
              maxLength={1000}
            />
            <button type="submit" disabled={busy || !input.trim()} aria-label="Send"><IconSend /></button>
          </form>
        </div>
      )}
      <button type="button" className="chat-fab" onClick={() => setOpen((o) => !o)} aria-label={open ? 'Close help chat' : 'Open help chat'}>
        {open ? <IconClose /> : <IconChat />}
      </button>
    </div>
  );
}
