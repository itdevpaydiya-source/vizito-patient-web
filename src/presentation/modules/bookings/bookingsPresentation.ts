import {shortOrderId} from '../../../utils/paymentLabels';
import {dedupeAddressParts} from '../../../utils/address';
import type { PatientOrder } from '../../../services/types';
import type { ProviderDetail } from '../../../services/bookingHelper';
import type { RentalBookingOrder } from '../equipment/equipmentService';
import type { DashboardBooking } from '../../../services/dashboardHelper';
import type { MyLabOrder, MyLabOrderDetail } from '../../../services/labHelper';
import type { HcOrder } from '../../../services/homecareHelper';
import { formatDoctorName } from '../../../utils/doctorLabel';
import { calendarEscape } from '../labs/labConfirmationDetails';

export type BookingStatus = 'upcoming' | 'completed' | 'cancelled';
export type BookingType = 'Doctor' | 'Lab Test' | 'Home Care' | 'Hospital' | 'Pharmacy' | 'Equipment';
export type Booking = Partial<DashboardBooking> & {
  id: string; status: string;
  dashboard?: DashboardBooking;
  pharmacy?: PatientOrder;
  pharmacyProvider?: ProviderDetail | null;
  deliveryAddress?: string | null;
  rental?: RentalBookingOrder;
  section: BookingStatus;
  lab?: MyLabOrder | MyLabOrderDetail;
  care?: HcOrder;
};
export const typeOf = (b: Booking): BookingType =>
  b.pharmacy ? 'Pharmacy' : b.rental ? 'Equipment' : b.labOrder ? 'Lab Test' : b.homeCare ? 'Home Care' : b.business?.type === 'Hospital' ? 'Hospital' : 'Doctor';
export const statusOf = (b: DashboardBooking): BookingStatus => {
  const s = (
    b.labOrder?.status ||
    b.homeCare?.status ||
    b.status
  ).toUpperCase();
  return /CANCEL|DECLIN|REJECT/.test(s)
    ? 'cancelled'
    : /COMPLETED|REPORTED|NO_SHOW|FAILED/.test(s) && s !== 'PARTIALLY_REPORTED'
      ? 'completed'
      : 'upcoming';
};
export const titleOf = (b: Booking) =>
  b.pharmacy ? 'Pharmacy Order' : b.rental ? 'Equipment Rental' : b.labOrder
    ? `Lab Tests (${b.labOrder.tests.length})` : b.homeCare ? 'Home Care Visit'
    : b.business?.type === 'Hospital' ? 'Hospital Appointment' : 'Doctor Appointment';
export const subtitleOf = (b: Booking): string[] => {
  const value = b.pharmacy ? b.pharmacyProvider?.business_name : b.rental ? b.rental.provider?.name
    : b.labOrder ? b.labOrder.lab_name : b.homeCare ? b.homeCare.service_name
    : b.business?.type === 'Hospital' ? b.business.name
    : [formatDoctorName(b.provider?.doctor?.name || b.doctorName), b.provider?.doctor?.speciality || b.department].filter(Boolean).join(' • ');
  return value ? [value] : [];
};
export const homeOf = (b: Booking) =>
  !!b.homeCare || b.kind === 'HOME_VISIT' || b.labOrder?.visit_type === 'HOME';
const careVisit = (b: Booking) =>
  b.care?.next_visit ||
  b.homeCare?.next_visit ||
  b.care?.visits[b.care.visits.length - 1];
export const dateOf = (b: Booking) =>
  (b.pharmacy?.created_at?.slice(0, 10)) || b.rental?.start_date?.slice(0,10) ||
  careVisit(b)?.date ||
  b.homeCare?.next_date ||
  b.labOrder?.visit_date ||
  b.appointmentDate ||
  b.bookingDate || null;
export function clock(value?: string | null): string | null {
  if (value?.includes('T')) {
    const date = new Date(value);
    return Number.isFinite(date.getTime())
      ? date.toLocaleTimeString('en-GB', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      : null;
  }
  const m = value?.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i);
  if (!m) return null;
  let h = Number(m[1]);
  if (m[3]) h = (h % 12) + (m[3].toUpperCase() === 'PM' ? 12 : 0);
  return `${String(h).padStart(2, '0')}:${m[2]}`;
}
export const timeOf = (b: Booking) =>
  clock(
    careVisit(b)?.start_time ||
      b.homeCare?.next_time ||
      b.labOrder?.visit_time ||
      b.timeSlot,
  );
export function endOf(b: Booking): string | null {
  const careEnd = clock(careVisit(b)?.end_time);
  if (careEnd) return careEnd;
  const explicit = b.timeSlot?.split(/\s*[–-]\s*/)[1];
  if (explicit) return clock(explicit);
  return ['Doctor', 'Hospital'].includes(typeOf(b)) ? clock(b.endTime) : null;
}
export const timeLabel = (t: string | null) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};
export const timeRange = (b: Booking) =>
  [timeLabel(timeOf(b)), timeLabel(endOf(b))].filter(Boolean).join(' – ');
export const dateLabel = (d: string | null) =>
  d
    ? new Date(`${d.slice(0, 10)}T12:00:00+05:30`)
        .toLocaleDateString('en-GB', {
          timeZone: 'Asia/Kolkata',
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
        .replace(/^(\w{3}) /, '$1, ')
    : '';
export const placeOf = (b: Booking) =>
  b.pharmacy ? (b.pharmacy.fulfillment_type === 'DELIVERY' ? 'Home Delivery' : b.pharmacyProvider?.business_name) : b.rental ? 'Home Delivery' : homeOf(b)
    ? 'Home Visit'
    : b.labOrder
      ? b.labOrder.lab_name
      : b.kind === 'VIDEO_CONSULT'
        ? 'Video consultation'
        : b.branchName || b.business?.name;
export const addressOf = (b: Booking) => { const address =
  b.pharmacy ? (b.pharmacy.fulfillment_type === 'DELIVERY' ? b.deliveryAddress : b.pharmacyProvider?.pharmacy?.address) : b.rental ? [b.rental.delivery_address?.addressLine,b.rental.delivery_address?.city,b.rental.delivery_address?.pincode].filter(Boolean).join(', ') :
  b.care?.address || (b.provider?.place ? [b.provider.place.address, b.provider.place.city, b.provider.place.pincode].filter((value,index,all)=>!!value && !all.slice(0,index).some(earlier=>earlier?.toLowerCase().includes(value!.toLowerCase()))).join(', ') : null) ||
  (b.lab?.visit_type === 'HOME'
    ? b.lab.home_address
    : b.lab?.location_address) ||
  b.location;
  return address ? dedupeAddressParts(address) : address;
};
export const refOf = (b: Booking) =>
  (b.pharmacy ? shortOrderId(b.pharmacy.id) : null) || b.rental?.order_number || b.labOrder?.order_number || b.homeCare?.order_number || b.bookingNumber;
export const permissionsOf = (b: Booking) =>
  b.visit || b.lab || b.labOrder || b.care || b.homeCare;
export const canCancel = (b: Booking) => {
  if (['Doctor','Hospital'].includes(typeOf(b))) return b.visit?.can_cancel === true;
  if (b.section !== 'upcoming') return false;
  if (b.pharmacy) return ['CREATED','AWAITING_PAYMENT','PAID'].includes(b.pharmacy.status);
  if (b.rental) return ['NEW','ACCEPTED'].includes(b.rental.status) && !b.rental.delivery_address?.return_schedule
    && !['out_for_delivery','delivered'].includes(b.rental.delivery_address?.delivery_status || '') && !b.rental.delivery_address?.delivery_otp?.verified;
  return permissionsOf(b)?.can_cancel === true;
};
export const canReschedule = (b: Booking) => !b.pharmacy && !b.rental && permissionsOf(b)?.can_reschedule === true;
export const commerceStatus = (status: string): BookingStatus => /CANCEL|REJECT|FULFILLMENT_FAILED/.test(status) ? 'cancelled' : status === 'COMPLETED' ? 'completed' : 'upcoming';
export const statusText = (b: Booking) =>
  b.section === 'cancelled'
    ? 'Cancelled'
    : b.section === 'completed'
      ? 'Completed'
      : 'Upcoming';

/** A start-only event stays start-only when the API has no end time; never assume a duration. */
export function bookingIcs(b: Booking) {
  const date = dateOf(b),
    time = timeOf(b);
  if (!date || !time)
    throw new Error('The booking date or time is unavailable.');
  const start = new Date(`${date}T${time}:00+05:30`);
  if (!Number.isFinite(start.getTime()))
    throw new Error('The booking date or time is unavailable.');
  const stamp = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z$/, 'Z');
  const endTime = endOf(b);
  const end = endTime ? new Date(`${date}T${endTime}:00+05:30`) : null;
  if (end && end <= start) end.setUTCDate(end.getUTCDate() + 1);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Vizito//Bookings//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${calendarEscape(b.id)}@vizito`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    end ? `DTEND:${stamp(end)}` : null,
    `SUMMARY:${calendarEscape(titleOf(b))}`,
    addressOf(b) || placeOf(b)
      ? `LOCATION:${calendarEscape([placeOf(b), addressOf(b)].filter(Boolean).join(', '))}`
      : null,
    refOf(b)
      ? `DESCRIPTION:${calendarEscape(`Booking ID: ${refOf(b)}`)}`
      : null,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter((v): v is string => v !== null);
  return (
    lines
      .map((line) => {
        let out = '',
          part = '',
          bytes = 0;
        for (const char of line) {
          const n = new TextEncoder().encode(char).length;
          if (bytes + n > 75) {
            out += part + '\r\n';
            part = ' ';
            bytes = 1;
          }
          part += char;
          bytes += n;
        }
        return out + part;
      })
      .join('\r\n') + '\r\n'
  );
}
