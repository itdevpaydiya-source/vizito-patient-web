import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { getProviderSlotsApi, type AvailableSlot } from '../../../services/bookingHelper';
import { rescheduleBookingApi, type DashboardBooking, type RescheduleResult } from '../../../services/dashboardHelper';
import { formatDayDate, formatTime } from '../../../utils/dateFormat';

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Move a visit to another free time with the same doctor at the same place. Changing doctor or place
// is a new booking (cancel + book), because the fee and the payment belong to this doctor and place.
const ReschedulePanel: React.FC<{
  booking: DashboardBooking;
  onDone: (r: RescheduleResult) => void;
  onCancel: () => void;
}> = ({ booking, onDone, onCancel }) => {
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return iso(d); }), []);
  const [day, setDay] = useState(days[0]);
  const [slots, setSlots] = useState<AvailableSlot[] | null>(null);
  const [picked, setPicked] = useState<AvailableSlot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!booking.providerId) return;
    setSlots(null); setPicked(null); setError(null);
    getProviderSlotsApi(booking.providerId, day, booking.facilityId || undefined, booking.hospitalPartnerId || undefined)
      .then((list) => setSlots(list.filter((s) => !(s as any).is_booked && (!booking.facilityId || Number(s.facility_id) === booking.facilityId))))
      .catch(() => setError('Could not load free times for this day.'));
  }, [day, booking.providerId, booking.facilityId, booking.hospitalPartnerId]);

  const confirm = async () => {
    if (!picked) return;
    setBusy(true); setError(null);
    try { onDone(await rescheduleBookingApi(booking.id, picked.time_slot_id)); }
    catch (e: any) { setError(e?.message || 'Could not reschedule.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4 space-y-3" role="group" aria-label="Reschedule this visit">
      <p className="text-sm font-extrabold text-slate-900 flex items-center gap-2"><CalendarClock className="w-4 h-4 text-sky-700" /> Choose a new time</p>
      <p className="text-xs text-slate-600">Same doctor{booking.branchName ? ` at ${booking.branchName}` : ''}. Your payment moves with the visit. You can reschedule up to 2 times.</p>
      <div className="flex gap-2 overflow-x-auto pb-1" role="radiogroup" aria-label="Day">
        {days.map((d) => (
          <button key={d} type="button" role="radio" aria-checked={day === d} onClick={() => setDay(d)}
            className={`shrink-0 px-3 py-1.5 rounded-xl border text-xs font-bold ${day === d ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-700'}`}>
            {formatDayDate(d)}
          </button>
        ))}
      </div>
      {slots === null && !error ? <p className="text-xs text-slate-500">Loading free times…</p>
        : slots && slots.length === 0 ? <p className="text-xs text-slate-600">No free times on this day. Try another day.</p>
          : slots && (
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Time">
              {slots.map((s) => (
                <button key={s.time_slot_id} type="button" role="radio" aria-checked={picked?.time_slot_id === s.time_slot_id} onClick={() => setPicked(s)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold ${picked?.time_slot_id === s.time_slot_id ? 'bg-teal-600 border-teal-600 text-white' : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'}`}>
                  {formatTime(s.start_time)}
                </button>
              ))}
            </div>
          )}
      {error && <p role="alert" className="text-xs font-bold text-rose-700">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs">Keep current time</button>
        <button type="button" onClick={confirm} disabled={!picked || busy} className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs">
          {busy ? 'Moving…' : picked ? `Move to ${formatDayDate(day)}, ${formatTime(picked.start_time)}` : 'Pick a time'}
        </button>
      </div>
    </div>
  );
};

export default ReschedulePanel;
