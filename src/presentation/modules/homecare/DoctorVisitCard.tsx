/**
 * A doctor home visit inside Home care › My visits (same list, tabs and counts as agency visits).
 * Shows who is coming, when, the live status, the visit code, and Track / Manage actions.
 */
import { Link } from 'react-router-dom';
import { CalendarDays, MapPin, Stethoscope } from 'lucide-react';
import { rupees, type MyHomeVisit } from '../../../services/labHelper';
import { homeVisitView, VISIT_CODE_HINT } from '../consultations/homeVisitStatus';
import { formatDoctorName } from '../../../utils/doctorLabel';
import { dateLabel, timeLabel } from '../bookings/bookingsPresentation';

const TONE: Record<string, string> = {
  amber: 'bg-amber-50 text-amber-800 border-amber-200', sky: 'bg-sky-50 text-sky-800 border-sky-200', indigo: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  violet: 'bg-violet-50 text-violet-800 border-violet-200', emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200', rose: 'bg-rose-50 text-rose-800 border-rose-200', slate: 'bg-slate-50 text-slate-700 border-slate-200',
};

export default function DoctorVisitCard({ v }: { v: MyHomeVisit }) {
  const s = homeVisitView(v);
  const doctor = formatDoctorName(v.doctor_name || '') || 'Doctor';
  const money = s.findAnother && s.money ? s.money : `${rupees(v.fee)} · ${v.payment_status === 'PAID' ? 'Paid' : v.payment_status === 'REFUNDED' ? 'Refunded' : 'Pay the doctor after the visit'}`;
  return (
    <article className="care-visit-card" data-home-visit-id={v.id} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#E3F4F1] text-[#0B4F4A]"><Stethoscope className="h-5 w-5" /></span>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-[#0A1948]">Doctor home visit · {doctor}</h2>
            <p className="text-sm text-[#4E6587]">{v.reason ? `Reason: ${v.reason}` : 'Consultation at your home'}{v.patient_name ? ` · For ${v.patient_name}` : ''}</p>
            {v.booking_number && <p className="text-xs text-[#4E6587]">Booking {v.booking_number}</p>}
          </div>
        </div>
        <div className="text-right">
          <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-bold ${TONE[s.tone]}`}>{s.label}</span>
          <p className="mt-1 text-sm font-bold tabular-nums text-[#0A1948]">{money}</p>
        </div>
      </div>
      {s.detail && <p className={`text-sm font-semibold ${s.tone === 'amber' ? 'text-amber-800' : s.tone === 'rose' ? 'text-rose-700' : 'text-[#33476B]'}`}>{s.detail}</p>}
      {s.code && <p className="flex flex-wrap items-center gap-x-3 gap-y-1" aria-label="Visit code"><span className="text-2xl font-black tracking-[0.3em] text-teal-900 tabular-nums">{s.code}</span><span className="text-xs text-teal-900">{VISIT_CODE_HINT}.</span></p>}
      <footer className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#EEF2F8] pt-3 text-sm text-[#33476B]">
        <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />{dateLabel(v.visit_date)}, {timeLabel(v.visit_time)}</span>
        <span className="inline-flex min-w-0 items-center gap-1.5"><MapPin className="h-4 w-4 shrink-0" /><span className="truncate">{v.address}</span></span>
        <span className="ml-auto flex flex-wrap gap-2">
          {v.status === 'ON_THE_WAY' && <Link to={`/home-care/track/${encodeURIComponent(v.id)}`} className="booking-button primary">Track doctor live</Link>}
          <Link to="/home-care?tab=mine&view=doctor" className="booking-button">{s.canCancel ? 'Manage visit' : 'View details'}</Link>
          {s.findAnother && <Link to="/home-care?tab=doctor" className="booking-button">Find another doctor</Link>}
        </span>
      </footer>
    </article>
  );
}

/** Which list group a doctor visit belongs to (same groups as agency visits). */
export const doctorVisitGroup = (v: MyHomeVisit): 'ongoing' | 'upcoming' | 'completed' | 'cancelled' => {
  const s = String(v.status || '').toUpperCase();
  return ['ON_THE_WAY', 'ARRIVED', 'IN_CONSULTATION'].includes(s) ? 'ongoing' : ['REQUESTED', 'SCHEDULED'].includes(s) ? 'upcoming' : s === 'COMPLETED' ? 'completed' : 'cancelled';
};
