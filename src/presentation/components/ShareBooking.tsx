import { useState } from 'react';
import { Copy, MessageCircle, Share2 } from 'lucide-react';
import './ShareBooking.css';

// Only the booking reference, place and time: no doctor, department, reason or other medical detail.
export default function ShareBooking({ title, lines }: { title: string; lines: string[] }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const text = [title, ...lines].filter(Boolean).join('\n');
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setFailed(false); } catch { setFailed(true); }
  };
  const share = () => { navigator.share({ title, text }).catch(() => undefined); };

  return (
    <div className="share-booking" aria-label="Share booking">
      {canShare && <button type="button" onClick={share}><Share2 />Share</button>}
      <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer"><MessageCircle />WhatsApp</a>
      <button type="button" onClick={() => void copy()}><Copy />{copied ? 'Copied' : 'Copy details'}</button>
      {failed && <p role="alert">Copy failed. Select the details and copy them by hand.</p>}
    </div>
  );
}
