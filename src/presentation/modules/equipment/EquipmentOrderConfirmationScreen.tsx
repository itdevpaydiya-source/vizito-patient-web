import MediaImage from '../../components/MediaImage';
import VizitoDialog from '../../components/dialogs/VizitoDialog';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  CheckCircle2,
  Package,
  Calendar,
  MapPin,
  Truck,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  AlertCircle,
  Clock,
  Info,
  CreditCard,
  X,
} from 'lucide-react';
import type { PatientRentalOrder, RentalOrderStatus, RentalPaymentStatus } from './types';
import {
  equipmentService,
  INFORMATIONAL_SECURITY_DEPOSIT_NOTICE,
} from './equipmentService';

export const EquipmentOrderConfirmationScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const location = useLocation();
  const returned = location.state?.order as PatientRentalOrder | undefined;
  const [order, setOrder] = useState<PatientRentalOrder | null>(returned && returned.id === id ? returned : null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError,setLoadError]=useState(false),[version,setVersion]=useState(0),[cancelOpen,setCancelOpen]=useState(false),[cancelReason,setCancelReason]=useState(''),[cancelBusy,setCancelBusy]=useState(false),[notice,setNotice]=useState('');

  useEffect(() => {
    if (returned && returned.id === id) { setOrder(returned); setLoading(false); return; }
    if (!id) { setLoading(false); return; }
    setLoading(true);setLoadError(false);
    equipmentService
      .getOrderById(id)
      .then((res) => {
        setOrder(res.order);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load confirmed order:', err);
        setLoadError(true);setLoading(false);
      });
  }, [id, returned,version]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8 font-sans">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-700">Verifying rental order confirmation...</p>
        </div>
      </div>
    );
  }

  if (loadError || !order) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full text-center space-y-4 shadow-sm">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Unable to load rental confirmation</h2>
          <p className="text-xs text-slate-500">
            We could not load this rental order. Try opening it from My orders.
          </p>
          <button
            type="button"
            onClick={() => setVersion(v=>v+1)}
            className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const getOrderStatusBadge = (status: RentalOrderStatus) => {
    switch (status) {
      case 'confirmed':
        return <span className="px-3 py-1 bg-sky-100 text-sky-800 rounded-xl text-xs font-extrabold">Order Confirmed</span>;
      case 'awaiting_confirmation':
        return <span className="px-3 py-1 bg-amber-100 text-amber-900 rounded-xl text-xs font-extrabold">Awaiting Depot Confirmation</span>;
      case 'payment_pending':
        return <span className="px-3 py-1 bg-orange-100 text-orange-900 rounded-xl text-xs font-extrabold">Payment Pending</span>;
      default:
        return <span className="px-3 py-1 bg-slate-100 text-slate-800 rounded-xl text-xs font-extrabold uppercase">{status}</span>;
    }
  };

  const fmtDay = (d: string) => (/^\d{4}-\d{2}-\d{2}/.test(String(d)) ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : d);

  const getPaymentStatusBadge = (status: RentalPaymentStatus) => {
    switch (status) {
      case 'successful':
        return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold">Payment Completed</span>;
      case 'pending':
        return <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold">Pay on delivery</span>;
      case 'failed':
        return <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-lg text-xs font-bold">Payment Failed</span>;
      default:
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold">Not Paid</span>;
    }
  };
  const canCancel=['awaiting_confirmation','payment_pending','confirmed'].includes(order.status);
  const cancel=async()=>{if(cancelBusy)return;setCancelBusy(true);setNotice('');const result=await equipmentService.cancelOrder(order.id,cancelReason.trim()||'Patient cancelled before dispatch');if(result.success){setNotice(result.message);setCancelOpen(false);const latest=await equipmentService.getOrderById(order.id);setOrder(latest.order);}else setNotice(result.message);setCancelBusy(false);};

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans">
      {/* 1. Header Navigation */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <nav className="flex items-center space-x-2 text-xs text-slate-500 font-medium">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="hover:text-teal-700 transition-colors"
            >
              Dashboard
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <button
              type="button"
              onClick={() => navigate('/equipment-rental/orders')}
              className="hover:text-teal-700 transition-colors"
            >
              My Rentals
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-teal-700 font-bold">Order Confirmation ({order.orderNumber})</span>
          </nav>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        {/* Success Banner */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center text-emerald-600 mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="text-xs font-extrabold text-teal-800 uppercase tracking-widest block">
              Equipment rental
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
              Rental confirmed
            </h1>
            <p className="text-sm font-bold text-slate-900">Order {order.orderNumber}</p>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Placed on{' '}
              {new Date(order.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {getOrderStatusBadge(order.status)}
            {getPaymentStatusBadge(order.paymentStatus)}
          </div>
        </div>

        {notice&&<p role="status" className={`rounded-xl border p-3 text-sm font-bold ${/refund|cancelled/i.test(notice)?'border-emerald-200 bg-emerald-50 text-emerald-900':'border-rose-200 bg-rose-50 text-rose-800'}`}>{notice}</p>}

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-black text-slate-900">Delivery timeline</h2>
          <ol className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">{order.deliveryTimeline.map((step,index)=><li key={`${step.title}-${index}`} className={`rounded-xl border p-3 ${step.completed?'border-teal-200 bg-teal-50':step.current?'border-orange-200 bg-orange-50':'border-slate-200 bg-slate-50'}`}><CheckCircle2 className={`h-5 w-5 ${step.completed?'text-teal-700':'text-slate-400'}`}/><b className="mt-2 block text-xs">{step.title}</b>{step.timestamp&&<small className="text-slate-500">{new Date(step.timestamp).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'numeric',minute:'2-digit'})}</small>}</li>)}</ol>
          {order.deliveryCode&&<div className="mt-4 rounded-xl border border-teal-200 bg-teal-50 p-4"><b>Delivery handover code</b><strong className="ml-4 text-2xl tracking-[.2em]">{order.deliveryCode}</strong><small className="ml-3 text-slate-600">Share only when the equipment is handed over.</small></div>}
          <div className="mt-4 flex flex-wrap gap-2"><button onClick={()=>navigate(`/equipment-rental/orders/${order.id}/track`)} className="rounded-xl border border-orange-600 px-4 py-2 text-sm font-bold text-orange-700">Track delivery</button><Link to={`/equipment-rental/orders/${order.id}`} className="rounded-xl border border-orange-600 px-4 py-2 text-sm font-bold text-orange-700">View rental details</Link>{canCancel&&<button onClick={()=>setCancelOpen(true)} className="rounded-xl border border-rose-600 px-4 py-2 text-sm font-bold text-rose-700"><X className="mr-1 inline h-4 w-4"/>Cancel order</button>}</div>
        </section>

        {/* 2-Column Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Equipment & Duration Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <h2 className="text-sm font-extrabold text-slate-900 pb-3 border-b border-slate-100">
              Equipment & Rental Period
            </h2>

            <div className="flex items-start gap-4">
              <MediaImage kind="equipment" category={order.mediaCategory}
                src={order.equipmentImage}
                name={order.equipmentName}
                className="w-20 h-20 rounded-xl object-cover border border-slate-200 shrink-0"
              />
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-slate-900">{order.equipmentName}</h3>
                <p className="text-xs text-slate-500 font-medium">Quantity: {order.quantity || 1} Unit</p>
                <p className="text-xs text-slate-500">₹{order.dailyRate} / day</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-teal-600" /> Start Date
                </span>
                <span className="font-bold text-slate-900">{fmtDay(order.startDate)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" /> Return Date
                </span>
                <span className="font-bold text-slate-900">{fmtDay(order.endDate)}</span>
              </div>
              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                <span className="text-slate-500">Rental Duration:</span>
                <span className="font-black text-teal-800">{order.durationDays} Days</span>
              </div>
            </div>

            {/* Delivery Address */}
            <div className="pt-2">
              <span className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-cyan-600" /> Delivery Address
              </span>
              <p className="text-xs font-semibold text-slate-900">{order.deliveryAddress.recipientName} ({order.deliveryAddress.phone})</p>
              <p className="text-xs text-slate-600 mt-0.5">
                {[order.deliveryAddress.addressLine, order.deliveryAddress.city, order.deliveryAddress.pincode].filter(Boolean).join(', ')}
              </p>
            </div>
          </div>

          {/* Financial Breakdown & Next Steps */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h2 className="text-sm font-extrabold text-slate-900 pb-3 border-b border-slate-100">
                Payment & Price Breakdown
              </h2>

              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Equipment Rental Fee ({order.durationDays}d × ₹{order.dailyRate})</span>
                  <span className="font-bold text-slate-900">₹{order.rentalFee.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-cyan-700" /> Delivery fee
                  </span>
                  <span className="font-bold text-slate-900">₹{order.deliveryFee}</span>
                </div>
                <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-sm">
                  <div>
                    <span className="font-extrabold text-slate-900 block">{order.onlinePayment ? 'Paid online:' : 'Amount payable on delivery:'}</span>
                    <span className="text-[10px] text-slate-400">Excludes security deposit</span>
                  </div>
                  <span className="text-xl font-black text-teal-800">
                    ₹{order.totalOrderValue.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {order.onlinePayment ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-0.5">
                  <p className="font-bold">
                    {order.onlinePayment.refund?.status === 'REFUND_STARTED'
                      ? `Refund of ₹${order.onlinePayment.refund.amount.toLocaleString('en-IN')} started — it reaches your account in 5–7 working days.`
                      : order.onlinePayment.refund?.status === 'REFUND_FAILED'
                        ? `Your refund of ₹${order.onlinePayment.refund.amount.toLocaleString('en-IN')} is being processed. We retry automatically; then it takes 5–7 working days.`
                        : `Paid by ${String(order.onlinePayment.method).replace('_', ' ').toLowerCase()} on ${new Date(order.onlinePayment.paidAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}.`}
                  </p>
                  <p className="text-emerald-800/80">Payment ID: {order.onlinePayment.reference}. Full refund if you cancel before dispatch.</p>
                </div>
              ) : order.paymentStatus === 'successful' ? (
                <p className="text-sm font-bold text-slate-700">Paid on delivery.</p>
              ) : (
                <p className="text-sm font-bold text-slate-700">Nothing charged online.</p>
              )}
              {/* Informational Security Deposit Notice */}
              <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <Info className="w-3.5 h-3.5 shrink-0 text-amber-700" />
                  <span>Security Deposit Notice</span>
                </div>
                <p>{INFORMATIONAL_SECURITY_DEPOSIT_NOTICE}</p>
              </div>
            </div>

            {/* Next Steps Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Next steps
              </h3>
              <div className="space-y-2 text-xs text-slate-600">
                <p>Follow the provider's updates in My orders for delivery and return arrangements.</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => navigate(`/equipment-rental/orders/${order.id}/track`)}
                  className="flex-1 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-colors text-center shadow-2xs"
                >
                  Track delivery
                </button>
                <Link to="/equipment-rental/orders" className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors text-center">My orders</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      {cancelOpen&&<VizitoDialog title="Cancel rental order" onClose={()=>setCancelOpen(false)}><p className="text-sm text-slate-600">Online payments are refunded automatically when cancellation succeeds before dispatch.</p><label className="mt-3 block text-sm font-bold">Reason<textarea value={cancelReason} onChange={e=>setCancelReason(e.target.value.slice(0,300))} className="mt-1 w-full rounded-xl border p-3" rows={3}/></label><div className="mt-4 flex justify-end gap-2"><button onClick={()=>setCancelOpen(false)} className="rounded-xl border px-4 py-2">Keep rental</button><button disabled={cancelBusy} onClick={cancel} className="rounded-xl bg-rose-700 px-4 py-2 font-bold text-white">{cancelBusy?'Cancelling…':'Cancel rental'}</button></div></VizitoDialog>}
    </div>
  );
};

export default EquipmentOrderConfirmationScreen;
