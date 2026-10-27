import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Droplets, RotateCcw, X } from 'lucide-react';
import { bloodError, cancelBloodRequestApi, myBloodRequestsApi, newIdempotencyKey, payBloodRequestApi, type MyBloodRequest } from '../../../services/bloodbankHelper';

// My blood requests: plain status, the processing charge (never a price for blood), pay online,
// cancel before issue. No unit or donor details are ever shown here.
const money = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const tone = (r: MyBloodRequest) => (['ISSUED', 'CLOSED'].includes(r.status) || (r.status === 'READY' && ['PAID', 'CASH_RECORDED'].includes(r.payment_status)) ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : ['REJECTED', 'CANCELLED'].includes(r.status) ? 'bg-slate-100 border-slate-200 text-slate-600' : r.status === 'READY' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-sky-50 border-sky-200 text-sky-800');
const statusLabel = (r: MyBloodRequest) => r.status === 'READY' && ['PAID', 'CASH_RECORDED'].includes(r.payment_status)
  ? 'Ready — paid, collect from the blood bank'
  : r.status_label;

const COMPONENT: Record<string, string> = { PRBC: 'red blood cells', WB: 'whole blood', FFP: 'plasma', PLT: 'platelets', RDP: 'platelets', SDP: 'platelets', CRYO: 'cryoprecipitate' };
const PSTEPS = ['Requested', 'Sample', 'Ready', 'Collected'];
const stepOf = (r: MyBloodRequest) =>
  r.status === 'SUBMITTED' ? 0 : ['ACCEPTED', 'SAMPLE_RECEIVED', 'CROSSMATCHED'].includes(r.status) ? 1 : r.status === 'READY' ? 2 : 3;

const MyBloodRequestsScreen = () => {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [rows, setRows] = useState<MyBloodRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { try { setRows(await myBloodRequestsApi()); setError(null); } catch (e) { setError(bloodError(e, 'Could not load your requests.')); } }, []);
  useEffect(() => { load(); const t = window.setInterval(load, 20000); window.addEventListener('focus', load); return () => { window.clearInterval(t); window.removeEventListener('focus', load); }; }, [load]);
  const openId = params.get('open');
  const open = rows?.find((r) => r.id === openId) || null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2"><Droplets className="w-6 h-6 text-rose-600" /> My blood requests</h1>
        <button onClick={() => navigate('/find-blood')} className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-bold text-rose-700">Find blood</button>
      </div>
      {error ? <div className="p-6 text-center bg-white rounded-2xl border border-slate-200"><p className="text-sm font-bold text-rose-700">{error}</p><button onClick={load} className="inline-flex items-center gap-1 text-sm font-bold"><RotateCcw className="w-4 h-4" /> Retry</button></div>
        : !rows ? <p className="text-sm text-slate-400">Loading…</p>
        : !rows.length ? <p className="text-sm text-slate-500 bg-white rounded-2xl border border-slate-200 p-6 text-center">No blood requests yet. Use Find blood to see availability and send a request with your requisition.</p>
        : (
          <ul className="space-y-2" aria-label="Blood requests">
            {rows.map((r) => (
              <li key={r.id}>
                <button onClick={() => setParams({ open: r.id })} className="w-full text-left bg-white rounded-2xl border border-slate-200 p-4 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-black text-slate-900">{r.quantity} × {r.requested_group} {r.component_code}</span><span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${tone(r)}`}>{statusLabel(r)}</span></div>
                  <p className="text-xs text-slate-500">{r.bloodbank_name} · for {r.patient_name || 'you'} · {r.request_number}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      {open && <RequestSheet r={open} onClose={() => setParams({})} onChanged={load} />}
    </div>
  );
};

export const RequestSheet = ({ r, onClose, onChanged }: { r: MyBloodRequest; onClose: () => void; onChanged: () => void }) => {
  const [mode, setMode] = useState<'UPI' | 'CARD'>('UPI');
  const [upi, setUpi] = useState('');
  const [card, setCard] = useState({ last4: '', name: '' });
  const [reason, setReason] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const payKey = useMemo(() => newIdempotencyKey(), [r.id]);
  const run = async (fn: () => Promise<unknown>, fallback: string) => {
    setBusy(true); setErr(null);
    try { await fn(); onChanged(); } catch (e) { setErr(bloodError(e, fallback)); } finally { setBusy(false); }
  };
  const bank = r.bloodbank_name || 'the blood bank';
  const paid = ['PAID', 'CASH_RECORDED'].includes(r.payment_status);
  const ended = ['REJECTED', 'CANCELLED'].includes(r.status);
  const at = stepOf(r);
  // What the patient should do now, in plain words.
  const todo: Record<string, { title: string; body: string }> = {
    SUBMITTED: { title: 'Waiting for the blood bank', body: `${bank} is checking your request and doctor’s note. You’ll be notified when they accept it. Nothing to do yet.` },
    ACCEPTED: { title: 'Visit the blood bank to give a blood sample', body: `Go to ${bank} with the patient (or a sample drawn at the hospital). Show request number ${r.request_number}. They test the sample to find blood that safely matches. No payment needed now.` },
    SAMPLE_RECEIVED: { title: 'Your sample is being tested', body: `${bank} is matching your sample with their blood. You’ll be notified when the blood is ready.` },
    CROSSMATCHED: { title: 'Blood matched — being prepared', body: 'You’ll be notified shortly when it’s ready to collect.' },
    READY: paid
      ? { title: 'Paid — collect your blood', body: `Go to ${bank} and show request number ${r.request_number} to collect.` }
      : { title: 'Blood is ready — pay and collect', body: r.processing_charge ? `Pay the processing charge below (or at the counter), then collect from ${bank}. The blood is held for you for a limited time.` : `Pay the processing charge at the ${bank} counter and collect. The blood is held for you for a limited time.` },
    ISSUED: { title: 'Blood collected', body: 'This request is complete.' },
    CLOSED: { title: 'Completed', body: 'This request is complete.' },
    REJECTED: { title: 'Request not accepted', body: r.status_reason || `${bank} could not accept this request.` },
    CANCELLED: { title: 'Request cancelled', body: r.status_reason || 'This request was cancelled.' },
  };
  const now = todo[r.status] || { title: statusLabel(r), body: '' };
  const [askCancel, setAskCancel] = useState(false);

  return (
    <div role="dialog" aria-modal="true" aria-label="Blood request" className="fixed inset-0 z-50 bg-slate-900/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-black">{r.quantity} unit{r.quantity === 1 ? '' : 's'} · {r.requested_group} {COMPONENT[r.component_code] || r.component_code}</h2>
            <p className="text-xs text-slate-500">{bank} · for {r.patient_name || 'you'}</p>
          </div>
          <button aria-label="Close" onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        {!ended && (
          <ol aria-label="Progress" className="grid grid-cols-4 gap-1 text-[11px] font-bold text-center">
            {PSTEPS.map((s, i) => (
              <li key={s} className="space-y-1">
                <div className={`h-1.5 rounded-full ${i <= at ? 'bg-rose-600' : 'bg-slate-200'}`} />
                <span className={i === at ? 'text-slate-900' : 'text-slate-400'}>{s}</span>
              </li>
            ))}
          </ol>
        )}

        <section aria-label="What to do now" className={`rounded-xl border p-3 space-y-1 ${tone(r)}`}>
          <p className="text-sm font-black">{now.title}</p>
          {now.body && <p className="text-sm font-normal text-slate-700">{now.body}</p>}
        </section>

        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
          <span className="text-xs text-slate-500">Request number — show this at the counter</span>
          <span className="font-mono text-sm font-black">{r.request_number}</span>
        </div>

        {r.processing_charge && (
          <p className="text-sm">Processing charge: <b>{money(r.processing_charge.total)}</b> {r.quantity > 1 && <span className="text-slate-500">({money(r.processing_charge.per_unit)} per unit)</span>} · {r.payment_status === 'PAID' ? 'paid online' : r.payment_status === 'CASH_RECORDED' ? 'paid at the counter' : r.payment_status === 'REFUNDED' ? 'refunded' : 'pay when ready'}</p>
        )}
        {!r.processing_charge && !ended && !paid && <p className="text-xs text-slate-500">You pay only a processing charge, after the blood is matched and ready. Blood itself is never sold.</p>}

        {r.can_pay && r.processing_charge && (
          <section aria-label="Pay processing charge" className="rounded-xl border border-slate-200 p-3 space-y-2">
            <div className="flex gap-3 text-sm font-semibold"><label><input type="radio" checked={mode === 'UPI'} onChange={() => setMode('UPI')} /> UPI</label><label><input type="radio" checked={mode === 'CARD'} onChange={() => setMode('CARD')} /> Card</label></div>
            {mode === 'UPI' ? <input aria-label="UPI ID" placeholder="name@bank" value={upi} onChange={(e) => setUpi(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              : <div className="grid grid-cols-2 gap-2"><input aria-label="Card last 4 digits" placeholder="Last 4 digits" inputMode="numeric" value={card.last4} onChange={(e) => setCard({ ...card, last4: e.target.value.replace(/\D/g, '').slice(0, 4) })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" /><input aria-label="Name on card" placeholder="Name on card" value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" /></div>}
            <button disabled={busy} onClick={() => run(() => payBloodRequestApi(r.id, mode === 'UPI' ? { payment_method: 'UPI', upi_id: upi } : { payment_method: 'CARD', card_last4: card.last4, card_holder_name: card.name }, payKey), 'Payment failed.')} className="w-full rounded-xl bg-rose-600 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Paying…' : `Pay processing charge ${money(r.processing_charge.total)}`}</button>
          </section>
        )}
        {r.can_cancel && !askCancel && (
          <button onClick={() => setAskCancel(true)} className="text-xs font-bold text-slate-500 underline">I don’t need this blood any more</button>
        )}
        {r.can_cancel && askCancel && (
          <section aria-label="Cancel request" className="rounded-xl border border-slate-200 p-3 space-y-2">
            <div className="flex items-center justify-between"><p className="text-sm font-black">Cancel this request?</p><button aria-label="Keep request" onClick={() => setAskCancel(false)}><X className="w-4 h-4" /></button></div>
            <p className="text-xs text-slate-500">{bank} will stop working on it{r.status === 'READY' ? ' and the blood kept for you goes back to stock' : ''}.{r.payment_status === 'PAID' ? ' Your online payment will be refunded.' : ''}</p>
            <input aria-label="Reason for cancelling" placeholder="Why are you cancelling? (optional)" value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setAskCancel(false)} className="rounded-xl border border-slate-300 py-2 text-sm font-bold text-slate-700">Keep request</button>
              <button disabled={busy} onClick={() => run(() => cancelBloodRequestApi(r.id, reason), 'Could not cancel.')} className="rounded-xl bg-rose-700 py-2 text-sm font-bold text-white disabled:opacity-50">Yes, cancel</button>
            </div>
          </section>
        )}
        {err && <p role="alert" className="text-sm font-semibold text-rose-700">{err}</p>}
      </div>
    </div>
  );
};

export default MyBloodRequestsScreen;

