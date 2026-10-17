import { useCallback, useEffect, useState } from 'react';
import HomePinField from '../../components/location/HomePinField';
import ServiceVisual from '../../components/illustrations/ServiceVisual';
import { paidLabel, refundText, refundWillText, TestPaymentNote } from '../../../config/payments';
import CancellationRefundPolicy from '../../components/CancellationRefundPolicy';
import HomeCareAgencyBook, { BookedNote } from './HomeCareAgency';
import { DoctorReferrals, referralTab } from './HomeCareCare';
import type { HcReferral } from '../../../services/homecareHelper';
import HomeCareMine from './HomeCareMine';
import LongTermEnquiryModal from './components/LongTermEnquiryModal';
import { TAB_OF, hcCoverageApi, type HcCategory, type HcOrder, type HcEnquiry } from '../../../services/homecareHelper';
import { useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import {
  Home,
  Sun,
  Moon,
  Search,
  Stethoscope,
  KeyRound,
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
import { homeVisitDoctorsApi, homeVisitOfferApi, bookHomeVisitApi, myHomeVisitsApi, cancelHomeVisitApi, labError, rupees, type HomeVisitDoctor, type MyHomeVisit } from '../../../services/labHelper';
import { validatePinCode, validateUpiId } from '../../../utils/validators/india';

// Home care: nurses, physiotherapists and caregivers from registered agencies, a doctor's home visit,
// and everything booked — who is coming, visit codes, what was done at each visit.
const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const days = () => Array.from({ length: 7 }, (_, i) => { const d = new Date(Date.now() + (i + 1) * 86400000); return { iso: iso(d), label: i === 0 ? 'Tomorrow' : d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }) }; });
const label12 = (t: string) => { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; };
const dayLong = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long' });
const STATUS: Record<string, { label: string; cls: string }> = {
  SCHEDULED: { label: 'Booked', cls: 'bg-sky-50 text-sky-800 border-sky-200' },
  ON_THE_WAY: { label: 'Doctor on the way', cls: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  ARRIVED: { label: 'Doctor with you', cls: 'bg-violet-50 text-violet-800 border-violet-200' },
  IN_CONSULTATION: { label: 'In consultation', cls: 'bg-violet-50 text-violet-800 border-violet-200' },
  COMPLETED: { label: 'Completed', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  FAILED: { label: 'Visit did not happen', cls: 'bg-rose-50 text-rose-800 border-rose-200' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  NO_SHOW: { label: 'Missed', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
};
const card = 'bg-white rounded-2xl border border-slate-200 p-5';
const field = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10';

type HcTab = 'nursing' | 'physio' | 'caregiver' | 'doctor' | 'mine';
type HcTrack = 'single' | 'longterm';

const TABS: { id: HcTab; label: string; hint: string; icon: any }[] = [
  { id: 'nursing', label: 'Nursing', hint: 'Injections, IV, wound care', icon: Syringe },
  { id: 'physio', label: 'Physiotherapy', hint: 'After surgery, stroke, back pain', icon: Activity },
  { id: 'caregiver', label: 'Caregivers', hint: 'Bathing, feeding, mobility assistance', icon: HeartHandshake },
  { id: 'doctor', label: 'Doctor at home', hint: 'Doctor’s consultation at your home', icon: Stethoscope },
  { id: 'mine', label: 'My bookings & quotes', hint: 'Visits, care plan, quotes, MAR', icon: ClipboardList },
];
const CATEGORY: Record<string, HcCategory> = { nursing: 'NURSING', physio: 'PHYSIOTHERAPY', caregiver: 'CAREGIVER' };

// Home care: nurses, physiotherapists and caregivers from registered agencies, a doctor's home visit,
// and everything booked — who is coming, visit codes, what was done at each visit.
export default function HomeCareScreen() {
  const reduceMotion = useReducedMotion() ?? false;
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
    for (const k of ['agency', 'q']) { const v = params.get(k); if (v && t !== 'mine') keep[k] = v; }
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

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.26, ease: 'easeOut' }}
      className="w-full space-y-6 pb-12"
    >
      {/* Header */}
      <header className="grid sm:grid-cols-[1fr_260px] gap-5 items-center">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-orange-800 mb-1.5"><span className="w-1.5 h-1.5 rounded-full bg-orange-600" /> Care at home</p>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Support and care, at home</h1>
          <p className="text-sm text-slate-600 max-w-2xl mt-1.5">Find trusted nursing, physiotherapy, caregiver support, or a doctor visit for you and your family.</p>
        </div>
        <ServiceVisual id="homecare" className="hidden sm:block h-36 rounded-2xl" />
      </header>

      {/* Main Track Switcher (Two Clear Tracks + My Bookings) */}
      <div className="p-1.5 rounded-2xl bg-slate-100/90 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-1.5 shadow-inner">
        <button
          type="button"
          onClick={() => {
            switchTrack('single');
            if (tab === 'mine') setTab('nursing');
          }}
          data-testid="track-single-visits"
          className={`px-4 py-3 rounded-xl text-left motion-safe:transition-all motion-safe:duration-200 motion-reduce:transition-none hover:-translate-y-0.5 flex items-center gap-3 ${
            track === 'single' && tab !== 'mine'
              ? 'bg-white text-slate-900 shadow-sm border border-orange-200 ring-2 ring-orange-700/10'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <div
            className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${
              track === 'single' && tab !== 'mine' ? 'bg-orange-800 text-white' : 'bg-slate-200 text-slate-700'
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
              ? 'bg-white text-slate-900 shadow-sm border border-orange-200 ring-2 ring-orange-700/15'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <div
            className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${
              track === 'longterm' && tab !== 'mine' ? 'bg-orange-800 text-white' : 'bg-slate-200 text-slate-700'
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
              ? 'bg-white text-slate-900 shadow-sm border border-orange-200 ring-2 ring-orange-700/10'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <div
            className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${
              tab === 'mine' ? 'bg-orange-800 text-white' : 'bg-slate-200 text-slate-700'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-xs font-black uppercase tracking-wider text-orange-800">Manage</span>
            <span className="block text-sm font-black">My bookings & quotes</span>
            <span className="block text-[11px] text-slate-500">Track visits, logs, quotes, invoice</span>
          </div>
        </button>
      </div>

      {/* Emergency Disclaimer Banner */}
      <p className="text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
        <span>
          <b>Not for acute emergencies.</b> For chest pain, sudden breathlessness, loss of consciousness or heavy bleeding,
          call <a href="tel:108" className="font-black underline underline-offset-2">108</a> immediately.
        </span>
      </p>

      {/* VIEW 1: MY BOOKINGS & ENQUIRIES */}
      {tab === 'mine' ? (
        <div className="space-y-6">
          <section className="space-y-3">
            <HomeCareMine
              openId={params.get('open')}
              onBookAgain={handleBookAgain}
              onBrowseCare={() => { setTrack('single'); setReferral(null); setParams({ tab: 'nursing' }, { replace: true }); }}
            />
          </section>
          <section className="space-y-3 pt-4 border-t border-slate-200">
            <h2 className="text-sm font-black text-slate-800">Doctor home visits</h2>
            <Mine />
          </section>
        </div>
      ) : track === 'longterm' ? (
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
                className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 flex flex-col justify-between hover:border-orange-200 hover:shadow-md hover:-translate-y-0.5 motion-safe:transition-all motion-safe:duration-200 motion-reduce:transition-none"
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
                className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 flex flex-col justify-between hover:border-orange-200 hover:shadow-md hover:-translate-y-0.5 motion-safe:transition-all motion-safe:duration-200 motion-reduce:transition-none"
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
                className="rounded-2xl border-2 border-orange-500 bg-white p-5 space-y-4 flex flex-col justify-between shadow-sm relative hover:-translate-y-0.5 motion-safe:transition-transform motion-safe:duration-200 motion-reduce:transition-none"
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
                className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 flex flex-col justify-between hover:border-orange-200 hover:shadow-md hover:-translate-y-0.5 motion-safe:transition-all motion-safe:duration-200 motion-reduce:transition-none"
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
                  text: 'Clinical triage call within 30 minutes to understand routine & medical background.',
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
          {/* Sub-Tabs for Single Visits */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5" role="tablist" aria-label="Single visit services">
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
                  className={`text-left rounded-2xl border p-3 transition ${
                    on
                      ? 'bg-orange-800 border-orange-800 text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-800 hover:border-orange-300 hover:shadow-sm'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${on ? 'text-white' : 'text-orange-800'}`} />
                  <span className="block text-sm font-black mt-1.5">{t.label}</span>
                  <span className={`block text-[11px] leading-snug mt-0.5 ${on ? 'text-teal-50' : 'text-slate-500'}`}>
                    {t.hint}
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
            <Book onBooked={() => setTab('mine')} />
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
            setEnquiryFeedback(`Enquiry #${enq.enquiry_number} submitted! Our Care Manager will call within 30 minutes.`);
            setTab('mine');
          }}
        />
      )}

      {/* Enquiry Feedback Toast */}
      {enquiryFeedback && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
          <span>{enquiryFeedback}</span>
          <button
            type="button"
            onClick={() => setEnquiryFeedback(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}
    </motion.div>
  );
}

function Book({ onBooked }: { onBooked: () => void }) {
  const [pincode, setPincode] = useState('');
  const [doctors, setDoctors] = useState<HomeVisitDoctor[] | null>(null);
  const [doc, setDoc] = useState<HomeVisitDoctor | null>(null);
  const [date, setDate] = useState(days()[0].iso);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [time, setTime] = useState('');
  const [addr, setAddr] = useState({ line: '', area: '', landmark: '', city: '' });
  const [visitPin, setVisitPin] = useState<{ lat: number; lng: number } | null>(null);
  const [reason, setReason] = useState('');
  const [pay, setPay] = useState<'UPI' | 'CASH'>('UPI');
  const [upi, setUpi] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Awaited<ReturnType<typeof bookHomeVisitApi>> | null>(null);

  const search = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const pinRes = validatePinCode(pincode);
    if (!pinRes.ok) { setErr(pinRes.message); return; }
    setErr(null); setDoc(null); setDoctors(null);
    try { setDoctors(await homeVisitDoctorsApi(pincode)); } catch (e2) { setErr(labError(e2, 'Could not search.')); }
  };
  useEffect(() => {
    if (!doc) return;
    setSlots(null); setTime('');
    homeVisitOfferApi(doc.doctor_partner_id, date).then((o) => setSlots(o.slots || [])).catch((e) => setErr(labError(e, 'Could not load times.')));
  }, [doc, date]);

  const book = async () => {
    if (!doc || !time) return;
    if (addr.line.trim().length < 5 || addr.city.trim().length < 2) { setErr('Enter your house/flat, street and city.'); return; }
    if (reason.trim().length < 5) { setErr('Tell the doctor briefly why you need a home visit.'); return; }
    if (pay === 'UPI') {
      const upiRes = validateUpiId(upi);
      if (!upiRes.ok) { setErr(upiRes.message); return; }
    }
    setBusy(true); setErr(null);
    try {
      setDone(await bookHomeVisitApi({
        doctor_partner_id: doc.doctor_partner_id, visit_date: date, visit_time: time, reason: reason.trim(),
        address: { ...(visitPin ? { pin: visitPin } : {}), line: addr.line.trim(), area: addr.area.trim() || undefined, landmark: addr.landmark.trim() || undefined, city: addr.city.trim(), pincode },
        payment_mode: pay, payment: pay === 'UPI' ? { payment_method: 'UPI', upi_id: upi.trim() } : undefined,
      }));
    } catch (e) { setErr(labError(e, 'Could not book. Please try again.')); } finally { setBusy(false); }
  };

  if (done) {
    return (
      <div className={`${card} text-center space-y-2`}>
        <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
        <h2 className="text-xl font-black text-slate-900">Home visit booked</h2>
        <p className="text-sm font-bold text-slate-800">{done.doctor_name}</p>
        <p className="text-sm text-slate-700">{dayLong(done.visit_date)} at {label12(done.visit_time)}</p>
        <p className="text-sm text-slate-600">{done.address}</p>
        <p className="text-sm font-bold">{rupees(done.fee)} · {done.payment_status === 'PAID' ? paidLabel() : 'Pay the doctor at the visit'}</p>
        <div className="mx-auto max-w-xs rounded-xl border-2 border-teal-600 bg-teal-50 px-4 py-3" aria-label="Visit code">
          <p className="text-xs font-bold text-teal-900 flex items-center justify-center gap-1"><KeyRound className="w-3.5 h-3.5" /> Visit code</p>
          <p className="text-3xl font-black tracking-[0.3em] text-teal-900 tabular-nums">{done.visit_code}</p>
          <p className="text-[11px] text-teal-900">Give it to the doctor at your door, so you know it is really them. Never share it on a call.</p>
        </div>
        <button onClick={onBooked} className="px-4 py-2.5 rounded-xl bg-teal-700 text-white text-sm font-bold">My home visits</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <form onSubmit={search} className={`${card} space-y-3`} aria-label="Find a doctor">
        <h2 className="text-sm font-black text-slate-900">1. Where should the doctor come?</h2>
        <div className="flex gap-2">
          <input aria-label="Your pincode" inputMode="numeric" maxLength={6} value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))} onBlur={() => { if (pincode) { const p = validatePinCode(pincode); if (!p.ok) setErr(p.message); } }} placeholder="Your 6-digit pincode" className={field} />
          <button type="submit" className="px-4 rounded-xl bg-teal-700 text-white text-sm font-bold inline-flex items-center gap-1"><Search className="w-4 h-4" /> Find doctors</button>
        </div>
        {doctors && !doctors.length && <p className="text-sm text-slate-500">No doctor makes home visits in {pincode} yet. Try a nearby pincode, or book a clinic or video consultation.</p>}
        {doctors && doctors.length > 0 && (
          <ul className="space-y-2" aria-label="Doctors who visit">
            {doctors.map((d) => (
              <li key={d.doctor_partner_id}>
                <button type="button" aria-pressed={doc?.doctor_partner_id === d.doctor_partner_id} onClick={() => setDoc(d)} className={`w-full text-left rounded-xl border p-3 ${doc?.doctor_partner_id === d.doctor_partner_id ? 'border-teal-600 ring-2 ring-teal-600/20 bg-teal-50/30' : 'border-slate-200 hover:border-teal-300'}`}>
                  <span className="flex items-center justify-between gap-2"><span className="font-bold text-slate-900 flex items-center gap-1.5"><Stethoscope className="w-4 h-4 text-teal-700" /> {d.name}</span><span className="font-black tabular-nums">{rupees(d.fee)}</span></span>
                  <span className="block text-xs text-slate-500 mt-0.5">{[d.qualification, d.specialization, d.experience ? `${d.experience} yrs experience` : null].filter(Boolean).join(' · ')} · visit about {d.visit_minutes} min</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </form>

      {doc && (
        <section aria-label="Time" className={`${card} space-y-3`}>
          <h2 className="text-sm font-black text-slate-900">2. When</h2>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Visit date">
            {days().map((d) => <button key={d.iso} type="button" aria-pressed={date === d.iso} onClick={() => setDate(d.iso)} className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${date === d.iso ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'}`}>{d.label}</button>)}
          </div>
          {!slots ? <p className="text-sm text-slate-400">Loading times…</p> : !slots.length ? <p className="text-sm text-slate-500">{doc.name} has no home-visit time free that day. Choose another day.</p> : (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2" role="group" aria-label="Visit time">
              {slots.map((t) => <button key={t} type="button" aria-pressed={time === t} onClick={() => setTime(t)} className={`px-2 py-1.5 rounded-lg border text-xs font-bold tabular-nums ${time === t ? 'bg-teal-700 text-white border-teal-700' : 'bg-white text-slate-700 border-slate-200'}`}>{label12(t)}</button>)}
            </div>
          )}
        </section>
      )}

      {doc && time && (
        <section aria-label="Address and payment" className={`${card} space-y-3`}>
          <h2 className="text-sm font-black text-slate-900">3. Address, reason and payment</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input aria-label="House / flat and street" value={addr.line} onChange={(e) => setAddr({ ...addr, line: e.target.value.slice(0, 120) })} placeholder="House / flat no. and street" className={`${field} sm:col-span-2`} />
            <input aria-label="Area" value={addr.area} onChange={(e) => setAddr({ ...addr, area: e.target.value.slice(0, 60) })} placeholder="Area / locality" className={field} />
            <input aria-label="Landmark (optional)" value={addr.landmark} onChange={(e) => setAddr({ ...addr, landmark: e.target.value.slice(0, 60) })} placeholder="Landmark (optional)" className={field} />
            <input aria-label="City" value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value.replace(/[^A-Za-z .-]/g, '').slice(0, 40) })} placeholder="City" className={field} />
            <p className="text-sm font-semibold text-slate-700 flex items-center gap-1 px-1"><MapPin className="w-4 h-4" /> Pincode {pincode}</p>
            <HomePinField value={visitPin} onChange={setVisitPin} who="doctor" />
          </div>
          <label className="block text-xs font-bold text-slate-700">Why do you need a home visit?
            <textarea value={reason} onChange={(e) => setReason(e.target.value.slice(0, 300))} rows={2} placeholder="e.g. Father, 78, fever for 3 days and too weak to travel" className={`${field} mt-1`} />
          </label>
          <div className="flex gap-2" role="radiogroup" aria-label="Payment">
            <button type="button" role="radio" aria-checked={pay === 'UPI'} onClick={() => setPay('UPI')} className={`px-3 py-2 rounded-xl border text-sm font-bold ${pay === 'UPI' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-700'}`}>Pay now (UPI)</button>
            <button type="button" role="radio" aria-checked={pay === 'CASH'} onClick={() => setPay('CASH')} className={`px-3 py-2 rounded-xl border text-sm font-bold ${pay === 'CASH' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-700'}`}>Pay the doctor</button>
          </div>
          {pay === 'UPI' && <TestPaymentNote />}
          {pay === 'UPI' && <input aria-label="UPI ID" value={upi} onChange={(e) => setUpi(e.target.value.replace(/\s/g, '').toLowerCase())} onBlur={() => { if (upi) { const u = validateUpiId(upi); if (!u.ok) setErr(u.message); } }} placeholder="yourname@upi" className={field} />}
          <CancellationRefundPolicy service="homecare" className="mt-2" />
          {err && <p role="alert" className="text-sm font-semibold text-rose-700">{err}</p>}
          <button type="button" disabled={busy} onClick={book} className="w-full px-4 py-3 rounded-xl bg-teal-700 text-white text-sm font-bold disabled:opacity-60">{busy ? 'Booking…' : pay === 'UPI' ? `Pay ${rupees(doc.fee)} & book` : 'Book home visit'}</button>
        </section>
      )}
      {err && !(doc && time) && <p role="alert" className="text-sm font-semibold text-rose-700">{err}</p>}
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
        {rows.map((v) => { const s = STATUS[v.status] || STATUS.SCHEDULED; return (
          <li key={v.id} className={`${card} space-y-2`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-900">{dayLong(v.visit_date)}, {label12(v.visit_time)}</p>
                <p className="text-xs text-slate-600 mt-0.5">{v.address} · {v.pincode}</p>
                {v.reason && <p className="text-xs text-slate-500 mt-0.5">Reason: {v.reason}</p>}
              </div>
              <div className="text-right shrink-0">
                <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full border ${s.cls}`}>{s.label}</span>
                <p className="text-xs font-bold tabular-nums mt-1">{rupees(v.fee)} · {v.payment_status === 'PAID' ? paidLabel() : v.payment_status === 'REFUNDED' ? 'Refunded' : 'Pay the doctor'}</p>
              </div>
            </div>
            {v.visit_code && (
              <p className="flex items-center gap-3" aria-label="Visit code"><span className="text-2xl font-black tracking-[0.3em] text-teal-900 tabular-nums">{v.visit_code}</span><span className="text-[11px] text-teal-900">Visit code: give it to the doctor at your door.</span></p>
            )}
            {v.status === 'FAILED' && v.failed_reason && <p className="text-xs font-semibold text-rose-700">Doctor: {v.failed_reason}</p>}
            {v.status === 'CANCELLED' && v.cancellation_reason && <p className="text-xs text-slate-600">Cancelled{v.cancelled_by && v.cancelled_by !== 'PATIENT' ? ' by the doctor' : ''}: {v.cancellation_reason}</p>}
            {v.status === 'COMPLETED' && <p className="text-xs text-slate-600">Your prescription is in Medical Records.</p>}
            {['SCHEDULED', 'FAILED'].includes(v.status) && (cancelling === v.id ? (
              <div className="flex gap-2 items-center"><span className="text-xs text-slate-700">Cancel this visit?{v.payment_status === 'PAID' ? ' Your payment will be refunded.' : ''}</span><button onClick={() => cancel(v)} className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold">Yes, cancel</button><button onClick={() => setCancelling(null)} className="text-xs font-bold text-slate-600">Keep</button></div>
            ) : <button onClick={() => setCancelling(v.id)} className="text-xs font-bold text-rose-700 hover:underline">Cancel visit</button>)}
          </li>
        ); })}
      </ul>
    </div>
  );
}
