import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Pill, Clock, AlertCircle, RotateCcw, ChevronRight, Plus, XCircle, CheckCircle2, Truck, Store, Stethoscope } from 'lucide-react';
import { getMyOrdersApi } from '../../../services/pharmacyOrderHelper';
import { getPharmacyRequestsApi, cancelPharmacyRequestApi } from '../../../services/pharmacyOrderHelper';
import { getPrescriptionsApi, getProvidersApi, type PatientPrescription } from '../../../services/patientHelper';
import type { PatientOrder, PharmacyRequestItem, OrderStatus } from '../../../services/types';

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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Pharmacy Orders</h2>
          <p className="text-slate-500 mt-1 text-sm">Order medicines and track fulfillment.</p>
        </div>
        <button
          onClick={() => navigate('/pharmacy-orders/new')}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shrink-0"
        >
          <Plus className="w-4 h-4" /> New Order
        </button>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setTab('orders')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 -mb-px transition-colors ${tab === 'orders' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          My Orders {orders.length > 0 && <span className="ml-1 text-slate-400">({orders.length})</span>}
        </button>
        <button
          onClick={() => setTab('requests')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 -mb-px transition-colors ${tab === 'requests' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Pharmacy Requests {openRequests.length > 0 && <span className="ml-1 text-amber-600">({openRequests.length} pending)</span>}
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-20 text-center shadow-xs">
          <div className="w-7 h-7 border-[3px] border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orders.map((o) => {
              const meta = orderStatusMeta[o.status] || { label: o.status, className: 'bg-slate-100 text-slate-600' };
              const [firstItem, ...restItems] = o.items;
              const medicineSummary = firstItem
                ? `${firstItem.medicine?.medicine_name || 'Medicine'}${restItems.length > 0 ? ` +${restItems.length} more` : ''}`
                : 'No items';
              return (
                <button
                  key={o.id}
                  onClick={() => navigate(`/pharmacy-orders/${o.id}`)}
                  className="text-left bg-white rounded-2xl border border-slate-200 shadow-xs p-5 hover:border-teal-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                        {o.fulfillment_type === 'DELIVERY' ? <Truck className="w-4.5 h-4.5" /> : <Store className="w-4.5 h-4.5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 text-sm truncate">{medicineSummary}</p>
                        <p className="text-[11px] text-slate-400 font-medium">{new Date(o.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                  </div>
                  <span className={`inline-block text-[10px] font-bold px-2 py-1 rounded-lg ${meta.className}`}>{meta.label}</span>
                  <p className="text-right font-black text-slate-800 text-sm mt-3">₹{Number(o.total_amount).toFixed(2)}</p>
                </button>
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
        <div className="space-y-3">
          {requests.map((r) => {
            const meta = requestStatusMeta[r.status] || { label: r.status, className: 'bg-slate-100 text-slate-600', icon: Clock };
            const Icon = meta.icon;
            const prescription = prescriptionsById.get(r.prescription_id);
            const [firstMed, ...restMeds] = prescription?.medicines || [];
            const medicineSummary = firstMed
              ? `${firstMed.name || 'Medicine'}${restMeds.length > 0 ? ` +${restMeds.length} more` : ''}`
              : 'Prescription';
            const pharmacyName = pharmacyNameById.get(r.pharmacy_partner_id) || 'Pharmacy';
            return (
              <div key={r.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0"><Pill className="w-4.5 h-4.5" /></div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-800 text-sm truncate">{medicineSummary}</p>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium mt-0.5">
                    <Stethoscope className="w-3 h-3 shrink-0" />
                    <span className="truncate">To {pharmacyName} · Sent {new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  {prescription?.diagnosis && <p className="text-[11px] text-slate-400 mt-0.5 truncate">For: {prescription.diagnosis}</p>}
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg mt-1.5 ${meta.className}`}>
                    <Icon className="w-3 h-3" /> {meta.label}
                  </span>
                  {r.reject_reason && <p className="text-[11px] text-slate-400 mt-1">{r.reject_reason}</p>}
                </div>
                {r.status === 'Requested' && (
                  <button
                    onClick={() => handleCancelRequest(r.id)}
                    disabled={cancellingId === r.id}
                    className="text-[11px] font-bold text-rose-600 hover:underline shrink-0 disabled:opacity-50"
                  >
                    {cancellingId === r.id ? 'Cancelling...' : 'Cancel'}
                  </button>
                )}
                {r.status === 'Accepted' && !r.order_id && (
                  <button
                    onClick={() => navigate(`/pharmacy-orders/new?pharmacyRequestId=${r.id}`)}
                    className="text-[11px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg shrink-0"
                  >
                    Build Order
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const EmptyState: React.FC<{ title: string; body: string }> = ({ title, body }) => (
  <div className="bg-white rounded-2xl border border-slate-200 py-20 text-center shadow-xs space-y-4">
    <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 mx-auto">
      <Pill className="w-8 h-8" />
    </div>
    <div className="space-y-1">
      <h3 className="font-bold text-slate-700 text-lg">{title}</h3>
      <p className="text-slate-400 text-sm max-w-md mx-auto">{body}</p>
    </div>
  </div>
);
