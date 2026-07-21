import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { BookingStepper, type StepItem } from './components/BookingStepper';
import { ServiceSelectorStep } from './components/ServiceSelectorStep';
import { ProviderSelectorStep } from './components/ProviderSelectorStep';
import { PatientSelectorStep } from './components/PatientSelectorStep';
import { DynamicDetailsStep, type BookingDetailsData } from './components/DynamicDetailsStep';
import { ReviewBookingStep } from './components/ReviewBookingStep';
import { PaymentStep } from './components/PaymentStep';
import { BookingConfirmationStep } from './components/BookingConfirmationStep';
import {
  MOCK_BOOKING_SERVICES,
  MOCK_UNIVERSAL_PROVIDERS,
  type HealthcareServiceOption,
  type ProviderItem
} from '../../../mocks/universalBookingMocks';
import { MOCK_FAMILY_MEMBERS, type FamilyMember } from '../../../mocks/patientFlowMocks';

const STEPPER_STEPS: StepItem[] = [
  { id: 1, label: 'Service' },
  { id: 2, label: 'Provider' },
  { id: 3, label: 'Patient' },
  { id: 4, label: 'Details' },
  { id: 5, label: 'Review' },
  { id: 6, label: 'Payment' },
  { id: 7, label: 'Confirmation' }
];

export default function UniversalBookingScreen() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // State
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedService, setSelectedService] = useState<HealthcareServiceOption | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<ProviderItem | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<FamilyMember | null>(
    MOCK_FAMILY_MEMBERS[0] || null
  );
  const [detailsData, setDetailsData] = useState<BookingDetailsData>({
    consultationType: 'Video',
    appointmentDate: new Date().toISOString().split('T')[0],
    timeSlot: '10:30 AM',
    collectionType: 'Home Collection',
    rentalDuration: 'Monthly'
  });
  const [validationError, setValidationError] = useState<string | null>(null);
  const [bookingRef, setBookingRef] = useState<string>('');

  // Pre-select service if passed via URL query parameter e.g., /booking?service=doctor
  useEffect(() => {
    const serviceParam = searchParams.get('service');
    if (serviceParam) {
      const match = MOCK_BOOKING_SERVICES.find((s) => s.id === serviceParam.toLowerCase());
      if (match) {
        setSelectedService(match);
        // Automatically default provider if single/first match
        const providers = MOCK_UNIVERSAL_PROVIDERS.filter((p) => p.serviceId === match.id);
        if (providers.length > 0) {
          setSelectedProvider(providers[0]);
        }
        setCurrentStep(2);
      }
    }
  }, [searchParams]);

  // Compute total payable amount dynamically based on service inputs
  const calculateTotalAmount = (): number => {
    if (!selectedService || !selectedProvider) return 500;

    let base = selectedProvider.priceValue || 500;

    if (selectedService.id === 'pharmacy') {
      const medsTotal = (detailsData.selectedMedicines || []).reduce(
        (sum, m) => sum + m.item.price * m.quantity,
        0
      );
      return medsTotal > 0 ? medsTotal : 450;
    }

    if (selectedService.id === 'diagnostic') {
      const testsTotal = (detailsData.selectedLabTests || []).reduce(
        (sum, t) => sum + t.price,
        0
      );
      return testsTotal > 0 ? testsTotal : 650;
    }

    if (selectedService.id === 'equipment') {
      if (detailsData.selectedEquipment) {
        if (detailsData.rentalDuration === 'Daily') return detailsData.selectedEquipment.dailyRate;
        if (detailsData.rentalDuration === 'Weekly') return detailsData.selectedEquipment.weeklyRate;
        return detailsData.selectedEquipment.monthlyRate;
      }
      return 2500;
    }

    return base;
  };

  // Step 1: Select Service
  const handleSelectService = (service: HealthcareServiceOption) => {
    setSelectedService(service);

    // Auto-select first matching provider for UX convenience
    const providers = MOCK_UNIVERSAL_PROVIDERS.filter((p) => p.serviceId === service.id);
    if (providers.length > 0) {
      setSelectedProvider(providers[0]);
    } else {
      setSelectedProvider(null);
    }

    setValidationError(null);
    setCurrentStep(2);
  };

  // Step 2: Select Provider
  const handleSelectProvider = (provider: ProviderItem) => {
    setSelectedProvider(provider);
    setValidationError(null);
  };

  const handleProviderNext = () => {
    if (!selectedProvider) {
      setValidationError('Please select a provider.');
      return;
    }
    setValidationError(null);
    setCurrentStep(3);
  };

  // Step 3: Select Patient
  const handlePatientNext = () => {
    if (!selectedPatient) {
      setValidationError('Please select a patient.');
      return;
    }
    setValidationError(null);
    setCurrentStep(4);
  };

  // Step 4: Validate and Proceed from Details to Review
  const handleDetailsNext = () => {
    setValidationError(null);
    if (!selectedService) return;

    // Validation rules per requirement
    if (selectedService.id === 'doctor' || selectedService.id === 'hospital') {
      if (!detailsData.appointmentDate) {
        setValidationError('Please select an appointment date.');
        return;
      }
      if (!detailsData.timeSlot) {
        setValidationError('Please select a time slot.');
        return;
      }
    }

    if (selectedService.id === 'homecare') {
      if (!detailsData.appointmentDate) {
        setValidationError('Please select an appointment date.');
        return;
      }
      if (!detailsData.serviceAddress || !detailsData.serviceAddress.trim()) {
        setValidationError('Address is required.');
        return;
      }
    }

    if (selectedService.id === 'ambulance') {
      if (!detailsData.pickupAddress || !detailsData.pickupAddress.trim()) {
        setValidationError('Address is required.');
        return;
      }
    }

    if (selectedService.id === 'pharmacy') {
      const selectedMeds = detailsData.selectedMedicines || [];
      if (selectedMeds.length === 0) {
        setValidationError('Please select at least one medicine.');
        return;
      }
      const needsRx = selectedMeds.some((m) => m.item.requiresPrescription);
      if (needsRx && !detailsData.prescriptionFile) {
        setValidationError('Prescription is required for selected medicine.');
        return;
      }
      if (!detailsData.deliveryAddress || !detailsData.deliveryAddress.trim()) {
        setValidationError('Address is required.');
        return;
      }
    }

    if (selectedService.id === 'diagnostic') {
      if (
        (detailsData.collectionType || 'Home Collection') === 'Home Collection' &&
        (!detailsData.serviceAddress || !detailsData.serviceAddress.trim())
      ) {
        setValidationError('Address is required.');
        return;
      }
    }

    if (selectedService.id === 'equipment') {
      if (!detailsData.deliveryAddress || !detailsData.deliveryAddress.trim()) {
        setValidationError('Address is required.');
        return;
      }
    }

    setCurrentStep(5);
  };

  // Step 5: Review -> Payment
  const handleProceedToPayment = () => {
    setCurrentStep(6);
  };

  // Step 6: Payment Success -> Confirmation
  const handlePaymentSuccess = () => {
    const generatedRef = `BK-${Math.floor(100000 + Math.random() * 900000)}`;
    setBookingRef(generatedRef);

    // Save mock booking to localStorage
    try {
      const stored = localStorage.getItem('vizito_patient_bookings');
      const bookings = stored ? JSON.parse(stored) : [];
      const newBooking = {
        id: generatedRef,
        serviceType: selectedService?.name,
        providerName: selectedProvider?.name,
        patientName: selectedPatient?.name,
        amount: calculateTotalAmount(),
        date: detailsData.appointmentDate || 'Today',
        time: detailsData.timeSlot || 'Immediate',
        status: 'Confirmed'
      };
      localStorage.setItem('vizito_patient_bookings', JSON.stringify([newBooking, ...bookings]));
    } catch (err) {
      console.error('Failed to update mock localStorage booking', err);
    }

    setCurrentStep(7);
  };

  // Rebook Handler
  const handleRebook = () => {
    setCurrentStep(1);
    setSelectedService(null);
    setSelectedProvider(null);
    setBookingRef('');
  };

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Progress Indicator Stepper */}
        <BookingStepper
          currentStep={currentStep}
          steps={STEPPER_STEPS}
          onStepClick={(stepId) => {
            setValidationError(null);
            setCurrentStep(stepId);
          }}
        />

        {/* Step 1: Select Service */}
        {currentStep === 1 && (
          <ServiceSelectorStep
            selectedServiceId={selectedService?.id}
            onSelectService={handleSelectService}
          />
        )}

        {/* Step 2: Select Provider */}
        {currentStep === 2 && selectedService && (
          <ProviderSelectorStep
            service={selectedService}
            selectedProvider={selectedProvider}
            onSelectProvider={handleSelectProvider}
            onNext={handleProviderNext}
            onBack={() => setCurrentStep(1)}
          />
        )}

        {/* Step 3: Select Patient */}
        {currentStep === 3 && (
          <PatientSelectorStep
            selectedPatient={selectedPatient}
            onSelectPatient={(p) => {
              setSelectedPatient(p);
              setValidationError(null);
            }}
            onNext={handlePatientNext}
            onBack={() => setCurrentStep(2)}
            validationError={validationError}
          />
        )}

        {/* Step 4: Booking Details (Dynamic) */}
        {currentStep === 4 && selectedService && (
          <DynamicDetailsStep
            service={selectedService}
            detailsData={detailsData}
            onChangeDetailsData={(data) => {
              setDetailsData(data);
              setValidationError(null);
            }}
            onNext={handleDetailsNext}
            onBack={() => setCurrentStep(3)}
            validationError={validationError}
          />
        )}

        {/* Step 5: Review Booking */}
        {currentStep === 5 && selectedService && selectedProvider && selectedPatient && (
          <ReviewBookingStep
            service={selectedService}
            provider={selectedProvider}
            patient={selectedPatient}
            detailsData={detailsData}
            calculatedTotal={calculateTotalAmount()}
            onEditStep={(stepId) => setCurrentStep(stepId)}
            onProceedToPayment={handleProceedToPayment}
            onBack={() => setCurrentStep(4)}
          />
        )}

        {/* Step 6: Payment */}
        {currentStep === 6 && selectedService && selectedProvider && (
          <PaymentStep
            service={selectedService}
            provider={selectedProvider}
            amount={calculateTotalAmount()}
            onPaymentSuccess={handlePaymentSuccess}
            onBack={() => setCurrentStep(5)}
          />
        )}

        {/* Step 7: Booking Confirmation */}
        {currentStep === 7 && selectedService && selectedProvider && selectedPatient && (
          <BookingConfirmationStep
            service={selectedService}
            provider={selectedProvider}
            patient={selectedPatient}
            detailsData={detailsData}
            bookingRef={bookingRef}
            totalAmount={calculateTotalAmount()}
            onRebook={handleRebook}
          />
        )}
      </div>
    </div>
  );
}
