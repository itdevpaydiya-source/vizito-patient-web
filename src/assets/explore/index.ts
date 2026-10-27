// Generated visual assets only. No provider data or page behavior.
import allProviders from './all-providers.webp';
import doctorConsultation from './doctor-consultation.webp';
import hospitalsClinics from './hospitals-clinics.webp';
import labTests from './lab-tests.webp';
import homeCare from './home-care.webp';
import pharmacy from './pharmacy.webp';
import medicalEquipment from './medical-equipment.webp';
import ambulance from './ambulance.webp';
import bloodServices from './blood-services.webp';
import heroCare from './hero-care.webp';
import fallbackDoctor from './fallback-doctor.webp';
import fallbackHospital from './fallback-hospital.webp';
import fallbackLab from './fallback-lab.webp';
import fallbackHomecare from './fallback-homecare.webp';
import fallbackPharmacy from './fallback-pharmacy.webp';
import fallbackEquipment from './fallback-equipment.webp';
import fallbackAmbulance from './fallback-ambulance.webp';
import fallbackBloodbank from './fallback-bloodbank.webp';
import verified from './verified.svg';
import nearby from './nearby.svg';
import easyBooking from './easy-booking.svg';

export const exploreAssets = {
  tiles: { allProviders, doctorConsultation, hospitalsClinics, labTests, homeCare, pharmacy, medicalEquipment, ambulance, bloodServices },
  hero: heroCare,
  fallbacks: { doctor: fallbackDoctor, hospital: fallbackHospital, lab: fallbackLab, homecare: fallbackHomecare, pharmacy: fallbackPharmacy, equipment: fallbackEquipment, ambulance: fallbackAmbulance, bloodbank: fallbackBloodbank },
  icons: { verified, nearby, easyBooking },
} as const;

export type ExploreAssets = typeof exploreAssets;
