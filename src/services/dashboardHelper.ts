import { ENDPOINTS } from "./endpoints";
import apiClient from "./index";

// Normalized booking for patient-facing lists. Maps ONLY real columns from the Booking entity
// (+ its Appointment relation) returned by GET /patients/dashboard. Fields the backend does not
// denormalize onto the booking (notably the provider/business NAME — the booking stores partner_id
// only) are left null and rendered honestly by the UI, never fabricated.
export interface DashboardBooking {
  id: string;
  bookingNumber: string | null;   // authoritative backend reference (Booking.booking_number)
  status: string;                 // booking_status, falling back to appointment.status
  bookingDate: string | null;
  appointmentDate: string | null;
  timeSlot: string | null;
  appointmentType: string | null; // VIDEO_CALL / IN_CLINIC / HOME_VISIT
  location: string | null;        // facility address captured at booking time
  providerId: string | null;      // partner_id (no name is stored on the booking)
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
  // NOT available from this endpoint: the backend only returns a payment gateway reference
  // (payment_reference_id) transiently in the booking-CREATION response, never persisted on the
  // Booking entity or joined back in from the Transaction table for GET /patients/dashboard. Wired
  // up defensively in case a future backend response includes it; renders only when present.
  paymentReferenceId: string | null;
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
    bookingNumber: b?.booking_number ?? null,
    // Prefer the appointment's lifecycle status (IN_PROGRESS/COMPLETED) so the badge matches the tab;
    // booking_status is a coarser fallback that can lag behind at 'Pending'.
    status: appt?.status || b?.booking_status || 'Pending',
    bookingDate: toStr(b?.booking_date),
    appointmentDate: toStr(appt?.appointment_date),
    timeSlot: appt?.time_slot ?? null,
    appointmentType: appt?.appointment_type ?? null,
    location: appt?.location || null,
    providerId: b?.partner_id ?? null,
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
