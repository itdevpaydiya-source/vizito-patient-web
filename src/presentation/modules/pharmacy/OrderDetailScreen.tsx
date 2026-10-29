import VizitoDialog from '../../components/dialogs/VizitoDialog';
import { useEffect, useRef } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { getMyOrderApi } from '../../../services/pharmacyOrderHelper';
import type { PatientPrescription, PrescriptionMedicine } from '../../../services/patientHelper';
import type { PatientOrder } from '../../../services/types';

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

export const CANCELLABLE = ['CREATED', 'AWAITING_PAYMENT', 'PAID'];

// Where the order is in its life, as the patient thinks of it.
export const stepIndex = (status: string) => {
  if (status === 'CREATED' || status === 'AWAITING_PAYMENT') return 0;
  if (status === 'PAID') return 1;
  if (status === 'PROCESSING') return 2;
  if (status === 'READY_FOR_PICKUP' || status === 'OUT_FOR_DELIVERY') return 3;
  if (status === 'COMPLETED') return 4;
  return -1;
};

export { default } from './PharmacyOrderDetailV2';

export function OrderTimeline({ order }: { order: PatientOrder }) {
        return stepIndex(order.status) >= 0 ? (
          <ol className="grid grid-cols-5 gap-1 pt-2 sm:pt-4" aria-label="Order progress">
            {[
              'Placed',
              order.payment_status === 'PAID' ? 'Paid' : 'Payment',
              'Being packed',
              order.fulfillment_type === 'DELIVERY' ? 'On the way' : 'Ready to collect',
              order.fulfillment_type === 'DELIVERY' ? 'Delivered' : 'Collected',
            ].map((label, i) => {
              const current = order.status === 'PAID' && order.payment_status !== 'PAID' ? 0 : stepIndex(order.status);
              const done = i <= current && !(i === 1 && order.payment_method !== 'CASH' && order.payment_status !== 'PAID');
              return (
                <li key={label} aria-current={i === current ? 'step' : undefined} className="relative flex flex-col items-center gap-2 text-center">
                  {i < 4 && <span aria-hidden="true" className={`absolute left-[calc(50%_+_12px)] right-[calc(-50%_+_12px)] top-2.5 h-px ${i < current ? 'bg-orange-400' : 'bg-slate-200'}`} />}{done ? <CheckCircle2 className="relative z-10 h-5 w-5 rounded-full bg-white text-orange-600" /> : <Circle className="relative z-10 h-5 w-5 rounded-full bg-white text-slate-300" />}
                  <span className={`text-[10px] sm:text-xs font-semibold leading-tight ${done ? 'text-slate-800' : 'text-slate-400'}`}>{label}</span>
                </li>
              );
            })}
          </ol>
        ) : null;
}

export const orderMoney = (value: unknown) => value !== null && value !== undefined && String(value).trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0 ? `INR ${Number(value).toFixed(2)}` : 'Price not provided';
export function OrderSummaryTable({order, prescription}: {order: PatientOrder; prescription: PatientPrescription | null}) {
  return (
        <section className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-5" aria-label="Order items">
          <div className="flex items-center justify-between px-1 pb-4">
            <h2 className="text-sm font-extrabold text-slate-900">Order summary</h2>
            <span className="text-xs font-semibold text-slate-500">{(order.items || []).length} {(order.items || []).length === 1 ? 'item' : 'items'}</span>
          </div>
          <div className="rounded-xl border border-slate-200"><table className="block w-full text-left text-sm sm:table"><caption className="sr-only">Ordered medicines, quantities and prices</caption><thead className="hidden bg-slate-50 text-xs text-slate-500 sm:table-header-group"><tr><th scope="col" className="min-w-[130px] p-3 font-medium">Item</th><th scope="col" className="p-3 text-center font-medium">Quantity</th><th scope="col" className="p-3 text-right font-medium">Unit price</th><th scope="col" className="p-3 text-right font-medium">Total</th></tr></thead><tbody className="block divide-y divide-slate-100 sm:table-row-group">
            {(order.items || []).map((item) => {
              const rxMed = prescription ? findMedicineDetails(item.medicine?.medicine_name, prescription.medicines) : null;
              return (
                <tr key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 p-3 sm:table-row sm:p-0"><td className="min-w-0 sm:p-3">
                  <div className="min-w-0">
                    <p className="break-words font-semibold text-slate-800">{item.medicine?.medicine_name || 'Unnamed item'}</p><p className="mt-1 text-xs text-slate-500 sm:hidden">{item.quantity} {'\u00d7'} {orderMoney(item.unit_price)}</p>
                    
                    {rxMed && (rxMed.dosage || rxMed.frequency || rxMed.duration) && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {rxMed.dosage && <span className="text-[9px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded"><span className="text-slate-400 uppercase mr-0.5">Dose</span>{rxMed.dosage}</span>}
                        {rxMed.frequency && <span className="text-[9px] font-bold text-orange-900 bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded"><span className="text-orange-700 uppercase mr-0.5">Freq</span>{rxMed.frequency}</span>}
                        {rxMed.duration && <span className="text-[9px] font-bold text-teal-700 bg-teal-50 border border-teal-100 px-1.5 py-0.5 rounded"><span className="text-teal-400 uppercase mr-0.5">For</span>{rxMed.duration}</span>}
                      </div>
                    )}
                  </div>
                  </td><td className="hidden p-3 text-center tabular-nums sm:table-cell">{item.quantity}</td><td className="hidden p-3 text-right whitespace-nowrap tabular-nums sm:table-cell">{orderMoney(item.unit_price)}</td><td className="text-right whitespace-nowrap font-bold tabular-nums sm:p-3">{orderMoney(item.subtotal)}</td></tr>
              );
            })}
          </tbody><tfoot className="block sm:table-footer-group"><tr className="flex items-center justify-between gap-3 border-t border-slate-200 sm:table-row"><th scope="row" colSpan={3} className="p-3 font-bold">Total</th><td className="p-3 text-right whitespace-nowrap text-lg font-black tabular-nums">{orderMoney(order.total_amount)}</td></tr></tfoot></table></div>
        </section>
  );
}

export const onlinePaymentNeeded = (order: PatientOrder) => order.payment_method !== 'CASH' && ['CREATED', 'AWAITING_PAYMENT'].includes(order.status) && ['PENDING', 'FAILED'].includes(order.payment_status);
export function OrderRefundPolicy() {
  return <p className="text-xs leading-relaxed text-slate-500">You can cancel before the pharmacy starts fulfillment. Cancelling a paid order starts a refund request; completion is shown in the order payment status.</p>;
}
export function CancelOrderDialog({open,busy,onKeep,onConfirm}:{open:boolean;busy:boolean;onKeep:()=>void;onConfirm:()=>void}){return open?<VizitoDialog title="Cancel this order?" onClose={()=>{if(!busy)onKeep();}} footer={<><button type="button" disabled={busy} onClick={onKeep} className="booking-button">Keep order</button><button type="button" disabled={busy} onClick={onConfirm} className="booking-button primary">{busy?'Cancelling?':'Cancel order'}</button></>}><p>The pharmacy will be notified.</p></VizitoDialog>:null;}

export const paymentMethodLabel = (method: string) => ({UPI:'UPI',CARD:'Card',NET_BANKING:'Net banking',WALLET:'Wallet',CASH:'Cash'}[method] || method);
export const refundedMessage = (order: PatientOrder) => `Refunded ${orderMoney(order.total_amount)}${order.payment_method ? ` to your ${paymentMethodLabel(order.payment_method)}` : ''}`;
export function cancelledByYouText(order: PatientOrder): string | null {
  if (order.status !== 'CANCELLED' || !order.cancelled_by || !order.patient_id || order.cancelled_by !== order.patient_id || !order.cancelled_at) return null;
  const date = new Date(order.cancelled_at);
  if (!Number.isFinite(date.getTime())) return null;
  return `Cancelled by you on ${date.toLocaleString('en-IN', {day:'2-digit',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'})}`;
}
/** Three background refreshes, two seconds apart. Stop on settlement or navigation. */
export function startRefundRefresh(orderId: string, onOrder: (order: PatientOrder) => void) {
  let cancelled = false, attempts = 0;
  let timer: ReturnType<typeof setTimeout>;
  const refresh = async () => {
    if (cancelled) return;
    attempts++;
    let pending = true;
    try {
      const latest = await getMyOrderApi(orderId);
      if (cancelled) return;
      pending = latest.payment_status === 'REFUND_PENDING';
      onOrder(latest);
    } catch { /* Keep the last known refund status; a failed read is not a refund failure. */ }
    if (!cancelled && pending && attempts < 3) timer = setTimeout(refresh, 2000);
  };
  timer = setTimeout(refresh, 2000);
  return () => { cancelled = true; clearTimeout(timer); };
}
