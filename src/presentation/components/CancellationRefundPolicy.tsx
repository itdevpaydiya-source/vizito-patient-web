import React from 'react';
import { ShieldAlert, Info, RotateCcw, CheckCircle, Clock } from 'lucide-react';

export type PolicyService = 'doctor' | 'lab' | 'homecare' | 'pharmacy';

interface Props {
  service: PolicyService;
  className?: string;
  compact?: boolean;
}

const POLICY_DETAILS: Record<
  PolicyService,
  {
    title: string;
    points: { icon: React.ElementType; title: string; desc: string }[];
    serverRef: string;
  }
> = {
  doctor: {
    title: 'Consultation Cancellation & Refund Policy',
    points: [
      {
        icon: CheckCircle,
        title: '100% Refund Before Visit',
        desc: 'Cancel anytime before your scheduled appointment start time for a full 100% refund.',
      },
      {
        icon: Clock,
        title: 'Non-Cancellable Once Time Passes',
        desc: 'Once your appointment start time arrives or consultation begins, the booking cannot be cancelled.',
      },
      {
        icon: RotateCcw,
        title: 'Refund to Source',
        desc: 'Online payments go back to your original payment method, usually within 5–7 working days. If it can’t go back automatically, Vizito support completes it. Pay-at-clinic bookings have no cancellation charge.',
      },
    ],
    serverRef: 'appointments.service.ts:496-505, 587-606',
  },
  lab: {
    title: 'Lab Test Cancellation & Refund Policy',
    points: [
      {
        icon: CheckCircle,
        title: '100% Refund Before Sample Collection',
        desc: 'Cancel anytime before your sample is taken for a full 100% refund of all tests and home fees.',
      },
      {
        icon: Clock,
        title: 'Non-Cancellable After Sample Is Collected',
        desc: 'Once any sample is collected by the technician or centre, the test order enters processing and cannot be cancelled.',
      },
      {
        icon: RotateCcw,
        title: 'Refund to your payment method',
        desc: 'Online payments go back to your bank, card or UPI, usually within 5–7 working days. If a refund can’t go back automatically, Vizito support completes it and tells you. Pay-at-centre orders have nothing to refund.',
      },
    ],
    serverRef: 'lab-workflow.service.ts:160-177',
  },
  homecare: {
    title: 'Home Care Cancellation & Refund Policy',
    points: [
      {
        icon: CheckCircle,
        title: '100% Refund for Unused Visits',
        desc: 'Cancel anytime before service begins. All unused visits or shifts are refunded in full.',
      },
      {
        icon: Clock,
        title: 'Late Cancellation On The Way',
        desc: 'For prepaid bookings, if you cancel after the professional has set out (on the way), a late fee of half of one visit (at most ₹300) is kept and the rest is refunded. Pay-at-visit bookings have no fee.',
      },
      {
        icon: ShieldAlert,
        title: 'Non-Cancellable Once Arrived',
        desc: 'Once the professional arrives at your door or care is in progress, the current visit cannot be cancelled.',
      },
    ],
    serverRef: 'homecare-visits.service.ts:18-19, 346-373',
  },
  pharmacy: {
    title: 'Pharmacy Order Cancellation & Refund Policy',
    points: [
      {
        icon: CheckCircle,
        title: '100% Refund Before Dispensing',
        desc: 'Cancel free of charge with a 100% refund while your order is awaiting payment or before packing.',
      },
      {
        icon: Clock,
        title: 'Non-Cancellable Once In Fulfillment',
        desc: 'Once the licensed pharmacy starts processing or dispensing your medications, orders cannot be cancelled.',
      },
      {
        icon: RotateCcw,
        title: 'Automatic Payment Reversal',
        desc: 'Prepaid orders receive a full refund credited to your original payment method. Unpaid orders are cancelled with zero fee.',
      },
    ],
    serverRef: 'orders.service.ts:401-416',
  },
};

export default function CancellationRefundPolicy({ service, className = '', compact = false }: Props) {
  const policy = POLICY_DETAILS[service];

  if (compact) {
    return (
      <div className={`rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs space-y-1.5 ${className}`} data-testid="cancellation-policy">
        <p className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
          <Info className="w-3.5 h-3.5 text-teal-600 shrink-0" />
          {policy.title}
        </p>
        <ul className="space-y-1 text-slate-600 text-[11px] leading-relaxed">
          {policy.points.map((pt, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="text-teal-600 font-bold shrink-0">•</span>
              <span>
                <strong className="text-slate-700">{pt.title}:</strong> {pt.desc}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl bg-gradient-to-br from-slate-50 to-teal-50/20 border border-teal-100 p-4 sm:p-5 space-y-3 shadow-2xs ${className}`}
      data-testid="cancellation-policy"
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5">
        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-teal-600 shrink-0" />
          {policy.title}
        </h4>
        <span className="text-[10px] font-bold text-teal-800 bg-teal-100/60 px-2 py-0.5 rounded-full">
          Guaranteed
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {policy.points.map((pt, i) => {
          const Icon = pt.icon;
          return (
            <div key={i} className="bg-white/80 rounded-xl p-3 border border-slate-100 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Icon className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span className="truncate">{pt.title}</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">{pt.desc}</p>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-slate-400 font-medium text-right">
        Vizito Patient Guarantee · Fair cancellation rules enforced server-side
      </p>
    </div>
  );
}
