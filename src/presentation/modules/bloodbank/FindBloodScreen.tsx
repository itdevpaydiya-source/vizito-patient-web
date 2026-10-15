import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Droplets, LocateFixed, MapPin, Phone, RotateCcw } from 'lucide-react';
import { bloodAvailabilityApi, bloodError, bloodReferenceApi, type AvailabilityResult, type BloodReference } from '../../../services/bloodbankHelper';
import { getHealthProfileApi } from '../../../services/healthProfileHelper';

// Find blood: which verified blood banks have the group/component right now. Shows availability
// only (never counts) — the blood bank confirms and needs a doctor's requisition before issuing.
const sel = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800';

const FindBloodScreen = () => {
  const [ref, setRef] = useState<BloodReference | null>(null);
  const [group, setGroup] = useState('');
  const [component, setComponent] = useState('');
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [locMsg, setLocMsg] = useState<string | null>(null);
  const [result, setResult] = useState<AvailabilityResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await bloodReferenceApi();
        setRef(r);
        // Pre-fill from the health profile when the patient has saved a group; they can change it.
        const hp = await getHealthProfileApi().catch(() => null);
        const g = hp?.blood_group && r.groups.some((x) => x.code === hp.blood_group) ? hp.blood_group : '';
        if (g) setGroup((current) => current || g); // never overwrite a group the patient already picked
      } catch (e) { setError(bloodError(e, 'Could not load blood groups.')); }
    })();
  }, []);

  const search = useCallback(async () => {
    if (!group) return;
    setLoading(true); setError(null);
    try { setResult(await bloodAvailabilityApi({ group, component, lat: point?.lat, lng: point?.lng })); }
    catch (e) { setError(bloodError(e, 'Could not check availability.')); }
    finally { setLoading(false); }
  }, [group, component, point]);
  useEffect(() => { search(); }, [search]);
  useEffect(() => {
    if (!group) return;
    const t = window.setInterval(search, 20000);
    return () => window.clearInterval(t);
  }, [group, search]);

  const locate = () => {
    if (!navigator.geolocation) { setLocMsg('Location is not available on this device.'); return; }
    setLocMsg('Finding your location…');
    navigator.geolocation.getCurrentPosition(
      (p) => { setPoint({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocMsg('Sorted by distance from you.'); },
      () => setLocMsg('Location permission was not given. Showing all blood banks.'),
      { timeout: 10000 },
    );
  };

  const compName = (c: string) => ref?.components.find((x) => x.code === c)?.name || c;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2"><Droplets className="w-6 h-6 text-rose-600" /> Find blood</h1>
        <p className="text-sm text-slate-500 mt-1">See which verified blood banks have blood available now. Call the blood bank to confirm before you go.</p>
      </div>

      <div role="note" className="flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
        <AlertTriangle className="w-5 h-5 shrink-0" />
        <p><b>In an emergency, call 108 or go to the nearest hospital.</b> Blood is issued only against a doctor's or hospital's request and after cross-matching at the blood bank. Patients pay only government-set processing charges — blood is never sold.</p>
      </div>

      <section aria-label="Search blood" className="bg-white rounded-2xl border border-slate-200 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
        <label className="text-xs font-bold text-slate-700">Blood group
          <select aria-label="Blood group" value={group} onChange={(e) => setGroup(e.target.value)} className={`${sel} mt-1`} disabled={!ref}>
            <option value="">Choose group</option>
            {ref?.groups.map((g) => <option key={g.code} value={g.code}>{g.code} — {g.label}</option>)}
          </select>
        </label>
        <label className="text-xs font-bold text-slate-700">Component
          <select aria-label="Component" value={component} onChange={(e) => setComponent(e.target.value)} className={`${sel} mt-1`} disabled={!ref}>
            <option value="">All components</option>
            {ref?.components.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </label>
        <button onClick={locate} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-700"><LocateFixed className="w-4 h-4" /> Near me</button>
        {locMsg && <p className="text-xs text-slate-500 sm:col-span-3">{locMsg}</p>}
      </section>

      {error ? (
        <div className="p-6 text-center space-y-2 bg-white rounded-2xl border border-slate-200"><p className="text-sm font-bold text-rose-700">{error}</p><button onClick={search} className="inline-flex items-center gap-1 text-sm font-bold"><RotateCcw className="w-4 h-4" /> Retry</button></div>
      ) : !group ? (
        <p className="text-sm text-slate-500 bg-white rounded-2xl border border-slate-200 p-6 text-center">Choose the blood group you need to see which blood banks have it.</p>
      ) : !result ? <p className="text-sm text-slate-400">Checking…</p> : !result.centres.length ? (
        <p className="text-sm text-slate-600 bg-white rounded-2xl border border-slate-200 p-6 text-center">No verified blood banks are listed on Vizito yet in your area. Call 108 or your nearest hospital's blood bank.</p>
      ) : (
        <section aria-label="Blood banks" className="space-y-3">
          {result.centres.map((c) => (
            <article key={c.partner_id} aria-label={c.name} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-black text-slate-900">{c.name}</h2>
                  {c.address && <p className="text-xs text-slate-500 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {c.address}{c.pincode ? ` — ${c.pincode}` : ''}{c.distance_km != null ? ` · ${c.distance_km} km` : ''}</p>}
                </div>
                <div className="flex gap-2">
                  {c.phone && <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-sm font-bold text-white"><Phone className="w-4 h-4" /> Call</a>}
                  <Link to={`/request-blood?bank=${encodeURIComponent(c.partner_id)}&name=${encodeURIComponent(c.name)}&group=${encodeURIComponent(result.group)}${component ? `&component=${component}` : ''}`} className="inline-flex items-center rounded-xl border border-rose-200 px-3 py-2 text-sm font-bold text-rose-700">Request blood</Link>
                </div>
              </div>
              <ul className="flex flex-wrap gap-2">
                {result.components.map((k) => (
                  <li key={k} className={`rounded-full border px-3 py-1 text-xs font-bold ${c.bands[k] === 'AVAILABLE' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                    {result.group} {compName(k)}: {c.bands[k] === 'AVAILABLE' ? 'Available' : 'Not available'}
                  </li>
                ))}
              </ul>
            </article>
          ))}
          <p className="text-xs text-slate-400">Availability updates as the blood bank changes its stock. It is not a reservation.</p>
        </section>
      )}
    </div>
  );
};

export default FindBloodScreen;
