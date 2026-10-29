import type { BookingActions, NextCareVisit } from './bookingActions';
import apiClient from './index';

// Home care by agencies (nursing, physiotherapy, caregivers): catalogue, booking and my bookings.
export type HcCategory = 'NURSING' | 'PHYSIOTHERAPY' | 'CAREGIVER';
export interface HcService {
  team?: {available_genders: ('MALE'|'FEMALE')[]; languages:string[]; qualifications:string[]; police_verified:number};
  earliest_start?: {date:string;time:string}|null;
  id: string; category: HcCategory; category_label: string; kind: 'VISIT' | 'SHIFT'; name: string; description: string | null; includes: string | null;
  duration_minutes: number | null; shift_hours: number | null; price: number; required_role: string;
  agency: {
    id: string; name: string; registration_number: string | null; vizito_verified?: boolean; about: string | null; hours: string; day_open: string; day_close: string;
    rating: number | null; ratings: number;
    /** Present on the v2 catalogue response; null when the agency has no logo / office pin / launch date. */
    logo_url?: string | null; on_vizito_since?: string | null; distance_km?: number | null;
  };
  professionals: number; avg_experience: number | null;
}
export interface HcProfessional { id: string; name: string; role: string; role_label: string; qualification: string | null; experience_years: number | null; gender: string | null; registration: string | null; phone: string | null }
export interface HcVisit {
  id: string; seq: number; date: string; start_time: string; end_time: string; ends_next_day: boolean; status: string; assignment: string; visit_code?: string;
  professional: HcProfessional | null; on_the_way_at: string | null; arrived_at: string | null; started_at: string | null; completed_at: string | null;
  record: any; outcome_note: string | null; patient_rating: number | null; patient_feedback: string | null;
}
export interface HcPayment { amount: number; method: string | null; transaction_number: string | null; payment_reference: string | null; receipt_number: string | null; paid_at: string | null; status: 'PAID' | 'REFUNDED' }
export interface HcTimelineStep { code: 'REQUESTED' | 'CONFIRMED' | 'PROFESSIONAL_ASSIGNED' | 'VISITS_IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'; label: string; state: 'completed' | 'current' | 'pending'; occurred_at: string | null }
export interface HcOrder extends BookingActions {
  referral_document?: {id:string;file_name:string;mime_type:string;doc_type:string;doc_date:string|null}|null;
  agency_phone: string | null; payments: HcPayment[]; timeline: HcTimelineStep[];
  home_pin?: { lat: number; lng: number } | null;
  reschedule_visit_id?: string | null; next_visit?: NextCareVisit | null;
  id: string; order_number: string; agency_id: string; agency_name: string | null; service_name: string; category: HcCategory; category_label: string; kind: 'VISIT' | 'SHIFT';
  duration_minutes: number | null; shift_hours: number | null; unit_price: number; sessions: number; schedule_text: string | null;
  patient_name: string | null; patient_profile_id?: string; address: string; pincode: string; landmark: string | null; care_needs: string | null; preferred_gender: string | null;
  status: string; total_amount: number; payment_mode: string | null; payment_status: string | null; cancelled_by: string | null; cancellation_reason: string | null; created_at: string; visits: HcVisit[];
  referral?: { doctor_name: string; diagnosis: string; instructions: string; sessions: number; frequency: string | null; source?: 'DOCTOR' | 'DISCHARGE'; hospital_name?: string | null; discharge_date?: string | null; red_flags?: string | null } | null;
  care?: HcCareView; incidents?: HcIncidentView[];
  refund?: { status: 'REFUNDED' | 'NEEDS_SUPPORT'; amount: number; reference: string | null; at: string | null } | null;
  cancellation_fee?: number | null;
  late_cancel_fee?: number;
  pause?: { from: string; resume_on: string; reason: string; count: number; max: number } | null;
}
export const hcCatalogueApi = async (pincode: string, category?: HcCategory, lat?: number | null, lng?: number | null): Promise<{ pincode: string; services: HcService[] }> =>
  (await apiClient.get('/home-care/catalogue', { params: { pincode, category, lat: lat ?? undefined, lng: lng ?? undefined } })).data;
/** Where a LIVE agency works (pincodes) and which care types it offers; 404 for draft / not live. */
export interface HcCoverage { id: string; name: string; pincodes: string[]; categories: HcCategory[] }
export const hcCoverageApi = async (agencyId: string): Promise<HcCoverage> => (await apiClient.get(`/home-care/agencies/${encodeURIComponent(agencyId)}/coverage`)).data;
export const hcBookApi = async (body: any): Promise<HcOrder> => (await apiClient.post('/home-care/orders', body)).data;
export const hcMineApi = async (): Promise<HcOrder[]> => (await apiClient.get('/home-care/orders/mine')).data;
export const hcMinePageApi = async (params:{page:number;page_size:10|20;q?:string;status?:string;date_from?:string;date_to?:string}):Promise<{items:HcOrder[];page:number;page_size:10|20;total:number;total_pages:number}> => (await apiClient.get('/home-care/orders/mine',{params})).data;
export const hcOrderApi = async (id: string): Promise<HcOrder> => (await apiClient.get(`/home-care/orders/${encodeURIComponent(id)}`)).data;
export const hcCancelApi = async (id: string, reason: string): Promise<{ status: string; refund: { status: 'REFUNDED' | 'NEEDS_SUPPORT' | 'NOT_APPLICABLE'; amount: number }; cancellation_fee?: number }> =>
  (await apiClient.post(`/home-care/orders/${encodeURIComponent(id)}/cancel`, { reason })).data;
export const hcPauseOrderApi = async (orderId: string, body: { from: string; resume_on: string; reason: string }): Promise<HcOrder> =>
  (await apiClient.post(`/home-care/orders/${encodeURIComponent(orderId)}/pause`, body)).data;
export const hcRescheduleApi = async (visitId: string, date: string, time: string): Promise<HcOrder> => (await apiClient.post(`/home-care/visits/${encodeURIComponent(visitId)}/reschedule`, { date, time })).data;
export const hcNoShowReportApi = async (visitId: string, notes: string) => (await apiClient.post(`/home-care/visits/${encodeURIComponent(visitId)}/no-show-report`, { notes })).data;
export const hcRateApi = async (visitId: string, rating: number, feedback: string, tags?: string[]): Promise<HcOrder> => (await apiClient.post(`/home-care/visits/${encodeURIComponent(visitId)}/rate`, { rating, feedback, tags })).data;
export const hcSendMedicineRequestApi = async (orderId: string, requestId: string, pharmacyRequestId: string): Promise<HcMedicineRequest[]> =>
  (await apiClient.post(`/home-care/orders/${encodeURIComponent(orderId)}/medicine-requests/${encodeURIComponent(requestId)}/sent`, { pharmacy_request_id: pharmacyRequestId })).data;

export const HC_STATUS: Record<string, { label: string; cls: string }> = {
  REQUESTED: { label: 'Finding a professional', cls: 'bg-amber-50 text-amber-900 border-amber-200' },
  CONFIRMED: { label: 'Confirmed', cls: 'bg-sky-50 text-sky-800 border-sky-200' },
  IN_PROGRESS: { label: 'Ongoing', cls: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  COMPLETED: { label: 'Completed', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
};
export const VISIT_STATUS: Record<string, string> = { SCHEDULED: 'Scheduled', ON_THE_WAY: 'On the way', ARRIVED: 'Arrived', IN_PROGRESS: 'In progress', COMPLETED: 'Done', NO_SHOW: 'Missed (not available)', DISPUTED: 'Under review — you reported a missed visit', PROVIDER_MISSED: 'Missed by the professional', FAILED: 'Couldn’t be done', CANCELLED: 'Cancelled' };

// ── Doctor referrals, care plan & progress, problems during care (H4/H6) ──
export interface HcReferral {
  id: string; doctor_name: string; patient_name: string | null; category: HcCategory; category_label: string; diagnosis: string; instructions: string; sessions: number; frequency: string | null;
  start_by: string | null; status: 'OPEN' | 'BOOKED' | 'DISMISSED'; created_at: string;
  source?: 'DOCTOR' | 'DISCHARGE'; hospital_name?: string | null; discharge_date?: string | null; discharge_summary?: string | null; medications?: string | null; red_flags?: string | null;
  order: { id: string; order_number: string; agency_name: string; status: string; visits_done: number } | null;
}
export interface HcCareView {
  plan: { diagnosis: string | null; goals: { goal: string; target: string }[]; frequency: string | null; precautions: string | null; review_every: number; written_by: string; written_role: string | null; version: number; updated_at: string } | null;
  reviews: { id: string; after_visit: number; progress: 'IMPROVING' | 'STABLE' | 'WORSE'; goal_status: { goal: string; target: string; status: 'MET' | 'PARTLY' | 'NOT_YET'; note: string | null }[]; summary: string; next_step_label: string; reviewed_by: string; at: string }[];
  visits_done: number; review_due: boolean; next_review_after: number | null; progress: { kind: 'PAIN' | 'VITALS' | 'NONE'; points: any[] };
  lab_requests?: HcLabRequest[];
  medicine_requests?: HcMedicineRequest[];
}
export interface HcMedicineRequest {
  id: string;
  items: string;
  reason: string;
  requested_by: string;
  status: 'OPEN' | 'SENT' | 'CANCELLED';
  created_at: string;
  pharmacy: { name: string | null; stage: { code: string; label: string } } | null;
}
// H6: lab tests the care team asked for; booked as a home collection with a lab.
export interface HcLabRequest { id: string; tests: { code: string; name: string }[]; reason: string; requested_by: string; status: 'OPEN' | 'BOOKED' | 'CANCELLED'; created_at: string; lab: { order_number: string; lab_name: string | null; date: string | null; time: string | null; status: string | null; report_ready: boolean } | null }
export interface HcIncidentView { id: string; incident_number: string; type_label: string; severity: string; description: string; reported_by: string; reporter_kind: string; status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED'; escalated: boolean; resolution: string | null; created_at: string; resolved_at: string | null }
export const hcReferralsApi = async (): Promise<HcReferral[]> => (await apiClient.get('/home-care/referrals/mine')).data;
export const hcDismissReferralApi = async (id: string): Promise<HcReferral[]> => (await apiClient.post(`/home-care/referrals/${encodeURIComponent(id)}/dismiss`)).data;
export const hcCareOptionsApi = async (): Promise<{ incident_types: Record<string, string>; severity: Record<string, string> }> => (await apiClient.get('/home-care/care-options')).data;
export const hcReportProblemApi = async (orderId: string, body: any): Promise<HcIncidentView & { escalated: boolean }> => (await apiClient.post(`/home-care/orders/${encodeURIComponent(orderId)}/incident`, body)).data;
export const TAB_OF: Record<HcCategory, string> = { NURSING: 'nursing', PHYSIOTHERAPY: 'physio', CAREGIVER: 'caregiver' };

// ── R1 Long-Term Care (12 h / 24 h) & Shift Care Types and APIs ──
export interface HcQuote {
  id: string; quote_number: string; version: number; status: string;
  service: { id: string; name: string; shift_hours: number };
  start_date: string | null; start_time: string;
  shifts_per_cycle: number; cycle_days: number; rate_per_shift: number;
  tax: { sac: string; rate: number; reason: string; cgst: number; sgst: number };
  subtotal: number; gst_amount: number; total: number; advance: number;
  includes: string | null; notes: string | null; valid_until: string;
  decline_reason?: string | null; order_id?: string | null; created_by?: string; created_at: string;
}

export interface HcEnquiry {
  id: string; enquiry_number: string; status: string; status_label?: string;
  agency?: { id: string; name: string };
  patient?: { name: string; phone: string; gender: string; dob: string | null };
  patient_name?: string;
  service?: { name: string };
  duration_preference?: string;
  care_type?: string; care_type_label?: string; shift_pattern?: string; shift_label?: string;
  start_date?: string; duration_days?: number; mobility?: string; mobility_label?: string;
  conditions?: string | null; needs?: string; language?: string | null; preferred_gender?: string;
  address?: string; pincode?: string; landmark?: string | null;
  callback_due_at?: string; callback_scheduled_at?: string; callback_overdue?: boolean; is_callback_overdue?: boolean; called_at?: string | null; call_note?: string;
  assessment_at?: string | null; assessed_at?: string | null; assessed_by?: string | null; assessment_note?: string | null;
  risk?: {
    braden: { score: number; band: string; alert: boolean } | null;
    morse: { score: number; band: string; alert: boolean } | null;
  };
  closed_reason?: string | null; created_at?: string;
  quotes?: HcQuote[];
  quote?: any;
}

export interface HcStaffCard {
  id: string; full_name: string; role: string; role_label: string; qualification: string | null;
  experience_years: number | null; gender: string | null; languages: string[];
  badges: string[];
  trust_badges: {
    police_verified: { verified: boolean; date: string; certificate_no: string } | null;
    id_verified: { verified: boolean; aadhaar_last4: string } | null;
    training_certificate: { verified: boolean; certificate: string } | null;
    health_checked: { verified: boolean; date: string } | null;
  };
}

export interface HcDailyLog {
  id: string; visit_id?: string; order_id?: string; date: string; seq?: number;
  start_time?: string; end_time?: string; staff_name?: string;
  vitals?: { bp_sys?: number; bp_dia?: number; pulse?: number; temp_f?: number; spo2?: number; sugar?: number } | null;
  vitals_flags?: string[]; has_alert?: boolean;
  food_fluids?: any; urine_stool?: any; sleep?: string | null; mood?: string | null;
  activities?: string[]; notes?: string; created_at?: string;
}

export interface HcMarSheet {
  order_id: string; date: string;
  schedules: {
    id: string; medicine_name: string; dose: string; route: string;
    times: string[]; instructions: string | null; status: string;
    entries: {
      id: string; status: 'GIVEN' | 'HELD' | 'REFUSED'; scheduled_time: string;
      administered_at: string; administered_by_name: string; reason: string | null;
      is_correction: boolean; correction_of_id: string | null; correction_reason: string | null;
    }[];
  }[];
}

export interface HcInvoice {
  invoice_number: string; date?: string; issued_at?: string; booking_number?: string; order_number?: string;
  agency?: { name: string; address?: string; gstin?: string | null; phone?: string };
  supplier?: { name: string; gstin: string | null; clinical_establishment_reg: string | null };
  patient?: { name: string; address?: string; phone?: string };
  billed_to?: { name: string; address: string; pincode: string };
  items?: { description: string; sac?: string; quantity: number; rate: number; amount?: number }[];
  lines?: { description: string; sac: string; quantity: number; rate: number; taxable_value: number }[];
  gst?: { rate: number; cgst: number; sgst: number; total: number; note: string };
  subtotal?: number;
  tax?: { rate?: number; amount?: number; label?: string; note?: string } | any;
  advance_paid?: number;
  balance_due?: number;
  total: number; payment?: { mode: string; status: string };
  refund?: { status: string; amount: number } | null;
  shifts_given?: number; shifts_billed?: number;
}

export interface HcReplacement {
  id: string; status: string; reason_code: string; reason_label: string; reason_text: string; transition: string;
  caregiver: string | null; new_caregiver: string | null; due_at: string; overdue: boolean;
  resolved_at: string | null; created_at: string;
}

export interface HcSosResponse {
  incident_number: string | null;
  call_first: { label: string; number: string }[];
  agency: { name: string; phone: string | null };
  message: string;
}

export const hcLtOptionsApi = async (): Promise<{ care_types: Record<string, string>; shift_patterns: Record<string, string> }> =>
  (await apiClient.get('/home-care/long-term/options')).data;

export const hcEnquireApi = async (body: any): Promise<HcEnquiry> =>
  (await apiClient.post('/home-care/enquiries', body)).data;

export const hcEnquiriesMineApi = async (): Promise<HcEnquiry[]> =>
  (await apiClient.get('/home-care/enquiries/mine')).data;

export const hcEnquiryViewApi = async (id: string): Promise<HcEnquiry> =>
  (await apiClient.get(`/home-care/enquiries/${encodeURIComponent(id)}`)).data;

export const hcQuoteAcceptApi = async (quoteId: string, body: any): Promise<HcOrder> =>
  (await apiClient.post(`/home-care/quotes/${encodeURIComponent(quoteId)}/accept`, body)).data;

export const hcQuoteDeclineApi = async (quoteId: string, reason: string): Promise<HcEnquiry> =>
  (await apiClient.post(`/home-care/quotes/${encodeURIComponent(quoteId)}/decline`, { reason })).data;

export const hcRequestReplacementApi = async (orderId: string, body: any): Promise<any> =>
  (await apiClient.post(`/home-care/orders/${encodeURIComponent(orderId)}/replacement`, body)).data;

export const hcOrderSosApi = async (orderId: string, body?: { note?: string }): Promise<HcSosResponse> =>
  (await apiClient.post(`/home-care/orders/${encodeURIComponent(orderId)}/sos`, body || {})).data;
export const hcTriggerSosApi = hcOrderSosApi;

export const hcInvoiceApi = async (orderId: string): Promise<HcInvoice> =>
  (await apiClient.get(`/home-care/orders/${encodeURIComponent(orderId)}/invoice`)).data;

export const hcStaffCardApi = async (staffId: string): Promise<HcStaffCard> =>
  (await apiClient.get(`/home-care/staff/${encodeURIComponent(staffId)}/card`)).data;

export const hcDailyLogsForOrderApi = async (orderId: string, date?: string): Promise<HcDailyLog[]> =>
  (await apiClient.get(`/home-care/orders/${encodeURIComponent(orderId)}/daily-logs`, { params: { date } })).data;

export const hcMarSheetApi = async (orderId: string, date?: string): Promise<HcMarSheet> =>
  (await apiClient.get(`/home-care/orders/${encodeURIComponent(orderId)}/mar-sheet`, { params: { date } })).data;

export const hcVitalLimitsApi = async (orderId: string): Promise<any> =>
  (await apiClient.get(`/home-care/orders/${encodeURIComponent(orderId)}/vital-limits`)).data;

export interface HcShift {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  staff_name?: string;
  patient_name?: string;
  agency_name?: string;
}

export const hcRescheduleShiftApi = async (
  shiftIdOrOrderId: string,
  dateOrShiftId: string,
  timeOrPayload?: string | { new_date: string; new_slot?: string; reason?: string },
  _reason?: string
): Promise<any> => {
  if (typeof timeOrPayload === 'object' && timeOrPayload !== null) {
    const shiftId = dateOrShiftId;
    return hcRescheduleApi(shiftId, timeOrPayload.new_date, timeOrPayload.new_slot || '09:00');
  }
  return hcRescheduleApi(shiftIdOrOrderId, dateOrShiftId, (timeOrPayload as string) || '09:00');
};

