// Shared API/domain types for patient-facing data. These replace the type exports that previously
// lived under src/mocks. Only fields the backend actually provides are modeled here — no fabricated
// rating/fee/image fields.

// A provider as returned by GET /patients/providers (a real approved partner). The backend currently
// exposes provider identity only; richer fields (rating, fee, image, availability) are intentionally
// absent until a backend contract provides them.
export interface ProviderItem {
  hospital?: HospitalFacts | null;
  nearestKm?: number | null;
  distanceKnown?: boolean;
  gender?: string|null;
  languagesList?: string[];
  nextAvailable?: {date:string;time:string;facility_id:number|null}|null;
  id: string;              // Partner.id (uuid)
  serviceId: string;       // the service category the search was scoped to (may be empty)
  name: string;            // business_name
  subtitle?: string;       // partner_type
  specialtyOrType?: string; // partner_type
  partnerType?: string | null; // raw business type (doctor, hospitaladmin, diagnostics, pharmacy, homecare…)
  // Public profile details (doctors) and rating — only present when the backend has them.
  qualification?: string | null;
  specialization?: string | null;
  designation?: string | null;
  expertise?: string[];
  superSpecialization?: string | null;
  experienceYears?: number | null;
  medicalRegistrationNumber?: string | null;
  medicalCouncilName?: string | null;
  languages?: string | null;
  city?: string | null;
  inClinicFee?: number | null;
  videoFee?: number | null;
  registrationVerified?: boolean;
  logo?: string | null;
  address?: string | null;     // pharmacies: store address for pickup
  storePin?: { lat: number; lng: number } | null; // pharmacies: store pin, once the pharmacy confirmed it
  rating?: { average: number; count: number } | null;
  // The provider has paused new bookings/orders (emergency, leave, rush). Shown, not bookable.
  pause?: ProviderPause | null;
  licenseStatus?: string | null;
  businessHours?: { day: string; open_time: string | null; close_time: string | null; is_closed: boolean }[];
  // Hospitals / clinics: where they are, what they run and who consults there.
  org?: OrgSummary | null;
}

export interface HospitalFacts {
  about: string | null;
  year_established: number | null;
  bed_count: number | null;
  facilities: { id: string; name: string }[];
  emergency_24x7: boolean | null;
  emergency_contact: string | null;
  cashless_available: boolean | null;
  insurers: { id: string; name: string; cashless: boolean }[];
  accreditations: { name: string; cert_no: string | null; valid_until: string | null; verification_status: 'VERIFIED' | 'DECLARED' | 'EXPIRED' | 'INCOMPLETE' }[];
  opd_hours: { day: string; open: string | null; close: string | null; is_closed: boolean }[];
  timezone: string;
  arrival_desk: string | null;
  virtual_tour: { url: string; media_type: 'embed' | 'video' } | null;
  cover_url?: string | null;
  gallery?: { url: string; caption?: string | null }[];
}

export interface OrgSummary {
  locations: { facility_id?: number; name: string; area: string | null; city: string | null; pin?: { lat: number; lng: number } | null }[];
  departments: { name: string; from_fee: number | null }[];
  doctors: { name: string; specialization: string | null }[];
  doctor_count: number;
}

export interface ProviderPause { paused: boolean; until: string | null; indefinite: boolean; reason: string | null }

/** "Not taking bookings right now · back at 4:30 PM" */
export const pauseText = (p: ProviderPause, noun: 'bookings' | 'orders' = 'bookings'): string => {
  if (!p.until || p.indefinite) return `Not taking ${noun} right now`;
  const d = new Date(p.until);
  const t = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  const when = d.toDateString() === new Date().toDateString() ? t : `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${t}`;
  return `Not taking ${noun} right now · back ${when}`;
};

// Pharmacy ordering — mirrors vizito-catalogue's Order/OrderItem and vizito-booking's
// PharmacyRequest exactly (field names, enum values). Only fields the backend actually
// returns are modeled here — no fabricated fields.

export type PharmacyRequestStatus = 'Requested' | 'Accepted' | 'Rejected' | 'Expired' | 'Cancelled';

export interface PharmacyRequestItem {
  id: string;
  prescription_id: string | null;
  document_id?: string | null;
  requested_items?: string | null;
  beneficiary_profile_id?: string | null;
  beneficiary_name?: string | null;
  beneficiary_relationship?: string | null;
  patient_id: string;
  pharmacy_partner_id: string;
  status: PharmacyRequestStatus;
  responded_at: string | null;
  reject_reason: string | null;
  order_id: string | null;   // non-null once converted to an Order — blocks a second Order
  created_at: string;
  // The pharmacy's priced quote (quote_items: JSON list of PharmacyQuoteLine).
  quote_items?: string | null;
  quote_total?: string | null;
  quoted_at?: string | null;
  quote_valid_until?: string | null;
  quote_note?: string | null;
}

export interface PharmacyQuoteLine {
  medicine_id?: string;
  prescribed_name: string;
  available: boolean;
  item_name?: string;
  quantity?: number;
  unit_price?: number;
  amount?: number;
  note?: string;
}

export type OrderStatus =
  | 'CREATED' | 'AWAITING_PAYMENT' | 'PAID' | 'PROCESSING'
  | 'READY_FOR_PICKUP' | 'OUT_FOR_DELIVERY' | 'COMPLETED'
  | 'CANCELLED' | 'FULFILLMENT_FAILED';

export type OrderPaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUND_PENDING' | 'REFUNDED';

export type OrderFulfillmentType = 'PICKUP' | 'DELIVERY';

export interface OrderItemMedicine {
  image_url?: string | null;
  strength?: string | null;
  strength_unit?: string | null;
  dosage_form?: string | null;
  packaging_type?: string | null;
  units_per_pack?: number | null;
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
  timeline?: {code:string;label:string;state:"completed"|"current"|"pending";occurred_at:string|null}[];
  payments?: {amount:number|string;method:string;paid_at:string|null;transaction_number:string|null;status:"PAID"|"REFUND_PENDING"|"REFUNDED"}[];
  invoice_number?: string|null;
  delivery_fee?: number;
  discount_amount?: number;
  pickup_code?: string|null;
  can_cancel?: boolean;
  cancel_unavailable_reason?: string|null;
  cancel_refund_note?: string|null;
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
  patient_id?: string;
  // Who ended a cancelled order: 'SYSTEM' when the pharmacy didn't answer in time, the patient's
  // own id when they cancelled, anyone else = the pharmacy declined.
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  cancellation_reason?: string | null;
}

export const orderEndedBy = (o: PatientOrder): 'pharmacy' | 'no-answer' | 'you' | null =>
  o.status !== 'CANCELLED' ? null : o.cancelled_by === 'SYSTEM' ? 'no-answer' : o.cancelled_by && o.cancelled_by !== o.patient_id ? 'pharmacy' : 'you';
