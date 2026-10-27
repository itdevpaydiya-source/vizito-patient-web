/** Patient action permissions are computed by the backend, never inferred for labs/home care. */
export interface BookingActions {
  can_reschedule?: boolean;
  reschedules_left?: number;
  reschedule_unavailable_reason?: string | null;
  can_cancel?: boolean;
  cancel_unavailable_reason?: string | null;
}
export interface NextCareVisit {
  id: string;
  date: string;
  start_time: string;
  end_time: string | null;
}
