/** Dependency-free stroke icon set. Every icon inherits currentColor and sizes from CSS. */
const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

export const IconShieldCheck = (p) => (
  <svg {...base} {...p}><path d="M12 3 5 6v6c0 4.5 3 7.7 7 9 4-1.3 7-4.5 7-9V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></svg>
);
export const IconUsers = (p) => (
  <svg {...base} {...p}><path d="M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19" /><circle cx="9.5" cy="8" r="3.2" /><path d="M17 10.2a3 3 0 1 0-1-5.85" /><path d="M20 19v-1.3a3 3 0 0 0-2-2.83" /></svg>
);
export const IconCheckCircle = (p) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="8.5" /><path d="m8.5 12.5 2.4 2.4L15.5 10" /></svg>
);
export const IconAlertTriangle = (p) => (
  <svg {...base} {...p}><path d="M10.6 4.2 2.9 18a1.8 1.8 0 0 0 1.5 2.7h15.2a1.8 1.8 0 0 0 1.5-2.7L13.4 4.2a1.8 1.8 0 0 0-2.8 0Z" /><path d="M12 9.5v4.2M12 16.8h.01" /></svg>
);
export const IconUpload = (p) => (
  <svg {...base} {...p}><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16.5v2A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5v-2" /></svg>
);
export const IconRegistry = (p) => (
  <svg {...base} {...p}><rect x="4" y="3.5" width="16" height="17" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>
);
export const IconList = (p) => (
  <svg {...base} {...p}><path d="M9 6h11M9 12h11M9 18h11" /><path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01" strokeWidth={2.4} /></svg>
);
export const IconInbox = (p) => (
  <svg {...base} {...p}><path d="M8 3h8l5 9v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7l5-9Z" /><path d="M3 12h5a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2h5" /></svg>
);
export const IconMenu = (p) => (
  <svg {...base} {...p} strokeWidth={2}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
);
export const IconClose = (p) => (
  <svg {...base} {...p} strokeWidth={2}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const IconLogout = (p) => (
  <svg {...base} {...p}><path d="M14 17v1.5A1.5 1.5 0 0 1 12.5 20h-6A1.5 1.5 0 0 1 5 18.5v-13A1.5 1.5 0 0 1 6.5 4h6A1.5 1.5 0 0 1 14 5.5V7" /><path d="M10 12h10m0 0-3-3m3 3-3 3" /></svg>
);
export const IconPlus = (p) => (
  <svg {...base} {...p} strokeWidth={2}><path d="M12 5v14M5 12h14" /></svg>
);
export const IconTrash = (p) => (
  <svg {...base} {...p}><path d="M4.5 7h15M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7" /><path d="M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4L17.5 7" /></svg>
);
export const IconFile = (p) => (
  <svg {...base} {...p}><path d="M13.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5L13.5 3Z" /><path d="M13.5 3v5.5H19" /></svg>
);
export const IconQrCode = (p) => (
  <svg {...base} {...p}>
    <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1" /><rect x="14" y="3.5" width="6.5" height="6.5" rx="1" />
    <rect x="3.5" y="14" width="6.5" height="6.5" rx="1" />
    <path d="M14 14.2h3M14 17.5h6.5M14 20.5h3M20.5 14v3M17.5 17.5v3" />
  </svg>
);
export const IconBarChart = (p) => (
  <svg {...base} {...p}><path d="M4 20V10M10.5 20V4M17 20v-7" /><path d="M3 20h18" /></svg>
);
export const IconDownload = (p) => (
  <svg {...base} {...p}><path d="M12 3v12M7 10.5l5 5 5-5" /><path d="M4.5 17v2A1.5 1.5 0 0 0 6 20.5h12a1.5 1.5 0 0 0 1.5-1.5v-2" /></svg>
);
export const IconCopy = (p) => (
  <svg {...base} {...p}><rect x="8.5" y="8.5" width="11.5" height="11.5" rx="1.8" /><path d="M15.5 8.5V6A1.5 1.5 0 0 0 14 4.5H5.5A1.5 1.5 0 0 0 4 6v8.5A1.5 1.5 0 0 0 5.5 16H8" /></svg>
);
export const IconClock = (p) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3.2 2" /></svg>
);
export const IconExternalLink = (p) => (
  <svg {...base} {...p}><path d="M9 6H6.5A2.5 2.5 0 0 0 4 8.5v9A2.5 2.5 0 0 0 6.5 20h9a2.5 2.5 0 0 0 2.5-2.5V15" /><path d="M14 4h6v6M20 4 11 13" /></svg>
);
export const IconChat = (p) => (
  <svg {...base} {...p}><path d="M4 5.5h16v11H9l-4 3.5v-3.5H4v-11Z" /><path d="M8 9.5h8M8 13h5" /></svg>
);
export const IconSend = (p) => (
  <svg {...base} {...p}><path d="m4 12 16-7.5L13 20l-2-7-7-1Z" /></svg>
);
export const IconLink = (p) => (
  <svg {...base} {...p}><path d="M9.5 14.5 14.5 9.5" /><path d="M8 16.5 5.8 18.7a3 3 0 1 1-4.2-4.2L3.8 12.3" /><path d="M16 7.5l2.2-2.2a3 3 0 1 1 4.2 4.2L20.2 11.7" /></svg>
);
export const IconWand = (p) => (
  <svg {...base} {...p}><path d="M5 19 16 8" /><path d="M14 4.5v2M19.5 10h2M19 5l-1.4 1.4M6 20l1.4-1.4" /></svg>
);
export const IconSparkles = (p) => (
  <svg {...base} {...p}><path d="M12 3v4M12 17v4M4.5 12h4M15.5 12h4M6.5 6.5l2.6 2.6M14.9 14.9l2.6 2.6M17.5 6.5l-2.6 2.6M9.1 14.9l-2.6 2.6" /></svg>
);

/** Large result glyph for a verify outcome — the drawn check/warn mark used on both
 * the signed-in dashboard and the public verify page, so the two stay visually identical. */
export function IconResult({ ok }) {
  return ok ? (
    <svg className="ricon ok" viewBox="0 0 52 52" aria-hidden="true">
      <circle cx="26" cy="26" r="24" />
      <path d="m15 27 8 8 15-16" />
    </svg>
  ) : (
    <svg className="ricon warn" viewBox="0 0 52 52" aria-hidden="true">
      <circle cx="26" cy="26" r="24" />
      <path d="M26 14v16M26 37v1" />
    </svg>
  );
}
