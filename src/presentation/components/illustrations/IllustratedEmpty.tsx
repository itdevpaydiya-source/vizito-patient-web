import React, { useState } from 'react';
import ServiceArt from './ServiceArt';

// An empty list that looks intentional: the service's illustration, what this list will hold, and
// the one thing to do next. Uses the reviewed empty-state picture when there is one, else the drawing.
const PICS: Record<string, string> = { diagnostic: 'no-lab-bookings', homecare: 'no-homecare', pharmacy: 'no-orders', doctor: 'no-bookings', hospital: 'no-bookings' };
const Art: React.FC<{ id: string }> = ({ id }) => {
  const [failed, setFailed] = useState(false);
  if (!PICS[id] || failed) return <ServiceArt id={id} className="h-36 w-full" />;
  return <img src={`/images/healthcare/empty/${PICS[id]}.webp`} alt="" loading="lazy" onError={() => setFailed(true)} className="h-36 w-full object-contain bg-slate-50" />;
};
// Used wherever a patient has no bookings / orders yet.
const IllustratedEmpty: React.FC<{ art: string; title: string; body: string; action?: { label: string; onClick: () => void } }> = ({ art, title, body, action }) => (
  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
    <Art id={art} />
    <div className="px-6 py-6 text-center space-y-2">
      <h3 className="font-extrabold text-slate-800 text-base">{title}</h3>
      <p className="text-sm text-slate-500 max-w-md mx-auto">{body}</p>
      {action && (
        <button onClick={action.onClick} className="mt-2 px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-bold">
          {action.label}
        </button>
      )}
    </div>
  </div>
);

export default IllustratedEmpty;
