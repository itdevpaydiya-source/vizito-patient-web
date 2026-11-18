/**
 * Home care › search (approved design 18 Nov, "Home Care Search" canvas, artboards 2 + 3).
 * Exact matches first, then related care; filters (type of care, today, price, visit or shift),
 * sort (relevance / soonest / price) and "Show more". Every Book opens the existing booking flow.
 * State lives in the URL (?q=&pincode=&care=&today=&price=&kind=&sort=) so Back and links work.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronRight, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { hcCatalogueApi, type HcService } from '../../../services/homecareHelper';
import { homeVisitDoctorsApi, labError, type HomeVisitDoctor } from '../../../services/labHelper';
import { CarePlaceBar, EmergencyNote, ResultCard, ResultRow } from './CareParts';
import { card } from './careFormat';
import { CARE_LABEL, hitPrice, hitSoonest, searchHomeCare, type CareType, type SearchHit } from './careSearchLogic';
import { useCarePlace } from './useCarePlace';

const PAGE = 10;
const PRICES = [{ k: '', label: 'Any price' }, { k: 'u700', label: 'Up to ₹700' }, { k: '700-1000', label: '₹700 – ₹1,000' }, { k: 'o1000', label: 'Above ₹1,000' }] as const;
const priceOk = (k: string, p: number) => k === 'u700' ? p <= 700 : k === '700-1000' ? p >= 700 && p <= 1000 : k === 'o1000' ? p > 1000 : true;
const CARES: CareType[] = ['DOCTOR', 'NURSING', 'PHYSIOTHERAPY', 'CAREGIVER'];

export default function HomeCareSearch() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const care = (params.get('care') || '').split(',').filter(Boolean) as CareType[];
  const today = params.get('today') === '1';
  const price = params.get('price') || '';
  const kind = params.get('kind') || '';
  const sort = params.get('sort') || 'relevance';
  const set = (k: string, v: string) => setParams((p) => { const n = new URLSearchParams(p); if (v) n.set(k, v); else n.delete(k); return n; }, { replace: true });

  const { saved, place, setPlace } = useCarePlace(params.get('pincode'));
  const [text, setText] = useState(q);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- keep the box in step with Back/links
  useEffect(() => { setText(q); }, [q]);
  // Results follow the typing (300 ms pause), like any shopping search.
  useEffect(() => { const t = setTimeout(() => { if (text.trim() !== q) set('q', text.trim()); }, 300); return () => clearTimeout(t); }, [text]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (place?.pincode && params.get('pincode') !== place.pincode) set('pincode', place.pincode); }, [place?.pincode]); // eslint-disable-line react-hooks/exhaustive-deps

  const [services, setServices] = useState<HcService[] | null>(null);
  const [doctors, setDoctors] = useState<HomeVisitDoctor[] | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [shown, setShown] = useState(PAGE);
  const [filtersOpen, setFiltersOpen] = useState(false);
  useEffect(() => {
    if (!place?.pincode) return;
    let alive = true;
    Promise.all([
      hcCatalogueApi(place.pincode, undefined, place.lat, place.lng).then((r) => r.services),
      homeVisitDoctorsApi(place.pincode).catch(() => [] as HomeVisitDoctor[]),
    ]).then(([s, d]) => { if (alive) { setServices(s); setDoctors(d); setError(''); } })
      .catch((e) => { if (alive) { setServices([]); setDoctors([]); setError(labError(e, 'Search could not load. Check your connection and retry.')); } });
    return () => { alive = false; setServices(null); setDoctors(null); };
  }, [place?.pincode, place?.lat, place?.lng, retry]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- a new search starts at page 1
  useEffect(() => { setShown(PAGE); }, [q, params]);

  const base = useMemo(() => (services && doctors ? searchHomeCare(services, doctors, q) : null), [services, doctors, q]);
  const pass = (h: SearchHit) => (!care.length || care.includes(h.care)) && (!today || hitSoonest(h) < (24 - new Date().getHours()) * 60) && priceOk(price, hitPrice(h))
    && (!kind || (h.type === 'service' ? h.s.kind === kind : kind === 'VISIT'));
  const order = (list: SearchHit[]) => sort === 'price' ? [...list].sort((a, b) => hitPrice(a) - hitPrice(b)) : sort === 'soonest' ? [...list].sort((a, b) => hitSoonest(a) - hitSoonest(b)) : list;
  const exact = base ? order(base.exact.filter(pass)) : null;
  const related = base ? order(base.related.filter(pass)) : null;
  const counts = (c: CareType) => (base ? [...base.exact, ...base.related].filter((h) => h.care === c).length : 0);
  const active = care.length + (today ? 1 : 0) + (price ? 1 : 0) + (kind ? 1 : 0);
  const clearFilters = () => setParams((p) => { const n = new URLSearchParams(p); ['care', 'today', 'price', 'kind', 'sort'].forEach((k) => n.delete(k)); return n; }, { replace: true });
  const toggleCare = (c: CareType) => set('care', (care.includes(c) ? care.filter((x) => x !== c) : [...care, c]).join(','));
  const where = place ? (place.area || place.label) : '';
  const loading = !!place && !base;
  const pin = place?.pincode || '';

  const filters = (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><h2 className="text-[15px] font-bold">Filters</h2>{active > 0 && <button type="button" onClick={clearFilters} className="min-h-[36px] text-[13px] font-semibold text-[#C2410C]">Clear all</button>}</div>
      <fieldset className="space-y-1.5"><legend className="mb-2 text-xs font-bold tracking-wide text-[#33476B]">TYPE OF CARE</legend>
        {CARES.map((c) => (
          <label key={c} className="flex min-h-[36px] cursor-pointer items-center gap-2.5 text-sm">
            <input type="checkbox" checked={care.includes(c)} disabled={!counts(c) && !care.includes(c)} onChange={() => toggleCare(c)} className="h-[18px] w-[18px] accent-[#C2410C] disabled:opacity-40" />
            <span className="flex-1">{CARE_LABEL[c]}</span><span className="text-xs text-[#4E6587]">{counts(c)}</span>
          </label>
        ))}
      </fieldset>
      <fieldset className="space-y-1.5"><legend className="mb-2 text-xs font-bold tracking-wide text-[#33476B]">AVAILABLE</legend>
        <label className="flex min-h-[36px] cursor-pointer items-center gap-2.5 text-sm"><input type="checkbox" checked={today} onChange={() => set('today', today ? '' : '1')} className="h-[18px] w-[18px] accent-[#C2410C]" />Can start today</label>
      </fieldset>
      <fieldset className="space-y-1.5"><legend className="mb-2 text-xs font-bold tracking-wide text-[#33476B]">VISIT OR SHIFT</legend>
        {[['', 'All'], ['VISIT', 'Single visits'], ['SHIFT', '12 / 24-hour shifts']].map(([k, label]) => (
          <label key={k} className="flex min-h-[36px] cursor-pointer items-center gap-2.5 text-sm"><input type="radio" name="hc-kind" checked={kind === k} onChange={() => set('kind', k)} className="h-[18px] w-[18px] accent-[#C2410C]" />{label}</label>
        ))}
      </fieldset>
      <fieldset className="space-y-1.5"><legend className="mb-2 text-xs font-bold tracking-wide text-[#33476B]">PRICE</legend>
        {PRICES.map((p) => (
          <label key={p.k} className="flex min-h-[36px] cursor-pointer items-center gap-2.5 text-sm"><input type="radio" name="hc-price" checked={price === p.k} onChange={() => set('price', p.k)} className="h-[18px] w-[18px] accent-[#C2410C]" />{p.label}</label>
        ))}
      </fieldset>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-[1240px] space-y-4 pb-12 text-[#0A1948]">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] text-[#4E6587]"><Link to="/home-care" className="text-[#C2410C]">Home care</Link><ChevronRight className="h-3.5 w-3.5" /><span>Search</span></nav>
      <form role="search" onSubmit={(e) => { e.preventDefault(); set('q', text.trim()); }} className="flex flex-wrap gap-2.5">
        <label className="flex h-[50px] min-w-0 flex-[1_1_380px] items-center gap-2.5 rounded-2xl border-2 border-[#C2410C] bg-white px-3.5">
          <Search className="h-5 w-5 shrink-0 text-[#4E6587]" />
          <span className="sr-only">Search home care</span>
          <input type="search" autoFocus={!q} value={text} onChange={(e) => setText(e.target.value)} maxLength={80} placeholder="Search “injection”, “physiotherapy”, “doctor visit”, “attendant”…" className="min-w-0 flex-1 border-0 bg-transparent text-base outline-none" />
          {text && <button type="button" aria-label="Clear search" onClick={() => { setText(''); set('q', ''); }} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-[#F1F4F9]"><X className="h-4 w-4" /></button>}
        </label>
      </form>
      <CarePlaceBar saved={saved} place={place} onPlace={setPlace} compact />

      {!place && saved !== null && <p className={`${card} p-4 text-sm text-[#33476B]`}>Choose where the care is needed to see who comes to your home.</p>}

      {place && (
        <div className="flex flex-wrap items-start gap-[18px]">
          <aside aria-label="Filters" className={`${card} hidden min-w-[210px] max-w-[250px] flex-[1_1_230px] p-4 lg:block`}>{filters}</aside>

          <section aria-label="Results" className="min-w-0 flex-[999_1_520px] space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <p role="status" className="text-sm text-[#33476B]">
                {loading ? 'Searching…' : q ? <><b className="text-[#0A1948]">{exact?.length || 0} result{exact?.length === 1 ? '' : 's'}</b> for “{q}” near {where}</> : <><b className="text-[#0A1948]">{exact?.length || 0}</b> ways to get care at home near {where}</>}
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                <button type="button" onClick={() => setFiltersOpen((o) => !o)} aria-expanded={filtersOpen} className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-[#DFE8F3] bg-white px-3.5 text-[13px] font-semibold lg:hidden"><SlidersHorizontal className="h-4 w-4" />Filters{active ? ` (${active})` : ''}</button>
                <div role="group" aria-label="Sort" className="flex flex-wrap gap-1.5">
                  {[['relevance', 'Relevance'], ['soonest', 'Soonest'], ['price', 'Price: low to high']].map(([k, label]) => (
                    <button key={k} type="button" aria-pressed={sort === k} onClick={() => set('sort', k === 'relevance' ? '' : k)} className={`min-h-[38px] rounded-full border px-3.5 text-[13px] font-semibold ${sort === k ? 'border-[#0A1948] bg-[#0A1948] text-white' : 'border-[#DFE8F3] bg-white'}`}>{label}</button>
                  ))}
                </div>
              </div>
            </div>
            {filtersOpen && <div className={`${card} p-4 lg:hidden`}>{filters}</div>}

            {error ? (
              <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-[#F5C9C9] bg-[#FDF0F0] p-4 text-sm text-[#8F1D1D]">{error}<button type="button" onClick={() => setRetry((n) => n + 1)} className="inline-flex items-center gap-1 font-bold underline"><RotateCcw className="h-4 w-4" />Retry</button></div>
            ) : loading ? (
              <div className="space-y-3" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="h-[104px] animate-pulse rounded-2xl bg-[#E9EEF5]" />)}</div>
            ) : (
              <>
                {q && <h2 className="pt-1 text-base font-bold">Exact matches</h2>}
                {exact && exact.length === 0 && (
                  <div className={`${card} space-y-2 border-dashed p-5 text-center text-sm text-[#33476B]`}>
                    <p>{active ? 'Nothing matches these filters.' : q ? `No exact match for “${q}” near ${where}.` : `No home care near ${where} yet.`}</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {active > 0 && <button type="button" onClick={clearFilters} className="min-h-[40px] rounded-lg border border-[#C2410C] px-3.5 font-bold text-[#C2410C]">Clear filters</button>}
                      {q && <button type="button" onClick={() => { setText(''); set('q', ''); }} className="min-h-[40px] rounded-lg border border-[#DFE8F3] px-3.5 font-semibold">See everything near you</button>}
                    </div>
                  </div>
                )}
                <div className="space-y-3">{(exact || []).slice(0, shown).map((h) => <ResultRow key={h.key} h={h} query={q} pincode={pin} />)}</div>
                {exact && exact.length > shown && <button type="button" onClick={() => setShown((n) => n + PAGE)} className="mx-auto block min-h-[44px] rounded-xl border border-[#DFE8F3] bg-white px-5 text-sm font-semibold">Show more ({exact.length - shown} more)</button>}

                {q && related && related.length > 0 && (
                  <>
                    <div className="flex flex-wrap items-baseline justify-between gap-2.5 pt-3">
                      <h2 className="text-base font-bold">Related to “{q}”</h2>
                      <span className="text-[13px] text-[#4E6587]">Often booked together or instead</span>
                    </div>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">{related.slice(0, 6).map((h) => <ResultCard key={h.key} h={h} pincode={pin} />)}</div>
                  </>
                )}
              </>
            )}
            <EmergencyNote />
          </section>
        </div>
      )}
    </div>
  );
}
