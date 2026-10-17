// What a patient takes away from a confirmed booking: a printable receipt and a calendar entry.
export interface BookingSummary {
  reference: string;
  doctor: string;
  place?: string | null;
  address?: string | null;
  date: string;        // YYYY-MM-DD
  time?: string | null; // HH:MM[:SS]
  durationMinutes?: number | null;
  patient: string;
  paymentMode: string;
  amount: number;
  paid: boolean;
}

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const friendlyDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const friendlyTime = (t?: string | null) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
};

/** Opens a clean printable receipt (the browser's Print dialog also saves it as PDF). */
export function printBookingReceipt(b: BookingSummary) {
  const w = window.open('', '_blank', 'width=720,height=900');
  if (!w) return false;
  const row = (k: string, v: string) => (v ? `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>` : '');
  w.document.write(`<!doctype html><html><head><title>Vizito booking ${esc(b.reference)}</title>
<style>body{font:14px system-ui,sans-serif;color:#1f2937;margin:32px}h1{font-size:20px;margin:0}p{color:#6b7280;margin:4px 0 20px}
table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:8px 0;border-bottom:1px solid #e5e7eb}th{color:#6b7280;font-weight:600;width:40%}
.ref{font:700 22px ui-monospace,monospace;letter-spacing:1px;margin:16px 0}.note{margin-top:20px;font-size:12px;color:#6b7280}</style></head><body>
<h1>Vizito · Appointment receipt</h1><p>Show this booking reference at the reception.</p>
<div class="ref">${esc(b.reference)}</div>
<table>${row('Doctor', b.doctor)}${row('Clinic', b.place || '')}${row('Address', b.address || '')}${row('Date', friendlyDate(b.date))}${row('Time', friendlyTime(b.time))}
${row('Patient', b.patient)}${row('Payment', b.paymentMode)}${row(b.paid ? 'Amount paid' : 'Amount to pay at clinic', `₹${b.amount.toLocaleString('en-IN')}`)}</table>
<p class="note">Generated ${esc(new Date().toLocaleString('en-IN'))}. Please arrive 10 minutes early.</p>
<script>window.onload=function(){window.print()}</script></body></html>`);
  w.document.close();
  return true;
}

/** Downloads an .ics file the phone or laptop calendar can add (with a 1-hour reminder). */
export function downloadCalendarEntry(b: BookingSummary) {
  const [y, mo, d] = b.date.split('-').map(Number);
  const [h, m] = (b.time || '09:00').split(':').map(Number);
  const start = new Date(y, mo - 1, d, h, m);
  const end = new Date(start.getTime() + (b.durationMinutes || 15) * 60000);
  const stamp = (x: Date) => x.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const text = (s: string) => s.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Vizito//Booking//EN', 'BEGIN:VEVENT',
    `UID:${b.reference}@vizito.in`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`,
    `SUMMARY:${text(`Doctor visit: ${b.doctor}`)}`,
    `LOCATION:${text([b.place, b.address].filter(Boolean).join(', '))}`,
    `DESCRIPTION:${text(`Vizito booking ${b.reference}. Show this reference at the reception.`)}`,
    'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY', 'DESCRIPTION:Doctor visit in 1 hour', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `vizito-${b.reference}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
