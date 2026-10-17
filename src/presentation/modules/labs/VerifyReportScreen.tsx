import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';
import { verifyLabReportApi, labError, type ReportCheck } from '../../../services/labHelper';

// Public page opened from the QR code on a lab report. Shows only whether the report is genuine and
// current: report number, laboratory, issue date and version. Never the patient or the results.
const when = (d: string | null) => (d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—');

export default function VerifyReportScreen() {
  const { token = '' } = useParams();
  const [res, setRes] = useState<ReportCheck | null>(null);
  const [fail, setFail] = useState<string | null>(null);
  // Only a 404 means "not a Vizito report". Any other failure is ours, never a verdict on the report.
  const check = () => {
    setFail(null); setRes(null);
    verifyLabReportApi(token).then(setRes).catch((e) => {
      const st = e?.response?.status;
      setFail(st === 404 ? 'not-found' : st === 429 ? labError(e, 'Too many checks. Try again in a minute.') : 'unavailable');
    });
  };
  useEffect(check, [token]);

  return (
    <main className="min-h-screen bg-slate-50 flex items-start sm:items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <header className="px-5 py-4 border-b border-slate-100">
          <p className="text-lg font-black text-slate-900">vizito</p>
          <h1 className="text-sm font-bold text-slate-600">Lab report verification</h1>
        </header>
        <div className="p-5">
          {!res && !fail && <p className="text-sm text-slate-400">Checking…</p>}
          {fail && (
            <div role="alert" className="space-y-2">
              {fail === 'unavailable' ? (<>
                <p className="flex items-center gap-2 text-base font-black text-slate-800"><ShieldAlert className="w-6 h-6" /> We couldn’t check this report right now</p>
                <p className="text-sm text-slate-600">This is a problem on our side, not with the report. Please try again.</p>
                <button onClick={check} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold">Try again</button>
              </>) : (<>
                <p className="flex items-center gap-2 text-base font-black text-rose-800"><ShieldX className="w-6 h-6" /> {fail === 'not-found' ? 'This report could not be verified' : fail}</p>
                {fail === 'not-found' && <p className="text-sm text-slate-600">The code does not match a report issued through Vizito, or it was withdrawn. Ask the laboratory for the original report.</p>}
              </>)}
            </div>
          )}
          {res && (
            <div className="space-y-4">
              {res.valid ? (
                <p role="status" className="flex items-center gap-2 text-base font-black text-emerald-800"><ShieldCheck className="w-6 h-6" /> Genuine report, current version</p>
              ) : (
                <div role="status" className="space-y-1">
                  <p className="flex items-center gap-2 text-base font-black text-amber-800"><ShieldAlert className="w-6 h-6" /> Genuine, but replaced</p>
                  <p className="text-sm text-slate-600">The laboratory issued a corrected version{res.current_version ? ` (version ${res.current_version})` : ''}. Ask the patient for the latest report.</p>
                </div>
              )}
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-slate-500">Report no.</dt><dd className="font-mono font-bold text-slate-900">{res.report_number}</dd>
                <dt className="text-slate-500">Version</dt><dd className="font-semibold text-slate-900">{res.version}</dd>
                <dt className="text-slate-500">Laboratory</dt><dd className="font-semibold text-slate-900">{res.laboratory}</dd>
                <dt className="text-slate-500">Issued</dt><dd className="font-semibold text-slate-900">{when(res.issued_at)}</dd>
              </dl>
              <p className="text-xs text-slate-500">For privacy, this page never shows the patient's details or results. It confirms only that the report was released through Vizito by the laboratory named above.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
