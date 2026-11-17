import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';
import { fetchSharedLabReportApi, openSharedLabReportPdf, type SharedLabReportCheck } from '../../../services/labHelper';

// Public page opened from the link shared by the doctor with the patient via WhatsApp or Link.
// Styled in the clean, reassuring style of VerifyPrescriptionScreen.tsx.
const when = (d: string | null) => {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    const dateStr = dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
    return `${dateStr}, ${timeStr}`;
  } catch {
    return '—';
  }
};

export default function SharedLabReportScreen() {
  const { token = '' } = useParams();
  const [report, setReport] = useState<SharedLabReportCheck | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingPdf, setOpeningPdf] = useState(false);

  useEffect(() => {
    if (!token) {
      setErrorMsg('This link has expired. Ask your doctor to share it again.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    fetchSharedLabReportApi(token)
      .then((data) => {
        setReport(data);
        setLoading(false);
      })
      .catch((e) => {
        const msg = e?.response?.data?.message;
        if (msg && typeof msg === 'string' && msg.includes('expired')) {
          setErrorMsg(msg);
        } else {
          setErrorMsg('This link has expired. Ask your doctor to share it again.');
        }
        setLoading(false);
      });
  }, [token]);

  const handleViewPdf = async () => {
    if (!token) return;
    setOpeningPdf(true);
    try {
      await openSharedLabReportPdf(token);
    } catch {
      alert('Could not load the report PDF. Please try again.');
    } finally {
      setOpeningPdf(false);
    }
  };

  return (
    <main className="min-h-screen bg-white flex flex-col justify-between items-center px-4 py-8 sm:py-12 antialiased selection:bg-purple-100">
      <div className="w-full max-w-[440px] flex flex-col items-center">
        {/* Centered Header */}
        <header className="w-full flex flex-col items-center text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            {/* Vizito Wordmark with brand purple checkmark */}
            <svg width="28" height="24" viewBox="0 0 32 26" fill="none" aria-hidden="true" className="shrink-0">
              <rect x="2" y="11" width="6.5" height="14" rx="3.25" transform="rotate(-40 2 11)" fill="#8B5CF6" />
              <rect x="11.5" y="23" width="6.5" height="23" rx="3.25" transform="rotate(-132 11.5 23)" fill="#581C87" />
            </svg>
            <span className="text-2xl font-bold tracking-tight text-slate-900">Vizito</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Diagnostic report</h1>
          <div className="w-full border-b border-[#EAE6FD] mt-4" />
        </header>

        {/* State Content */}
        <div className="w-full mt-6 flex flex-col items-center">
          {/* Loading */}
          {loading && (
            <div className="w-full flex flex-col items-center justify-center py-16 space-y-3">
              <div className="w-8 h-8 border-2 border-[#6D4AEF] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium text-slate-500">Loading lab report…</p>
            </div>
          )}

          {/* Expired / Revoked / Invalid */}
          {!loading && errorMsg && (
            <div className="w-full flex flex-col items-center space-y-5 sm:space-y-6">
              <div className="relative flex items-center justify-center w-20 h-20 my-1 rounded-full bg-rose-50 border border-rose-100 text-rose-600">
                <AlertTriangle className="w-10 h-10" />
              </div>

              <div className="text-center space-y-2">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Link unavailable
                </h2>
                <p className="text-sm font-medium text-rose-700 bg-rose-50 border border-rose-200/80 rounded-xl px-4 py-3 leading-relaxed">
                  {errorMsg}
                </p>
              </div>

              <div className="w-full bg-[#FAF8FF] border border-[#DDD5FC] rounded-2xl p-4 flex items-start gap-3">
                <div className="shrink-0 text-brand-600 mt-0.5">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  For your privacy and clinical data security, reports shared by your doctor are protected by time-limited access links.
                </p>
              </div>
            </div>
          )}

          {/* Valid Report */}
          {!loading && report && report.valid && (
            <div className="w-full flex flex-col items-center space-y-5 sm:space-y-6">
              {/* Shield badge */}
              <div className="relative flex items-center justify-center w-24 h-28 my-1">
                <svg viewBox="0 0 100 120" className="w-full h-full" fill="none" aria-hidden="true">
                  <path d="M 50 4 C 80 4 92 16 92 38 C 92 78 64 104 50 116 C 36 104 8 78 8 38 C 8 16 20 4 50 4 Z" fill="#DCFCE7" />
                  <path d="M 50 14 C 74 14 84 23 84 41 C 84 72 61 94 50 104 C 39 94 16 72 16 41 C 16 23 26 14 50 14 Z" fill="#16A34A" />
                  <path d="M 36 57 L 46 67 L 66 47" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              <h2 role="status" className="text-2xl sm:text-[26px] font-bold text-[#15803D] tracking-tight text-center">
                Verified lab report
              </h2>

              {/* Details card */}
              <div className="w-full bg-white rounded-2xl border border-[#E6EAF2] overflow-hidden shadow-xs">
                <div className="divide-y divide-slate-100 text-sm">
                  <div className="grid grid-cols-[100px_1fr] items-center px-4 py-3.5">
                    <span className="text-slate-500 font-medium">Laboratory</span>
                    <span className="font-semibold text-slate-900">{report.lab_name || '—'}</span>
                  </div>
                  <div className="grid grid-cols-[100px_1fr] items-center px-4 py-3.5">
                    <span className="text-slate-500 font-medium">Report no.</span>
                    <span className="font-mono font-semibold text-slate-900">{report.report_number}</span>
                  </div>
                  {report.patient_name && (
                    <div className="grid grid-cols-[100px_1fr] items-center px-4 py-3.5">
                      <span className="text-slate-500 font-medium">Patient</span>
                      <span className="font-semibold text-slate-900">{report.patient_name}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-[100px_1fr] items-center px-4 py-3.5">
                    <span className="text-slate-500 font-medium">Issued</span>
                    <span className="font-semibold text-slate-900">{when(report.issued_at)}</span>
                  </div>
                </div>
              </div>

              {/* View report PDF button */}
              <button
                type="button"
                onClick={handleViewPdf}
                disabled={openingPdf}
                className="w-full h-12 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#9268F6] to-[#566AF7] text-white font-bold text-sm shadow-md hover:opacity-95 transition-opacity cursor-pointer disabled:opacity-50"
              >
                <FileText className="w-4 h-4" />
                <span>{openingPdf ? 'Opening PDF…' : 'View report PDF'}</span>
              </button>

              <div className="w-full bg-[#FAF8FF] border border-[#DDD5FC] rounded-2xl p-4 flex items-center gap-3">
                <p className="text-xs text-slate-600 leading-relaxed text-center w-full">
                  Shared securely by your doctor. This report is verified and released by {report.lab_name}.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center text-xs text-slate-400">
        Vizito Digital Healthcare · Secure report sharing
      </footer>
    </main>
  );
}

