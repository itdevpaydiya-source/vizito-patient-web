import React, { useState, useEffect, useCallback } from 'react';
import { Star, MessageSquare, AlertCircle, RotateCcw, CheckCircle2, Calendar } from 'lucide-react';
import { getDashboardApi, type DashboardBooking } from '../../../services/dashboardHelper';
import { createReviewApi, getMyReviewsApi, type PatientReview } from '../../../services/reviewHelper';

function appointmentTypeLabel(t: string | null): string {
  switch (t) {
    case 'VIDEO_CALL': return 'Video Consultation';
    case 'IN_CLINIC': return 'In-Clinic Visit';
    case 'HOME_VISIT': return 'Home Visit';
    default: return 'Consultation';
  }
}

const StarRow = ({ value, onChange, size = 'sm' }: { value: number; onChange?: (n: number) => void; size?: 'sm' | 'lg' }) => (
  <span className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => {
      const cls = size === 'lg' ? 'w-6 h-6' : 'w-3.5 h-3.5';
      const star = <Star className={`${cls} ${s <= value ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}`} />;
      return onChange ? <button key={s} type="button" onClick={() => onChange(s)} className="p-0.5">{star}</button> : <span key={s}>{star}</span>;
    })}
  </span>
);

// Dedicated Reviews page — patients rate completed consultations and read the doctors' responses.
// All data is real (GET /patients/reviews + completed bookings from the dashboard). No fabrication.
export default function ReviewsScreen() {
  const [completed, setCompleted] = useState<DashboardBooking[]>([]);
  const [reviews, setReviews] = useState<Record<string, PatientReview>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Per-booking write form state.
  const [drafts, setDrafts] = useState<Record<string, { rating: number; comment: string }>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [dashboard, myReviews] = await Promise.all([getDashboardApi(), getMyReviewsApi()]);
      const done = dashboard.history.filter((b) => !(b.status || '').toUpperCase().includes('CANCEL'));
      setCompleted(done);
      setReviews(myReviews);
    } catch {
      setError('Unable to load your reviews. Please try again.');
      setCompleted([]); setReviews({});
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const draftFor = (id: string) => drafts[id] || { rating: 5, comment: '' };
  const setDraft = (id: string, patch: Partial<{ rating: number; comment: string }>) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...draftFor(id), ...patch } }));

  const submit = async (bookingId: string) => {
    const d = draftFor(bookingId);
    setSubmitting(bookingId);
    try {
      await createReviewApi(bookingId, d.rating, d.comment.trim() || undefined);
      setReviews(await getMyReviewsApi());
    } catch {
      alert('Could not submit your review. Please try again.');
    } finally { setSubmitting(null); }
  };

  const pending = completed.filter((b) => !reviews[b.id]);
  const reviewed = completed.filter((b) => reviews[b.id]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Ratings & Reviews</h1>
        <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">Rate your completed consultations and read the doctors' responses.</p>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center shadow-xs">
          <div className="w-7 h-7 border-[3px] border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 font-medium text-sm">Loading...</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center shadow-xs space-y-3">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <p className="text-rose-600 font-semibold text-sm">{error}</p>
          <button onClick={load} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl">
            <RotateCcw className="w-4 h-4" /> Retry
          </button>
        </div>
      ) : completed.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-20 text-center shadow-xs space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 mx-auto"><Star className="w-8 h-8" /></div>
          <h3 className="font-extrabold text-slate-800 text-lg">No consultations to review yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto font-medium">Once a doctor completes your appointment, you can rate it here.</p>
        </div>
      ) : (
        <>
          {/* Pending reviews */}
          {pending.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Awaiting your review</h2>
              {pending.map((b) => {
                const d = draftFor(b.id);
                return (
                  <div key={b.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-sm">{appointmentTypeLabel(b.appointmentType)}</h3>
                        <p className="text-[11px] text-slate-400 font-semibold flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{b.appointmentDate || b.bookingDate || '—'}{b.bookingNumber ? ` · ${b.bookingNumber}` : ''}</p>
                      </div>
                      <StarRow value={d.rating} onChange={(n) => setDraft(b.id, { rating: n })} size="lg" />
                    </div>
                    <textarea
                      value={d.comment}
                      onChange={(e) => setDraft(b.id, { comment: e.target.value })}
                      placeholder="Share your experience (optional)..."
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 min-h-[70px]"
                    />
                    <button
                      onClick={() => submit(b.id)}
                      disabled={submitting === b.id}
                      className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-bold text-xs flex items-center gap-1.5"
                    >
                      {submitting === b.id ? 'Submitting...' : <><Star className="w-4 h-4" /> Submit Review</>}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Submitted reviews */}
          {reviewed.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Your reviews</h2>
              {reviewed.map((b) => {
                const rv = reviews[b.id];
                return (
                  <div key={b.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-sm">{rv.doctor_name || appointmentTypeLabel(b.appointmentType)}</h3>
                        <p className="text-[11px] text-slate-400 font-semibold">{b.appointmentDate || b.bookingDate || ''}{b.bookingNumber ? ` · ${b.bookingNumber}` : ''}</p>
                      </div>
                      <StarRow value={rv.rating} />
                    </div>
                    {rv.review && <p className="text-sm text-slate-700">"{rv.review}"</p>}
                    {rv.partner_response ? (
                      <div className="mt-1 p-3 rounded-xl bg-teal-50/60 border border-teal-100">
                        <span className="text-[11px] font-bold text-teal-700 flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> Doctor's response</span>
                        <p className="text-sm text-slate-700 mt-1">{rv.partner_response}</p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Submitted — awaiting the doctor's response.</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
