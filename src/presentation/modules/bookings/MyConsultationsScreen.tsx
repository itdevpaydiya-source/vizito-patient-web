import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Calendar, Clock, MapPin, X, Sparkles, RotateCcw, AlertCircle, FileText, CheckCircle2, Star, MessageSquare,
  Stethoscope, Building2, Receipt, CreditCard, Users, Phone, Copy, Check, Hourglass
} from 'lucide-react';
import { getDashboardApi, type DashboardBooking } from '../../../services/dashboardHelper';
import { createReviewApi, getMyReviewsApi, type PatientReview } from '../../../services/reviewHelper';
import { formatSlotTime } from '../../../services/bookingHelper';

type TabKey = 'active' | 'upcoming' | 'completed' | 'cancelled';

// A booking as displayed, plus the tab it belongs to. Derived entirely from the real
// GET /patients/dashboard response — no fabricated fields.
interface DisplayBooking extends DashboardBooking {
  tab: TabKey;
}

function appointmentTypeLabel(t: string | null): string {
  switch (t) {
    case 'VIDEO_CALL': return 'Video Consultation';
    case 'IN_CLINIC': return 'In-Clinic Visit';
    case 'HOME_VISIT': return 'Home Visit';
    default: return 'Appointment';
  }
}

function statusBadgeClass(status: string): string {
  const s = status.toUpperCase();
  if (s.includes('CANCEL')) return 'bg-rose-50 text-rose-700 border-rose-200';
  if (s.includes('COMPLET')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (s.includes('CONFIRM') || s.includes('SCHEDUL')) return 'bg-teal-50 text-teal-700 border-teal-200';
  if (s.includes('NO_SHOW') || s.includes('NO SHOW')) return 'bg-slate-100 text-slate-700 border-slate-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
}

// Same palette family as statusBadgeClass, applied to the PaymentStatus enum values
// (PENDING/PARTIAL/PAID/FAILED/REFUNDED) — a distinct status axis from the appointment/booking
// status above, so it gets its own badge rather than being folded into the same one.
function paymentBadgeClass(status: string | null): string {
  const s = (status || '').toUpperCase();
  if (s === 'PAID') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (s === 'FAILED' || s === 'DECLINED') return 'bg-rose-50 text-rose-700 border-rose-200';
  if (s === 'REFUNDED') return 'bg-sky-50 text-sky-700 border-sky-200';
  if (s === 'PARTIAL') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-amber-50 text-amber-700 border-amber-200'; // PENDING / unknown
}

function visitTypeLabel(t: string | null): string | null {
  if (!t) return null;
  switch (t) {
    case 'FIRST_VISIT': return 'First Visit';
    case 'FOLLOW_UP': return 'Follow-up Visit';
    case 'REVIEW': return 'Review Visit';
    default: return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

function sourceLabel(s: string | null): string | null {
  if (!s) return null;
  if (s === 'ONLINE') return 'Booked Online';
  if (s === 'WALK_IN') return 'Walk-in Registration';
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// "2026-08-19" -> "19 Aug 2026" — a patient-friendly date, never a raw ISO timestamp.
function formatFriendlyDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const str = dateStr.split('T')[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return dateStr;
  const [y, m, d] = str.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
}

// Full ISO timestamp -> "19 Aug 2026, 4:41 PM" for the "created" line, still never raw ISO.
function formatFriendlyDateTime(iso: string | null): string | null {
  if (!iso) return null;
  const datePart = formatFriendlyDate(iso);
  const timeMatch = iso.match(/T(\d{2}):(\d{2})/);
  if (!datePart || !timeMatch) return datePart;
  return `${datePart}, ${formatSlotTime(`${timeMatch[1]}:${timeMatch[2]}`)}`;
}

// Small presentational building blocks for the detail modal only — a section header (icon + label
// + divider) and a label/value pair that renders nothing when the value is genuinely absent, so
// the modal never shows a blank or "null" field.
function DetailSection({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-teal-600" />
        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">{title}</h4>
      </div>
      <div className="pl-0.5">{children}</div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === '') return null;
  return (
    <div className="space-y-0.5 min-w-0">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-bold text-slate-800 break-words">{value}</p>
    </div>
  );
}

export default function MyConsultationsScreen() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabKey>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [bookings, setBookings] = useState<DisplayBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<DisplayBooking | null>(null);
  const [refCopied, setRefCopied] = useState(false);

  const copyBookingRef = (ref: string) => {
    navigator.clipboard?.writeText(ref).then(() => {
      setRefCopied(true);
      setTimeout(() => setRefCopied(false), 1500);
    }).catch(() => {});
  };

  // Reviews keyed by booking_id — so a completed booking shows either its existing review (+ doctor
  // response) or a "write review" form.
  const [reviews, setReviews] = useState<Record<string, PatientReview>>({});
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await getDashboardApi();
      const combined: DisplayBooking[] = [
        ...data.active.map((b) => ({ ...b, tab: 'active' as TabKey })),
        ...data.upcoming.map((b) => ({ ...b, tab: 'upcoming' as TabKey })),
        ...data.history.map((b) => {
          const s = (b.status || '').toUpperCase();
          const tab: TabKey = s.includes('CANCEL') ? 'cancelled' : 'completed';
          return { ...b, tab };
        }),
      ];
      setBookings(combined);
      try { setReviews(await getMyReviewsApi()); } catch { setReviews({}); }
    } catch {
      setLoadError('Unable to load your bookings. Please try again.');
      setBookings([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submitReview = async (bookingId: string) => {
    setReviewSubmitting(true);
    try {
      await createReviewApi(bookingId, reviewRating, reviewComment.trim() || undefined);
      setReviews(await getMyReviewsApi());
      setReviewComment('');
      setReviewRating(5);
    } catch {
      alert('Could not submit your review. Please try again.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (b.tab !== activeTab) return false;
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      (b.bookingNumber || '').toLowerCase().includes(q) ||
      (b.location || '').toLowerCase().includes(q) ||
      appointmentTypeLabel(b.appointmentType).toLowerCase().includes(q) ||
      (b.patientName || '').toLowerCase().includes(q)
    );
  });

  const counts = {
    active: bookings.filter((b) => b.tab === 'active').length,
    upcoming: bookings.filter((b) => b.tab === 'upcoming').length,
    completed: bookings.filter((b) => b.tab === 'completed').length,
    cancelled: bookings.filter((b) => b.tab === 'cancelled').length,
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'active', label: 'Active' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Bookings</h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
            Your healthcare bookings and their current status.
          </p>
        </div>
        <button
          onClick={() => navigate('/healthcare-services')}
          className="self-start sm:self-auto flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all active:scale-98"
        >
          <Sparkles className="w-4 h-4" /> Book New Service
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by reference, location, or service..."
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 shadow-xs"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto modal-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
              activeTab === tab.key ? 'bg-slate-900 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === tab.key ? 'bg-white/20' : 'bg-slate-100'}`}>
              {counts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Content states */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center shadow-xs">
          <div className="w-7 h-7 border-[3px] border-slate-700 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 font-medium text-sm">Loading bookings...</p>
        </div>
      ) : loadError ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center shadow-xs space-y-3">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <p className="text-rose-600 font-semibold text-sm">{loadError}</p>
          <button onClick={load} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl">
            <RotateCcw className="w-4 h-4" /> Retry
          </button>
        </div>
      ) : filteredBookings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBookings.map((b) => (
            <div
              key={b.id}
              onClick={() => setSelectedBooking(b)}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 cursor-pointer transition-all space-y-3"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">{appointmentTypeLabel(b.appointmentType)}</h3>
                  {b.bookingNumber && <span className="text-[11px] text-slate-400 font-semibold">Ref: {b.bookingNumber}</span>}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${statusBadgeClass(b.status)}`}>
                  {b.status}
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-600 font-medium">
                {b.location && (
                  <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" /><span className="truncate">{b.location}</span></div>
                )}
                <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" /><span>{b.appointmentDate || b.bookingDate || '—'}</span></div>
                {b.timeSlot && <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" /><span>{b.timeSlot}</span></div>}
              </div>
              {b.totalAmount != null && (
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Amount</span>
                  <span className="font-black text-slate-800 text-sm">₹{b.totalAmount}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center shadow-xs">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <h3 className="font-bold text-slate-700 text-lg">No {activeTab} bookings</h3>
          <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto">Bookings you make will appear here.</p>
        </div>
      )}

      {/* Detail modal (real fields only) */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 flex flex-col">
            {/* Header — stays fixed while the body below scrolls */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-5 shrink-0">
              <div className="min-w-0">
                <h3 className="font-extrabold text-slate-900 text-lg truncate">{appointmentTypeLabel(selectedBooking.appointmentType)}</h3>
                {selectedBooking.bookingNumber && (
                  <button
                    onClick={() => copyBookingRef(selectedBooking.bookingNumber!)}
                    title="Copy booking reference"
                    className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold mt-1 hover:text-slate-600 transition-colors"
                  >
                    Ref: {selectedBooking.bookingNumber}
                    {refCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border whitespace-nowrap ${statusBadgeClass(selectedBooking.status)}`}>
                  {selectedBooking.status}
                </span>
                <button onClick={() => setSelectedBooking(null)} className="p-2 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto px-6 py-5 space-y-6 modal-scrollbar">
              {/* Doctor & Clinic */}
              {(selectedBooking.doctorName || selectedBooking.branchName || selectedBooking.location) && (
                <DetailSection icon={Stethoscope} title="Doctor & Clinic">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                    <DetailField label="Doctor" value={selectedBooking.doctorName ? `Dr. ${selectedBooking.doctorName}` : null} />
                    <DetailField label="Department" value={selectedBooking.department} />
                    <DetailField label="Clinic" value={selectedBooking.branchName} />
                    <DetailField label="Location" value={selectedBooking.location} />
                  </div>
                </DetailSection>
              )}

              {/* Appointment Schedule — the most prominent section */}
              <DetailSection icon={Calendar} title="Appointment Schedule">
                <div className="bg-teal-50/50 border border-teal-100 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-teal-600 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date</p>
                      <p className="text-sm font-black text-slate-900">{formatFriendlyDate(selectedBooking.appointmentDate || selectedBooking.bookingDate) || '—'}</p>
                    </div>
                  </div>
                  {selectedBooking.timeSlot && (
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-4 h-4 text-teal-600 shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Time</p>
                        <p className="text-sm font-black text-slate-900">{formatSlotTime(selectedBooking.timeSlot)}</p>
                      </div>
                    </div>
                  )}
                  {selectedBooking.durationMinutes != null && (
                    <div className="flex items-center gap-2.5">
                      <Hourglass className="w-4 h-4 text-teal-600 shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Duration</p>
                        <p className="text-sm font-black text-slate-900">{selectedBooking.durationMinutes} minutes</p>
                      </div>
                    </div>
                  )}
                  <DetailField label="Appointment Type" value={appointmentTypeLabel(selectedBooking.appointmentType)} />
                  <DetailField label="Visit Type" value={visitTypeLabel(selectedBooking.visitType)} />
                </div>
              </DetailSection>

              {/* Payment */}
              <DetailSection icon={Receipt} title="Payment">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-slate-900">{selectedBooking.totalAmount != null ? `₹${selectedBooking.totalAmount}` : '—'}</span>
                    {selectedBooking.paymentStatus && (
                      <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${paymentBadgeClass(selectedBooking.paymentStatus)}`}>
                        {selectedBooking.paymentStatus}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                    <DetailField label="Payment Method" value={selectedBooking.paymentMode} />
                    <DetailField label="Payment Reference" value={selectedBooking.paymentReferenceId} />
                  </div>
                </div>
              </DetailSection>

              {/* Booking Details */}
              <DetailSection icon={FileText} title="Booking Details">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                  <DetailField label="Booking Number" value={selectedBooking.bookingNumber} />
                  <DetailField label="Booked Via" value={sourceLabel(selectedBooking.source)} />
                  <DetailField label="Booked On" value={formatFriendlyDateTime(selectedBooking.createdAt)} />
                </div>
              </DetailSection>

              {/* Patient */}
              {(selectedBooking.patientName || selectedBooking.patientMobile) && (
                <DetailSection icon={Users} title="Patient">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                    <DetailField label="Name" value={selectedBooking.patientName} />
                    <DetailField
                      label="Mobile"
                      value={selectedBooking.patientMobile ? (
                        <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" />{selectedBooking.patientMobile}</span>
                      ) : null}
                    />
                  </div>
                </DetailSection>
              )}

              {/* Additional Information — only ever patient-safe fields (reason_for_visit, notes).
                  appointment.internal_notes is a staff-only field and must never be sourced here. */}
              {(selectedBooking.reasonForVisit || selectedBooking.notes) && (
                <DetailSection icon={MessageSquare} title="Additional Information">
                  <div className="space-y-3">
                    <DetailField label="Reason for Visit" value={selectedBooking.reasonForVisit} />
                    <DetailField label="Notes" value={selectedBooking.notes} />
                  </div>
                </DetailSection>
              )}

            {/* Reviews — only for completed consultations */}
            {selectedBooking.tab === 'completed' && (
              <div className="pt-4 border-t border-slate-100">
                {(() => {
                  const existing = reviews[selectedBooking.id];
                  if (existing) {
                    return (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Your Review</span>
                          <span className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star key={s} className={`w-3.5 h-3.5 ${s <= existing.rating ? 'text-amber-500 fill-amber-500' : 'text-slate-200'}`} />
                            ))}
                          </span>
                        </div>
                        {existing.review && <p className="text-sm text-slate-700">"{existing.review}"</p>}
                        {existing.partner_response ? (
                          <div className="mt-2 p-3 rounded-xl bg-teal-50/60 border border-teal-100">
                            <span className="text-[11px] font-bold text-teal-700 flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> Doctor's response</span>
                            <p className="text-sm text-slate-700 mt-1">{existing.partner_response}</p>
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400">Awaiting the doctor's response.</p>
                        )}
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rate your consultation</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button key={s} onClick={() => setReviewRating(s)} className="p-0.5">
                            <Star className={`w-6 h-6 ${s <= reviewRating ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}`} />
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Share your experience (optional)..."
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 min-h-[70px]"
                      />
                      <button
                        onClick={() => submitReview(selectedBooking.id)}
                        disabled={reviewSubmitting}
                        className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-bold text-xs flex items-center gap-1.5"
                      >
                        {reviewSubmitting ? 'Submitting...' : <><Star className="w-4 h-4" /> Submit Review</>}
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}
            </div>

            {/* Footer — stays fixed while the body above scrolls */}
            <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-end gap-2 shrink-0">
              {(selectedBooking.tab === 'completed' || selectedBooking.tab === 'cancelled') && selectedBooking.appointmentType && (
                <button
                  onClick={() => navigate('/booking?service=doctor')}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" /> Book Again
                </button>
              )}
              <button onClick={() => setSelectedBooking(null)} className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
