import type { LabSlot } from '../../../services/labHelper';
import { groupSlots, slotLabel, slotRemaining } from './labScheduleDetails';

/** The same availability-backed time picker for booking and rescheduling. */
export default function LabTimeSlotOptions({
  slots,
  time,
  onTime,
}: {
  slots: LabSlot[];
  time: string;
  onTime: (time: string) => void;
}) {
  return (
    <div role="group" aria-label="Visit time" className="space-y-4">
      {groupSlots(slots).map((group) => (
        <div key={group.name} className="lab-schedule-slot-group space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            {group.name}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {group.slots.map((slot) => {
              const active = time === slot.time;
              return (
                <button
                  key={slot.time}
                  type="button"
                  disabled={!slot.available}
                  aria-pressed={active}
                  onClick={() => onTime(slot.time)}
                  className={`py-2 px-3 rounded-xl border text-center transition flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                    active
                      ? 'bg-orange-600 border-orange-600 text-white font-bold shadow-xs ring-2 ring-orange-600/20'
                      : slot.available
                      ? 'bg-white border-slate-200 text-slate-800 hover:border-teal-500 hover:bg-teal-50/30 font-semibold'
                      : 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed opacity-50'
                  }`}
                >
                  <span className="text-xs font-bold">{slotLabel(slot.time)}</span>
                  {slotRemaining(slot) && (
                    <small className={`text-[10px] ${active ? 'text-orange-100' : 'text-slate-400'}`}>
                      {slotRemaining(slot)}
                    </small>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
