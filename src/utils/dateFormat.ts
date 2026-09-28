// Human dates for the patient app ("27 Sep 2026"), never raw ISO strings.
// A bare "YYYY-MM-DD" is read as a local calendar date, not UTC midnight (which would show the
// previous day for anyone west of UTC).
const toDate = (value?: string | Date | null): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

export const formatDate = (value?: string | Date | null, fallback = '—'): string => {
  const d = toDate(value);
  return d ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : fallback;
};

// "Mon, 28 Sep" — for upcoming appointments where the weekday matters more than the year.
export const formatDayDate = (value?: string | Date | null, fallback = '—'): string => {
  const d = toDate(value);
  return d ? d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' }) : fallback;
};

// "14:30:00" / "02:30 PM" → "2:30 PM"; anything unparseable is shown as-is.
export const formatTime = (value?: string | null): string => {
  if (!value) return '';
  const m = String(value).trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!m) return String(value);
  let h = Number(m[1]);
  const ap = m[3]?.toUpperCase();
  if (!ap) { const suffix = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${h}:${m[2]} ${suffix}`; }
  return `${h}:${m[2]} ${ap}`;
};
