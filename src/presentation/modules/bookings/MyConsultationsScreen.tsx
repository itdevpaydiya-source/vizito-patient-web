import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import VisitLocation from '../../components/location/VisitLocation';
import { getBranchesApi, type Branch } from '../../../services/bookingHelper';
import { paidLabel, refundText, refundWillText, TestPaymentNote } from '../../../config/payments';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search, Calendar, Clock, MapPin, X, Sparkles, RotateCcw, AlertCircle, FileText, CheckCircle2, Star, MessageSquare,
  Stethoscope, Building2, Receipt, CreditCard, Users, Phone, Copy, Check, Hourglass, Ban, LifeBuoy, CalendarClock,
  FlaskConical, Video, Home, ChevronRight, Pill
} from 'lucide-react';
import { getMyOrdersApi } from '../../../services/pharmacyOrderHelper';
import { getDashboardApi, cancelBookingApi, type DashboardBooking } from '../../../services/dashboardHelper';
import ReschedulePanel from './ReschedulePanel';
import { bookingView } from '../../../utils/bookingView';
import { createReviewApi, getMyReviewsApi, type PatientReview } from '../../../services/reviewHelper';
import { formatDoctorName } from '../../../utils/doctorLabel';
import { formatDayDate, formatTime } from '../../../utils/dateFormat';

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

// What the booking is, shown on every card so lab tests, home visits and doctor visits never look alike.
const KIND: Record<string, { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }> = {
  DOCTOR_VISIT: { label: 'Doctor visit', cls: 'bg-teal-50 text-teal-800 border-teal-200', icon: Stethoscope },
  VIDEO_CONSULT: { label: 'Video consultation', cls: 'bg-indigo-50 text-indigo-800 border-indigo-200', icon: Video },
  HOME_VISIT: { label: 'Doctor home visit', cls: 'bg-amber-50 text-amber-900 border-amber-200', icon: Home },
  LAB_TEST: { label: 'Lab test', cls: 'bg-violet-50 text-violet-800 border-violet-200', icon: FlaskConical },
  HOME_CARE: { label: 'Home care', cls: 'bg-rose-50 text-rose-800 border-rose-200', icon: Home },
};
const LAB_STATUS: Record<string, string> = { BOOKED: 'Booked', SAMPLE_PENDING: 'Sample pending', IN_PROGRESS: 'Being tested', PARTIALLY_REPORTED: 'Partial report', REPORTED: 'Report ready', CANCELLED: 'Cancelled' };
const testsTitle = (t: string[], pkg: string | null) => pkg || (t.length ? `${t[0]}${t.length > 1 ? ` + ${t.length - 1} more` : ''}` : 'Lab tests');

// "NO_SHOW" -> "No show"; the badge is uppercase via CSS, this keeps screen readers sane.
function statusLabel(status: string): string {
  const s = String(status || '').replace(/_/g, ' ').toLowerCase();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Pending';
}

// A visit the doctor or hospital declined says so, instead of a bare "Cancelled".
function declinedBy(b: { cancelledBy?: string | null; status?: string }): 'doctor' | 'clinic' | null {
  if (!String(b.status || '').toUpperCase().includes('CANCEL')) return null;
  const by = String(b.cancelledBy || '').toUpperCase();
  return by === 'DOCTOR' ? 'doctor' : by === 'HOSPITAL' ? 'clinic' : null;
}
function displayStatus(b: { cancelledBy?: string | null; status: string }): string {
  const d = declinedBy(b);
  if (d) return `Declined by ${d}`;
  return awaitingClinic(b as DisplayBooking) ? 'Awaiting clinic confirmation' : statusLabel(b.status);
}

// Past its time (2.5 h after the start) but the clinic hasn't recorded the outcome yet: never shown as
// upcoming; the doctor's side flags it "Needs closure" (nothing is changed automatically).
function awaitingClinic(b: DisplayBooking): boolean {
  if (b.tab !== 'active' && b.tab !== 'upcoming') return false;
  const s = String(b.appointmentStatus || b.status || '').toUpperCase();
  if (!['SCHEDULED', 'CONFIRMED', 'PENDING', 'CHECKED_IN', 'IN_PROGRESS'].includes(s)) return false;
  const at = startsAt(b);
  return !!at && Date.now() > at.getTime() + 150 * 60000;
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
  return `${datePart}, ${formatTime(`${timeMatch[1]}:${timeMatch[2]}`)}`;
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

const CANCEL_REASONS = ['Feeling better now', "Can't make it at this time", 'Booked by mistake', 'Chose another doctor', 'Other'];

// When the visit starts, from its date + slot ("2026-09-29" + "09:00:00" or "06:00 AM").
function startsAt(b: DisplayBooking): Date | null {
  const date = (b.appointmentDate || b.bookingDate || '').split('T')[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const m = String(b.timeSlot || '').match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i);
  const [y, mo, d] = date.split('-').map(Number);
  if (!m) return new Date(y, mo - 1, d, 23, 59);
  let h = Number(m[1]);
  if (m[3]) { const pm = m[3].toUpperCase() === 'PM'; if (h === 12) h = pm ? 12 : 0; else if (pm) h += 12; }
  return new Date(y, mo - 1, d, h, Number(m[2]));
}

// Mirrors the server rule: before the visit starts, and nobody has checked the patient in yet.
function canCancel(b: DisplayBooking): boolean {
  if (b.tab !== 'active' && b.tab !== 'upcoming') return false;
  const s = String(b.appointmentStatus || b.status || '').toUpperCase();
  if (!['SCHEDULED', 'CONFIRMED', 'PENDING'].includes(s)) return false;
  const at = startsAt(b);
  return !at || at.getTime() > Date.now();
}

const paidOnline = (b: DisplayBooking) =>
  String(b.paymentStatus || '').toUpperCase() === 'PAID' && !/clinic|cash/i.test(String(b.paymentMode || ''));

export default function MyConsultationsScreen() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const openOnLoad = useRef<string | null>(params.get('open'));
  const reduceMotion = useReducedMotion() ?? false;

  const [activeTab, setActiveTab] = useState<TabKey>('active');
  // Open on the first tab that has something in it (a patient with one upcoming visit shouldn't land
  // on an empty "Active" list) — only once, so a tab the patient picks is never switched under them.
  const tabChosen = useRef(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [bookings, setBookings] = useState<DisplayBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<DisplayBooking | null>(null);
  const [refCopied, setRefCopied] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ tone: 'ok' | 'warn'; text: string; bookingRef?: string } | null>(null);

  const [kindFilter, setKindFilter] = useState<string>('ALL');
  const openBooking = (b: DisplayBooking | null) => {
    // Lab bookings open their own screen (samples, report, lab cancellation rules), not the doctor view.
    if (b?.labOrder) { navigate(`/lab-bookings?open=${encodeURIComponent(b.labOrder.id)}`); return; }
    if (b?.homeCare) { navigate(`/home-care?tab=mine&open=${encodeURIComponent(b.homeCare.id)}`); return; }
    setSelectedBooking(b);
    setCancelOpen(false); setCancelReason(''); setCancelError(null); setRescheduleOpen(false);
  };

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
        ...data.upcoming.map((b) => { const x = { ...b, tab: 'upcoming' as TabKey }; return awaitingClinic(x as DisplayBooking) ? { ...x, tab: 'active' as TabKey } : x; }),
        ...data.history.map((b) => {
          const s = (b.status || '').toUpperCase();
          const tab: TabKey = s.includes('CANCEL') ? 'cancelled' : 'completed';
          return { ...b, tab };
        }),
      ];
      setBookings(combined);
      // A notification links here with ?open=<booking id>. Open that booking now that the list is in
      // (lab and home-care bookings are handed on to their own screens by openBooking). An id that is
      // not in the patient's list is ignored. The parameter is dropped either way, once. It is dropped
      // BEFORE opening: openBooking may navigate to another screen (lab, home care), and a later
      // setParams would override that navigation and strand the patient on this page.
      const wanted = openOnLoad.current;
      if (wanted) {
        openOnLoad.current = null;
        setParams((p) => { const n = new URLSearchParams(p); n.delete('open'); return n; }, { replace: true });
        const target = combined.find((b) => b.id === wanted);
        if (target) openBooking(target);
      }
      if (!tabChosen.current) {
        tabChosen.current = true;
        const first = (['active', 'upcoming', 'completed', 'cancelled'] as TabKey[]).find((t) => combined.some((b) => b.tab === t));
        if (first) setActiveTab(first);
      }
      try { setReviews(await getMyReviewsApi()); } catch { setReviews({}); }
    } catch {
      setLoadError('Unable to load your bookings. Please try again.');
      setBookings([]);
    } finally {
      setIsLoading(false);
    }
    // openBooking and setParams only matter on the first load (openOnLoad is cleared after it) and
    // use nothing but state setters, so they are deliberately not dependencies: listing them would
    // re-create load on every render and refetch in a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);
  // Medicine orders live on their own page; count them so an empty Bookings tab can point there.
  const [medOrders, setMedOrders] = useState<{ open: number; done: number } | null>(null);
  useEffect(() => {
    getMyOrdersApi().then((list) => {
      const done = list.filter((o: any) => ['COMPLETED', 'CANCELLED', 'DECLINED', 'REJECTED', 'EXPIRED'].includes(String(o.status).toUpperCase())).length;
      setMedOrders({ open: list.length - done, done });
    }).catch(() => setMedOrders(null));
  }, []);

  const confirmCancel = async () => {
    if (!selectedBooking) return;
    if (!cancelReason) { setCancelError('Choose a reason.'); return; }
    setCancelBusy(true); setCancelError(null);
    try {
      const r = await cancelBookingApi(selectedBooking.id, cancelReason);
      const ref = r.booking_number || selectedBooking.bookingNumber;
      const refPart = ref ? `${ref} ` : '';
      if (r.refund.status === 'REFUNDED') {
        setBanner({ tone: 'ok', text: `${refPart}is cancelled. ${refundText(`₹${r.refund.amount}`)}` });
      } else if (r.refund.status === 'NEEDS_SUPPORT') {
        setBanner({ tone: 'warn', text: `${refPart}is cancelled. Your ₹${r.refund.amount} refund needs our support team — raise a request and we'll sort it out.`, bookingRef: r.booking_number || undefined });
      } else {
        setBanner({ tone: 'ok', text: `${refPart}is cancelled. Nothing was charged, so there is nothing to refund.` });
      }
      openBooking(null);
      tabChosen.current = true;
      setActiveTab('cancelled');
      await load();
    } catch (e: any) {
      setCancelError(e?.message || 'Could not cancel this booking.');
    } finally {
      setCancelBusy(false);
    }
  };

  const submitReview = async (bookingId: string) => {
    setReviewSubmitting(true);
    try {
      await createReviewApi(bookingId, reviewRating, reviewComment.trim() || undefined);
      setReviews(await getMyReviewsApi());
      setReviewComment('');
      setReviewRating(5);
    } catch (e: any) {
      const m = e?.response?.data?.message;
      if (/already reviewed/i.test(String(m))) {
        // Already reviewed (e.g. from another tab): show the saved review instead of the form.
        setReviews(await getMyReviewsApi().catch(() => reviews));
        alert('You have already reviewed this visit.');
      } else alert(m || 'Could not submit your review. Please try again.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (b.tab !== activeTab) return false;
    if (kindFilter !== 'ALL' && b.kind !== kindFilter) return false;
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      (b.bookingNumber || '').toLowerCase().includes(q) ||
      (b.business?.name || '').toLowerCase().includes(q) ||
      (b.doctorName || '').toLowerCase().includes(q) ||
      (b.labOrder ? `${b.labOrder.order_number} ${b.labOrder.tests.join(' ')} ${b.labOrder.lab_name}` : '').toLowerCase().includes(q) ||
      KIND[b.kind]?.label.toLowerCase().includes(q) ||
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
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.28, ease: 'easeOut' }}
      className="space-y-6 pb-12"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-orange-800 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-600" /> Your care, organized
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Bookings</h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
            Keep track of appointments, tests and home care in one place.
          </p>
        </div>
        <button
          onClick={() => navigate('/healthcare-services')}
          className="self-start sm:self-auto flex items-center gap-2 bg-orange-800 hover:bg-orange-900 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm motion-safe:transition-all motion-safe:duration-200 motion-reduce:transition-none hover:shadow-md active:scale-[0.98]"
        >
          <Sparkles className="w-4 h-4" /> Book care
        </button>
      </div>

      {/* Search and booking filters */}
      <section className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-4" aria-label="Find a booking">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by doctor, hospital, lab, test or reference"
          className="w-full pl-11 pr-11 py-3 bg-slate-50/70 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-700/15 focus:border-orange-700 motion-safe:transition-colors motion-reduce:transition-none"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto modal-scrollbar" role="group" aria-label="Booking status">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            aria-pressed={activeTab === tab.key}
            onClick={() => { tabChosen.current = true; setActiveTab(tab.key); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold motion-safe:transition-all motion-safe:duration-200 motion-reduce:transition-none shrink-0 flex items-center gap-2 ${
              activeTab === tab.key ? 'bg-orange-800 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:border-orange-200 hover:bg-orange-50/40'
            }`}
          >
            {tab.label}
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === tab.key ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
              {counts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {(() => {
        const kinds = Array.from(new Set(bookings.map((b) => b.kind)));
        if (kinds.length < 2) return null;
        return (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Booking type">
            {['ALL', ...kinds].map((k) => (
              <button key={k} aria-pressed={kindFilter === k} onClick={() => setKindFilter(k)} className={`px-3 py-1.5 rounded-full border text-xs font-bold motion-safe:transition-colors motion-reduce:transition-none ${kindFilter === k ? 'bg-orange-50 text-orange-900 border-orange-300' : 'bg-white text-slate-600 border-slate-200 hover:border-orange-200'}`}>
                {k === 'ALL' ? 'All types' : KIND[k]?.label || k} <span className="opacity-60">{bookings.filter((b) => b.tab === activeTab && (k === 'ALL' || b.kind === k)).length}</span>
              </button>
            ))}
          </div>
        );
      })()}
      </section>

      {banner && (
        <div role="status" className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold ${banner.tone === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <span className="flex-1">{banner.text}</span>
          {banner.bookingRef && (
            <button onClick={() => navigate(`/help?booking=${encodeURIComponent(banner.bookingRef!)}`)} className="shrink-0 text-xs font-bold underline">Get help</button>
          )}
          <button onClick={() => setBanner(null)} aria-label="Dismiss" className="shrink-0 opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>
        </div>
      )}

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          {filteredBookings.map((b, index) => {
            const K = KIND[b.kind] || KIND.DOCTOR_VISIT;
            // One shared description for every booking type (doctor, video, home visit, lab, home care).
            const lab = b.labOrder;
            const bv = bookingView(b);
            const title = bv.title;
            const businessLine = [bv.business, b.labOrder || b.homeCare ? null : b.department].filter(Boolean).join(' · ');
            const date = bv.date;
            const time = bv.time;
            const place = lab && lab.visit_type === 'HOME' ? 'Home sample collection' : bv.place;
            const forWhom = lab ? lab.patient_name : b.homeCare ? b.homeCare.patient_name : b.patientName;
            return (
            <motion.button
              key={b.id}
              type="button"
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.24, delay: reduceMotion ? 0 : Math.min(index * 0.035, 0.2), ease: 'easeOut' }}
              whileHover={reduceMotion ? undefined : { y: -2 }}
              aria-label={`${K.label}: ${title}`}
              onClick={() => openBooking(b)}
              className="group w-full text-left bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-orange-200 hover:shadow-md cursor-pointer motion-safe:transition-[border-color,box-shadow] motion-safe:duration-200 motion-reduce:transition-none flex flex-col min-h-[17rem]"
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${K.cls}`}><K.icon className="w-3 h-3" />{K.label}</span>
                <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${lab ? statusBadgeClass(lab.status === 'REPORTED' ? 'COMPLETED' : lab.status === 'CANCELLED' ? 'CANCELLED' : lab.status === 'BOOKED' ? 'CONFIRMED' : 'PENDING') : statusBadgeClass(b.homeCare ? b.homeCare.status : b.status)}`}>
                  {lab ? LAB_STATUS[lab.status] || lab.status : b.homeCare ? bv.status : displayStatus(b)}
                </span>
              </div>
              <div className="min-w-0 border-b border-slate-100 pb-3 mb-3 min-h-[4.25rem]">
                <h3 className="font-extrabold text-slate-900 text-sm leading-5 line-clamp-2">{title}</h3>
                {businessLine && <p className="text-[11px] text-slate-600 font-semibold truncate flex items-center gap-1 mt-1"><Building2 className="w-3 h-3 text-slate-400 shrink-0" />{businessLine}</p>}
                {lab && lab.tests.length > 1 && <p className="text-[11px] text-slate-500 truncate mt-0.5">{lab.tests.join(', ')}</p>}
              </div>
              <div className="flex-1 space-y-2 text-xs text-slate-600 font-medium">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-bold text-slate-800">{formatDayDate(date)}</span>
                  {time && <><Clock className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-2" /><span className="font-bold text-slate-800">{formatTime(time)}</span></>}
                </div>
                {place && (
                  <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" /><span className="truncate">{place}</span></div>
                )}
                {forWhom && <div className="flex items-center gap-2"><Users className="w-3.5 h-3.5 text-slate-400 shrink-0" /><span className="truncate">For {forWhom}</span></div>}
                <p className="text-[11px] text-slate-400 font-semibold flex items-center justify-between">Ref: {bv.ref || b.bookingNumber}{(lab || b.homeCare) && <span className="text-orange-800 inline-flex items-center">{lab ? 'Open lab booking' : 'Open home care'}<ChevronRight className="w-3.5 h-3.5" /></span>}
                {b.homeCare && bv.detail && <span className="block text-slate-500">{bv.detail}</span>}</p>
              </div>
              {b.totalAmount != null ? (
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between min-h-10">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total</span>
                  <span className="font-black text-slate-800 text-sm flex items-center gap-2">
                    {String(b.paymentStatus || '').toUpperCase() === 'REFUNDED' && (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border bg-sky-50 text-sky-700 border-sky-200">Refunded</span>
                    )}
                    ₹{b.totalAmount}
                  </span>
                </div>
              ) : (
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between min-h-10">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Booking details</span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-orange-800 motion-safe:transition-colors motion-reduce:transition-none" />
                </div>
              )}
            </motion.button>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center shadow-xs">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <h3 className="font-bold text-slate-700 text-lg">No {activeTab} bookings</h3>
          <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto px-4">
            {activeTab === 'active' ? 'Visits, lab tests and home care happening today or in progress show here.'
              : activeTab === 'upcoming' ? 'Your future doctor visits, video consultations, lab tests and home care visits show here.'
              : activeTab === 'completed' ? 'Finished visits show here, with their prescriptions, reports and bills.'
              : 'Bookings you or the provider cancelled show here, with the refund status.'}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2 px-4">
            <button type="button" onClick={() => navigate('/find-doctors')} className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5"><Stethoscope className="w-4 h-4 text-primary" /> Book a doctor</button>
            <button type="button" onClick={() => navigate('/lab-tests')} className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5"><FlaskConical className="w-4 h-4 text-primary" /> Book a lab test</button>
            <button type="button" onClick={() => navigate('/home-care')} className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5"><Home className="w-4 h-4 text-primary" /> Home care</button>
          </div>
          {medOrders && medOrders.open + medOrders.done > 0 && (
            <button type="button" onClick={() => navigate('/pharmacy-orders')} className="mt-6 mx-auto flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-50 border border-teal-100 text-xs font-semibold text-teal-900 hover:bg-teal-100">
              <Pill className="w-4 h-4" />
              Medicine orders are in Pharmacy Orders: {[medOrders.open ? `${medOrders.open} in progress` : '', medOrders.done ? `${medOrders.done} finished` : ''].filter(Boolean).join(', ')}
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Detail modal (real fields only) */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 flex flex-col">
            {/* Header — stays fixed while the body below scrolls */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-5 shrink-0">
              <div className="min-w-0">
                <h3 className="font-extrabold text-slate-900 text-lg truncate">{KIND[selectedBooking.kind]?.label || appointmentTypeLabel(selectedBooking.appointmentType)}{selectedBooking.doctorName ? ` with ${formatDoctorName(selectedBooking.doctorName)}` : ""}</h3>
                {selectedBooking.business?.name && <p className="text-sm font-semibold text-slate-600 truncate">{selectedBooking.business.name} · {selectedBooking.business.type}</p>}
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
                  {displayStatus(selectedBooking)}
                </span>
                <button onClick={() => openBooking(null)} className="p-2 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto px-6 py-5 space-y-6 modal-scrollbar">
              {declinedBy(selectedBooking) && (
                <div role="status" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 space-y-2">
                  <p className="text-sm font-extrabold text-rose-900">
                    {declinedBy(selectedBooking) === 'doctor' ? `${formatDoctorName(selectedBooking.doctorName) || 'The doctor'} couldn't see you` : `${selectedBooking.branchName || 'The clinic'} couldn't see you`} at this time.
                  </p>
                  {selectedBooking.cancellationReason && <p className="text-sm text-rose-800">Reason: {selectedBooking.cancellationReason}</p>}
                  <p className="text-xs font-semibold text-rose-800">
                    {String(selectedBooking.paymentStatus || '').toUpperCase() === 'REFUNDED'
                      ? refundText(`₹${Number(selectedBooking.totalAmount || 0).toLocaleString('en-IN')}`)
                      : 'You were not charged for this visit.'}
                  </p>
                  <button onClick={() => navigate('/find-doctors')} className="mt-1 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs">
                    Find another doctor
                  </button>
                </div>
              )}
              {/* Doctor & Clinic */}
              {(selectedBooking.doctorName || selectedBooking.branchName || selectedBooking.location) && (
                <DetailSection icon={Stethoscope} title="Doctor & Clinic">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                    <DetailField label="Doctor" value={formatDoctorName(selectedBooking.doctorName)} />
                    {(() => {
                      // A doctor's own practice is listed under the doctor's name: show just the clinic, once.
                      // A hospital visit shows the hospital and which branch.
                      const b = selectedBooking.business;
                      const doc = String(selectedBooking.doctorName || '').replace(/^dr[.]?[ ]*/i, '').trim().toLowerCase();
                      const ownPractice = !b?.name || (doc && String(b.name).trim().toLowerCase() === doc) || /clinic/i.test(String(b?.type || ''));
                      const isHospital = /hospital/i.test(String(b?.type || ''));
                      return <>
                        {!ownPractice && <DetailField label={b?.type || 'Hospital'} value={b?.name || null} />}
                        <DetailField label="Department" value={selectedBooking.department} />
                        <DetailField label={isHospital ? 'Branch' : 'Clinic'} value={selectedBooking.branchName || (ownPractice ? null : b?.name || null)} />
                      </>;
                    })()}
                    <DetailField label="Location" value={selectedBooking.location} />
                  </div>
                </DetailSection>
              )}
              {selectedBooking.facilityId && selectedBooking.appointmentType !== 'VIDEO_CALL' && selectedBooking.appointmentType !== 'HOME_VISIT' && !/CANCEL|DECLIN/i.test(String(selectedBooking.status || '')) && (
                <BookedBranchLocation owner={selectedBooking.hospitalPartnerId || selectedBooking.providerId} facilityId={selectedBooking.facilityId} fallbackName={selectedBooking.business?.name || selectedBooking.branchName || 'Clinic'} fallbackAddress={selectedBooking.location || ''} />
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
                        <p className="text-sm font-black text-slate-900">{formatTime(selectedBooking.timeSlot)}</p>
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

            {rescheduleOpen && canCancel(selectedBooking) && (
              <ReschedulePanel
                booking={selectedBooking}
                onCancel={() => setRescheduleOpen(false)}
                onDone={async (r) => {
                  setBanner({ tone: 'ok', text: `${r.booking_number} moved to ${formatDayDate(r.appointment_date)}, ${formatTime(r.time_slot)}. ${r.reschedules_left > 0 ? `You can reschedule ${r.reschedules_left} more time.` : 'This was the last reschedule for this visit.'}` });
                  openBooking(null);
                  await load();
                }}
              />
            )}

            {cancelOpen && canCancel(selectedBooking) && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 space-y-3" role="group" aria-label="Cancel this booking">
                <p className="text-sm font-extrabold text-rose-900">Cancel this booking?</p>
                <p className="text-xs font-semibold text-slate-700">
                  {paidOnline(selectedBooking)
                    ? `You paid ₹${selectedBooking.totalAmount ?? ''} online. The full amount is refunded to the same payment method (usually 5–7 working days).`
                    : 'You have not been charged, so there is nothing to refund.'}
                  {' '}The time slot is released for other patients and the doctor is informed.
                </p>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Reason for cancelling">
                  {CANCEL_REASONS.map((r) => (
                    <button key={r} type="button" role="radio" aria-checked={cancelReason === r} onClick={() => setCancelReason(r)}
                      className={`px-3 py-1.5 rounded-full border text-xs font-bold ${cancelReason === r ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                      {r}
                    </button>
                  ))}
                </div>
                {cancelError && <p role="alert" className="text-xs font-bold text-rose-700">{cancelError}</p>}
                <div className="flex justify-end gap-2">
                  <button onClick={() => setCancelOpen(false)} className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs">Keep booking</button>
                  <button onClick={confirmCancel} disabled={cancelBusy} className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-bold text-xs">
                    {cancelBusy ? 'Cancelling…' : 'Yes, cancel booking'}
                  </button>
                </div>
              </div>
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
            <div className="border-t border-slate-100 px-6 py-4 flex flex-wrap items-center justify-end gap-2 shrink-0">
              {selectedBooking.bookingNumber && (
                <button
                  onClick={() => navigate(`/help?booking=${encodeURIComponent(selectedBooking.bookingNumber!)}`)}
                  className="mr-auto px-3 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs flex items-center gap-1.5"
                >
                  <LifeBuoy className="w-4 h-4" /> Get help with this booking
                </button>
              )}
              {canCancel(selectedBooking) && !cancelOpen && !rescheduleOpen && selectedBooking.providerId && (
                <button
                  onClick={() => { setRescheduleOpen(true); setCancelOpen(false); }}
                  className="px-4 py-2.5 rounded-xl border border-sky-200 text-sky-800 hover:bg-sky-50 font-bold text-xs flex items-center gap-1.5"
                >
                  <CalendarClock className="w-4 h-4" /> Reschedule
                </button>
              )}
              {canCancel(selectedBooking) && !cancelOpen && !rescheduleOpen && (
                <button
                  onClick={() => { setCancelOpen(true); setCancelError(null); }}
                  className="px-4 py-2.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs flex items-center gap-1.5"
                >
                  <Ban className="w-4 h-4" /> Cancel booking
                </button>
              )}
              {(selectedBooking.tab === 'completed' || selectedBooking.tab === 'cancelled') && selectedBooking.appointmentType && (
                <button
                  onClick={() => {
                    const b = selectedBooking;
                    if (b && b.providerId && (b.kind === 'DOCTOR_VISIT' || b.kind === 'VIDEO_CONSULT')) {
                      const q = new URLSearchParams({ doctor: String(b.providerId), mode: b.kind === 'VIDEO_CONSULT' ? 'video' : 'clinic', rebook: '1' });
                      if (b.patientName) q.set('for', b.patientName);
                      navigate(`/find-doctors?${q.toString()}`);
                    } else navigate(b?.kind === 'LAB_TEST' ? '/lab-tests' : b?.kind === 'HOME_VISIT' || b?.kind === 'HOME_CARE' ? '/home-care' : '/find-doctors');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" /> Book Again
                </button>
              )}
              <button onClick={() => openBooking(null)} className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Done
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// The booked branch (by its id, so it is the exact place booked, not the hospital's main address):
// address, confirmed map pin and directions.
function BookedBranchLocation({ owner, facilityId, fallbackName, fallbackAddress }: { owner: string | null; facilityId: number; fallbackName: string; fallbackAddress: string }) {
  const [b, setB] = useState<Branch | null | undefined>(undefined);
  useEffect(() => {
    if (!owner) { setB(null); return; }
    getBranchesApi(owner).then((list) => setB(list.find((x) => Number(x.facility_id) === Number(facilityId)) || null)).catch(() => setB(null));
  }, [owner, facilityId]);
  if (b === undefined) return null;
  const address = b ? [b.address_line_1, b.area, b.city, b.state, b.pincode].filter(Boolean).join(', ') : fallbackAddress;
  return <VisitLocation title="Where to go" name={b ? `${fallbackName.includes(b.name) ? fallbackName : `${fallbackName} · ${b.name}`}` : fallbackName} address={address} pin={b?.pin || null} phone={b?.phone || null} />;
}
