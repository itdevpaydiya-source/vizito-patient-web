import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { myLabImagesApi, myLabImageBlobApi, type LabReportImage } from '../../../services/labHelper';

// Scan images (MRI, CT, X-ray…) the lab attached to a released report. Private files: each is
// fetched with the session and shown from a blob URL.
export default function LabReportImages({ orderId }: { orderId: string }) {
  const [images, setImages] = useState<LabReportImage[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<LabReportImage | null>(null);
  const made = useRef<string[]>([]);

  useEffect(() => {
    let live = true;
    myLabImagesApi(orderId).then(async (list) => {
      if (!live) return;
      setImages(list);
      for (const i of list) {
        const blob = await myLabImageBlobApi(orderId, i.id).catch(() => null);
        if (!blob || !live) continue;
        const u = URL.createObjectURL(blob);
        made.current.push(u);
        setUrls((prev) => ({ ...prev, [i.id]: u }));
      }
    }).catch(() => setImages([]));
    return () => { live = false; made.current.forEach((u) => URL.revokeObjectURL(u)); made.current = []; };
  }, [orderId]);

  if (!images.length) return null;
  return (
    <section aria-label="Scan images">
      <h2>Scan Images</h2>
      <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, listStyle: 'none', padding: 0, margin: 0 }}>
        {images.map((i) => (
          <li key={i.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
            <button type="button" onClick={() => setOpen(i)} style={{ display: 'block', width: '100%', aspectRatio: '1 / 1', background: '#0f172a', border: 0, padding: 0, cursor: 'zoom-in' }}>
              {urls[i.id] ? <img src={urls[i.id]} alt={i.caption || 'Scan image'} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : null}
            </button>
            <p style={{ margin: 0, padding: '6px 8px', fontSize: 12, fontWeight: 600 }}>{i.caption || 'Image'}</p>
          </li>
        ))}
      </ul>
      {open && urls[open.id] && (
        <div role="dialog" aria-label="Image preview" onClick={() => setOpen(null)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <button type="button" aria-label="Close" style={{ position: 'absolute', top: 16, right: 16, color: '#fff', background: 'none', border: 0 }}><X /></button>
          <img src={urls[open.id]} alt={open.caption || 'Scan image'} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        </div>
      )}
    </section>
  );
}
