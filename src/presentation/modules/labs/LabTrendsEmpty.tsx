import {Activity, CalendarDays, FileText, TrendingUp} from 'lucide-react';
import './LabBookingsLayout.css';

const features = [
  {icon: TrendingUp, title: 'Track changes', description: 'See how your test values change over time', color: 'bg-orange-50 text-orange-600'},
  {icon: FileText, title: 'View past results', description: 'Review values from your released lab reports', color: 'bg-blue-50 text-blue-600'},
  {icon: CalendarDays, title: 'Compare trends', description: 'Compare recorded values across test dates', color: 'bg-teal-50 text-teal-600'},
  {icon: Activity, title: 'Stay informed', description: 'Discuss changes in your results with your doctor', color: 'bg-violet-50 text-violet-600'},
];

export default function LabTrendsEmpty() {
  return <section aria-label="No health trends" className="lab-empty rounded-2xl border border-slate-200 bg-white text-center text-[#101d48]">
    <div className="lab-empty-main">
      <svg aria-hidden="true" viewBox="0 0 360 200" className="lab-empty-art">
        <ellipse cx="180" cy="118" rx="157" ry="70" fill="#eff6ff" />
        <path d="M77 182 Q30 133 54 118 Q80 115 92 182 M282 182 Q331 118 305 106 Q280 111 271 182" fill="#bceee4" />
        <rect x="83" y="24" width="180" height="159" rx="15" fill="white" stroke="#dbeafe" strokeWidth="2" />
        <rect x="101" y="43" width="64" height="6" rx="3" fill="#dbeafe" /><rect x="101" y="56" width="36" height="5" rx="2" fill="#eff6ff" />
        <path d="M112 121 L143 94 L173 107 L202 81 L231 56" stroke="#93c5fd" strokeWidth="3" fill="none" />
        {[[112,121],[143,94],[173,107],[202,81],[231,56]].map(([cx,cy])=><circle key={cx} cx={cx} cy={cy} r="4" fill="#dbeafe" stroke="#60a5fa" strokeWidth="2" />)}
        <path d="M113 161 V148 M133 161 V139 M153 161 V145 M173 161 V132" stroke="#bfdbfe" strokeWidth="10" strokeLinecap="round" />
        <rect x="241" y="80" width="88" height="104" rx="12" fill="white" stroke="#bfdbfe" strokeWidth="2" />
        <path d="M278 98 H292 M281 98 V114 L269 135 H301 L289 114 V98" fill="#bfdbfe" stroke="#60a5fa" strokeWidth="2" strokeLinejoin="round" />
        <path d="M258 150 H312 M258 161 H312 M258 172 H290" stroke="#dbeafe" strokeWidth="5" strokeLinecap="round" />
      </svg>
      <h2 className="lab-empty-heading font-black tracking-tight">Your health trends will appear here</h2>
      <p className="text-sm text-slate-500 sm:text-base">Once a lab releases your reports, you can see how your test values change over time and track your health.</p>
    </div>
    <div className="lab-empty-divider flex items-center gap-4"><span className="h-px flex-1 bg-slate-200" /><h3 className="text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:text-xs">What you can see</h3><span className="h-px flex-1 bg-slate-200" /></div>
    <ul className="lab-empty-benefits">{features.map(({icon: Icon,title,description,color})=><li key={title} className="min-w-0"><span className={`lab-benefit-icon mx-auto grid place-items-center rounded-full ${color}`}><Icon aria-hidden="true" className="h-6 w-6" /></span><h4 className="text-sm font-bold sm:text-base">{title}</h4><p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">{description}</p></li>)}</ul>
  </section>;
}
