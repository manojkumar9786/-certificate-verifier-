/** Small dependency-free SVG charts, styled from the same CSS tokens as the rest of the app. */

const VIEW_W = 640;

function pathFor(values, max, height) {
  const top = 12;
  const bottom = height - 10;
  const stepX = values.length > 1 ? VIEW_W / (values.length - 1) : 0;
  const toY = (v) => bottom - (v / max) * (bottom - top);
  return values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i * stepX).toFixed(1)} ${toY(v).toFixed(1)}`).join(' ');
}

/** Area + line chart for one or more day-indexed series. */
export function TrendChart({ days, series, height = 200 }) {
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const bottom = height - 10;
  const last = Math.max(days.length - 1, 1);

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${VIEW_W} ${height}`} preserveAspectRatio="none" className="chart-svg">
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" x2={VIEW_W} y1={bottom - f * (bottom - 12)} y2={bottom - f * (bottom - 12)} className="chart-grid" />
        ))}
        {series.map((s) => {
          const line = pathFor(s.values, max, height);
          const area = `${line} L ${VIEW_W} ${bottom} L 0 ${bottom} Z`;
          return (
            <g key={s.name}>
              <path d={area} fill={`var(${s.color})`} opacity="0.12" stroke="none" />
              <path d={line} fill="none" stroke={`var(${s.color})`} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          );
        })}
      </svg>
      <div className="chart-legend">
        {series.map((s) => (
          <span key={s.name}><i style={{ background: `var(${s.color})` }} />{s.name}</span>
        ))}
      </div>
      <div className="chart-axis">
        <span>{days[0]?.slice(5)}</span>
        <span>{days[Math.floor(last / 2)]?.slice(5)}</span>
        <span>{days[days.length - 1]?.slice(5)}</span>
      </div>
    </div>
  );
}

/** Donut breakdown for a small set of labelled counts. */
export function Donut({ segments, size = 140 }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  const r = size / 2 - 14;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="donut">
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label="Match type breakdown">
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--line)" strokeWidth="14" />
        {segments.map((seg) => {
          const frac = seg.value / total;
          const dash = frac * circumference;
          const el = (
            <circle
              key={seg.label}
              cx={c}
              cy={c}
              r={r}
              fill="none"
              stroke={`var(${seg.color})`}
              strokeWidth="14"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${c} ${c})`}
            />
          );
          offset += dash;
          return el;
        })}
      </svg>
      <div className="donut-legend">
        {segments.map((seg) => (
          <span key={seg.label}><i style={{ background: `var(${seg.color})` }} />{seg.label}<b>{seg.value}</b></span>
        ))}
      </div>
    </div>
  );
}
