import React from 'react';
import {
  FileText,
  User,
  Calendar,
  Clock,
  MapPin,
  Pill,
  Edit2,
  ShieldCheck,
  Building2,
  Stethoscope
} from 'lucide-react';
import type { HealthcareServiceOption, ProviderItem } from '../../../../mocks/universalBookingMocks';
import type { FamilyMember } from '../../../../mocks/patientFlowMocks';
import type { BookingDetailsData } from './DynamicDetailsStep';

interface ReviewBookingStepProps {
  service: HealthcareServiceOption;
  provider: ProviderItem;
  patient: FamilyMember;
  detailsData: BookingDetailsData;
  calculatedTotal: number;
  onEditStep: (stepId: number) => void;
  onProceedToPayment: () => void;
  onBack: () => void;
}

export const ReviewBookingStep: React.FC<ReviewBookingStepProps> = ({
  service,
  provider,
  patient,
  detailsData,
  calculatedTotal,
  onEditStep,
  onProceedToPayment,
  onBack
}) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
      <div>
        <span className="text-teal-600 font-bold text-xs uppercase tracking-wider">
          Step 5 — Summary Review
        </span>
        <h2 className="text-2xl font-black text-slate-800 mt-0.5">Review Booking Details</h2>
        <p className="text-slate-500 text-sm mt-1">
          Double check all configured information before proceeding to payment.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {/* Service & Provider Section */}
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-2xl shrink-0">
              {service.emoji}
            </div>
            <div>
              <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                {service.name}
              </span>
              <h3 className="font-extrabold text-slate-800 text-lg mt-1">{provider.name}</h3>
              {provider.subtitle && (
                <p className="text-xs font-semibold text-slate-500">{provider.subtitle}</p>
              )}
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 shrink-0" /> {provider.location}
              </p>
            </div>
          </div>

          <button
            onClick={() => onEditStep(2)}
            className="self-start sm:self-center flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" /> Edit Provider
          </button>
        </div>

        {/* Patient Section */}
        <div className="p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Patient</span>
              <h4 className="font-extrabold text-slate-800 text-base">{patient.name}</h4>
              <p className="text-xs text-slate-500 font-medium">
                {patient.relationship} &bull; {patient.age} yrs &bull; Blood: {patient.bloodGroup}
              </p>
            </div>
          </div>

          <button
            onClick={() => onEditStep(3)}
            className="flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" /> Edit Patient
          </button>
        </div>

        {/* Dynamic Parameters Summary */}
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              Booking Parameters
            </span>
            <button
              onClick={() => onEditStep(4)}
              className="flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-3 py-1 rounded-lg transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit Parameters
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium text-slate-700 bg-slate-50/70 p-4 rounded-xl border border-slate-100">
            {detailsData.consultationType && (
              <div>
                <span className="text-slate-400 font-bold block uppercase text-[10px]">Type</span>
                <span className="font-bold text-slate-800">{detailsData.consultationType} Consultation</span>
              </div>
            )}

            {detailsData.department && (
              <div>
                <span className="text-slate-400 font-bold block uppercase text-[10px]">Department</span>
                <span className="font-bold text-slate-800">{detailsData.department}</span>
              </div>
            )}

            {detailsData.homeCareType && (
              <div>
                <span className="text-slate-400 font-bold block uppercase text-[10px]">Package</span>
                <span className="font-bold text-slate-800">{detailsData.homeCareType}</span>
              </div>
            )}

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

            {detailsData.destinationAddress && (
              <div className="sm:col-span-2">
                <span className="text-slate-400 font-bold block uppercase text-[10px]">Destination Location</span>
                <span className="font-bold text-slate-800">{detailsData.destinationAddress}</span>
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

            {detailsData.selectedMedicines && detailsData.selectedMedicines.length > 0 && (
              <div className="sm:col-span-2">
                <span className="text-slate-400 font-bold block uppercase text-[10px]">Medicines Ordered</span>
                <ul className="list-disc list-inside font-bold text-slate-800 space-y-0.5 mt-0.5">
                  {detailsData.selectedMedicines.map((m: any) => (
                    <li key={m.item.id}>
                      {m.item.name} — ₹{m.item.price}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {detailsData.selectedLabTests && detailsData.selectedLabTests.length > 0 && (
              <div className="sm:col-span-2">
                <span className="text-slate-400 font-bold block uppercase text-[10px]">Lab Tests Selected</span>
                <ul className="list-disc list-inside font-bold text-slate-800 space-y-0.5 mt-0.5">
                  {detailsData.selectedLabTests.map((t: any) => (
                    <li key={t.id}>
                      {t.name} — ₹{t.price}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {detailsData.selectedEquipment && (
              <div className="sm:col-span-2">
                <span className="text-slate-400 font-bold block uppercase text-[10px]">Rented Equipment</span>
                <span className="font-bold text-slate-800">
                  {detailsData.selectedEquipment.name} ({detailsData.rentalDuration || 'Monthly'})
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Total Price Summary Box */}
        <div className="p-5 bg-teal-50/40 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-800">
              Total Fee Payable
            </span>
            <p className="text-2xl font-black text-slate-900">₹{calculatedTotal}</p>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-teal-700 font-bold bg-white px-3 py-1.5 rounded-lg border border-teal-100 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-teal-600" /> 100% Verified Price Guarantee
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl border border-slate-300 font-bold text-sm text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Back
        </button>

        <button
          onClick={onProceedToPayment}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm transition-all shadow-xs active:scale-98"
        >
          Proceed to Payment &rarr;
        </button>
      </div>
    </div>
  );
};
