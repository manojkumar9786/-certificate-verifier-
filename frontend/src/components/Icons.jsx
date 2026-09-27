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
