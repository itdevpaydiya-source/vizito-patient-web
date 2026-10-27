import type {PatientPrescription} from '../../../services/patientHelper';
import {formatDoctorName} from '../../../utils/doctorLabel';
import {formatDoctorTrustText} from '../../components/DoctorTrustDetails';
import {formatDate} from '../../../utils/dateFormat';
// Doctor-entered text goes into a same-origin print window, so it is escaped, never trusted as HTML.
const esc = (v: unknown): string =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

// "Anika Rao · 7 y · F" — the way a prescription identifies the patient (age and gender drive dosing).
const patientLine = (rx: PatientPrescription) => {
  const sex = String(rx.patient_sex || '').trim().charAt(0).toUpperCase();
  return [rx.patient_name || null, rx.patient_age != null ? `${rx.patient_age} y` : null, sex || null].filter(Boolean).join(' · ');
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
export function printPatientPrescription(rx: PatientPrescription) {
  const d = rx.doctor;
  const hasVitals = !!rx.vitals && !!(rx.vitals.bp || rx.vitals.pulse || rx.vitals.temperature || rx.vitals.spo2);
  const followUp = rx.followup_required
    ? `Follow-up ${rx.followup_date ? `on ${formatDate(rx.followup_date)}` : 'recommended'}${rx.followup_after_days ? ` (after ${rx.followup_after_days} day${rx.followup_after_days === 1 ? '' : 's'})` : ''}`
    : null;


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
      : rx.no_known_allergies ? `<div class="sm" style="color:#356449;background:#f0f8f4;border:1px solid #d5eadc;border-radius:8px;padding:8px 10px;margin-bottom:12px">No known drug allergies recorded</div>` : '';
    const v = rx.vitals;
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(rx.prescription_number || 'Prescription')}</title>
      <style>
      *{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#172033;padding:36px 42px;max-width:850px;margin:24px auto;background:#fff;border:1px solid #dce3ec;line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .muted{color:#536176!important}.sm{font-size:12px}.row{display:flex;justify-content:space-between;align-items:flex-start;gap:20px}
      body:before{content:'VIZITO  |  YOUR HEALTH. CONNECTED.';display:block;color:#8f451e;font-size:10px;font-weight:800;letter-spacing:.14em;margin-bottom:20px}
      hr{border:none;border-top:1px solid #e2e8ef;margin:18px 0}table{width:100%;border-collapse:collapse;font-size:12px;table-layout:fixed;margin-top:8px}
      th{text-align:left;font-size:9px;letter-spacing:.07em;color:#536176;text-transform:uppercase;padding:10px 8px;background:#f6f8fa;border-top:1px solid #e2e8ef;border-bottom:1px solid #e2e8ef}
      td{padding:12px 8px;border-bottom:1px solid #e8edf2;vertical-align:top;color:#344054}tbody tr:nth-child(even){background:#fbfcfd}th:first-child,td:first-child{width:42%}th:nth-child(2),td:nth-child(2){width:18%}th:nth-child(3),td:nth-child(3){width:20%}th:last-child,td:last-child{width:20%}
      .section-title{font-size:17px;font-weight:800;letter-spacing:.04em;color:#172033;margin:20px 0 12px}.field-label{color:#536176!important;font-size:9px!important;letter-spacing:.08em!important;font-weight:700}
      @page{size:A4;margin:14mm}@media print{body{max-width:none;margin:0;padding:0;border:0}hr,table tr,.row{break-inside:avoid}thead{display:table-header-group}}
      @media(max-width:640px){body{margin:0;padding:24px 18px;border:0}.row{gap:12px;flex-wrap:wrap}}</style></head>
      <body>
        <div class="row">
          <div><div style="font-size:20px;font-weight:800;color:#8f451e">${esc(formatDoctorName(d?.name) || 'Doctor')}</div>
          <div class="sm muted">${esc(d ? formatDoctorTrustText({
            qualification: d.qualification,
            specialization: d.specialization,
            experience_years: d.experience_years,
            medical_registration_number: d.medical_registration_number,
            medical_council_name: d.medical_council_name,
            registration_verified: d.registration_verified,
          }) : '')}</div></div>
          <div style="text-align:right" class="sm">
            <div style="font-weight:700">${esc(d?.clinic_name || '')}</div>
            <div class="muted">${esc(d?.address || '')}</div>
            <div class="muted">${d?.phone ? 'Ph: ' + esc(d.phone) : ''}</div>
          </div>
        </div>
        <div class="section-title">MEDICAL PRESCRIPTION <span class="muted" style="font-size:11px;font-weight:600;letter-spacing:0">${esc(rx.prescription_number || '')}</span></div>
        <hr/>
        <div class="row sm">
          <div>${label('Patient')}<div style="font-weight:700">${esc(patientLine(rx))}</div></div>
          <div>${label('Date')}<div style="font-weight:700">${esc(formatDate(rx.date, ''))}</div></div>
          <div>${label('Visit')}<div style="font-weight:700">${esc(modeLabel(rx.consultation_mode) || '—')}</div></div>
        </div>
        <hr/>
        ${allergyHtml}
        ${rx.chief_complaint ? `<div class="sm" style="margin-bottom:12px">${label('Chief complaint')}<div style="font-weight:600;margin-top:4px">${esc(rx.chief_complaint)}</div></div>` : ''}
        ${hasVitals && v ? `
        <div style="background:#f8fafc;padding:10px;border-radius:8px;margin-bottom:14px;font-size:11px;display:flex;gap:16px;flex-wrap:wrap">
          <div style="width:100%;font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#536176">Recorded vitals</div>
          ${v.bp ? `<div><span class="muted" style="font-weight:700">BP:</span> ${esc(v.bp)} mmHg</div>` : ''}
          ${v.pulse ? `<div><span class="muted" style="font-weight:700">Pulse:</span> ${esc(v.pulse)} bpm</div>` : ''}
          ${v.temperature ? `<div><span class="muted" style="font-weight:700">Temp:</span> ${esc(temp(v.temperature))} °F</div>` : ''}
          ${v.spo2 ? `<div><span class="muted" style="font-weight:700">SpO2:</span> ${esc(v.spo2)}%</div>` : ''}
        </div>` : ''}
        ${rx.diagnosis ? `<div class="sm">${label('Diagnosis / Findings')}<div style="font-weight:600;margin-top:4px">${esc(rx.diagnosis)}</div></div><hr/>` : ''}
        <div class="section-title">Medicines &amp; directions <span style="font-family:Georgia,serif;font-style:italic;color:#9a4c20">Rx</span></div>
        ${rx.medicines.some((m) => /^\d-\d-\d$/.test(String(m.frequency || '').trim())) ? '<p class="muted sm">Frequency format: morning - afternoon - night. For example, 1-0-1 means one dose in the morning and one at night.</p>' : ''}
        <table><thead><tr><th>Medicine &amp; how to take</th><th>Dosage</th><th>Frequency</th><th style="text-align:right">Duration</th></tr></thead>
        <tbody>${meds || '<tr><td colspan="4" style="padding:10px 6px" class="muted">No medicines listed.</td></tr>'}</tbody></table>
        ${rx.tests.length ? `<hr/><div class="sm">${label('Tests advised')}<ul style="margin:6px 0 0 18px;padding:0">${rx.tests.map((t) => `<li>${esc(t.name)}${t.fasting_required ? ' <span class="muted">(fasting)</span>' : ''}${t.urgency && !/routine/i.test(t.urgency) ? ` <b style="color:#b45309">${esc(t.urgency)}</b>` : ''}</li>`).join('')}</ul></div>` : ''}
        ${(rx.pharmacy_name || rx.pharmacy_status) ? `
        <hr/>
        <div style="border:1px solid #ccfbf1;background:#f0fdfa;padding:10px;border-radius:8px;font-size:12px">
          <b>Fulfillment Pharmacy:</b> ${esc(rx.pharmacy_name || 'Pharmacy')}${rx.pharmacy_address ? ` · ${esc(rx.pharmacy_address)}` : ''}${rx.pharmacy_phone ? ` · Ph: ${esc(rx.pharmacy_phone)}` : ''}
          ${rx.pharmacy_status ? ` <span style="font-weight:700;color:#0f766e">(${esc(rx.pharmacy_status)})</span>` : ''}
        </div>` : ''}
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
}

