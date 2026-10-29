import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { ambulanceError, myNoteApi, openNoteFile, removeNoteApi, shareNoteApi, validateAmbulanceFile, type TransferNote } from '../../../services/ambulanceHelper';

// Transfer note: what the crew should know (e.g. a discharge summary). Shared only with the ambulance
// operator running this trip, only when the patient confirms. Can be removed until the trip is completed.
export default function TransferNoteSection({ tripId, editable }: { tripId: string; editable: boolean }) {
  const [note, setNote] = useState<TransferNote | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = () => {setErr(null);myNoteApi(tripId).then(setNote).catch(e => setErr(ambulanceError(e, 'Could not load the transfer note.')));};
  useEffect(load, [tripId]);
  const share = async () => {
    setBusy(true); setErr(null);
    try { setNote(await shareNoteApi(tripId, text, file)); setOpen(false); setText(''); setFile(null); setConsent(false); }
    catch (e) { setErr(ambulanceError(e, 'Could not share the note.')); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!window.confirm('Stop sharing this note with the ambulance crew?')) return;
    try { await removeNoteApi(tripId); setNote(null); } catch (e) { setErr(ambulanceError(e, 'Could not remove the note.')); }
  };
  if (note === undefined) return <section aria-label="Transfer note"><p>{err || 'Loading transfer note...'}</p>{err&&<button className="link" onClick={load}>Retry transfer note</button>}</section>;
  return (
    <section aria-label="Transfer note" className="rounded-xl border border-slate-200 p-3 space-y-2 text-sm">
      <p className="font-bold text-slate-800 flex items-center gap-1.5"><FileText className="w-4 h-4" /> Transfer note for the crew</p>
      {note ? (
        <>
          {note.text && <p className="whitespace-pre-wrap text-slate-700">{note.text}</p>}
          {note.has_file && <button onClick={() => openNoteFile(tripId).catch((e) => setErr(ambulanceError(e, 'Could not open the file.')))} className="font-bold text-rose-700 underline">{note.file_name}</button>}
          <p className="text-xs text-slate-500">Shared with the ambulance operator for this trip only.</p>
          {editable && <div className="flex gap-3"><button onClick={() => setOpen(true)} className="text-xs font-bold underline">Replace</button><button onClick={remove} className="text-xs font-bold text-slate-600 underline">Stop sharing</button></div>}
        </>
      ) : editable
        ? <p className="text-slate-600">Optional. Share a discharge summary or anything the crew should know about the patient's condition.</p>
        : <p className="text-slate-600">No transfer note was shared for this trip.</p>}
      {editable && !note && !open && <button onClick={() => setOpen(true)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700">Add a note</button>}
      {editable && open && (
        <div className="space-y-2">
          <textarea aria-label="Note for the crew" rows={3} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. On oxygen 2 L/min; diabetic; discharge summary attached" className="w-full rounded-xl border border-slate-200 px-3 py-2" />
          <input type="file" aria-label="Attach a file" accept="application/pdf,image/jpeg,image/png" onChange={(e) => {const f=e.target.files?.[0]||null;const error=validateAmbulanceFile(f);setErr(error);setFile(error?null:f);if(error)e.target.value='';}} className="block text-xs" />
          <p className="text-xs text-slate-500">PDF, JPG or PNG up to 10 MB.</p>
          <label className="flex items-start gap-2 text-xs text-slate-700"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" /> I want to share this with the ambulance operator and crew for this trip.</label>
          <div className="flex gap-2"><button onClick={() => setOpen(false)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold">Cancel</button><button disabled={busy || !consent || (!text.trim() && !file)} onClick={share} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">{busy ? 'Sharing…' : 'Share with the crew'}</button></div>
        </div>
      )}
      {err && <p role="alert" className="text-xs font-semibold text-rose-700">{err}</p>}
    </section>
  );
}
