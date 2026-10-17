import React from 'react';
import { Pill, CheckCircle2, Clock, AlertTriangle, XCircle, FileText, Info } from 'lucide-react';
import { hcMarSheetApi, type HcMarSheet } from '../../../../services/homecareHelper';

interface MarSheetViewProps {
  sheet?: HcMarSheet | null;
  orderId?: string;
  className?: string;
}

export default function MarSheetView({ sheet: initialSheet, orderId, className = '' }: MarSheetViewProps) {
  const [sheet, setSheet] = React.useState<HcMarSheet | null>(initialSheet || null);

  React.useEffect(() => {
    if (initialSheet) {
      setSheet(initialSheet);
    } else if (orderId) {
      hcMarSheetApi(orderId)
        .then((res) => setSheet(res || null))
        .catch(() => setSheet(null));
    }
  }, [initialSheet, orderId]);

  if (!sheet || !sheet.schedules || sheet.schedules.length === 0) {
    return (
      <div className={`p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 ${className}`}>
        <Pill className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <div className="text-xs font-bold text-slate-700">No active medication administration schedules</div>
        <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
          Medications prescribed by the doctor or entered by the care manager will appear here for shift administration.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`} data-testid="mar-sheet">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Pill className="w-4 h-4 text-teal-700" />
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
            Medication Administration Record (MAR)
          </h4>
        </div>
        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
          Date: {sheet.date}
        </span>
      </div>

      <div className="space-y-3">
        {sheet.schedules.map((schedule) => (
          <div
            key={schedule.id}
            className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3"
            data-testid="mar-schedule-card"
          >
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-black text-slate-900 flex flex-wrap items-center gap-2">
                  <span>{schedule.medicine_name}</span>
                  <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                    {schedule.dose} · {schedule.route}
                  </span>
                </div>
                {schedule.instructions && (
                  <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Instructions: {schedule.instructions}
                  </div>
                )}
              </div>
              <div className="text-right">
                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                  schedule.status === 'ACTIVE'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {schedule.status}
                </span>
              </div>
            </div>

            {/* Scheduled Times & Entry Chips */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Scheduled Doses ({schedule.times.join(', ')})
              </div>

              {schedule.entries && schedule.entries.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {schedule.entries.map((entry) => (
                    <div
                      key={entry.id}
                      className={`p-2.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                        entry.status === 'GIVEN'
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                          : entry.status === 'HELD'
                          ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                          : 'bg-rose-50/70 border-rose-200 text-rose-900'
                      }`}
                    >
                      <div className="mt-0.5">
                        {entry.status === 'GIVEN' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : entry.status === 'HELD' ? (
                          <Clock className="w-4 h-4 text-amber-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-xs">
                            {entry.status} at {entry.scheduled_time}
                          </span>
                          {entry.is_correction && (
                            <span className="text-[10px] font-bold bg-white text-slate-600 border border-slate-200 px-1.5 rounded">
                              Corrected
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                          Administered by: <b>{entry.administered_by_name}</b>
                        </div>
                        {entry.reason && (
                          <div className="text-[11px] font-semibold text-slate-700 mt-0.5">
                            Reason: {entry.reason}
                          </div>
                        )}
                        {entry.correction_reason && (
                          <div className="text-[10px] text-slate-500 italic mt-0.5">
                            Audit correction: {entry.correction_reason}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-slate-400 font-medium italic">
                  Pending administration during current shift
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
