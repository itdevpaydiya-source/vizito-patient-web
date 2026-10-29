import type { HcCategory, HcOrder, HcService, HcVisit } from '../../../services/homecareHelper';
import { openRecordBlob } from '../records/recordsApi';

// Pure helpers for the v2 home-care flow. Everything here works from the real catalogue/order
// payloads: no invented agency, price, rating, distance or professional is ever produced.

export const UNIT_OF = (s: Pick<HcService, 'kind'>) => (s.kind === 'VISIT' ? 'visit' : 'shift');

export function durationText(minutes: number | null | undefined, shiftHours: number | null | undefined): string {
  if (shiftHours) return `${shiftHours}-hour shift`;
  if (minutes == null) return '';
  if (minutes < 60) return `${minutes} minutes`;
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return `${h} hour${h === 1 ? '' : 's'}${m ? ` ${m} minutes` : ''}`;
}

export function perLabel(minutes: number | null | undefined, shiftHours: number | null | undefined, kind: 'VISIT' | 'SHIFT'): string {
  const d = durationText(minutes, shiftHours);
  return kind === 'VISIT' ? `per visit${d ? ` (${d})` : ''}` : `per shift${d ? ` (${d})` : ''}`;
}

export interface HcPackage {
  key: string;
  category: HcCategory;
  categoryLabel: string;
  kind: 'VISIT' | 'SHIFT';
  name: string;
  description: string | null;
  includes: string[];
  minutes: number | null;
  shiftHours: number | null;
  duration: string;
  services: HcService[];
  from: number;
}

export const packageKeyOf = (s: HcService) => `${s.category}:${s.kind === 'VISIT' ? `v${s.duration_minutes ?? 0}` : `s${s.shift_hours ?? 0}`}`;

/** Packages = the same kind of service across agencies (category + kind + duration), lowest real price wins. */
export function buildPackages(services: HcService[], category?: HcCategory): HcPackage[] {
  const groups = new Map<string, HcService[]>();
  for (const s of services) {
    if (category && s.category !== category) continue;
    const key = packageKeyOf(s);
    const list = groups.get(key);
    if (list) list.push(s); else groups.set(key, [s]);
  }
  const rows: HcPackage[] = [];
  for (const [key, list] of groups) {
    const cheapest = [...list].sort((a, b) => a.price - b.price)[0];
    const nameCount = new Map<string, number>();
    for (const s of list) nameCount.set(s.name, (nameCount.get(s.name) || 0) + 1);
    const name = [...nameCount.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const named = list.filter(s => s.name === name);
    rows.push({
      key,
      category: cheapest.category,
      categoryLabel: cheapest.category_label,
      kind: cheapest.kind,
      name,
      description: named.find(s => s.description)?.description ?? list.find(s => s.description)?.description ?? null,
      includes: [...new Set(list.map(s => s.includes).filter((x): x is string => !!x))],
      minutes: cheapest.duration_minutes,
      shiftHours: cheapest.shift_hours,
      duration: durationText(cheapest.duration_minutes, cheapest.shift_hours),
      services: list,
      from: Math.min(...list.map(s => s.price)),
    });
  }
  return rows.sort((a, b) => a.category.localeCompare(b.category) || (a.kind === b.kind ? 0 : a.kind === 'VISIT' ? -1 : 1) || (a.minutes ?? (a.shiftHours ?? 0) * 60) - (b.minutes ?? (b.shiftHours ?? 0) * 60));
}

export const findPackage = (services: HcService[], key: string | null) => (key ? buildPackages(services).find(p => p.key === key) ?? null : null);

/** Cheapest real service for this package at this agency. */
export function serviceForAgency(pkg: HcPackage, agencyId: string | null): HcService | null {
  if (!agencyId) return null;
  const rows = pkg.services.filter(s => s.agency.id === agencyId).sort((a, b) => a.price - b.price);
  return rows[0] || null;
}

export function agenciesForPackage(pkg: HcPackage): { id: string; service: HcService }[] {
  const byAgency = new Map<string, HcService>();
  for (const s of [...pkg.services].sort((a, b) => a.price - b.price)) if (!byAgency.has(s.agency.id)) byAgency.set(s.agency.id, s);
  return [...byAgency.entries()].map(([id, service]) => ({ id, service }));
}

export const money = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export const monthYear = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
};

export const dateLong = (date: string) => new Date(`${date}T00:00:00+05:30`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
export const dateShort = (date: string) => new Date(`${date}T00:00:00+05:30`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
export const dateTiny = (date: string) => new Date(`${date}T00:00:00+05:30`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

export const time12 = (t: string | null | undefined) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return t;
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

export const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
export const hm = (m: number) => `${String(Math.floor((m % 1440) / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export function endTime(start: string, minutes: number): { time: string; nextDay: boolean } {
  const total = toMin(start) + minutes;
  return { time: hm(total), nextDay: total >= 1440 };
}

export const isoToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export const isoAdd = (days: number) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + days * 86400000));

export interface DayChip { iso: string; week: string; day: string; month: string; today: boolean }

export function dayChips(count = 7): DayChip[] {
  return Array.from({ length: count }, (_, i) => {
    const iso = isoAdd(i);
    const d = new Date(`${iso}T00:00:00+05:30`);
    return {
      iso,
      week: i === 0 ? 'Today' : d.toLocaleDateString('en-IN', { weekday: 'short' }),
      day: String(d.getDate()).padStart(2, '0'),
      month: d.toLocaleDateString('en-IN', { month: 'short' }),
      today: i === 0,
    };
  });
}

export interface SlotGroup { label: string; slots: string[] }

/** Real start times inside the agency's working hours, respecting the service's earliest start and a
 *  two-hour lead time. Shifts keep the agency's two standard start times instead of every hour. */
export function slotGroups(service: HcService, date: string): SlotGroup[] {
  const earliest = service.earliest_start;
  if (earliest) {
    if (date < earliest.date) return [];
    if (date === earliest.date && earliest.time >= '22:00') return [];
  }
  const lead = Date.now() + 2 * 3600000;
  const duration = service.kind === 'SHIFT' ? (service.shift_hours || 12) * 60 : service.duration_minutes || 60;
  let raw: string[] = [];
  if (service.kind === 'SHIFT') {
    raw = (service.shift_hours || 12) >= 24 ? ['08:00'] : ['08:00', '20:00'];
  } else {
    const close = toMin(service.agency.day_close || '22:00');
    for (let m = toMin(service.agency.day_open || '06:00'); m + duration <= close; m += 60) raw.push(hm(m));
  }
  const out = raw.filter(t => {
    const at = new Date(`${date}T${t}:00+05:30`).getTime();
    if (at < lead) return false;
    if (earliest && date === earliest.date && t < earliest.time) return false;
    return true;
  });
  const groups: SlotGroup[] = [
    { label: 'Morning', slots: out.filter(t => toMin(t) < 720) },
    { label: 'Afternoon', slots: out.filter(t => toMin(t) >= 720 && toMin(t) < 1080) },
    { label: 'Evening', slots: out.filter(t => toMin(t) >= 1080) },
  ];
  return groups.filter(g => g.slots.length);
}

export const earliestDate = (service: HcService | null) => service?.earliest_start?.date || isoToday();

export const initialsOf = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0] || 'HC').slice(0, 2).toUpperCase();
};

export const fullAddress = (o: Pick<HcOrder, 'address'>) => o.address;

export const statusText: Record<string, string> = {
  REQUESTED: 'Agency to confirm',
  CONFIRMED: 'Confirmed',
  IN_PROGRESS: 'Visit in progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const VISIT_STATUS_LABEL: Record<string, string> = {
  SCHEDULED: 'Scheduled',
  ON_THE_WAY: 'On the way',
  ARRIVED: 'Arrived',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Visit done',
  NO_SHOW: 'Missed',
  DISPUTED: 'Under review',
  PROVIDER_MISSED: 'Missed by the professional',
  FAILED: 'Could not be done',
  CANCELLED: 'Cancelled',
};

export const professionalRole = (roleLabel: string | null | undefined) => roleLabel || 'Care professional';

export function personYears(years: number | null | undefined) {
  if (years == null) return '';
  return `${years} year${years === 1 ? '' : 's'} experience`;
}

/** Calendar file for the first upcoming visit. */
export function addOrderToCalendar(order: HcOrder) {
  const v = order.visits.find(x => !['CANCELLED', 'COMPLETED', 'FAILED', 'NO_SHOW'].includes(x.status)) || order.visits[0];
  if (!v) return false;
  const start = `${v.date.replaceAll('-', '')}T${v.start_time.replaceAll(':', '').slice(0, 4)}00`;
  const endDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.parse(`${v.date}T00:00:00+05:30`) + (v.ends_next_day ? 86400000 : 0)));
  const end = `${endDay.replaceAll('-', '')}T${v.end_time.replaceAll(':', '').slice(0, 4)}00`;
  const clean = (s: string) => s.replace(/[\r\n]/g, ' ').replace(/[,;]/g, ' ');
  const text = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Vizito//Home Care//EN\r\nBEGIN:VEVENT\r\nUID:${order.id}@vizito\r\nDTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z/, 'Z')}\r\nDTSTART;TZID=Asia/Kolkata:${start}\r\nDTEND;TZID=Asia/Kolkata:${end}\r\nSUMMARY:${clean(order.service_name)}\r\nLOCATION:${clean(order.address)}\r\nDESCRIPTION:${clean(`Booking ${order.order_number} · ${order.agency_name || ''}`)}\r\nEND:VEVENT\r\nEND:VCALENDAR`;
  openRecordBlob(new Blob([text], { type: 'text/calendar' }), 'vizito-home-care.ics', true);
  return true;
}
