import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Droplets, FileUp } from 'lucide-react';
import {
  bloodError, bloodReferenceApi, createBloodRequestApi, myRequisitionsApi, newIdempotencyKey, uploadRequisitionApi,
  type BloodReference, type Requisition,
} from '../../../services/bloodbankHelper';
import { getFamilyMembersApi, getMyUserId, type PatientFamilyMember } from '../../../services/familyHelper';

// Request blood from one blood bank: for me or a family member, against a doctor's requisition on
// Vizito or an uploaded hospital requisition. The blood bank checks it, takes a sample and cross-matches.
const sel = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800';

const RequestBloodScreen = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const bankId = params.get('bank') || '';
  const bankName = params.get('name') || 'the blood bank';
  const selectedGroup = params.get('group') || '';
  const selectedComponent = params.get('component') || '';
  const [ref, setRef] = useState<BloodReference | null>(null);
  const [family, setFamily] = useState<PatientFamilyMember[]>([]);
  const [forWho, setForWho] = useState('');
  const [reqs, setReqs] = useState<Requisition[]>([]);
  const [requisitionId, setRequisitionId] = useState('');
  const [f, setF] = useState({ component_code: selectedComponent, requested_group: selectedGroup, quantity: '1', urgency: 'ROUTINE', indication: '', is_emergency: false, emergency_reason: '' });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const attemptKey = useMemo(() => newIdempotencyKey(), []); // same key on retries of this submit
  const groupLocked = !!selectedGroup && (!ref || ref.groups.some((g) => g.code === selectedGroup));
  const componentLocked = !!selectedComponent && (!ref || ref.components.some((c) => c.code === selectedComponent));

  useEffect(() => {
    bloodReferenceApi().then(setRef).catch((e) => setErr(bloodError(e, 'Could not load blood groups.')));
    getMyUserId().then((id) => (id ? getFamilyMembersApi(id) : [])).then(setFamily).catch(() => setFamily([]));
  }, []);
  useEffect(() => {
    myRequisitionsApi(forWho || undefined).then((r) => { setReqs(r); setRequisitionId((cur) => (r.some((x) => x.id === cur) ? cur : '')); }).catch(() => setReqs([]));
  }, [forWho]);

  const pickRequisition = (id: string) => {
    setRequisitionId(id);
    const r = reqs.find((x) => x.id === id);
    if (r?.source === 'DOCTOR') setF((cur) => ({ ...cur, component_code: componentLocked ? cur.component_code : (r.component_code || cur.component_code), requested_group: groupLocked ? cur.requested_group : (r.requested_group || cur.requested_group), quantity: String(r.quantity || cur.quantity), urgency: r.urgency || cur.urgency }));
  };
  const upload = async (file?: File) => {
    if (!file) return;
    setBusy(true); setErr(null);
    try { const r = await uploadRequisitionApi(file, forWho || undefined); setReqs([r, ...reqs]); setRequisitionId(r.id); }
    catch (e) { setErr(bloodError(e, 'Could not upload the requisition.')); } finally { setBusy(false); }
  };
  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await createBloodRequestApi({ bloodbank_partner_id: bankId, requisition_id: requisitionId, family_member_id: forWho || undefined, ...f, quantity: Number(f.quantity) }, attemptKey);
      navigate(`/blood-requests?open=${r.id}`);
    } catch (e) { setErr(bloodError(e, 'Could not send the request.')); } finally { setBusy(false); }
  };

  if (!bankId) {
    // D4: a doctor's requisition from a hospital with its own blood bank is routed there by the server.
    const routed = reqs.filter((r) => r.routed_bloodbank);
    return (
      <div className="max-w-xl mx-auto px-4 py-6 space-y-3">
        {routed.map((r) => (
          <div key={r.id} className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 space-y-2">
            <p>Your doctor’s requisition ({r.quantity} × {r.requested_group} {r.component_code}) goes to <b>{r.routed_bloodbank!.name || 'your hospital’s blood bank'}</b>.</p>
            <button className="font-bold underline" onClick={() => navigate(`/request-blood?bank=${encodeURIComponent(r.routed_bloodbank!.partner_id)}&name=${encodeURIComponent(r.routed_bloodbank!.name || '')}`)}>Request blood there</button>
          </div>
        ))}
        <p className="text-sm">Or choose a blood bank from <button className="font-bold text-rose-700 underline" onClick={() => navigate('/find-blood')}>Find blood</button>.</p>
      </div>
    );
  }
  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2"><Droplets className="w-6 h-6 text-rose-600" /> Request blood</h1>
        <p className="text-sm text-slate-500 mt-1">From {bankName}. They will check the requisition, take a blood sample and cross-match before issuing.</p>
      </div>
      <div role="note" className="flex gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /><p><b>In an emergency, call 108 or go to the nearest hospital.</b> You pay only the blood bank’s processing charge — blood is never sold.</p></div>

      <section aria-label="Request details" className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <label className="block text-xs font-bold text-slate-700">For
          <select aria-label="For" value={forWho} onChange={(e) => setForWho(e.target.value)} className={`${sel} mt-1`}>
            <option value="">Me</option>
            {family.map((m) => <option key={m.associationId} value={String(m.memberUserId)}>{m.name} ({m.relationship})</option>)}
          </select>
        </label>
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-700">Requisition</p>
          {reqs.length > 0 && (
            <select aria-label="Requisition" value={requisitionId} onChange={(e) => pickRequisition(e.target.value)} className={sel}>
              <option value="">Choose a requisition</option>
              {reqs.map((r) => <option key={r.id} value={r.id}>{r.source === 'DOCTOR' ? `From ${r.doctor_name} — ${r.quantity} × ${r.requested_group} ${r.component_code}` : `Uploaded: ${r.file_name}`}</option>)}
            </select>
          )}
          <label className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 cursor-pointer"><FileUp className="w-4 h-4" /> Upload hospital requisition
            <input type="file" accept="application/pdf,image/jpeg,image/png" className="sr-only" aria-label="Requisition file" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
          <p className="text-xs text-slate-500">PDF, JPG or PNG up to 10 MB. Only you and the blood bank can open it.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-bold text-slate-700">Blood group<select aria-label="Blood group" value={f.requested_group} disabled={groupLocked} onChange={(e) => setF({ ...f, requested_group: e.target.value })} className={`${sel} mt-1 disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed`}><option value="">Choose</option>{ref?.groups.map((g) => <option key={g.code} value={g.code}>{g.code}</option>)}</select></label>
          <label className="text-xs font-bold text-slate-700">Component<select aria-label="Component" value={f.component_code} disabled={componentLocked} onChange={(e) => setF({ ...f, component_code: e.target.value })} className={`${sel} mt-1 disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed`}><option value="">Choose</option>{ref?.components.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select></label>
          {(groupLocked || componentLocked) && <p className="col-span-2 text-xs text-slate-500">Selected from Find Blood. Return to Find Blood to choose a different blood group or component.</p>}
          <label className="text-xs font-bold text-slate-700">Units<input aria-label="Units" inputMode="numeric" value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value.replace(/\D/g, '').slice(0, 2) })} className={`${sel} mt-1`} /></label>
          <label className="text-xs font-bold text-slate-700">Urgency<select aria-label="Urgency" value={f.urgency} onChange={(e) => setF({ ...f, urgency: e.target.value })} className={`${sel} mt-1`}><option value="ROUTINE">Routine</option><option value="URGENT">Urgent</option></select></label>
        </div>
        <label className="block text-xs font-bold text-slate-700">Note to the blood bank (optional)<input maxLength={300} value={f.indication} onChange={(e) => setF({ ...f, indication: e.target.value })} className={`${sel} mt-1`} /></label>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={f.is_emergency} onChange={(e) => setF({ ...f, is_emergency: e.target.checked })} className="mt-1" /> This is an emergency (the blood bank decides under its own protocol)</label>
        {f.is_emergency && <label className="block text-xs font-bold text-slate-700">Why?<input value={f.emergency_reason} onChange={(e) => setF({ ...f, emergency_reason: e.target.value })} className={`${sel} mt-1`} /></label>}
        {err && <p role="alert" className="text-sm font-semibold text-rose-700">{err}</p>}
        <button onClick={submit} disabled={busy || !requisitionId} className="w-full rounded-xl bg-rose-600 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Sending…' : 'Send request'}</button>
      </section>
    </div>
  );
};

export default RequestBloodScreen;
