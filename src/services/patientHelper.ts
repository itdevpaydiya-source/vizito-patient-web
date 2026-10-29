import { ENDPOINTS } from "./endpoints";
import apiClient from "./index";
import type { ProviderItem } from "./types";

// Authenticated patient profile. Identity comes from the JWT server-side (/patients/me resolves
// req.user.userId = users.id). No patient_id is sent from the client. Throws on failure — no fake fallback.
export interface PatientProfileData {
  userId: number;
  patientProfileId: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;   // ISO date (YYYY-MM-DD) or null
  gender: string | null;        // 'Male' | 'Female' | 'Other' or null
  profilePicture: string | null;// stored avatar URL or null
  addresses: any[];
}

export const getPatientProfileApi = async (): Promise<PatientProfileData | null> => {
  const res = await apiClient.get(ENDPOINTS.PATIENTS.ME);
  const d = res?.data?.data;
  if (!d) return null;
  const dobRaw = d.dateOfBirth ?? null;
  return {
    userId: d.userId,
    patientProfileId: d.patientProfileId,
    fullName: d.fullName ?? null,
    email: d.email ?? null,
    phone: d.phone ?? null,
    // Normalize any date-ish value to YYYY-MM-DD for <input type="date">.
    dateOfBirth: dobRaw ? String(dobRaw).split('T')[0] : null,
    gender: d.gender ?? null,
    profilePicture: d.profilePicture ?? null,
    addresses: Array.isArray(d.addresses) ? d.addresses : [],
  };
};

// Updates the authenticated patient's profile (name / contact / dob / gender / avatar). Identity is
// resolved server-side from the JWT; only the provided fields are changed. Throws on failure so the
// UI shows the real error — never a fake success.
export interface UpdateProfilePayload {
  fullName?: string;
  phone?: string;
  email?: string;
  dateOfBirth?: string;   // '' clears it
  gender?: string;
  profilePicture?: string;
}

export const updateProfileApi = async (payload: UpdateProfilePayload): Promise<void> => {
  await apiClient.patch(ENDPOINTS.PATIENTS.PROFILE, payload);
};

// Changes the authenticated patient's password. The backend verifies the current password (bcrypt)
// and rejects a wrong one — this is a real security operation, not a local toast.
export const changePasswordApi = async (currentPassword: string, newPassword: string): Promise<void> => {
  await apiClient.post(ENDPOINTS.PATIENTS.CHANGE_PASSWORD, { currentPassword, newPassword });
};

// Real approved providers from the backend (auth partners, active/approved only), with the public
// doctor profile (qualification, experience, city, fees) and star rating when they exist — a field
// the provider hasn't filled is simply absent, never invented.
const providerServiceParam = (serviceId?: string) => ({
  homecare: 'HOME_CARE', home_care: 'HOME_CARE', diagnostic: 'LAB', diagnostics: 'LAB', lab: 'LAB',
  equipment: 'EQUIPMENT', rental: 'EQUIPMENT', ambulance: 'AMBULANCE', doctor: 'DOCTOR', hospital: 'HOSPITAL', pharmacy: 'PHARMACY',
} as Record<string, string>)[String(serviceId || '').toLowerCase()] || serviceId;

const mapProviderItem = (p: any, serviceId?: string): ProviderItem => ({
  id: String(p.id), serviceId: serviceId || '',
  name: p.display_name || p.business_name || p.name || (serviceId === 'hospital' ? 'Hospital' : 'Provider'),
  subtitle: p.display_type || p.partner_type || undefined,
  specialtyOrType: p.display_type || p.partner_type || undefined,
  partnerType: String(p.partner_type || '').toLowerCase() || null,
  qualification: p.doctor?.qualification ?? null,
  specialization: p.doctor?.specialization ?? p.doctor?.primary_specialization ?? null,
  designation: p.doctor?.designation ?? null,
  expertise: Array.isArray(p.doctor?.expertise) ? p.doctor.expertise : [],
  superSpecialization: p.doctor?.super_specialization ?? null,
  experienceYears: p.doctor?.years_of_experience ?? null,
  medicalRegistrationNumber: p.doctor?.medical_registration_number ?? p.doctor?.registration_number ?? p.medical_registration_number ?? null,
  medicalCouncilName: p.doctor?.medical_council_name ?? p.doctor?.council_name ?? p.medical_council_name ?? null,
  languages: p.doctor?.languages ?? null,
  gender: p.doctor?.gender ?? null,
  languagesList: p.doctor?.languages_list ?? [],
  nextAvailable: p.doctor?.next_available ?? null,
  city: p.doctor?.city ?? null,
  inClinicFee: p.doctor?.in_clinic_fee ?? null,
  videoFee: p.doctor?.video_fee ?? null,
  registrationVerified: Boolean(p.doctor?.registration_verified ?? p.doctor?.verification_status === 'VERIFIED'),
  logo: p.logo ?? null, address: p.address?.replace(/\bNear\s+Near\b/gi, 'Near') ?? null, storePin: p.store_pin ?? null,
  rating: p.rating && Number(p.rating.count) > 0 ? { average: Number(p.rating.average), count: Number(p.rating.count) } : null,
  pause: p.pause?.paused ? p.pause : null,
  licenseStatus: p.license_status ?? null,
  businessHours: Array.isArray(p.business_hours) ? p.business_hours : [],
  org: p.org || null,
  hospital: p.hospital || null,
  nearestKm: p.nearest_km == null ? null : Number(p.nearest_km),
  distanceKnown: p.distance_known === true,
});

export const getProvidersApi = async (serviceId?: string, search?: string): Promise<ProviderItem[]> => {
  const params: Record<string, string> = {};
  if (serviceId) params.service = String(providerServiceParam(serviceId));
  if (search && search.trim()) params.search = search.trim();
  const res = await apiClient.get(ENDPOINTS.PATIENTS.PROVIDERS, { params });
  const list = res?.data?.data;
  if (!Array.isArray(list)) return [];
  return list.map((p: any) => mapProviderItem(p, serviceId));
};

export interface ProviderPage { items: ProviderItem[]; total: number; page: number; limit: number }
export interface ProviderPageOptions {
  area?: string;
  lat?: number;
  lng?: number;
  radiusKm?: 5 | 10 | 25 | 50;
  feeMin?: number;
  feeMax?: number;
  minRating?: number;
  online?: boolean;
  sort?: string;
  gender?: string;
  languages?: string[];
  available?: 'today' | 'tomorrow' | 'week';
  mode?: 'IN_CLINIC' | 'VIDEO';
}
/** Paged directory request for screens that should not render the entire provider catalogue at once. */
export const getProvidersPageApi = async (serviceId: string | undefined, search: string | undefined, page: number, limit = 12, options?: string|ProviderPageOptions): Promise<ProviderPage> => {
  const params: Record<string, string | number> = { page, limit };
  if (serviceId) params.service = String(providerServiceParam(serviceId));
  if (search?.trim()) params.q = search.trim();
  const opts=typeof options==='string'?{area:options}:options;
  if (opts?.area?.trim()) params.area = opts.area.trim();
  if (opts?.lat != null && opts?.lng != null) { params.lat=opts.lat; params.lng=opts.lng; }
  if (opts?.radiusKm != null) params.radius_km=opts.radiusKm;
  if (opts?.feeMin != null) params.fee_min=opts.feeMin;
  if (opts?.feeMax != null) params.fee_max=opts.feeMax;
  if (opts?.minRating != null) params.min_rating=opts.minRating;
  if (opts?.online) params.mode='online';
  if (opts?.gender) params.gender=opts.gender;
  if (opts?.languages?.length) params.languages=opts.languages.join(',');
  if (opts?.available) params.available=opts.available;
  if (opts?.mode) params.mode=opts.mode;
  if (opts?.sort) params.sort=opts.sort;
  const res = await apiClient.get(ENDPOINTS.PATIENTS.PROVIDERS, { params });
  const envelope = res?.data;
  const list = envelope?.data;
  return {
    items: Array.isArray(list) ? list.map((p: any) => mapProviderItem(p, serviceId)) : [],
    total: Number(envelope?.total) || 0,
    page: Number(envelope?.page) || page,
    limit: Number(envelope?.limit) || limit,
  };
};

// Real, date-gated doctor availability — a doctor is only included if they have a genuine bookable
// slot on `date` (backend-enforced, never client-filtered from an unscoped list). facilityId scopes
// to one hospital branch (+ optional facilityDepartmentId); omitted, this searches all doctors
// platform-wide, optionally filtered by specialization.
export const getAvailableDoctorsApi = async (params: {
  date: string;
  facilityId?: number;
  facilityDepartmentId?: number;
  specialization?: string;
}): Promise<ProviderItem[]> => {
  const query: Record<string, string> = { date: params.date };
  if (params.facilityId != null) query.facility_id = String(params.facilityId);
  if (params.facilityDepartmentId != null) query.facility_department_id = String(params.facilityDepartmentId);
  if (params.specialization) query.specialization = params.specialization;
  const res = await apiClient.get(ENDPOINTS.PATIENTS.AVAILABLE_DOCTORS, { params: query });
  const list = res?.data?.data;
  if (!Array.isArray(list)) return [];
  return list.map((d: any): ProviderItem => ({
    id: String(d.doctor_partner_id),
    serviceId: 'doctor',
    name: d.name || 'Doctor',
    subtitle: d.specialization || undefined,
    specialtyOrType: d.specialization || undefined,
  }));
};

export interface SpecializationOption {
  id: number;
  name: string;
}

export const getSpecializationsApi = async (): Promise<SpecializationOption[]> => {
  const res = await apiClient.get('/specializations');
  const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : []);
  return list
    .filter((s: any) => s.isActive !== false)
    .map((s: any) => ({ id: s.id, name: s.name }));
};

// Patient favorites (real, patient_profile-scoped via PatientFavorite entity). Each favorite links to
// a partner (doctor_partner) and/or a facility. Only the fields the backend actually stores are mapped.
export interface PatientFavoriteItem {
  id: string;                     // PatientFavorite.id — used for delete
  partnerId: string | null;      // doctor_partner_id
  facilityId: number | null;
  name: string | null;           // doctor_partner.business_name (null if only a facility ref)
  partnerType: string | null;    // doctor_partner.partner_type
}

export const getFavoritesApi = async (): Promise<PatientFavoriteItem[]> => {
  const res = await apiClient.get(ENDPOINTS.PATIENTS.FAVORITES);
  const list = res?.data?.data;
  if (!Array.isArray(list)) return [];
  return list.map((f: any): PatientFavoriteItem => ({
    id: String(f.id),
    partnerId: f.doctor_partner_id ?? null,
    facilityId: f.facility_id ?? null,
    name: f.name ?? f.doctor_partner?.business_name ?? null,
    partnerType: f.partner_type ?? f.doctor_partner?.partner_type ?? null,
  }));
};

export const addFavoriteApi = async (body: { doctor_partner_id?: string; facility_id?: number }): Promise<void> => {
  await apiClient.post(ENDPOINTS.PATIENTS.FAVORITES, body);
};

export const removeFavoriteApi = async (favoriteId: string): Promise<void> => {
  await apiClient.delete(`${ENDPOINTS.PATIENTS.FAVORITES}/${favoriteId}`);
};

// Patient saved addresses. The list comes from GET /patients/me (real). Delete and set-default are
// real, un-validated endpoints. NOTE: create/update are intentionally NOT wired here — the backend
// PatientAddressDto requires catalogue numeric country_id/state_id/city_id validated via
// /locations/validate, which needs catalogue location pickers in the UI. Wiring writes without those
// would mean fabricating location IDs, so address creation is reported as a blocker, not faked.
export interface PatientAddress {
  addressId: string;
  label: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  landmark: string | null;
  pincode: string | null;
  cityId: number | null;
  stateId: number | null;
  countryId: number | null;
  isDefault: boolean;
  addressType?: string | null;
  city?: string | null;
  state?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  pin?: { lat: number; lng: number } | null;
  latitude: number | null;
  longitude: number | null;
}

export const getAddressesApi = async (): Promise<PatientAddress[]> => {
  const res = await apiClient.get(ENDPOINTS.PATIENTS.ME);
  const list = res?.data?.data?.addresses;
  if (!Array.isArray(list)) return [];
  return list.map((a: any): PatientAddress => ({
    addressId: String(a.addressId),
    label: a.label ?? null,
    addressLine1: a.addressLine1 ?? null,
    addressLine2: a.addressLine2 ?? null,
    landmark: a.landmark ?? null,
    pincode: a.pincode ?? null,
    cityId: a.cityId ?? null,
    stateId: a.stateId ?? null,
    countryId: a.countryId ?? null,
    isDefault: Boolean(a.isDefault),
    addressType: a.addressType ?? null,
    city: a.city ?? null,
    state: a.state ?? null,
    contactName: a.contactName ?? null,
    contactPhone: a.contactPhone ?? null,
    pin: a.latitude != null && a.longitude != null && Number(a.latitude) !== 0 ? { lat: Number(a.latitude), lng: Number(a.longitude) } : null,
    latitude: a.latitude != null && Number.isFinite(Number(a.latitude)) ? Number(a.latitude) : null,
    longitude: a.longitude != null && Number.isFinite(Number(a.longitude)) ? Number(a.longitude) : null,
  }));
};

export interface AddressInput {
  address_type?: 'HOME' | 'WORK' | 'OTHER'; label?: string; address_line_1: string; address_line_2?: string; landmark?: string;
  pincode: string; city: string; state: string; contact_name?: string; contact_phone?: string; is_default?: boolean;
  latitude?: number; longitude?: number; // set when the patient used their location for this address
}
/** Add (no id) or update (with id) a saved address. */
export const saveAddressApi = async (body: AddressInput, addressId?: string): Promise<void> => {
  if (addressId) await apiClient.patch(`${ENDPOINTS.PATIENTS.ADDRESS}/${addressId}`, body);
  else await apiClient.post(ENDPOINTS.PATIENTS.ADDRESS, body);
};

/** One line for showing an address anywhere (booking forms, cards). */
export const addressText = (a: PatientAddress): string =>
  [a.addressLine1, a.addressLine2, a.landmark ? (/^near\b/i.test(a.landmark.trim()) ? a.landmark.trim() : `near ${a.landmark}`) : null, a.city, a.state, a.pincode].filter(Boolean).join(', ');

// Mobile / email change: a code goes to the NEW number or email; it changes only once the code is right.
export const sendContactOtpApi = async (body: { phone?: string; email?: string }): Promise<{ dev_otp?: string; identifier: string }> =>
  (await apiClient.post('/patient/auth/contact/send-otp', body)).data;
export const verifyContactApi = async (body: { phone?: string; email?: string; otp: string }): Promise<{ phone?: string; email?: string }> =>
  (await apiClient.post('/patient/auth/contact/verify', body)).data;
export const logoutOtherDevicesApi = async (): Promise<{ signed_out: number }> => (await apiClient.post('/patient/auth/logout-others', {})).data;

export const deleteAddressApi = async (addressId: string): Promise<void> => {
  await apiClient.delete(`${ENDPOINTS.PATIENTS.ADDRESS}/${addressId}`);
};

export const setDefaultAddressApi = async (addressId: string): Promise<void> => {
  await apiClient.patch(`${ENDPOINTS.PATIENTS.ADDRESS}/${addressId}/default`);
};

// Patient's finalized prescriptions (consultation output). Each carries the real diagnosis, medicines,
// notes, and follow-up recorded by the doctor. Nothing is fabricated — empty when none exist.
export interface PrescriptionMedicine {
  name: string | null;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  instructions: string | null;
}
export interface PrescriptionDoctor {
  name: string | null;
  qualification: string | null;
  specialization: string | null;
  experience_years?: number | null;
  medical_registration_number?: string | null;
  medical_council_name?: string | null;
  registration_verified?: boolean;
  clinic_name: string | null;
  address: string | null;
  phone: string | null;
  signature_url: string | null;
}
export interface PatientPrescription {
  id: string;
  prescription_number: string | null;
  patient_id: string | null;
  booking_id: string | null;
  date: string | null;
  chief_complaint: string | null;
  diagnosis: string | null;
  notes: string | null;
  followup_required: boolean;
  followup_date: string | null;
  followup_after_days: number | null;
  consultation_mode: string | null;
  tests: { name: string; code: string | null; urgency: string | null; fasting_required: boolean; notes: string | null }[];
  allergies: { allergen: string; reaction: string | null; severity: string | null }[];
  no_known_allergies: boolean;
  pdf_url: string | null;
  signature_url: string | null;
  status: string | null;
  patient_name: string | null;
  patient_age: number | null;
  patient_sex: string | null;
  // Doctor-routed pharmacy status ('Sent'|'Processing'|'Dispensed') — set once EITHER the
  // doctor sends this prescription directly to a pharmacy, or the patient's own pharmacy
  // request is accepted and fulfilled (see pharmacyOrderHelper.ts). null = never routed.
  pharmacy_status: string | null;
  pharmacy_partner_id: string | null;
  pharmacy_name?: string | null;
  pharmacy_address?: string | null;
  pharmacy_phone?: string | null;
  doctor: PrescriptionDoctor | null;
  vitals?: {
    bp?: string | null;
    pulse?: string | number | null;
    temperature?: string | number | null;
    spo2?: string | number | null;
    respiratory_rate?: string | number | null;
    height?: string | number | null;
    weight?: string | number | null;
    bmi?: string | number | null;
  } | null;
  medicines: PrescriptionMedicine[];
}

export const getPrescriptionsApi = async (): Promise<PatientPrescription[]> => {
  const res = await apiClient.get(ENDPOINTS.PATIENTS.PRESCRIPTIONS);
  const list = res?.data?.data;
  if (!Array.isArray(list)) return [];
  return list.map((p: any): PatientPrescription => ({
    id: String(p.id),
    prescription_number: p.prescription_number ?? null,
    patient_id: p.patient_id ? String(p.patient_id) : (p.patientId ? String(p.patientId) : null),
    booking_id: p.booking_id ?? null,
    date: p.date ? String(p.date) : null,
    chief_complaint: p.chief_complaint ?? null,
    diagnosis: p.diagnosis ?? null,
    notes: p.notes ?? null,
    followup_required: Boolean(p.followup_required),
    followup_date: p.followup_date ? String(p.followup_date).split('T')[0] : null,
    followup_after_days: p.followup_after_days ?? null,
    consultation_mode: p.consultation_mode ?? null,
    tests: Array.isArray(p.tests) ? p.tests.map((t: any) => ({
      name: String(t.name ?? t), code: t.code ?? null, urgency: t.urgency ?? null, fasting_required: Boolean(t.fasting_required), notes: t.notes ?? null,
    })) : [],
    allergies: Array.isArray(p.allergies) ? p.allergies : [],
    no_known_allergies: Boolean(p.no_known_allergies),
    pdf_url: p.pdf_url ?? null,
    signature_url: p.signature_url ?? null,
    status: p.status ?? null,
    patient_name: p.patient_name ?? null,
    patient_age: p.patient_age != null ? Number(p.patient_age) : null,
    patient_sex: p.patient_sex ?? null,
    pharmacy_status: p.pharmacy_status ?? null,
    pharmacy_partner_id: p.pharmacy_partner_id ?? null,
    pharmacy_name: p.pharmacy_name ?? p.pharmacy?.business_name ?? p.pharmacy?.name ?? p.pharmacy_details?.business_name ?? p.pharmacy_details?.name ?? null,
    pharmacy_address: (p.pharmacy_address ?? p.pharmacy?.address ?? p.pharmacy_details?.address)?.replace(/\bNear\s+Near\b/gi, 'Near') ?? null,
    pharmacy_phone: p.pharmacy_phone ?? p.pharmacy?.phone ?? p.pharmacy_details?.phone ?? null,
    doctor: p.doctor ? {
      name: p.doctor.name ?? null,
      qualification: p.doctor.qualification ?? null,
      specialization: p.doctor.specialization ?? null,
      experience_years: p.doctor.experience_years ?? p.doctor.years_of_experience ?? null,
      medical_registration_number: p.doctor.medical_registration_number ?? p.doctor.registration_number ?? null,
      medical_council_name: p.doctor.medical_council_name ?? p.doctor.council_name ?? null,
      registration_verified: Boolean(p.doctor.registration_verified ?? p.doctor.verification_status === 'VERIFIED'),
      clinic_name: p.doctor.clinic_name ?? null,
      address: p.doctor.address ?? null,
      phone: p.doctor.phone ?? null,
      signature_url: p.doctor.signature_url ?? null,
    } : null,
    vitals: p.vitals ?? null,
    medicines: Array.isArray(p.medicines) ? p.medicines.map((m: any) => ({
      name: m.name ?? m.medicine_name ?? null,
      dosage: m.dosage ?? null,
      frequency: m.frequency ?? null,
      duration: m.duration ?? null,
      instructions: m.instructions ?? null,
    })) : [],
  }));
};

// Profile photo: stored as a file (not Base64); the profile keeps its URL.
export const uploadPatientPhotoApi = async (file: File): Promise<string> => {
  const fd = new FormData(); fd.append('file', file);
  const r = await apiClient.post('/facility/patient-photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  const url = r?.data?.url;
  if (!url) throw new Error('No URL returned');
  return url;
};
/** Stored photo paths (/uploads/...) are served by the API gateway. */
export const photoUrl = (u?: string | null): string => {
  if (!u) return '';
  if (/^(https?:|data:|blob:)/.test(u)) return u;
  return `${String(apiClient.defaults.baseURL || '').replace(/\/$/, '')}${u.startsWith('/') ? '' : '/'}${u}`;
};
