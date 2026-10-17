import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Truck,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  ShieldCheck,
  AlertCircle,
  Info,
  Package,
  Sparkles,
} from 'lucide-react';
import type { PatientRentalOrder } from './types';
import { equipmentService } from './equipmentService';

export const DeliveryTrackingScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<PatientRentalOrder | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    equipmentService
      .getOrderById(id)
      .then((data) => {
        setOrder(data.order);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to get tracking details:', err);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-700">Connecting to depot delivery tracking...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full text-center space-y-4 shadow-sm">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Tracking Info Not Found</h2>
          <p className="text-xs text-slate-500">
            No delivery shipment records found for order ID "{id}".
          </p>
          <button
            type="button"
            onClick={() => navigate('/equipment-rental/orders')}
            className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

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
            <span className="text-teal-700 font-bold">Delivery Tracking ({order.orderNumber})</span>
          </nav>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        <button
          type="button"
          onClick={() => navigate(`/equipment-rental/orders/${order.id}`)}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-teal-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Order Details
        </button>

        {/* Header Summary */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-700 shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold text-teal-800 uppercase tracking-wider block">
                Doorstep Delivery & Handover
              </span>
              <h1 className="text-xl font-black text-slate-900">{order.equipmentName}</h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Reference: <span className="font-mono text-slate-800 font-bold">{order.orderNumber}</span>
              </p>
            </div>
          </div>

          <span className="px-3 py-1 bg-cyan-100 text-cyan-800 rounded-xl text-xs font-extrabold self-start sm:self-auto flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {order.status === 'out_for_delivery' ? 'Out for Delivery' : 'Preparing for Dispatch'}
          </span>
        </div>

        {/* Honest Logistics Disclaimer */}
        <div className="p-4 bg-cyan-50/70 border border-cyan-200/80 rounded-2xl flex items-start gap-3 shadow-2xs">
          <Info className="w-5 h-5 text-cyan-700 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-700 leading-relaxed">
            <span className="font-bold text-cyan-900">Logistics Tracking Notice:</span> Real-time GPS driver
            telemetry and automated SMS OTP verification will activate once carrier logistics endpoints are integrated.
            Our depot team is coordinating your scheduled delivery via standard telephone confirmation.
          </div>
        </div>

        {/* Detailed Timeline */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <h2 className="text-sm font-extrabold text-slate-900 pb-3 border-b border-slate-100">
            Handover Milestones
          </h2>

          <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {order.deliveryTimeline.map((step, idx) => (
              <div key={idx} className="relative">
                {/* Dot */}
                <div
                  className={`absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 rounded-full flex items-center justify-center ${
                    step.completed
                      ? 'bg-emerald-600 text-white'
                      : step.current
                      ? 'bg-teal-600 text-white ring-4 ring-teal-100 animate-pulse'
                      : 'bg-white border-2 border-slate-300 text-slate-300'
                  }`}
                >
                  {step.completed ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-current" />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3
                      className={`text-xs font-bold ${
                        step.completed || step.current ? 'text-slate-900' : 'text-slate-400'
                      }`}
                    >
                      {step.title}
                    </h3>
                    {step.timestamp && (
                      <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                        {step.timestamp}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-medium">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Handover Checklist Info */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
            <ShieldCheck className="w-4 h-4 text-teal-700" /> What to Expect During Handover
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <span className="text-xs font-bold text-slate-800 block">1. Operational Demonstration</span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Our technician will unpack the unit, connect accessories, and demonstrate power operation in your room.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <span className="text-xs font-bold text-slate-800 block">2. Clinical Quality Verification</span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Oxygen concentrators and suction units undergo pre-delivery purity calibration sign-off with you.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <span className="text-xs font-bold text-slate-800 block">3. Handover Receipt & Care Guide</span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                You will receive a printed quick-start guide, safety manual, and emergency technical support number.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <span className="text-xs font-bold text-slate-800 block">4. Security Deposit Notice</span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                A refundable security deposit may be collected and refunded directly by the rental provider. It is separate from the rental price and is not included in the total order value.
              </p>
            </div>
          </div>
        </div>

        {/* Recipient Address Confirmation */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Delivery Destination
            </span>
            <p className="text-xs font-bold text-slate-900">
              {order.deliveryAddress.recipientName} ({order.deliveryAddress.phone})
            </p>
            <p className="text-xs text-slate-600">
              {order.deliveryAddress.addressLine}, {order.deliveryAddress.city} - {order.deliveryAddress.pincode}
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/help')}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors shrink-0"
          >
            Need Help with Delivery?
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeliveryTrackingScreen;
