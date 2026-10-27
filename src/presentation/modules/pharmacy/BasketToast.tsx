import { useEffect, useState } from 'react';
import { CheckCircle2, ChevronRight, X } from 'lucide-react';
export interface BasketAddition { id: number; name: string; quantity: number }

export default function BasketToast({ addition, onDismiss, onViewBasket }: {
  addition: BasketAddition | null; onDismiss: () => void; onViewBasket: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!addition) { setHovered(false); setFocused(false); return; }
    if (hovered || focused) return;
    const timer = setTimeout(onDismiss, 6000);
    return () => clearTimeout(timer);
  }, [addition, hovered, focused, onDismiss]);
  const message = addition ? `${addition.name}: ${addition.quantity} ${addition.quantity === 1 ? 'unit' : 'units'} added to basket.` : '';
  return <>
    <div role="status" aria-label="Basket updates" aria-live="polite" aria-atomic="true" className="sr-only">{addition && <span key={addition.id}>{message}</span>}</div>
    {addition && <aside aria-label="Added to basket notification" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }} className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 right-4 z-40 mx-auto flex max-w-xl items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 text-[#101d48] shadow-xl sm:left-1/2 sm:right-auto sm:w-[36rem] sm:-translate-x-1/2">
      <CheckCircle2 aria-hidden="true" className="h-8 w-8 shrink-0 rounded-full bg-emerald-600 p-1.5 text-white" />
      <div className="min-w-0 flex-1"><p className="break-words text-xs font-medium leading-relaxed">{message}</p><button type="button" onClick={onDismiss} className="mt-1 rounded text-[11px] font-semibold text-slate-500 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">Continue shopping</button></div>
      <button type="button" onClick={onViewBasket} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-orange-50 px-2.5 py-2.5 text-xs font-bold text-orange-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">View basket <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" /></button>
      <button type="button" aria-label="Dismiss added confirmation" onClick={onDismiss} className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"><X className="h-4 w-4" /></button>
    </aside>}
  </>;
}
