import type { DashboardBooking } from '../services/dashboardHelper';
import { formatDoctorName } from './doctorLabel';

// One description of a booking for every list and card: what it is, with whom, when, where, for
// whom, its status in plain words, and where tapping it goes. Lab tests, doctor home visits, video
// and clinic visits never look alike, and a missing value is left out rather than shown as filler.
export type BookingKind = DashboardBooking['kind'];
export const KIND_LABEL: Record<BookingKind, string> = {
  DOCTOR_VISIT: 'Doctor visit', VIDEO_CONSULT: 'Video consultation', HOME_VISIT: 'Doctor home visit', LAB_TEST: 'Lab test', HOME_CARE: 'Home care',
};
const LAB_STATUS: Record<string, string> = { BOOKED: 'Booked', SAMPLE_PENDING: 'Sample pending', IN_PROGRESS: 'Being tested', PARTIALLY_REPORTED: 'Partial report', REPORTED: 'Report ready', CANCELLED: 'Cancelled' };

export interface BookingView {
  kind: BookingKind; kindLabel: string;
  title: string;              // "Dr. Meera Rao" or "Complete Blood Count + 1 more"
  business: string | null;    // "Apollo Clinic · Clinic" / "Sunrise Diagnostics · Laboratory"
  detail: string | null;      // department, or the test list
  date: string | null;        // YYYY-MM-DD
  time: string | null;        // HH:MM
  place: string | null;       // branch / centre / "At your home"
  forWhom: string | null;
  ref: string | null;
  status: string;
  href: string;               // where tapping it goes
  at: number;                 // sort key (visit time)
}

const sentence = (s: string) => { const t = String(s || '').replace(/_/g, ' ').toLowerCase(); return t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Pending'; };

export function bookingView(b: DashboardBooking, me?: string): BookingView {
  const lab = b.labOrder;
  const kind: BookingKind = b.kind || 'DOCTOR_VISIT';
  const hc = b.homeCare;
  if (hc) {
    const HC_STATUS: Record<string, string> = { REQUESTED: 'Finding a professional', CONFIRMED: 'Confirmed', IN_PROGRESS: 'Ongoing', COMPLETED: 'Completed', CANCELLED: 'Cancelled' };
    return {
      kind, kindLabel: KIND_LABEL.HOME_CARE,
      title: hc.service_name,
      business: `${hc.agency_name || b.business?.name || 'Home care agency'} · Home care`,
      detail: hc.sessions > 1 ? `${hc.done} of ${hc.sessions} ${hc.kind === 'SHIFT' ? 'shifts' : 'sessions'} done` : null,
      date: hc.next_date, time: hc.next_time, place: 'At your home',
      forWhom: hc.patient_name && hc.patient_name !== me ? hc.patient_name : null,
      ref: hc.order_number, status: HC_STATUS[hc.status] || sentence(hc.status),
      href: `/home-care?tab=mine&open=${encodeURIComponent(hc.id)}`,
      at: hc.next_date ? new Date(`${hc.next_date}T${hc.next_time || '00:00'}:00`).getTime() : Infinity,
    };
  }
  if (lab) {
    const tests = lab.tests || [];
    const date = lab.visit_date || null, time = lab.visit_time || null;
    return {
      kind, kindLabel: KIND_LABEL[kind],
      title: lab.package_name || (tests.length ? `${tests[0]}${tests.length > 1 ? ` + ${tests.length - 1} more` : ''}` : 'Lab tests'),
      business: `${lab.lab_name || b.business?.name || 'Laboratory'} · Laboratory`,
      detail: tests.length > 1 ? tests.join(', ') : null,
      date, time,
      place: lab.visit_type === 'HOME' ? 'Sample collection at your home' : lab.location_name,
      forWhom: lab.patient_name && lab.patient_name !== me ? lab.patient_name : null,
      ref: lab.order_number,
      status: LAB_STATUS[lab.status] || sentence(lab.status),
      href: `/lab-bookings?open=${encodeURIComponent(lab.id)}`,
      at: date ? new Date(`${date}T${time || '00:00'}:00`).getTime() : Infinity,
    };
  }
  const date = b.appointmentDate || b.bookingDate;
  const time = b.timeSlot ? String(b.timeSlot).slice(0, 5) : null;
  const doctor = formatDoctorName(b.doctorName);
  return {
    kind, kindLabel: KIND_LABEL[kind],
    title: doctor || (b.business?.name ?? KIND_LABEL[kind]),
    business: b.business?.name ? `${b.business.name} · ${b.business.type}` : null,
    detail: b.department || null,
    date, time,
    place: kind === 'HOME_VISIT' ? 'At your home' : kind === 'VIDEO_CONSULT' ? 'Video call on Vizito' : b.branchName || b.location || null,
    forWhom: b.patientName && b.patientName !== me ? b.patientName : null,
    ref: b.bookingNumber,
    status: sentence(b.status),
    href: kind === 'HOME_VISIT' ? '/home-care' : '/bookings',
    at: date ? new Date(`${String(date).slice(0, 10)}T${time || '00:00'}:00`).getTime() : Infinity,
  };
}
