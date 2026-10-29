import ThemedSelect from '../../components/forms/ThemedSelect';
import { useRef, type ReactNode } from 'react';
import {
  FlaskConical,
  Building2,
  CalendarDays,
  UserRound,
  ClipboardList,
  Pencil,
  MapPin,
  Clock,
  Calendar,
  Home,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  FileText,
  Phone,
  Mail,
  User,
  AlertCircle,
  RefreshCw,
  Info,
  ArrowRight,
} from 'lucide-react';
import type { LabHit, LabTestDef } from '../../../services/labHelper';
import { rupees } from '../../../services/labHelper';
import type { PatientFamilyMember } from '../../../services/familyHelper';
import { ageLabelFromDob } from '../../../services/familyHelper';
import { TestPaymentNote } from '../../../config/payments';
import { appointmentLabel, preparationText } from './labScheduleDetails';
import { validPin } from './labComparisonDetails';
import {
  appointmentRange,
  relativeAppointmentDay,
  reviewButtonLabel,
  reviewPaymentOptions,
  validReviewPrice,
  type LabVisitType,
} from './labReviewDetails';
import './LabReview.css';

export type ReviewPatient = {
  name?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  age?: number | null;
  phone?: string | null;
  email?: string | null;
};

export type LabReviewProps = {
  reason?: string;
  packageSaving?: number;
  lab: LabHit;
  centreId: number | null;
  items: { code: string; name: string; price?: number }[];
  preparationTests: Pick<LabTestDef, 'code' | 'name' | 'fasting_hours' | 'patient_instructions'>[];
  date: string;
  time: string;
  slotMinutes?: number;
  visit: LabVisitType;
  address: string;
  patient: ReviewPatient | null;
  patientLoading: boolean;
  patientError: string | null;
  onRetryPatient: () => void;
  family: PatientFamilyMember[];
  defaultPatientLabel?: string;
  forWho: string;
  onPatient: (id: string) => void;
  testsTotal?: number;
  homeFee?: number;
  total?: number;
  pay: 'UPI' | 'CASH';
  onPay: (pay: 'UPI' | 'CASH') => void;
  upi: string;
  onUpi: (value: string) => void;
  onEdit: (step: number) => void;
  onBook: () => void;
  disabledReason: string | null;
  busy: boolean;
  error: string | null;
};

/** Shared note keeps its existing simulation configuration, but can never render in a production build. */
export function LabReviewPaymentNote() {
  return import.meta.env.PROD ? null : <TestPaymentNote />;
}

export default function LabReview(p: LabReviewProps) {
  const centre = p.lab.locations.find((c) => c.id === p.centreId);
  const patientSelect = useRef<HTMLSelectElement>(null);
  const prep = p.preparationTests.filter((t) => preparationText(t));
  const age = p.patient?.dateOfBirth
    ? ageLabelFromDob(p.patient.dateOfBirth)
    : p.patient?.age != null
    ? `${p.patient.age} years`
    : null;
  const tag = relativeAppointmentDay(p.date);

  const heroLogo = p.lab.logo_url || p.lab.cover_url || p.lab.gallery?.[0]?.url;

  const button = (
    <button
      type="button"
      className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-sm hover:shadow transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      disabled={!!p.disabledReason || p.busy}
      onClick={p.onBook}
    >
      <span>{reviewButtonLabel(p.pay, p.visit, p.total, p.busy)}</span>
      <ArrowRight className="w-4 h-4" />
    </button>
  );

  const sectionHeader = (title: string, icon: ReactNode, edit: () => void, label: string) => (
    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
      <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
        {icon}
        <span>{title}</span>
      </h3>
      <button
        type="button"
        disabled={p.busy}
        onClick={edit}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition cursor-pointer"
      >
        <Pencil className="w-3 h-3 text-slate-500" />
        <span>{label}</span>
      </button>
    </div>
  );

  return (
    <section className="w-full grid lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start" aria-label="Booking review" aria-busy={p.busy}>
      {/* LEFT COLUMN: Review Cards */}
      <div className="min-w-0 space-y-4">
        {/* 1. Selected tests */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3" aria-label="Selected tests">
          {sectionHeader('1. Selected tests', <FlaskConical className="w-4 h-4 text-orange-600" />, () => p.onEdit(1), 'Edit tests')}
          <ul className="space-y-2">
            {p.items.map((t) => (
              <li
                key={t.code}
                className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-semibold"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-teal-500 shrink-0" />
                  <strong className="text-slate-900 font-bold truncate">{t.name}</strong>
                </div>
                {validReviewPrice(t.price) && (
                  <strong className="text-slate-900 font-extrabold shrink-0 text-sm">{rupees(t.price)}</strong>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* 2. Diagnostic centre */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3" aria-label="Diagnostic centre">
          {sectionHeader('2. Diagnostic centre', <Building2 className="w-4 h-4 text-orange-600" />, () => p.onEdit(2), 'Edit lab')}
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
              <h4 className="text-base font-extrabold text-slate-900">{p.lab.name}</h4>
              {centre && (
                <p className="text-xs text-slate-600 flex items-start gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <span>{[centre.name, centre.address, centre.city, centre.pincode].filter(Boolean).join(', ')}</span>
                </p>
              )}
              {p.lab.registration_number && (
                <span className="inline-block text-[11px] font-semibold text-slate-500">
                  Reg. no. {p.lab.registration_number}
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
        </section>

        {/* 3. Appointment */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3" aria-label="Appointment">
          {sectionHeader('3. Appointment', <CalendarDays className="w-4 h-4 text-orange-600" />, () => p.onEdit(3), 'Edit appointment')}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* Date Tile */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-teal-600" /> Date
              </span>
              <div className="flex items-center gap-2">
                <strong className="text-xs font-bold text-slate-900 block">
                  {p.date ? appointmentLabel(p.date) : '—'}
                </strong>
                {tag && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                    {tag}
                  </span>
                )}
              </div>
            </div>

            {/* Time Slot Tile */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-teal-600" /> Time Slot
              </span>
              <strong className="text-xs font-bold text-slate-900 block">
                {p.time ? appointmentRange(p.time, p.slotMinutes) : '—'}
              </strong>
            </div>

            {/* Collection Mode Tile */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                {p.visit === 'HOME' ? <Home className="w-3 h-3 text-teal-600" /> : <Building2 className="w-3 h-3 text-blue-600" />} Mode
              </span>
              <strong className="text-xs font-bold text-slate-900 block">
                {p.visit === 'HOME' ? 'Home collection' : 'Visit centre'}
              </strong>
              {p.visit === 'HOME' && p.address && (
                <p className="text-[11px] text-slate-500 truncate" title={p.address}>{p.address}</p>
              )}
            </div>
          </div>
        </section>

        {/* 4. Patient details */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3" aria-label="Patient details">
          {sectionHeader('4. Patient', <UserRound className="w-4 h-4 text-orange-600" />, () => p.onEdit(4), 'Edit patient')}

          <div className="space-y-3 pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" /> Who is this test for?
              </label>
              <div className="w-full sm:w-64">
                <ThemedSelect
                  variant="menu"
                  ref={patientSelect}
                  value={p.forWho}
                  disabled={p.busy}
                  onChange={(e) => p.onPatient(e.target.value)}
                >
                  <option value="">{p.defaultPatientLabel || 'Self (Primary Account)'}</option>
                  {p.forWho && !p.family.some((f) => String(f.memberUserId) === p.forWho) && p.patient?.name && (
                    <option value={p.forWho}>{p.patient.name}</option>
                  )}
                  {p.family.map((f) => (
                    <option key={f.memberUserId} value={String(f.memberUserId)}>
                      {[f.name, f.relationship].filter(Boolean).join(' · ')}
                    </option>
                  ))}
                </ThemedSelect>
              </div>
            </div>

            {p.patientLoading ? (
              <p role="status" className="text-xs text-slate-500">Loading patient details…</p>
            ) : p.patientError ? (
              <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between">
                <span>{p.patientError}</span>
                <button type="button" onClick={p.onRetryPatient} className="font-bold underline">
                  Retry
                </button>
              </div>
            ) : p.patient ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase block">Name</span>
                  <strong className="text-sm font-bold text-slate-900 block truncate">{p.patient.name || '—'}</strong>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase block">Age / Gender</span>
                  <strong className="text-xs font-bold text-slate-900 block truncate">
                    {[p.patient.gender, age].filter(Boolean).join(' · ') || '—'}
                  </strong>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase block">Contact Number</span>
                  <strong className="text-xs font-bold text-slate-900 block truncate">{p.patient.phone || '—'}</strong>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase block">Email Address</span>
                  <strong className="text-xs font-bold text-slate-900 block truncate">{p.patient.email || '—'}</strong>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {/* 5. Clinical Reason / Notes (if entered) */}
        {p.reason && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" /> Reason for test
            </h3>
            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200/80">{p.reason}</p>
          </section>
        )}

        {/* 6. Test preparation instructions (if any) */}
        {prep.length > 0 && (
          <section className="rounded-2xl border border-teal-200 bg-teal-50/40 p-5 shadow-xs space-y-3" aria-label="Test preparation">
            {sectionHeader('5. Test preparation instructions', <ClipboardList className="w-4 h-4 text-teal-700" />, () => p.onEdit(1), 'Edit tests')}
            <div className="space-y-2 pt-1">
              {prep.map((t) => (
                <div key={t.code} className="p-3 rounded-xl bg-white/90 border border-teal-100 text-xs">
                  <strong className="font-bold text-slate-900 block mb-0.5">{t.name}</strong>
                  <p className="text-slate-600">{preparationText(t)}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* RIGHT COLUMN: Sticky Price & Payment Sidebar */}
      <aside className="space-y-4 sticky top-6" aria-label="Booking price and payment">
        {/* Price summary card */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-teal-600" /> Price summary
          </h3>

          {p.packageSaving != null && p.packageSaving > 0 && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-1.5">
              <span>Package saving: <strong>{rupees(p.packageSaving)}</strong> compared to individual tests.</span>
            </div>
          )}

          <ul className="space-y-1.5 text-xs text-slate-600 pt-1">
            {p.items.map((t) => (
              <li key={t.code} className="flex justify-between items-center gap-2">
                <span className="truncate">{t.name}</span>
                {validReviewPrice(t.price) && (
                  <strong className="font-bold text-slate-900 shrink-0">{rupees(t.price)}</strong>
                )}
              </li>
            ))}
          </ul>

          <div className="pt-2 border-t border-slate-100 space-y-1 text-xs">
            {validReviewPrice(p.testsTotal) && (
              <div className="flex justify-between text-slate-600">
                <span>Tests total</span>
                <strong className="font-bold text-slate-900">{rupees(p.testsTotal)}</strong>
              </div>
            )}
            {p.visit === 'HOME' && validReviewPrice(p.homeFee) && (
              <div className="flex justify-between text-slate-600">
                <span>Home collection fee</span>
                <strong className="font-bold text-slate-900">{rupees(p.homeFee)}</strong>
              </div>
            )}
          </div>

          {/* Total Payable Box */}
          {validReviewPrice(p.total) && (
            <div className="flex justify-between items-center p-3.5 rounded-xl bg-slate-900 text-white mt-2">
              <div>
                <span className="text-xs font-bold text-slate-200 block">Total payable</span>
                <span className="text-[10px] text-slate-400">Inclusive of all taxes</span>
              </div>
              <strong className="text-2xl font-black text-white">{rupees(p.total)}</strong>
            </div>
          )}
        </section>

        {/* Payment method card */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-slate-700" /> Payment method
          </h3>

          <fieldset className="space-y-2.5 pt-1" disabled={p.busy}>
            <legend className="sr-only">Payment method</legend>
            {reviewPaymentOptions(p.visit).map((option) => {
              const checked = p.pay === option.value;
              return (
                <label
                  key={option.value}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition ${
                    checked
                      ? 'border-orange-500 bg-orange-50/40 text-slate-900 shadow-xs ring-2 ring-orange-500/10'
                      : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="lab-review-payment"
                    checked={checked}
                    onChange={() => p.onPay(option.value)}
                    className="mt-1 accent-orange-600 shrink-0"
                  />
                  <div className="min-w-0">
                    <strong className="text-xs font-bold block">
                      {option.value === 'UPI' ? 'Pay online securely' : option.label}
                    </strong>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      {option.value === 'UPI'
                        ? 'UPI, Credit/Debit cards, Net Banking & Wallets'
                        : option.label === 'Pay the collector'
                        ? 'Pay via cash or UPI to sample collector'
                        : 'Pay at the diagnostic centre desk'}
                    </span>
                  </div>
                </label>
              );
            })}
          </fieldset>

          {p.pay === 'UPI' && (
            <div className="space-y-2 pt-1">
              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                256-bit encrypted Razorpay payment gateway
              </p>
              <LabReviewPaymentNote />
            </div>
          )}

          {p.error && (
            <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-semibold">
              {p.error}
            </div>
          )}

          {p.disabledReason && (
            <p id="lab-review-validation" role="status" className="text-xs text-amber-700 font-medium">
              {p.disabledReason}
            </p>
          )}

          <div className="pt-2">{button}</div>
        </section>

        {/* Cancellation & Refund Policy Card */}
        <section className="rounded-2xl border border-amber-200/70 bg-amber-50/40 p-4 space-y-1.5 text-xs">
          <h4 className="font-bold text-amber-950 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-amber-700" /> Cancellation & refund policy
          </h4>
          <p className="text-slate-600 leading-relaxed text-[11px]">
            Cancel free of charge any time before your sample is collected. Online payments held by VIZITO are automatically refunded to your original source. You can reschedule your booking up to 2 times.
          </p>
        </section>
      </aside>

      {/* MOBILE BAR */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 p-3 flex items-center justify-between gap-3 shadow-lg"
        role="region"
        aria-label="Confirm booking"
      >
        <div className="min-w-0">
          {validReviewPrice(p.total) && (
            <>
              <span className="text-[11px] text-slate-500 block">Total payable</span>
              <strong className="text-base font-black text-slate-900">{rupees(p.total)}</strong>
            </>
          )}
          {p.disabledReason && <small className="text-[10px] text-rose-600 truncate block">{p.disabledReason}</small>}
        </div>
        <div className="shrink-0">{button}</div>
      </div>
    </section>
  );
}
