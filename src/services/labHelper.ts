import apiClient from './index';

// Lab tests (patient side): the test list, labs that offer the chosen tests, booking and my bookings.
export interface LabTestDef { id: number; code: string; name: string; short_name: string | null; department: string; specimen_type: string; container_type?: string; fasting_hours: number; patient_instructions: string | null; tat_hours: number; about?: string | null; why_done?: string | null }
export interface LabCentre { id: number; name: string; address: string; city: string | null; pincode: string | null; phone: string | null; total?: number; pin?: { lat: number; lng: number } | null }
export interface LabHours { open: string; close: string }
export interface LabSettings { centre_hours: Record<string, (LabHours | null)[]>; home: { enabled: boolean; fee: number; pincodes: string[]; open: string; close: string } }
export interface LabHit { id: string; name: string; locations: LabCentre[]; tests_offered: number; selected: { code: string; name: string; price: number; tat_hours?: number }[]; total: number; prices_vary?: boolean; settings?: LabSettings; registration_number?: string | null; report_hours?: number; hospital_lab?: boolean }
export interface RxTests { prescription_id: string; doctor_name: string; prescribed_on: string; tests: { name: string; code: string | null }[]; family_member_id: string | null; patient_name: string | null; hospital_lab?: { id: string; name: string } | null }
export const rxTestsApi = async (prescriptionId: string): Promise<RxTests> => (await apiClient.get(`/lab-orders/rx/${encodeURIComponent(prescriptionId)}`)).data;
export interface MyLabOrder {
  id: string; order_number: string; lab_name: string | null; location_name: string | null; location_address: string | null;
  visit_date: string; visit_time: string; fasting_hours: number; status: string; total_amount: number; payment_status: string | null;
  payment_mode?: string | null; patient_name?: string | null; created_at?: string; my_rating?: number | null; cancelled_by?: string | null; cancellation_reason?: string | null;
  recollection_needed?: boolean;
  visit_type?: 'LAB_VISIT' | 'HOME'; home_address?: string | null; home_fee?: number; home_status?: string | null; home_visit_code?: string | null;
  collector_name?: string | null; collector_phone?: string | null; home_note?: string | null; due_at?: string | null; ordering_doctor_name?: string | null;
  items: { test_code: string; test_name: string; price: number; package_name?: string | null; list_price?: number; is_addon?: number; addon_requested_by?: string | null; addon_payment?: string | null; added_at?: string | null; status?: string }[];
  report_status?: 'RELEASED' | 'PARTIAL' | null;
}
export interface MyLabSample { id: string; specimen_type: string; container_type: string; test_codes: string; status: 'EXPECTED' | 'COLLECTED' | 'RECEIVED' | 'REJECTED'; rejection_reason: string | null; recollection_of: string | null; collected_at: string | null }
export interface MyLabOrderDetail extends MyLabOrder { specimens: MyLabSample[] }

export const fetchLabTestsApi = async (): Promise<LabTestDef[]> => (await apiClient.get('/lab-tests')).data;
export const findLabsApi = async (codes: string[], city?: string): Promise<LabHit[]> =>
  (await apiClient.get('/lab-tests/labs', { params: { tests: codes.join(','), city: city || undefined } })).data;
export const bookLabTestsApi = async (input: {
  lab_partner_id: string; location_id: number; test_codes: string[]; visit_date: string; visit_time: string;
  payment_mode: 'UPI' | 'CASH'; payment?: { payment_method: 'UPI'; upi_id: string };
  visit_type?: 'LAB_VISIT' | 'HOME'; home_address?: { line: string; area?: string; landmark?: string; city: string; pincode: string; pin?: { lat: number; lng: number } }; prescription_id?: string; family_member_id?: string;
  package_codes?: string[];
  hc_lab_request_id?: string;
}): Promise<MyLabOrder> => (await apiClient.post('/lab-orders', input)).data;
export const myLabOrdersApi = async (): Promise<MyLabOrder[]> => (await apiClient.get('/lab-orders/mine')).data;
export const myLabOrderApi = async (id: string): Promise<MyLabOrderDetail> => (await apiClient.get(`/lab-orders/${encodeURIComponent(id)}`)).data;
export const rateMyLabOrderApi = async (id: string, rating: number, review: string, tags?: string[]): Promise<void> => { await apiClient.post(`/lab-orders/${encodeURIComponent(id)}/rate`, { rating, review, tags }); };
export const cancelMyLabOrderApi = async (id: string, reason?: string): Promise<{ status: string; refund: { status: 'REFUNDED' | 'NEEDS_SUPPORT' | 'NOT_APPLICABLE'; amount: number } }> =>
  (await apiClient.post(`/lab-orders/${encodeURIComponent(id)}/cancel`, { reason })).data;

export const labError = (e: any, fallback: string) => {
  const m = e?.response?.data?.message;
  return Array.isArray(m) ? m.join(' ') : m || fallback;
};
export const rupees = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

// ── Released lab report (L3) ──
export interface MyLabReport {
  released: boolean; report_number?: string; version?: number; released_at?: string; partial?: boolean;
  snapshot?: {
    partial?: boolean; continues_partial?: boolean; pending?: { name: string; status: string }[]; expected_by?: string | null;
    lab?: { name: string; registration?: string | null };
    amended: boolean; amendment_reason: string | null; previous_version: number | null; released_at: string;
    pathologist: { name: string; qualification: string; registration_number: string; council: string };
    tests: { code: string; name: string; specimen_type: string | null; collected_at: string | null; department?: string | null; note?: string | null; results: { name: string; value: string; unit: string | null; flag: string | null; reference: string; method: string | null }[] }[];
  };
  versions?: { version: number; status: 'CURRENT' | 'REPLACED'; released_at: string; amendment_reason: string | null; partial?: boolean }[];
}
export const myLabReportApi = async (id: string): Promise<MyLabReport> => (await apiClient.get(`/lab-orders/${encodeURIComponent(id)}/report`)).data;
export const openMyLabReportPdf = async (id: string, version?: number) => {
  const r = await apiClient.get(`/lab-orders/${encodeURIComponent(id)}/report/pdf`, { params: version ? { version } : {}, responseType: 'blob' });
  window.open(URL.createObjectURL(r.data as Blob), '_blank', 'noopener');
};
export interface ReportCheck { valid: boolean; status: 'CURRENT' | 'REPLACED'; report_number: string; version: number; current_version: number | null; laboratory: string | null; issued_at: string | null }
export const verifyLabReportApi = async (token: string): Promise<ReportCheck> => (await apiClient.get(`/lab-orders/verify/${encodeURIComponent(token)}`)).data;

// ── Home Care H1: doctor home visits ──
export interface HomeVisitDoctor { doctor_partner_id: string; name: string; qualification: string | null; specialization: string | null; experience: number | null; fee: number; visit_minutes: number; pincodes: string[]; slots?: string[] }
export interface MyHomeVisit {
  id: string; booking_id: string; booking_number: string | null; doctor_partner_id: string; visit_date: string; visit_time: string; visit_minutes: number;
  address: string; pincode: string; reason: string | null; fee: number; payment_status: string | null; status: string; field_status: string;
  failed_reason: string | null; visit_code: string | null; cancellation_reason: string | null; cancelled_by: string | null;
}
export const homeVisitDoctorsApi = async (pincode: string): Promise<HomeVisitDoctor[]> => (await apiClient.get('/home-visits/doctors', { params: { pincode } })).data;
export const homeVisitOfferApi = async (doctorId: string, date: string): Promise<HomeVisitDoctor> => (await apiClient.get(`/home-visits/doctors/${encodeURIComponent(doctorId)}`, { params: { date } })).data;
export const bookHomeVisitApi = async (body: {
  doctor_partner_id: string; visit_date: string; visit_time: string; reason: string;
  address: { line: string; area?: string; landmark?: string; city: string; pincode: string; pin?: { lat: number; lng: number } };
  payment_mode: 'UPI' | 'CASH'; payment?: { payment_method: 'UPI'; upi_id: string };
}) => (await apiClient.post('/home-visits', body)).data as { home_visit_id: string; booking_id: string; doctor_name: string; visit_date: string; visit_time: string; address: string; fee: number; payment_status: string; visit_code: string };
export const myHomeVisitsApi = async (): Promise<MyHomeVisit[]> => (await apiClient.get('/home-visits/mine')).data;
export const cancelHomeVisitApi = async (bookingId: string, reason: string) => (await apiClient.post(`/bookings/patient/${encodeURIComponent(bookingId)}/cancel`, { reason })).data;

// ── Labs L5b: trends and sharing ──
export interface TrendPoint { date: string; value: number; flag: string | null; low: number | null; high: number | null; lab: string; order_id: string; order_number: string }
export interface TrendParam { patient_profile_id: string; patient_name: string; test_code: string; test_name: string; code: string; name: string; unit: string | null; points: TrendPoint[] }
export const labTrendsApi = async (patient?: string): Promise<{ people: { id: string; name: string }[]; parameters: TrendParam[] }> =>
  (await apiClient.get('/lab-orders/trends', { params: patient ? { patient } : {} })).data;
export interface ShareOptions { doctors: { doctor_partner_id: string; name: string; last_visit: string }[]; shared: { doctor_partner_id: string; doctor_name: string | null; created_at: string }[]; ordering_doctor: string | null }
export const shareOptionsApi = async (orderId: string): Promise<ShareOptions> => (await apiClient.get(`/lab-orders/${encodeURIComponent(orderId)}/share`)).data;
export const shareReportApi = async (orderId: string, doctorId: string): Promise<ShareOptions> => (await apiClient.post(`/lab-orders/${encodeURIComponent(orderId)}/share`, { doctor_partner_id: doctorId })).data;
export const unshareReportApi = async (orderId: string, doctorId: string): Promise<ShareOptions> => (await apiClient.post(`/lab-orders/${encodeURIComponent(orderId)}/share/${encodeURIComponent(doctorId)}/revoke`)).data;

// ── L5c: health packages and the lab's public page ──
export interface PublicPackage {
  id: number; code: string; name: string; description: string | null; audience: string | null; price: number; separate_price: number; saving: number; saving_pct: number;
  tests: { code: string; name: string; department: string; specimen_type: string; parameters: number; about: string | null }[];
  test_count: number; parameters: number; fasting_hours: number; tat_hours: number; samples: string[];
  lab: { id: string; name: string; registration_number: string | null; centres: number; home_collection: boolean };
}
export const healthPackagesApi = async (city?: string): Promise<PublicPackage[]> => (await apiClient.get('/lab-tests/packages', { params: { city: city || undefined } })).data;
export interface LabPublicTest { id: number; code: string; name: string; department: string | null; fasting_hours: number; tat_hours: number; price: number; home_collection_allowed: boolean; parameters: number }
export interface LabPublic { id: string; name: string; registration_number: string | null; locations: LabCentre[]; settings: LabSettings; packages: PublicPackage[]; tests?: LabPublicTest[] }
export const labPublicApi = async (labId: string): Promise<LabPublic> => (await apiClient.get(`/lab-tests/labs/${encodeURIComponent(labId)}`)).data;
