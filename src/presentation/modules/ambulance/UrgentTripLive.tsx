import { useEffect, useRef, useState } from 'react';
import { useAmbulanceSocket } from './useAmbulanceSocket';
import { Check, PhoneCall } from 'lucide-react';
import { driverLocationApi, type DriverLocation, type MyTrip } from '../../../services/ambulanceHelper';
import { TRIP_STEPS, tripStepIndex } from './TrackingDetails';

/**
 * Live trip details under the urgent request heading: step progress, driver + vehicle, call the operator (patients never
 * get crew phone numbers) and, while the ambulance is on the way, the ETA/distance from the same driver-location
 * endpoint the track page map polls. Everything shown comes from the API; missing fields are simply not shown.
 */
export default function UrgentTripLive({ trip }: { trip: MyTrip }) {
  const step = tripStepIndex(trip.status);
  const active = step >= 0 && step < 4;
  const enRoute = trip.status === 'EN_ROUTE';
  const location = useDriverLocation(trip.id, enRoute);
  const liveRoute = enRoute && location?.state === 'LIVE' ? location.route : null;
  const route = liveRoute?.available ? liveRoute : null;
  // Why there is no ETA, in the server's words (stale/no position, or no routing available) — never an invented estimate.
  const etaNote = !enRoute || !location || route ? null : location.state !== 'LIVE' ? location.reason : liveRoute?.reason;
  const vehicle = [trip.vehicle_registration, trip.vehicle_type_label].filter(Boolean).join(' · ');

  return (
    <div className="trip-live">
      {step >= 0 && (
        <ol className="trip-steps" aria-label="Trip progress">
          {TRIP_STEPS.map((label, index) => (
            <li key={label} className={index < step || step === 4 ? 'done' : index === step ? 'current' : ''} aria-current={index === step ? 'step' : undefined}>
              <i aria-hidden="true">{index < step || step === 4 ? <Check size={12} /> : index + 1}</i>
              <span>{label}</span>
            </li>
          ))}
        </ol>
      )}
      {route?.eta_minutes != null && (
        <p className="trip-eta" aria-label="Arrival ETA">
          <b>{route.eta_minutes} min away</b>
          {route.distance_km != null && <span>{route.distance_km} km to pickup</span>}
        </p>
      )}
      {etaNote && <p className="muted trip-eta-note">{etaNote}</p>}
      {step >= 0 && (
        <div className="person trip-crew">
          <div className="copy">
            <small>Driver</small>
            <b>{trip.driver_name || 'Driver details appear once a vehicle is assigned.'}</b>
            {vehicle && <span className="trip-vehicle">{vehicle}</span>}
            {trip.operator.name && <small>{trip.operator.name}</small>}
          </div>
          {active && trip.operator.phone && (
            <a className="button secondary" href={`tel:${trip.operator.phone}`} aria-label="Call the operator to reach the driver">
              <PhoneCall size={15} aria-hidden="true" />Call operator
            </a>
          )}
        </div>
      )}
    </div>
  );
}

/** Same polling as TripTrackingMap: every poll_seconds, back off on failures, stop when the server says tracking ended. */
function useDriverLocation(tripId: string, enabled: boolean) {
  const [location, setLocation] = useState<DriverLocation | null>(null);
  // Realtime: a presence / status push for this trip fetches the position at once; polling backs off to 15 s while connected.
  const kick = useRef<() => void>(() => {});
  const live = useAmbulanceSocket({ presence: () => kick.current(), 'trip.status': () => kick.current() }, { tripId, enabled });
  const liveRef = useRef(live); liveRef.current = live;
  useEffect(() => {
    if (!enabled) return;
    let stop = false, timer = 0, fails = 0;
    const tick = async () => {
      try {
        const next = await driverLocationApi(tripId);
        if (stop) return;
        fails = 0; setLocation(next);
        if (next.state === 'ENDED' || next.state === 'NOT_TRACKED') return;
        timer = window.setTimeout(tick, Math.max(next.poll_seconds || 5, liveRef.current ? 15 : 0) * 1000);
      } catch {
        if (stop) return;
        fails += 1; setLocation(null);
        timer = window.setTimeout(tick, Math.min(30, 5 * 2 ** (fails - 1)) * 1000);
      }
    };
    kick.current = () => { if (stop) return; window.clearTimeout(timer); void tick(); };
    tick();
    return () => { stop = true; window.clearTimeout(timer); };
  }, [tripId, enabled]);
  return enabled ? location : null;
}
