import type { BookingActions, NextCareVisit } from './bookingActions';
import { ENDPOINTS } from "./endpoints";
import apiClient from "./index";

// Normalized booking for patient-facing lists. Maps ONLY real columns from the Booking entity
// (+ its Appointment relation) returned by GET /patients/dashboard. Fields the backend does not
// denormalize onto the booking (notably the provider/business NAME — the booking stores partner_id
// only) are left null and rendered honestly by the UI, never fabricated.
export interface HospitalBookingInfo {
  accreditation: { body: 'NABH' | 'NABH Entry Level' | 'JCI'; cert_no: string; valid_until: string; current: boolean } | null;
  arrival_desk: string | null;
  phone: string | null;
}
export interface BookingProvider {
  hospital?: HospitalBookingInfo | null;
  doctor?: { id?: string; name: string | null; photo_url: string | null; qualification: string | null; speciality: string | null; experience_years: number | null; rating: number | null; review_count: number | null } | null;
  image_url?: string | null;
  place?: { name?: string | null; address?: string | null; landmark?: string | null; city?: string | null; pincode?: string | null; latitude?: number | null; longitude?: number | null; pin_confirmed?: boolean; image_url?: string | null } | null;
  payment?: { receipt_number: string | null; transaction_number: string | null; payment_reference: string | null; method: string | null; amount: number; paid_at: string | null } | null;
  nabl?: { cert_no: string | null; valid_until: string | null; current: boolean } | null;
  items?: { name: string; price: number }[];
  duration_minutes?: number | null;
  total_amount?: number | null;
  payment_status?: string | null;
  payment_mode?: string | null;
}
export interface DoctorVisit extends BookingActions {
  can_reschedule: boolean;
  can_cancel: boolean;
  reschedules_left: number;
  token_number: string | null;
  reason_for_visit: string | null;
  prescription: { id: string; number: string | null; finalized_at: string | null } | null;
  timeline: { code: 'BOOKED'|'PAYMENT'|'CHECKED_IN'|'CONSULTATION'|'PRESCRIPTION'|'CANCELLED'; label: string; state: 'completed'|'current'|'pending'; occurred_at: string | null }[];
  video: { how: 'DOCTOR_CALLS'; can_join: false; join_url: null; call_expected_from: string | null; call_expected_until: string | null; message: string; mode_used: string | null } | null;
}
export interface DashboardBooking {
  visit?: DoctorVisit | null;
  patientProfileId?: string | null;
  provider?: BookingProvider | null;
  id: string;
  bookingNumber: string | null;   // authoritative backend reference (Booking.booking_number)
  status: string;                 // booking_status, falling back to appointment.status
  bookingDate: string | null;
  appointmentDate: string | null;
  endTime?: string | null; // Actual appointment end_time; never an assumed duration.
  timeSlot: string | null;
  appointmentType: string | null; // VIDEO_CALL / IN_CLINIC / HOME_VISIT
  location: string | null;        // facility address captured at booking time
  providerId: string | null;      // partner_id (no name is stored on the booking)
  facilityId: number | null;      // the branch/clinic the visit is at (reschedule stays there)
  hospitalPartnerId: string | null; // hospital bookings: the hospital (booking.branch_id)
  patientName: string | null;     // appointment.patient_name
  totalAmount: number | null;
  paymentStatus: string | null;
  notes: string | null;
  createdAt: string | null;
  // Denormalized appointment fields — all real columns already returned by GET /patients/dashboard
  // (appointment relation), just not previously surfaced to the UI.
  doctorName: string | null;      // appointment.doctor_name
  department: string | null;      // appointment.department
  branchName: string | null;      // appointment.branch_name (clinic/branch short name; `location` above is the fuller address)
  visitType: string | null;       // appointment.visit_type (e.g. FIRST_VISIT)
  durationMinutes: number | null; // appointment.duration_minutes
  patientMobile: string | null;   // appointment.patient_mobile
  reasonForVisit: string | null;  // appointment.reason_for_visit (patient-safe — NOT appointment.internal_notes)
  appointmentStatus: string | null; // appointment.status, kept separate from the coarser `status` above
  paymentMode: string | null;     // booking.payment_mode ("Online" / "Pay at Clinic (Cash)")
  source: string | null;          // booking.source ("ONLINE" / "WALK_IN")
  paymentReferenceId: string | null;
  // Who ended a cancelled visit: PATIENT, or DOCTOR / HOSPITAL when the provider declined it.
  cancelledBy: string | null;
  cancellationReason: string | null;
  // What it is and with whom (from the booking service): never a bare "Appointment".
  kind: 'DOCTOR_VISIT' | 'VIDEO_CONSULT' | 'HOME_VISIT' | 'LAB_TEST' | 'HOME_CARE';
  homeCare: (BookingActions & { next_visit?: NextCareVisit | null; reschedule_visit_id?: string | null; id: string; order_number: string; agency_name: string | null; service_name: string; category: string; kind: string; sessions: number; done: number; status: string; patient_name: string | null; next_date: string | null; next_time: string | null }) | null;
  business: { id: string; name: string | null; type: string } | null;
  labOrder: (BookingActions & { id: string; order_number: string; lab_name: string | null; location_name: string | null; status: string; visit_type: string; visit_date: string; visit_time: string; patient_name: string | null; tests: string[]; package_name: string | null }) | null;
}

export interface DashboardData {
  active: DashboardBooking[];
  upcoming: DashboardBooking[];
  history: DashboardBooking[];
}

function mapBooking(b: any): DashboardBooking {
  const appt = b?.appointment || {};
  const details = appt?.patient_details || {};
  const toStr = (v: any) => (v == null ? null : String(v).split('T')[0]);
  return {
    id: String(b?.id ?? ''),
    visit: b?.visit ?? null,
    patientProfileId: appt?.patient_id ?? b?.patient_id ?? null,
    bookingNumber: b?.booking_number ?? null,
    // Prefer the appointment's lifecycle status (IN_PROGRESS/COMPLETED) so the badge matches the tab;
    // booking_status is a coarser fallback that can lag behind at 'Pending'.
    status: appt?.status || b?.booking_status || 'Status unavailable',
    bookingDate: toStr(b?.booking_date),
    appointmentDate: toStr(appt?.appointment_date),
    endTime: appt?.end_time ?? null,
    timeSlot: appt?.time_slot ?? null,
    appointmentType: appt?.appointment_type ?? null,
    location: appt?.location || null,
    providerId: b?.partner_id ?? null,
    facilityId: appt?.facility_id != null ? Number(appt.facility_id) : null,
    hospitalPartnerId: b?.branch_id && b.branch_id !== b.partner_id ? String(b.branch_id) : null,
    // appointment.patient_name is the real flat column the backend actually returns; patient_details
    // is a nested snapshot object used elsewhere (e.g. booking creation payloads) that this endpoint's
    // response doesn't carry — kept as a fallback in case a future response shape does nest it.
    patientName: appt?.patient_name || details?.name || null,
    totalAmount: b?.total_amount != null ? Number(b.total_amount) : null,
    paymentStatus: b?.payment_status ?? null,
    notes: b?.notes ?? null,
    createdAt: b?.created_at ?? null,
    doctorName: appt?.doctor_name ?? null,
    department: appt?.department ?? null,
    branchName: appt?.branch_name ?? null,
    visitType: appt?.visit_type ?? null,
    durationMinutes: appt?.duration_minutes != null ? Number(appt.duration_minutes) : null,
    patientMobile: appt?.patient_mobile ?? null,
    reasonForVisit: appt?.reason_for_visit ?? null,
    appointmentStatus: appt?.status ?? null,
    paymentMode: b?.payment_mode ?? null,
    source: b?.source ?? null,
    paymentReferenceId: b?.payment_reference_id ?? null,
    cancelledBy: appt?.cancelled_by ?? b?.cancelled_by ?? null,
    cancellationReason: appt?.cancellation_reason ?? b?.cancellation_reason ?? null,
    kind: b?.kind || (b?.booking_type === 'LAB' ? 'LAB_TEST' : appt?.appointment_type === 'HOME_VISIT' ? 'HOME_VISIT' : appt?.appointment_type === 'VIDEO_CALL' ? 'VIDEO_CONSULT' : 'DOCTOR_VISIT'),
    provider: b?.provider ?? null,
    business: b?.business || null,
    labOrder: b?.lab_order ? { ...b.lab_order, visit_date: String(b.lab_order.visit_date || '').slice(0, 10) } : null,
    homeCare: b?.home_care || null,
  };
}

// Authenticated patient dashboard. Identity resolved server-side from the JWT; no id sent from client.
// Throws on failure — callers must render an error state, never a mock fallback.
export const getDashboardApi = async (): Promise<DashboardData> => {
  const res = await apiClient.get(ENDPOINTS.PATIENTS.DASHBOARD);
  const d = res?.data?.data || {};
  const arr = (x: any): any[] => (Array.isArray(x) ? x : []);
  return {
    active: arr(d.active).map(mapBooking),
    upcoming: arr(d.upcoming).map(mapBooking),
    history: arr(d.history).map(mapBooking),
  };
};

export interface CancelResult {
  booking_number: string | null;
  status: 'CANCELLED';
  refund: { status: 'REFUNDED' | 'NOT_APPLICABLE' | 'NEEDS_SUPPORT'; amount: number };
}

// The signed-in patient cancels their own booking (booking service checks ownership by user id).
export const cancelBookingApi = async (bookingId: string, reason: string): Promise<CancelResult> => {
  try {
    return (await apiClient.post(`/bookings/patient/${bookingId}/cancel`, { reason })).data;
  } catch (e: any) {
    const m = e?.response?.data?.message;
    throw new Error(Array.isArray(m) ? m.join(' ') : m || 'Could not cancel this booking. Please try again.');
  }
};

export interface RescheduleResult { booking_number: string; appointment_date: string; time_slot: string; reschedules_left: number }

// Move the visit to another free slot of the same doctor at the same place (server enforces both).
export const rescheduleBookingApi = async (bookingId: string, timeSlotId: number | string): Promise<RescheduleResult> => {
  try {
    return (await apiClient.post(`/bookings/patient/${bookingId}/reschedule`, { time_slot_id: timeSlotId })).data;
  } catch (e: any) {
    const m = e?.response?.data?.message;
    throw new Error(Array.isArray(m) ? m.join(' ') : m || 'Could not reschedule this booking. Please try again.');
  }
};
