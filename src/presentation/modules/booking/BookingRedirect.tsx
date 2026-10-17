import { useSearchParams, Navigate } from 'react-router-dom';
import UniversalBookingScreen from './UniversalBookingScreen';

/**
 * Retires the generic /booking screen:
 * - /booking redirects to the right per-service flow:
 *   - doctor (or bare /booking) -> /find-doctors
 *   - lab / diagnostic -> /lab-tests
 *   - home care -> /home-care
 *   - pharmacy -> /pharmacy-orders/new
 * - Preserves /booking?service=hospital or clinic rendering UniversalBookingScreen
 *   so hospital booking tests continue to pass.
 */
export default function BookingRedirect() {
  const [params] = useSearchParams();
  const service = (params.get('service') || '').toLowerCase();
  const provider = params.get('provider') || params.get('doctor') || params.get('partnerId');

  // Hospital & Clinic booking, or direct doctor booking with a specific provider, continues through UniversalBookingScreen
  if (service === 'hospital' || service === 'clinic' || (service === 'doctor' && provider)) {
    return <UniversalBookingScreen />;
  }

  // Diagnostic / Lab tests
  if (service === 'diagnostic' || service === 'lab') {
    const labUrl = provider ? `/lab-tests?lab=${encodeURIComponent(provider)}` : '/lab-tests';
    return <Navigate to={labUrl} replace />;
  }

  // Home Care services
  if (service === 'homecare' || service === 'home-care') {
    const hcUrl = provider ? `/home-care?agency=${encodeURIComponent(provider)}` : '/home-care';
    return <Navigate to={hcUrl} replace />;
  }

  // Pharmacy ordering
  if (service === 'pharmacy') {
    const pharmUrl = provider ? `/pharmacy-orders/new?pharmacy=${encodeURIComponent(provider)}` : '/pharmacy-orders/new';
    return <Navigate to={pharmUrl} replace />;
  }

  // Doctor consultation or default bare /booking redirect
  const docUrl = provider ? `/find-doctors?doctor=${encodeURIComponent(provider)}` : '/find-doctors';
  return <Navigate to={docUrl} replace />;
}
