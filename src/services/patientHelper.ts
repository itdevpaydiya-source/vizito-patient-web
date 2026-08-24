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

// Real approved providers from the backend (auth partners, active/approved only). The backend
// currently returns only { id, business_name, partner_type, status } — rating/fee/image/specialty
// are NOT available, so they are mapped to honest empty values (rendered as "unavailable"), never faked.
export const getProvidersApi = async (serviceId?: string, search?: string): Promise<ProviderItem[]> => {
  const params: Record<string, string> = {};
  if (serviceId) params.service = serviceId;
  if (search && search.trim()) params.search = search.trim();
  const res = await apiClient.get(ENDPOINTS.PATIENTS.PROVIDERS, { params });
  const list = res?.data?.data;
  if (!Array.isArray(list)) return [];
  return list.map((p: any): ProviderItem => ({
    id: String(p.id),
    serviceId: serviceId || '',
    name: p.business_name || p.display_name || p.name || (serviceId === 'hospital' ? 'Hospital' : 'Provider'),
    // Prefer the friendly display_type (e.g. "Multi-Speciality Hospital") the backend resolves from the
    // hospital profile; fall back to the raw partner_type only when no nicer label exists.
    subtitle: p.display_type || p.partner_type || undefined,
    specialtyOrType: p.display_type || p.partner_type || undefined,
  }));
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
    name: f.doctor_partner?.business_name ?? null,
    partnerType: f.doctor_partner?.partner_type ?? null,
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
  }));
};

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
  clinic_name: string | null;
  address: string | null;
  phone: string | null;
  signature_url: string | null;
}
export interface PatientPrescription {
  id: string;
  prescription_number: string | null;
  booking_id: string | null;
  date: string | null;
  chief_complaint: string | null;
  diagnosis: string | null;
  notes: string | null;
  followup_required: boolean;
  followup_date: string | null;
  pdf_url: string | null;
  signature_url: string | null;
  status: string | null;
  patient_name: string | null;
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
    booking_id: p.booking_id ?? null,
    date: p.date ? String(p.date).split('T')[0] : null,
    chief_complaint: p.chief_complaint ?? null,
    diagnosis: p.diagnosis ?? null,
    notes: p.notes ?? null,
    followup_required: Boolean(p.followup_required),
    followup_date: p.followup_date ? String(p.followup_date).split('T')[0] : null,
    pdf_url: p.pdf_url ?? null,
    signature_url: p.signature_url ?? null,
    status: p.status ?? null,
    patient_name: p.patient_name ?? null,
    doctor: p.doctor ? {
      name: p.doctor.name ?? null,
      qualification: p.doctor.qualification ?? null,
      specialization: p.doctor.specialization ?? null,
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
