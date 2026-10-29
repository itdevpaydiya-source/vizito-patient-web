import apiClient from "./index";

// Find blood (patient side): verified blood banks with AVAILABLE / NOT_AVAILABLE per component.
// Exact unit counts are never sent to patients.
export type Band = "AVAILABLE" | "NOT_AVAILABLE";
export interface BloodReference {
  components: { code: string; name: string }[];
  groups: { code: string; label: string }[];
}
export interface VerifiedBloodCentre {
  partner_id: string;
  name: string;
  phone: string | null;
  address: string | null;
  pincode: string | null;
  distance_km: number | null;
}
export interface BloodCentre extends VerifiedBloodCentre {
  bands: Record<string, Band>;
  any_available: boolean;
}
export interface AvailabilityResult {
  group: string;
  components: string[];
  centres: BloodCentre[];
}

export const bloodCentresApi = async (
  point: { lat?: number; lng?: number } = {},
): Promise<{ centres: VerifiedBloodCentre[] }> =>
  (await apiClient.get("/bloodbank/centres", { params: point })).data;

export const bloodReferenceApi = async (): Promise<BloodReference> =>
  (await apiClient.get("/bloodbank/reference")).data;
export const bloodAvailabilityApi = async (p: {
  group: string;
  component?: string;
  lat?: number;
  lng?: number;
}): Promise<AvailabilityResult> =>
  (
    await apiClient.get("/bloodbank/availability", {
      params: {
        group: p.group,
        component: p.component || undefined,
        lat: p.lat,
        lng: p.lng,
      },
    })
  ).data;

export const bloodError = (e: any, fallback: string) => {
  const m = e?.response?.data?.message;
  return Array.isArray(m) ? m.join(" ") : m || (!e?.response && e?.message) || fallback;
};

// ── Requests (D2) ──
export interface Requisition {
  id: string;
  source: "DOCTOR" | "UPLOAD";
  routed_bloodbank?: { partner_id: string; name: string | null } | null;
  doctor_name: string | null;
  component_code: string | null;
  requested_group: string | null;
  quantity: number | null;
  urgency: string | null;
  indication: string | null;
  file_name: string | null;
  created_at: string;
}
export interface MyBloodRequest {
  is_emergency?: boolean;
  payment_preference?: string | null;
  admitted_hospital?: string | null;
  treating_doctor?: string | null;
  planned_at?: string | null;
  timeline?: { code: string; label: string; at: string }[];
  reserved_until?: string | null;
  paid_at?: string | null;
  payment_method?: "CASH" | "ONLINE" | null;
  payment_reference?: string | null;
  cancel_unavailable_reason?: string | null;
  for_relationship?: string | null;
  requested_by_doctor?: string | null;
  bloodbank?: {
    name: string | null;
    phone: string | null;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    licence_number: string | null;
    hours: {
      day: string;
      open: string | null;
      close: string | null;
      closed: boolean;
    }[];
  };
  id: string;
  request_number: string;
  bloodbank_partner_id: string;
  bloodbank_name: string | null;
  patient_name: string | null;
  component_code: string;
  requested_group: string;
  quantity: number;
  urgency: string;
  status: string;
  status_label: string;
  status_reason: string | null;
  processing_charge: { per_unit: number; total: number } | null;
  payment_status: string;
  can_pay: boolean;
  can_cancel: boolean;
  created_at: string;
  issued_at: string | null;
}
const key = () =>
  (
    globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(36).slice(2)}`
  ).replace(/[^A-Za-z0-9_-]/g, "");
export const myRequisitionsApi = async (
  familyMemberId?: string,
): Promise<Requisition[]> =>
  (
    await apiClient.get("/bloodbank/requisitions/mine", {
      params: { family_member_id: familyMemberId || undefined },
    })
  ).data;
export const uploadRequisitionApi = async (
  file: File,
  familyMemberId?: string,
): Promise<Requisition> => {
  const form = new FormData();
  form.append("file", file);
  return (
    await apiClient.post("/bloodbank/requisitions/upload", form, {
      params: { family_member_id: familyMemberId || undefined },
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 60000,
    })
  ).data;
};
/** One idempotency key per submit attempt: a retried click returns the same request. */
export const createBloodRequestApi = async (
  body: Record<string, unknown>,
  idempotencyKey = key(),
): Promise<MyBloodRequest> =>
  (
    await apiClient.post("/bloodbank/requests", body, {
      headers: { "Idempotency-Key": idempotencyKey },
    })
  ).data;
export const myBloodRequestsApi = async (): Promise<MyBloodRequest[]> =>
  (await apiClient.get("/bloodbank/requests/mine")).data;
export const myBloodRequestsPageApi = async (params:{page:number;page_size:10|20;q?:string;status?:string;date_from?:string;date_to?:string}):Promise<{items:MyBloodRequest[];page:number;page_size:10|20;total:number;total_pages:number}> =>
  (await apiClient.get("/bloodbank/requests/mine",{params})).data;
export const myBloodRequestApi = async (id: string): Promise<MyBloodRequest> =>
  (await apiClient.get(`/bloodbank/requests/mine/${encodeURIComponent(id)}`))
    .data;
export const cancelBloodRequestApi = async (
  id: string,
  reason: string,
): Promise<MyBloodRequest> =>
  (
    await apiClient.post(
      `/bloodbank/requests/mine/${encodeURIComponent(id)}/cancel`,
      { reason },
    )
  ).data;
export const payBloodRequestApi = async (
  id: string,
  payment: Record<string, unknown>,
  idempotencyKey = key(),
): Promise<MyBloodRequest> =>
  (
    await apiClient.post(
      `/bloodbank/requests/mine/${encodeURIComponent(id)}/pay`,
      { payment },
      { headers: { "Idempotency-Key": idempotencyKey } },
    )
  ).data;
export const newIdempotencyKey = key;

// ── Donors (D3) ──
export interface DonorSessionRow {
  id: string;
  kind: "CENTRE" | "CAMP";
  title: string;
  venue: string | null;
  organizer: string | null;
  starts_at: string;
  ends_at: string;
  places_left: number;
  centre: { partner_id: string; name?: string; phone: string | null };
}
export interface DonorMe {
  registered: boolean;
  donor?: {
    donor_code: string;
    full_name: string | null;
    declared_group: string | null;
  };
  appointments?: {
    id: string;
    status: string;
    status_label: string;
    centre?: string;
    session: {
      title: string;
      kind: string;
      venue: string | null;
      starts_at: string;
      ends_at: string;
    } | null;
    deferred_until: string | null;
    can_cancel: boolean;
  }[];
  donations?: {
    id: string;
    collected_at: string;
    centre: string;
    session: string | null;
    kind: string | null;
  }[];
}
export const donorMeApi = async (): Promise<DonorMe> =>
  (await apiClient.get("/bloodbank/donor/me")).data;
export const donorHistoryApi = async (params:{type:"appointments"|"donations";page:number;page_size:10|20;status?:string}):Promise<{items:NonNullable<DonorMe["appointments"]>|NonNullable<DonorMe["donations"]>;page:number;page_size:10|20;total:number;total_pages:number}> =>
  (await apiClient.get("/bloodbank/donor/history",{params})).data;
export const donorRegisterApi = async (body: {
  declared_group?: string;
  consent: boolean;
}) => (await apiClient.post("/bloodbank/donor/register", body)).data;
export const donorSessionsApi = async (): Promise<DonorSessionRow[]> =>
  (await apiClient.get("/bloodbank/donor/sessions")).data;
export const donorBookApi = async (body: {
  session_id: string;
  replacement_request_number?: string;
}) => (await apiClient.post("/bloodbank/donor/appointments", body)).data;
export const donorCancelApi = async (id: string) =>
  (
    await apiClient.post(
      `/bloodbank/donor/appointments/${encodeURIComponent(id)}/cancel`,
    )
  ).data;
export interface DonorCertificate {
  donor_name: string | null;
  donor_code: string;
  centre: string;
  donated_on: string;
  certificate_no: string;
}
export const donorCertificateApi = async (
  id: string,
): Promise<DonorCertificate> =>
  (
    await apiClient.get(
      `/bloodbank/donor/donations/${encodeURIComponent(id)}/certificate`,
    )
  ).data;

export interface BloodGridCentre extends VerifiedBloodCentre {
  latitude?: number | null;
  longitude?: number | null;
  licence_number: string | null;
  verified: boolean;
  is_24x7: boolean;
  hours:
    | {
        day: string;
        open?: string | null;
        close?: string | null;
        open_time?: string | null;
        close_time?: string | null;
        closed?: boolean;
        is_closed?: boolean;
      }[]
    | null;
  stock: Record<string, { units: number; more: boolean; in_stock: boolean }>;
  any_in_stock: boolean;
  stock_updated_at: string | null;
  photo_url?: string | null;
  rating?: number | null;
  rating_count?: number;
}
export interface BloodGrid {
  component: string;
  groups: string[];
  cap: number;
  sorts: string[];
  centres: BloodGridCentre[];
}
export interface BloodCentreDetail extends Omit<BloodGridCentre, "stock" | "any_in_stock"> {
  groups: string[];
  cap: number;
  components: { code: string; name: string; stock: Record<string, { units: number; more: boolean; in_stock: boolean }>; any_in_stock: boolean }[];
  charges: { component_code: string; component: string; amount: number }[];
  reservation_hours: number | null;
}
export interface BloodQuote {
  /** Null is handled by the UI as an unset charge; API clients should not calculate with it. */
  per_unit: number;
  total: number | null;
  registration_fee: number;
  currency: string;
  charge_set: boolean;
  approximate: boolean;
  fixed_when: string;
  payment_methods: {
    code: "ONLINE" | "AT_BANK";
    label: string;
    when: string;
  }[];
}
export interface BloodAlert {
  id: string;
  blood_group: string;
  component_code: string;
  area_label: string | null;
  status: string;
  expires_at: string;
}
export const bloodGridApi = async (params: {
  component?: string;
  lat?: number;
  lng?: number;
  sort?: string;
}): Promise<BloodGrid> =>
  (await apiClient.get("/bloodbank/stock-grid", { params })).data;
export const bloodCentreDetailApi = async (id: string, point: { lat?: number; lng?: number } = {}): Promise<BloodCentreDetail> =>
  (await apiClient.get(`/bloodbank/centres/${encodeURIComponent(id)}`, { params: point })).data;
export const bloodQuoteApi = async (params: {
  bloodbank_partner_id: string;
  component_code: string;
  quantity: number;
}): Promise<BloodQuote> =>
  (await apiClient.get("/bloodbank/requests/quote", { params })).data;
export const bloodAlertsApi = async (): Promise<BloodAlert[]> =>
  (await apiClient.get("/bloodbank/alerts/mine")).data;
export const bloodAlertCreateApi = async (body: {
  blood_group: string;
  component_code: string;
  latitude: number;
  longitude: number;
  area_label: string;
}) => (await apiClient.post("/bloodbank/alerts", body)).data;
export const bloodAlertCancelApi = async (id: string) =>
  (await apiClient.delete(`/bloodbank/alerts/${encodeURIComponent(id)}`)).data;
