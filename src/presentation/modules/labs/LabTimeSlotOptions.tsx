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
    <div role="group" aria-label="Visit time">
      {groupSlots(slots).map((group) => (
        <div key={group.name} className="lab-schedule-slot-group">
          <h4>{group.name}</h4>
          <div>
            {group.slots.map((slot) => (
              <button
                key={slot.time}
                type="button"
                disabled={!slot.available}
                aria-pressed={time === slot.time}
                onClick={() => onTime(slot.time)}
              >
                {slotLabel(slot.time)}
                {slotRemaining(slot) && <small>{slotRemaining(slot)}</small>}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
