import { ENDPOINTS } from "./endpoints";
import apiClient from "./index";

// A patient-facing notification. Maps ONLY real columns returned by the backend notifications
// feed (vizito-booking). Nothing is fabricated — an empty feed renders an honest empty state.
export interface PatientNotification {
  id: string;
  title: string;
  message: string;
  category: string;
  date: string;
  time: string;
  timestamp: string;
  unread: boolean;
  targetId?: string;
}

const mapNotification = (n: any): PatientNotification => ({
  id: String(n?.id ?? ''),
  title: n?.title ?? '',
  message: n?.desc ?? n?.message ?? n?.fullDescription ?? '',
  category: n?.category ?? 'General',
  date: n?.date ?? '',
  time: n?.time ?? '',
  timestamp: n?.timestamp ?? '',
  unread: Boolean(n?.unread),
  targetId: n?.targetId ?? undefined,
});

// The recipient (this patient) is resolved server-side from the JWT. We pass recipient_type=patient
// only to narrow the feed to patient notifications; no id is ever sent from the client.
const PATIENT_PARAMS = { recipient_type: 'patient' };

// Authenticated patient's notifications, newest first. Throws on failure so callers render an
// error state — never a mock fallback.
export const getNotificationsApi = async (): Promise<PatientNotification[]> => {
  const res = await apiClient.get(ENDPOINTS.NOTIFICATIONS.BASE, { params: PATIENT_PARAMS });
  const data = res?.data;
  const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
  return list.map(mapNotification);
};

// Marks every patient notification read (server-side, scoped by JWT identity). Bell → 0.
export const markAllNotificationsReadApi = async (): Promise<void> => {
  await apiClient.patch(ENDPOINTS.NOTIFICATIONS.READ_ALL, null, { params: PATIENT_PARAMS });
};

export const markNotificationReadApi = async (id: string): Promise<void> => {
  await apiClient.patch(ENDPOINTS.NOTIFICATIONS.READ_ONE(id));
};

export const deleteNotificationApi = async (id: string): Promise<void> => {
  await apiClient.delete(ENDPOINTS.NOTIFICATIONS.DELETE_ONE(id));
};
