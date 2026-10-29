import type { PatientAddress } from '../../../services/patientHelper';
import type { PatientOrder, PharmacyRequestItem } from '../../../services/types';
import { quoteLines } from './prescriptionRequests';

export const money = (value: unknown): string => {
  if (value === null || value === undefined || String(value).trim() === '') return 'Price not provided';
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0
    ? `\u20b9${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : 'Price not provided';
};

export const moneyNumber = (value: unknown): number => {
  if (value === null || value === undefined || String(value).trim() === '') return NaN;
  return Number(value);
};

export const shortOrderId = (id: string | null | undefined): string =>
  id ? id.slice(0, 8).toUpperCase() : '';

export const dateTime = (value: string | null | undefined): string | null =>
  value && Number.isFinite(new Date(value).getTime())
    ? new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : null;

export const dayTime = (value: string | null | undefined): { day: string; time: string | null } | null => {
  if (!value || !Number.isFinite(new Date(value).getTime())) return null;
  const date = new Date(value);
  return {
    day: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }),
  };
};

export const deliveryEtaText = (value: string | null | undefined): string | null => {
  if (!value || !Number.isFinite(new Date(value).getTime())) return null;
  const eta = new Date(value);
  const today = new Date();
  const sameDay = eta.toDateString() === today.toDateString();
  const time = eta.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  if (sameDay) return `Today by ${time}`;
  return `${eta.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} by ${time}`;
};

export const orderStatusLabel = (order: PatientOrder): string => ({
  CREATED: order.payment_method === 'CASH' ? 'Awaiting confirmation' : 'Awaiting payment',
  AWAITING_PAYMENT: 'Payment required',
  PAID: 'Confirmed by pharmacy',
  PROCESSING: 'Being packed',
  READY_FOR_PICKUP: 'Ready for pickup',
  OUT_FOR_DELIVERY: 'Out for delivery',
  COMPLETED: order.fulfillment_type === 'PICKUP' ? 'Collected' : 'Delivered',
  CANCELLED: 'Cancelled',
  FULFILLMENT_FAILED: 'Could not be fulfilled',
} as Record<string, string>)[order.status] || order.status;

export const orderStatusTone = (order: PatientOrder): string => {
  if (order.status === 'CANCELLED' || order.status === 'FULFILLMENT_FAILED') return 'is-cancel';
  if (order.status === 'COMPLETED') return 'is-done';
  if (order.status === 'AWAITING_PAYMENT' || order.status === 'CREATED') return 'is-wait';
  return 'is-active';
};

export const orderGroup = (order: PatientOrder): 'active' | 'completed' | 'cancelled' =>
  order.status === 'COMPLETED' ? 'completed' : ['CANCELLED', 'FULFILLMENT_FAILED'].includes(order.status) ? 'cancelled' : 'active';

export const paymentStateLabel = (order: PatientOrder): string => {
  if (order.payment_status === 'PAID') return 'Paid';
  if (order.payment_status === 'REFUNDED') return 'Refunded';
  if (order.payment_status === 'REFUND_PENDING') return 'Refund pending';
  if (['CANCELLED', 'FULFILLMENT_FAILED'].includes(order.status)) return 'Unpaid';
  if (order.payment_method === 'CASH') return `Pay on ${order.fulfillment_type === 'PICKUP' ? 'pickup' : 'delivery'}`;
  return 'Unpaid';
};

export const onlinePaymentNeeded = (order: PatientOrder): boolean =>
  order.payment_method !== 'CASH' && ['CREATED', 'AWAITING_PAYMENT'].includes(order.status) && ['PENDING', 'FAILED'].includes(order.payment_status);

export const addressText = (address: PatientAddress): string =>
  [address.addressLine1, address.addressLine2, address.landmark, address.city, address.pincode]
    .filter(Boolean)
    .filter((part, index, all) => index === 0 || part?.trim().toLowerCase() !== all[index - 1]?.trim().toLowerCase())
    .join(', ');

/** The pharmacy's quote price for one medicine (same MRP is shown at every pharmacy until a quote changes it). */
export const quoteUnitPrice = (request: PharmacyRequestItem | null, medicineId: string | undefined): number | null => {
  if (!request || !medicineId) return null;
  const lines = quoteLines(request);
  const line = lines?.find((row) => row.available && row.medicine_id === medicineId);
  return line?.unit_price != null && Number.isFinite(Number(line.unit_price)) ? Number(line.unit_price) : null;
};

export const quoteTotal = (request: PharmacyRequestItem | null): number | null => {
  if (!request) return null;
  const stored = moneyNumber(request.quote_total);
  if (Number.isFinite(stored)) return stored;
  const lines = quoteLines(request);
  if (!lines || !lines.length) return null;
  return lines.filter((line) => line.available).reduce((sum, line) => sum + (Number(line.amount) || 0), 0);
};

export const errorText = (error: unknown, fallback: string): string => {
  const value = error as { response?: { data?: { message?: string | string[] } }; message?: string };
  const text = value.response?.data?.message || value.message || fallback;
  return Array.isArray(text) ? text.join(' ') : text;
};

export const validPin = (pincode: string | null | undefined): pincode is string => /^[1-9]\d{5}$/.test(String(pincode || '').trim());
