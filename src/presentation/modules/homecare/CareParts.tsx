/**
 * Shared pieces of Home care › home and search: the location picker, result cards and labels.
 * Colours follow the patient app (navy text, orange action, teal "available").
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, CalendarCheck, ChevronDown, Clock, Home, MapPin, Search, Star, Stethoscope } from 'lucide-react';
import ServiceLocationDialog from '../../components/location/ServiceLocationDialog';
import type { PatientAddress } from '../../../services/patientHelper';
import { rupees } from '../../../services/labHelper';
import { CARE_LABEL, highlight, type SearchHit } from './careSearchLogic';
import { bookHref, card, CARE_CHIP, whenLabel } from './careFormat';
import { areaPlace, savedPlace, type CarePlace } from './useCarePlace';



/** Saved addresses + chosen area as radio chips, and a button to pick another area / current location. */
export function CarePlaceBar({ saved, place, onPlace, compact = false }: { saved: PatientAddress[] | null; place: CarePlace | null; onPlace: (p: CarePlace) => void; compact?: boolean }) {
  const [picking, setPicking] = useState(false);
  const chip = (on: boolean) => `inline-flex min-h-[44px] min-w-0 max-w-full items-center gap-2 rounded-xl border px-3 py-1.5 text-left text-xs transition ${on ? 'border-[#C2410C] bg-[#FFF7F0] text-[#0A1948] ring-1 ring-[#C2410C]' : 'border-[#DFE8F3] bg-white text-[#33476B] hover:border-[#F2B28E]'}`;
  const list = (saved || []).slice(0, compact ? 2 : 4);
  return (
    <div role="radiogroup" aria-label="Where is the care needed?" className="flex flex-wrap items-center gap-2">
      {saved === null && <span className="text-xs text-[#4E6587]">Loading your addresses…</span>}
      {list.map((a) => { const p = savedPlace(a); const on = place?.key === p.key; return (
        <button key={p.key} type="button" role="radio" aria-checked={on} onClick={() => onPlace(p)} className={chip(on)}>
          <Home className="h-4 w-4 shrink-0 text-[#C2410C]" />
          <span className="min-w-0"><b className="block font-semibold">{p.label}{a.isDefault ? ' · Default' : ''}</b><span className="block max-w-[260px] truncate text-[#4E6587]">{p.detail}</span></span>
        </button>); })}
      {place?.kind === 'area' && (
        <button type="button" role="radio" aria-checked className={chip(true)}>
          <MapPin className="h-4 w-4 shrink-0 text-[#C2410C]" />
          <span className="min-w-0"><b className="block font-semibold">{place.label}</b><span className="block max-w-[260px] truncate text-[#4E6587]">{place.detail}</span></span>
        </button>
      )}
      <button type="button" onClick={() => setPicking(true)} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-dashed border-[#F2B28E] bg-white px-3 text-xs font-semibold text-[#9A3412] hover:bg-[#FFF7F0]">
        <Search className="h-4 w-4" /> {place ? 'Another area or current location' : 'Choose area or use current location'} <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {picking && <ServiceLocationDialog onClose={() => setPicking(false)} onApply={(a) => { setPicking(false); if (a) onPlace(areaPlace(a)); }} />}
    </div>
  );
}

const initials = (n: string) => n.replace(/^dr\.?\s*/i, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '•';

/** One result row: what it is, who provides it, when it can start, the price and Book. */
export function ResultRow({ h, query, pincode }: { h: SearchHit; query: string; pincode: string }) {
  const title = h.type === 'service' ? h.s.name : h.d.name;
  const [a, b, c] = highlight(title, query);
  const next = whenLabel(h.type === 'service' ? h.s.earliest_start : h.d.next_slot);
  const sub = h.type === 'service'
    ? `${h.s.agency.name} · ${(h.s.agency as { mode_label?: string }).mode_label || 'Home care agency'}`
    : [h.d.qualification, h.d.specialization, h.d.experience ? `${h.d.experience} yrs exp` : null].filter(Boolean).join(' · ');
  const length = h.type === 'service' ? (h.s.kind === 'SHIFT' ? `${h.s.shift_hours}-hour shift` : h.s.duration_minutes ? `About ${h.s.duration_minutes} min` : 'Visit') : `About ${h.d.visit_minutes} min`;
  const unit = h.type === 'service' ? (h.s.kind === 'SHIFT' ? `per ${h.s.shift_hours} hours` : 'per visit') : 'per visit';
  const logo = h.type === 'service' ? h.s.agency.logo_url : null;
  return (
    <article className={`${card} flex flex-wrap items-center gap-3.5 p-4 transition hover:border-[#F2B28E] hover:shadow-sm`}>
      {logo ? <img src={logo} alt="" className="h-[52px] w-[52px] shrink-0 rounded-xl border border-[#DFE8F3] object-cover" />
        : <span aria-hidden className={`grid h-[52px] w-[52px] shrink-0 place-items-center ${h.type === 'doctor' ? 'rounded-full' : 'rounded-xl'} text-sm font-extrabold ${CARE_CHIP[h.care]}`}>{h.type === 'doctor' ? <Stethoscope className="h-5 w-5" /> : initials(h.s.agency.name)}</span>}
      <div className="min-w-0 flex-[1_1_260px] space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[15px] font-bold text-[#0A1948]">{a}{b && <mark className="rounded bg-[#FFE7D3] px-0.5 text-inherit">{b}</mark>}{c}</h3>
          <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${CARE_CHIP[h.care]}`}>{CARE_LABEL[h.care]}</span>
        </div>
        <p className="truncate text-[13px] text-[#33476B]">{sub}</p>
        <div className="flex flex-wrap gap-1.5 pt-0.5 text-xs">
          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-semibold ${next ? 'bg-[#E3F4F1] text-[#0B4F4A]' : 'bg-[#F1F4F9] text-[#4E6587]'}`}><CalendarCheck className="h-3.5 w-3.5" />{next ? `Next: ${next}` : 'No free time soon'}</span>
          <span className="inline-flex items-center gap-1 rounded-md bg-[#F1F4F9] px-2 py-0.5 text-[#33476B]"><Clock className="h-3.5 w-3.5" />{length}</span>
          {h.type === 'service' && h.s.agency.ratings > 0 && h.s.agency.rating != null && <span className="inline-flex items-center gap-1 rounded-md bg-[#FFF8E6] px-2 py-0.5 font-semibold text-[#7A4A00]"><Star className="h-3.5 w-3.5 fill-current" />{h.s.agency.rating} ({h.s.agency.ratings})</span>}
          {h.type === 'service' && h.s.agency.vizito_verified && <span className="inline-flex items-center gap-1 rounded-md bg-[#E8F1FD] px-2 py-0.5 font-semibold text-[#1F56B8]"><BadgeCheck className="h-3.5 w-3.5" />Verified on Vizito</span>}
          {h.type === 'service' && h.s.agency.distance_km != null && <span className="rounded-md bg-[#F1F4F9] px-2 py-0.5 text-[#33476B]">{h.s.agency.distance_km} km away</span>}
        </div>
      </div>
      <div className="ml-auto flex items-center gap-3.5">
        <span className="flex flex-col items-end"><span className="text-lg font-extrabold tabular-nums text-[#0A1948]">{rupees(h.type === 'service' ? h.s.price : h.d.fee)}</span><span className="text-xs text-[#4E6587]">{unit}</span></span>
        <Link to={bookHref(h, pincode)} aria-label={`Book ${title}${h.type === 'service' ? ` from ${h.s.agency.name}` : ''}`} className="inline-flex min-h-[44px] items-center rounded-xl bg-[#C2410C] px-5 text-sm font-bold text-white hover:bg-[#9A3412]">{h.type === 'doctor' ? 'Book visit' : 'Book'}</Link>
      </div>
    </article>
  );
}

/** A smaller card for related results. */
export function ResultCard({ h, pincode }: { h: SearchHit; pincode: string }) {
  const title = h.type === 'service' ? h.s.name : `Doctor visit · ${h.d.name}`;
  const by = h.type === 'service' ? h.s.agency.name : [h.d.specialization, h.d.experience ? `${h.d.experience} yrs exp` : null].filter(Boolean).join(' · ');
  const next = whenLabel(h.type === 'service' ? h.s.earliest_start : h.d.next_slot);
  return (
    <article className={`${card} flex flex-col gap-1.5 p-4`}>
      <span className={`self-start rounded-md px-2 py-0.5 text-[11px] font-semibold ${CARE_CHIP[h.care]}`}>{CARE_LABEL[h.care]}</span>
      <h3 className="text-[15px] font-bold leading-snug text-[#0A1948]">{title}</h3>
      <p className="truncate text-[13px] text-[#33476B]">{by}</p>
      <p className="text-xs text-[#4E6587]">{next ? `Next: ${next}` : 'No free time soon'}</p>
      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
        <span className="text-base font-extrabold tabular-nums">{rupees(h.type === 'service' ? h.s.price : h.d.fee)}</span>
        <Link to={bookHref(h, pincode)} className="inline-flex min-h-[40px] items-center rounded-lg border border-[#C2410C] px-3.5 text-[13px] font-bold text-[#C2410C] hover:bg-[#FFF7F0]">{h.type === 'doctor' ? 'Book visit' : 'Book'}</Link>
      </div>
    </article>
  );
}

export function EmergencyNote() {
  return (
    <p role="note" className="flex items-center gap-2.5 rounded-xl border border-[#F5C9C9] bg-[#FDF0F0] px-4 py-3 text-[13px] text-[#8F1D1D]">
      <span><b>Not for emergencies.</b> For chest pain, breathlessness, fainting or heavy bleeding, call <a href="tel:108" className="font-bold text-[#8F1D1D] underline">108</a>.</span>
    </p>
  );
}
