import LocationBar from '../../components/location/LocationBar';
import {providerDistance} from '../../components/ProviderCard';
import type {ProviderItem} from '../../../services/types';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Droplets, LocateFixed, MapPin, Phone, RotateCcw } from 'lucide-react';
import { bloodAvailabilityApi, bloodCentresApi, bloodError, bloodReferenceApi, type AvailabilityResult, type BloodReference, type VerifiedBloodCentre } from '../../../services/bloodbankHelper';
import { getHealthProfileApi } from '../../../services/healthProfileHelper';
import { getProvidersApi } from '../../../services/patientHelper';
import { useSearchArea } from '../../../services/location';

// Find blood: which verified blood banks have the group/component right now. Shows availability
// only (never counts) — the blood bank confirms and needs a doctor's requisition before issuing.
const sel = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800';

const FindBloodScreen = () => {
  const [ref, setRef] = useState<BloodReference | null>(null);
  const [group, setGroup] = useState('');
  const [component, setComponent] = useState('');
  const [providers,setProviders]=useState<ProviderItem[]>([]);
  const area = useSearchArea();
  const groupEdited = useRef(false);
  const [directory, setDirectory] = useState<VerifiedBloodCentre[] | null>(null);
  const [retry, setRetry] = useState(0);
  const [referenceError, setReferenceError] = useState<string | null>(null);

  const [result, setResult] = useState<AvailabilityResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setReferenceError(null);
    bloodReferenceApi().then(async r => {
      if (!active) return;
      setRef(r);
      const hp = await getHealthProfileApi().catch(() => null);
      if (active && !groupEdited.current && hp?.blood_group && r.groups.some(x => x.code === hp.blood_group)) setGroup(hp.blood_group);
    }).catch(e => { if (active) setReferenceError(bloodError(e, 'Could not load blood groups.')); });
    return () => { active = false; };
  }, [retry]);

  useEffect(()=>{getProvidersApi('bloodbank').then(setProviders).catch(()=>setProviders([]));},[]);

  useEffect(() => {
    let active = true, sequence = 0;
    setDirectory(null); setResult(null);
    const load = async () => {
      const current = ++sequence;
      setLoading(true); setError(null);
      try {
        if (group) {
          const next = await bloodAvailabilityApi({ group, component });
          if (active && current === sequence) setResult(next);
        } else {
          const next = await bloodCentresApi();
          if (active && current === sequence) setDirectory(next.centres);
        }
      } catch (e) {
        if (active && current === sequence) setError(bloodError(e, group ? 'Could not check availability.' : 'Could not load verified blood banks.'));
      } finally { if (active && current === sequence) setLoading(false); }
    };
    void load();
    const timer = group ? window.setInterval(load, 20000) : undefined;
    return () => { active = false; if (timer) window.clearInterval(timer); };
  }, [group, component, retry]);

  const rawCentres = group ? result?.group === group ? result.centres : null : directory;
  const centres=rawCentres?.map(c=>{const p=providers.find(p=>p.id===c.partner_id);const d=p?providerDistance(p,area):null;return {...c,distance_km:d?Math.round(d.metres/100)/10:null};}).sort((a,b)=>(a.distance_km??Infinity)-(b.distance_km??Infinity));
  const compName = (c: string) => ref?.components.find((x) => x.code === c)?.name || c;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2"><Droplets className="w-6 h-6 text-rose-600" /> Find blood</h1>
        <nav aria-label="Blood services" className="flex flex-wrap gap-3 mt-3"><Link className="text-sm font-semibold underline" to="/blood-requests">My blood requests</Link><Link className="text-sm font-semibold underline" to="/donate-blood">Donate blood</Link></nav>
        <p className="text-sm text-slate-500 mt-1">Find verified blood banks. Choose a blood group to check availability, and call to confirm before you go.</p>
      </div>

      <div role="note" className="flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
        <AlertTriangle className="w-5 h-5 shrink-0" />
        <p><b>In an emergency, call 108 or go to the nearest hospital.</b> Blood is issued only against a doctor's or hospital's request and after cross-matching at the blood bank. Patients pay only government-set processing charges — blood is never sold.</p>
      </div>

      <section aria-label="Search blood" className="bg-white rounded-2xl border border-slate-200 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
        <label className="text-xs font-bold text-slate-700">Blood group
          <select aria-label="Blood group" value={group} onChange={(e) => { groupEdited.current = true; setGroup(e.target.value); }} className={`${sel} mt-1`} disabled={!ref}>
            <option value="">Choose group</option>
            {ref?.groups.map((g) => <option key={g.code} value={g.code}>{g.code} — {g.label}</option>)}
          </select>
        </label>
        <label className="text-xs font-bold text-slate-700">Component
          <select aria-label="Component" value={component} onChange={(e) => setComponent(e.target.value)} className={`${sel} mt-1`} disabled={!ref || !group}>
            <option value="">All components</option>
            {ref?.components.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </label>
        <LocationBar compact purpose="find blood banks near you"/>
      </section>

      {referenceError && <p role="alert" className="text-sm text-rose-700">{referenceError} <button onClick={() => setRetry(n => n + 1)} className="font-bold underline">Retry blood groups</button></p>}
      {loading && <p role="status" className="text-sm text-slate-500">{group ? 'Checking availability…' : 'Loading verified blood banks…'}</p>}
      {error ? (
        <div className="p-6 text-center space-y-2 bg-white rounded-2xl border border-slate-200"><p role="alert" className="text-sm font-bold text-rose-700">{error}</p><button onClick={() => setRetry(n => n + 1)} className="inline-flex items-center gap-1 text-sm font-bold"><RotateCcw className="w-4 h-4" /> Retry</button></div>
      ) : !centres ? null : !centres.length ? (
        <p role="status" className="text-sm text-slate-600 bg-white rounded-2xl border border-slate-200 p-6 text-center">{group ? 'No blood banks currently show availability for this group and component. Call a blood bank to confirm. In an emergency call 108.' : 'No verified blood banks on Vizito listed yet. In an emergency call 108.'}</p>
      ) : (
        <section aria-label="Blood banks" className="space-y-3">
          {centres.map((c) => (
            <article key={c.partner_id} aria-label={c.name} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-black text-slate-900">{c.name}</h2>
                  {(c.address || c.pincode || c.distance_km != null) && <p className="text-xs text-slate-500 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {[c.address, c.pincode, c.distance_km != null ? `${c.distance_km} km` : null].filter(Boolean).join(' · ')}</p>}
                </div>
                <div className="flex gap-2">
                  {c.phone && <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-sm font-bold text-white"><Phone className="w-4 h-4" /> Call</a>}
                  <Link to={`/request-blood?bank=${encodeURIComponent(c.partner_id)}&name=${encodeURIComponent(c.name)}&group=${encodeURIComponent(group)}${component ? `&component=${component}` : ''}`} className="inline-flex items-center rounded-xl border border-rose-200 px-3 py-2 text-sm font-bold text-rose-700">Request blood</Link>
                </div>
              </div>
              {group && result?.group === group && <ul className="flex flex-wrap gap-2">
                {result.components.map((k) => (
                  <li key={k} className={`rounded-full border px-3 py-1 text-xs font-bold ${result.centres.find(bank => bank.partner_id === c.partner_id)?.bands[k] === 'AVAILABLE' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                    {result.group} {compName(k)}: {result.centres.find(bank => bank.partner_id === c.partner_id)?.bands[k] === 'AVAILABLE' ? 'Available' : 'Not available'}
                  </li>
                ))}
              </ul>}
            </article>
          ))}
          <p className="text-xs text-slate-400">{group ? 'Availability is confirmed by the blood bank and may change. Sending a request does not reserve blood.' : 'Choose a blood group to check availability.'}</p>
        </section>
      )}
    </div>
  );
};

export default FindBloodScreen;
