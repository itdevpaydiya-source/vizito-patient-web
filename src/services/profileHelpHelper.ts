import api from "./index";
export const profileError = (
  e: any,
  fallback = "Could not complete that action.",
) => {
  const m = e?.response?.data?.message;
  return Array.isArray(m) ? m.join(" ") : m || e?.message || fallback;
};
export interface PatientDevice {
  id: string;
  device: string;
  browser: string | null;
  os: string | null;
  ip_address: string | null;
  signed_in_at: string;
  last_active_at: string | null;
  is_current: boolean;
}
export interface DeletionPreview {
  can_delete: boolean;
  reason: string | null;
  upcoming_bookings: Record<string, unknown>[];
  reasons: string[];
  erase_after_days: number;
  consequences: string[];
}
export const contactVerificationApi = async () => {
  const d = (await api.get("/patient/auth/profile")).data;
  return d.data || d;
};
export const devicesApi = async (): Promise<PatientDevice[]> =>
  (await api.get("/patient/account/devices")).data;
export const revokeDeviceApi = async (id: string) =>
  (await api.delete(`/patient/account/devices/${encodeURIComponent(id)}`)).data;
export const deletionPreviewApi = async (): Promise<DeletionPreview> =>
  (await api.get("/patient/account/deletion/preview")).data;
export const deletionOtpApi = async (): Promise<{
  sent_to: string;
  dev_otp?: string;
  expires_at: string;
}> => (await api.post("/patient/account/deletion/send-otp")).data;
export const deletePatientAccountApi = async (body: {
  otp: string;
  reason: string;
  note?: string;
  confirm: string;
}) => (await api.post("/patient/account/deletion", body)).data;
export const downloadPatientDataApi = async () => {
  const r = await api.get("/patient/account/export", { responseType: "blob" });
  const url = URL.createObjectURL(r.data);
  const link = document.createElement("a");
  link.href = url;
  link.download =
    /filename="?([^";]+)/i.exec(r.headers["content-disposition"] || "")?.[1] ||
    "vizito-my-data.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};
export interface TicketPage {
  items: import("./supportHelper").SupportTicket[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
  counts: { all: number; open: number; resolved: number };
}
export const ticketPageApi = async (params: {
  tab?: string;
  search?: string;
  page?: number;
  page_size?: number;
}): Promise<TicketPage> =>
  (await api.get("/support-tickets/mine/page", { params })).data;
export const faqVotesApi = async (): Promise<
  { article_id: string; helpful: boolean }[]
> => (await api.get("/support-tickets/faq/votes/mine")).data;
export const voteFaqApi = async (id: string, helpful: boolean) =>
  (
    await api.post(`/support-tickets/faq/${encodeURIComponent(id)}/vote`, {
      helpful,
    })
  ).data;
export interface RelatedSupportBooking {
  id: string;
  reference: string;
  service_label: string;
  service_type: string;
  starts_at: string | null;
  status: string;
}
export const relatedSupportBookingsApi = async (): Promise<
  RelatedSupportBooking[]
> => {
  const d = (await api.get("/bookings/family-members/account/summary")).data;
  return d.items;
};
