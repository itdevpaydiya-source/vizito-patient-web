import { useSearchParams, Navigate } from 'react-router-dom';
import UniversalBookingScreen from './UniversalBookingScreen';

/**
 * Retires the generic /booking screen:
 * - /booking redirects to the right per-service flow:
 *   - doctor (or bare /booking) -> /find-doctors
 *   - lab / diagnostic -> /lab-tests
 *   - home care -> /home-care
 *   - pharmacy -> /pharmacy-orders/new
 * - Redirects hospital/clinic booking links into the existing hospital journey
 *   while preserving direct booking intent.
 */
export default function BookingRedirect() {
  const [params] = useSearchParams();
  const service = (params.get('service') || '').toLowerCase();
  const provider = params.get('provider') || params.get('doctor') || params.get('partnerId');
  if (service === 'hospital' || service === 'clinic') {
    const query = provider ? new URLSearchParams({provider, book:'1'}).toString() : '';
    return <Navigate to={'/find-hospitals' + (query ? '?' + query : '')} replace />;
  }

  // Existing doctor links retain their current booking implementation.
  if (service === 'doctor' && provider) {
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
