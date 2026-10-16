import React, { useState, useEffect, useCallback } from 'react';
import {
  Star,
  MessageSquare,
  AlertCircle,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Package,
  Stethoscope,
  Building2,
  Home,
  Layers,
  Tag,
  Send,
} from 'lucide-react';
import { formatDate } from '../../../utils/dateFormat';
import { formatDoctorName } from '../../../utils/doctorLabel';
import { getDashboardApi, type DashboardBooking } from '../../../services/dashboardHelper';
import { createReviewApi, getMyReviewsApi, type PatientReview } from '../../../services/reviewHelper';
import { equipmentService } from '../equipment/equipmentService';
import type { PatientRentalOrder } from '../equipment/types';

type ReviewCategory = 'all' | 'equipment' | 'doctor' | 'clinic' | 'homecare';

function appointmentTypeLabel(t: string | null): string {
  switch (t) {
    case 'VIDEO_CALL': return 'Video Consultation';
    case 'IN_CLINIC': return 'In-Clinic Visit';
    case 'HOME_VISIT': return 'Home Visit';
    default: return 'Consultation';
  }
}

function getConsultationCategory(b: DashboardBooking): 'doctor' | 'clinic' | 'homecare' {
  const booking = b as any;
  if (b.appointmentType === 'VIDEO_CALL' || booking.kind === 'VIDEO_CONSULT') {
    return 'doctor';
  }
  if (b.appointmentType === 'HOME_VISIT' || booking.kind === 'HOME_VISIT' || booking.kind === 'HOME_CARE') {
    return 'homecare';
  }
  return 'clinic';
}

const StarRow = ({
  value,
  onChange,
  size = 'sm',
}: {
  value: number;
  onChange?: (n: number) => void;
  size?: 'sm' | 'lg';
}) => (
  <span className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => {
      const cls = size === 'lg' ? 'w-6 h-6' : 'w-4 h-4';
      const star = (
        <Star
          className={`${cls} ${
            s <= value ? 'text-amber-500 fill-amber-500' : 'text-slate-300'
          }`}
        />
      );
      return onChange ? (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className="p-0.5 hover:scale-110 transition-transform"
        >
          {star}
        </button>
      ) : (
        <span key={s}>{star}</span>
      );
    })}
  </span>
);

const EQUIPMENT_FEEDBACK_TAGS = [
  'Clean & Sanitized',
  'Prompt Delivery',
  'Smooth Return',
  'Great Condition',
  'Helpful Support',
  'Easy to Operate',
];

export default function ReviewsScreen() {
  const [activeCategory, setActiveCategory] = useState<ReviewCategory>('all');
  const [completedBookings, setCompletedBookings] = useState<DashboardBooking[]>([]);
  const [consultationReviews, setConsultationReviews] = useState<Record<string, PatientReview>>({});
  const [equipmentOrders, setEquipmentOrders] = useState<PatientRentalOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Per-booking consultation write form state
  const [consultationDrafts, setConsultationDrafts] = useState<Record<string, { rating: number; comment: string }>>({});
  const [submittingConsultation, setSubmittingConsultation] = useState<string | null>(null);

  // Per-order equipment write form state
  const [equipmentDrafts, setEquipmentDrafts] = useState<
    Record<string, { rating: number; review: string; tags: string[] }>
  >({});
  const [submittingEquipment, setSubmittingEquipment] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashboard, myReviews, rentalOrdersRes] = await Promise.all([
        getDashboardApi().catch(() => ({ history: [] as DashboardBooking[] })),
        getMyReviewsApi().catch(() => ({} as Record<string, PatientReview>)),
        equipmentService.getMyOrders().catch(() => ({ orders: [] as PatientRentalOrder[] })),
      ]);

      const doneBookings = (dashboard.history || []).filter(
        (b) => !(b.status || '').toUpperCase().includes('CANCEL')
      );
      setCompletedBookings(doneBookings);
      setConsultationReviews(myReviews);
      setEquipmentOrders(rentalOrdersRes.orders || []);
    } catch {
      setError('Unable to load your reviews. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Consultation draft helpers
  const getConsultDraft = (id: string) => consultationDrafts[id] || { rating: 5, comment: '' };
  const setConsultDraft = (id: string, patch: Partial<{ rating: number; comment: string }>) =>
    setConsultationDrafts((prev) => ({ ...prev, [id]: { ...getConsultDraft(id), ...patch } }));

  const submitConsultationReview = async (bookingId: string) => {
    const d = getConsultDraft(bookingId);
    setSubmittingConsultation(bookingId);
    try {
      await createReviewApi(bookingId, d.rating, d.comment.trim() || undefined);
      setConsultationReviews(await getMyReviewsApi());
    } catch {
      alert('Could not submit your review. Please try again.');
    } finally {
      setSubmittingConsultation(null);
    }
  };

  // Equipment draft helpers
  const getEqDraft = (id: string) => equipmentDrafts[id] || { rating: 5, review: '', tags: [] };
  const setEqDraft = (
    id: string,
    patch: Partial<{ rating: number; review: string; tags: string[] }>
  ) => setEquipmentDrafts((prev) => ({ ...prev, [id]: { ...getEqDraft(id), ...patch } }));

  const toggleEquipmentTag = (orderId: string, tag: string) => {
    const current = getEqDraft(orderId);
    const exists = current.tags.includes(tag);
    const updatedTags = exists
      ? current.tags.filter((t) => t !== tag)
      : [...current.tags, tag];
    setEqDraft(orderId, { tags: updatedTags });
  };

  const submitEquipmentReview = async (orderId: string) => {
    const d = getEqDraft(orderId);
    setSubmittingEquipment(orderId);
    try {
      const res = await equipmentService.submitOrderFeedback(orderId, {
        rating: d.rating,
        review: d.review.trim() || undefined,
        tags: d.tags,
      });
      if (res.success) {
        await load();
      } else {
        alert(res.message);
      }
    } catch (e: any) {
      alert(e?.message || 'Could not submit your feedback.');
    } finally {
      setSubmittingEquipment(null);
    }
  };

  // Categorize consultations
  const pendingConsultations = completedBookings.filter((b) => !consultationReviews[b.id]);
  const reviewedConsultations = completedBookings.filter((b) => consultationReviews[b.id]);

  // Categorize equipment orders
  const reviewedEquipmentOrders = equipmentOrders.filter(
    (o) => o.feedback && o.feedback.rating != null
  );
  const pendingEquipmentOrders = equipmentOrders.filter(
    (o) =>
      (o.status === 'completed' ||
        o.status === 'return_inspection_pending' ||
        Boolean(o.returnDetails?.collectedAt) ||
        o.returnDetails?.status === 'equipment_received') &&
      (!o.feedback || o.feedback.rating == null)
  );

  // Tab counts
  const countForCategory = (cat: ReviewCategory): number => {
    switch (cat) {
      case 'equipment':
        return reviewedEquipmentOrders.length;
      case 'doctor':
        return reviewedConsultations.filter((b) => getConsultationCategory(b) === 'doctor').length;
      case 'clinic':
        return reviewedConsultations.filter((b) => getConsultationCategory(b) === 'clinic').length;
      case 'homecare':
        return reviewedConsultations.filter((b) => getConsultationCategory(b) === 'homecare').length;
      case 'all':
      default:
        return reviewedConsultations.length + reviewedEquipmentOrders.length;
    }
  };

  const pendingCountForCategory = (cat: ReviewCategory): number => {
    switch (cat) {
      case 'equipment':
        return pendingEquipmentOrders.length;
      case 'doctor':
        return pendingConsultations.filter((b) => getConsultationCategory(b) === 'doctor').length;
      case 'clinic':
        return pendingConsultations.filter((b) => getConsultationCategory(b) === 'clinic').length;
      case 'homecare':
        return pendingConsultations.filter((b) => getConsultationCategory(b) === 'homecare').length;
      case 'all':
      default:
        return pendingConsultations.length + pendingEquipmentOrders.length;
    }
  };

  // Filtered lists based on active category
  const showEquipment = activeCategory === 'all' || activeCategory === 'equipment';
  const showConsultations = activeCategory !== 'equipment';

  const visiblePendingConsultations = showConsultations
    ? pendingConsultations.filter((b) =>
        activeCategory === 'all' ? true : getConsultationCategory(b) === activeCategory
      )
    : [];

  const visibleReviewedConsultations = showConsultations
    ? reviewedConsultations.filter((b) =>
        activeCategory === 'all' ? true : getConsultationCategory(b) === activeCategory
      )
    : [];

  const visiblePendingEquipment = showEquipment ? pendingEquipmentOrders : [];
  const visibleReviewedEquipment = showEquipment ? reviewedEquipmentOrders : [];

  const totalVisibleReviewed = visibleReviewedConsultations.length + visibleReviewedEquipment.length;
  const totalVisiblePending = visiblePendingConsultations.length + visiblePendingEquipment.length;
  const totalItems = totalVisibleReviewed + totalVisiblePending;

  const categoryTabs: { id: ReviewCategory; label: string; icon: React.ElementType }[] = [
    { id: 'all', label: 'All Reviews', icon: Layers },
    { id: 'equipment', label: 'Equipment Rentals', icon: Package },
    { id: 'doctor', label: 'Doctor Consultation', icon: Stethoscope },
    { id: 'clinic', label: 'Clinic Visits', icon: Building2 },
    { id: 'homecare', label: 'Home Care', icon: Home },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Ratings & Reviews
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
            Rate your completed consultations and equipment rentals, and read feedback responses.
          </p>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-200">
        {categoryTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeCategory === tab.id;
          const count = countForCategory(tab.id);
          const pCount = pendingCountForCategory(tab.id);

          return (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {count > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-teal-50 text-teal-700'
                  }`}
                >
                  {count}
                </span>
              )}
              {pCount > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                    isActive ? 'bg-amber-400 text-slate-900' : 'bg-amber-100 text-amber-800'
                  }`}
                  title={`${pCount} awaiting review`}
                >
                  {pCount} pending
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center shadow-xs">
          <div className="w-7 h-7 border-[3px] border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 font-medium text-sm">Loading reviews from database...</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center shadow-xs space-y-3">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <p className="text-rose-600 font-semibold text-sm">{error}</p>
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl"
          >
            <RotateCcw className="w-4 h-4" /> Retry
          </button>
        </div>
      ) : totalItems === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-20 text-center shadow-xs space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 mx-auto">
            {activeCategory === 'equipment' ? (
              <Package className="w-8 h-8" />
            ) : activeCategory === 'clinic' ? (
              <Building2 className="w-8 h-8" />
            ) : activeCategory === 'homecare' ? (
              <Home className="w-8 h-8" />
            ) : (
              <Star className="w-8 h-8" />
            )}
          </div>
          <h3 className="font-extrabold text-slate-800 text-lg">
            {activeCategory === 'equipment'
              ? 'No equipment reviews yet'
              : activeCategory === 'doctor'
              ? 'No doctor consultation reviews yet'
              : activeCategory === 'clinic'
              ? 'No clinic visit reviews yet'
              : activeCategory === 'homecare'
              ? 'No home care reviews yet'
              : 'No reviews found'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto font-medium">
            {activeCategory === 'equipment'
              ? 'Once your equipment rental is completed, you can submit your ratings and feedback here.'
              : 'Once your completed service or consultation is finished, you can rate and review it here.'}
          </p>
        </div>
      ) : (
        <>
          {/* Awaiting your review */}
          {totalVisiblePending > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block animate-pulse" />
                  Awaiting your review ({totalVisiblePending})
                </h2>
              </div>

              {/* Pending Equipment Reviews */}
              {visiblePendingEquipment.map((order) => {
                const eqDraft = getEqDraft(order.id);
                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl border border-teal-200/80 shadow-xs p-5 sm:p-6 space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                          {order.equipmentImage ? (
                            <img
                              src={order.equipmentImage}
                              alt={order.equipmentName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <Package className="w-7 h-7 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200/60">
                              <Package className="w-3.5 h-3.5" /> Equipment Rental
                            </span>
                            <span className="text-xs font-semibold text-slate-400">
                              Order #{order.orderNumber}
                            </span>
                          </div>
                          <h3 className="font-extrabold text-slate-900 text-base">
                            {order.equipmentName}
                          </h3>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            {order.provider?.name ? `Provider: ${order.provider.name}` : ''}
                            {order.startDate && order.endDate
                              ? ` · Rental: ${formatDate(order.startDate)} – ${formatDate(order.endDate)}`
                              : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:items-end gap-1">
                        <span className="text-xs font-bold text-slate-600">Your Rating</span>
                        <StarRow
                          value={eqDraft.rating}
                          onChange={(n) => setEqDraft(order.id, { rating: n })}
                          size="lg"
                        />
                      </div>
                    </div>

                    {/* Tags selection */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600">Quick Tags</label>
                      <div className="flex flex-wrap gap-2">
                        {EQUIPMENT_FEEDBACK_TAGS.map((tag) => {
                          const isSelected = eqDraft.tags.includes(tag);
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => toggleEquipmentTag(order.id, tag)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                isSelected
                                  ? 'bg-teal-600 text-white shadow-xs'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              }`}
                            >
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Review textarea */}
                    <textarea
                      value={eqDraft.review}
                      onChange={(e) => setEqDraft(order.id, { review: e.target.value })}
                      placeholder="Write your review about the equipment condition, delivery, and service (optional)..."
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 min-h-[75px]"
                    />

                    <div className="flex justify-end">
                      <button
                        onClick={() => submitEquipmentReview(order.id)}
                        disabled={submittingEquipment === order.id}
                        className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors"
                      >
                        {submittingEquipment === order.id ? (
                          'Submitting...'
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" /> Submit Equipment Feedback
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Pending Consultations */}
              {visiblePendingConsultations.map((b) => {
                const d = getConsultDraft(b.id);
                const cat = getConsultationCategory(b);
                const CatIcon = cat === 'doctor' ? Stethoscope : cat === 'homecare' ? Home : Building2;

                return (
                  <div
                    key={b.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                            <CatIcon className="w-3.5 h-3.5" /> {appointmentTypeLabel(b.appointmentType)}
                          </span>
                        </div>
                        <h3 className="font-extrabold text-slate-800 text-sm">
                          {formatDoctorName(b.doctorName) || appointmentTypeLabel(b.appointmentType)}
                        </h3>
                        <p className="text-[11px] text-slate-400 font-semibold flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {[
                            appointmentTypeLabel(b.appointmentType),
                            b.branchName,
                            formatDate(b.appointmentDate || b.bookingDate),
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                          {b.patientName ? ` · for ${b.patientName}` : ''}
                        </p>
                      </div>
                      <StarRow
                        value={d.rating}
                        onChange={(n) => setConsultDraft(b.id, { rating: n })}
                        size="lg"
                      />
                    </div>
                    <textarea
                      value={d.comment}
                      onChange={(e) => setConsultDraft(b.id, { comment: e.target.value })}
                      placeholder="Share your experience (optional)..."
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 min-h-[70px]"
                    />
                    <button
                      onClick={() => submitConsultationReview(b.id)}
                      disabled={submittingConsultation === b.id}
                      className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-bold text-xs flex items-center gap-1.5"
                    >
                      {submittingConsultation === b.id ? (
                        'Submitting...'
                      ) : (
                        <>
                          <Star className="w-4 h-4" /> Submit Review
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Your Reviews */}
          {totalVisibleReviewed > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  Your submitted reviews ({totalVisibleReviewed})
                </h2>
              </div>

              {/* Submitted Equipment Reviews */}
              {visibleReviewedEquipment.map((order) => {
                const fb = order.feedback!;
                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                          {order.equipmentImage ? (
                            <img
                              src={order.equipmentImage}
                              alt={order.equipmentName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <Package className="w-7 h-7 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200/60">
                              <Package className="w-3.5 h-3.5" /> Equipment Rental
                            </span>
                            <span className="text-xs font-semibold text-slate-400">
                              Order #{order.orderNumber}
                            </span>
                          </div>
                          <h3 className="font-extrabold text-slate-900 text-base">
                            {order.equipmentName}
                          </h3>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            {order.provider?.name ? `Provider: ${order.provider.name}` : ''}
                            {order.startDate && order.endDate
                              ? ` · Rental: ${formatDate(order.startDate)} – ${formatDate(order.endDate)}`
                              : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex sm:flex-col items-center sm:items-end gap-1.5 shrink-0">
                        <StarRow value={fb.rating || 5} size="sm" />
                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                          {Number(fb.rating).toFixed(1)} / 5.0
                        </span>
                      </div>
                    </div>

                    {fb.review && (
                      <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/80">
                        <p className="text-sm text-slate-700 font-medium italic">
                          "{fb.review}"
                        </p>
                      </div>
                    )}

                    {fb.tags && Array.isArray(fb.tags) && fb.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {fb.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200"
                          >
                            <Tag className="w-3 h-3 text-slate-400" /> {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1 font-semibold text-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Submitted verified review
                      </span>
                      {fb.submitted_at && <span>{formatDate(fb.submitted_at)}</span>}
                    </div>
                  </div>
                );
              })}

              {/* Submitted Consultations */}
              {visibleReviewedConsultations.map((b) => {
                const rv = consultationReviews[b.id];
                const cat = getConsultationCategory(b);
                const CatIcon = cat === 'doctor' ? Stethoscope : cat === 'homecare' ? Home : Building2;

                return (
                  <div
                    key={b.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-2 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                            <CatIcon className="w-3.5 h-3.5" /> {appointmentTypeLabel(b.appointmentType)}
                          </span>
                        </div>
                        <h3 className="font-extrabold text-slate-800 text-sm">
                          {formatDoctorName(rv.doctor_name || b.doctorName) || appointmentTypeLabel(b.appointmentType)}
                        </h3>
                        <p className="text-[11px] text-slate-400 font-semibold">
                          {[b.branchName, formatDate(b.appointmentDate || b.bookingDate)]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </div>
                      <StarRow value={rv.rating} />
                    </div>
                    {rv.review && <p className="text-sm text-slate-700 italic">"{rv.review}"</p>}
                    {rv.partner_response ? (
                      <div className="mt-1 p-3 rounded-xl bg-teal-50/60 border border-teal-100">
                        <span className="text-[11px] font-bold text-teal-700 flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5" /> Doctor's response
                        </span>
                        <p className="text-sm text-slate-700 mt-1">{rv.partner_response}</p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 pt-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Submitted — awaiting response.
                      </p>
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


