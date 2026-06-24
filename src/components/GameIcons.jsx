// Odd One Out — 3 matching circles + 1 odd triangle
export function OddOneOutIcon({ size = 40 }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      <circle cx="13" cy="13" r="9" fill="#d1d5db" />
      <circle cx="35" cy="13" r="9" fill="#d1d5db" />
      <circle cx="13" cy="35" r="9" fill="#d1d5db" />
      <polygon points="35,26 44,44 26,44" fill="#ff6b35" />
    </svg>
  );
}

// Sequence — ascending bars showing ordered ranking
export function SequenceIcon({ size = 40 }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      <rect x="3"  y="37" width="9" height="10" rx="2" fill="#ff6b4a" opacity="0.3" />
      <rect x="14" y="28" width="9" height="19" rx="2" fill="#ff6b4a" opacity="0.5" />
      <rect x="25" y="18" width="9" height="29" rx="2" fill="#ff6b4a" opacity="0.75" />
      <rect x="36" y="8"  width="9" height="39" rx="2" fill="#ff6b4a" />
    </svg>
  );
}

// Chain Link — 3×3 dot grid with a highlighted path
export function ChainLinkIcon({ size = 40 }) {
  const grid = [
    [6,6],[24,6],[42,6],
    [6,24],[24,24],[42,24],
    [6,42],[24,42],[42,42],
  ];
  const path = [[6,6],[24,6],[42,6],[42,24],[42,42],[24,42]];
  const inPath = new Set(path.map(([x,y]) => `${x},${y}`));

  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      {path.slice(0, -1).map(([x1,y1], i) => {
        const [x2,y2] = path[i + 1];
        return (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" />
        );
      })}
      {grid.map(([cx,cy]) => (
        <circle key={`${cx},${cy}`} cx={cx} cy={cy}
          r={inPath.has(`${cx},${cy}`) ? 5 : 3.5}
          fill={inPath.has(`${cx},${cy}`) ? '#a855f7' : '#d1d5db'} />
      ))}
    </svg>
  );
}

// Zero In — radar crosshair target
export function ZeroInIcon({ size = 40 }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      <circle cx="24" cy="24" r="20" fill="none" stroke="#c9a227" strokeWidth="1.5" opacity="0.35" />
      <circle cx="24" cy="24" r="13" fill="none" stroke="#c9a227" strokeWidth="1.5" opacity="0.6" />
      <circle cx="24" cy="24" r="6"  fill="none" stroke="#c9a227" strokeWidth="1.5" />
      <line x1="24" y1="2"  x2="24" y2="16" stroke="#c9a227" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="24" y1="32" x2="24" y2="46" stroke="#c9a227" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2"  y1="24" x2="16" y2="24" stroke="#c9a227" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="32" y1="24" x2="46" y2="24" stroke="#c9a227" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="24" cy="24" r="2" fill="#c9a227" />
    </svg>
  );
}
