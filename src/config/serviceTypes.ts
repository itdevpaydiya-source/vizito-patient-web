// Static UI configuration for the platform's service navigation.
//
// These are NOT database/business records — they are fixed product navigation entries (like route
// definitions), explicitly allowed to remain static per the migration rules. Real providers,
// availability, fees, departments, etc. are always fetched from the backend; only the tile/icon/
// gradient presentation of the seven service categories lives here.
//
// This file replaces the former MOCK_BOOKING_SERVICES / MOCK_HEALTHCARE_SERVICES exports that used
// to live under src/mocks. No MOCK_ naming, no fabricated business data.

export interface ServiceTile {
  id: string;            // canonical service key used in booking routes (?service=doctor, etc.)
  name: string;
  shortDesc: string;
  iconName: string;      // lucide icon name; screens map this to a component
  emoji: string;
  tileClass: string;     // tailwind classes for the icon chip
}

export const SERVICE_TILES: ServiceTile[] = [
  { id: 'doctor',    name: 'Doctor Consultation',       shortDesc: 'In-Clinic & Video Consults',      iconName: 'Stethoscope',  emoji: '🩺', tileClass: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  { id: 'hospital',  name: 'Hospital & Clinic',         shortDesc: 'OPD Appointments & Admissions',    iconName: 'Building2',    emoji: '🏥', tileClass: 'bg-sky-50 text-sky-600 border-sky-100' },
  { id: 'homecare',  name: 'Home Care Services',        shortDesc: 'Nurses, Attendants & Physio',      iconName: 'Home',         emoji: '🏠', tileClass: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
  { id: 'ambulance', name: 'Scheduled Ambulance',       shortDesc: 'BLS, ALS & Patient Transport',     iconName: 'Truck',        emoji: '🚑', tileClass: 'bg-rose-50 text-rose-600 border-rose-100' },
  { id: 'pharmacy',  name: 'Pharmacy',                  shortDesc: 'Medicines & Prescription Upload',  iconName: 'Pill',         emoji: '💊', tileClass: 'bg-amber-50 text-amber-600 border-amber-100' },
  { id: 'diagnostic',name: 'Diagnostic Laboratory',     shortDesc: 'Home Sample Collection',           iconName: 'TestTube',     emoji: '🧪', tileClass: 'bg-teal-50 text-teal-600 border-teal-100' },
  { id: 'equipment', name: 'Medical Equipment Rental',  shortDesc: 'O2 Concentrators & ICU Beds',      iconName: 'Package',      emoji: '🦽', tileClass: 'bg-cyan-50 text-cyan-600 border-cyan-100' },
];
