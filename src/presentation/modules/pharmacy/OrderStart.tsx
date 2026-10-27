import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Store, MapPin, Star, RotateCcw, FileText, Truck, Pill, ChevronRight, Stethoscope, CheckCircle2, ArrowDownWideNarrow, ShieldCheck, Bike, Settings, Clock, X } from 'lucide-react';
import { getProvidersApi, getPrescriptionsApi, type PatientPrescription } from '../../../services/patientHelper';
import BusinessImage from '../../components/BusinessImage';
import ServiceLocationDialog from '../../components/location/ServiceLocationDialog';
import { useSearchArea, formatDistance } from '../../../services/location';
import { pharmacyDistance, validRating, verifiedLicense, pharmacyHours } from './pharmacyDiscovery';
import { createPharmacyRequestApi } from '../../../services/pharmacyOrderHelper';
import { pauseText, type ProviderItem } from '../../../services/types';

// Start of "Order medicines": the three steps, the pharmacies on Vizito to choose from (no empty
// screen behind a button), and the patient's own prescriptions that can be sent to a pharmacy so
// the pharmacist prepares them. All real data: providers search and the patient's prescriptions.
const day = (d: string | null) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

export function OrderSteps({ step }: { step: 1 | 2 | 3 }) {
  const steps = ['Choose a pharmacy', 'Add medicines', 'Review & place order'];
  return (
    <ol aria-label="Steps" className="flex items-center gap-2 text-xs font-semibold">
      {steps.map((s, i) => {
        const n = i + 1, done = n < step, on = n === step;
        return (
          <li key={s} className="flex items-center gap-2 min-w-0">
            <span className={`w-6 h-6 rounded-full grid place-items-center shrink-0 text-[11px] font-black ${done ? 'bg-emerald-600 text-white' : on ? 'bg-[#B45F28] text-white' : 'bg-slate-100 text-slate-500'}`} aria-current={on ? 'step' : undefined}>{done ? <CheckCircle2 className="w-3.5 h-3.5" /> : n}</span>
            <span className={`truncate hidden sm:inline ${on ? 'text-slate-900' : 'text-slate-500'}`}>{s}</span>
            {n < 3 && <span className="w-6 h-px bg-slate-200 shrink-0" />}
          </li>
        );
      })}
    </ol>
  );
}

export function PharmacyCard({ p, onChoose, compact }: { p: ProviderItem; onChoose?: () => void; compact?: boolean }) {
  const [details, setDetails] = useState(false);
  const location = useSearchArea();
  const distance = pharmacyDistance(p, location);
  const hours = pharmacyHours(p);
  return (
    <article className={`flex flex-wrap items-center gap-4 text-[#101d48] ${compact ? '' : 'rounded-2xl border border-[#e4ebf4] bg-white p-4 sm:flex-nowrap sm:px-5 sm:py-4'}`}>
      <BusinessImage key={`${p.id}:${p.logo || ''}`} p={{ ...p, serviceId: 'pharmacy', partnerType: 'pharmacy' }} className="h-16 w-16 shrink-0 rounded-xl border border-slate-100 bg-white p-1.5" />
      <div className="min-w-[160px] flex-1">
        <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-extrabold">{p.name}</h3>{verifiedLicense(p) ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700"><ShieldCheck className="h-3 w-3" />Licensed</span> : <span className="text-[10px] text-slate-500">License details not provided</span>}</div>
        <p className="mt-1.5 flex items-center gap-1 text-xs text-[#6880a6]"><Star className={`h-3.5 w-3.5 ${validRating(p) ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />{validRating(p) ? <><b className="text-orange-700">{p.rating!.average.toFixed(1)}</b> ({p.rating!.count} reviews)</> : 'Not rated yet'}</p>
        <p className="mt-1 flex items-start gap-1.5 text-xs leading-relaxed text-[#6880a6]"><MapPin className="mt-0.5 h-3 w-3 shrink-0" /><span>{p.address || 'Address not provided'}{distance !== null && <span className="block">{formatDistance(distance)} away (straight-line)</span>}</span></p>
        <p className={`mt-1 flex items-center gap-1 text-[11px] ${p.pause ? 'text-amber-700' : 'text-[#6880a6]'}`}><Clock className="h-3 w-3 shrink-0" />{p.pause ? pauseText(p.pause, 'orders') : hours.length ? hours[0] : 'Hours not provided'}</p>
        {details && <div className="mt-3 space-y-1 rounded-lg bg-slate-50 p-3 text-xs text-slate-600"><p>{p.pause ? 'Temporarily unavailable' : 'Taking medicine orders and prescription requests'}</p>{hours.map(h => <p key={h}>{h}</p>)}<p>Current opening status not provided.</p><p>Minimum order details not provided.</p></div>}
      </div>
      {!compact && <div className="w-full shrink-0 divide-y divide-slate-100 rounded-xl border border-[#edf1f7] bg-slate-50/60 text-xs sm:w-[158px]">
        <div className="flex items-center gap-3 px-3 py-2"><Bike className="h-5 w-5 shrink-0" /><div><p className="font-semibold">Home delivery</p><p className="mt-0.5 text-[11px] text-[#6880a6]">Details not provided</p></div></div>
        <div className="flex items-center gap-3 px-3 py-2"><Store className="h-5 w-5 shrink-0" /><div><p className="font-semibold">Pickup availability</p><p className="mt-0.5 text-[11px] text-[#6880a6]">Details not provided</p></div></div>
      </div>}
      {!compact && <div className="flex w-full shrink-0 items-center justify-between gap-2 sm:w-auto sm:flex-col">
        {onChoose && <button type="button" onClick={onChoose} disabled={!!p.pause} aria-label={`Order from ${p.name}`} className="inline-flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#dc4600] to-[#c43d00] px-5 py-3 text-xs font-bold text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40">Order here <ChevronRight className="h-4 w-4" /></button>}
        <button type="button" onClick={() => setDetails(!details)} aria-expanded={details} className="py-1 text-[11px] font-semibold text-[#6880a6] hover:text-orange-700">{details ? 'Hide details' : 'Pharmacy details'}</button>
      </div>}
    </article>
  );
}

export function PharmacyDirectory({ onChoose }: { onChoose: (p: ProviderItem) => void }) {
  const location = useSearchArea();
  const [q, setQ] = useState('');
  const [area] = useState('');
  const [locationOpen, setLocationOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [availability, setAvailability] = useState<'all' | 'taking' | 'paused'>('all');
  const [sort, setSort] = useState<'name' | 'rating' | 'distance' | 'availability'>('name');
  const [rows, setRows] = useState<ProviderItem[] | null>(null);
  const [err, setErr] = useState(false);
  const [shown, setShown] = useState(8);
  const load = useCallback(async (term: string) => {
    setErr(false);
    try { setRows(await getProvidersApi('pharmacy', term || undefined)); } catch { setErr(true); setRows([]); }
  }, []);
  useEffect(() => { load(''); }, [load]);
  useEffect(() => { setShown(8); }, [q, area, availability, sort, location]);
  useEffect(()=>{setSort(location?'distance':'name');},[location]);
  const list = useMemo(() => (rows || []).filter((p) => {
    if (q.trim() && ![p.name, p.address || ''].join(' ').toLowerCase().includes(q.trim().toLowerCase())) return false;
    if (availability === 'taking' && p.pause) return false;
    if (availability === 'paused' && !p.pause) return false;
    if (area.trim() && !(p.address || '').toLowerCase().includes(area.trim().toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    const fallback = a.name.localeCompare(b.name);
    if (sort === 'distance' && location) return (pharmacyDistance(a, location) ?? Infinity) - (pharmacyDistance(b, location) ?? Infinity) || fallback;
    if (sort === 'rating') return (validRating(b) ? b.rating!.average : -1) - (validRating(a) ? a.rating!.average : -1) || fallback;
    if (sort === 'availability') return Number(!!a.pause) - Number(!!b.pause) || fallback;
    return fallback;
  }), [rows, availability, area, sort, location, q]);
  const takingOrders = (rows || []).filter((p) => !p.pause).length;
  return (
    <section aria-labelledby="ph-dir" className="space-y-3">
      <div className="rounded-2xl border border-[#e4ebf4] bg-white p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-[200px] flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8095b5]" /><input type="search" aria-label="Search pharmacies" value={q} onChange={e => setQ(e.target.value)} placeholder="Search pharmacy name, area or pincode..." className="w-full rounded-xl border border-[#e0e8f3] bg-white py-2.5 pl-10 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-orange-200" /></label>
          <button type="button" onClick={() => setLocationOpen(!locationOpen)} aria-label="Change service location" aria-expanded={locationOpen} className="inline-flex max-w-full items-center gap-2 rounded-xl border border-[#e0e8f3] px-3 py-2.5 text-xs text-[#101d48]"><MapPin className="h-4 w-4 shrink-0" /><span className="max-w-[180px] truncate">{location?.label || 'Set your location'}</span></button>
          <button type="button" aria-label="Location settings" aria-expanded={locationOpen} onClick={() => setLocationOpen(!locationOpen)} className="rounded-xl border border-[#e0e8f3] p-2.5 text-[#101d48]"><Settings className="h-4 w-4" /></button>
        </div>
        {locationOpen && <ServiceLocationDialog onClose={()=>setLocationOpen(false)}/>}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" aria-pressed={availability === 'all' && sort !== 'distance'} onClick={() => { setAvailability('all'); setSort('name'); }} className={`rounded-full border px-3 py-2 text-xs ${availability === 'all' && sort !== 'distance' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-[#e0e8f3] text-[#526c98]'}`}>All pharmacies</button>
          <button type="button" aria-pressed={sort === 'distance'} onClick={() => { if (!location) setLocationOpen(true); else setSort('distance'); }} className={`rounded-full border px-3 py-2 text-xs ${sort === 'distance' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-[#e0e8f3] text-[#526c98]'}`}>Nearby</button>
          {['Home delivery', 'Pickup available', '24/7'].map(label => <button key={label} type="button" disabled title="Details not provided" className="rounded-full border border-[#e0e8f3] px-3 py-2 text-xs text-[#526c98] disabled:cursor-not-allowed disabled:opacity-60">{label}</button>)}
          <label className="ml-auto flex items-center gap-2 text-xs text-[#6880a6]">Sort by<select aria-label="Sort pharmacies" value={sort} onChange={e => setSort(e.target.value as typeof sort)} className="rounded-xl border border-[#e0e8f3] bg-white px-3 py-2 text-[#101d48]"><option value="name">Name A-Z</option><option value="distance" disabled={!location}>Nearest first</option><option value="rating">Highest rated</option><option value="availability">Taking orders first</option></select></label>
        </div>
        <details className="mt-2 text-[11px] text-[#6880a6]"><summary className="cursor-pointer">More filters</summary><div className="mt-2 flex flex-wrap gap-2">{([['all', 'All pharmacies'], ['taking', 'Taking orders'], ['paused', 'Temporarily unavailable']] as const).map(([key, label]) => <button type="button" key={key} aria-pressed={availability === key} onClick={() => setAvailability(key)} className={`rounded-full border px-3 py-1.5 ${availability === key ? 'border-orange-400 bg-orange-50 text-orange-800' : 'border-slate-200'}`}>{label}</button>)}<span className="self-center">Delivery, pickup and 24/7 details not provided.</span></div></details>
      </div>
      <div className="flex items-center justify-between gap-3 pt-1"><h2 id="ph-dir" className="text-base font-extrabold text-[#101d48]">{location ? 'Nearby pharmacies' : 'Pharmacies'} {rows && <span className="font-medium text-[#6880a6]">({list.length})</span>}</h2><button type="button" onClick={() => setMapOpen(!mapOpen)} aria-expanded={mapOpen} className="inline-flex items-center gap-2 text-xs font-semibold text-sky-600">{mapOpen ? 'Hide map links' : 'View on map'}<MapPin className="h-4 w-4" /></button></div>
      {mapOpen && <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600"><p className="mb-2">Open a pharmacy location in maps:</p>{list.filter(p => p.storePin || p.address).length ? list.filter(p => p.storePin || p.address).slice(0, shown).map(p => <a key={p.id} target="_blank" rel="noopener noreferrer" className="block py-1 text-sky-700 underline" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.storePin ? `${p.storePin.lat},${p.storePin.lng}` : p.address!)}`}>{p.name}</a>) : 'Location details not provided.'}</div>}
      <p role="status" className="sr-only">{rows ? `${list.length} results; showing ${Math.min(shown, list.length)}; ${takingOrders} taking orders` : 'Searching pharmacies'}</p>
      {err ? (
        <p className="text-sm text-rose-700 flex items-center gap-2">Pharmacies could not be loaded. <button onClick={() => load('')} className="inline-flex items-center gap-1 text-xs font-bold"><RotateCcw className="w-3.5 h-3.5" /> Retry</button></p>
      ) : !rows ? (
        <div className="grid sm:grid-cols-2 gap-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />)}</div>
      ) : list.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white py-8 text-center text-sm text-slate-500">{q || area ? 'No pharmacies match these search filters. Try another name, area, or pincode.' : availability === 'paused' ? 'No temporarily unavailable pharmacies are listed.' : 'No pharmacies are available for the selected filter.'}</p>
      ) : (
        <>
          <ul className="space-y-2.5" aria-label="Pharmacies">{list.slice(0, shown).map((p) => <li key={p.id} className="min-w-0"><PharmacyCard p={p} onChoose={() => onChoose(p)} /></li>)}</ul>
          {list.length > shown && <button type="button" onClick={() => setShown(shown + 8)} className="w-full py-2 text-xs font-bold text-[#B45F28]">Show more ({list.length - shown} more)</button>}
        </>
      )}
    </section>
  );
}

/** Prescriptions with medicines not yet sent to a pharmacy: send one to the chosen pharmacy. */
export function PrescriptionsReady({ pharmacy, onPickPharmacy }: { pharmacy: ProviderItem | null; onPickPharmacy: () => void }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<PatientPrescription[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { getPrescriptionsApi().then(setRows).catch(() => setRows([])); }, []);
  const ready = (rows || []).filter((p) => p.medicines.length > 0 && !p.pharmacy_status && String(p.status || 'Finalized').toLowerCase() !== 'draft').slice(0, 4);
  if (!rows || ready.length === 0) return null;
  const send = async (p: PatientPrescription) => {
    if (!pharmacy) { onPickPharmacy(); return; }
    setBusy(p.id); setErr(null);
    try { await createPharmacyRequestApi(p.id, pharmacy.id); navigate('/pharmacy-orders?tab=requests'); }
    catch (e: any) { const m = e?.response?.data?.message; setErr(Array.isArray(m) ? m.join(', ') : m || 'Could not send the prescription.'); } finally { setBusy(null); }
  };
  return (
    <section aria-labelledby="ph-rx" className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
      <div>
        <h2 id="ph-rx" className="text-base font-black text-slate-900 flex items-center gap-2"><FileText className="w-5 h-5 text-[#B45F28]" /> From your prescriptions</h2>
        <p className="text-xs text-slate-500 mt-0.5">Send a prescription and the pharmacist prepares the exact medicines your doctor wrote.{pharmacy ? '' : ' Choose a pharmacy first.'}</p>
      </div>
      <ul className="space-y-2">{ready.map((p) => (
        <li key={p.id} className="rounded-xl border border-slate-200 p-3 flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5"><Stethoscope className="w-4 h-4 text-slate-400" />{p.doctor?.name ? (/^dr/i.test(p.doctor.name) ? p.doctor.name : `Dr. ${p.doctor.name}`) : 'Your doctor'}<span className="text-xs font-medium text-slate-500">· {day(p.date)}</span></p>
            {p.diagnosis && <p className="text-xs text-slate-600 mt-0.5">{p.diagnosis}</p>}
            <p className="text-xs text-slate-500 mt-1 flex items-start gap-1"><Pill className="w-3.5 h-3.5 shrink-0 mt-px" /><span className="line-clamp-2">{p.medicines.map((m) => [m.name, m.dosage].filter(Boolean).join(' ')).join(' · ')}</span></p>
          </div>
          <button type="button" disabled={busy === p.id} onClick={() => send(p)} className="shrink-0 px-3 py-2 rounded-xl border border-[#B45F28] text-[#B45F28] text-xs font-bold hover:bg-[#FDF7F1] disabled:opacity-50 inline-flex items-center gap-1">
            {busy === p.id ? 'Sending…' : pharmacy ? <>Send to {pharmacy.name.length > 18 ? 'this pharmacy' : pharmacy.name}</> : <>Send to a pharmacy <ChevronRight className="w-3.5 h-3.5" /></>}
          </button>
        </li>
      ))}</ul>
      {err && <p role="alert" className="text-xs font-semibold text-rose-700">{err}</p>}
    </section>
  );
}

export function TrustStrip() {
  return (
    <ul className="grid sm:grid-cols-3 gap-2 text-xs">
      {[
        [ShieldCheck, 'Licensed pharmacies', 'License verification shown when provided'],
        [FileText, 'Prescription checked', 'Send your prescription for pharmacist review'],
        [Truck, 'Pickup or delivery', 'Availability shown when details are provided'],
      ].map(([Icon, t, s]: any) => (
        <li key={t} className="flex items-start gap-2.5 rounded-xl bg-white border border-[#e4ebf4] p-3">
          <Icon className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <span><b className="block text-slate-800">{t}</b><span className="text-slate-500">{s}</span></span>
        </li>
      ))}
    </ul>
  );
}

