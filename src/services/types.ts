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
