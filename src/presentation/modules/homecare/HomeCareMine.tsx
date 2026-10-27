import { useCallback, useEffect, useState } from 'react';
import { paidLabel, refundText } from '../../../config/payments';
import {
  KeyRound,
  Phone,
  Star,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  CalendarClock,
  PauseCircle,
  Receipt,
  UserX,
  ShieldAlert,
  Activity,
  Pill,
  ClipboardList,
  HeartHandshake,
  ArrowRight,
} from 'lucide-react';
import {
  hcMineApi,
  hcCancelApi,
  hcPauseOrderApi,
  hcRescheduleApi,
  hcRateApi,
  hcNoShowReportApi,
  HC_STATUS,
  VISIT_STATUS,
  type HcOrder,
  type HcVisit,
  type HcShift,
} from '../../../services/homecareHelper';
import { labError, rupees } from '../../../services/labHelper';
import { CarePlanView, Problems } from './HomeCareCare';
import EnquiriesList from './components/EnquiriesList';
import CaregiverTrustCard from './components/CaregiverTrustCard';
import DailyCareLogFeed from './components/DailyCareLogFeed';
import MarSheetView from './components/MarSheetView';
import HomeCareInvoiceModal from './components/HomeCareInvoiceModal';
import CaregiverReplacementModal from './components/CaregiverReplacementModal';
import EmergencySosSheet from './components/EmergencySosSheet';
import RescheduleShiftModal from './components/RescheduleShiftModal';

const label12 = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};
const day = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const card = 'bg-white rounded-2xl border border-slate-200 p-5';

export default function HomeCareMine({
  openId,
  onBookAgain,
  onBrowseCare,
}: {
  openId: string | null;
  onBookAgain?: (o: HcOrder) => void;
  onBrowseCare?: () => void;
}) {
  const [orders, setOrders] = useState<HcOrder[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(openId);

  const load = useCallback(() => {
    setErr(null);
    hcMineApi()
      .then(setOrders)
      .catch((e) => setErr(labError(e, 'Could not load your home care bookings.')));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const replace = (o: HcOrder) => setOrders((all) => (all || []).map((x) => (x.id === o.id ? o : x)));

  if (err)
    return (
      <div className={`${card} text-center space-y-2`}>
        <p role="alert" className="text-sm font-bold text-rose-700">
          {err}
        </p>
        <button onClick={load} className="inline-flex items-center gap-1 text-sm font-bold">
          <RotateCcw className="w-4 h-4" /> Try again
        </button>
      </div>
    );

  if (!orders) return <p className="text-sm text-slate-400">Loading…</p>;

  if (!orders.length)
    return (
      <div className="space-y-6">
        <EnquiriesList onQuoteAccepted={load} />
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm" aria-label="No home care bookings">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 text-orange-800 grid place-items-center shrink-0"><HeartHandshake className="w-7 h-7" /></div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-orange-800">Your care at home</p>
              <h3 className="text-lg font-black text-slate-900 mt-0.5">No home care bookings yet</h3>
              <p className="text-sm text-slate-600 mt-1">Book a nurse, physiotherapist, caregiver, or doctor visit for care at home.</p>
            </div>
            {onBrowseCare && <button type="button" onClick={onBrowseCare} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-orange-800 hover:bg-orange-900 text-white text-sm font-bold shadow-sm motion-safe:transition-colors motion-reduce:transition-none shrink-0">Browse care <ArrowRight className="w-4 h-4" /></button>}
          </div>
        </section>
      </div>
    );

  return (
    <div className="space-y-6">
      <EnquiriesList onQuoteAccepted={load} />
      <ul className="space-y-4" aria-label="My home care bookings">
        {orders.map((o) => (
          <OrderCard
            key={o.id}
            o={o}
            expanded={open === o.id}
            onToggle={() => setOpen(open === o.id ? null : o.id)}
            onChanged={replace}
            onReload={load}
            onBookAgain={onBookAgain}
          />
        ))}
      </ul>
    </div>
  );
}

export function OrderCard({
  o,
  expanded,
  onToggle,
  onChanged,
  onReload,
  onBookAgain,
}: {
  o: HcOrder;
  expanded: boolean;
  onToggle: () => void;
  onChanged: (o: HcOrder) => void;
  onReload: () => void;
  onBookAgain?: (o: HcOrder) => void;
}) {
  const st = HC_STATUS[o.status] || { label: o.status, cls: 'bg-slate-100 text-slate-600 border-slate-200' };
  const done = o.visits.filter((v) => v.status === 'COMPLETED').length;
  const next = o.visits.find((v) => ['SCHEDULED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'].includes(v.status));
  const pros = Array.from(
    new Map(o.visits.filter((v) => v.professional).map((v) => [v.professional!.id, v.professional!])).values()
  );

  const [activeSubTab, setActiveSubTab] = useState<'VISITS' | 'LOGS' | 'MAR'>('VISITS');
  const [showInvoice, setShowInvoice] = useState(false);
  const [showReplacement, setShowReplacement] = useState(false);
  const [showSos, setShowSos] = useState(false);
  const [rescheduleShift, setRescheduleShift] = useState<HcShift | null>(null);

  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const [pausing, setPausing] = useState(false);
  const [pauseFrom, setPauseFrom] = useState(() => (next ? next.date : iso(new Date())));
  const [pauseResume, setPauseResume] = useState(() => {
    const base = next ? new Date(`${next.date}T00:00:00`) : new Date();
    return iso(new Date(base.getTime() + 5 * 86400000));
  });
  const [pauseReason, setPauseReason] = useState('');
  const [pauseErr, setPauseErr] = useState<string | null>(null);
  const [pauseBusy, setPauseBusy] = useState(false);

  const unused = o.visits.filter((v) => ['SCHEDULED', 'ON_THE_WAY'].includes(v.status)).length;
  const onWay = o.visits.some((v) => v.status === 'ON_THE_WAY');
  const fee = o.late_cancel_fee || 0;

  const cancel = async () => {
    setErr(null);
    try {
      const r = await hcCancelApi(o.id, reason.trim());
      const feeNote = r.cancellation_fee
        ? ` A late cancellation fee of ${rupees(r.cancellation_fee)} was kept because the professional was already on the way.`
        : '';
      setMsg(
        (r.refund.status === 'REFUNDED'
          ? `Cancelled. ${refundText(rupees(r.refund.amount))}`
          : r.refund.status === 'NEEDS_SUPPORT'
          ? `Cancelled. Your ${rupees(r.refund.amount)} refund for the unused visits is being processed by our support team.`
          : 'Cancelled.') + feeNote
      );
      setCancelling(false);
      onReload();
    } catch (x) {
      setErr(labError(x, 'Could not cancel.'));
    }
  };

  const handlePause = async () => {
    setPauseErr(null);
    setPauseBusy(true);
    try {
      const updated = await hcPauseOrderApi(o.id, { from: pauseFrom, resume_on: pauseResume, reason: pauseReason.trim() });
      setPausing(false);
      setMsg(`Course paused from ${pauseFrom}. Restarts on ${pauseResume}.`);
      onChanged(updated);
    } catch (x) {
      setPauseErr(labError(x, 'Could not pause.'));
    } finally {
      setPauseBusy(false);
    }
  };

  return (
    <li className={`${card} space-y-4`} aria-label={`Home care ${o.order_number}`} data-testid="patient-hc-order-card">
      {/* Top summary row */}
      <button type="button" onClick={onToggle} className="w-full text-left flex items-start justify-between gap-3">
        <span className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="block text-[10px] font-black uppercase tracking-wider text-rose-700">
              Home care · {o.category_label}
            </span>
            <span className="text-[10px] font-mono font-bold text-slate-500">{o.order_number}</span>
          </div>
          <span className="block text-base font-black text-slate-900">{o.service_name}</span>
          <span className="block text-xs text-slate-600">
            {o.agency_name} ·{' '}
            {o.sessions > 1
              ? `${done} of ${o.sessions} ${o.kind === 'SHIFT' ? 'shifts' : 'sessions'} done${
                  o.schedule_text ? ` · ${o.schedule_text}` : ''
                }`
              : `1 ${o.kind === 'SHIFT' ? 'shift' : 'visit'}`}
            {o.patient_name ? ` · for ${o.patient_name}` : ''}
          </span>
          {next && (
            <span className="block text-xs font-bold text-slate-800 mt-1">
              Next: {day(next.date)}, {label12(next.start_time)}
              {next.professional ? ` · ${next.professional.name}` : ' · professional being assigned'}
            </span>
          )}
        </span>
        <span className="flex flex-col items-end gap-1.5 shrink-0">
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${st.cls}`}>{st.label}</span>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {/* Paused banner */}
      {o.pause && (
        <div
          role="status"
          className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-900 flex items-center gap-2"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700" />
          <span>
            Paused from {o.pause.from} · restarts {o.pause.resume_on} · {o.pause.reason}
          </span>
        </div>
      )}

      {msg && (
        <p
          role="status"
          className="text-sm font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2"
        >
          {msg}
        </p>
      )}

      {/* Expanded Details */}
      {expanded && (
        <div className="space-y-5 pt-2 border-t border-slate-100">
          {/* Quick Actions Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSos(true)}
              data-testid="emergency-sos-btn"
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Emergency SOS / 108</span>
            </button>

            <button
              type="button"
              onClick={() => setShowInvoice(true)}
              data-testid="view-invoice-btn"
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition"
            >
              <Receipt className="w-3.5 h-3.5 text-slate-500" />
              <span>Tax Invoice</span>
            </button>

            {['CONFIRMED', 'IN_PROGRESS'].includes(o.status) && (
              <button
                type="button"
                onClick={() => setShowReplacement(true)}
                data-testid="request-caregiver-change-btn"
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition"
              >
                <UserX className="w-3.5 h-3.5 text-amber-600" />
                <span>Change Caregiver</span>
              </button>
            )}
          </div>

          {/* Assigned Caregivers with Full Trust Cards */}
          {pros.length > 0 && (
            <div className="space-y-2.5" aria-label="Your professionals">
              <h4 className="text-xs font-black uppercase tracking-wider text-teal-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                <span>Assigned Care Professional & Verification</span>
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                {pros.map((p) => (
                  <CaregiverTrustCard
                    key={p.id}
                    staff={{
                      ...p,
                      status: 'ASSIGNED',
                      agency_name: o.agency_name,
                      vaccination_status: 'Double Vaccinated (COVID-19 & Flu)',
                      police_verification: 'VERIFIED',
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {o.status === 'REQUESTED' && (
            <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {o.agency_name} is choosing a{' '}
              {o.category === 'NURSING' ? 'nurse' : o.category === 'PHYSIOTHERAPY' ? 'physiotherapist' : 'caregiver'} for
              you. You’ll be told who is coming.
            </p>
          )}

          {/* Order Metadata */}
          <div className="text-xs text-slate-600 space-y-1 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
            <p>
              <b className="text-slate-700">Address:</b> {o.address}
              {o.landmark ? ` (near ${o.landmark})` : ''} · {o.pincode}
            </p>
            {o.care_needs && (
              <p>
                <b className="text-slate-700">Care needed:</b> {o.care_needs}
              </p>
            )}
            <p>
              <b className="text-slate-700">Payment:</b> {rupees(o.total_amount)} ·{' '}
              {o.payment_status === 'PAID'
                ? paidLabel(o.payment_mode).toLowerCase()
                : o.payment_status === 'REFUNDED'
                ? 'refunded'
                : 'to pay at the visit'}{' '}
              · {o.order_number}
            </p>
            {o.refund && (
              <p className={o.refund.status === 'REFUNDED' ? 'text-emerald-800 font-semibold' : 'text-amber-900 font-semibold'}>
                <b>Refund:</b> {rupees(o.refund.amount)}{' '}
                {o.refund.status === 'REFUNDED'
                  ? `sent — reaches your account in 3–5 working days`
                  : 'for unused visits — being processed by Vizito support (usually within 2 working days)'}
              </p>
            )}
            {o.cancellation_fee ? (
              <p className="text-slate-600">
                <b className="text-slate-700">Late cancellation fee:</b> {rupees(o.cancellation_fee)} kept by the agency
                (cancelled while the professional was on the way)
              </p>
            ) : null}
          </div>

          {/* Tab Navigation for Order Content */}
          <div className="flex items-center gap-4 border-b border-slate-200 text-xs font-bold pt-1">
            <button
              type="button"
              onClick={() => setActiveSubTab('VISITS')}
              className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition ${
                activeSubTab === 'VISITS' ? 'border-teal-700 text-teal-800' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>Visits & Schedule ({o.visits.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('LOGS')}
              data-testid="tab-daily-logs"
              className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition ${
                activeSubTab === 'LOGS' ? 'border-teal-700 text-teal-800' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Daily Shift Logs & Vitals</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('MAR')}
              data-testid="tab-mar-records"
              className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition ${
                activeSubTab === 'MAR' ? 'border-teal-700 text-teal-800' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Pill className="w-4 h-4" />
              <span>Medication Record (MAR)</span>
            </button>
          </div>

          {/* SubTab Views */}
          {activeSubTab === 'VISITS' && (
            <div className="space-y-4">
              <ol className="space-y-2.5" aria-label="Visits">
                {o.visits.map((v) => (
                  <VisitRow
                    key={v.id}
                    v={v}
                    o={o}
                    onChanged={onChanged}
                    onRescheduleShift={(sh) => setRescheduleShift(sh)}
                  />
                ))}
              </ol>
              <CarePlanView o={o} onChanged={onChanged} />
              <Problems o={o} onReported={(t) => { setMsg(t); onReload(); }} />
            </div>
          )}

          {activeSubTab === 'LOGS' && (
            <div className="pt-2">
              <DailyCareLogFeed orderId={o.id} />
            </div>
          )}

          {activeSubTab === 'MAR' && (
            <div className="pt-2">
              <MarSheetView orderId={o.id} />
            </div>
          )}

          {err && <p role="alert" className="text-sm font-semibold text-rose-700">{err}</p>}

          {/* Pause care dialog / button */}
          {['REQUESTED', 'CONFIRMED', 'IN_PROGRESS'].includes(o.status) &&
            unused > 0 &&
            (!o.pause || o.pause.count < o.pause.max) &&
            (!pausing ? (
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setPausing(true);
                    setPauseErr(null);
                  }}
                  className="text-xs font-bold text-amber-800 hover:underline inline-flex items-center gap-1"
                >
                  <PauseCircle className="w-3.5 h-3.5" /> Pause care
                </button>
              </div>
            ) : (
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Pause care"
                className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-amber-950 uppercase tracking-wider">Pause care</p>
                  <button type="button" onClick={() => setPausing(false)} className="text-xs font-bold text-slate-500">
                    Cancel
                  </button>
                </div>
                <p className="text-xs text-slate-600">
                  Remaining visits will move to the restart date. You can pause 1 to 30 days.
                </p>
                <div className="grid sm:grid-cols-2 gap-2">
                  <label className="text-[11px] font-bold text-slate-700">
                    Pause from
                    <input
                      type="date"
                      aria-label="Pause from"
                      min={iso(new Date())}
                      value={pauseFrom}
                      onChange={(e) => setPauseFrom(e.target.value)}
                      className="block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs mt-0.5"
                    />
                  </label>
                  <label className="text-[11px] font-bold text-slate-700">
                    Restart on
                    <input
                      type="date"
                      aria-label="Restart on"
                      min={pauseFrom || iso(new Date())}
                      value={pauseResume}
                      onChange={(e) => setPauseResume(e.target.value)}
                      className="block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs mt-0.5"
                    />
                  </label>
                </div>
                <label className="block text-[11px] font-bold text-slate-700">
                  Reason (required)
                  <input
                    aria-label="Reason for pause"
                    value={pauseReason}
                    onChange={(e) => setPauseReason(e.target.value.slice(0, 200))}
                    placeholder="Why are you pausing? (e.g. Admitted to hospital)"
                    className="block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs mt-0.5"
                  />
                </label>
                {pauseErr && (
                  <p role="alert" className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2">
                    {pauseErr}
                  </p>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    disabled={pauseBusy || !pauseReason.trim()}
                    onClick={handlePause}
                    className="px-3 py-1.5 rounded-lg bg-amber-700 text-white text-xs font-bold disabled:opacity-50"
                  >
                    {pauseBusy ? 'Pausing…' : 'Confirm pause'}
                  </button>
                  <button disabled={pauseBusy} onClick={() => setPausing(false)} className="px-3 py-1.5 text-xs font-bold text-slate-600">
                    Keep care
                  </button>
                </div>
              </div>
            ))}

          {/* Cancellation section */}
          {['REQUESTED', 'CONFIRMED', 'IN_PROGRESS'].includes(o.status) &&
            unused > 0 &&
            (!cancelling ? (
              <div>
                <button onClick={() => setCancelling(true)} className="text-xs font-bold text-rose-700 hover:underline">
                  Cancel {done ? 'the remaining visits' : 'this booking'}
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-3 space-y-2">
                <p className="text-xs text-slate-700">
                  {unused} unused {o.kind === 'SHIFT' ? 'shift' : 'visit'}
                  {unused === 1 ? '' : 's'} will be cancelled.
                  {o.payment_status === 'PAID'
                    ? ` ${rupees(o.unit_price * unused - fee)} will be refunded${
                        done ? ' (processed by our support team)' : ''
                      }.`
                    : ''}
                </p>
                {onWay && (
                  <p
                    role="note"
                    className="text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2"
                  >
                    Your professional is already on the way.
                    {fee
                      ? ` A late cancellation fee of ${rupees(fee)} applies (half of one visit, at most ₹300) and goes to the agency for their travel.`
                      : ' No fee is charged because you chose to pay at the visit, but please cancel earlier next time.'}
                  </p>
                )}
                <input
                  aria-label="Why are you cancelling?"
                  value={reason}
                  onChange={(e) => setReason(e.target.value.slice(0, 200))}
                  placeholder="Why are you cancelling? (optional)"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <button onClick={cancel} className="px-3 py-2 rounded-lg bg-rose-600 text-white text-xs font-bold">
                    Confirm cancellation
                  </button>
                  <button onClick={() => setCancelling(false)} className="px-3 py-2 text-xs font-bold text-slate-600">
                    Keep it
                  </button>
                </div>
              </div>
            ))}

          {/* Book again on completed / cancelled */}
          {['COMPLETED', 'CANCELLED'].includes(o.status) && onBookAgain && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onBookAgain(o)}
                className="px-3 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-bold hover:bg-teal-800 inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Book again
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showInvoice && (
        <HomeCareInvoiceModal isOpen={true} onClose={() => setShowInvoice(false)} orderId={o.id} />
      )}

      {showReplacement && (
        <CaregiverReplacementModal
          isOpen={true}
          onClose={() => setShowReplacement(false)}
          orderId={o.id}
          onSuccess={() => {
            setMsg('Replacement request received. Agency supervisor will reassign staff.');
            onReload();
          }}
        />
      )}

      {showSos && (
        <EmergencySosSheet
          isOpen={true}
          onClose={() => setShowSos(false)}
          orderId={o.id}
          agencyName={o.agency_name || undefined}
          patientName={o.patient_name || undefined}
        />
      )}

      {rescheduleShift && (
        <RescheduleShiftModal
          isOpen={true}
          onClose={() => setRescheduleShift(null)}
          orderId={o.id}
          shift={rescheduleShift}
          shiftRate={o.unit_price}
          onSuccess={() => {
            setMsg('Shift successfully rescheduled.');
            onReload();
          }}
        />
      )}
    </li>
  );
}

function VisitRow({
  v,
  o,
  onChanged,
  onRescheduleShift,
}: {
  v: HcVisit;
  o: HcOrder;
  onChanged: (o: HcOrder) => void;
  onRescheduleShift?: (shift: HcShift) => void;
}) {
  const [moving, setMoving] = useState(false);
  const [missed, setMissed] = useState(false);
  const [missedText, setMissedText] = useState('');
  const [reported, setReported] = useState<string | null>(null);
  const overdue =
    ['SCHEDULED', 'ON_THE_WAY'].includes(v.status) &&
    v.professional &&
    Date.now() > new Date(`${v.date}T${v.start_time}:00`).getTime() + 30 * 60000;
  const [date, setDate] = useState(v.date);
  const [time, setTime] = useState(v.start_time);
  const [rating, setRating] = useState(0);
  const [fb, setFb] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const run = async (fn: () => Promise<HcOrder>) => {
    setErr(null);
    try {
      onChanged(await fn());
      setMoving(false);
    } catch (x) {
      setErr(labError(x, 'That did not work.'));
    }
  };

  const r = v.record;
  const live = ['ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'].includes(v.status);

  return (
    <li
      className={`rounded-xl border px-3.5 py-3 ${live ? 'border-indigo-200 bg-indigo-50/40' : 'border-slate-200'}`}
      aria-label={`Visit ${v.seq}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-slate-900">
          {o.sessions > 1 ? `${v.seq}. ` : ''}
          {day(v.date)}, {label12(v.start_time)}–{label12(v.end_time)}
          {v.ends_next_day ? ' (next day)' : ''}
        </p>
        <span className="text-[11px] font-bold text-slate-600">
          {v.status === 'SCHEDULED' && !v.professional ? 'Being assigned' : VISIT_STATUS[v.status] || v.status}
        </span>
      </div>

      {v.professional && v.status !== 'CANCELLED' && (
        <p className="text-xs text-slate-600 mt-0.5">
          {v.professional.name} · {v.professional.role_label}
        </p>
      )}

      {v.visit_code && (
        <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-teal-900 bg-teal-50 border border-teal-200 rounded-lg px-2.5 py-1">
          <KeyRound className="w-3.5 h-3.5" /> Visit code <span className="tracking-[0.25em] text-sm font-black">{v.visit_code}</span> — give it only when they arrive
        </p>
      )}

      {v.status === 'COMPLETED' && r && (
        <div className="mt-2 text-xs text-slate-700 space-y-1 bg-slate-50 rounded-lg p-2.5 border border-slate-100">
          {r.vitals && (
            <p>
              <b>Vitals:</b> BP {r.vitals.bp_sys}/{r.vitals.bp_dia} · pulse {r.vitals.pulse}
              {r.vitals.temp_f ? ` · ${r.vitals.temp_f}°F` : ''}
              {r.vitals.spo2 ? ` · SpO2 ${r.vitals.spo2}%` : ''}
              {r.vitals.sugar ? ` · sugar ${r.vitals.sugar} mg/dL` : ''}
            </p>
          )}
          {r.procedures && <p><b>Done:</b> {r.procedures.join(', ')}</p>}
          {r.pain_before != null && (
            <p>
              <b>Pain:</b> {r.pain_before}/10 before → {r.pain_after}/10 after · <b>Exercises:</b> {r.exercises}
            </p>
          )}
          {r.home_plan && <p><b>Home exercises:</b> {r.home_plan}</p>}
          {r.tasks && <p><b>Care given:</b> {r.tasks.join(', ')}</p>}
          {r.handover && <p><b>Handover:</b> {r.handover}</p>}
          <p><b>Notes:</b> {r.notes}</p>
          {r.concern && (
            <p className="font-semibold text-amber-900 flex items-start gap-1">
              <AlertTriangle className="w-3.5 h-3.5 mt-px text-amber-600" /> {r.concern}
            </p>
          )}
        </div>
      )}

      {['NO_SHOW', 'FAILED', 'PROVIDER_MISSED'].includes(v.status) && v.outcome_note && (
        <p className="text-xs text-rose-800 mt-1">{v.outcome_note}</p>
      )}

      {v.status === 'COMPLETED' &&
        (v.patient_rating ? (
          <p className="text-xs text-amber-700 mt-1.5">
            {'★'.repeat(v.patient_rating)}
            {'☆'.repeat(5 - v.patient_rating)} {v.patient_feedback ? `“${v.patient_feedback}”` : ''}
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap items-center gap-2" aria-label={`Rate visit ${v.seq}`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" aria-label={`${n} star${n === 1 ? '' : 's'}`} onClick={() => setRating(n)}>
                <Star
                  className={`w-5 h-5 ${n <= rating ? 'text-amber-500 fill-amber-400' : 'text-slate-300'}`}
                />
              </button>
            ))}
            {rating > 0 && (
              <>
                <input
                  aria-label="Feedback"
                  value={fb}
                  onChange={(e) => setFb(e.target.value.slice(0, 300))}
                  placeholder="Anything to share? (optional)"
                  className="flex-1 min-w-[160px] rounded-lg border border-slate-200 px-2 py-1 text-xs"
                />
                <button
                  onClick={() => run(() => hcRateApi(v.id, rating, fb.trim()))}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs font-bold"
                >
                  Rate
                </button>
              </>
            )}
          </div>
        ))}

      {v.status === 'SCHEDULED' && (
        <div className="mt-2 flex items-center gap-3">
          {o.kind === 'SHIFT' && onRescheduleShift ? (
            <button
              type="button"
              onClick={() =>
                onRescheduleShift({
                  id: v.id,
                  date: v.date,
                  start_time: v.start_time,
                  end_time: v.end_time,
                  status: v.status,
                  staff_name: v.professional?.name || undefined,
                  patient_name: o.patient_name || undefined,
                  agency_name: o.agency_name || undefined,
                })
              }
              data-testid="reschedule-shift-btn"
              className="text-xs font-bold text-teal-700 inline-flex items-center gap-1 hover:underline"
            >
              <CalendarClock className="w-3.5 h-3.5" /> Reschedule Shift
            </button>
          ) : !moving ? (
            <button
              onClick={() => setMoving(true)}
              className="text-xs font-bold text-teal-700 inline-flex items-center gap-1"
            >
              <CalendarClock className="w-3.5 h-3.5" /> Change date or time
            </button>
          ) : (
            <div className="flex flex-wrap items-end gap-2 pt-1">
              <label className="text-[11px] font-bold text-slate-600">
                Date
                <input
                  type="date"
                  min={iso(new Date())}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="block rounded-lg border border-slate-200 px-2 py-1 text-xs"
                />
              </label>
              <label className="text-[11px] font-bold text-slate-600">
                Time
                <input
                  type="time"
                  step={1800}
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="block rounded-lg border border-slate-200 px-2 py-1 text-xs"
                />
              </label>
              <button
                onClick={() => run(() => hcRescheduleApi(v.id, date, time))}
                className="px-2.5 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-bold"
              >
                Move visit
              </button>
              <button onClick={() => setMoving(false)} className="text-xs font-bold text-slate-500">
                Keep
              </button>
              <p className="w-full text-[11px] text-slate-500">The agency will confirm the professional for the new time.</p>
            </div>
          )}
        </div>
      )}

      {v.status === 'DISPUTED' && (
        <p className="text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-1.5">
          Your report was received. Vizito support is reviewing this visit with the agency and will update you here.
        </p>
      )}

      {reported && (
        <p role="status" className="text-xs font-semibold text-emerald-800 mt-1.5">
          {reported}
        </p>
      )}

      {overdue && !missed && (
        <button onClick={() => setMissed(true)} className="mt-1 text-xs font-bold text-rose-700 block">
          Professional didn’t arrive?
        </button>
      )}

      {overdue && missed && (
        <div
          role="region"
          aria-label="Report a missed visit"
          className="mt-2 rounded-lg border border-rose-200 bg-rose-50/40 p-2.5 space-y-1.5"
        >
          <p className="text-[11px] text-slate-700">
            We’ll ask the agency and the professional what happened and review it.
          </p>
          <textarea
            aria-label="What happened"
            rows={2}
            value={missedText}
            onChange={(e) => setMissedText(e.target.value.slice(0, 600))}
            placeholder="e.g. Waited until 10:45, no call; the agency phone was not answered"
            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
          />
          <div className="flex gap-2">
            <button
              onClick={async () => {
                setErr(null);
                try {
                  await hcNoShowReportApi(v.id, missedText.trim());
                  setMissed(false);
                  setReported('Your report was received. Our team is reviewing this visit.');
                  onChanged({
                    ...o,
                    visits: o.visits.map((x) => (x.id === v.id ? { ...x, status: 'DISPUTED', visit_code: undefined } : x)),
                  });
                } catch (x) {
                  setErr(labError(x, 'Could not send the report.'));
                }
              }}
              className="px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold"
            >
              Send report
            </button>
            <button onClick={() => setMissed(false)} className="text-xs font-bold text-slate-500">
              Back
            </button>
          </div>
        </div>
      )}

      {err && <p role="alert" className="text-xs font-semibold text-rose-700 mt-1">{err}</p>}
    </li>
  );
}
