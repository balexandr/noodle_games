const C = '#ff6b35'
const CA = (o) => `rgba(255,107,53,${o})`

export function ToiletIcon({ size = 44 }) {
  return (
    <svg viewBox="0 0 44 44" width={size} height={size} aria-hidden="true" fill="none">
      {/* Tank */}
      <rect x="14" y="2" width="16" height="12" rx="3" stroke={C} strokeWidth="2"/>
      {/* Tank lid */}
      <rect x="12" y="1" width="20" height="3.5" rx="1.75" fill={C}/>
      {/* Seat */}
      <path d="M 7 21 Q 22 15 37 21" stroke={C} strokeWidth="2.2" strokeLinecap="round"/>
      {/* Bowl */}
      <path d="M 7 21 Q 5.5 37 22 38 Q 38.5 37 37 21 Z" fill={CA(0.1)} stroke={C} strokeWidth="2"/>
      {/* Inner water line */}
      <path d="M 11 26 Q 22 22 33 26" stroke={C} strokeWidth="1.2" strokeLinecap="round" opacity="0.45"/>
      {/* Base */}
      <rect x="15" y="38" width="14" height="4.5" rx="2.25" fill={C}/>
    </svg>
  )
}

export function JoystickIcon({ size = 44 }) {
  return (
    <svg viewBox="0 0 44 44" width={size} height={size} aria-hidden="true" fill="none">
      {/* Base plate */}
      <rect x="5" y="27" width="34" height="14" rx="7" fill={CA(0.12)} stroke={C} strokeWidth="2"/>
      {/* Stick */}
      <line x1="22" y1="27" x2="22" y2="12" stroke={C} strokeWidth="3.5" strokeLinecap="round"/>
      {/* Ball */}
      <circle cx="22" cy="8" r="6" fill={CA(0.12)} stroke={C} strokeWidth="2"/>
      {/* Buttons */}
      <circle cx="32" cy="34" r="3.5" fill={C}/>
      <circle cx="24" cy="34" r="2.5" stroke={C} strokeWidth="1.8" opacity="0.5"/>
    </svg>
  )
}

export function RocketIcon({ size = 44 }) {
  return (
    <svg viewBox="0 0 44 44" width={size} height={size} aria-hidden="true" fill="none">
      {/* Body */}
      <path
        d="M 22 3 C 29 7 30 18 30 26 L 22 30 L 14 26 C 14 18 15 7 22 3 Z"
        fill={CA(0.12)} stroke={C} strokeWidth="2" strokeLinejoin="round"
      />
      {/* Nose fill */}
      <path d="M 22 3 C 29 7 30 15 30 18 L 14 18 C 14 15 15 7 22 3 Z" fill={C} opacity="0.75"/>
      {/* Left fin */}
      <path d="M 14 24 L 8 34 L 14 29 Z" fill={C} opacity="0.65" strokeLinejoin="round"/>
      {/* Right fin */}
      <path d="M 30 24 L 36 34 L 30 29 Z" fill={C} opacity="0.65" strokeLinejoin="round"/>
      {/* Porthole */}
      <circle cx="22" cy="23" r="3.5" stroke={C} strokeWidth="1.8"/>
      {/* Flame */}
      <path d="M 18 30 Q 22 38 26 30" stroke="#ffc947" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M 20 30 Q 22 35 24 30" stroke="#ffc947" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
    </svg>
  )
}
