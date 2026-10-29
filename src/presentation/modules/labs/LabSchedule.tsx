import ThemedSelect from '../../components/forms/ThemedSelect';
import { homeCovers } from './labFlowDetails';
import LabTimeSlotOptions from './LabTimeSlotOptions';
import { useEffect, useState, type ReactNode } from 'react';
import {
  FlaskConical,
  ChevronLeft,
  ChevronRight,
  MapPin,
  ExternalLink,
  Pencil,
  Building2,
  Home,
  Clock,
  Calendar,
  CheckCircle2,
  FileText,
  AlertCircle,
  RefreshCw,
  Info,
} from 'lucide-react';
import { rupees, type LabHit, type LabAvailability, type LabTestDef } from '../../../services/labHelper';
import { nearest, useSearchArea, type LatLng } from '../../../services/location';
import { comparisonDistance, centreLocality, validPin } from './labComparisonDetails';
import {
  appointmentLabel,
  calendarCells,
  dayAvailable,
  istToday,
  preparationText,
  slotLabel,
  validHomePin,
} from './labScheduleDetails';
import './LabSchedule.css';

type Props = {
  collectionOnly?: boolean;
  scheduleOnly?: boolean;
  notes?: string;
  onNotes?: (value: string) => void;
  nextLabel?: string;
  lab: LabHit;
  centreId: number | null;
  onCentre: (id: number) => void;
  mode: 'LAB_VISIT' | 'HOME';
  onMode: (mode: 'LAB_VISIT' | 'HOME') => void;
  tests: Pick<LabTestDef, 'code' | 'name' | 'patient_instructions' | 'fasting_hours'>[];
  date: string;
  time: string;
  onDate: (date: string) => void;
  onTime: (time: string) => void;
  onChangeLab: () => void;
  onContinue: () => void;
  availability: LabAvailability | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  notice?: string | null;
  address: string;
  pincode: string;
  addressReady: boolean;
  addressFields: ReactNode;
  savedLocation?: LatLng | null;
  testsTotal?: number;
  total?: number;
  busy: boolean;
};

const money = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

export default function LabSchedule(p: Props) {
  const { lab, date, time, availability, loading, error, mode } = p;
  const days = availability?.days || [];
  const months = Array.from(new Set(days.map((d) => d.date.slice(0, 7))));
  const [month, setMonth] = useState(date.slice(0, 7) || istToday().slice(0, 7));

  useEffect(() => {
    if (date) setMonth(date.slice(0, 7));
  }, [date]);

  useEffect(() => {
    if (months.length && !months.includes(month)) setMonth(months[0]);
  }, [months, month]);

  const index = months.indexOf(month);
  const day = days.find((d) => d.date === date);
  const valid =
    !!availability?.bookable &&
    !!day?.slots.some((s) => s.time === time && s.available) &&
    p.addressReady &&
    !loading &&
    !error &&
    !p.busy;

  const why = loading
    ? 'Checking available times…'
    : error
    ? 'Retry availability before continuing.'
    : mode === 'HOME' && !validHomePin(p.pincode)
    ? 'Enter a 6-digit PIN to check home collection.'
    : !availability?.bookable
    ? 'Choose a supported collection option.'
    : !time
    ? 'Choose an available time to continue.'
    : !p.addressReady
    ? 'Complete your collection address to continue.'
    : p.busy
    ? 'Please wait while your booking is being processed.'
    : null;

  const centre = lab.locations.find((c) => c.id === p.centreId);
  const area = useSearchArea();
  const origin = area || p.savedLocation;
  const distance =
    centre && nearest(validPin(origin) ? origin : null, [centre].filter((c) => validPin(c.pin)));
  const preparation = p.tests.filter((t) => preparationText(t));
  const canContinue = p.collectionOnly
    ? p.addressReady && !loading && !error && !!availability?.bookable
    : valid;

  const next = (
    <button
      type="button"
      className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-sm hover:shadow transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      disabled={!canContinue}
      onClick={p.onContinue}
    >
      <span>{p.nextLabel || (p.collectionOnly ? 'Continue to patient details' : 'Continue to review & pay')}</span>
      <ChevronRight size={16} aria-hidden="true" />
    </button>
  );

  const heroLogo = lab.logo_url || lab.cover_url || lab.gallery?.[0]?.url;

  return (
    <section className={`w-full grid lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start ${p.collectionOnly ? 'lj-collection-step' : ''}`} aria-label="Centre and time">
      {/* LEFT COLUMN: Main Scheduling Flow */}
      <div className="min-w-0 space-y-4">
        {/* 1. Lab Summary Card */}
        <header className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
              {heroLogo ? (
                <img src={heroLogo} alt="" className="w-full h-full object-contain p-1" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center text-teal-600">
                  <FlaskConical className="w-6 h-6" />
                </div>
              )}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">{lab.name}</h3>
              {centre && (
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{centreLocality(lab.name, centre)}</span>
                  {distance && <span>· {comparisonDistance(distance.metres)} away</span>}
                </p>
              )}
              {validPin(centre?.pin) && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${centre.pin.lat},${centre.pin.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800 mt-1 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" /> View on map
                </a>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={p.onChangeLab}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition shrink-0 cursor-pointer self-start sm:self-auto"
          >
            <Pencil className="w-3.5 h-3.5 text-slate-500" /> Change lab
          </button>
        </header>

        {/* 2. Collection Method Selector */}
        {!p.scheduleOnly && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900">Select collection method</h3>
            <div
              role="tablist"
              aria-label="Sample collection"
              className="grid sm:grid-cols-2 gap-3"
              onKeyDown={(event) => {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                event.preventDefault();
                const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role=tab]'));
                const current = tabs.indexOf(document.activeElement as HTMLButtonElement);
                const nextIndex =
                  event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                    ? tabs.length - 1
                    : (current + (event.key === 'ArrowLeft' ? -1 : 1) + tabs.length) % tabs.length;
                tabs[nextIndex]?.focus();
                tabs[nextIndex]?.click();
              }}
            >
              {/* Visit Centre Tab */}
              <button
                type="button"
                role="tab"
                tabIndex={mode === 'LAB_VISIT' ? 0 : -1}
                aria-selected={mode === 'LAB_VISIT'}
                onClick={() => p.onMode('LAB_VISIT')}
                className={`p-4 rounded-xl border-2 text-left transition flex items-start gap-3 cursor-pointer ${
                  mode === 'LAB_VISIT'
                    ? 'border-orange-500 bg-orange-50/40 text-slate-900 shadow-xs ring-2 ring-orange-500/10'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    mode === 'LAB_VISIT' ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <strong className="block text-sm font-bold">Visit centre</strong>
                  <span className="text-xs text-slate-500 block mt-0.5">
                    Visit the lab centre at your chosen time slot
                  </span>
                </div>
              </button>

              {/* Home Collection Tab */}
              {homeCovers(lab, p.pincode) && (
                <button
                  type="button"
                  role="tab"
                  tabIndex={mode === 'HOME' ? 0 : -1}
                  aria-selected={mode === 'HOME'}
                  onClick={() => p.onMode('HOME')}
                  className={`p-4 rounded-xl border-2 text-left transition flex items-start gap-3 cursor-pointer ${
                    mode === 'HOME'
                      ? 'border-orange-500 bg-orange-50/40 text-slate-900 shadow-xs ring-2 ring-orange-500/10'
                      : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      mode === 'HOME' ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Home className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-sm font-bold">Home collection</strong>
                      {money(lab.settings?.home.fee) && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                          +{rupees(lab.settings!.home.fee)}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 block mt-0.5">
                      Sample collector arrives at your doorstep
                    </span>
                  </div>
                </button>
              )}
            </div>

            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              {mode === 'HOME'
                ? 'Appointment time is for sample collection at your address.'
                : 'Appointment time is for visiting the diagnostic centre.'}
            </p>

            {mode === 'LAB_VISIT' && lab.locations.length > 1 && (
              <label className="block pt-2 border-t border-slate-100 space-y-1.5">
                <span className="text-xs font-bold text-slate-700">Select Collection Centre</span>
                <ThemedSelect
                  value={p.centreId || ''}
                  onChange={(e) => p.onCentre(Number(e.target.value))}
                >
                  {lab.locations.map((c) => (
                    <option key={c.id} value={c.id}>
                      {[c.name, c.city].filter(Boolean).join(', ')}
                    </option>
                  ))}
                </ThemedSelect>
              </label>
            )}

            {mode === 'HOME' && <div className="pt-2 border-t border-slate-100">{p.addressFields}</div>}
          </div>
        )}

        {p.notice && (
          <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold text-amber-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>{p.notice} Please pick another time.</span>
          </div>
        )}

        {/* 3. Availability Loading / Error States */}
        {loading ? (
          <div role="status" aria-label="Loading availability" className="rounded-2xl border border-slate-200 bg-white p-12 text-center space-y-3 shadow-xs">
            <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-bold text-slate-700">Loading available dates and times…</p>
          </div>
        ) : error ? (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center space-y-3">
            <AlertCircle className="w-6 h-6 text-rose-600 mx-auto" />
            <p className="text-xs font-bold text-rose-800">{error}</p>
            <button
              type="button"
              onClick={p.onRetry}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        ) : mode === 'HOME' && !validHomePin(p.pincode) ? (
          <div role="status" className="rounded-2xl border border-slate-200 bg-white p-6 text-center space-y-2">
            <p className="text-xs font-bold text-slate-600">Enter a 6-digit PIN to check home collection.</p>
          </div>
        ) : availability && !availability.bookable ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 space-y-3" role="status">
            {availability.reason && <p className="text-xs font-bold text-amber-900">{availability.reason}</p>}
            <div className="flex flex-wrap gap-3">
              {mode === 'HOME' && (
                <button
                  type="button"
                  onClick={() => p.onMode('LAB_VISIT')}
                  className="px-4 py-2 rounded-xl bg-orange-600 text-white text-xs font-bold"
                >
                  Visit centre instead
                </button>
              )}
              <button
                type="button"
                onClick={p.onChangeLab}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold"
              >
                Choose another lab
              </button>
            </div>
          </div>
        ) : availability && !days.some(dayAvailable) ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center space-y-3" role="status">
            <p className="text-xs font-bold text-slate-700">No times in the next {availability.max_days} days</p>
            <button
              type="button"
              onClick={p.onChangeLab}
              className="px-4 py-2 rounded-xl bg-orange-600 text-white text-xs font-bold"
            >
              Choose another lab
            </button>
          </div>
        ) : availability && !p.collectionOnly && (
          <div className="space-y-4">
            {/* Horizontal Date Strip Picker */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-teal-700" /> Select Date
                </h3>
                {date && (
                  <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                    {appointmentLabel(date)}
                  </span>
                )}
              </div>

              {/* Scrollable date cards */}
              <div
                className="flex items-center gap-2 overflow-x-auto pb-2 pt-1"
                role="group"
                aria-label="Available collection days"
              >
                {days.map((d) => {
                  const active = date === d.date;
                  const available = dayAvailable(d);
                  const dateObj = new Date(d.date + 'T12:00:00+05:30');
                  const weekday = dateObj.toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'Asia/Kolkata' });
                  const dayNum = Number(d.date.slice(-2));
                  const monthName = dateObj.toLocaleDateString('en-IN', { month: 'short', timeZone: 'Asia/Kolkata' });

                  return (
                    <button
                      key={d.date}
                      type="button"
                      aria-pressed={active}
                      disabled={!available}
                      onClick={() => p.onDate(d.date)}
                      className={`flex flex-col items-center justify-center min-w-[62px] py-2.5 px-2 rounded-xl border text-center transition cursor-pointer shrink-0 ${
                        active
                          ? 'bg-orange-600 border-orange-600 text-white shadow-xs ring-2 ring-orange-600/20'
                          : available
                          ? 'bg-white border-slate-200 text-slate-800 hover:border-teal-500 hover:bg-teal-50/40'
                          : 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed opacity-50'
                      }`}
                    >
                      <small className={`text-[10px] font-medium uppercase ${active ? 'text-orange-100' : 'text-slate-400'}`}>
                        {weekday}
                      </small>
                      <strong className="text-base font-extrabold my-0.5 leading-tight">{dayNum}</strong>
                      <small className={`text-[10px] ${active ? 'text-orange-100' : 'text-slate-400'}`}>
                        {monthName}
                      </small>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Slots Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <header className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-teal-700" /> Available time slots
                  </h3>
                  {day && <p className="text-xs text-slate-500 mt-0.5">{appointmentLabel(day.date)}</p>}
                </div>
                <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                  All times in IST
                </span>
              </header>

              <LabTimeSlotOptions slots={day?.slots || []} time={time} onTime={p.onTime} />

              {day && !day.slots.some((s) => s.available) && (
                <p className="text-xs font-semibold text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200">
                  No available times on this day. Please choose another date.
                </p>
              )}
            </div>
          </div>
        )}

        {/* 4. Notes Section */}
        {p.onNotes && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
            <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" /> Add notes (optional)
            </label>
            <textarea
              aria-label="Reason for test"
              maxLength={500}
              value={p.notes || ''}
              onChange={(e) => p.onNotes?.(e.target.value)}
              placeholder="Reason for tests or collection instructions (e.g., fasting completed, landmark for sample collector)..."
              className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 min-h-[85px] resize-y"
            />
          </div>
        )}

        {/* 5. Test Preparation Instructions (if needed) */}
        {!p.collectionOnly && preparation.length > 0 && (
          <section className="rounded-2xl border border-teal-200 bg-teal-50/40 p-5 space-y-3" aria-label="Test preparation instructions">
            <h3 className="text-xs font-bold text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-4 h-4 text-teal-700" /> Test Preparation Instructions
            </h3>
            <div className="space-y-2.5">
              {preparation.map((t) => (
                <div key={t.code} className="text-xs text-slate-700 bg-white/80 p-3 rounded-xl border border-teal-100">
                  <strong className="block font-bold text-slate-900 mb-0.5">{t.name}</strong>
                  <p className="text-slate-600">{preparationText(t)}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* RIGHT COLUMN: Sticky Booking Summary */}
      <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sticky top-6 space-y-4" aria-label="Appointment summary">
        <h2 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-teal-600" /> Your selection
        </h2>

        {/* Selected Tests */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Selected tests ({p.tests.length})
          </span>
          <ul className="space-y-1.5 text-xs text-slate-700">
            {p.tests.map((t) => {
              const price = lab.selected.find((s) => s.code === t.code)?.price;
              return (
                <li key={t.code} className="flex items-center justify-between gap-2">
                  <span className="truncate">{t.name}</span>
                  {!lab.prices_vary && money(price) && (
                    <strong className="font-extrabold text-slate-900 shrink-0">{rupees(price)}</strong>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Chosen Lab */}
        <div className="pt-3 border-t border-slate-100 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Chosen lab</span>
          <p className="text-xs font-extrabold text-slate-900">{lab.name}</p>
          {centre && mode === 'LAB_VISIT' && (
            <p className="text-[11px] text-slate-500">{centreLocality(lab.name, centre)}</p>
          )}
        </div>

        {/* Appointment Details */}
        {!p.collectionOnly && (
          <div className="pt-3 border-t border-slate-100 space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Appointment details
            </span>
            {date && time ? (
              <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-950 text-xs flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-teal-700 shrink-0" />
                <div>
                  <span className="block font-bold">{appointmentLabel(date)}</span>
                  <span className="text-[11px] text-teal-700 font-medium">{slotLabel(time)}</span>
                </div>
              </div>
            ) : date ? (
              <div className="text-xs text-slate-700">
                <span className="font-semibold">{appointmentLabel(date)}</span>
                <span className="text-slate-400 block text-[11px]">Select a time slot</span>
              </div>
            ) : (
              <span className="text-xs text-slate-400 italic">Select date & time</span>
            )}
            <p className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 mt-1">
              {mode === 'HOME' ? <Home className="w-3.5 h-3.5 text-teal-600" /> : <Building2 className="w-3.5 h-3.5 text-blue-600" />}
              {mode === 'HOME' ? 'Home collection' : 'Visit centre'}
            </p>
            {mode === 'HOME' && p.address && (
              <p className="text-[11px] text-slate-500 flex items-start gap-1">
                <MapPin className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
                <span>{p.address}</span>
              </p>
            )}
          </div>
        )}

        {/* Price details */}
        <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Price details
          </span>
          {money(p.testsTotal) && (
            <div className="flex justify-between text-slate-600">
              <span>Tests total</span>
              <strong className="font-bold text-slate-900">{rupees(p.testsTotal)}</strong>
            </div>
          )}
          {mode === 'HOME' && money(lab.settings?.home.fee) && (
            <div className="flex justify-between text-slate-600">
              <span>Home collection fee</span>
              <strong className="font-bold text-slate-900">{rupees(lab.settings!.home.fee)}</strong>
            </div>
          )}
          {money(p.total) && (
            <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-base font-black text-slate-900">
              <span>Total</span>
              <span>{rupees(p.total)}</span>
            </div>
          )}
        </div>

        {/* CTA Button */}
        <div className="pt-2">
          {next}
          {!canContinue && why && (
            <p role="status" className="text-[11px] text-center text-slate-400 mt-2">
              {why}
            </p>
          )}
        </div>
      </aside>

      {/* MOBILE FIXED BOTTOM ACTION BAR */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 p-3 flex items-center justify-between gap-3 shadow-lg"
        role="region"
        aria-label="Appointment actions"
      >
        <div className="min-w-0">
          <div className="text-xs font-bold text-slate-900 truncate">
            {date ? appointmentLabel(date) : 'Choose date'}
            {time ? ` · ${slotLabel(time)}` : ''}
          </div>
          {money(p.total) && <div className="text-sm font-black text-slate-900">{rupees(p.total)}</div>}
        </div>
        <div className="shrink-0">{next}</div>
      </div>
    </section>
  );
}
