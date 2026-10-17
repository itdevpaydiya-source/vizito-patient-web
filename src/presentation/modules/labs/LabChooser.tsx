import { useMemo, useState } from 'react';
import FavoriteButton from '../../components/FavoriteButton';
import { ShieldCheck, Home, Clock, MapPin, Search, ChevronDown, CheckCircle2 } from 'lucide-react';
import { rupees, type LabHit } from '../../../services/labHelper';
import { useSearchArea, nearest, formatDistance } from '../../../services/location';
import LocationBar from '../../components/location/LocationBar';

// Compare labs for the chosen tests. Built for many labs: search by name, sort (price / report
// time), a home-collection filter, five at a time. Each card answers what a patient decides on:
// total price, when the report comes, its registration and who signs reports, where, and home collection.
type Sort = 'PRICE' | 'FAST' | 'NEAR';
const PAGE = 5;
const hrs = (h: number) => (h <= 0 ? '—' : h < 24 ? `${h} h` : h % 24 === 0 ? `${h / 24} day${h === 24 ? '' : 's'}` : `${h} h`);

export default function LabChooser({ labs, error, onRetry, city, onCity, selectedId, onSelect, pinnedId }: {
  labs: LabHit[] | null; error?: string | null; onRetry?: () => void; pinnedId?: string | null; city: string; onCity: (v: string) => void; selectedId: string | null; onSelect: (l: LabHit) => void;
}) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('PRICE');
  const [homeOnly, setHomeOnly] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [open, setOpen] = useState<string | null>(null);
  // Distance to each lab's nearest centre with a confirmed pin (straight line, from the patient's chosen area).
  const area = useSearchArea();
  const distOf = useMemo(() => new Map((labs || []).map((l) => [l.id, nearest(area, l.locations)] as const)), [labs, area]);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (labs || [])
      .filter((l) => (!s || l.name.toLowerCase().includes(s)) && (!homeOnly || l.settings?.home.enabled))
      .sort((a, b) => (a.id === pinnedId ? -1 : b.id === pinnedId ? 1 : 0)
        || (sort === 'NEAR' ? (distOf.get(a.id)?.metres ?? Infinity) - (distOf.get(b.id)?.metres ?? Infinity) : sort === 'PRICE' ? a.total - b.total : (a.report_hours || 0) - (b.report_hours || 0))
        || a.total - b.total);
  }, [labs, q, sort, homeOnly, pinnedId, distOf]);
  const cheapest = list.length ? Math.min(...list.map((l) => l.total)) : 0;
  const fastest = list.length ? Math.min(...list.map((l) => l.report_hours || Infinity)) : 0;
  const field = 'rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10';

  return (
    <div className="space-y-3">
      <LocationBar compact purpose="see how far each lab is" />
      <div className="grid gap-2 sm:grid-cols-2">
        <input aria-label="City or area" value={city} onChange={(e) => { onCity(e.target.value.replace(/[^A-Za-z .-]/g, '')); setShown(PAGE); }} placeholder="City or area (e.g. Kondapur)" className={field} />
        <label className="relative block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input aria-label="Search labs" value={q} onChange={(e) => { setQ(e.target.value); setShown(PAGE); }} placeholder="Search a lab by name" className={`${field} w-full pl-9`} />
        </label>
      </div>
      {labs && labs.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-slate-500">Sort</span>
          {([['PRICE', 'Lowest price'], ['FAST', 'Fastest report'], ...(area ? [['NEAR', 'Nearest']] : [])] as [Sort, string][]).map(([k, label]) => (
            <button key={k} type="button" aria-pressed={sort === k} onClick={() => setSort(k)} className={`px-3 py-1 rounded-full border font-bold ${sort === k ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>{label}</button>
          ))}
          <button type="button" aria-pressed={homeOnly} onClick={() => { setHomeOnly(!homeOnly); setShown(PAGE); }} className={`px-3 py-1 rounded-full border font-bold inline-flex items-center gap-1 ${homeOnly ? 'bg-teal-700 text-white border-teal-700' : 'bg-white text-slate-600 border-slate-200'}`}><Home className="w-3.5 h-3.5" /> Home collection</button>
          <span className="ml-auto text-slate-500 font-semibold">{list.length} lab{list.length === 1 ? '' : 's'}</span>
        </div>
      )}
      {error ? (
        <div role="alert" className="text-sm bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3"><span className="font-semibold text-rose-800">{error}</span>{onRetry && <button type="button" onClick={onRetry} className="text-xs font-bold text-rose-800 underline">Try again</button>}</div>
      ) : !labs ? <p className="text-sm text-slate-400">Finding labs…</p> : !list.length ? (
        <p className="text-sm text-slate-500 bg-slate-50 rounded-xl px-4 py-3">{labs.length ? 'No lab matches these filters.' : `No lab offers all of these tests${city ? ` in ${city}` : ''} yet. Try fewer tests or another area.`}</p>
      ) : (
        <ul className="space-y-2" aria-label="Labs">
          {list.slice(0, shown).map((l) => {
            const sel = selectedId === l.id;
            const home = l.settings?.home;
            const nd = distOf.get(l.id); const near = nd?.place || l.locations[0];
            return (
              <li key={l.id} className={`relative rounded-xl border transition ${sel ? 'border-teal-600 ring-2 ring-teal-600/20 bg-teal-50/30' : 'border-slate-200 hover:border-teal-300 bg-white'}`}>
                <FavoriteButton partnerId={l.id} name={l.name} className="absolute top-2.5 right-2.5 z-10" />
                <button type="button" onClick={() => onSelect(l)} aria-pressed={sel} className="w-full text-left p-3 pr-14 flex gap-3">
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-slate-900">{l.name}</span>
                      {l.id === pinnedId && <span className="text-[10px] font-bold text-white bg-teal-700 rounded-full px-1.5 py-0.5">Your doctor’s hospital lab</span>}
                      {l.hospital_lab && l.id !== pinnedId && <span className="text-[10px] font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 rounded-full px-1.5 py-0.5">Hospital lab</span>}
                      {l.total === cheapest && list.length > 1 && <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full px-1.5 py-0.5">Lowest price</span>}
                      {(l.report_hours || Infinity) === fastest && list.length > 1 && <span className="text-[10px] font-bold text-sky-800 bg-sky-50 border border-sky-200 rounded-full px-1.5 py-0.5">Fastest report</span>}
                    </span>
                    <span className="block text-[11px] font-semibold text-emerald-800 mt-0.5 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 shrink-0" /> Registered lab{l.registration_number ? ` · Reg. ${l.registration_number}` : ''} · reports signed by a Vizito-verified pathologist</span>
                    <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600">
                      <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Report in {hrs(l.report_hours || 0)}</span>
                      {near && <span className="inline-flex items-center gap-1 min-w-0"><MapPin className="w-3.5 h-3.5 shrink-0" /><span className="truncate max-w-[220px]">{near.name}{near.city ? `, ${near.city}` : ''}</span>{nd && <b className="ml-1 text-teal-800 shrink-0" title="Straight-line distance">· {formatDistance(nd.metres)}</b>}{l.locations.length > 1 && <span className="text-slate-400"> +{l.locations.length - 1}</span>}</span>}
                      {home?.enabled && <span className="inline-flex items-center gap-1"><Home className="w-3.5 h-3.5" />Home collection {home.fee ? `+${rupees(home.fee)}` : 'free'}</span>}
                    </span>
                  </span>
                  <span className="text-right shrink-0">
                    {l.prices_vary && <span className="block text-[10px] font-semibold text-slate-500">from</span>}
                    <span className="block text-lg font-black text-slate-900 tabular-nums">{rupees(l.total)}</span>
                    <span className="block text-[11px] text-slate-500">{l.selected.length} test{l.selected.length === 1 ? '' : 's'}</span>
                    {sel && <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-teal-800"><CheckCircle2 className="w-3.5 h-3.5" /> Selected</span>}
                  </span>
                </button>
                {l.selected.length > 1 && (
                  <div className="px-3 pb-2 -mt-1">
                    <button type="button" onClick={() => setOpen(open === l.id ? null : l.id)} className="text-[11px] font-bold text-slate-500 inline-flex items-center gap-0.5">Price per test <ChevronDown className={`w-3.5 h-3.5 ${open === l.id ? 'rotate-180' : ''}`} /></button>
                    {open === l.id && <ul className="mt-1 grid sm:grid-cols-2 gap-x-4 text-[11px] text-slate-600">{l.selected.map((s) => <li key={s.code} className="flex justify-between"><span>{s.name}</span><span className="tabular-nums">{rupees(s.price)}</span></li>)}</ul>}
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
