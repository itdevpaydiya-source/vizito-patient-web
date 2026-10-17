import apiClient from './index';

// Find blood (patient side): verified blood banks with AVAILABLE / NOT_AVAILABLE per component.
// Exact unit counts are never sent to patients.
export type Band = 'AVAILABLE' | 'NOT_AVAILABLE';
export interface BloodReference { components: { code: string; name: string }[]; groups: { code: string; label: string }[] }
export interface BloodCentre {
  partner_id: string; name: string; phone: string | null; address: string | null; pincode: string | null;
  distance_km: number | null; bands: Record<string, Band>; any_available: boolean;
}
export interface AvailabilityResult { group: string; components: string[]; centres: BloodCentre[] }

export const bloodReferenceApi = async (): Promise<BloodReference> => (await apiClient.get('/bloodbank/reference')).data;
export const bloodAvailabilityApi = async (p: { group: string; component?: string; lat?: number; lng?: number }): Promise<AvailabilityResult> =>
  (await apiClient.get('/bloodbank/availability', { params: { group: p.group, component: p.component || undefined, lat: p.lat, lng: p.lng } })).data;

export const bloodError = (e: any, fallback: string) => {
  const m = e?.response?.data?.message;
  return Array.isArray(m) ? m.join(' ') : m || fallback;
};

// ── Requests (D2) ──
export interface Requisition { id: string; source: 'DOCTOR' | 'UPLOAD'; routed_bloodbank?: { partner_id: string; name: string | null } | null; doctor_name: string | null; component_code: string | null; requested_group: string | null; quantity: number | null; urgency: string | null; indication: string | null; file_name: string | null; created_at: string }
export interface MyBloodRequest {
  id: string; request_number: string; bloodbank_partner_id: string; bloodbank_name: string | null; patient_name: string | null;
  component_code: string; requested_group: string; quantity: number; urgency: string; status: string; status_label: string; status_reason: string | null;
  processing_charge: { per_unit: number; total: number } | null; payment_status: string; can_pay: boolean; can_cancel: boolean; created_at: string; issued_at: string | null;
}
const key = () => (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9_-]/g, '');
export const myRequisitionsApi = async (familyMemberId?: string): Promise<Requisition[]> =>
  (await apiClient.get('/bloodbank/requisitions/mine', { params: { family_member_id: familyMemberId || undefined } })).data;
export const uploadRequisitionApi = async (file: File, familyMemberId?: string): Promise<Requisition> => {
  const form = new FormData();
  form.append('file', file);
  return (await apiClient.post('/bloodbank/requisitions/upload', form, { params: { family_member_id: familyMemberId || undefined }, headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 })).data;
};
/** One idempotency key per submit attempt: a retried click returns the same request. */
export const createBloodRequestApi = async (body: Record<string, unknown>, idempotencyKey = key()): Promise<MyBloodRequest> =>
  (await apiClient.post('/bloodbank/requests', body, { headers: { 'Idempotency-Key': idempotencyKey } })).data;
export const myBloodRequestsApi = async (): Promise<MyBloodRequest[]> => (await apiClient.get('/bloodbank/requests/mine')).data;
export const cancelBloodRequestApi = async (id: string, reason: string): Promise<MyBloodRequest> => (await apiClient.post(`/bloodbank/requests/mine/${encodeURIComponent(id)}/cancel`, { reason })).data;
export const payBloodRequestApi = async (id: string, payment: Record<string, unknown>, idempotencyKey = key()): Promise<MyBloodRequest> =>
  (await apiClient.post(`/bloodbank/requests/mine/${encodeURIComponent(id)}/pay`, { payment }, { headers: { 'Idempotency-Key': idempotencyKey } })).data;
export const newIdempotencyKey = key;

// ── Donors (D3) ──
export interface DonorSessionRow { id: string; kind: 'CENTRE' | 'CAMP'; title: string; venue: string | null; organizer: string | null; starts_at: string; ends_at: string; places_left: number; centre: { partner_id: string; name?: string; phone: string | null } }
export interface DonorMe {
  registered: boolean; donor?: { donor_code: string; full_name: string | null; declared_group: string | null };
  appointments?: { id: string; status: string; status_label: string; centre?: string; session: { title: string; kind: string; venue: string | null; starts_at: string; ends_at: string } | null; deferred_until: string | null; can_cancel: boolean }[];
  donations?: { id: string; collected_at: string; centre: string; session: string | null; kind: string | null }[];
}
export const donorMeApi = async (): Promise<DonorMe> => (await apiClient.get('/bloodbank/donor/me')).data;
export const donorRegisterApi = async (body: { declared_group?: string; consent: boolean }) => (await apiClient.post('/bloodbank/donor/register', body)).data;
export const donorSessionsApi = async (): Promise<DonorSessionRow[]> => (await apiClient.get('/bloodbank/donor/sessions')).data;
export const donorBookApi = async (body: { session_id: string; replacement_request_number?: string }) => (await apiClient.post('/bloodbank/donor/appointments', body)).data;
export const donorCancelApi = async (id: string) => (await apiClient.post(`/bloodbank/donor/appointments/${encodeURIComponent(id)}/cancel`)).data;
export interface DonorCertificate { donor_name: string | null; donor_code: string; centre: string; donated_on: string; certificate_no: string }
export const donorCertificateApi = async (id: string): Promise<DonorCertificate> =>
  (await apiClient.get(`/bloodbank/donor/donations/${encodeURIComponent(id)}/certificate`)).data;
