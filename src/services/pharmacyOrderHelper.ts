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

export const createPharmacyRequestApi = async (prescriptionId: string, pharmacyPartnerId: string): Promise<PharmacyRequestItem> => {
  const res = await apiClient.post(ENDPOINTS.PATIENTS.CREATE_PHARMACY_REQUEST(prescriptionId), { pharmacy_partner_id: pharmacyPartnerId });
  return (res?.data?.data ?? res?.data) as PharmacyRequestItem;
};

export const getPharmacyRequestsApi = async (): Promise<PharmacyRequestItem[]> => {
  const res = await apiClient.get(ENDPOINTS.PATIENTS.PHARMACY_REQUESTS);
  const list = res?.data?.data;
  return Array.isArray(list) ? list : [];
};

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

export interface CreateRxOrderInput {
  pharmacy_request_id: string;
  fulfillment_type: OrderFulfillmentType;
  delivery_address_id?: string;
  payment_method: PaymentMethod; // required — an order with no payment_method is unclaimable by either path
  items: OrderCartLine[];
}

export const createRxOrderApi = async (input: CreateRxOrderInput): Promise<PatientOrder> => {
  const res = await apiClient.post(ENDPOINTS.PATIENTS.CREATE_RX_ORDER, input);
  return (res?.data?.data ?? res?.data) as PatientOrder;
};

export interface CreateDirectOrderInput {
  pharmacy_partner_id: string;
  fulfillment_type: OrderFulfillmentType;
  delivery_address_id?: string;
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

export const getMyOrderApi = async (id: string): Promise<PatientOrder> => {
  const res = await apiClient.get(ENDPOINTS.ORDERS.ONE_MINE(id));
  return (res?.data?.data ?? res?.data) as PatientOrder;
};

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
    mrp: Number(m.mrp ?? 0),
    requires_prescription: Boolean(m.requires_prescription),
  }));
};

// Live, per-pharmacy stock/price read for a specific medicine at a specific pharmacy —
// informational only, never a reservation (see the backend design: no stock holds exist
// anywhere in this system). Reuses the same GET /medicine-stock the pharmacist's own
// Stock screen already calls, scoped server-side to whichever pharmacy the caller
// authenticates as — NOT usable here directly since the patient isn't that pharmacy.
// There is deliberately no cross-pharmacy "check availability" read exposed yet (the
// Independent Pharmacy audit flagged this as a real gap, not solved by this feature) —
// so for v1 the Order Builder's own creation-time rejection (see createRxOrderApi /
// createDirectOrderApi) is the only availability signal a patient gets before confirming.
