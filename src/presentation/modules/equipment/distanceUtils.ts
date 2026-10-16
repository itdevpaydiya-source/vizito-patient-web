/**
 * Utility for calculating real geographical and road-estimated distance
 * between a Partner (Equipment Provider) address and a Patient address
 * strictly using their real geographical coordinates.
 */

export interface AddressLocationData {
  latitude?: number | string | null;
  longitude?: number | string | null;
  pincode?: string | null;
  text?: string | null;
}

/**
 * Calculates real distance in kilometers between a Patient address and a Partner address
 * strictly using their actual geographical coordinates (latitude & longitude).
 * 
 * Returns null if either patient or partner coordinates are missing or invalid,
 * allowing the UI to display '-- distance from your address' without any static assumptions.
 */
export function calculateAddressDistanceKm(
  patient: AddressLocationData | null | undefined,
  partner: AddressLocationData | null | undefined
): number | null {
  if (!patient || !partner) return null;

  const lat1 = patient.latitude != null && patient.latitude !== '' ? Number(patient.latitude) : null;
  const lon1 = patient.longitude != null && patient.longitude !== '' ? Number(patient.longitude) : null;
  const lat2 = partner.latitude != null && partner.latitude !== '' ? Number(partner.latitude) : null;
  const lon2 = partner.longitude != null && partner.longitude !== '' ? Number(partner.longitude) : null;

  // Real coordinate calculation only: both points must have valid latitude & longitude
  if (
    lat1 == null ||
    lon1 == null ||
    lat2 == null ||
    lon2 == null ||
    isNaN(lat1) ||
    isNaN(lon1) ||
    isNaN(lat2) ||
    isNaN(lon2)
  ) {
    return null;
  }

  // Exact Haversine formula
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightDist = R * c;

  // Real driving road factor (~1.25x straight distance)
  const roadDist = Math.max(0.5, straightDist * 1.25);
  return Math.round(roadDist * 10) / 10;
}

export interface DeliveryFeeSlab {
  id?: string;
  min_km: number;
  max_km: number;
  charge: number;
}

/**
 * Calculates delivery fee based on road distance in km and equipment delivery slabs.
 * Default standard healthcare equipment slabs:
 *  - 0 to 10 km: ₹150
 *  - 10 to 25 km: ₹300
 *  - > 25 km: ₹400
 */
export function calculateEquipmentDeliveryFee(
  distanceKm: number | null | undefined,
  slabs?: DeliveryFeeSlab[]
): number {
  if (distanceKm == null || isNaN(distanceKm)) {
    return 150;
  }

  if (slabs && slabs.length > 0) {
    const matched = slabs.find(
      (s) => distanceKm >= Number(s.min_km) && distanceKm <= Number(s.max_km)
    );
    if (matched) return Number(matched.charge);

    const sorted = [...slabs].sort((a, b) => Number(a.max_km) - Number(b.max_km));
    const last = sorted[sorted.length - 1];
    if (distanceKm > Number(last.max_km)) {
      return Number(last.charge) + Math.ceil(distanceKm - Number(last.max_km)) * 15;
    }
    return Number(sorted[0].charge);
  }

  if (distanceKm <= 10) return 150;
  if (distanceKm <= 25) return 300;
  return 400;
}
