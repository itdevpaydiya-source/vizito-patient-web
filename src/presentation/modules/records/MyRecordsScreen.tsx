import React, { useState, useEffect, useCallback } from 'react';
import { FileText, AlertCircle, RotateCcw, Calendar, Printer, X, Eye } from 'lucide-react';
import { getPrescriptionsApi, type PatientPrescription } from '../../../services/patientHelper';
import { formatDoctorName } from '../../../utils/doctorLabel';

// Medical Records — shows the patient's real, finalized prescriptions (consultation output). Each opens
// a full prescription preview that mirrors the doctor's printout, with a Print / Download (Save as PDF)
// option. Empty until a consultation is completed. No fabricated records.
export default function MyRecordsScreen() {
  const [prescriptions, setPrescriptions] = useState<PatientPrescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PatientPrescription | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      setPrescriptions(await getPrescriptionsApi());
    } catch {
      setError('Unable to load your records. Please try again.');
      setPrescriptions([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 w-full">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Medical Records</h1>
        <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
          Prescriptions from your completed consultations — view and download.
        </p>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center shadow-xs">
          <div className="w-7 h-7 border-[3px] border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 font-medium text-sm">Loading records...</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center shadow-xs space-y-3">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <p className="text-rose-600 font-semibold text-sm">{error}</p>
          <button onClick={load} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl">
            <RotateCcw className="w-4 h-4" /> Retry
          </button>
        </div>
      ) : prescriptions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-20 px-4 text-center shadow-xs space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-500 mx-auto"><FileText className="w-8 h-8" /></div>
          <h3 className="font-extrabold text-slate-800 text-lg">No records yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto font-medium">
            Your prescriptions will appear here after a doctor completes your appointment.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {prescriptions.map((rx) => (
            <div key={rx.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0"><FileText className="w-5 h-5" /></div>
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-sm">{rx.doctor?.name || 'Prescription'}</h3>
                      {rx.doctor?.specialization && <p className="text-[11px] text-slate-400 font-semibold">{rx.doctor.specialization}</p>}
                    </div>
                  </div>
                  {rx.date && <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 shrink-0"><Calendar className="w-3.5 h-3.5 text-slate-400" />{rx.date}</span>}
                </div>
                {rx.diagnosis && <p className="text-xs text-slate-600 mt-3"><span className="font-bold text-slate-400 uppercase text-[10px]">Diagnosis: </span>{rx.diagnosis}</p>}
                <p className="text-[11px] text-slate-400 mt-1">{rx.prescription_number}</p>
              </div>
              <button onClick={() => setSelected(rx)} className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-all">
                <Eye className="w-4 h-4" /> View Prescription
              </button>
            </div>
          ))}
        </div>
      )}

      {selected && <PrescriptionPreview rx={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

// Full prescription preview mirroring the doctor's printout. Print / Download opens a clean print window
// (browser "Save as PDF" gives the download).
const PrescriptionPreview: React.FC<{ rx: PatientPrescription; onClose: () => void }> = ({ rx, onClose }) => {
  const d = rx.doctor;

  const handlePrint = () => {
    const meds = rx.medicines.map((m) => `
      <tr>
        <td style="padding:10px 6px;border-bottom:1px solid #eef2f7;font-weight:700">${m.name || '—'}</td>
        <td style="padding:10px 6px;border-bottom:1px solid #eef2f7">${m.dosage || '—'}</td>
        <td style="padding:10px 6px;border-bottom:1px solid #eef2f7;color:#7c3aed">${m.frequency || '—'}</td>
        <td style="padding:10px 6px;border-bottom:1px solid #eef2f7;text-align:right">${m.duration || '—'}</td>
      </tr>`).join('');
    const html = `<!doctype html><html><head><title>${rx.prescription_number || 'Prescription'}</title>
      <style>body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;padding:32px;max-width:800px;margin:auto}
      .muted{color:#64748b} .sm{font-size:12px} .row{display:flex;justify-content:space-between;align-items:flex-start}
      hr{border:none;border-top:1px solid #e2e8f0;margin:16px 0} table{width:100%;border-collapse:collapse;font-size:13px}
      th{text-align:left;font-size:10px;letter-spacing:.06em;color:#94a3b8;text-transform:uppercase;padding:6px}</style></head>
      <body>
        <div class="row">
          <div><div style="font-size:20px;font-weight:800;color:#7c3aed">${formatDoctorName(d?.name) || 'Doctor'}</div>
          <div class="sm muted">${[d?.qualification, d?.specialization].filter(Boolean).join(' · ')}</div></div>
          <div style="text-align:right" class="sm">
            <div style="font-weight:700">${d?.clinic_name || ''}</div>
            <div class="muted">${d?.address || ''}</div>
            <div class="muted">${d?.phone ? 'Ph: ' + d.phone : ''}</div>
          </div>
        </div>
        <hr/>
        <div class="row sm">
          <div><div class="muted" style="font-size:10px;text-transform:uppercase">Patient</div><div style="font-weight:700">${rx.patient_name || 'Patient'}</div></div>
          <div><div class="muted" style="font-size:10px;text-transform:uppercase">Date</div><div style="font-weight:700">${rx.date || ''}</div></div>
          <div><div class="muted" style="font-size:10px;text-transform:uppercase">Prescription ID</div><div style="font-weight:700">${rx.prescription_number || ''}</div></div>
        </div>
        <hr/>
        ${rx.vitals ? `
        <div style="background:#f8fafc;padding:10px;border-radius:8px;margin-bottom:14px;font-size:11px;display:flex;gap:16px;flex-wrap:wrap">
          ${rx.vitals.bp ? `<div><span style="color:#64748b;font-weight:700">BP:</span> ${rx.vitals.bp}</div>` : ''}
          ${rx.vitals.pulse ? `<div><span style="color:#64748b;font-weight:700">Pulse:</span> ${rx.vitals.pulse} bpm</div>` : ''}
          ${rx.vitals.temperature ? `<div><span style="color:#64748b;font-weight:700">Temp:</span> ${rx.vitals.temperature} °F</div>` : ''}
          ${rx.vitals.spo2 ? `<div><span style="color:#64748b;font-weight:700">SpO2:</span> ${rx.vitals.spo2}%</div>` : ''}
        </div><hr/>` : ''}
        ${rx.diagnosis ? `<div class="sm"><div class="muted" style="font-size:10px;text-transform:uppercase">Diagnosis / Findings</div><div style="font-weight:600;margin-top:4px">${rx.diagnosis}</div></div><hr/>` : ''}
        <div style="font-size:22px;font-weight:800;color:#7c3aed;font-style:italic">Rx</div>
        <table><thead><tr><th>Medicine Name &amp; Strength</th><th>Dosage</th><th>Frequency</th><th style="text-align:right">Duration</th></tr></thead>
        <tbody>${meds || '<tr><td colspan="4" style="padding:10px 6px" class="muted">No medicines listed.</td></tr>'}</tbody></table>
        <hr/>
        <div class="row">
          <div class="sm">${rx.notes ? `<div class="muted" style="font-size:10px;text-transform:uppercase">General Advice</div><div style="font-weight:600;margin-top:4px">${rx.notes}</div>` : ''}</div>
          <div style="text-align:right">${(rx.signature_url || d?.signature_url) ? `<img src="${rx.signature_url || d?.signature_url}" style="max-height:60px"/><div class="sm muted">Authorized Signature</div>` : '<div class="sm muted">Authorized Signature</div>'}</div>
        </div>
      </body></html>`;
    const w = window.open('', '_blank', 'width=880,height=1000');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-hidden shadow-2xl border border-slate-100 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <h3 className="font-black text-slate-800 text-sm">Prescription View: {rx.prescription_number}</h3>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700">
              <Printer className="w-4 h-4" /> Print / Download
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="overflow-y-auto p-6 sm:p-8 space-y-5">
          {/* Doctor + clinic header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-purple-700">{formatDoctorName(d?.name) || 'Doctor'}</h2>
              <p className="text-xs font-semibold text-slate-500">{[d?.qualification, d?.specialization].filter(Boolean).join(' · ')}</p>
            </div>
            <div className="text-right text-xs">
              {d?.clinic_name && <p className="font-bold text-slate-700">{d.clinic_name}</p>}
              {d?.address && <p className="text-slate-400">{d.address}</p>}
              {d?.phone && <p className="text-slate-400">Ph: {d.phone}</p>}
            </div>
          </div>

          <div className="border-y border-slate-100 py-4 grid grid-cols-3 gap-3 text-xs">
            <div><span className="text-[10px] font-bold uppercase text-slate-400 block">Patient</span><span className="font-bold text-slate-800">{rx.patient_name || 'Patient'}</span></div>
            <div><span className="text-[10px] font-bold uppercase text-slate-400 block">Date</span><span className="font-bold text-slate-800">{rx.date || '—'}</span></div>
            <div><span className="text-[10px] font-bold uppercase text-slate-400 block">Prescription ID</span><span className="font-bold text-slate-800">{rx.prescription_number}</span></div>
          </div>

          {rx.vitals && (rx.vitals.bp || rx.vitals.pulse || rx.vitals.temperature || rx.vitals.spo2) && (
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Recorded Vitals</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {rx.vitals.bp && (
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-bold block">Blood Pressure</span>
                    <span className="font-bold text-slate-800">{rx.vitals.bp}</span>
                  </div>
                )}
                {rx.vitals.pulse && (
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-bold block">Pulse</span>
                    <span className="font-bold text-slate-800">{rx.vitals.pulse} bpm</span>
                  </div>
                )}
                {rx.vitals.temperature && (
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-bold block">Temperature</span>
                    <span className="font-bold text-slate-800">{rx.vitals.temperature} °F</span>
                  </div>
                )}
                {rx.vitals.spo2 && (
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-bold block">SpO2</span>
                    <span className="font-bold text-slate-800">{rx.vitals.spo2}%</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {rx.diagnosis && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Diagnosis / Findings</span>
              <p className="text-sm font-semibold text-slate-800 mt-1">{rx.diagnosis}</p>
            </div>
          )}

          <div>
            <p className="text-2xl font-black italic text-purple-700 mb-2">Rx</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    <th className="text-left py-2 font-bold">Medicine Name &amp; Strength</th>
                    <th className="text-left py-2 font-bold">Dosage</th>
                    <th className="text-left py-2 font-bold">Frequency</th>
                    <th className="text-right py-2 font-bold">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {rx.medicines.length > 0 ? rx.medicines.map((m, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      <td className="py-2.5 font-bold text-slate-800">{m.name || '—'}</td>
                      <td className="py-2.5 text-slate-700">{m.dosage || '—'}</td>
                      <td className="py-2.5 text-purple-700 font-semibold">{m.frequency || '—'}</td>
                      <td className="py-2.5 text-right text-slate-700">{m.duration || '—'}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="py-3 text-slate-400 text-xs">No medicines listed.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-end justify-between gap-4 pt-2">
            <div className="min-w-0">
              {rx.notes && (
                <>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">General Advice</span>
                  <p className="text-sm font-semibold text-slate-800 mt-1">{rx.notes}</p>
                </>
              )}
              {rx.followup_required && (
                <p className="text-xs font-bold text-amber-700 mt-2">Follow-up recommended{rx.followup_date ? ` on ${rx.followup_date}` : ''}.</p>
              )}
            </div>
            <div className="text-right shrink-0">
              {(rx.signature_url || d?.signature_url) && <img src={rx.signature_url || d?.signature_url || ''} alt="signature" className="max-h-14 inline-block" />}
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Authorized Signature</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
