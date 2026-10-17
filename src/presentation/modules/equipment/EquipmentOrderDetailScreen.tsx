import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Package,
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
  Truck,
  CheckCircle2,
  Info,
  CreditCard,
  RotateCcw,
  User,
  Phone,
  FileText,
  Tag,
  Box,
  Store,
  Mail,
  Lock,
  Bell,
  Star,
  X,
  AlertTriangle,
  Ban,
  Send,
} from 'lucide-react';
import type { PatientRentalOrder, RentalOrderStatus } from './types';
import { equipmentService } from './equipmentService';

export const EquipmentOrderDetailScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<PatientRentalOrder | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Cancellation Modal & State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);
  const [cancelReasonPreset, setCancelReasonPreset] = useState<string>('Change of medical requirement / No longer needed');
  const [cancelCustomNotes, setCancelCustomNotes] = useState<string>('');
  const [cancelLoading, setCancelLoading] = useState<boolean>(false);
  const [cancellationNotice, setCancellationNotice] = useState<string | null>(null);

  // Feedback Modal & State
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState<boolean>(false);
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackReview, setFeedbackReview] = useState<string>('');
  const [feedbackTags, setFeedbackTags] = useState<string[]>(['Clean & Sanitized', 'Prompt Delivery']);
  const [feedbackLoading, setFeedbackLoading] = useState<boolean>(false);
  const [feedbackSuccessMsg, setFeedbackSuccessMsg] = useState<string | null>(null);

  const availableFeedbackTags = [
    'Clean & Sanitized',
    'Prompt Delivery',
    'Smooth Return',
    'Great Condition',
    'Clear Instructions',
    'Helpful Support',
  ];

  const toggleFeedbackTag = (tag: string) => {
    setFeedbackTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    equipmentService
      .getOrderById(id)
      .then((res) => {
        setOrder(res.order || null);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to get order details:', err);
        setOrder(null);
        setLoading(false);
      });
  }, [id]);

  const handleCancelOrder = async () => {
    if (!order) return;
    const finalReason = cancelCustomNotes.trim()
      ? `${cancelReasonPreset}: ${cancelCustomNotes.trim()}`
      : cancelReasonPreset;

    setCancelLoading(true);
    try {
      const res = await equipmentService.cancelOrder(order.orderNumber, finalReason);
      if (res.success) {
        setCancellationNotice(
          res.message || 'Your order has been cancelled and your refund will be initiated within 3 working days.',
        );
        setOrder({
          ...order,
          status: 'cancelled',
          cancellationReason: finalReason,
        });
        setIsCancelModalOpen(false);
      } else {
        alert(res.message || 'Failed to cancel rental order.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error occurred while cancelling order.');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!order) return;
    setFeedbackLoading(true);
    try {
      const res = await equipmentService.submitOrderFeedback(order.orderNumber, {
        rating: feedbackRating,
        review: feedbackReview,
        tags: feedbackTags,
      });
      if (res.success) {
        setFeedbackSuccessMsg('Thank you! Your feedback has been recorded.');
        setOrder({
          ...order,
          feedback: {
            rating: feedbackRating,
            review: feedbackReview,
            tags: feedbackTags,
            submitted_at: new Date().toISOString(),
          },
        });
        setIsFeedbackModalOpen(false);
      } else {
        alert(res.message || 'Failed to submit feedback.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error occurred while submitting feedback.');
    } finally {
      setFeedbackLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-3 border-[#9C4119] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-700">Loading rental order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto">
            <Package className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Rental Order Not Found</h2>
          <p className="text-xs text-slate-500">
            No rental order records matching reference "{id}" could be retrieved.
          </p>
          <button
            type="button"
            onClick={() => navigate('/equipment-rental/orders')}
            className="px-5 py-2.5 bg-[#9C4119] text-white rounded-xl text-xs font-bold hover:bg-[#853512] transition-colors cursor-pointer"
          >
            Back to My Rentals
          </button>
        </div>
      </div>
    );
  }

  const formatBookedDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      });
    } catch {
      return 'Oct 03, 2026';
    }
  };

  const formatTimelineDateTime = (isoStr?: string) => {
    if (!isoStr) return { date: '—', time: '' };
    try {
      const d = new Date(isoStr);
      const date = d.toLocaleDateString(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const time = d.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      return { date, time };
    } catch {
      return { date: isoStr, time: '' };
    }
  };

  const getStatusBadge = (status: RentalOrderStatus) => {
    switch (status) {
      case 'active':
        return {
          label: 'Active Home Rental',
          className: 'bg-[#E6F4EA] text-[#137333]',
        };
      case 'confirmed':
        return {
          label: 'Confirmed',
          className: 'bg-[#EEF2F6] text-[#2C4964]',
        };
      case 'out_for_delivery':
        return {
          label: 'Out for Delivery',
          className: 'bg-[#E0F2FE] text-[#0369A1]',
        };
      case 'awaiting_confirmation':
        return {
          label: 'Awaiting Confirmation',
          className: 'bg-[#FEF7E0] text-[#B06000]',
        };
      case 'payment_pending':
        return {
          label: 'Payment Pending',
          className: 'bg-[#FFF0E6] text-[#C26532]',
        };
      case 'return_scheduled':
        return {
          label: 'Return Scheduled',
          className: 'bg-[#F3E8FF] text-[#7E22CE]',
        };
      case 'return_inspection_pending':
        return {
          label: 'Collected — Under Inspection',
          className: 'bg-[#FEF3C7] text-[#92400E]',
        };
      case 'completed':
        return {
          label: 'Completed',
          className: 'bg-slate-100 text-slate-700',
        };
      case 'rejected':
        return {
          label: 'Declined by Provider',
          className: 'bg-[#FEE2E2] text-[#991B1B]',
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          className: 'bg-slate-100 text-slate-600',
        };
      default:
        return {
          label: 'Active Home Rental',
          className: 'bg-[#E6F4EA] text-[#137333]',
        };
    }
  };

  const statusBadge = getStatusBadge(order.status);

  // Equipment is considered returned once collected by provider or marked completed/under inspection
  const isProductReturned = Boolean(
    order.status === 'completed' ||
    order.status === 'return_inspection_pending' ||
    order.returnDetails?.status === 'equipment_received' ||
    order.returnDetails?.status === 'completed' ||
    Boolean(order.returnDetails?.collectedAt) ||
    order.deliveryTimeline?.some((t) => {
      const st = String(t.status || '').toUpperCase();
      const title = String(t.title || '').toLowerCase();
      return st === 'COLLECTED' || st === 'RETURN_OTP_VERIFIED' || title.includes('collected');
    })
  );

  return (
    <div className="space-y-4 pb-16 font-sans animate-in fade-in duration-200">
      {/* 1. Breadcrumbs */}
      <nav className="flex items-center space-x-2 text-xs text-slate-500 font-medium" aria-label="Breadcrumb">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="hover:text-[#9C4119] transition-colors cursor-pointer"
        >
          Dashboard
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <button
          type="button"
          onClick={() => navigate('/equipment-rental/my-rentals')}
          className="hover:text-[#9C4119] transition-colors cursor-pointer"
        >
          My Rentals
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="text-[#C26532] font-bold">{order.orderNumber}</span>
      </nav>

      {/* 2. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Order {order.orderNumber}
            </h1>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${statusBadge.className}`}
            >
              {statusBadge.label}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Booked on {formatBookedDate(order.createdAt)}
          </p>
        </div>

        {/* Action Button on Right */}
        {/* Action Button / Return Status on Right */}
        {/* Action Button / Return Status / Cancel / Feedback on Right */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Cancel Order Button (Available only before out for delivery) */}
          {(() => {
            const isOutForDelivery =
              order.deliveryStatus === 'out_for_delivery' ||
              order.status === 'out_for_delivery' ||
              order.status === 'active' ||
              order.deliveryStatus === 'delivered';
            const isTerminal =
              ['completed', 'cancelled', 'rejected'].includes(order.status) || Boolean(order.returnDetails);

            if (isTerminal) return null;

            if (!isOutForDelivery && ['new', 'confirmed'].includes(order.status)) {
              return (
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                >
                  <Ban className="w-3.5 h-3.5 text-rose-600" />
                  <span>Cancel Order</span>
                </button>
              );
            }

            if (isOutForDelivery && order.status !== 'active') {
              return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-[11px] font-semibold">
                  <Truck className="w-3.5 h-3.5 text-amber-600" />
                  <span>Out for Delivery — Cannot Cancel</span>
                </span>
              );
            }

            return null;
          })()}

          {/* Feedback Submission Option: Shown only after product is returned, or if feedback is already recorded */}
          {(isProductReturned || Boolean(order.feedback)) && (
            <div>
              {order.feedback ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold shadow-2xs">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>Feedback Submitted ({order.feedback.rating}/5)</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsFeedbackModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                >
                  <Star className="w-3.5 h-3.5 fill-white text-white" />
                  <span>Submit Feedback</span>
                </button>
              )}
            </div>
          )}

          {order.returnDetails ? (
            <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#F3E8FF] border border-[#DDD6FE] text-[#7E22CE] rounded-xl text-xs font-bold shadow-2xs">
              <RotateCcw className="w-4 h-4 text-[#7E22CE]" />
              <span>
                {order.status === 'completed' ||
                order.status === 'return_inspection_pending' ||
                order.returnDetails.status === 'completed' ||
                order.returnDetails.status === 'equipment_received' ||
                Boolean(order.returnDetails.collectedAt)
                  ? 'Equipment Collected & Returned'
                  : 'Return Scheduled'}
              </span>
            </div>
          ) : ['confirmed', 'active', 'out_for_delivery'].includes(order.status) ? (
            (() => {
              const getDaysUntilEnd = (endDateStr?: string): number => {
                if (!endDateStr) return 0;
                const end = new Date(endDateStr);
                if (isNaN(end.getTime())) return 0;
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                end.setHours(0, 0, 0, 0);
                return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              };
              const daysUntilEnd = getDaysUntilEnd(order.endDate);
              const isReturnAllowed = daysUntilEnd <= 1;

              return isReturnAllowed ? (
                <button
                  type="button"
                  onClick={() => navigate(`/equipment-rental/returns?orderId=${order.orderNumber}`)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#9C4119] hover:bg-[#853512] text-white rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Schedule Return Pickup</span>
                </button>
              ) : (
                <div className="flex flex-col items-end gap-1">
                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 border border-slate-200 text-slate-400 rounded-xl text-xs font-medium cursor-not-allowed"
                    title={`Return scheduling unlocks 1 day before rental end date (${order.endDate})`}
                  >
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Return Opens 1 Day Prior</span>
                  </button>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Unlocks 1 day before end date
                  </span>
                </div>
              );
            })()
          ) : null}
        </div>
      </div>

      {/* 2a. Prominent Cancellation & Refund Notification Banner */}
      {(order.status === 'cancelled' || cancellationNotice) && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-900 shadow-2xs animate-in fade-in">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs space-y-1">
            <p className="font-bold text-sm text-rose-950">
              Order Cancelled
            </p>
            <p className="text-rose-800 leading-relaxed font-medium">
              {cancellationNotice ||
                (order.cancellationReason ? `${order.cancellationReason} — ` : '') +
                'Your order has been cancelled and your refund will be initiated within 3 working days.'}
            </p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 font-bold text-[11px] mt-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Refund of ₹{order.totalOrderValue.toLocaleString('en-IN')} will be initiated within 3 working days</span>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Toast */}
      {feedbackSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedbackSuccessMsg}</span>
          </div>
          <button onClick={() => setFeedbackSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2b. Notification Banner for 1-Day Prior Return Scheduling */}
      {(() => {
        if (order.returnDetails || !['active', 'confirmed'].includes(order.status)) return null;
        if (!order.endDate) return null;
        const end = new Date(order.endDate);
        if (isNaN(end.getTime())) return null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        const days = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (days > 1) return null;

        const isOverdue = days < 0;
        const extraDays = Math.abs(days);

        return (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900 shadow-2xs">
            <Bell className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <div className="font-bold text-sm text-amber-950 flex items-center gap-2">
                <span>{isOverdue ? 'Rental Duration Completed — Return Open' : 'Return Pickup Scheduling Is Now Open'}</span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                  {isOverdue ? `Kept ${extraDays} ${extraDays === 1 ? 'Day' : 'Days'} Extra` : '1-Day Notice'}
                </span>
              </div>
              <p className="mt-1 text-amber-800 leading-relaxed">
                {isOverdue ? (
                  <>
                    Your rental duration concluded on <strong>{order.endDate}</strong>. Please schedule your equipment return pickup from present date &amp; time onwards so our partner can coordinate collection.
                  </>
                ) : (
                  <>
                    Your rental period concludes on <strong>{order.endDate}</strong>. Please schedule your equipment return pickup so our partner can coordinate collection.
                  </>
                )}
              </p>
              <button
                type="button"
                onClick={() => navigate(`/equipment-rental/returns?orderId=${order.orderNumber}`)}
                className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#9C4119] text-white rounded-xl font-bold text-xs hover:bg-[#853512] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Schedule Return Pickup Now</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* 3. 2-Column Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-1">
        {/* LEFT COLUMN: Equipment Details, Delivery Details, Fulfilment Status (8 Cols) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Card 1: Equipment Details */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-slate-900 pb-1">
              <Package className="w-5 h-5 text-[#C26532] shrink-0" />
              <h2 className="text-base font-bold">Equipment Details</h2>
            </div>

            <div className="flex items-start gap-5">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 shrink-0">
                <img
                  src={order.equipmentImage || '/equipment/hospital-bed.jpg'}
                  alt={order.equipmentName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/equipment/hospital-bed.jpg';
                  }}
                />
              </div>

              <div className="space-y-1.5 min-w-0 flex-1">

                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                  {order.equipmentName}
                </h3>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pt-0.5">
                  <div className="flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                    <span>₹{order.dailyRate} / day</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Duration: {order.durationDays} days</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Box className="w-3.5 h-3.5 text-slate-400" />
                    <span>Quantity: {order.quantity || 1} unit</span>
                  </div>
                </div>

                <div className="pt-1.5">
                  <span className="inline-block bg-[#F8FAFC] border border-slate-200 px-3 py-1.5 rounded-lg text-xs text-slate-700 font-semibold">
                    Stock Allocation: {order.quantity || 1} {order.quantity === 1 ? 'unit' : 'units'} fulfilled
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Rental Provider Details */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-slate-900 pb-1">
              <Store className="w-5 h-5 text-[#C26532] shrink-0" />
              <h2 className="text-base font-bold">Rental Provider</h2>
            </div>

            <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Provider Name</span>
                <span className="font-bold text-slate-900">{order.provider?.name || 'Verified Equipment Provider'}</span>
              </div>
              {order.provider?.phone && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Support Contact</span>
                  <span className="font-bold text-slate-900">{order.provider.phone}</span>
                </div>
              )}
              {order.provider?.email && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Email</span>
                  <span className="font-bold text-slate-900">{order.provider.email}</span>
                </div>
              )}
              {order.provider?.address && (
                <div className="flex items-start justify-between gap-4 pt-1 border-t border-slate-200/60">
                  <span className="text-slate-500 font-medium shrink-0">Warehouse / Store</span>
                  <span className="font-medium text-slate-800 text-right leading-relaxed">{order.provider.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Delivery Details */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-slate-900 pb-1">
              <MapPin className="w-5 h-5 text-[#C26532] shrink-0" />
              <h2 className="text-base font-bold">Delivery Details</h2>
            </div>

            <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-500 font-medium">
                  <User className="w-4 h-4 text-slate-400" />
                  <span>Recipient</span>
                </div>
                <span className="font-bold text-slate-900">
                  {order.deliveryAddress?.recipientName || 'Patient'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-500 font-medium">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>Contact Number</span>
                </div>
                <span className="font-medium text-slate-800">
                  {order.deliveryAddress?.phone || 'Contact on file'}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2 text-slate-500 font-medium shrink-0">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>Delivery Address</span>
                </div>
                <span className="font-medium text-slate-800 text-right">
                  {order.deliveryAddress?.addressLine
                    ? `${order.deliveryAddress.addressLine}${order.deliveryAddress.city ? `, ${order.deliveryAddress.city}` : ''}${order.deliveryAddress.pincode ? ` - ${order.deliveryAddress.pincode}` : ''}`
                    : 'Address on file'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-500 font-medium">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span>Delivery Note</span>
                </div>
                <span className="font-medium text-slate-800">
                  {order.deliveryAddress?.instructions || 'Standard delivery'}
                </span>
              </div>
            </div>
          </div>

          {/* Dedicated Feedback Card upon Return / Completion */}
          {(isProductReturned || Boolean(order.feedback)) && (
            <div className="bg-gradient-to-r from-amber-50/80 to-orange-50/60 rounded-2xl border border-amber-200/90 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-amber-950 font-bold text-sm">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>{order.feedback ? 'Your Rental Review' : 'Submit Rental Feedback'}</span>
                </div>
                <p className="text-xs text-amber-900/80 leading-relaxed">
                  {order.feedback
                    ? `You rated this rental ${order.feedback.rating}/5 stars. "${order.feedback.review || 'No written comment'}". Thank you for sharing your experience!`
                    : 'Your rental equipment has been collected and returned. Please take a moment to submit your feedback.'}
                </p>
              </div>
              {!order.feedback ? (
                <button
                  type="button"
                  onClick={() => setIsFeedbackModalOpen(true)}
                  className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 bg-[#9C4119] hover:bg-[#853512] text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                >
                  <Star className="w-3.5 h-3.5 fill-white" />
                  <span>Submit Feedback</span>
                </button>
              ) : (
                <div className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-900 rounded-xl text-xs font-bold border border-amber-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-700" />
                  <span>Feedback Recorded</span>
                </div>
              )}
            </div>
          )}

          {/* Card 3: Order Tracking Timeline */}
          {(() => {
            const displayTimeline = (order.deliveryTimeline || []).filter((item) => {
              const st = String(item.status || '').toUpperCase();
              const title = String(item.title || '').toLowerCase();
              const desc = String(item.description || '').toLowerCase();
              return (
                !st.includes('INSPECT') &&
                !title.includes('inspect') &&
                !desc.includes('inspection') &&
                !desc.includes('restock')
              );
            });

            return (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-1">
                  <div className="flex items-center gap-2 text-slate-900">
                    <Clock className="w-5 h-5 text-[#C26532] shrink-0" />
                    <h2 className="text-base font-bold">Order Tracking Timeline</h2>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {displayTimeline.length} event{displayTimeline.length === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="space-y-4 pt-1">
                  {displayTimeline.length > 0 ? (
                    <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                      {displayTimeline.map((item, idx) => {
                        const { date, time } = formatTimelineDateTime(item.timestamp);
                        return (
                          <div key={idx} className="relative">
                        <div
                          className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 bg-white ${
                            item.current
                              ? 'border-[#C26532] ring-2 ring-[#C26532]/20'
                              : 'border-emerald-600'
                          }`}
                        >
                          <div
                            className={`w-2 h-2 rounded-full ${
                              item.current ? 'bg-[#C26532]' : 'bg-emerald-600'
                            }`}
                          />
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 text-xs">
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                              <span>{item.title}</span>
                              {item.status && (
                                <span className="text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                  {item.status}
                                </span>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-slate-600 leading-relaxed text-xs">
                                {item.description}
                              </p>
                            )}
                            {item.updaterRole && (
                              <div className="text-[11px] text-slate-600 flex items-center gap-1.5 pt-1 font-medium">
                                <User className="w-3.5 h-3.5 text-[#C26532] shrink-0" />
                                <span>Action by: <strong className="text-slate-800 font-bold">{item.updaterRole}</strong></span>
                              </div>
                            )}
                            {item.note && item.note !== item.description && (
                              <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-[11px] text-slate-700 mt-1 font-mono">
                                Note: {item.note}
                              </div>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-500 sm:text-right shrink-0 mt-0.5">
                            <span className="font-semibold text-slate-800 block">{date}</span>
                            {time && <span className="text-slate-400 block">{time}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 text-center text-slate-500 text-xs">
                  <Clock className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                  <p className="font-semibold text-slate-700">No status timeline events yet.</p>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Order was placed on {formatBookedDate(order.createdAt)}.
                  </p>
                </div>
              )}
            </div>
          </div>
            );
          })()}

          {/* Card 4: Scheduled Return Details (if scheduled) */}
          {order.returnDetails && (
            <div className="bg-[#FAF5FF] rounded-2xl border border-[#E9D5FF] p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-purple-900 pb-1">
                <RotateCcw className="w-5 h-5 text-purple-600 shrink-0" />
                <h2 className="text-base font-bold">Return Pickup Information</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white rounded-xl border border-purple-100">
                  <span className="text-slate-400 block text-[11px] mb-0.5">Requested Pickup Date</span>
                  <span className="font-bold text-slate-800">{order.returnDetails.requestedDate}</span>
                  {order.returnDetails.scheduledPickupSlot && (
                    <span className="text-slate-500 block text-[11px] mt-0.5">Slot: {order.returnDetails.scheduledPickupSlot}</span>
                  )}
                </div>
                <div className="p-3 bg-white rounded-xl border border-purple-100">
                  <span className="text-slate-400 block text-[11px] mb-0.5">Pickup Status</span>
                  <span className="font-bold capitalize text-purple-800">
                    {order.returnDetails.status.replace(/_/g, ' ')}
                  </span>
                </div>
                {order.returnDetails.pickupAddress && (
                  <div className="sm:col-span-2 p-3 bg-white rounded-xl border border-purple-100">
                    <span className="text-slate-400 block text-[11px] mb-0.5">Pickup Location</span>
                    <span className="font-medium text-slate-800">{order.returnDetails.pickupAddress}</span>
                  </div>
                )}
                {order.returnDetails.conditionNotes && (
                  <div className="sm:col-span-2 p-3 bg-white rounded-xl border border-purple-100">
                    <span className="text-slate-400 block text-[11px] mb-0.5">Patient Notes on Return</span>
                    <span className="text-slate-700">{order.returnDetails.conditionNotes}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Payment Status & Price Breakdown (4 Cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Card 1: Payment Status */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2 text-slate-900">
                <CreditCard className="w-5 h-5 text-[#C26532] shrink-0" />
                <h2 className="text-base font-bold">Payment Status</h2>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#E6F4EA] text-[#137333]">
                Paid
              </span>
            </div>

            <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Payment method</span>
                <span className="font-bold text-slate-900">{order.paymentMethod || 'UPI'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Provider status</span>
                <span className="font-bold text-slate-900">Accepted</span>
              </div>
            </div>
          </div>

          {/* Card 2: Price Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-slate-900 pb-1">
              <FileText className="w-5 h-5 text-[#C26532] shrink-0" />
              <h2 className="text-base font-bold">Price Breakdown</h2>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>
                  Equipment rental fee ({order.durationDays} days × ₹{order.dailyRate})
                </span>
                <span className="font-bold text-slate-900">
                  ₹{order.rentalFee.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span>Delivery & setup fee</span>
                <span className="font-bold text-slate-900">
                  ₹{order.deliveryFee.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="pt-3.5 border-t border-slate-200 flex items-baseline justify-between">
              <span className="text-sm font-bold text-slate-900">Total order value</span>
              <span className="text-2xl font-black text-[#9C4119]">
                ₹{order.totalOrderValue.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Order Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600">
                  <Ban className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Cancel Rental Order</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-700" />
                <span>Refund Policy Notice</span>
              </p>
              <p className="leading-relaxed">
                Your order will be cancelled immediately and your refund of <strong>₹{order.totalOrderValue.toLocaleString('en-IN')}</strong> will be initiated within <strong>3 working days</strong> to your original payment method.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Select Reason for Cancellation
                </label>
                <div className="space-y-2">
                  {[
                    'Change of medical requirement / No longer needed',
                    'Patient discharged / Recovered',
                    'Found alternative equipment locally',
                    'Delivery location / timeline mismatch',
                    'Other reason',
                  ].map((preset) => (
                    <label
                      key={preset}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                        cancelReasonPreset === preset
                          ? 'border-[#9C4119] bg-[#FFF5EB] font-bold text-slate-900'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="cancel_reason"
                        checked={cancelReasonPreset === preset}
                        onChange={() => setCancelReasonPreset(preset)}
                        className="text-[#9C4119] focus:ring-[#9C4119]"
                      />
                      <span>{preset}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Additional Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={cancelCustomNotes}
                  onChange={(e) => setCancelCustomNotes(e.target.value)}
                  placeholder="Provide any additional comments for our support team..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-[#9C4119]"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Keep Order
              </button>
              <button
                type="button"
                disabled={cancelLoading}
                onClick={handleCancelOrder}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              >
                {cancelLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback & Review Modal */}
      {isFeedbackModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                  <Star className="w-4 h-4 fill-amber-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Rate & Review Rental</h3>
                  <p className="text-[11px] text-slate-500">{order.equipmentName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFeedbackModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Star Rating Selector */}
            <div className="text-center py-2 space-y-1">
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFeedbackRating(star)}
                    className="p-1 hover:scale-110 transition-transform cursor-pointer"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        star <= feedbackRating
                          ? 'text-amber-500 fill-amber-500'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-xs font-bold text-slate-700">
                {feedbackRating === 5
                  ? 'Excellent (5/5)'
                  : feedbackRating === 4
                  ? 'Very Good (4/5)'
                  : feedbackRating === 3
                  ? 'Average (3/5)'
                  : feedbackRating === 2
                  ? 'Below Expectation (2/5)'
                  : 'Poor (1/5)'}
              </p>
            </div>

            {/* Compliments / Tags */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                What went well?
              </label>
              <div className="flex flex-wrap gap-1.5">
                {availableFeedbackTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleFeedbackTag(tag)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      feedbackTags.includes(tag)
                        ? 'bg-[#9C4119] text-white font-bold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Review Comment */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Your Review (Optional)
              </label>
              <textarea
                rows={3}
                value={feedbackReview}
                onChange={(e) => setFeedbackReview(e.target.value)}
                placeholder="Share your experience with equipment quality, hygiene, and handover..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-[#9C4119]"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsFeedbackModalOpen(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={feedbackLoading}
                onClick={handleSubmitFeedback}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#9C4119] hover:bg-[#853512] text-white text-xs font-bold rounded-xl transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{feedbackLoading ? 'Submitting...' : 'Submit Feedback'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipmentOrderDetailScreen;
