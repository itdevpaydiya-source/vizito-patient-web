import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { verifyPrescriptionApi, labError, type PrescriptionCheck } from '../../../services/labHelper';
import logoImg from '../../../assets/vizito_logo.png';

// Public page opened from the QR code on a printed prescription — for the pharmacist dispensing it.
// Shows only whether the prescription is genuine and who issued it. Never the patient or the medicines.
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

export default function VerifyPrescriptionScreen() {
  const { number = '', code = '' } = useParams();
  const [res, setRes] = useState<PrescriptionCheck | null>(null);
  const [fail, setFail] = useState<string | null>(null);

  // Only a 404 means "not a Vizito prescription". Any other failure is ours, never a verdict on it.
  const check = () => {
    setFail(null);
    setRes(null);
    verifyPrescriptionApi(number, code)
      .then(setRes)
      .catch((e) => {
        const st = e?.response?.status;
        setFail(st === 404 ? 'not-found' : st === 429 ? labError(e, 'Too many checks. Try again in a minute.') : 'unavailable');
      });
  };
  useEffect(check, [number, code]);

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
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Prescription verification</h1>
          <div className="w-full border-b border-[#EAE6FD] mt-4" />
        </header>

        {/* State Content */}
        <div className="w-full mt-6 flex flex-col items-center">
          {/* Loading */}
          {!res && !fail && (
            <div className="w-full flex flex-col items-center justify-center py-16 space-y-3">
              <div className="w-8 h-8 border-2 border-[#6D4AEF] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium text-slate-500">Checking prescription…</p>
            </div>
          )}

          {/* Genuine: res && res.valid */}
          {res && res.valid && (
            <div className="w-full flex flex-col items-center space-y-5 sm:space-y-6">
              {/* Large green shield-check badge with soft halo */}
              <div className="relative flex items-center justify-center w-24 h-28 my-1">
                <svg viewBox="0 0 100 120" className="w-full h-full" fill="none" aria-hidden="true">
                  <path d="M 50 4 C 80 4 92 16 92 38 C 92 78 64 104 50 116 C 36 104 8 78 8 38 C 8 16 20 4 50 4 Z" fill="#DCFCE7" />
                  <path d="M 50 14 C 74 14 84 23 84 41 C 84 72 61 94 50 104 C 39 94 16 72 16 41 C 16 23 26 14 50 14 Z" fill="#16A34A" />
                  <path d="M 36 57 L 46 67 L 66 47" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              {/* Genuine prescription in large green text */}
              <h2 role="status" className="text-2xl sm:text-[26px] font-bold text-[#15803D] tracking-tight text-center">
                Genuine prescription
              </h2>

              {/* Bordered details card with rows */}
              <div className="w-full bg-white rounded-2xl border border-[#E6EAF2] overflow-hidden shadow-sm">
                <div className="divide-y divide-slate-100 text-sm">
                  <div className="grid grid-cols-[90px_1fr] items-center px-4 py-3.5">
                    <span className="text-slate-500 font-medium">Rx no.</span>
                    <span className="font-semibold text-slate-900">{res.prescription_number}</span>
                  </div>
                  <div className="grid grid-cols-[90px_1fr] items-center px-4 py-3.5">
                    <span className="text-slate-500 font-medium">Doctor</span>
                    <span className="font-semibold text-slate-900">{res.doctor_name || '—'}</span>
                  </div>
                  {res.doctor_registration_number && (
                    <div className="grid grid-cols-[90px_1fr] items-center px-4 py-3.5">
                      <span className="text-slate-500 font-medium">Reg. No.</span>
                      <span className="font-semibold text-slate-900">{res.doctor_registration_number}</span>
                    </div>
                  )}
                  {res.clinic_name && (
                    <div className="grid grid-cols-[90px_1fr] items-center px-4 py-3.5">
                      <span className="text-slate-500 font-medium">Clinic</span>
                      <span className="font-semibold text-slate-900">{res.clinic_name}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-[90px_1fr] items-center px-4 py-3.5">
                    <span className="text-slate-500 font-medium">Issued</span>
                    <span className="font-semibold text-slate-900">{when(res.issued_at)}</span>
                  </div>
                </div>
              </div>

              {/* Lavender tip card with mortar-and-pestle icon and vertical divider */}
              <div className="w-full bg-[#FAF8FF] border border-[#DDD5FC] rounded-2xl p-4 flex items-center gap-4">
                <div className="shrink-0">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6D4AEF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 11h14a1 1 0 0 1 1 1v1a7 7 0 0 1-7 7 7 7 0 0 1-7-7v-1a1 1 0 0 1 1-1Z" />
                    <path d="m15 4-4 7" />
                    <path d="M9 15h6" />
                    <path d="M12 12v6" />
                  </svg>
                </div>
                <div className="w-px h-8 bg-[#DDD5FC] shrink-0" />
                <p className="text-sm font-semibold text-slate-900 leading-snug">
                  Compare these details with the printed copy before dispensing.
                </p>
              </div>

              {/* Privacy card with lock-shield icon */}
              <div className="w-full bg-white border border-[#E6EAF2] rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                <div className="shrink-0 text-slate-500">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#66738F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <rect x="9" y="11" width="6" height="5" rx="1" />
                    <path d="M10 11V9a2 2 0 0 1 4 0v2" />
                  </svg>
                </div>
                <div className="w-px h-8 bg-[#E6EAF2] shrink-0" />
                <p className="text-sm font-semibold text-slate-900 leading-snug">
                  This page never shows the patient or the medicines.
                </p>
              </div>
            </div>
          )}

          {/* Draft: res && !res.valid */}
          {res && !res.valid && (
            <div className="w-full bg-white rounded-3xl border border-[#E6EAF2] p-6 sm:p-8 flex flex-col items-center text-center space-y-4 shadow-sm">
              {/* Amber shield with document icon */}
              <div className="w-24 h-28 relative flex items-center justify-center my-1">
                <svg viewBox="0 0 100 120" className="w-full h-full" fill="none" aria-hidden="true">
                  <path d="M 50 4 C 80 4 92 16 92 38 C 92 78 64 104 50 116 C 36 104 8 78 8 38 C 8 16 20 4 50 4 Z" fill="#FEF3C7" stroke="#FDE68A" strokeWidth="2" />
                  <path d="M 50 14 C 74 14 84 23 84 41 C 84 72 61 94 50 104 C 39 94 16 72 16 41 C 16 23 26 14 50 14 Z" fill="#FFFBEB" stroke="#F59E0B" strokeWidth="2.5" />
                  <g transform="translate(36, 44)">
                    <path d="M3 2h8l5 5v13a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="11 2 11 7 16 7" fill="none" stroke="#D97706" strokeWidth="2"/>
                    <line x1="9" y1="11" x2="9" y2="15" stroke="#D97706" strokeWidth="2" strokeLinecap="round"/>
                    <circle cx="9" cy="18" r="0.75" fill="#D97706"/>
                  </g>
                </svg>
              </div>

              <h2 role="status" className="text-2xl font-bold text-slate-900 tracking-tight">
                Not issued (draft)
              </h2>

              <span className="inline-flex items-center px-4 py-1 rounded-full text-sm font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                Do not dispense
              </span>

              <p className="text-base text-slate-600 max-w-xs leading-relaxed">
                This prescription was not finalized and was never issued to the patient.
              </p>

              <div className="w-full border-t border-slate-100 my-2" />

              <p className="text-sm text-slate-500">
                Draft prescriptions do not carry dispensing authority.
              </p>
            </div>
          )}

          {/* Not Found: fail === 'not-found' */}
          {fail === 'not-found' && (
            <div className="w-full flex flex-col items-center space-y-5 sm:space-y-6">
              {/* Red shield-x badge */}
              <div className="relative flex items-center justify-center w-24 h-28 my-1">
                <svg viewBox="0 0 100 120" className="w-full h-full" fill="none" aria-hidden="true">
                  <path d="M 50 4 C 80 4 92 16 92 38 C 92 78 64 104 50 116 C 36 104 8 78 8 38 C 8 16 20 4 50 4 Z" fill="#FEE2E2" />
                  <path d="M 50 14 C 74 14 84 23 84 41 C 84 72 61 94 50 104 C 39 94 16 72 16 41 C 16 23 26 14 50 14 Z" fill="#DC2626" />
                  <path d="M 38 46 L 62 70 M 62 46 L 38 70" stroke="white" strokeWidth="6" strokeLinecap="round" />
                </svg>
              </div>

              <div className="text-center space-y-2">
                <h2 role="alert" className="text-2xl sm:text-[26px] font-bold text-[#DC2626] tracking-tight">
                  Could not be verified
                </h2>
                <p className="text-base text-slate-600">
                  This prescription could not be verified.
                </p>
              </div>

              {/* Red-tint warning card */}
              <div className="w-full bg-[#FFF5F5] border border-[#FEE2E2] rounded-2xl p-4 flex items-start gap-4">
                <div className="shrink-0 text-[#DC2626] mt-0.5">
                  <AlertTriangle className="w-7 h-7 stroke-[1.8]" />
                </div>
                <div className="w-px self-stretch bg-[#FECACA] shrink-0" />
                <p className="text-sm font-semibold text-slate-900 leading-snug text-left">
                  The code does not match a prescription issued through Vizito. Do not dispense on this copy; contact the doctor named on it.
                </p>
              </div>

              {/* Privacy card */}
              <div className="w-full bg-white border border-[#E6EAF2] rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                <div className="shrink-0 text-slate-500">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#66738F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <rect x="9" y="11" width="6" height="5" rx="1" />
                    <path d="M10 11V9a2 2 0 0 1 4 0v2" />
                  </svg>
                </div>
                <div className="w-px h-8 bg-[#E6EAF2] shrink-0" />
                <p className="text-sm font-semibold text-slate-900 leading-snug text-left">
                  No patient or medicine details are shown when verification fails.
                </p>
              </div>
            </div>
          )}

          {/* Unavailable: fail === 'unavailable' */}
          {fail === 'unavailable' && (
            <div className="w-full bg-white rounded-3xl border border-[#E6EAF2] p-6 sm:p-8 flex flex-col items-center text-center space-y-4 shadow-sm">
              {/* Grey shield with wifi-alert icon */}
              <div className="w-24 h-28 relative flex items-center justify-center my-1">
                <svg viewBox="0 0 100 120" className="w-full h-full" fill="none" aria-hidden="true">
                  <path d="M 50 4 C 80 4 92 16 92 38 C 92 78 64 104 50 116 C 36 104 8 78 8 38 C 8 16 20 4 50 4 Z" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="2" />
                  <path d="M 50 14 C 74 14 84 23 84 41 C 84 72 61 94 50 104 C 39 94 16 72 16 41 C 16 23 26 14 50 14 Z" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="2.5" />
                  <g transform="translate(34, 40)">
                    <path d="M1 1l22 22" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
                    <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
                    <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
                    <path d="M10.71 5.05A16 16 0 0 1 22.58 9" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
                    <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
                    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="12" cy="20" r="1.5" fill="#64748B" />
                  </g>
                </svg>
              </div>

              <h2 role="alert" className="text-2xl font-bold text-slate-900 tracking-tight">
                We couldn't check this right now
              </h2>

              <p className="text-base text-slate-600 max-w-xs leading-relaxed">
                There may be a temporary network or server problem. Please try again.
              </p>

              <button
                onClick={check}
                className="px-8 py-2.5 rounded-xl border-2 border-[#6D4AEF] text-[#6D4AEF] hover:bg-[#F1EDFF] font-bold text-base transition-colors cursor-pointer"
              >
                Try again
              </button>

              <div className="w-full border-t border-slate-100 my-2" />

              <p className="text-sm text-slate-500">
                No verification result was available.
              </p>
            </div>
          )}

          {/* Rate Limit (429) or Other Failure */}
          {fail && fail !== 'not-found' && fail !== 'unavailable' && (
            <div className="w-full bg-white rounded-3xl border border-[#E6EAF2] p-6 sm:p-8 flex flex-col items-center text-center space-y-4 shadow-sm" role="alert">
              <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Please wait</h2>
              <p className="text-sm text-slate-600 max-w-xs">{fail}</p>
              <button
                onClick={check}
                className="px-6 py-2.5 rounded-xl border-2 border-[#6D4AEF] text-[#6D4AEF] hover:bg-[#F1EDFF] font-bold text-sm transition-colors cursor-pointer"
              >
                Try again
              </button>
            </div>
          )}
        </div>

        {/* Footer on every state */}
        <footer className="mt-12 flex items-center justify-center gap-3 w-full">
          <div className="h-px flex-1 bg-[#DDD5FC]" />
          <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">Verified via Vizito</span>
          <div className="h-px flex-1 bg-[#DDD5FC]" />
        </footer>
      </div>
      {/* Hidden brand logo image asset for bundle and strict asset compliance */}
      <img src={logoImg} alt="" className="hidden" aria-hidden="true" />
    </main>
  );
}
