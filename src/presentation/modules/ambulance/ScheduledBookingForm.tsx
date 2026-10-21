import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ambulanceError, bookScheduledApi, MOBILITY, newIdempotencyKey, ratesText, scheduledQuoteApi, termsText, type ScheduledAvailability, type ScheduledQuote } from '../../../services/ambulanceHelper';
import PickupPicker, { type Pickup } from './PickupPicker';
import { getFamilyMembersApi, getMyUserId, type PatientFamilyMember } from '../../../services/familyHelper';

// Scheduled booking without choosing an operator: Vizito offers it to nearby drivers before the pickup.
// Nothing is confirmed until a driver accepts. The quote is maximum rates (SCHEDULED_DISPATCH_SPEC.md §2).
const sel = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800';
const pad = (n: number) => String(n).padStart(2, '0');
const localInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const TYPES: [string, string][] = [['PTA', 'Patient transport'], ['BLS', 'Basic life support (BLS)'], ['ALS', 'Advanced life support (ALS)'], ['MORTUARY', 'Mortuary van']];

const ScheduledBookingForm = ({ info, onChooseOperator }: { info: ScheduledAvailability; onChooseOperator: () => void }) => {
  const navigate = useNavigate();
  const [family, setFamily] = useState<PatientFamilyMember[]>([]);
  const [f, setF] = useState({ forWho: '', type: '', when: localInput(new Date(Date.now() + 3 * 3600000)), pickup: '', drop: '', mobility: '', attendants: '1', notes: '', phone: '' });
  const [pick, setPick] = useState<Pickup | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [quote, setQuote] = useState<ScheduledQuote | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const attemptKey = useMemo(() => newIdempotencyKey(), []);
  const set = (p: Partial<typeof f>) => { setErr(null); setF({ ...f, ...p }); };

  useEffect(() => { getMyUserId().then((id) => (id ? getFamilyMembersApi(id) : [])).then(setFamily).catch(() => setFamily([])); }, []);
  useEffect(() => {
    if (!f.type) { setQuote(null); return; }
    const h = setTimeout(() => {
      scheduledQuoteApi({ vehicle_type: f.type, pickup: f.pickup.trim().length >= 10 ? f.pickup : undefined, drop: f.drop.trim().length >= 5 ? f.drop : undefined })
        .then(setQuote).catch((e) => setQuote({ vehicle_type: f.type, available: false, reason: ambulanceError(e, 'Could not get a quote.') }));
    }, 500);
    return () => clearTimeout(h);
  }, [f.type, f.pickup, f.drop]);

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      const b = await bookScheduledApi({
        vehicle_type: f.type, scheduled_at: new Date(f.when).toISOString(), pickup_address: f.pickup, drop_address: f.drop, latitude: pick?.lat, longitude: pick?.lng, pickup_source: pick?.source, pickup_confirmed: confirmed,
        mobility: f.mobility, attendants: Number(f.attendants || 0), notes: f.notes || undefined, contact_phone: f.phone || undefined, family_member_id: f.forWho || undefined,
      }, attemptKey);
      navigate(`/ambulance-trips?scheduled=${b.id}`);
    } catch (e) { setErr(ambulanceError(e, 'Could not book the ambulance.')); } finally { setBusy(false); }
  };

  return (
    <section aria-label="Trip details" className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
      <p className="text-sm text-slate-600">You don't choose an operator. About {info.search_lead_minutes} minutes before the pickup, Vizito offers the trip to nearby ambulance drivers. <b>It is confirmed only when a driver accepts.</b></p>
      <label className="block text-xs font-bold text-slate-700">For
        <select aria-label="For" value={f.forWho} onChange={(e) => set({ forWho: e.target.value })} className={`${sel} mt-1`}>
          <option value="">Me</option>
          {family.map((m) => <option key={m.associationId} value={String(m.memberUserId)}>{m.name} ({m.relationship})</option>)}
        </select>
      </label>
      <label className="block text-xs font-bold text-slate-700">Vehicle type
        <select aria-label="Vehicle type" value={f.type} onChange={(e) => set({ type: e.target.value })} className={`${sel} mt-1`}>
          <option value="">Choose</option>{TYPES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
        </select>
      </label>
      <label className="block text-xs font-bold text-slate-700">Pickup date and time<input type="datetime-local" aria-label="Pickup date and time" value={f.when} min={localInput(new Date(Date.now() + info.min_lead_minutes * 60000))} onChange={(e) => set({ when: e.target.value })} className={`${sel} mt-1`} /></label>
      <label className="block text-xs font-bold text-slate-700">Pickup address<textarea rows={2} aria-label="Pickup address" value={f.pickup} onChange={(e) => set({ pickup: e.target.value })} placeholder="House / flat, street, area, city, landmark" className={`${sel} mt-1`} /></label>
      <PickupPicker value={pick} confirmed={confirmed}
        onChange={(p) => { setErr(null); setPick(p); setConfirmed(false); }} onConfirm={setConfirmed}
        onUseAddress={(a) => { if (!f.pickup.trim()) set({ pickup: a.slice(0, 300) }); }} />
      <label className="block text-xs font-bold text-slate-700">Going to<input aria-label="Going to" value={f.drop} onChange={(e) => set({ drop: e.target.value })} placeholder="Hospital name and area" className={`${sel} mt-1`} /></label>
      <label className="block text-xs font-bold text-slate-700">How can the patient travel?
        <select aria-label="How can the patient travel" value={f.mobility} onChange={(e) => set({ mobility: e.target.value })} className={`${sel} mt-1`}><option value="">Choose</option>{MOBILITY.map((m) => <option key={m.code} value={m.code}>{m.label}</option>)}</select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs font-bold text-slate-700">Attendants travelling<select aria-label="Attendants" value={f.attendants} onChange={(e) => set({ attendants: e.target.value })} className={`${sel} mt-1`}><option>0</option><option>1</option><option>2</option></select></label>
        <label className="text-xs font-bold text-slate-700">Phone for the driver<input aria-label="Phone for the driver" inputMode="tel" value={f.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="Your number if empty" className={`${sel} mt-1`} /></label>
      </div>
      {quote && (quote.available && quote.quote ? (
        <div aria-label="Quote" className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700 space-y-1">
          <p><b>Maximum rates:</b> {ratesText(quote.quote)}.</p>
          {quote.estimate && <p>Driving distance about {quote.estimate.km} km (~{quote.estimate.minutes} min, Google Maps) — an estimate only.</p>}
          <ul className="list-disc pl-5 text-xs text-slate-600">{(quote.terms || info.terms).map((t) => <li key={t}>{t}</li>)}</ul>
          <p className="text-xs text-slate-600">{termsText(quote.cancellation_terms)}</p>
        </div>
      ) : <p aria-label="Quote" className="text-xs text-slate-600">{quote.reason}</p>)}
      <label className="block text-xs font-bold text-slate-700">Note for the crew (optional)<input maxLength={300} aria-label="Note for the crew" value={f.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="e.g. 3rd floor, no lift" className={`${sel} mt-1`} /></label>
      {err && <p role="alert" className="text-sm font-semibold text-rose-700">{err}</p>}
      <button onClick={submit} disabled={busy || !f.type || !pick || !confirmed || !quote?.available} className="w-full rounded-xl bg-rose-600 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Booking…' : 'Book — find a driver'}</button>
      <p className="text-xs text-slate-500">Cancel free while waiting for a driver. If no driver accepts {info.deadline_minutes} minutes before the pickup, we tell you so you can book again or call an operator.</p>
      <button type="button" onClick={onChooseOperator} className="text-sm font-bold text-rose-700 underline">Prefer to choose an operator yourself? Book with an operator instead</button>
    </section>
  );
};

export default ScheduledBookingForm;
