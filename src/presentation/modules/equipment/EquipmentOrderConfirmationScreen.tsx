import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import type { PatientRentalOrder, RentalOrderStatus, RentalPaymentStatus } from './types';
import {
  equipmentService,
  INFORMATIONAL_SECURITY_DEPOSIT_NOTICE,
} from './equipmentService';

export const EquipmentOrderConfirmationScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<PatientRentalOrder | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    equipmentService
      .getOrderById(id)
      .then((res) => {
        setOrder(res.order);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load confirmed order:', err);
        setLoading(false);
      });
  }, [id]);

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

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full text-center space-y-4 shadow-sm">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Order Confirmation Unavailable</h2>
          <p className="text-xs text-slate-500">
            No verified rental order record exists for reference "{id}".
          </p>
          <button
            type="button"
            onClick={() => navigate('/equipment-rental')}
            className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Browse Equipment Catalogue
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

  const getPaymentStatusBadge = (status: RentalPaymentStatus) => {
    switch (status) {
      case 'successful':
        return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold">Payment Completed</span>;
      case 'pending':
        return <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold">Payment Pending Authorization</span>;
      case 'failed':
        return <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-lg text-xs font-bold">Payment Failed</span>;
      default:
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold">Not Paid</span>;
    }
  };

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
              Equipment Rental Confirmed
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
              Order {order.orderNumber}
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Registered with Vizito Medical Equipment Depot on{' '}
              {new Date(order.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {getOrderStatusBadge(order.status)}
            {getPaymentStatusBadge(order.paymentStatus)}
          </div>
        </div>

        {/* 2-Column Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Equipment & Duration Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <h2 className="text-sm font-extrabold text-slate-900 pb-3 border-b border-slate-100">
              Equipment & Rental Period
            </h2>

            <div className="flex items-start gap-4">
              <img
                src={order.equipmentImage || '/equipment/hospital-bed.jpg'}
                alt={order.equipmentName}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/equipment/hospital-bed.jpg';
                }}
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
                <span className="font-bold text-slate-900">{order.startDate}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" /> Return Date
                </span>
                <span className="font-bold text-slate-900">{order.endDate}</span>
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
                {order.deliveryAddress.addressLine}, {order.deliveryAddress.city} - {order.deliveryAddress.pincode}
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
                    <Truck className="w-3.5 h-3.5 text-cyan-700" /> Logistics & Setup Fee
                  </span>
                  <span className="font-bold text-slate-900">₹{order.deliveryFee}</span>
                </div>
                <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-sm">
                  <div>
                    <span className="font-extrabold text-slate-900 block">Total Order Value</span>
                    <span className="text-[10px] text-slate-400">Excludes security deposit</span>
                  </div>
                  <span className="text-xl font-black text-teal-800">
                    ₹{order.totalOrderValue.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

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
                Next Steps in Supported Workflow
              </h3>
              <div className="space-y-2 text-xs text-slate-600">
                <p>1. <strong>Clinical Sterilization:</strong> Our bioengineers chemically sanitize and calibrate this device.</p>
                <p>2. <strong>Doorstep Delivery:</strong> Technician delivers and performs on-site test and demonstration.</p>
                <p>3. <strong>Return Collection:</strong> When your term ends, request return pickup for depot quarantine and inspection.</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => navigate(`/equipment-rental/orders/${order.id}/track`)}
                  className="flex-1 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-colors text-center shadow-2xs"
                >
                  Track Handover Fleet
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/equipment-rental/orders')}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors text-center"
                >
                  View All Orders
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EquipmentOrderConfirmationScreen;
