import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Package,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MapPin,
  Calendar,
  Truck,
  CheckCircle2,
  Info,
  Pencil,
  FileText,
  Clock,
  ArrowLeft,
  X,
  Check,
  Building2,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import type { PatientEquipmentItem, RentalQuote } from './types';
import { equipmentService } from './equipmentService';
import { getPatientProfileApi } from '../../../services/patientHelper';
import { calculateAddressDistanceKm, calculateEquipmentDeliveryFee } from './distanceUtils';

interface SelectedProvider {
  id: string;
  name: string;
  verified: boolean;
  location: string;
  distanceText: string;
  distanceKm: number;
  rentalPrice: number;
  deposit: number;
  image: string;
}

export const EquipmentCheckoutScreen: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state as
    | { item?: PatientEquipmentItem; quote?: RentalQuote; provider?: SelectedProvider }
    | undefined;

  const item: PatientEquipmentItem | undefined = state?.item;

  const provider: SelectedProvider = state?.provider || {
    id: item?.providerId || 'prov-pending',
    name: item?.providerName || 'Verified Rental Provider',
    verified: true,
    location: item?.providerLocation || item?.providerAddress || 'Verified Provider Hub',
    distanceText: 'Calculated upon dispatch',
    distanceKm: 5.0,
    rentalPrice: item?.dailyRate || 0,
    deposit: item?.securityDeposit || 0,
    image: item?.imageUrl || '/equipment/hospital-bed.jpg',
  };

  // Rental Dates
  const [startDateStr, setStartDateStr] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1); // Tomorrow
    return d.toISOString().split('T')[0];
  });

  const [returnDateStr, setReturnDateStr] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 8); // 7 days later
    return d.toISOString().split('T')[0];
  });

  // Delivery preferences
  const [deliveryMethod, setDeliveryMethod] = useState<'doorstep' | 'pickup'>('doorstep');
  const [deliveryInstructions, setDeliveryInstructions] = useState<string>('');
  const [isPolicyExpanded, setIsPolicyExpanded] = useState<boolean>(false);

  // Address state — dynamically initialized from local user session and hydrated from database profile
  const [address, setAddress] = useState(() => {
    let initialName = '';
    let initialPhone = '';
    try {
      const stored = localStorage.getItem('vizito_user');
      if (stored) {
        const u = JSON.parse(stored);
        initialName = u.fullName || u.full_name || u.name || '';
        initialPhone = u.phone || u.mobile || '';
      }
    } catch {
      // non-fatal
    }
    return {
      recipientName: initialName,
      phone: initialPhone,
      line: '',
      city: '',
      pincode: '',
      latitude: null as number | string | null,
      longitude: null as number | string | null,
    };
  });
  const [isAddressModalOpen, setIsAddressModalOpen] = useState<boolean>(false);
  const [tempAddress, setTempAddress] = useState(address);

  // Load patient profile & saved addresses from database
  useEffect(() => {
    getPatientProfileApi()
      .then((profile) => {
        if (!profile) return;
        setAddress((prev) => {
          const updated = { ...prev };
          if (profile.fullName) updated.recipientName = profile.fullName;
          if (profile.phone) updated.phone = profile.phone;
          if (Array.isArray(profile.addresses) && profile.addresses.length > 0) {
            const def = profile.addresses.find((a: any) => a.isDefault || a.is_default) || profile.addresses[0];
            const line = [def.addressLine1 || def.address_line_1, def.addressLine2 || def.address_line_2, def.landmark]
              .filter(Boolean)
              .join(', ');
            if (line) updated.line = line;
            if (def.city || def.cityName) updated.city = def.city || def.cityName;
            if (def.pincode) updated.pincode = def.pincode;
            if (def.latitude != null) updated.latitude = def.latitude;
            if (def.longitude != null) updated.longitude = def.longitude;
          }
          return updated;
        });
      })
      .catch((err) => {
        console.error('Failed to load patient address:', err);
      });
  }, []);

  const checkoutDistanceKm = useMemo(() => {
    return calculateAddressDistanceKm(
      {
        latitude: address.latitude,
        longitude: address.longitude,
        pincode: address.pincode,
        text: `${address.line} ${address.city}`,
      },
      {
        latitude: item?.providerLatitude,
        longitude: item?.providerLongitude,
        pincode: item?.providerZipcode,
        text: item?.providerAddress || item?.providerLocation,
      }
    );
  }, [address, item]);

  // Review confirmation modal
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);
  const [orderConfirmed, setOrderConfirmed] = useState<boolean>(false);

  // Requested Quantity
  const [requestedQuantity, setRequestedQuantity] = useState<number>(1);

  // Calculate rental duration
  const rentalDurationDays = useMemo(() => {
    if (!startDateStr || !returnDateStr) return 7;
    const start = new Date(startDateStr);
    const end = new Date(returnDateStr);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  }, [startDateStr, returnDateStr]);

  // Duration validation against product rules
  const minDays = item?.minDurationDays || 1;
  const maxDays = item?.maxDurationDays || 90;
  const isDurationTooShort = rentalDurationDays < minDays;
  const isDurationTooLong = rentalDurationDays > maxDays;
  const isDurationInvalid = isDurationTooShort || isDurationTooLong;

  // Stock availability check
  const availableStock = item?.availableStock ?? item?.totalStock ?? 1;
  const isOutOfStock = (item?.availableStock !== undefined && item.availableStock <= 0) || item?.isAvailable === false;
  const isExceedingStock = requestedQuantity > availableStock;

  // Financial calculations strictly with quantity and distance slab
  const dailyRate = provider.rentalPrice || item?.dailyRate || 350;
  const rentalFee = dailyRate * rentalDurationDays * requestedQuantity;
  const deliveryFee = deliveryMethod === 'doorstep'
    ? calculateEquipmentDeliveryFee(checkoutDistanceKm, item?.deliverySlabs)
    : 0;
  const totalOrderValue = rentalFee + deliveryFee;
  const totalSecurityDeposit = (provider.deposit || item?.securityDeposit || 0) * requestedQuantity;

  const quote: RentalQuote = useMemo(() => {
    if (!item) {
      return {
        equipmentId: '',
        startDate: startDateStr,
        endDate: returnDateStr,
        durationDays: rentalDurationDays,
        dailyRate: 0,
        securityDeposit: 0,
        rentalFee: 0,
        deliveryFee: 0,
        totalOrderValue: 0,
        depositNotice: '',
      };
    }
    const baseQuote = equipmentService.calculateQuote(item, startDateStr, rentalDurationDays, deliveryFee);
    return {
      ...baseQuote,
      dailyRate,
      securityDeposit: totalSecurityDeposit,
      rentalFee,
      deliveryFee,
      totalOrderValue,
    };
  }, [item, startDateStr, returnDateStr, rentalDurationDays, deliveryFee, requestedQuantity, dailyRate, totalSecurityDeposit, rentalFee, totalOrderValue]);

  const [paymentMethod] = useState<string>('Online Payment');

  // Format date helper
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const handleStartDateChange = (val: string) => {
    setStartDateStr(val);
    const start = new Date(val);
    start.setDate(start.getDate() + rentalDurationDays);
    setReturnDateStr(start.toISOString().split('T')[0]);
  };

  const handleReturnDateChange = (val: string) => {
    setReturnDateStr(val);
  };

  const handleSaveAddress = () => {
    setAddress(tempAddress);
    setIsAddressModalOpen(false);
  };

  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleConfirmOrder = async () => {
    if (!item || isOutOfStock || isExceedingStock || isDurationInvalid) return;
    setIsSubmitting(true);
    setSubmissionError(null);
    try {
      let finalCity = address.city?.trim();
      if (!finalCity && address.line?.trim()) {
        const parts = address.line.split(',').map((p) => p.trim());
        const knownCities = ['Hyderabad', 'Secunderabad', 'Bengaluru', 'Bangalore', 'Mumbai', 'Delhi', 'Chennai', 'Pune'];
        const found = parts.find((p) => knownCities.some((c) => p.toLowerCase().includes(c.toLowerCase())));
        finalCity = found || (parts.length > 1 ? parts[parts.length - 1] : 'Hyderabad');
      }
      if (!finalCity) finalCity = 'Hyderabad';

      const res = await equipmentService.createOrder({
        item,
        quote,
        quantity: requestedQuantity,
        deliveryAddress: {
          recipientName: address.recipientName || 'Patient',
          phone: address.phone || '9999999999',
          addressLine: address.line || 'Delivery Address',
          city: finalCity,
          pincode: address.pincode || '500001',
          instructions: deliveryInstructions,
        },
        paymentMethod,
      });

      if (res.success && res.data) {
        setOrderConfirmed(true);
      } else {
        setSubmissionError(res.message);
      }
    } catch (err: any) {
      setSubmissionError(err?.message || 'Failed to place rental order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!item) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto">
            <Package className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">No Equipment Selected</h2>
          <p className="text-xs text-slate-500">
            Please choose a medical equipment model from the catalogue to proceed with booking.
          </p>
          <button
            type="button"
            onClick={() => navigate('/equipment-rental')}
            className="px-5 py-2.5 bg-[#9C4119] text-white rounded-xl text-xs font-bold hover:bg-[#853512] transition-colors cursor-pointer"
          >
            Browse Equipment Catalogue
          </button>
        </div>
      </div>
    );
  }

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
          Equipment Rental
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="text-[#9C4119] font-bold">Select Rental</span>
      </nav>

      {/* 2. Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Select Rental Details
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Confirm rental dates and delivery preferences from this provider.
        </p>
      </div>

      {/* 3. Main 2-Column Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-1">
        {/* LEFT COLUMN: Rental & Delivery Details (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 lg:p-6 shadow-xs space-y-5">
            {/* Header with box icon */}
            <div className="flex items-center gap-2 text-slate-900 pb-1">
              <Package className="w-5 h-5 text-[#C26532] shrink-0" />
              <h2 className="text-base font-bold">Rental & Delivery Details</h2>
            </div>

            {/* Provider Banner */}
            <div className="bg-[#FFF9F5] border border-[#FDE3CF] rounded-2xl p-4 flex items-center gap-4">
              <div className="w-20 h-16 sm:w-24 sm:h-16 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                <img
                  src={provider.image || '/equipment/store-1.jpg'}
                  alt={provider.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    {provider.name}
                  </h3>
                  {provider.verified && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-600 text-white shrink-0" />
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{provider.location}</span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span className="text-slate-400 text-xs">⤹</span>
                  <span>{provider.distanceText}</span>
                </div>
              </div>
            </div>

            {/* Selected Equipment Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-16 h-14 sm:w-20 sm:h-14 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-900 text-sm truncate">{item.name}</h4>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  isOutOfStock
                    ? 'bg-rose-50 text-rose-700'
                    : 'bg-[#E6F4EA] text-[#137333]'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isOutOfStock ? 'bg-rose-500' : 'bg-[#137333]'}`} />
                  {isOutOfStock ? 'Out of Stock' : `Available: ${availableStock} units`}
                </span>
              </div>
            </div>

            {/* Rental Dates, Duration & Quantity Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-start">
              {/* Start Date */}
              <div className="flex flex-col">
                <label className="h-8 flex items-end pb-1 text-xs font-bold text-slate-700">
                  <span className="whitespace-nowrap">Start Date <span className="text-rose-500">*</span></span>
                </label>
                <div className="relative h-[42px]">
                  <input
                    type="date"
                    value={startDateStr}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="w-full h-full px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#9C4119] cursor-pointer"
                  />
                </div>
                <div className="text-[10px] text-slate-400 mt-1 text-center h-4 flex items-center justify-center">
                  {formatDateDisplay(startDateStr)}
                </div>
              </div>

              {/* Expected Return Date */}
              <div className="flex flex-col">
                <label className="h-8 flex items-end pb-1 text-xs font-bold text-slate-700">
                  <span className="whitespace-nowrap">Expected Return Date <span className="text-rose-500">*</span></span>
                </label>
                <div className="relative h-[42px]">
                  <input
                    type="date"
                    value={returnDateStr}
                    min={startDateStr}
                    onChange={(e) => handleReturnDateChange(e.target.value)}
                    className="w-full h-full px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#9C4119] cursor-pointer"
                  />
                </div>
                <div className="text-[10px] text-slate-400 mt-1 text-center h-4 flex items-center justify-center">
                  {formatDateDisplay(returnDateStr)}
                </div>
              </div>

              {/* Rental Duration */}
              <div className="flex flex-col">
                <label className="h-8 flex items-end pb-1 text-xs font-bold text-slate-700">
                  <span className="whitespace-nowrap">Rental Duration</span>
                </label>
                <div className={`h-[42px] px-3 rounded-xl flex items-center justify-center border ${
                  isDurationInvalid
                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                    : 'bg-[#FFF5EB] border-[#FDE3CF] text-[#C26532]'
                }`}>
                  <span className="text-sm font-extrabold">
                    {rentalDurationDays} days
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1 text-center h-4 flex items-center justify-center">
                  Min {minDays}d &bull; Max {maxDays}d
                </div>
              </div>

              {/* Requested Quantity */}
              <div className="flex flex-col">
                <label className="h-8 flex items-end pb-1 text-xs font-bold text-slate-700">
                  <span className="whitespace-nowrap">Quantity <span className="text-rose-500">*</span></span>
                </label>
                <div className="flex items-center h-[42px] bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setRequestedQuantity((q) => Math.max(1, q - 1))}
                    disabled={requestedQuantity <= 1}
                    className="w-9 h-full flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer font-bold"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={availableStock}
                    value={requestedQuantity}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      setRequestedQuantity(isNaN(v) ? 1 : Math.max(1, v));
                    }}
                    className="flex-1 text-center font-bold text-xs text-slate-900 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setRequestedQuantity((q) => Math.min(availableStock, q + 1))}
                    disabled={requestedQuantity >= availableStock}
                    className="w-9 h-full flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer font-bold"
                  >
                    +
                  </button>
                </div>
                <div className="text-[10px] text-slate-400 mt-1 text-center h-4 flex items-center justify-center">
                  Max: {availableStock} units
                </div>
              </div>
            </div>

            {/* Validation Alerts */}
            {isDurationInvalid && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Rental duration must be between {minDays} and {maxDays} days for this equipment.
                </span>
              </div>
            )}

            {isExceedingStock && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  Requested quantity ({requestedQuantity}) exceeds currently available stock ({availableStock} units).
                </span>
              </div>
            )}

            {/* Delivery Method */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Delivery Method <span className="text-rose-500">*</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Option 1: Doorstep Delivery */}
                <div
                  onClick={() => setDeliveryMethod('doorstep')}
                  className={`p-3.5 rounded-xl border-2 flex items-center gap-3 cursor-pointer transition-all ${
                    deliveryMethod === 'doorstep'
                      ? 'border-[#C26532] bg-[#FFFDF9] shadow-2xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border-2 ${
                      deliveryMethod === 'doorstep'
                        ? 'border-[#C26532] bg-[#C26532]'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {deliveryMethod === 'doorstep' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>

                  <Truck className="w-5 h-5 text-[#C26532] shrink-0" />

                  <div className="min-w-0">
                    <p className="font-bold text-xs text-slate-900 leading-snug">
                      Doorstep Delivery
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Delivered and set up at your address
                    </p>
                  </div>
                </div>

                {/* Option 2: Self Pickup */}
                <div
                  onClick={() => setDeliveryMethod('pickup')}
                  className={`p-3.5 rounded-xl border-2 flex items-center gap-3 cursor-pointer transition-all ${
                    deliveryMethod === 'pickup'
                      ? 'border-[#C26532] bg-[#FFFDF9] shadow-2xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border-2 ${
                      deliveryMethod === 'pickup'
                        ? 'border-[#C26532] bg-[#C26532]'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {deliveryMethod === 'pickup' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>

                  <Package className="w-5 h-5 text-slate-500 shrink-0" />

                  <div className="min-w-0">
                    <p className="font-bold text-xs text-slate-900 leading-snug">
                      Self Pickup
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      You will pick up from provider location
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Delivery Address
              </label>

              <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="text-xs text-slate-800 font-medium truncate">
                    {address.line ? `${address.line}${address.city ? `, ${address.city}` : ''}${address.pincode ? ` - ${address.pincode}` : ''}` : 'No address specified'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setTempAddress(address);
                    setIsAddressModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#C26532] hover:underline shrink-0 cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Change address</span>
                </button>
              </div>

              <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1.5 pl-0.5">
                <span className="text-slate-400">⤹</span>
                <span>
                  Road distance from your address:{' '}
                  <strong className="text-slate-700 font-bold">
                    {checkoutDistanceKm != null ? `${checkoutDistanceKm} km` : '--'}
                  </strong>{' '}
                  <em>(calculated)</em>
                </span>
              </div>
            </div>

            {/* Delivery Instructions (Optional) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Delivery Instructions (Optional)
              </label>

              <textarea
                rows={3}
                maxLength={200}
                value={deliveryInstructions}
                onChange={(e) => setDeliveryInstructions(e.target.value)}
                placeholder="Floor, lift access, preferred delivery time (optional)"
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#9C4119] resize-none"
              />

              <div className="text-right text-[11px] text-slate-400 mt-1">
                {deliveryInstructions.length} / 200
              </div>
            </div>

            {/* Rental Policy Accordion */}
            <div className="border border-slate-200 rounded-xl overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => setIsPolicyExpanded(!isPolicyExpanded)}
                className="w-full p-3.5 bg-white flex items-center justify-between text-left cursor-pointer hover:bg-slate-50/50"
              >
                <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                  <FileText className="w-4 h-4 text-[#C26532]" />
                  <span>Rental Policy</span>
                </div>
                {isPolicyExpanded ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {isPolicyExpanded && (
                <div className="p-4 bg-slate-50/70 border-t border-slate-100 text-xs text-slate-600 space-y-2.5">
                  <p>
                    • <strong>Minimum Period:</strong> 7 days rental. Extensions can be requested online with seamless daily rate renewal.
                  </p>
                  <p>
                    • <strong>Security Deposit:</strong> Refundable security deposit is settled directly between patient and provider on delivery/return inspection.
                  </p>
                  <p>
                    • <strong>Sanitization Guarantee:</strong> Every unit is tested, sanitized, and sealed by verified biomedical technicians.
                  </p>
                  <p>
                    • <strong>Cancellation:</strong> Free cancellation up to 2 hours before scheduled dispatch time.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Booking Summary (4 Cols) */}
        <div className="lg:col-span-4 sticky top-6 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5">
            {/* Header */}
            <div className="flex items-center gap-2 text-slate-900 pb-1">
              <FileText className="w-5 h-5 text-[#C26532] shrink-0" />
              <h2 className="text-base font-bold">Booking Summary</h2>
            </div>

            {/* Equipment Preview */}
            <div className="flex items-start gap-3.5 pb-4 border-b border-slate-100">
              <div className="w-16 h-14 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                <img
                  src={item.imageUrl || '/equipment/hospital-bed.jpg'}
                  alt={item.name}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/equipment/hospital-bed.jpg';
                  }}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="min-w-0">
                <h3 className="font-bold text-slate-900 text-sm leading-snug">
                  {item.name}
                </h3>
                <div className="mt-1">
                  <span className="text-lg font-black text-[#C26532]">
                    ₹{dailyRate}
                  </span>
                  <span className="text-xs font-semibold text-slate-600"> / day</span>
                </div>
              </div>
            </div>

            {/* Rental Period & Duration breakdown */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Rental Period</span>
                </div>
                <span className="font-semibold text-slate-900">
                  {formatDateDisplay(startDateStr)} – {formatDateDisplay(returnDateStr)}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Rental Duration</span>
                </div>
                <span className="font-bold text-slate-900">{rentalDurationDays} Days</span>
              </div>
            </div>

            {/* Financial Line Items */}
            <div className="pt-3 border-t border-slate-100 space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>
                  Equipment Rental Fee ({rentalDurationDays}d × ₹{dailyRate})
                </span>
                <span className="font-bold text-slate-900">
                  ₹{rentalFee.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span>Delivery & Setup Fee</span>
                <span className="font-bold text-slate-900">
                  {deliveryFee > 0 ? `₹${deliveryFee}` : 'FREE (Pickup)'}
                </span>
              </div>
            </div>

            {/* Total Order Value */}
            <div className="pt-3.5 border-t border-slate-200 flex items-baseline justify-between">
              <div>
                <span className="text-sm font-bold text-slate-900 block">Total Order Value</span>
              </div>

              <div className="text-2xl font-black text-[#C26532]">
                ₹{totalOrderValue.toLocaleString('en-IN')}
              </div>
            </div>

            {/* Stock Availability Warning */}
            {isOutOfStock && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <p className="text-xs text-rose-800 leading-relaxed font-normal">
                  <strong>Stock Notice:</strong> This equipment is currently out of stock. Booking cannot proceed at this time.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                disabled={isOutOfStock || isExceedingStock || isDurationInvalid}
                onClick={() => {
                  if (!isOutOfStock && !isExceedingStock && !isDurationInvalid) {
                    setIsReviewModalOpen(true);
                  }
                }}
                className={`w-full py-3.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs ${
                  isOutOfStock || isExceedingStock || isDurationInvalid
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-[#9C4119] hover:bg-[#853512] text-white cursor-pointer'
                }`}
              >
                <span>
                  {isOutOfStock
                    ? 'Out of Stock — Cannot Book'
                    : isExceedingStock
                    ? 'Quantity Exceeds Available Stock'
                    : isDurationInvalid
                    ? 'Invalid Rental Duration'
                    : 'Continue to Review & Checkout'}
                </span>
                {!isOutOfStock && !isExceedingStock && !isDurationInvalid && <span>→</span>}
              </button>

              <button
                type="button"
                onClick={() => navigate(-1)}
                className="w-full py-3 px-4 rounded-xl bg-white border border-[#FDE3CF] hover:bg-orange-50/50 text-[#9C4119] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>← Back to Product Details</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Change Address Modal */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Update Delivery Address</h3>
              <button
                type="button"
                onClick={() => setIsAddressModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={tempAddress.recipientName}
                  onChange={(e) =>
                    setTempAddress({ ...tempAddress, recipientName: e.target.value })
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={tempAddress.phone}
                  onChange={(e) => setTempAddress({ ...tempAddress, phone: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Street Address & Flat
                </label>
                <input
                  type="text"
                  value={tempAddress.line}
                  onChange={(e) => setTempAddress({ ...tempAddress, line: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={tempAddress.city}
                    onChange={(e) => setTempAddress({ ...tempAddress, city: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Pincode</label>
                  <input
                    type="text"
                    value={tempAddress.pincode}
                    onChange={(e) =>
                      setTempAddress({ ...tempAddress, pincode: e.target.value })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddressModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAddress}
                className="px-4 py-2 bg-[#9C4119] text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-[#853512]"
              >
                Save Address
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Review & Checkout Modal */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-lg p-6 shadow-2xl space-y-4">
            {!orderConfirmed ? (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-[#9C4119]" />
                    <h3 className="text-base font-bold text-slate-900">Confirm Rental Booking</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsReviewModalOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3 text-xs text-slate-600">
                  <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100">
                    <p className="font-bold text-slate-900">{item.name}</p>
                    <p className="text-slate-500">Provider: {provider.name}</p>
                    <p>
                      Duration: <strong>{rentalDurationDays} days</strong> ({formatDateDisplay(startDateStr)} – {formatDateDisplay(returnDateStr)})
                    </p>
                    <p>
                      Method: <strong>{deliveryMethod === 'doorstep' ? 'Doorstep Delivery' : 'Self Pickup'}</strong>
                    </p>
                    <p>
                      Address: <span className="text-slate-700">{address.line ? `${address.line}${address.city ? `, ${address.city}` : ''}${address.pincode ? ` - ${address.pincode}` : ''}` : 'No address specified'}</span>
                    </p>
                  </div>

                  <div className="p-3 bg-[#FEF7EC] border border-[#FDE6CA] rounded-xl text-amber-900 text-[11px] leading-relaxed">
                    A security deposit of <strong>₹{provider.deposit.toLocaleString('en-IN')}</strong> will be collected and settled directly with the provider upon delivery/inspection.
                  </div>

                  <div className="flex items-center justify-between pt-1 text-sm">
                    <span className="font-bold text-slate-900">Total Payable:</span>
                    <span className="text-xl font-black text-[#C26532]">
                      ₹{totalOrderValue.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {submissionError && (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs space-y-1">
                    <p className="font-extrabold text-amber-950">Notice</p>
                    <p className="leading-relaxed">{submissionError}</p>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsReviewModalOpen(false)}
                    className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Back to Edit
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleConfirmOrder}
                    className="flex-1 py-2.5 bg-[#9C4119] text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-[#853512] disabled:opacity-50"
                  >
                    {isSubmitting ? 'Processing Payment...' : 'Pay & Confirm Order'}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-4 space-y-3">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Payment Successful &amp; Order Confirmed!</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Your payment has been received and your rental order for <strong>{item.name}</strong> is confirmed with <strong>{provider.name}</strong>. Your equipment is confirmed and will be dispatched out for delivery.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsReviewModalOpen(false);
                      setOrderConfirmed(false);
                      navigate('/equipment-rental/orders');
                    }}
                    className="px-6 py-2.5 bg-[#9C4119] text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-[#853512]"
                  >
                    View My Orders
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipmentCheckoutScreen;
