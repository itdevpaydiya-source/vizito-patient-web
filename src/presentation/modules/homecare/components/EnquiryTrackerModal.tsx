import VizitoDialog from '../../../components/dialogs/VizitoDialog';
import React from 'react';
import { X, Clock, Calendar, CheckCircle2, AlertTriangle, FileText, PhoneCall, ShieldAlert, Sparkles, ChevronRight } from 'lucide-react';
import type { HcEnquiry, HcQuote } from '../../../../services/homecareHelper';

interface EnquiryTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  enquiry: HcEnquiry;
  onReviewQuote?: (quote: any) => void;
  onOpenQuote?: (quote: any) => void;
}

const TIMELINE_STEPS = [
  { key: 'NEW', label: 'Enquiry Received', hint: 'Care manager notified' },
  { key: 'CALLED', label: 'Phone Consultation', hint: 'Needs reviewed' },
  { key: 'ASSESSMENT_SCHEDULED', label: 'Home Assessment Booked', hint: 'In-person clinical evaluation' },
  { key: 'ASSESSED', label: 'Assessment Completed', hint: 'Care plan formulated' },
  { key: 'QUOTED', label: 'Custom Quote Ready', hint: 'Review shift pricing & GST' },
  { key: 'ACCEPTED', label: 'Care Confirmed', hint: 'First billing cycle booked' },
];

export default function EnquiryTrackerModal({
  isOpen,
  onClose,
  enquiry,
  onReviewQuote,
}: EnquiryTrackerModalProps) {
  if (!isOpen || !enquiry) return null;

  const currentIdx = TIMELINE_STEPS.findIndex((s) => s.key === enquiry.status);
  const activeQuote = enquiry.quotes?.find((q) => q.status === 'SENT');

  return (
    <VizitoDialog title="Care Onboarding Progress" onClose={onClose} className="portal-migrated">
{/* Header */}

<div className="bg-slate-900 text-white p-5 sm:p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Clock className="w-4 h-4" />
            <span>Enquiry #{enquiry.enquiry_number}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black">{enquiry.agency?.name || 'Home Care Agency'}</h2>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="text-xs bg-teal-500/20 text-teal-300 border border-teal-500/30 font-bold px-2.5 py-1 rounded-full">
              {enquiry.care_type_label || enquiry.care_type}
            </span>
            <span className="text-xs bg-slate-800 text-slate-300 font-medium px-2.5 py-1 rounded-full">
              {enquiry.shift_label || enquiry.shift_pattern}
            </span>
            <span className="text-xs bg-slate-800 text-slate-300 font-medium px-2.5 py-1 rounded-full">
              {enquiry.duration_days} days from {enquiry.start_date}
            </span>
          </div>
        </div>

{/* Modal Content */}

<div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Status Alert Banner */}
          {enquiry.status === 'NEW' && (
            <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
              enquiry.callback_overdue
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-teal-50 border-teal-200 text-teal-900'
            }`}>
              <PhoneCall className={`w-5 h-5 shrink-0 mt-0.5 ${enquiry.callback_overdue ? 'text-amber-600' : 'text-teal-600'}`} />
              <div>
                <b className="block text-xs font-black uppercase tracking-wider">
                  {enquiry.callback_overdue ? 'Call Priority Queue' : 'Care Manager Callback Due'}
                </b>
                <p className="text-xs mt-0.5 leading-relaxed">
                  {enquiry.callback_overdue
                    ? `Our coordinator is following up on this enquiry urgently. We prioritize all incoming requests within 30 minutes.`
                    : `A dedicated clinical coordinator will call your registered phone to discuss ${enquiry.patient?.name}'s medical condition before confirming visits.`}
                </p>
              </div>
            </div>
          )}

          {/* Active Quote Highlight Banner */}
          {activeQuote && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-300 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white grid place-items-center shadow-sm shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                    Care Quote Ready: #{activeQuote.quote_number}
                  </div>
                  <div className="text-xs text-emerald-800 font-medium mt-0.5">
                    ₹{activeQuote.rate_per_shift.toLocaleString('en-IN')}/shift · {activeQuote.shifts_per_cycle} shifts = <b>₹{activeQuote.total.toLocaleString('en-IN')}</b> (incl. GST)
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onReviewQuote?.(activeQuote)}
                data-testid="review-quote-btn"
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm transition shrink-0"
              >
                <span>Review Quote</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Timeline */}
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4">Care Onboarding Progress</h3>
            <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {TIMELINE_STEPS.map((s, idx) => {
                const isPast = currentIdx >= idx;
                const isCurrent = enquiry.status === s.key;
                return (
                  <div key={s.key} className="relative">
                    <div
                      className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
                        isPast
                          ? 'bg-teal-700 border-teal-700 text-white'
                          : 'bg-white border-slate-300 text-transparent'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className={`text-xs font-bold ${isCurrent ? 'text-teal-900 font-black' : isPast ? 'text-slate-800' : 'text-slate-400'}`}>
                        {s.label}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{s.hint}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Assessment & Clinical Risk Details */}
          {(enquiry.risk?.braden || enquiry.risk?.morse || enquiry.assessment_note) && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-slate-800 text-xs font-black uppercase tracking-wider">
                <ShieldAlert className="w-4 h-4 text-teal-700" />
                <span>Clinical Assessment Summary</span>
              </div>

              {enquiry.assessment_note && (
                <p className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-100 leading-relaxed font-medium">
                  {enquiry.assessment_note}
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {enquiry.risk?.braden && (
                  <div className={`p-3 rounded-xl border text-xs ${
                    enquiry.risk.braden.alert
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}>
                    <div className="text-[11px] uppercase tracking-wider font-bold text-slate-500">
                      Braden Pressure-Sore Risk
                    </div>
                    <div className="text-sm font-black mt-0.5 flex items-center gap-1.5">
                      <span>Score: {enquiry.risk.braden.score}/23</span>
                      <span className="text-xs px-2 py-0.5 rounded-md font-bold bg-white/80 border border-slate-200">
                        {enquiry.risk.braden.band}
                      </span>
                    </div>
                    {enquiry.risk.braden.alert && (
                      <p className="text-[11px] text-amber-800 mt-1">
                        High risk detected. Caregiver will maintain 2-hourly turning schedule and skin protection.
                      </p>
                    )}
                  </div>
                )}

                {enquiry.risk?.morse && (
                  <div className={`p-3 rounded-xl border text-xs ${
                    enquiry.risk.morse.alert
                      ? 'bg-rose-50 border-rose-200 text-rose-900'
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}>
                    <div className="text-[11px] uppercase tracking-wider font-bold text-slate-500">
                      Morse Fall Risk Assessment
                    </div>
                    <div className="text-sm font-black mt-0.5 flex items-center gap-1.5">
                      <span>Score: {enquiry.risk.morse.score}/125</span>
                      <span className="text-xs px-2 py-0.5 rounded-md font-bold bg-white/80 border border-slate-200">
                        {enquiry.risk.morse.band}
                      </span>
                    </div>
                    {enquiry.risk.morse.alert && (
                      <p className="text-[11px] text-rose-800 mt-1">
                        High fall risk precautions active: constant transfer assistance, grab rail safety advisory.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quotes History */}
          {enquiry.quotes && enquiry.quotes.length > 0 && (
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2.5">
                Quotes Received ({enquiry.quotes.length})
              </h3>
              <div className="space-y-2">
                {enquiry.quotes.map((q) => (
                  <div
                    key={q.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-800">
                        #{q.quote_number} · {q.service?.name || 'Shift Care'}
                      </div>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        ₹{q.rate_per_shift.toLocaleString('en-IN')}/shift × {q.shifts_per_cycle} shifts = <b>₹{q.total.toLocaleString('en-IN')}</b>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                        q.status === 'SENT'
                          ? 'bg-emerald-100 text-emerald-800'
                          : q.status === 'ACCEPTED'
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {q.status}
                      </span>
                      {q.status === 'SENT' && (
                        <button
                          type="button"
                          onClick={() => onReviewQuote?.(q)}
                          className="bg-teal-700 hover:bg-teal-800 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition"
                        >
                          Review
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

{/* Footer */}

<div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition"
          >
            Close
          </button>
        </div>
</VizitoDialog>
  );
}
