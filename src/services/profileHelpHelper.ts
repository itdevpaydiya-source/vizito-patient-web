import api from "./index";
const FRIENDLY_PROFILE_ERRORS: [RegExp, string][] = [
  [/dateOfBirth must be a valid ISO 8601 date string/i, "Please enter a valid date of birth."],
  [/fullName must be shorter than or equal to/i, "Full name must be 100 characters or fewer."],
  [/fullName must be a string/i, "Please enter your full name."],
  [/gender must be one of/i, "Please select a gender."],
  [/phone must be a valid E\.164/i, "Enter a valid 10-digit Indian mobile number."],
  [/email must be an email/i, "Enter a valid email address."],
];
export const friendlyProfileMessage = (msg: string): string => {
  for (const [pattern, replacement] of FRIENDLY_PROFILE_ERRORS) {
    if (pattern.test(msg)) return replacement;
  }
  return msg;
};
export const profileError = (
  e: any,
  fallback = "Could not complete that action.",
) => {
  const m = e?.response?.data?.message;
  const raw = Array.isArray(m) ? m.map((item) => friendlyProfileMessage(String(item))).join(" ") : friendlyProfileMessage(String(m || e?.message || fallback));
  return raw || fallback;
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
