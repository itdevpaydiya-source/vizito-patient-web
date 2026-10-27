import { Check, ChevronRight, Minus, Plus, ShieldCheck, Trash2, Cross } from 'lucide-react';
import type { ProviderItem } from '../../../services/types';
import BusinessImage from '../../components/BusinessImage';
import { verifiedLicense, pharmacyTodayHours } from './pharmacyDiscovery';
import { basketSubtotal, hasMedicinePrice, quantityProblem, type BasketLine } from './medicineBasket';

const money = (value: number) => `INR ${value.toFixed(2)}`;
export function ReviewSteps() {
  return <ol aria-label="Order progress" className="flex flex-wrap items-center gap-3 text-xs font-semibold text-[#101d48]">
    {['Choose pharmacy', 'Add medicines', 'Review'].map((label, index) => <li key={label} aria-current={index === 2 ? 'step' : undefined} className="flex items-center gap-2"><span className={`grid h-7 w-7 place-items-center rounded-full text-white ${index === 2 ? 'bg-orange-600' : 'bg-emerald-600'}`}>{index < 2 ? <Check aria-label="Complete" className="h-4 w-4" /> : 3}</span>{label}{index < 2 && <span aria-hidden="true" className="hidden h-px w-5 bg-slate-200 sm:block" />}</li>)}
  </ol>;
}

export default function ReviewOrder({ pharmacy, lines, busy, onEdit, onChange, onContinue, onQuantity, onPrescription }: {
  pharmacy: ProviderItem | null; lines: BasketLine[]; busy: boolean;
  onEdit: () => void; onChange: () => void; onContinue: () => void;
  onQuantity: (id: string, quantity: number) => boolean; onPrescription: () => void;
}) {
  const subtotal = basketSubtotal(lines);
  const units = lines.reduce((sum, line) => sum + line.quantity, 0);
  const invalid = lines.some(line => quantityProblem(line.medicine, line.quantity));
  const hours = pharmacy ? pharmacyTodayHours(pharmacy) : null;
  const control = 'grid h-10 w-10 shrink-0 place-items-center rounded-full focus-visible:ring-2 focus-visible:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-40';
  return <div id="pharmacy-checkout" tabIndex={-1} className="grid items-start gap-5 outline-none lg:grid-cols-[minmax(0,1fr)_340px]">
    <div className="min-w-0 space-y-5">
      <section aria-label="Review selected pharmacy" className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-bold text-[#101d48]">Selected pharmacy</h2>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          {pharmacy && <BusinessImage p={pharmacy} className="h-16 w-16 rounded-xl bg-teal-50 p-2" />}
          <div className="min-w-[160px] flex-1"><div className="flex flex-wrap items-center gap-2">{pharmacy?.name && <h3 className="font-bold">{pharmacy.name}</h3>}{pharmacy && (verifiedLicense(pharmacy) || pharmacy.registrationVerified === true) && <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700"><ShieldCheck className="h-3 w-3" />{verifiedLicense(pharmacy) ? 'Licensed pharmacy' : 'Registration verified'}</span>}{pharmacy?.licenseStatus && !verifiedLicense(pharmacy) && <span className="text-xs text-slate-500">License: {pharmacy.licenseStatus}</span>}</div>{pharmacy?.address && <p className="mt-1 text-sm text-slate-500">{pharmacy.address}</p>}{hours && <p className="mt-1 text-xs text-slate-500">{hours}</p>}</div>
          <button type="button" onClick={onChange} className="w-full rounded-xl border border-orange-300 px-4 py-2 text-sm font-semibold text-orange-700 sm:w-auto">Change pharmacy</button>
        </div>
      </section>
      <section aria-label="Review medicines" className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 p-5"><h2 className="text-lg font-bold">Medicines in this order ({lines.length})</h2><button type="button" onClick={onEdit} className="shrink-0 text-sm font-semibold text-blue-700 underline">Edit basket</button></header>
        {!lines.length && <p className="p-5 text-sm text-slate-500">Your basket is empty. Add medicines to continue.</p>}
        <ul className="divide-y divide-slate-100">{lines.map(({ medicine: m, quantity }) => {
          const problem = quantityProblem(m, quantity);
          const details = [[m.strength, m.strength_unit].filter(Boolean).join(' '), m.dosage_form, m.packaging_type, m.units_per_pack ? `${m.units_per_pack} units per pack` : null].filter(Boolean).join(' \u00b7 ');
          return <li key={m.id} className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-bold">{m.medicine_name}{m.requires_prescription && <span className="ml-2 inline-block rounded border border-orange-200 bg-orange-50 px-1.5 text-xs font-medium text-orange-700">Rx</span>}</h3>{details && <p className="mt-1 text-sm text-slate-500">{details}</p>}</div><button type="button" disabled={busy} aria-label={`Remove ${m.medicine_name}`} onClick={() => onQuantity(m.id, 0)} className={`${control} text-slate-500 hover:bg-rose-50 hover:text-rose-700`}><Trash2 className="h-4 w-4" /></button></div>
            <div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-3">
              <div role="group" aria-label={`Quantity of ${m.medicine_name}`} className="mr-auto flex items-center rounded-full border border-slate-200 bg-slate-50"><button type="button" aria-label={`Decrease quantity of ${m.medicine_name}`} disabled={busy || quantity <= 1 || !!quantityProblem(m, quantity - 1)} onClick={() => onQuantity(m.id, quantity - 1)} className={control}><Minus className="h-3.5 w-3.5" /></button><span aria-live="polite" className="min-w-6 text-center text-sm font-bold tabular-nums">{quantity}</span><button type="button" aria-label={`Increase quantity of ${m.medicine_name}`} disabled={busy || !!quantityProblem(m, quantity + 1)} onClick={() => onQuantity(m.id, quantity + 1)} className={control}><Plus className="h-3.5 w-3.5" /></button></div>
              {hasMedicinePrice(m) && <><div className="text-right text-sm"><strong>{money(m.mrp)}</strong><p className="text-xs text-slate-500">per unit</p></div><div className="text-right text-sm"><p className="text-xs text-slate-500">Line total</p><strong>{money(Math.round(m.mrp * 100) * quantity / 100)}</strong></div></>}
            </div>
            {problem && <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-700"><p>{problem}</p>{m.requires_prescription && <button type="button" onClick={onPrescription} className="font-semibold underline">Send prescription instead</button>}</div>}
          </li>;
        })}</ul>
      </section>
    </div>
    <aside aria-label="Review order summary" className="space-y-4 lg:sticky lg:top-24">
      <section className="rounded-2xl border border-orange-200 bg-white p-5"><h2 className="text-lg font-bold">Order summary</h2><p className="mt-4 text-sm text-slate-500">{lines.length} {lines.length === 1 ? 'medicine' : 'medicines'} {'\u00b7'} {units} {units === 1 ? 'unit' : 'units'}</p>{<div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-4 font-bold"><span>Estimated subtotal</span><span>{lines.length > 0 && subtotal !== null ? money(subtotal) : 'Subtotal confirmed by pharmacy'}</span></div>}<p className="mt-3 text-xs leading-relaxed text-slate-500">Catalogue prices are estimates. Final charges require pharmacy confirmation.</p></section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-bold">Next step</h2><ol aria-label="Checkout steps" className="mt-4 space-y-3">{['Choose a pharmacy', 'Add medicines', 'Review order', 'Fulfillment', 'Payment'].map((label, index) => <li key={label} aria-current={index === 2 ? 'step' : undefined} className={`flex items-center gap-3 rounded-xl p-2 ${index === 2 ? 'bg-orange-50' : ''}`}><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-bold ${index < 2 ? 'bg-emerald-50 text-emerald-700' : index === 2 ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{index + 1}</span><span className="flex-1 text-sm font-semibold">{label}</span>{index < 2 && <button type="button" aria-label={`Edit ${label.toLowerCase()}`} onClick={index === 0 ? onChange : onEdit} className="text-xs font-semibold text-blue-700 underline">Edit</button>}</li>)}</ol><button type="button" disabled={!lines.length || invalid || busy || !pharmacy} onClick={onContinue} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">Continue to fulfillment <ChevronRight aria-hidden="true" className="h-4 w-4" /></button></section>
    </aside>
  </div>;
}
