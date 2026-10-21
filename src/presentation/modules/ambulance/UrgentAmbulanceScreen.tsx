import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PhoneCall, Siren } from 'lucide-react';
import { ambulanceError, cancelUrgentApi, MOBILITY, myUrgentApi, newIdempotencyKey, searchHospitalsApi, urgentAvailableApi, urgentContactApi, urgentRequestApi, type UrgentRequest } from '../../../services/ambulanceHelper';
import { getAddressesApi, type PatientAddress } from '../../../services/patientHelper';
import { getFamilyMembersApi, getMyUserId, type PatientFamilyMember } from '../../../services/familyHelper';
import TripTrackingMap from './TripTrackingMap';
import PickupPicker, { type Pickup, type PickupSource } from './PickupPicker';

// Urgent ambulance (D3). 108 always comes first. A short request: the crew's number is known (profile / family), and
// the pickup is a confirmed map pin (current location, moved, searched or a saved address) or, without one, a typed
// address for ambulance operators (no distance filter without a pin; the operator calls to confirm the pickup).
// Never sent to an unconfirmed pin; no payment first.
const field = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-base text-slate-800';

const Call108 = ({ big }: { big?: boolean }) => (
  <a href="tel:108" className={`flex items-center justify-center gap-3 rounded-2xl bg-rose-600 text-white font-black ${big ? 'py-5 text-xl' : 'py-3 text-base'}`}><PhoneCall className="w-6 h-6" /> Call 108 (emergency)</a>
);

const UrgentAmbulanceScreen = () => {
  const [params, setParams] = useSearchParams();
  const openId = params.get('open');
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [drivers, setDrivers] = useState(false);
  useEffect(() => { urgentAvailableApi().then((r) => { setEnabled(r.enabled); setDrivers(!!r.driver_dispatch); }).catch(() => setEnabled(false)); }, []);
  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-4">
      <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2"><Siren className="w-6 h-6 text-rose-600" /> Urgent ambulance</h1>
      <Call108 big />
      <p className="text-sm text-slate-600">{drivers
        ? 'For a life-threatening emergency, call 108 first. You can also ask ambulance drivers on Vizito near you: confirm your pickup pin and the nearest available driver who accepts comes to you (without a confirmed pickup pin, your typed address goes to ambulance operators on Vizito, who call you to confirm the pickup). You pay after the trip.'
        : 'For a life-threatening emergency, call 108 first. You can also ask private ambulance operators on Vizito — those near your confirmed pickup pin, or, without a pin, every operator taking urgent requests (they call you to confirm the pickup). The first to accept sends a vehicle. You pay the operator after the trip.'}</p>
      {openId ? <RequestStatus id={openId} /> : enabled === null ? null : enabled ? <RequestForm drivers={drivers} onSent={(id) => setParams({ open: id })} />
        : <p role="status" className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">Urgent requests to private ambulance operators are not available on Vizito yet. Call 108 for an emergency, or book a planned trip from Book an ambulance.</p>}
    </div>
  );
};

function RequestForm({ onSent, drivers }: { onSent: (id: string) => void; drivers: boolean }) {
  const [f, setF] = useState({ forWho: '', phone: '', address: '', landmark: '', mobility: 'STRETCHER', hospitalId: '', hospitalName: '' });
  // Pickup: a confirmed pin (current location, or moved / searched / a saved address) — or, without one, a typed address.
  const [pick, setPick] = useState<Pickup | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [savedChoice, setSavedChoice] = useState<string | null>(null);
  const [family, setFamily] = useState<PatientFamilyMember[]>([]);
  const [saved, setSaved] = useState<PatientAddress[]>([]);
  // The number the crew will actually call: the profile's, or the family member's (from the server).
  const [contact, setContact] = useState<{ phone: string | null; for_name: string | null } | null>(null);
  const [editPhone, setEditPhone] = useState(false);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<{ id: string; name: string }[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const key = useMemo(() => newIdempotencyKey(), []);
  useEffect(() => {
    getMyUserId().then((id) => (id ? getFamilyMembersApi(id) : [])).then(setFamily).catch(() => setFamily([]));
    getAddressesApi().then(setSaved).catch(() => setSaved([]));
  }, []);
  useEffect(() => { urgentContactApi(f.forWho || undefined).then(setContact).catch(() => setContact({ phone: null, for_name: null })); }, [f.forWho]);
  useEffect(() => {
    if (q.trim().length < 3) { setHits([]); return; }
    const t = window.setTimeout(() => { searchHospitalsApi(q.trim()).then(setHits).catch(() => setHits([])); }, 300);
    return () => window.clearTimeout(t);
  }, [q]);
  const useProfilePhone = !!contact?.phone && !editPhone;
  const pinReady = !!pick && confirmed;
  const canSend = (useProfilePhone || f.phone.trim().length >= 10) && (pinReady || f.address.trim().length >= 10);
  const applySaved = (a: PatientAddress) => {
    // Explicit choice only, never automatic. With a saved position the pin moves there; otherwise the patient puts it
    // there. Either way it must be confirmed before anything is sent.
    const text = [a.addressLine1, a.addressLine2, a.landmark, a.pincode].filter(Boolean).join(', ');
    setF((x) => ({ ...x, address: text.slice(0, 300) }));
    setSavedChoice(a.label || 'Saved address');
    setConfirmed(false);
    if (a.latitude !== null && a.longitude !== null) setPick({ lat: a.latitude, lng: a.longitude, source: 'SAVED' as PickupSource });
    else if (pick) setPick({ ...pick, source: 'SAVED' as PickupSource });
  };
  const send = async () => {
    setBusy(true); setErr(null);
    try {
      const pin = pinReady ? { latitude: pick!.lat, longitude: pick!.lng, pickup_source: savedChoice && pick!.source !== 'DEVICE' ? 'SAVED' : pick!.source, pickup_confirmed: true, accuracy_m: pick!.accuracy ?? null } : {};
      const r = await urgentRequestApi({
        contact_phone: useProfilePhone ? '' : f.phone, family_member_id: f.forWho || undefined, pickup_address: f.address, landmark: f.landmark || undefined,
        mobility: f.mobility, destination_hospital_partner_id: f.hospitalId || undefined, ...pin,
      }, key);
      onSent(r.id);
    } catch (e) { setErr(ambulanceError(e, 'Could not send the request. Call 108.')); } finally { setBusy(false); }
  };
  return (
    <section aria-label="Urgent request" className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
      {family.length > 0 && (
        <label className="block text-sm font-bold text-slate-700">Who needs the ambulance?
          <select aria-label="Who needs the ambulance" value={f.forWho} onChange={(e) => { setEditPhone(false); setF({ ...f, forWho: e.target.value }); }} className={`${field} mt-1`}>
            <option value="">Me</option>
            {family.map((m) => <option key={m.associationId} value={String(m.memberUserId)}>{m.name} ({m.relationship})</option>)}
          </select>
        </label>
      )}
      {useProfilePhone ? (
        <p aria-label="Phone the crew will call" className="text-sm text-slate-700">The crew will call <b>{contact!.phone}</b>{f.forWho ? ` (${contact!.for_name || 'family member'}'s number, or yours if they have none)` : ' (from your profile)'}. <button type="button" onClick={() => { setEditPhone(true); setF({ ...f, phone: contact!.phone || '' }); }} className="font-bold text-rose-700 underline">Use another number</button></p>
      ) : <label className="block text-sm font-bold text-slate-700">Phone the crew can call<input aria-label="Phone the crew can call" inputMode="tel" autoComplete="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className={`${field} mt-1`} /></label>}

      <PickupPicker value={pick} confirmed={confirmed} autoLocate
        onChange={(p) => { setErr(null); setPick(p); setConfirmed(false); }} onConfirm={setConfirmed}
        onUseAddress={(a) => { if (!f.address.trim()) setF((x) => ({ ...x, address: a.slice(0, 300) })); }} />
      {saved.length > 0 && (
        <div aria-label="Saved addresses" className="text-xs text-slate-700 space-y-1">
          <p className="font-bold">Or use a saved address (you will put the pin there and confirm it):</p>
          {saved.map((a) => <button type="button" key={a.addressId} onClick={() => applySaved(a)} className="mr-2 rounded-lg border border-slate-300 px-2 py-1 font-semibold">Use saved address: {a.label || a.addressLine1}</button>)}
          {savedChoice && <p role="note" className="text-amber-800">Using “{savedChoice}”. Check the pin is at that address (tap the map or search to move it), then confirm the pin.</p>}
        </div>
      )}
      <label className="block text-sm font-bold text-slate-700">Landmark / pickup instructions <span className="font-normal text-slate-500">(optional)</span>
        <input aria-label="Landmark / pickup instructions" maxLength={200} value={f.landmark} onChange={(e) => setF({ ...f, landmark: e.target.value })} placeholder="e.g. blue gate opposite the temple, 2nd floor" className={`${field} mt-1`} /></label>
      <label className="block text-sm font-bold text-slate-700">Address <span className="font-normal text-slate-500">{pinReady ? '(optional with a confirmed pin)' : '(needed if you cannot set a pin)'}</span>
        <textarea aria-label="Address" rows={2} maxLength={300} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} placeholder="House, street, area" className={`${field} mt-1`} /></label>
      {!pinReady && <p role="note" className="text-xs text-slate-600">{pick ? 'Confirm the pin above to send the nearest ambulance there.' : 'No pin yet: your typed address goes to ambulance operators on Vizito (not filtered by distance, since there is no pin). The operator who accepts will call you to confirm where to pick you up.'}</p>}
      <label className="block text-sm font-bold text-slate-700">The patient
        <select aria-label="The patient" value={f.mobility} onChange={(e) => setF({ ...f, mobility: e.target.value })} className={`${field} mt-1`}>{MOBILITY.map((m) => <option key={m.code} value={m.code}>{m.label}</option>)}</select>
      </label>
      <div className="text-sm font-bold text-slate-700 space-y-1">
        <p>Hospital (optional) {f.hospitalName && <span className="font-semibold text-emerald-700">· {f.hospitalName} <button type="button" className="underline text-slate-500" onClick={() => setF({ ...f, hospitalId: '', hospitalName: '' })}>change</button></span>}</p>
        {!f.hospitalId && <input aria-label="Search hospital" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type 3+ letters of the hospital name" className={field} />}
        {!f.hospitalId && hits.map((h) => <button type="button" key={h.id} onClick={() => { setF({ ...f, hospitalId: h.id, hospitalName: h.name }); setQ(''); setHits([]); }} className="block w-full text-left rounded-lg px-3 py-2 font-normal hover:bg-slate-50">{h.name}</button>)}
      </div>
      {err && <p role="alert" className="text-sm font-semibold text-rose-700">{err}</p>}
      <button onClick={send} disabled={busy || !canSend} className="w-full rounded-xl bg-slate-900 py-3.5 text-base font-black text-white disabled:opacity-50">{busy ? 'Sending…' : drivers && pinReady ? 'Find a nearby ambulance' : pinReady ? 'Ask operators near the pin' : 'Send to ambulance operators'}</button>
      <Call108 />
    </section>
  );
}

function RequestStatus({ id }: { id: string }) {
  const navigate = useNavigate();
  const [r, setR] = useState<UrgentRequest | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [, tick] = useState(0);
  const load = useCallback(() => { myUrgentApi(id).then(setR).catch((e) => setErr(ambulanceError(e, 'Could not load the request.'))); }, [id]);
  useEffect(() => { load(); const a = window.setInterval(load, 5000), b = window.setInterval(() => tick((n) => n + 1), 1000); return () => { window.clearInterval(a); window.clearInterval(b); }; }, [load]);
  if (!r) return err ? <p className="text-sm font-bold text-rose-700">{err}</p> : <p className="text-sm text-slate-400">Loading…</p>;
  const secs = Math.max(0, Math.round((new Date(r.expires_at).getTime() - Date.now()) / 1000));
  return (
    <section aria-label="Request status" className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
      {/* The headline follows the linked trip's current outcome (a cancelled or completed trip never reads "accepted"). */}
      <p role="status" aria-label="Request outcome" data-outcome={r.outcome} className={`rounded-xl px-3 py-2 text-base font-black ${r.outcome === 'ACTIVE' || r.outcome === 'COMPLETED' ? 'bg-emerald-50 text-emerald-800' : r.outcome === 'SEARCHING' ? 'bg-amber-50 text-amber-900' : 'bg-rose-50 text-rose-800'}`}>{r.status_label}</p>
      {r.status === 'OPEN' && r.dispatch_mode === 'DRIVER' && <p className="text-sm text-slate-700">Looking for the nearest available ambulance driver. Waiting up to {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}. If nobody accepts, call 108.</p>}
      {r.status === 'OPEN' && r.dispatch_mode !== 'DRIVER' && <p className="text-sm text-slate-700">Sent to {r.operators_notified} operator{r.operators_notified === 1 ? '' : 's'}{r.location_shared ? ' near your pickup pin' : ' on Vizito (no pickup pin, so not filtered by distance). The one who accepts will call you to confirm the pickup'}. Waiting up to {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}. If nobody accepts, call 108.</p>}
      {r.status === 'UNANSWERED' && <><p className="text-sm text-rose-800">{r.dispatch_mode === 'DRIVER' ? 'No ambulance driver on Vizito accepted in time.' : r.operators_notified ? 'No operator accepted in time.' : (r.location_shared ? 'No operator on Vizito is available near your pickup right now.' : 'No operator on Vizito is taking urgent requests right now.')}</p><Call108 /></>}
      {r.outcome === 'SEARCHING' && r.trip_id && <p className="text-sm text-slate-700">Your ambulance could not continue. Vizito is finding another one. If it is an emergency, call 108.</p>}
      {r.outcome === 'CANCELLED' && r.trip && <div className="space-y-1 text-sm"><p className="text-rose-800">This trip was cancelled{r.status_reason ? `: ${r.status_reason}` : '.'}</p><p className="text-slate-600">If you still need an ambulance, call 108 or send a new request.</p><Call108 /></div>}
      {r.outcome === 'COMPLETED' && r.trip && <div className="space-y-1 text-sm"><p className="text-emerald-800">The trip is complete.</p><button onClick={() => navigate(`/ambulance-trips?open=${r.trip_id}`)} className="font-bold text-slate-700 underline">View the trip and payment</button></div>}
      {r.outcome === 'ACTIVE' && r.trip && (
        <div className="space-y-1 text-sm">
          <p><b>{r.trip.operator.name}</b> is sending <b>{r.trip.vehicle_registration}</b> with driver {r.trip.driver_name}.</p>
          {r.trip.operator.phone && <a className="font-bold text-rose-700 underline" href={`tel:${r.trip.operator.phone}`}>Call the operator: {r.trip.operator.phone}</a>}
          <p className="text-slate-600">Status: {r.trip.status_label}. Keep your phone free; the crew may call you.</p>
          {r.trip_id && <TripTrackingMap tripId={r.trip_id} />}
          <button onClick={() => navigate(`/ambulance-trips?open=${r.trip_id}`)} className="font-bold text-slate-700 underline">Open the trip</button>
        </div>
      )}
      {r.can_cancel && <button onClick={() => { if (window.confirm('Cancel this urgent request?')) cancelUrgentApi(id).then(setR).catch((e) => setErr(ambulanceError(e, 'Could not cancel.'))); }} className="w-full rounded-xl border border-slate-300 py-2 text-sm font-bold text-slate-700">Cancel request</button>}
      {err && <p role="alert" className="text-sm font-semibold text-rose-700">{err}</p>}
    </section>
  );
}

export default UrgentAmbulanceScreen;
