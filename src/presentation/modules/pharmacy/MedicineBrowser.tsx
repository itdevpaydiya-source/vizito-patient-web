import MediaImage from '../../components/MediaImage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, Plus, Minus, Pill, ShoppingCart, FileText, Info, ChevronRight, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getPharmacyCatalogueApi, type PharmacyMedicine, type MedicineSearchResult } from '../../../services/pharmacyOrderHelper';
import type { ProviderItem } from '../../../services/types';
import BasketToast, { type BasketAddition } from './BasketToast';
import BasketDrawer from './BasketDrawer';
import { quantityProblem } from './medicineBasket';
import { PharmacyCard } from './OrderStart';

type CartLine = { medicine: MedicineSearchResult; quantity: number };
export const medicinePrice = (value: number | null) => value != null && Number.isFinite(value) && value > 0 ? `INR ${value.toFixed(2)}` : 'Price not provided';

export default function MedicineBrowser({ pharmacyId, pharmacy, cart, onAdd, onQuantity, onChange, onReview, onBasketOpen }: {
  pharmacyId: string; pharmacy: ProviderItem | null; cart: CartLine[];
  onAdd: (medicine: MedicineSearchResult, quantity: number) => number;
  onQuantity: (id: string, quantity: number) => boolean; onChange: () => void; onReview?: () => void; onBasketOpen?: () => void;
}) {
  const navigate = useNavigate();
  const [basketOpen, setBasketOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<BasketAddition | null>(null);
  const [basketError, setBasketError] = useState<string | null>(null);
  const additionId = useRef(0);
  const dismissConfirmation = useCallback(() => setConfirmation(null), []);
  const openBasket = () => { setConfirmation(null); setBasketError(null); onBasketOpen?.(); setBasketOpen(true); };
  const review = () => { onReview?.(); setBasketOpen(false); setConfirmation(null); };
  const add = (medicine: PharmacyMedicine, quantity: number) => {
    const existing = cart.find(line => line.medicine.id === medicine.id)?.quantity || 0;
    const problem = quantityProblem(medicine, existing + quantity);
    setBasketError(problem);
    if (problem || pharmacy?.pause) { if (pharmacy?.pause) setBasketError('This pharmacy is temporarily unavailable. Please choose another pharmacy.'); return; }
    const added = onAdd(medicine, quantity);
    if (!added) { setBasketError('This medicine could not be added. Check the quantity or refresh the catalogue.'); return; }
    setConfirmation({ id: ++additionId.current, name: medicine.medicine_name, quantity: added });
    setQuantities(previous => ({ ...previous, [medicine.id]: 1 }));
  };
  const changeQuantity = (id: string, quantity: number) => {
    const line = cart.find(item => item.medicine.id === id);
    const problem = quantity === 0 ? null : line ? quantityProblem(line.medicine, quantity) : 'Medicine not found.';
    setBasketError(problem);
    if (!problem && !onQuantity(id, quantity)) setBasketError('This quantity could not be updated. Refresh the catalogue and try again.');
    setConfirmation(null);
  };
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<PharmacyMedicine[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('name');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  useEffect(() => { setPage(1); setRows([]); setCategory('All'); setQuantities({}); }, [pharmacyId, query]);
  useEffect(() => {
    let active = true;
    setBusy(true); setError(false);
    const timer = setTimeout(async () => {
      try {
        const result = await getPharmacyCatalogueApi(pharmacyId, query.trim(), page);
        if (active) { setRows(previous => page === 1 ? result.items : [...new Map([...previous, ...result.items].map(m => [m.id, m])).values()]); setTotal(result.total); }
      } catch { if (active) setError(true); }
      finally { if (active) setBusy(false); }
    }, query ? 300 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [pharmacyId, query, page, retry]);
  const categories = [...new Set(rows.map(m => m.category_name).filter((v): v is string => !!v))];
  const filtered = rows.filter(m => category === 'All' || m.category_name === category).sort((a, b) => sort === 'price' ? (Number.isFinite(a.mrp) ? a.mrp : Infinity) - (Number.isFinite(b.mrp) ? b.mrp : Infinity) : a.medicine_name.localeCompare(b.medicine_name));
  const count = cart.reduce((n, line) => n + line.quantity, 0);
  const prescription = () => navigate('/my-records');
  const outline = 'inline-flex items-center justify-center gap-2 rounded-xl border border-orange-400 bg-white px-3 py-2.5 text-xs font-semibold text-orange-700';
  const primary = 'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-700 to-orange-800 px-4 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40';
  return <><div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
    <section className="min-w-0 space-y-4" aria-label="Add medicines from selected pharmacy">
      <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4"><div className="min-w-0 flex-1">{pharmacy ? <PharmacyCard p={pharmacy} compact /> : <p className="text-sm font-bold text-slate-800">Pharmacy details not provided</p>}</div><button type="button" onClick={onChange} className="text-xs font-bold text-orange-800">Change pharmacy</button></section>
      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap gap-3"><label className="relative min-w-[200px] flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type="search" aria-label="Search medicines at selected pharmacy" value={query} onChange={e => { setPage(1); setQuery(e.target.value); }} placeholder="Search medicine name, brand or salt" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-orange-200" /></label><button type="button" disabled title="Prescription upload is not available; use existing prescriptions" className={`${outline} disabled:cursor-not-allowed disabled:opacity-50`}><FileText className="h-4 w-4" />Upload prescription</button></div>
        <div className="flex flex-wrap gap-2" aria-label="Categories in loaded medicines">{['All', ...categories].map(name => <button key={name} type="button" aria-pressed={category === name} onClick={() => setCategory(name)} className={`rounded-xl px-3 py-2 text-xs font-semibold ${category === name ? 'border border-orange-200 bg-orange-50 text-orange-800' : 'border border-transparent bg-slate-50 text-slate-600'}`}>{name}</button>)}{!categories.length && <span className="self-center text-xs text-slate-500">Category details not provided</span>}</div>
      </section>
      {basketError && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">{basketError}</p>}
      <p className="flex items-start gap-2 rounded-xl bg-sky-50 px-4 py-3 text-xs leading-relaxed text-sky-800"><Info className="h-4 w-4 shrink-0" />Medicines marked Rx require a valid prescription. Send an existing prescription for pharmacist review before ordering Rx medicines.</p>
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-extrabold text-slate-900">{query.trim() ? 'Search results' : 'Pharmacy medicines'} {!busy && !error && <span className="font-medium text-slate-500">({total})</span>}</h2><label className="flex items-center gap-2 text-xs text-slate-500">Sort by<select aria-label="Sort loaded medicines" value={sort} onChange={e => setSort(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2"><option value="name">Name A-Z</option><option value="price">Price: low to high</option></select></label></div>
      <section aria-label="Medicine results" aria-busy={busy} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {busy && page === 1 ? <div role="status" className="space-y-3 p-5"><p className="text-sm text-slate-500">Loading this pharmacy's medicines...</p>{[1, 2, 3].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-50" />)}</div> : error ? <div role="alert" className="p-8 text-center"><Pill className="mx-auto mb-3 h-8 w-8 text-orange-700" /><h3 className="text-sm font-bold text-slate-900">Medicines could not be loaded</h3><p className="mt-2 text-xs text-slate-500">Try again, or choose another pharmacy. No items have been added.</p><button type="button" onClick={() => setRetry(n => n + 1)} className={`${outline} mt-4`}><RotateCcw className="h-4 w-4" />Try again</button></div> : !filtered.length ? <div role="status" className="px-5 py-9 text-center"><Pill className="mx-auto mb-3 h-9 w-9 text-orange-600" /><h3 className="text-sm font-bold text-slate-900">{query.trim() ? 'No matching medicines' : category !== 'All' ? 'No medicines in this category' : 'No medicines listed by this pharmacy'}</h3><p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500">{query.trim() ? 'Check the spelling or try a medicine, brand or generic name. You can also send an existing prescription.' : 'This pharmacy has no available catalogue entries to show. Choose another pharmacy or send an existing prescription for review.'}</p><div className="mt-4 flex flex-wrap justify-center gap-3">{query && <button type="button" onClick={() => setQuery('')} className={outline}>Clear search</button>}<button type="button" onClick={onChange} className={outline}>Change pharmacy</button><button type="button" onClick={prescription} className={outline}>View prescriptions</button></div></div> : <ul className="divide-y divide-slate-100">{filtered.map(m => {
          const quantity = quantities[m.id] || 1;
          const existing = cart.find(line => line.medicine.id === m.id)?.quantity || 0;
          const atLimit = !!quantityProblem(m, existing + quantity + 1);
          return <li key={m.id} className="flex flex-wrap items-center gap-4 px-4 py-5 sm:flex-nowrap">
            <MediaImage kind="medicine" category={m.dosage_form} src={m.image_url} name={m.medicine_name} className="h-16 w-16 rounded-xl"/><div className="min-w-[180px] flex-1"><h3 className="text-sm font-bold text-slate-900">{m.medicine_name} {m.requires_prescription && <span className="ml-1 rounded border border-orange-200 bg-orange-50 px-1 py-0.5 text-[10px] font-medium text-orange-700">Rx</span>}</h3><p className="mt-1 text-xs text-slate-500">{[m.brand_name, [m.strength, m.strength_unit].filter(Boolean).join(' '), m.dosage_form].filter(Boolean).join(' | ') || 'Medicine details not provided'}</p><p className="mt-1 text-xs text-slate-500">{[m.packaging_type, m.manufacturer].filter(Boolean).join(' | ') || 'Pack and manufacturer details not provided'}</p></div>
            <div className="text-xs"><span className="rounded-full bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">{m.in_stock === false ? 'Unavailable' : 'Listed in stock'}</span><p className="mt-2 font-bold text-slate-900">{medicinePrice(m.mrp)}</p><p className="mt-1 text-[10px] text-slate-500">Catalogue MRP</p></div>
            <div className="flex items-center gap-2 rounded-full border border-slate-100 bg-slate-50 p-1"><button type="button" aria-label={`Decrease quantity of ${m.medicine_name}`} disabled={quantity <= 1} onClick={() => setQuantities(q => ({ ...q, [m.id]: quantity - 1 }))} className="rounded-full p-1.5 disabled:opacity-30"><Minus className="h-3 w-3" /></button><span className="w-5 text-center text-xs font-bold" aria-label="Quantity">{quantity}</span><button type="button" aria-label={`Increase quantity of ${m.medicine_name}`} disabled={atLimit} onClick={() => setQuantities(q => ({ ...q, [m.id]: quantity + 1 }))} className="rounded-full p-1.5"><Plus className="h-3 w-3" /></button></div>
            {m.requires_prescription ? <button type="button" onClick={prescription} className={outline}>Send prescription</button> : <button type="button" disabled={!!quantityProblem(m, existing + quantity) || !!pharmacy?.pause} title={quantityProblem(m, existing + quantity) || undefined} onClick={() => add(m, quantity)} className={primary}><ShoppingCart className="h-4 w-4" />Add</button>}
          </li>;
        })}</ul>}
      </section>
      {!error && rows.length < total && <button type="button" disabled={busy} onClick={() => setPage(n => n + 1)} className={`${outline} w-full`}>{busy ? 'Loading...' : `Load more medicines (${rows.length} of ${total})`}</button>}
      <p className="flex items-center gap-2 text-[11px] text-slate-500"><Info className="h-3.5 w-3.5" />Stock can change. Medicine availability and final price are confirmed by the pharmacy.</p>
    </section>
    <aside className="space-y-4" aria-label="Medicine order summary">
      <section className="rounded-2xl border border-slate-200 bg-white p-4" aria-label="Basket launcher"><h2 className="flex items-center gap-3 text-sm font-extrabold text-slate-900"><ShoppingCart className="h-5 w-5 text-orange-700" />Your basket ({cart.length})</h2><p className="my-3 text-xs leading-relaxed text-slate-500">{count ? `${count} ${count === 1 ? 'unit' : 'units'} added. Open your basket to review items and quantities.` : 'No medicines added yet. Add items from this pharmacy to build your order.'}</p><button type="button" disabled={!cart.length} onClick={openBasket} className={`${primary} w-full`}>View basket <ChevronRight className="h-4 w-4" /></button></section>
      <section className="rounded-2xl border border-sky-100 bg-sky-50/50 p-4"><h2 className="flex items-center gap-3 text-sm font-bold text-slate-900"><FileText className="h-6 w-6 text-blue-600" />Prescription</h2><p className="mt-3 text-xs leading-relaxed text-slate-500">Required for Rx medicines. File upload is not available; send a prescription from your medical records.</p><button type="button" disabled className={`${outline} mt-3 w-full disabled:opacity-50`}>Upload prescription</button><button type="button" onClick={prescription} className="mt-3 text-xs font-semibold text-blue-800 underline">View existing prescriptions</button></section>
    </aside>
  </div><BasketDrawer pharmacy={pharmacy} onChangePharmacy={() => { setBasketOpen(false); setConfirmation(null); onChange(); }} open={basketOpen} lines={cart} error={basketError} onClose={() => { setBasketOpen(false); setConfirmation(null); }} onQuantity={changeQuantity} onReview={review} /><BasketToast addition={confirmation} onDismiss={dismissConfirmation} onViewBasket={openBasket} /></>;
}
