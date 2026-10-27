import React, { useEffect, useState, useCallback } from 'react';
import { FileText, Clock, AlertTriangle, CheckCircle2, ChevronRight, PhoneCall, Sparkles } from 'lucide-react';
import { hcEnquiriesMineApi, type HcEnquiry, type HcQuote } from '../../../../services/homecareHelper';
import EnquiryTrackerModal from './EnquiryTrackerModal';
import QuoteReviewModal from './QuoteReviewModal';

interface EnquiriesListProps {
  onQuoteAccepted?: () => void;
  className?: string;
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  NEW: { label: 'Enquiry Received', cls: 'bg-sky-50 text-sky-800 border-sky-200' },
  CALLBACK_SCHEDULED: { label: 'Callback Scheduled', cls: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  ASSESSMENT_SCHEDULED: { label: 'Assessment Scheduled', cls: 'bg-purple-50 text-purple-800 border-purple-200' },
  QUOTE_SENT: { label: 'Care Quote Ready', cls: 'bg-amber-50 text-amber-900 border-amber-300 font-extrabold ring-2 ring-amber-400/20' },
  QUOTED: { label: 'Care Quote Ready', cls: 'bg-amber-50 text-amber-900 border-amber-300 font-extrabold ring-2 ring-amber-400/20' },
  ACCEPTED: { label: 'Quote Accepted & Booked', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  LOST: { label: 'Closed / Archived', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
};

export default function EnquiriesList({ onQuoteAccepted, className = '' }: EnquiriesListProps) {
  const [enquiries, setEnquiries] = useState<HcEnquiry[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState<HcEnquiry | null>(null);
  const [reviewQuote, setReviewQuote] = useState<HcQuote | null>(null);

  const loadEnquiries = useCallback(async () => {
    setLoading(true);setError(false);
    try {
      const data = await hcEnquiriesMineApi();
      setEnquiries(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEnquiries();
  }, [loadEnquiries]);

  if (loading) {
    return <div className="text-xs text-slate-400 py-3">Loading active enquiries...</div>;
  }

  if(error)return <section role="alert" className="hcj-state"><h2>Unable to load your care quotes</h2><p>Please try again.</p><button onClick={loadEnquiries}>Retry</button></section>;
  if (!enquiries || enquiries.length === 0) return <section className="hcj-state"><h2>No care quote requests yet</h2><p>Share your long-term care needs to request a quote from an agency.</p><a className="hcj-primary" href="/home-care?track=longterm">Request a quote</a></section>;

  return (
    <div className={`space-y-3 ${className}`} data-testid="patient-enquiries-section">
      {enquiries.flatMap(e=>(e.quotes|| (e.quote?[e.quote]:[])).filter(q=>q.status==='SENT'&&new Date(q.valid_until).getTime()>Date.now()).map(q=>({q,agency:e.agency?.name}))).length>1&&<section className="hcj hcj-team"><h2>Compare available quotes</h2><div className="hcj-table-scroll"><table><thead><tr><th>Agency / plan</th><th>Shift price</th><th>Shifts / cycle</th><th>Total incl. tax</th><th>Advance</th><th>Includes</th><th/></tr></thead><tbody>{enquiries.flatMap(e=>(e.quotes||(e.quote?[e.quote]:[])).filter(q=>q.status==='SENT'&&new Date(q.valid_until).getTime()>Date.now()).map(q=><tr key={q.id}><td>{e.agency?.name}<br/>{q.service.name}</td><td>₹{q.rate_per_shift}</td><td>{q.shifts_per_cycle} / {q.cycle_days} days</td><td>₹{q.total}</td><td>₹{q.advance}</td><td>{q.includes||'Not provided'}</td><td><button onClick={()=>setReviewQuote(q)}>Review & accept</button></td></tr>))}</tbody></table></div></section>}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
          <FileText className="w-4 h-4 text-teal-700" />
          <span>Active Enquiries & Care Quotes ({enquiries.length})</span>
        </h3>
        <span className="text-[11px] font-bold text-slate-500">
          Live Agency Status
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {enquiries.map((enq) => {
          const st = STATUS_MAP[enq.status] || { label: enq.status, cls: 'bg-slate-100 text-slate-600 border-slate-200' };
          const latestQuote = enq.quote || (enq.quotes && enq.quotes.find((q: any) => q.status === 'SENT')) || (enq.quotes && enq.quotes[0]);
          const hasQuote = Boolean(latestQuote && (['QUOTED', 'QUOTE_SENT'].includes(enq.status) || latestQuote.status === 'SENT'));
          const isOverdue = enq.is_callback_overdue;

          return (
            <div
              key={enq.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:border-teal-300 transition space-y-3 flex flex-col justify-between"
              data-testid="enquiry-card"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 block">
                      Enquiry #{enq.enquiry_number}
                    </span>
                    <h4 className="text-sm font-black text-slate-900 mt-0.5">
                      {enq.agency?.name}
                    </h4>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${st.cls}`}>
                    {st.label}
                  </span>
                </div>

                <div className="text-xs text-slate-600 mt-2 space-y-1">
                  <div>
                    <span className="font-semibold text-slate-700">Service:</span> {enq.service?.name} ({enq.duration_preference || 'Standard shift'})
                  </div>
                  {enq.patient_name && (
                    <div>
                      <span className="font-semibold text-slate-700">Patient:</span> {enq.patient_name}
                    </div>
                  )}
                  {enq.callback_scheduled_at && (
                    <div className="flex items-center gap-1.5 text-[11px] text-indigo-700 font-semibold pt-1">
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>Callback: {new Date(enq.callback_scheduled_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                </div>

                {isOverdue && (
                  <div className="mt-2.5 p-2 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>Callback SLA escalated to agency manager</span>
                  </div>
                )}

                {hasQuote && latestQuote && (
                  <div className="mt-2.5 p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-950 font-bold">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>Quote #{latestQuote.quote_number}: <b>₹{latestQuote.total.toLocaleString('en-IN')}</b></span>
                    </div>
                    <span className="text-[10px] bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded uppercase">
                      Action Required
                    </span>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedEnquiry(enq)}
                  data-testid="track-enquiry-btn"
                  className="text-xs font-bold text-slate-700 hover:text-teal-700 inline-flex items-center gap-1 transition"
                >
                  <span>Track Status</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                {hasQuote && latestQuote && (
                  <button
                    type="button"
                    onClick={() => setReviewQuote(latestQuote)}
                    data-testid="review-quote-btn"
                    className="px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-black text-xs shadow-sm transition"
                  >
                    Review & Pay
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tracker Modal */}
      {selectedEnquiry && (
        <EnquiryTrackerModal
          isOpen={true}
          onClose={() => setSelectedEnquiry(null)}
          enquiry={selectedEnquiry}
          onOpenQuote={(q) => {
            setSelectedEnquiry(null);
            setReviewQuote(q);
          }}
        />
      )}

      {/* Quote Review Modal */}
      {reviewQuote && (
        <QuoteReviewModal
          isOpen={true}
          onClose={() => setReviewQuote(null)}
          quote={reviewQuote}
          onAccepted={() => {
            loadEnquiries();
            if (onQuoteAccepted) onQuoteAccepted();
          }}
          onDeclined={() => {
            loadEnquiries();
          }}
        />
      )}
    </div>
  );
}
