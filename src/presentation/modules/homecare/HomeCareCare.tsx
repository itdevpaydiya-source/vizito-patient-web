import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, Stethoscope, Target, TrendingDown, AlertTriangle, ShieldAlert, CheckCircle2, ClipboardList, Pill } from 'lucide-react';
import { hcReferralsApi, hcDismissReferralApi, hcCareOptionsApi, hcReportProblemApi, hcSendMedicineRequestApi, TAB_OF, type HcReferral, type HcOrder, type HcMedicineRequest } from '../../../services/homecareHelper';
import { getPrescriptionsApi, getProvidersApi, type PatientPrescription } from '../../../services/patientHelper';
import { createPharmacyRequestApi } from '../../../services/pharmacyOrderHelper';
import type { ProviderItem } from '../../../services/types';
import { labError } from '../../../services/labHelper';

// Patient side of a course of home care: what the doctor advised (book it in one tap), the care plan
// the professional wrote with its goals and reviews, progress across visits, and reporting a problem.
const card = 'bg-white rounded-2xl border border-slate-200 p-5';
const short = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
const pill = (cls: string) => `text-[11px] font-bold px-2 py-0.5 rounded-full border ${cls}`;
const GOAL: Record<string, [string, string]> = { MET: ['Met', 'bg-emerald-50 text-emerald-800 border-emerald-200'], PARTLY: ['Partly', 'bg-amber-50 text-amber-800 border-amber-200'], NOT_YET: ['Not yet', 'bg-slate-100 text-slate-700 border-slate-200'] };
const PROGRESS: Record<string, [string, string]> = { IMPROVING: ['Improving', 'bg-emerald-50 text-emerald-800 border-emerald-200'], STABLE: ['Stable', 'bg-sky-50 text-sky-800 border-sky-200'], WORSE: ['Needs attention', 'bg-rose-50 text-rose-800 border-rose-200'] };

/** Open referrals from the patient's doctors, shown above every home-care tab. */
export function DoctorReferrals({ onBook }: { onBook: (r: HcReferral) => void }) {
  const [rows, setRows] = useState<HcReferral[]>([]);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { hcReferralsApi().then(setRows).catch(() => setRows([])); }, []);
  const open = rows.filter((r) => r.status === 'OPEN');
  if (!open.length) return null;
  return (
    <section aria-label="Advised by your doctor" className="rounded-2xl border border-sky-200 bg-sky-50/60 p-4 space-y-3">
      <p className="text-sm font-black text-sky-950 flex items-center gap-1.5"><Stethoscope className="w-4 h-4" /> {open.some((r) => r.source === 'DISCHARGE') ? 'Home care advised by your doctor or hospital' : 'Advised by your doctor'}</p>
      {open.map((r) => (
        <div key={r.id} className="rounded-xl bg-white border border-sky-100 p-3 space-y-1.5">
          <p className="text-sm font-black text-slate-900">Home {r.category_label.toLowerCase()} · {r.sessions} session{r.sessions > 1 ? 's' : ''}{r.frequency ? `, ${r.frequency.toLowerCase()}` : ''}</p>
          {r.source === 'DISCHARGE' && <p className="text-[11px] font-bold text-sky-900">After discharge from {r.hospital_name}{r.discharge_date ? ` on ${short(`${r.discharge_date}T00:00:00`)}` : ''}</p>}
          <p className="text-xs text-slate-700"><b>{r.diagnosis}</b> — {r.instructions}</p>
          {r.discharge_summary && <p className="text-xs text-slate-600"><b>Discharge summary:</b> {r.discharge_summary}</p>}
          {r.medications && <p className="text-xs text-slate-600"><b>Medicines:</b> {r.medications}</p>}
          {r.red_flags && <p className="text-xs font-semibold text-rose-800"><AlertTriangle className="w-3.5 h-3.5 inline mr-1" />Call the hospital or go to emergency if: {r.red_flags}</p>}
          <p className="text-[11px] text-slate-500">{r.doctor_name} · {short(r.created_at)}{r.patient_name ? ` · for ${r.patient_name}` : ''}{r.start_by ? <b className="text-amber-800"> · start by {short(`${r.start_by}T00:00:00`)}</b> : null}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button onClick={() => onBook(r)} className="px-3 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-bold">Find a {r.category === 'NURSING' ? 'nurse' : r.category === 'PHYSIOTHERAPY' ? 'physiotherapist' : 'caregiver'} near me</button>
            <button onClick={async () => { try { setRows(await hcDismissReferralApi(r.id)); } catch (e) { setErr(labError(e, 'Could not update.')); } }} className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600">Not needed</button>
          </div>
        </div>
      ))}
      {err && <p role="alert" className="text-xs font-semibold text-rose-700">{err}</p>}
    </section>
  );
}

/** Banner while booking from a referral. */
export function ReferralNote({ r }: { r: HcReferral }) {
  return <p className="text-xs text-sky-950 bg-sky-50 border border-sky-200 rounded-xl px-3 py-2"><Stethoscope className="w-3.5 h-3.5 inline mr-1" />Booking for <b>{r.doctor_name}</b>’s advice: {r.diagnosis}, {r.sessions} session{r.sessions > 1 ? 's' : ''}. The agency will see the doctor’s instructions.</p>;
}
export const referralTab = (r: HcReferral) => TAB_OF[r.category];

/** The care plan, reviews and progress for one booking. */
export function CarePlanView({ o, onChanged }: { o: HcOrder; onChanged?: (o: HcOrder) => void }) {
  const c = o.care;
  if (!c) return null;
  const latest = c.reviews[0];
  return (
    <section aria-label="Care plan" className="space-y-2">
      {o.referral && <p className="text-xs text-slate-700"><Stethoscope className="w-3.5 h-3.5 inline mr-1 text-sky-700" /><b>{o.referral.source === 'DISCHARGE' ? `After discharge from ${o.referral.hospital_name} · ${o.referral.doctor_name}` : `Advised by ${o.referral.doctor_name}`}:</b> {o.referral.diagnosis} — {o.referral.instructions}</p>}
      {o.referral?.red_flags && <p className="text-xs font-semibold text-rose-800"><AlertTriangle className="w-3.5 h-3.5 inline mr-1" />Watch for: {o.referral.red_flags}</p>}
      {!c.plan ? (o.sessions > 1 && o.status !== 'CANCELLED' ? <p className="text-xs text-slate-500 flex items-center gap-1"><ClipboardList className="w-3.5 h-3.5" /> Your professional writes a care plan with goals after the first visit.</p> : null) : (
        <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-3 space-y-2">
          <div>
            <p className="text-xs font-black text-teal-900 uppercase tracking-wider">Care plan</p>
            {c.plan.diagnosis && <p className="text-sm font-bold text-slate-900">{c.plan.diagnosis}</p>}
            <p className="text-[11px] text-slate-500">By {c.plan.written_by}{c.plan.written_role ? ` (${c.plan.written_role})` : ''} · updated {short(c.plan.updated_at)}{c.plan.frequency ? ` · ${c.plan.frequency}` : ''}</p>
          </div>
          <ul className="space-y-1" aria-label="Goals">{c.plan.goals.map((g, i) => {
            const st = latest?.goal_status.find((x) => x.goal === g.goal);
            return (
              <li key={i} className="flex flex-wrap items-center gap-2 text-xs">
                <Target className="w-3.5 h-3.5 text-teal-700" /><b className="text-slate-800">{g.goal}</b>{g.target && <span className="text-slate-500">→ {g.target}</span>}
                {st && <span className={pill(GOAL[st.status][1])}>{GOAL[st.status][0]}{st.note ? ` · ${st.note}` : ''}</span>}
              </li>
            );
          })}</ul>
          {c.plan.precautions && <p className="text-xs text-rose-800"><AlertTriangle className="w-3.5 h-3.5 inline mr-1" /><b>Take care:</b> {c.plan.precautions}</p>}
          {latest && (
            <div className="rounded-lg bg-white border border-slate-100 p-2.5 text-xs space-y-0.5">
              <p className="flex flex-wrap items-center gap-2"><b className="text-slate-900">Review after visit {latest.after_visit}</b><span className={pill(PROGRESS[latest.progress][1])}>{PROGRESS[latest.progress][0]}</span><span className="text-slate-500">{latest.reviewed_by} · {short(latest.at)}</span></p>
              <p className="text-slate-700">{latest.summary}</p>
              <p className="text-slate-600"><b>Next:</b> {latest.next_step_label}</p>
            </div>
          )}
          {c.next_review_after !== null && !c.review_due && <p className="text-[11px] text-slate-500">Next review after visit {c.next_review_after}.</p>}
        </div>
      )}
      <Progress o={o} />
      <LabRequests o={o} />
      <MedicineRequests o={o} onChanged={onChanged} />
    </section>
  );
}

/** Tests the care team asked for: book a home collection in one tap; see when the report is ready. */
function LabRequests({ o }: { o: HcOrder }) {
  const navigate = useNavigate();
  const rows = (o.care?.lab_requests || []).filter((r) => r.status !== 'CANCELLED');
  if (!rows.length) return null;
  return (
    <div className="space-y-2" aria-label="Lab tests advised">
      {rows.map((r) => (
        <div key={r.id} className={`rounded-xl border p-3 text-xs space-y-1 ${r.status === 'OPEN' ? 'border-violet-200 bg-violet-50/50' : 'border-slate-200 bg-white'}`}>
          <p className="font-bold text-slate-900 flex items-center gap-1.5"><FlaskConical className="w-3.5 h-3.5 text-violet-700" /> Lab tests advised: {r.tests.map((t) => t.name).join(', ')}</p>
          <p className="text-slate-700">{r.reason}</p>
          <p className="text-slate-500">By {r.requested_by} · {short(r.created_at)}</p>
          {r.status === 'OPEN' ? (
            <button onClick={() => navigate(`/lab-tests?hc=${encodeURIComponent(r.id)}&order=${encodeURIComponent(o.id)}`)} className="mt-1 px-3 py-1.5 rounded-lg bg-violet-700 text-white font-bold">Book home collection</button>
          ) : r.lab && (
            <p className="font-semibold text-slate-800">{r.lab.report_ready ? 'Report ready' : 'Booked'} · {r.lab.order_number}{r.lab.lab_name ? ` with ${r.lab.lab_name}` : ''}{r.lab.date ? ` · ${short(r.lab.date)}` : ''}{' '}
              <button onClick={() => navigate('/lab-bookings')} className="text-violet-700 font-bold underline">{r.lab.report_ready ? 'View report' : 'View booking'}</button></p>
          )}
        </div>
      ))}
    </div>
  );
}

/** Medicines the care team said are needed. Send a prescription to a pharmacy. */
function MedicineRequests({ o, onChanged }: { o: HcOrder; onChanged?: (o: HcOrder) => void }) {
  const rows = (o.care?.medicine_requests || []).filter((r) => r.status !== 'CANCELLED');
  const [activeReq, setActiveReq] = useState<HcMedicineRequest | null>(null);
  const [prescriptions, setPrescriptions] = useState<PatientPrescription[] | null>(null);
  const [pharmacies, setPharmacies] = useState<ProviderItem[] | null>(null);
  const [pickRx, setPickRx] = useState('');
  const [pickPh, setPickPh] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const startSend = async (r: HcMedicineRequest) => {
    setActiveReq(r);
    setErr(null);
    setPickRx('');
    setPickPh('');
    setLoading(true);
    try {
      const [rxs, phs] = await Promise.all([
        getPrescriptionsApi().catch(() => []),
        getProvidersApi('pharmacy').catch(() => []),
      ]);
      setPrescriptions(rxs);
      setPharmacies(phs);
    } catch (e) {
      setErr('Could not load prescriptions or pharmacies.');
    } finally {
      setLoading(false);
    }
  };

  const submitSend = async () => {
    if (sending || !activeReq || !pickRx || !pickPh) return;
    setSending(true);
    setErr(null);
    try {
      const pr = await createPharmacyRequestApi(pickRx, pickPh);
      const updatedList = await hcSendMedicineRequestApi(o.id, activeReq.id, pr.id);
      setActiveReq(null);
      if (onChanged) {
        onChanged({
          ...o,
          care: o.care ? { ...o.care, medicine_requests: updatedList } : undefined,
        });
      }
    } catch (e: any) {
      setErr(labError(e, 'Could not send prescription to pharmacy.'));
    } finally {
      setSending(false);
    }
  };

  if (!rows.length) return null;

  const matchingRx = (prescriptions || []).filter(
    (rx) => rx.patient_id && o.patient_profile_id && String(rx.patient_id) === String(o.patient_profile_id)
  );

  return (
    <div role="region" className="space-y-2" aria-label="Medicines needed">
      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
        <Pill className="w-3.5 h-3.5 text-teal-700" /> Medicines needed
      </p>
      {rows.map((r) => (
        <div key={r.id} className={`rounded-xl border p-3 text-xs space-y-1.5 ${r.status === 'OPEN' ? 'border-amber-200 bg-amber-50/50' : 'border-slate-200 bg-white'}`}>
          <div className="flex flex-wrap items-center justify-between gap-1">
            <p className="font-bold text-slate-900 flex items-center gap-1.5">
              <Pill className="w-3.5 h-3.5 text-teal-700" /> {r.items}
            </p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${r.status === 'SENT' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
              {r.status === 'SENT' ? 'Sent' : 'Needs prescription'}
            </span>
          </div>
          <p className="text-slate-700">{r.reason}</p>
          <p className="text-slate-500">Requested by {r.requested_by} · {short(r.created_at)}</p>

          {r.status === 'SENT' && (
            <div className="mt-1 font-semibold text-emerald-800 bg-emerald-50 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{r.pharmacy?.name ? `${r.pharmacy.name} · ` : ''}{r.pharmacy?.stage?.label || 'Waiting for the pharmacy to accept'}</span>
            </div>
          )}

          {r.status === 'OPEN' && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => startSend(r)}
                className="px-3 py-1.5 rounded-lg bg-teal-700 text-white font-bold text-xs hover:bg-teal-800"
              >
                Send prescription to a pharmacy
              </button>
            </div>
          )}
        </div>
      ))}

      {activeReq && (
        <div role="dialog" aria-modal="true" aria-label="Send prescription to a pharmacy" className="rounded-xl border border-teal-200 bg-white p-3.5 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-slate-900 uppercase tracking-wider">Send prescription for {activeReq.items}</p>
            <button type="button" onClick={() => setActiveReq(null)} className="text-xs font-bold text-slate-400 hover:text-slate-600">Close</button>
          </div>
          {loading ? (
            <p className="text-xs text-slate-500">Checking your prescriptions…</p>
          ) : prescriptions && matchingRx.length === 0 ? (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 space-y-1">
              <p className="text-xs font-bold text-amber-900">
                No prescription for {o.patient_name || 'this patient'} yet — ask the doctor
              </p>
            </div>
          ) : (
            <div className="space-y-2 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Select your prescription</label>
                <select
                  aria-label="Select prescription"
                  value={pickRx}
                  onChange={(e) => setPickRx(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium"
                >
                  <option value="">Select a prescription…</option>
                  {matchingRx.map((p) => {
                    const docName = p.doctor?.name
                      ? (p.doctor.name.toLowerCase().startsWith('dr') ? p.doctor.name : `Dr. ${p.doctor.name}`)
                      : 'Doctor';
                    const meds = (p.medicines || []).map((m) => m.name).filter(Boolean).join(', ') || 'No medicines';
                    const dateStr = p.date || '';
                    const label = [dateStr, docName, meds].filter(Boolean).join(' · ');
                    return (
                      <option key={p.id} value={p.id}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Choose a pharmacy</label>
                <select
                  aria-label="Choose a pharmacy"
                  value={pickPh}
                  onChange={(e) => setPickPh(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium"
                >
                  <option value="">Choose a pharmacy…</option>
                  {(pharmacies || []).map((ph) => (
                    <option key={ph.id} value={ph.id}>
                      {ph.name}{ph.address ? ` · ${ph.address}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {err && <p role="alert" className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2">{err}</p>}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  disabled={sending || !pickRx || !pickPh}
                  onClick={submitSend}
                  className="px-3 py-1.5 rounded-lg bg-teal-700 text-white font-bold text-xs disabled:opacity-50"
                >
                  {sending ? 'Sending…' : 'Send'}
                </button>
                <button
                  type="button"
                  disabled={sending}
                  onClick={() => setActiveReq(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Progress({ o }: { o: HcOrder }) {
  const p = o.care?.progress;
  if (!p || p.kind === 'NONE' || p.points.length < 2) return null;
  if (p.kind === 'PAIN') {
    const pts = p.points, first = pts[0], last = pts[pts.length - 1];
    const W = 36 * pts.length + 40, y = (v: number) => 10 + (10 - v) * 8.5;
    return (
      <div className="rounded-xl border border-slate-200 p-3" aria-label="Pain progress">
        <p className="text-xs font-bold text-slate-800 flex items-center gap-1"><TrendingDown className="w-3.5 h-3.5 text-emerald-600" /> Pain (0–10): {first.before} at the start → {last.after} after session {last.seq}</p>
        <div className="overflow-x-auto mt-2">
          <svg width={W} height={128} role="img" aria-label={`Pain before and after each session: ${pts.map((x: any) => `session ${x.seq} ${x.before} to ${x.after}`).join(', ')}`}>
            {[0, 5, 10].map((t) => <g key={t}><line x1={24} x2={W} y1={y(t)} y2={y(t)} stroke="#e2e8f0" /><text x={18} y={y(t) + 3} fontSize="9" textAnchor="end" fill="#64748b">{t}</text></g>)}
            {pts.map((x: any, i: number) => (
              <g key={x.seq}>
                <rect x={32 + i * 36} y={y(x.before)} width={12} height={y(0) - y(x.before)} rx={2} fill="#fb7185" />
                <rect x={46 + i * 36} y={y(x.after)} width={12} height={y(0) - y(x.after)} rx={2} fill="#34d399" />
                <text x={45 + i * 36} y={124} fontSize="9" textAnchor="middle" fill="#475569">S{x.seq}</text>
              </g>
            ))}
          </svg>
        </div>
        <p className="text-[11px] text-slate-500 flex gap-3"><span><span className="inline-block w-2.5 h-2.5 rounded-sm bg-rose-400 mr-1" />Before</span><span><span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-400 mr-1" />After the session</span></p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-slate-200 p-3 overflow-x-auto">
      <p className="text-xs font-bold text-slate-800 mb-1">Readings across visits</p>
      <table className="w-full text-xs tabular-nums" aria-label="Readings across visits">
        <thead><tr className="text-left text-[10px] uppercase tracking-wider text-slate-500"><th className="py-1 pr-2">Visit</th><th className="pr-2">BP</th><th className="pr-2">Pulse</th><th className="pr-2">SpO2</th><th>Sugar</th></tr></thead>
        <tbody>{p.points.map((x: any) => (
          <tr key={x.seq} className="border-t border-slate-100"><td className="py-1 pr-2 text-slate-600">{x.seq} · {short(`${x.date}T00:00:00`)}</td><td className="pr-2">{x.bp_sys}/{x.bp_dia}</td><td className="pr-2">{x.pulse}</td><td className="pr-2">{x.spo2 ?? '—'}</td><td>{x.sugar ?? '—'}</td></tr>
        ))}</tbody>
      </table>
    </div>
  );
}

const ISTATUS: Record<string, [string, string]> = { OPEN: ['Received', 'bg-amber-50 text-amber-800 border-amber-200'], ACKNOWLEDGED: ['Being handled', 'bg-sky-50 text-sky-800 border-sky-200'], RESOLVED: ['Resolved', 'bg-emerald-50 text-emerald-800 border-emerald-200'] };
// Kinds of problem a family reports (the agency's own clinical incident types stay on their side).
const FAMILY_TYPES = ['PROFESSIONAL_CONDUCT', 'MISSED_OR_LATE', 'FALL', 'INJURY', 'MEDICATION_ERROR', 'ABUSE_OR_HARASSMENT', 'EQUIPMENT', 'OTHER'];

/** Problems reported on this booking, and a form to report one. */
export function Problems({ o, onReported }: { o: HcOrder; onReported: (msg: string) => void }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<{ incident_types: Record<string, string>; severity: Record<string, string> } | null>(null);
  const [type, setType] = useState('');
  const [severity, setSeverity] = useState('');
  const [visitId, setVisitId] = useState('');
  const [text, setText] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open && !opts) hcCareOptionsApi().then(setOpts).catch(() => setErr('Could not load the choices.')); }, [open, opts]);
  const list = o.incidents || [];
  const given = o.visits.filter((v) => !['SCHEDULED', 'CANCELLED'].includes(v.status));
  const send = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await hcReportProblemApi(o.id, { type, severity, description: text, visit_id: visitId || undefined });
      setOpen(false); setText(''); setType(''); setSeverity('');
      onReported(`${r.incident_number}: ${o.agency_name} has been told${r.escalated ? ' and Vizito support will follow up within 24 hours' : ''}.`);
    } catch (e) { setErr(labError(e, 'Could not send.')); } finally { setBusy(false); }
  };
  return (
    <section aria-label="Problems" className="space-y-2">
      {list.length > 0 && <ul className="space-y-2">{list.map((i) => (
        <li key={i.id} className="rounded-xl border border-slate-200 p-2.5 text-xs space-y-0.5">
          <p className="flex flex-wrap items-center gap-2"><ShieldAlert className="w-3.5 h-3.5 text-rose-600" /><b className="text-slate-900">{i.type_label}</b><span className={pill(ISTATUS[i.status][1])}>{ISTATUS[i.status][0]}</span><span className="text-slate-400">{i.incident_number} · {short(i.created_at)} · {i.reporter_kind === 'PATIENT' ? 'you reported' : `recorded by ${i.reported_by}`}</span></p>
          <p className="text-slate-700">{i.description}</p>
          {i.resolution && <p className="text-emerald-800"><CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />{i.resolution}</p>}
        </li>
      ))}</ul>}
      {!open ? <button onClick={() => setOpen(true)} className="text-xs font-bold text-slate-600 hover:text-rose-700 inline-flex items-center gap-1"><ShieldAlert className="w-3.5 h-3.5" /> Report a problem with this care</button> : (
        <div role="region" aria-label="Report a problem" className="rounded-xl border border-rose-200 bg-rose-50/40 p-3 space-y-2">
          <p className="text-[11px] text-rose-900 font-semibold">For an emergency call 108 first. Serious reports and complaints about a professional also go to Vizito support.</p>
          <div className="grid sm:grid-cols-2 gap-2">
            <label className="text-[11px] font-bold text-slate-600">Kind of problem<select value={type} onChange={(e) => setType(e.target.value)} className="block w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"><option value="">Choose…</option>{opts && FAMILY_TYPES.map((k) => <option key={k} value={k}>{opts.incident_types[k]}</option>)}</select></label>
            <label className="text-[11px] font-bold text-slate-600">How serious<select value={severity} onChange={(e) => setSeverity(e.target.value)} className="block w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"><option value="">Choose…</option>{opts && Object.entries(opts.severity).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          </div>
          {given.length > 0 && <label className="block text-[11px] font-bold text-slate-600">Which visit (optional)<select value={visitId} onChange={(e) => setVisitId(e.target.value)} className="block w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"><option value="">Not about one visit</option>{given.map((v) => <option key={v.id} value={v.id}>Visit {v.seq} · {short(`${v.date}T00:00:00`)}{v.professional ? ` · ${v.professional.name}` : ''}</option>)}</select></label>}
          <label className="block text-[11px] font-bold text-slate-600">Tell us what happened<textarea rows={3} value={text} onChange={(e) => setText(e.target.value.slice(0, 1000))} placeholder="What happened, when, and how the patient is now" className="block w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-normal" /></label>
          {err && <p role="alert" className="text-xs font-semibold text-rose-700">{err}</p>}
          <div className="flex gap-2"><button disabled={busy} onClick={send} className="px-3 py-2 rounded-lg bg-rose-600 text-white text-xs font-bold disabled:opacity-50">{busy ? 'Sending…' : 'Send report'}</button><button onClick={() => setOpen(false)} className="px-3 py-2 text-xs font-bold text-slate-600">Cancel</button></div>
        </div>
      )}
    </section>
  );
}

export { card as careCard };
