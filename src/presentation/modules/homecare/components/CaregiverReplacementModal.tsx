import React, { useState } from 'react';
import { X, UserX, Clock, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { hcRequestReplacementApi } from '../../../../services/homecareHelper';

interface CaregiverReplacementModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  currentStaffName?: string;
  onSuccess: (replacement: any) => void;
}

const REASON_OPTIONS = [
  { code: 'LANGUAGE', label: 'Language / communication barrier', desc: 'Patient prefers Telugu, Hindi or other dialect' },
  { code: 'PUNCTUALITY', label: 'Punctuality / late or absent', desc: 'Arriving late or unannounced absence' },
  { code: 'SKILL', label: 'Clinical / technical skill level', desc: 'Needs higher training for bed transfers, vitals or catheter' },
  { code: 'BEHAVIOUR', label: 'Bedside manner / interpersonal mismatch', desc: 'Patient comfort or friction' },
  { code: 'HEALTH', label: 'Caregiver unwell / emergency leave', desc: 'Caregiver informed they need time off' },
  { code: 'OTHER', label: 'Other reason', desc: 'Family preference or schedule change' },
];

export default function CaregiverReplacementModal({
  isOpen,
  onClose,
  orderId,
  currentStaffName = 'Current Caregiver',
  onSuccess,
}: CaregiverReplacementModalProps) {
  const [reasonCode, setReasonCode] = useState<string>('LANGUAGE');
  const [reasonText, setReasonText] = useState<string>('Patient prefers a caregiver fluent in native Telugu.');
  const [transition, setTransition] = useState<'SMOOTH' | 'IMMEDIATE'>('SMOOTH');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (reasonText.trim().length < 10) {
      setError('Please provide a reason with at least 10 characters.');
      return;
    }

    setLoading(true);
    try {
      const rep = await hcRequestReplacementApi(orderId, {
        reason_code: reasonCode,
        reason_text: reasonText.trim(),
        transition,
      });
      onSuccess(rep);
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(' ') : msg || 'Unable to request caregiver change.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Request Caregiver Replacement"
        className="bg-white rounded-3xl max-w-lg w-full border border-slate-100 shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1 pr-10">
            <UserX className="w-4 h-4 shrink-0" />
            <span>Caregiver Change Guarantee</span>
          </div>
          <h2 className="text-xl font-black">Request a Different Caregiver</h2>
          <p className="text-slate-300 text-xs mt-1">
            Currently assigned: <b>{currentStaffName}</b>. Your comfort and trust are paramount. We arrange a qualified replacement without interruption of care.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div role="alert" className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium">
            {error}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Reason Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Reason for Caregiver Change
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {REASON_OPTIONS.map((opt) => (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => {
                    setReasonCode(opt.code);
                    if (!reasonText || reasonText.startsWith('Patient prefers')) {
                      setReasonText(`Regarding ${opt.label.toLowerCase()}: `);
                    }
                  }}
                  className={`text-left p-2.5 rounded-xl border transition ${
                    reasonCode === opt.code
                      ? 'bg-teal-50 border-teal-600 text-teal-900 font-bold ring-2 ring-teal-600/20'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-bold">{opt.label}</div>
                  <div className="text-[10px] text-slate-500 font-normal mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Reason Textarea */}
          <div>
            <label htmlFor="lt-replacement-reason-text" className="block text-xs font-bold text-slate-700 mb-1">
              Details for Care Coordinator <span className="text-rose-600">* (min 10 characters)</span>
            </label>
            <textarea
              id="lt-replacement-reason-text"
              rows={3}
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder="Please describe why you would like a change so we can select the most suitable caregiver..."
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10"
              required
            />
            <div className="text-[10px] text-slate-400 text-right mt-0.5">
              Min 10 characters ({reasonText.trim().length} chars)
            </div>
          </div>

          {/* Handover Preference */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Handover Preference
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTransition('SMOOTH')}
                className={`p-3 rounded-xl border text-left transition ${
                  transition === 'SMOOTH'
                    ? 'border-teal-600 bg-teal-50 text-teal-950 font-bold ring-2 ring-teal-600/20'
                    : 'border-slate-200 text-slate-700'
                }`}
              >
                <div className="text-xs font-bold">Smooth Handover</div>
                <div className="text-[10px] text-slate-500 font-normal mt-0.5">Current caregiver continues until substitute arrives (Recommended)</div>
              </button>

              <button
                type="button"
                onClick={() => setTransition('IMMEDIATE')}
                className={`p-3 rounded-xl border text-left transition ${
                  transition === 'IMMEDIATE'
                    ? 'border-amber-600 bg-amber-50 text-amber-950 font-bold ring-2 ring-amber-600/20'
                    : 'border-slate-200 text-slate-700'
                }`}
              >
                <div className="text-xs font-bold text-amber-900">Stop Immediately</div>
                <div className="text-[10px] text-slate-500 font-normal mt-0.5">Stop current caregiver now; family manages until replacement arrives</div>
              </button>
            </div>
          </div>

          {/* SLA Assurance */}
          <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl text-xs text-teal-900 flex items-start gap-2">
            <Clock className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <b>48-Hour Guarantee:</b> The agency guarantees a verified replacement within <b>48 hours</b> at zero additional transfer fee.
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              data-testid="submit-replacement-btn"
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition"
            >
              {loading ? 'Submitting Request...' : 'Confirm Replacement Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
