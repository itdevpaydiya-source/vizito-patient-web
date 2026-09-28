import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, AlertCircle, RotateCcw, Calendar, CalendarClock, Printer, X, Eye, Pill, Send, ShieldAlert, FlaskConical } from 'lucide-react';
import { getPrescriptionsApi, type PatientPrescription } from '../../../services/patientHelper';
import { createPharmacyRequestApi } from '../../../services/pharmacyOrderHelper';
import { formatDoctorName } from '../../../utils/doctorLabel';
import { formatDate } from '../../../utils/dateFormat';
import SelectPharmacyModal from '../pharmacy/SelectPharmacyModal';
import type { ProviderItem } from '../../../services/types';

// A prescription can be re-sent once it's never been routed, or once a prior request
// was rejected/expired — never while genuinely in flight or already fulfilled.
const canSendToPharmacy = (status: string | null) =>
  !status || status === 'Rejected' || status === 'Expired' || status === 'Cancelled';

const pharmacyStatusLabel: Record<string, { label: string; className: string }> = {
  Sent: { label: 'Sent to pharmacy', className: 'bg-sky-50 text-sky-700 border-sky-100' },
  Processing: { label: 'Pharmacy is processing', className: 'bg-amber-50 text-amber-700 border-amber-100' },
  Dispensed: { label: 'Dispensed', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
};

// Medical Records — shows the patient's real, finalized prescriptions (consultation output). Each opens
// a full prescription preview that mirrors the doctor's printout, with a Print / Download (Save as PDF)
// option. Empty until a consultation is completed. No fabricated records.
export default function MyRecordsScreen() {
  const navigate = useNavigate();
  const [prescriptions, setPrescriptions] = useState<PatientPrescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PatientPrescription | null>(null);
  const [sendingRx, setSendingRx] = useState<PatientPrescription | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

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

  const handleSendToPharmacy = async (pharmacy: ProviderItem) => {
    if (!sendingRx) return;
    setSendError(null);
    try {
      await createPharmacyRequestApi(sendingRx.id, pharmacy.id);
      setSendingRx(null);
      // Track status from here on out — same "My Requests" list the direct-order path uses.
      navigate('/pharmacy-orders?tab=requests');
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Unable to send this prescription to the pharmacy. Please try again.';
      setSendError(Array.isArray(msg) ? msg.join(', ') : String(msg));
    }
  };

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
                  {rx.date && <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 shrink-0"><Calendar className="w-3.5 h-3.5 text-slate-400" />{formatDate(rx.date)}</span>}
                </div>
                {rx.diagnosis && <p className="text-xs text-slate-600 mt-3"><span className="font-bold text-slate-400 uppercase text-[10px]">Diagnosis: </span>{rx.diagnosis}</p>}
                {rx.medicines.length > 0 && (
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                    <span className="font-bold text-slate-400 uppercase text-[10px]">Medicines: </span>
                    {rx.medicines.map((m) => m.name).filter(Boolean).join(', ')}
                  </p>
                )}
                {rx.tests.length > 0 && (
                  <p className="text-xs text-slate-600 mt-1"><span className="font-bold text-slate-400 uppercase text-[10px]">Tests: </span>{rx.tests.map((t) => t.name).join(', ')}</p>
                )}
                <p className="text-[11px] text-slate-400 mt-1">{rx.prescription_number}</p>
                {rx.followup_required && (
                  <span className="inline-flex items-center gap-1 mt-2 mr-1 text-[10px] font-bold px-2 py-1 rounded-lg border bg-amber-50 text-amber-800 border-amber-200">
                    <CalendarClock className="w-3 h-3" /> Follow-up {rx.followup_date ? formatDate(rx.followup_date) : 'advised'}
                  </span>
                )}
                {rx.pharmacy_status && pharmacyStatusLabel[rx.pharmacy_status] && (
                  <span className={`inline-flex items-center gap-1 mt-2 text-[10px] font-bold px-2 py-1 rounded-lg border ${pharmacyStatusLabel[rx.pharmacy_status].className}`}>
                    <Pill className="w-3 h-3" /> {pharmacyStatusLabel[rx.pharmacy_status].label}
                  </span>
                )}
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => setSelected(rx)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-all">
                  <Eye className="w-4 h-4" /> View
                </button>
                {canSendToPharmacy(rx.pharmacy_status) && (
                  <button
                    onClick={() => { setSendError(null); setSendingRx(rx); }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-teal-200 text-teal-700 hover:bg-teal-50 font-bold text-xs transition-all"
                  >
                    <Send className="w-3.5 h-3.5" /> Send to Pharmacy
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && <PrescriptionPreview rx={selected} onClose={() => setSelected(null)} />}

      {sendingRx && (
        <SelectPharmacyModal
          title="Send Prescription to Pharmacy"
          onSelect={handleSendToPharmacy}
          onClose={() => setSendingRx(null)}
        />
      )}

      {sendError && (
        <div className="fixed bottom-6 right-6 z-[60] bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 max-w-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {sendError}
          <button onClick={() => setSendError(null)} className="ml-1 text-rose-400 hover:text-rose-700"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}
    </div>
  );
}

// Doctor-entered text goes into a same-origin print window, so it is escaped, never trusted as HTML.
const esc = (v: unknown): string =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

// "Anika Rao · 7 y · F" — the way a prescription identifies the patient (age and sex drive dosing).
const patientLine = (rx: PatientPrescription) => {
  const sex = String(rx.patient_sex || '').trim().charAt(0).toUpperCase();
  return [rx.patient_name || 'Patient', rx.patient_age != null ? `${rx.patient_age} y` : null, sex || null].filter(Boolean).join(' · ');
};
const temp = (v: string | number) => String(Number(v));

const modeLabel = (mode: string | null) => {
  const m = String(mode || '').toUpperCase();
  if (!m) return null;
  if (m.includes('ONLINE') || m.includes('VIDEO')) return 'Online consultation';
  if (m.includes('HOME')) return 'Home visit';
  if (m.includes('WALK')) return 'Walk-in visit';
  return 'Clinic visit';
};

// Full prescription preview mirroring the doctor's printout: complaint, allergies, vitals, diagnosis,
// medicines with how to take them, tests ordered, advice and the follow-up date. Print / Download opens
// a clean print window (browser "Save as PDF" gives the download).
const PrescriptionPreview: React.FC<{ rx: PatientPrescription; onClose: () => void }> = ({ rx, onClose }) => {
  const d = rx.doctor;
  const hasVitals = !!rx.vitals && !!(rx.vitals.bp || rx.vitals.pulse || rx.vitals.temperature || rx.vitals.spo2);
  const followUp = rx.followup_required
    ? `Follow-up ${rx.followup_date ? `on ${formatDate(rx.followup_date)}` : 'recommended'}${rx.followup_after_days ? ` (after ${rx.followup_after_days} day${rx.followup_after_days === 1 ? '' : 's'})` : ''}`
    : null;

  const handlePrint = () => {
    const label = (t: string) => `<div class="muted" style="font-size:10px;text-transform:uppercase;letter-spacing:.05em">${t}</div>`;
    const meds = rx.medicines.map((m) => `
      <tr>
        <td style="padding:10px 6px;border-bottom:1px solid #eef2f7"><b>${esc(m.name || '—')}</b>${m.instructions ? `<div class="muted" style="font-size:11px">${esc(m.instructions)}</div>` : ''}</td>
        <td style="padding:10px 6px;border-bottom:1px solid #eef2f7">${esc(m.dosage || '—')}</td>
        <td style="padding:10px 6px;border-bottom:1px solid #eef2f7;color:#0f766e">${esc(m.frequency || '—')}</td>
        <td style="padding:10px 6px;border-bottom:1px solid #eef2f7;text-align:right">${esc(m.duration || '—')}</td>
      </tr>`).join('');
    const allergyHtml = rx.allergies.length
      ? `<div style="border:1px solid #fecaca;background:#fef2f2;color:#991b1b;padding:8px 10px;border-radius:8px;font-size:12px;margin-bottom:12px"><b>Allergies:</b> ${rx.allergies.map((a) => esc([a.allergen, a.reaction && `(${a.reaction})`, a.severity && `- ${a.severity}`].filter(Boolean).join(' '))).join('; ')}</div>`
      : rx.no_known_allergies ? `<div class="sm muted" style="margin-bottom:12px">No known drug allergies</div>` : '';
    const v = rx.vitals;
    const html = `<!doctype html><html><head><title>${esc(rx.prescription_number || 'Prescription')}</title>
      <style>body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;padding:32px;max-width:800px;margin:auto}
      .muted{color:#64748b} .sm{font-size:12px} .row{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}
      hr{border:none;border-top:1px solid #e2e8f0;margin:16px 0} table{width:100%;border-collapse:collapse;font-size:13px}
      th{text-align:left;font-size:10px;letter-spacing:.06em;color:#94a3b8;text-transform:uppercase;padding:6px}</style></head>
      <body>
        <div class="row">
          <div><div style="font-size:20px;font-weight:800;color:#0f766e">${esc(formatDoctorName(d?.name) || 'Doctor')}</div>
          <div class="sm muted">${esc([d?.qualification, d?.specialization].filter(Boolean).join(' · '))}</div></div>
          <div style="text-align:right" class="sm">
            <div style="font-weight:700">${esc(d?.clinic_name || '')}</div>
            <div class="muted">${esc(d?.address || '')}</div>
            <div class="muted">${d?.phone ? 'Ph: ' + esc(d.phone) : ''}</div>
          </div>
        </div>
        <hr/>
        <div class="row sm">
          <div>${label('Patient')}<div style="font-weight:700">${esc(patientLine(rx))}</div></div>
          <div>${label('Date')}<div style="font-weight:700">${esc(formatDate(rx.date, ''))}</div></div>
          <div>${label('Prescription ID')}<div style="font-weight:700">${esc(rx.prescription_number || '')}</div></div>
        </div>
        <hr/>
        ${allergyHtml}
        ${rx.chief_complaint ? `<div class="sm" style="margin-bottom:12px">${label('Chief complaint')}<div style="font-weight:600;margin-top:4px">${esc(rx.chief_complaint)}</div></div>` : ''}
        ${hasVitals && v ? `
        <div style="background:#f8fafc;padding:10px;border-radius:8px;margin-bottom:14px;font-size:11px;display:flex;gap:16px;flex-wrap:wrap">
          ${v.bp ? `<div><span class="muted" style="font-weight:700">BP:</span> ${esc(v.bp)} mmHg</div>` : ''}
          ${v.pulse ? `<div><span class="muted" style="font-weight:700">Pulse:</span> ${esc(v.pulse)} bpm</div>` : ''}
          ${v.temperature ? `<div><span class="muted" style="font-weight:700">Temp:</span> ${esc(temp(v.temperature))} °F</div>` : ''}
          ${v.spo2 ? `<div><span class="muted" style="font-weight:700">SpO2:</span> ${esc(v.spo2)}%</div>` : ''}
        </div>` : ''}
        ${rx.diagnosis ? `<div class="sm">${label('Diagnosis / Findings')}<div style="font-weight:600;margin-top:4px">${esc(rx.diagnosis)}</div></div><hr/>` : ''}
        <div style="font-size:22px;font-weight:800;color:#0f766e;font-style:italic">Rx</div>
        <table><thead><tr><th>Medicine &amp; how to take</th><th>Dosage</th><th>Frequency</th><th style="text-align:right">Duration</th></tr></thead>
        <tbody>${meds || '<tr><td colspan="4" style="padding:10px 6px" class="muted">No medicines listed.</td></tr>'}</tbody></table>
        ${rx.tests.length ? `<hr/><div class="sm">${label('Tests advised')}<ul style="margin:6px 0 0 18px;padding:0">${rx.tests.map((t) => `<li>${esc(t.name)}${t.fasting_required ? ' <span class="muted">(fasting)</span>' : ''}${t.urgency && !/routine/i.test(t.urgency) ? ` <b style="color:#b45309">${esc(t.urgency)}</b>` : ''}</li>`).join('')}</ul></div>` : ''}
        <hr/>
        <div class="row">
          <div class="sm">
            ${rx.notes ? `${label('Advice')}<div style="font-weight:600;margin-top:4px;white-space:pre-line">${esc(rx.notes)}</div>` : ''}
            ${followUp ? `<div style="font-weight:700;color:#b45309;margin-top:8px">${esc(followUp)}</div>` : ''}
          </div>
          <div style="text-align:right">${(rx.signature_url || d?.signature_url) ? `<img src="${esc(rx.signature_url || d?.signature_url)}" style="max-height:60px"/>` : ''}<div class="sm muted">Authorized Signature</div></div>
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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Prescription">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-hidden shadow-2xl border border-slate-100 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <h3 className="font-black text-slate-800 text-sm">Prescription {rx.prescription_number}</h3>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700">
              <Printer className="w-4 h-4" /> Print / Download
            </button>
            <button onClick={onClose} aria-label="Close" className="p-1.5 text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="overflow-y-auto p-6 sm:p-8 space-y-5">
          {/* Doctor + clinic header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-teal-700">{formatDoctorName(d?.name) || 'Doctor'}</h2>
              <p className="text-xs font-semibold text-slate-500">{[d?.qualification, d?.specialization].filter(Boolean).join(' · ')}</p>
            </div>
            <div className="text-right text-xs">
              {d?.clinic_name && <p className="font-bold text-slate-700">{d.clinic_name}</p>}
              {d?.address && <p className="text-slate-400">{d.address}</p>}
              {d?.phone && <p className="text-slate-400">Ph: {d.phone}</p>}
            </div>
          </div>

          <div className="border-y border-slate-100 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div><span className="text-[10px] font-bold uppercase text-slate-400 block">Patient</span><span className="font-bold text-slate-800">{patientLine(rx)}</span></div>
            <div><span className="text-[10px] font-bold uppercase text-slate-400 block">Date</span><span className="font-bold text-slate-800">{formatDate(rx.date)}</span></div>
            <div><span className="text-[10px] font-bold uppercase text-slate-400 block">Visit</span><span className="font-bold text-slate-800">{modeLabel(rx.consultation_mode) || '—'}</span></div>
            <div><span className="text-[10px] font-bold uppercase text-slate-400 block">Prescription ID</span><span className="font-bold text-slate-800 break-all">{rx.prescription_number}</span></div>
          </div>

          {rx.allergies.length > 0 ? (
            <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-black uppercase tracking-wider text-[10px] block">Allergies recorded</span>
                {rx.allergies.map((a, i) => (
                  <span key={i} className="block font-semibold">
                    {a.allergen}{a.reaction ? ` — ${a.reaction}` : ''}{a.severity ? ` (${a.severity})` : ''}
                  </span>
                ))}
              </div>
            </div>
          ) : rx.no_known_allergies ? (
            <p className="text-xs font-semibold text-slate-500">No known drug allergies</p>
          ) : null}

          {rx.chief_complaint && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Chief complaint</span>
              <p className="text-sm font-semibold text-slate-800 mt-1">{rx.chief_complaint}</p>
            </div>
          )}

          {hasVitals && rx.vitals && (
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Recorded Vitals</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {rx.vitals.bp && <Vital label="Blood Pressure" value={`${rx.vitals.bp} mmHg`} />}
                {rx.vitals.pulse && <Vital label="Pulse" value={`${rx.vitals.pulse} bpm`} />}
                {rx.vitals.temperature && <Vital label="Temperature" value={`${temp(rx.vitals.temperature)} °F`} />}
                {rx.vitals.spo2 && <Vital label="SpO2" value={`${rx.vitals.spo2}%`} />}
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
            <p className="text-2xl font-black italic text-teal-700 mb-2">Rx</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    <th className="text-left py-2 font-bold">Medicine &amp; how to take</th>
                    <th className="text-left py-2 font-bold">Dosage</th>
                    <th className="text-left py-2 font-bold">Frequency</th>
                    <th className="text-right py-2 font-bold">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {rx.medicines.length > 0 ? rx.medicines.map((m, i) => (
                    <tr key={i} className="border-b border-slate-50 align-top">
                      <td className="py-2.5 pr-2">
                        <span className="font-bold text-slate-800 block">{m.name || '—'}</span>
                        {m.instructions && <span className="text-[11px] font-semibold text-slate-500">{m.instructions}</span>}
                      </td>
                      <td className="py-2.5 text-slate-700">{m.dosage || '—'}</td>
                      <td className="py-2.5 text-teal-700 font-semibold">{m.frequency || '—'}</td>
                      <td className="py-2.5 text-right text-slate-700">{m.duration || '—'}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="py-3 text-slate-400 text-xs">No medicines listed.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {rx.medicines.some((m) => /^\d-\d-\d$/.test(String(m.frequency || '').trim())) && (
              <p className="text-[11px] text-slate-400 mt-2">Frequency is morning–afternoon–night, e.g. 1-0-1 means one in the morning and one at night.</p>
            )}
          </div>

          {rx.tests.length > 0 && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1"><FlaskConical className="w-3.5 h-3.5" /> Tests advised</span>
              <ul className="mt-2 space-y-1.5">
                {rx.tests.map((t, i) => (
                  <li key={i} className="text-sm font-semibold text-slate-800 flex flex-wrap items-center gap-2">
                    {t.name}
                    {t.fasting_required && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-100">Fasting</span>}
                    {t.urgency && !/routine/i.test(t.urgency) && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">{t.urgency}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-end justify-between gap-4 pt-2">
            <div className="min-w-0 space-y-2">
              {rx.notes && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Advice</span>
                  <p className="text-sm font-semibold text-slate-800 mt-1 whitespace-pre-line">{rx.notes}</p>
                </div>
              )}
              {followUp && (
                <p className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl">
                  <CalendarClock className="w-4 h-4" /> {followUp}
                </p>
              )}
            </div>
            <div className="text-right shrink-0">
              {(rx.signature_url || d?.signature_url) && <img src={rx.signature_url || d?.signature_url || ''} alt="Doctor's signature" className="max-h-14 inline-block" />}
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Authorized Signature</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Vital: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <span className="text-[10px] uppercase text-slate-400 font-bold block">{label}</span>
    <span className="font-bold text-slate-800">{value}</span>
  </div>
);
