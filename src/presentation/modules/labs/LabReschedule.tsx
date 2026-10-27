import { useEffect, useState } from 'react';
import {
  labAvailabilityApi,
  rescheduleMyLabOrderApi,
  labError,
  type LabAvailability,
} from '../../../services/labHelper';
import { dateLabel, timeLabel } from '../bookings/bookingsPresentation';
import LabTimeSlotOptions from './LabTimeSlotOptions';
import './LabSchedule.css';

type Order = {
  id: string;
  lab_partner_id?: string;
  location_id?: number;
  visit_type?: string;
  visit_date: string;
  visit_time: string;
  home_pincode?: string | null;
  can_reschedule?: boolean;
  reschedules_left?: number;
};
export default function LabReschedule({
  order,
  onMoved,
  startOpen = false,
  onClose,
}: {
  order: Order;
  onMoved: (text: string) => void;
  startOpen?: boolean;
  onClose?: () => void;
}) {
  const [open, setOpen] = useState(startOpen),
    [availability, setAvailability] = useState<LabAvailability | null>(null);
  const [date, setDate] = useState(''),
    [time, setTime] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [retry, setRetry] = useState(0),
    [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    let active = true;
    setAvailability(null);
    setError(null);
    if (!order.lab_partner_id || !order.location_id) {
      setError('The lab or collection centre is unavailable.');
      return;
    }
    labAvailabilityApi({
      lab_partner_id: order.lab_partner_id,
      location_id: order.location_id,
      visit_type: order.visit_type === 'HOME' ? 'HOME' : 'LAB_VISIT',
      ...(order.visit_type === 'HOME' && order.home_pincode
        ? { pincode: order.home_pincode }
        : {}),
    })
      .then((data) => {
        if (!active) return;
        setAvailability(data);
        setDate(
          data.days.find((day) => day.slots.some((s) => s.available && !(day.date === String(order.visit_date).slice(0,10) && s.time.slice(0,5) === order.visit_time.slice(0,5))))?.date ||
            '',
        );
        setTime('');
      })
      .catch((e) => {
        if (active) setError(labError(e, 'Could not load available times.'));
      });
    return () => {
      active = false;
    };
  }, [
    open,
    order.lab_partner_id,
    order.location_id,
    order.visit_type,
    order.home_pincode,
    retry,
  ]);
  const valid =
    !!availability?.bookable &&
    !!availability.days
      .find((d) => d.date === date)
      ?.slots.some((s) => s.time === time && s.available) &&
    !(
      date === String(order.visit_date).slice(0, 10) &&
      time === order.visit_time.slice(0, 5)
    );
  const save = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await rescheduleMyLabOrderApi(order.id, date, time);
      setOpen(false);
      onMoved(
        `Moved to ${dateLabel(result.visit_date)}, ${timeLabel(result.visit_time)}.${result.reschedules_left != null ? ` You can change it ${result.reschedules_left} more ${result.reschedules_left === 1 ? 'time' : 'times'}.` : ''}`,
      );
    } catch (e) {
      const message = labError(e, 'Could not move the visit.');
      if ((e as any)?.response?.status === 409) {
        setNotice(message);
        setTime('');
        setRetry((n) => n + 1);
      } else setError(message);
    } finally {
      setBusy(false);
    }
  };
  if (!open)
    return order.can_reschedule === false ? null : (
      <button className="bk-button" onClick={() => setOpen(true)}>
        Change date or time
      </button>
    );
  return (
    <section
      className="bk-reschedule"
      role="group"
      aria-label="Reschedule lab booking"
    >
      <h3>Choose a new time</h3>
      {order.reschedules_left != null && (
        <p>
          You can reschedule {order.reschedules_left} more{' '}
          {order.reschedules_left === 1 ? 'time' : 'times'}.
        </p>
      )}
      {notice && <p role="alert">{notice}</p>}
      {error && (
        <p role="alert">
          {error}{' '}
          <button onClick={() => setRetry((n) => n + 1)}>
            Retry availability
          </button>
        </p>
      )}
      {!availability && !error ? (
        <p role="status">Loading available times…</p>
      ) : availability && !availability.bookable ? (
        <p>{availability.reason || 'No available times.'}</p>
      ) : (
        availability && (
          <>
            <label>
              New date
              <select
                aria-label="New lab date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setTime('');
                }}
              >
                {availability.days.map((day) => (
                  <option
                    key={day.date}
                    value={day.date}
                    disabled={!day.slots.some((s) => s.available)}
                  >
                    {dateLabel(day.date)}
                  </option>
                ))}
              </select>
            </label>
            <div className="lab-schedule-slots">
              <LabTimeSlotOptions
                slots={
                  availability.days
                    .find((d) => d.date === date)
                    ?.slots.map((slot) => ({
                      ...slot,
                      available:
                        slot.available &&
                        !(
                          date === String(order.visit_date).slice(0, 10) &&
                          slot.time === order.visit_time.slice(0, 5)
                        ),
                    })) || []
                }
                time={time}
                onTime={(time) => {
                  setNotice(null);
                  setTime(time);
                }}
              />
            </div>
          </>
        )
      )}
      <div className="bk-panel-actions">
        <button
          className="bk-button"
          disabled={busy}
          onClick={() => {
            setOpen(false);
            onClose?.();
          }}
        >
          Keep current time
        </button>
        <button
          className="bk-button bk-primary"
          disabled={!valid || busy || order.can_reschedule === false}
          onClick={save}
        >
          {busy ? 'Moving…' : 'Confirm reschedule'}
        </button>
      </div>
    </section>
  );
}
