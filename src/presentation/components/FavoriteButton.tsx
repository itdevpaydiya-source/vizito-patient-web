import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { toggleFavorite, useIsFavorite } from '../../services/favoritesStore';

// Save / unsave any provider. Works on every card (doctor, hospital, lab, pharmacy, home care);
// stops the click so the card itself doesn't open.
const FavoriteButton: React.FC<{ partnerId: string; name?: string; className?: string }> = ({ partnerId, name, className }) => {
  const fav = useIsFavorite(partnerId);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const label = `${fav ? 'Remove' : 'Save'} ${name || 'this provider'} ${fav ? 'from' : 'to'} favourites`;
  return (
    <button type="button" aria-label={err ? `Could not save ${name || 'this provider'} to favourites. Try again.` : label} aria-pressed={fav} disabled={busy}
      onClick={async (e) => { e.preventDefault(); e.stopPropagation(); setBusy(true); setErr(false); try { await toggleFavorite(partnerId); } catch { setErr(true); } finally { setBusy(false); } }}
      className={`shrink-0 w-9 h-9 rounded-full border flex items-center justify-center transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 ${fav ? 'bg-rose-50 border-rose-200 text-rose-600' : err ? 'border-amber-300 text-amber-600 bg-white' : 'bg-white border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-200'} ${className || ''}`}>
      <Heart className={`w-4 h-4 ${fav ? 'fill-current' : ''}`} />
    </button>
  );
};

export default FavoriteButton;
