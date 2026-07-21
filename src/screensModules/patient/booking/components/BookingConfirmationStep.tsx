import React from 'react';
import {
  CheckCircle2,
  Calendar,
  Clock,
  User,
  MapPin,
  FileText,
  Navigation,
  RotateCcw,
  XCircle,
  Home,
  ShieldCheck,
  Building2,
  Stethoscope
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { HealthcareServiceOption, ProviderItem } from '../../../../mocks/universalBookingMocks';
import type { FamilyMember } from '../../../../mocks/patientFlowMocks';
import type { BookingDetailsData } from './DynamicDetailsStep';

interface BookingConfirmationStepProps {
  service: HealthcareServiceOption;
  provider: ProviderItem;
  patient: FamilyMember;
  detailsData: BookingDetailsData;
  bookingRef: string;
  totalAmount: number;
  onRebook: () => void;
}

export const BookingConfirmationStep: React.FC<BookingConfirmationStepProps> = ({
  service,
  provider,
  patient,
  detailsData,
  bookingRef,
  totalAmount,
  onRebook
}) => {
  const navigate = useNavigate();

  // Check if "Track Booking" is applicable (Ambulance, Pharmacy, Home Care)
  const isTrackable = ['ambulance', 'pharmacy', 'homecare'].includes(service.id);

  // Check if "Cancel Booking" is allowed
  const isCancellable = true;

  const handleTrackBooking = () => {
    alert(`Live GPS tracking activated for booking reference ${bookingRef}. Dispatch unit en route.`);
  };

  const handleCancelBooking = () => {
    if (confirm(`Are you sure you want to cancel booking ${bookingRef}?`)) {
      alert(`Booking ${bookingRef} has been cancelled successfully. Full refund initiated.`);
      navigate('/dashboard');
    }
  };

  const handleViewBooking = () => {
    navigate('/my-consultations');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in zoom-in-95 duration-400">
      {/* Success Banner */}
      <div className="bg-emerald-600 text-white rounded-3xl p-8 text-center shadow-lg relative overflow-hidden">
        <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4 backdrop-blur-xs">
          <CheckCircle2 className="w-10 h-10 text-white stroke-[2.5]" />
        </div>
        <span className="text-xs font-black tracking-widest uppercase bg-emerald-700/80 px-3 py-1 rounded-full">
          Booking Confirmed
        </span>
        <h1 className="text-3xl font-black mt-2">✅ Booking Successful!</h1>
        <p className="text-emerald-100 text-sm mt-1 font-medium">
          Your booking reference ID is{' '}
          <span className="font-mono font-black text-white underline decoration-emerald-300">
            {bookingRef}
          </span>
        </p>
      </div>

      {/* Booking Overview Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-xl">
              {service.emoji}
            </div>
            <div>
              <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider">
                {service.name}
              </span>
              <h3 className="font-extrabold text-slate-800 text-base">{provider.name}</h3>
            </div>
          </div>

          <span className="bg-emerald-50 text-emerald-700 font-extrabold text-xs px-3 py-1.5 rounded-full border border-emerald-200 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Confirmed
          </span>
        </div>

        {/* Details Table */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium text-slate-700 bg-slate-50 p-4 rounded-xl">
          <div>
            <span className="text-slate-400 font-bold block uppercase text-[10px]">Booking Ref</span>
            <span className="font-black text-slate-800 font-mono text-sm">{bookingRef}</span>
          </div>

          <div>
            <span className="text-slate-400 font-bold block uppercase text-[10px]">Patient</span>
            <span className="font-bold text-slate-800">{patient.name} ({patient.relationship})</span>
          </div>

          {detailsData.appointmentDate && (
            <div>
              <span className="text-slate-400 font-bold block uppercase text-[10px]">Date</span>
              <span className="font-bold text-slate-800">{detailsData.appointmentDate}</span>
            </div>
          )}

          {detailsData.timeSlot && (
            <div>
              <span className="text-slate-400 font-bold block uppercase text-[10px]">Time Slot</span>
              <span className="font-bold text-slate-800">{detailsData.timeSlot}</span>
            </div>
          )}

          {detailsData.pickupAddress && (
            <div className="sm:col-span-2">
              <span className="text-slate-400 font-bold block uppercase text-[10px]">Pickup Location</span>
              <span className="font-bold text-slate-800">{detailsData.pickupAddress}</span>
            </div>
          )}

          {detailsData.serviceAddress && (
            <div className="sm:col-span-2">
              <span className="text-slate-400 font-bold block uppercase text-[10px]">Service Address</span>
              <span className="font-bold text-slate-800">{detailsData.serviceAddress}</span>
            </div>
          )}

          {detailsData.deliveryAddress && (
            <div className="sm:col-span-2">
              <span className="text-slate-400 font-bold block uppercase text-[10px]">Delivery Address</span>
              <span className="font-bold text-slate-800">{detailsData.deliveryAddress}</span>
            </div>
          )}

          <div>
            <span className="text-slate-400 font-bold block uppercase text-[10px]">Payment Paid</span>
            <span className="font-black text-teal-700 text-sm">₹{totalAmount} (Paid)</span>
          </div>

          <div>
            <span className="text-slate-400 font-bold block uppercase text-[10px]">Status</span>
            <span className="font-bold text-emerald-700">Confirmed / Scheduled</span>
          </div>
        </div>

        {/* Action Buttons Group */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-3">
          <button
            onClick={handleViewBooking}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white py-3 px-4 rounded-xl font-bold text-xs transition-all shadow-xs"
          >
            <FileText className="w-4 h-4" /> View Booking
          </button>

          {isTrackable && (
            <button
              onClick={handleTrackBooking}
              className="flex-1 min-w-[140px] flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-xl font-bold text-xs transition-all shadow-xs"
            >
              <Navigation className="w-4 h-4" /> Track Booking
            </button>
          )}

          <button
            onClick={onRebook}
            className="flex-1 min-w-[120px] flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 px-4 rounded-xl font-bold text-xs transition-all"
          >
            <RotateCcw className="w-4 h-4" /> Rebook
          </button>

          {isCancellable && (
            <button
              onClick={handleCancelBooking}
              className="flex items-center justify-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 py-3 px-4 rounded-xl font-bold text-xs transition-all border border-rose-200"
            >
              <XCircle className="w-4 h-4" /> Cancel
            </button>
          )}

          <button
            onClick={() => navigate('/dashboard')}
            className="w-full flex items-center justify-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-700 py-3 px-4 rounded-xl font-bold text-xs transition-all mt-2"
          >
            <Home className="w-4 h-4" /> Go Home to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
