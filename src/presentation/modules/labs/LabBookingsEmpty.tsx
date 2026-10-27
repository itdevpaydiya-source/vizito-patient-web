import './LabBookingsLayout.css';
import { CalendarDays, ClipboardList, FileText, MapPin, Search } from 'lucide-react';

const benefits = [
  {icon: MapPin, title: 'Choose a lab', description: 'Browse labs offering your selected tests', color: 'bg-teal-50 text-teal-600'},
  {icon: ClipboardList, title: 'Compare prices', description: 'Review available test prices before booking', color: 'bg-blue-50 text-blue-600'},
  {icon: CalendarDays, title: 'Plan your visit', description: 'Choose from available dates and times', color: 'bg-orange-50 text-orange-600'},
  {icon: FileText, title: 'Access reports', description: 'View and download reports once released', color: 'bg-violet-50 text-violet-600'},
];

export default function LabBookingsEmpty({onFindTests}: {onFindTests: () => void}) {
  return <div className="lab-empty rounded-2xl border border-slate-200 bg-white text-center text-[#101d48]">
    <div className="lab-empty-main">
    <svg aria-hidden="true" viewBox="0 0 360 200" className="lab-empty-art">
      <ellipse cx="180" cy="120" rx="155" ry="68" fill="#eff6ff" />
      <path d="M94 178 Q53 126 79 115 Q104 113 112 177 M260 178 Q304 120 279 112 Q256 111 248 178" fill="#bceee4" />
      <rect x="121" y="25" width="137" height="153" rx="16" fill="#dbeafe" />
      <rect x="108" y="32" width="137" height="153" rx="16" fill="white" stroke="#dbeafe" />
      <path d="M168 58 H185 M172 58 V80 L154 112 Q151 120 159 120 H195 Q202 120 199 112 L181 80 V58 M161 105 H193" fill="#60a5fa" stroke="#3b82f6" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="170" cy="111" r="2" fill="white" /><circle cx="180" cy="103" r="2" fill="white" />
      <rect x="130" y="140" width="91" height="8" rx="4" fill="#dbeafe" /><rect x="130" y="158" width="53" height="8" rx="4" fill="#eff6ff" />
      <circle cx="245" cy="173" r="22" fill="#93c5fd" /><path d="M245 163 V183 M235 173 H255" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </svg>
    <h2 className="lab-empty-heading font-black tracking-tight">No lab bookings yet</h2>
    <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-slate-500 sm:text-base">Book blood tests, health check-ups and more at a lab near you. Review available prices before you book.</p>
    <button type="button" onClick={onFindTests}  className="lab-empty-action mx-auto inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-8 py-3 text-sm font-bold text-white hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2"><Search className="h-4 w-4" aria-hidden="true" />Find tests</button>
    </div>
    <div className="lab-empty-divider flex items-center gap-4"><span className="h-px flex-1 bg-slate-200" /><h3 className="text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:text-xs">Lab tests on VIZITO</h3><span className="h-px flex-1 bg-slate-200" /></div>
    <ul className="lab-empty-benefits">
      {benefits.map(({icon: Icon, title, description, color}) => <li key={title} className="min-w-0"><span className={`lab-benefit-icon mx-auto grid place-items-center rounded-full ${color}`}><Icon className="h-6 w-6" aria-hidden="true" /></span><h4 className="text-sm font-bold sm:text-base">{title}</h4><p className="mx-auto mt-1 max-w-48 text-xs leading-relaxed text-slate-500 sm:text-sm">{description}</p></li>)}
    </ul>
  </div>;
}
