import {useSearchArea} from '../../../services/location';
import {getProvidersApi} from '../../../services/patientHelper';
import type {ProviderItem} from '../../../services/types';
import {providerDistance} from '../../components/ProviderCard';
import LocationBar from '../../components/location/LocationBar';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Ambulance, PhoneCall } from 'lucide-react';
import { ambulanceError, ambulanceOperatorsApi, bookAmbulanceApi, MOBILITY, newIdempotencyKey, routeEstimateApi, rupees, scheduledAvailableApi, termsText, type AmbulanceOperator, type RouteEstimate, type ScheduledAvailability } from '../../../services/ambulanceHelper';
import ScheduledBookingForm from './ScheduledBookingForm';
import { getFamilyMembersApi, getMyUserId, type PatientFamilyMember } from '../../../services/familyHelper';

// Book a scheduled ambulance (discharge, transfer, dialysis, scans). Not for emergencies: 108 comes first.
const sel = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800';
const pad = (n: number) => String(n).padStart(2, '0');
const localInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

const BookAmbulanceScreen = () => {
  const navigate = useNavigate();
  const area=useSearchArea(),[providerPins,setProviderPins]=useState<ProviderItem[]>([]);
  useEffect(()=>{getProvidersApi('ambulance').then(setProviderPins).catch(()=>setProviderPins([]));},[]);
  const operatorDistance=(id:string)=>{const p=providerPins.find(p=>p.id===id);return p?providerDistance(p,area)?.metres??Infinity:Infinity;};
  const [ops, setOps] = useState<AmbulanceOperator[] | null>(null);
  const [family, setFamily] = useState<PatientFamilyMember[]>([]);
  const [f, setF] = useState({ forWho: '', type: '', operator: '', when: localInput(new Date(Date.now() + 3 * 3600000)), pickup: '', drop: '', mobility: '', attendants: '1', notes: '', phone: '' });
  const [route, setRoute] = useState<RouteEstimate | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const attemptKey = useMemo(() => newIdempotencyKey(), []); // same key on retries of this submit
  // Driver dispatch for scheduled trips (switch on the server); off or "choose an operator" = the operator booking below.
  const [auto, setAuto] = useState<ScheduledAvailability | null | undefined>(undefined);
  const [chooseOperator, setChooseOperator] = useState(false);
  useEffect(() => { scheduledAvailableApi().then((r) => setAuto(r.enabled ? r : null)).catch(() => setAuto(null)); }, []);

  useEffect(() => {
    ambulanceOperatorsApi().then(setOps).catch((e) => { setOps([]); setErr(ambulanceError(e, 'Could not load ambulance operators.')); });
    getMyUserId().then((id) => (id ? getFamilyMembersApi(id) : [])).then(setFamily).catch(() => setFamily([]));
  }, []);

  const types = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of ops || []) for (const t of o.vehicle_types) m.set(t.vehicle_type, t.vehicle_type_label);
    return [...m.entries()];
  }, [ops]);
  const offering = (ops || []).filter((o) => o.vehicle_types.some((t) => t.vehicle_type === f.type)).sort((a,b)=>area?operatorDistance(a.partner_id)-operatorDistance(b.partner_id):0);
  const chosen = offering.find((o) => o.partner_id === f.operator)?.vehicle_types.find((t) => t.vehicle_type === f.type);
  const set = (p: Partial<typeof f>) => { setErr(null); setF({ ...f, ...p }); };
  // Driving estimate from Google Maps only (never a straight line or a guessed distance).
  useEffect(() => {
    if (f.pickup.trim().length < 10 || f.drop.trim().length < 5) { setRoute(null); return; }
    const h = setTimeout(() => { routeEstimateApi({ pickup: f.pickup, drop: f.drop, operator_partner_id: f.operator || undefined, vehicle_type: f.type || undefined }).then(setRoute).catch(() => setRoute(null)); }, 600);
    return () => clearTimeout(h);
  }, [f.pickup, f.drop, f.operator, f.type]);

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      const t = await bookAmbulanceApi({
        operator_partner_id: f.operator, vehicle_type: f.type, scheduled_at: new Date(f.when).toISOString(), pickup_address: f.pickup, drop_address: f.drop,
        mobility: f.mobility, attendants: Number(f.attendants || 0), notes: f.notes || undefined, contact_phone: f.phone || undefined,
        family_member_id: f.forWho || undefined,
      }, attemptKey);
      navigate(`/ambulance-trips?open=${t.id}`);
    } catch (e) { setErr(ambulanceError(e, 'Could not book the ambulance.')); } finally { setBusy(false); }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-4"><LocationBar compact purpose="find ambulance services near you"/>
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2"><Ambulance className="w-6 h-6 text-rose-600" /> Book an ambulance</h1>
        <p className="text-sm text-slate-500 mt-1">For planned trips — hospital discharge, transfers, dialysis, scans. Book at least an hour ahead.</p>
      </div>
      <div role="note" className="flex items-center gap-3 rounded-2xl border-2 border-rose-300 bg-rose-50 p-4 text-rose-900">
        <PhoneCall className="w-6 h-6 shrink-0" /><span><b className="block text-base">Emergency? Call <a href="tel:108" className="underline">108</a> now.</b><span className="text-sm">Don't use this form for an emergency. Need one soon? Use <Link to="/urgent-ambulance" className="underline font-bold">Urgent ambulance</Link> as well as 108.</span></span>
      </div>
      {auto === undefined ? <p className="text-sm text-slate-400">Loading…</p>
        : auto && !chooseOperator ? <ScheduledBookingForm info={auto} onChooseOperator={() => setChooseOperator(true)} />
        : !ops ? <p className="text-sm text-slate-400">Loading…</p> : !ops.length ? (
        <p className="text-sm text-slate-600 bg-white rounded-2xl border border-slate-200 p-6 text-center">No ambulance operators are taking bookings on Vizito right now. {err}</p>
      ) : (
        <section aria-label="Trip details" className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <label className="block text-xs font-bold text-slate-700">For
            <select aria-label="For" value={f.forWho} onChange={(e) => set({ forWho: e.target.value })} className={`${sel} mt-1`}>
              <option value="">Me</option>
              {family.map((m) => <option key={m.associationId} value={String(m.memberUserId)}>{m.name} ({m.relationship})</option>)}
            </select>
          </label>
          <label className="block text-xs font-bold text-slate-700">Vehicle type
            <select aria-label="Vehicle type" value={f.type} onChange={(e) => set({ type: e.target.value, operator: (() => { const available = (ops || []).filter(o => o.vehicle_types.some(t => t.vehicle_type === e.target.value)); return available.length === 1 ? available[0].partner_id : ''; })() })} className={`${sel} mt-1`}>
              <option value="">Choose</option>{types.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
            </select>
          </label>
          {f.type && (
            <fieldset className="space-y-2"><legend className="text-xs font-bold text-slate-700">Operator</legend>
              {offering.map((o) => { const t = o.vehicle_types.find((x) => x.vehicle_type === f.type)!; return (
                <label key={o.partner_id} className={`flex gap-3 rounded-xl border p-3 cursor-pointer ${f.operator === o.partner_id ? 'border-rose-400 bg-rose-50' : 'border-slate-200'}`}>
                  <input type="radio" name="operator" checked={f.operator === o.partner_id} onChange={() => set({ operator: o.partner_id })} className="mt-1" />
                  <span className="text-sm"><b className="block text-slate-900">{o.name}</b>
                    {rupees(t.base_fare)} for the first {t.included_km} km, then {rupees(t.per_km)}/km{t.waiting_per_15_min ? `; waiting ${rupees(t.waiting_per_15_min)} per 15 min` : ''}
                    {t.equipment.length > 0 && <span className="block text-xs text-slate-500">Equipment: {t.equipment.join(', ')}</span>}</span>
                </label>); })}
            </fieldset>
          )}
          <label className="block text-xs font-bold text-slate-700">Pickup date and time<input type="datetime-local" aria-label="Pickup date and time" value={f.when} min={localInput(new Date(Date.now() + 3600000))} onChange={(e) => set({ when: e.target.value })} className={`${sel} mt-1`} /></label>
          <label className="block text-xs font-bold text-slate-700">Pickup address<textarea rows={2} aria-label="Pickup address" value={f.pickup} onChange={(e) => set({ pickup: e.target.value })} placeholder="House / flat, street, area, city, landmark" className={`${sel} mt-1`} /></label>
          <label className="block text-xs font-bold text-slate-700">Going to<input aria-label="Going to" value={f.drop} onChange={(e) => set({ drop: e.target.value })} placeholder="Hospital name and area" className={`${sel} mt-1`} /></label>
          <label className="block text-xs font-bold text-slate-700">How can the patient travel?
            <select aria-label="How can the patient travel" value={f.mobility} onChange={(e) => set({ mobility: e.target.value })} className={`${sel} mt-1`}><option value="">Choose</option>{MOBILITY.map((m) => <option key={m.code} value={m.code}>{m.label}</option>)}</select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-bold text-slate-700">Attendants travelling<select aria-label="Attendants" value={f.attendants} onChange={(e) => set({ attendants: e.target.value })} className={`${sel} mt-1`}><option>0</option><option>1</option><option>2</option></select></label>
            <label className="text-xs font-bold text-slate-700">Phone for the crew<input aria-label="Phone for the crew" inputMode="tel" value={f.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="Your number if empty" className={`${sel} mt-1`} /></label>
          </div>
          {route && (route.available
            ? <p aria-label="Route estimate" className="text-sm text-slate-700">Driving distance about <b>{route.km} km</b> (~{route.minutes} min, Google Maps){chosen && route.estimated_fare != null ? <> · estimated fare <b>{rupees(route.estimated_fare)}</b></> : ''}. The final fare uses the odometer distance and any waiting time.</p>
            : <p aria-label="Route estimate" className="text-xs text-slate-500">{route.reason}</p>)}
          {chosen && <p aria-label="Cancellation terms" className="text-xs text-slate-600 bg-slate-50 rounded-xl p-3">{termsText(chosen.cancellation_terms)}</p>}
          <label className="block text-xs font-bold text-slate-700">Note for the crew (optional)<input maxLength={300} aria-label="Note for the crew" value={f.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="e.g. 3rd floor, no lift" className={`${sel} mt-1`} /></label>
          {err && <p role="alert" className="text-sm font-semibold text-rose-700">{err}</p>}
          <button onClick={submit} disabled={busy || !f.type || !f.operator} className="w-full rounded-xl bg-rose-600 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Booking…' : 'Book ambulance'}</button>
          {f.type && !f.operator && <p className="text-xs text-slate-500">Choose an operator</p>}
          <p className="text-xs text-slate-500">The operator confirms the booking and then tells you the vehicle and driver. You can cancel for free until the vehicle sets off.</p>
        </section>
      )}
    </div>
  );
};

export default BookAmbulanceScreen;

