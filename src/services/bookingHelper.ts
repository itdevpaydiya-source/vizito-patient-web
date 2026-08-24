import { ENDPOINTS } from "./endpoints";
import apiClient from "./index";

// Online appointment booking — all data is real and backend-authoritative.
//   Doctor:   provider(doctor) -> date -> slots -> book
//   Hospital: provider(hospital) -> branches -> departments -> doctors -> date -> slots -> book
// Nothing here fabricates slots/fees/booking ids — the backend is the source of truth.

export interface DoctorDetail {
  full_name: string | null;
  specialization: string | null;
  super_specialization: string | null;
  qualification: string | null;
  experience_years: number | null;
  languages: string | null;
  in_clinic_fee: number | null;
  video_consultation_fee: number | null;
  about: string | null;
}

export interface ProviderDetail {
  id: string;
  business_name: string;
  partner_type: string;
  status: string;
  doctor: DoctorDetail | null;
}

export interface Branch {
  facility_id: number;
  name: string;
  facility_type: string | null;
  address_line_1: string | null;
  pincode: string | null;
  fee: number | null;
}

export interface BranchDepartment {
  facility_department_id: number;
  department_id: number | null;
  name: string;
  code: string | null;
  online_fee: number | null;
  in_person_fee: number | null;
}

export interface BranchDoctor {
  doctor_partner_id: string;
  doctor_user_id: number;
  name: string;
  specialization: string | null;
  experience_years: number | null;
  room_number: string | null;
  facility_id: number;
}

export interface AvailableSlot {
  time_slot_id: number;
  slot_date: string;
  start_time: string;   // HH:mm:ss
  end_time: string;
  facility_id: number | null;
  fee: number | null;
  // Resolved from the facility's own catalogue record (same source as its pricing above) — a doctor
  // can hold slots at more than one clinic, so this is per-slot, not a single fixed "doctor's clinic".
  // No resolved city/state name exists anywhere in the backend today (catalogue only stores city_id/
  // state_id foreign keys, never joined to a name) — address is street-level only.
  facility_name: string | null;
  facility_type: string | null;   // e.g. "Clinic" / "Hospital" / "Sub Branch"
  facility_address: string | null;
}

export interface CreatedBooking {
  id: string;
  booking_number: string;
  booking_status: string;
  total_amount: string | number;
  booking_date: string;
  appointment?: any;
  payment_status?: string;
  // Only present when the booking was created via an online payment (see CreateBookingInput.payment) —
  // the simulated gateway's reference id for the charge that was made before this booking existed.
  payment_reference_id?: string;
}

const unwrap = <T>(res: any): T => (res?.data?.data ?? res?.data) as T;

export const getProviderDetailApi = async (partnerId: string): Promise<ProviderDetail | null> => {
  const res = await apiClient.get(ENDPOINTS.PATIENTS.PROVIDER_DETAIL(partnerId));
  return unwrap<ProviderDetail>(res) ?? null;
};

export const getBranchesApi = async (partnerId: string): Promise<Branch[]> => {
  const res = await apiClient.get(ENDPOINTS.PATIENTS.PROVIDER_BRANCHES(partnerId));
  const list = unwrap<Branch[]>(res);
  return Array.isArray(list) ? list : [];
};

export const getBranchDepartmentsApi = async (partnerId: string, facilityId: number): Promise<BranchDepartment[]> => {
  const res = await apiClient.get(ENDPOINTS.PATIENTS.BRANCH_DEPARTMENTS(partnerId, facilityId));
  const list = unwrap<BranchDepartment[]>(res);
  return Array.isArray(list) ? list : [];
};

export const getBranchDoctorsApi = async (facilityId: number, facilityDepartmentId?: number): Promise<BranchDoctor[]> => {
  const res = await apiClient.get(ENDPOINTS.PATIENTS.BRANCH_DOCTORS(facilityId), {
    params: facilityDepartmentId ? { facility_department_id: facilityDepartmentId } : {},
  });
  const list = unwrap<BranchDoctor[]>(res);
  return Array.isArray(list) ? list : [];
};

// Real, date-gated branch doctors — a doctor is only included if they have a genuine bookable slot
// at THIS branch on `date` (backend-enforced). Same BranchDoctor shape as getBranchDoctorsApi, so it
// can drop straight into the same `doctors` state; this is the date-aware replacement used once a
// date has been selected, not a parallel/competing source of truth.
export const getAvailableBranchDoctorsApi = async (
  facilityId: number,
  date: string,
  facilityDepartmentId?: number,
): Promise<BranchDoctor[]> => {
  const res = await apiClient.get('/patients/available-doctors', {
    params: {
      date,
      facility_id: facilityId,
      ...(facilityDepartmentId ? { facility_department_id: facilityDepartmentId } : {}),
    },
  });
  const list = unwrap<BranchDoctor[]>(res);
  return Array.isArray(list) ? list : [];
};

export const isSlotInPast = (slotDate: string, startTime: string): boolean => {
  if (!slotDate || !startTime) return false;
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  const cleanDate = slotDate.split('T')[0];

  if (cleanDate < todayStr) return true;
  if (cleanDate > todayStr) return false;

  // Slot is today: compare start time (HH:mm) against current time
  const currentHours = String(now.getHours()).padStart(2, '0');
  const currentMinutes = String(now.getMinutes()).padStart(2, '0');
  const currentTimeStr = `${currentHours}:${currentMinutes}`;

  const parts = startTime.split(':');
  const slotTimeStr = `${(parts[0] || '0').padStart(2, '0')}:${(parts[1] || '00').padStart(2, '0')}`;

  return slotTimeStr < currentTimeStr;
};

export const getProviderSlotsApi = async (
  doctorPartnerId: string,
  date: string,
  facilityId?: number,
): Promise<AvailableSlot[]> => {
  const params: Record<string, string> = { date };
  if (facilityId) params.facility_id = String(facilityId);
  const res = await apiClient.get(ENDPOINTS.PATIENTS.PROVIDER_SLOTS(doctorPartnerId), { params });
  const list = unwrap<AvailableSlot[]>(res);
  const rawList = Array.isArray(list) ? list : [];
  return rawList.filter((s) => !isSlotInPast(s.slot_date || date, s.start_time));
};

export interface CreateBookingInput {
  partner_id: string;         // the DOCTOR partner uuid (bookable provider)
  service_type: string;       // 'In Person' | 'Video' | 'Home Visit'
  booking_date: string;       // YYYY-MM-DD
  time_slot_id: number;
  time_slot: string;          // HH:mm (start)
  family_member_id?: string;  // family member's users.id when booking for a dependent
  // For hospital/clinic bookings: the owning hospital's partner uuid. Stored on the booking so the
  // hospital's staff dashboard sees it (the doctor sees it via the doctor id). Omitted for doctor-direct.
  hospital_partner_id?: string;
  notes?: string;
  payment_mode?: string;
  // Present for every online payment mode — absent for CASH. When present, the backend charges
  // this BEFORE creating the booking or reserving the slot, so an abandoned/declined payment
  // attempt never leaves a real booking (or a held slot) behind (see BUGS.md #57).
  payment?: ProcessPaymentInput;
}

export const createBookingApi = async (input: CreateBookingInput): Promise<CreatedBooking> => {
  const res = await apiClient.post(ENDPOINTS.PATIENTS.BOOKINGS, input);
  return (res?.data?.data ?? res?.data) as CreatedBooking;
};

// ─── Payment (simulated — no real gateway wired in yet) ────────────────────
// The payable amount is never sent from here — the backend resolves it from the booking's own
// stored total_amount and ignores anything the client sends (see vizito-booking's
// PaymentsService.initiate). This type intentionally has no `amount` field.
export type PaymentMethod = 'UPI' | 'CARD' | 'NET_BANKING' | 'WALLET' | 'CASH';

export interface ProcessPaymentInput {
  payment_method: PaymentMethod;
  upi_id?: string;
  // Only the last 4 digits are ever sent — see ProcessPaymentDto on the backend for why.
  card_last4?: string;
  card_holder_name?: string;
  bank_name?: string;
  wallet_provider?: string;
}

export interface PaymentResult {
  success: boolean;
  reference_id: string;
  failure_reason?: string;
  payment_status: 'PENDING' | 'PARTIAL' | 'PAID' | 'FAILED' | 'REFUNDED';
  booking_status: string;
  amount: number;
  currency: string;
}

export const processPaymentApi = async (
  bookingId: string,
  input: ProcessPaymentInput,
): Promise<PaymentResult> => {
  const res = await apiClient.post(ENDPOINTS.BOOKINGS.PAYMENT(bookingId), input);
  return (res?.data?.data ?? res?.data) as PaymentResult;
};

export interface PaymentStatusResult {
  payment_status: 'PENDING' | 'PARTIAL' | 'PAID' | 'FAILED' | 'REFUNDED';
  booking_status: string;
  total_amount: number;
  currency: string;
}

export const getPaymentStatusApi = async (bookingId: string): Promise<PaymentStatusResult> => {
  const res = await apiClient.get(ENDPOINTS.BOOKINGS.PAYMENT(bookingId));
  return (res?.data?.data ?? res?.data) as PaymentStatusResult;
};

// Formats a HH:mm:ss backend time to a friendly 10:00 AM label.
export const formatSlotTime = (t: string): string => {
  if (!t) return '';
  const [hStr, mStr] = t.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr ?? '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
};
