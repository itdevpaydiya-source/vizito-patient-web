import React from 'react';

// Vizito illustration set: one calm, flat scene per healthcare service, drawn in the brand palette
// (deep brown, warm orange, cream, a soft sage accent). Generic on purpose — they show the *kind* of
// care, never a specific hospital, doctor or patient. Inline SVG: no image files, sharp at any size.
const P = {
  cream: '#FBF3EA', blob: '#F4E3D3', blob2: '#EED5BF', brown: '#6B4530', orange: '#B45F28', amber: '#D98A4C',
  sage: '#CFE3D6', sageDark: '#7FA88E', white: '#FFFFFF', line: '#E7D3C1', skin: '#E9B98F', hair: '#4A2F21',
};

const Frame: React.FC<{ children: React.ReactNode; label: string; className?: string }> = ({ children, label, className }) => (
  <svg viewBox="0 0 320 160" role="img" aria-label={label} className={className} preserveAspectRatio="xMidYMid meet">
    <rect width="320" height="160" fill={P.cream} />
    <circle cx="250" cy="40" r="70" fill={P.blob} />
    <circle cx="40" cy="150" r="55" fill={P.blob} opacity="0.7" />
    <path d="M0 132 H320" stroke={P.line} strokeWidth="2" />
    {children}
  </svg>
);

const Plus = ({ x, y, s = 10, c = P.orange }: { x: number; y: number; s?: number; c?: string }) => (
  <g fill={c}><rect x={x - s / 2} y={y - s / 6} width={s} height={s / 3} rx={s / 8} /><rect x={x - s / 6} y={y - s / 2} width={s / 3} height={s} rx={s / 8} /></g>
);

const scenes: Record<string, { label: string; art: React.ReactNode }> = {
  doctor: {
    label: 'Doctor consultation',
    art: (<>
      {/* doctor */}
      <rect x="132" y="78" width="56" height="54" rx="16" fill={P.white} stroke={P.line} strokeWidth="2" />
      <path d="M160 80 L150 104 L160 98 L170 104 Z" fill={P.sage} />
      <circle cx="160" cy="58" r="17" fill={P.skin} />
      <path d="M143 55 Q160 34 177 55 Q172 44 160 43 Q148 44 143 55 Z" fill={P.hair} />
      <path d="M146 92 Q146 116 160 116 Q174 116 174 100" fill="none" stroke={P.brown} strokeWidth="3" strokeLinecap="round" />
      <circle cx="174" cy="98" r="4" fill={P.orange} />
      {/* clipboard */}
      <rect x="208" y="70" width="40" height="54" rx="6" fill={P.white} stroke={P.brown} strokeWidth="2.5" />
      <rect x="220" y="65" width="16" height="9" rx="3" fill={P.orange} />
      <path d="M216 88 H240 M216 98 H240 M216 108 H232" stroke={P.line} strokeWidth="3" strokeLinecap="round" />
      {/* heart rate */}
      <path d="M60 96 H82 L90 80 L100 112 L108 96 H124" fill="none" stroke={P.orange} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <Plus x={78} y={52} s={16} c={P.sageDark} />
    </>),
  },
  hospital: {
    label: 'Hospital and clinic',
    art: (<>
      <rect x="110" y="52" width="100" height="80" rx="6" fill={P.white} stroke={P.brown} strokeWidth="2.5" />
      <rect x="140" y="34" width="40" height="28" rx="5" fill={P.orange} />
      <Plus x={160} y={48} s={16} c={P.white} />
      {[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => (
        <rect key={`${r}${c}`} x={122 + c * 20} y={70 + r * 16} width="12" height="9" rx="2" fill={r === 2 && (c === 1 || c === 2) ? P.white : P.sage} />
      )))}
      <rect x="148" y="108" width="24" height="24" rx="3" fill={P.amber} />
      <circle cx="78" cy="104" r="20" fill={P.sage} /><rect x="76" y="110" width="4" height="22" fill={P.sageDark} />
      <circle cx="244" cy="100" r="24" fill={P.sage} /><rect x="242" y="110" width="4" height="22" fill={P.sageDark} />
    </>),
  },
  homecare: {
    label: 'Home care',
    art: (<>
      <path d="M90 76 L140 40 L190 76 Z" fill={P.orange} />
      <rect x="100" y="74" width="80" height="58" fill={P.white} stroke={P.brown} strokeWidth="2.5" />
      <rect x="132" y="98" width="18" height="34" rx="2" fill={P.amber} />
      <path d="M140 86 c-6 -8 -18 -2 -10 6 l10 9 l10 -9 c8 -8 -4 -14 -10 -6 z" fill={P.orange} transform="translate(-26 -6) scale(0.9)" />
      {/* nurse */}
      <rect x="214" y="86" width="40" height="46" rx="14" fill={P.white} stroke={P.line} strokeWidth="2" />
      <circle cx="234" cy="70" r="14" fill={P.skin} />
      <path d="M220 66 Q234 50 248 66 Q244 58 234 57 Q224 58 220 66 Z" fill={P.hair} />
      <rect x="226" y="52" width="16" height="7" rx="2" fill={P.white} stroke={P.line} />
      <Plus x={234} y={104} s={12} c={P.orange} />
      <Plus x={66} y={58} s={14} c={P.sageDark} />
    </>),
  },
  ambulance: {
    label: 'Ambulance',
    art: (<>
      <rect x="78" y="70" width="110" height="50" rx="8" fill={P.white} stroke={P.brown} strokeWidth="2.5" />
      <path d="M188 82 H222 L244 102 V120 H188 Z" fill={P.white} stroke={P.brown} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M196 88 H218 L232 102 H196 Z" fill={P.sage} />
      <rect x="78" y="100" width="166" height="7" fill={P.orange} />
      <Plus x={128} y={86} s={20} c={P.orange} />
      <rect x="120" y="60" width="18" height="10" rx="3" fill={P.amber} />
      <circle cx="110" cy="124" r="11" fill={P.brown} /><circle cx="110" cy="124" r="4" fill={P.white} />
      <circle cx="214" cy="124" r="11" fill={P.brown} /><circle cx="214" cy="124" r="4" fill={P.white} />
      <path d="M40 94 H66 M48 110 H66" stroke={P.line} strokeWidth="3" strokeLinecap="round" />
    </>),
  },
  pharmacy: {
    label: 'Pharmacy',
    art: (<>
      <rect x="112" y="58" width="52" height="74" rx="10" fill={P.white} stroke={P.brown} strokeWidth="2.5" />
      <rect x="118" y="44" width="40" height="16" rx="4" fill={P.orange} />
      <rect x="120" y="76" width="36" height="30" rx="4" fill={P.sage} />
      <Plus x={138} y={91} s={16} c={P.white} />
      <g transform="rotate(-30 206 96)"><rect x="182" y="86" width="48" height="20" rx="10" fill={P.white} stroke={P.brown} strokeWidth="2.5" /><path d="M206 86 V106" stroke={P.brown} strokeWidth="2" /><rect x="207" y="88" width="21" height="16" rx="8" fill={P.amber} /></g>
      <circle cx="238" cy="124" r="9" fill={P.white} stroke={P.brown} strokeWidth="2" /><path d="M232 124 H244" stroke={P.brown} strokeWidth="2" />
      <circle cx="76" cy="118" r="8" fill={P.amber} /><circle cx="92" cy="124" r="7" fill={P.sage} />
      <Plus x={70} y={60} s={14} c={P.sageDark} />
    </>),
  },
  diagnostic: {
    label: 'Lab tests',
    art: (<>
      <rect x="96" y="104" width="112" height="16" rx="4" fill={P.brown} />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x={108 + i * 24} y={58} width="14" height="56" rx="7" fill={P.white} stroke={P.brown} strokeWidth="2.5" />
          <rect x={110 + i * 24} y={[80, 72, 90, 76][i]} width="10" height={[32, 40, 22, 36][i]} rx="5" fill={[P.orange, P.sage, P.amber, P.orange][i]} />
          <rect x={106 + i * 24} y={52} width="18" height="7" rx="2" fill={[P.amber, P.sageDark, P.orange, P.sageDark][i]} />
        </g>
      ))}
      <path d="M240 64 q-12 18 0 26 q12 -8 0 -26 z" fill={P.orange} />
      <circle cx="252" cy="104" r="16" fill="none" stroke={P.brown} strokeWidth="2.5" /><path d="M263 115 L274 126" stroke={P.brown} strokeWidth="3" strokeLinecap="round" />
      <Plus x={66} y={70} s={14} c={P.sageDark} />
    </>),
  },
  bloodbank: {
    label: 'Blood donation and blood availability',
    art: (<>
      {/* blood bag */}
      <path d="M133 48 H187 V59 H180 V116 Q180 128 168 132 H152 Q140 128 140 116 V59 H133 Z" fill={P.white} stroke={P.brown} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M142 88 H178 V115 Q178 127 166 130 H154 Q142 127 142 115 Z" fill="#E98B82" />
      <path d="M160 94 C155 101 151 104 151 110 A9 9 0 0 0 169 110 C169 104 165 101 160 94 Z" fill="#C83E3E" />
      <path d="M151 48 V39 H169 V48 M158 39 V30 H162 V39" fill="none" stroke={P.brown} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M150 132 V143 H170" fill="none" stroke={P.orange} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="205" cy="110" r="25" fill={P.white} stroke={P.line} strokeWidth="2" />
      <path d="M205 94 C198 103 194 107 194 114 A11 11 0 0 0 216 114 C216 107 212 103 205 94 Z" fill="#C83E3E" />
      <Plus x={93} y={70} s={16} c={P.sageDark} />
      <path d="M86 120 H117 M102 105 V135" stroke={P.orange} strokeWidth="3" strokeLinecap="round" />
    </>),
  },
  equipment: {
    label: 'Medical equipment',
    art: (<>
      <rect x="92" y="54" width="34" height="78" rx="12" fill={P.white} stroke={P.brown} strokeWidth="2.5" />
      <rect x="100" y="42" width="18" height="14" rx="3" fill={P.orange} />
      <rect x="98" y="72" width="22" height="12" rx="3" fill={P.sage} />
      <circle cx="196" cy="110" r="22" fill="none" stroke={P.brown} strokeWidth="3" />
      <path d="M180 70 V102 H220 L232 124" fill="none" stroke={P.brown} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="182" y="78" width="30" height="8" rx="3" fill={P.orange} />
      <circle cx="236" cy="126" r="5" fill={P.brown} />
      <Plus x={258} y={66} s={14} c={P.sageDark} />
    </>),
  },
  empty: {
    label: 'Nothing here yet',
    art: (<>
      <rect x="128" y="44" width="64" height="84" rx="8" fill={P.white} stroke={P.brown} strokeWidth="2.5" />
      <rect x="146" y="38" width="28" height="12" rx="4" fill={P.orange} />
      <path d="M142 70 H178 M142 84 H178 M142 98 H166" stroke={P.line} strokeWidth="3" strokeLinecap="round" />
      <Plus x={98} y={62} s={14} c={P.sageDark} /><Plus x={226} y={92} s={12} c={P.amber} />
    </>),
  },
};

/** The illustration for a service (including blood bank) or "empty". */
const ServiceArt: React.FC<{ id: string; className?: string; muted?: boolean }> = ({ id, className, muted }) => {
  const scene = scenes[id] || scenes.empty;
  return (
    <div className={`overflow-hidden bg-[#FBF3EA] ${muted ? 'grayscale opacity-60' : ''} ${className || ''}`}>
      <Frame label={scene.label} className="w-full h-full block">{scene.art}</Frame>
    </div>
  );
};

export default ServiceArt;
