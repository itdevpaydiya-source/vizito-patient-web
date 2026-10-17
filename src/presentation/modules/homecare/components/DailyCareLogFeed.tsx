import React from 'react';
import { Activity, AlertTriangle, Coffee, Moon, Smile, CheckCircle2, Clock, Calendar } from 'lucide-react';
import { hcDailyLogsForOrderApi, type HcDailyLog } from '../../../../services/homecareHelper';

interface DailyCareLogFeedProps {
  logs?: HcDailyLog[];
  orderId?: string;
  className?: string;
}

export default function DailyCareLogFeed({ logs: initialLogs, orderId, className = '' }: DailyCareLogFeedProps) {
  const [logs, setLogs] = React.useState<HcDailyLog[]>(initialLogs || []);

  React.useEffect(() => {
    if (initialLogs) {
      setLogs(initialLogs);
    } else if (orderId) {
      hcDailyLogsForOrderApi(orderId)
        .then((res) => setLogs(res || []))
        .catch(() => setLogs([]));
    }
  }, [initialLogs, orderId]);

  if (!logs || logs.length === 0) {
    return (
      <div className={`p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 ${className}`}>
        <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <div className="text-xs font-bold text-slate-700">No shift care logs recorded yet</div>
        <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
          Caregivers record vitals, meals, hydration, and ADL activities at the end of each shift. Logs will appear here live.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`} data-testid="daily-care-logs">
      {logs.map((log) => {
        const vitals = log.vitals || {};
        return (
          <div
            key={log.id}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4"
            data-testid="care-log-item"
          >
            {/* Log Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-800 grid place-items-center font-bold text-xs border border-teal-200">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900">
                    Shift Log · {log.date}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Recorded by <b>{log.staff_name}</b> {log.start_time && log.end_time ? `(${log.start_time} – ${log.end_time})` : ''}
                  </div>
                </div>
              </div>

              {log.has_alert ? (
                <span
                  data-testid="vitals-alert"
                  className="px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span className="whitespace-nowrap shrink-0">Vital Flag</span>
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="whitespace-nowrap shrink-0">Vitals Normal</span>
                </span>
              )}
            </div>

            {/* Vitals Grid */}
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                Shift Vitals
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* Blood Pressure */}
                {(vitals.bp_sys !== undefined || vitals.bp_dia !== undefined) && (
                  <div className={`p-2.5 rounded-xl border text-xs ${
                    (vitals.bp_sys && (vitals.bp_sys < 90 || vitals.bp_sys > 140)) ||
                    (vitals.bp_dia && (vitals.bp_dia < 60 || vitals.bp_dia > 90))
                      ? 'bg-rose-50 border-rose-200 text-rose-900 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">BP (mmHg)</div>
                    <div className="text-sm font-black mt-0.5">{vitals.bp_sys ?? '—'}/{vitals.bp_dia ?? '—'}</div>
                  </div>
                )}

                {/* Pulse */}
                {vitals.pulse !== undefined && (
                  <div className={`p-2.5 rounded-xl border text-xs ${
                    vitals.pulse < 55 || vitals.pulse > 105
                      ? 'bg-rose-50 border-rose-200 text-rose-900 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Pulse (bpm)</div>
                    <div className="text-sm font-black mt-0.5">{vitals.pulse}</div>
                  </div>
                )}

                {/* SpO2 */}
                {vitals.spo2 !== undefined && (
                  <div className={`p-2.5 rounded-xl border text-xs ${
                    vitals.spo2 < 94
                      ? 'bg-rose-50 border-rose-200 text-rose-900 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">SpO₂ (%)</div>
                    <div className="text-sm font-black mt-0.5">{vitals.spo2}%</div>
                  </div>
                )}

                {/* Temperature */}
                {vitals.temp_f !== undefined && (
                  <div className={`p-2.5 rounded-xl border text-xs ${
                    vitals.temp_f > 99.5
                      ? 'bg-amber-50 border-amber-200 text-amber-900 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Temp (°F)</div>
                    <div className="text-sm font-black mt-0.5">{vitals.temp_f}°F</div>
                  </div>
                )}

                {/* Blood Sugar */}
                {vitals.sugar !== undefined && (
                  <div className={`p-2.5 rounded-xl border text-xs ${
                    vitals.sugar < 70 || vitals.sugar > 180
                      ? 'bg-amber-50 border-amber-200 text-amber-900 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Sugar (mg/dL)</div>
                    <div className="text-sm font-black mt-0.5">{vitals.sugar}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Vital Flags List if any */}
            {log.vitals_flags && log.vitals_flags.length > 0 && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                <b className="block text-[11px] uppercase tracking-wider font-extrabold text-rose-900 mb-1">
                  Threshold Alerts
                </b>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] font-semibold">
                  {log.vitals_flags.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Daily Routine Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs text-slate-700 pt-1">
              {log.food_fluids && (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2">
                  <Coffee className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-[10px] text-slate-400 uppercase block">Nutrition</span>
                    <span className="font-medium text-[11px]">
                      {typeof log.food_fluids === 'string' ? log.food_fluids : JSON.stringify(log.food_fluids)}
                    </span>
                  </div>
                </div>
              )}

              {log.sleep && (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2">
                  <Moon className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-[10px] text-slate-400 uppercase block">Sleep</span>
                    <span className="font-medium text-[11px]">{log.sleep}</span>
                  </div>
                </div>
              )}

              {log.mood && (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2">
                  <Smile className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-[10px] text-slate-400 uppercase block">Mood / Demeanor</span>
                    <span className="font-medium text-[11px]">{log.mood}</span>
                  </div>
                </div>
              )}
            </div>

            {/* ADL Activities */}
            {log.activities && log.activities.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {log.activities.map((a, i) => (
                  <span
                    key={i}
                    className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md"
                  >
                    ✓ {a}
                  </span>
                ))}
              </div>
            )}

            {/* Caregiver Notes */}
            {log.notes && (
              <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-xs text-slate-800 leading-relaxed">
                <b className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Shift Summary Notes</b>
                <p className="font-medium break-words">{log.notes}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
