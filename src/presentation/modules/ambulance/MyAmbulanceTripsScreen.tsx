import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Ambulance, RotateCcw, X } from 'lucide-react';
import TransferNoteSection from './TransferNoteSection';
import TripTrackingMap from './TripTrackingMap';
import { ambulanceError, cancelScheduledApi, cancelTripApi, myScheduledApi, myTripApi, myTripsApi, newIdempotencyKey, payTripApi, ratesText, rupees, tripReceiptApi, type MyTrip, type ScheduledBooking, type TripReceipt } from '../../../services/ambulanceHelper';

// My ambulance trips: status, vehicle and driver once assigned, the fare, cancel before the vehicle sets
// off, and the receipt after paying. Crew phone numbers are never shown; the operator's desk number is.
const when = (d: string) => new Date(d).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const tone = (s: string) => (s === 'COMPLETED' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : ['DECLINED', 'CANCELLED', 'EXPIRED'].includes(s) ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-sky-50 border-sky-200 text-sky-800');

const MyAmbulanceTripsScreen = () => {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [rows, setRows] = useState<MyTrip[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { try { setRows(await myTripsApi()); setError(null); } catch (e) { setError(ambulanceError(e, 'Could not load your trips.')); } }, []);
  useEffect(() => { load(); const t = window.setInterval(load, 20000); window.addEventListener('focus', load); return () => { window.clearInterval(t); window.removeEventListener('focus', load); }; }, [load]);
  const openId = params.get('open');
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2"><Ambulance className="w-6 h-6 text-rose-600" /> My ambulance trips</h1>
        <button onClick={() => navigate('/book-ambulance')} className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-bold text-white">Book an ambulance</button>
      </div>
      <AwaitingDriver highlight={params.get('scheduled')} />
      <p className="text-sm text-rose-800 font-semibold">Emergency? Call <a href="tel:108" className="underline">108</a>. Need an ambulance soon? <button onClick={() => navigate('/urgent-ambulance')} className="underline">Urgent ambulance</button></p>
      {error ? <div className="p-6 text-center bg-white rounded-2xl border border-slate-200"><p className="text-sm font-bold text-rose-700">{error}</p><button onClick={load} className="inline-flex items-center gap-1 text-sm font-bold"><RotateCcw className="w-4 h-4" /> Retry</button></div>
        : !rows ? <p className="text-sm text-slate-400">Loading…</p>
        : !rows.length ? <p className="text-sm text-slate-500 bg-white rounded-2xl border border-slate-200 p-6 text-center">No trips yet. Book an ambulance for a planned trip such as a hospital discharge or dialysis.</p>
        : (
          <ul className="space-y-2" aria-label="Ambulance trips">
            {rows.map((t) => (
              <li key={t.id}>
                <button onClick={() => setParams({ open: t.id })} className="w-full text-left bg-white rounded-2xl border border-slate-200 p-4 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-black text-slate-900">{when(t.scheduled_at)}</span><span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${tone(t.status)}`}>{t.status_label}</span></div>
                  <p className="text-xs text-slate-500">{t.vehicle_type_label} · {t.operator.name} · for {t.patient_name || 'you'} · {t.trip_number}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      {openId && <TripSheet id={openId} onClose={() => setParams({})} onChanged={load} />}
    </div>
  );
};

const TripSheet = ({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) => {
  const [t, setT] = useState<MyTrip | null>(null);
  const [receipt, setReceipt] = useState<TripReceipt | null>(null);
  const [reason, setReason] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setT(null); setReceipt(null); myTripApi(id).then(setT).catch((e) => setErr(ambulanceError(e, 'Could not load the trip.'))); }, [id]);
  const cancel = async () => {
    if (!window.confirm('Cancel this ambulance booking?')) return;
    setBusy(true); setErr(null);
    try { setT(await cancelTripApi(id, reason)); onChanged(); } catch (e) { setErr(ambulanceError(e, 'Could not cancel.')); } finally { setBusy(false); }
  };
  return (
    <div role="dialog" aria-modal="true" aria-label="Ambulance trip" className="fixed inset-0 z-50 bg-slate-900/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 space-y-3 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between"><h2 className="text-lg font-black">{t ? when(t.scheduled_at) : 'Trip'}</h2><button aria-label="Close" onClick={onClose}><X className="w-5 h-5" /></button></div>
        <a href="tel:108" className="block rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-sm font-bold text-rose-800">Emergency? Call 108</a>
        {!t ? (err ? <p className="text-sm font-bold text-rose-700">{err}</p> : <p className="text-sm text-slate-400">Loading…</p>) : (
          <>
            <p className={`rounded-xl border px-3 py-2 text-sm font-bold ${tone(t.status)}`}>{t.status_label}</p>
            {t.status_reason && <p className="text-sm text-slate-600">Reason: {t.status_reason}</p>}
            {t.vehicle_registration && <p className="text-sm"><b>{t.vehicle_registration}</b> · driver {t.driver_name}</p>}
            <TripTrackingMap key={t.id} tripId={t.id} />
            <dl className="grid grid-cols-[6rem_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-slate-500">Operator</dt><dd>{t.operator.name}{t.operator.phone && <> · <a className="font-bold text-rose-700 underline" href={`tel:${t.operator.phone}`}>{t.operator.phone}</a></>}</dd>
              <dt className="text-slate-500">From</dt><dd>{t.pickup_address}</dd>
              <dt className="text-slate-500">To</dt><dd>{t.drop_address}</dd>
              {t.is_urgent && <><dt className="text-slate-500">Type</dt><dd className="font-bold text-rose-700">Urgent</dd></>}
              <dt className="text-slate-500">Vehicle</dt><dd>{t.vehicle_type_label} · {t.mobility_label}</dd>
              <dt className="text-slate-500">Fare</dt><dd>{t.final_fare !== null ? <b>{rupees(t.final_fare)} ({t.actual_km} km{t.waiting_minutes ? `, ${t.waiting_minutes} min waiting` : ''})</b> : <>{rupees(t.fare.base_fare)} for {t.fare.included_km} km, then {rupees(t.fare.per_km)}/km{t.estimated_fare ? ` · estimate ${rupees(t.estimated_fare)}` : ''}{t.fare_cap && <span className="block text-xs text-slate-500">You pay no more than {ratesText(t.fare_cap)} applied to the actual distance and waiting.</span>}</>}</dd>
              <dt className="text-slate-500">Payment</dt><dd>{({ CASH_RECORDED: 'Paid in cash', PAID_ONLINE: 'Paid online', PROCESSING: 'Payment in progress', REFUNDED: 'Refunded', REFUND_SUPPORT: 'Refund with Vizito support' } as Record<string, string>)[t.payment_status] || (t.status === 'COMPLETED' ? (t.can_pay_online ? 'Pay the driver in cash or pay online' : 'Pay the driver in cash') : 'After the trip')}</dd>
            </dl>
            {t.cancellation_terms && <p aria-label="Cancellation terms" className="text-xs text-slate-500">{t.cancellation_terms.summary}</p>}
            {t.fee_status && <p aria-label="Fee" className="text-sm font-semibold">{t.fee_status === 'PROPOSED' ? `A fee of ${rupees(t.fee_amount)} is being reviewed by Vizito. Nothing is charged unless Vizito approves it.` : t.fee_status === 'APPROVED' ? `Fee ${rupees(t.fee_amount)} (approved by Vizito).` : `No fee: waived by Vizito.`}</p>}
            {!!t.timeline?.length && <ol aria-label="Timeline" className="text-xs text-slate-600 space-y-0.5 border-l-2 border-slate-200 pl-3">{t.timeline.map((e, i) => <li key={i}>{e.label} · {new Date(e.at).toLocaleString('en-IN', { hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short' })}</li>)}</ol>}
            <TransferNoteSection tripId={t.id} editable={!['COMPLETED', 'CANCELLED', 'DECLINED', 'EXPIRED'].includes(t.status)} />
            {t.can_pay_online && <PayOnline trip={t} onPaid={(x) => { setT(x); onChanged(); }} />}
            {t.has_receipt && !receipt && <button onClick={() => tripReceiptApi(id).then(setReceipt).catch((e) => setErr(ambulanceError(e, 'Could not load the receipt.')))} className="text-sm font-bold text-slate-700 underline">View receipt</button>}
            {receipt && (
              <section aria-label="Receipt" className="rounded-xl border border-slate-200 p-3 text-sm space-y-1">
                <p className="font-bold">Receipt {receipt.trip_number}</p>
                {receipt.lines.map((l) => <p key={l.label} className="flex justify-between gap-2"><span>{l.label}</span><span>{rupees(l.amount)}</span></p>)}
                <p className="flex justify-between font-black border-t border-slate-200 pt-1"><span>Total ({receipt.payment})</span><span>{rupees(receipt.total)}</span></p>
              </section>
            )}
            {t.can_cancel && (
              <section aria-label="Cancel booking" className="space-y-2">
                <input aria-label="Reason for cancelling" placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                <button disabled={busy} onClick={cancel} className="w-full rounded-xl border border-slate-300 py-2 text-sm font-bold text-slate-700">Cancel booking</button>
              </section>
            )}
            {!t.can_cancel && ['EN_ROUTE', 'AT_PICKUP', 'ON_BOARD'].includes(t.status) && <p className="text-xs text-slate-500">The ambulance is on its way. To change or cancel, call the operator.</p>}
            {err && <p role="alert" className="text-sm font-semibold text-rose-700">{err}</p>}
          </>
        )}
      </div>
    </div>
  );
};

export default MyAmbulanceTripsScreen;

// Scheduled bookings not yet accepted by a driver (and recent ones nobody accepted). Never shown as confirmed:
// once a driver accepts, the booking appears in the trip list below as a normal trip.
function AwaitingDriver({ highlight }: { highlight: string | null }) {
  const [rows, setRows] = useState<ScheduledBooking[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(async () => { try { setRows(await myScheduledApi()); } catch { setRows([]); } }, []);
  useEffect(() => { load(); const t = window.setInterval(load, 15000); return () => window.clearInterval(t); }, [load]);
  const shown = rows.filter((b) => b.status === 'OPEN' || (b.status === 'UNANSWERED' && new Date(b.scheduled_at).getTime() > Date.now() - 86400000) || (b.id === highlight && b.status !== 'ACCEPTED'));
  if (!shown.length) return null;
  const cancel = async (id: string) => {
    if (!window.confirm('Cancel this scheduled trip? It is free while no driver has accepted.')) return;
    setErr(null);
    try { await cancelScheduledApi(id); await load(); } catch (e) { setErr(ambulanceError(e, 'Could not cancel.')); }
  };
  return (
    <section aria-label="Awaiting a driver" className="space-y-2">
      <h2 className="text-sm font-black text-slate-700">Awaiting a driver</h2>
      {shown.map((b) => (
        <article key={b.id} aria-label={`Scheduled booking ${b.request_number}`} className={`bg-white rounded-2xl border p-4 space-y-1 ${b.id === highlight ? 'border-amber-400' : 'border-slate-200'}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-black text-slate-900">{when(b.scheduled_at)}</span>
            <span role="status" className={`rounded-full border px-2 py-0.5 text-xs font-bold ${b.status === 'OPEN' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>{b.status_label}</span>
          </div>
          <p className="text-xs text-slate-500">{b.vehicle_type_label} · {b.mobility_label} · {b.request_number}</p>
          <p className="text-xs text-slate-600">{b.pickup_address} → {b.drop_address}</p>
          {b.status === 'OPEN' && <p className="text-xs text-slate-600">{b.searching ? 'Vizito is offering this trip to nearby drivers now.' : `Vizito starts offering it to drivers at ${when(b.search_starts_at!)}.`} Not confirmed until a driver accepts.</p>}
          {b.quote && <p className="text-xs text-slate-600">Maximum rates: {ratesText(b.quote)}. Tolls and parking are not part of the Vizito fare.</p>}
          {b.can_cancel && <button onClick={() => cancel(b.id)} className="text-sm font-bold text-slate-700 underline">Cancel (free)</button>}
        </article>
      ))}
      {err && <p role="alert" className="text-sm font-semibold text-rose-700">{err}</p>}
    </section>
  );
}

// Pay the final fare online after the trip (shown only when Vizito has enabled online payment for ambulance trips).
function PayOnline({ trip, onPaid }: { trip: MyTrip; onPaid: (t: MyTrip) => void }) {
  const [method, setMethod] = useState('UPI');
  const [upi, setUpi] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [key] = useState(() => newIdempotencyKey()); // the same key on a retried click: never charged twice
  const pay = async () => {
    setBusy(true); setErr(null);
    try { onPaid(await payTripApi(trip.id, { payment_method: method, upi_id: method === 'UPI' ? upi : undefined }, key)); } catch (e) { setErr(ambulanceError(e, 'Payment failed.')); } finally { setBusy(false); }
  };
  return (
    <section aria-label="Pay online" className="rounded-xl border border-slate-200 p-3 space-y-2">
      <p className="text-sm font-bold">Pay {rupees(trip.final_fare)} online</p>
      <select aria-label="Payment method" value={method} onChange={(e) => setMethod(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
        <option value="UPI">UPI</option><option value="CARD">Card</option><option value="NETBANKING">Net banking</option><option value="WALLET">Wallet</option>
      </select>
      {method === 'UPI' && <input aria-label="UPI ID" placeholder="name@bank" value={upi} onChange={(e) => setUpi(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />}
      {err && <p role="alert" className="text-sm font-semibold text-rose-700">{err}</p>}
      <button disabled={busy || (method === 'UPI' && !upi)} onClick={pay} className="w-full rounded-xl bg-rose-600 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Paying…' : 'Pay online'}</button>
    </section>
  );
}
