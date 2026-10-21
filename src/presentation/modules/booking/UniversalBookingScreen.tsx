import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchArea, nearest, formatDistance, metresBetween } from '../../../services/location';
import LocationBar from '../../components/location/LocationBar';
import FavoriteButton from '../../components/FavoriteButton';
import DoctorTrustDetails from '../../components/DoctorTrustDetails';
import CancellationRefundPolicy from '../../components/CancellationRefundPolicy';
import { paidLabel, refundText, refundWillText, TestPaymentNote } from '../../../config/payments';
import { personNameInput } from '../../../utils/inputFilters';
import { useSearchParams, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowLeft, Building2, MapPin, Users, Calendar, Clock, CheckCircle2,
  AlertCircle, RotateCcw, ChevronRight, CalendarClock, Check, Star, MessageSquare,
  CreditCard, Smartphone, ShieldCheck, Lock, DollarSign, Wallet, Building, Receipt, FlaskConical, XCircle,
  Search, X, Stethoscope
} from 'lucide-react';
import { SERVICE_TILES } from '../../../config/serviceTypes';
import { getProvidersApi, getAvailableDoctorsApi, getSpecializationsApi, type SpecializationOption } from '../../../services/patientHelper';
import { pauseText, type ProviderItem } from '../../../services/types';
import {
  getProviderDetailApi, getBranchesApi, getBranchDepartmentsApi,
  getAvailableBranchDoctorsApi,
  getProviderSlotsWithPauseApi, createBookingApi, formatSlotTime, isSlotInPast,
  type Branch, type BranchDepartment, type BranchDoctor, type AvailableSlot,
  type ProviderDetail, type CreatedBooking, type PaymentResult, type PaymentStatusResult,
  type PaymentMethod as ApiPaymentMethod,
} from '../../../services/bookingHelper';
import { getMyUserId, getFamilyMembersApi, type PatientFamilyMember } from '../../../services/familyHelper';
import { getProviderReviewsApi, type ProviderReviewSummary } from '../../../services/reviewHelper';
import { formatDoctorName } from '../../../utils/doctorLabel';
import { canonicalSpecialty, specialtiesForQuery, specialtyHint, SYMPTOM_CHIPS } from '../../../utils/specialties';
import { printBookingReceipt, downloadCalendarEntry, type BookingSummary } from '../../../utils/bookingReceipt';

// Five-step booking flow: Provider -> Booking Details -> Payment -> Processing -> Confirmation.
// For a CASH booking, the real booking is created the moment the patient leaves the
// booking-details page (still unpaid PENDING — collected in person later). For an ONLINE payment
// mode, nothing is created there: the booking (and its slot reservation) is created only once the
// simulated charge in submitPayment() actually succeeds, so an abandoned or declined checkout
// never leaves a real booking — or a held slot — behind (see BUGS.md #57).
type Page = 'provider' | 'booking' | 'payment' | 'confirmation';
// UI-facing method id — NETBANKING here maps to the backend's NET_BANKING enum value when the
// payment is actually submitted (see submitPayment).
type PaymentMethod = 'UPI' | 'CARD' | 'NETBANKING' | 'WALLET' | 'CASH';

function upcomingDates(count: number): { value: string; label: string; weekday: string }[] {
  const out = [];
  const base = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    out.push({
      value: dateStr,
      label: d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }),
      weekday: i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' }),
    });
  }
  return out;
}

const initials = (name: string) => name.trim().split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
const SectionTitle = ({ icon: Icon, children }: { icon: any; children: React.ReactNode }) => (
  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Icon className="w-4 h-4 text-teal-600" /> {children}</span>
);

export default function UniversalBookingScreen() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion() ?? false;

  const { pathname } = useLocation();
  const ROUTE_SERVICE: Record<string, string> = {
    '/lab-tests': 'diagnostic', '/homecare-services': 'homecare', '/ambulance-dispatch': 'ambulance', '/equipment-rentals': 'equipment',
  };
  const serviceId = (searchParams.get('service') || ROUTE_SERVICE[pathname] || 'doctor').toLowerCase();
  const service = SERVICE_TILES.find((s) => s.id === serviceId);
  const isHospital = serviceId === 'hospital' || serviceId === 'clinic';
  const appointmentEnabled = serviceId === 'doctor' || isHospital;

  const [page, setPage] = useState<Page>('provider');

  const [providers, setProviders] = useState<ProviderItem[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<ProviderItem | null>(null);
  const [providerDetail, setProviderDetail] = useState<ProviderDetail | null>(null);
  const [reviews, setReviews] = useState<ProviderReviewSummary | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [departments, setDepartments] = useState<BranchDepartment[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<BranchDepartment | null>(null); // null = All
  const [doctors, setDoctors] = useState<BranchDoctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<BranchDoctor | null>(null);
  const [doctorsLoading, setDoctorsLoading] = useState(false);

  // #22: Specializations loaded dynamically from catalogue & active doctors
  const [specializations, setSpecializations] = useState<SpecializationOption[]>([]);
  const [filterSpecialization, setFilterSpecialization] = useState<string | null>(null); // null = All
  const [providerSearch, setProviderSearch] = useState('');
  const [hospitalDateConfirmed, setHospitalDateConfirmed] = useState(false);
  // Hospital flow: location → department → date → doctor. How many doctors of the chosen department
  // are free on each of the next 14 days (null = still checking), so empty days are greyed out.
  const [dayCounts, setDayCounts] = useState<Record<string, number | null>>({});
  const [anyDepartment, setAnyDepartment] = useState(false); // a hospital that lists no departments

  const [selectedDate, setSelectedDate] = useState<string>(upcomingDates(1)[0].value);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsPaused, setSlotsPaused] = useState<string | null>(null);
  const [datesWithSlots, setDatesWithSlots] = useState<Record<string, boolean>>({});
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [consultType, setConsultType] = useState<'In Person' | 'Video'>('In Person');

  const [family, setFamily] = useState<PatientFamilyMember[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<PatientFamilyMember | null>(null); // null = self

  // ---- Payment Screen State ----
  const [paymentMode, setPaymentMode] = useState<PaymentMethod>('UPI');
  const [upiApp, setUpiApp] = useState<'gpay' | 'phonepe' | 'paytm' | 'bhim' | 'custom'>('gpay');
  const [customUpiId, setCustomUpiId] = useState('');
  const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvv: '', name: '' });
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');
  const [selectedWallet, setSelectedWallet] = useState('Paytm Wallet');

  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);

  const [createdBooking, setCreatedBooking] = useState<CreatedBooking | null>(null);
  const [creatingBooking, setCreatingBooking] = useState(false);

  const [loading, setLoading] = useState(false);          // provider list / branches load
  const [error, setError] = useState<string | null>(null);

  // The doctor being booked (doctor-direct = the provider; hospital = the chosen doctor).
  const bookingDoctorPartnerId = isHospital ? selectedDoctor?.doctor_partner_id : selectedProvider?.id;
  const bookingDoctorName = isHospital ? selectedDoctor?.name : selectedProvider?.name;
  const branchChosen = isHospital ? !!selectedBranch : true;
  const doctorChosen = isHospital ? !!selectedDoctor : true;

  // Dynamic Specializations aggregated from both active doctors and catalogue master list
  // Specialties a provider offers, in the catalogue's names: a doctor's own title, or every
  // department a hospital/clinic runs (so "Orthopedist" and "orthopaedics" are one filter).
  const specialtiesOf = React.useCallback((p: ProviderItem): string[] => {
    const titles = p.org ? [...p.org.departments.map((d) => d.name), ...p.org.doctors.map((d) => d.specialization || '')] : [p.specialtyOrType || p.subtitle || ''];
    return Array.from(new Set(titles.map((t) => canonicalSpecialty(t) || (t && !/^(doctor|hospital|clinic|verified partner)$/i.test(t) ? t.trim() : '')).filter(Boolean)));
  }, []);

  const dynamicSpecializations = React.useMemo(() => {
    const counts = new Map<string, number>();
    providers.forEach((p) => specialtiesOf(p).forEach((s) => counts.set(s, (counts.get(s) || 0) + 1)));
    specializations.forEach((s) => {
      const name = canonicalSpecialty(s.name) || s.name;
      if (!counts.has(name)) counts.set(name, 0);
    });
    return Array.from(counts.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [providers, specializations, specialtiesOf]);

  // What the search box means as specialties ("tooth pain" -> Dentist, "ortho" -> Orthopedic).
  const queryMeansSpecialties = React.useMemo(() => specialtiesForQuery(providerSearch), [providerSearch]);

  const filteredProviders = React.useMemo(() => {
    return providers.filter((p) => {
      if (providerSearch.trim()) {
        const q = providerSearch.toLowerCase().trim();
        const text = [
          p.name, p.specialtyOrType, p.subtitle, p.city, p.address, p.qualification, p.languages,
          ...(p.org ? [...p.org.locations.flatMap((l) => [l.name, l.area, l.city]), ...p.org.departments.map((d) => d.name), ...p.org.doctors.flatMap((d) => [d.name, d.specialization])] : []),
        ].filter(Boolean).join(' ').toLowerCase();
        const bySpecialty = queryMeansSpecialties.length > 0 && specialtiesOf(p).some((s) => queryMeansSpecialties.includes(s));
        if (!text.includes(q) && !bySpecialty) return false;
      }
      if (filterSpecialization && !specialtiesOf(p).includes(filterSpecialization)) return false;
      return true;
    });
  }, [providers, providerSearch, filterSpecialization, queryMeansSpecialties, specialtiesOf]);

  // Distance: each hospital/clinic to its nearest confirmed branch pin, from the patient's chosen area.
  const area = useSearchArea();
  const [nearFirst, setNearFirst] = React.useState(false);
  const distOf = React.useCallback((p: ProviderItem) => (p.org ? nearest(area, p.org.locations) : null), [area]);

  // Strongest matches first: the exact name, then names starting with / containing the search.
  const rankedProviders = React.useMemo(() => {
    const q = providerSearch.toLowerCase().trim();
    if (!q) return filteredProviders;
    const score = (p: ProviderItem) => { const n = p.name.toLowerCase(); return n === q ? 0 : n.startsWith(q) ? 1 : n.includes(q) ? 2 : 3; };
    return [...filteredProviders].sort((a, b) => score(a) - score(b));
  }, [filteredProviders, providerSearch]);

  // Clearly-labelled alternatives below the results: others that run the same speciality as the
  // top matches, or are in the same city. Only real listings, each with the reason it is suggested.
  const suggestions = React.useMemo(() => {
    if (!providerSearch.trim() || !rankedProviders.length) return [] as { p: ProviderItem; why: string }[];
    const shown = new Set(filteredProviders.map((p) => p.id));
    const top = rankedProviders.slice(0, 3);
    const specs = new Set(top.flatMap(specialtiesOf));
    const cities = new Set(top.flatMap((p) => [p.city, ...(p.org?.locations.map((l) => l.city) || [])]).filter(Boolean).map((c) => String(c).toLowerCase()));
    const out: { p: ProviderItem; why: string }[] = [];
    for (const p of providers) {
      if (shown.has(p.id) || p.pause) continue;
      const spec = specialtiesOf(p).find((s) => specs.has(s));
      const city = [p.city, ...(p.org?.locations.map((l) => l.city) || [])].find((c) => c && cities.has(String(c).toLowerCase()));
      const why = spec ? `Also has ${spec}` : city ? `Also in ${city}` : null;
      if (why) out.push({ p, why });
      if (out.length >= 6) break;
    }
    return out;
  }, [providers, filteredProviders, rankedProviders, providerSearch, specialtiesOf]);

  // Opened from the header search: keep the query, and go straight to the chosen hospital/doctor.
  const startQuery = searchParams.get('q');
  const startProvider = searchParams.get('provider');
  const autoOpened = React.useRef(false);
  useEffect(() => { if (startQuery) setProviderSearch(startQuery); }, [startQuery]);

  const renderProviderCard = (p: ProviderItem, why?: string) => (
                  <div
                    key={p.id}
                    className="group h-full min-h-[22rem] rounded-3xl border border-slate-200 bg-white p-5 shadow-sm motion-safe:transition-all motion-safe:duration-200 motion-reduce:transition-none motion-safe:hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md flex flex-col"
                  >
                    <div className="flex items-start gap-3.5">
                        <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-800 flex items-center justify-center shrink-0 border border-orange-100 font-bold text-base">
                          {isHospital ? <Building2 className="w-7 h-7 text-teal-600" /> : initials(p.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-bold text-orange-800 bg-orange-50 border border-orange-100 px-2 py-1 rounded-full inline-flex items-center gap-1 mb-1">
                            {isHospital ? <Building2 className="w-3.5 h-3.5" /> : <Stethoscope className="w-3.5 h-3.5" />}
                            {p.specialtyOrType || (isHospital ? 'Hospital' : 'Doctor')}
                          </span>
                          <div className="flex items-start gap-2">
                            <h3 className="min-h-[3rem] flex-1 font-bold text-slate-900 text-base leading-6 line-clamp-2 group-hover:text-orange-900 transition-colors">
                              {p.name}
                            </h3>
                          </div>
                          <div className="min-h-5 flex items-center gap-2 text-xs">
                            {p.rating ? <span className="inline-flex items-center gap-1 text-slate-700"><Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /><b>{p.rating.average.toFixed(1)}</b><span className="text-slate-400">({p.rating.count})</span></span> : <span className="text-slate-500">New to Vizito · not rated yet</span>}
                            {p.registrationVerified && !isHospital && <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold"><ShieldCheck className="w-3.5 h-3.5" />Verified</span>}
                          </div>
                        </div>
                        <FavoriteButton partnerId={p.id} name={p.name} className="w-9 h-9" />
                    </div>

                    <div className="my-4 min-h-[7rem] flex-1 rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 space-y-2 text-xs text-slate-600">
                      {/* What a patient compares before choosing: experience, rating, place, fee. */}
                      {!isHospital && <DoctorTrustDetails qualification={p.qualification} specialization={p.specialization} experienceYears={p.experienceYears} medicalRegistrationNumber={p.medicalRegistrationNumber} medicalCouncilName={p.medicalCouncilName} registrationVerified={p.registrationVerified} compact />}
                      {!p.org && p.city && <p className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />{p.city}</p>}
                      {p.org && (
                        <div className="space-y-2 text-xs text-slate-600">
                          {p.org.locations.length > 0 && (
                            <p className="flex items-start gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                              <span>{p.org.locations.slice(0, 2).map((l) => [l.area || l.name, l.city].filter(Boolean).join(', ')).join(' · ')}{p.org.locations.length > 2 ? ` +${p.org.locations.length - 2} more` : ''}</span>
                            </p>
                          )}
                          {p.org.departments.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {p.org.departments.slice(0, 4).map((d) => (
                                <span key={d.name} className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 font-semibold text-slate-700">{d.name}{d.from_fee != null ? ` · ₹${d.from_fee}` : ''}</span>
                              ))}
                              {p.org.departments.length > 4 && <span className="px-2 py-0.5 text-slate-500 font-semibold">+{p.org.departments.length - 4} more</span>}
                            </div>
                          )}
                          <p>
                            {p.org.doctor_count > 0
                              ? <><b className="text-slate-800">{p.org.doctor_count} doctor{p.org.doctor_count === 1 ? '' : 's'}</b>: {p.org.doctors.slice(0, 3).map((d) => formatDoctorName(d.name)).join(', ')}{p.org.doctor_count > 3 ? ` +${p.org.doctor_count - 3} more` : ''}</>
                              : <span className="text-slate-400">Doctors being added</span>}
                          </p>
                        </div>
                      )}
                      {(p.inClinicFee || p.videoFee || p.languages) && (
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 font-medium border-t border-slate-200 pt-2">
                          {p.inClinicFee ? <span>Clinic visit <b className="text-slate-800">₹{p.inClinicFee}</b></span> : null}
                          {p.videoFee ? <span>Video <b className="text-slate-800">₹{p.videoFee}</b></span> : null}
                          {p.languages && <span className="truncate">Speaks {p.languages}</span>}
                        </div>
                      )}
                    </div>

                    {p.pause ? (
                      <div className="mt-auto space-y-2">
                        {why && <p className="text-[11px] font-semibold text-slate-500">Suggested because {why.toLowerCase()}.</p>}
                        <p role="status" className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{pauseText(p.pause)}</p>
                        <button disabled className="w-full px-4 py-3 rounded-xl text-sm font-bold bg-slate-100 text-slate-400 cursor-not-allowed">Not taking bookings</button>
                      </div>
                    ) : (
                      <div className="mt-auto space-y-2">
                        {why && <p className="text-[11px] font-semibold text-slate-500">Suggested because {why.toLowerCase()}.</p>}
                        <button onClick={() => pickProvider(p)} className="w-full px-4 py-3 rounded-xl text-sm font-bold bg-teal-700 hover:bg-teal-800 text-white transition-all flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2">
                          <span>{isHospital ? 'View branches & book' : 'Book appointment'}</span>
                          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </button>
                      </div>
                    )}
                  </div>
  );

  // Fee calculation logic. Before the booking exists this is a display-only estimate (the same
  // pricing source the backend itself reads from); once the booking is created, `createdBooking
  // .total_amount` is what will actually be charged (backend-resolved, see PatientBookingService)
  // and takes over as the amount shown — no client-side discount is ever applied to it.
  // Never an invented fee: unknown until the provider's own fee is known (the backend sets the real amount).
  // Video is priced at the video fee (the slot carries both), so the fee shown is the fee charged.
  const rawConsultationFee: number | null = (consultType === 'Video' ? selectedSlot?.video_fee ?? selectedSlot?.fee : selectedSlot?.fee) ?? (consultType === 'Video' ? providerDetail?.doctor?.video_consultation_fee : providerDetail?.doctor?.in_clinic_fee) ?? null;
  const payableTotal = createdBooking ? Number(createdBooking.total_amount) : Number(rawConsultationFee ?? 0);

  // Derived (never stored) so the Clinic/Branch display and the slots grid can never disagree or go
  // stale — both read straight from the current `slots`/`selectedSlot` state on every render.
  // Fills missing slots between consecutive intervals with is_booked: true so that booked slots
  // are shown in the UI and the 4-column hourly grid layout never shifts or leaves incomplete rows.
  const activeSlots = useMemo(() => {
    const raw = slots.filter((s) => !isSlotInPast(s.slot_date || selectedDate, s.start_time));
    if (raw.length <= 1) return raw;

    const toMins = (t: string) => {
      const [h, m] = (t || '').split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    const formatMins = (mins: number) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
    };

    // Detect common duration step (e.g. 15 mins)
    let step = 15;
    for (let i = 1; i < raw.length; i++) {
      const diff = toMins(raw[i].start_time) - toMins(raw[i - 1].start_time);
      if (diff > 0 && diff <= 60 && (diff === 15 || diff === 20 || diff === 30 || diff === 45 || diff === 60)) {
        step = diff;
        break;
      }
    }

    const result: AvailableSlot[] = [];
    for (let i = 0; i < raw.length; i++) {
      if (i > 0) {
        const prevMins = toMins(raw[i - 1].start_time);
        const currMins = toMins(raw[i].start_time);
        // If there's an interval gap between consecutive slots (e.g. 3:00 to 3:30), fill with booked slots
        if (currMins > prevMins + step && currMins - prevMins <= 120) {
          for (let m = prevMins + step; m < currMins; m += step) {
            result.push({
              time_slot_id: -(i * 1000 + m),
              slot_date: raw[i].slot_date || selectedDate,
              start_time: formatMins(m),
              end_time: formatMins(m + step),
              facility_id: raw[i].facility_id,
              fee: raw[i].fee,
              video_fee: raw[i].video_fee,
              facility_name: raw[i].facility_name,
              facility_type: raw[i].facility_type,
              facility_address: raw[i].facility_address,
              is_booked: true,
            });
          }
        }
      }
      result.push(raw[i]);
    }
    return result;
  }, [slots, selectedDate]);

  // A doctor-direct doctor can hold slots at more than one clinic on the same day — dedupe by
  // facility_id so the "multiple locations" case can be detected honestly instead of guessing.
  const distinctFacilities = Array.from(
    new Map(activeSlots.filter((s) => s.facility_id != null).map((s) => [s.facility_id, s])).values()
  );
  // Once a specific slot is picked, its own facility is the answer. Before that, only show a
  // specific clinic if every loaded slot for the day is at the same one (still 100% accurate, no
  // guess) — otherwise show the "multiple locations" note in the Clinic/Branch section instead.
  const clinicInfo = selectedSlot ?? (distinctFacilities.length === 1 ? distinctFacilities[0] : null);

  // ---- Loaders ----
  const loadProviders = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      if (isHospital) {
        setProviders(await getProvidersApi('hospital'));
      } else {
        setProviders(await getProvidersApi('doctor'));
      }
    } catch {
      setError(isHospital ? 'Unable to load hospitals. Please try again.' : 'Unable to load doctors. Please try again.');
      setProviders([]);
    } finally { setLoading(false); }
  }, [isHospital]);

  useEffect(() => {
    if (autoOpened.current || !startProvider || !providers.length) return;
    const p = providers.find((x) => x.id === startProvider);
    if (p && !p.pause) { autoOpened.current = true; pickProvider(p); }
  }, [providers, startProvider]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!appointmentEnabled) return;
    loadProviders();
    (async () => {
      try { setSpecializations(await getSpecializationsApi()); } catch { setSpecializations([]); }
    })();
  }, [appointmentEnabled, loadProviders]);

  useEffect(() => {
    (async () => {
      try {
        const uid = await getMyUserId();
        if (uid != null) setFamily(await getFamilyMembersApi(uid));
      } catch { setFamily([]); }
    })();
  }, []);

  // Load the doctor's REAL ratings & reviews (empty until real reviews exist — never fabricated).
  const loadReviews = useCallback(async (doctorPartnerId: string) => {
    setReviews(null); setReviewsLoading(true);
    try { setReviews(await getProviderReviewsApi(doctorPartnerId)); }
    catch { setReviews(null); }
    finally { setReviewsLoading(false); }
  }, []);

  const loadSlots = useCallback(async (partnerId: string, date: string, facilityId?: number) => {
    setSlotsLoading(true); setSelectedSlot(null); setSlotsPaused(null);
    try {
      const r = await getProviderSlotsWithPauseApi(partnerId, date, facilityId, isHospital ? selectedProvider?.id : undefined);
      setSlots(r.slots);
      setDatesWithSlots((prev) => ({ ...prev, [date]: r.slots.some((s) => !s.is_booked) }));
      if (r.paused) setSlotsPaused(`${r.paused.by === 'hospital' ? 'This hospital is' : 'This doctor is'} ${pauseText(r.paused).replace(/^Not/, 'not')}.${r.paused.reason ? ` (${r.paused.reason})` : ''}`);
    } catch {
      setSlots([]);
      setDatesWithSlots((prev) => ({ ...prev, [date]: false }));
    } finally { setSlotsLoading(false); }
  }, [isHospital, selectedProvider?.id]);

  // Pre-fetch 7-day slot availability for the date carousel indicator (BUG-4)
  useEffect(() => {
    if (!bookingDoctorPartnerId) {
      setDatesWithSlots({});
      return;
    }
    let cancelled = false;
    const days = upcomingDates(7).map((d) => d.value);
    (async () => {
      const results: Record<string, boolean> = {};
      await Promise.all(
        days.map(async (d) => {
          try {
            const r = await getProviderSlotsWithPauseApi(
              bookingDoctorPartnerId,
              d,
              isHospital ? selectedBranch?.facility_id : undefined,
              isHospital ? selectedProvider?.id : undefined,
            );
            results[d] = r.slots.some((s) => !s.is_booked);
          } catch {
            results[d] = false;
          }
        }),
      );
      if (!cancelled) {
        setDatesWithSlots((prev) => ({ ...prev, ...results }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookingDoctorPartnerId, isHospital, selectedBranch?.facility_id, selectedProvider?.id]);

  // Load a branch's departments (resets any downstream department/doctor/slot picks). Doctors
  // themselves are deferred until a date is confirmed (see confirmHospitalDate) — #22 requires date
  // to gate the doctor list, not just department/branch.
  const enterBranch = useCallback(async (b: Branch, providerId: string) => {
    setSelectedBranch(b);
    setSelectedDepartment(null);
    setSelectedDoctor(null);
    setSlots([]); setSelectedSlot(null);
    setDoctors([]);
    setHospitalDateConfirmed(false);
    setAnyDepartment(false); setDayCounts({});
    setDoctorsLoading(true);
    try {
      setDepartments(await getBranchDepartmentsApi(providerId, b.facility_id));
    } catch {
      setDepartments([]);
    } finally { setDoctorsLoading(false); }
  }, []);

  // Real, date-gated doctors at the selected branch (+ optional department) — replaces the old
  // unscoped getBranchDoctorsApi call for the actual doctor listing; used once a date is confirmed
  // and re-used whenever the department chip or date changes afterward.
  const loadHospitalDoctors = useCallback(async (date: string, dept: BranchDepartment | null) => {
    if (!selectedBranch) return;
    setSelectedDoctor(null); setSlots([]); setSelectedSlot(null);
    setDoctorsLoading(true);
    try {
      setDoctors(await getAvailableBranchDoctorsApi(selectedBranch.facility_id, date, dept?.facility_department_id));
    } catch {
      setDoctors([]);
    } finally { setDoctorsLoading(false); }
  }, [selectedBranch]);

  const confirmHospitalDate = () => {
    setHospitalDateConfirmed(true);
    loadHospitalDoctors(selectedDate, selectedDepartment);
  };

  // ---- Actions ----
  const pickProvider = async (p: ProviderItem) => {
    setSelectedProvider(p);
    setSelectedBranch(null); setSelectedDoctor(null); setDoctors([]); setDepartments([]); setSlots([]); setSelectedSlot(null);
    if (isHospital) {
      setLoading(true); setError(null);
      try {
        const list = await getBranchesApi(p.id);
        setBranches(list);
        setPage('booking');
        if (list.length === 1) await enterBranch(list[0], p.id); // single branch -> auto-select
      } catch { setError('Unable to load branches. Please try again.'); }
      finally { setLoading(false); }
    } else {
      setPage('booking');
      try { setProviderDetail(await getProviderDetailApi(p.id)); } catch { setProviderDetail(null); }
      loadReviews(p.id);
      loadSlots(p.id, selectedDate);
    }
  };

  const selectDepartmentChip = async (dept: BranchDepartment | null) => {
    if (!selectedBranch) return;
    setSelectedDepartment(dept);
    await loadHospitalDoctors(selectedDate, dept);
  };

  // Department chosen: check the next 14 days (4 at a time), then open the first day with a doctor.
  const chooseDepartment = async (dept: BranchDepartment | null) => {
    if (!selectedBranch) return;
    setSelectedDepartment(dept); setAnyDepartment(dept === null);
    setSelectedDoctor(null); setSlots([]); setSelectedSlot(null); setDoctors([]);
    setHospitalDateConfirmed(false);
    const days = upcomingDates(14).map((d) => d.value);
    setDayCounts(Object.fromEntries(days.map((d) => [d, null])));
    const counts: Record<string, number> = {};
    for (let i = 0; i < days.length; i += 4) {
      await Promise.all(days.slice(i, i + 4).map(async (d) => {
        try { counts[d] = (await getAvailableBranchDoctorsApi(selectedBranch.facility_id, d, dept?.facility_department_id)).length; } catch { counts[d] = 0; }
        setDayCounts((x) => ({ ...x, [d]: counts[d] }));
      }));
    }
    const first = days.find((d) => counts[d] > 0);
    if (first) pickHospitalDay(first, dept);
  };
  const pickHospitalDay = (date: string, dept: BranchDepartment | null = selectedDepartment) => {
    setSelectedDate(date);
    setHospitalDateConfirmed(true);
    loadHospitalDoctors(date, dept);
  };

  const pickDoctor = async (doc: BranchDoctor) => {
    setSelectedDoctor(doc);
    try { setProviderDetail(await getProviderDetailApi(doc.doctor_partner_id)); } catch { setProviderDetail(null); }
    loadReviews(doc.doctor_partner_id);
    loadSlots(doc.doctor_partner_id, selectedDate, selectedBranch?.facility_id);
  };

  const changeDate = (date: string) => {
    setSelectedDate(date);
    if (bookingDoctorPartnerId) loadSlots(bookingDoctorPartnerId, date, isHospital ? selectedBranch?.facility_id : undefined);
  };

  // Shared draft payload for both the cash path (below) and the online-payment path (submitPayment).
  const buildBookingDraft = (modeLabel: string) => ({
    partner_id: bookingDoctorPartnerId!,
    service_type: consultType,
    booking_date: selectedDate,
    time_slot_id: selectedSlot!.time_slot_id,
    time_slot: selectedSlot!.start_time.slice(0, 5),
    family_member_id: selectedFamily ? String(selectedFamily.memberUserId) : undefined,
    hospital_partner_id: isHospital ? selectedProvider?.id : undefined,
    payment_mode: modeLabel,
  });

  // Cash bookings still create the REAL booking immediately (payment happens later, in person —
  // there's nothing to charge now, so there's no abandoned-payment slot-squatting risk). Online
  // payment modes deliberately do NOT create anything here — see BUGS.md #57: creating the booking
  // (and reserving the slot) before payment let an abandoned or declined checkout permanently hold
  // a slot away from a patient who'd actually pay for it. For online modes this just moves to the
  // payment step; the booking is only created in submitPayment(), atomically with a successful charge.
  const proceedToPayment = () => {
    if (!bookingDoctorPartnerId || !selectedSlot || selectedSlot.is_booked) return;
    setError(null);
    setCreatedBooking(null);
    setPaymentResult(null);
    setPage('payment');
  };

  const confirmCashAtClinic = async () => {
    if (!bookingDoctorPartnerId || !selectedSlot || selectedSlot.is_booked) return;
    setIsProcessingPayment(true);
    setError(null);
    try {
      let booking = createdBooking;
      if (!booking) {
        booking = await createBookingApi(buildBookingDraft('Pay at Clinic (Cash)'));
        setCreatedBooking(booking);
      }
      setPaymentResult({
        success: true,
        reference_id: booking.payment_reference_id || booking.booking_number || 'CASH-AT-CLINIC',
        payment_status: 'PENDING',
        booking_status: booking.booking_status || 'SCHEDULED',
        amount: Number(booking.total_amount || payableTotal),
        currency: 'INR',
      });
      window.dispatchEvent(new Event('vizito-notifications-refresh'));
      setTimeout(() => window.dispatchEvent(new Event('vizito-notifications-refresh')), 2500);
      setPage('confirmation');
    } catch (e: any) {
      const data = e?.response?.data;
      const rawMsg = data?.message || 'Booking failed. The slot may no longer be available.';
      const msg = Array.isArray(rawMsg) ? rawMsg.join(', ') : String(rawMsg);
      setError(msg);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const submitPayment = async () => {
    if (paymentMode === 'CASH') {
      await confirmCashAtClinic();
      return;
    }
    if (!bookingDoctorPartnerId || !selectedSlot) return;

    setIsProcessingPayment(true);
    setError(null);
    try {
      const apiMethod: ApiPaymentMethod = paymentMode === 'NETBANKING' ? 'NET_BANKING' : paymentMode;
      const digitsOnly = cardDetails.number.replace(/\D/g, '');
      // The booking is created HERE, atomically with the charge — not before (see BUGS.md #57 /
      // proceedToPayment above). A declined charge never creates a booking at all; the backend
      // throws instead of returning a plain success:false, and no slot is ever left reserved.
      const booking = await createBookingApi({
        ...buildBookingDraft('Online'),
        payment: {
          payment_method: apiMethod,
          upi_id: paymentMode === 'UPI' ? (upiApp === 'custom' ? customUpiId : `${upiApp}@simulated`) : undefined,
          card_last4: paymentMode === 'CARD' && digitsOnly.length >= 4 ? digitsOnly.slice(-4) : undefined,
          card_holder_name: paymentMode === 'CARD' ? cardDetails.name : undefined,
          bank_name: paymentMode === 'NETBANKING' ? selectedBank : undefined,
          wallet_provider: paymentMode === 'WALLET' ? selectedWallet : undefined,
        },
      });
      setCreatedBooking(booking);
      setPaymentResult({
        success: true,
        reference_id: booking.payment_reference_id || '',
        payment_status: (booking.payment_status as PaymentStatusResult['payment_status']) || 'PAID',
        booking_status: booking.booking_status,
        amount: Number(booking.total_amount),
        currency: 'INR',
      });
      window.dispatchEvent(new Event('vizito-notifications-refresh'));
      setTimeout(() => window.dispatchEvent(new Event('vizito-notifications-refresh')), 2500);
      setPage('confirmation');
    } catch (e: any) {
      const data = e?.response?.data;
      const rawMsg = data?.message || 'Payment could not be processed. Please try again.';
      const msg = Array.isArray(rawMsg) ? rawMsg.join(', ') : String(rawMsg);
      // A declined charge (PatientBookingService.create()) arrives as an HTTP error carrying both
      // a message and the simulated reference id — reconstruct the same paymentResult shape the
      // old flow got from a non-throwing decline, so the existing "Payment Declined" UI and "Try
      // Again" affordance keep working unchanged. Anything else (slot taken meanwhile, validation,
      // network) just shows as a plain error instead.
      if (data?.reference_id) {
        setPaymentResult({
          success: false,
          reference_id: data.reference_id,
          failure_reason: msg,
          payment_status: 'FAILED',
          booking_status: 'PENDING',
          amount: payableTotal,
          currency: 'INR',
        });
      } else {
        setError(msg);
      }
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const goBack = () => {
    setError(null);
    if (page === 'confirmation') { navigate('/bookings'); return; }
    if (page === 'payment') { setPage('booking'); return; }
    if (page === 'booking') { setPage('provider'); return; }
    navigate('/healthcare-services');
  };

  // Blood Bank has its own screen (Find Blood).
  if (!appointmentEnabled && serviceId === 'bloodbank') return <Navigate to="/find-blood" replace />;

  // ---- Honest gate for non-appointment services ----
  if (!appointmentEnabled) {
    return (
      <div className="min-h-screen bg-slate-50/50 py-10">
        <div className="max-w-2xl mx-auto">
          <button onClick={() => navigate('/healthcare-services')} className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-2 rounded-xl mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to Services
          </button>
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-10 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto"><CalendarClock className="w-8 h-8" /></div>
            <h1 className="text-2xl font-black text-slate-900">Online booking isn't available for this service</h1>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              {service ? `${service.emoji} ${service.name}` : 'This service'} doesn't support online appointment booking yet. Doctor and Hospital/Clinic consultations are available now.
            </p>
            <button onClick={() => navigate('/find-doctors')} className="px-5 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm">Book a Doctor Consultation</button>
          </div>
        </div>
      </div>
    );
  }

  const pageNum = page === 'provider' ? 1 : page === 'booking' ? 2 : page === 'payment' ? 3 : 3;

  return (
    <motion.div
      className="min-h-screen bg-[#FAF7F4] py-5 sm:py-7"
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <div className="mx-auto w-full max-w-[1600px] space-y-5 pb-28">
        <div className="flex items-center justify-between gap-3">
          <button onClick={goBack} className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="text-right">
            <span className="text-orange-800 font-bold text-xs uppercase tracking-wider">{service?.emoji} {service?.name}</span>
            {page !== 'confirmation' && <p className="text-[11px] text-slate-400 font-bold">Step {pageNum} of 3</p>}
          </div>
        </div>

        {/* ===================== PAGE 1: PROVIDER ===================== */}
        {page === 'provider' && (
          <div className="space-y-6">
            {/* Hero Header */}
            <section className="rounded-3xl border border-orange-100 bg-gradient-to-r from-orange-50/90 via-white to-white p-5 sm:p-7 shadow-sm">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-orange-800">
                  <span className="h-2 w-2 rounded-full bg-orange-500" aria-hidden="true" />{isHospital ? 'Hospitals & clinics' : 'Doctor consultations'}
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                  {isHospital ? 'Find a Hospital or Clinic' : 'Find a Doctor'}
                </h2>
                <p className="text-slate-600 text-sm max-w-2xl">
                  {isHospital
                    ? 'Select an accredited hospital or clinic branch to book appointments and admissions.'
                    : 'Search specialists, compare doctor profiles, and choose an in-clinic or video consultation.'}
                </p>
                <div className="mt-4 relative max-w-3xl">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={providerSearch}
                    onChange={(e) => setProviderSearch(e.target.value)}
                    placeholder={isHospital ? 'Search by hospital, area, department, doctor or symptom (e.g. knee pain)' : 'Search by doctor, specialty or symptom (e.g. fever, tooth pain)'}
                    className="w-full pl-11 pr-11 py-3.5 bg-white border border-slate-200 text-slate-900 rounded-2xl font-medium text-sm placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-orange-200/70 focus:border-orange-300 shadow-sm"
                    aria-label={isHospital ? 'Search hospitals, areas, departments or doctors' : 'Search doctors, specialties or symptoms'}
                  />
                  {providerSearch && (
                    <button
                      onClick={() => setProviderSearch('')}
                      aria-label="Clear search"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* Not sure whom to see? Pick what's wrong. */}
            <section className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
              <div className="space-y-2">
              <div><h3 className="text-sm font-bold text-slate-900">Start with a symptom</h3><p className="text-xs text-slate-500">Choose a common concern to see a relevant specialty.</p></div>
              <div className="flex gap-2 overflow-x-auto pb-1 modal-scrollbar">
                {SYMPTOM_CHIPS.map((c) => (
                  <button key={c.label} type="button" onClick={() => { setProviderSearch(''); setFilterSpecialization(c.specialty); }}
                    className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-semibold border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${filterSpecialization === c.specialty ? 'bg-orange-50 border-orange-300 text-orange-900' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-orange-200 hover:bg-orange-50/50'}`}>
                    {c.label}
                  </button>
                ))}
              </div>
              {(filterSpecialization && specialtyHint(filterSpecialization)) || queryMeansSpecialties.length > 0 ? (
                <p role="status" className="text-xs text-slate-600">
                  {filterSpecialization
                    ? <>Showing <b>{filterSpecialization}</b>{isHospital ? ' departments' : 's'}: {specialtyHint(filterSpecialization)}.</>
                    : <>“{providerSearch.trim()}” — you may need a <b>{queryMeansSpecialties.slice(0, 2).join(' or ')}</b>. Matching {isHospital ? 'hospitals and clinics' : 'doctors'} are shown below.</>}
                </p>
              ) : null}
            </div>

            {/* Specialization Filter Pills */}
            {(
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between">
                  <div><h3 className="text-sm font-bold text-slate-900">Browse specialties</h3><p className="text-xs text-slate-500 mt-0.5">{isHospital ? 'Filter hospitals by their departments.' : 'Filter doctors by their specialty.'}</p></div>
                  {filterSpecialization && (
                    <button
                      onClick={() => setFilterSpecialization(null)}
                      className="text-xs font-bold text-teal-600 hover:underline cursor-pointer"
                    >
                      Clear Filter
                    </button>
                  )}
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 modal-scrollbar">
                  <button
                    onClick={() => setFilterSpecialization(null)}
                    className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      filterSpecialization === null
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {isHospital ? 'All' : 'All Doctors'} ({providers.length})
                  </button>
                  {dynamicSpecializations.map((s) => {
                    const isSelected = filterSpecialization === s.name;
                    return (
                      <button
                        key={s.name}
                        onClick={() => setFilterSpecialization(isSelected ? null : s.name)}
                        className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-teal-600 text-white shadow-xs'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span>{s.name}</span>
                        {s.count > 0 && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${isSelected ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                            {s.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            </section>

            {/* Provider Grid */}
            <section aria-label="Doctor results" className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
                <LocationBar compact purpose={`see how far each ${isHospital ? 'hospital' : 'doctor'} is`} />
              </div>
              <div className="flex flex-wrap items-end justify-between gap-3 px-1">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-orange-800">{filterSpecialization || (isHospital ? 'Hospitals & clinics' : 'Doctors near you')}</p>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">{providerSearch ? 'Search results' : (isHospital ? 'Choose a hospital or clinic' : 'Choose a doctor')}</h3>
                  {!loading && !error && <p className="text-sm text-slate-500 mt-0.5">{filteredProviders.length} {filteredProviders.length === 1 ? 'result' : 'results'}{providerSearch ? ` for “${providerSearch.trim()}”` : ''}</p>}
                </div>
                {area && rankedProviders.some((p) => distOf(p)) && (
                  <button type="button" aria-pressed={nearFirst} onClick={() => setNearFirst(!nearFirst)} className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${nearFirst ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:border-orange-200'}`}>{nearFirst ? 'Nearest first ✓' : 'Sort by nearest'}</button>
                )}
              </div>
            {loading ? (
              <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center shadow-xs">
                <div className="w-7 h-7 border-[3px] border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-slate-500 font-medium text-sm">{isHospital ? 'Loading hospitals...' : 'Loading doctors...'}</p>
              </div>
            ) : error ? (
              <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center shadow-xs space-y-3">
                <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
                <p className="text-rose-600 font-semibold text-sm">{error}</p>
                <button onClick={loadProviders} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl">
                  <RotateCcw className="w-4 h-4" /> Retry
                </button>
              </div>
            ) : filteredProviders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center shadow-xs space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-800">
                  {filterSpecialization
                    ? `No ${filterSpecialization}${isHospital ? ' department' : ''} on Vizito near you yet`
                    : providerSearch ? 'Nothing matches that search' : (isHospital ? 'No hospitals registered yet' : 'No doctors registered yet')}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {filterSpecialization && filterSpecialization !== 'General Physician'
                    ? 'A General Physician can see you first and refer you to the right specialist.'
                    : providerSearch || filterSpecialization
                      ? "Try a symptom (e.g. fever), a specialty, an area or a doctor's name."
                      : 'Providers will appear here once they are listed.'}
                </p>
                {filterSpecialization && filterSpecialization !== 'General Physician' && (
                  <button
                    onClick={() => { setProviderSearch(''); setFilterSpecialization('General Physician'); }}
                    className="mt-1 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold"
                  >
                    See General Physicians
                  </button>
                )}
                {(providerSearch || filterSpecialization) && (
                  <button
                    onClick={() => { setProviderSearch(''); setFilterSpecialization(null); }}
                    className="ml-3 text-xs font-bold text-teal-600 hover:underline inline-block pt-1 cursor-pointer"
                  >
                    Reset all filters
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
                  {(nearFirst ? [...rankedProviders].sort((a, b) => (distOf(a)?.metres ?? Infinity) - (distOf(b)?.metres ?? Infinity)) : rankedProviders).map((p) => renderProviderCard(p))}
                </div>
                {suggestions.length > 0 && (
                  <section aria-label="Suggested alternatives" className="pt-6 space-y-3">
                    <div>
                      <h3 className="text-base font-black text-slate-800">Other {isHospital ? 'hospitals' : 'doctors'} you may consider</h3>
                      <p className="text-xs text-slate-500">Suggested because they offer the same speciality or are in the same area — not part of your search results.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
                      {suggestions.map((x) => renderProviderCard(x.p, x.why))}
                    </div>
                  </section>
                )}
              </div>
            )}
            </section>
          </div>
        )}

        {/* ===================== PAGE 2: BOOKING DETAILS ===================== */}
        {page === 'booking' && (
          <div className="space-y-4">
            {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}

            {/* Selected provider header */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                {isHospital ? <Building2 className="w-5 h-5" /> : <span className="font-black text-sm">{initials(selectedProvider?.name || '')}</span>}
              </div>
              <div className="min-w-0">
                <h3 className="font-extrabold text-slate-800 truncate">{selectedProvider?.name}</h3>
                {selectedProvider?.specialtyOrType && <p className="text-[11px] font-semibold text-slate-400 capitalize">{selectedProvider.specialtyOrType}</p>}
                {isHospital && selectedProvider?.org && (
                  <p className="text-xs text-slate-600 mt-0.5">{[
                    `${selectedProvider.org.locations.length} location${selectedProvider.org.locations.length === 1 ? '' : 's'}`,
                    `${selectedProvider.org.departments.length} department${selectedProvider.org.departments.length === 1 ? '' : 's'}`,
                    `${selectedProvider.org.doctor_count} doctor${selectedProvider.org.doctor_count === 1 ? '' : 's'}`,
                  ].join(' · ')}{selectedProvider.rating ? ` · ★ ${selectedProvider.rating.average.toFixed(1)} (${selectedProvider.rating.count})` : ''}</p>
                )}
              </div>
              <button onClick={() => setPage('provider')} className="ml-auto text-[11px] font-bold text-teal-700 hover:underline shrink-0 cursor-pointer">Change</button>
            </div>

            {/* HOSPITAL: Branch */}
            {isHospital && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                <SectionTitle icon={MapPin}>Choose a location</SectionTitle>
                {branches.length > 1 && <LocationBar compact purpose="find the nearest branch" />}
                {loading ? (
                  <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                    Loading locations...
                  </div>
                ) : branches.length === 0 ? (
                  <p className="text-slate-500 text-sm">No locations are open for booking yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(area ? [...branches].sort((x, y) => (x.pin ? metresBetween(area, x.pin) : Infinity) - (y.pin ? metresBetween(area, y.pin) : Infinity)) : branches).map((b) => {
                      const sel = selectedBranch?.facility_id === b.facility_id;
                      return (
                        <button
                          key={b.facility_id}
                          onClick={() => selectedProvider && enterBranch(b, selectedProvider.id)}
                          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                            sel
                              ? 'border-teal-600 bg-teal-50/50 ring-2 ring-teal-500/20 shadow-xs'
                              : 'border-slate-200 bg-white hover:border-teal-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-extrabold text-slate-800 text-sm">{b.name}</span>
                            {sel && <Check className="w-4 h-4 text-teal-600 shrink-0" />}
                          </div>
                          {(b.address_line_1 || b.area || b.city) && <p className="text-xs text-slate-500">{[b.address_line_1, b.area, b.city, b.pincode].filter(Boolean).join(', ')}</p>}
                          {area && b.pin && <p className="text-[11px] font-bold text-teal-800 mt-1">{formatDistance(metresBetween(area, b.pin))} away (straight line)</p>}
                          {!b.pin && <p className="text-[10px] text-slate-400 mt-1">Map pin not confirmed yet</p>}
                          {b.emergency_contact && <p className="text-[11px] font-bold text-rose-700 mt-1">Emergency: {b.emergency_contact}</p>}
                          {/* Fees depend on the department; they are shown when you pick one. */}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* HOSPITAL: Department — patients choose the speciality first, as at a hospital front desk. */}
            {isHospital && branchChosen && selectedBranch && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                <SectionTitle icon={Stethoscope}>Department</SectionTitle>
                {!selectedDepartment && !anyDepartment && <p className="text-xs text-slate-500 -mt-1">Choose the speciality you need — we’ll show the days its doctors are available, then the doctors.</p>}
                {doctorsLoading && !departments.length ? (
                  <div className="py-6 text-center"><div className="w-6 h-6 border-[3px] border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>
                ) : departments.length === 0 ? (
                  <button onClick={() => chooseDepartment(null)} className={`w-full text-left p-4 rounded-2xl border ${anyDepartment ? 'border-teal-600 bg-teal-50/50' : 'border-slate-200 hover:border-teal-300'}`}>
                    <span className="font-extrabold text-slate-800 text-sm">General consultation</span>
                    <span className="block text-xs text-slate-500">This location hasn't listed departments; see every doctor available.</span>
                  </button>
                ) : (
                  <div role="radiogroup" aria-label="Department" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {departments.map((d) => {
                      const sel = selectedDepartment?.facility_department_id === d.facility_department_id;
                      return (
                        <button key={d.facility_department_id} role="radio" aria-checked={sel} onClick={() => chooseDepartment(d)}
                          className={`text-left p-3.5 rounded-2xl border transition-all ${sel ? 'border-teal-600 bg-teal-50/50 ring-2 ring-teal-500/20' : 'border-slate-200 bg-white hover:border-teal-300 hover:bg-slate-50'}`}>
                          <span className="flex items-center justify-between gap-2"><span className="flex items-center gap-2.5 min-w-0">{deptPhoto(d.name) && <img src={deptPhoto(d.name)!} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} className="w-10 h-10 rounded-xl object-cover shrink-0" />}<span className="font-extrabold text-slate-800 text-sm">{d.name}</span></span>{sel && <Check className="w-4 h-4 text-teal-600 shrink-0" />}</span>
                          <span className="block text-[11px] text-slate-500 mt-0.5">
                            {d.in_person_fee != null ? `Consultation ₹${d.in_person_fee}` : 'Fee shown at booking'}{d.online_fee != null ? ` · Video ₹${d.online_fee}` : ''}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* HOSPITAL: Date — each day shows how many doctors of this department are free. */}
            {isHospital && branchChosen && (selectedDepartment || anyDepartment) && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                <SectionTitle icon={Calendar}>Date</SectionTitle>
                <div role="radiogroup" aria-label="Appointment date" className="flex gap-2 overflow-x-auto pb-1">
                  {upcomingDates(14).map((d) => {
                    const n = dayCounts[d.value];
                    const none = n === 0;
                    const sel = hospitalDateConfirmed && selectedDate === d.value;
                    return (
                      <button key={d.value} role="radio" aria-checked={sel} disabled={none} onClick={() => pickHospitalDay(d.value)}
                        aria-label={`${d.weekday} ${d.label}: ${n == null ? 'checking' : n ? `${n} doctor${n === 1 ? '' : 's'} available` : 'no doctors available'}`}
                        className={`shrink-0 w-[4.5rem] py-2 rounded-xl border text-center ${sel ? 'border-teal-600 bg-teal-50 text-teal-800' : none ? 'border-slate-100 text-slate-300 bg-slate-50 cursor-not-allowed' : 'border-slate-200 text-slate-600 hover:border-teal-300'}`}>
                        <span className="block text-[10px] font-bold uppercase">{d.weekday}</span>
                        <span className="block text-xs font-black">{d.label}</span>
                        <span className={`block text-[10px] font-semibold mt-0.5 ${none ? 'text-slate-300' : 'text-emerald-700'}`}>{n == null ? '…' : n ? `${n} dr` : 'None'}</span>
                      </button>
                    );
                  })}
                </div>
                {Object.values(dayCounts).length > 0 && Object.values(dayCounts).every((n) => n === 0) && (
                  <p className="text-sm text-slate-600">No {selectedDepartment ? selectedDepartment.name : ''} doctor has open times here in the next 14 days. Try another department or location.</p>
                )}
              </div>
            )}

            {/* HOSPITAL: Doctors of this department free on the chosen day. */}
            {isHospital && branchChosen && hospitalDateConfirmed && (selectedDepartment || anyDepartment) && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                <SectionTitle icon={Users}>{selectedDepartment ? `${selectedDepartment.name} doctors` : 'Doctors'} · {upcomingDates(14).find((d) => d.value === selectedDate)?.label}</SectionTitle>
                {doctorsLoading ? (
                  <div className="py-6 text-center"><div className="w-6 h-6 border-[3px] border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>
                ) : doctors.length === 0 ? (
                  <p className="text-slate-500 text-sm py-2">No doctor has open times on this day. Choose another date.</p>
                ) : (
                  <div role="radiogroup" aria-label="Doctor" className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {doctors.map((doc) => {
                      const sel = selectedDoctor?.doctor_partner_id === doc.doctor_partner_id;
                      return (
                        <button key={doc.doctor_partner_id} role="radio" aria-checked={sel} onClick={() => pickDoctor(doc)} className={`text-left p-3.5 rounded-xl border flex items-start gap-3 transition-all ${sel ? 'border-teal-600 bg-teal-50/40 ring-1 ring-teal-200' : 'border-slate-200 hover:border-teal-300'}`}>
                          <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-black text-xs shrink-0">{initials(doc.name)}</div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-800 text-sm truncate">{formatDoctorName(doc.name) || doc.name}</p>
                            <p className="text-[11px] text-slate-500 truncate">{[doc.specialization || selectedDepartment?.name, doc.experience_years ? `${doc.experience_years} yrs experience` : null].filter(Boolean).join(' · ')}</p>
                            <p className="text-[11px] text-slate-500">{[doc.room_number ? `Room ${doc.room_number}` : null, selectedDepartment?.in_person_fee != null ? `₹${selectedDepartment.in_person_fee}` : null].filter(Boolean).join(' · ') || ' '}</p>
                          </div>
                          {sel ? <Check className="w-4 h-4 text-teal-600 shrink-0" /> : <span className="text-[11px] font-bold text-teal-700 shrink-0">See times</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* DOCTOR-DIRECT: doctor summary card — name, specialty, experience, qualification,
                and a compact rating line (reusing the same `reviews` summary the full Ratings &
                Reviews section below uses, so this isn't a second, separate rating fetch — just a
                short pointer to the same data). No photo field exists anywhere in the doctor data
                model (DoctorDetail has no image/avatar url), so the initials avatar is what's real. */}
            {!isHospital && providerDetail?.doctor && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center font-black text-lg shrink-0">{initials(bookingDoctorName || 'DR')}</div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-extrabold text-slate-800 text-base">{formatDoctorName(providerDetail.doctor.full_name || bookingDoctorName)}</h3>
                  {providerDetail.doctor.specialization && (
                    <p className="text-xs font-bold text-teal-700 mt-0.5">
                      {providerDetail.doctor.specialization}
                      {providerDetail.doctor.super_specialization && <span className="text-slate-400 font-semibold"> &middot; {providerDetail.doctor.super_specialization}</span>}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[11px] text-slate-500 font-semibold">
                    {Number(providerDetail.doctor.experience_years) > 0 && <span>{providerDetail.doctor.experience_years} yrs experience</span>}
                    {providerDetail.doctor.qualification && <span>{providerDetail.doctor.qualification}</span>}
                  </div>
                  {reviews && reviews.totalReviews > 0 && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span className="font-black text-slate-800 text-xs">{reviews.averageRating.toFixed(1)}</span>
                      <span className="text-[11px] text-slate-400 font-semibold">({reviews.totalReviews} review{reviews.totalReviews === 1 ? '' : 's'})</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* DOCTOR-DIRECT: Clinic / Branch — a doctor can hold slots at more than one clinic, so
                this is derived from the currently-loaded slots for the selected date, not a single
                fixed "doctor's clinic" (see AvailableSlot.facility_name/_address, resolved server-
                side from the same facility record time-slots already carry). Recomputed on every
                render from live state — never stored separately — so it can never go stale when the
                doctor/date/consult-type/selected-slot changes. Hospital flow already has its own
                explicit Branch picker above, so this is doctor-direct only. */}
            {!isHospital && doctorChosen && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                <SectionTitle icon={Building2}>Clinic / Branch</SectionTitle>
                {consultType === 'Video' ? (
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-teal-50/50 border border-teal-100">
                    <Smartphone className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-slate-800">Video Consultation</p>
                      <p className="text-xs text-slate-500 mt-0.5">No clinic visit needed — you'll consult with the doctor online at your scheduled time.</p>
                    </div>
                  </div>
                ) : slotsLoading ? (
                  <div className="py-3 text-center"><div className="w-5 h-5 border-[3px] border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>
                ) : clinicInfo?.facility_name ? (
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0"><Building2 className="w-4.5 h-4.5" /></div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800">{clinicInfo.facility_name}</p>
                      {clinicInfo.facility_address && (
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0" />{clinicInfo.facility_address}</p>
                      )}
                      {clinicInfo.facility_type && <p className="text-[11px] text-slate-400 font-semibold mt-0.5">{clinicInfo.facility_type}</p>}
                    </div>
                  </div>
                ) : distinctFacilities.length > 1 ? (
                  <p className="text-xs text-slate-500 font-medium">This doctor practices at more than one location on {upcomingDates(14).find((d) => d.value === selectedDate)?.label || selectedDate} — pick a time slot below to see exactly where.</p>
                ) : (
                  <p className="text-xs text-slate-400 font-medium">Clinic details will appear once a time slot is selected.</p>
                )}
              </div>
            )}

            {/* Type + Date + Slots — only once a doctor is chosen */}
            {doctorChosen && (
              <>
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                  <SectionTitle icon={Calendar}>Consultation & Date</SectionTitle>
                  <div className="grid grid-cols-2 gap-3">
                    {(['In Person', 'Video'] as const).map((t) => (
                      <button key={t} onClick={() => setConsultType(t)} className={`p-2.5 rounded-xl border text-sm font-bold ${consultType === t ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-slate-200 text-slate-600'}`}>
                        {t === 'Video' ? '📹 Video' : '🏥 In-Clinic'}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {upcomingDates(14).map((d) => {
                      const hasSlots = datesWithSlots[d.value];
                      return (
                        <button
                          key={d.value}
                          onClick={() => changeDate(d.value)}
                          className={`relative shrink-0 w-16 py-2 rounded-xl border text-center transition-all ${
                            selectedDate === d.value
                              ? 'border-teal-600 bg-teal-50 text-teal-800 shadow-xs'
                              : 'border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <span className="block text-[10px] font-bold uppercase">{d.weekday}</span>
                          <span className="block text-xs font-black">{d.label}</span>
                          {hasSlots && (
                            <span
                              title="Slots available"
                              aria-label="Slots available"
                              className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mx-auto mt-0.5"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                  <SectionTitle icon={Clock}>Available Slots</SectionTitle>
                  {slotsLoading ? (
                    <div className="py-6 text-center"><div className="w-6 h-6 border-[3px] border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>
                  ) : slotsPaused ? (
                    <p role="status" className="text-amber-800 bg-amber-50 border border-amber-200 rounded-xl text-sm font-semibold py-3 px-3 text-center">{slotsPaused} Please choose another doctor or check back later.</p>
                  ) : activeSlots.length === 0 ? (
                    <p className="text-slate-500 text-sm font-medium py-3 text-center">No appointments available for this date.</p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {activeSlots.map((s) => {
                        const isBooked = Boolean(s.is_booked);
                        const isSelected = selectedSlot?.time_slot_id === s.time_slot_id;
                        return (
                          <button
                            key={s.time_slot_id}
                            type="button"
                            disabled={isBooked}
                            onClick={() => {
                              if (!isBooked) setSelectedSlot(s);
                            }}
                            className={`py-2 px-1.5 rounded-lg border text-xs font-bold transition-all flex flex-col items-center justify-center min-h-[46px] ${
                              isBooked
                                ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed select-none'
                                : isSelected
                                ? 'border-teal-600 bg-teal-50 text-teal-800 ring-2 ring-teal-500/20 shadow-xs'
                                : 'border-slate-200 text-slate-600 hover:border-teal-300 hover:bg-slate-50'
                            }`}
                          >
                            <span className={isBooked ? 'line-through opacity-70' : ''}>
                              {formatSlotTime(s.start_time)}
                            </span>
                            {isBooked && (
                              <span className="text-[9px] font-extrabold uppercase tracking-wider text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200/50 mt-0.5">
                                Booked
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Booking for */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                  <SectionTitle icon={Users}>Booking For</SectionTitle>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setSelectedFamily(null)} className={`px-3.5 py-2 rounded-xl text-xs font-bold border ${selectedFamily === null ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600 border-slate-200'}`}>Myself</button>
                    {family.map((m) => (
                      <button key={m.associationId} onClick={() => setSelectedFamily(m)} className={`px-3.5 py-2 rounded-xl text-xs font-bold border ${selectedFamily?.associationId === m.associationId ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600 border-slate-200'}`}>{m.name} <span className="opacity-70">· {m.relationship}</span></button>
                    ))}
                    <button onClick={() => navigate('/family-profiles')} className="px-3.5 py-2 rounded-xl text-xs font-bold border border-dashed border-slate-300 text-slate-500 hover:bg-slate-50">+ Add family</button>
                  </div>
                </div>

                {/* Ratings & Reviews (real) — deliberately placed AFTER doctor/clinic/type/date/slots/
                    booking-for: the patient should know who, where, what kind, and when before
                    reading what past patients thought (see PR description's UX ordering rule). */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <SectionTitle icon={Star}>Ratings &amp; Reviews</SectionTitle>
                    {reviews && reviews.totalReviews > 0 && (
                      <span className="flex items-center gap-1.5 text-sm">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        <span className="font-black text-slate-800">{reviews.averageRating.toFixed(1)}</span>
                        <span className="text-xs text-slate-400 font-semibold">({reviews.totalReviews})</span>
                      </span>
                    )}
                  </div>
                  {reviewsLoading ? (
                    <div className="py-4 text-center"><div className="w-5 h-5 border-[3px] border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>
                  ) : !reviews || reviews.reviews.length === 0 ? (
                    <p className="text-slate-400 text-xs font-medium py-1">No reviews yet.</p>
                  ) : (
                    <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                      {reviews.reviews.slice(0, 10).map((rv) => (
                        <div key={rv.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold text-slate-800">{rv.reviewer_name || 'Patient'}</span>
                            <span className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star key={s} className={`w-3 h-3 ${s <= rv.rating ? 'text-amber-500 fill-amber-500' : 'text-slate-200'}`} />
                              ))}
                            </span>
                          </div>
                          {rv.review && <p className="text-xs text-slate-600">"{rv.review}"</p>}
                          {rv.partner_response && (
                            <div className="mt-1 pl-3 border-l-2 border-teal-200">
                              <span className="text-[10px] font-bold text-teal-700 flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Doctor</span>
                              <p className="text-xs text-slate-600">{rv.partner_response}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ===================== PAGE 3: PAYMENT & BILL BREAKDOWN ===================== */}
        {/* No longer gated on createdBooking - for online modes it doesn't exist yet at this
            point (see submitPayment); this page is exactly where it gets created. */}
        {page === 'payment' && (
          <div className="space-y-5">
            {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}

            {/* This is a simulated payment experience — no real gateway (Razorpay/Stripe) is wired
                in yet. Said plainly rather than left to be inferred from working card numbers. */}
            <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] font-bold text-amber-800">
              <FlaskConical className="w-3.5 h-3.5 shrink-0" /> Simulated payment for demonstration — no real charge will be made.
            </div>

            {/* Payment declined — stays on this page so the patient can correct details and retry
                against the SAME booking (still PENDING, never marked PAID by a failed attempt). */}
            {paymentResult && !paymentResult.success && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-1.5">
                <p className="flex items-center gap-2 text-sm font-black text-rose-700"><XCircle className="w-4.5 h-4.5" /> Payment Declined</p>
                <p className="text-xs text-rose-600 font-semibold">{paymentResult.failure_reason || 'The payment could not be authorized.'}</p>
                <p className="text-[10px] text-rose-400 font-mono">Ref: {paymentResult.reference_id}</p>
              </div>
            )}

            {/* Processing overlay */}
            {isProcessingPayment && (
              <div className="bg-white rounded-2xl border border-slate-200 py-10 text-center shadow-xs space-y-3">
                <div className="w-8 h-8 border-[3px] border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-slate-700 font-bold text-sm">Processing payment...</p>
                <p className="text-slate-400 text-xs font-medium">Verifying transaction...</p>
              </div>
            )}

            {/* Appointment Review Summary */}
            <div className="bg-gradient-to-br from-[#6B4530] to-[#2B1A11] rounded-3xl p-6 text-white shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-teal-700/50 pb-3">
                <span className="text-xs font-bold text-teal-300 uppercase tracking-wider flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> Appointment Summary</span>
                <span className="bg-teal-500/20 border border-teal-400/30 text-teal-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full">{consultType}</span>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-teal-700/60 border border-teal-500/40 text-white flex items-center justify-center font-black text-sm shrink-0">
                  {initials(bookingDoctorName || 'DR')}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <h3 className="font-extrabold text-lg text-white truncate">{bookingDoctorName}</h3>
                  {isHospital && selectedBranch && <p className="text-xs text-teal-200 flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> {selectedBranch.name}</p>}
                  <p className="text-xs text-slate-300 flex items-center gap-2 font-medium">
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-teal-400" /> {selectedDate}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-teal-400" /> {selectedSlot ? formatSlotTime(selectedSlot.start_time) : ''}</span>
                  </p>
                  <p className="text-xs text-slate-300 flex items-center gap-1 font-medium">
                    <Users className="w-3.5 h-3.5 text-teal-400" /> Patient: <strong className="text-white font-bold">{selectedFamily ? `${selectedFamily.name} (${selectedFamily.relationship})` : 'Myself'}</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Select Payment Method */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <SectionTitle icon={CreditCard}>Select Payment Method</SectionTitle>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'UPI', label: 'UPI (GPay / PhonePe)', icon: Smartphone, badge: 'Fastest' },
                  { id: 'CARD', label: 'Credit / Debit Card', icon: CreditCard },
                  { id: 'NETBANKING', label: 'Net Banking', icon: Building },
                  { id: 'WALLET', label: 'Wallets', icon: Wallet },
                  { id: 'CASH', label: 'Pay at Clinic', icon: DollarSign, badge: 'In-Person' },
                ].map((m) => {
                  const Icon = m.icon;
                  const sel = paymentMode === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setPaymentMode(m.id as PaymentMethod)}
                      className={`text-left p-3 rounded-xl border transition-all relative ${sel ? 'border-teal-600 bg-teal-50/50 ring-1 ring-teal-300' : 'border-slate-200 hover:border-teal-300'}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Icon className={`w-4 h-4 ${sel ? 'text-teal-700' : 'text-slate-400'}`} />
                        {sel && <Check className="w-4 h-4 text-teal-600" />}
                      </div>
                      <span className="font-extrabold text-xs text-slate-800 block">{m.label}</span>
                      {m.badge && <span className="text-[9px] font-extrabold text-teal-700 uppercase">{m.badge}</span>}
                    </button>
                  );
                })}
              </div>

              {paymentMode !== 'CASH' && <TestPaymentNote />}
              {/* Dynamic details for chosen payment method */}
              {paymentMode === 'UPI' && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
                  <p className="font-bold text-slate-700">Choose Instant UPI App:</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'gpay', name: 'Google Pay' },
                      { id: 'phonepe', name: 'PhonePe' },
                      { id: 'paytm', name: 'Paytm UPI' },
                      { id: 'bhim', name: 'BHIM UPI' },
                      { id: 'custom', name: 'Custom UPI ID' },
                    ].map((app) => (
                      <button
                        key={app.id}
                        onClick={() => setUpiApp(app.id as any)}
                        className={`px-3 py-1.5 rounded-lg border font-bold ${upiApp === app.id ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-700 border-slate-200'}`}
                      >
                        {app.name}
                      </button>
                    ))}
                  </div>
                  {upiApp === 'custom' && (
                    <input
                      type="text"
                      value={customUpiId}
                      onChange={(e) => setCustomUpiId(e.target.value)}
                      placeholder="e.g. mobileNumber@upi / username@okhdfcbank"
                      className="w-full bg-white px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs focus:outline-none focus:border-teal-500"
                    />
                  )}
                  <p className="text-[11px] text-slate-400 font-medium">Enter your VPA or select an instant UPI app to authorize payment upon clicking submit.</p>
                </div>
              )}

              {paymentMode === 'CARD' && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
                  <p className="font-bold text-slate-700">Enter Card Details:</p>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={cardDetails.number}
                      onChange={(e) => setCardDetails({ ...cardDetails, number: e.target.value })}
                      placeholder="Card Number (16 digits)"
                      maxLength={19}
                      className="w-full bg-white px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs focus:outline-none focus:border-teal-500"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={cardDetails.expiry}
                        onChange={(e) => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                        placeholder="MM / YY"
                        maxLength={5}
                        className="bg-white px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-teal-500"
                      />
                      <input
                        type="password"
                        value={cardDetails.cvv}
                        onChange={(e) => setCardDetails({ ...cardDetails, cvv: e.target.value })}
                        placeholder="CVV (3 digits)"
                        maxLength={4}
                        className="bg-white px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs focus:outline-none focus:border-teal-500"
                      />
                    </div>
                    <input
                      type="text"
                      value={cardDetails.name}
                      onChange={(e) => setCardDetails({ ...cardDetails, name: personNameInput(e.target.value) })}
                      placeholder="Cardholder Name"
                      className="w-full bg-white px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
              )}

              {paymentMode === 'NETBANKING' && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <p className="font-bold text-slate-700">Select Bank:</p>
                  <select
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    className="w-full bg-white px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-700 text-xs focus:outline-none focus:border-teal-500"
                  >
                    <option value="HDFC Bank">HDFC Bank</option>
                    <option value="ICICI Bank">ICICI Bank</option>
                    <option value="State Bank of India">State Bank of India (SBI)</option>
                    <option value="Axis Bank">Axis Bank</option>
                    <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                    <option value="Punjab National Bank">Punjab National Bank</option>
                  </select>
                </div>
              )}

              {paymentMode === 'WALLET' && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <p className="font-bold text-slate-700">Select Wallet:</p>
                  <select
                    value={selectedWallet}
                    onChange={(e) => setSelectedWallet(e.target.value)}
                    className="w-full bg-white px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-700 text-xs focus:outline-none focus:border-teal-500"
                  >
                    <option value="Paytm Wallet">Paytm Wallet</option>
                    <option value="Amazon Pay">Amazon Pay</option>
                    <option value="Mobikwik">Mobikwik</option>
                    <option value="PhonePe Wallet">PhonePe Wallet</option>
                  </select>
                </div>
              )}

              {paymentMode === 'CASH' && (
                <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 text-xs space-y-1">
                  <p className="font-bold text-amber-900 flex items-center gap-1.5"><DollarSign className="w-4 h-4 text-amber-700" /> Pay Directly at Clinic / Hospital</p>
                  <p className="text-amber-700 font-medium">You can pay ₹{payableTotal} in cash or card at the reception counter prior to your consultation.</p>
                </div>
              )}
            </div>

            {/* Bill Breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <SectionTitle icon={Receipt}>Bill &amp; Pricing Breakdown</SectionTitle>
              <div className="space-y-2 text-xs font-semibold text-slate-600">
                <div className="flex justify-between">
                  <span>Doctor Consultation Fee</span>
                  <span className="font-bold text-slate-800">₹{payableTotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>Platform &amp; Convenience Fee</span>
                  <span className="font-bold text-emerald-600"><span className="line-through text-slate-400 mr-1">₹25</span>FREE</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxes &amp; GST</span>
                  <span className="font-bold text-slate-800">Inclusive</span>
                </div>
                <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-sm">
                  <span className="font-black text-slate-900">Total Amount Payable</span>
                  <span className="font-black text-xl text-teal-700">₹{payableTotal}</span>
                </div>
              </div>
            </div>

            {/* Cancellation & Refund Policy before paying */}
            <CancellationRefundPolicy service="doctor" />

            {/* Trust & SSL security badge — SSL is a true, general fact of the site being served
                over HTTPS; no refund-guarantee claim is made since no refund flow exists. */}
            <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400 font-semibold py-2">
              <span className="flex items-center gap-1"><Lock className="w-3.5 h-3.5 text-teal-600" /> 256-bit SSL Encrypted</span>
            </div>
          </div>
        )}

        {/* ===================== PAGE 4: CONFIRMATION ===================== */}
        {page === 'confirmation' && createdBooking && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mx-auto"><CheckCircle2 className="w-9 h-9" /></div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">Appointment Confirmed!</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">Show the booking reference below at the reception. You can print the receipt or add the visit to your calendar.</p>
            </div>
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 text-left space-y-2 text-xs max-w-md mx-auto">
              <div className="flex justify-between border-b border-slate-200/60 pb-2"><span className="text-slate-500">Booking Reference</span><span className="font-mono font-black text-teal-700">{createdBooking.booking_number}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Doctor</span><span className="font-bold text-slate-800">{bookingDoctorName}</span></div>
              {isHospital && selectedBranch && <div className="flex justify-between"><span className="text-slate-500">Branch</span><span className="font-bold text-slate-800">{selectedBranch.name}</span></div>}
              <div className="flex justify-between"><span className="text-slate-500">Date</span><span className="font-bold text-slate-800">{createdBooking.booking_date?.split('T')[0] || selectedDate}</span></div>
              {selectedSlot && <div className="flex justify-between"><span className="text-slate-500">Time Slot</span><span className="font-bold text-slate-800">{formatSlotTime(selectedSlot.start_time)}</span></div>}
              <div className="flex justify-between"><span className="text-slate-500">Patient</span><span className="font-bold text-slate-800">{selectedFamily ? selectedFamily.name : 'Myself'}</span></div>
              <div className="flex justify-between border-t border-slate-200/60 pt-2"><span className="text-slate-500">Payment Mode</span><span className="font-bold text-slate-800">{paymentMode === 'CASH' ? 'Pay at Clinic' : `Online (${paymentMode === 'NETBANKING' ? 'Net Banking' : paymentMode})`}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Amount {paymentMode === 'CASH' ? 'Due' : 'Paid'}</span><span className="font-black text-slate-900 text-sm">₹{Number(createdBooking.total_amount)}</span></div>
              {paymentResult && (
                <>
                  {paymentMode !== 'CASH' && paymentResult.reference_id && (
                    <div className="flex justify-between"><span className="text-slate-500">Transaction Ref (simulated)</span><span className="font-mono font-bold text-slate-700 text-[11px]">{paymentResult.reference_id}</span></div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Payment Status</span>
                    <span className={`font-bold ${paymentMode === 'CASH' || createdBooking.payment_status === 'PENDING' || paymentResult.payment_status === 'PENDING' ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {paymentMode === 'CASH' || createdBooking.payment_status === 'PENDING' || paymentResult.payment_status === 'PENDING' ? 'Pending (Pay at Clinic)' : paidLabel()}
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between"><span className="text-slate-500">Booking Status</span><span className="font-bold text-teal-700">{createdBooking.booking_status || 'CONFIRMED'}</span></div>
            </div>
            {(() => {
              const paidOnline = paymentMode !== 'CASH' && createdBooking.payment_status !== 'PENDING' && paymentResult?.payment_status !== 'PENDING';
              const summary: BookingSummary = {
                reference: createdBooking.booking_number,
                doctor: bookingDoctorName || 'Doctor',
                place: (isHospital && selectedBranch?.name) || selectedSlot?.facility_name || null,
                address: (isHospital && selectedBranch ? [selectedBranch.address_line_1, selectedBranch.area, selectedBranch.city, selectedBranch.pincode].filter(Boolean).join(', ') : selectedSlot?.facility_address) || null,
                date: createdBooking.booking_date?.split('T')[0] || selectedDate,
                time: selectedSlot?.start_time || null,
                patient: selectedFamily ? selectedFamily.name : 'Myself',
                paymentMode: paymentMode === 'CASH' ? 'Pay at clinic' : `Online (${paymentMode === 'NETBANKING' ? 'Net Banking' : paymentMode})`,
                amount: Number(createdBooking.total_amount || 0),
                paid: paidOnline,
              };
              return (
                <div className="flex flex-wrap gap-2 justify-center">
                  <button onClick={() => printBookingReceipt(summary)} className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs">Print receipt</button>
                  <button onClick={() => downloadCalendarEntry(summary)} className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs">Add to calendar</button>
                </div>
              );
            })()}
            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <button onClick={() => navigate('/bookings')} className="px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs">View My Consultations</button>
              <button onClick={() => navigate('/healthcare-services')} className="px-6 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs">Back to Services</button>
            </div>
          </div>
        )}
      </div>

      {/* Sticky confirm/payment CTA bar */}
      {page === 'booking' && doctorChosen && (
        <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200 px-4 py-3">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">{bookingDoctorName}{selectedSlot ? ` · ${formatSlotTime(selectedSlot.start_time)}` : ''}</p>
              <p className="text-[11px] text-slate-500 truncate">
                {selectedDate}{selectedFamily ? ` · for ${selectedFamily.name}` : ' · for Myself'}
                {rawConsultationFee != null ? ` · ₹${rawConsultationFee}` : ''}
              </p>
            </div>
            <button
              onClick={proceedToPayment}
              disabled={!selectedSlot || creatingBooking}
              className={`shrink-0 px-6 py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${selectedSlot && !creatingBooking ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
            >
              {creatingBooking ? (
                <><span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> Booking...</>
              ) : (
                <>Proceed to Payment{rawConsultationFee != null ? ` · ₹${rawConsultationFee}` : ''} <ChevronRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Sticky Pay Now CTA bar on Payment Page */}
      {page === 'payment' && (
        <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200 px-4 py-3">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">Total Amount: <span className="text-teal-700 font-black">₹{payableTotal}</span></p>
              <p className="text-[11px] text-slate-500 truncate">{paymentMode === 'CASH' ? 'Pay at Clinic on visit' : `Method: ${paymentMode === 'NETBANKING' ? 'Net Banking' : paymentMode}`}</p>
            </div>
            <button
              onClick={submitPayment}
              disabled={isProcessingPayment}
              className={`shrink-0 px-7 py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${!isProcessingPayment ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-md' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}
            >
              {isProcessingPayment ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing Payment...
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  {paymentMode === 'CASH' ? `Confirm & Pay ₹${payableTotal} at Clinic` : paymentResult && !paymentResult.success ? `Try Again · Pay ₹${payableTotal}` : `Pay ₹${payableTotal} & Confirm`}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Department pictures we reviewed as on-subject (others show none rather than a wrong scene).
const DEPT_PHOTOS: [RegExp, string][] = [[/cardio|heart/i, 'cardiology'], [/dent/i, 'dentistry'], [/emergenc|casualty/i, 'emergency'], [/\bent\b|ear|nose|throat|otorhino/i, 'ent'], [/gastro/i, 'gastroenterology'], [/general medicine|internal/i, 'general-medicine'], [/gyn|obstet/i, 'gynecology'], [/nephro|kidney/i, 'nephrology'], [/onco|cancer/i, 'oncology'], [/ophthal|eye/i, 'ophthalmology'], [/ortho|bone/i, 'orthopedics'], [/pulmo|chest|respir/i, 'pulmonology']];
const deptPhoto = (name: string): string | null => { const m = DEPT_PHOTOS.find(([r]) => r.test(name)); return m ? `/images/healthcare/departments/${m[1]}.webp` : null; };
