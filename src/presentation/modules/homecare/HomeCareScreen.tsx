import BookingForChip,{useBookingFamily} from '../family/BookingForChip';
import LocationBar from '../../components/location/LocationBar';
import HomeCareHome from './HomeCareHome';
import {Toast} from '../../components/motion/Motion';
import { useCallback, useEffect, useState } from 'react';
import { paidLabel } from '../../../config/payments';
import HomeCareAgencyBook, { BookedNote } from './HomeCareAgency';
import { DoctorReferrals, referralTab } from './HomeCareCare';
import type { HcReferral } from '../../../services/homecareHelper';
import HomeCareVisits from './HomeCareVisits';
import LongTermEnquiryModal from './components/LongTermEnquiryModal';
import { TAB_OF, hcCoverageApi, type HcCategory, type HcOrder, type HcEnquiry } from '../../../services/homecareHelper';
import { getAddressesApi, type PatientAddress } from '../../../services/patientHelper';
import ServiceLocationDialog from '../../components/location/ServiceLocationDialog';
import { useSearchArea } from '../../../services/location';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Home,
  Sun,
  Moon,
  Search,
  Stethoscope,
  CheckCircle2,
  MapPin,
  AlertTriangle,
  RotateCcw,
  Syringe,
  Activity,
  HeartHandshake,
  ClipboardList,
  ShieldCheck,
  CalendarCheck,
  PhoneCall,
  Clock,
  UserCheck,
  FileText,
  BadgeAlert,
  ArrowRight,
  Shield,
  Sparkles,
} from 'lucide-react';
import { homeVisitDoctorsApi, homeVisitAreaSummary, myHomeVisitsApi, cancelHomeVisitApi, labError, rupees, type HomeVisitDoctor, type MyHomeVisit } from '../../../services/labHelper';
import { homeVisitView, FIND_ANOTHER_DOCTOR, VISIT_CODE_HINT, type HomeVisitTone } from '../consultations/homeVisitStatus';
import { validatePinCode } from '../../../utils/validators/india';

// Home care: nurses, physiotherapists and caregivers from registered agencies, a doctor's home visit,
// and everything booked — who is coming, visit codes, what was done at each visit.
const label12 = (t: string) => { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; };
const dayLong = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long' });
const TONE: Record<HomeVisitTone, string> = {
  amber: 'bg-amber-50 text-amber-900 border-amber-200',
  sky: 'bg-sky-50 text-sky-800 border-sky-200',
  indigo: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  violet: 'bg-violet-50 text-violet-800 border-violet-200',
  emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  rose: 'bg-rose-50 text-rose-800 border-rose-200',
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
};
const card = 'rounded-2xl border border-white/80 bg-white/75 backdrop-blur-xl p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] ring-1 ring-white/60';

type HcTab = 'nursing' | 'physio' | 'caregiver' | 'doctor' | 'mine';
type HcTrack = 'single' | 'longterm';

const TABS: { id: HcTab; label: string; hint: string; icon: any; image: string }[] = [
  { id: 'nursing', label: 'Nursing', hint: 'Injections, IV, wound care', icon: Syringe, image: '/images/healthcare/services/homecare.webp' },
  { id: 'physio', label: 'Physiotherapy', hint: 'After surgery, stroke, back pain', icon: Activity, image: '/images/healthcare/departments/orthopedics.webp' },
  { id: 'caregiver', label: 'Caregivers', hint: 'Bathing, feeding, mobility assistance', icon: HeartHandshake, image: '/images/healthcare/placeholders/caregiver-female.webp' },
  { id: 'doctor', label: 'Doctor at home', hint: 'Doctor’s consultation at your home', icon: Stethoscope, image: '/images/healthcare/services/doctor.webp' },
  { id: 'mine', label: 'My bookings & quotes', hint: 'Visits, care plan, quotes, MAR', icon: ClipboardList, image: '' },
];
const CATEGORY: Record<string, HcCategory> = { nursing: 'NURSING', physio: 'PHYSIOTHERAPY', caregiver: 'CAREGIVER' };

// Home care: nurses, physiotherapists and caregivers from registered agencies, a doctor's home visit,
// and everything booked — who is coming, visit codes, what was done at each visit.
export default function HomeCareScreen() {
  const [params, setParams] = useSearchParams();
  const rawTab = params.get('tab') as HcTab | null;
  const rawTrack = params.get('track') as HcTrack | null;

  const [referral, setReferral] = useState<HcReferral | null>(null);
  const [track, setTrack] = useState<HcTrack>(rawTrack === 'longterm' ? 'longterm' : 'single');
  const [rebookOrder, setRebookOrder] = useState<HcOrder | null>(null);
  const [booked, setBooked] = useState<HcOrder | null>(null);

  const tab: HcTab = rawTab && TABS.some((t) => t.id === rawTab) ? rawTab : (referral ? (referralTab(referral) as HcTab) : 'nursing');

  // Long-Term Enquiry Modal State
  const [enquiryModalOpen, setEnquiryModalOpen] = useState(false);
  const [enquiryCareType, setEnquiryCareType] = useState('ATTENDANT');
  const [enquiryShiftPattern, setEnquiryShiftPattern] = useState('DAY_12');
  const [enquiryFeedback, setEnquiryFeedback] = useState<string | null>(null);

  const setTab = (t: HcTab) => {
    setReferral(null);
    setRebookOrder(null);
    // Keep what the patient searched for (agency from the header search, words) across care types.
    const keep: Record<string, string> = {};
    for (const k of ['agency', 'q', 'family_member_id']) { const v = params.get(k); if (v && t !== 'mine') keep[k] = v; }
    setParams({ tab: t, ...keep, ...(track === 'longterm' && t !== 'mine' ? { track: 'longterm' } : {}) }, { replace: true });
  };

  // From the header search: open on a care type the chosen agency offers (not always Nursing).
  useEffect(() => {
    const agency = params.get('agency');
    if (!agency || rawTab) return;
    hcCoverageApi(agency).then((c) => {
      const first = (['NURSING', 'PHYSIOTHERAPY', 'CAREGIVER'] as HcCategory[]).find((x) => c.categories.includes(x));
      if (first) setParams((p) => { const n = new URLSearchParams(p); n.set('tab', TAB_OF[first] as string); return n; }, { replace: true });
    }).catch(() => undefined);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const switchTrack = (newTrack: HcTrack) => {
    setTrack(newTrack);
    setParams(
      newTrack === 'longterm'
        ? { track: 'longterm', ...(tab === 'mine' ? { tab: 'mine' } : {}) }
        : { tab: tab === 'mine' ? 'mine' : 'nursing' },
      { replace: true }
    );
  };

  const handleBookAgain = (o: HcOrder) => {
    setBooked(null);
    setReferral(null);
    setRebookOrder(o);
    const targetTab = (TAB_OF[o.category] || 'nursing') as HcTab;
    setParams({ tab: targetTab }, { replace: true });
  };

  const openEnquiry = (careType: string = 'ATTENDANT', shift: string = 'DAY_12') => {
    setEnquiryCareType(careType);
    setEnquiryShiftPattern(shift);
    setEnquiryModalOpen(true);
  };

  if (params.get('tab') === 'mine') return <HomeCareVisits onBookAgain={handleBookAgain} doctorVisits={<Mine/>}/>;

  // Booking a service picked in Home care › search: a focused page (no banner), back to the results.
  if (params.get('service') && CATEGORY[tab]) {
    return (
      <div className="mx-auto w-full max-w-[1240px] space-y-4 pb-12">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-[13px] text-slate-600">
          <a href="/home-care" onClick={(e) => { e.preventDefault(); setParams({}, { replace: false }); }} className="font-semibold text-orange-700">Home care</a><span aria-hidden>›</span>
          <button type="button" onClick={() => window.history.back()} className="font-semibold text-orange-700">Search results</button><span aria-hidden>›</span><span>Book</span>
        </nav>
        {booked
          ? <BookedNote o={booked} onOpen={() => { setBooked(null); setParams({ tab: 'mine', open: booked.id }, { replace: true }); }} />
          : <HomeCareAgencyBook key={`${tab}-search`} category={CATEGORY[tab]} onCategory={(c) => setTab(TAB_OF[c] as HcTab)} onBooked={(o) => setBooked(o)} />}
      </div>
    );
  }

  // No care type chosen yet: the search-first Home care home (approved design 18 Nov). Every old
  // link (?tab=, ?track=longterm, ?agency=, ?q=) still opens the screens below.
  if (!rawTab && !rawTrack && !params.get('agency') && !params.get('q') && !referral && !rebookOrder && !booked) {
    return (
      <>
        <HomeCareHome
          onLongTerm={() => switchTrack('longterm')}
          top={<DoctorReferrals onBook={(r) => { setBooked(null); setTrack('single'); setParams({ tab: referralTab(r) as HcTab }, { replace: true }); setReferral(r); }} />}
        />
        {enquiryFeedback && <Toast onClose={() => setEnquiryFeedback(null)}>{enquiryFeedback}</Toast>}
      </>
    );
  }

  return (
    <div className="relative w-full space-y-6 pb-12">
      {/* Ambient glassmorphic illumination orbs */}
      <div className="pointer-events-none absolute -top-12 -left-12 w-96 h-96 rounded-full bg-amber-400/10 blur-3xl -z-10" />
      <div className="pointer-events-none absolute top-48 -right-12 w-96 h-96 rounded-full bg-sky-400/10 blur-3xl -z-10" />
      <div className="pointer-events-none absolute top-[700px] left-1/4 w-[500px] h-[500px] rounded-full bg-teal-400/10 blur-3xl -z-10" />

      <LocationBar compact purpose="find home care near you"/>
      {/* Frosted Glass Header */}
      <header className="relative isolate min-h-[190px] overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-r from-orange-50/85 via-amber-50/70 to-white/60 backdrop-blur-xl px-5 py-5 sm:px-7 sm:py-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] ring-1 ring-white/60">
        <div className="absolute inset-y-0 right-0 z-0 hidden w-[58%] sm:block">
          <div className="absolute inset-0 z-10 bg-gradient-to-r from-orange-50/90 via-orange-50/70 to-transparent" />
          <img src="/images/healthcare/services/homecare.webp" alt="" className="h-full w-full object-cover object-center" />
        </div>
        <div className="relative z-20 max-w-2xl">
          <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-orange-800">Quality care at home</p>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Trusted healthcare services<br className="hidden sm:block" /> in the comfort of <span className="text-orange-700">your home</span></h1>
          <p className="mt-1.5 max-w-xl text-sm text-slate-600">Professional nursing, physiotherapy, caregiver support, and doctor visits — at your doorstep.</p>
          <div className="mt-4 flex flex-wrap gap-x-2.5 gap-y-2 text-xs font-semibold text-slate-700">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/75 backdrop-blur-md border border-white/80 shadow-xs">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />Verified care providers
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/75 backdrop-blur-md border border-white/80 shadow-xs">
              <UserCheck className="h-4 w-4 text-sky-600" />Support for your family
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/75 backdrop-blur-md border border-white/80 shadow-xs">
              <Clock className="h-4 w-4 text-blue-600" />Flexible visits
            </span>
          </div>
        </div>
        {tab !== 'mine' && (
          <button
            type="button"
            onClick={() => { setReferral(null); setRebookOrder(null); setTrack('single'); setParams({ tab: 'doctor' }, { replace: true }); }}
            className="absolute bottom-4 right-4 z-20 hidden rounded-xl border border-orange-200/80 bg-white/80 backdrop-blur-md px-4 py-2 text-xs font-bold text-orange-900 shadow-sm hover:bg-white hover:shadow-md lg:inline-flex lg:items-center lg:gap-2 transition-all duration-200"
          >
            <PhoneCall className="h-4 w-4 text-orange-700" />
            Request a doctor visit
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </header>

      {/* Main Track Switcher (Frosted Glass Container) */}
      <div className="p-1.5 rounded-2xl bg-white/50 backdrop-blur-xl border border-white/80 grid grid-cols-1 sm:grid-cols-3 gap-1.5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] ring-1 ring-white/50">
        <button
          type="button"
          onClick={() => {
            switchTrack('single');
            if (tab === 'mine') setTab('nursing');
          }}
          data-testid="track-single-visits"
          className={`px-4 py-3 rounded-xl text-left motion-safe:transition-all motion-safe:duration-200 motion-reduce:transition-none hover:-translate-y-0.5 flex items-center gap-3 ${
            track === 'single' && tab !== 'mine'
              ? 'bg-white/95 backdrop-blur-md text-slate-900 shadow-md border border-white/90 ring-2 ring-orange-700/15'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <div
            className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${
              track === 'single' && tab !== 'mine' ? 'bg-orange-800 text-white' : 'bg-slate-200/80 text-slate-700'
            }`}
          >
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-sm font-black">Visits &amp; courses</span>
            <span className="block text-[11px] text-slate-500">Nursing, physiotherapy, caregiver or doctor</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            switchTrack('longterm');
            if (tab === 'mine') setTab('nursing');
          }}
          data-testid="track-longterm-care"
          className={`px-4 py-3 rounded-xl text-left motion-safe:transition-all motion-safe:duration-200 motion-reduce:transition-none hover:-translate-y-0.5 flex items-center gap-3 ${
            track === 'longterm' && tab !== 'mine'
              ? 'bg-white/95 backdrop-blur-md text-slate-900 shadow-md border border-white/90 ring-2 ring-orange-700/15'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <div
            className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${
              track === 'longterm' && tab !== 'mine' ? 'bg-orange-800 text-white' : 'bg-slate-200/80 text-slate-700'
            }`}
          >
            <HeartHandshake className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="block text-xs font-black uppercase tracking-wider text-orange-800">12 h / 24 h</span>
            </div>
            <span className="block text-sm font-black">Day or live-in care</span>
            <span className="block text-[11px] text-slate-500">Ongoing support for you or your family</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setTab('mine')}
          data-testid="tab-my-bookings"
          className={`px-4 py-3 rounded-xl text-left motion-safe:transition-all motion-safe:duration-200 motion-reduce:transition-none hover:-translate-y-0.5 flex items-center gap-3 ${
            tab === 'mine'
              ? 'bg-white/95 backdrop-blur-md text-slate-900 shadow-md border border-white/90 ring-2 ring-orange-700/15'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <div
            className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${
              tab === 'mine' ? 'bg-orange-800 text-white' : 'bg-slate-200/80 text-slate-700'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-xs font-black uppercase tracking-wider text-orange-800">Manage</span>
            <span className="block text-sm font-black">My bookings &amp; quotes</span>
            <span className="block text-[11px] text-slate-500">Track visits, logs, quotes, invoice</span>
          </div>
        </button>
      </div>

      {/* Emergency Disclaimer Banner (Frosted) */}
      <p className="text-xs font-semibold text-rose-900 bg-rose-50/75 backdrop-blur-md border border-rose-200/80 rounded-xl px-3.5 py-2.5 flex items-center gap-2 shadow-xs">
        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
        <span>
          <b>Not for acute emergencies.</b> For chest pain, sudden breathlessness, loss of consciousness or heavy bleeding,
          call <a href="tel:108" className="font-black underline underline-offset-2">108</a> immediately.
        </span>
      </p>

      {track === 'longterm' ? (
        /* VIEW 2: LONG-TERM CARE (12 h / 24 h) TRACK */
        <div className="space-y-8" data-testid="longterm-care-view">
          {/* Hero Banner */}
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f3d45] via-[#115e59] to-[#0f172a] text-white p-6 sm:p-8 shadow-xl">
            <div className="relative z-10 max-w-2xl space-y-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-teal-50 text-xs font-extrabold border border-white/20">
                <Sparkles className="w-3.5 h-3.5" /> High-Trust Clinical Home Care
              </span>
              <h2 className="text-2xl sm:text-3xl font-black leading-tight text-white">
                Reliable 12h & 24h Care for Elderly Parents & Recovery at Home
              </h2>
              <p className="text-sm sm:text-base text-teal-50/90 leading-relaxed">
                Trained General Duty Attendants (GDAs) and Registered Nurses (GNM/B.Sc). Every caregiver is background
                checked, police-verified, and supported by a dedicated Care Manager. Free replacement guaranteed within 48 hours.
              </p>
              <div className="pt-2 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => openEnquiry('ELDER_CARE', 'DAY_12')}
                  data-testid="request-assessment-cta"
                  className="px-5 py-3 rounded-xl bg-white text-[#0f3d45] text-sm font-black hover:bg-emerald-50 transition shadow-lg inline-flex items-center gap-2"
                >
                  <span>Request Clinical Assessment</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => openEnquiry('ELDER_CARE', 'DAY_12')}
                  className="px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-bold hover:bg-white/15 transition inline-flex items-center gap-2"
                >
                  <PhoneCall className="w-4 h-4 text-teal-100" />
                  <span>Request a care team callback</span>
                </button>
              </div>
            </div>
            {/* Background pattern */}
            <div className="absolute right-0 bottom-0 top-0 w-1/3 text-white opacity-[0.08] pointer-events-none flex items-center justify-center">
              <HeartHandshake className="w-80 h-80 text-white" />
            </div>
          </section>

          {/* 4 Package Cards */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900">Caregiver & Nursing Packages</h3>
                <p className="text-xs text-slate-500">
                  Select a care package to request an in-home clinical assessment and customized quotation.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Package 1 */}
              <div
                className="rounded-2xl border border-white/80 bg-white/75 backdrop-blur-xl p-5 space-y-4 flex flex-col justify-between hover:border-amber-300/80 hover:bg-white/90 hover:shadow-xl hover:shadow-amber-950/5 hover:-translate-y-0.5 transition-all duration-300"
                data-testid="package-card-day-attendant"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-orange-900">12h Day Shift</span>
                    <span className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 text-orange-800 grid place-items-center"><Sun className="w-4.5 h-4.5" /></span>
                  </div>
                  <h4 className="text-base font-black text-slate-900">Day Attendant</h4>
                  <p className="text-xs text-slate-500 font-medium">8:00 AM – 8:00 PM (12 hours)</p>
                  <p className="text-xs text-slate-600 pt-1">
                    Ideal for elderly parents needing day assistance: bathing, sponge bath, feeding, mobility support,
                    vital signs monitoring, and companionship.
                  </p>
                  <ul className="text-[11px] text-slate-600 space-y-1.5 pt-2">
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Certified GDA attendant</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Daily vital sign & food logs</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>48h replacement guarantee</span>
                    </li>
                  </ul>
                </div>
                <div className="pt-3 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-slate-500">Starting from</span>
                    <span className="text-base font-black text-slate-900">₹900 <span className="text-[11px] font-normal text-slate-500">/ shift</span></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openEnquiry('ATTENDANT', 'DAY_12')}
                    data-testid="enquire-day-attendant"
                    className="w-full py-2.5 rounded-xl bg-orange-800 hover:bg-orange-900 text-white font-bold text-xs motion-safe:transition-colors motion-reduce:transition-none shadow-sm text-center"
                  >
                    Request Assessment
                  </button>
                </div>
              </div>

              {/* Package 2 */}
              <div
                className="rounded-2xl border border-white/80 bg-white/75 backdrop-blur-xl p-5 space-y-4 flex flex-col justify-between hover:border-amber-300/80 hover:bg-white/90 hover:shadow-xl hover:shadow-amber-950/5 hover:-translate-y-0.5 transition-all duration-300"
                data-testid="package-card-night-attendant"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-orange-900">12h Night Shift</span>
                    <span className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 text-orange-800 grid place-items-center"><Moon className="w-4.5 h-4.5" /></span>
                  </div>
                  <h4 className="text-base font-black text-slate-900">Night Attendant</h4>
                  <p className="text-xs text-slate-500 font-medium">8:00 PM – 8:00 AM (12 hours)</p>
                  <p className="text-xs text-slate-600 pt-1">
                    Focused on night-time safety: assistance with bedtime routine, turning bedridden patients every 2 hours,
                    toileting, and preventing night fall accidents.
                  </p>
                  <ul className="text-[11px] text-slate-600 space-y-1.5 pt-2">
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Fall prevention & safety</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>2-hour turn & repositioning</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Restful sleep assurance</span>
                    </li>
                  </ul>
                </div>
                <div className="pt-3 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-slate-500">Starting from</span>
                    <span className="text-base font-black text-slate-900">₹1,000 <span className="text-[11px] font-normal text-slate-500">/ shift</span></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openEnquiry('ELDER_CARE', 'NIGHT_12')}
                    data-testid="enquire-night-attendant"
                    className="w-full py-2.5 rounded-xl bg-orange-800 hover:bg-orange-900 text-white font-bold text-xs motion-safe:transition-colors motion-reduce:transition-none shadow-sm text-center"
                  >
                    Request Assessment
                  </button>
                </div>
              </div>

              {/* Package 3 */}
              <div
                className="rounded-2xl border-2 border-orange-500/80 bg-white/85 backdrop-blur-xl p-5 space-y-4 flex flex-col justify-between shadow-lg shadow-orange-900/5 relative hover:-translate-y-0.5 transition-all duration-300"
                data-testid="package-card-livein-attendant"
              >
                <div className="absolute -top-3 right-5 bg-orange-800 text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-full tracking-wider whitespace-nowrap shadow-sm">
                  24-hour care
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-orange-900">24h Continuous</span>
                    <span className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 text-orange-800 grid place-items-center"><Home className="w-4.5 h-4.5" /></span>
                  </div>
                  <h4 className="text-base font-black text-slate-900">24-Hour Live-in Care</h4>
                  <p className="text-xs text-slate-500 font-medium">Round the clock, residential stay</p>
                  <p className="text-xs text-slate-600 pt-1">
                    Continuous dedicated stay-in attendant for seniors living alone or recovery after severe stroke. Full
                    hygiene, meal assistance, routine, and 24/7 peace of mind.
                  </p>
                  <ul className="text-[11px] text-slate-600 space-y-1.5 pt-2">
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Dedicated live-in companion</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Comprehensive ADL assistance</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Weekly off relief staff matched</span>
                    </li>
                  </ul>
                </div>
                <div className="pt-3 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-slate-500">Starting from</span>
                    <span className="text-base font-black text-orange-900">₹1,600 <span className="text-[11px] font-normal text-slate-500">/ day</span></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openEnquiry('BEDRIDDEN', 'LIVE_IN_24')}
                    data-testid="enquire-livein-attendant"
                    className="w-full py-2.5 rounded-xl bg-orange-800 hover:bg-orange-900 text-white font-bold text-xs motion-safe:transition-colors motion-reduce:transition-none shadow-sm text-center"
                  >
                    Request Assessment
                  </button>
                </div>
              </div>

              {/* Package 4 */}
              <div
                className="rounded-2xl border border-white/80 bg-white/75 backdrop-blur-xl p-5 space-y-4 flex flex-col justify-between hover:border-amber-300/80 hover:bg-white/90 hover:shadow-xl hover:shadow-amber-950/5 hover:-translate-y-0.5 transition-all duration-300"
                data-testid="package-card-skilled-nurse"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-orange-900">Clinical Nursing</span>
                    <span className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 text-orange-800 grid place-items-center"><Stethoscope className="w-4.5 h-4.5" /></span>
                  </div>
                  <h4 className="text-base font-black text-slate-900">12h / 24h Skilled Nurse</h4>
                  <p className="text-xs text-slate-500 font-medium">Registered GNM / B.Sc Nurse</p>
                  <p className="text-xs text-slate-600 pt-1">
                    Hospital stepdown & ICU care: tracheostomy suction, Foley catheter, Ryle’s tube feeding, IV/IM injections,
                    surgical wound dressing & clinical charting.
                  </p>
                  <ul className="text-[11px] text-slate-600 space-y-1.5 pt-2">
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>INC / Council verified nurse</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Digital MAR medication logs</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>GST as per service type — shown on your quote</span>
                    </li>
                  </ul>
                </div>
                <div className="pt-3 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-slate-500">Starting from</span>
                    <span className="text-base font-black text-slate-900">₹1,800 <span className="text-[11px] font-normal text-slate-500">/ shift</span></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openEnquiry('NURSE', 'DAY_12')}
                    data-testid="enquire-skilled-nurse"
                    className="w-full py-2.5 rounded-xl bg-orange-800 hover:bg-orange-900 text-white font-bold text-xs motion-safe:transition-colors motion-reduce:transition-none shadow-sm text-center"
                  >
                    Request Assessment
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* How It Works Pipeline (5 Steps) */}
          <section className={`${card} space-y-5`} aria-label="How long-term care works">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-teal-700">Structured Healthcare Process</span>
              <h3 className="text-lg font-black text-slate-900 mt-0.5">How Long-Term Care Works</h3>
              <p className="text-xs text-slate-500">
                Continuous care requires thorough clinical matching. We do not place unassessed staff in your home.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-5 text-xs">
              {[
                {
                  num: '01',
                  title: 'Enquire Online',
                  text: 'Share patient conditions, mobility needs, and schedule in 3 minutes.',
                  icon: FileText,
                },
                {
                  num: '02',
                  title: 'Care Manager Calls',
                  text: 'Clinical triage call to understand routine & medical background.',
                  icon: PhoneCall,
                },
                {
                  num: '03',
                  title: 'Home Assessment',
                  text: 'Nurse visits to evaluate fall risk (Morse) & pressure-sore risk (Braden).',
                  icon: Activity,
                },
                {
                  num: '04',
                  title: 'Quote & Care Plan',
                  text: 'Review customized rates, 7/14/30 day cycle, GST breakdown & caregiver profiles.',
                  icon: UserCheck,
                },
                {
                  num: '05',
                  title: 'Care Starts Safely',
                  text: 'Accept quote & pay advance. Verified caregiver arrives with daily digital MAR & logs.',
                  icon: CheckCircle2,
                },
              ].map((s) => (
                <div key={s.num} className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 space-y-2 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-teal-700 font-mono">{s.num}</span>
                    <s.icon className="w-4 h-4 text-slate-400" />
                  </div>
                  <h4 className="font-bold text-slate-900">{s.title}</h4>
                  <p className="text-[11px] text-slate-600 leading-snug">{s.text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* High Trust Proof Points (6 Grid) */}
          <section className="space-y-3">
            <h3 className="text-base font-black text-slate-900">Safety, Trust & Quality Guarantees</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-xs">
              <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 grid place-items-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">100% Police Verified</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Official state police clearance certificate verified on file before assignment.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 grid place-items-center shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">UIDAI Aadhaar Verified</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Government identity confirmed; last 4 digits stored securely for family trust.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 grid place-items-center shrink-0">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">48-Hour Replacement SLA</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    If personality or care needs don’t match, we propose a replacement with a strict 48h deadline.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 grid place-items-center shrink-0">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Daily Digital Logs & MAR</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    See blood pressure, pulse, SpO2, meals, sleep, and administered medicines every evening on your phone.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 grid place-items-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Doorstep GPS Verification</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Caregivers check in and check out within 200m of your home; logs require daily completion before exit.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 grid place-items-center shrink-0">
                  <BadgeAlert className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Instant 108 SOS Protocol</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    One-tap ambulance (108) and emergency (112) direct dialing with instant agency escalation.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Talk to Care Manager Callout */}
          <section className="rounded-2xl border border-teal-200 bg-teal-50/70 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-black text-teal-950 flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-teal-700" /> Need guidance for a parent or family member?
              </h4>
              <p className="text-xs text-teal-900">
                Our care coordinators help evaluate mobility, post-operative needs, and caregiver schedules.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setTab('mine')}
                className="px-4 py-2.5 rounded-xl border border-teal-700 text-teal-800 text-xs font-bold hover:bg-teal-100 transition"
              >
                Track My Enquiries & Quotes
              </button>
              <button
                type="button"
                onClick={() => openEnquiry('ELDER_CARE', 'DAY_12')}
                className="px-4 py-2.5 rounded-xl bg-teal-700 text-white text-xs font-bold hover:bg-teal-800 transition shadow-sm"
              >
                Request Callback
              </button>
            </div>
          </section>
        </div>
      ) : (
        /* VIEW 3: SINGLE VISITS (30–60 MIN) TRACK */
        <div className="space-y-5" data-testid="single-visits-view">
          {/* Choose a care type */}
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-lg font-black text-slate-900">What care do you need?</h2>
              <p className="text-xs text-slate-500">Choose a service to see providers available near your home.</p>
            </div>
          </div>
          {/* Sub-Tabs for Single Visits (Glassmorphic Frosted Cards) */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" role="tablist" aria-label="Single visit services">
            {TABS.filter((t) => t.id !== 'mine').map((t) => {
              const Icon = t.icon;
              const on = tab === t.id;
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={on}
                  aria-label={t.label}
                  onClick={() => {
                    setBooked(null);
                    setTab(t.id);
                  }}
                  className={`group relative flex min-h-[104px] items-center gap-3.5 overflow-hidden rounded-2xl border p-3 text-left transition-all duration-300 backdrop-blur-xl hover:-translate-y-0.5 ${
                    on
                      ? 'border-amber-500/80 bg-gradient-to-br from-amber-50/90 via-white/80 to-amber-50/60 text-slate-900 shadow-md ring-2 ring-amber-500/25'
                      : 'border-white/80 bg-white/70 text-slate-800 hover:border-amber-300/80 hover:bg-white/90 hover:shadow-lg hover:shadow-amber-950/5'
                  }`}
                >
                  <img
                    src={t.image}
                    alt=""
                    aria-hidden="true"
                    className="h-20 w-20 shrink-0 rounded-xl bg-slate-100 object-cover shadow-xs border border-white/60 group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-slate-900 group-hover:text-amber-800 transition-colors">
                      {t.label === 'Nursing' ? 'Nursing care' : t.label === 'Caregivers' ? 'Caregiver support' : t.label}
                    </span>
                    <span className="mt-1 block text-xs leading-snug text-slate-500">
                      {t.hint}
                    </span>
                  </div>
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center self-end rounded-full transition-all duration-200 ${
                      on ? 'bg-amber-800 text-white shadow-xs' : 'bg-slate-100/80 backdrop-blur-sm text-slate-600 group-hover:bg-amber-100 group-hover:text-amber-800'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                </button>
              );
            })}
          </div>

          {!booked && !referral && (
            <DoctorReferrals
              onBook={(r) => {
                setBooked(null);
                setTrack('single');
                const targetTab = referralTab(r) as HcTab;
                setParams({ tab: targetTab }, { replace: true });
                setReferral(r);
              }}
            />
          )}

          {booked ? (
            <BookedNote
              o={booked}
              onOpen={() => {
                setBooked(null);
                setParams({ tab: 'mine', open: booked.id }, { replace: true });
              }}
            />
          ) : CATEGORY[tab] ? (
            <HomeCareAgencyBook
              key={`${tab}-${referral?.id || ''}-${rebookOrder?.id || ''}`}
              category={CATEGORY[tab]}
              onCategory={(c) => setTab(TAB_OF[c] as HcTab)}
              onBooked={(o) => {
                setReferral(null);
                setRebookOrder(null);
                setBooked(o);
              }}
              referral={referral && referral.category === CATEGORY[tab] ? referral : null}
              prefill={rebookOrder && rebookOrder.category === CATEGORY[tab] ? rebookOrder : null}
            />
          ) : (
            <Book />
          )}
        </div>
      )}

      {/* Global Long-Term Enquiry Modal */}
      {enquiryModalOpen && (
        <LongTermEnquiryModal
          isOpen={enquiryModalOpen}
          preselectedCareType={enquiryCareType}
          preselectedShiftPattern={enquiryShiftPattern}
          onClose={() => setEnquiryModalOpen(false)}
          onSuccess={(enq) => {
            setEnquiryModalOpen(false);
            setEnquiryFeedback(`Enquiry #${enq.enquiry_number} submitted! Our Care Manager will call you.`);
            setTab('mine');
          }}
        />
      )}

      {enquiryFeedback&&<Toast onClose={()=>setEnquiryFeedback(null)}>{enquiryFeedback}</Toast>}

    </div>
  );
}

/**
 * Home care › Doctor at home: the patient says WHERE the doctor should come (a saved address, their
 * current location or any area) and sees the doctors who visit there. PIN codes stay behind the scenes:
 * they are only how a doctor's coverage areas are matched.
 */
type VisitPlace = { key: string; label: string; detail: string; pincode: string; kind: 'saved' | 'area' };
function Book() {
  const [familyMemberId, setFamilyMemberId] = useState('');
  const { family: bookingFamily, error: familyError } = useBookingFamily(setFamilyMemberId);
  const searchArea = useSearchArea();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [saved, setSaved] = useState<PatientAddress[] | null>(null);
  const [place, setPlace] = useState<VisitPlace | null>(null);
  const [picking, setPicking] = useState(false);
  const [doctors, setDoctors] = useState<HomeVisitDoctor[] | null>(null);
  const [sort, setSort] = useState<'soonest' | 'fee'>('soonest');
  const [err, setErr] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [retry, setRetry] = useState(0);

  const savedPlace = (a: PatientAddress): VisitPlace => ({
    key: `saved:${a.addressId}`, kind: 'saved', pincode: a.pincode || '',
    label: a.addressType === 'HOME' ? 'Home' : a.addressType === 'WORK' ? 'Work' : a.label || 'Saved address',
    detail: [a.addressLine2 || a.addressLine1, a.city].filter(Boolean).join(', '),
  });
  const areaPlace = (a: NonNullable<typeof searchArea>): VisitPlace => ({ key: `area:${a.lat},${a.lng}`, kind: 'area', pincode: a.pincode || '', label: a.source === 'gps' ? 'Current location' : a.label.split(',')[0], detail: a.label });

  // Start from where the patient is: their default saved address, else the location set at the top of the page.
  useEffect(() => {
    getAddressesApi().then((list) => {
      const ok = list.filter((a) => a.pincode && validatePinCode(a.pincode).ok);
      setSaved(ok);
      const back = params.get('pincode');
      const d = (back && ok.find((a) => a.pincode === back)) || ok.find((a) => a.isDefault) || ok[0];
      setPlace((cur) => cur || (d ? savedPlace(d) : searchArea ? areaPlace(searchArea) : null));
    }).catch(() => { setSaved([]); setPlace((cur) => cur || (searchArea ? areaPlace(searchArea) : null)); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // A location chosen in the bar at the top of the page is used straight away (unless a saved address is picked).
  // eslint-disable-next-line react-hooks/set-state-in-effect -- follow the location bar
  useEffect(() => { if (searchArea && place?.kind !== 'saved') setPlace(areaPlace(searchArea)); }, [searchArea]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!place) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a place without a usable area can't be searched
    if (!validatePinCode(place.pincode).ok) { setDoctors(null); setErr(`We couldn’t work out the exact area for “${place.detail || place.label}”. Choose a nearby locality or one of your saved addresses.`); return; }
    let alive = true; setErr(null); setDoctors(null); setSearching(true);
    homeVisitDoctorsApi(place.pincode)
      .then((res) => { if (alive) setDoctors(res); })
      .catch((e) => { if (alive) setErr(labError(e, 'Could not load doctors for this location.')); })
      .finally(() => { if (alive) setSearching(false); });
    return () => { alive = false; };
  }, [place, retry]);

  // Picking a doctor opens the booking on its own page (same flow as Find doctors › Home visit).
  const open = (d: HomeVisitDoctor) => {
    const q = new URLSearchParams({ pincode: place?.pincode || '' });
    if (familyMemberId) q.set('family_member_id', familyMemberId);
    navigate(`/home-care/doctor/${encodeURIComponent(d.doctor_partner_id)}?${q}`);
  };
  const nextLabel = (d: HomeVisitDoctor) => {
    const n = d.next_slot;
    if (!n) return null;
    const ist = (o = 0) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + o * 86400000));
    const day = n.date === ist() ? 'Today' : n.date === ist(1) ? 'Tomorrow' : new Date(`${n.date}T12:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
    const [h, m] = n.time.split(':').map(Number);
    return `${day}, ${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  };
  const soon = (d: HomeVisitDoctor) => (d.next_slot ? `${d.next_slot.date} ${d.next_slot.time}` : '9');
  const shown = doctors ? [...doctors].sort((a, b) => (sort === 'fee' ? a.fee - b.fee : soon(a).localeCompare(soon(b)) || a.fee - b.fee)) : null;
  const chip = (on: boolean) => `inline-flex min-w-0 max-w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition ${on ? 'border-orange-600 bg-orange-50 ring-1 ring-orange-600 text-slate-900' : 'border-slate-200 bg-white hover:border-orange-300 text-slate-700'}`;
  const where = place ? place.detail || place.label : '';

  return (
    <div className="space-y-4">
      <BookingForChip family={bookingFamily} value={familyMemberId} onChange={setFamilyMemberId} />
      {familyError && <p role="alert" className="text-xs font-semibold text-rose-700">{familyError}</p>}

      <section className={`${card} space-y-4`} aria-label="Find a doctor for a home visit">
        <div>
          <h2 className="text-base font-black text-slate-900">Where should the doctor come?</h2>
          <p className="text-xs text-slate-500">Choose the patient’s address. We show doctors who make home visits there.</p>
        </div>
        <div role="radiogroup" aria-label="Visit location" className="flex flex-wrap gap-2">
          {saved === null && <span className="text-xs text-slate-400">Loading your addresses…</span>}
          {(saved || []).slice(0, 4).map((a) => {
            const p = savedPlace(a); const on = place?.key === p.key;
            return (
              <button key={p.key} type="button" role="radio" aria-checked={on} onClick={() => setPlace(p)} className={chip(on)}>
                <Home className="h-4 w-4 shrink-0 text-orange-700" />
                <span className="min-w-0"><b className="block font-bold">{p.label}{a.isDefault ? ' · Default' : ''}</b><span className="block truncate text-slate-500">{p.detail}</span></span>
              </button>
            );
          })}
          {place?.kind === 'area' && (
            <button type="button" role="radio" aria-checked className={chip(true)}>
              <MapPin className="h-4 w-4 shrink-0 text-orange-700" />
              <span className="min-w-0"><b className="block font-bold">{place.label}</b><span className="block truncate text-slate-500">{place.detail}</span></span>
            </button>
          )}
          <button type="button" onClick={() => setPicking(true)} className="inline-flex items-center gap-2 rounded-xl border border-dashed border-orange-400 bg-white px-3 py-2 text-xs font-bold text-orange-800 hover:bg-orange-50">
            <Search className="h-4 w-4" /> {saved?.length || place ? 'Another area or current location' : 'Choose area or use current location'}
          </button>
        </div>
        {saved !== null && !place && (
          <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">Tell us where the patient is: use your current location or search your area (for example “Kondapur”).</p>
        )}

        {place && !err && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold text-slate-700" role="status">
                {searching ? 'Finding doctors…' : `${shown?.length ?? 0} doctor${shown?.length === 1 ? '' : 's'} visit ${where}`}
              </p>
              {shown && shown.length > 1 && (
                <label className="flex items-center gap-2 text-xs text-slate-600">Sort
                  <select value={sort} onChange={(e) => setSort(e.target.value as 'soonest' | 'fee')} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold">
                    <option value="soonest">Soonest available</option><option value="fee">Lowest fee</option>
                  </select>
                </label>
              )}
            </div>
            {searching && <div className="space-y-2" aria-busy="true">{[0, 1].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />)}</div>}
            {shown && !shown.length && !searching && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 space-y-2">
                <p className="font-bold">No doctor makes home visits in {where} yet.</p>
                <p className="text-amber-800">Try a nearby area, or consult a doctor by video.</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setPicking(true)} className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 font-bold">Try another area</button>
                  <button type="button" onClick={() => navigate('/find-doctors?mode=video')} className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 font-bold">Video consultation</button>
                </div>
              </div>
            )}
            {shown && shown.length > 0 && (
              <ul className="space-y-2" aria-label="Doctors who visit">
                {shown.map((d) => (
                  <li key={d.doctor_partner_id}>
                    <button type="button" aria-label={`Book a home visit with ${d.name}`} onClick={() => open(d)}
                      className="w-full text-left rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-orange-300 hover:shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <span className="font-black text-slate-900 flex items-center gap-1.5 text-sm">
                            <Stethoscope className="w-4 h-4 text-teal-700 shrink-0" /><span className="truncate">{d.name}</span>
                          </span>
                          <span className="block text-xs text-slate-600">{[d.qualification, d.specialization, d.experience ? `${d.experience} yrs exp` : null].filter(Boolean).join(' · ')}</span>
                          <span className="flex items-start gap-1 text-[11px] text-slate-600"><MapPin className="w-3 h-3 mt-0.5 shrink-0 text-slate-500" /><span>Visits {homeVisitAreaSummary(d, place?.pincode)}</span></span>
                          <span className="flex flex-wrap items-center gap-2 pt-0.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 rounded-md px-2 py-0.5"><Clock className="w-3 h-3 text-slate-500" />About {d.visit_minutes} min visit</span>
                            <span className={`inline-flex items-center gap-1 text-[11px] font-bold rounded-md px-2 py-0.5 ${d.next_slot ? 'text-teal-800 bg-teal-50' : 'text-slate-500 bg-slate-100'}`}><CalendarCheck className="w-3 h-3" />{d.next_slot ? `Next available: ${nextLabel(d)}` : 'No free times in the next 14 days'}</span>
                          </span>
                        </div>
                        <div className="text-right shrink-0 flex flex-col items-end gap-1">
                          <span className="text-base font-black text-slate-900 tabular-nums">{rupees(d.fee)}</span>
                          <span className="text-[11px] font-semibold text-slate-500">per visit</span>
                          <span className="mt-1 inline-flex items-center gap-1 rounded-lg bg-orange-700 px-3 py-1.5 text-xs font-bold text-white">Book visit <ArrowRight className="h-3.5 w-3.5" /></span>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {err && (
          <div role="alert" className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3 flex flex-wrap items-center gap-2">
            <span className="flex-1">{err}</span>
            {validatePinCode(place?.pincode || '').ok
              ? <button type="button" onClick={() => setRetry((n) => n + 1)} className="underline">Retry</button>
              : <button type="button" onClick={() => setPicking(true)} className="underline">Choose another area</button>}
          </div>
        )}
        <p className="text-[11px] text-slate-500">Not for emergencies. For chest pain, breathlessness, fainting or heavy bleeding, call 108.</p>
      </section>
      {picking && <ServiceLocationDialog onClose={() => setPicking(false)} onApply={(a) => { setPicking(false); if (a) setPlace(areaPlace(a)); }} />}
    </div>
  );
}

function Mine() {
  const [rows, setRows] = useState<MyHomeVisit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const load = useCallback(() => { setError(null); myHomeVisitsApi().then(setRows).catch((e) => setError(labError(e, 'Could not load your home visits.'))); }, []);
  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, [load]);
  const cancel = async (v: MyHomeVisit) => {
    try { const r = await cancelHomeVisitApi(v.booking_id, 'Cancelled by patient'); setMsg(r?.refund?.status === 'REFUNDED' || r?.data?.refund?.status === 'REFUNDED' ? 'Cancelled. Your payment has been refunded.' : 'Home visit cancelled.'); setCancelling(null); load(); }
    catch (e) { setError(labError(e, 'Could not cancel.')); }
  };
  if (error) return <div className={`${card} text-center space-y-2`}><p role="alert" className="text-sm font-semibold text-rose-700">{error}</p><button onClick={load} className="inline-flex items-center gap-1 text-sm font-bold"><RotateCcw className="w-4 h-4" /> Retry</button></div>;
  if (!rows) return <p className="text-sm text-slate-400">Loading…</p>;
  if (!rows.length) return <p className={`${card} text-center text-sm text-slate-500`}>No home visits yet. Book one from the first tab.</p>;
  return (
    <div className="space-y-3">
      {msg && <p role="status" className="text-sm font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">{msg}</p>}
      <ul className="space-y-3" aria-label="My home visits">
        {rows.map((v) => { const s = homeVisitView(v); const cls = TONE[s.tone]; const ended = s.findAnother; return (
          <li key={v.id} className={`${card} space-y-2 ${ended ? 'border-l-4 border-l-rose-400' : s.tone === 'amber' ? 'border-l-4 border-l-amber-400' : ''}`} data-home-visit-id={v.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900">{dayLong(v.visit_date)}, {label12(v.visit_time)}</p>
                <p className="text-xs text-slate-600 mt-0.5">{v.address} · {v.pincode}</p>
                {v.reason && <p className="text-xs text-slate-500 mt-0.5">Reason: {v.reason}</p>}
                {v.booking_number && <p className="text-[11px] text-slate-500 mt-0.5">Booking {v.booking_number}</p>}
              </div>
              <div className="text-right shrink-0 max-w-[45%]">
                <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full border ${cls}`}>{s.label}</span>
                <p className="text-xs font-bold tabular-nums mt-1">{ended && s.money?.includes('₹') ? s.money : `${rupees(v.fee)} · ${ended ? s.money : v.payment_status === 'PAID' ? (v.paid_at_visit || String(v.payment_mode || '').toUpperCase() === 'CASH' ? 'Paid to the doctor' : paidLabel()) : v.payment_status === 'REFUNDED' ? 'Refunded' : 'Pay the doctor'}`}</p>
              </div>
            </div>
            {s.detail && <p className={`text-xs font-semibold ${s.tone === 'amber' ? 'text-amber-800' : s.tone === 'rose' ? 'text-rose-700' : 'text-slate-600'}`}>{s.tone === 'rose' && v.status === 'DECLINED' ? `Reason: ${s.detail}` : s.detail}</p>}
            {s.code && (
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1" aria-label="Visit code"><span className="text-2xl font-black tracking-[0.3em] text-teal-900 tabular-nums">{s.code}</span><span className="text-[11px] text-teal-900">{VISIT_CODE_HINT}.</span></p>
            )}
            {v.status === 'ON_THE_WAY' && <a href={`/home-care/track/${encodeURIComponent(v.id)}`} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-orange-700 px-3.5 text-xs font-bold text-white hover:bg-orange-800"><MapPin className="h-4 w-4" />Track doctor live</a>}
            {v.status === 'COMPLETED' && <p className="text-xs text-slate-600">Your prescription is in <a href="/my-records" className="font-bold underline">Medical Records</a>.</p>}
            {ended && <a href={FIND_ANOTHER_DOCTOR} className="inline-block text-xs font-bold text-teal-800 hover:underline">Find another doctor</a>}
            {s.canCancel && (cancelling === v.id ? (
              <div className="flex flex-wrap gap-2 items-center"><span className="text-xs text-slate-700">{v.status === 'REQUESTED' ? 'Cancel this request?' : 'Cancel this visit?'}{v.payment_status === 'PAID' ? ' Your payment will be refunded.' : ''}</span><button onClick={() => cancel(v)} className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold">Yes, cancel</button><button onClick={() => setCancelling(null)} className="text-xs font-bold text-slate-600">Keep</button></div>
            ) : <button onClick={() => setCancelling(v.id)} className="text-xs font-bold text-rose-700 hover:underline">{v.status === 'REQUESTED' ? 'Cancel request' : 'Cancel visit'}</button>)}
          </li>
        ); })}
      </ul>
    </div>
  );
}
