import apiClient from './index';

// Support tickets (gateway -> vizito-auth /support-tickets). "Contact Support" and "Report an
// Issue" both create one; replies from the Vizito support team show up in the ticket thread and
// in the notification bell.
export const SUPPORT_CATEGORIES = [
  'Booking & appointments',
  'Payment & refund',
  'Prescriptions & records',
  'Pharmacy order',
  'Account & login',
  'App problem',
  'Other',
] as const;

export type TicketKind = 'QUESTION' | 'ISSUE';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'AWAITING_YOU' | 'RESOLVED' | 'CLOSED';

export interface TicketMessage {
  id: string;
  author_type: 'requester' | 'support';
  author_name: string | null;
  body: string;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  ticket_number: string;
  kind: TicketKind;
  category: string;
  subject: string;
  description: string;
  booking_reference: string | null;
  priority: string;
  status: TicketStatus;
  respond_by: string;
  attachment_name: string | null;
  attachment_type: string | null;
  attachment_data?: string | null;
  has_attachment: boolean;
  last_reply_by: 'requester' | 'support' | null;
  created_at: string;
  updated_at: string;
  messages?: TicketMessage[];
}

export interface NewTicket {
  kind: TicketKind;
  category: string;
  subject: string;
  description: string;
  booking_reference?: string;
  attachment_name?: string;
  attachment_data?: string;
}

const errorText = (e: any, fallback: string) => {
  const m = e?.response?.data?.message;
  return Array.isArray(m) ? m.join(' ') : m ? String(m) : fallback;
};

export const createTicketApi = async (t: NewTicket): Promise<SupportTicket> => {
  try {
    return (await apiClient.post('/support-tickets', t)).data;
  } catch (e) {
    throw new Error(errorText(e, 'Could not send your request. Please try again.'));
  }
};

export const getMyTicketsApi = async (): Promise<SupportTicket[]> => {
  const res = await apiClient.get('/support-tickets');
  return Array.isArray(res.data) ? res.data : [];
};

export const getTicketApi = async (id: string): Promise<SupportTicket> => (await apiClient.get(`/support-tickets/${id}`)).data;

export const replyTicketApi = async (id: string, body: string): Promise<SupportTicket> => {
  try {
    return (await apiClient.post(`/support-tickets/${id}/messages`, { body })).data;
  } catch (e) {
    throw new Error(errorText(e, 'Could not send your reply.'));
  }
};

export const closeTicketApi = async (id: string): Promise<SupportTicket> => (await apiClient.post(`/support-tickets/${id}/close`, {})).data;

export const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('Could not read the file.'));
    r.readAsDataURL(file);
  });
