import ThemedSelect from '../../components/forms/ThemedSelect';
import { useEffect, useState } from 'react';
import {
  User,
  Users,
  CheckCircle2,
  FileText,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Check,
  Stethoscope,
  Phone,
  Calendar,
} from 'lucide-react';
import { getPrescriptionsApi, type PatientPrescription } from '../../../services/patientHelper';
import { rxTestsApi, labError, type RxTests } from '../../../services/labHelper';
import { ageLabelFromDob, type PatientFamilyMember } from '../../../services/familyHelper';
import type { ReviewPatient } from './LabReview';

export default function LabPatientDetails({
  family,
  patient,
  who,
  onPatient,
  reason: _reason,
  onReason: _onReason,
  rx,
  onRx,
  loading,
  error,
  onRetry,
  onContinue,
}: {
  family: PatientFamilyMember[];
  patient: ReviewPatient | null;
  who: string;
  onPatient: (id: string) => void;
  reason: string;
  onReason: (s: string) => void;
  rx: RxTests | null;
  onRx: (r: RxTests | null) => void;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onContinue: () => void;
}) {
  const [prescriptions, setPrescriptions] = useState<PatientPrescription[]>([]);
  const [rxError, setRxError] = useState('');
  const [rxBusy, setRxBusy] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    getPrescriptionsApi()
      .then((r) => {
        if (active) setPrescriptions(r.filter((p) => p.tests.some((t) => t.code)));
      })
      .catch((e) => {
        if (active) setRxError(labError(e, 'Could not load doctor prescriptions.'));
      });
    return () => {
      active = false;
    };
  }, [retry]);

  const choose = async (id: string) => {
    if (!id) {
      onRx(null);
      return;
    }
    setRxBusy(true);
    setRxError('');
    try {
      const r = await rxTestsApi(id);
      if ((r.family_member_id || '') !== who) {
        setRxError('Choose a prescription for the selected patient.');
        return;
      }
      onRx(r);
    } catch (e) {
      setRxError(labError(e, 'Could not open the prescription.'));
    } finally {
      setRxBusy(false);
    }
  };

  // Build the list of selectable patient profiles including Self
  const patientProfiles = [
    { id: '', name: 'Self', relation: 'Primary Account', isSelf: true },
    ...family.map((f) => ({
      id: String(f.memberUserId),
      name: f.name,
      relation: f.relationship || 'Family Member',
      isSelf: false,
    })),
  ];

  return (
    <section className="w-full max-w-4xl space-y-5" aria-label="Patient details">
      {/* 1. Main Card: Who is this test for? */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs space-y-6">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">Who is this test for?</h2>
          <p className="text-xs text-slate-500 mt-1">
            The diagnostic report and health records will be generated in this patient’s name.
          </p>
        </div>

        {/* Patient Selection Cards (Self + Family) */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 block">Select Patient</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3" role="radiogroup" aria-label="Select patient">
            {patientProfiles.map((p) => {
              const active = who === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={rxBusy}
                  onClick={() => {
                    onPatient(p.id);
                    onRx(null);
                    setRxError('');
                  }}
                  className={`p-4 rounded-xl border-2 text-left transition flex items-center justify-between gap-3 cursor-pointer ${
                    active
                      ? 'border-orange-500 bg-orange-50/40 text-slate-900 shadow-xs ring-2 ring-orange-500/10'
                      : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                        active ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {p.isSelf ? <User className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <strong className="block text-sm font-bold truncate">{p.name}</strong>
                      <span className="text-[11px] text-slate-500 capitalize block truncate">
                        {p.relation}
                      </span>
                    </div>
                  </div>
                  {active && (
                    <div className="w-5 h-5 rounded-full bg-orange-600 text-white flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Patient Verified Information Banner */}
        {loading ? (
          <div role="status" className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center space-y-2">
            <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-600">Loading patient details…</p>
          </div>
        ) : error ? (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-rose-800">{error}</span>
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 underline"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        ) : patient ? (
          <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-4 sm:p-5 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-teal-900 pb-2 border-b border-teal-200/60">
              <CheckCircle2 className="w-4 h-4 text-teal-700" />
              <span>Verified patient details for medical report</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-xs">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase block">Name</span>
                <strong className="text-sm font-bold text-slate-900 block truncate">{patient.name}</strong>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase block">Age</span>
                <strong className="text-sm font-bold text-slate-900 block">
                  {patient.dateOfBirth ? ageLabelFromDob(patient.dateOfBirth) : '—'}
                </strong>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase block">Gender</span>
                <strong className="text-sm font-bold text-slate-900 block capitalize">
                  {patient.gender || '—'}
                </strong>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase block">Contact number</span>
                <strong className="text-sm font-bold text-slate-900 block truncate">
                  {patient.phone || '—'}
                </strong>
              </div>
            </div>
          </div>
        ) : null}

        {/* 3. Doctor Prescription (Optional) */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <Stethoscope className="w-3.5 h-3.5 text-slate-500" /> Doctor prescription (optional)
          </label>
          <ThemedSelect
            variant="menu"
            aria-label="Doctor prescription"
            value={rx?.prescription_id || ''}
            disabled={rxBusy}
            onChange={(e) => void choose(e.target.value)}
          >
            <option value="">No prescription selected</option>
            {prescriptions.map((p) => (
              <option key={p.id} value={p.id}>
                {[p.prescription_number, p.patient_name, p.date?.slice(0, 10)].filter(Boolean).join(' · ')}
              </option>
            ))}
          </ThemedSelect>
          <p className="text-[11px] text-slate-500">
            Select an existing prescription issued by your doctor. The selected tests remain in your cart.
          </p>

          {rx && (
            <div className="rounded-xl border border-teal-200 bg-teal-50 p-3 text-xs text-teal-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-700 shrink-0" />
              <span>
                Prescription from <strong>{rx.doctor_name}</strong>
                {rx.patient_name ? ` for ${rx.patient_name}` : ''}
              </span>
            </div>
          )}

          {rxError && (
            <div role="alert" className="text-xs text-rose-700 font-semibold flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{rxError}</span>
              <button
                type="button"
                className="text-xs font-bold text-slate-700 underline"
                onClick={() => setRetry(retry + 1)}
              >
                Retry prescriptions
              </button>
            </div>
          )}
        </div>

        {/* 4. Action Footer */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400">
            Step 4 of 5 · Next: Review order summary & payment
          </span>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-sm hover:shadow transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            disabled={loading || !!error || !patient?.name || rxBusy || (!!rxError && !!rx)}
            onClick={onContinue}
          >
            <span>Continue to review & pay</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
