// Eigene Symbole als SVG (keine Icon-Schrift vom CDN mehr – läuft offline).
type P = { className?: string };

export function Pokeball({ className, filled = true }: P & { filled?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <circle cx="32" cy="32" r="29" fill={filled ? '#fff' : 'none'} stroke="#1d1d2b" strokeWidth="5" />
      {filled && <path d="M3 32a29 29 0 0 1 58 0Z" fill="#e3350d" />}
      <path d="M3 32h58" stroke="#1d1d2b" strokeWidth="5" />
      <circle cx="32" cy="32" r="9" fill="#fff" stroke="#1d1d2b" strokeWidth="5" />
    </svg>
  );
}

export function Palette({ className }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <circle cx="21" cy="21" r="12" fill="#e8402a" />
      <circle cx="43" cy="21" r="12" fill="#ffd23f" />
      <circle cx="21" cy="43" r="12" fill="#3b82e6" />
      <circle cx="43" cy="43" r="12" fill="#46b04f" />
    </svg>
  );
}

export function SizeSort({ className }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden fill="currentColor">
      <circle cx="12" cy="40" r="5" /><rect x="7" y="46" width="10" height="12" rx="4" />
      <circle cx="31" cy="28" r="6.5" /><rect x="24.5" y="36" width="13" height="22" rx="5" />
      <circle cx="51" cy="12" r="8" /><rect x="43" y="22" width="16" height="36" rx="6" />
    </svg>
  );
}

export function Speaker({ className }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 24h10l14-12v40L18 40H8z" fill="currentColor" />
      <path d="M42 22a14 14 0 0 1 0 20M48 14a24 24 0 0 1 0 36" />
    </svg>
  );
}

export function Sparkles({ className }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden fill="currentColor">
      <path d="M26 6l5 15 15 5-15 5-5 15-5-15-15-5 15-5z" />
      <path d="M48 34l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" />
      <path d="M50 4l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
    </svg>
  );
}

export function Globe({ className }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="5">
      <circle cx="32" cy="32" r="25" />
      <path d="M7 32h50M32 7c-9 8-9 42 0 50M32 7c9 8 9 42 0 50" />
    </svg>
  );
}

export function Evolve({ className }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 34l18-16 18 16M14 52l18-16 18 16" />
    </svg>
  );
}

export function Ruler({ className }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden fill="currentColor">
      <circle cx="18" cy="14" r="7" /><rect x="11" y="23" width="14" height="33" rx="6" />
      <path d="M40 6h14v52H40z" opacity=".35" />
      <path d="M40 14h8M40 24h5M40 34h8M40 44h5" stroke="currentColor" strokeWidth="4" />
    </svg>
  );
}

/** Spiele: freundlicher Controller. */
export function Controller({ className }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <path d="M18 18h28c8 0 13 7 14 17l1 7c1 7-6 10-10 5l-6-7H19l-6 7c-4 5-11 2-10-5l1-7c1-10 6-17 14-17Z" fill="#fff" stroke="#1d1d2b" strokeWidth="4" strokeLinejoin="round" />
      <path d="M20 26v12M14 32h12" stroke="#1d1d2b" strokeWidth="5" strokeLinecap="round" />
      <circle cx="44" cy="28" r="4" fill="#e3350d" />
      <circle cx="51" cy="35" r="4" fill="#ffcb05" />
    </svg>
  );
}

/** Pokal für den Rekord und die 100. */
export function Trophy({ className }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <path d="M14 10h36v6c0 13-7 22-18 22S14 29 14 16Z" fill="#ffcb05" stroke="#b8860b" strokeWidth="3" strokeLinejoin="round" />
      <path d="M14 14H6c0 9 4 14 11 15M50 14h8c0 9-4 14-11 15" fill="none" stroke="#b8860b" strokeWidth="4" strokeLinecap="round" />
      <path d="M27 38h10l2 10H25Z" fill="#ffcb05" stroke="#b8860b" strokeWidth="3" strokeLinejoin="round" />
      <rect x="18" y="48" width="28" height="8" rx="3" fill="#e3350d" stroke="#9e2208" strokeWidth="3" />
      <path d="M24 16c0 6 3 11 7 13" fill="none" stroke="#fff6" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

/** Fragezeichen, Weiter-Pfeil und Haken als SVG: Schriftzeichen sitzen in runden Knöpfen nie ganz mittig. */
export function Question({ className }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round">
      <path d="M22 24a10 10 0 1 1 15 8.7c-3 1.8-5 3.6-5 7.3v1" />
      <circle cx="32" cy="51" r="1" strokeWidth="9" />
    </svg>
  );
}

export function ArrowRight({ className }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 32h34M35 18l14 14-14 14" />
    </svg>
  );
}

export function Check({ className }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 33l11 11 21-24" />
    </svg>
  );
}

export function Close({ className }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round">
      <path d="M18 18l28 28M46 18L18 46" />
    </svg>
  );
}

export function Flip({ className }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M50 26A20 20 0 0 0 14 22M14 38a20 20 0 0 0 36 4" />
      <path d="M12 10v12h12M52 54V42H40" />
    </svg>
  );
}

/** Person für die Größen-Bühne (Kopf + Körper); Kinder mit größerem Kopf. */
export function Person({ className, style, child = false, color }: P & { style?: React.CSSProperties; child?: boolean; color: string }) {
  const head = child ? 15 : 11;
  const shoulders = head * 2 + 6;
  const legs = 98 - shoulders; // Füße genau auf dem Boden der viewBox
  return (
    <svg viewBox="0 0 40 100" preserveAspectRatio="none" className={className} style={style} aria-hidden>
      <circle cx="20" cy={head + 1} r={head} fill={color} stroke="#fff" strokeWidth="2.5" />
      <path d={`M6 ${shoulders} q14 -8 28 0 l-2 ${legs} h-9 l-3 -30 l-3 30 h-9 z`} fill={color} stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}
