import { useEffect, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import apiClient from '../../../services/index';
import { labPublicApi, labError, type LabHours, type LabSettings } from '../../../services/labHelper';

// Move a lab visit to another time before the sample is taken. Days and times come from this lab's
// own hours (centre) or its home-collection window; the server checks the same rules again.
const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const label12 = (t: string) => { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; };

export default function LabReschedule({ order, onMoved }: { order: { id: string; lab_partner_id?: string; location_id?: number; visit_type?: string; visit_date: string; visit_time: string }; onMoved: (text: string) => void }) {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<LabSettings | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (open && !settings && order.lab_partner_id) labPublicApi(order.lab_partner_id).then((d) => setSettings(d.settings)).catch((e) => setErr(labError(e, 'Could not load the lab’s hours.'))); }, [open, settings, order.lab_partner_id]);

  const windowOn = (d: string): LabHours | null => {
    if (!settings) return null;
    if (order.visit_type === 'HOME') return { open: settings.home.open, close: settings.home.close };
    return settings.centre_hours?.[String(order.location_id)]?.[new Date(`${d}T00:00:00`).getDay()] ?? null;
  };
  const slots = (d: string) => {
    const w = windowOn(d);
    if (!w) return [];
    const out: string[] = [];
    for (let m = toMin(w.open); m < toMin(w.close); m += 30) {
      const t = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
      if (new Date(`${d}T${t}:00`).getTime() >= Date.now() + 15 * 60000 && !(d === String(order.visit_date).slice(0, 10) && t === order.visit_time)) out.push(t);
    }
    return out;
  };
  const days = Array.from({ length: 10 }, (_, i) => { const d = new Date(Date.now() + i * 86400000); return { iso: iso(d), label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }) }; });
  useEffect(() => { if (settings && !date) { const first = days.find((d) => slots(d.iso).length); if (first) setDate(first.iso); } }, [settings]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    setBusy(true); setErr(null);
    try {
      const r = (await apiClient.post(`/lab-orders/${encodeURIComponent(order.id)}/reschedule`, { visit_date: date, visit_time: time })).data;
      setOpen(false);
      onMoved(`Moved to ${days.find((d) => d.iso === date)?.label}, ${label12(time)}.${r.reschedules_left > 0 ? ` You can change it ${r.reschedules_left} more time${r.reschedules_left === 1 ? '' : 's'}.` : ''}`);
    } catch (e) { setErr(labError(e, 'Could not move the visit.')); } finally { setBusy(false); }
  };

  if (!open) return <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:underline"><CalendarClock className="w-4 h-4" /> Change date or time</button>;
  return (
    <section aria-label="Change date or time" className="rounded-xl border border-teal-200 bg-teal-50/40 p-3 space-y-2">
      <p className="text-sm font-black text-slate-900 flex items-center gap-1.5"><CalendarClock className="w-4 h-4 text-teal-700" /> Choose a new time</p>
      <p className="text-[11px] text-slate-600">Same lab and tests; your payment stays with the booking. You can move it up to 2 times before the sample is taken.</p>
      {err && <p role="alert" className="text-xs font-semibold text-rose-700">{err}</p>}
      {!settings ? !err && <p className="text-xs text-slate-400">Loading the lab’s hours…</p> : (<>
        <div className="flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="New date">
          {days.map((d) => { const n = slots(d.iso).length; return (
            <button key={d.iso} type="button" disabled={!n} aria-pressed={date === d.iso} onClick={() => { setDate(d.iso); setTime(''); }}
              className={`shrink-0 px-3 py-1.5 rounded-lg border text-xs font-bold ${!n ? 'bg-slate-50 text-slate-300 border-slate-100' : date === d.iso ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'}`}>{d.label}{!n ? ' · closed' : ''}</button>
          ); })}
        </div>
        {date && <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="New time">
          {slots(date).map((t) => <button key={t} type="button" aria-pressed={time === t} onClick={() => setTime(t)} className={`px-2 py-1.5 rounded-lg border text-xs font-bold tabular-nums ${time === t ? 'bg-teal-700 text-white border-teal-700' : 'bg-white text-slate-700 border-slate-200'}`}>{label12(t)}</button>)}
        </div>}
        <div className="flex gap-2">
          <button type="button" disabled={busy || !date || !time} onClick={save} className="px-3 py-2 rounded-lg bg-teal-700 text-white text-xs font-bold disabled:opacity-50">{time ? `Move to ${label12(time)}` : 'Choose a time'}</button>
          <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 text-xs font-bold text-slate-500">Keep current time</button>
        </div>
      </>)}
    </section>
  );
}
