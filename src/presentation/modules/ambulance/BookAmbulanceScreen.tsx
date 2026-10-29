import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Ambulance, CalendarDays, ChevronRight, PhoneCall, ShieldCheck, Zap } from 'lucide-react';
import LocationBar from '../../components/location/LocationBar';
import VizitoDialog from '../../components/dialogs/VizitoDialog';
import { ambulanceError, myTripsApi, scheduledAvailableApi, TRANSFER_CHOICES, rupees, type MyTrip, type ScheduledAvailability } from '../../../services/ambulanceHelper';
import { useSearchArea } from '../../../services/location';
import ScheduledBookingForm from './ScheduledBookingForm';
import { dateText } from './JourneyParts';
import { destinationAddress } from './TrackingDetails';
import { ActionCard, AmbCrumb, Call108, CtaButton, CtaLink, ErrorNote, Kicker, LoadingBlock, StateCard, StatusPill, AMB_HERO_IMAGE } from './AmbulanceV2Parts';

export default function BookAmbulanceScreen() {
  const [params, setParams] = useSearchParams();
  const transfer = params.get('transfer');
  const [trips, setTrips] = useState<MyTrip[] | null>(null);
  const [tripsError, setTripsError] = useState<string | null>(null);
  const [info, setInfo] = useState<ScheduledAvailability | null>(null);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [eventOpen, setEventOpen] = useState(false);
  const area = useSearchArea();

  const loadTrips = useCallback(() => {
    setTripsError(null);
    myTripsApi().then(setTrips).catch(error => setTripsError(ambulanceError(error, 'Could not load your ambulance trips.')));
  }, []);
  const loadInfo = useCallback(() => {
    setInfoError(null);
    scheduledAvailableApi().then(setInfo).catch(error => setInfoError(ambulanceError(error, 'Could not check whether scheduled booking is open.')));
  }, []);
  useEffect(() => { loadInfo(); if (!transfer) loadTrips(); }, [loadTrips, loadInfo, transfer]);

  if (transfer) {
    return (
      <div className="amb2 aj">
        <AmbCrumb label="Book ambulance" />
        {info
          ? <ScheduledBookingForm info={info} transferType={TRANSFER_CHOICES.some(([code]) => code === transfer) ? transfer : 'DISCHARGE'} />
          : infoError            ? <section className="amb2-card"><StateCard title="Booking could not be opened" text={infoError} onRetry={loadInfo} action={<button type="button" className="amb2-link" onClick={() => setParams(p => { const next = new URLSearchParams(p); next.delete('transfer'); return next; })}>Back to ambulance home</button>} /></section>
            : <section className="amb2-card"><LoadingBlock rows={3} label="Checking scheduled booking…" /></section>}
      </div>
    );
  }

  const family = params.get('family_member_id');
  const urgentTo = family ? `/urgent-ambulance?family_member_id=${encodeURIComponent(family)}` : '/urgent-ambulance';

  return (
    <div className="amb2 aj">
      <AmbCrumb />

      <div className="amb2-alert" role="region" aria-label="Medical emergency">
        <span className="amb2-alert-icon"><PhoneCall aria-hidden="true" /></span>
        <div className="amb2-alert-copy">
          <b>Life-threatening? Call 108 now</b>
          <p>For medical emergencies (accidents, heart attack, stroke, breathing difficulty).</p>
        </div>
        <Call108 />
      </div>

      <section className="amb2-hero" aria-labelledby="amb2-home-title">
        <div className="amb2-hero-copy">
          <Kicker icon={Ambulance}>Ambulance services{area ? ` in ${area.label}` : ''}</Kicker>
          <h1 id="amb2-home-title">Fast, safe and reliable ambulance support</h1>
          <p>Emergency response, hospital transfers, home care and event medical support with verified operators.</p>
          <div className="amb2-hero-loc"><LocationBar compact purpose="find ambulance services near you" /></div>
        </div>
        <div className="amb2-hero-media">
          <img src={AMB_HERO_IMAGE} alt="Ambulance ready outside a hospital" />
        </div>
      </section>

      <div className="amb2-actions">
        <ActionCard tone="urgent" icon={Zap} title="Urgent (now)" text="For emergencies or immediate medical needs.">
          <CtaLink to={urgentTo}>Book urgent ambulance</CtaLink>
        </ActionCard>

        <ActionCard tone="scheduled" icon={CalendarDays} title="Scheduled transfer" text="Hospital discharge, dialysis, check-up or planned transfer.">
          {infoError
            ? <><ErrorNote error={infoError} onRetry={loadInfo} /><span className="amb2-action-cta amb2-action-cta--disabled">Schedule ambulance</span></>
            : info === null
              ? <span className="amb2-action-cta amb2-action-cta--disabled" role="status">Checking availability…</span>
              : info.enabled
                ? <CtaLink to="/book-ambulance?transfer=DISCHARGE">Schedule ambulance</CtaLink>
                : <div className="amb2-action-unavailable" role="status"><b>Scheduled booking is not open right now.</b><span>Contact support to arrange a planned transfer.</span><Link className="amb2-link" to="/help">Contact support</Link></div>}
        </ActionCard>

        <ActionCard tone="event" icon={ShieldCheck} title="Event standby" text="For events, workplaces and on-site medical support.">
          <CtaButton onClick={() => setEventOpen(true)}>Request for event</CtaButton>
        </ActionCard>
      </div>

      <section className="amb2-card amb2-trips" aria-labelledby="amb2-recent-title">
        <div className="amb2-card-head">
          <div>
            <h2 id="amb2-recent-title">My trips</h2>
            <p>Your latest ambulance requests and trips.</p>
          </div>
          <Link className="amb2-link" to="/ambulance-trips">View all<ChevronRight size={14} aria-hidden="true" /></Link>
        </div>

        {trips === null && !tripsError
          ? <LoadingBlock rows={2} label="Loading your recent trips…" />
          : tripsError
            ? <StateCard title="Your trips could not be loaded" text={tripsError} onRetry={loadTrips} />
            : trips && trips.length === 0
              ? <StateCard title="No ambulance trips yet" text="When you request or complete an ambulance trip, it will appear here." action={<Link className="amb2-btn amb2-btn--outline amb2-btn--sm" to="/book-ambulance?transfer=DISCHARGE">Schedule an ambulance</Link>} />
              : <>
                <div className="amb2-trip-head" aria-hidden="true">
                  <span>Date &amp; time</span><span>Route</span><span>Status</span><span>Ambulance</span><span>Fare</span><span />
                </div>
                {trips!.slice(0, 3).map(trip => (
                  <Link className="amb2-trip-row" key={trip.id} to={`/ambulance-trips?open=${encodeURIComponent(trip.id)}`}>
                    <span className="amb2-trip-when"><b>{dateText(trip.scheduled_at)}</b><small>{trip.trip_number}</small></span>
                    <span className="amb2-trip-route">
                      <b><Ambulance size={13} aria-hidden="true" /><span>{trip.pickup_address}</span></b>
                      <small><ChevronRight size={12} aria-hidden="true" /><span>{destinationAddress(trip.drop_address)}</span></small>
                    </span>
                    <span><StatusPill status={trip.status} label={trip.status_label} /></span>
                    <span className="amb2-trip-service">{trip.vehicle_type_label}{trip.is_urgent && <small>Emergency</small>}</span>
                    <span className="amb2-trip-fare">{['CANCELLED', 'DECLINED', 'EXPIRED'].includes(trip.status) ? '—' : trip.final_fare !== null && trip.final_fare !== undefined ? rupees(trip.final_fare) : trip.estimated_fare !== null && trip.estimated_fare !== undefined ? `${rupees(trip.estimated_fare)} est.` : 'After trip'}</span>
                    <span className="amb2-trip-action">View details<ChevronRight size={13} aria-hidden="true" /></span>
                  </Link>
                ))}
              </>}
      </section>

      {eventOpen && (
        <VizitoDialog
          title="Event medical standby"
          onClose={() => setEventOpen(false)}
          footer={<><button type="button" className="amb2-btn amb2-btn--ghost" onClick={() => setEventOpen(false)}>Close</button><Link className="amb2-btn" to="/help">Contact support</Link></>}
        >
          <p>Event standby is arranged by the Vizito support team so a verified operator and ambulance can be reserved for your event.</p>
          <p className="amb2-muted">It cannot be booked instantly in the app yet. Share the event date, venue, timings and expected number of people with support.</p>
          <p className="amb2-muted">For a life-threatening emergency, call 108.</p>
        </VizitoDialog>
      )}
    </div>
  );
}
