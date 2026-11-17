import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, FileText, Pill, FlaskConical, ShieldAlert } from 'lucide-react';
import { getSharedPrescriptionApi, type PatientPrescription } from '../../../services/patientHelper';
import { printPatientPrescription } from '../records/prescriptionPrint';

// Public page a walk-in patient (no Vizito app) opens from the WhatsApp link the doctor sent.
// The link is signed and expires in 7 days; the patient sees their prescription and can save the PDF.
const day = (d: string | null) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

export default function SharedPrescriptionScreen() {
  const { token = '' } = useParams();
  const [rx, setRx] = useState<(PatientPrescription & { share_expires_at: string }) | null>(null);
  const [fail, setFail] = useState<'gone' | 'error' | null>(null);
  const load = () => {
    setFail(null); setRx(null);
    getSharedPrescriptionApi(token).then(setRx).catch((e) => setFail(e?.response?.status === 404 ? 'gone' : 'error'));
  };
  useEffect(load, [token]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <header className="flex items-center justify-between">
          <p className="text-xl font-black text-slate-900">vizito</p>
          <span className="text-sm font-semibold text-slate-500">Prescription</span>
        </header>

        {!rx && !fail && <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading your prescription…</p>}

        {fail && (
          <section role="alert" className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
            <ShieldAlert className="mx-auto h-10 w-10 text-amber-600" />
            {fail === 'gone' ? (
              <>
                <h1 className="mt-3 text-lg font-bold text-slate-900">This link has expired</h1>
                <p className="mt-1 text-sm text-slate-600">Ask your doctor to share the prescription again.</p>
              </>
            ) : (
              <>
                <h1 className="mt-3 text-lg font-bold text-slate-900">We couldn’t open this right now</h1>
                <p className="mt-1 text-sm text-slate-600">This is a problem on our side. Please try again.</p>
                <button type="button" onClick={load} className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">Try again</button>
              </>
            )}
          </section>
        )}

        {rx && (
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-slate-900">{rx.doctor?.name || 'Your doctor'}</h1>
                {rx.doctor?.qualification && <p className="text-sm text-slate-600">{rx.doctor.qualification}</p>}
                {rx.doctor?.clinic_name && <p className="text-sm text-slate-600">{rx.doctor.clinic_name}</p>}
              </div>
              <div className="text-right text-sm">
                <p className="font-mono font-bold text-slate-900">{rx.prescription_number}</p>
                <p className="text-slate-500">{day(rx.date)}</p>
              </div>
            </div>

            <p className="text-sm text-slate-700">For <b>{rx.patient_name || 'you'}</b>{rx.patient_age != null ? `, ${rx.patient_age} y` : ''}</p>

            {rx.diagnosis && (
              <div><h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-900"><FileText className="h-4 w-4" />Diagnosis</h2><p className="mt-1 text-sm text-slate-700">{rx.diagnosis}</p></div>
            )}

            <div>
              <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-900"><Pill className="h-4 w-4" />Medicines ({rx.medicines.length})</h2>
              {rx.medicines.length ? (
                <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {rx.medicines.map((m, i) => (
                    <li key={i} className="px-4 py-3">
                      <p className="text-sm font-semibold text-slate-900">{m.name}</p>
                      <p className="text-sm text-slate-600">{[m.dosage, m.frequency, m.duration].filter(Boolean).join(' · ') || '—'}</p>
                      {m.instructions && <p className="text-xs text-slate-500">{m.instructions}</p>}
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-1 text-sm text-slate-500">No medicines prescribed.</p>}
            </div>

            {rx.tests.length > 0 && (
              <div>
                <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-900"><FlaskConical className="h-4 w-4" />Tests advised</h2>
                <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">{rx.tests.map((t, i) => <li key={i}>{t.name}{t.fasting_required ? ' (fasting needed)' : ''}</li>)}</ul>
              </div>
            )}

            {rx.notes && <div><h2 className="text-sm font-bold text-slate-900">Advice</h2><p className="mt-1 whitespace-pre-line text-sm text-slate-700">{rx.notes}</p></div>}

            <button type="button" onClick={() => printPatientPrescription(rx)} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-bold text-white sm:w-auto sm:px-6">
              <Download className="h-4 w-4" />Download PDF
            </button>
            <p className="text-xs text-slate-500">Shared by your doctor through Vizito. This link works until {day(rx.share_expires_at)}. Show the PDF or this page at any pharmacy or lab.</p>
          </section>
        )}
      </div>
    </main>
  );
}
