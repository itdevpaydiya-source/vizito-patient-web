import React, { useState } from 'react';
import { Navigation, MapPin, Copy, AlertTriangle } from 'lucide-react';
import MapPreview from './MapPreview';
import { directionsUrl, appleMapsUrl, addressSearchUrl, isApple, metresBetween, formatDistance, useSearchArea, type LatLng } from '../../../services/location';

// Where to go for a booked visit: the exact branch/centre, its address, the map pin and directions.
// The destination is always the booked place (never the patient's own location). When the business
// hasn't confirmed its pin, we say so and search by the written address instead.
const VisitLocation: React.FC<{ title: string; name: string; address: string; pin?: LatLng | null; phone?: string | null; compact?: boolean }> = ({ title, name, address, pin, phone, compact }) => {
  const area = useSearchArea();
  const [copied, setCopied] = useState(false);
  const away = pin && area ? formatDistance(metresBetween(area, pin)) : null;
  return (
    <section aria-label={title} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex items-start gap-2">
        <MapPin className="w-4 h-4 text-teal-700 mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">{title}</p>
          <p className="text-sm font-bold text-slate-900">{name}</p>
          <p className="text-xs text-slate-600">{address || 'Address not added yet.'}</p>
          {away && <p className="text-[11px] text-slate-500 mt-0.5">{away} from {area!.label.toLowerCase()} (straight line)</p>}
          {phone && <a href={`tel:${phone}`} className="text-xs font-bold text-teal-700">Call {phone}</a>}
        </div>
      </div>
      {pin ? (!compact && <MapPreview lat={pin.lat} lng={pin.lng} label={name} />) : (
        <p className="text-[11px] font-semibold text-amber-800 bg-amber-50 rounded-lg px-3 py-2 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> The map pin for this place isn’t confirmed by the business yet. Directions search by the address above; please check it before you leave.</p>
      )}
      <div className="flex flex-wrap gap-2">
        <a href={pin ? directionsUrl(pin) : addressSearchUrl(`${name}, ${address}`)} target="_blank" rel="noreferrer"
          className="px-3.5 py-2 rounded-xl bg-teal-700 text-white text-xs font-bold inline-flex items-center gap-1.5"><Navigation className="w-3.5 h-3.5" /> Get directions</a>
        {pin && isApple() && <a href={appleMapsUrl(pin, name)} target="_blank" rel="noreferrer" className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700">Apple Maps</a>}
        <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(`${name}, ${address}`); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ } }}
          className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 inline-flex items-center gap-1.5"><Copy className="w-3.5 h-3.5" /> {copied ? 'Copied' : 'Copy address'}</button>
      </div>
    </section>
  );
};

export default VisitLocation;
