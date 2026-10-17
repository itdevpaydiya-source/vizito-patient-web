import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, MapPin, ShieldCheck, Stethoscope, Building2, FlaskConical, Pill, HeartHandshake, Users, Video, Clock, ChevronRight } from 'lucide-react';
import FavoriteButton from './FavoriteButton';
import DoctorTrustDetails from './DoctorTrustDetails';
import { pauseText, type ProviderItem } from '../../services/types';
import { useSearchArea, nearest, metresBetween, formatDistance } from '../../services/location';

// One card for every kind of provider: what it is, where (nearest branch / centre / store and how far),
// what it offers, its rating, and the right next step for that kind (book a doctor, a hospital visit,
// lab tests, order medicines, request home care).
export type ProviderKind = 'doctor' | 'hospital' | 'lab' | 'pharmacy' | 'homecare' | 'other';
export const kindOf = (p: ProviderItem): ProviderKind => {
  const t = String(p.partnerType || p.serviceId || '').toLowerCase();
  if (/doctor/.test(t)) return 'doctor';
  if (/hospital|clinic|admin/.test(t)) return 'hospital';
  if (/diagnos|laborator/.test(t)) return 'lab';
  if (/pharmac/.test(t)) return 'pharmacy';
  if (/home ?care|home_care/.test(t)) return 'homecare';
  return 'other';
};
const META: Record<ProviderKind, { label: string; icon: React.ElementType; cta: string }> = {
  doctor: { label: 'Doctor', icon: Stethoscope, cta: 'Book appointment' },
  hospital: { label: 'Hospital', icon: Building2, cta: 'Book a visit' },
  lab: { label: 'Diagnostic lab', icon: FlaskConical, cta: 'Book tests' },
  pharmacy: { label: 'Pharmacy', icon: Pill, cta: 'Order medicines' },
  homecare: { label: 'Home care', icon: HeartHandshake, cta: 'Request home care' },
  other: { label: 'Provider', icon: Building2, cta: 'View' },
};
export const providerRoute = (p: ProviderItem): string => {
  const id = encodeURIComponent(p.id);
  switch (kindOf(p)) {
    case 'doctor': return `/find-doctors?doctor=${id}`;
    case 'hospital': return `/booking?service=hospital&provider=${id}`;
    case 'lab': return `/lab-tests?lab=${id}`;
    case 'pharmacy': return `/pharmacy-orders/new?pharmacy=${id}`;
    case 'homecare': return `/home-care?agency=${id}`;
    default: return `/find-doctors?doctor=${id}`;
  }
};
/** Straight-line metres to the provider's nearest confirmed pin (branch, centre or store), if any. */
export const providerDistance = (p: ProviderItem, area: { lat: number; lng: number } | null): { metres: number; where: string | null } | null => {
  if (!area) return null;
  if (p.storePin) return { metres: metresBetween(area, p.storePin), where: null };
  const n = p.org ? nearest(area, p.org.locations) : null;
  return n ? { metres: n.metres, where: n.place.name } : null;
};

const initials = (n: string) => n.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';

export default function ProviderCard({ p }: { p: ProviderItem }) {
  const navigate = useNavigate();
  const area = useSearchArea();
  const k = kindOf(p); const M = META[k]; const Icon = M.icon;
  const dist = providerDistance(p, area);
  const locs = p.org?.locations || [];
  const where = locs.length ? [locs[0].area, locs[0].city].filter(Boolean).join(', ') : p.city || null;
  const depts = p.org?.departments || [];
  const minFee = depts.map((d) => d.from_fee).filter((x): x is number => x != null).sort((a, b) => a - b)[0];
  return (
    <article className="group h-full min-h-[21rem] bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-4 shadow-sm motion-safe:transition-all motion-safe:duration-200 motion-reduce:transition-none hover:shadow-md hover:border-orange-200" aria-label={`${p.name}, ${M.label}`}>
      <div className="flex items-start gap-3">
        {p.logo ? <img src={p.logo} alt="" className="w-14 h-14 rounded-2xl object-cover border border-slate-100 shrink-0" />
          : <span className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-800 border border-orange-100 flex items-center justify-center text-sm font-extrabold shrink-0">{initials(p.name)}</span>}
        <div className="min-w-0 flex-1">
          <p className="inline-flex max-w-full items-center gap-1 rounded-full border border-orange-100 bg-orange-50/70 px-2 py-1 text-[10px] font-bold text-orange-800"><Icon className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{p.specialtyOrType && k !== 'other' && !/^(doctor|diagnostics|pharmacy|homecare)$/i.test(p.specialtyOrType) ? p.specialtyOrType : M.label}</span></p>
          <h3 className="mt-1.5 min-h-[2.75rem] font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-orange-900">{p.name}</h3>
          <p className="min-h-5 text-xs text-slate-600 flex flex-wrap items-center gap-x-1.5 gap-y-1 mt-1">
            {p.rating ? <><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /><b>{p.rating.average.toFixed(1)}</b><span className="text-slate-400">({p.rating.count} ratings)</span></> : <span className="text-slate-500">New to Vizito · not rated yet</span>}
            {k === 'doctor' && p.registrationVerified && <span className="inline-flex items-center gap-0.5 text-emerald-700 font-bold"><ShieldCheck className="w-3.5 h-3.5" /> Verified</span>}
          </p>
        </div>
        <FavoriteButton partnerId={p.id} name={p.name} className="w-8 h-8" />
      </div>

      <div className="min-h-[5.5rem] flex-1 rounded-xl bg-slate-50/80 border border-slate-100 px-3.5 py-3 text-xs text-slate-600 space-y-1.5">
        {k === 'doctor' && <>
          <DoctorTrustDetails
            qualification={p.qualification}
            specialization={p.specialization || (p.specialtyOrType && !/^(doctor|diagnostics|pharmacy|homecare)$/i.test(p.specialtyOrType) ? p.specialtyOrType : undefined)}
            experienceYears={p.experienceYears}
            medicalRegistrationNumber={p.medicalRegistrationNumber}
            medicalCouncilName={p.medicalCouncilName}
            registrationVerified={p.registrationVerified}
            showBadge={false}
          />
          {(p.inClinicFee != null || p.videoFee != null) ? (
            <p className="flex flex-wrap gap-x-3">
              {p.inClinicFee != null && <span>In-clinic <b className="text-slate-900">₹{p.inClinicFee}</b></span>}
              {p.videoFee != null && <span className="inline-flex items-center gap-1"><Video className="w-3 h-3" />Video <b className="text-slate-900">₹{p.videoFee}</b></span>}
            </p>
          ) : null}
        </>}
        {k === 'hospital' && <>
          {depts.length > 0 && <p className="line-clamp-1">{depts.slice(0, 3).map((d) => d.name).join(', ')}{depts.length > 3 ? ` +${depts.length - 3} more` : ''}</p>}
          <p className="flex flex-wrap gap-x-3">{p.org?.doctor_count ? <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" />{p.org.doctor_count} doctor{p.org.doctor_count === 1 ? '' : 's'}</span> : null}{locs.length > 1 && <span>{locs.length} branches</span>}{minFee != null && <span>Consultation from <b className="text-slate-900">₹{minFee}</b></span>}</p>
        </>}
        {k === 'lab' && <p>{locs.length ? `${locs.length} collection centre${locs.length === 1 ? '' : 's'}` : 'Centres being added'}</p>}
        {k === 'pharmacy' && p.address && <p className="line-clamp-2">{p.address}</p>}
        {k === 'homecare' && <p>Nurses and caregivers visit you at home. Check your PIN code when you request.</p>}
        {k !== 'pharmacy' && k !== 'homecare' && (
          where ? (
            <p className="flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0" /><span className="truncate">{where}</span></p>
          ) : null
        )}
        {dist ? <p className="font-bold text-teal-800 flex items-center gap-1"><MapPin className="w-3 h-3" />{formatDistance(dist.metres)} away{dist.where ? ` · ${dist.where}` : ''}</p>
          : area && k !== 'homecare' && k !== 'doctor' && <p className="text-[11px] text-slate-400">Distance not available: map pin not confirmed yet</p>}
        {p.pause && <p className="font-bold text-amber-700 flex items-center gap-1"><Clock className="w-3 h-3" />{pauseText(p.pause, k === 'pharmacy' ? 'orders' : 'bookings')}</p>}
      </div>

      <button type="button" onClick={() => navigate(providerRoute(p))} disabled={!!p.pause}
        className="mt-auto w-full px-4 py-3 rounded-xl text-sm font-bold bg-teal-700 hover:bg-teal-800 text-white disabled:opacity-50 inline-flex items-center justify-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2">
        {M.cta} <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </article>
  );
}
