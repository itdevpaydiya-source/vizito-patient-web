import { ENDPOINTS } from "./endpoints";
import apiClient from "./index";

// Reviews & ratings. Patients review their own completed consultations; the doctor's response (added
// from the provider app) flows back to the patient. All real data — nothing fabricated.

export interface PatientReview {
  id: string;
  booking_id: string | null;
  doctor_id: string | null;
  doctor_name: string | null;
  reviewer_name: string | null;     // the patient who wrote it (for provider review lists)
  rating: number;
  review: string | null;
  status: string | null;            // Pending | Responded
  partner_response: string | null;  // the doctor's reply
  responded_at: string | null;
  created_at: string | null;
}

export interface ProviderReviewSummary {
  reviews: PatientReview[];
  averageRating: number;
  totalReviews: number;
}

export const createReviewApi = async (bookingId: string, rating: number, review?: string): Promise<void> => {
  await apiClient.post(ENDPOINTS.PATIENTS.REVIEWS, { booking_id: bookingId, rating, review });
};

const mapReview = (r: any): PatientReview => ({
  id: String(r.id),
  booking_id: r.booking_id ?? null,
  doctor_id: r.doctor_id ?? null,
  doctor_name: r.doctor_name ?? null,
  reviewer_name: r.patient_name ?? r.reviewer_name ?? r.name ?? null,
  rating: Number(r.rating ?? 0),
  review: r.review ?? null,
  status: r.status ?? null,
  partner_response: r.partner_response ?? null,
  responded_at: r.responded_at ?? null,
  created_at: r.created_at ?? null,
});

// The patient's own reviews (keyed by booking_id for quick lookup on the bookings screen).
export const getMyReviewsApi = async (): Promise<Record<string, PatientReview>> => {
  const res = await apiClient.get(ENDPOINTS.PATIENTS.REVIEWS);
  const list = res?.data?.data;
  const map: Record<string, PatientReview> = {};
  if (Array.isArray(list)) list.forEach((r: any) => { const m = mapReview(r); if (m.booking_id) map[m.booking_id] = m; });
  return map;
};

export const getProviderReviewsApi = async (partnerId: string): Promise<ProviderReviewSummary> => {
  const res = await apiClient.get(ENDPOINTS.PATIENTS.PROVIDER_REVIEWS(partnerId));
  const d = res?.data?.data ?? res?.data;
  const reviews = Array.isArray(d?.reviews) ? d.reviews.map(mapReview) : [];
  const stats = d?.stats || {};
  return {
    reviews,
    averageRating: Number(stats.averageRating ?? 0),
    totalReviews: Number(stats.totalReviews ?? reviews.length),
  };
};
