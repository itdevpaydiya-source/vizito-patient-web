// Shared API/domain types for patient-facing data. These replace the type exports that previously
// lived under src/mocks. Only fields the backend actually provides are modeled here — no fabricated
// rating/fee/image fields.

// A provider as returned by GET /patients/providers (a real approved partner). The backend currently
// exposes provider identity only; richer fields (rating, fee, image, availability) are intentionally
// absent until a backend contract provides them.
export interface ProviderItem {
  id: string;              // Partner.id (uuid)
  serviceId: string;       // the service category the search was scoped to (may be empty)
  name: string;            // business_name
  subtitle?: string;       // partner_type
  specialtyOrType?: string; // partner_type
}

// Pharmacy ordering — mirrors vizito-catalogue's Order/OrderItem and vizito-booking's
// PharmacyRequest exactly (field names, enum values). Only fields the backend actually
// returns are modeled here — no fabricated fields.

export type PharmacyRequestStatus = 'Requested' | 'Accepted' | 'Rejected' | 'Expired' | 'Cancelled';

export interface PharmacyRequestItem {
  id: string;
  prescription_id: string;
  patient_id: string;
  pharmacy_partner_id: string;
  status: PharmacyRequestStatus;
  responded_at: string | null;
  reject_reason: string | null;
  order_id: string | null;   // non-null once converted to an Order — blocks a second Order
  created_at: string;
}

export type OrderStatus =
  | 'CREATED' | 'AWAITING_PAYMENT' | 'PAID' | 'PROCESSING'
  | 'READY_FOR_PICKUP' | 'OUT_FOR_DELIVERY' | 'COMPLETED'
  | 'CANCELLED' | 'FULFILLMENT_FAILED';

export type OrderPaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUND_PENDING' | 'REFUNDED';

export type OrderFulfillmentType = 'PICKUP' | 'DELIVERY';

export interface OrderItemMedicine {
  id: string;
  medicine_name: string;
  requires_prescription: boolean;
  mrp: number | string;
}

export interface OrderItemLine {
  id: string;
  medicine_id: string;
  medicine: OrderItemMedicine | null;
  quantity: number;
  unit_price: number | string;
  subtotal: number | string;
}

export interface PatientOrder {
  id: string;
  pharmacy_partner_id: string;
  pharmacy_request_id: string | null; // null = direct/OTC order
  fulfillment_type: OrderFulfillmentType;
  delivery_address_id: string | null;
  status: OrderStatus;
  payment_method: string | null;
  payment_status: OrderPaymentStatus;
  payment_reference: string | null;
  refund_reference_id?: string | null;
  refunded_at?: string | null;
  refund_failure_reason?: string | null;
  subtotal_amount: number | string;
  total_amount: number | string;
  sale_id: string | null;
  items: OrderItemLine[];
  created_at: string;
}
