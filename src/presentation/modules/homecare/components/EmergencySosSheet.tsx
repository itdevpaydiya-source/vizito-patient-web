import VizitoDialog from '../../../components/dialogs/VizitoDialog';
import React, { useState } from 'react';
import { X, PhoneCall, AlertTriangle, ShieldAlert, HeartPulse, CheckCircle2 } from 'lucide-react';
import { hcTriggerSosApi } from '../../../../services/homecareHelper';

interface EmergencySosSheetProps {
  isOpen: boolean;
  onClose: () => void;
  orderId?: string;
  agencyPhone?: string;
  agencyName?: string;
  patientName?: string;
}

export default function EmergencySosSheet({
  isOpen,
  onClose,
  orderId,
  agencyPhone,
  agencyName,
  patientName,
}: EmergencySosSheetProps) {
  const [logged, setLogged] = useState<boolean>(false);
  const [failed, setFailed] = useState<boolean>(false);
  const [result, setResult] = useState<{ incident_number?: string | null; agency?: { name?: string | null; phone?: string | null } } | null>(null);
  const [logging, setLogging] = useState<boolean>(false);
  const [sosNotes, setSosNotes] = useState<string>('');

  if (!isOpen) return null;
  const phone = result?.agency?.phone || agencyPhone || null;
  const name = result?.agency?.name || agencyName || 'Your home care agency';

  const handleLogIncident = async () => {
    if (!orderId) return;
    setLogging(true);
    setFailed(false);
    try {
      const res: any = await hcTriggerSosApi(orderId, {
        note: sosNotes.trim() || 'Emergency SOS trigger initiated by patient app.',
      });
      setResult(res || null);
      setLogged(true);
    } catch {
      // Never show "alerted" when it wasn't: tell the family to call directly.
      setFailed(true);
    } finally {
      setLogging(false);
    }
  };

  return (
    <VizitoDialog title="Emergency Services & SOS" onClose={onClose} className="portal-migrated">
{/* Urgent Header */}

<div className="bg-gradient-to-r from-rose-700 via-rose-800 to-red-900 text-white p-5 sm:p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-rose-200 text-xs font-bold uppercase tracking-wider mb-1 pr-10">
            <HeartPulse className="w-5 h-5 animate-pulse text-white shrink-0" />
            <span>Emergency Rapid Response Protocol</span>
          </div>
          <h2 className="text-2xl font-black text-white">Emergency Services & SOS</h2>
          <p className="text-rose-100 text-xs sm:text-sm mt-1">
            For critical respiratory, cardiac, or traumatic distress, call government emergency lines immediately.
          </p>
        </div>

{/* Content Body */}

<div className="p-6 space-y-4">
          {/* Government Emergency Numbers FIRST */}
          <div className="space-y-2.5">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-rose-800">
              National Emergency Hotlines (Immediate Free Dispatch)
            </div>

            <div className="grid grid-cols-2 gap-3">
              <a
                href="tel:108"
                data-testid="sos-call-108"
                className="p-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white flex flex-col items-center justify-center text-center shadow-lg shadow-rose-600/30 transition group active:scale-95"
              >
                <div className="w-10 h-10 rounded-full bg-white/20 grid place-items-center mb-1 group-hover:scale-110 transition">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <span className="text-2xl font-black tracking-tight">108</span>
                <span className="text-[11px] font-bold text-rose-100">Ambulance & Trauma</span>
              </a>

              <a
                href="tel:112"
                data-testid="sos-call-112"
                className="p-4 rounded-2xl bg-slate-900 hover:bg-black text-white flex flex-col items-center justify-center text-center shadow-lg transition group active:scale-95"
              >
                <div className="w-10 h-10 rounded-full bg-white/20 grid place-items-center mb-1 group-hover:scale-110 transition">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <span className="text-2xl font-black tracking-tight">112</span>
                <span className="text-[11px] font-bold text-slate-300">National Emergency</span>
              </a>
            </div>
          </div>

          {/* Agency On-Call Desk */}
          <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 space-y-2">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-teal-800">
              Agency 24/7 Clinical Coordinator
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-900">{name}</div>
                <div className="text-[11px] text-slate-600">{phone ? `On-call supervisor${patientName ? ` for ${patientName}` : ''}` : 'This agency has not set an on-call number yet — call 108 / 112 for emergencies.'}</div>
              </div>
              {phone && <a
                href={`tel:${phone}`}
                data-testid="sos-call-agency"
                className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition shrink-0"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Call {phone}</span>
              </a>}
            </div>
          </div>

          {/* Incident Log Tracker */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            {failed && (
              <div role="alert" className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 font-semibold">
                We couldn’t alert the agency (no connection). Call 108 or 112 now{phone ? `, then the agency on ${phone}` : ''}. You can try sending the alert again.
              </div>
            )}
            {!logged ? (
              <div className="space-y-2">
                <label htmlFor="lt-sos-note" className="block text-xs font-bold text-slate-700">
                  Log Incident on Clinical Record (Optional Note)
                </label>
                <input
                  id="lt-sos-note"
                  type="text"
                  value={sosNotes}
                  onChange={(e) => setSosNotes(e.target.value)}
                  placeholder="e.g. Patient experienced sudden dizziness, breathless"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10"
                />
                <button
                  type="button"
                  disabled={logging}
                  onClick={handleLogIncident}
                  data-testid="log-sos-incident-btn"
                  className="w-full py-2.5 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-900 font-bold text-xs transition"
                >
                  {logging ? 'Alerting Clinical Supervisor...' : 'Notify Agency Clinical Duty Supervisor'}
                </button>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2 text-xs text-emerald-900 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <b className="block">Agency alerted{result?.incident_number ? ` · ${result.incident_number}` : ''}</b>
                  <span>The agency and Vizito support were alerted as a critical incident. Keep calling 108 / 112 if the patient is in danger.</span>
                </div>
              </div>
            )}
          </div>
        </div>

{/* Footer */}

<div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition"
          >
            Dismiss
          </button>
        </div>
</VizitoDialog>
  );
}
