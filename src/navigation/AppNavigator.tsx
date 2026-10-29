import SharedRecordPage from '../presentation/modules/records/SharedRecordPage';
import AppointmentsRoute from '../presentation/modules/bookings/AppointmentsRoute';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';

// Layouts
import AuthLayout from '../layouts/AuthLayout';
import MainLayout from '../layouts/MainLayout';
import DashboardLayout from '../layouts/DashboardLayout';

// Auth Modules
import AuthModule from '../presentation/modules/auth/AuthModule';
import RegistrationModule from '../presentation/modules/auth/RegistrationModule';

// Patient Feature Modules
import PatientDashboard from '../presentation/modules/dashboard/PatientDashboard';
import HealthcareServicesScreen from '../presentation/modules/services/HealthcareServicesScreen';
import LabBookingScreen from '../presentation/modules/labs/LabBookingScreen';
import LabBookingConfirmation from '../presentation/modules/labs/LabBookingConfirmation';
import LabBookingsScreen from '../presentation/modules/labs/LabBookingsScreen';
import VerifyReportScreen from '../presentation/modules/labs/VerifyReportScreen';
import HomeCareScreen from '../presentation/modules/homecare/HomeCareScreen';
import FindBloodScreen from '../presentation/modules/bloodbank/FindBloodScreen';
import RequestBloodScreen from '../presentation/modules/bloodbank/RequestBloodScreen';
import MyBloodRequestsScreen from '../presentation/modules/bloodbank/MyBloodRequestsScreen';
import EmergencyBookings from '../presentation/modules/bookings/EmergencyBookings';
import DonateBloodScreen from '../presentation/modules/bloodbank/DonateBloodScreen';
import BookAmbulanceScreen from '../presentation/modules/ambulance/BookAmbulanceScreen';
import MyAmbulanceTripsScreen from '../presentation/modules/ambulance/MyAmbulanceTripsScreen';

import UrgentAmbulanceScreen from '../presentation/modules/ambulance/UrgentAmbulanceScreen';
import UniversalBookingScreen from '../presentation/modules/booking/UniversalBookingScreen';
import HospitalsClinicsScreen from '../presentation/modules/booking/HospitalsClinicsScreen';
import BookingRedirect from '../presentation/modules/booking/BookingRedirect';
import MyConsultationsScreen from '../presentation/modules/bookings/MyConsultationsScreen';
import MyRecordsScreen from '../presentation/modules/records/MyRecordsScreen';
import ProfileLayout from '../presentation/modules/profile/ProfileLayout';
import NotificationsScreen from '../presentation/modules/notifications/NotificationsScreen';
import HelpSupportScreen from '../presentation/modules/support/HelpSupportScreen';
import SettingsScreen from '../presentation/modules/settings/SettingsScreen';
import BookConsultationScreen from '../presentation/modules/consultations/BookConsultationScreen';
import PharmacyOrdersScreen from '../presentation/modules/pharmacy/PharmacyOrdersScreen';
import OrderBuilderScreen from '../presentation/modules/pharmacy/OrderBuilderScreen';
import OrderDetailScreen from '../presentation/modules/pharmacy/OrderDetailScreen';
import FamilyProfilesScreen from '../presentation/modules/family/FamilyProfilesScreen';
import ReviewsScreen from '../presentation/modules/reviews/ReviewsScreen';
import VideoConsultationScreen from '../presentation/modules/video/VideoConsultationScreen';

// Medical Equipment Rental Module Screens
import {
  EquipmentCatalogueScreen,
  EquipmentDetailScreen,
  EquipmentCheckoutScreen,
  EquipmentOrderDetailScreen,
  EquipmentOrderConfirmationScreen,
  MyRentalOrdersScreen,
  DeliveryTrackingScreen,
  ActiveRentalsScreen,
  ReturnSchedulingScreen,
} from '../presentation/modules/equipment';

import { useRole } from '../store/role/RoleContext';

// Session guard
const hasActiveSession = () => {
  const token = localStorage.getItem('vizito_token');
  const user = localStorage.getItem('vizito_user');
  return Boolean(token || user);
};

const RootSessionGuard = () => {
  if (hasActiveSession()) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/auth/login" replace />;
};

const LoginWrapper = () => {
  const navigate = useNavigate();
  const { setRole } = useRole();

  return (
    <>
      {new URLSearchParams(window.location.search).get('closed') === '1' && <p role="status" className="ph-success" style={{ margin: '16px auto', maxWidth: 620 }}>Your account is closed. You are signed out everywhere.</p>}
    <AuthModule
      onLoginSuccess={(userData) => {
        localStorage.setItem(
          'vizito_user',
          JSON.stringify({
            patient_id: userData.patient_id,
            email: userData.email,
            mobile: userData.mobile,
            role: 'patient',
            fullName: userData.fullName,
            token: userData.token
          })
        );
        if (userData.token) {
          localStorage.setItem('vizito_token', userData.token);
        }
        // Tell the NotificationsContext (mounted above the router) to fetch now that a session exists,
        // so the bell populates immediately instead of waiting for the next poll.
        window.dispatchEvent(new Event('vizito-auth-changed'));
        setRole('patient');
        navigate('/dashboard');
      }}
      onRegisterClick={() => navigate('/auth/register')}
    />
    </>
  );
};

const RegisterWrapper = () => {
  const navigate = useNavigate();
  const { setRole } = useRole();

  return (
    <RegistrationModule
      onBackToLogin={() => navigate('/auth/login')}
      onRegisterSuccess={(userData) => {
        localStorage.setItem(
          'vizito_user',
          JSON.stringify({
            patient_id: userData.patient_id,
            email: userData.email,
            mobile: userData.mobile,
            role: 'patient',
            fullName: userData.fullName,
            token: userData.token
          })
        );
        if (userData.token) {
          localStorage.setItem('vizito_token', userData.token);
        }
        window.dispatchEvent(new Event('vizito-auth-changed'));
        setRole('patient');
        navigate('/dashboard');
      }}
    />
  );
};

const AppNavigator = () => {
  return (
    <Routes>
      <Route path="/shared/:token" element={<SharedRecordPage />} />
      {/* Public: lab report verification from the QR code (no login, no patient data) */}
      <Route path="/verify-report/:token" element={<VerifyReportScreen />} />

      {/* Root Session Guard */}
      <Route path="/" element={<RootSessionGuard />} />

      {/* Authentication */}
      <Route path="/auth" element={<AuthLayout />}>
        <Route path="login" element={<LoginWrapper />} />
        <Route path="register" element={<RegisterWrapper />} />
        <Route path="*" element={<Navigate to="/auth/login" replace />} />
      </Route>

      {/* Main Patient Application */}
      <Route element={<MainLayout />}>
        {/* Dashboard */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<PatientDashboard />} />
        </Route>

        {/* Core Patient Modules */}
        <Route path="/healthcare-services" element={<HealthcareServicesScreen />} />
        <Route path="/services" element={<HealthcareServicesScreen />} />
        <Route path="/booking" element={<BookingRedirect />} />
        <Route path="/homecare-services" element={<UniversalBookingScreen />} />
        <Route path="/ambulance-dispatch" element={<Navigate to="/urgent-ambulance" replace />} />
        <Route path="/book-ambulance" element={<BookAmbulanceScreen />} />
        <Route path="/ambulance-trips" element={<MyAmbulanceTripsScreen />} />
        <Route path="/urgent-ambulance" element={<UrgentAmbulanceScreen />} />
        <Route path="/lab-tests" element={<LabBookingScreen />} />
        <Route path="/lab-tests/booked/:orderId" element={<LabBookingConfirmation />} />
        <Route path="/lab-bookings" element={<LabBookingsScreen />} />
        <Route path="/home-care" element={<HomeCareScreen />} />
        {/* Blood Bank */}
        <Route path="/find-blood" element={<FindBloodScreen />} />
        <Route path="/request-blood" element={<RequestBloodScreen />} />
        <Route path="/blood-requests" element={<MyBloodRequestsScreen />} />
        <Route path="/donate-blood" element={<DonateBloodScreen />} />
        {/* Medical Equipment Rental Module */}
        <Route path="/equipment-rental" element={<EquipmentCatalogueScreen />} />
        <Route path="/equipment-rentals" element={<Navigate to="/equipment-rental" replace />} />
        <Route path="/equipment-rental/:id" element={<EquipmentDetailScreen />} />
        <Route path="/equipment-rental/item/:id" element={<EquipmentDetailScreen />} />
        <Route path="/equipment-rental/checkout" element={<EquipmentCheckoutScreen />} />
        <Route path="/equipment-rental/orders" element={<MyRentalOrdersScreen />} />
        <Route path="/equipment-rental/my-rentals" element={<MyRentalOrdersScreen />} />
        <Route path="/equipment-rental/orders/:id" element={<EquipmentOrderDetailScreen />} />
        <Route path="/equipment-rental/orders/:id/confirmation" element={<EquipmentOrderConfirmationScreen />} />
        <Route path="/equipment-rental/confirmation/:id" element={<EquipmentOrderConfirmationScreen />} />
        <Route path="/equipment-rental/orders/:id/track" element={<DeliveryTrackingScreen />} />
        <Route path="/equipment-rental/active" element={<ActiveRentalsScreen />} />
        <Route path="/equipment-rental/returns" element={<ReturnSchedulingScreen />} />
        <Route path="/find-doctors" element={<BookConsultationScreen />} />
        <Route path="/find-hospitals" element={<HospitalsClinicsScreen />} />
        <Route path="/my-records" element={<MyRecordsScreen />} />
        <Route path="/reviews" element={<ReviewsScreen />} />
        <Route path="/my-consultations" element={<AppointmentsRoute />} />
        <Route path="/bookings" element={<MyConsultationsScreen />} />
        <Route path="/appointments" element={<AppointmentsRoute />} />
        <Route path="/video-consultation/:bookingId" element={<VideoConsultationScreen />} />
        <Route path="/video-consultation/:bookingId/call" element={<VideoConsultationScreen />} />
        <Route path="/video-consultation/:bookingId/waiting-room" element={<VideoConsultationScreen />} />
        <Route path="/pharmacy-orders" element={<PharmacyOrdersScreen />} />
        <Route path="/pharmacy-orders/new" element={<OrderBuilderScreen />} />
        <Route path="/pharmacy-orders/:id" element={<OrderDetailScreen />} />
        <Route path="/family-profiles" element={<FamilyProfilesScreen />} />

        {/* Patient Preference & Utility Modules */}
        <Route path="/profile" element={<ProfileLayout />} />
        <Route path="/notifications" element={<NotificationsScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="/help" element={<HelpSupportScreen />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppNavigator;

