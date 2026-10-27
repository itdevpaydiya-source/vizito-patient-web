import type { ProviderItem } from '../../../services/types';
import { metresBetween, type LatLng } from '../../../services/location';

export const validPin = (p: LatLng | null | undefined): p is LatLng => !!p && Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180;
export const pharmacyDistance = (p: ProviderItem, from: LatLng | null): number | null => validPin(from) && validPin(p.storePin) ? metresBetween(from, p.storePin) : null;
export const validRating = (p: ProviderItem) => !!p.rating && Number.isInteger(p.rating.count) && p.rating.count > 0 && Number.isFinite(p.rating.average) && p.rating.average >= 0 && p.rating.average <= 5;
export const verifiedLicense = (p: ProviderItem) => ['verified', 'approved'].includes(String(p.licenseStatus || '').toLowerCase());
// The directory supplies no business timezone. Show the supplied schedule, never infer "open now".
export const pharmacyHours = (p: ProviderItem) => (p.businessHours || []).filter(h => h.day && (h.is_closed || (/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(h.open_time || '') && /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(h.close_time || '')))).map(h => `${h.day}: ${h.is_closed ? 'Closed' : `${h.open_time!.slice(0, 5)} - ${h.close_time!.slice(0, 5)}`}`);


/** Today's supplied schedule; no live opening-status inference. */
export function pharmacyTodayHours(p: ProviderItem, date = new Date()): string | null {
  const day = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date);
  const h = p.businessHours?.find(h => h.day.toLowerCase() === day.toLowerCase());
  if (!h) return null;
  if (h.is_closed) return 'Closed today';
  const format = (time: string | null) => {
    if (!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(time || '')) return null;
    const [hour, minute] = time!.split(':').map(Number);
    return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
  };
  const open = format(h.open_time), close = format(h.close_time);
  return open && close ? `Open today ${open} \u2013 ${close}` : null;
}
