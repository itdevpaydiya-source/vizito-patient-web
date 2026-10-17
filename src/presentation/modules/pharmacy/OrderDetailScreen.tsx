import { useState, useEffect, useCallback } from 'react';
import { paidLabel, refundText, refundWillText, TestPaymentNote } from '../../../config/payments';
import CancellationRefundPolicy from '../../components/CancellationRefundPolicy';
import { personNameInput } from '../../../utils/inputFilters';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, AlertCircle, RotateCcw, CheckCircle2, XCircle, Store, Truck, CreditCard, Smartphone, Building, Wallet, Stethoscope, MapPin, Phone, Circle } from 'lucide-react';
import { getProviderDetailApi, type ProviderDetail } from '../../../services/bookingHelper';
import RateBox from '../../components/RateBox';
import { getMyReviewsApi } from '../../../services/reviewHelper';
import { ratePharmacyOrderApi, getMyOrderApi, cancelOrderApi, payOrderApi, getPharmacyRequestsApi } from '../../../services/pharmacyOrderHelper';
import { getPrescriptionsApi, type PatientPrescription, type PrescriptionMedicine } from '../../../services/patientHelper';
import { formatDoctorName } from '../../../utils/doctorLabel';
import { orderEndedBy, type PatientOrder } from '../../../services/types';
import type { PaymentMethod } from '../../../services/bookingHelper';

// An order carries only medicine/qty/price — none of the CLINICAL reason it exists
// (dosage, frequency, why it was prescribed). For an Rx-backed order this resolves the
// real originating prescription (order -> pharmacy_request_id -> prescription_id) so
// that context survives past checkout instead of the order looking identical to a plain
// OTC purchase. Best-effort only — a direct/OTC order has no pharmacy_request_id at all,
// and any failure here silently leaves the order screen exactly as before (this is
// enrichment, not core order data).
const findMedicineDetails = (medicineName: string | undefined, meds: PrescriptionMedicine[]): PrescriptionMedicine | null => {
  if (!medicineName) return null;
  const norm = (s: string) => s.toLowerCase().trim();
  const target = norm(medicineName);
  return meds.find((m) => {
    if (!m.name) return false;
    const n = norm(m.name);
    return target.includes(n) || n.includes(target);
  }) || null;
};

const statusMeta: Record<string, { label: string; className: string }> = {
  CREATED: { label: 'Awaiting confirmation', className: 'bg-slate-100 text-slate-600' },
  AWAITING_PAYMENT: { label: 'Payment required', className: 'bg-amber-50 text-amber-700' },
  PAID: { label: 'Paid — waiting for pharmacy', className: 'bg-sky-50 text-sky-700' },
  PROCESSING: { label: 'Pharmacy is preparing your order', className: 'bg-amber-50 text-amber-700' },
  READY_FOR_PICKUP: { label: 'Ready for pickup', className: 'bg-emerald-50 text-emerald-700' },
  OUT_FOR_DELIVERY: { label: 'Out for delivery', className: 'bg-emerald-50 text-emerald-700' },
  COMPLETED: { label: 'Completed', className: 'bg-slate-100 text-slate-500' },
  CANCELLED: { label: 'Cancelled', className: 'bg-rose-50 text-rose-600' },
  FULFILLMENT_FAILED: { label: 'Could not be fulfilled', className: 'bg-rose-50 text-rose-600' },
};

const CANCELLABLE = ['CREATED', 'AWAITING_PAYMENT', 'PAID'];

// Where the order is in its life, as the patient thinks of it.
const STEP_ORDER = ['CREATED', 'PAID', 'PROCESSING', 'READY', 'COMPLETED'];
const stepIndex = (status: string) => {
  if (status === 'CREATED' || status === 'AWAITING_PAYMENT') return 0;
  if (status === 'PAID') return 1;
  if (status === 'PROCESSING') return 2;
  if (status === 'READY_FOR_PICKUP' || status === 'OUT_FOR_DELIVERY') return 3;
  if (status === 'COMPLETED') return 4;
  return -1;
};

export default function OrderDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<PatientOrder | null>(null);
  // The patient's earlier rating of this order, if any (so the box shows stars, not a form).
  const [myRating, setMyRating] = useState<number | null | undefined>(undefined);
  useEffect(() => { if (order?.status === 'COMPLETED' && myRating === undefined) getMyReviewsApi().then((m) => setMyRating(m[order.id]?.rating ?? null)).catch(() => setMyRating(null)); }, [order?.status, order?.id, myRating]);
  const [prescription, setPrescription] = useState<PatientPrescription | null>(null);
  const [pharmacy, setPharmacy] = useState<ProviderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const [payMethod, setPayMethod] = useState<PaymentMethod>('UPI');
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [declined, setDeclined] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true); setError(null);
    try {
      const o = await getMyOrderApi(id);
      setOrder(o);
      getProviderDetailApi(o.pharmacy_partner_id).then(setPharmacy).catch(() => setPharmacy(null));
      setPrescription(null);
      if (o.pharmacy_request_id) {
        try {
          const requests = await getPharmacyRequestsApi();
          const req = requests.find((r) => r.id === o.pharmacy_request_id);
          if (req) {
            const prescriptions = await getPrescriptionsApi();
            setPrescription(prescriptions.find((p) => p.id === req.prescription_id) || null);
          }
        } catch {
          // Enrichment only — the order itself already loaded fine, so this stays silent.
        }
      }
    } catch {
      setError('Unable to load this order.');
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async () => {
    if (!order) return;
    setCancelling(true);
    try {
      await cancelOrderApi(order.id, 'Cancelled by patient');
      // The cancel reply is the bare order (no items): reload the full order to show it.
      setOrder(await getMyOrderApi(order.id));
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Unable to cancel this order.';
      setError(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally { setCancelling(false); }
  };

  const handlePay = async () => {
    if (!order) return;
    setPayError(null); setDeclined(null); setPaying(true);
    try {
      const result = await payOrderApi(order.id, {
        payment_method: payMethod,
        upi_id: payMethod === 'UPI' ? upiId : undefined,
        card_last4: payMethod === 'CARD' ? cardNumber.replace(/\D/g, '').slice(-4) : undefined,
        card_holder_name: payMethod === 'CARD' ? cardName : undefined,
      });
      if (result.success) {
        await load();
      } else {
        setDeclined(result.failure_reason || 'Payment was declined.');
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Payment could not be processed. Please try again.';
      setPayError(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally { setPaying(false); }
  };

  if (loading) {
    return <div className="max-w-2xl mx-auto py-16 text-center"><div className="w-7 h-7 border-[3px] border-orange-700 border-t-transparent rounded-full animate-spin mx-auto" /></div>;
  }
  if (error || !order) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <p className="text-rose-600 font-semibold text-sm">{error || 'Order not found.'}</p>
        <button onClick={load} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl"><RotateCcw className="w-4 h-4" /> Retry</button>
      </div>
    );
  }

  const ended = orderEndedBy(order);
  const meta = ended === 'pharmacy' ? { label: 'Declined by pharmacy', className: 'bg-rose-50 text-rose-600' }
    : ended === 'no-answer' ? { label: "Pharmacy didn't respond", className: 'bg-rose-50 text-rose-600' }
    : statusMeta[order.status] || { label: order.status, className: 'bg-slate-100 text-slate-600' };
  const needsPayment = order.status === 'CREATED' || order.status === 'AWAITING_PAYMENT';

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5 pb-16">
      <button onClick={() => navigate('/pharmacy-orders')} className="inline-flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-orange-900 bg-white border border-slate-200 hover:border-orange-200 px-3.5 py-2.5 rounded-xl shadow-sm motion-safe:transition-colors motion-reduce:transition-none">
        <ArrowLeft className="w-4 h-4" /> Back to Orders
      </button>

      <header className="px-1">
        <p className="text-[10px] uppercase tracking-[0.16em] font-extrabold text-orange-800 mb-1">Medication care</p>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">Order details</h1>
        <p className="text-sm text-slate-500 mt-1">Track your pharmacy order and review its items.</p>
      </header>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-xl bg-orange-50 border border-orange-100 text-orange-800 flex items-center justify-center">
              {order.fulfillment_type === 'DELIVERY' ? <Truck className="w-4.5 h-4.5" /> : <Store className="w-4.5 h-4.5" />}
            </div>
            <div>
              <p className="font-extrabold text-slate-900 text-base">{order.fulfillment_type === 'DELIVERY' ? 'Delivery order' : 'Pickup order'}</p>
              <p className="text-[11px] text-slate-400">{new Date(order.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })} · #{String(order.id).slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
          <span className={`shrink-0 text-[11px] sm:text-xs font-bold px-3 py-2 rounded-xl ${meta.className}`}>{meta.label}</span>
        </div>

        {order.status === 'COMPLETED' && myRating !== undefined && <RateBox kind="pharmacy" rated={myRating} what="this pharmacy" onSubmit={(r, t, g) => ratePharmacyOrderApi(order.id, r, t, g)} />}
        {/* Progress */}
        {stepIndex(order.status) >= 0 && (
          <ol className="grid grid-cols-5 gap-1" aria-label="Order progress">
            {[
              'Placed',
              order.payment_method === 'CASH' ? 'Confirmed' : paidLabel(),
              'Being packed',
              order.fulfillment_type === 'DELIVERY' ? 'On the way' : 'Ready to collect',
              order.fulfillment_type === 'DELIVERY' ? 'Delivered' : 'Collected',
            ].map((label, i) => {
              const done = i <= stepIndex(order.status);
              return (
                <li key={label} aria-current={i === stepIndex(order.status) ? 'step' : undefined} className="flex flex-col items-center text-center gap-1">
                  {done ? <CheckCircle2 className="w-5 h-5 text-teal-600" /> : <Circle className="w-5 h-5 text-slate-300" />}
                  <span className={`text-[10px] font-bold leading-tight ${done ? 'text-slate-800' : 'text-slate-400'}`}>{label}</span>
                </li>
              );
            })}
          </ol>
        )}

        {pharmacy && (
          <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5 space-y-3" aria-label="Pharmacy details">
            <div className="flex items-center gap-2 text-orange-800">
              <Store className="w-4 h-4" />
              <h2 className="text-sm font-extrabold text-slate-900">{order.fulfillment_type === 'DELIVERY' ? 'Fulfilled by' : 'Pharmacy details'}</h2>
            </div>
            <p className="font-bold text-slate-800 text-sm">{pharmacy.business_name}</p>
            {pharmacy.pharmacy?.address && (
              <div className="flex items-start gap-2 text-sm text-slate-600">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span className="min-w-0 flex-1 break-words">{pharmacy.pharmacy.address}</span>
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${pharmacy.business_name}, ${pharmacy.pharmacy.address}`)}`} target="_blank" rel="noreferrer" className="shrink-0 font-bold text-orange-900 hover:underline">Directions</a>
              </div>
            )}
            {pharmacy.pharmacy?.phone && (
              <a href={`tel:${pharmacy.pharmacy.phone}`} className="inline-flex items-center gap-2 text-sm text-orange-900 font-bold hover:underline"><Phone className="w-4 h-4" /> Call pharmacy</a>
            )}
            {order.status === 'READY_FOR_PICKUP' && order.fulfillment_type !== 'DELIVERY' && (
              <p className="text-sm text-emerald-800 font-semibold rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2">Ready to collect. Bring order #{String(order.id).slice(0, 8).toUpperCase()}{prescription ? ' and your prescription' : ''} to the counter.</p>
            )}
          </section>
        )}

        {prescription && (
          <div className="flex items-start gap-2.5 bg-orange-50/70 border border-orange-100 rounded-xl px-3.5 py-3">
            <Stethoscope className="w-4 h-4 text-orange-800 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-slate-800">
                Prescribed by {formatDoctorName(prescription.doctor?.name) || 'your doctor'}
              </p>
              {prescription.diagnosis && <p className="text-slate-600 font-medium mt-0.5">For: {prescription.diagnosis}</p>}
            </div>
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 overflow-hidden" aria-label="Order items">
          <div className="flex items-center justify-between bg-slate-50 px-4 py-3 border-b border-slate-200">
            <h2 className="text-sm font-extrabold text-slate-900">Order summary</h2>
            <span className="text-xs font-semibold text-slate-500">{(order.items || []).length} {(order.items || []).length === 1 ? 'item' : 'items'}</span>
          </div>
          <div className="divide-y divide-slate-100 px-4">
            {(order.items || []).map((item) => {
              const rxMed = prescription ? findMedicineDetails(item.medicine?.medicine_name, prescription.medicines) : null;
              return (
                <div key={item.id} className="flex items-center justify-between py-4 text-sm gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800">{item.medicine?.medicine_name || 'Unnamed item'}</p>
                    <p className="text-xs text-slate-500 mt-1">Quantity {item.quantity} x {String.fromCharCode(8377)}{Number(item.unit_price).toFixed(2)} each</p>
                    {rxMed && (rxMed.dosage || rxMed.frequency || rxMed.duration) && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {rxMed.dosage && <span className="text-[9px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded"><span className="text-slate-400 uppercase mr-0.5">Dose</span>{rxMed.dosage}</span>}
                        {rxMed.frequency && <span className="text-[9px] font-bold text-orange-900 bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded"><span className="text-orange-700 uppercase mr-0.5">Freq</span>{rxMed.frequency}</span>}
                        {rxMed.duration && <span className="text-[9px] font-bold text-teal-700 bg-teal-50 border border-teal-100 px-1.5 py-0.5 rounded"><span className="text-teal-400 uppercase mr-0.5">For</span>{rxMed.duration}</span>}
                      </div>
                    )}
                  </div>
                  <p className="font-bold text-slate-800 shrink-0">{String.fromCharCode(8377)}{Number(item.subtotal).toFixed(2)}</p>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between bg-white px-4 py-4 border-t border-slate-200">
            <span className="text-sm font-bold text-slate-700">Total</span>
            <span className="text-xl font-black text-slate-900">{String.fromCharCode(8377)}{Number(order.total_amount).toFixed(2)}</span>
          </div>
        </section>

        {orderEndedBy(order) && orderEndedBy(order) !== 'you' && (
          <div role="status" className="rounded-xl border border-rose-200 bg-rose-50 p-3 space-y-1.5">
            <p className="text-sm font-bold text-rose-900">
              {orderEndedBy(order) === 'no-answer' ? "The pharmacy didn't respond in time, so this order was cancelled." : 'The pharmacy declined this order.'}
            </p>
            {orderEndedBy(order) === 'pharmacy' && order.cancellation_reason && <p className="text-xs text-rose-800">Reason: {order.cancellation_reason}</p>}
            <button onClick={() => navigate(order.pharmacy_request_id ? '/my-records' : '/pharmacy-orders/new')} className="px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs">
              {order.pharmacy_request_id ? 'Send the prescription to another pharmacy' : 'Order from another pharmacy'}
            </button>
          </div>
        )}

        {/* UX audit: a cancelled, previously-paid order used to show only "Cancelled" —
            with no indication of whether the money was ever refunded. A patient has no
            other way to know this; the status badge above only ever describes fulfillment,
            never payment/refund state. */}
        {order.payment_status === 'REFUND_PENDING' && (
          <div className="flex items-center gap-2 bg-amber-50 text-amber-700 text-xs font-semibold px-3 py-2.5 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Your refund of ₹{Number(order.total_amount).toFixed(2)} is being processed and will be credited to your original payment method shortly.
          </div>
        )}
        {order.payment_status === 'REFUNDED' && (
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-2.5 rounded-xl">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {refundText(`₹${Number(order.total_amount).toFixed(2)}`)}
          </div>
        )}

        {order.payment_method === 'CASH' && !['CANCELLED', 'FULFILLMENT_FAILED'].includes(order.status) && (
          <p className="text-xs font-medium text-slate-600 flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-3"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />{order.status === 'COMPLETED' ? `Cash paid at ${order.fulfillment_type === 'DELIVERY' ? 'delivery' : 'pickup'}.` : `Pay in person at ${order.fulfillment_type === 'DELIVERY' ? 'delivery' : 'pickup'} - nothing due online.`}</p>
        )}

        {CANCELLABLE.includes(order.status) && (
          <button onClick={handleCancel} disabled={cancelling} className="w-full py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs disabled:opacity-50">
            {cancelling ? 'Cancelling...' : 'Cancel Order'}
          </button>
        )}
      </div>

      {needsPayment && order.payment_method !== 'CASH' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payment</span>

          {declined && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0" /> {declined}
            </div>
          )}
          {payError && <p className="text-xs font-bold text-rose-600">{payError}</p>}

          <div className="grid grid-cols-4 gap-2">
            {([
              ['UPI', Smartphone], ['CARD', CreditCard], ['NET_BANKING', Building], ['WALLET', Wallet],
            ] as [PaymentMethod, React.ElementType][]).map(([m, Icon]) => (
              <button key={m} onClick={() => setPayMethod(m)} className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-[10px] font-bold ${payMethod === m ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-slate-200 text-slate-500'}`}>
                <Icon className="w-4 h-4" /> {m.replace('_', ' ')}
              </button>
            ))}
          </div>

          {payMethod === 'UPI' && (
            <input value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="yourname@upi" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold" />
          )}
          {payMethod === 'CARD' && (
            <div className="grid grid-cols-2 gap-2">
              <input value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="Card number" className="col-span-2 px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold" />
              <input value={cardName} onChange={(e) => setCardName(personNameInput(e.target.value))} placeholder="Cardholder name" className="col-span-2 px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold" />
            </div>
          )}

          <CancellationRefundPolicy service="pharmacy" className="mt-2" />

          <button onClick={handlePay} disabled={paying} className="w-full py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-sm">
            {paying ? 'Processing...' : `Pay ₹${Number(order.total_amount).toFixed(2)}`}
          </button>
        </div>
      )}
    </div>
  );
}
