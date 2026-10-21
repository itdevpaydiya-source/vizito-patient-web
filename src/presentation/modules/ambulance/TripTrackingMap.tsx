import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { driverLocationApi, type DriverLocation } from '../../../services/ambulanceHelper';

// Patient live tracking for driver-dispatched trips (SCHEDULED_DISPATCH_SPEC.md §16). Shows the confirmed pickup pin
// and the driver's position ONLY while it is fresh (server decides: LIVE). Stale / unavailable / searching are shown as
// text with no driver marker, so an old position is never shown as live. No route, ETA or distance (no routing
// provider). Stops polling when the trip ends. If the map cannot load, the text status still works; the trip status
// and 108 live outside this component.
const TILES = import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const STOP = ['ENDED', 'NOT_TRACKED'];

const ago = (s: number) => (s < 60 ? `${s} s ago` : `${Math.round(s / 60)} min ago`);

const TripTrackingMap = ({ tripId }: { tripId: string }) => {
  const box = useRef<HTMLDivElement | null>(null);
  const map = useRef<L.Map | null>(null);
  const pickupMarker = useRef<L.CircleMarker | null>(null);
  const driverMarker = useRef<L.CircleMarker | null>(null);
  const accuracy = useRef<L.Circle | null>(null);
  const [loc, setLoc] = useState<DriverLocation | null>(null);
  const [offline, setOffline] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);

  // Poll: every poll_seconds; on a connection failure back off (5 → 10 → 20 → 30 s) and keep trying.
  useEffect(() => {
    let stop = false, timer = 0, fails = 0;
    const tick = async () => {
      try {
        const r = await driverLocationApi(tripId);
        if (stop) return;
        fails = 0; setOffline(false); setLoc(r);
        if (STOP.includes(r.state)) return;
        timer = window.setTimeout(tick, (r.poll_seconds || 5) * 1000);
      } catch {
        if (stop) return;
        fails += 1; setOffline(true);
        timer = window.setTimeout(tick, Math.min(30, 5 * 2 ** (fails - 1)) * 1000);
      }
    };
    tick();
    return () => { stop = true; window.clearTimeout(timer); };
  }, [tripId]);

  useEffect(() => {
    if (!box.current || map.current || mapFailed) return;
    try {
      const m = L.map(box.current, { center: [22.5, 79], zoom: 5 });
      L.tileLayer(TILES, { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(m);
      map.current = m;
    } catch { setMapFailed(true); }
    return () => { map.current?.remove(); map.current = null; pickupMarker.current = null; driverMarker.current = null; accuracy.current = null; };
  }, [mapFailed]);

  // Draw: pickup pin always (when known); the driver only when LIVE and the connection is up.
  const live = !!loc && loc.state === 'LIVE' && !offline;
  useEffect(() => {
    const m = map.current;
    if (!m || !loc) return;
    if (loc.pickup) {
      const at: [number, number] = [loc.pickup.latitude, loc.pickup.longitude];
      if (!pickupMarker.current) pickupMarker.current = L.circleMarker(at, { radius: 9, color: '#be123c', weight: 3, fillColor: '#f43f5e', fillOpacity: 0.8 }).addTo(m).bindTooltip('Pickup');
      else pickupMarker.current.setLatLng(at);
    }
    if (live && loc.latitude != null && loc.longitude != null) {
      const at: [number, number] = [loc.latitude, loc.longitude];
      if (!driverMarker.current) driverMarker.current = L.circleMarker(at, { radius: 9, color: '#1d4ed8', weight: 3, fillColor: '#3b82f6', fillOpacity: 0.9 }).addTo(m).bindTooltip('Ambulance');
      else driverMarker.current.setLatLng(at);
      if (loc.accuracy_m) {
        if (!accuracy.current) accuracy.current = L.circle(at, { radius: loc.accuracy_m, color: '#3b82f6', weight: 1, fillOpacity: 0.08 }).addTo(m);
        else accuracy.current.setLatLng(at).setRadius(loc.accuracy_m);
      }
    } else {
      // Not live (stale, unavailable, searching after a reassignment, ended or offline): no driver on the map.
      driverMarker.current?.remove(); driverMarker.current = null;
      accuracy.current?.remove(); accuracy.current = null;
    }
    const pts = [pickupMarker.current?.getLatLng(), driverMarker.current?.getLatLng()].filter(Boolean) as L.LatLng[];
    if (pts.length === 2) m.fitBounds(L.latLngBounds(pts).pad(0.3), { maxZoom: 16 });
    else if (pts.length === 1) m.setView(pts[0], Math.max(m.getZoom(), 15));
  }, [loc, live]);

  const text = offline
    ? 'Connection lost. Retrying… The ambulance is not shown until a fresh location arrives.'
    : !loc ? 'Loading tracking…'
    : loc.state === 'LIVE' ? `Ambulance location updated ${ago(loc.age_seconds ?? 0)}${loc.accuracy_m ? ` (accurate to about ${Math.round(loc.accuracy_m)} m)` : ''}.`
    : loc.state === 'STALE' ? `${loc.reason}${loc.age_seconds != null ? ` Last update ${ago(loc.age_seconds)}.` : ''}`
    : loc.reason || 'Tracking is not available.';
  const tone = live ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : loc?.state === 'ENDED' || loc?.state === 'NOT_TRACKED' ? 'bg-slate-50 text-slate-700 border-slate-200' : 'bg-amber-50 text-amber-900 border-amber-200';

  if (loc?.state === 'NOT_TRACKED') return <p aria-label="Live tracking" data-state="NOT_TRACKED" className={`rounded-xl border px-3 py-2 text-xs ${tone}`}>{loc.reason}</p>;
  return (
    <section aria-label="Live tracking" data-state={offline ? 'OFFLINE' : loc?.state || 'LOADING'} className="space-y-2">
      <p role="status" aria-label="Tracking status" className={`rounded-xl border px-3 py-2 text-xs font-semibold ${tone}`}>{text}</p>
      {!mapFailed && <div ref={box} aria-label="Tracking map" className="h-64 w-full rounded-xl border border-slate-200 z-0" />}
      {mapFailed && <p className="text-xs text-slate-600">The map could not load. The status above still updates.</p>}
      <p className="text-[11px] text-slate-500">Red: pickup. Blue: ambulance (only when its location is current). No route or arrival time is shown.</p>
    </section>
  );
};

export default TripTrackingMap;
