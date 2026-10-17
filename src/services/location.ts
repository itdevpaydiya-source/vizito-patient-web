import { useEffect, useState } from 'react';

// Location, shared by every patient screen that needs it (nearby search, distance, directions).
//
// Privacy: the patient's position stays in this browser. It is never sent to Vizito's servers;
// distances are worked out here from the branch pins the businesses confirmed. Asked only when the
// patient taps "Use my location" (never on page load), and a refusal is remembered so we don't nag.

export interface LatLng { lat: number; lng: number }
export interface SearchArea extends LatLng { label: string; source: 'gps' | 'manual'; accuracy?: number | null; at: number }

const AREA_KEY = 'vizito_search_area';
const DENIED_KEY = 'vizito_location_denied';
const listeners = new Set<() => void>();

const read = (): SearchArea | null => {
  try { const a = JSON.parse(sessionStorage.getItem(AREA_KEY) || 'null'); return a && Number.isFinite(a.lat) && Number.isFinite(a.lng) ? a : null; } catch { return null; }
};
let current: SearchArea | null = read();

export const getSearchArea = () => current;
export const setSearchArea = (a: SearchArea | null) => {
  current = a;
  try { if (a) sessionStorage.setItem(AREA_KEY, JSON.stringify(a)); else sessionStorage.removeItem(AREA_KEY); } catch { /* private mode */ }
  listeners.forEach((l) => l());
};
/** React hook: the area the patient is searching around (their location, or a place they chose). */
export const useSearchArea = (): SearchArea | null => {
  const [, tick] = useState(0);
  useEffect(() => { const l = () => tick((n) => n + 1); listeners.add(l); return () => { listeners.delete(l); }; }, []);
  return current;
};

export const locationWasDenied = () => { try { return localStorage.getItem(DENIED_KEY) === '1'; } catch { return false; } };

export type LocateError = 'denied' | 'unavailable' | 'timeout' | 'unsupported' | 'insecure';
export const LOCATE_ERROR_TEXT: Record<LocateError, string> = {
  denied: 'Location permission is off for Vizito. Turn it on in your browser’s site settings, or type your area or PIN code instead.',
  unavailable: 'We couldn’t find your location right now (GPS or network unavailable). Type your area or PIN code instead.',
  timeout: 'Finding your location took too long. Try again outdoors or near a window, or type your area or PIN code.',
  unsupported: 'This browser can’t share location. Type your area or PIN code instead.',
  insecure: 'Location works only on a secure (https) connection. Type your area or PIN code instead.',
};

/** One-time position, only when the patient asked for it. */
export function locateOnce(fresh = false): Promise<SearchArea> {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && !window.isSecureContext) return reject('insecure' as LocateError);
    if (!('geolocation' in navigator)) return reject('unsupported' as LocateError);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        try { localStorage.removeItem(DENIED_KEY); } catch { /* ignore */ }
        resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: Math.round(p.coords.accuracy || 0) || null, label: 'Your current location', source: 'gps', at: Date.now() });
      },
      (e) => {
        if (e.code === e.PERMISSION_DENIED) { try { localStorage.setItem(DENIED_KEY, '1'); } catch { /* ignore */ } return reject('denied' as LocateError); }
        reject((e.code === e.TIMEOUT ? 'timeout' : 'unavailable') as LocateError);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: fresh ? 0 : 60000 },
    );
  });
}

/** Places in India matching what the patient typed (area, locality, PIN code). OpenStreetMap Nominatim:
 *  free, called only when the patient presses Search (their usage policy allows ≤1 request/second). */
export async function findPlaces(q: string): Promise<{ label: string; lat: number; lng: number }[]> {
  const text = q.trim();
  if (text.length < 3) return [];
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&accept-language=en&countrycodes=in&limit=6&addressdetails=0&q=${encodeURIComponent(text)}`;
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error('search failed');
  const list = (await r.json()) as any[];
  return list.map((x) => ({ label: String(x.display_name || '').split(', ').slice(0, 4).join(', '), lat: Number(x.lat), lng: Number(x.lon) }))
    .filter((x) => Number.isFinite(x.lat) && Number.isFinite(x.lng));
}

/** Straight-line distance in metres (haversine). Not road distance. */
export function metresBetween(a: LatLng, b: LatLng): number {
  const R = 6371008.8, r = (d: number) => (d * Math.PI) / 180;
  const dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** "350 m", "1.2 km", "18 km": metres under 1 km (to 10 m), one decimal under 10 km, whole km beyond. */
export function formatDistance(m: number): string {
  if (!Number.isFinite(m)) return '';
  if (m < 1000) return `${Math.max(10, Math.round(m / 10) * 10)} m`;
  if (m < 10000) return `${(Math.round(m / 100) / 10).toFixed(1)} km`;
  return `${Math.round(m / 1000)} km`;
}

/** Nearest of several branch pins (null when none is confirmed or no search area). */
export function nearest<T extends { pin?: LatLng | null }>(from: LatLng | null, places: T[]): { place: T; metres: number } | null {
  if (!from) return null;
  let best: { place: T; metres: number } | null = null;
  for (const p of places) if (p.pin) { const m = metresBetween(from, p.pin); if (!best || m < best.metres) best = { place: p, metres: m }; }
  return best;
}

/** Turn-by-turn directions to the exact pin. Google Maps' public URL works on every phone and desktop
 *  (opens the app when installed); Apple devices can also use Apple Maps. No API key. */
export function directionsUrl(to: LatLng): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${to.lat.toFixed(7)},${to.lng.toFixed(7)}`;
}
export function appleMapsUrl(to: LatLng, label?: string): string {
  return `https://maps.apple.com/?daddr=${to.lat.toFixed(7)},${to.lng.toFixed(7)}${label ? `&q=${encodeURIComponent(label)}` : ''}`;
}
/** When a business hasn't confirmed its pin, directions go by the written address instead. */
export function addressSearchUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
export const isApple = () => typeof navigator !== 'undefined' && /iPhone|iPad|Macintosh/.test(navigator.userAgent);

/** The street address at a point (OpenStreetMap reverse lookup), split into address-form fields. */
export async function addressAt(p: LatLng): Promise<{ line1: string; area: string; city: string; state: string; pincode: string; text: string } | null> {
  const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&accept-language=en&addressdetails=1&zoom=18&lat=${p.lat}&lon=${p.lng}`, { headers: { Accept: 'application/json' } });
  if (!r.ok) return null;
  const raw = (await r.json())?.address || {};
  // English (Latin script) only: a value OpenStreetMap has only in a local script is left out for the user to type.
  const a: any = Object.fromEntries(Object.entries(raw).filter(([, v]) => typeof v === 'string' && isLatin(v as string)));
  const out = {
    line1: [a.house_number, a.building || a.amenity, a.road].filter(Boolean).join(', '),
    area: a.neighbourhood || a.suburb || a.quarter || a.city_district || '',
    city: a.city || a.town || a.village || a.state_district || a.county || '',
    state: a.state || '',
    pincode: /^\d{6}$/.test(String(a.postcode || '')) ? String(a.postcode) : '',
    text: '',
  };
  out.text = [out.line1, out.area, out.city, out.state, out.pincode].filter(Boolean).join(', ');
  return out.text ? out : null;
}

/** Latin script only (English letters, digits, punctuation): local-script place names are left for the user to type. */
function isLatin(v: string): boolean { return /^[\x20-\x7E -ɏ]*$/.test(v); }
