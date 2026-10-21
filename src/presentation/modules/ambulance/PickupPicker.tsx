import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed, Search } from 'lucide-react';

// Pickup pin for scheduled bookings (SCHEDULED_DISPATCH_SPEC.md §14). Public OpenStreetMap services only, within their
// usage policies: map tiles with attribution, and Nominatim search on an explicit Search press (never as-you-type),
// at most one request per ~1.5 s, India only. Production provider selection is deferred; both URLs are configurable
// (tests point them at a local stand-in). Search failing never blocks booking: type the address and tap the map.
const TILES = import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const GEOCODER = (import.meta.env.VITE_GEOCODER_URL || 'https://nominatim.openstreetmap.org').replace(/\/$/, '');
const INDIA: [number, number] = [22.5, 79];
const SEARCH_GAP_MS = 1500;

export type PickupSource = 'PIN' | 'DEVICE';
/** A device fix less accurate than this is not used as the pin (same limit as drivers); the patient pins it instead. */
export const MAX_ACCURACY_M = 1000;
export interface Pickup { lat: number; lng: number; source: PickupSource; accuracy?: number }
interface Hit { display_name: string; lat: string; lon: string }

interface Props {
  value: Pickup | null;
  confirmed: boolean;
  onChange: (p: Pickup) => void;
  onConfirm: (c: boolean) => void;
  onUseAddress: (address: string) => void;
  /** Ask for the device location as soon as the picker opens (urgent requests). */
  autoLocate?: boolean;
}

const PickupPicker = ({ value, confirmed, onChange, onConfirm, onUseAddress, autoLocate }: Props) => {
  const box = useRef<HTMLDivElement | null>(null);
  const map = useRef<L.Map | null>(null);
  const pin = useRef<L.CircleMarker | null>(null);
  const change = useRef(onChange);
  change.current = onChange;
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lastSearch = useRef(0);

  useEffect(() => {
    if (!box.current || map.current) return;
    const m = L.map(box.current, { center: INDIA, zoom: 5 });
    L.tileLayer(TILES, { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(m);
    // Tap / click the map to put the pin there (e.g. the address of someone you are booking for).
    m.on('click', (e: L.LeafletMouseEvent) => change.current({ lat: Number(e.latlng.lat.toFixed(6)), lng: Number(e.latlng.lng.toFixed(6)), source: 'PIN' }));
    map.current = m;
    return () => { m.remove(); map.current = null; pin.current = null; };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!value) { pin.current?.remove(); pin.current = null; return; }
    const at: [number, number] = [value.lat, value.lng];
    if (!pin.current) pin.current = L.circleMarker(at, { radius: 10, color: '#be123c', weight: 3, fillColor: '#f43f5e', fillOpacity: 0.7 }).addTo(m);
    else pin.current.setLatLng(at);
    if (!m.getBounds().pad(-0.2).contains(at) || m.getZoom() < 15) m.setView(at, Math.max(m.getZoom(), 16));
  }, [value]);

  const search = async () => {
    const text = q.trim();
    if (text.length < 3) { setMsg('Type at least 3 characters, then press Search.'); return; }
    const wait = lastSearch.current + SEARCH_GAP_MS - Date.now();
    if (wait > 0) { setMsg('Please wait a moment before searching again.'); return; }
    lastSearch.current = Date.now();
    setBusy(true); setMsg(null); setHits(null);
    try {
      const r = await fetch(`${GEOCODER}/search?format=json&countrycodes=in&limit=5&q=${encodeURIComponent(text)}`, { headers: { 'Accept-Language': 'en' } });
      if (!r.ok) throw new Error(String(r.status));
      const list = (await r.json()) as Hit[];
      setHits(list);
      if (!list.length) setMsg('No match found. Try other words, or type the address and tap the map at the pickup point.');
    } catch {
      setMsg('Address search is unavailable right now. Type the address yourself and tap the map at the pickup point.');
    } finally { setBusy(false); }
  };

  const locate = () => {
    setMsg('Reading your location…');
    if (!navigator.geolocation) { setMsg('This browser cannot read your location. Search for the place or tap the map at the pickup point.'); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const acc = Math.round(p.coords.accuracy);
        // Too coarse (e.g. located by internet connection only): never used as the pin.
        if (acc > MAX_ACCURACY_M) { setMsg(`Your location is only approximate (within about ${(acc / 1000).toFixed(1)} km), so it was not used. Search for the place or tap the map at the exact pickup point.`); return; }
        setMsg(`Pin set to your current location (accurate to about ${acc} m). Check it is right, then confirm.`);
        change.current({ lat: Number(p.coords.latitude.toFixed(6)), lng: Number(p.coords.longitude.toFixed(6)), source: 'DEVICE', accuracy: acc });
      },
      (e) => setMsg(e.code === 1
        ? 'Location is blocked for this site. To allow it: click the lock icon next to the web address → Site settings → Location → Allow, then press "Use my current location" again. Or search for the place, or tap the map at the pickup point.'
        : 'Your location is unavailable right now (no signal or it took too long). Press "Use my current location" to try again, or search for the place, or tap the map at the pickup point.'),
      { timeout: 15000, maximumAge: 60000, enableHighAccuracy: true });
  };
  useEffect(() => { if (autoLocate) locate(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  return (
    <section aria-label="Pickup location" className="rounded-xl border border-slate-200 p-3 space-y-2">
      <p className="text-xs font-bold text-slate-700">Pickup point on the map</p>
      <p className="text-xs text-slate-600">Search for the place, or tap the map where the ambulance should stop. Booking for someone elsewhere? Put the pin at their address, not yours.</p>
      <div className="flex gap-2">
        <input aria-label="Search for the pickup" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); search(); } }} placeholder="Area, landmark or street, city" className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        <button type="button" disabled={busy} onClick={search} className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-800 disabled:opacity-50"><Search className="w-4 h-4" /> Search</button>
      </div>
      {hits && hits.length > 0 && (
        <ul aria-label="Search results" className="space-y-1">
          {hits.map((h) => (
            <li key={`${h.lat},${h.lon}`}>
              <button type="button" onClick={() => { change.current({ lat: Number(Number(h.lat).toFixed(6)), lng: Number(Number(h.lon).toFixed(6)), source: 'PIN' }); onUseAddress(h.display_name); setHits(null); setMsg('Pin placed at the search result. Move it by tapping the exact pickup point if needed.'); }}
                className="w-full text-left rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50">{h.display_name}</button>
            </li>
          ))}
        </ul>
      )}
      <div ref={box} aria-label="Pickup map" className="h-72 w-full rounded-xl border border-slate-200 z-0" />
      <button type="button" onClick={locate} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800"><LocateFixed className="w-4 h-4" /> Use my current location</button>
      {msg && <p role="status" className="text-xs text-slate-600">{msg}</p>}
      <p aria-label="Pin position" className="text-xs text-slate-700">{value ? `Pin: ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)} (${value.source === 'DEVICE' ? 'your current location' : 'chosen on the map'})` : 'No pin yet.'}</p>
      <label className={`flex items-start gap-2 rounded-lg p-2 text-sm ${confirmed ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'}`}>
        <input type="checkbox" aria-label="Confirm pickup location" disabled={!value} checked={confirmed} onChange={(e) => onConfirm(e.target.checked)} className="mt-1" />
        <span>I confirm the pin marks where the patient will be picked up. Drivers are sent to this point.</span>
      </label>
    </section>
  );
};

export default PickupPicker;
