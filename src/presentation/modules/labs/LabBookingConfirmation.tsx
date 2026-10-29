import { SuccessCheck, Toast } from '../../components/motion/Motion';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Copy,
  CalendarDays,
  Download,
  FlaskConical,
  Building2,
  UserRound,
  Headphones,
  Info,
  XCircle,
  MapPin,
  Clock,
  Calendar,
  Home,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
  Check,
} from 'lucide-react';
import {
  myLabOrderApi,
  labPublicApi,
  findLabsApi,
  labAvailabilityApi,
  labReceiptApi,
  labError,
  rupees,
  type LabConfirmationOrder,
  type LabPublic,
  type LabHit,
} from '../../../services/labHelper';
import { getPatientProfileApi, type PatientProfileData } from '../../../services/patientHelper';
import { getFamilyMembersApi, ageLabelFromDob, type PatientFamilyMember } from '../../../services/familyHelper';
import { useSearchArea, nearest } from '../../../services/location';
import { comparisonDistance, validPin } from './labComparisonDetails';
import { appointmentLabel, preparationText } from './labScheduleDetails';
import { appointmentRange, relativeAppointmentDay, validReviewPrice } from './labReviewDetails';
import {
  bookedOn,
  buildLabIcs,
  calendarDates,
  confirmationPayment,
  confirmationPerson,
  confirmationTimeline,
  googleCalendarUrl,
  receiptFilename,
  labDocumentLabel,
  saveLabDocumentFile as saveConfirmationFile,
  type CalendarBooking,
} from './labConfirmationDetails';
import './LabBookingConfirmation.css';

export { saveLabDocumentFile as saveConfirmationFile } from './labConfirmationDetails';
export function ConfirmationVisitCode({ code }: { code?: string | null }) {
  return code ? (
    <section className="rounded-2xl border border-teal-300 bg-teal-50/50 p-5 mb-5 text-center space-y-1 shadow-xs" aria-label="Home visit code">
      <h3 className="text-xs font-bold text-teal-800 uppercase tracking-wider">Home Visit Code</h3>
      <strong className="text-3xl font-black text-teal-950 tracking-widest block">{code}</strong>
      <p className="text-xs text-teal-700">Give this code only to the collector when they arrive.</p>
    </section>
  ) : null;
}

export default function LabBookingConfirmation() {
  const { orderId } = useParams();
  const [order, setOrder] = useState<LabConfirmationOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [lab, setLab] = useState<LabPublic | null>(null);
  const [rating, setRating] = useState<LabHit['rating']>();
  const [minutes, setMinutes] = useState<number>();
  const [profile, setProfile] = useState<PatientProfileData | null>(null);
  const [family, setFamily] = useState<PatientFamilyMember[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [receiptBusy, setReceiptBusy] = useState(false);
  const area = useSearchArea();

  useEffect(() => {
    let active = true;
    setLoading(true);
    setOrder(null);
    setError(null);
    setLab(null);
    setRating(undefined);
    setMinutes(undefined);
    setProfile(null);
    setFamily([]);

    myLabOrderApi(orderId || '')
      .then(async (value: LabConfirmationOrder) => {
        if (!active) return;
        setOrder(value);
        setLoading(false);
        const jobs: Promise<unknown>[] = [
          getPatientProfileApi().then(async (p) => {
            if (!active) return;
            setProfile(p);
            if (p?.userId) {
              const members = await getFamilyMembersApi(p.userId);
              if (active) setFamily(members);
            }
          }),
        ];
        if (value.lab_partner_id) {
          jobs.push(
            labPublicApi(value.lab_partner_id).then((l) => {
              if (active) setLab(l);
            })
          );
          const codes = Array.from(new Set(value.items.map((i) => i.test_code).filter(Boolean)));
          if (codes.length) {
            jobs.push(
              findLabsApi(codes).then((labs) => {
                if (active) setRating(labs.find((l) => l.id === value.lab_partner_id)?.rating);
              })
            );
          }
        }
        if (
          value.lab_partner_id &&
          value.location_id &&
          (value.visit_type !== 'HOME' || value.home_pincode)
        ) {
          jobs.push(
            labAvailabilityApi({
              lab_partner_id: value.lab_partner_id,
              location_id: value.location_id,
              visit_type: value.visit_type === 'HOME' ? 'HOME' : 'LAB_VISIT',
              ...(value.visit_type === 'HOME' ? { pincode: value.home_pincode! } : {}),
            }).then((a) => {
              if (active) setMinutes(a.slot_minutes);
            })
          );
        }
        await Promise.allSettled(jobs);
      })
      .catch((e) => {
        if (active) {
          setError(
            [403, 404].includes(e?.response?.status)
              ? 'Booking not found'
              : labError(e, 'Could not load this booking. Please retry.')
          );
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [orderId, retry]);

  if (loading) {
    return (
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-16 text-center space-y-3 shadow-xs" role="status">
        <div className="w-10 h-10 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-bold text-slate-700">Loading your booking details…</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <section className="w-full max-w-xl mx-auto rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center space-y-4" role="alert">
        <XCircle className="w-12 h-12 text-rose-600 mx-auto" />
        <h1 className="text-lg font-black text-rose-900">{error || 'Booking not found'}</h1>
        <div className="flex justify-center gap-3">
          {error !== 'Booking not found' && (
            <button
              type="button"
              onClick={() => setRetry((n) => n + 1)}
              className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs"
            >
              Retry
            </button>
          )}
          <Link to="/lab-bookings" className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-xs">
            My lab bookings
          </Link>
        </div>
      </section>
    );
  }

  const home = order.visit_type === 'HOME';
  const cancelled = order.status === 'CANCELLED';
  const items = order.items.filter((i) => i.status !== 'CANCELLED' || cancelled);
  const prep = (code: string) => {
    const specific = lab?.tests?.find((t) => t.code === code);
    return specific
      ? preparationText({ patient_instructions: specific.instructions, fasting_hours: specific.fasting_hours })
      : null;
  };
  const centre = lab?.locations.find((c) => Number(c.id) === Number(order.location_id));
  const saved = profile?.addresses.find((a) => a.isDefault) || profile?.addresses[0];
  const pin =
    saved?.latitude != null && saved?.longitude != null
      ? { lat: Number(saved.latitude), lng: Number(saved.longitude) }
      : null;
  const distance = centre && nearest(validPin(area) ? area : validPin(pin) ? pin : null, [centre].filter((c) => validPin(c.pin)));
  const person = confirmationPerson(order, profile, family);
  const age = person.dob ? ageLabelFromDob(person.dob) : null;
  const location = home
    ? [order.home_address, order.home_pincode].filter(Boolean).join(', ')
    : [order.location_name, order.location_address].filter(Boolean).join(', ');
  const payment = confirmationPayment(order);
  const date = order.visit_date?.slice(0, 10);
  const tag = date ? relativeAppointmentDay(date) : null;
  const testsTotal =
    items.length && items.every((i) => validReviewPrice(i.price))
      ? Math.round(items.reduce((sum, i) => sum + i.price, 0) * 100) / 100
      : null;
  const calendar: CalendarBooking | null =
    date && order.visit_time && minutes
      ? {
          id: order.id,
          date,
          time: order.visit_time,
          minutes,
          lab: order.lab_name,
          address: location,
          number: order.order_number,
        }
      : null;

  let calendarReady = false;
  if (calendar) {
    try {
      calendarDates(calendar);
      calendarReady = true;
    } catch {
      /* omit incomplete calendar data */
    }
  }

  const copy = async () => {
    setActionError(null);
    try {
      await navigator.clipboard.writeText(order.order_number);
      setToast('Booking ID copied');
    } catch {
      setActionError('Could not copy the booking ID. You can select and copy it directly.');
    }
  };

  const receipt = async () => {
    if (receiptBusy) return;
    setReceiptBusy(true);
    setActionError(null);
    try {
      const file = await labReceiptApi(order.id);
      saveConfirmationFile(file.blob, receiptFilename(file.disposition, order.order_number, order.payment_status));
    } catch {
      setActionError(
        `Could not download the ${
          labDocumentLabel(order.payment_status) === 'Download receipt' ? 'receipt' : 'booking slip'
        }. Please try again.`
      );
    } finally {
      setReceiptBusy(false);
    }
  };

  const heroLogo = lab?.logo_url;

  return (
    <div className="w-full space-y-6 pb-12">
      {/* 1. HERO CONFIRMATION BANNER */}
      <header
        className={`rounded-2xl border p-6 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 ${
          cancelled
            ? 'border-rose-200 bg-rose-50/70'
            : 'border-emerald-200 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/50'
        }`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
              cancelled ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
            }`}
          >
            {cancelled ? <XCircle className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
          </div>
          <div className="space-y-1 min-w-0">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {cancelled ? 'Booking cancelled' : home ? 'Home collection booked!' : 'Lab booking confirmed!'}
            </h1>
            {!cancelled && (
              <p className="text-sm font-bold text-emerald-800">Your appointment has been booked successfully.</p>
            )}
            <p className="text-xs text-slate-500">Your confirmation is saved in Notifications and My lab bookings.</p>
          </div>
        </div>

        {/* Reference block */}
        <div className="md:border-l md:border-slate-200 md:pl-6 space-y-3 shrink-0">
          {order.order_number && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Booking ID
              </span>
              <div className="flex items-center gap-2">
                <strong className="text-base font-extrabold text-slate-900 tracking-wide font-mono">
                  {order.order_number}
                </strong>
                <button
                  type="button"
                  aria-label="Copy booking ID"
                  onClick={() => void copy()}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition cursor-pointer shadow-2xs"
                >
                  {toast === 'Booking ID copied' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
          {bookedOn(order.created_at) && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Booked on
              </span>
              <p className="text-xs font-semibold text-slate-600">{bookedOn(order.created_at)} (IST)</p>
            </div>
          )}
        </div>
      </header>

      {home && <ConfirmationVisitCode code={order.home_visit_code} />}

      {/* 2. MAIN TWO-COLUMN CONTENT */}
      <div className="w-full grid lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
        {/* LEFT COLUMN: Details Cards */}
        <div className="min-w-0 space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-5">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
              <FlaskConical className="w-4 h-4 text-orange-600" /> Booking details
            </h2>

            {/* A. Tests Booked */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <FlaskConical className="w-3.5 h-3.5 text-teal-600" /> Tests booked
              </h3>
              <ul className="space-y-2">
                {items.map((item, i) => (
                  <li
                    key={`${item.test_code}-${i}`}
                    className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-semibold"
                  >
                    <div>
                      <strong className="text-slate-900 font-bold block">{item.test_name}</strong>
                      {prep(item.test_code) && (
                        <p className="text-[11px] text-slate-500 mt-0.5">{prep(item.test_code)}</p>
                      )}
                    </div>
                    {validReviewPrice(item.price) && (
                      <strong className="text-slate-900 font-extrabold shrink-0 text-sm">{rupees(item.price)}</strong>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* B. Diagnostic Centre */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-teal-600" /> Diagnostic centre
              </h3>
              <div className="flex items-start gap-3.5 pt-1">
                <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                  {heroLogo ? (
                    <img src={heroLogo} alt="" className="w-full h-full object-contain p-1" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center text-teal-600">
                      <Building2 className="w-6 h-6" />
                    </div>
                  )}
                </div>
                <div className="space-y-1 min-w-0">
                  {order.lab_name && <h4 className="text-base font-extrabold text-slate-900">{order.lab_name}</h4>}
                  {rating && rating.count > 0 && Number.isFinite(rating.average) && (
                    <p className="text-xs font-bold text-amber-900">
                      ★ {rating.average} ({rating.count} reviews)
                    </p>
                  )}
                  {(order.location_name || order.location_address) && (
                    <p className="text-xs text-slate-600 flex items-start gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <span>
                        {[order.location_name, order.location_address].filter(Boolean).join(', ')}
                        {distance && ` · ${comparisonDistance(distance.metres)} away`}
                      </span>
                    </p>
                  )}
                  {lab?.registration_number && (
                    <span className="inline-block text-[11px] font-semibold text-slate-500">
                      Reg. no. {lab.registration_number}
                    </span>
                  )}
                  {validPin(centre?.pin) && (
                    <div>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${centre.pin.lat},${centre.pin.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800 hover:underline mt-0.5"
                      >
                        <ExternalLink className="w-3 h-3" /> View on Google Maps
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* C. Appointment */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-teal-600" /> Appointment
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-teal-600" /> Date & Time
                  </span>
                  <div className="flex items-center gap-2">
                    <strong className="text-xs font-bold text-slate-900">
                      {date ? appointmentLabel(date) : '—'}
                    </strong>
                    {tag && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                        {tag}
                      </span>
                    )}
                  </div>
                  {order.visit_time && (
                    <p className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {appointmentRange(order.visit_time, minutes)}
                    </p>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    {home ? <Home className="w-3 h-3 text-teal-600" /> : <Building2 className="w-3 h-3 text-blue-600" />}{' '}
                    Collection Mode
                  </span>
                  <strong className="text-xs font-bold text-slate-900 block">
                    {home ? 'Home collection' : 'Visit centre'}
                  </strong>
                  {home && location && (
                    <p className="text-[11px] text-slate-500 truncate" title={location}>
                      {location}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* D. Patient */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <UserRound className="w-3.5 h-3.5 text-teal-600" /> Patient details
              </h3>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase block">Name</span>
                  <strong className="text-sm font-bold text-slate-900 block truncate">{person.name || '—'}</strong>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase block">Age / Gender</span>
                  <strong className="text-xs font-bold text-slate-900 block truncate">
                    {[person.gender, age].filter(Boolean).join(' · ') || '—'}
                  </strong>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase block">Contact Number</span>
                  <strong className="text-xs font-bold text-slate-900 block truncate">{person.phone || '—'}</strong>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase block">Email Address</span>
                  <strong className="text-xs font-bold text-slate-900 block truncate">{person.email || '—'}</strong>
                </div>
              </div>
            </div>
          </section>

          {/* Important instructions Card */}
          <section className="rounded-2xl border border-teal-200 bg-teal-50/40 p-5 shadow-xs space-y-2" aria-label="Important instructions">
            <h2 className="text-sm font-extrabold text-teal-900 flex items-center gap-2">
              <Info className="w-4 h-4 text-teal-700" /> Important instructions
            </h2>
            <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 pt-1">
              {!home && <li>Arrive 10–15 minutes early at the collection centre.</li>}
              <li>Carry a valid government-issued photo ID.</li>
              {items.some((i) => prep(i.test_code)) && <li>Follow the preparation and fasting instructions listed above.</li>}
              {validPin(centre?.pin) && <li>Check the lab location on the map prior to travel.</li>}
            </ul>
          </section>
        </div>

        {/* RIGHT COLUMN: Sidebar (Price & Next steps) */}
        <aside className="space-y-4 sticky top-6">
          {/* Price summary */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-teal-600" /> Price summary
            </h2>
            <ul className="space-y-1.5 text-xs text-slate-600 pt-1">
              {items.map((item, i) => (
                <li key={`${item.test_code}-${i}`} className="flex justify-between items-center gap-2">
                  <span className="truncate">{item.test_name}</span>
                  {validReviewPrice(item.price) && (
                    <strong className="font-bold text-slate-900 shrink-0">{rupees(item.price)}</strong>
                  )}
                </li>
              ))}
            </ul>
            <div className="pt-2 border-t border-slate-100 space-y-1 text-xs">
              {testsTotal !== null && (
                <div className="flex justify-between text-slate-600">
                  <span>Tests total ({items.length} {items.length === 1 ? 'test' : 'tests'})</span>
                  <strong className="font-bold text-slate-900">{rupees(testsTotal)}</strong>
                </div>
              )}
              {home && validReviewPrice(order.home_fee) && (
                <div className="flex justify-between text-slate-600">
                  <span>Home collection fee</span>
                  <strong className="font-bold text-slate-900">{rupees(order.home_fee)}</strong>
                </div>
              )}
            </div>

            {/* Total Paid / Payable Card */}
            <div className="flex justify-between items-center p-3.5 rounded-xl bg-slate-900 text-white mt-2">
              <div>
                <span className="text-xs font-bold text-slate-200 block">{payment.totalLabel}</span>
                {payment.label && (
                  <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 mt-0.5">
                    {payment.label}
                  </span>
                )}
              </div>
              {validReviewPrice(order.total_amount) && (
                <strong className="text-2xl font-black text-white">{rupees(order.total_amount)}</strong>
              )}
            </div>
          </section>

          {/* What happens next? & CTAs */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-extrabold text-slate-900">What happens next?</h2>
            {!cancelled && (
              <ol className="space-y-3 relative border-l border-slate-200 ml-2 pl-4 text-xs text-slate-600">
                {confirmationTimeline(home, order.fasting_hours > 0, date).map((text, idx) => (
                  <li key={text} className="relative">
                    <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-teal-600 ring-4 ring-white" />
                    <span>{text}</span>
                  </li>
                ))}
              </ol>
            )}

            <div className="space-y-2 pt-2 border-t border-slate-100">
              <Link
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-sm hover:shadow transition"
                to="/bookings"
              >
                <span>View in my bookings</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <div className="grid grid-cols-2 gap-2">
                {calendar && calendarReady && !cancelled && (
                  <details className="relative">
                    <summary className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer transition">
                      <CalendarDays className="w-3.5 h-3.5 text-slate-500" />
                      <span>Calendar</span>
                    </summary>
                    <div className="absolute left-0 bottom-full mb-1 w-40 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 z-20 space-y-1">
                      <button
                        type="button"
                        onClick={() =>
                          saveConfirmationFile(
                            new Blob([buildLabIcs(calendar)], { type: 'text/calendar;charset=utf-8' }),
                            `VIZITO-${order.order_number || order.id}.ics`
                          )
                        }
                        className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-50 text-xs font-medium text-slate-700"
                      >
                        Download .ics
                      </button>
                      <a
                        href={googleCalendarUrl(calendar)}
                        target="_blank"
                        rel="noreferrer"
                        className="block px-2 py-1.5 rounded-lg hover:bg-slate-50 text-xs font-medium text-slate-700"
                      >
                        Google Calendar
                      </a>
                    </div>
                  </details>
                )}
                <button
                  type="button"
                  disabled={receiptBusy}
                  onClick={() => void receipt()}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>{receiptBusy ? 'Downloading…' : labDocumentLabel(order.payment_status)}</span>
                </button>
              </div>

              <Link
                to="/lab-tests"
                className="block text-center text-xs font-bold text-orange-600 hover:text-orange-700 pt-1"
              >
                Book more tests →
              </Link>
            </div>

            {actionError && <p role="alert" className="text-xs text-rose-700 font-semibold">{actionError}</p>}
          </section>

          {/* Need help? card */}
          <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-1">
            <h2 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Headphones className="w-3.5 h-3.5 text-slate-500" /> Need help?
            </h2>
            <p className="text-[11px] text-slate-500">Have questions about your sample collection or report?</p>
            <Link to="/help" className="inline-block text-xs font-bold text-teal-700 hover:text-teal-800 underline pt-0.5">
              Contact support →
            </Link>
          </section>
        </aside>
      </div>

      {toast && <Toast onClose={() => setToast(null)}>{toast}</Toast>}
    </div>
  );
}
