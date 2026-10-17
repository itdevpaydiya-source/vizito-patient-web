import React, { useState } from 'react';
import { LocateFixed, Loader2, X } from 'lucide-react';
import MapPreview from './MapPreview';
import { locateOnce, LOCATE_ERROR_TEXT, type LocateError, type LatLng } from '../../../services/location';

// Optional: pin the home so the collector / nurse can navigate to the exact door. Only the business
// handling this booking sees it. The written address stays the main instruction.
const HomePinField: React.FC<{ value: LatLng | null; onChange: (p: LatLng | null) => void; who: string }> = ({ value, onChange, who }) => {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [acc, setAcc] = useState<number | null>(null);
  const pin = async () => {
    setBusy(true); setErr(null);
    try { const a = await locateOnce(); setAcc(a.accuracy ?? null); onChange({ lat: +a.lat.toFixed(7), lng: +a.lng.toFixed(7) }); }
    catch (e) { setErr(LOCATE_ERROR_TEXT[e as LocateError] || LOCATE_ERROR_TEXT.unavailable); }
    finally { setBusy(false); }
  };
  return (
    <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2" aria-label="Home pin">
      {!value ? (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={pin} disabled={busy} className="px-3 py-1.5 rounded-lg border border-teal-600 text-teal-800 text-xs font-bold inline-flex items-center gap-1 disabled:opacity-60">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5" />} I’m at home now — pin my location
          </button>
          <span className="text-[11px] text-slate-500">Optional. Helps the {who} reach your door. Only they see it.</span>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-slate-800">Home pinned{acc ? <span className="font-semibold text-slate-500"> (±{acc} m)</span> : null}</p>
            <button type="button" onClick={() => { onChange(null); setAcc(null); }} className="text-xs font-bold text-slate-600 inline-flex items-center gap-1"><X className="w-3.5 h-3.5" /> Remove pin</button>
          </div>
          <MapPreview lat={value.lat} lng={value.lng} label="Your home" height={150} zoom={17} />
          {acc != null && acc > 80 && <p className="text-[11px] font-semibold text-amber-800">GPS is only accurate to about {acc} m here; the {who} will also use your written address.</p>}
        </>
      )}
      {err && <p role="alert" className="text-[11px] font-semibold text-amber-800">{err}</p>}
    </div>
  );
};

export default HomePinField;
