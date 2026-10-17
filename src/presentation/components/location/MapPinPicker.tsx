import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed, Search, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

// Place a business pin precisely: start from the saved pin, or a suggestion found from the address,
// then drag the pin onto the entrance and confirm. "Use my current location" is offered only for
// someone standing at the place right now (their phone's GPS is never saved without this confirm).
export interface Pin { lat: number; lng: number }
const INDIA = { minLat: 6.0, maxLat: 37.6, minLng: 68.0, maxLng: 97.5 };
export const inIndia = (p: Pin) => p.lat >= INDIA.minLat && p.lat <= INDIA.maxLat && p.lng >= INDIA.minLng && p.lng <= INDIA.maxLng;
const ICON = L.divIcon({ className: '', html: '<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;background:#B45F28;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.4)"></div>', iconSize: [26, 26], iconAnchor: [13, 26] });

async function geocode(q: string): Promise<{ label: string; lat: number; lng: number }[]> {
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&accept-language=en&countrycodes=in&limit=5&q=${encodeURIComponent(q)}`, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error('search');
  return ((await r.json()) as any[]).map((x) => ({ label: String(x.display_name).split(', ').slice(0, 4).join(', '), lat: Number(x.lat), lng: Number(x.lon) })).filter((x) => Number.isFinite(x.lat));
}

/** The street address at a pin (OpenStreetMap reverse lookup), split into the form's fields. */
export interface PinAddress { line1: string; area: string; city: string; state: string; pincode: string; text: string }
async function reverseLookup(p: Pin): Promise<PinAddress | null> {
  const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&accept-language=en&addressdetails=1&zoom=18&lat=${p.lat}&lon=${p.lng}`, { headers: { Accept: 'application/json' } });
  if (!r.ok) return null;
  const j = await r.json(); const raw = j?.address || {};
  // English (Latin script) only: a value OpenStreetMap has only in a local script is left out for the user to type.
  const a: any = Object.fromEntries(Object.entries(raw).filter(([, v]) => typeof v === 'string' && isLatin(v as string)));
  const line1 = [a.house_number, a.building || a.amenity || a.shop, a.road].filter(Boolean).join(', ');
  const area = a.neighbourhood || a.suburb || a.quarter || a.city_district || '';
  const city = a.city || a.town || a.village || a.state_district || a.county || '';
  const out = { line1, area, city, state: a.state || '', pincode: /^\d{6}$/.test(String(a.postcode || '')) ? String(a.postcode) : '', text: '' };
  out.text = [out.line1, out.area, out.city, out.state, out.pincode].filter(Boolean).join(', ');
  return out.text ? out : null;
}

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
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<{ label: string; lat: number; lng: number }[] | null>(null);
  const [busy, setBusy] = useState(false);
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
    else if (address.trim().length > 8) {
      // A first suggestion from the written address, clearly marked as a suggestion.
      geocode(address).then((r) => { if (r[0] && !marker.current) place({ lat: r[0].lat, lng: r[0].lng }, 'address', 16); }).catch(() => undefined);
    }
    setTimeout(() => m.invalidateSize(), 50);
    return () => { m.remove(); map.current = null; marker.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const useGps = () => {
    setMsg(null);
    if (!navigator.geolocation) { setMsg('This browser can’t share location. Search or tap the map instead.'); return; }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setBusy(false); const pin = { lat: +p.coords.latitude.toFixed(7), lng: +p.coords.longitude.toFixed(7) }; place(pin, 'gps', 18); setMsg(p.coords.accuracy > 60 ? `GPS accuracy is about ${Math.round(p.coords.accuracy)} m. Drag the pin onto the entrance before confirming.` : null); },
      (e) => { setBusy(false); setMsg(e.code === e.PERMISSION_DENIED ? 'Location permission is off. Search for the place or tap it on the map.' : 'Couldn’t get your location. Search for the place or tap it on the map.'); },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  };
  const search = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg(null);
    if (q.trim().length < 3) return;
    setBusy(true);
    try { const r = await geocode(q); setHits(r); if (!r.length) setMsg('No match in India. Try the locality or PIN code, then drag the pin.'); }
    catch { setMsg('Place search is unavailable. Tap the place on the map instead.'); }
    finally { setBusy(false); }
  };

  const label = source === 'saved' ? 'Saved pin' : source === 'address' ? 'Suggested from the address — check it' : source === 'gps' ? 'From your current location' : source === 'search' ? 'From search — drag onto the entrance' : source === 'moved' ? 'Placed by you' : '';
  return (
    <div className="space-y-2" aria-label="Map pin">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={useGps} disabled={busy} title="Only if you are at this place now" className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 inline-flex items-center gap-1 disabled:opacity-60">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5" />} I’m here now
        </button>
        <form onSubmit={search} className="flex-1 min-w-[12rem] flex gap-2">
          <input aria-label="Search the map" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a landmark, street or PIN code" className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold outline-none focus:border-primary" />
          <button type="submit" className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 inline-flex items-center gap-1"><Search className="w-3.5 h-3.5" /> Find</button>
        </form>
      </div>
      {hits && hits.length > 0 && (
        <ul className="rounded-lg border border-slate-200 divide-y divide-slate-100 max-h-36 overflow-auto">
          {hits.map((h) => <li key={`${h.lat},${h.lng}`}><button type="button" onClick={() => { place({ lat: h.lat, lng: h.lng }, 'search'); setHits(null); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50">{h.label}</button></li>)}
        </ul>
      )}
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
        {draft ? <span className="text-slate-600"><b>{label}</b> · {draft.lat.toFixed(6)}, {draft.lng.toFixed(6)}</span> : <span className="text-slate-500">Tap the map where {placeName || 'this place'} is, or search above.</span>}
        <span className="flex-1" />
        {confirmed ? <span className="inline-flex items-center gap-1 font-bold text-emerald-700"><CheckCircle2 className="w-4 h-4" /> Pin confirmed</span>
          : draft && (inIndia(draft)
            ? <button type="button" onClick={() => onChange(draft)} className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-bold">Confirm this is {placeName || 'the place'}</button>
            : <span className="inline-flex items-center gap-1 font-bold text-rose-700"><AlertTriangle className="w-4 h-4" /> The pin must be in India</span>)}
      </div>
      <p className="text-[11px] text-slate-400">{hint || 'Patients use this pin for distance and turn-by-turn directions, so put it on the entrance.'} Map data © OpenStreetMap.</p>
    </div>
  );
}

/** Latin script only (English letters, digits, punctuation): local-script place names are left for the user to type. */
function isLatin(v: string): boolean { return /^[\x20-\x7E -ɏ]*$/.test(v); }
