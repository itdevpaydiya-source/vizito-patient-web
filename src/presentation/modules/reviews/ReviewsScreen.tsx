import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Star, MessageSquare, AlertCircle, RotateCcw, ShieldCheck, Stethoscope, Building2, FlaskConical, Pill, HeartHandshake, Clock, Package, Ambulance } from 'lucide-react';
import { myTripsApi, rateTripApi } from '../../../services/ambulanceHelper';
import { formatDoctorName } from '../../../utils/doctorLabel';
import { getDashboardApi } from '../../../services/dashboardHelper';
import { createReviewApi, getMyReviewListApi, type PatientReview } from '../../../services/reviewHelper';
import { myLabOrdersApi, rateMyLabOrderApi } from '../../../services/labHelper';
import { getMyOrdersApi, ratePharmacyOrderApi } from '../../../services/pharmacyOrderHelper';
import { hcMineApi, hcRateApi } from '../../../services/homecareHelper';
import { getProviderDetailApi } from '../../../services/bookingHelper';
import { equipmentService } from '../equipment/equipmentService';
import RateBox from '../../components/RateBox';
import { KIND_LABEL, type CareKind } from '../../components/reviewKinds';
import VizitoPagination from '../../components/navigation/VizitoPagination';
import { useVizitoPagination } from '../../components/navigation/useVizitoPagination';

// Ratings & Reviews: every finished visit the patient can rate (doctor, hospital, lab, pharmacy,
// home care) with what it was, where and when; and every review they wrote, with the provider's reply.
// Only completed care appears (the server checks again). Refreshes every minute for new replies.

interface ToRate {
  key: string; kind: CareKind; provider: string; partnerId: string | null; what: string; where: string | null; when: string | null; forWhom: string | null;
  imageUrl?: string;
  submit: (rating: number, review: string, tags: string[]) => Promise<unknown>;
}

const ICON: Record<CareKind, React.ElementType> = { doctor: Stethoscope, hospital: Building2, lab: FlaskConical, pharmacy: Pill, homecare: HeartHandshake, equipment: Package, ambulance: Ambulance };
const VISIT: Record<string, string> = { VIDEO_CALL: 'Video consultation', IN_CLINIC: 'In-clinic visit', HOME_VISIT: 'Doctor home visit' };
const dateText = (d?: string | null) => { if (!d) return null; const x = new Date(d); return Number.isNaN(x.getTime()) ? null : x.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); };
const ago = (d?: string | null) => {
  if (!d) return ''; const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : days < 30 ? `${days} days ago` : dateText(d) || '';
};
const kindOfReview = (r: PatientReview): CareKind => {
  const t = String(r.consultation_type || '');
  return /^Lab tests/i.test(t) ? 'lab' : /^Pharmacy order/i.test(t) ? 'pharmacy' : /^Home care/i.test(t) ? 'homecare' : /^Equipment/i.test(t) ? 'equipment' : /^Ambulance trip/i.test(t) ? 'ambulance' : 'doctor';
};
const Stars = ({ n }: { n: number }) => (
  <span className="inline-flex" aria-label={`${n} out of 5 stars`}>{[1, 2, 3, 4, 5].map((i) => <Star key={i} className={`w-4 h-4 ${i <= n ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />)}</span>
);

export default function ReviewsScreen() {
  const [toRate, setToRate] = useState<ToRate[]>([]);
  const [mine, setMine] = useState<PatientReview[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'rate' | 'mine'>('rate');
  const [kind, setKind] = useState<CareKind | 'all'>('all');

  const load = useCallback(async (quiet = false) => {
    if (!quiet) { setLoading(true); setError(null); }
    try {
      const [dash, reviewsRaw, labs, pharm, hc, equip, trips] = await Promise.all([
        getDashboardApi().catch(() => null),
        getMyReviewListApi().catch(() => []),
        myLabOrdersApi().catch(() => []),
        getMyOrdersApi().catch(() => []),
        hcMineApi().catch(() => []),
        equipmentService.getMyOrders().catch(() => ({ orders: [] })),
        myTripsApi().catch(() => []),
      ]);
      const reviews = Array.isArray(reviewsRaw) ? [...reviewsRaw] : [];
      const reviewed = new Set(reviews.map((r) => String(r.booking_id)));
      const items: ToRate[] = [];
      for (const b of dash?.history || []) {
        if (!/COMPLET/i.test(String(b.status || '')) || reviewed.has(b.id)) continue;
        const hospital = !!b.hospitalPartnerId;
        items.push({ key: `c:${b.id}`, kind: hospital ? 'hospital' : 'doctor', provider: formatDoctorName(b.doctorName) || '', partnerId: b.providerId,
          what: [VISIT[String(b.appointmentType)] || 'Consultation', b.department].filter(Boolean).join(' · '), where: b.branchName || b.location, when: b.appointmentDate || b.bookingDate, forWhom: b.patientName,
          submit: (r, t, g) => createReviewApi(b.id, r, t || undefined, g) });
      }
      for (const o of labs) {
        if (o.status !== 'REPORTED' || o.my_rating) continue;
        items.push({ key: `l:${o.id}`, kind: 'lab', provider: o.lab_name || 'Laboratory', partnerId: null, what: `Lab tests: ${(o as any).items?.map((i: any) => i.test_name).join(', ') || o.order_number}`,
          where: o.location_name, when: o.visit_date, forWhom: o.patient_name || null, submit: (r, t, g) => rateMyLabOrderApi(o.id, r, t, g) });
      }
      for (const t of Array.isArray(trips) ? trips : []) {
        if (!t.can_rate) continue;
        items.push({ key: `a:${t.id}`, kind: 'ambulance', provider: (t as any).operator?.name || 'Ambulance service', partnerId: null,
          what: `Ambulance trip ${t.trip_number}${(t as any).vehicle_type_label ? ` · ${(t as any).vehicle_type_label}` : ''}`, where: null, when: (t as any).scheduled_at || t.created_at || null, forWhom: (t as any).patient_name || null,
          submit: (r, txt, g) => rateTripApi(t.id, r, txt, g) });
      }
      for (const o of pharm) {
        if (o.status !== 'COMPLETED' || reviewed.has(o.id)) continue;
        items.push({ key: `p:${o.id}`, kind: 'pharmacy', provider: '', partnerId: o.pharmacy_partner_id, what: `Pharmacy order #${o.id.slice(0, 8)} · ${o.items?.length || 0} item${o.items?.length === 1 ? '' : 's'}`,
          where: null, when: o.created_at, forWhom: null, submit: (r, t, g) => ratePharmacyOrderApi(o.id, r, t, g) });
      }
      for (const o of hc) for (const v of o.visits || []) {
        if (v.status !== 'COMPLETED' || v.patient_rating) continue;
        items.push({ key: `h:${v.id}`, kind: 'homecare', provider: o.agency_name || 'Home care agency', partnerId: null,
          what: `${o.service_name} · visit ${v.seq}${v.professional ? ` by ${v.professional.name} (${v.professional.role_label})` : ''}`, where: null, when: v.completed_at || v.date, forWhom: o.patient_name,
          submit: (r, t, g) => hcRateApi(v.id, r, t, g) });
      }
      for (const o of equip?.orders || []) {
        if (o.feedback && o.feedback.rating) {
          reviews.push({
            id: `rental-rev-${o.id}`,
            booking_id: o.orderNumber,
            doctor_id: null,
            doctor_name: o.equipmentName,
            imageUrl: o.equipmentImage,
            image_url: o.equipmentImage,
            reviewer_name: o.deliveryAddress?.recipientName || 'You',
            rating: Number(o.feedback.rating || 5),
            review: o.feedback.review || null,
            tags: o.feedback.tags || [],
            partner_id: o.provider?.id || null,
            provider_name: o.provider?.businessName || o.provider?.name || 'Equipment Rental Hub',
            consultation_type: 'Equipment rental',
            location: o.deliveryAddress?.city || null,
            status: o.feedback.partner_response ? 'Responded' : 'Pending',
            partner_response: typeof o.feedback.partner_response === 'object'
              ? (o.feedback.partner_response?.response_text || o.feedback.partner_response?.responseText)
              : (o.feedback.partner_response || null),
            responded_at: o.feedback.partner_response?.date || null,
            created_at: o.feedback.submitted_at || o.createdAt,
          });
        } else if (
          ['active', 'out_for_delivery', 'delivered', 'return_scheduled', 'return_requested', 'return_inspection_pending', 'completed'].includes(String(o.status).toLowerCase())
        ) {
          items.push({
            key: `e:${o.id}`,
            kind: 'equipment',
            provider: o.provider?.businessName || o.provider?.name || 'Equipment Rental Hub',
            partnerId: o.provider?.id || null,
            imageUrl: o.equipmentImage,
            what: `Equipment rental · ${o.equipmentName} (${o.orderNumber})`,
            where: [o.deliveryAddress?.city, o.deliveryAddress?.pincode].filter(Boolean).join(', ') || null,
            when: o.createdAt,
            forWhom: o.deliveryAddress?.recipientName || null,
            submit: async (r, t, g) => {
              const res = await equipmentService.submitOrderFeedback(o.orderNumber, { rating: r, review: t, tags: g });
              if (!res.success) throw new Error(res.message);
              await load(true);
            },
          });
        }
      }
      items.sort((a, b) => String(b.when || '').localeCompare(String(a.when || '')));
      setToRate(items); setMine(reviews);
      // Names the bookings don't carry (doctor / pharmacy), looked up once each.
      const need = Array.from(new Set([...items.filter((i) => !i.provider && i.partnerId).map((i) => String(i.partnerId)), ...reviews.filter((r) => !r.doctor_name && r.partner_id).map((r) => String(r.partner_id))]));
      if (need.length) {
        const got = await Promise.all(need.map((id) => getProviderDetailApi(id).then((d) => [id, formatDoctorName(d?.doctor?.full_name) || d?.business_name || ''] as const).catch(() => [id, ''] as const)));
        setNames((n) => ({ ...n, ...Object.fromEntries(got.filter(([, v]) => v)) }));
      }
    } catch {
      if (!quiet) setError('Could not load your reviews. Please try again.');
    } finally { if (!quiet) setLoading(false); }
  }, []);

  useEffect(() => { load(); const t = setInterval(() => load(true), 60000); return () => clearInterval(t); }, [load]);

  const replies = mine.filter((r) => r.partner_response).length;
  const avg = mine.length ? mine.reduce((n, r) => n + r.rating, 0) / mine.length : 0;
  const list = tab === 'rate' ? toRate : mine;
  const kindOf = (x: any): CareKind => (tab === 'rate' ? x.kind : kindOfReview(x));
  const filtered = useMemo(() => list.filter((x: any) => kind === 'all' || kindOf(x) === kind || (kind === 'doctor' && kindOf(x) === 'hospital')), [list, kind, tab]); // eslint-disable-line react-hooks/exhaustive-deps
  const pagination = useVizitoPagination(filtered as any[], 'reviews');
  const kinds: (CareKind | 'all')[] = ['all', 'doctor', 'lab', 'pharmacy', 'homecare', 'equipment'];
  const countOf = (k: CareKind | 'all') => list.filter((x: any) => k === 'all' || kindOf(x) === k || (k === 'doctor' && kindOf(x) === 'hospital')).length;

  return (
    <div className="space-y-5 pb-12 w-full">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Ratings & Reviews</h1>
        <p className="text-sm text-slate-500 mt-1">Rate the care you received from doctors, hospitals, labs, pharmacies, home care and equipment rentals. Your reviews help other patients choose, and providers reply here.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" aria-label="Summary">
        {[
          { l: 'Waiting for your rating', v: loading ? '–' : toRate.length, warn: toRate.length > 0 },
          { l: 'Reviews you wrote', v: loading ? '–' : mine.length },
          { l: 'Replies from providers', v: loading ? '–' : replies },
          { l: 'Your average rating', v: loading || !mine.length ? '–' : `${avg.toFixed(1)} ★` },
        ].map((t) => (
          <div key={t.l} className={`rounded-2xl border p-4 ${t.warn ? 'border-amber-200 bg-amber-50/60' : 'border-slate-200 bg-white'}`}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t.l}</p>
            <p className="text-2xl font-black text-slate-900 tabular-nums mt-1">{t.v}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" className="inline-flex rounded-xl bg-slate-100 p-1">
          {([['rate', 'To rate', toRate.length], ['mine', 'My reviews', mine.length]] as const).map(([id, l, n]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => { setTab(id); pagination.resetPage(); }}
              className={`px-4 py-2 rounded-lg text-sm font-bold inline-flex items-center gap-1.5 ${tab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
              {l}<span className={`min-w-[1.25rem] h-5 px-1.5 rounded-full text-[11px] font-black inline-flex items-center justify-center ${id === 'rate' && n > 0 ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'}`}>{n}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5" aria-label="Type of care">
          {kinds.map((k) => (
            <button key={k} aria-pressed={kind === k} onClick={() => { setKind(k); pagination.resetPage(); }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border ${kind === k ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>
              {k === 'all' ? 'All' : k === 'doctor' ? 'Doctors & hospitals' : KIND_LABEL[k]} <span className="opacity-60">{countOf(k)}</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-14 text-center text-sm text-slate-500">Loading your visits…</div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-14 text-center space-y-3">
          <AlertCircle className="w-9 h-9 text-rose-400 mx-auto" /><p className="text-rose-600 font-semibold text-sm">{error}</p>
          <button onClick={() => load()} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 px-3 py-2 rounded-xl"><RotateCcw className="w-4 h-4" /> Retry</button>
        </div>
      ) : !filtered.length ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-14 text-center space-y-2 px-6">
          <Star className="w-9 h-9 text-amber-400 mx-auto" />
          <p className="font-extrabold text-slate-800">{tab === 'rate' ? 'Nothing waiting for a rating' : 'No reviews yet'}</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">{tab === 'rate' ? 'Completed consultations, lab reports, pharmacy orders and home care visits appear here so you can rate them.' : 'Reviews you write appear here with the provider’s reply.'}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {pagination.visibleItems.map((x: any) => {
            if (tab === 'rate') {
              const it = x as ToRate; const Icon = ICON[it.kind];
              const name = it.provider || (it.partnerId && names[it.partnerId]) || KIND_LABEL[it.kind];
              return (
                <li key={it.key} className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-3">
                  <div className="flex items-start gap-3">
                    {it.imageUrl ? (
                      <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                        <img
                          src={it.imageUrl}
                          alt={it.what}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <span className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0"><Icon className="w-5 h-5" /></span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-teal-700">{KIND_LABEL[it.kind]}</p>
                      <h3 className="font-extrabold text-slate-900">{name}</h3>
                      <p className="text-xs text-slate-600">{it.what}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{[dateText(it.when), it.where, it.forWhom ? `for ${it.forWhom}` : null].filter(Boolean).join(' · ')}{it.when ? ` · completed ${ago(it.when)}` : ''}</p>
                    </div>
                  </div>
                  <RateBox kind={it.kind} what={name} onSubmit={async (r, t, g) => { await it.submit(r, t, g); setTimeout(() => load(true), 1200); }} />
                </li>
              );
            }
            const r = x as PatientReview; const k = kindOfReview(r); const Icon = ICON[k];
            const name = (k === 'equipment' ? (r.doctor_name ? `${r.doctor_name} · ${r.provider_name || 'Equipment Rental'}` : r.provider_name) : formatDoctorName(r.doctor_name)) || r.provider_name || (r.partner_id && names[r.partner_id]) || KIND_LABEL[k];
            return (
              <li key={r.id} className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-2">
                <div className="flex items-start gap-3">
                  {r.imageUrl ? (
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                      <img
                        src={r.imageUrl}
                        alt={name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <span className="w-10 h-10 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center shrink-0"><Icon className="w-5 h-5" /></span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-extrabold text-slate-900">{name}</h3>
                      <Stars n={r.rating} />
                    </div>
                    <p className="text-xs text-slate-600">{[r.consultation_type, r.location].filter(Boolean).join(' · ')}</p>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Verified visit · reviewed {ago(r.created_at)}</p>
                  </div>
                </div>
                {!!r.tags?.length && <div className="flex flex-wrap gap-1.5">{r.tags.map((t) => <span key={t} className="px-2 py-0.5 rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">{t}</span>)}</div>}
                {r.review && <p className="text-sm text-slate-700">“{r.review}”</p>}
                {r.partner_response ? (
                  <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-100">
                    <p className="text-[11px] font-bold text-teal-800 flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> Reply from {name}{r.responded_at ? ` · ${ago(r.responded_at)}` : ''}</p>
                    <p className="text-sm text-slate-700 mt-1">{r.partner_response}</p>
                  </div>
                ) : <p className="text-[11px] text-slate-400">No reply yet. You’ll be notified when {name} replies.</p>}
              </li>
            );
          })}
        </ul>
      )}
      {!loading && !error && filtered.length > 0 && <VizitoPagination page={pagination.page} pageSize={pagination.pageSize} total={filtered.length} onPageChange={pagination.setPage} onPageSizeChange={pagination.setPageSize} label="reviews"/>}
    </div>
  );
}
