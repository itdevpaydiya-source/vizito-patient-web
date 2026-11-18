/**
 * Home care › home (approved design 18 Nov, "Home Care Search" canvas, artboard 1).
 * Opens with real results for the patient's place (never a bare search box): search, care types with
 * real starting prices, doctors who visit, every bookable service with its price range, and the
 * existing entry points (my bookings & quotes, day or live-in care, doctor referrals).
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, ClipboardList, Clock, HeartHandshake, RotateCcw, Search, Stethoscope, Syringe } from 'lucide-react';
import BookingForChip, { useBookingFamily } from '../family/BookingForChip';
import { hcCatalogueApi, type HcCategory, type HcService } from '../../../services/homecareHelper';
import { homeVisitDoctorsApi, labError, rupees, type HomeVisitDoctor } from '../../../services/labHelper';
import { CarePlaceBar, EmergencyNote, ResultRow } from './CareParts';
import { CARE_CHIP, card, whenLabel } from './careFormat';
import { CARE_LABEL } from './careSearchLogic';
import { useCarePlace } from './useCarePlace';

type ServiceGroup = { name: string; category: HcCategory; kind: 'VISIT' | 'SHIFT'; min: number; max: number; length: string; providers: number; soonest: { date: string; time: string } | null };

export default function HomeCareHome({ top, onLongTerm }: { top?: ReactNode; onLongTerm: () => void }) {
  const navigate = useNavigate();
  const [who, setWho] = useState('');
  const { family } = useBookingFamily(setWho);
  const { saved, place, setPlace } = useCarePlace();
  const [services, setServices] = useState<HcService[] | null>(null);
  const [doctors, setDoctors] = useState<HomeVisitDoctor[] | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!place?.pincode) return;
    let alive = true;
    Promise.all([
      hcCatalogueApi(place.pincode, undefined, place.lat, place.lng).then((r) => r.services),
      homeVisitDoctorsApi(place.pincode).catch(() => [] as HomeVisitDoctor[]),
    ]).then(([s, d]) => { if (alive) { setServices(s); setDoctors(d); setError(''); } })
      .catch((e) => { if (alive) { setServices([]); setDoctors([]); setError(labError(e, 'Home care near you could not be loaded.')); } });
    return () => { alive = false; setServices(null); setDoctors(null); };
  }, [place?.pincode, place?.lat, place?.lng, retry]);

  const search = (text: string) => {
    const p = new URLSearchParams({ q: text.trim() });
    if (place?.pincode) p.set('pincode', place.pincode);
    if (who) p.set('family_member_id', who);
    navigate(`/home-care/search?${p}`);
  };

  const groups = useMemo<ServiceGroup[]>(() => {
    const m = new Map<string, ServiceGroup>();
    for (const s of services || []) {
      const g = m.get(s.name);
      const at = s.earliest_start || null;
      if (!g) m.set(s.name, { name: s.name, category: s.category, kind: s.kind, min: s.price, max: s.price, providers: 1, soonest: at,
        length: s.kind === 'SHIFT' ? `${s.shift_hours}-hour shift` : s.duration_minutes ? `Visit · about ${s.duration_minutes} min` : 'Visit' });
      else { g.min = Math.min(g.min, s.price); g.max = Math.max(g.max, s.price); g.providers += 1; if (at && (!g.soonest || `${at.date}${at.time}` < `${g.soonest.date}${g.soonest.time}`)) g.soonest = at; }
    }
    const order: HcCategory[] = ['NURSING', 'PHYSIOTHERAPY', 'CAREGIVER'];
    return Array.from(m.values()).sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category) || (a.kind === b.kind ? 0 : a.kind === 'VISIT' ? -1 : 1) || a.min - b.min);
  }, [services]);
  const popular = useMemo(() => [...groups].sort((a, b) => b.providers - a.providers).slice(0, 5).map((g) => g.name.split(' · ')[0]).concat(doctors?.length ? ['Doctor visit'] : []), [groups, doctors]);
  const fromPrice = (c: HcCategory) => { const p = (services || []).filter((s) => s.category === c).map((s) => s.price); return p.length ? Math.min(...p) : null; };
  const docFrom = doctors?.length ? Math.min(...doctors.map((d) => d.fee)) : null;
  const loading = !!place && (services === null || doctors === null);
  const tiles: { key: string; name: string; sub: string; price: string | null; to: string; Icon: typeof Syringe; tone: string; per: string }[] = [
    { key: 'DOCTOR', name: 'Doctor at home', sub: 'A doctor’s consultation at your home', price: docFrom != null ? rupees(docFrom) : null, per: 'per visit', to: '/home-care?tab=doctor', Icon: Stethoscope, tone: CARE_CHIP.DOCTOR },
    { key: 'NURSING', name: 'Nursing', sub: 'Injections, IV, wound care, 12-hour nurse', price: fromPrice('NURSING') != null ? rupees(fromPrice('NURSING')!) : null, per: 'per visit', to: '/home-care?tab=nursing', Icon: Syringe, tone: CARE_CHIP.NURSING },
    { key: 'PHYSIOTHERAPY', name: 'Physiotherapy', sub: 'After surgery, stroke, back pain', price: fromPrice('PHYSIOTHERAPY') != null ? rupees(fromPrice('PHYSIOTHERAPY')!) : null, per: 'per session', to: '/home-care?tab=physio', Icon: Activity, tone: CARE_CHIP.PHYSIOTHERAPY },
    { key: 'CAREGIVER', name: 'Attendant', sub: 'Bathing, feeding, mobility help', price: fromPrice('CAREGIVER') != null ? rupees(fromPrice('CAREGIVER')!) : null, per: 'per shift', to: '/home-care?tab=caregiver', Icon: HeartHandshake, tone: CARE_CHIP.CAREGIVER },
  ];
  const where = place ? (place.area || place.label) : 'your area';

  return (
    <div className="mx-auto w-full max-w-[1240px] space-y-5 pb-12 text-[#0A1948]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CarePlaceBar saved={saved} place={place} onPlace={setPlace} />
        <BookingForChip family={family} value={who} onChange={setWho} />
      </div>

      <section aria-label="Search home care" className={`${card} space-y-4 p-5 sm:p-7`}>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">Care at home</h1>
          <p className="mt-1 text-sm text-[#4E6587]">Doctors, nurses, physiotherapists and attendants who come to your home{place ? ` in ${where}` : ''}.</p>
        </div>
        <form role="search" onSubmit={(e) => { e.preventDefault(); search(q); }} className="flex flex-wrap gap-2.5">
          <label className="flex h-[54px] min-w-0 flex-[1_1_380px] items-center gap-2.5 rounded-2xl border-2 border-[#C2410C] bg-white px-4">
            <Search className="h-5 w-5 shrink-0 text-[#4E6587]" />
            <span className="sr-only">Search home care</span>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} maxLength={80} placeholder="Search “injection”, “physiotherapy”, “doctor visit”, “attendant”…" className="min-w-0 flex-1 border-0 bg-transparent text-base outline-none" />
          </label>
          <button type="submit" className="h-[54px] rounded-2xl bg-[#C2410C] px-7 text-[15px] font-bold text-white hover:bg-[#9A3412]">Search</button>
        </form>
        {popular.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[13px] text-[#4E6587]">Popular near you</span>
            {popular.map((p) => <button key={p} type="button" onClick={() => search(p)} className="inline-flex min-h-[36px] items-center rounded-full border border-[#DFE8F3] bg-[#F7FAFD] px-3.5 text-[13px] font-medium hover:border-[#F2B28E]">{p}</button>)}
          </div>
        )}
      </section>

      {!place && saved !== null && (
        <p className={`${card} p-4 text-sm text-[#33476B]`}>Tell us where the care is needed — use your current location or search your area (for example “Kondapur”) — to see who comes to your home.</p>
      )}

      <section aria-label="Browse by type of care" className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
        {tiles.map((t) => (
          <Link key={t.key} to={t.to} className={`${card} flex min-h-[132px] flex-col gap-2.5 p-4 transition hover:border-[#F2B28E] hover:shadow-sm`}>
            <span className={`grid h-11 w-11 place-items-center rounded-xl ${t.tone}`}><t.Icon className="h-5 w-5" /></span>
            <span className="text-[15px] font-bold">{t.name}</span>
            <span className="text-xs leading-relaxed text-[#4E6587]">{t.sub}</span>
            <span className="mt-auto text-[13px] font-semibold">{loading ? 'Checking prices…' : t.price ? `From ${t.price} ${t.per}` : place ? 'Not in your area yet' : 'Choose your area'}</span>
          </Link>
        ))}
        <button type="button" onClick={onLongTerm} className={`${card} flex min-h-[132px] flex-col gap-2.5 p-4 text-left transition hover:border-[#F2B28E] hover:shadow-sm`}>
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#F1F4F9] text-[#33476B]"><Clock className="h-5 w-5" /></span>
          <span className="text-[15px] font-bold">Day or live-in care</span>
          <span className="text-xs leading-relaxed text-[#4E6587]">12 or 24-hour care for weeks or months</span>
          <span className="mt-auto text-[13px] font-semibold">Get quotes</span>
        </button>
      </section>

      <EmergencyNote />
      {top}

      {error && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-[#F5C9C9] bg-[#FDF0F0] p-4 text-sm text-[#8F1D1D]">{error}<button type="button" onClick={() => setRetry((n) => n + 1)} className="inline-flex items-center gap-1 font-bold underline"><RotateCcw className="h-4 w-4" />Retry</button></div>}

      {place && (
        <section aria-label="Doctors who visit your home" className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-[19px] font-bold">Doctors who visit {where}</h2>
            {(doctors?.length || 0) > 0 && <Link to="/home-care?tab=doctor" className="text-sm font-semibold text-[#C2410C]">See all</Link>}
          </div>
          {doctors === null ? <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-3" aria-busy="true">{[0, 1].map((i) => <div key={i} className="h-[92px] animate-pulse rounded-2xl bg-[#E9EEF5]" />)}</div>
            : doctors.length ? <div className="space-y-3">{doctors.slice(0, 3).map((d) => <ResultRow key={d.doctor_partner_id} h={{ type: 'doctor', key: d.doctor_partner_id, care: 'DOCTOR', d, score: 0 }} query="" pincode={place.pincode} />)}</div>
              : <p className={`${card} p-4 text-sm text-[#33476B]`}>No doctor makes home visits in {where} yet. <Link to="/find-doctors?mode=video" className="font-semibold text-[#C2410C]">Consult by video</Link></p>}
        </section>
      )}

      {place && (
        <section aria-label="Book a visit at home" className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-[19px] font-bold">Book care at home</h2>
            <span className="text-[13px] text-[#4E6587]">Prices from providers who serve {where}</span>
          </div>
          {services === null ? <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3" aria-busy="true">{[0, 1, 2, 3].map((i) => <div key={i} className="h-[150px] animate-pulse rounded-2xl bg-[#E9EEF5]" />)}</div>
            : groups.length ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3">
                {groups.map((g) => (
                  <article key={g.name} className={`${card} flex flex-col gap-2 p-4`}>
                    <span className={`self-start rounded-md px-2 py-0.5 text-[11px] font-semibold ${CARE_CHIP[g.category]}`}>{CARE_LABEL[g.category]}</span>
                    <h3 className="text-[15px] font-bold leading-snug">{g.name}</h3>
                    <span className="text-xs text-[#4E6587]">{g.length} · {g.providers} provider{g.providers === 1 ? '' : 's'}</span>
                    {g.soonest && <span className="text-xs font-semibold text-[#0B4F4A]">Earliest: {whenLabel(g.soonest)}</span>}
                    <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                      <span className="text-base font-extrabold tabular-nums">{g.min === g.max ? rupees(g.min) : `${rupees(g.min)} – ${rupees(g.max)}`}</span>
                      <button type="button" onClick={() => search(g.name)} className="inline-flex min-h-[40px] items-center rounded-lg border border-[#C2410C] px-3.5 text-[13px] font-bold text-[#C2410C] hover:bg-[#FFF7F0]">Compare &amp; book</button>
                    </div>
                  </article>
                ))}
              </div>
            ) : <p className={`${card} p-4 text-sm text-[#33476B]`}>No home care agency serves {where} yet. Try another area, or ask for <button type="button" onClick={onLongTerm} className="font-semibold text-[#C2410C] underline">day or live-in care quotes</button>.</p>}
        </section>
      )}

      <section aria-label="Your home care" className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
        <Link to="/home-care?tab=mine" className={`${card} flex min-h-[72px] items-center gap-3 p-4 hover:border-[#F2B28E]`}>
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#FFF1E8] text-[#C2410C]"><ClipboardList className="h-5 w-5" /></span>
          <span><b className="block text-[15px]">My bookings &amp; quotes</b><span className="text-xs text-[#4E6587]">Track visits, visit codes, logs and invoices</span></span>
        </Link>
      </section>
    </div>
  );
}
