/** Category illustration: no vehicle photo, model or registration is implied. */
export function AmbulanceIllustration({compact = false}: {compact?: boolean}) {
  return <svg className={`ambulance-illustration ${compact ? 'compact' : ''}`} viewBox="0 0 340 175" role="img" aria-label="Ambulance illustration">
    <ellipse cx="171" cy="153" rx="149" ry="11" fill="#b8d2d9" opacity=".45"/>
    <g strokeLinejoin="round" strokeLinecap="round">
      <path d="M29 47Q29 33 44 33h174q13 0 20 13l26 32h24q11 0 16 14l11 29v24H29z" fill="#f8fcff" stroke="#456877" strokeWidth="3"/>
      <path d="M31 111h279v19H31z" fill="#ef2348"/>
      <path d="M220 46v40h44l-29-36q-4-4-15-4zM46 48h71v42H46z" fill="#b9e3ed" stroke="#456877" strokeWidth="3"/>
      <path d="M52 52h59v8H52zM225 51l25 29h-25z" fill="#e8faff"/>
      <path d="M124 33v111M211 35v109M42 97h69M232 98h14" stroke="#93aab4" strokeWidth="2" fill="none"/>
      <path d="M155 51h17v16h16v17h-16v16h-17V84h-16V67h16z" fill="#ec2348"/>
      <rect x="202" y="23" width="33" height="10" rx="4" fill="#e92847" stroke="#456877" strokeWidth="2"/>
      <rect x="305" y="107" width="9" height="17" rx="3" fill="#f5c65d"/>
      <rect x="29" y="112" width="6" height="17" rx="2" fill="#d52b44"/>
      <path d="M22 135h20m252 0h26" stroke="#456877" strokeWidth="6"/>
      <circle cx="83" cy="140" r="23" fill="#263e4d"/><circle cx="83" cy="140" r="12" fill="#c4d6df"/><circle cx="83" cy="140" r="5" fill="#6e8998"/>
      <circle cx="270" cy="140" r="23" fill="#263e4d"/><circle cx="270" cy="140" r="12" fill="#c4d6df"/><circle cx="270" cy="140" r="5" fill="#6e8998"/>
      <path d="M55 25h-8M247 23h8M221 12V6" stroke="#ed6177" strokeWidth="3"/>
    </g>
  </svg>;
}
export function EmergencyAlertIcon(){return <span className="emergency-alert" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M24 3v4M6 10l3 3M42 10l-3 3M3 26h4M41 26h4M8 41l3-3M40 41l-3-3" fill="none" stroke="#f84d65" strokeWidth="2.5" strokeLinecap="round"/><circle cx="24" cy="26" r="16" fill="#f00032"/><path d="M24 16v12" stroke="white" strokeWidth="3.5" strokeLinecap="round"/><circle cx="24" cy="34" r="2" fill="white"/></svg></span>}
