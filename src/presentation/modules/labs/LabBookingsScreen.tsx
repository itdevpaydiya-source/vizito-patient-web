import { useCallback, useEffect, useState } from 'react';
import VisitLocation from '../../components/location/VisitLocation';
import { labPublicApi } from '../../../services/labHelper';
import RateBox from '../../components/RateBox';
import { rateMyLabOrderApi } from '../../../services/labHelper';
import IllustratedEmpty from '../../components/illustrations/IllustratedEmpty';
import { paidLabel, refundText, refundWillText } from '../../../config/payments';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { MapPin, Plus, X, AlertTriangle, Printer, RotateCcw, ChevronRight, FileText, Download, FlaskConical, CalendarDays, Clock3 } from 'lucide-react';
import LabTrends from './LabTrends';
import LabReschedule from './LabReschedule';
import { shareOptionsApi, shareReportApi, unshareReportApi, type ShareOptions } from '../../../services/labHelper';
import { myLabOrdersApi, myLabOrderApi, cancelMyLabOrderApi, myLabReportApi, openMyLabReportPdf, labError, rupees, type MyLabOrder, type MyLabOrderDetail, type MyLabReport } from '../../../services/labHelper';

const STATUS: Record<string, { label: string; cls: string }> = {
  BOOKED: { label: 'Booked', cls: 'bg-sky-50 border-sky-200 text-sky-800' },
  SAMPLE_PENDING: { label: 'Sample pending', cls: 'bg-amber-50 border-amber-200 text-amber-900' },
  IN_PROGRESS: { label: 'Being tested', cls: 'bg-violet-50 border-violet-200 text-violet-800' },
  PARTIALLY_REPORTED: { label: 'Partial report ready', cls: 'bg-teal-50 border-teal-200 text-teal-800' },
  REPORTED: { label: 'Report ready', cls: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-slate-100 border-slate-200 text-slate-600' },
};
const SAMPLE: Record<string, string> = { EXPECTED: 'To be collected', COLLECTED: 'Collected', RECEIVED: 'At the lab', REJECTED: 'Not usable' };
const label12 = (t: string) => { const [h, m] = String(t || '00:00').split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; };
const day = (d: string) => new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
const paidText = (o: MyLabOrder) => { const cr = (o as any).counter_refund; if (cr) return cr.status === 'REFUNDED' ? `Refunded ₹${cr.amount}` : `Refund due ₹${cr.amount}`; const p = (o as any).payment; if (p && p.status === 'PARTIALLY_PAID') return `Partly paid · ₹${p.paid} paid, ₹${p.due} due at the lab`; return o.payment_status === 'PAID' ? paidLabel(o.payment_mode) : o.payment_status === 'REFUNDED' ? 'Refunded' : 'Pay at centre'; };

// My lab bookings: what, where, when, paid or not, and status. Tap one for details, receipt or cancel.
export default function LabBookingsScreen() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion() ?? false;
  const [params, setParams] = useSearchParams();
  const [orders, setOrders] = useState<MyLabOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const openId = params.get('open');
  const view = params.get('view') === 'trends' ? 'trends' : 'bookings';
  const load = useCallback(() => { setError(null); myLabOrdersApi().then(setOrders).catch((e) => setError(labError(e, 'Could not load your lab bookings.'))); }, []);
  useEffect(() => { load(); }, [load]);
  const open = (id: string | null) => { const p = new URLSearchParams(params); if (id) p.set('open', id); else p.delete('open'); setParams(p, { replace: true }); };

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.25, ease: 'easeOut' }}
      className="w-full space-y-5 pb-10"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-orange-800 mb-1.5"><span className="w-1.5 h-1.5 rounded-full bg-orange-600" /> Lab care</p>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Lab bookings</h1>
          <p className="text-sm text-slate-500 mt-1">Manage upcoming tests and find reports from your visits.</p>
        </div>
        <button onClick={() => navigate('/lab-tests')} className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-800 hover:bg-orange-900 text-white text-sm font-bold shadow-sm motion-safe:transition-all motion-safe:duration-200 motion-reduce:transition-none hover:shadow-md active:scale-[0.98]"><Plus className="w-4 h-4" /> Book tests</button>
      </div>

      <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-100/80 p-1.5" role="tablist" aria-label="Lab bookings sections">
        {(['bookings', 'trends'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={view === t} onClick={() => { const q = new URLSearchParams(params); if (t === 'trends') q.set('view', 'trends'); else q.delete('view'); setParams(q, { replace: true }); }}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold motion-safe:transition-all motion-safe:duration-200 motion-reduce:transition-none ${view === t ? 'bg-white text-orange-900 shadow-sm' : 'text-slate-600 hover:bg-white/60'}`}>{t === 'bookings' ? 'Bookings' : 'Health trends'}</button>
        ))}
      </div>

      {view === 'trends' ? <LabTrends /> : error ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3 shadow-sm">
          <AlertTriangle className="w-9 h-9 text-rose-400 mx-auto" />
          <p role="alert" className="text-sm font-semibold text-rose-700">{error}</p>
          <button onClick={load} className="inline-flex items-center gap-2 text-sm font-bold text-orange-900 bg-orange-50 hover:bg-orange-100 px-3.5 py-2 rounded-xl motion-safe:transition-colors motion-reduce:transition-none"><RotateCcw className="w-4 h-4" /> Retry</button>
        </div>
      ) : !orders ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center shadow-sm"><div className="w-7 h-7 border-[3px] border-orange-700 border-t-transparent rounded-full animate-spin mx-auto mb-3" /><p className="text-sm text-slate-500">Loading your bookings...</p></div>
      ) : !orders.length ? (
        <IllustratedEmpty art="diagnostic" title="No lab bookings yet" body="Book blood tests, health check-ups and more at a lab near you. Prices are shown before you book." action={{ label: 'Find tests', onClick: () => navigate('/lab-tests') }} />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 items-stretch" aria-label="My lab bookings">
          {orders.map((o, index) => (
            <li key={o.id} className="h-full">
              <motion.button
                type="button"
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.22, delay: reduceMotion ? 0 : Math.min(index * 0.035, 0.18), ease: 'easeOut' }}
                whileHover={reduceMotion ? undefined : { y: -2 }}
                onClick={() => open(o.id)}
                className="group w-full h-full min-h-[12rem] text-left bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-orange-200 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-orange-700/15 motion-safe:transition-[border-color,box-shadow] motion-safe:duration-200 motion-reduce:transition-none"
              >
                {o.recollection_needed && o.status !== 'CANCELLED' && (
                  <p className="mb-3 text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 flex items-start gap-2"><AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> A new sample is needed. Please visit the centre again; there is no extra charge.</p>
                )}
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">{o.items.length} {o.items.length === 1 ? 'test' : 'tests'} <span className="normal-case tracking-normal font-medium">- {o.order_number}</span></p>
                    <p className="text-base font-extrabold text-slate-900 mt-1 line-clamp-2">{o.items.map((i) => i.test_name).join(', ')}</p>
                    <p className="text-xs text-slate-600 mt-2 flex items-start gap-1.5"><MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-orange-700" /><span className="line-clamp-2">{o.lab_name}, {o.visit_type === 'HOME' ? 'home collection' : o.location_name}</span></p>
                    <p className="text-xs text-slate-600 mt-2 font-semibold">{day(o.visit_date)} <span className="font-normal text-slate-400">at</span> {label12(o.visit_time)}</p>
                    {o.fasting_hours > 0 && o.status === 'BOOKED' && <p className="text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 mt-3">Fast for {o.fasting_hours} hours before your visit.</p>}
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end max-w-[42%]">
                    <span className={`inline-block text-[10px] leading-4 font-bold px-2.5 py-1.5 rounded-xl border ${(STATUS[o.status] || STATUS.BOOKED).cls}`}>{STATUS[o.status]?.label || o.status}</span>
                    <p className="text-sm font-black tabular-nums text-slate-900 mt-3">{rupees(o.total_amount)}</p>
                    <p className="text-[10px] leading-4 font-semibold text-slate-500 mt-0.5">{paidText(o)}</p>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-900 mt-3 group-hover:translate-x-0.5 motion-safe:transition-transform motion-reduce:transition-none">Details <ChevronRight className="w-4 h-4" /></span>
                  </div>
                </div>
              </motion.button>
              {o.status === 'REPORTED' && <div className="mt-1.5"><RateBox kind="lab" compact what={o.lab_name || 'the lab'} rated={o.my_rating} onSubmit={(r, t, g) => rateMyLabOrderApi(o.id, r, t, g)} /></div>}
            </li>
          ))}
        </ul>
      )}
      {openId && <Detail id={openId} onClose={() => open(null)} onChanged={load} />}
    </motion.div>
  );
}

function printReceipt(o: MyLabOrderDetail) {
  const w = window.open('', '_blank', 'width=520,height=700');
  if (!w) return;
  const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
  const rows = o.items.map((i) => `<tr><td>${esc(i.test_name)}</td><td class="r">${esc(rupees(i.price))}</td></tr>`).join('');
  w.document.write(`<!doctype html><title>Receipt ${esc(o.order_number)}</title><style>body{font:13px Arial;margin:24px;color:#111}h1{font-size:18px;margin:0}table{width:100%;border-collapse:collapse;margin:12px 0}td{padding:6px 0;border-bottom:1px solid #ddd}.r{text-align:right}.m{color:#555}</style>
<h1>${esc(o.lab_name)}</h1><p class="m">${esc(o.location_name)}<br>${esc(o.location_address)}</p>
<p><b>Receipt</b> · ${esc(o.order_number)}<br>Patient: ${esc(o.patient_name)}<br>Visit: ${esc(day(o.visit_date))}, ${esc(label12(o.visit_time))}</p>
<table>${rows}<tr><td><b>Total</b></td><td class="r"><b>${esc(rupees(o.total_amount))}</b></td></tr></table>
<p>Payment: ${esc(paidText(o))}</p><p class="m">Booked through Vizito.</p><script>window.onload=()=>window.print()</script>`);
  w.document.close();
}

function Detail({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const reduceMotion = useReducedMotion() ?? false;
  const [o, setO] = useState<MyLabOrderDetail | null>(null);
  // The booked centre's confirmed map pin (from the lab's public page), so directions go to that exact centre.
  const [centrePin, setCentrePin] = useState<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    const labId = (o as any)?.lab_partner_id, locId = Number((o as any)?.location_id);
    if (!labId || !locId || o?.visit_type === 'HOME') return;
    labPublicApi(labId).then((l) => setCentrePin(l.locations.find((x) => Number(x.id) === locId)?.pin || null)).catch(() => setCentrePin(null));
  }, [(o as any)?.lab_partner_id, (o as any)?.location_id, o?.visit_type]);
  const [err, setErr] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const load = useCallback(() => myLabOrderApi(id).then(setO).catch((e) => setErr(labError(e, 'Could not open this booking.'))), [id]);
  useEffect(() => { load(); }, [load]);
  const canCancel = o && o.status !== 'CANCELLED' && !o.specimens.some((s) => s.collected_at);
  const cancel = async () => {
    if (!o) return;
    setBusy(true); setErr(null);
    try {
      const r = await cancelMyLabOrderApi(o.id, reason.trim() || undefined);
      setDone(r.refund.status === 'REFUNDED' ? `Booking cancelled. ${refundText(rupees(r.refund.amount))}` : r.refund.status === 'NEEDS_SUPPORT' ? `Booking cancelled. Your ${rupees(r.refund.amount)} refund is being processed by our support team.` : 'Booking cancelled.');
      setConfirming(false); await load(); onChanged();
    } catch (e) { setErr(labError(e, 'Could not cancel this booking.')); } finally { setBusy(false); }
  };
  const live = (o?.specimens || []).filter((s) => s.status !== 'REJECTED');
  const rejected = (o?.specimens || []).filter((s) => s.status === 'REJECTED');

  return createPortal(
    <motion.div
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduceMotion ? undefined : { opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' }}
      className="fixed inset-0 z-[1000] bg-slate-950/45 backdrop-blur-[3px] flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lab-booking-dialog-title"
        className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto overscroll-contain"
        initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.22, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      >
        <header className="sticky top-0 z-10 bg-white/95 backdrop-blur px-5 sm:px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-100 text-orange-800 flex items-center justify-center shrink-0"><FlaskConical className="w-5 h-5" /></div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Lab booking <span className="font-mono normal-case tracking-normal">{o?.order_number}</span></p>
              <h2 id="lab-booking-dialog-title" className="text-lg sm:text-xl font-black text-slate-900 leading-tight truncate">{o?.lab_name || 'Lab booking'}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {o && <span className={`text-[10px] sm:text-xs font-bold px-2.5 py-1.5 rounded-xl border ${(STATUS[o.status] || STATUS.BOOKED).cls}`}>{STATUS[o.status]?.label || o.status}</span>}
            <button onClick={onClose} aria-label="Close booking details" className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 motion-safe:transition-colors motion-reduce:transition-none"><X className="w-5 h-5" /></button>
          </div>
        </header>
        {!o ? <p className="p-5 text-sm text-slate-400">{err || 'Loading…'}</p> : (
          <div className="p-5 sm:p-6 space-y-5">
            {done && <p role="status" className="text-sm font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">{done}</p>}
            {err && <p role="alert" className="text-sm font-semibold text-rose-700">{err}</p>}
            {o.recollection_needed && o.status !== 'CANCELLED' && (
              <div className="text-sm text-rose-900 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5">
                <p className="font-bold flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> A new sample is needed</p>
                <p className="text-xs mt-1">{rejected.length ? `Reason: ${rejected[rejected.length - 1].rejection_reason}. ` : ''}Please visit {o.location_name} again. There is no extra charge.</p>
              </div>
            )}
            <section className="rounded-2xl border border-orange-100 bg-orange-50/50 p-4" aria-label="Appointment details">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-orange-100 text-orange-800 flex items-center justify-center shrink-0"><CalendarDays className="w-4.5 h-4.5" /></div>
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-slate-900">{day(o.visit_date)}</p>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700"><Clock3 className="w-3.5 h-3.5 text-orange-800" />{label12(o.visit_time)}{o.visit_type === 'HOME' ? ' - home collection' : ''}</p>
                  {o.visit_type === 'HOME' ? <p className="text-sm text-slate-600 mt-2">Collection address: {o.home_address}{o.home_fee ? ` - collection fee ${rupees(o.home_fee)}` : ''}</p>
                    : o.status === 'CANCELLED' ? <p className="text-sm text-slate-600 mt-2">{o.location_name}{o.location_address ? `, ${o.location_address}` : ''}</p> : null}
                  {o.ordering_doctor_name && <p className="text-xs text-slate-500 mt-2">Requested by <span className="font-semibold text-slate-700">{o.ordering_doctor_name}</span></p>}
                </div>
              </div>
            </section>
            {o.visit_type !== 'HOME' && o.status !== 'CANCELLED' && (
              <VisitLocation title="Collection location" name={`${o.lab_name || 'Lab'}, ${o.location_name || ''}`.replace(/, $/, '')} address={o.location_address || ''} pin={centrePin} />
            )}
            {o.status === 'BOOKED' && !(o.specimens || []).some((s) => s.collected_at) && <LabReschedule order={o as any} onMoved={(t) => { setDone(t); load(); onChanged(); }} />}
            {o.visit_type === 'HOME' && o.status !== 'CANCELLED' && <HomeVisit o={o} />}
            {o.due_at && (o.status === 'IN_PROGRESS' || o.status === 'SAMPLE_PENDING' || o.status === 'PARTIALLY_REPORTED') && <p className="text-xs font-semibold text-slate-700 bg-slate-50 rounded-lg px-3 py-2">Report expected by {new Date(o.due_at).toLocaleString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' })}.</p>}
            {o.fasting_hours > 0 && o.status === 'BOOKED' && <p className="text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">Fast for {o.fasting_hours} hours before your visit. Water is fine.</p>}
            {o.status === 'CANCELLED' && <p className="text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg px-3 py-2">Cancelled by {o.cancelled_by === 'LAB' ? 'the lab' : 'you'}{o.cancellation_reason ? `: ${o.cancellation_reason}` : ''}.{o.payment_status === 'REFUNDED' ? ' Your payment was refunded.' : ''}</p>}
            {(o as any).counter_refund && <p className={`text-xs font-semibold rounded-lg px-3 py-2 ${(o as any).counter_refund.status === 'REFUNDED' ? 'text-emerald-900 bg-emerald-50' : 'text-amber-900 bg-amber-50'}`}>{(o as any).counter_refund.status === 'REFUNDED' ? `₹${(o as any).counter_refund.amount} paid at the lab was refunded by ${String((o as any).counter_refund.method).toLowerCase()}${(o as any).counter_refund.reference ? ` (ref ${(o as any).counter_refund.reference})` : ''}.` : `₹${(o as any).counter_refund.amount} you paid at the lab for ${(o as any).counter_refund.items.join(', ')} is due back from ${o.lab_name} at the counter. Not received? Contact support.`}</p>}
            <section aria-label="Tests">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">Tests</h3>
              <ul className="divide-y divide-slate-100 border border-slate-100 rounded-xl text-sm">
                {Array.from(new Set(o.items.map((i) => i.package_name || ''))).map((pk) => (
                  <li key={pk || 'single'} className="divide-y divide-slate-100">
                    {pk && <p className="px-3 py-1.5 bg-teal-50/60 flex justify-between text-xs font-black text-teal-900"><span>{pk} · health package</span><span className="tabular-nums">{rupees(o.items.filter((i) => i.package_name === pk).reduce((n, i) => n + i.price, 0))}</span></p>}
                    {o.items.filter((i) => (i.package_name || '') === pk).map((i) => (
                      <div key={i.test_code} className={`px-3 py-2 ${pk ? 'pl-6' : ''}`}>
                        <div className="flex justify-between gap-2"><span className="font-semibold text-slate-800">{i.test_name}{i.status === 'REPORTED' && o.status === 'PARTIALLY_REPORTED' && <span className="ml-1.5 text-[10px] font-bold text-emerald-700">result ready</span>}</span><span className="tabular-nums">{pk ? <span className="text-xs text-slate-400">included</span> : rupees(i.price)}</span></div>
                        {!!i.is_addon && <p className="text-[11px] text-slate-500">Added later at the request of {i.addon_requested_by} · {i.addon_payment === 'DUE' ? 'to pay at the lab' : `paid at the lab by ${i.addon_payment === 'UPI' ? 'UPI' : String(i.addon_payment || '').toLowerCase()}`}</p>}
                      </div>
                    ))}
                  </li>
                ))}
                {(() => {
                  // Add-ons paid at the lab counter are not part of the booking payment.
                  const addonPaid = o.items.filter((i) => i.is_addon && i.addon_payment && i.addon_payment !== 'DUE').reduce((n, i) => n + i.price, 0);
                  const booking = o.total_amount - addonPaid;
                  return (<>
                    <li className="px-3 py-2 flex justify-between font-black"><span>Total</span><span className="tabular-nums">{rupees(o.total_amount)}</span></li>
                    <li className="px-3 py-1.5 flex justify-between text-xs text-slate-600"><span>Booking · {paidText(o)}</span><span className="tabular-nums">{rupees(booking)}</span></li>
                    {addonPaid > 0 && <li className="px-3 py-1.5 flex justify-between text-xs text-slate-600"><span>Add-on · paid at the lab</span><span className="tabular-nums">{rupees(addonPaid)}</span></li>}
                  </>);
                })()}
              </ul>
            </section>
            {o.status !== 'CANCELLED' && o.status !== 'BOOKED' && <ReportBlock orderId={o.id} />}
            {live.length > 0 && o.status !== 'REPORTED' && (
              <section aria-label="Samples">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">Samples</h3>
                <ul className="space-y-1 text-xs">
                  {live.map((s) => <li key={s.id} className="flex justify-between gap-2"><span className="text-slate-700">{s.specimen_type}</span><span className="font-bold text-slate-900">{SAMPLE[s.status]}</span></li>)}
                </ul>
              </section>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              {o.status !== 'CANCELLED' && <button onClick={() => printReceipt(o)} className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-700"><Printer className="w-4 h-4" /> Receipt</button>}
              {canCancel && !confirming && <button onClick={() => setConfirming(true)} className="px-3 py-2 rounded-xl border border-rose-200 text-sm font-bold text-rose-700">Cancel booking</button>}
            </div>
            {confirming && (
              <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 space-y-2">
                <p className="text-sm font-bold text-slate-900">Cancel this booking?</p>
                <p className="text-xs text-slate-600">{o.payment_status === 'PAID' ? refundWillText(rupees(o.total_amount)) : 'You have not paid anything, so there is nothing to refund.'}</p>
                <label className="block text-xs font-bold text-slate-700">Reason (optional)
                  <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                    <option value="">Prefer not to say</option><option>Plans changed</option><option>Booked by mistake</option><option>Found a closer lab</option><option>Doctor changed the tests</option>
                  </select>
                </label>
                <div className="flex gap-2">
                  <button disabled={busy} onClick={cancel} className="px-3 py-2 rounded-xl bg-rose-600 text-white text-sm font-bold disabled:opacity-50">{busy ? 'Cancelling…' : 'Yes, cancel'}</button>
                  <button onClick={() => setConfirming(false)} className="px-3 py-2 text-sm font-bold text-slate-600">Keep booking</button>
                </div>
              </div>
            )}
            {!canCancel && o.status !== 'CANCELLED' && <p className="text-[11px] text-slate-500">Your sample has been collected, so this booking can no longer be cancelled here. Contact the lab if you need help.</p>}
          </div>
        )}
      </motion.div>
    </motion.div>,
    document.body,
  );
}

const FLAG: Record<string, { text: string; cls: string }> = {
  L: { text: 'Low', cls: 'text-amber-800 font-bold' }, H: { text: 'High', cls: 'text-amber-800 font-bold' }, A: { text: 'Abnormal', cls: 'text-amber-800 font-bold' },
  LL: { text: 'Critical low', cls: 'text-rose-700 font-black' }, HH: { text: 'Critical high', cls: 'text-rose-700 font-black' },
};

// The released report in the app: results with what is outside the normal range marked, who signed
// it, the version (and why it was amended), and the PDF.
function ReportBlock({ orderId }: { orderId: string }) {
  const [r, setR] = useState<MyLabReport | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { myLabReportApi(orderId).then(setR).catch((e) => setErr(labError(e, 'Could not load your report.'))); }, [orderId]);
  if (err) return <p role="alert" className="text-sm font-semibold text-rose-700">{err}</p>;
  if (!r) return <p className="text-xs text-slate-400">Loading report…</p>;
  if (!r.released || !r.snapshot) return null;
  const s = r.snapshot;
  const outside = s.tests.flatMap((t) => t.results).filter((x) => x.flag && x.flag !== 'N').length;
  const open = (v?: number) => openMyLabReportPdf(orderId, v).catch((e) => setErr(labError(e, 'Could not open the report.')));
  return (
    <section aria-label="Your report" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Your report</h3>
        <button onClick={() => open()} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-700 text-white text-xs font-bold"><Download className="w-3.5 h-3.5" /> Download PDF</button>
      </div>
      {s.partial && (
        <div className="text-xs text-violet-950 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">
          <p className="font-bold">Partial report: some results are still being tested</p>
          <ul className="mt-1 list-disc pl-4">{(s.pending || []).map((p) => <li key={p.name}>{p.name}: {p.status.toLowerCase()}</li>)}</ul>
          {s.expected_by && <p className="mt-1">Expected by {new Date(s.expected_by).toLocaleString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' })}. We'll tell you when the complete report is ready.</p>}
        </div>
      )}
      {s.continues_partial && !s.amended && <p className="text-xs font-semibold text-sky-900 bg-sky-50 border border-sky-200 rounded-lg px-3 py-2">Complete report (version {r.version}). It includes every test and replaces the partial report; earlier results are unchanged.</p>}
      {s.amended && <p className="text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">Corrected report (version {r.version}). Reason: {String(s.amendment_reason || '').replace(/\.+$/, '')}. Use this version.</p>}
      <p className="text-xs text-slate-600">{outside ? `${outside} result${outside === 1 ? ' is' : 's are'} outside the normal range. Please discuss them with your doctor.` : 'All results are within the normal range.'}</p>
      {s.tests.map((t) => (
        <div key={t.code} className="border border-slate-100 rounded-xl overflow-x-auto">
          <p className="px-3 py-2 bg-slate-50 text-sm font-bold text-slate-900">{t.name}</p>
          <table className="w-full text-sm" aria-label={`${t.name} results`}>
            <thead><tr className="text-left text-[10px] uppercase tracking-wider text-slate-500"><th className="px-3 py-1.5">Test</th><th className="px-2 py-1.5">Result</th><th className="px-3 py-1.5">Normal range</th></tr></thead>
            <tbody>
              {t.results.map((x) => (
                <tr key={x.name} className="border-t border-slate-100">
                  <td className="px-3 py-1.5 text-slate-800">{x.name}</td>
                  <td className="px-2 py-1.5 tabular-nums"><span className={x.flag && FLAG[x.flag] ? FLAG[x.flag].cls : 'text-slate-900 font-semibold'}>{x.value} {x.unit || ''}</span>{x.flag && FLAG[x.flag] && <span className={`block text-[10px] ${FLAG[x.flag].cls}`}>{FLAG[x.flag].text}</span>}</td>
                  <td className="px-3 py-1.5 text-xs text-slate-600">{x.reference}{(x as any).corrected_from && <span className="block text-[10px] font-bold text-rose-700">Corrected — was {(x as any).corrected_from}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {t.note && <p className="px-3 py-2 border-t border-slate-100 text-[11px] text-slate-600"><b className="text-slate-700">How to read this: </b>{t.note}</p>}
        </div>
      ))}
      <p className="text-[11px] text-slate-500">{s.lab?.registration ? `${s.lab.name} · Lab Reg. ${s.lab.registration} · ` : ''}Signed by {s.pathologist.name}, {s.pathologist.qualification} · Reg. {s.pathologist.registration_number} · {new Date(s.released_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' })}</p>
      {(r.versions || []).length > 1 && (
        <p className="text-[11px] text-slate-500">Earlier version{(r.versions || []).length > 2 ? 's' : ''}: {(r.versions || []).filter((v) => v.status === 'REPLACED').map((v) => <button key={v.version} onClick={() => open(v.version)} className="font-bold text-teal-700 hover:underline mr-2">version {v.version}{v.partial ? ' partial' : ''} (replaced)</button>)}</p>
      )}
      <ShareBlock orderId={orderId} />
    </section>
  );
}

// Share the report with a doctor you have visited on Vizito; stop sharing any time.
function ShareBlock({ orderId }: { orderId: string }) {
  const [o, setO] = useState<ShareOptions | null>(null);
  const [pick, setPick] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { shareOptionsApi(orderId).then(setO).catch(() => setO(null)); }, [orderId]);
  if (!o) return null;
  const sharedIds = new Set(o.shared.map((x) => x.doctor_partner_id));
  const choices = o.doctors.filter((d) => !sharedIds.has(d.doctor_partner_id));
  const run = async (fn: () => Promise<ShareOptions>, text: string) => { setBusy(true); setErr(null); try { setO(await fn()); setMsg(text); setPick(''); } catch (e) { setErr(labError(e, 'That did not work.')); } finally { setBusy(false); } };
  return (
    <div aria-label="Share with a doctor" role="group" className="rounded-xl border border-slate-200 p-3 space-y-2">
      <p className="text-xs font-black text-slate-700">Share with a doctor</p>
      {o.ordering_doctor && <p className="text-[11px] text-slate-500">{o.ordering_doctor} ordered these tests and already has the report.</p>}
      {o.shared.map((x) => (
        <p key={x.doctor_partner_id} className="text-xs text-slate-700 flex items-center justify-between gap-2">
          <span>Shared with <b>{x.doctor_name}</b></span>
          <button disabled={busy} onClick={() => run(() => unshareReportApi(orderId, x.doctor_partner_id), `Stopped sharing with ${x.doctor_name}.`)} className="text-xs font-bold text-rose-700 hover:underline">Stop sharing</button>
        </p>
      ))}
      {choices.length ? (
        <div className="flex flex-wrap gap-2 items-center">
          <select aria-label="Doctor" value={pick} onChange={(e) => setPick(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm">
            <option value="">Choose a doctor you have visited…</option>
            {choices.map((d) => <option key={d.doctor_partner_id} value={d.doctor_partner_id}>{d.name}</option>)}
          </select>
          <button disabled={busy || !pick} onClick={() => run(() => shareReportApi(orderId, pick), `Shared with ${choices.find((d) => d.doctor_partner_id === pick)?.name}.`)} className="px-3 py-1.5 rounded-xl bg-teal-700 text-white text-xs font-bold disabled:opacity-50">Share</button>
        </div>
      ) : !o.shared.length && <p className="text-[11px] text-slate-500">After you visit a doctor on Vizito, you can share this report with them here.</p>}
      {msg && <p role="status" className="text-xs font-semibold text-emerald-800">{msg}</p>}
      {err && <p role="alert" className="text-xs font-semibold text-rose-700">{err}</p>}
    </div>
  );
}

const HOME_STEP: Record<string, string> = {
  REQUESTED: 'Booked · the lab will assign a collector', ASSIGNED: 'Collector assigned', ON_THE_WAY: 'Collector on the way', ARRIVED: 'Collector with you',
  COLLECTED: 'Sample collected', DELIVERED: 'Sample at the lab', FAILED: 'Collection could not be done',
};

// Home sample collection: where it is, who is coming, and the code that proves it is really them.
function HomeVisit({ o }: { o: MyLabOrder }) {
  const status = o.home_status || 'REQUESTED';
  const showCode = !!o.home_visit_code && ['REQUESTED', 'ASSIGNED', 'ON_THE_WAY', 'ARRIVED', 'FAILED'].includes(status);
  return (
    <section aria-label="Home collection" className="rounded-xl border border-teal-200 bg-teal-50/40 p-3 space-y-2">
      <p className="text-sm font-bold text-teal-900">{HOME_STEP[status] || status}</p>
      {o.collector_name && <p className="text-xs text-slate-700">Collector: <b>{o.collector_name}</b>{o.collector_phone && <> · <a className="font-bold text-teal-700" href={`tel:${o.collector_phone}`}>{o.collector_phone}</a></>}</p>}
      {status === 'FAILED' && o.home_note && <p className="text-xs font-semibold text-rose-700">{o.home_note}. The lab will contact you to arrange another visit.</p>}
      {showCode && (
        <div className="flex items-center gap-3" aria-label="Visit code">
          <span className="text-2xl font-black tracking-[0.3em] text-teal-900 tabular-nums">{o.home_visit_code}</span>
          <span className="text-[11px] text-teal-900">Your visit code. Give it only to the collector at your door; never share it on a call.</span>
        </div>
      )}
    </section>
  );
}
