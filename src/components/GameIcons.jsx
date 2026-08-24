// Odd One Out — 3 matching circles + 1 odd triangle
export function OddOneOutIcon({ size = 40 }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      <circle cx="13" cy="13" r="9" fill="#d1d5db" />
      <circle cx="35" cy="13" r="9" fill="#d1d5db" />
      <circle cx="13" cy="35" r="9" fill="#d1d5db" />
      <polygon points="35,26 44,44 26,44" fill="#84cc16" />
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

// Knot — overhand knot, one continuous rope
export function KnotIcon({ size = 40 }) {
  const C = '#e0932a';
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      <defs>
        <mask id="knot-hub-km">
          <rect width="48" height="48" fill="white" />
          <ellipse cx="19" cy="31" rx="5.5" ry="4" fill="black" transform="rotate(35 19 31)" />
        </mask>
      </defs>
      <path
        d="M 11 44 C 12 40 14 36 16 32"
        fill="none" stroke={C} strokeWidth="4.5" strokeLinecap="round"
        mask="url(#knot-hub-km)"
      />
      <path
        d="M 16 32
           C 12 26 8 16 14 8
           C 20 0 32 2 36 10
           C 40 18 38 28 34 32
           C 30 36 24 36 20 32
           C 18 28 20 28 24 32
           C 28 36 34 42 37 44"
        fill="none" stroke={C} strokeWidth="4.5" strokeLinecap="round"
      />
    </svg>
  );
}

// Pathways — two colored dot-pairs connected by right-angle flow lines
export function PathwaysIcon({ size = 40 }) {
  const blue = '#3b82f6';
  const copper = '#d97757';
  const bluePath = [[8, 8], [24, 8], [24, 24], [8, 24]];
  const copperPath = [[40, 8], [40, 24], [40, 40], [24, 40]];

  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      {bluePath.slice(1).map(([x2, y2], i) => {
        const [x1, y1] = bluePath[i];
        return <line key={`b${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={blue} strokeWidth="3" strokeLinecap="round" />;
      })}
      {copperPath.slice(1).map(([x2, y2], i) => {
        const [x1, y1] = copperPath[i];
        return <line key={`c${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={copper} strokeWidth="3" strokeLinecap="round" />;
      })}
      <circle cx="8" cy="8" r="4" fill={blue} />
      <circle cx="8" cy="24" r="4" fill={blue} />
      <circle cx="40" cy="8" r="4" fill={copper} />
      <circle cx="24" cy="40" r="4" fill={copper} />
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

// Sprout — stem with two unfurling leaves, growing from a seed
export function SproutIcon({ size = 40 }) {
  const green = '#22c55e';
  const light = '#4ade80';
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      <path
        d="M 24 42 C 24 32 22 26 24 18"
        fill="none" stroke={green} strokeWidth="3.4" strokeLinecap="round"
      />
      <path
        d="M 24 26 C 16 26 11 21 12 13 C 20 13 25 18 24 26 Z"
        fill={green}
      />
      <path
        d="M 24 19 C 31 19 36 15 36 8 C 29 8 24 12 24 19 Z"
        fill={light}
      />
      <ellipse cx="24" cy="43.5" rx="4.5" ry="3" fill={light} />
    </svg>
  );
}

// Mirror — faceted diamond shard with a bouncing light beam
export function MirrorIcon({ size = 40 }) {
  const C = '#6366f1';
  const BEAM = '#a5b4fc';
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      <path
        d="M 24 4 L 44 24 L 24 44 L 4 24 Z"
        fill="none" stroke={C} strokeWidth="4" strokeLinejoin="round"
      />
      <path
        d="M 12 27 L 20 17 L 26 32 L 36 15"
        fill="none" stroke={BEAM} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

// Realm — jeweled crown
export function RealmIcon({ size = 40 }) {
  const teal = '#14b8a6';
  const light = '#2dd4bf';
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      <rect x="8" y="30" width="32" height="8" rx="2" fill={teal} />
      <path
        d="M 8 30 L 11 14 L 18 24 L 24 10 L 30 24 L 37 14 L 40 30 Z"
        fill={light}
      />
      <circle cx="11" cy="14" r="2.6" fill={teal} />
      <circle cx="24" cy="10" r="2.8" fill={teal} />
      <circle cx="37" cy="14" r="2.6" fill={teal} />
    </svg>
  );
}

// Squint — dot cluster, dim at the corners, bright at the center (rebus focus)
export function SquintIcon({ size = 40 }) {
  const C = '#06b6d4';
  const dots = [
    { cx: 8,  cy: 8,  r: 5,   o: 0.2 },
    { cx: 40, cy: 8,  r: 5,   o: 0.2 },
    { cx: 8,  cy: 40, r: 5,   o: 0.2 },
    { cx: 40, cy: 40, r: 5,   o: 0.2 },
    { cx: 24, cy: 8,  r: 5.5, o: 0.5 },
    { cx: 8,  cy: 24, r: 5.5, o: 0.5 },
    { cx: 40, cy: 24, r: 5.5, o: 0.5 },
    { cx: 24, cy: 40, r: 5.5, o: 0.5 },
    { cx: 24, cy: 24, r: 6.5, o: 1.0 },
  ];
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      {dots.map((d, i) => (
        <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill={C} opacity={d.o} />
      ))}
    </svg>
  );
}
