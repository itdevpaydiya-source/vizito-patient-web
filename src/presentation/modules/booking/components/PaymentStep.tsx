import React, { useState } from 'react';
import {
  CreditCard,
  QrCode,
  Building,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Lock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import type { HealthcareServiceOption, ProviderItem } from '../../../../mocks/universalBookingMocks';

interface PaymentStepProps {
  service: HealthcareServiceOption;
  provider: ProviderItem;
  amount: number;
  onPaymentSuccess: () => void;
  onBack: () => void;
}

type PaymentMethod = 'UPI' | 'Credit Card' | 'Debit Card' | 'Net Banking';
type ErrorSimType = 'NONE' | 'PAYMENT_FAILED' | 'SLOT_UNAVAILABLE' | 'PROVIDER_UNAVAILABLE';

export const PaymentStep: React.FC<PaymentStepProps> = ({
  service,
  provider,
  amount,
  onPaymentSuccess,
  onBack
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('UPI');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorSimState, setErrorSimState] = useState<ErrorSimType>('NONE');
  const [activeError, setActiveError] = useState<string | null>(null);

  const handlePayNow = () => {
    setActiveError(null);
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);

      if (errorSimState === 'PAYMENT_FAILED') {
        setActiveError('Payment failed. Please check your banking credentials and try again.');
        return;
      }

      if (errorSimState === 'SLOT_UNAVAILABLE') {
        setActiveError('Selected time slot is no longer available. Please select another slot.');
        return;
      }

      if (errorSimState === 'PROVIDER_UNAVAILABLE') {
        setActiveError('Selected provider is currently unavailable. Please select another provider.');
        return;
      }

      // Success
      onPaymentSuccess();
    }, 1200);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
      <div>
        <span className="text-teal-600 font-bold text-xs uppercase tracking-wider">
          Step 6 — Secure Payment
        </span>
        <h2 className="text-2xl font-black text-slate-800 mt-0.5">Payment</h2>
        <p className="text-slate-500 text-sm mt-1">
          Complete payment to confirm your booking for {service.name}.
        </p>
      </div>

      {activeError && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 text-rose-800 space-y-2 animate-in fade-in">
          <div className="flex items-center gap-2 font-extrabold text-base">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{activeError}</span>
          </div>
          <p className="text-xs text-rose-600 font-medium pl-7">
            You can click "Try Again" or select a different payment option.
          </p>
          <div className="pt-2 pl-7">
            <button
              onClick={handlePayNow}
              className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Payment Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Methods Selection */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-extrabold text-slate-800 text-base">Select Payment Method</h3>

          <div className="space-y-3">
            {[
              {
                id: 'UPI' as const,
                title: 'UPI (GPay, PhonePe, Paytm, BHIM)',
                desc: 'Instant 0% fee digital payment',
                icon: QrCode
              },
              {
                id: 'Credit Card' as const,
                title: 'Credit Card',
                desc: 'Visa, Mastercard, RuPay, Amex',
                icon: CreditCard
              },
              {
                id: 'Debit Card' as const,
                title: 'Debit Card',
                desc: 'All major Indian bank cards',
                icon: CreditCard
              },
              {
                id: 'Net Banking' as const,
                title: 'Net Banking',
                desc: 'HDFC, ICICI, SBI, Axis, Kotak & 50+ banks',
                icon: Building
              }
            ].map((method) => {
              const isSelected = selectedMethod === method.id;
              const IconComp = method.icon;

              return (
                <div
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  className={`bg-white rounded-2xl border p-4 flex items-center justify-between cursor-pointer transition-all ${
                    isSelected
                      ? 'border-teal-600 ring-2 ring-teal-600/20 bg-teal-50/20 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isSelected ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300'
                      }`}
                    >
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>

                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                      <IconComp className="w-5 h-5" />
                    </div>

                    <div>
                      <h4 className="font-extrabold text-slate-800 text-sm">{method.title}</h4>
                      <p className="text-xs text-slate-500 font-medium">{method.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Test Simulator Bar */}
          <div className="bg-slate-100 rounded-xl p-4 border border-slate-200 mt-4">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-2">
              🧪 Test Simulator — Trigger Error State
            </span>
            <div className="flex flex-wrap gap-2 text-xs">
              {[
                { id: 'NONE' as const, label: 'Normal Success' },
                { id: 'PAYMENT_FAILED' as const, label: 'Simulate Payment Failed' },
                { id: 'SLOT_UNAVAILABLE' as const, label: 'Simulate Slot Not Available' },
                { id: 'PROVIDER_UNAVAILABLE' as const, label: 'Simulate Provider Unavailable' }
              ].map((sim) => (
                <button
                  key={sim.id}
                  type="button"
                  onClick={() => setErrorSimState(sim.id)}
                  className={`px-3 py-1.5 rounded-lg font-bold border transition-colors ${
                    errorSimState === sim.id
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {sim.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Order Summary Box */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 h-fit space-y-4 shadow-xs">
          <h3 className="font-extrabold text-slate-800 text-base pb-3 border-b border-slate-100">
            Payment Summary
          </h3>

          <div className="space-y-2.5 text-xs font-semibold text-slate-600">
            <div className="flex items-center justify-between">
              <span>{service.name} Base Price</span>
              <span className="text-slate-800">₹{amount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>GST & Platform Fee</span>
              <span className="text-emerald-600 font-bold">FREE</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="font-black text-slate-800 text-sm">Amount Payable</span>
            <span className="font-black text-teal-700 text-2xl">₹{amount}</span>
          </div>

          <button
            onClick={handlePayNow}
            disabled={isProcessing}
            className={`w-full py-3.5 rounded-xl font-extrabold text-sm transition-all flex items-center justify-center gap-2 shadow-xs ${
              isProcessing
                ? 'bg-slate-400 text-white cursor-not-allowed'
                : 'bg-teal-600 hover:bg-teal-700 text-white active:scale-98'
            }`}
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Processing Payment...
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" /> Pay Now ₹{amount}
              </>
            )}
          </button>

          <p className="text-[11px] text-center text-slate-400 font-medium flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" /> 256-bit Encrypted SSL Gateway
          </p>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <button
          onClick={onBack}
          disabled={isProcessing}
          className="px-5 py-2.5 rounded-xl border border-slate-300 font-bold text-sm text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Back
        </button>
      </div>
    </div>
  );
};
