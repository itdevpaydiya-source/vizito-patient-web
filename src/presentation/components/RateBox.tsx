import React, { useState } from 'react';
import { Star, ThumbsUp, ThumbsDown, ShieldCheck } from 'lucide-react';
import { CARE_TAGS, STAR_WORD, type CareKind } from './reviewKinds';

// Rate a finished service: stars (with words), quick healthcare tags, an optional note.
// Nothing is pre-selected, so a rating is always the patient's own choice. Once rated it shows the stars.
const RateBox: React.FC<{ what: string; kind?: CareKind; rated?: number | null; compact?: boolean;
  onSubmit: (rating: number, review: string, tags: string[]) => Promise<void> }> = ({ what, kind = 'doctor', rated, compact, onSubmit }) => {
  const [done, setDone] = useState<number | null>(rated ?? null);
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (done) return (
    <p className="text-xs font-semibold text-slate-600 flex items-center gap-1 px-1 py-2">You rated {what}
      <span className="inline-flex" aria-label={`${done} out of 5`}>{[1, 2, 3, 4, 5].map((i) => <Star key={i} className={`w-3.5 h-3.5 ${i <= done ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />)}</span>
    </p>
  );
  const shown = hover || stars;
  // Low ratings ask "what went wrong" first; high ratings "what went well".
  const groups = stars && stars <= 3 ? [['bad', CARE_TAGS[kind].bad], ['good', CARE_TAGS[kind].good]] as const : [['good', CARE_TAGS[kind].good], ['bad', CARE_TAGS[kind].bad]] as const;
  const toggle = (t: string) => setTags((x) => (x.includes(t) ? x.filter((y) => y !== t) : [...x, t]));
  return (
    <div className={`rounded-xl border border-amber-200 bg-amber-50/40 ${compact ? 'p-3' : 'p-4'} space-y-3`} aria-label={`Rate ${what}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="text-xs font-bold text-slate-800">How was {what}?</p>
        <div className="flex items-center gap-0.5" role="radiogroup" aria-label="Stars">
          {[1, 2, 3, 4, 5].map((i) => (
            <button key={i} type="button" role="radio" aria-checked={stars === i} aria-label={`${i} star${i === 1 ? '' : 's'}`}
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(0)} onClick={() => setStars(i)} className="p-0.5">
              <Star className={`w-6 h-6 transition-colors ${shown >= i ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
            </button>
          ))}
        </div>
        <span className="text-xs font-bold text-amber-800 min-w-[4.5rem]">{shown ? STAR_WORD[shown] : 'Tap to rate'}</span>
      </div>
      {stars > 0 && (<>
        {groups.map(([g, list]) => (
          <div key={g} className="space-y-1.5">
            <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1">{g === 'good' ? <><ThumbsUp className="w-3.5 h-3.5" /> What went well</> : <><ThumbsDown className="w-3.5 h-3.5" /> What could be better</>}</p>
            <div className="flex flex-wrap gap-1.5">
              {list.map((t) => { const on = tags.includes(t); return (
                <button key={t} type="button" aria-pressed={on} onClick={() => toggle(t)}
                  className={`px-2.5 py-1 rounded-full border text-[11px] font-bold ${on ? (g === 'good' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-rose-600 border-rose-600 text-white') : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>{t}</button>
              ); })}
            </div>
          </div>
        ))}
        <textarea aria-label="Your review (optional)" value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={1000}
          placeholder="Tell other patients about your experience (optional). Please don’t include medical details you want kept private."
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-teal-500" />
        {err && <p role="alert" className="text-xs font-semibold text-rose-700">{err}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" disabled={busy} onClick={async () => {
            setBusy(true); setErr(null);
            try { await onSubmit(stars, note.trim(), tags); setDone(stars); }
            catch (e: any) { const m = e?.response?.data?.message; if (/already rated/i.test(String(m))) setDone(stars); else setErr(Array.isArray(m) ? m.join(' ') : m || 'Could not save your rating. Please try again.'); }
            finally { setBusy(false); }
          }} className="px-4 py-2 rounded-lg bg-teal-700 text-white text-xs font-bold disabled:opacity-50">{busy ? 'Submitting…' : 'Submit rating'}</button>
          <span className="text-[11px] text-slate-500 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Verified visit. The provider sees your name and can reply.</span>
        </div>
      </>)}
    </div>
  );
};

export default RateBox;
