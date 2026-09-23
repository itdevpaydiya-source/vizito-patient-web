import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, AlertCircle, RotateCcw, CheckCircle2, XCircle, Store, Truck, CreditCard, Smartphone, Building, Wallet, Stethoscope } from 'lucide-react';
import { getMyOrderApi, cancelOrderApi, payOrderApi, getPharmacyRequestsApi } from '../../../services/pharmacyOrderHelper';
import { getPrescriptionsApi, type PatientPrescription, type PrescriptionMedicine } from '../../../services/patientHelper';
import { formatDoctorName } from '../../../utils/doctorLabel';
import type { PatientOrder } from '../../../services/types';
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

export default function OrderDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<PatientOrder | null>(null);
  const [prescription, setPrescription] = useState<PatientPrescription | null>(null);
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
      setOrder(await cancelOrderApi(order.id, 'Cancelled by patient'));
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
    return <div className="max-w-2xl mx-auto py-16 text-center"><div className="w-7 h-7 border-[3px] border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>;
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

  const meta = statusMeta[order.status] || { label: order.status, className: 'bg-slate-100 text-slate-600' };
  const needsPayment = order.status === 'CREATED' || order.status === 'AWAITING_PAYMENT';

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-16">
      <button onClick={() => navigate('/pharmacy-orders')} className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-2 rounded-xl">
        <ArrowLeft className="w-4 h-4" /> Back to Orders
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              {order.fulfillment_type === 'DELIVERY' ? <Truck className="w-4.5 h-4.5" /> : <Store className="w-4.5 h-4.5" />}
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">{order.fulfillment_type === 'DELIVERY' ? 'Delivery' : 'Pickup'}</p>
              <p className="text-[11px] text-slate-400">{new Date(order.created_at).toLocaleString()}</p>
            </div>
          </div>
          <span className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg ${meta.className}`}>{meta.label}</span>
        </div>

        {prescription && (
          <div className="flex items-start gap-2.5 bg-purple-50/60 border border-purple-100 rounded-xl px-3.5 py-3">
            <Stethoscope className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-purple-800">
                Prescribed by {formatDoctorName(prescription.doctor?.name) || 'your doctor'}
              </p>
              {prescription.diagnosis && <p className="text-purple-600 font-medium mt-0.5">For: {prescription.diagnosis}</p>}
            </div>
          </div>
        )}

        <div className="divide-y divide-slate-100 border-t border-slate-100">
          {order.items.map((item) => {
            const rxMed = prescription ? findMedicineDetails(item.medicine?.medicine_name, prescription.medicines) : null;
            return (
              <div key={item.id} className="flex items-center justify-between py-2.5 text-sm gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800">{item.medicine?.medicine_name || 'Medicine'}</p>
                  <p className="text-[11px] text-slate-400">Qty {item.quantity} × ₹{Number(item.unit_price).toFixed(2)}</p>
                  {rxMed && (rxMed.dosage || rxMed.frequency || rxMed.duration) && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {rxMed.dosage && (
                        <span className="text-[9px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                          <span className="text-slate-400 uppercase mr-0.5">Dose</span>{rxMed.dosage}
                        </span>
                      )}
                      {rxMed.frequency && (
                        <span className="text-[9px] font-bold text-purple-700 bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded">
                          <span className="text-purple-400 uppercase mr-0.5">Freq</span>{rxMed.frequency}
                        </span>
                      )}
                      {rxMed.duration && (
                        <span className="text-[9px] font-bold text-teal-700 bg-teal-50 border border-teal-100 px-1.5 py-0.5 rounded">
                          <span className="text-teal-400 uppercase mr-0.5">For</span>{rxMed.duration}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <p className="font-bold text-slate-700 shrink-0">₹{Number(item.subtotal).toFixed(2)}</p>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <span className="text-sm font-bold text-slate-600">Total</span>
          <span className="text-lg font-black text-slate-800">₹{Number(order.total_amount).toFixed(2)}</span>
        </div>

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
            ₹{Number(order.total_amount).toFixed(2)} has been refunded to your original payment method.
          </div>
        )}

        {order.payment_method === 'CASH' && (
          <p className="text-[11px] text-slate-400 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-teal-500" /> Pay at {order.fulfillment_type === 'DELIVERY' ? 'delivery' : 'pickup'} — nothing to pay online.</p>
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
              <input value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder="Cardholder name" className="col-span-2 px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold" />
            </div>
          )}

          <button onClick={handlePay} disabled={paying} className="w-full py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-sm">
            {paying ? 'Processing...' : `Pay ₹${Number(order.total_amount).toFixed(2)}`}
          </button>
        </div>
      )}
    </div>
  );
}
