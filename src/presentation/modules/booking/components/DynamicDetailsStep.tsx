import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Upload,
  Check,
  AlertCircle,
  FileText,
  Building2,
  Stethoscope,
  Pill,
  Microscope,
  Accessibility,
  Truck
} from 'lucide-react';
import {
  type HealthcareServiceOption,
  MOCK_HOSPITAL_DEPARTMENTS,
  MOCK_HOMECARE_TYPES,
  MOCK_MEDICINES_CATALOG,
  MOCK_LAB_TESTS_CATALOG,
  MOCK_EQUIPMENT_CATALOG,
  MOCK_AVAILABLE_SLOTS,
  type MedicineItem,
  type LabTestItem,
  type RentalEquipmentItem
} from '../../../../mocks/universalBookingMocks';

export interface BookingDetailsData {
  consultationType?: 'Video' | 'In Person';
  department?: string;
  homeCareType?: string;
  appointmentDate?: string;
  timeSlot?: string;
  pickupAddress?: string;
  destinationAddress?: string;
  serviceAddress?: string;
  deliveryAddress?: string;
  selectedMedicines?: { item: MedicineItem; quantity: number }[];
  prescriptionFile?: File | null;
  selectedLabTests?: LabTestItem[];
  collectionType?: 'Home Collection' | 'Lab Visit';
  selectedEquipment?: RentalEquipmentItem | null;
  rentalDuration?: 'Daily' | 'Weekly' | 'Monthly';
}

interface DynamicDetailsStepProps {
  service: HealthcareServiceOption;
  detailsData: BookingDetailsData;
  onChangeDetailsData: (data: BookingDetailsData) => void;
  onNext: () => void;
  onBack: () => void;
  validationError?: string | null;
}

export const DynamicDetailsStep: React.FC<DynamicDetailsStepProps> = ({
  service,
  detailsData,
  onChangeDetailsData,
  onNext,
  onBack,
  validationError
}) => {
  const [prescriptionFileName, setPrescriptionFileName] = useState<string | null>(
    detailsData.prescriptionFile ? detailsData.prescriptionFile.name : null
  );

  const updateField = (fields: Partial<BookingDetailsData>) => {
    onChangeDetailsData({ ...detailsData, ...fields });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPrescriptionFileName(file.name);
      updateField({ prescriptionFile: file });
    }
  };

  const toggleMedicine = (med: MedicineItem) => {
    const current = detailsData.selectedMedicines || [];
    const exists = current.find((m) => m.item.id === med.id);
    if (exists) {
      updateField({
        selectedMedicines: current.filter((m) => m.item.id !== med.id)
      });
    } else {
      updateField({
        selectedMedicines: [...current, { item: med, quantity: 1 }]
      });
    }
  };

  const toggleLabTest = (test: LabTestItem) => {
    const current = detailsData.selectedLabTests || [];
    const exists = current.find((t) => t.id === test.id);
    if (exists) {
      updateField({
        selectedLabTests: current.filter((t) => t.id !== test.id)
      });
    } else {
      updateField({
        selectedLabTests: [...current, test]
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
      <div>
        <span className="text-teal-600 font-bold text-xs uppercase tracking-wider">
          Step 4 — Specify Booking Parameters
        </span>
        <h2 className="text-2xl font-black text-slate-800 mt-0.5">
          {service.name} Details
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Provide requirements and schedule tailored for {service.name}.
        </p>
      </div>

      {validationError && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3 text-rose-700 text-sm font-bold animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Dynamic Fields Container */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
        
        {/* DOCTOR CONSULTATION */}
        {service.id === 'doctor' && (
          <>
            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                Consultation Type
              </label>
              <div className="grid grid-cols-2 gap-4">
                {(['Video', 'In Person'] as const).map((type) => {
                  const isSelected = (detailsData.consultationType || 'Video') === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => updateField({ consultationType: type })}
                      className={`p-4 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                        isSelected
                          ? 'border-teal-600 bg-teal-50/50 text-teal-800 shadow-xs ring-2 ring-teal-600/20'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <span>{type === 'Video' ? '💻 Video Consultation' : '🏥 In Person Visit'}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-teal-600" /> Appointment Date
              </label>
              <input
                type="date"
                value={detailsData.appointmentDate || ''}
                onChange={(e) => updateField({ appointmentDate: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-teal-600" /> Available Time Slot
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {MOCK_AVAILABLE_SLOTS.map((slot) => {
                  const isSelected = detailsData.timeSlot === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => updateField({ timeSlot: slot })}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                        isSelected
                          ? 'border-teal-600 bg-teal-600 text-white shadow-xs'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* HOSPITAL & CLINIC */}
        {service.id === 'hospital' && (
          <>
            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                Select Department
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {MOCK_HOSPITAL_DEPARTMENTS.map((dept) => {
                  const isSelected = detailsData.department === dept.name;
                  return (
                    <button
                      key={dept.id}
                      type="button"
                      onClick={() => updateField({ department: dept.name })}
                      className={`p-3.5 rounded-xl border text-left font-bold text-xs flex items-center justify-between transition-all ${
                        isSelected
                          ? 'border-teal-600 bg-teal-50/50 text-teal-800 ring-2 ring-teal-600/20'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <span>{dept.name}</span>
                      {isSelected && <Check className="w-4 h-4 text-teal-600" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                Appointment Date
              </label>
              <input
                type="date"
                value={detailsData.appointmentDate || ''}
                onChange={(e) => updateField({ appointmentDate: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                Time Slot
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {MOCK_AVAILABLE_SLOTS.map((slot) => {
                  const isSelected = detailsData.timeSlot === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => updateField({ timeSlot: slot })}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                        isSelected
                          ? 'border-teal-600 bg-teal-600 text-white shadow-xs'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* HOME CARE */}
        {service.id === 'homecare' && (
          <>
            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                Home Care Service Package
              </label>
              <div className="space-y-2.5">
                {MOCK_HOMECARE_TYPES.map((hc) => {
                  const isSelected = detailsData.homeCareType === hc.name;
                  return (
                    <button
                      key={hc.id}
                      type="button"
                      onClick={() => updateField({ homeCareType: hc.name })}
                      className={`w-full p-4 rounded-xl border text-left font-bold text-sm flex items-center justify-between transition-all ${
                        isSelected
                          ? 'border-teal-600 bg-teal-50/50 text-teal-800 ring-2 ring-teal-600/20'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <span>{hc.name}</span>
                      <span className="text-teal-700 font-black">₹{hc.pricePerVisit} / visit</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                  Visit Date
                </label>
                <input
                  type="date"
                  value={detailsData.appointmentDate || ''}
                  onChange={(e) => updateField({ appointmentDate: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                  Preferred Visit Time
                </label>
                <select
                  value={detailsData.timeSlot || ''}
                  onChange={(e) => updateField({ timeSlot: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                >
                  <option value="">-- Select Time Slot --</option>
                  {MOCK_AVAILABLE_SLOTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-teal-600" /> Service Address (Required)
              </label>
              <textarea
                rows={3}
                value={detailsData.serviceAddress || ''}
                onChange={(e) => updateField({ serviceAddress: e.target.value })}
                placeholder="Enter complete door no, street address, landmark, and pincode..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
          </>
        )}

        {/* AMBULANCE */}
        {service.id === 'ambulance' && (
          <>
            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-rose-600" /> Pickup Address (Required)
              </label>
              <textarea
                rows={2}
                value={detailsData.pickupAddress || ''}
                onChange={(e) => updateField({ pickupAddress: e.target.value })}
                placeholder="Enter exact pickup location address & landmarks..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-teal-600" /> Destination Hospital Address
              </label>
              <textarea
                rows={2}
                value={detailsData.destinationAddress || ''}
                onChange={(e) => updateField({ destinationAddress: e.target.value })}
                placeholder="Enter target hospital name or drop location..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                  Dispatch Date
                </label>
                <input
                  type="date"
                  value={detailsData.appointmentDate || ''}
                  onChange={(e) => updateField({ appointmentDate: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                  Dispatch Time
                </label>
                <input
                  type="time"
                  value={detailsData.timeSlot || ''}
                  onChange={(e) => updateField({ timeSlot: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
            </div>
          </>
        )}

        {/* PHARMACY */}
        {service.id === 'pharmacy' && (
          <>
            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                Select Medicines
              </label>
              <div className="space-y-2.5">
                {MOCK_MEDICINES_CATALOG.map((med) => {
                  const selected = (detailsData.selectedMedicines || []).some(
                    (m) => m.item.id === med.id
                  );
                  return (
                    <div
                      key={med.id}
                      onClick={() => toggleMedicine(med)}
                      className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        selected
                          ? 'border-teal-600 bg-teal-50/50 ring-2 ring-teal-600/20'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                            selected ? 'bg-teal-600 border-teal-600 text-white' : 'border-slate-300'
                          }`}
                        >
                          {selected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-800 text-sm">{med.name}</p>
                          <p className="text-xs text-slate-500 font-medium">
                            {med.dosage}{' '}
                            {med.requiresPrescription && (
                              <span className="text-rose-600 font-bold ml-1">
                                (Rx Required)
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <span className="font-black text-slate-800 text-sm">₹{med.price}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Prescription Upload if any prescription item selected */}
            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-teal-600" /> Prescription Upload (If Required)
              </label>
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 text-center bg-slate-50 hover:bg-slate-100/80 transition-colors cursor-pointer relative">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <FileText className="w-8 h-8 text-teal-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">
                  {prescriptionFileName
                    ? `Uploaded: ${prescriptionFileName}`
                    : 'Click to upload Doctor Prescription (JPG, PNG, PDF)'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Required for prescription medicines marked Rx
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                Delivery Address
              </label>
              <textarea
                rows={2}
                value={detailsData.deliveryAddress || ''}
                onChange={(e) => updateField({ deliveryAddress: e.target.value })}
                placeholder="Enter complete delivery address with landmark..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
          </>
        )}

        {/* DIAGNOSTIC LAB */}
        {service.id === 'diagnostic' && (
          <>
            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                Select Lab Tests & Packages
              </label>
              <div className="space-y-2.5">
                {MOCK_LAB_TESTS_CATALOG.map((test) => {
                  const selected = (detailsData.selectedLabTests || []).some((t) => t.id === test.id);
                  return (
                    <div
                      key={test.id}
                      onClick={() => toggleLabTest(test)}
                      className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        selected
                          ? 'border-teal-600 bg-teal-50/50 ring-2 ring-teal-600/20'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                            selected ? 'bg-teal-600 border-teal-600 text-white' : 'border-slate-300'
                          }`}
                        >
                          {selected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-800 text-sm">{test.name}</p>
                          <p className="text-xs text-slate-500 font-medium">
                            Turnaround: {test.turnaroundTime} {test.fastingRequired && '• Fasting 10-12 hrs'}
                          </p>
                        </div>
                      </div>
                      <span className="font-black text-slate-800 text-sm">₹{test.price}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                Sample Collection Type
              </label>
              <div className="grid grid-cols-2 gap-4">
                {(['Home Collection', 'Lab Visit'] as const).map((colType) => {
                  const isSelected = (detailsData.collectionType || 'Home Collection') === colType;
                  return (
                    <button
                      key={colType}
                      type="button"
                      onClick={() => updateField({ collectionType: colType })}
                      className={`p-4 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                        isSelected
                          ? 'border-teal-600 bg-teal-50/50 text-teal-800 ring-2 ring-teal-600/20 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <span>{colType === 'Home Collection' ? '🏠 Free Home Collection' : '🏥 Visit Diagnostic Lab'}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Show Service Address ONLY if Home Collection selected */}
            {(detailsData.collectionType || 'Home Collection') === 'Home Collection' && (
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-teal-600" /> Home Sample Collection Address
                </label>
                <textarea
                  rows={2}
                  value={detailsData.serviceAddress || ''}
                  onChange={(e) => updateField({ serviceAddress: e.target.value })}
                  placeholder="Enter house/flat no, street address, pincode for phlebotomist visit..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                  Sample Collection Date
                </label>
                <input
                  type="date"
                  value={detailsData.appointmentDate || ''}
                  onChange={(e) => updateField({ appointmentDate: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                  Time Slot
                </label>
                <select
                  value={detailsData.timeSlot || ''}
                  onChange={(e) => updateField({ timeSlot: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                >
                  <option value="">-- Select Time Slot --</option>
                  {MOCK_AVAILABLE_SLOTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </>
        )}

        {/* EQUIPMENT RENTAL */}
        {service.id === 'equipment' && (
          <>
            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                Select Medical Equipment
              </label>
              <div className="space-y-3">
                {MOCK_EQUIPMENT_CATALOG.map((eq) => {
                  const isSelected = detailsData.selectedEquipment?.id === eq.id;
                  return (
                    <div
                      key={eq.id}
                      onClick={() => updateField({ selectedEquipment: eq })}
                      className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-teal-600 bg-teal-50/50 ring-2 ring-teal-600/20 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <p className="font-extrabold text-slate-800 text-sm">{eq.name}</p>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          Refundable Security Deposit: ₹{eq.deposit}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 text-xs font-bold">
                        <span className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg">
                          ₹{eq.dailyRate}/day
                        </span>
                        <span className="bg-teal-50 text-teal-700 px-3 py-1.5 rounded-lg border border-teal-100">
                          ₹{eq.monthlyRate}/mo
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                Rental Duration Tenure
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['Daily', 'Weekly', 'Monthly'] as const).map((duration) => {
                  const isSelected = (detailsData.rentalDuration || 'Monthly') === duration;
                  return (
                    <button
                      key={duration}
                      type="button"
                      onClick={() => updateField({ rentalDuration: duration })}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                        isSelected
                          ? 'border-teal-600 bg-teal-600 text-white shadow-xs'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      {duration}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-teal-600" /> Delivery & Installation Address (Required)
              </label>
              <textarea
                rows={3}
                value={detailsData.deliveryAddress || ''}
                onChange={(e) => updateField({ deliveryAddress: e.target.value })}
                placeholder="Enter complete door no, street address, and pincode for equipment delivery..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
          </>
        )}
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
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm transition-all shadow-xs active:scale-98"
        >
          Review Booking &rarr;
        </button>
      </div>
    </div>
  );
};
