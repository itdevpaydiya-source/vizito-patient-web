import { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import MediaImage from '../../components/MediaImage';
import { PhDialog } from './ProfileUi';
import { photoUrl, updateProfileApi, uploadPatientPhotoApi } from '../../../services/patientHelper';

// NEW-07: change the profile photo from the avatar itself (like WhatsApp / Google).
// Pick → preview → Save. The upload limit on the server is 2 MB, PNG / JPEG / WEBP.
const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function ProfilePhoto({ name, current, onSaved }: { name: string; current: string | null; onSaved: () => Promise<void> | void }) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'save' | 'remove' | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const choose = (f: File | undefined) => {
    if (input.current) input.current.value = '';
    if (!f) return;
    if (!TYPES.includes(f.type)) { setError('Choose a JPG, PNG or WEBP photo.'); return; }
    if (f.size > MAX_BYTES) { setError(`This photo is ${(f.size / 1024 / 1024).toFixed(1)} MB. Choose one under 2 MB.`); return; }
    setError('');
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const finish = async () => {
    await onSaved();
    window.dispatchEvent(new Event('vizito-profile-changed')); // the top bar shows the new photo now
  };

  const save = async () => {
    if (!file) return;
    setBusy('save'); setError('');
    try {
      const url = await uploadPatientPhotoApi(file);
      await updateProfileApi({ profilePicture: url });
      setFile(null); setPreview('');
      await finish();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      setError(e?.response?.status === 413 ? 'This photo is too large. Choose one under 2 MB.' : (Array.isArray(m) ? m.join(' ') : m) || 'Could not save the photo. Please try again.');
    } finally { setBusy(null); }
  };

  const remove = async () => {
    setBusy('remove'); setError('');
    try {
      await updateProfileApi({ profilePicture: '' });
      setConfirmRemove(false);
      await finish();
    } catch { setError('Could not remove the photo. Please try again.'); }
    finally { setBusy(null); }
  };

  return (
    <div className="ph-photo">
      <div className="ph-photo-avatar">
        <MediaImage kind="professional" name={name || 'Your profile'} src={photoUrl(current)} className="ph-avatar" />
        <button type="button" className="ph-photo-camera" aria-label={current ? 'Change profile photo' : 'Add profile photo'} onClick={() => input.current?.click()}>
          <Camera />
        </button>
        <input ref={input} type="file" accept={TYPES.join(',')} hidden onChange={(e) => choose(e.target.files?.[0])} aria-hidden="true" tabIndex={-1} />
      </div>
      {current && <button type="button" className="ph-photo-remove" onClick={() => setConfirmRemove(true)}>Remove photo</button>}
      {error && !file && <p className="ph-photo-error" role="alert">{error}</p>}

      {file && (
        <PhDialog title="New profile photo" onClose={() => { if (!busy) { setFile(null); setPreview(''); setError(''); } }}>
          <div className="ph-photo-preview">
            <img src={preview} alt="Preview of your new profile photo" />
            <p>This is how your photo will look. Doctors and care staff may see it on your bookings.</p>
            {error && <p className="ph-photo-error" role="alert">{error}</p>}
            <div className="ph-photo-actions">
              <button type="button" className="ph-btn" disabled={!!busy} onClick={() => input.current?.click()}>Choose another</button>
              <button type="button" className="ph-btn ph-primary" disabled={!!busy} onClick={() => void save()}>
                {busy === 'save' ? <><Loader2 className="ph-spin" /> Saving…</> : 'Save photo'}
              </button>
            </div>
          </div>
        </PhDialog>
      )}

      {confirmRemove && (
        <PhDialog title="Remove profile photo?" onClose={() => { if (!busy) setConfirmRemove(false); }}>
          <div className="ph-photo-preview">
            <p>Your initials will show instead. You can add a photo again anytime.</p>
            {error && <p className="ph-photo-error" role="alert">{error}</p>}
            <div className="ph-photo-actions">
              <button type="button" className="ph-btn" disabled={!!busy} onClick={() => setConfirmRemove(false)}>Keep photo</button>
              <button type="button" className="ph-btn ph-danger" disabled={!!busy} onClick={() => void remove()}>
                {busy === 'remove' ? <><Loader2 className="ph-spin" /> Removing…</> : <><Trash2 /> Remove</>}
              </button>
            </div>
          </div>
        </PhDialog>
      )}
    </div>
  );
}
