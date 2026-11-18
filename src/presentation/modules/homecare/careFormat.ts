/** Labels, colours and links shared by Home care › home and search (kept out of the component files). */
import { CARE_TAB, type SearchHit } from './careSearchLogic';

const ist = (o = 0) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + o * 86400000));
export const time12 = (t: string) => { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; };
/** "Today, 4:00 PM" / "Tomorrow, 9:00 AM" / "Fri 27 Nov, 9:00 AM". */
export const whenLabel = (at?: { date: string; time: string } | null) => {
  if (!at) return null;
  const day = at.date === ist() ? 'Today' : at.date === ist(1) ? 'Tomorrow' : new Date(`${at.date}T12:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  return `${day}, ${time12(at.time)}`;
};
export const CARE_CHIP: Record<string, string> = {
  NURSING: 'bg-[#FFF1E8] text-[#9A3412]', PHYSIOTHERAPY: 'bg-[#EEF2FF] text-[#3730A3]', CAREGIVER: 'bg-[#FDF2F8] text-[#9D174D]', DOCTOR: 'bg-[#E3F4F1] text-[#0B4F4A]',
};
export const card = 'rounded-2xl border border-[#DFE8F3] bg-white';

/** Where a result's Book button goes: the agency booking for that exact service, or the doctor's home-visit booking. */
export const bookHref = (h: SearchHit, pincode: string) => h.type === 'service'
  ? `/home-care?${new URLSearchParams({ tab: CARE_TAB[h.s.category], agency: h.s.agency.id, service: h.s.id })}`
  : `/home-care/doctor/${encodeURIComponent(h.d.doctor_partner_id)}?${new URLSearchParams({ pincode })}`;

