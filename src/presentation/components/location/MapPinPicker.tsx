import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {MapPin,CheckCircle2,AlertTriangle} from 'lucide-react';
import ServiceLocationDialog from './ServiceLocationDialog';
import {addressAt} from '../../../services/location';

// Place a business pin precisely: start from the saved pin, or a suggestion found from the address,
// then drag the pin onto the entrance and confirm. "Use my current location" is offered only for
// someone standing at the place right now (their phone's GPS is never saved without this confirm).
export interface Pin { lat: number; lng: number }
const INDIA = { minLat: 6.0, maxLat: 37.6, minLng: 68.0, maxLng: 97.5 };
export const inIndia = (p: Pin) => p.lat >= INDIA.minLat && p.lat <= INDIA.maxLat && p.lng >= INDIA.minLng && p.lng <= INDIA.maxLng;
const ICON = L.divIcon({ className: '', html: '<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;background:#B45F28;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.4)"></div>', iconSize: [26, 26], iconAnchor: [13, 26] });

export interface PinAddress {line1:string;area:string;city:string;state:string;pincode:string;text:string}
const reverseLookup=addressAt;

export default function MapPinPicker({ value, address, placeName, onChange, onDraft, onUseAddress, hint }: {
  value: Pin | null; address: string; placeName: string; onChange: (p: Pin | null) => void;
  /** The pin currently on the map (moved but maybe not confirmed yet), so Save can use what the user sees. */
  onDraft?: (p: Pin | null) => void;
  /** When given, the address found at a placed pin is offered with a "Fill the form" button. */
  onUseAddress?: (a: PinAddress) => void;
  /** Line under the map: who uses this pin. */
  hint?: string;
}) {
  const [found, setFound] = useState<PinAddress | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const [draft, setDraft] = useState<Pin | null>(value);
  const [source, setSource] = useState<'saved' | 'address' | 'gps' | 'search' | 'moved' | null>(value ? 'saved' : null);
  const [open,setOpen]=useState(false);


  const [msg, setMsg] = useState<string | null>(null);
  const confirmed = !!value && !!draft && value.lat === draft.lat && value.lng === draft.lng;

  // Only a pin the user placed (GPS, search, tap, drag) counts; an address suggestion must be confirmed.
  useEffect(() => { onDraft?.(source === 'address' ? value : draft); }, [draft, source]); // eslint-disable-line react-hooks/exhaustive-deps
  // Look up the address at a pin the user placed (not at a saved pin or an address suggestion).
  useEffect(() => {
    setFound(null);
    if (!onUseAddress || !draft || !source || source === 'saved' || source === 'address') return;
    const t = setTimeout(() => { reverseLookup(draft).then(setFound).catch(() => setFound(null)); }, 600);
    return () => clearTimeout(t);
  }, [draft, source]); // eslint-disable-line react-hooks/exhaustive-deps
  const place = (p: Pin, src: typeof source, zoom = 17) => {
    setDraft(p); setSource(src);
    if (!map.current) return;
    if (!marker.current) {
      marker.current = L.marker([p.lat, p.lng], { draggable: true, icon: ICON }).addTo(map.current);
      marker.current.on('dragend', () => { const ll = marker.current!.getLatLng(); setDraft({ lat: +ll.lat.toFixed(7), lng: +ll.lng.toFixed(7) }); setSource('moved'); });
    } else marker.current.setLatLng([p.lat, p.lng]);
    map.current.setView([p.lat, p.lng], zoom);
  };

  useEffect(() => {
    if (!box.current) return;
    const m = L.map(box.current, { scrollWheelZoom: true }).setView(value ? [value.lat, value.lng] : [20.59, 78.96], value ? 17 : 5);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(m);
    m.on('click', (e: L.LeafletMouseEvent) => place({ lat: +e.latlng.lat.toFixed(7), lng: +e.latlng.lng.toFixed(7) }, 'moved', m.getZoom()));
    map.current = m;
    if (value) place(value, 'saved');
    setTimeout(() => m.invalidateSize(), 50);
    return () => { m.remove(); map.current = null; marker.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const label = source === 'saved' ? 'Saved pin' : source === 'address' ? 'Suggested from the address — check it' : source === 'gps' ? 'From your current location' : source === 'search' ? 'From search — drag onto the entrance' : source === 'moved' ? 'Placed by you' : '';
  return (
    <div className="space-y-2" aria-label="Map pin">
      <button className="sl-chip" type="button" onClick={()=>setOpen(true)}><MapPin/>Choose location on map</button>
      {open&&<ServiceLocationDialog context="address" initialQuery={address} initialArea={draft?{...draft,label:placeName||'Selected address',source:'manual',at:Date.now()}:null} onClose={()=>setOpen(false)} onApply={a=>{if(a)place({lat:a.lat,lng:a.lng},a.source==='gps'?'gps':'search');else{setDraft(null);setSource(null);marker.current?.remove();marker.current=null;onChange(null);}}}/>}
      <div ref={box} style={{ height: 260 }} className="w-full rounded-xl overflow-hidden border border-slate-200 z-0" />
      {msg && <p className="text-[11px] font-semibold text-amber-800">{msg}</p>}
      {found && onUseAddress && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs flex flex-wrap items-center gap-2" aria-label="Address at this pin">
          <span className="flex-1 min-w-[12rem] text-slate-700"><b>Address at this pin:</b> {found.text}</span>
          <button type="button" onClick={() => { onUseAddress(found); setFound(null); }} className="px-2.5 py-1 rounded-lg bg-sky-700 text-white font-bold">Fill the form</button>
          <button type="button" onClick={() => setFound(null)} className="px-2 py-1 rounded-lg text-slate-600 font-bold">Keep mine</button>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {draft ? <span className="text-slate-600"><b>{label}</b> · Check the entrance on the map</span> : <span className="text-slate-500">Tap the map where {placeName || 'this place'} is, or search above.</span>}
        <span className="flex-1" />
        {confirmed ? <span className="inline-flex items-center gap-1 font-bold text-emerald-700"><CheckCircle2 className="w-4 h-4" /> Pin confirmed</span>
          : draft && (inIndia(draft)
            ? <button type="button" onClick={() => onChange(draft)} className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-bold">Confirm this is {placeName || 'the place'}</button>
            : <span className="inline-flex items-center gap-1 font-bold text-rose-700"><AlertTriangle className="w-4 h-4" /> The pin must be in India</span>)}
      </div>
      <p className="text-[11px] text-slate-400">{hint || 'Check the entrance and your full address before saving this pin.'} Map data © OpenStreetMap.</p>
    </div>
  );
}

/** Latin script only (English letters, digits, punctuation): local-script place names are left for the user to type. */
function isLatin(v: string): boolean { return /^[\x20-\x7E -ɏ]*$/.test(v); }
