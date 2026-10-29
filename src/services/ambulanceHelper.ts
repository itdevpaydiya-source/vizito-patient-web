import apiClient from './index';
import { getProvidersApi } from './patientHelper';

// Scheduled ambulance trips (patient side). Emergencies go to 108; this is booked transport only.
export interface FeeTerms { dispatch_cancel_fee: number | null; no_show_fee: number | null; no_show_wait_minutes: number | null }
export interface OperatorType { vehicle_type: string; vehicle_type_label: string; base_fare: number; included_km: number; per_km: number; waiting_per_15_min: number; equipment: string[]; cancellation_terms?: FeeTerms | null }
/** Plain-language cancellation terms shown before booking. */
export const termsText = (t?: FeeTerms | null) => !t || (!t.dispatch_cancel_fee && !t.no_show_fee)
  ? 'Free to cancel until the ambulance sets off. No cancellation or no-show fee applies.'
  : ['Free to cancel until the ambulance sets off.', t.dispatch_cancel_fee ? `Cancelling after it has set off may cost ${rupees(t.dispatch_cancel_fee)}.` : '',
    t.no_show_fee ? `If the crew waits ${t.no_show_wait_minutes} minutes at the pickup and cannot reach you, a no-show fee of ${rupees(t.no_show_fee)} may apply.` : '',
    'Vizito reviews every fee before it is charged and can waive it. No fee if the operator cancels.'].filter(Boolean).join(' ');
export interface AmbulanceOperator { partner_id: string; name: string; phone: string | null; vehicle_types: OperatorType[] }
export interface MyTrip {
  my_rating?: number | null; can_rate?: boolean;
  created_at?: string; transfer_type?: string | null; transfer_type_label?: string | null; patient_conditions?: {code:string;label:string}[];
  cancel_unavailable_reason?: string | null;
  crew?: {name:string;role:string;qualification:string|null}[];
  vehicle_model?: string|null;
  equipment?: string[];
  fare_breakdown?: {kind:'FINAL'|'ESTIMATE';base:number;included_km:number;distance_km:number;extra_km:number;per_km:number;distance_charge:number;waiting_minutes:number;waiting_charge:number;night_charge:number;total:number|null;note:string|null}|null;
  fare_cap?: { base_fare: number; included_km: number; per_km: number; waiting_per_15_min: number } | null;
  id: string; trip_number: string; status: string; status_label: string; status_reason: string | null; operator: { partner_id: string; name: string | null; phone: string | null; address?:string|null;latitude?:number|null;longitude?:number|null;image_url?:string|null;rating?:number|null;review_count?:number };
  patient_name: string | null; vehicle_type: string; vehicle_type_label: string; scheduled_at: string; pickup_address: string; drop_address: string;
  mobility: string; mobility_label: string; attendants: number; fare: { base_fare: number; included_km: number; per_km: number; waiting_per_15_min: number };
  estimated_fare: number | null; estimated_km: number | null; vehicle_registration: string | null; driver_name: string | null;
  is_urgent?: boolean; destination_hospital_name?: string | null;
  actual_km: number | null; waiting_minutes: number | null; final_fare: number | null; payment_status: string; can_cancel: boolean; has_receipt: boolean;
  estimated_minutes?: number | null; payment_path?: string | null; can_pay_online?: boolean;
  cancellation_terms?: { summary: string }; charge_kind?: string; fee_status?: string | null; fee_amount?: number | null; fee_review_note?: string | null;
  timeline?: { status: string | null; label: string; at: string }[];
}
export interface TripReceipt {
  trip_number: string; operator: string | null; operator_phone?: string | null; patient_name?: string | null;
  vehicle_type: string; vehicle_registration: string | null; scheduled_at: string; completed_at?: string | null;
  pickup_address: string; drop_address: string; lines: { label: string; amount: number }[]; total: number;
  payment: string; paid_at: string; actual_km?: number | null; refunded?: boolean;
}
export const MOBILITY: { code: string; label: string }[] = [
  { code: 'WALKING', label: 'Can walk' }, { code: 'WHEELCHAIR', label: 'Needs a wheelchair' }, { code: 'STRETCHER', label: 'Needs a stretcher' }, { code: 'OXYGEN', label: 'On oxygen' },
];
export const newIdempotencyKey = () => (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9_-]/g, '');
export const ambulanceOperatorsApi = async (vehicleType?: string): Promise<AmbulanceOperator[]> => (await apiClient.get('/ambulance/operators', { params: { vehicle_type: vehicleType || undefined } })).data;
export const bookAmbulanceApi = async (body: Record<string, unknown>, key: string): Promise<MyTrip> => (await apiClient.post('/ambulance/trips', body, { headers: { 'Idempotency-Key': key } })).data;
export const rateTripApi = async (id: string, rating: number, review: string, tags?: string[]): Promise<void> => { await apiClient.post(`/ambulance/trips/mine/${encodeURIComponent(id)}/rate`, { rating, review, tags }); };
export const myTripsApi = async (): Promise<MyTrip[]> => (await apiClient.get('/ambulance/trips/mine')).data;
export const myTripsPageApi = async (params:{page:number;page_size:10|20;q?:string;status?:string;date_from?:string;date_to?:string}):Promise<{items:MyTrip[];page:number;page_size:10|20;total:number;total_pages:number}> => (await apiClient.get('/ambulance/trips/mine',{params})).data;
export const myTripApi = async (id: string): Promise<MyTrip> => (await apiClient.get(`/ambulance/trips/mine/${encodeURIComponent(id)}`)).data;
export const cancelTripApi = async (id: string, reason: string): Promise<MyTrip> => (await apiClient.post(`/ambulance/trips/mine/${encodeURIComponent(id)}/cancel`, { reason })).data;
export const tripReceiptApi = async (id: string): Promise<TripReceipt> => (await apiClient.get(`/ambulance/trips/mine/${encodeURIComponent(id)}/receipt`)).data;
export const payTripApi = async (id: string, payment: { payment_method: string; upi_id?: string; razorpay_order_id?: string; razorpay_payment_id?: string; razorpay_signature?: string }, key: string): Promise<MyTrip> =>
  (await apiClient.post(`/ambulance/trips/mine/${encodeURIComponent(id)}/pay`, { payment }, { headers: { 'Idempotency-Key': key } })).data;
/** Road route + driving time between two pins; { available: false, reason } when routing is unavailable. */
export interface RouteEstimate {
  available: boolean; reason?: string; km?: number; minutes?: number; estimated_fare?: number | null;
  /** Polyline of [lat, lng] points, when the router returns one. */
  route?: [number, number][] | null; source?: string;
}
export interface RouteQuery { pickup_lat: number; pickup_lng: number; drop_lat: number; drop_lng: number; operator_partner_id?: string; vehicle_type?: string }
export const routeEstimateApi = async (q: RouteQuery): Promise<RouteEstimate> =>
  (await apiClient.get('/ambulance/route-estimate', { params: q })).data;
export const ambulanceError = (e: any, fallback: string) => { const m = e?.response?.data?.message; return Array.isArray(m) ? m.join(' ') : m || fallback; };
export const rupees = (n: number | null | undefined) => (n === null || n === undefined ? '—' : `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);
/** Same formula as the server: base covers the included km; whole km beyond; waiting per started 15 min. */
export const estimate = (t: { base_fare: number; included_km: number; per_km: number; waiting_per_15_min: number }, km: number, waitMin = 0) =>
  Math.round((t.base_fare + Math.max(0, Math.ceil(km) - t.included_km) * t.per_km + Math.ceil(waitMin / 15) * t.waiting_per_15_min) * 100) / 100;

// ── D3: urgent requests ──
export interface UrgentRequest {
  id: string; request_number: string; status: 'OPEN' | 'ACCEPTED' | 'CANCELLED' | 'UNANSWERED'; status_label: string; pickup_address: string; location_shared: boolean;
  operators_notified: number; dispatch_mode?: 'OPERATOR' | 'DRIVER'; expires_at: string; destination_hospital_name: string | null; trip_id: string | null; trip: MyTrip | null; can_cancel: boolean;
  /** What to show now, from the linked trip's current state (the stored status keeps the audit meaning). */
  outcome: 'SEARCHING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'UNANSWERED'; status_reason?: string | null;
}
export const urgentRequestApi = async (body: Record<string, unknown>, key: string): Promise<UrgentRequest> => (await apiClient.post('/ambulance/urgent', body, { headers: { 'Idempotency-Key': key } })).data;
export const myUrgentApi = async (id: string): Promise<UrgentRequest> => (await apiClient.get(`/ambulance/urgent/mine/${encodeURIComponent(id)}`)).data;
export const cancelUrgentApi = async (id: string): Promise<UrgentRequest> => (await apiClient.post(`/ambulance/urgent/mine/${encodeURIComponent(id)}/cancel`)).data;
/** Patient marketplace hospital results; IDs are real partner IDs and the pin is the branch the hospital confirmed. */
export const searchHospitalsApi = async (q: string): Promise<{ id: string; name: string; address?: string | null; logo?: string | null; lat?: number | null; lng?: number | null }[]> =>
  (await getProvidersApi('hospital', q)).map(p => {
    const pin = p.storePin || p.org?.locations?.find(location => location.pin)?.pin || null;
    return { id: p.id, name: p.name, address: p.address || null, logo: p.logo, lat: pin?.lat ?? null, lng: pin?.lng ?? null };
  }).slice(0, 8);

// ── Transfer note (AOD-11): the only way medical details reach the crew ──
export interface TransferNote { id: string; text: string | null; has_file: boolean; file_name: string | null; added_by: string; created_at: string }
export const myNoteApi = async (tripId: string): Promise<TransferNote | null> => (await apiClient.get(`/ambulance/trips/mine/${encodeURIComponent(tripId)}/note`)).data || null;
export const shareNoteApi = async (tripId: string, text: string, file: File | null): Promise<TransferNote> => {
  const form = new FormData();
  form.append('text', text); form.append('consent', 'true'); if (file) form.append('file', file);
  return (await apiClient.put(`/ambulance/trips/mine/${encodeURIComponent(tripId)}/note`, form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 })).data;
};
export const removeNoteApi = async (tripId: string) => (await apiClient.delete(`/ambulance/trips/mine/${encodeURIComponent(tripId)}/note`)).data;
export const openNoteFile = async (tripId: string) => {
  const r = await apiClient.get(`/ambulance/trips/mine/${encodeURIComponent(tripId)}/documents/note/file`, { responseType: 'blob' });
  const url = URL.createObjectURL(r.data); window.open(url, '_blank', 'noopener'); setTimeout(() => URL.revokeObjectURL(url), 60000);
};
export const urgentContactApi = async (familyMemberId?: string): Promise<{ phone: string | null; for_name: string | null; family: boolean }> => (await apiClient.get('/ambulance/urgent/contact', { params: { family_member_id: familyMemberId || undefined } })).data;
export const urgentAvailableApi = async (): Promise<{ enabled: boolean; driver_dispatch?: boolean }> => (await apiClient.get('/ambulance/urgent/available')).data;

// Scheduled booking through driver dispatch (no operator choice). The quote is maximum rates, not a fixed total.
export interface Rates { base_fare: number; included_km: number; per_km: number; waiting_per_15_min: number }
export interface ScheduledAvailability { enabled: boolean; search_lead_minutes: number; deadline_minutes: number; min_lead_minutes: number; terms: string[] }
export interface ScheduledQuote { vehicle_type: string; available: boolean; reason?: string; quote?: Rates; cancellation_terms?: FeeTerms | null; estimate?: { km: number; minutes: number } | null; terms?: string[] }
export interface ScheduledBooking {
  transfer_type?: string | null; transfer_type_label?: string | null; trip?: MyTrip | null;
  id: string; request_number: string; status: 'OPEN' | 'ACCEPTED' | 'CANCELLED' | 'UNANSWERED'; status_label: string; confirmed: boolean; searching: boolean;
  search_starts_at: string | null; search_deadline: string | null; scheduled_at: string; pickup_address: string; drop_address: string | null;
  vehicle_type_label: string | null; mobility_label: string; quote: Rates | null; quote_terms: string[]; cancellation_terms: FeeTerms;
  estimate: { km: number; minutes: number | null } | null; trip_id: string | null; can_cancel: boolean;
}
export const ratesText = (r: Rates) => `${rupees(r.base_fare)} for the first ${r.included_km} km, then ${rupees(r.per_km)}/km${r.waiting_per_15_min ? `; waiting ${rupees(r.waiting_per_15_min)} per 15 min` : ''}`;
export const scheduledAvailableApi = async (): Promise<ScheduledAvailability> => (await apiClient.get('/ambulance/scheduled/available')).data;
export const scheduledQuoteApi = async (q: { vehicle_type: string; pickup?: string; drop?: string }): Promise<ScheduledQuote> => (await apiClient.get('/ambulance/scheduled/quote', { params: q })).data;
export const bookScheduledApi = async (body: Record<string, unknown>, key: string): Promise<ScheduledBooking> => (await apiClient.post('/ambulance/scheduled', body, { headers: { 'Idempotency-Key': key } })).data;
export const myScheduledApi = async (): Promise<ScheduledBooking[]> => (await apiClient.get('/ambulance/scheduled/mine')).data;
export const myScheduledPageApi = async (params:{page:number;page_size:10|20;q?:string;status?:string;date_from?:string;date_to?:string}):Promise<{items:ScheduledBooking[];page:number;page_size:10|20;total:number;total_pages:number}> => (await apiClient.get('/ambulance/scheduled/mine',{params})).data;
export const cancelScheduledApi = async (id: string): Promise<ScheduledBooking> => (await apiClient.post(`/ambulance/scheduled/mine/${encodeURIComponent(id)}/cancel`)).data;

// Patient live tracking (only the patient's own trip). The server returns coordinates only when the position is fresh (LIVE).
export interface DriverLocation {
  route?: { available: boolean; reason?: string; target?: string; coordinates?: [number,number][]; distance_km?: number; eta_minutes?: number; estimated_at?: string; source?: string };
  available: boolean; state: 'LIVE' | 'STALE' | 'UNAVAILABLE' | 'SEARCHING' | 'ENDED' | 'NOT_TRACKED'; reason?: string; status: string; status_label?: string;
  poll_seconds: number | null; pickup: { latitude: number; longitude: number } | null;
  latitude?: number; longitude?: number; accuracy_m?: number | null; at?: string; age_seconds?: number; last_update?: string | null;
}
export const driverLocationApi = async (tripId: string): Promise<DriverLocation> => (await apiClient.get(`/ambulance/trips/mine/${encodeURIComponent(tripId)}/driver-location`, { timeout: 8000 })).data;

export const scheduledNoteApi = async (id: string): Promise<TransferNote | null> => (await apiClient.get(`/ambulance/scheduled/mine/${encodeURIComponent(id)}/note`)).data || null;
export const shareScheduledNoteApi = async (id: string, text: string, file: File | null): Promise<TransferNote> => {
  const form = new FormData(); form.append('text', text); form.append('consent', 'true'); if (file) form.append('file', file);
  return (await apiClient.put(`/ambulance/scheduled/mine/${encodeURIComponent(id)}/note`, form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 })).data;
};
export const VEHICLE_CHOICES = [['PTA','Patient transport'],['BLS','Basic life support (BLS)'],['ALS','Advanced life support (ALS)']] as const;
export const TRANSFER_CHOICES = [['DISCHARGE','Hospital discharge'],['HOSPITAL_TO_HOSPITAL','Hospital to hospital'],['DIALYSIS_REGULAR','Dialysis / regular appointments'],['LONG_DISTANCE','Long distance / outstation']] as const;
export const CONDITION_CHOICES = [['CONSCIOUS','Conscious'],['BREATHING_DIFFICULTY','Breathing difficulty'],['BLEEDING','Bleeding'],['ACCIDENT','Accident / injury'],['CHEST_PAIN','Chest pain'],['UNCONSCIOUS','Unconscious'],['OTHER','Other']] as const;
export const validateAmbulanceFile = (file: File | null) => file && (!['application/pdf','image/jpeg','image/png'].includes(file.type) || file.size > 10 * 1024 * 1024) ? 'Choose a PDF, JPG or PNG up to 10 MB.' : null;
