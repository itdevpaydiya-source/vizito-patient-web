import React, { useEffect, useState } from 'react';
import { HeartPulse, Plus, X, ShieldAlert, Pill, Phone, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import {
  BLOOD_GROUPS, COMMON_CONDITIONS, getHealthProfileApi, saveHealthProfileApi,
  type HealthProfile, type ReportedAllergy, type ReportedMedication,
} from '../../../services/healthProfileHelper';
import { formatDate } from '../../../utils/dateFormat';

const field = 'w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20';
const label = 'block text-[11px] font-bold text-slate-600 mb-1';

// Health Profile: what the patient tells us once so every doctor sees it (marked "patient-reported")
// instead of the patient repeating it at each visit.
export default function HealthProfileSection() {
  const [loaded, setLoaded] = useState<HealthProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [bloodGroup, setBloodGroup] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [allergies, setAllergies] = useState<ReportedAllergy[]>([]);
  const [noAllergies, setNoAllergies] = useState(false);
  const [newAllergy, setNewAllergy] = useState<ReportedAllergy>({ allergen: '', reaction: '', severity: '' });
  const [conditions, setConditions] = useState<string[]>([]);
  const [otherCondition, setOtherCondition] = useState('');
  const [meds, setMeds] = useState<ReportedMedication[]>([]);
  const [newMed, setNewMed] = useState<ReportedMedication>({ name: '', dose: '' });
  const [ecName, setEcName] = useState('');
  const [ecRelation, setEcRelation] = useState('');
  const [ecPhone, setEcPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const fill = (h: HealthProfile) => {
    setLoaded(h);
    setBloodGroup(h.blood_group || '');
    setHeight(h.height_cm ? String(h.height_cm) : '');
    setWeight(h.weight_kg ? String(h.weight_kg) : '');
    setAllergies(h.allergies || []);
    setNoAllergies(!!h.no_known_allergies);
    setConditions(h.conditions || []);
    setMeds(h.medications || []);
    setEcName(h.emergency_contact?.name || '');
    setEcRelation(h.emergency_contact?.relation || '');
    setEcPhone(h.emergency_contact?.phone || '');
  };

  useEffect(() => {
    getHealthProfileApi().then(fill).catch(() => setLoadError('Could not load your health profile.'));
  }, []);

  const dirty = () => { setSaved(false); setError(null); };

  const addAllergy = () => {
    const a = newAllergy.allergen.trim();
    if (a.length < 2 || allergies.some((x) => x.allergen.toLowerCase() === a.toLowerCase())) return;
    setAllergies([...allergies, { allergen: a, reaction: newAllergy.reaction?.trim() || null, severity: newAllergy.severity || null }]);
    setNewAllergy({ allergen: '', reaction: '', severity: '' });
    setNoAllergies(false);
    dirty();
  };
  const addMed = () => {
    const n = newMed.name.trim();
    if (n.length < 2) return;
    setMeds([...meds, { name: n, dose: newMed.dose?.trim() || null }]);
    setNewMed({ name: '', dose: '' });
    dirty();
  };
  const toggleCondition = (c: string) => { setConditions(conditions.includes(c) ? conditions.filter((x) => x !== c) : [...conditions, c]); dirty(); };

  const h = Number(height), w = Number(weight);
  const bmi = h > 0 && w > 0 ? Math.round((w / ((h / 100) ** 2)) * 10) / 10 : null;

  const save = async () => {
    setError(null);
    if (height && (h < 30 || h > 250)) return setError('Height must be between 30 and 250 cm.');
    if (weight && (w < 1 || w > 300)) return setError('Weight must be between 1 and 300 kg.');
    if (ecPhone && !/^[6-9]\d{9}$/.test(ecPhone)) return setError('Emergency contact must be a 10-digit Indian mobile number.');
    if (ecPhone && !ecName.trim()) return setError('Add the emergency contact’s name.');
    setSaving(true);
    try {
      fill(await saveHealthProfileApi({
        blood_group: bloodGroup, height_cm: height ? h : null, weight_kg: weight ? w : null,
        allergies, no_known_allergies: noAllergies && allergies.length === 0, conditions, medications: meds,
        emergency_contact_name: ecName.trim(), emergency_contact_relation: ecRelation.trim(), emergency_contact_phone: ecPhone.trim(),
      }));
      setSaved(true);
    } catch (e: any) {
      setError(e?.message || 'Could not save your health profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loadError) return <div className="bg-white rounded-3xl border border-slate-200 p-6 text-sm font-semibold text-rose-600">{loadError}</div>;
  if (!loaded) return <div className="bg-white rounded-3xl border border-slate-200 p-6 text-sm text-slate-400">Loading…</div>;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6 shadow-xs">
      <div className="border-b border-slate-100 pb-3">
        <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2"><HeartPulse className="w-5 h-5 text-teal-600" /> Health Profile</h3>
        <p className="text-xs text-slate-500 mt-0.5 flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" /> Your doctor sees this at every visit, marked as reported by you, so you don’t have to repeat it.
          {loaded.updated_at && ` Last updated ${formatDate(loaded.updated_at)}.`}
        </p>
      </div>

      {/* Basics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div>
          <label htmlFor="hp-bg" className={label}>Blood group</label>
          <select id="hp-bg" value={bloodGroup} onChange={(e) => { setBloodGroup(e.target.value); dirty(); }} className={field}>
            <option value="">Not known</option>
            {BLOOD_GROUPS.map((b) => <option key={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="hp-h" className={label}>Height (cm)</label>
          <input id="hp-h" inputMode="decimal" value={height} onChange={(e) => { setHeight(e.target.value.replace(/[^\d.]/g, '')); dirty(); }} placeholder="e.g. 165" className={field} />
        </div>
        <div>
          <label htmlFor="hp-w" className={label}>Weight (kg)</label>
          <input id="hp-w" inputMode="decimal" value={weight} onChange={(e) => { setWeight(e.target.value.replace(/[^\d.]/g, '')); dirty(); }} placeholder="e.g. 62" className={field} />
        </div>
        <div>
          <span className={label}>BMI</span>
          <p className="p-2.5 text-xs font-black text-slate-800" aria-live="polite">{bmi ?? '—'}</p>
        </div>
      </div>

      {/* Allergies */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5"><ShieldAlert className="w-4 h-4 text-rose-600" /> Allergies</legend>
        {allergies.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Your allergies">
            {allergies.map((a, i) => (
              <li key={a.allergen} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800">
                {a.allergen}{a.reaction ? ` · ${a.reaction}` : ''}{a.severity ? ` (${a.severity})` : ''}
                <button type="button" aria-label={`Remove ${a.allergen}`} onClick={() => { setAllergies(allergies.filter((_, j) => j !== i)); dirty(); }}><X className="w-3.5 h-3.5" /></button>
              </li>
            ))}
          </ul>
        )}
        {!noAllergies && (
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_120px_auto] gap-2">
            <label htmlFor="hp-al" className="sr-only">Allergic to</label>
            <input id="hp-al" value={newAllergy.allergen} maxLength={80} onChange={(e) => setNewAllergy({ ...newAllergy, allergen: e.target.value })} placeholder="Allergic to, e.g. Penicillin, peanuts" className={field} />
            <label htmlFor="hp-alr" className="sr-only">Reaction</label>
            <input id="hp-alr" value={newAllergy.reaction || ''} maxLength={120} onChange={(e) => setNewAllergy({ ...newAllergy, reaction: e.target.value })} placeholder="What happens (rash, swelling…)" className={field} />
            <label htmlFor="hp-als" className="sr-only">Severity</label>
            <select id="hp-als" value={newAllergy.severity || ''} onChange={(e) => setNewAllergy({ ...newAllergy, severity: e.target.value })} className={field}>
              <option value="">Severity</option><option>Mild</option><option>Moderate</option><option>Severe</option>
            </select>
            <button type="button" onClick={addAllergy} disabled={newAllergy.allergen.trim().length < 2} className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add allergy</button>
          </div>
        )}
        {allergies.length === 0 && (
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <input type="checkbox" checked={noAllergies} onChange={(e) => { setNoAllergies(e.target.checked); dirty(); }} className="w-4 h-4 accent-teal-600" />
            I have no known allergies
          </label>
        )}
      </fieldset>

      {/* Conditions */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-extrabold text-slate-800">Long-term conditions</legend>
        <div className="flex flex-wrap gap-2">
          {[...COMMON_CONDITIONS, ...conditions.filter((c) => !COMMON_CONDITIONS.includes(c))].map((c) => (
            <button key={c} type="button" role="checkbox" aria-checked={conditions.includes(c)} onClick={() => toggleCondition(c)}
              className={`px-3 py-1.5 rounded-full border text-xs font-bold ${conditions.includes(c) ? 'bg-teal-600 border-teal-600 text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
              {c}
            </button>
          ))}
        </div>
        <div className="flex gap-2 max-w-md">
          <label htmlFor="hp-cond" className="sr-only">Other condition</label>
          <input id="hp-cond" value={otherCondition} maxLength={80} onChange={(e) => setOtherCondition(e.target.value)} placeholder="Other condition" className={field} />
          <button type="button" disabled={otherCondition.trim().length < 2} onClick={() => { const c = otherCondition.trim(); if (!conditions.includes(c)) { setConditions([...conditions, c]); dirty(); } setOtherCondition(''); }}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Add</button>
        </div>
      </fieldset>

      {/* Medicines */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5"><Pill className="w-4 h-4 text-teal-600" /> Medicines you take regularly</legend>
        {meds.length > 0 && (
          <ul className="space-y-1" aria-label="Your regular medicines">
            {meds.map((m, i) => (
              <li key={`${m.name}-${i}`} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <span><b className="text-slate-800">{m.name}</b>{m.dose ? <span className="text-slate-500"> · {m.dose}</span> : null}</span>
                <button type="button" aria-label={`Remove ${m.name}`} onClick={() => { setMeds(meds.filter((_, j) => j !== i)); dirty(); }} className="text-slate-400 hover:text-rose-600"><X className="w-3.5 h-3.5" /></button>
              </li>
            ))}
          </ul>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
          <label htmlFor="hp-med" className="sr-only">Medicine</label>
          <input id="hp-med" value={newMed.name} maxLength={100} onChange={(e) => setNewMed({ ...newMed, name: e.target.value })} placeholder="Medicine, e.g. Metformin 500 mg" className={field} />
          <label htmlFor="hp-dose" className="sr-only">How you take it</label>
          <input id="hp-dose" value={newMed.dose || ''} maxLength={80} onChange={(e) => setNewMed({ ...newMed, dose: e.target.value })} placeholder="How you take it, e.g. 1-0-1 after food" className={field} />
          <button type="button" onClick={addMed} disabled={newMed.name.trim().length < 2} className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add medicine</button>
        </div>
      </fieldset>

      {/* Emergency contact */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5"><Phone className="w-4 h-4 text-teal-600" /> Emergency contact</legend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div><label htmlFor="hp-ecn" className={label}>Name</label><input id="hp-ecn" value={ecName} maxLength={100} onChange={(e) => { setEcName(e.target.value); dirty(); }} className={field} /></div>
          <div><label htmlFor="hp-ecr" className={label}>Relationship</label><input id="hp-ecr" value={ecRelation} maxLength={40} onChange={(e) => { setEcRelation(e.target.value); dirty(); }} placeholder="e.g. Spouse" className={field} /></div>
          <div><label htmlFor="hp-ecp" className={label}>Mobile</label><input id="hp-ecp" inputMode="numeric" value={ecPhone} maxLength={10} onChange={(e) => { setEcPhone(e.target.value.replace(/\D/g, '')); dirty(); }} placeholder="10-digit mobile" className={field} /></div>
        </div>
      </fieldset>

      {error && <p role="alert" className="flex items-center gap-2 text-xs font-bold text-rose-700"><AlertCircle className="w-4 h-4" /> {error}</p>}
      <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
        {saved && <span role="status" className="flex items-center gap-1.5 text-xs font-bold text-emerald-700"><CheckCircle2 className="w-4 h-4" /> Saved — your doctor will see this at your next visit.</span>}
        <button type="button" onClick={save} disabled={saving} className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-bold text-xs">
          {saving ? 'Saving…' : 'Save health profile'}
        </button>
      </div>
    </div>
  );
}
