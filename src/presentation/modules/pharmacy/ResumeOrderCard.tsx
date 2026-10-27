import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Clock3, Info, Pill, ShoppingCart, Store, Trash2 } from 'lucide-react';
import type { SavedPharmacyBasket } from '../../../services/PharmacyBasketContext';
import { basketSubtotal } from './medicineBasket';

export default function ResumeOrderCard({ basket, persisted, disabled, onResume, onDiscard }: {
  basket: SavedPharmacyBasket; persisted: boolean; disabled: boolean;
  onResume: () => void; onDiscard: () => boolean;
}) {
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [discardError, setDiscardError] = useState(false);
  const keepOrder = useRef<HTMLButtonElement>(null);
  const discardOrder = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (confirmDiscard) keepOrder.current?.focus(); }, [confirmDiscard]);
  if (!basket.lines.length) return null;
  const first = basket.lines[0];
  const medicineCount = basket.lines.length;
  const units = basket.lines.reduce((n, line) => n + line.quantity, 0);
  const subtotal = basketSubtotal(basket.lines);
  const details = [[first.medicine.strength, first.medicine.strength_unit].filter(Boolean).join(' '), first.medicine.dosage_form].filter(Boolean).join(' · ');
  const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2';
  return <section aria-label={`Resume order from ${basket.pharmacyName || 'pharmacy'}`} className="overflow-hidden rounded-2xl border border-orange-200 bg-white text-[#101d48]">
    <header className="flex items-center gap-3 border-b border-orange-100 bg-orange-50/70 px-4 py-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-orange-100/70 text-orange-700"><ShoppingCart aria-hidden="true" className="h-5 w-5" /></span>
      <div><span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-800"><Clock3 aria-hidden="true" className="h-3 w-3" />In progress</span><h2 className="mt-1 text-sm font-extrabold">{persisted ? 'Your saved order' : 'Your active order'}</h2></div>
    </header>
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Store aria-hidden="true" className="h-5 w-5" /></span><div className="min-w-0"><h3 className="break-words text-sm font-bold">{basket.pharmacyName || 'Pharmacy name not provided'}</h3><p className="mt-1 text-xs text-slate-500">{medicineCount} {medicineCount === 1 ? 'medicine' : 'medicines'} · {units} {units === 1 ? 'unit' : 'units'}</p></div></div>
      <div className="flex items-start gap-3 border-t border-slate-100 pt-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-400"><Pill aria-hidden="true" className="h-4 w-4" /></span><div className="min-w-0 text-xs"><p className="break-words font-bold leading-relaxed">{first.medicine.medicine_name || 'Medicine name not provided'}</p><p className="mt-1 text-slate-500">{details || 'Medicine details not provided'}</p><p className="mt-1 font-semibold text-slate-600">{first.quantity} {first.quantity === 1 ? 'unit' : 'units'}</p>{medicineCount > 1 && <p className="mt-1.5 text-slate-500">+{medicineCount - 1} more {medicineCount === 2 ? 'medicine' : 'medicines'}</p>}</div></div>
      <div className="border-t border-slate-100 pt-3">{subtotal == null ? <p className="text-xs font-semibold leading-relaxed">Total will be confirmed by the pharmacy</p> : <p className="flex flex-wrap items-center justify-between gap-2 text-xs"><span>Estimated subtotal</span><strong className="text-sm tabular-nums">INR {subtotal.toFixed(2)}</strong></p>}<p className="mt-2 flex items-start gap-1.5 text-[10px] leading-relaxed text-slate-500"><Info aria-hidden="true" className="mt-0.5 h-3 w-3 shrink-0" />{persisted ? 'Final charges are subject to pharmacy confirmation.' : 'Changes are not yet confirmed as saved.'}</p></div>
      <div className="space-y-2"><button type="button" onClick={onResume} className={`flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-orange-700 px-3 py-2.5 text-xs font-bold text-white hover:brightness-95 ${focus}`}>Resume order <ChevronRight aria-hidden="true" className="h-4 w-4" /></button>
        {confirmDiscard ? <div role="group" aria-label="Confirm discard order" className="rounded-xl border border-orange-100 bg-orange-50/50 p-3"><p className="text-xs leading-relaxed text-slate-700">Discard this basket from {basket.pharmacyName || 'this pharmacy'}? Its medicines will be removed.</p><div className="mt-3 flex gap-2"><button type="button" disabled={disabled} onClick={() => { if (!onDiscard()) setDiscardError(true); }} className={`min-h-10 flex-1 rounded-lg bg-orange-700 px-2 text-xs font-bold text-white disabled:opacity-40 ${focus}`}>Confirm discard</button><button type="button" ref={keepOrder} onClick={() => { setConfirmDiscard(false); setDiscardError(false); requestAnimationFrame(() => discardOrder.current?.focus()); }} className={`min-h-10 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold ${focus}`}>Keep order</button></div>{discardError && <p role="alert" className="mt-2 text-xs text-amber-800">Could not discard this draft. Reload the saved baskets and try again.</p>}</div> : <button type="button" ref={discardOrder} disabled={disabled} onClick={() => setConfirmDiscard(true)} className={`flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-orange-300 px-3 py-2 text-xs font-semibold text-orange-700 disabled:cursor-not-allowed disabled:opacity-40 ${focus}`}><Trash2 aria-hidden="true" className="h-3.5 w-3.5" />Discard order</button>}
      </div>
    </div>
  </section>;
}
