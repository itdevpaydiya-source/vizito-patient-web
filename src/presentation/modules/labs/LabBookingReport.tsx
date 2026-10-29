import ThemedSelect from '../../components/forms/ThemedSelect';
import '../records/MedicalRecords.css';
import { useState, useEffect } from 'react';
import {FileText, Download, X, Share2, Check, Plus} from 'lucide-react';
import {myLabReportApi, openMyLabReportPdf, labError, shareOptionsApi, shareReportApi, unshareReportApi, type MyLabOrder, type MyLabReport, type ShareOptions} from '../../../services/labHelper';
const FLAG: Record<string, { text: string; cls: string }> = {
  L: { text: 'Low', cls: 'text-amber-800 font-bold' }, H: { text: 'High', cls: 'text-amber-800 font-bold' }, A: { text: 'Abnormal', cls: 'text-amber-800 font-bold' },
  LL: { text: 'Critical low', cls: 'text-rose-700 font-black' }, HH: { text: 'Critical high', cls: 'text-rose-700 font-black' },
};

// The released report in the app: results with what is outside the normal range marked, who signed
// it, the version (and why it was amended), and the PDF.
export default function ReportBlock({ orderId }: { orderId: string }) {
  const [r, setR] = useState<MyLabReport | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { myLabReportApi(orderId).then(setR).catch((e) => setErr(labError(e, 'Could not load your report.'))); }, [orderId]);
  if (err) return <p role="alert" className="text-sm font-semibold text-rose-700">{err}</p>;
  if (!r) return <p className="text-xs text-slate-400">Loading report…</p>;
  if (!r.released || !r.snapshot) return null;
  return <ReportContent report={r} onDownload={v=>void openMyLabReportPdf(orderId,v).catch(e=>setErr(labError(e,'Could not open the report.')))}><ShareBlock orderId={orderId}/></ReportContent>;
}
export function ReportContent({report:r,onDownload,children,beforeSignoff}:{report:MyLabReport;onDownload?:(version?:number)=>void;beforeSignoff?:import('react').ReactNode;children?:import('react').ReactNode}){
 const s=r.snapshot;if(!r.released||!s)return null;
 const outside=s.tests.flatMap(t=>t.results).filter(x=>x.flag&&x.flag!=='N').length;
 return <div className="mr-report"><section aria-label="Report information"><p>{outside?`${outside} result${outside===1?' is':'s are'} outside the normal range. Please discuss with your doctor.`:'No results are flagged outside the reference range.'}</p>{s.partial&&<p className="mr-warning">Partial report. Pending: {(s.pending||[]).map(p=>p.name).join(', ')}{s.expected_by?` · Expected ${new Date(s.expected_by).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})}`:''}</p>}{s.amended&&<p className="mr-warning">Corrected report (version {r.version}). {s.amendment_reason}</p>}{s.continues_partial&&!s.amended&&<p>Complete report, replacing the earlier partial report.</p>}<div className="mr-report-times"><span>Report ready: {new Date(s.released_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})}</span>{s.tests.filter(t=>t.collected_at).map(t=><span key={t.code}>Sample collected · {t.name}: {new Date(t.collected_at!).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})}</span>)}</div></section><section aria-label="Test results"><h2>Test Results</h2>{s.tests.map(t=><div key={t.code}><h3>{t.name}</h3><div className="mr-table-wrap"><table aria-label={`${t.name} results`}><thead><tr><th>Test</th><th>Result</th><th>Reference Range</th><th>Status</th></tr></thead><tbody>{t.results.map((x,i)=><tr key={i}><td>{x.name}</td><td>{x.value} {x.unit}</td><td>{x.reference}{(x as {corrected_from?:string}).corrected_from&&<small className="mr-corrected">Corrected: previously {(x as {corrected_from?:string}).corrected_from}</small>}</td><td><span className={`mr-flag ${x.flag&&x.flag!=='N'?'abnormal':'normal'}`}>{x.flag&&FLAG[x.flag]?FLAG[x.flag].text:x.flag==='N'?'Normal':x.flag||'Not flagged'}</span></td></tr>)}</tbody></table></div></div>)}</section>{beforeSignoff}<div className="mr-signoff"><section aria-label="Pathologist"><h2>Pathologist</h2><p>{s.pathologist.name}</p><p>{s.pathologist.qualification}</p><p>{s.pathologist.registration_number} · {s.pathologist.council}</p></section>{s.tests.some(t=>t.note)&&<section aria-label="Comments"><h2>Comments</h2>{s.tests.filter(t=>t.note).map(t=><p key={t.code}><strong>{t.name}: </strong>{t.note}</p>)}</section>}</div>{onDownload&&<button className="booking-button" onClick={()=>onDownload()}>Download PDF</button>}{(r.versions||[]).filter(v=>v.status==='REPLACED').map(v=><button className="booking-button" key={v.version} onClick={()=>onDownload?.(v.version)}>Earlier version {v.version} (replaced)</button>)}{children}</div>;
}

// Share the report with a doctor you have visited on Vizito; stop sharing any time.
export function ShareBlock({ orderId }: { orderId: string }) {
  const [o, setO] = useState<ShareOptions | null>(null);
  const [pick, setPick] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { shareOptionsApi(orderId).then(setO).catch(() => setO(null)); }, [orderId]);
  if (!o) return null;
  const sharedIds = new Set(o.shared.map((x) => x.doctor_partner_id));
  const choices = o.doctors.filter((d) => !sharedIds.has(d.doctor_partner_id));
  const run = async (fn: () => Promise<ShareOptions>, text: string) => { setBusy(true); setErr(null); try { setO(await fn()); setMsg(text); setPick(''); } catch (e) { setErr(labError(e, 'That did not work.')); } finally { setBusy(false); } };
  return (
    <div aria-label="Share with a doctor" role="group" className="rounded-xl border border-slate-200 p-3 space-y-2">
      <p className="text-xs font-black text-slate-700">Share with a doctor</p>
      {o.ordering_doctor && <p className="text-[11px] text-slate-500">{o.ordering_doctor} ordered these tests and already has the report.</p>}
      {o.shared.map((x) => (
        <p key={x.doctor_partner_id} className="text-xs text-slate-700 flex items-center justify-between gap-2">
          <span>Shared with <b>{x.doctor_name}</b></span>
          <button disabled={busy} onClick={() => run(() => unshareReportApi(orderId, x.doctor_partner_id), `Stopped sharing with ${x.doctor_name}.`)} className="text-xs font-bold text-rose-700 hover:underline">Stop sharing</button>
        </p>
      ))}
      {choices.length ? (
        <div className="flex flex-wrap gap-2 items-center">
          <ThemedSelect aria-label="Doctor" value={pick} onChange={(e) => setPick(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm">
            <option value="">Choose a doctor you have visited…</option>
            {choices.map((d) => <option key={d.doctor_partner_id} value={d.doctor_partner_id}>{d.name}</option>)}
          </ThemedSelect>
          <button disabled={busy || !pick} onClick={() => run(() => shareReportApi(orderId, pick), `Shared with ${choices.find((d) => d.doctor_partner_id === pick)?.name}.`)} className="px-3 py-1.5 rounded-xl bg-teal-700 text-white text-xs font-bold disabled:opacity-50">Share</button>
        </div>
      ) : !o.shared.length && <p className="text-[11px] text-slate-500">After you visit a doctor on Vizito, you can share this report with them here.</p>}
      {msg && <p role="status" className="text-xs font-semibold text-emerald-800">{msg}</p>}
      {err && <p role="alert" className="text-xs font-semibold text-rose-700">{err}</p>}
    </div>
  );
}

const HOME_STEP: Record<string, string> = {
  REQUESTED: 'Booked · the lab will assign a collector', ASSIGNED: 'Collector assigned', ON_THE_WAY: 'Collector on the way', ARRIVED: 'Collector with you',
  COLLECTED: 'Sample collected', DELIVERED: 'Sample at the lab', FAILED: 'Collection could not be done',
};

// Home sample collection: where it is, who is coming, and the code that proves it is really them.
export function HomeVisit({ o }: { o: MyLabOrder }) {
  const status = o.home_status || 'REQUESTED';
  const showCode = !!o.home_visit_code && ['REQUESTED', 'ASSIGNED', 'ON_THE_WAY', 'ARRIVED', 'FAILED'].includes(status);
  return (
    <section aria-label="Home collection" className="rounded-xl border border-teal-200 bg-teal-50/40 p-3 space-y-2">
      <p className="text-sm font-bold text-teal-900">{HOME_STEP[status] || status}</p>
      {o.collector_name && <p className="text-xs text-slate-700">Collector: <b>{o.collector_name}</b>{o.collector_phone && <> · <a className="font-bold text-teal-700" href={`tel:${o.collector_phone}`}>{o.collector_phone}</a></>}</p>}
      {status === 'FAILED' && o.home_note && <p className="text-xs font-semibold text-rose-700">{o.home_note}. The lab will contact you to arrange another visit.</p>}
      {showCode && (
        <div className="flex items-center gap-3" aria-label="Visit code">
          <span className="text-2xl font-black tracking-[0.3em] text-teal-900 tabular-nums">{o.home_visit_code}</span>
          <span className="text-[11px] text-teal-900">Your visit code. Give it only to the collector at your door; never share it on a call.</span>
        </div>
      )}
    </section>
  );
}
