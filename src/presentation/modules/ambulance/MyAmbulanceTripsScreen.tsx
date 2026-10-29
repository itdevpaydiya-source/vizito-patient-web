import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Ambulance, ArrowRight, Check, CheckCircle2, Clock3, Download, PhoneCall, Plus, Share2, Star, Users, X } from 'lucide-react';
import MediaImage from '../../components/MediaImage';
import VizitoDialog from '../../components/dialogs/VizitoDialog';
import VizitoPagination from '../../components/navigation/VizitoPagination';
import TransferNoteSection from './TransferNoteSection';
import TripTrackingMap from './TripTrackingMap';
import { payOnline, PaymentCancelled, type PaidOnline } from '../../../services/razorpayCheckout';
import {
  ambulanceError, cancelScheduledApi, cancelTripApi, myScheduledApi, myTripApi, myTripsPageApi, newIdempotencyKey,
  payTripApi, rateTripApi, ratesText, rupees, scheduledNoteApi, shareScheduledNoteApi, tripReceiptApi, validateAmbulanceFile,
  type DriverLocation, type MyTrip, type ScheduledBooking, type TripReceipt, type TransferNote,
} from '../../../services/ambulanceHelper';
import { dateText } from './JourneyParts';
import { destinationAddress, timelineTime, trackingSubtitle, trackingTitle } from './TrackingDetails';
import {
  AmbCrumb, DetailRows, ErrorNote, LoadingBlock, OperatorRating, StateCard, StatusPill, VehicleThumb,
  completedAt, kmText, paymentText,
} from './AmbulanceV2Parts';

const CLOSED = ['COMPLETED', 'CANCELLED', 'DECLINED', 'EXPIRED'];
const CANCELLED = ['CANCELLED', 'DECLINED', 'EXPIRED'];
const RATING_TAGS = ['Ambulance time', 'Cleanliness', 'Crew behaviour', 'Good communication', 'Fair price'];

export default function MyAmbulanceTripsScreen() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('tripsPage')) || 1);
  const pageSize = params.get('tripsPageSize') === '20' ? 20 as const : 10 as const;
  const open = params.get('open');
  const [rows, setRows] = useState<MyTrip[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    myTripsPageApi({ page, page_size: pageSize })
      .then(result => { setRows(result.items); setTotal(result.total); setError(null); })
      .catch(e => setError(ambulanceError(e, 'Could not load your ambulance trips.')));
  }, [page, pageSize]);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 15000);
    return () => window.clearInterval(timer);
  }, [load]);

  const setPage = (value: number) => setParams(current => {
    const next = new URLSearchParams(current);
    if (value === 1) next.delete('tripsPage'); else next.set('tripsPage', String(value));
    return next;
  });
  const setPageSize = (value: 10 | 20) => setParams(current => {
    const next = new URLSearchParams(current);
    next.set('tripsPageSize', String(value));
    next.delete('tripsPage');
    return next;
  });

  if (open) {
    return (
      <div className="amb2 aj">
        <AmbCrumb label="Trip details" />
        <TripDetails key={open} id={open} onChanged={load} />
      </div>
    );
  }

  return (
    <div className="amb2 aj">
      <AmbCrumb label="My trips" />
      <div className="amb2-page-head">
        <div>
          <h1>My ambulance trips</h1>
          <p>Every ambulance request and trip on your account. Open a trip for live status, the receipt or to rate it.</p>
        </div>
        <Link className="amb2-btn" to="/book-ambulance"><Plus size={16} aria-hidden="true" />Book an ambulance</Link>
      </div>

      <AwaitingDriver highlight={params.get('scheduled')} />

      <section className="amb2-card amb2-trips" aria-labelledby="amb2-trip-history">
        <div className="amb2-card-head">
          <div>
            <h2 id="amb2-trip-history">Trip history</h2>
            <p>{total > 0 ? `${total} trip${total === 1 ? '' : 's'}` : 'Requests and completed trips appear here.'}</p>
          </div>
        </div>

        {rows === null && !error
          ? <LoadingBlock rows={4} label="Loading your ambulance trips…" />
          : error
            ? <StateCard title="Your trips could not be loaded" text={error} onRetry={load} />
            : rows && rows.length === 0
              ? <StateCard title="No ambulance trips yet" text="Book a planned transfer or request an urgent ambulance; the trip and its receipt will appear here." action={<Link className="amb2-btn amb2-btn--outline amb2-btn--sm" to="/book-ambulance?transfer=DISCHARGE">Book an ambulance</Link>} />
              : <>
                <div className="amb2-trip-head" aria-hidden="true">
                  <span>Date &amp; time</span><span>Route</span><span>Status</span><span>Ambulance</span><span>Fare</span><span />
                </div>
                {rows!.map(trip => (
                  <Link className="amb2-trip-row" key={trip.id} to={`/ambulance-trips?open=${encodeURIComponent(trip.id)}`}>
                    <span className="amb2-trip-when"><b>{dateText(trip.scheduled_at)}</b><small>{trip.trip_number}</small></span>
                    <span className="amb2-trip-route">
                      <b><Ambulance size={13} aria-hidden="true" /><span>{trip.pickup_address}</span></b>
                      <small><ArrowRight size={12} aria-hidden="true" /><span>{destinationAddress(trip.drop_address)}</span></small>
                    </span>
                    <span><StatusPill status={trip.status} label={trip.status_label} /></span>
                    <span className="amb2-trip-service">{trip.vehicle_type_label}{trip.is_urgent && <small>Emergency</small>}</span>
                    <span className="amb2-trip-fare">
                      {CANCELLED.includes(trip.status)
                        ? '—'
                        : trip.final_fare !== null && trip.final_fare !== undefined
                          ? rupees(trip.final_fare)
                          : trip.estimated_fare !== null && trip.estimated_fare !== undefined
                            ? `${rupees(trip.estimated_fare)} est.`
                            : 'After trip'}
                    </span>
                    <span className="amb2-trip-action">View details<ArrowRight size={13} aria-hidden="true" /></span>
                  </Link>
                ))}
                <VizitoPagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={setPageSize} label="ambulance trips" />
              </>}
      </section>
    </div>
  );
}

function TripDetails({ id, onChanged }: { id: string; onChanged: () => void }) {
  const [trip, setTrip] = useState<MyTrip | null>(null);
  const [location, setLocation] = useState<DriverLocation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    myTripApi(id)
      .then(result => { setTrip(result); setError(null); })
      .catch(e => setError(ambulanceError(e, 'Could not load this ambulance trip.')));
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!trip || CLOSED.includes(trip.status)) return;
    const timer = window.setInterval(load, 5000);
    return () => window.clearInterval(timer);
  }, [load, trip?.status]);

  const handleLocation = useCallback((next: DriverLocation | null) => setLocation(next), []);
  const changed = useCallback(() => { load(); onChanged(); }, [load, onChanged]);

  if (!trip) {
    return (
      <section className="amb2-card">
        {error
          ? <StateCard title="This trip could not be loaded" text={error} onRetry={load} action={<Link className="amb2-link" to="/ambulance-trips">Back to my trips</Link>} />
          : <LoadingBlock rows={5} label="Loading trip details…" />}
      </section>
    );
  }

  if (trip.status === 'COMPLETED') return <CompletedTrip trip={trip} onChanged={changed} error={error} />;
  if (CANCELLED.includes(trip.status)) return <CancelledTrip trip={trip} />;
  return <LiveTrip trip={trip} location={location} onLocation={handleLocation} onChanged={changed} error={error} />;
}

function TripFacts({ trip }: { trip: MyTrip }) {
  const drop = destinationAddress(trip.drop_address);
  return (
    <DetailRows rows={[
      ['Trip ID', trip.trip_number],
      ['Service', trip.is_urgent ? 'Emergency' : trip.transfer_type_label || 'Scheduled transfer'],
      ['Pickup', trip.pickup_address],
      ['Drop', drop === 'Not specified' ? null : drop],
      ['Distance', trip.actual_km !== null && trip.actual_km !== undefined ? kmText(trip.actual_km) : trip.estimated_km !== null && trip.estimated_km !== undefined ? `${kmText(trip.estimated_km)} (estimate)` : null],
      ['Waiting', trip.waiting_minutes !== null && trip.waiting_minutes !== undefined ? `${trip.waiting_minutes} min` : null],
      ['Ambulance', trip.vehicle_type_label],
      ['Vehicle', [trip.vehicle_model, trip.vehicle_registration].filter(Boolean).join(' · ') || null],
      ['Patient', trip.patient_name],
      ['Driver', trip.driver_name],
      ['Scheduled', dateText(trip.scheduled_at)],
    ]} />
  );
}

function CrewList({ crew }: { crew: MyTrip['crew'] }) {
  if (!crew?.length) return null;
  return (
    <ul>
      {crew.map((member, index) => (
        <li key={`${member.name}-${index}`}>
          <Users size={13} aria-hidden="true" />
          <b>{member.name}</b>
          <small>{[member.role, member.qualification].filter(Boolean).join(' · ')}</small>
        </li>
      ))}
    </ul>
  );
}

function LiveTrip({ trip, location, onLocation, onChanged, error }: {
  trip: MyTrip;
  location: DriverLocation | null;
  onLocation: (location: DriverLocation | null) => void;
  onChanged: () => void;
  error: string | null;
}) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const events = trip.timeline || [];
  const milestones: [string, string][] = [['REQUESTED', 'Requested'], ['ASSIGNED', 'Driver assigned'], ['EN_ROUTE', 'On the way'], ['AT_PICKUP', 'Arrived'], ['ON_BOARD', 'On board'], ['COMPLETED', 'Completed']];
  const times = milestones.map(([code]) => events.find(event => event.status === code)?.at);
  let current = times.reduce((last, at, index) => (at ? index : last), -1);
  if (current < 0) current = 0;
  const route = location?.state === 'LIVE' && location.route?.available ? location.route : null;
  const cancelReason = trip.cancel_unavailable_reason || 'Cancellation is not available for this trip. Contact support for help.';

  const share = async () => {
    const url = `${window.location.origin}/ambulance-trips?open=${encodeURIComponent(trip.id)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Ambulance trip ${trip.trip_number}`, text: 'Follow this ambulance trip in Vizito.', url });
        setShareMsg('Trip link shared.');
      } else {
        await navigator.clipboard.writeText(url);
        setShareMsg('Trip link copied.');
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setShareMsg('Could not share the link. Copy the address from your browser.');
    }
  };

  const cancel = async () => {
    if (!reason.trim()) { setActionError('Add a short reason to cancel.'); return; }
    setBusy(true);
    setActionError(null);
    try {
      await cancelTripApi(trip.id, reason.trim());
      setCancelOpen(false);
      onChanged();
    } catch (e) {
      setActionError(ambulanceError(e, 'Could not cancel this trip.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="amb2-stack">
      <ol className="amb2-milestones" aria-label="Trip progress">
        {milestones.map(([code, label], index) => (
          <li key={code} className={`amb2-milestone ${index < current ? 'done' : index === current ? 'current' : ''}`} aria-current={index === current ? 'step' : undefined}>
            <span className="amb2-milestone-dot">{index < current ? <Check size={13} aria-hidden="true" /> : <span>{index + 1}</span>}</span>
            <b>{label}</b>
            <time dateTime={times[index]}>{times[index] ? timelineTime(times[index]!) : '—'}</time>
          </li>
        ))}
      </ol>

      <div className="amb2-tracking-grid">
        <section className="amb2-card amb2-track-card" aria-labelledby="amb2-live-title">
          <div className="amb2-track-head">
            <div>
              <StatusPill status={trip.status} label={trip.status_label} />
              <h1 id="amb2-live-title">{trackingTitle(trip.status, trip.status_label)}</h1>
              <p>{trackingSubtitle(trip.status)}</p>
              {trip.status_reason && <p className="amb2-muted">{trip.status_reason}</p>}
            </div>
            {route?.eta_minutes !== null && route?.eta_minutes !== undefined && (
              <div className="amb2-eta"><small>ETA</small><b>{route.eta_minutes} min</b></div>
            )}
          </div>

          <div className="amb2-map-wrap">
            <TripTrackingMap tripId={trip.id} onLocation={onLocation} showEta={false} />
          </div>

          <div className="amb2-driver-card">
            <div className="amb2-driver-row">
              <MediaImage name={trip.driver_name || 'Driver'} kind="professional" />
              <div className="amb2-driver-copy">
                <b>{trip.driver_name || 'Awaiting driver assignment'}</b>
                <small>{trip.driver_name ? 'Your assigned driver' : 'Driver details appear once a vehicle is assigned.'}</small>
              </div>
              {trip.driver_name && trip.operator.phone && <a className="amb2-btn amb2-btn--ghost amb2-btn--sm" href={`tel:${trip.operator.phone}`} aria-label="Call the operator to reach the driver"><PhoneCall size={14} aria-hidden="true" />Call</a>}
            </div>
            <div className="amb2-vehicle-row">
              <VehicleThumb />
              <div className="amb2-vehicle-copy">
                <b>{trip.vehicle_model || trip.vehicle_type_label}</b>
                <p>{trip.vehicle_registration || 'Registration appears once assigned.'}</p>
                <div className="amb2-chip-row"><span>{trip.vehicle_type_label}</span>{trip.operator.name && <span>{trip.operator.name}</span>}</div>
                {!!trip.equipment?.length && <div className="amb2-equipment">{trip.equipment.slice(0, 6).map(item => <span key={item}>{item.replaceAll('_', ' ').toLowerCase()}</span>)}</div>}
                <small>Representative image</small>
              </div>
            </div>
            {!!trip.crew?.length && <div className="amb2-crew"><h3>Crew</h3><CrewList crew={trip.crew} /></div>}
          </div>

          <div className="amb2-actions-row amb2-live-actions">
            <button type="button" className="amb2-btn amb2-btn--ghost" onClick={share}><Share2 size={15} aria-hidden="true" />Share trip link</button>
            {trip.operator.phone && <a className="amb2-btn amb2-btn--ghost" href={`tel:${trip.operator.phone}`}><PhoneCall size={15} aria-hidden="true" />Call operator</a>}
            <button type="button" className="amb2-btn amb2-btn--danger" disabled={!trip.can_cancel || busy} aria-describedby={!trip.can_cancel ? `amb2-cancel-why-${trip.id}` : undefined} onClick={() => setCancelOpen(true)}>Cancel booking</button>
          </div>
          {shareMsg && <p role="status" className="amb2-share-status">{shareMsg}</p>}
          {!trip.can_cancel && <p id={`amb2-cancel-why-${trip.id}`} className="amb2-actions-note">{cancelReason}</p>}
          <ErrorNote error={actionError} />
        </section>

        <div className="amb2-stack">
          <section className="amb2-card">
            <div className="amb2-card-head">
              <div><h2>Trip details</h2><p>{trip.operator.name || 'Operator not recorded'}</p></div>
              <OperatorRating rating={trip.operator.rating} reviewCount={trip.operator.review_count} />
            </div>
            <TripFacts trip={trip} />
          </section>

          <section className="amb2-card">
            <h2>Crew</h2>
            {trip.crew?.length ? <div className="amb2-crew amb2-crew--plain"><CrewList crew={trip.crew} /></div> : <p className="amb2-muted">Crew details appear once the vehicle is assigned.</p>}
          </section>

          <section className="amb2-card">
            <h2>Payment</h2>
            <div className="amb2-payment-state"><span>Status</span><StatusPill status={trip.payment_status} label={paymentText(trip.payment_status)} /></div>
            <p className="amb2-muted">{trip.final_fare !== null && trip.final_fare !== undefined ? `Final fare ${rupees(trip.final_fare)}.` : 'The final fare is calculated after the trip from the actual distance and waiting time.'}</p>
            {trip.can_pay_online && <PayOnline trip={trip} onPaid={onChanged} />}
          </section>

          <TransferNoteSection tripId={trip.id} editable={!CLOSED.includes(trip.status)} />

          <section className="amb2-card">
            <h2>Need help?</h2>
            <p className="amb2-muted">Call the operator for updates on the ambulance, or contact Vizito support about the booking.</p>
            <div className="amb2-actions-row">
              {trip.operator.phone && <a className="amb2-btn amb2-btn--ghost" href={`tel:${trip.operator.phone}`}><PhoneCall size={15} aria-hidden="true" />Call operator</a>}
              <Link className="amb2-btn amb2-btn--ghost" to="/help">Contact support</Link>
            </div>
          </section>

          <ErrorNote error={error} onRetry={onChanged} />
        </div>
      </div>

      {cancelOpen && (
        <VizitoDialog
          title="Cancel this trip"
          onClose={() => { if (!busy) setCancelOpen(false); }}
          footer={<>
            <button type="button" className="amb2-btn amb2-btn--ghost" onClick={() => setCancelOpen(false)} disabled={busy}>Keep trip</button>
            <button type="button" className="amb2-btn amb2-btn--danger" onClick={cancel} disabled={busy || !reason.trim()}>{busy ? 'Cancelling…' : 'Confirm cancellation'}</button>
          </>}
        >
          <p>This tells the operator to stop the ambulance. {trip.cancellation_terms?.summary || 'Cancellation terms apply to this trip.'}</p>
          <label className="field">Reason for cancelling
            <textarea aria-label="Reason for cancelling" maxLength={300} value={reason} onChange={event => setReason(event.target.value)} />
          </label>
          {!reason.trim() && <p className="amb2-muted">Add a short reason to confirm the cancellation.</p>}
          <ErrorNote error={actionError} />
        </VizitoDialog>
      )}
    </div>
  );
}

function CancelledTrip({ trip }: { trip: MyTrip }) {
  return (
    <div className="amb2-stack">
      <section className="amb2-card">
        <StateCard
          title={trip.status_label || 'Trip cancelled'}
          text={trip.status_reason || 'This ambulance trip was cancelled. No ambulance is coming for it.'}
          action={<Link className="amb2-btn" to="/book-ambulance">Book an ambulance</Link>}
        />
      </section>
      <section className="amb2-card">
        <div className="amb2-card-head"><div><h2>Trip details</h2><p>{trip.operator.name || 'Operator not recorded'}</p></div><StatusPill status={trip.status} label={trip.status_label} /></div>
        <TripFacts trip={trip} />
      </section>
    </div>
  );
}

function CompletedTrip({ trip, onChanged, error }: { trip: MyTrip; onChanged: () => void; error: string | null }) {
  const [receipt, setReceipt] = useState<TripReceipt | null>(null);
  const [receiptBusy, setReceiptBusy] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const breakdown = trip.fare_breakdown;
  const finished = completedAt(trip);
  const total = breakdown?.total ?? trip.final_fare;

  const loadReceipt = async () => {
    setReceiptBusy(true);
    setReceiptError(null);
    try { setReceipt(await tripReceiptApi(trip.id)); }
    catch (e) { setReceiptError(ambulanceError(e, 'Could not load the receipt.')); }
    finally { setReceiptBusy(false); }
  };
  const downloadReceipt = async () => {
    setReceiptBusy(true);
    setReceiptError(null);
    try {
      const data = receipt || await tripReceiptApi(trip.id);
      setReceipt(data);
      saveReceipt(data);
    } catch (e) {
      setReceiptError(ambulanceError(e, 'Could not download the receipt.'));
    } finally {
      setReceiptBusy(false);
    }
  };

  return (
    <div className="amb2-stack">
      <div className="amb2-success">
        <span className="amb2-success-icon"><CheckCircle2 aria-hidden="true" /></span>
        <div>
          <h1>Trip completed</h1>
          <p>{dateText(finished)} · {trip.trip_number}</p>
        </div>
        <StatusPill status={trip.status} label={trip.status_label} />
      </div>

      <div className="amb2-completed-grid">
        <section className="amb2-card" aria-labelledby="amb2-completed-details">
          <div className="amb2-card-head">
            <div><h2 id="amb2-completed-details">Trip details</h2><p>{trip.operator.name || 'Operator not recorded'}</p></div>
            <OperatorRating rating={trip.operator.rating} reviewCount={trip.operator.review_count} />
          </div>
          <TripFacts trip={trip} />
          <div className="amb2-detail-section">
            <h3>Crew</h3>
            {trip.crew?.length ? <div className="amb2-crew amb2-crew--plain"><CrewList crew={trip.crew} /></div> : <p className="amb2-muted">No crew details were recorded for this trip.</p>}
          </div>
          {!!trip.equipment?.length && (
            <div className="amb2-detail-section">
              <h3>Equipment on board</h3>
              <div className="amb2-equipment">{trip.equipment.map(item => <span key={item}>{item.replaceAll('_', ' ').toLowerCase()}</span>)}</div>
            </div>
          )}
          <div className="amb2-detail-section">
            <TransferNoteSection tripId={trip.id} editable={false} />
          </div>
        </section>

        <div className="amb2-stack">
          <section className="amb2-card amb2-fare-card" aria-labelledby="amb2-fare-title">
            <h2 id="amb2-fare-title">Fare details</h2>
            {breakdown ? <>
              <div className="amb2-fare-line"><span>Base fare (first {breakdown.included_km} km)</span><b>{rupees(breakdown.base)}</b></div>
              <div className="amb2-fare-line"><span>Additional distance ({breakdown.extra_km} km × {rupees(breakdown.per_km)})</span><b>{rupees(breakdown.distance_charge)}</b></div>
              <div className="amb2-fare-line"><span>Waiting ({breakdown.waiting_minutes} min)</span><b>{rupees(breakdown.waiting_charge)}</b></div>
              {breakdown.night_charge > 0 && <div className="amb2-fare-line"><span>Night charge</span><b>{rupees(breakdown.night_charge)}</b></div>}
              <div className="amb2-fare-total"><span>Total fare</span><b>{rupees(total)}</b></div>
              {breakdown.note && <p className="amb2-fare-note">{breakdown.note}</p>}
            </> : <div className="amb2-fare-total"><span>Total fare</span><b>{total !== null && total !== undefined ? rupees(total) : 'Not recorded'}</b></div>}

            <div className="amb2-payment-state">
              <span>Payment status</span>
              <StatusPill status={trip.payment_status} label={paymentText(trip.payment_status)} />
            </div>
            {trip.payment_status === 'UNPAID' && !trip.can_pay_online && <p className="amb2-muted">The operator will collect the final fare. Keep this trip open for the receipt.</p>}
            {trip.payment_status === 'CASH_RECORDED' && <p className="amb2-muted">The final fare was recorded as paid in cash.</p>}
            {trip.payment_status === 'PAID_ONLINE' && <p className="amb2-muted">The final fare was paid online.</p>}
            {trip.can_pay_online && <PayOnline trip={trip} onPaid={onChanged} />}
          </section>

          {receipt && <ReceiptPanel receipt={receipt} onClose={() => setReceipt(null)} />}
          {receiptError && <section className="amb2-card"><ErrorNote error={receiptError} onRetry={loadReceipt} /></section>}

          {trip.can_rate
            ? <RatingCard tripId={trip.id} onRated={onChanged} />
            : trip.my_rating
              ? <section className="amb2-card"><p className="amb2-rate-thanks"><Star size={17} aria-hidden="true" />You rated this trip {trip.my_rating}/5.</p></section>
              : null}

          <div className="amb2-completed-actions">
            {trip.has_receipt && <button type="button" className="amb2-btn amb2-btn--ghost" onClick={receipt ? () => setReceipt(null) : loadReceipt} disabled={receiptBusy}>{receiptBusy ? 'Loading…' : receipt ? 'Hide receipt' : 'View receipt'}</button>}
            {trip.has_receipt && <button type="button" className="amb2-btn amb2-btn--ghost" onClick={downloadReceipt} disabled={receiptBusy}><Download size={15} aria-hidden="true" />Download receipt</button>}
            <Link className="amb2-btn" to="/book-ambulance">Book again</Link>
          </div>
          <ErrorNote error={error} onRetry={onChanged} />
        </div>
      </div>
    </div>
  );
}

function ReceiptPanel({ receipt, onClose }: { receipt: TripReceipt; onClose: () => void }) {
  const drop = destinationAddress(receipt.drop_address);
  return (
    <section className="amb2-receipt" aria-label="Receipt">
      <div className="amb2-card-head">
        <div><h3>Receipt {receipt.trip_number}</h3><p>{receipt.operator || 'Operator not recorded'}</p></div>
        <button type="button" className="amb2-link" onClick={onClose} aria-label="Close receipt"><X size={15} aria-hidden="true" />Close</button>
      </div>
      <p className="amb2-muted">{receipt.vehicle_type}{receipt.vehicle_registration ? ` · ${receipt.vehicle_registration}` : ''}</p>
      <p className="amb2-muted">Pickup: {receipt.pickup_address}</p>
      {drop !== 'Not specified' && <p className="amb2-muted">Drop: {drop}</p>}
      {receipt.lines.map((line, index) => <div className="amb2-receipt-line" key={`${line.label}-${index}`}><span>{line.label}</span><b>{rupees(line.amount)}</b></div>)}
      <div className="amb2-receipt-total"><span>Total ({receipt.payment})</span><b>{rupees(receipt.total)}</b></div>
      <p className="amb2-muted">Paid {dateText(receipt.paid_at)}{receipt.refunded ? ' · Refunded' : ''}</p>
    </section>
  );
}

function RatingCard({ tripId, onRated }: { tripId: string; onRated: () => void }) {
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [review, setReview] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!rating) return;
    setBusy(true);
    setError(null);
    try {
      await rateTripApi(tripId, rating, review.trim(), tags);
      setDone(true);
      onRated();
    } catch (e) {
      setError(ambulanceError(e, 'Could not submit your rating.'));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return <section className="amb2-card"><p className="amb2-rate-thanks"><CheckCircle2 size={18} aria-hidden="true" />Thanks — your rating helps other patients choose an operator.</p></section>;
  }

  return (
    <section className="amb2-card amb2-rate-card" aria-labelledby="amb2-rate-title">
      <h2 id="amb2-rate-title">Rate this trip</h2>
      <p className="amb2-muted">Rate the operator and crew for this trip. This is separate from any driver star rating.</p>
      <div className="amb2-stars" role="group" aria-label="Trip rating">
        {[1, 2, 3, 4, 5].map(value => (
          <button key={value} type="button" className={`amb2-star ${value <= rating ? 'on' : ''}`} aria-label={`${value} star${value === 1 ? '' : 's'}`} aria-pressed={rating === value} onClick={() => setRating(value)}>
            <Star aria-hidden="true" />
          </button>
        ))}
      </div>
      <div className="amb2-tags">
        {RATING_TAGS.map(tag => (
          <button key={tag} type="button" className={`amb2-tag ${tags.includes(tag) ? 'on' : ''}`} aria-pressed={tags.includes(tag)} onClick={() => setTags(current => current.includes(tag) ? current.filter(item => item !== tag) : [...current, tag])}>{tag}</button>
        ))}
      </div>
      <textarea aria-label="Review for the operator" maxLength={500} value={review} onChange={event => setReview(event.target.value)} placeholder="What went well, or what could be better? (optional)" />
      <ErrorNote error={error} />
      <div className="amb2-rate-foot">
        <small>{rating ? `${rating} of 5 selected` : ''}</small>
        <button type="button" className="amb2-btn amb2-btn--sm" disabled={!rating || busy} aria-describedby={!rating ? 'amb2-rating-why' : undefined} onClick={submit}>{busy ? 'Submitting…' : 'Submit rating'}</button>
      </div>
      {!rating && <p id="amb2-rating-why" className="amb2-rate-why">Choose a star rating to submit.</p>}
    </section>
  );
}

function saveReceipt(receipt: TripReceipt) {
  const drop = destinationAddress(receipt.drop_address);
  const text = [
    'Vizito ambulance receipt',
    `Trip: ${receipt.trip_number}`,
    `Operator: ${receipt.operator || 'Not recorded'}${receipt.operator_phone ? ` (${receipt.operator_phone})` : ''}`,
    receipt.patient_name ? `Patient: ${receipt.patient_name}` : '',
    `Ambulance: ${receipt.vehicle_type}${receipt.vehicle_registration ? ` · ${receipt.vehicle_registration}` : ''}`,
    `Pickup: ${receipt.pickup_address}`,
    `Drop: ${drop}`,
    `Scheduled: ${dateText(receipt.scheduled_at)}`,
    receipt.completed_at ? `Completed: ${dateText(receipt.completed_at)}` : '',
    '',
    ...receipt.lines.map(line => `${line.label}: ${rupees(line.amount)}`),
    '',
    `Total: ${rupees(receipt.total)}`,
    `Payment: ${receipt.payment}${receipt.refunded ? ' (refunded)' : ''}`,
    `Paid at: ${dateText(receipt.paid_at)}`,
  ].filter(line => line !== '').join('\n');
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `vizito-receipt-${receipt.trip_number}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export function AwaitingDriver({ highlight }: { highlight: string | null }) {
  const [rows, setRows] = useState<ScheduledBooking[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cancelledNote, setCancelledNote] = useState<string | null>(null);

  const load = useCallback(() => {
    myScheduledApi()
      .then(result => { setRows(result); setError(null); })
      .catch(e => setError(ambulanceError(e, 'Could not load your scheduled ambulance requests.')));
  }, []);
  useEffect(() => { load(); const timer = window.setInterval(load, 5000); return () => window.clearInterval(timer); }, [load]);

  const shown = (rows || []).filter(row => row.status === 'OPEN' || row.status === 'UNANSWERED' || (row.id === highlight && !['CANCELLED', 'EXPIRED'].includes(row.status)));
  if (rows === null && !error) return null;
  if (error && !rows) return <section className="amb2-card"><ErrorNote error={error} onRetry={load} /></section>;
  if (!shown.length) return cancelledNote
    ? <section className="amb2-card"><p role="status" className="amb2-cancelled-note">{cancelledNote}</p></section>
    : null;

  const cancel = async (request: ScheduledBooking) => {
    setBusyId(request.id);
    setError(null);
    try {
      await cancelScheduledApi(request.id);
      setCancelledNote(`Request ${request.request_number} cancelled. No ambulance is coming for it.`);
      load();
    }
    catch (e) { setError(ambulanceError(e, 'Could not cancel this scheduled request.')); }
    finally { setBusyId(null); }
  };

  return (
    <section className="amb2-stack amb2-requests" aria-label="Scheduled ambulance requests">
      {cancelledNote && <p role="status" className="amb2-card amb2-cancelled-note">{cancelledNote}</p>}
      {shown.map(request => (
        <article className="amb2-card amb2-request" key={request.id}>
          <div className="amb2-card-head">
            <div>
              <h2>{request.request_number}</h2>
              <p>{request.transfer_type_label || 'Scheduled transfer'} · {request.vehicle_type_label || 'Ambulance type pending'}</p>
            </div>
            <StatusPill status={request.status} label={request.status_label} />
          </div>
          <p className="amb2-request-route"><b>{request.pickup_address}</b><ArrowRight size={14} aria-hidden="true" /><span>{destinationAddress(request.drop_address)}</span></p>
          <div className="amb2-chip-row"><Clock3 size={13} aria-hidden="true" /><span>{dateText(request.scheduled_at)}</span></div>
          {request.status === 'OPEN' && <p className="amb2-muted">{request.searching ? 'Awaiting driver acceptance.' : request.search_starts_at ? `Driver search starts ${dateText(request.search_starts_at)}.` : 'Awaiting driver acceptance.'} Your booking is not yet confirmed.</p>}
          {request.quote && <p className="amb2-muted">Maximum rates: {ratesText(request.quote)}</p>}
          {request.status === 'UNANSWERED' && <p role="alert" className="amb2-muted">No operator accepted this request. For an emergency, call 108.</p>}

          <div className="amb2-actions-row">
            {request.trip_id && <Link className="amb2-btn amb2-btn--outline amb2-btn--sm" to={`/ambulance-trips?open=${encodeURIComponent(request.trip_id)}`}>Open confirmed trip</Link>}
            {request.can_cancel && <button type="button" className="amb2-btn amb2-btn--danger amb2-btn--sm" disabled={busyId === request.id} onClick={() => cancel(request)}>{busyId === request.id ? 'Cancelling…' : 'Cancel request'}</button>}
            {request.status === 'UNANSWERED' && <><a className="amb2-btn amb2-btn--red amb2-btn--sm" href="tel:108">Call 108</a><Link className="amb2-btn amb2-btn--sm" to="/book-ambulance">Try another booking</Link></>}
          </div>
          {!request.can_cancel && request.status === 'OPEN' && <p className="amb2-actions-note">This request can no longer be cancelled here. Contact support for help.</p>}
          {request.status === 'OPEN' && <ScheduledDocument id={request.id} />}
        </article>
      ))}
      {error && <ErrorNote error={error} onRetry={load} />}
    </section>
  );
}

function ScheduledDocument({ id }: { id: string }) {
  const [note, setNote] = useState<TransferNote | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { scheduledNoteApi(id).then(setNote).catch(e => setError(ambulanceError(e, 'Could not load the transfer document.'))); }, [id]);

  if (note === undefined && !error) return <p className="amb2-muted" role="status">Loading transfer document…</p>;

  return (
    <section className="amb2-detail-section" aria-label="Transfer document">
      <h3>Transfer document</h3>
      {note?.has_file
        ? <p className="amb2-muted">{note.file_name || 'Document'} · shared with the operator after acceptance.</p>
        : <>
          <p className="amb2-muted">Optional. Attach a discharge summary or referral for the crew.</p>
          <input className="amb2-doc-input" type="file" aria-label="Attach transfer document" accept="application/pdf,image/jpeg,image/png" onChange={event => {
            const chosen = event.target.files?.[0] || null;
            const invalid = validateAmbulanceFile(chosen);
            setError(invalid);
            setFile(invalid ? null : chosen);
            if (invalid) event.target.value = '';
          }} />
          <label className="amb2-consent"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} /> I consent to share this with the operator and crew.</label>
          <button type="button" className="amb2-btn amb2-btn--sm" disabled={!file || !consent || busy} onClick={async () => {
            if (!file) return;
            setBusy(true);
            setError(null);
            try { setNote(await shareScheduledNoteApi(id, '', file)); setFile(null); setConsent(false); }
            catch (e) { setError(ambulanceError(e, 'Upload failed. Retry.')); }
            finally { setBusy(false); }
          }}>{busy ? 'Uploading…' : 'Upload document'}</button>
          {(!file || !consent) && <p className="amb2-actions-note">Choose a PDF, JPG or PNG and tick consent to upload.</p>}
        </>}
      <ErrorNote error={error} />
    </section>
  );
}

export function PayOnline({ trip, onPaid }: { trip: MyTrip; onPaid: (t: MyTrip) => void }) {
  // Razorpay window collects UPI / card / net banking / wallet; the server verifies the exact fare.
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [key] = useState(() => newIdempotencyKey()); // the same key on a retried click: never charged twice
  const pay = async () => {
    setBusy(true); setErr(null);
    let payment: PaidOnline;
    try { payment = await payOnline({ amount: Number(trip.final_fare), purpose: 'ambulance', description: 'Ambulance trip fare' }); }
    catch (e) { setErr(e instanceof PaymentCancelled ? e.message : `${(e as Error)?.message || 'The payment failed.'} You can try again or pay the crew.`); setBusy(false); return; }
    try { onPaid(await payTripApi(trip.id, payment, key)); }
    catch (e) { setErr(`${ambulanceError(e, 'Payment failed.')} If money was taken it will be refunded automatically.`); }
    finally { setBusy(false); }
  };
  return (
    <section aria-label="Pay online" className="amb2-pay-online">
      <p className="amb2-pay-online-title">Pay {rupees(trip.final_fare)} online</p>
      <p>UPI, card, net banking or wallet in a secure Razorpay window.</p>
      {err && <p role="alert" className="amb2-pay-error">{err}</p>}
      <button type="button" className="amb2-btn" disabled={busy} onClick={pay}>{busy ? 'Waiting for payment…' : `Pay ${rupees(trip.final_fare)}`}</button>
    </section>
  );
}
