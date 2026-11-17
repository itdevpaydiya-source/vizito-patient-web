import ThemedSelect from '../../components/forms/ThemedSelect';
import { payOnline, PaymentCancelled, type PaidOnline } from '../../../services/razorpayCheckout';
import BookingForChip,{useFamilyBookingSelection} from '../family/BookingForChip';
import {useSearchArea} from '../../../services/location';
import {providerDistance} from '../../components/ProviderCard';
import type {ProviderItem} from '../../../services/types';
import { useEffect, useMemo, useRef, useState } from 'react';
import HomePinField from '../../components/location/HomePinField';
import FavoriteButton from '../../components/FavoriteButton';
import { useSearchParams } from 'react-router-dom';
import { getAddressesApi,getProvidersApi } from '../../../services/patientHelper';
import { paidLabel, refundText, refundWillText, TestPaymentNote } from '../../../config/payments';
import CancellationRefundPolicy from '../../components/CancellationRefundPolicy';
import { Search, ShieldCheck, Star, Clock, Users, CheckCircle2, MapPin, ChevronDown, X, Info } from 'lucide-react';
import { getMyUserId, getFamilyMembersApi, type PatientFamilyMember } from '../../../services/familyHelper';
import { hcCatalogueApi, hcCoverageApi, hcBookApi, type HcCoverage, type HcCategory, type HcService, type HcOrder, type HcReferral, type HcEnquiry } from '../../../services/homecareHelper';
import { ReferralNote } from './HomeCareCare';
import LongTermEnquiryModal from './components/LongTermEnquiryModal';
import { labError, rupees } from '../../../services/labHelper';
import { validatePinCode, validateUpiId } from '../../../utils/validators/india';
import { providerLabel } from './homeCareProviderLabel';

// Book nursing, physiotherapy or a caregiver from a registered home care agency: find by pincode,
// compare (price, rating, what's included, team), then choose who it's for, how many visits and on
// which days, the time, the address and what care is needed. The agency then assigns a professional.
const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const hm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const label12 = (t: string) => { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; };
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const field = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10';
const card = 'bg-white rounded-2xl border border-slate-200 p-5';
const INTRO: Record<HcCategory, { title: string; text: string; examples: string }> = {
  NURSING: { title: 'Nursing at home', text: 'A registered nurse (GNM / B.Sc Nursing) for injections, IV drips, wound dressing, catheter care, or a 12 / 24-hour nurse after a hospital stay.', examples: 'e.g. “Insulin twice a day, diabetic, recovering from knee surgery”' },
  PHYSIOTHERAPY: { title: 'Physiotherapy at home', text: 'A qualified physiotherapist (BPT / MPT) for back and joint pain, rehab after surgery or stroke, and elderly mobility — usually a course of sessions.', examples: 'e.g. “Knee replacement 2 weeks ago, needs walking practice; can’t climb stairs”' },
  CAREGIVER: { title: 'Caregivers & attendants', text: 'A trained attendant for bathing, feeding, toileting, walking support and company — for 12 hours a day or living in.', examples: 'e.g. “Bed-ridden father, 78, needs help with bathing and feeding; diabetic”' },
};
const PAGE = 6;

const CAT_LABEL: Record<HcCategory, string> = { NURSING: 'Nursing', PHYSIOTHERAPY: 'Physiotherapy', CAREGIVER: 'Caregivers' };

export function getServiceImage(service: { category?: string; name?: string; kind?: string }): string {
  const name = (service.name || '').toLowerCase();
  const cat = (service.category || '').toUpperCase();

  if (name.includes('inject') || name.includes('iv') || name.includes('blood') || name.includes('sample') || name.includes('infusion')) {
    return '/images/healthcare/banners/home-collection.webp';
  }
  if (name.includes('wound') || name.includes('dressing') || name.includes('bandage') || name.includes('suture') || name.includes('first aid')) {
    return '/images/healthcare/pharmacy/first-aid.webp';
  }
  if (cat === 'PHYSIOTHERAPY' || name.includes('physio') || name.includes('rehab') || name.includes('therapy') || name.includes('exercise')) {
    return '/images/healthcare/departments/orthopedics.webp';
  }
  if (cat === 'CAREGIVER' || name.includes('elder') || name.includes('attendant') || name.includes('caregiver') || name.includes('companion')) {
    return '/images/healthcare/placeholders/caregiver-female.webp';
  }
  if (cat === 'DOCTOR' || name.includes('doctor') || name.includes('physician') || name.includes('consult')) {
    return '/images/healthcare/services/doctor.webp';
  }
  if (name.includes('device') || name.includes('monitor') || name.includes('equipment') || name.includes('oxygen')) {
    return '/images/healthcare/pharmacy/devices.webp';
  }
  return '/images/healthcare/services/homecare.webp';
}

export default function HomeCareAgencyBook({ category, onBooked, referral, prefill, onCategory }: { category: HcCategory; onBooked: (o: HcOrder) => void; referral?: HcReferral | null; prefill?: HcOrder | null; onCategory?: (c: HcCategory) => void }) {
  const [urlParams, setUrlParams] = useSearchParams();
  const area=useSearchArea(),[providerPins,setProviderPins]=useState<ProviderItem[]>([]);
  useEffect(()=>{getProvidersApi('homecare').then(setProviderPins).catch(()=>setProviderPins([]));},[]);
  const distance=(s:HcService)=>{const p=providerPins.find(p=>p.id===s.agency.id);return p?providerDistance(p,area)?.metres??Infinity:Infinity;};
  // The agency chosen in the header search (or a rebook): a real filter the patient can remove.
  const wantAgency = urlParams.get('agency') || prefill?.agency_id || '';
  const [coverage, setCoverage] = useState<HcCoverage | null | 'gone'>(null);
  useEffect(() => {
    setCoverage(null);
    if (wantAgency) hcCoverageApi(wantAgency).then(setCoverage).catch(() => setCoverage('gone'));
  }, [wantAgency]);
  const setUrl = (k: string, v: string) => setUrlParams((p) => { const n = new URLSearchParams(p); if (v) n.set(k, v); else n.delete(k); return n; }, { replace: true });
  const [pin, setPin] = useState(() => { try { return prefill?.pincode || localStorage.getItem('vizito_hc_pin') || ''; } catch { return prefill?.pincode || ''; } });
  const [editingPin, setEditingPin] = useState(false);
  const [tempPin, setTempPin] = useState(pin);
  useEffect(() => { setTempPin(pin); }, [pin]);
  const [all, setAll] = useState<HcService[] | null>(null); // all care types at this PIN
  const list = useMemo(() => (all ? all.filter((s) => s.category === category) : null), [all, category]);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQState] = useState(() => urlParams.get('q') || ''); // a search carried over from the header
  const setQ = (v: string) => { setQState(v); setUrl('q', v.trim()); };
  const [sort, setSort] = useState<'PRICE' | 'RATING' | 'NEAREST'>(area?'NEAREST':'PRICE');
  useEffect(()=>{setSort(area?'NEAREST':'PRICE');},[area]);
  const [kind, setKind] = useState<'ALL' | 'VISIT' | 'SHIFT'>('ALL');
  const [shown, setShown] = useState(PAGE);
  const [open, setOpen] = useState<string | null>(null);
  const [pick, setPick] = useState<HcService | null>(null);
  const [enquireService, setEnquireService] = useState<HcService | null>(null);
  const [enquirySuccess, setEnquirySuccess] = useState<string | null>(null);
  const inFlightRef = useRef(false);
  const lastFetchedRef = useRef<string>('');

  const find = async (e?: React.FormEvent, force = false) => {
    e?.preventDefault();
    const pinRes = validatePinCode(pin);
    if (!pinRes.ok) { setErr(pinRes.message); return; }
    const key = pin;
    if (!force && inFlightRef.current) return;
    if (!force && lastFetchedRef.current === key && list) return;

    inFlightRef.current = true;
    setErr(null);
    setPick(null);
    setShown(PAGE);
    try { localStorage.setItem('vizito_hc_pin', pin); } catch { /* optional */ }
    try {
      const res = await hcCatalogueApi(pin); // every care type: lets us say "this agency offers physiotherapy here"
      lastFetchedRef.current = key;
      setAll(res.services);
    } catch (x) {
      setErr(labError(x, 'Could not load services.'));
    } finally {
      inFlightRef.current = false;
    }
  };

  useEffect(() => {
    if (validatePinCode(pin).ok) find();
  }, [pin]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (prefill && list && !pick) {
      const match = list.find((s) => s.agency.id === prefill.agency_id && s.name === prefill.service_name)
        || list.find((s) => s.agency.id === prefill.agency_id)
        || list[0];
      if (match) setPick(match);
    }
  }, [prefill, list, pick]);

  // First visit: use the pincode of the search area or patient's saved address
  useEffect(() => {
    if (area?.pincode && validatePinCode(area.pincode).ok) {
      setPin(area.pincode);
      return;
    }
    getAddressesApi().then((a) => {
      const p = a.map((x) => String(x.pincode || '')).find((x) => /^[1-9]\d{5}$/.test(x));
      if (!p) return;
      setPin(p);
    }).catch(() => undefined);
  }, [area?.pincode]); // eslint-disable-line react-hooks/exhaustive-deps
  const words = q.trim().toLowerCase();
  const matchWords = (x: HcService) => !words || `${x.name} ${x.agency.name} ${x.description || ''} ${x.includes || ''}`.toLowerCase().includes(words);
  const matchAgency = (x: HcService) => !wantAgency || String(x.agency.id) === String(wantAgency);
  const rows = useMemo(() => (list || [])
    .filter((x) => (kind === 'ALL' || x.kind === kind) && matchWords(x) && matchAgency(x))
    .sort((a,b)=> (area&&sort==='NEAREST'?(distance(a)-distance(b))||0:0) || (sort === 'RATING' ? (b.agency.rating || 0) - (a.agency.rating || 0) : 0) || a.price - b.price), [list, kind, q, sort, wantAgency,area,providerPins]); // eslint-disable-line react-hooks/exhaustive-deps
  const visitCount = useMemo(() => (list || []).filter((x) => x.kind === 'VISIT' && matchWords(x) && matchAgency(x)).length, [list, words, wantAgency]);
  const shiftCount = useMemo(() => (list || []).filter((x) => x.kind === 'SHIFT' && matchWords(x) && matchAgency(x)).length, [list, words, wantAgency]);
  // The same search in the other care types at this PIN ("Physiotherapy (2)").
  const elsewhere = (['NURSING', 'PHYSIOTHERAPY', 'CAREGIVER'] as HcCategory[]).filter((c) => c !== category)
    .map((c) => ({ c, n: (all || []).filter((x) => x.category === c && matchWords(x) && matchAgency(x)).length })).filter((e) => e.n > 0);
  const agencyName = coverage && coverage !== 'gone' ? coverage.name : (all || []).find((x) => String(x.agency.id) === String(wantAgency))?.agency.name || 'This agency';
  const agencyServesPin = coverage && coverage !== 'gone' ? coverage.pincodes.includes(pin) : null;
  const clearAll = () => { setQState(''); setKind('ALL'); setUrlParams((p) => { const n = new URLSearchParams(p); n.delete('q'); n.delete('agency'); return n; }, { replace: true }); };
  const chips: { label: string; clear: () => void }[] = [
    ...(wantAgency ? [{ label: `Agency: ${agencyName}`, clear: () => setUrl('agency', '') }] : []),
    ...(words ? [{ label: `“${q.trim()}”`, clear: () => setQ('') }] : []),
    ...(kind !== 'ALL' ? [{ label: kind === 'VISIT' ? 'Visits' : '12 / 24-hour care', clear: () => setKind('ALL') }] : []),
  ];
  const intro = INTRO[category];

  if (pick) return <BookPanel s={pick} pincode={pin} examples={intro.examples} onBack={() => setPick(null)} onBooked={onBooked} referral={referral} prefill={prefill} />;
  return (
    <div className="space-y-4">
      {referral && <ReferralNote r={referral} />}
      {/* Modern Header Banner with Service Context & Active PIN Badge (Glassmorphic) */}
      <section className="relative overflow-hidden rounded-2xl border border-white/80 bg-gradient-to-r from-amber-50/85 via-white/75 to-slate-50/60 backdrop-blur-xl p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.03)] ring-1 ring-white/60" aria-label="Home care service header">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                {CAT_LABEL[category]} at Home
              </span>
              <span className="text-xs text-slate-500 font-medium" aria-live="polite">
                {rows.length} {rows.length === 1 ? 'service available' : 'services available'}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              {intro.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
              {intro.text}
            </p>
          </div>

          {/* Quick PIN Code Coverage Badge with Inline Editor */}
          <div className="shrink-0 self-start sm:self-center">
            {editingPin ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const p = validatePinCode(tempPin);
                  if (!p.ok) {
                    setErr(p.message);
                    return;
                  }
                  setPin(tempPin);
                  setEditingPin(false);
                  find(undefined, true);
                }}
                className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-amber-300"
              >
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    aria-label="Your pincode"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={tempPin}
                    onChange={(e) => setTempPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6-digit PIN"
                    className="w-28 pl-7 pr-2 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-amber-600"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  className="px-2.5 py-1 rounded-lg bg-[#B45F28] hover:bg-[#984A1D] text-white text-xs font-bold transition"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTempPin(pin);
                    setEditingPin(false);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                  aria-label="Cancel editing pincode"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setEditingPin(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-white hover:border-slate-300 text-slate-700 text-xs font-semibold transition group shadow-xs"
                title="Change PIN code to see agencies covering your area"
              >
                <MapPin className="w-3.5 h-3.5 text-amber-600 group-hover:scale-110 transition-transform" />
                <span>Covering PIN: <strong className="font-bold text-slate-900">{pin || 'Set PIN'}</strong></span>
                <span className="text-[11px] text-amber-700 font-bold underline underline-offset-2 ml-1">Change</span>
              </button>
            )}
          </div>
        </div>
        {err && <p role="alert" className="mt-2 text-xs font-semibold text-rose-700">{err}</p>}
      </section>

      {/* Modern Horizontal Search & Filter Toolbar (Glassmorphic) */}
      <section className="rounded-2xl border border-white/80 bg-white/75 backdrop-blur-xl p-3 sm:p-4 shadow-[0_8px_30px_rgb(0,0,0,0.03)] ring-1 ring-white/60 space-y-3" aria-label="Search and filter options">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Live Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              aria-label="Search services or agencies"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setShown(PAGE);
              }}
              placeholder={`Search ${CAT_LABEL[category].toLowerCase()} (e.g. ${category === 'NURSING' ? 'IV, injection, dressing' : category === 'PHYSIOTHERAPY' ? 'stroke, back pain, rehab' : 'bathing, feeding, attendant'})...`}
              className="w-full rounded-xl border border-slate-200/80 bg-white/80 backdrop-blur-sm pl-9 pr-8 py-2 text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition shadow-inner"
            />
            {q && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setQ('');
                  setShown(PAGE);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills & Sort Dropdown */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex rounded-xl bg-slate-100/60 backdrop-blur-sm p-1 text-xs font-semibold text-slate-700 border border-slate-200/50">
              {(['ALL', 'VISIT', 'SHIFT'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={kind === k}
                  onClick={() => {
                    setKind(k);
                    setShown(PAGE);
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    kind === k
                      ? 'bg-white text-slate-900 font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {k === 'ALL' ? `All (${(list || []).length})` : k === 'VISIT' ? `Visits (${visitCount})` : `12/24h Shifts (${shiftCount})`}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <label htmlFor="home-care-sort" className="sr-only">Sort results</label>
              <ThemedSelect
                id="home-care-sort"
                aria-label="Sort"
                value={sort}
                onChange={(e) => setSort(e.target.value as any)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-amber-500"
              >
                <option value="NEAREST" disabled={!area}>Nearest</option>
                <option value="PRICE">Lowest price</option>
                <option value="RATING">Best rated</option>
              </ThemedSelect>
            </div>
          </div>
        </div>

        {/* Active Filter Chips */}
        {chips.length > 0 && (
          <div role="group" className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100" aria-label="Active filters">
            <span className="text-[11px] font-bold text-slate-500">Active filters:</span>
            {chips.map((c) => (
              <button
                key={c.label}
                type="button"
                onClick={c.clear}
                aria-label={`Remove filter ${c.label}`}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-bold text-amber-900 hover:bg-amber-100 transition"
              >
                {c.label} <X className="w-3 h-3" />
              </button>
            ))}
            <button
              type="button"
              onClick={clearAll}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 underline underline-offset-2 ml-1"
            >
              Clear all
            </button>
          </div>
        )}
      </section>

      {/* Services Results List */}
      {list && (
        <section aria-label="Services near you" className="space-y-3.5">
          {!rows.length ? (
            <div role="status" aria-label="No results" className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center space-y-3">
              {wantAgency && (coverage === 'gone' || agencyServesPin === false) ? (
                <>
                  <p className="text-base font-bold text-slate-800">
                    {coverage === 'gone' ? 'This agency isn’t available on Vizito right now' : `${agencyName} doesn’t serve PIN code ${pin}`}
                  </p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {coverage !== 'gone' && coverage && coverage.pincodes.length
                      ? `It covers ${coverage.pincodes.slice(0, 6).join(', ')}${coverage.pincodes.length > 6 ? '…' : ''}. If the care is for one of those addresses, change the PIN code above.`
                      : 'Agencies serving your area are shown when you remove it.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setUrl('agency', '')}
                    className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 underline underline-offset-2 hover:text-amber-900"
                  >
                    Show all agencies that serve {pin}
                  </button>
                </>
              ) : elsewhere.length > 0 ? (
                <>
                  <p className="text-base font-bold text-slate-800">
                    {wantAgency
                      ? `${agencyName} doesn’t offer ${CAT_LABEL[category].toLowerCase()} at ${pin}`
                      : words
                      ? `No ${CAT_LABEL[category].toLowerCase()} matches “${q.trim()}” at ${pin}`
                      : `No ${CAT_LABEL[category].toLowerCase()} at ${pin} yet`}
                  </p>
                  <p className="text-xs text-slate-500">Found in other care categories near you:</p>
                  <div className="flex flex-wrap justify-center gap-2 pt-1">
                    {elsewhere.map((e) => (
                      <button
                        key={e.c}
                        type="button"
                        onClick={() => onCategory?.(e.c)}
                        className="px-3.5 py-1.5 rounded-full border border-amber-600 bg-white text-amber-800 text-xs font-bold hover:bg-amber-50 transition shadow-xs"
                      >
                        {CAT_LABEL[e.c]} ({e.n})
                      </button>
                    ))}
                  </div>
                </>
              ) : (all || []).length === 0 ? (
                <>
                  <p className="text-base font-bold text-slate-800">No home care agencies serve PIN code {pin} yet</p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Check the PIN code of your care address or try a nearby PIN code.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-base font-bold text-slate-800">
                    {words ? `No agency or service matches “${q.trim()}” at ${pin}` : 'No options match these filters'}
                  </p>
                  <p className="text-xs text-slate-500">Try adjusting your search terms or clearing the filters.</p>
                  <button
                    type="button"
                    onClick={clearAll}
                    className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 underline underline-offset-2 hover:text-amber-900"
                  >
                    Clear all filters
                  </button>
                </>
              )}
            </div>
          ) : (
            <ul className="space-y-3.5" aria-label="Services">
              {rows.slice(0, shown).map((x) => (
                <li
                  key={x.id}
                  className="group relative flex flex-col md:flex-row items-stretch md:items-start gap-4 sm:gap-5 rounded-2xl border border-white/80 bg-white/80 backdrop-blur-xl p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.03)] ring-1 ring-white/60 hover:bg-white/95 hover:border-amber-300/80 hover:shadow-xl hover:shadow-amber-950/5 transition-all duration-300 hover:-translate-y-0.5"
                >
                  {/* Distinct Service Thumbnail */}
                  <div className="relative w-full md:w-36 h-36 md:h-32 shrink-0 overflow-hidden rounded-xl bg-slate-100 border border-white/60 shadow-xs">
                    <img
                      src={getServiceImage(x)}
                      alt={x.name}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute bottom-2 left-2 px-2.5 py-0.5 rounded-full bg-slate-900/75 backdrop-blur-md text-[10px] font-bold text-white uppercase tracking-wider border border-white/20 shadow-xs">
                      {x.kind === 'VISIT' ? 'Visit' : `${x.shift_hours}h Shift`}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {x.agency.vizito_verified ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          Vizito verified
                        </span>
                      ) : null}
                      {((x.agency as any).mode === 'INDIVIDUAL' || (x.agency as any).homecare_mode === 'INDIVIDUAL') ? (
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-semibold">Individual professional</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold">Home care agency</span>
                      )}
                      <span className="text-xs font-semibold text-slate-700">
                        {x.agency.name}
                      </span>
                      {x.agency.registration_number && (
                        <span className="text-[11px] text-slate-400">
                          · Reg. {x.agency.registration_number}
                        </span>
                      )}
                      {x.agency.rating ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          {x.agency.rating} <span className="text-slate-400 font-normal text-[11px]">({x.agency.ratings})</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">New on Vizito</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-amber-800 transition-colors">
                        {x.name}
                      </h3>
                      <FavoriteButton partnerId={String(x.agency.id)} name={x.agency.name} className="w-7 h-7" />
                    </div>
                  {/* Description */}
                    {x.description && (
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                        {x.description}
                      </p>
                    )}

                    {/* Specifications */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/70 backdrop-blur-sm text-slate-700 border border-slate-200/60 font-medium shadow-xs">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {x.kind === 'VISIT' ? `${x.duration_minutes} min visit · ${x.agency.hours}` : x.shift_hours === 12 ? '8 AM–8 PM or 8 PM–8 AM' : 'Round the clock, live-in'}
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/70 backdrop-blur-sm text-slate-700 border border-slate-200/60 font-medium shadow-xs">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {providerLabel(x as any)}{x.avg_experience ? ` (avg ${x.avg_experience} yrs exp)` : ''}
                      </span>
                    </div>

                    {/* Collapsible What's Included */}
                    {x.includes && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setOpen(open === x.id ? null : x.id)}
                          className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
                        >
                          <Info className="w-3.5 h-3.5 text-amber-700" />
                          {open === x.id ? 'Hide details' : "What’s included in this visit"}
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open === x.id ? 'rotate-180' : ''}`} />
                        </button>
                        {open === x.id && (
                          <div className="mt-2 rounded-xl bg-amber-50/70 backdrop-blur-sm border border-amber-200/80 p-3 text-xs text-slate-700 animate-in fade-in shadow-xs">
                            <strong className="text-slate-900 font-bold">Includes: </strong>{x.includes}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Pricing & CTAs */}
                  <div className="w-full md:w-44 shrink-0 flex flex-row md:flex-col items-center md:items-end justify-between self-stretch pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 gap-3">
                    <div className="md:text-right">
                      <p className="text-2xl font-black text-slate-900 tabular-nums tracking-tight">
                        {rupees(x.price)}
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {x.kind === 'VISIT' ? 'per visit' : `per ${x.shift_hours}-hr shift`}
                      </p>
                    </div>

                    <div className="flex flex-row md:flex-col items-center gap-2 w-auto md:w-full">
                      <button
                        type="button"
                        onClick={() => setPick(x)}
                        data-testid="book-service-btn"
                        className="px-4 py-2.5 rounded-xl bg-[#B45F28] hover:bg-[#984A1D] text-white text-xs sm:text-sm font-bold shadow-sm hover:shadow active:scale-[0.98] transition-all text-center w-full whitespace-nowrap"
                      >
                        Request this visit
                      </button>
                      <button
                        type="button"
                        onClick={() => setEnquireService(x)}
                        data-testid="request-quote-btn"
                        className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-amber-700 hover:bg-amber-50 text-slate-700 hover:text-amber-800 text-xs font-semibold transition text-center w-full whitespace-nowrap"
                      >
                        Ask about this service
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {rows.length > shown && (
            <button
              onClick={() => setShown(shown + PAGE)}
              className="w-full py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition shadow-xs"
            >
              Show {Math.min(PAGE, rows.length - shown)} more ({rows.length - shown} left)
            </button>
          )}
        </section>
      )}

      {enquirySuccess && (
        <div className="fixed bottom-6 right-6 left-6 sm:left-auto z-50 max-w-sm bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
          <span className="min-w-0 break-words">{enquirySuccess}</span>
        </div>
      )}

      {enquireService && (
        <LongTermEnquiryModal
          isOpen={true}
          preselectedAgencyId={enquireService.agency?.id || ''}
          preselectedAgencyName={enquireService.agency?.name || ''}
          onClose={() => setEnquireService(null)}
          onSuccess={(enq: HcEnquiry) => {
            setEnquirySuccess(`Enquiry #${enq.enquiry_number} submitted! The agency coordinator will connect shortly.`);
            setTimeout(() => setEnquirySuccess(null), 6000);
          }}
        />
      )}
    </div>
  );
}

function BookPanel({ s, pincode, examples, onBack, onBooked, referral, prefill }: { s: HcService; pincode: string; examples: string; onBack: () => void; onBooked: (o: HcOrder) => void; referral?: HcReferral | null; prefill?: HcOrder | null }) {
  const visit = s.kind === 'VISIT';
  const [family, setFamily] = useState<PatientFamilyMember[]>([]);
  const [forWho, setForWho] = useState('');
  useFamilyBookingSelection(family,setForWho);
  const [sessions, setSessions] = useState(prefill?.sessions ? prefill.sessions : referral && visit ? Math.min(30, referral.sessions) : 1);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const dateChips = Array.from({ length: 10 }, (_, i) => { const d = new Date(Date.now() + i * 86400000); return { iso: iso(d), dow: d.getDay(), label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }) }; });
  const [date, setDate] = useState(dateChips[1].iso);
  const [time, setTime] = useState(prefill?.visits?.[0]?.start_time ? prefill.visits[0].start_time.slice(0, 5) : '');
  const [addr, setAddr] = useState(() => {
    if (prefill?.address) {
      const parts = prefill.address.split(', ');
      return {
        line: parts[0] || prefill.address,
        area: parts[1] || '',
        landmark: prefill.landmark || '',
        city: parts.length > 2 ? parts.slice(2).join(', ') : 'Hyderabad',
      };
    }
    return { line: '', area: '', landmark: '', city: '' };
  });
  const [homePin, setHomePin] = useState<{ lat: number; lng: number } | null>(null);
  // Start from the saved address for this PIN code (or the default), so the patient doesn't retype it.
  useEffect(() => {
    if (prefill?.address) return;
    getAddressesApi().then((list) => {
      const d = list.find((a) => a.pincode === pincode && a.isDefault) || list.find((a) => a.pincode === pincode);
      if (!d) return;
      setAddr((cur) => (cur.line ? cur : { line: d.addressLine1 || '', area: d.addressLine2 || '', landmark: d.landmark || '', city: d.city || '' }));
      if (d.pin) setHomePin((p) => p || d.pin || null);
    }).catch(() => undefined);
  }, []);
  const [needs, setNeeds] = useState(prefill?.care_needs || (referral ? `${referral.diagnosis}. ${referral.instructions} (${referral.source === 'DISCHARGE' ? `after discharge from ${referral.hospital_name}, ` : ''}advised by ${referral.doctor_name})`.slice(0, 500) : ''));
  const [gender, setGender] = useState<'ANY' | 'FEMALE' | 'MALE'>(prefill?.preferred_gender ? (prefill.preferred_gender as any) : 'ANY');
  const [pay, setPay] = useState<'UPI' | 'CASH'>('UPI');
  const [upi, setUpi] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [highlightField, setHighlightField] = useState<string | null>(null);
  useEffect(() => { getMyUserId().then((id) => (id ? getFamilyMembersApi(id) : [])).then(setFamily).catch(() => setFamily([])); }, []);
  const times = useMemo(() => {
    if (!visit) return s.shift_hours === 12 ? ['08:00', '20:00'] : ['08:00', '10:00', '14:00', '18:00', '20:00'];
    const out: string[] = [];
    for (let m = toMin(s.agency.day_open); m + Number(s.duration_minutes) <= toMin(s.agency.day_close); m += 30) out.push(hm(m));
    return out;
  }, [s, visit]);
  const okTime = (t: string) => new Date(`${date}T${t}:00`).getTime() >= Date.now() + 2 * 3600000;
  const startDow = new Date(`${date}T00:00:00`).getDay();
  const total = s.price * sessions;

  const getMissingField = () => {
    if (!time) {
      return { key: 'time', label: 'Choose a visit time to continue', id: 'field-visit-time' };
    }
    if (addr.line.trim().length < 5) {
      return { key: 'line', label: 'Enter your house / flat and street address', id: 'field-addr-line' };
    }
    if (addr.city.trim().length < 2) {
      return { key: 'city', label: 'Enter your city', id: 'field-addr-city' };
    }
    if (needs.trim().length < 10) {
      return { key: 'needs', label: 'Describe what care is needed (min 10 characters)', id: 'field-care-needs' };
    }
    return null;
  };
  const missing = getMissingField();
  const ready = !missing;

  const handlePayClick = (e: React.MouseEvent) => {
    if (busy) return;
    if (!ready) {
      e.preventDefault();
      const m = getMissingField();
      if (m) {
        const el = document.getElementById(m.id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          (el as HTMLElement).focus?.();
          setHighlightField(m.key);
          setTimeout(() => setHighlightField(null), 2500);
        }
      }
      return;
    }
    book();
  };

  const book = async () => {
    setBusy(true); setErr(null);
    let payment: PaidOnline | undefined;
    if (pay === 'UPI') {
      try { payment = await payOnline({ amount: total, purpose: 'home_care', description: `${s.name} · ${sessions} ${unit}${sessions === 1 ? '' : 's'}` }); }
      catch (e) { setErr(e instanceof PaymentCancelled ? e.message : `${(e as Error)?.message || 'The payment failed.'} You can try again or choose to pay later.`); setBusy(false); return; }
    }
    try {
      onBooked(await hcBookApi({
        service_id: s.id, sessions, start_date: date, start_time: time, weekdays: sessions > 1 ? weekdays : [],
        address: { line: addr.line.trim(), area: addr.area.trim() || undefined, landmark: addr.landmark.trim() || undefined, city: addr.city.trim(), pincode, pin: homePin || undefined },
        care_needs: needs.trim(), preferred_gender: gender, family_member_id: forWho || undefined, payment_mode: pay, payment,
        referral_id: referral?.id,
      }));
    } catch (x) { setErr(`${labError(x, 'Could not book. Please try again.')}${payment ? ' Your payment is being refunded (5–7 working days).' : ''}`); } finally { setBusy(false); }
  };
  const unit = visit ? 'visit' : 'shift';

  return (
    <section aria-label="Book home care" className={`${card} space-y-5`}><BookingForChip family={family} value={forWho} onChange={setForWho}/>
      {referral && <ReferralNote r={referral} />}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-bold text-teal-800">{s.category_label} · {s.agency.name}</p>
          <h2 className="text-lg font-black text-slate-900">{s.name}</h2>
          <p className="text-xs text-slate-600">{rupees(s.price)} per {unit}{visit ? ` · ${s.duration_minutes} min` : ` · ${s.shift_hours} hours`}{s.includes ? ` · ${s.includes}` : ''}</p>
        </div>
        <button onClick={onBack} className="text-xs font-bold text-slate-600 inline-flex items-center gap-1"><X className="w-3.5 h-3.5" /> Change</button>
      </div>

      {family.length > 0 && (
        <div className="space-y-1.5"><p className="text-xs font-black text-slate-700">Who needs care?</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Patient">
            {[{ id: '', name: 'Myself' }, ...family.map((f) => ({ id: String(f.memberUserId), name: `${f.name} (${f.relationship}${f.age != null ? `, ${f.age} y` : ''})` }))].map((p) => (
              <button key={p.id || 'me'} type="button" aria-pressed={forWho === p.id} onClick={() => setForWho(p.id)} className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${forWho === p.id ? 'bg-teal-700 text-white border-teal-700' : 'bg-white text-slate-700 border-slate-200'}`}>{p.name}</button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs font-black text-slate-700">How many {unit}s?</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label={`Number of ${unit}s`}>
          {(visit ? [1, 5, 10, 15] : [1, 7, 15, 30]).map((n) => <button key={n} type="button" aria-pressed={sessions === n} onClick={() => setSessions(n)} className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${sessions === n ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'}`}>{n === 1 ? `1 ${unit}` : visit ? `${n} sessions` : `${n} days`}</button>)}
          <input aria-label="Custom number" inputMode="numeric" value={String(sessions)} onChange={(e) => setSessions(Math.max(1, Math.min(30, Number(e.target.value.replace(/\D/g, '')) || 1)))} className="w-16 rounded-xl border border-slate-200 px-2 py-1.5 text-xs font-bold text-center" />
        </div>
        {sessions > 1 && (
          <div className="space-y-1">
            <p className="text-[11px] text-slate-600">On which days? Leave all off for every day.</p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Days of the week">
              {DAYS.map((d, i) => <button key={d} type="button" aria-pressed={weekdays.includes(i)} onClick={() => setWeekdays(weekdays.includes(i) ? weekdays.filter((x) => x !== i) : [...weekdays, i])} className={`w-11 py-1.5 rounded-lg border text-xs font-bold ${weekdays.includes(i) ? 'bg-teal-700 text-white border-teal-700' : 'bg-white text-slate-600 border-slate-200'}`}>{d}</button>)}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-black text-slate-700">{sessions > 1 ? 'Starting on' : 'Date'}</p>
        <div className="flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Start date">
          {dateChips.map((d) => { const off = sessions > 1 && weekdays.length > 0 && !weekdays.includes(d.dow); return (
            <button key={d.iso} type="button" disabled={off} aria-pressed={date === d.iso} onClick={() => { setDate(d.iso); setTime(''); }} className={`shrink-0 px-3 py-1.5 rounded-lg border text-xs font-bold ${off ? 'bg-slate-50 text-slate-300 border-slate-100' : date === d.iso ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'}`}>{d.label}</button>
          ); })}
        </div>
        {sessions > 1 && weekdays.length > 0 && !weekdays.includes(startDow) && <p className="text-[11px] font-semibold text-amber-800">Pick a start date on one of the chosen days.</p>}
        <div id="field-visit-time" className={`grid grid-cols-4 sm:grid-cols-6 gap-1.5 transition-all duration-300 rounded-xl ${highlightField === 'time' ? 'ring-4 ring-amber-400 p-1 border border-amber-500 bg-amber-50/50' : ''}`} role="group" aria-label="Time">
          {times.filter(okTime).map((t) => <button key={t} type="button" aria-pressed={time === t} onClick={() => setTime(t)} className={`px-2 py-1.5 rounded-lg border text-xs font-bold tabular-nums ${time === t ? 'bg-teal-700 text-white border-teal-700' : 'bg-white text-slate-700 border-slate-200'}`}>{label12(t)}{!visit && s.shift_hours === 12 ? (t === '08:00' ? ' · day' : ' · night') : ''}</button>)}
          {!times.filter(okTime).length && <p className="col-span-full text-xs text-slate-500">No times left that day. Choose another date.</p>}
        </div>
      </div>

      <fieldset className="grid sm:grid-cols-2 gap-2" aria-label="Address">
        <legend className="text-xs font-black text-slate-700 mb-1">Where · pincode {pincode}</legend>
        <input id="field-addr-line" aria-label="House / flat and street" value={addr.line} onChange={(e) => setAddr({ ...addr, line: e.target.value.slice(0, 120) })} placeholder="House / flat no. and street" className={`${field} sm:col-span-2 transition-all duration-300 ${highlightField === 'line' ? 'ring-4 ring-amber-400 border-amber-500' : ''}`} />
        <input aria-label="Area" value={addr.area} onChange={(e) => setAddr({ ...addr, area: e.target.value.slice(0, 60) })} placeholder="Area / locality" className={field} />
        <input aria-label="Landmark" value={addr.landmark} onChange={(e) => setAddr({ ...addr, landmark: e.target.value.slice(0, 60) })} placeholder="Landmark (helps them find you)" className={field} />
        <input id="field-addr-city" aria-label="City" value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value.replace(/[^A-Za-z .-]/g, '').slice(0, 40) })} placeholder="City" className={`${field} transition-all duration-300 ${highlightField === 'city' ? 'ring-4 ring-amber-400 border-amber-500' : ''}`} />
        <HomePinField
          value={homePin}
          onChange={setHomePin}
          who="care professional"
          onAddressResolved={(resolved) => {
            setAddr((cur) => ({
              ...cur,
              line: resolved.line || cur.line,
              area: resolved.area || cur.area,
              city: resolved.city || cur.city,
              landmark: resolved.landmark || cur.landmark,
            }));
            if (resolved.pin !== undefined) {
              setHomePin(resolved.pin);
            }
          }}
          currentAddress={addr}
        />
      </fieldset>

      <label className="block text-xs font-black text-slate-700">What care is needed?
        <textarea id="field-care-needs" aria-label="Care needed" rows={3} value={needs} onChange={(e) => setNeeds(e.target.value.slice(0, 500))} placeholder={examples} className={`${field} mt-1 font-medium transition-all duration-300 ${highlightField === 'needs' ? 'ring-4 ring-amber-400 border-amber-500' : ''}`} />
        <span className="block text-[11px] font-medium text-slate-500 mt-0.5 flex items-center gap-1"><Info className="w-3.5 h-3.5" /> Mention the condition, medicines or dressings, mobility and anything the professional should bring. Keep the doctor’s prescription ready.</span>
      </label>

      <div className="space-y-1.5"><p className="text-xs font-black text-slate-700">Preferred professional</p>
        <div className="flex gap-2" role="radiogroup" aria-label="Preferred professional">
          {([['ANY', 'No preference'], ['FEMALE', 'Female'], ['MALE', 'Male']] as const).map(([v, l]) => <button key={v} type="button" role="radio" aria-checked={gender === v} onClick={() => setGender(v)} className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${gender === v ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'}`}>{l}</button>)}
        </div>
      </div>

      <div className="rounded-xl bg-slate-50 p-3 space-y-2">
        <div className="flex justify-between text-sm"><span className="text-slate-700">{rupees(s.price)} × {sessions} {unit}{sessions === 1 ? '' : 's'}</span><b className="tabular-nums text-slate-900">{rupees(total)}</b></div>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Payment">
          <button type="button" role="radio" aria-checked={pay === 'UPI'} onClick={() => setPay('UPI')} className={`px-3 py-2 rounded-xl border text-sm font-bold ${pay === 'UPI' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-700'}`}>Pay online now</button>
          <button type="button" role="radio" aria-checked={pay === 'CASH'} onClick={() => setPay('CASH')} className={`px-3 py-2 rounded-xl border text-sm font-bold ${pay === 'CASH' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-700'}`}>Pay at the visit</button>
        </div>
        {pay === 'UPI' && <p className="text-xs text-slate-500">Pay securely with UPI, card or net banking in the next step.</p>}
        <CancellationRefundPolicy service="homecare" className="mt-2" />
      </div>
      {err && <p role="alert" className="text-sm font-semibold text-rose-700">{err}</p>}
      <button
        type="button"
        disabled={busy}
        aria-disabled={!ready}
        onClick={handlePayClick}
        className={`w-full px-4 py-3 rounded-xl bg-teal-700 text-white text-sm font-bold transition ${
          !ready || busy ? 'opacity-50 cursor-pointer' : 'hover:bg-teal-800 shadow-sm'
        }`}
      >
        {busy ? 'Booking…' : pay === 'UPI' ? `Pay ${rupees(total)} & request` : `Request ${sessions > 1 ? `${sessions} ${unit}s` : `the ${unit}`}`}
      </button>
      {!ready && missing && (
        <p role="alert" className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 text-center font-medium mt-1 animate-in fade-in">
          {missing.label}
        </p>
      )}
    </section>
  );
}

export function BookedNote({ o, onOpen }: { o: HcOrder; onOpen: () => void }) {
  return (
    <section className={`${card} text-center space-y-2`} aria-label="Request received">
      <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
      <h2 className="text-xl font-black text-slate-900">Request sent to {o.agency_name}</h2>
      <p className="text-sm text-slate-700">{o.service_name}{o.sessions > 1 ? ` · ${o.schedule_text}` : ''} · first visit {new Date(`${o.visits[0].date}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })} at {label12(o.visits[0].start_time)}</p>
      <p className="text-sm text-slate-600">They’ll assign a professional; you’ll be told their name, qualification and experience. {o.payment_status === 'PAID' ? `${rupees(o.total_amount)} paid.` : `${rupees(o.total_amount)} to pay at the visit.`}</p>
      <p className="text-xs font-mono text-slate-500">{o.order_number}</p>
      <button onClick={onOpen} className="px-4 py-2.5 rounded-xl bg-teal-700 text-white text-sm font-bold">See my booking</button>
    </section>
  );
}

