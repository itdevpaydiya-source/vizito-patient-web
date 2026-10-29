import { ENDPOINTS } from "./endpoints";
import apiClient from "./index";
import type {
  PharmacyRequestItem,
  PatientOrder,
  OrderFulfillmentType,
} from "./types";
import type { PaymentMethod, ProcessPaymentInput, PaymentResult } from "./bookingHelper";

// Patient prescription -> pharmacy negotiation, proxied via gateway -> vizito-auth ->
// vizito-booking (same shape as every other PATIENTS.* call — wrapped {success, data}).

export const createPharmacyRequestApi = async (prescriptionId: string, pharmacyPartnerId: string, forUserId?: number): Promise<PharmacyRequestItem> => {
  const res = await apiClient.post(ENDPOINTS.PATIENTS.CREATE_PHARMACY_REQUEST(prescriptionId), { pharmacy_partner_id: pharmacyPartnerId, ...(forUserId!=null?{for_user_id:forUserId}:{}) });
  return (res?.data?.data ?? res?.data) as PharmacyRequestItem;
};

export const getPharmacyRequestsApi = async (): Promise<PharmacyRequestItem[]> => {
  const res = await apiClient.get(ENDPOINTS.PATIENTS.PHARMACY_REQUESTS);
  const list = res?.data?.data;
  return Array.isArray(list) ? list : [];
};
export const getPharmacyRequestsPageApi=async(params:{page:number;page_size:10|20;q?:string;status?:string;date_from?:string;date_to?:string;sort?:"newest"|"oldest"}):Promise<{items:PharmacyRequestItem[];page:number;page_size:10|20;total:number;total_pages:number}>=>{const d=(await apiClient.get(ENDPOINTS.PATIENTS.PHARMACY_REQUESTS,{params})).data;return{items:Array.isArray(d?.items)?d.items:Array.isArray(d?.data)?d.data:[],page:Number(d?.page)||params.page,page_size:(Number(d?.page_size)||params.page_size) as 10|20,total:Number(d?.total)||0,total_pages:Number(d?.total_pages)||1};};

export const cancelPharmacyRequestApi = async (id: string): Promise<void> => {
  await apiClient.patch(ENDPOINTS.PATIENTS.CANCEL_PHARMACY_REQUEST(id));
};

// Order creation — TWO different paths, deliberately not unified into one function,
// because they reach the backend through two different routes (see endpoints.ts):
// Rx-backed goes through vizito-auth's orchestration (it has to validate the
// PharmacyRequest against vizito-booking first); a direct/OTC order is simple enough
// for vizito-catalogue to authorize on its own, so it's called directly through the
// gateway, same precedent as payment.

export interface OrderCartLine {
  medicine_id: string;
  quantity: number;
}

// Home delivery snapshot. The backend re-checks the address and PIN against the pharmacy's
// delivery PINs and calculates the fee itself — these are the patient's chosen address lines,
// never a client-side fee.
interface DeliveryOrderInput {
  delivery_address_id?: string;
  delivery_address_text?: string;
  delivery_pincode?: string;
}

export interface CreateRxOrderInput extends DeliveryOrderInput {
  pharmacy_request_id: string;
  fulfillment_type: OrderFulfillmentType;
  payment_method: PaymentMethod; // required — an order with no payment_method is unclaimable by either path
  items: OrderCartLine[];
}

export const createRxOrderApi = async (input: CreateRxOrderInput): Promise<PatientOrder> => {
  const res = await apiClient.post(ENDPOINTS.PATIENTS.CREATE_RX_ORDER, input);
  return (res?.data?.data ?? res?.data) as PatientOrder;
};

export interface CreateDirectOrderInput extends DeliveryOrderInput {
  pharmacy_partner_id: string;
  fulfillment_type: OrderFulfillmentType;
  payment_method: PaymentMethod;
  items: OrderCartLine[];
}

export const createDirectOrderApi = async (input: CreateDirectOrderInput): Promise<PatientOrder> => {
  const res = await apiClient.post(ENDPOINTS.ORDERS.CREATE, input);
  return (res?.data?.data ?? res?.data) as PatientOrder;
};

// Patient's own orders — GET /orders/mine, deliberately not plain GET /orders (that's
// the pharmacy's own queue; see endpoints.ts). Direct through the gateway, unwrapped.

export const getMyOrdersApi = async (): Promise<PatientOrder[]> => {
  const res = await apiClient.get(ENDPOINTS.ORDERS.MINE);
  const list = res?.data?.data ?? res?.data;
  return Array.isArray(list) ? list : [];
};
export const getMyOrdersPageApi=async(params:{page:number;page_size:10|20;q?:string;status?:string;group?:"all"|"active"|"completed"|"cancelled";date_from?:string;date_to?:string;sort?:"newest"|"oldest"}):Promise<{items:PatientOrder[];page:number;page_size:10|20;total:number;total_pages:number}>=>(await apiClient.get(ENDPOINTS.ORDERS.MINE,{params})).data;

export const getMyOrderApi = async (id: string): Promise<PatientOrder> => {
  const res = await apiClient.get(ENDPOINTS.ORDERS.ONE_MINE(id));
  return (res?.data?.data ?? res?.data) as PatientOrder;
};

// Rate the pharmacy once the order is completed (shows on its Reviews & Ratings).
export const ratePharmacyOrderApi = async (id: string, rating: number, review: string, tags?: string[]): Promise<void> => { await apiClient.post(`/orders/${encodeURIComponent(id)}/rate`, { rating, review, tags }); };

export const cancelOrderApi = async (id: string, reason?: string): Promise<PatientOrder> => {
  const res = await apiClient.post(ENDPOINTS.ORDERS.CANCEL(id), reason ? { reason } : undefined);
  return (res?.data?.data ?? res?.data) as PatientOrder;
};

// Reuses bookingHelper's own ProcessPaymentInput/PaymentResult types verbatim — the
// backend's Order payment endpoint returns the exact same shape as the consultation-
// booking payment endpoint (see vizito-catalogue's PaymentsService.pay()).
export const payOrderApi = async (orderId: string, input: ProcessPaymentInput): Promise<PaymentResult> => {
  const res = await apiClient.post(ENDPOINTS.ORDERS.PAY(orderId), input);
  return (res?.data?.data ?? res?.data) as PaymentResult;
};

// Medicine search for the direct/OTC path and for matching a prescription's free-text
// lines to a real catalogue medicine — GET /medicines/autocomplete is already real,
// already public, already used by the pharmacist's own dispense screen for exactly this.
export interface MedicineSearchResult {
  image_url?: string | null;
  packaging_type?: string | null;
  units_per_pack?: number | null;
  available_quantity?: number | null;
  in_stock?: boolean;
  id: string;
  code: string | null;
  medicine_name: string;
  brand_name: string | null;
  generic_name: string;
  strength: string;
  strength_unit: string;
  dosage_form: string;
  mrp: number;
  requires_prescription: boolean;
}

export const searchMedicinesApi = async (keyword: string): Promise<MedicineSearchResult[]> => {
  if (!keyword || keyword.trim().length < 2) return [];
  const res = await apiClient.get(ENDPOINTS.MEDICINES.AUTOCOMPLETE, { params: { keyword: keyword.trim() } });
  const list = res?.data;
  if (!Array.isArray(list)) return [];
  return list.map((m: any): MedicineSearchResult => ({
    id: m.id,
    code: m.code ?? null,
    medicine_name: m.medicine_name,
    brand_name: m.brand_name ?? null,
    generic_name: m.generic_name,
    strength: m.strength,
    strength_unit: m.strength_unit,
    dosage_form: m.dosage_form,
    image_url: m.image_url ?? null,
    mrp: m.mrp == null || String(m.mrp).trim() === '' ? NaN : Number(m.mrp),
    requires_prescription: Boolean(m.requires_prescription),
  }));
};

// Pharmacy catalogue is informational, not a stock reservation. The order service rechecks stock.
export interface PharmacyMedicine extends MedicineSearchResult {
  manufacturer: string | null;
  packaging_type: string | null;
  units_per_pack: number | null;
  category_name: string | null;
  in_stock: boolean;
}
export async function getPharmacyCatalogueApi(pharmacyId: string, keyword = '', page = 1): Promise<{ items: PharmacyMedicine[]; total: number }> {
  const res = await apiClient.get(`${ENDPOINTS.MEDICINES.SEARCH}/pharmacy-catalogue/${encodeURIComponent(pharmacyId)}`, { params: { keyword, page } });
  const data = res.data;
  return { items: Array.isArray(data?.items) ? data.items.map((m: any) => ({ ...m, mrp: m.mrp == null || String(m.mrp).trim() === '' ? NaN : Number(m.mrp), available_quantity: m.available_quantity == null ? null : Number(m.available_quantity), units_per_pack: m.units_per_pack == null ? null : Number(m.units_per_pack) })) : [], total: Number(data?.total) || 0 };
}

export interface MedicineDetail extends PharmacyMedicine {composition:string|null;description:string|null;storage_condition:string|null;category?:{id:number;name:string}|null}
export const getMedicineDetailApi=async(id:string):Promise<MedicineDetail> => (await apiClient.get(`/medicines/${encodeURIComponent(id)}`)).data;

export interface UploadedPharmacyRequestInput {pharmacy_partner_id:string;document_id:string;items:{medicine_id:string;name:string;quantity:number}[];for_user_id?:number}
export const createUploadedPharmacyRequestApi=async(input:UploadedPharmacyRequestInput):Promise<PharmacyRequestItem>=>{const response=await apiClient.post('/patients/pharmacy-requests/upload',input);return response.data?.data??response.data;};

// ---------------------------------------------------------------------------
// Search across nearby pharmacies + per-medicine availability (v2 journey).
// Both are catalogue reads reached through the gateway, unwrapped.
// ---------------------------------------------------------------------------

export interface MedicineNearPharmacy {
  pharmacy_id: string;
  name: string;
  phone: string | null;
  address: string | null;
  pincode: string | null;
  pin: { lat: number; lng: number } | null;
  distance_km: number | null;
  logo_url: string | null;
  store_pickup: boolean;
  home_delivery: boolean;
  delivery_fee: number | null;
  in_stock: boolean;
}

export interface MedicineNearResult {
  id: string;
  medicine_name: string;
  brand_name: string | null;
  generic_name: string | null;
  strength: string | null;
  strength_unit: string | null;
  dosage_form: string | null;
  mrp: number;
  requires_prescription: boolean;
  manufacturer: string | null;
  packaging_type: string | null;
  units_per_pack: number | null;
  category_name: string | null;
  pharmacies_near: number;
  nearest: MedicineNearPharmacy | null;
  home_delivery_available: boolean;
}

export interface Paged<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

const moneyNumber = (value: unknown): number => value == null || String(value).trim() === '' ? NaN : Number(value);

export const searchMedicinesNearApi = async (params: {
  keyword: string;
  lat: number;
  lng: number;
  pincode?: string;
  radius_km?: number;
  page?: number;
  page_size?: 10 | 20;
}): Promise<Paged<MedicineNearResult>> => {
  const res = await apiClient.get(`${ENDPOINTS.MEDICINES.SEARCH}/near`, { params });
  const data = res.data ?? {};
  return {
    items: Array.isArray(data.items)
      ? data.items.map((m: any): MedicineNearResult => ({
          ...m,
          mrp: moneyNumber(m.mrp),
          units_per_pack: m.units_per_pack == null ? null : Number(m.units_per_pack),
          pharmacies_near: Number(m.pharmacies_near) || 0,
          nearest: m.nearest ?? null,
          home_delivery_available: Boolean(m.home_delivery_available),
        }))
      : [],
    page: Number(data.page) || Number(params.page) || 1,
    page_size: Number(data.page_size) || params.page_size || 10,
    total: Number(data.total) || 0,
    total_pages: Number(data.total_pages) || 1,
  };
};

export const getMedicinePharmaciesNearApi = async (
  medicineId: string,
  params: { lat: number; lng: number; pincode?: string; radius_km?: number },
): Promise<{ items: MedicineNearPharmacy[]; total: number }> => {
  const res = await apiClient.get(`/medicines/${encodeURIComponent(medicineId)}/pharmacies-near`, { params });
  const data = res.data ?? {};
  return {
    items: Array.isArray(data.items)
      ? data.items.map((p: any): MedicineNearPharmacy => ({
          ...p,
          delivery_fee: p.delivery_fee == null ? null : Number(p.delivery_fee),
          distance_km: p.distance_km == null ? null : Number(p.distance_km),
          store_pickup: Boolean(p.store_pickup),
          home_delivery: Boolean(p.home_delivery),
          in_stock: Boolean(p.in_stock),
        }))
      : [],
    total: Number(data.total) || 0,
  };
};

export interface DeliveryOptions {
  pickup: boolean;
  fee: number;
  free_above: number | null;
  hours: { open: string; close: string } | null;
  available: boolean;
  reason?: string | null;
}

export const getDeliveryOptionsApi = async (pharmacyId: string, pincode: string): Promise<DeliveryOptions> => {
  const res = await apiClient.get(`/orders/delivery-options/${encodeURIComponent(pharmacyId)}`, { params: { pincode } });
  const data = res.data ?? {};
  return {
    pickup: Boolean(data.pickup),
    fee: Number(data.fee) || 0,
    free_above: data.free_above == null ? null : Number(data.free_above),
    hours: data.hours ?? null,
    available: Boolean(data.available),
    reason: data.reason ?? null,
  };
};

// ---------------------------------------------------------------------------
// Order history: tab counts + one server-paged group at a time (newest first).
// ---------------------------------------------------------------------------

export interface MyOrderCounts {
  all: number;
  active: number;
  completed: number;
  cancelled: number;
}

export const getMyOrderCountsApi = async (): Promise<MyOrderCounts> => {
  const data = (await apiClient.get(`${ENDPOINTS.ORDERS.MINE}/counts`)).data ?? {};
  return {
    all: Number(data.all) || 0,
    active: Number(data.active) || 0,
    completed: Number(data.completed) || 0,
    cancelled: Number(data.cancelled) || 0,
  };
};

// The order read paths return the delivery snapshot columns too; types.ts is shared with
// other modules, so the extra fields are declared here rather than widening PatientOrder.
export interface PatientOrderV2 extends PatientOrder {
  delivery_address_text?: string | null;
  delivery_pincode?: string | null;
  delivery_person_name?: string | null;
  delivery_person_phone?: string | null;
  delivery_eta?: string | null;
  dispatched_at?: string | null;
}

export const getMyOrdersGroupedPageApi = async (params: {
  group: 'all' | 'active' | 'completed' | 'cancelled';
  sort?: 'newest' | 'oldest';
  page: number;
  page_size: 10 | 20;
  q?: string;
  date_from?: string;
  date_to?: string;
}): Promise<Paged<PatientOrderV2>> => {
  const data = (await apiClient.get(ENDPOINTS.ORDERS.MINE, { params })).data ?? {};
  return {
    items: Array.isArray(data.items) ? data.items : [],
    page: Number(data.page) || params.page,
    page_size: (Number(data.page_size) || params.page_size) as 10 | 20,
    total: Number(data.total) || 0,
    total_pages: Number(data.total_pages) || 1,
  };
};
