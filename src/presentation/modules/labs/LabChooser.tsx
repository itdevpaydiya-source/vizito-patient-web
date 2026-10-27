import LocationBar from '../../components/location/LocationBar';
import { useMemo, useState, useEffect } from 'react';
import FavoriteButton from '../../components/FavoriteButton';
import { ShieldCheck, Home, Clock, MapPin, Search, ChevronDown, CheckCircle2, FlaskConical, LocateFixed, X } from 'lucide-react';
import { rupees, type LabHit } from '../../../services/labHelper';
import { useSearchArea, nearest, type LatLng } from '../../../services/location';
import {comparisonDistance, centreLocality, validPin, homeCollection, nextAvailable} from './labComparisonDetails';
import './LabComparison.css';

// Compare labs for the chosen tests. Built for many labs: search by name, sort (price / report
// time), a home-collection filter, five at a time. Each card answers what a patient decides on:
// total price, when the report comes, its registration and who signs reports, where, and home collection.
type Sort = 'PRICE' | 'FAST' | 'NEAR';
const PAGE = 5;
const hrs = (h: number) => (h <= 0 ? '—' : h < 24 ? `${h} h` : h % 24 === 0 ? `${h / 24} day${h === 24 ? '' : 's'}` : `${h} h`);

export default function LabChooser({ labs, error, onRetry, city, onCity, selectedId, onSelect, pinnedId, resetKey=0, onVisibilityChange, savedLocation, patientPin }: {
  savedLocation?: (LatLng & {label:string}) | null; patientPin?:string|null; resetKey?:number;onVisibilityChange?:(hidden:boolean)=>void;
  labs: LabHit[] | null; error?: string | null; onRetry?: () => void; pinnedId?: string | null; city: string; onCity: (v: string) => void; selectedId: string | null; onSelect: (l: LabHit) => void;
}) {

  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('PRICE');
  const [filtersOpen,setFiltersOpen]=useState(false);
  const [homeOnly, setHomeOnly] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [open, setOpen] = useState<string | null>(null);
  // Distance to each lab's nearest centre with a confirmed pin (straight line, from the patient's chosen area).
  const chosenArea = useSearchArea();
  useEffect(()=>setSort(chosenArea?'NEAR':'PRICE'),[chosenArea]);
  const area = chosenArea;
  const distOf = useMemo(() => new Map((labs || []).map((l) => [l.id, nearest(validPin(area)?area:null, l.locations.filter(c=>validPin(c.pin)))] as const)), [labs, area]);
  useEffect(()=>{setQ('');setHomeOnly(false);setShown(PAGE);},[resetKey]);
  const clearFilters=()=>{setQ('');setHomeOnly(false);onCity('');setShown(PAGE);};
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (labs || [])
      .filter((l) => (!s || l.name.toLowerCase().includes(s)) && (!city.trim() || l.locations.some(c=>`${c.city||''} ${c.address||''}`.toLowerCase().includes(city.trim().toLowerCase()))) && (!homeOnly || l.settings?.home?.enabled))
      .sort((a, b) => (sort === 'NEAR' ? ((distOf.get(a.id)?.metres??Infinity)-(distOf.get(b.id)?.metres??Infinity)) : sort === 'PRICE' ? ((typeof a.total==='number'&&Number.isFinite(a.total)&&a.total>=0?a.total:Infinity) - (typeof b.total==='number'&&Number.isFinite(b.total)&&b.total>=0?b.total:Infinity)) : (a.report_hours && a.report_hours > 0 ? a.report_hours : Infinity) - (b.report_hours && b.report_hours > 0 ? b.report_hours : Infinity))
        || (a.id === pinnedId ? -1 : b.id === pinnedId ? 1 : 0) || ((typeof a.total==='number'&&Number.isFinite(a.total)&&a.total>=0?a.total:Infinity) - (typeof b.total==='number'&&Number.isFinite(b.total)&&b.total>=0?b.total:Infinity)));
  }, [labs, q, sort, homeOnly, pinnedId, city, distOf]);
  useEffect(()=>{onVisibilityChange?.(!!selectedId && !!labs && !list.some(l=>l.id===selectedId));},[selectedId,labs,list,onVisibilityChange]);
  const priced=list.filter(l=>typeof l.total==='number'&&Number.isFinite(l.total)&&l.total>=0);
  const timed=list.filter(l=>typeof l.report_hours==='number'&&Number.isFinite(l.report_hours)&&l.report_hours>0);
  const cheapest=priced.length ? Math.min(...priced.map(l=>l.total)) : null;
  const fastest=timed.length ? Math.min(...timed.map(l=>l.report_hours!)) : null;
  const uniquePrice=priced.length>1 && priced.filter(l=>l.total===cheapest).length===1;
  const uniqueTime=timed.length>1 && timed.filter(l=>l.report_hours===fastest).length===1;
  const field = 'rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10';

  return (
    <div className="space-y-3">
      <LocationBar compact purpose="find nearby labs"/>
      <label className="lab-comparison-search"><Search size={17} aria-hidden="true"/><input aria-label="Search labs" value={q} onChange={e=>{setQ(e.target.value);setShown(PAGE);}} placeholder="Search labs by name"/></label>
      {labs && labs.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-slate-500">Sort</span>
          {([['PRICE', 'Lowest price'], ['NEAR','Nearest'], ['FAST', 'Fastest report']] as [Sort, string][]).map(([k, label]) => (
            <button key={k} type="button" aria-pressed={sort === k} onClick={() => setSort(k)} className={`px-3 py-1 rounded-full border font-bold ${sort === k ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>{label}</button>
          ))}

          <span className="ml-auto text-slate-500 font-semibold">{list.length} lab{list.length === 1 ? '' : 's'}</span>
        </div>
      )}
      <div className="lab-comparison-filters"><button type="button" aria-expanded={filtersOpen} onClick={()=>setFiltersOpen(!filtersOpen)}>Filters{homeOnly?' (1)':''}</button>{filtersOpen && <div role="group" aria-label="Lab filters">          <button type="button" aria-pressed={homeOnly} onClick={() => { setHomeOnly(!homeOnly); setShown(PAGE); }} className={`px-3 py-1 rounded-full border font-bold inline-flex items-center gap-1 ${homeOnly ? 'bg-teal-700 text-white border-teal-700' : 'bg-white text-slate-600 border-slate-200'}`}><Home className="w-3.5 h-3.5" /> Home collection available</button></div>}{(q||city||homeOnly)&&<button type="button" onClick={clearFilters}>Clear filters</button>}</div>
      {error ? (
        <div role="alert" className="text-sm bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3"><span className="font-semibold text-rose-800">{error}</span>{onRetry && <button type="button" onClick={onRetry} className="text-xs font-bold text-rose-800 underline">Try again</button>}</div>
      ) : !labs ? <p className="text-sm text-slate-400">Finding labs…</p> : !list.length ? (
        <p className="text-sm text-slate-500 bg-slate-50 rounded-xl px-4 py-3">{labs.length ? 'No lab matches these filters.' : `No lab offers all of these tests${city ? ` in ${city}` : ''} yet. Try fewer tests or another area.`}<button type="button" onClick={clearFilters} className="ml-2 underline font-semibold">Clear filters</button></p>
      ) : (
        <ul className="space-y-2" aria-label="Labs">
          {list.slice(0, shown).map((l) => {
            const sel = selectedId === l.id;
            const home = homeCollection(l,chosenArea?(chosenArea.label.match(/\b\d{6}\b/)?.[0]||null):patientPin);
            const nd = distOf.get(l.id); const near = nd?.place || l.locations[0];
            return (
              <li key={l.id} className={`relative rounded-xl border transition ${sel ? 'border-teal-600 ring-2 ring-teal-600/20 bg-teal-50/30' : 'border-slate-200 hover:border-teal-300 bg-white'}`}>
                <FavoriteButton partnerId={l.id} name={l.name} className="absolute bottom-2.5 right-2.5 z-10" />
                <div className="lab-choice-main">
                  <input type="radio" name="diagnostic-lab" aria-label={`Select ${l.name}`} checked={sel} onChange={()=>onSelect(l)}/>
                  <span className="lab-choice-icon">{l.logo_url?<img src={l.logo_url} alt=""/>:<FlaskConical size={24} aria-hidden="true"/>}</span>
                  <div className="lab-choice-details">
                    <div className="lab-choice-title"><strong>{l.name}</strong>{sel&&<span className="lab-selected-pill">Selected</span>}{l.total===cheapest&&uniquePrice&&<span className="lab-best-pill">Lowest price</span>}{l.report_hours===fastest&&uniqueTime&&<span className="lab-best-pill">Fastest report</span>}</div>
                    {l.rating&&l.rating.count>0&&Number.isFinite(l.rating.average)&&<p className="lab-rating">{"\u2605"} {l.rating.average} ({l.rating.count} reviews)</p>}
                    {near&&<p>{centreLocality(l.name,near)}{nd&&` \u00b7 ${comparisonDistance(nd.metres)} away (approx.)`}</p>}
                    {l.registration_number&&<p className="lab-registration">Reg. no. {l.registration_number}</p>}
                    {l.nabl&&Number.isFinite(new Date(l.nabl.valid_until).getTime())&&<p className="lab-registration">NABL cert. {l.nabl.cert_no} {"\u00b7"} valid till {new Date(l.nabl.valid_until).toLocaleDateString('en-GB',{month:'short',year:'numeric',timeZone:'Asia/Kolkata'})}</p>}
                    {validPin(near?.pin)&&<a href={`https://www.google.com/maps/search/?api=1&query=${near.pin.lat},${near.pin.lng}`} target="_blank" rel="noreferrer">View on map</a>}
                  </div>
                  <div className="lab-choice-info">
                    {typeof l.report_hours==='number'&&Number.isFinite(l.report_hours)&&l.report_hours>0&&<p>Report: about {l.report_hours} hours <small>Estimated</small></p>}
                    {home&&<p>Home collection: {home}</p>}
                    {nextAvailable(l.next_available)&&<p>Next available: {nextAvailable(l.next_available)}</p>}
                  </div>
                  <div className="lab-choice-price">{l.prices_vary&&<small>from</small>}{typeof l.total==='number'&&Number.isFinite(l.total)&&l.total>=0&&<strong>{rupees(l.total)}</strong>}<small>for {l.selected.length} {l.selected.length===1?'test':'tests'}</small></div>
                </div>
                {l.selected.length > 0 && (
                  <div className="px-3 pb-2 -mt-1">
                    <button type="button" onClick={() => setOpen(open === l.id ? null : l.id)} aria-expanded={open === l.id} className="text-xs font-bold text-slate-500 inline-flex items-center gap-0.5">View breakdown <ChevronDown className={`w-3.5 h-3.5 ${open === l.id ? 'rotate-180' : ''}`} /></button>
                    {open === l.id && <ul className="mt-1 grid sm:grid-cols-2 gap-x-4 text-xs text-slate-600">{l.selected.map((s) => <li key={s.code} className="flex justify-between"><span>{s.name}</span><span className="tabular-nums">{typeof s.price==='number'&&Number.isFinite(s.price)?rupees(s.price):null}</span></li>)}</ul>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {list.length > shown && <button type="button" onClick={() => setShown(shown + PAGE)} className="w-full py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50">Show {Math.min(PAGE, list.length - shown)} more labs ({list.length - shown} left)</button>}
    </div>
  );
}
