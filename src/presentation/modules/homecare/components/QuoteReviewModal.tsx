import React, { useState } from 'react';
import { X, CheckCircle2, AlertTriangle, FileText, ShieldCheck, Clock, ArrowRight, XCircle, CreditCard, Sparkles } from 'lucide-react';
import { hcQuoteAcceptApi, hcQuoteDeclineApi, type HcQuote, type HcOrder } from '../../../../services/homecareHelper';
import CancellationRefundPolicy from '../../../components/CancellationRefundPolicy';
import { validateUpiId } from '../../../../utils/validators/india';

interface QuoteReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: HcQuote;
  onAccepted: (order: HcOrder) => void;
  onDeclined: () => void;
}

export default function QuoteReviewModal({
  isOpen,
  onClose,
  quote,
  onAccepted,
  onDeclined,
}: QuoteReviewModalProps) {
  const [paymentMode, setPaymentMode] = useState<'UPI' | 'CASH'>('UPI');
  const [upiId, setUpiId] = useState<string>(''); // the patient types their own UPI ID — never pre-fill one
  const [showDeclinePrompt, setShowDeclinePrompt] = useState<boolean>(false);
  const [declineReason, setDeclineReason] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !quote) return null;

  const isSuperseded = quote.status === 'SUPERSEDED';
  const isAccepted = quote.status === 'ACCEPTED';
  const isDeclined = quote.status === 'DECLINED';
  const isExpired = quote.status === 'EXPIRED';
  const isActionable = quote.status === 'SENT';

  const handleAcceptAndPay = async () => {
    setError(null);
    if (paymentMode === 'UPI') {
      const upiRes = validateUpiId(upiId);
      if (!upiRes.ok) {
        setError(upiRes.message);
        return;
      }
    }

    setLoading(true);
    try {
      const payload: any = {
        payment_mode: paymentMode,
      };
      if (paymentMode === 'UPI') {
        payload.payment = {
          payment_method: 'UPI',
          upi_id: upiId.trim(),
        };
      }
      const order = await hcQuoteAcceptApi(quote.id, payload);
      onAccepted(order);
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(' ') : msg || 'Unable to accept quote. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    setError(null);
    if (declineReason.trim().length < 5) {
      setError('Please provide a reason for declining this quote (at least 5 characters).');
      return;
    }

    setLoading(true);
    try {
      await hcQuoteDeclineApi(quote.id, declineReason.trim());
      onDeclined();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(' ') : msg || 'Unable to decline quote.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Care Quotation Review"
        className="bg-white rounded-3xl max-w-2xl w-full border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-800 to-slate-900 text-white p-5 sm:p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-teal-300 text-xs font-bold uppercase tracking-wider mb-1">
            <FileText className="w-4 h-4" />
            <span>Official Healthcare Estimate</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black">
            Care Quote #{quote.quote_number} (v{quote.version})
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-1">
            {quote.service?.name} · {quote.shifts_per_cycle} Shifts (1st Billing Cycle)
          </p>
        </div>

        {/* Status Alert if not actionable */}
        {!isActionable && (
          <div className={`mx-6 mt-4 p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2.5 ${
            isAccepted
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : isSuperseded
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              {isAccepted
                ? 'This quote has been accepted and payment processed.'
                : isSuperseded
                ? 'This quote has been superseded by a revised care quote.'
                : isDeclined
                ? 'This quote was declined.'
                : 'This quote has expired.'}
            </span>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div role="alert" className="mx-6 mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800 font-medium">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="min-w-0 break-words">{error}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Breakdown Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-slate-200 pb-3">
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Care Package & Shifts
                </div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {quote.service?.name}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500 font-medium">Shift Timing</div>
                <div className="text-xs font-bold text-slate-800">{quote.start_time ? `${quote.start_time} start` : 'Start time to be confirmed'}</div>
              </div>
            </div>

            {/* Calculations Table */}
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-slate-700">
                <span>Rate per shift</span>
                <span className="font-semibold">₹{quote.rate_per_shift.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span>Shifts in billing cycle ({quote.cycle_days || 14} days)</span>
                <span className="font-semibold">{quote.shifts_per_cycle} shifts</span>
              </div>
              <div className="flex justify-between items-center font-bold text-slate-800 pt-2 border-t border-slate-200">
                <span>Subtotal</span>
                <span>₹{quote.subtotal.toLocaleString('en-IN')}</span>
              </div>

              {/* GST Specification Line */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1 text-slate-700">
                <div className="flex justify-between font-semibold">
                  <span>Goods & Services Tax (GST)</span>
                  <span className={quote.tax?.rate === 0 ? 'text-emerald-700 font-bold' : 'font-bold'}>
                    {quote.tax?.rate === 0 ? '0% (Exempt)' : `+${quote.tax?.rate}% (₹${quote.gst_amount.toLocaleString('en-IN')})`}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
                  <span>SAC Code: <b>{quote.tax?.sac}</b></span>
                  <span>Reason: {quote.tax?.reason}</span>
                  {quote.tax?.rate > 0 && (
                    <span>CGST: ₹{quote.tax?.cgst} · SGST: ₹{quote.tax?.sgst}</span>
                  )}
                </div>
              </div>

              {/* Total Advance */}
              <div className="flex justify-between items-center text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                <span>Total Advance Deposit Required</span>
                <span className="text-lg text-teal-800 font-black">
                  ₹{quote.total.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Inclusions & Validity */}
          <div className="space-y-2 text-xs">
            {quote.includes && (
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-emerald-950">
                <b className="block text-[11px] uppercase tracking-wider text-emerald-800 mb-1">
                  What's Included in this Shift Care
                </b>
                <p className="leading-relaxed font-medium">{quote.includes}</p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-slate-500 text-[11px] px-1">
              <span>Valid until: <b>{new Date(quote.valid_until).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</b></span>
              <span>100% Refundable for unperformed shifts</span>
            </div>
          </div>

          {/* Cancellation Policy Display */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50">
            <CancellationRefundPolicy service="homecare" />
          </div>

          {/* Payment Selection (if actionable) */}
          {isActionable && !showDeclinePrompt && (
            <div className="space-y-3 pt-2">
              <p id="lt-quote-payment-method" className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                Select Payment Method for First Cycle
              </p>
              <div role="group" aria-labelledby="lt-quote-payment-method" className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPaymentMode('UPI')}
                  className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition ${
                    paymentMode === 'UPI'
                      ? 'border-teal-600 bg-teal-50 text-teal-950 font-bold ring-2 ring-teal-600/20'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-teal-700" />
                  <div>
                    <div className="text-xs font-bold">UPI / QR Payment</div>
                    <div className="text-[10px] text-slate-500 font-normal">GPay, PhonePe, Paytm</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMode('CASH')}
                  className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition ${
                    paymentMode === 'CASH'
                      ? 'border-teal-600 bg-teal-50 text-teal-950 font-bold ring-2 ring-teal-600/20'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <Clock className="w-4 h-4 text-teal-700" />
                  <div>
                    <div className="text-xs font-bold">Pay to Care Manager</div>
                    <div className="text-[10px] text-slate-500 font-normal">Cash on start of shift</div>
                  </div>
                </button>
              </div>

              {paymentMode === 'UPI' && (
                <div>
                  <label htmlFor="lt-quote-upi-id" className="block text-xs font-bold text-slate-700 mb-1">
                    UPI ID (Virtual Payment Address)
                  </label>
                  <input
                    id="lt-quote-upi-id"
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. mobile@upi or username@okaxis"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10"
                    required
                  />
                </div>
              )}
            </div>
          )}

          {/* Decline Form Prompt */}
          {showDeclinePrompt && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-rose-900 text-xs font-bold">
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Decline Care Quote</span>
              </div>
              <label htmlFor="lt-quote-decline-reason" className="sr-only">Reason for declining this quote</label>
              <textarea
                id="lt-quote-decline-reason"
                rows={2}
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Please tell us why you are declining (e.g. Rate higher than expected, timings not matching, alternate care arranged)..."
                className="w-full rounded-xl border border-rose-300 p-2.5 text-xs text-slate-800 focus:border-rose-600 focus:ring-4 focus:ring-rose-600/10"
                required
              />
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeclinePrompt(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleDecline}
                  className="px-4 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition disabled:opacity-50"
                >
                  {loading ? 'Declining...' : 'Confirm Decline'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          {isActionable && !showDeclinePrompt ? (
            <>
              <button
                type="button"
                onClick={() => setShowDeclinePrompt(true)}
                className="text-rose-700 hover:text-rose-800 font-bold text-xs px-3 py-2 transition"
              >
                Decline Quote
              </button>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition"
                >
                  Later
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleAcceptAndPay}
                  data-testid="accept-and-pay-btn"
                  className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs px-4 sm:px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition"
                >
                  <span className="min-w-0 break-words">{loading ? 'Processing...' : `Accept & Pay ₹${quote.total.toLocaleString('en-IN')}`}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
