import MediaImage from '../../components/MediaImage';
import { useEffect, useRef } from 'react';
import { ChevronRight, Minus, Plus, ShoppingBasket, Truck, Trash2, X } from 'lucide-react';
import BusinessImage from '../../components/BusinessImage';
import type { ProviderItem } from '../../../services/types';
import { useSearchArea, formatDistance } from '../../../services/location';
import { pharmacyDistance } from './pharmacyDiscovery';
import { basketSubtotal, hasMedicinePrice, quantityProblem, type BasketLine } from './medicineBasket';
const price = (value: number) => `INR ${value.toFixed(2)}`;

export default function BasketDrawer({ open, lines, error, pharmacy, onChangePharmacy, onClose, onQuantity, onReview }: {
  pharmacy?: ProviderItem | null; onChangePharmacy?: () => void;
  open: boolean; lines: BasketLine[]; error: string | null;
  onClose: () => void; onQuantity: (id: string, quantity: number) => void; onReview: () => void;
}) {
  const area = useSearchArea();
  const distance = pharmacy ? pharmacyDistance(pharmacy, area) : null;
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const node = dialog.current;
    if (open && node && !node.open) {
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      node.showModal(); heading.current?.focus();
    } else if (!open && node?.open) { node.close(); returnFocus.current?.focus({ preventScroll: true }); }
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open]);
  const medicineCount = lines.length;
  const count = lines.reduce((n, line) => n + line.quantity, 0);
  const subtotal = basketSubtotal(lines);
  const invalid = lines.some(line => quantityProblem(line.medicine, line.quantity));
  const control = 'grid h-10 w-10 shrink-0 place-items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-30';

  return <dialog ref={dialog} aria-labelledby="basket-drawer-title" onCancel={onClose} onClose={onClose}
    onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right) onClose(); } }}
    className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-[400px] max-w-full overflow-hidden border-0 bg-white p-0 text-[#101d48] shadow-2xl backdrop:bg-slate-900/30 sm:top-16 sm:h-[calc(100dvh_-_4rem)] sm:rounded-tl-2xl">
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
        <div><h2 ref={heading} tabIndex={-1} id="basket-drawer-title" className="text-lg font-extrabold tracking-tight outline-none">Your basket ({medicineCount})</h2><p className="mt-1 text-xs text-slate-500">{medicineCount} {medicineCount === 1 ? 'medicine' : 'medicines'} {'\u00b7'} {count} {count === 1 ? 'unit' : 'units'}</p></div>
        <button type="button" aria-label="Close basket" onClick={onClose} className={`${control} hover:bg-slate-50`}><X className="h-5 w-5" /></button>
      </header>
      <div aria-label="Basket contents" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 sm:px-6">
        <section aria-label="Selected pharmacy" className="flex items-center gap-3 border-b border-slate-100 py-4">
          {pharmacy && <BusinessImage p={pharmacy} className="h-11 w-11 shrink-0 rounded-xl bg-emerald-50 p-1.5" />}
          <div className="min-w-0 flex-1"><h3 className="text-sm font-bold">{pharmacy?.name || 'Pharmacy details not provided'}</h3><p className="mt-1 text-xs text-slate-500">{distance !== null ? `${formatDistance(distance)} away (straight-line)` : pharmacy?.address || 'Address not provided'}</p></div>
          {onChangePharmacy && <button type="button" onClick={onChangePharmacy} className="p-2 text-xs font-semibold text-orange-700">Change</button>}
        </section>
        {error && <p role="alert" className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">{error}</p>}
        {!lines.length ? <div className="py-12 text-center"><ShoppingBasket className="mx-auto mb-4 h-12 w-12 text-orange-200" /><h3 className="text-sm font-bold">Your basket is empty</h3><p className="mt-2 text-xs text-slate-500">Add medicines from the catalogue to get started.</p></div> : <ul id="basket-items" className="divide-y divide-slate-100">{lines.map(line => {
          const medicine = line.medicine;
          const priced = hasMedicinePrice(medicine);
          const pack = [medicine.packaging_type, medicine.units_per_pack != null && medicine.units_per_pack > 0 ? `${medicine.units_per_pack} units per pack` : null].filter(Boolean).join(' · ');
          const details = [[medicine.strength, medicine.strength_unit].filter(Boolean).join(' '), medicine.dosage_form].filter(Boolean).join(' · ');
          const problem = quantityProblem(medicine, line.quantity);
          return <li key={medicine.id} className="py-5">
            <div className="flex items-start justify-between gap-3"><MediaImage kind="medicine" category={medicine.dosage_form} src={medicine.image_url} name={medicine.medicine_name} className="h-14 w-14 rounded-xl"/><div className="min-w-0"><h3 className="break-words text-sm font-bold leading-snug">{medicine.medicine_name}</h3>{details && <p className="mt-1 text-xs font-medium text-slate-600">{details}</p>}{medicine.brand_name && <p className="mt-1 text-xs text-slate-500">{medicine.brand_name}</p>}<p className="mt-1 text-xs text-slate-500">{pack || 'Pack size not provided'}</p></div><button type="button" aria-label={`Remove ${medicine.medicine_name} from basket`} onClick={() => onQuantity(medicine.id, 0)} className={`${control} -mr-2 -mt-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600`}><Trash2 className="h-4 w-4" /></button></div>
            <p className={`mt-2 text-[11px] ${medicine.requires_prescription ? 'font-semibold text-amber-800' : 'text-slate-500'}`}>{medicine.requires_prescription ? 'Rx required · Prescription review needed' : 'Prescription not required'}</p>
            <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
              <div><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Unit price</p><p className={`mt-1 text-xs font-semibold ${priced ? 'text-slate-700' : 'text-amber-800'}`}>{priced ? price(medicine.mrp) : 'Price not provided'}</p></div>
              <div className="flex items-center rounded-full border border-slate-200 bg-slate-50 p-0.5" role="group" aria-label={`Quantity of ${medicine.medicine_name}`}><button type="button" aria-label={`Decrease basket quantity of ${medicine.medicine_name}`} disabled={line.quantity <= 1} onClick={() => onQuantity(medicine.id, line.quantity - 1)} className={control}><Minus className="h-3.5 w-3.5" /></button><span aria-live="polite" className="min-w-6 text-center text-sm font-bold tabular-nums">{line.quantity}</span><button type="button" aria-label={`Increase basket quantity of ${medicine.medicine_name}`} disabled={!!quantityProblem(medicine, line.quantity + 1)} onClick={() => onQuantity(medicine.id, line.quantity + 1)} className={control}><Plus className="h-3.5 w-3.5" /></button></div>
              <div className="min-w-0 text-right"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Line total</p><p className="mt-1 text-sm font-bold tabular-nums">{priced ? price(Math.round(medicine.mrp * 100) * line.quantity / 100) : 'Not available'}</p></div>
            </div>
            {problem && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">{problem}</p>}
          </li>;
        })}</ul>}
        {lines.length > 0 && <section aria-label="Basket subtotal" className="space-y-3 border-t border-slate-100 py-4 text-xs"><p className="flex items-center justify-between gap-3"><span>Estimated subtotal · {count} {count === 1 ? 'unit' : 'units'}</span><b className="text-sm tabular-nums">{subtotal == null ? 'Price not provided' : price(subtotal)}</b></p><p className="text-[11px] leading-relaxed text-slate-500">Catalogue prices shown. Delivery fees, taxes and discounts are not provided. Final charges are confirmed by the pharmacy.</p></section>}
        <section aria-label="Basket fulfillment" className="mt-2 rounded-2xl bg-slate-50 p-4"><h3 className="text-sm font-bold">Fulfillment options</h3><div className="mt-3 flex items-start gap-3"><span className="rounded-xl bg-emerald-50 p-2 text-slate-700"><Truck aria-hidden="true" className="h-5 w-5" /></span><p className="text-xs leading-relaxed text-slate-500">Delivery and pickup availability details are not provided. Review fulfillment during checkout.</p></div></section>
      </div>
      <footer className="shrink-0 space-y-2 border-t border-slate-100 bg-white px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
        {invalid && <p id="basket-validation" className="mb-3 text-xs leading-relaxed text-amber-800">Resolve the item details above before reviewing your order.</p>}
        <button type="button" disabled={!lines.length || invalid} aria-describedby={invalid ? 'basket-validation' : undefined} onClick={onReview} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#e34b00] to-[#c94000] px-4 py-3 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40">Review & place order <ChevronRight className="h-4 w-4" /></button>
        <button type="button" onClick={onClose} className="min-h-11 w-full rounded-xl border border-orange-400 px-4 py-3 text-sm font-semibold text-orange-700 focus-visible:ring-2 focus-visible:ring-orange-500">Continue shopping</button>
      </footer>
    </div>
  </dialog>;
}
