import { useState, useEffect, useCallback } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import IllustratedEmpty from '../../components/illustrations/IllustratedEmpty';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Pill, Clock, AlertCircle, RotateCcw, ChevronRight, Plus, XCircle, CheckCircle2, Truck, Store, Stethoscope } from 'lucide-react';
import { getMyOrdersApi } from '../../../services/pharmacyOrderHelper';
import { getPharmacyRequestsApi, cancelPharmacyRequestApi } from '../../../services/pharmacyOrderHelper';
import { getPrescriptionsApi, getProvidersApi, type PatientPrescription } from '../../../services/patientHelper';
import { orderEndedBy, type PatientOrder, type PharmacyRequestItem, type OrderStatus } from '../../../services/types';

type Tab = 'orders' | 'requests';

const orderStatusMeta: Record<OrderStatus, { label: string; className: string }> = {
  CREATED: { label: 'Awaiting confirmation', className: 'bg-slate-100 text-slate-600' },
  AWAITING_PAYMENT: { label: 'Payment required', className: 'bg-amber-50 text-amber-700' },
  PAID: { label: 'Paid — awaiting pharmacy', className: 'bg-sky-50 text-sky-700' },
  PROCESSING: { label: 'Pharmacy is preparing your order', className: 'bg-amber-50 text-amber-700' },
  READY_FOR_PICKUP: { label: 'Ready for pickup', className: 'bg-emerald-50 text-emerald-700' },
  OUT_FOR_DELIVERY: { label: 'Out for delivery', className: 'bg-emerald-50 text-emerald-700' },
  COMPLETED: { label: 'Completed', className: 'bg-slate-100 text-slate-500' },
  CANCELLED: { label: 'Cancelled', className: 'bg-rose-50 text-rose-600' },
  FULFILLMENT_FAILED: { label: 'Could not be fulfilled', className: 'bg-rose-50 text-rose-600' },
};

const requestStatusMeta: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  Requested: { label: 'Waiting for pharmacy', className: 'bg-amber-50 text-amber-700', icon: Clock },
  Accepted: { label: 'Accepted — build your order', className: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
  Rejected: { label: 'Declined by pharmacy', className: 'bg-rose-50 text-rose-600', icon: XCircle },
  Expired: { label: 'No response in time', className: 'bg-slate-100 text-slate-500', icon: Clock },
  Cancelled: { label: 'Cancelled', className: 'bg-slate-100 text-slate-500', icon: XCircle },
};

export default function PharmacyOrdersScreen() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion() ?? false;
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: Tab = searchParams.get('tab') === 'requests' ? 'requests' : 'orders';

  const [orders, setOrders] = useState<PatientOrder[]>([]);
  const [requests, setRequests] = useState<PharmacyRequestItem[]>([]);
  // A bare request row only carries prescription_id/pharmacy_partner_id — with several
  // pending requests, every card looked identical (status + a generic pill icon, nothing
  // to tell them apart). Resolved once here so each card can show the real medicine(s)
  // and pharmacy name instead.
  const [prescriptionsById, setPrescriptionsById] = useState<Map<string, PatientPrescription>>(new Map());
  const [pharmacyNameById, setPharmacyNameById] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [o, r, prescriptions, pharmacies] = await Promise.all([
        getMyOrdersApi(),
        getPharmacyRequestsApi(),
        getPrescriptionsApi().catch(() => []),
        getProvidersApi('pharmacy').catch(() => []),
      ]);
      setOrders(o);
      setRequests(r);
      setPrescriptionsById(new Map(prescriptions.map((p) => [p.id, p])));
      setPharmacyNameById(new Map(pharmacies.map((p) => [p.id, p.name])));
    } catch {
      setError('Unable to load your pharmacy orders. Please try again.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setTab = (t: Tab) => setSearchParams(t === 'requests' ? { tab: 'requests' } : {});

  const handleCancelRequest = async (id: string) => {
    setCancellingId(id);
    try {
      await cancelPharmacyRequestApi(id);
      await load();
    } catch { /* non-fatal — list stays as-is, user can retry */ }
    finally { setCancellingId(null); }
  };

  const openRequests = requests.filter((r) => r.status === 'Requested' || (r.status === 'Accepted' && !r.order_id));

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.28, ease: 'easeOut' }}
      className="space-y-6 pb-12"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-orange-800 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-600" /> Medication care
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Pharmacy orders</h1>
          <p className="text-slate-500 mt-1 text-sm">Order medicines and follow each pharmacy update.</p>
        </div>
        <button
          onClick={() => navigate('/pharmacy-orders/new')}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-800 hover:bg-orange-900 text-white font-bold text-xs shrink-0 shadow-sm motion-safe:transition-all motion-safe:duration-200 motion-reduce:transition-none hover:shadow-md active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" /> Place an order
        </button>
      </div>

      <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-100/80 p-1.5" role="group" aria-label="Pharmacy order category">
        <button
          onClick={() => setTab('orders')}
          aria-pressed={tab === 'orders'}
          className={`flex-1 flex items-center justify-center gap-2 px-3 sm:px-4 py-3 rounded-xl text-xs sm:text-sm font-bold motion-safe:transition-all motion-safe:duration-200 motion-reduce:transition-none ${tab === 'orders' ? 'bg-white text-orange-900 shadow-sm' : 'text-slate-600 hover:bg-white/60'}`}
        >
          <Store className={`w-4 h-4 ${tab === 'orders' ? 'text-orange-800' : 'text-slate-500'}`} />
          My Orders <span className={`rounded-full px-2 py-0.5 text-[10px] ${tab === 'orders' ? 'bg-orange-50 text-orange-900' : 'bg-white/70 text-slate-500'}`}>{orders.length}</span>
        </button>
        <button
          onClick={() => setTab('requests')}
          aria-pressed={tab === 'requests'}
          className={`flex-1 flex items-center justify-center gap-2 px-3 sm:px-4 py-3 rounded-xl text-xs sm:text-sm font-bold motion-safe:transition-all motion-safe:duration-200 motion-reduce:transition-none ${tab === 'requests' ? 'bg-white text-orange-900 shadow-sm' : 'text-slate-600 hover:bg-white/60'}`}
        >
          <Pill className={`w-4 h-4 ${tab === 'requests' ? 'text-orange-800' : 'text-slate-500'}`} />
          Requests <span className={`rounded-full px-2 py-0.5 text-[10px] ${openRequests.length ? 'bg-amber-50 text-amber-800' : tab === 'requests' ? 'bg-orange-50 text-orange-900' : 'bg-white/70 text-slate-500'}`}>{requests.length}</span>
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-20 text-center shadow-xs">
          <div className="w-7 h-7 border-[3px] border-orange-700 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 font-medium text-sm">Loading...</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-20 text-center shadow-xs space-y-3">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <p className="text-rose-600 font-semibold text-sm">{error}</p>
          <button onClick={load} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl">
            <RotateCcw className="w-4 h-4" /> Retry
          </button>
        </div>
      ) : tab === 'orders' ? (
        orders.length === 0 ? (
          <EmptyState
            title="No orders yet"
            body="Send a prescription to a pharmacy, or search for medicines directly, to place your first order."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            {orders.map((o, index) => {
              const ended = orderEndedBy(o);
              const meta = ended === 'pharmacy' ? { label: 'Declined by pharmacy', className: 'bg-rose-50 text-rose-600' }
                : ended === 'no-answer' ? { label: "Pharmacy didn't respond", className: 'bg-rose-50 text-rose-600' }
                : orderStatusMeta[o.status] || { label: o.status, className: 'bg-slate-100 text-slate-600' };
              const [firstItem, ...restItems] = o.items;
              const medicineSummary = firstItem
                ? `${firstItem.medicine?.medicine_name || 'Unnamed item'}${restItems.length > 0 ? ` +${restItems.length} more` : ''}`
                : 'No items';
              const pharmacyName = pharmacyNameById.get(o.pharmacy_partner_id) || 'Pharmacy';
              const fulfillmentLabel = o.fulfillment_type === 'DELIVERY' ? 'Delivery' : 'Pickup';
              return (
                <motion.button
                  key={o.id}
                  type="button"
                  initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.24, delay: reduceMotion ? 0 : Math.min(index * 0.04, 0.2), ease: 'easeOut' }}
                  whileHover={reduceMotion ? undefined : { y: -2 }}
                  onClick={() => navigate(`/pharmacy-orders/${o.id}`)}
                  className="group text-left bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:border-orange-200 hover:shadow-md motion-safe:transition-[border-color,box-shadow] motion-safe:duration-200 motion-reduce:transition-none flex flex-col h-full min-h-[17rem]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-orange-50 border border-orange-100 text-orange-800 flex items-center justify-center shrink-0">
                        {o.fulfillment_type === 'DELIVERY' ? <Truck className="w-5 h-5" /> : <Store className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Order #{String(o.id).slice(0, 8).toUpperCase()}</p>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">{new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                    </div>
                    <span className={`max-w-[48%] text-right text-[10px] leading-4 font-bold px-2.5 py-1.5 rounded-xl ${meta.className}`}>{meta.label}</span>
                  </div>
                  <div className="mt-5 min-w-0">
                    <h3 className="font-extrabold text-slate-900 text-base leading-5 line-clamp-2">{medicineSummary}</h3>
                    <p className="text-xs text-slate-500 mt-1">{o.items.length} {o.items.length === 1 ? 'medicine' : 'medicines'}</p>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Pharmacy</p>
                      <p className="text-xs font-bold text-slate-800 truncate mt-0.5">{pharmacyName}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Fulfillment</p>
                      <p className="text-xs font-bold text-slate-800 flex items-center gap-1 mt-0.5">{o.fulfillment_type === 'DELIVERY' ? <Truck className="w-3.5 h-3.5 text-orange-700" /> : <Store className="w-3.5 h-3.5 text-orange-700" />}{fulfillmentLabel}</p>
                    </div>
                  </div>
                  <div className="mt-auto pt-4 flex items-center justify-between gap-3">
                    <div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Order total</p><p className="font-black text-slate-900 text-base mt-0.5">₹{Number(o.total_amount).toFixed(2)}</p></div>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-900">View details <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 motion-safe:transition-transform motion-reduce:transition-none" /></span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )
      ) : requests.length === 0 ? (
        <EmptyState
          title="No pharmacy requests yet"
          body="Send one of your prescriptions to a pharmacy from Medical Records to get started."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          {requests.map((r, index) => {
            const meta = requestStatusMeta[r.status] || { label: r.status, className: 'bg-slate-100 text-slate-600', icon: Clock };
            const Icon = meta.icon;
            const prescription = prescriptionsById.get(r.prescription_id);
            const [firstMed, ...restMeds] = prescription?.medicines || [];
            const medicineSummary = firstMed
              ? `${firstMed.name || 'Unnamed item'}${restMeds.length > 0 ? ` +${restMeds.length} more` : ''}`
              : 'Prescription';
            const pharmacyName = pharmacyNameById.get(r.pharmacy_partner_id) || 'Pharmacy';
            const canResend = (r.status === 'Rejected' || r.status === 'Expired') && !requests.some((x) => x.prescription_id === r.prescription_id && ['Requested', 'Accepted'].includes(x.status));
            return (
              <motion.article
                key={r.id}
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.24, delay: reduceMotion ? 0 : Math.min(index * 0.04, 0.2), ease: 'easeOut' }}
                whileHover={reduceMotion ? undefined : { y: -2 }}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-orange-200 motion-safe:transition-[border-color,box-shadow] motion-safe:duration-200 motion-reduce:transition-none p-5 flex flex-col h-full min-h-[17rem]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-orange-50 border border-orange-100 text-orange-800 flex items-center justify-center shrink-0"><Pill className="w-5 h-5" /></div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Prescription request</p>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">Sent {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-[10px] leading-4 font-bold px-2.5 py-1.5 rounded-xl ${meta.className}`}><Icon className="w-3 h-3" />{meta.label}</span>
                </div>
                <div className="mt-5 flex-1 min-w-0">
                  <h3 className="font-extrabold text-slate-900 text-base leading-5 line-clamp-2">{medicineSummary}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold mt-2">
                    <Stethoscope className="w-3.5 h-3.5 text-orange-700 shrink-0" />
                    <span className="truncate">Sent to {pharmacyName}</span>
                  </div>
                  {prescription?.diagnosis && <p className="text-xs text-slate-500 mt-2 line-clamp-2"><span className="font-bold text-slate-600">For:</span> {prescription.diagnosis}</p>}
                  {r.reject_reason && <p className="text-xs text-rose-700 mt-2 rounded-lg bg-rose-50 border border-rose-100 px-3 py-2">{r.reject_reason}</p>}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col min-[420px]:flex-row min-[420px]:items-center justify-end gap-2 min-h-[3.25rem]">
                  {r.status === 'Requested' && (
                    <button
                      onClick={() => handleCancelRequest(r.id)}
                      disabled={cancellingId === r.id}
                      className="w-full min-[420px]:w-auto text-xs font-bold text-rose-700 border border-rose-200 bg-white hover:bg-rose-50 px-3.5 py-2 rounded-xl disabled:opacity-50 motion-safe:transition-colors motion-reduce:transition-none"
                    >
                      {cancellingId === r.id ? 'Cancelling...' : 'Cancel request'}
                    </button>
                  )}
                  {r.status === 'Accepted' && !r.order_id && (
                    <button
                      onClick={() => navigate(`/pharmacy-orders/new?pharmacyRequestId=${r.id}`)}
                      className="w-full min-[420px]:w-auto text-xs font-bold text-white bg-orange-800 hover:bg-orange-900 px-4 py-2.5 rounded-xl shadow-sm motion-safe:transition-colors motion-reduce:transition-none"
                    >
                      Build order <ChevronRight className="inline w-4 h-4 ml-1" />
                    </button>
                  )}
                  {r.order_id && (
                    <button onClick={() => navigate(`/pharmacy-orders/${r.order_id}`)} className="w-full min-[420px]:w-auto text-xs font-bold text-white bg-orange-800 hover:bg-orange-900 px-4 py-2.5 rounded-xl shadow-sm motion-safe:transition-colors motion-reduce:transition-none">
                      View order <ChevronRight className="inline w-4 h-4 ml-1" />
                    </button>
                  )}
                  {canResend && (
                    <button onClick={() => navigate('/my-records')} className="w-full min-[420px]:w-auto text-xs font-bold text-orange-900 border border-orange-200 bg-orange-50 hover:bg-orange-100 px-3.5 py-2 rounded-xl motion-safe:transition-colors motion-reduce:transition-none">
                      Choose another pharmacy
                    </button>
                  )}
                </div>
              </motion.article>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

const EmptyState: React.FC<{ title: string; body: string }> = ({ title, body }) => <IllustratedEmpty art="pharmacy" title={title} body={body} />;
