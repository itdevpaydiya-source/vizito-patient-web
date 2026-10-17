import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Store, MapPin, Star, RotateCcw, FileText, ShieldCheck, Truck, Pill, ChevronRight, Stethoscope, CheckCircle2 } from 'lucide-react';
import { getProvidersApi, getPrescriptionsApi, type PatientPrescription } from '../../../services/patientHelper';
import { createPharmacyRequestApi } from '../../../services/pharmacyOrderHelper';
import { pauseText, type ProviderItem } from '../../../services/types';

// Start of "Order medicines": the three steps, the pharmacies on Vizito to choose from (no empty
// screen behind a button), and the patient's own prescriptions that can be sent to a pharmacy so
// the pharmacist prepares them. All real data: providers search and the patient's prescriptions.
const initials = (n: string) => n.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
const day = (d: string | null) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

export function OrderSteps({ step }: { step: 1 | 2 | 3 }) {
  const steps = ['Choose a pharmacy', 'Add medicines', 'Pickup or delivery'];
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
  return (
    <div className={`flex flex-wrap sm:flex-nowrap items-start gap-3 ${compact ? '' : 'p-4 rounded-2xl border border-slate-200 bg-white hover:border-[#B45F28]/50 hover:shadow-sm transition'}`}>
      <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-800 grid place-items-center font-black text-sm shrink-0">{p.logo ? <img src={p.logo} alt="" className="w-full h-full object-cover rounded-xl" /> : initials(p.name)}</div>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-slate-900 text-sm truncate">{p.name}</p>
        {p.address && <p className="text-xs text-slate-500 flex items-start gap-1 mt-0.5"><MapPin className="w-3.5 h-3.5 shrink-0 mt-px" /><span className="line-clamp-2">{p.address}</span></p>}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] font-semibold">
          {p.rating && p.rating.count > 0 ? <span className="inline-flex items-center gap-0.5 text-amber-700"><Star className="w-3 h-3 fill-current" />{p.rating.average.toFixed(1)} <span className="text-slate-400 font-medium">({p.rating.count})</span></span> : <span className="text-slate-400">New on Vizito</span>}
          <span className="inline-flex items-center gap-1 text-emerald-700"><ShieldCheck className="w-3 h-3" /> Licensed pharmacy</span>
          {p.pause && <span className="text-amber-700">{pauseText(p.pause, 'orders')}</span>}
        </div>
      </div>
      {onChoose && <button type="button" onClick={onChoose} disabled={!!p.pause} aria-label={`Order from ${p.name}`} className="w-full sm:w-auto sm:self-center shrink-0 px-3.5 py-2 rounded-xl bg-[#B45F28] hover:bg-[#9A4F20] text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed">Order here</button>}
    </div>
  );
}

export function PharmacyDirectory({ onChoose }: { onChoose: (p: ProviderItem) => void }) {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<ProviderItem[] | null>(null);
  const [err, setErr] = useState(false);
  const [shown, setShown] = useState(8);
  const load = useCallback(async (term: string) => {
    setErr(false);
    try { setRows(await getProvidersApi('pharmacy', term || undefined)); } catch { setErr(true); setRows([]); }
  }, []);
  useEffect(() => { const t = setTimeout(() => { setShown(8); load(q.trim()); }, q ? 350 : 0); return () => clearTimeout(t); }, [q, load]);
  const open = (rows || []).filter((p) => !p.pause);
  const list = [...open, ...(rows || []).filter((p) => p.pause)];
  return (
    <section aria-labelledby="ph-dir" className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="ph-dir" className="text-base font-black text-slate-900 flex items-center gap-2"><Store className="w-5 h-5 text-[#B45F28]" /> Choose a pharmacy</h2>
          <p className="text-xs text-slate-500 mt-0.5">{rows ? `${open.length} pharmac${open.length === 1 ? 'y' : 'ies'} taking orders` : 'Loading pharmacies…'}</p>
        </div>
        <label className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input aria-label="Search pharmacies" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pharmacy name or area" className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#B45F28]/20 focus:border-[#B45F28]" />
        </label>
      </div>
      {err ? (
        <p className="text-sm text-rose-700 flex items-center gap-2">Pharmacies could not be loaded. <button onClick={() => load(q.trim())} className="inline-flex items-center gap-1 text-xs font-bold"><RotateCcw className="w-3.5 h-3.5" /> Retry</button></p>
      ) : !rows ? (
        <div className="grid sm:grid-cols-2 gap-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />)}</div>
      ) : list.length === 0 ? (
        <p className="text-sm text-slate-500 py-6 text-center">{q ? `No pharmacy matches “${q}”.` : 'No pharmacy is taking orders right now. Please try again later.'}</p>
      ) : (
        <>
          <ul className="grid sm:grid-cols-2 gap-3" aria-label="Pharmacies">{list.slice(0, shown).map((p) => <li key={p.id} className="min-w-0"><PharmacyCard p={p} onChoose={() => onChoose(p)} /></li>)}</ul>
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
    <ul className="hidden sm:grid grid-cols-3 gap-2 text-xs">
      {[
        [ShieldCheck, 'Licensed pharmacies', 'Every pharmacy on Vizito is a registered business'],
        [FileText, 'Prescription checked', 'Rx-only medicines are dispensed against your prescription'],
        [Truck, 'Pickup or delivery', 'Collect at the counter or get it delivered to a saved address'],
      ].map(([Icon, t, s]: any) => (
        <li key={t} className="flex items-start gap-2.5 rounded-xl bg-white border border-slate-200 p-3">
          <Icon className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <span><b className="block text-slate-800">{t}</b><span className="text-slate-500">{s}</span></span>
        </li>
      ))}
    </ul>
  );
}
