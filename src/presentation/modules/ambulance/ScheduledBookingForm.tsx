import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, ChevronLeft, FileText, Info, ShieldCheck } from 'lucide-react';
import ThemedSelect from '../../components/forms/ThemedSelect';
import PickupPicker, { type Pickup } from './PickupPicker';
import { SavedAddresses, Destination, PatientChoice } from './JourneyParts';
import {
  ambulanceError, ambulanceOperatorsApi, bookAmbulanceApi, bookScheduledApi, estimate, MOBILITY, newIdempotencyKey,
  ratesText, routeEstimateApi, rupees, scheduledQuoteApi, shareNoteApi, shareScheduledNoteApi, termsText,
  TRANSFER_CHOICES, VEHICLE_CHOICES, validateAmbulanceFile,
  type AmbulanceOperator, type Rates, type RouteEstimate, type ScheduledAvailability, type ScheduledQuote,
} from '../../../services/ambulanceHelper';
import {
  AmbSteps, DetailRows, ErrorNote, LoadingBlock, StateCard, VEHICLE_BLURB,
} from './AmbulanceV2Parts';

const localDate = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

interface Form {
  forWho: string;
  name: string;
  phone: string;
  when: string;
  pickup: string;
  drop: string;
  hospitalId: string;
  mobility: string;
  attendants: string;
  notes: string;
  type: string;
  operator: string;
  transfer: string;
}

export default function ScheduledBookingForm({ info, transferType = 'DISCHARGE' }: { info: ScheduledAvailability; transferType?: string }) {
  const navigate = useNavigate();
  const manual = !info.enabled;
  const [step, setStep] = useState(0);
  const [f, setF] = useState<Form>(() => ({
    forWho: '', name: '', phone: '',
    when: localDate(new Date(Date.now() + Math.max(info.min_lead_minutes + 30, 60) * 60000)),
    pickup: '', drop: '', hospitalId: '', mobility: 'WALKING', attendants: '1', notes: '',
    type: '', operator: '', transfer: transferType,
  }));
  const [pick, setPick] = useState<Pickup | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [quotes, setQuotes] = useState<ScheduledQuote[] | null>(null);
  const [ratesBusy, setRatesBusy] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [operators, setOperators] = useState<AmbulanceOperator[] | null>(null);
  const [operatorsError, setOperatorsError] = useState<string | null>(null);
  const [route, setRoute] = useState<RouteEstimate | null>(null);
  const [dropPoint, setDropPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [routeBusy, setRouteBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; trip: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const key = useMemo(newIdempotencyKey, []);

  const set = (patch: Partial<Form>) => setF(current => ({ ...current, ...patch }));
  const scrollTop = () => { document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' }); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const loadQuotes = useCallback(() => {
    if (manual) return;
    setRatesBusy(true);
    setRatesError(null);
    let failures = 0;
    Promise.all(VEHICLE_CHOICES.map(async ([code]) => {
      try {
        return await scheduledQuoteApi({ vehicle_type: code, pickup: f.pickup.trim() || undefined, drop: f.drop.trim() || undefined });
      } catch (e) {
        failures += 1;
        return { vehicle_type: code, available: false, reason: ambulanceError(e, 'Could not load this rate. Retry.') } as ScheduledQuote;
      }
    })).then(rows => {
      setQuotes(rows);
      setF(current => {
        if (current.type && rows.some(row => row.vehicle_type === current.type && row.available)) return current;
        const first = rows.find(row => row.available);
        return { ...current, type: first ? first.vehicle_type : '' };
      });
      if (failures === rows.length) setRatesError('Ambulance rates could not be loaded. Check your connection and retry.');
    }).catch(() => setRatesError('Ambulance rates could not be loaded. Check your connection and retry.'))
      .finally(() => setRatesBusy(false));
  }, [manual, f.pickup, f.drop]);

  useEffect(() => {
    if (step === 1 && !quotes && !ratesBusy && !ratesError) loadQuotes();
  }, [step, quotes, ratesBusy, ratesError, loadQuotes]);

  const loadOperators = useCallback(() => {
    setOperatorsError(null);
    ambulanceOperatorsApi().then(setOperators).catch(e => setOperatorsError(ambulanceError(e, 'Could not load ambulance operators.')));
  }, []);
  useEffect(() => { if (manual && !operators && !operatorsError) loadOperators(); }, [manual, operators, operatorsError, loadOperators]);

  // Real road route between the confirmed pickup pin and the destination pin; otherwise the reason is shown.
  useEffect(() => {
    if (step !== 0 && step !== 3) return;
    if (!pick || !confirmed || !dropPoint) { setRoute(null); setRouteBusy(false); return; }
    let active = true;
    const timer = window.setTimeout(() => {
      if (!active) return;
      setRouteBusy(true);
      routeEstimateApi({
        pickup_lat: pick.lat, pickup_lng: pick.lng, drop_lat: dropPoint.lat, drop_lng: dropPoint.lng,
        vehicle_type: f.type || undefined,
        operator_partner_id: manual ? f.operator || undefined : undefined,
      })
        .then(result => { if (active) setRoute(result); })
        .catch(e => { if (active) setRoute({ available: false, reason: ambulanceError(e, 'Could not check the driving distance.') }); })
        .finally(() => { if (active) setRouteBusy(false); });
    }, 400);
    return () => { active = false; window.clearTimeout(timer); };
  }, [step, pick, confirmed, dropPoint, f.type, f.operator, manual]);

  const operator = operators?.find(row => row.partner_id === f.operator);
  const operatorRate = operator?.vehicle_types.find(row => row.vehicle_type === f.type);
  const quote = quotes?.find(row => row.vehicle_type === f.type);
  const pricing: Rates | undefined = manual ? operatorRate : quote?.quote;
  const routeKm = route?.available ? route.km : undefined;
  const km = routeKm ?? quote?.estimate?.km;
  const minutes = (route?.available ? route.minutes : undefined) ?? quote?.estimate?.minutes ?? undefined;
  const est = pricing && km !== undefined ? estimate(pricing, km) : null;
  const extraKm = pricing && km !== undefined ? Math.max(0, Math.ceil(km) - pricing.included_km) : null;
  const transferLabel = TRANSFER_CHOICES.find(([code]) => code === f.transfer)?.[1] || 'Scheduled transfer';

  const problem = (target: number): string | null => {
    if (target === 0) {
      if (f.forWho === '__choose__') return 'Choose the linked patient who needs the ambulance.';
      if (f.pickup.trim().length < 10) return 'Enter the full pickup address (at least 10 characters).';
      if (!manual && (!pick || !confirmed)) return 'Confirm the patient pickup pin on the map.';
      if (f.drop.trim().length < 5) return 'Enter the destination hospital or address.';
      if (!f.when) return 'Choose the pickup date and time.';
      if (new Date(f.when).getTime() < Date.now() + info.min_lead_minutes * 60000) return `Choose a pickup at least ${info.min_lead_minutes} minutes ahead.`;
      return null;
    }
    if (target === 1) {
      if (!f.type) return 'Choose an ambulance type.';
      if (manual) {
        if (!f.operator) return 'Choose an operator.';
        if (!operatorRate) return 'Choose one of the operator’s vehicle types.';
      } else if (!quote?.available || !quote.quote) return 'Choose an available ambulance type.';
      return null;
    }
    if (target === 2) {
      if (f.forWho === '__choose__') return 'Choose the linked patient who needs the ambulance.';
      const digits = f.phone.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 15) return 'Enter a phone number the crew can call (10–15 digits).';
      if (!f.mobility) return 'Choose how the patient will travel.';
      if (file && !consent) return 'Confirm consent to share the document, or remove the file.';
      if (!pricing) return 'Choose an ambulance type with a valid rate.';
      return null;
    }
    return null;
  };

  const next = () => {
    setError(null);
    const issue = problem(step);
    if (issue) { setError(issue); return; }
    setStep(current => Math.min(current + 1, 3));
    scrollTop();
  };

  const attach = async (target: { id: string; trip: boolean }) => {
    if (!file) return;
    await (target.trip ? shareNoteApi : shareScheduledNoteApi)(target.id, f.notes.trim(), file);
  };

  const submit = async () => {
    setError(null);
    setUploadError(null);
    const issue = problem(0) || problem(1) || problem(2);
    if (issue) { setError(issue); return; }
    setBusy(true);
    try {
      let target = created;
      if (!target) {
        const body: Record<string, unknown> = {
          vehicle_type: f.type,
          transfer_type: f.transfer,
          scheduled_at: new Date(f.when).toISOString(),
          pickup_address: f.pickup.trim().slice(0, 300),
          drop_address: f.drop.trim().slice(0, 300),
          destination_hospital_partner_id: f.hospitalId || undefined,
          mobility: f.mobility,
          attendants: Number(f.attendants),
          notes: f.notes.trim() || undefined,
          contact_phone: f.phone.trim() || undefined,
          family_member_id: f.forWho || undefined,
          ...(pick && confirmed ? { latitude: pick.lat, longitude: pick.lng, pickup_source: pick.source, pickup_confirmed: true } : {}),
          ...(manual ? { operator_partner_id: f.operator } : {}),
        };
        const booking = manual ? await bookAmbulanceApi(body, key) : await bookScheduledApi(body, key);
        target = { id: booking.id, trip: manual };
        setCreated(target);
      }
      try {
        await attach(target);
      } catch (e) {
        setUploadError(ambulanceError(e, 'Your booking is saved, but the document could not be shared. Retry the upload.'));
        return;
      }
      navigate(target.trip ? `/ambulance-trips?open=${encodeURIComponent(target.id)}` : `/ambulance-trips?scheduled=${encodeURIComponent(target.id)}`);
    } catch (e) {
      setError(ambulanceError(e, 'Could not finish the booking. If a booking was created it is retained; retry below.'));
    } finally {
      setBusy(false);
    }
  };

  const pickupMissingPin = !manual && (!pick || !confirmed);
  const continueBlocked = step === 1 && !pricing;

  return (
    <div className="amb2 amb2-booking aj">
      <h1 className="sr-only">Book an ambulance</h1>
      <p className="amb2-emergency-line">For a life-threatening emergency, call <a href="tel:108">108</a> now.</p>
      <AmbSteps step={step} />

      {created ? (
        <section className="amb2-card amb2-stack">
          <h2>Your booking is saved</h2>
          <p>The document upload did not finish. Retrying will not create another booking.</p>
          <ErrorNote error={uploadError} />
          <div className="amb2-actions-row">
            <button type="button" className="amb2-btn" onClick={submit} disabled={busy}>{busy ? 'Uploading…' : 'Retry document upload'}</button>
            <Link className="amb2-btn amb2-btn--ghost" to={created.trip ? `/ambulance-trips?open=${encodeURIComponent(created.id)}` : `/ambulance-trips?scheduled=${encodeURIComponent(created.id)}`}>Open saved booking</Link>
          </div>
        </section>
      ) : step === 0 ? (
        <div className="amb2-booking-fields amb2-pickup-grid">
          <div className="amb2-stack">
            <section className="amb2-card">
              <div className="amb2-card-head">
                <div><h2>Pickup location</h2><p>Where should the ambulance come?</p></div>
                <span className="amb2-step-tag">1</span>
              </div>
              <SavedAddresses onSelect={(text, saved) => { set({ pickup: text.slice(0, 300) }); setPick(saved); setConfirmed(false); }} />
              <label className="field">Pickup address
                <textarea aria-label="Pickup address" maxLength={300} value={f.pickup} onChange={event => set({ pickup: event.target.value })} placeholder="Flat, building, street, area and landmark" />
              </label>
              <div className="amb2-two-fields">
                <label className="field">Type of transfer
                  <ThemedSelect aria-label="Type of transfer" value={f.transfer} onChange={event => set({ transfer: event.target.value })}>
                    {TRANSFER_CHOICES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                  </ThemedSelect>
                </label>
                <label className="field">Pickup date and time
                  <input type="datetime-local" aria-label="Pickup date and time" min={localDate(new Date(Date.now() + info.min_lead_minutes * 60000))} value={f.when} onChange={event => set({ when: event.target.value })} />
                </label>
              </div>
              <p className="amb2-field-note"><Info aria-hidden="true" />Pickup must be at least {info.min_lead_minutes} minutes from now. {manual ? 'Confirm the pickup point on the map.' : 'Drivers are sent to the confirmed map pin.'}</p>
              {pickupMissingPin && <p className="amb2-field-note"><Info aria-hidden="true" />Confirm the patient pickup pin on the map before continuing.</p>}
            </section>

            <section className="amb2-card">
              <div className="amb2-card-head">
                <div><h2>Drop location</h2><p>Hospital, clinic or full destination address.</p></div>
              </div>
              <Destination value={f.drop} onChange={(drop, hospitalId, point) => { set({ drop, hospitalId: hospitalId || '' }); setDropPoint(point ?? null); }} />
            </section>
          </div>

          <div className="amb2-stack amb2-booking-side">
            <PickupPicker value={pick} confirmed={confirmed} route={route?.available ? route.route ?? null : null} onChange={value => { setPick(value); setConfirmed(false); setRoute(null); }} onConfirm={setConfirmed} onUseAddress={address => set({ pickup: address.slice(0, 300) })} />
            <section className="amb2-route-card" aria-label="Driving distance">
              <b>Driving distance and time</b>
              {routeBusy
                ? <p role="status">Checking the driving route…</p>
                : route?.available && route.km !== undefined
                  ? <>
                    <p className="amb2-route-big">≈ {route.km} km{route.minutes != null ? ` · ${route.minutes} min` : ''}</p>
                    <p className="amb2-muted">{route.source || 'Road route'} · the line on the map is the driving route from the pickup to the destination.</p>
                  </>
                  : <p>{route?.reason || 'Confirm the pickup pin and choose a destination with a map pin to see the driving distance.'}</p>}
              <p className="amb2-muted">The crew records the trip odometer. Waiting time is measured at pickup; both decide the final fare.</p>
            </section>
          </div>
        </div>
      ) : step === 1 ? (
        <div className="amb2-type-page">
          <section className="amb2-card">
            <div className="amb2-card-head">
              <div><h2>Select ambulance type</h2><p>Only vehicle types with a Vizito rate can be booked.</p></div>
              {!manual && <button type="button" className="amb2-link" onClick={loadQuotes} disabled={ratesBusy}>{ratesBusy ? 'Refreshing…' : 'Refresh rates'}</button>}
            </div>

            {ratesError
              ? <StateCard title="Rates could not be loaded" text={ratesError} onRetry={() => { setQuotes(null); loadQuotes(); }} />
              : manual
                ? <ManualOperatorPicker operators={operators} error={operatorsError} onRetry={() => { setOperators(null); loadOperators(); }} operator={f.operator} type={f.type} onOperator={id => set({ operator: id, type: '' })} onType={type => set({ type })} />
                : !quotes && ratesBusy
                  ? <LoadingBlock rows={3} label="Loading ambulance rates…" />
                  : !quotes
                    ? <StateCard title="Rates have not loaded" text="Load the real rates for each ambulance type." onRetry={loadQuotes} />
                    : <div className="amb2-vehicles">
                      {VEHICLE_CHOICES.map(([code, label]) => {
                        const row = quotes.find(item => item.vehicle_type === code);
                        const selected = f.type === code;
                        return (
                          <button key={code} type="button" className={`amb2-vehicle ${selected ? 'is-selected' : ''}`} aria-pressed={selected} disabled={!row?.available} onClick={() => set({ type: code })}>
                            <span className="amb2-vehicle-img">
                              <img src="/images/healthcare/placeholders/ambulance-vehicle.webp" alt="Representative ambulance" loading="lazy" />
                              <span>Representative image</span>
                              <span className="amb2-vehicle-radio"><Check size={13} aria-hidden="true" /></span>
                            </span>
                            <span className="amb2-vehicle-body">
                              <span className="amb2-vehicle-title">{label}</span>
                              <span className="amb2-vehicle-desc">{VEHICLE_BLURB[code]}</span>
                              {row?.available && row.quote ? <>
                                <span className="amb2-vehicle-price"><b>{rupees(row.quote.base_fare)}</b><span>base fare</span></span>
                                <span className="amb2-vehicle-rate">+ {rupees(row.quote.per_km)}/km after {row.quote.included_km} km</span>
                                <span className="amb2-vehicle-ticks">
                                  <span><Check size={13} aria-hidden="true" />First {row.quote.included_km} km included</span>
                                  <span><Check size={13} aria-hidden="true" />Waiting {rupees(row.quote.waiting_per_15_min)} per 15 min</span>
                                  <span><Check size={13} aria-hidden="true" />Final fare from the trip odometer</span>
                                </span>
                              </> : <span className="amb2-vehicle-unavailable">{row?.reason || 'This ambulance type is not available right now.'}</span>}
                            </span>
                          </button>
                        );
                      })}
                    </div>}
          </section>

          <div className="amb2-type-foot">
            <section className="amb2-card amb2-fare-card">
              <h2>Fare estimate</h2>
              {pricing ? <>
                <div className="amb2-fare-line"><span>Base fare (first {pricing.included_km} km)</span><b>{rupees(pricing.base_fare)}</b></div>
                <div className="amb2-fare-line"><span>Extra distance</span><b>{rupees(pricing.per_km)}/km</b></div>
                <div className="amb2-fare-line"><span>Waiting</span><b>{rupees(pricing.waiting_per_15_min)}/15 min</b></div>
                {km !== undefined && <div className="amb2-fare-line"><span>Road route (≈ {km} km{minutes != null ? ` · ${minutes} min` : ''})</span><b>{rupees(est)}</b></div>}
                <div className="amb2-fare-total"><span>{est !== null ? 'Estimated fare' : 'Base fare'}</span><b>{rupees(est ?? pricing.base_fare)}</b></div>
                <p className="amb2-fare-note">{est !== null ? 'Estimated from the road route. The final fare uses the trip odometer and actual waiting time.' : 'Distance and waiting are measured after the trip; the final fare is calculated then.'}</p>
              </> : <p className="amb2-muted">Choose an available ambulance type to see its rates.</p>}
            </section>
            <section className="amb2-card">
              <h2>What happens next</h2>
              <ul className="amb2-points">
                <li>Your request goes to operators{info.search_lead_minutes ? `; the driver search starts ${info.search_lead_minutes} minutes before pickup` : ''}.</li>
                <li>The crew is given the pickup pin and the phone number you provide.</li>
                <li>Cancellation is free until the ambulance sets off.</li>
              </ul>
            </section>
          </div>
        </div>
      ) : step === 2 ? (
        <div className="amb2-booking-fields">
          <section className="amb2-card">
            <div className="amb2-card-head">
              <div><h2>Patient details</h2><p>Who is travelling and how the crew can reach you.</p></div>
              <span className="amb2-step-tag">3</span>
            </div>
            <PatientChoice value={f.forWho} onChange={forWho => set({ forWho })} phone={f.phone} onPhone={phone => set({ phone })} onName={name => set({ name })} />

            <h3>How will the patient travel?</h3>
            <div className="choices">
              {MOBILITY.map(item => (
                <button key={item.code} type="button" className={`choice fill ${f.mobility === item.code ? 'selected' : ''}`} aria-pressed={f.mobility === item.code} onClick={() => set({ mobility: item.code })}>{item.label}</button>
              ))}
            </div>

            <div className="amb2-two-fields">
              <label className="field">Attendants
                <ThemedSelect aria-label="Attendants" value={f.attendants} onChange={event => set({ attendants: event.target.value })}>
                  {['0', '1', '2', '3', '4'].map(value => <option key={value} value={value}>{value}</option>)}
                </ThemedSelect>
              </label>
              <div className="amb2-field-note"><Info aria-hidden="true" />The operator uses this to send the right vehicle and crew.</div>
            </div>

            <label className="field">Medical notes or anything the crew should know
              <textarea aria-label="Medical notes" maxLength={300} value={f.notes} onChange={event => set({ notes: event.target.value })} placeholder="e.g. On oxygen 2 L/min, diabetic, needs help transferring" />
              <small>{f.notes.length}/300 · Shared only with the operator and crew for this trip.</small>
            </label>

            <div className="amb2-upload">
              <FileText aria-hidden="true" />
              <p>Attach a discharge summary or referral (optional)</p>
              <input type="file" aria-label="Attach a medical document" accept="application/pdf,image/jpeg,image/png" onChange={event => {
                const chosen = event.target.files?.[0] || null;
                const invalid = validateAmbulanceFile(chosen);
                setError(invalid);
                setFile(invalid ? null : chosen);
                if (!chosen) setConsent(false);
                if (invalid) event.target.value = '';
              }} />
              <small>PDF, JPG or PNG up to 10 MB.</small>
            </div>
            {file && <>
              <div className="amb2-file"><span>{file.name}</span><button type="button" className="amb2-link" onClick={() => { setFile(null); setConsent(false); }}>Remove</button></div>
              <label className="amb2-consent"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} /> I consent to share this document with the ambulance operator and crew for this trip.</label>
            </>}
          </section>

          <aside className="amb2-stack amb2-booking-side">
            <section className="amb2-card">
              <h2>What happens next</h2>
              <ul className="amb2-points">
                <li>The crew calls the number you provide before arriving.</li>
                <li>Nobody else can see the document; it is shared only with this operator and crew.</li>
                <li>The final fare is calculated after the trip from the odometer and waiting time.</li>
              </ul>
            </section>
            <section className="amb2-route-card">
              <b>Final fare</b>
              <p>{pricing ? `${rupees(pricing.base_fare)} covers the first ${pricing.included_km} km, then ${rupees(pricing.per_km)}/km and ${rupees(pricing.waiting_per_15_min)} per 15 min of waiting.` : 'Choose an ambulance type to see its rates.'}</p>
              <p className="amb2-muted">{est !== null
                ? `The road route is ≈ ${km} km${minutes != null ? ` · ${minutes} min` : ''}, so the estimate is ${rupees(est)}. The final fare uses the trip odometer and actual waiting time.`
                : 'No final total is shown before the trip because the distance and waiting are not known yet.'}</p>
            </section>
          </aside>
        </div>
      ) : (
        <div className="amb2-review-grid">
          <section className="amb2-card">
            <div className="amb2-card-head"><div><h2>Trip summary</h2><p>{transferLabel}</p></div><button type="button" className="amb2-link" onClick={() => setStep(0)}>Edit</button></div>
            <dl className="amb2-summary-list">
              <div className="amb2-summary-item"><dt>Pickup</dt><dd>{f.pickup.trim()}</dd></div>
              <div className="amb2-summary-item"><dt>Drop</dt><dd>{f.drop.trim()}</dd></div>
              {km !== undefined && <div className="amb2-summary-item"><dt>Distance</dt><dd>≈ {km} km{minutes != null ? ` · ${minutes} min` : ''}</dd></div>}
              <div className="amb2-summary-item"><dt>Ambulance</dt><dd>{VEHICLE_CHOICES.find(([code]) => code === f.type)?.[1] || f.type}</dd></div>
              <div className="amb2-summary-item"><dt>Scheduled</dt><dd>{new Date(f.when).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</dd></div>
              <div className="amb2-summary-item"><dt>Travel mode</dt><dd>{MOBILITY.find(item => item.code === f.mobility)?.label || f.mobility}</dd></div>
              <div className="amb2-summary-item"><dt>Attendants</dt><dd>{f.attendants}</dd></div>
            </dl>
          </section>

          <section className="amb2-card">
            <div className="amb2-card-head"><div><h2>Patient details</h2><p>{operator?.name || 'Operator assigned after booking'}</p></div><button type="button" className="amb2-link" onClick={() => setStep(2)}>Edit</button></div>
            <DetailRows rows={[
              ['Patient', f.name || null],
              ['Phone', f.phone || null],
              ['Travel mode', MOBILITY.find(item => item.code === f.mobility)?.label],
              ['Attendants', f.attendants],
              ['Notes', f.notes.trim() || null],
              ['Document', file?.name || null],
            ]} />
            <p className="amb2-field-note"><ShieldCheck size={14} aria-hidden="true" />Only the assigned operator and crew see the patient details and any document.</p>
          </section>

          <div className="amb2-stack">
            <section className="amb2-card amb2-fare-card">
              <h2>Fare breakdown (estimate)</h2>
              {pricing ? <>
                <div className="amb2-fare-line"><span>Base fare (first {pricing.included_km} km)</span><b>{rupees(pricing.base_fare)}</b></div>
                <div className="amb2-fare-line"><span>Additional distance{extraKm !== null ? ` (${extraKm} km × ${rupees(pricing.per_km)})` : ''}</span><b>{extraKm !== null ? rupees(extraKm * pricing.per_km) : 'Measured after the trip'}</b></div>
                <div className="amb2-fare-line"><span>Waiting (if any)</span><b>{rupees(pricing.waiting_per_15_min)} per 15 min</b></div>
                <div className="amb2-fare-total"><span>{est !== null ? 'Estimated fare ≈' : 'Base fare'}</span><b>{rupees(est ?? pricing.base_fare)}</b></div>
                <p className="amb2-fare-note">{est !== null
                  ? <>Estimated fare ≈ {rupees(est)} ({rupees(pricing.base_fare)} base{extraKm ? ` + ${rupees(pricing.per_km)}/km × ${extraKm} km beyond ${pricing.included_km} km` : `; the first ${pricing.included_km} km are included`}); final fare after the trip.</>
                  : 'The final fare will be calculated after the trip from the actual distance, waiting time and any night charge.'}</p>
                {!manual && quote && <p className="amb2-muted">{termsText(quote.cancellation_terms)}</p>}
                {!manual && quote?.terms?.length ? <p className="amb2-muted">{quote.terms[0]}</p> : null}
              </> : <p className="amb2-muted">Rates are not available for the selected vehicle. Go back and choose an available type.</p>}
            </section>

            <section className="amb2-card">
              <h2>Payment method</h2>
              <div className="amb2-pay-options">
                <label className="amb2-pay is-selected">
                  <input type="radio" name="amb2-payment" checked readOnly />
                  <span><b>Pay after the trip</b><small>Pay the final fare to the crew after the trip, at the rate shown above.</small></span>
                </label>
                <label className="amb2-pay is-disabled">
                  <input type="radio" name="amb2-payment" disabled />
                  <span><b>Pay online after the trip <span className="amb2-pay-tag">After trip</span></b><small>Online payment opens from the completed trip once the final fare is known.</small></span>
                </label>
              </div>
              <div className="amb2-review-note"><ShieldCheck size={16} aria-hidden="true" />An operator accepts and assigns a vehicle and crew. You will be notified with the trip details as soon as they are assigned.</div>
              {!pricing && <p className="amb2-field-note" id="amb2-review-why">Choose an available ambulance type before confirming.</p>}
            </section>
          </div>
        </div>
      )}

      <ErrorNote error={error} />
      <div className="amb2-footer">
        <div className="amb2-footer-fare">
          {step === 0
            ? <span className="amb2-footer-note"><Info size={13} aria-hidden="true" />Ambulance types and fares are shown in the next step.</span>
            : <>
              <small>{pricing ? 'Estimated fare' : 'Fare'}</small>
              <b>{est !== null ? rupees(est) : pricing ? rupees(pricing.base_fare) : 'Select a type'}</b>
              <span className="amb2-hint"><Info size={12} aria-hidden="true" />{pricing ? (est !== null ? 'Final fare after the trip' : 'Base rate; final fare after the trip') : 'Choose an ambulance type'}</span>
            </>}
        </div>
        <div className="amb2-footer-actions">
          {step > 0 && <button type="button" className="amb2-btn amb2-btn--ghost" onClick={() => { setError(null); setStep(current => current - 1); scrollTop(); }} disabled={busy}><ChevronLeft size={15} aria-hidden="true" />Back</button>}
          <button
            type="button"
            className="amb2-btn"
            onClick={step === 3 ? submit : next}
            disabled={step === 3 ? busy || !pricing : continueBlocked}
            aria-describedby={step === 3 ? (!pricing ? 'amb2-review-why' : undefined) : (continueBlocked ? 'amb2-continue-why' : undefined)}
          >
            {step === 3 ? (busy ? 'Booking…' : created ? 'Retry document upload' : 'Confirm booking') : step === 2 ? 'Review & pay' : 'Continue'}<ArrowRight size={15} aria-hidden="true" />
          </button>
        </div>
      </div>
      {step < 3 && continueBlocked && <p id="amb2-continue-why" className="amb2-actions-note">Choose an available ambulance type{manual ? ' and one of the operator’s vehicle types' : ''} to continue.</p>}
    </div>
  );
}

function ManualOperatorPicker({ operators, error, onRetry, operator, type, onOperator, onType }: {
  operators: AmbulanceOperator[] | null;
  error: string | null;
  onRetry: () => void;
  operator: string;
  type: string;
  onOperator: (id: string) => void;
  onType: (type: string) => void;
}) {
  if (error) return <StateCard title="Operators could not be loaded" text={error} onRetry={onRetry} />;
  if (operators === null) return <LoadingBlock rows={2} label="Loading ambulance operators…" />;
  if (operators.length === 0) return <StateCard title="No operators are listed" text="No ambulance operator is available right now. Contact support for help arranging transport." action={<Link className="amb2-btn amb2-btn--outline amb2-btn--sm" to="/help">Contact support</Link>} />;
  return (
    <div className="amb2-operators">
      <p className="amb2-muted">Vizito does not dispatch this trip. Choose an operator, then one of their vehicle types and rates.</p>
      {operators.map(row => {
        const selected = row.partner_id === operator;
        return (
          <div key={row.partner_id} className={`amb2-operator-card ${selected ? 'is-selected' : ''}`}>
            <label className="amb2-operator">
              <input type="radio" name="amb2-operator" checked={selected} onChange={() => onOperator(row.partner_id)} />
              <span><b>{row.name}</b><small>{row.phone || 'Phone not provided'} · {row.vehicle_types.length} vehicle type{row.vehicle_types.length === 1 ? '' : 's'}</small></span>
            </label>
            {selected && <div className="amb2-operator-rates">
              {row.vehicle_types.length === 0 && <p className="amb2-muted">This operator has no vehicle types listed.</p>}
              {row.vehicle_types.map(vehicle => (
                <button key={vehicle.vehicle_type} type="button" className={`amb2-operator-rate ${type === vehicle.vehicle_type ? 'is-selected' : ''}`} aria-pressed={type === vehicle.vehicle_type} onClick={() => onType(vehicle.vehicle_type)}>
                  <span>
                    <b>{vehicle.vehicle_type_label}</b>
                    <small>{ratesText(vehicle)}</small>
                    {vehicle.equipment.length > 0 && <span className="amb2-equipment">{vehicle.equipment.slice(0, 4).map(item => <span key={item}>{item.replaceAll('_', ' ').toLowerCase()}</span>)}</span>}
                  </span>
                  <b>{rupees(vehicle.base_fare)}</b>
                </button>
              ))}
            </div>}
          </div>
        );
      })}
    </div>
  );
}
