import MediaImage from '../../components/MediaImage';
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Calendar,
  Clock,
  RotateCcw,
  MapPin,
  ClipboardList,
  CheckCircle2,
  Info,
  ChevronRight,
  ChevronDown,
  Home,
  Building2,
  FileText,
  X,
  Check,
} from 'lucide-react';
import type { PatientRentalOrder } from './types';
import { equipmentService } from './equipmentService';

interface ReturnRequestItem {
  id: string;
  orderNumber: string;
  equipmentName: string;
  equipmentImage: string;
  requestedDate: string;
  pickupWindow?: string;
  status: 'request_pending' | 'pickup_scheduled' | 'return_inspection_pending' | 'completed';
}

interface PickupTimeSlot {
  id: string;
  label: string;
  timeRange: string;
  cutoffHour: number;
}

const PICKUP_TIME_SLOTS: PickupTimeSlot[] = [
  {
    id: 'morning',
    label: 'Morning Slot',
    timeRange: '10:00 AM – 01:00 PM',
    cutoffHour: 13,
  },
  {
    id: 'afternoon',
    label: 'Afternoon Slot',
    timeRange: '01:00 PM – 05:00 PM',
    cutoffHour: 17,
  },
  {
    id: 'evening',
    label: 'Evening Slot',
    timeRange: '05:00 PM – 08:00 PM',
    cutoffHour: 20,
  },
];

const getTodayString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTomorrowString = (): string => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const ReturnSchedulingScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paramOrderId = searchParams.get('orderId');

  const todayStr = getTodayString();
  const tomorrowStr = getTomorrowString();

  const [activeRentals, setActiveRentals] = useState<PatientRentalOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Form State
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [pickupMethod, setPickupMethod] = useState<'doorstep' | 'dropoff'>('doorstep');
  const [preferredDate, setPreferredDate] = useState<string>(todayStr);
  const [selectedPickupSlot, setSelectedPickupSlot] = useState<string>(
    PICKUP_TIME_SLOTS[0].timeRange
  );
  const [pickupAddress, setPickupAddress] = useState<string>('Registered Patient Address');
  const [pickupNotes, setPickupNotes] = useState<string>('');
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState<boolean>(false);
  const [submissionNotice, setSubmissionNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Return requests list (dynamically loaded from orders with return_schedule)
  const [returnRequests, setReturnRequests] = useState<ReturnRequestItem[]>([]);

  // Automatically adjust selected pickup slot if passed for today
  useEffect(() => {
    const isToday = preferredDate === todayStr;
    const currentHour = new Date().getHours();

    const firstAvailableSlot = PICKUP_TIME_SLOTS.find(
      (slot) => !isToday || currentHour < slot.cutoffHour
    );

    const isCurrentSlotPassed =
      isToday &&
      PICKUP_TIME_SLOTS.some(
        (slot) => slot.timeRange === selectedPickupSlot && currentHour >= slot.cutoffHour
      );

    if (isCurrentSlotPassed && firstAvailableSlot) {
      setSelectedPickupSlot(firstAvailableSlot.timeRange);
    } else if (!selectedPickupSlot && firstAvailableSlot) {
      setSelectedPickupSlot(firstAvailableSlot.timeRange);
    }
  }, [preferredDate, todayStr, selectedPickupSlot]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { orders } = await equipmentService.getMyOrders();

      // Orders eligible to schedule a return (active / confirmed without existing return schedule)
      const eligibleToReturn = orders.filter(
        (o) =>
          (o.status === 'confirmed' || o.status === 'active' || o.status === 'out_for_delivery') &&
          !o.returnDetails,
      );
      setActiveRentals(eligibleToReturn);

      // Orders that already have a return scheduled
      const existingReturns: ReturnRequestItem[] = orders
        .filter(
          (o) =>
            o.status === 'return_scheduled' ||
            o.status === 'return_inspection_pending' ||
            o.status === 'completed' ||
            Boolean(o.returnDetails),
        )
        .map((o) => {
          let reqStatus: ReturnRequestItem['status'] = 'pickup_scheduled';
          if (o.status === 'completed' || o.returnDetails?.status === 'completed') {
            reqStatus = 'completed';
          } else if (
            o.status === 'return_inspection_pending' ||
            o.returnDetails?.status === 'equipment_received'
          ) {
            reqStatus = 'return_inspection_pending';
          } else {
            reqStatus = 'pickup_scheduled';
          }

          return {
            id: o.id,
            orderNumber: o.orderNumber,
            equipmentName: o.equipmentName,
            equipmentImage: o.equipmentImage,
            requestedDate: o.returnDetails?.requestedDate || o.endDate,
            pickupWindow: o.returnDetails?.scheduledPickupSlot,
            status: reqStatus,
          };
        });
      setReturnRequests(existingReturns);

      // Pre-select order if provided in URL or pick first eligible
      if (paramOrderId) {
        const matched = eligibleToReturn.find(
          (o) => o.orderNumber === paramOrderId || o.id === paramOrderId,
        );
        if (matched) {
          setSelectedOrderId(matched.orderNumber);
          if (matched.deliveryAddress) {
            const addr = matched.deliveryAddress;
            const formatted = [addr.addressLine, addr.city, addr.pincode].filter(Boolean).join(', ');
            setPickupAddress(formatted || 'Registered Patient Address');
          }
        } else {
          const alreadyScheduled = orders.find(
            (o) => (o.orderNumber === paramOrderId || o.id === paramOrderId) && o.returnDetails,
          );
          if (alreadyScheduled) {
            setSubmissionNotice(
              `Order ${paramOrderId} already has a scheduled return request. Duplicate returns are not permitted.`,
            );
          }
          if (eligibleToReturn.length > 0) {
            setSelectedOrderId(eligibleToReturn[0].orderNumber);
            const addr = eligibleToReturn[0].deliveryAddress;
            const formatted = [addr?.addressLine, addr?.city, addr?.pincode].filter(Boolean).join(', ');
            setPickupAddress(formatted || 'Registered Patient Address');
          } else {
            setSelectedOrderId('');
          }
        }
      } else if (eligibleToReturn.length > 0) {
        setSelectedOrderId(eligibleToReturn[0].orderNumber);
        const addr = eligibleToReturn[0].deliveryAddress;
        const formatted = [addr?.addressLine, addr?.city, addr?.pincode].filter(Boolean).join(', ');
        setPickupAddress(formatted || 'Registered Patient Address');
      } else {
        setSelectedOrderId('');
      }
    } catch (err) {
      console.error('Failed to load orders for return scheduling:', err);
    } finally {
      setLoading(false);
    }
  }, [paramOrderId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedRental = activeRentals.find(
    (o) => o.orderNumber === selectedOrderId || o.id === selectedOrderId
  );

  // Compute overdue / extra days kept
  let extraDaysKept = 0;
  if (selectedRental?.endDate) {
    const endD = new Date(selectedRental.endDate);
    endD.setHours(0, 0, 0, 0);
    const todayD = new Date(todayStr);
    todayD.setHours(0, 0, 0, 0);
    const diffMs = todayD.getTime() - endD.getTime();
    extraDaysKept = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  }

  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return '18 Oct 2026';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const handleSubmitReturn = async () => {
    if (isSubmitting) return;
    if (!selectedOrderId) {
      setSubmissionNotice('Please select an active rental order to return.');
      return;
    }
    setIsSubmitting(true);
    setSubmissionNotice(null);

    try {
      const res = await equipmentService.requestReturn({
        orderId: selectedOrderId,
        requestedDate: preferredDate,
        pickupWindow: selectedPickupSlot,
        pickupAddress,
        conditionNotes: pickupNotes,
      });

      if (!res.success) {
        setSubmissionNotice(res.message);
      } else {
        setIsSuccessModalOpen(true);
        await loadData();
      }
    } catch (err: any) {
      setSubmissionNotice(err?.message || 'Failed to submit return request.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
          onClick={() => navigate('/equipment-rental')}
          className="hover:text-[#9C4119] transition-colors cursor-pointer"
        >
          Medical Equipment Rental
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="text-[#C26532] font-bold">Scheduled Returns</span>
      </nav>

      {/* 2. Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#FFF5EB] border border-[#FDE3CF] flex items-center justify-center text-[#C26532] shadow-2xs shrink-0">
            <Calendar className="w-6 h-6 text-[#C26532]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Scheduled Returns
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Arrange pickup for an active rental and track your request.
            </p>
          </div>
        </div>

        {/* Action Buttons on Right */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Active Rentals */}
          <button
            type="button"
            onClick={() => navigate('/equipment-rental/active')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#E6F4EA] border border-[#A8DAB5] text-[#137333] hover:bg-[#D4EDDA] rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            <Clock className="w-4 h-4" />
            <span>Active Rentals</span>
          </button>

          {/* My Orders */}
          <button
            type="button"
            onClick={() => navigate('/equipment-rental/orders')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            <ClipboardList className="w-4 h-4 text-slate-500" />
            <span>My Orders</span>
          </button>
        </div>
      </div>

      {/* 3. 2-Column Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start pt-1">
        {/* LEFT COLUMN: Schedule a Return Form */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-slate-900 pb-1">
            <Calendar className="w-5 h-5 text-[#C26532] shrink-0" />
            <h2 className="text-base font-bold">Schedule a Return</h2>
          </div>

          {/* Field 1: Active Rental Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Active Rental
            </label>
            <div className="relative">
              <select
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                disabled={activeRentals.length === 0}
                className="w-full appearance-none pl-3.5 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#9C4119] cursor-pointer disabled:bg-slate-50 disabled:text-slate-400"
              >
                {activeRentals.length === 0 ? (
                  <option value="">No active rentals available for return</option>
                ) : (
                  activeRentals.map((order) => (
                    <option key={order.id} value={order.orderNumber}>
                      {order.equipmentName} · {order.orderNumber}
                    </option>
                  ))
                )}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Field 2: Rental Duration & Overdue Status */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Initial Booking End Date
              </label>
              {extraDaysKept > 0 ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  <Clock className="w-3 h-3 text-amber-700" />
                  Kept {extraDaysKept} {extraDaysKept === 1 ? 'day' : 'days'} extra (Overdue)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Check className="w-3 h-3 text-emerald-600" />
                  Active Duration
                </span>
              )}
            </div>
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{selectedRental?.endDate ? formatDateDisplay(selectedRental.endDate) : '—'}</span>
              </div>
              <span className="text-[11px] text-slate-400 font-normal">Original end date</span>
            </div>

            {extraDaysKept > 0 && (
              <div className="mt-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-0.5 leading-relaxed">
                  <p className="font-bold text-amber-950">
                    Rental Duration Exceeded by {extraDaysKept} {extraDaysKept === 1 ? 'Day' : 'Days'}
                  </p>
                  <p className="text-amber-800">
                    Your scheduled rental ended on <strong>{formatDateDisplay(selectedRental?.endDate)}</strong>.
                    You can schedule return pickup starting from today (present date &amp; time) onwards. Extra duration rental fee applies until collection.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Field 3: Pickup Method */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Pickup Method
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Option 1: Doorstep Pickup */}
              <div
                onClick={() => setPickupMethod('doorstep')}
                className={`p-3 rounded-xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                  pickupMethod === 'doorstep'
                    ? 'border-[#C26532] bg-[#FFFDF9] shadow-2xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Home className="w-4 h-4 text-[#C26532]" />
                  <span className="text-xs font-bold text-slate-900">Doorstep pickup</span>
                </div>
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center border-2 ${
                    pickupMethod === 'doorstep'
                      ? 'border-[#C26532] bg-[#C26532]'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {pickupMethod === 'doorstep' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
              </div>

              {/* Option 2: Depot Drop-off */}
              <div
                onClick={() => setPickupMethod('dropoff')}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  pickupMethod === 'dropoff'
                    ? 'border-[#C26532] bg-[#FFFDF9] shadow-2xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-medium text-slate-700">Depot drop-off</span>
                </div>
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center border ${
                    pickupMethod === 'dropoff'
                      ? 'border-[#C26532] bg-[#C26532]'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {pickupMethod === 'dropoff' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Field 4: Preferred Pickup Date */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Preferred Pickup Date
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                Today ({formatDateDisplay(todayStr)}) onwards
              </span>
            </div>

            {/* Quick date choices */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                type="button"
                onClick={() => setPreferredDate(todayStr)}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                  preferredDate === todayStr
                    ? 'bg-[#FFF5EB] border-[#C26532] text-[#9C4119] shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Today ({formatDateDisplay(todayStr)})
              </button>
              <button
                type="button"
                onClick={() => setPreferredDate(tomorrowStr)}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                  preferredDate === tomorrowStr
                    ? 'bg-[#FFF5EB] border-[#C26532] text-[#9C4119] shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Tomorrow ({formatDateDisplay(tomorrowStr)})
              </button>
            </div>

            <div className="relative">
              <input
                type="date"
                min={todayStr}
                value={preferredDate}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val && val >= todayStr) {
                    setPreferredDate(val);
                  } else {
                    setPreferredDate(todayStr);
                  }
                }}
                className="w-full pl-3.5 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#9C4119] cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Select present date or any upcoming date for equipment collection.
            </p>
          </div>

          {/* Field 5: Preferred Pickup Time Slot */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Preferred Pickup Time Slot
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                {preferredDate === todayStr ? 'From present time onwards' : 'All time windows available'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {PICKUP_TIME_SLOTS.map((slot) => {
                const isPassedToday =
                  preferredDate === todayStr && new Date().getHours() >= slot.cutoffHour;
                const isSelected = selectedPickupSlot === slot.timeRange;

                return (
                  <button
                    key={slot.id}
                    type="button"
                    disabled={isPassedToday}
                    onClick={() => setSelectedPickupSlot(slot.timeRange)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isPassedToday
                        ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                        : isSelected
                        ? 'border-[#C26532] bg-[#FFFDF9] text-[#9C4119] ring-1 ring-[#C26532] shadow-2xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[11px] font-bold">
                        {slot.label}
                      </span>
                      {isSelected && !isPassedToday && (
                        <Check className="w-3.5 h-3.5 text-[#C26532]" />
                      )}
                    </div>
                    <span className="text-xs font-semibold mt-1">
                      {slot.timeRange}
                    </span>
                    {isPassedToday && (
                      <span className="text-[10px] text-slate-400 mt-1 italic">
                        Passed for today
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Field 5: Pickup Address */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Pickup Address
            </label>
            <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="truncate">{pickupAddress}</span>
            </div>
          </div>

          {/* Field 6: Pickup Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Pickup Notes <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              rows={3}
              value={pickupNotes}
              onChange={(e) => setPickupNotes(e.target.value)}
              placeholder="e.g. Device cleaned, all accessories packed..."
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#9C4119] resize-none"
            />
          </div>

          {submissionNotice && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs space-y-1">
              <p className="font-extrabold text-amber-950">Notice</p>
              <p className="leading-relaxed">{submissionNotice}</p>
            </div>
          )}

          {/* Submit Return Request Button */}
          <div className="pt-1">
            <button
              type="button"
              disabled={isSubmitting || activeRentals.length === 0 || !selectedOrderId}
              onClick={handleSubmitReturn}
              className={`w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-2xs ${
                activeRentals.length === 0 || !selectedOrderId
                  ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-[#9C4119] hover:bg-[#853512] text-white cursor-pointer'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Submitting...'
                  : activeRentals.length === 0
                  ? 'No Active Rentals to Return'
                  : 'Submit Return Request'}
              </span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Your Return Requests */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-slate-900 pb-1">
            <FileText className="w-5 h-5 text-[#C26532] shrink-0" />
            <h2 className="text-base font-bold">Your Return Requests</h2>
          </div>

          {/* List of Return Requests */}
          <div className="space-y-3.5">
            {returnRequests.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500">
                <p className="text-xs font-semibold">No equipment returns scheduled yet.</p>
              </div>
            ) : (
              returnRequests.map((req) => (
              <div
                key={req.id}
                className="border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:shadow-xs transition-shadow"
              >
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 shrink-0">
                    <MediaImage kind="equipment" category={undefined}
                      src={req.equipmentImage}
                      name={req.equipmentName}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="min-w-0 space-y-1">
                    <h3 className="font-bold text-slate-900 text-sm leading-snug">
                      {req.equipmentName}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">{req.orderNumber}</p>

                    <div className="flex items-center gap-1.5 text-xs text-slate-600 pt-1">
                      <Calendar className="w-3.5 h-3.5 text-[#C26532] shrink-0" />
                      <span>
                        Requested Pickup Date{' '}
                        <strong className="text-slate-800">{formatDateDisplay(req.requestedDate)}</strong>
                        {req.pickupWindow && (
                          <span className="text-slate-500 font-medium ml-1">· {req.pickupWindow}</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0">
                  {req.status === 'completed' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#F3E8FF] text-[#7E22CE]">
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Return completed</span>
                    </span>
                  ) : req.status === 'return_inspection_pending' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#E8F0FE] text-[#1A73E8]">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Collected — In inspection</span>
                    </span>
                  ) : req.status === 'request_pending' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#FEF7E0] text-[#B06000]">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Request pending</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#E6F4EA] text-[#137333]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Pickup scheduled</span>
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => navigate(`/equipment-rental/orders/${req.orderNumber}`)}
                    className="text-xs font-semibold text-[#C26532] hover:underline cursor-pointer sm:mt-6 inline-flex items-center gap-0.5"
                  >
                    <span>View details</span>
                    <span className="font-bold">›</span>
                  </button>
                </div>
              </div>
            )))}
          </div>

          {/* Informational Blue Banner */}
          <div className="bg-[#E8F4FD] border border-[#D2E3FC] rounded-xl p-3 flex items-start gap-2.5 text-xs text-slate-700 mt-4">
            <Info className="w-4 h-4 text-[#1A73E8] shrink-0 mt-0.5" />
            <p className="leading-relaxed font-normal">
              After collection, the rental provider inspects the equipment before it becomes available again.
            </p>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {isSuccessModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Return Request Submitted</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your pickup request has been scheduled for{' '}
              <strong>{formatDateDisplay(preferredDate)}</strong> during{' '}
              <strong>{selectedPickupSlot}</strong>. The provider logistics team will coordinate pickup at your address.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsSuccessModalOpen(false)}
                className="px-6 py-2.5 bg-[#9C4119] hover:bg-[#853512] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReturnSchedulingScreen;
