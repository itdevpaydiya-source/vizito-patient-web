import React, { useState } from 'react';
import { LocateFixed, MapPin, Search, X, Loader2 } from 'lucide-react';
import { useSearchArea, setSearchArea, locateOnce, findPlaces, locationWasDenied, LOCATE_ERROR_TEXT, type LocateError } from '../../../services/location';

// "Distances from: Your current location · Change". The patient chooses: use their location (asked
// only on this tap) or type an area / PIN code. Search works without either; distances just aren't shown.
const LocationBar: React.FC<{ purpose?: string; compact?: boolean }> = ({ purpose = 'see how far each place is', compact }) => {
  const area = useSearchArea();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<{ label: string; lat: number; lng: number }[] | null>(null);

  const useGps = async () => {
    setBusy(true); setErr(null);
    try { setSearchArea(await locateOnce()); setOpen(false); }
    catch (e) { setErr(LOCATE_ERROR_TEXT[(e as LocateError)] || LOCATE_ERROR_TEXT.unavailable); setOpen(true); }
    finally { setBusy(false); }
  };
  const search = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (q.trim().length < 3) { setErr('Type at least 3 letters, or a 6-digit PIN code.'); return; }
    setBusy(true); setErr(null);
    try { const r = await findPlaces(/^\d{6}$/.test(q.trim()) ? `${q.trim()}, India` : q); setResults(r); if (!r.length) setErr('No matching place in India. Try a nearby locality or the PIN code.'); }
    catch { setErr('Place search is unavailable right now. You can still browse without distances.'); }
    finally { setBusy(false); }
  };

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white ${compact ? 'px-3 py-2' : 'px-4 py-3'} space-y-2`} aria-label="Search area">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <MapPin className="w-4 h-4 text-teal-700 shrink-0" />
        {area ? (
          <span className="text-slate-700">Distances from <b className="text-slate-900">{area.label}</b>{area.source === 'gps' && area.accuracy ? <span className="text-slate-400 text-xs"> (±{area.accuracy > 999 ? `${Math.round(area.accuracy / 1000)} km` : `${area.accuracy} m`})</span> : null}</span>
        ) : (
          <span className="text-slate-600">Set your location to {purpose}.</span>
        )}
        <span className="flex-1" />
        {!area && !open && (
          <button type="button" onClick={useGps} disabled={busy} className="px-3 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-bold inline-flex items-center gap-1 disabled:opacity-60">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5" />} {locationWasDenied() ? 'Try my location again' : 'Use my location'}
          </button>
        )}
        <button type="button" onClick={() => { setOpen((o) => !o); setErr(null); }} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700">{area ? 'Change' : 'Type area or PIN'}</button>
        {area && <button type="button" aria-label="Clear location" onClick={() => setSearchArea(null)} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-3.5 h-3.5 text-slate-500" /></button>}
      </div>
      {err && <p role="alert" className="text-xs font-semibold text-amber-800 bg-amber-50 rounded-lg px-3 py-2">{err}</p>}
      {open && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={useGps} disabled={busy} className="px-3 py-2 rounded-lg bg-teal-700 text-white text-xs font-bold inline-flex items-center gap-1 disabled:opacity-60"><LocateFixed className="w-3.5 h-3.5" /> Use my current location</button>
            <form onSubmit={search} className="flex-1 min-w-[14rem] flex gap-2">
              <input aria-label="Area, locality or PIN code" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Area, locality or PIN code (e.g. Madhapur or 500081)"
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold outline-none focus:border-teal-500" />
              <button type="submit" disabled={busy} className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 inline-flex items-center gap-1"><Search className="w-3.5 h-3.5" /> Search</button>
            </form>
          </div>
          {results && results.length > 0 && (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200" aria-label="Matching places">
              {results.map((r) => (
                <li key={`${r.lat},${r.lng}`}><button type="button" onClick={() => { setSearchArea({ ...r, source: 'manual', at: Date.now() }); setOpen(false); setResults(null); setQ(''); }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50">{r.label}</button></li>
              ))}
            </ul>
          )}
          <p className="text-[11px] text-slate-400">Your location stays on this device; it isn’t saved to your account or shared with providers. Place search by OpenStreetMap.</p>
        </div>
      )}
    </div>
  );
};

export default LocationBar;
