import type { DriverLocation, MyTrip } from '../../../services/ambulanceHelper';

/** Coordinates are map data, never a destination address. Preserve readable address text only. */
export function destinationAddress(value: string | null | undefined): string {
  const text = (value || '').trim();
  if (!text || /^(?:shared location|coordinates?|latitude|lat\s*:)/i.test(text)) return 'Not specified';
  if (/^\(?\s*[+-]?\d{1,2}(?:\.\d+)?\s*[,/]\s*[+-]?\d{1,3}(?:\.\d+)?\s*\)?$/.test(text)) return 'Not specified';
  const address = text.replace(/\(?[+-]?\d{1,2}\.\d+\s*[,/]\s*[+-]?\d{1,3}\.\d+\)?/g, '').replace(/[\s,;()-]+$/g, '').trim();
  return address && /\p{L}/u.test(address) ? address : 'Not specified';
}

export const trackingTitle = (status: string, label: string) => ({ REQUESTED: 'Awaiting your ambulance', ASSIGNED: 'Your ambulance is assigned', EN_ROUTE: 'Ambulance on the way', AT_PICKUP: 'Ambulance at pickup', ON_BOARD: 'Patient onboard', COMPLETED: 'Trip completed', CANCELLED: 'Trip cancelled' } as Record<string, string>)[status] || label;
export const trackingSubtitle = (status: string) => ({ REQUESTED: 'Your request is awaiting driver acceptance.', ASSIGNED: 'A driver and ambulance have been assigned to your trip.', EN_ROUTE: 'Your ambulance is on the way to your location.', AT_PICKUP: 'Your ambulance has arrived at the pickup location.', ON_BOARD: 'The patient is onboard and the trip is in progress.', COMPLETED: 'Your ambulance trip is complete.', CANCELLED: 'This ambulance trip has been cancelled.' } as Record<string, string>)[status] || '';
export const timelineTime = (at: string) => new Date(at).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
export function timelineDescription(code: string, at: string | undefined, trip: MyTrip, location: DriverLocation | null): string {
  if (!at) return ['COMPLETED', 'CANCELLED', 'DECLINED', 'EXPIRED'].includes(trip.status) ? 'Not recorded for this trip.' : 'Awaiting this update.';
  switch (code) {
    case 'REQUESTED': return 'Your trip request was received.';
    case 'ASSIGNED': return trip.driver_name ? `${trip.driver_name} was assigned to this trip.` : 'A driver was assigned to this trip.';
    case 'EN_ROUTE': {
      const route = trip.status === 'EN_ROUTE' && location?.state === 'LIVE' && location.route?.available ? location.route : null;
      return route?.eta_minutes != null ? `${route.eta_minutes} mins away${route.distance_km != null ? ` (${route.distance_km} km)` : ''}.` : 'The ambulance set off for pickup.';
    }
    case 'AT_PICKUP': return 'The ambulance arrived at the pickup location.';
    case 'ON_BOARD': return 'The patient boarded the ambulance.';
    case 'COMPLETED': return 'The trip was completed.';
    case 'CANCELLED': return trip.status_reason || 'The trip was cancelled.';
    default: return trip.operator.name || 'Trip status updated.';
  }
}
