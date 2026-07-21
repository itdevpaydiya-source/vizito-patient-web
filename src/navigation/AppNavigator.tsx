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
import UniversalBookingScreen from '../presentation/modules/booking/UniversalBookingScreen';
import MyConsultationsScreen from '../presentation/modules/bookings/MyConsultationsScreen';
import MyRecordsScreen from '../presentation/modules/records/MyRecordsScreen';
import ProfileLayout from '../presentation/modules/profile/ProfileLayout';
import NotificationsScreen from '../presentation/modules/notifications/NotificationsScreen';
import HelpSupportScreen from '../presentation/modules/support/HelpSupportScreen';
import SettingsScreen from '../presentation/modules/settings/SettingsScreen';
import BookConsultationScreen from '../presentation/modules/consultations/BookConsultationScreen';
import PharmacyOrdersScreen from '../presentation/modules/pharmacy/PharmacyOrdersScreen';
import FamilyProfilesScreen from '../presentation/modules/family/FamilyProfilesScreen';

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
        setRole('patient');
        navigate('/dashboard');
      }}
      onRegisterClick={() => navigate('/auth/register')}
    />
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
        setRole('patient');
        navigate('/dashboard');
      }}
    />
  );
};

const AppNavigator = () => {
  return (
    <Routes>
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
        <Route path="/booking" element={<UniversalBookingScreen />} />
        <Route path="/homecare-services" element={<UniversalBookingScreen />} />
        <Route path="/ambulance-dispatch" element={<UniversalBookingScreen />} />
        <Route path="/lab-tests" element={<UniversalBookingScreen />} />
        <Route path="/equipment-rentals" element={<UniversalBookingScreen />} />
        <Route path="/find-doctors" element={<BookConsultationScreen />} />
        <Route path="/my-records" element={<MyRecordsScreen />} />
        <Route path="/my-consultations" element={<MyConsultationsScreen />} />
        <Route path="/bookings" element={<MyConsultationsScreen />} />
        <Route path="/appointments" element={<MyConsultationsScreen />} />
        <Route path="/pharmacy-orders" element={<PharmacyOrdersScreen />} />
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
