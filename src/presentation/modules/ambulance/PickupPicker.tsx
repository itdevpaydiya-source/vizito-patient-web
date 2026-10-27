import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {MapPin} from 'lucide-react';
import ServiceLocationDialog from '../../components/location/ServiceLocationDialog';

// Pickup pin for scheduled bookings (SCHEDULED_DISPATCH_SPEC.md §14). Public OpenStreetMap services only, within their
// usage policies: map tiles with attribution, and Nominatim search on an explicit Search press (never as-you-type),
// at most one request per ~1.5 s, India only. Production provider selection is deferred; both URLs are configurable
// (tests point them at a local stand-in). Search failing never blocks booking: type the address and tap the map.
const TILES = import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const INDIA: [number,number]=[22.5,79];

export type PickupSource = 'PIN' | 'DEVICE';
/** A device fix less accurate than this is not used as the pin (same limit as drivers); the patient pins it instead. */
export const MAX_ACCURACY_M = 1000;
export interface Pickup { lat: number; lng: number; source: PickupSource; accuracy?: number }


interface Props {
  value: Pickup | null;
  confirmed: boolean;
  onChange: (p: Pickup|null) => void;
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
  const [open,setOpen]=useState(!!autoLocate);

  const [msg, setMsg] = useState<string | null>(null);



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

  return (
    <section aria-label="Pickup location" className="rounded-xl border border-slate-200 p-3 space-y-2">
      <p className="text-xs font-bold text-slate-700">Pickup point on the map</p>
      <p className="text-xs text-slate-600">Search for the place, or tap the map where the ambulance should stop. Booking for someone elsewhere? Put the pin at their address, not yours.</p>
      <button className="sl-chip" type="button" onClick={()=>setOpen(true)}><MapPin/>Choose pickup location</button>
      {open&&<ServiceLocationDialog context="pickup" initialArea={value?{lat:value.lat,lng:value.lng,accuracy:value.accuracy,label:'Selected pickup point',source:value.source==='DEVICE'?'gps':'manual',at:Date.now()}:null} onClose={()=>setOpen(false)} onApply={a=>{if(!a){change.current(null);onConfirm(false);return;}if(a.source==='gps'&&a.accuracy&&a.accuracy>MAX_ACCURACY_M){setMsg('Your location is too approximate for ambulance pickup. Tap the map at the exact pickup point.');return;}change.current({lat:a.lat,lng:a.lng,source:a.source==='gps'?'DEVICE':'PIN',...(a.accuracy?{accuracy:a.accuracy}:{})});onConfirm(false);onUseAddress(a.label);setMsg('Check the exact pickup point on the map, then confirm it below.');}}/>}
      <div ref={box} aria-label="Pickup map" className="h-72 w-full rounded-xl border border-slate-200 z-0" />

      {msg && <p role="status" className="text-xs text-slate-600">{msg}</p>}
      <p aria-label="Pin position" className="text-xs text-slate-700">{value?'Pickup point selected. Check the map before confirming.':'Choose the patient’s pickup point.'}</p>
      <label className={`flex items-start gap-2 rounded-lg p-2 text-sm ${confirmed ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'}`}>
        <input type="checkbox" aria-label="Confirm pickup location" disabled={!value} checked={confirmed} onChange={(e) => onConfirm(e.target.checked)} className="mt-1" />
        <span>I confirm the pin marks where the patient will be picked up. Drivers are sent to this point.</span>
      </label>
    </section>
  );
};

export default PickupPicker;
