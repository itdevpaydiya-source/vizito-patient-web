import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search, Plus, Minus, Trash2, AlertCircle, Store, Truck, Wallet, Banknote, X, Pill, ChevronRight, FileText, ShoppingCart, Headphones, BadgeHelp } from 'lucide-react';
import {
  getPharmacyRequestsApi, createRxOrderApi, createDirectOrderApi,
  searchMedicinesApi, type MedicineSearchResult, type OrderCartLine,
} from '../../../services/pharmacyOrderHelper';
import { getPrescriptionsApi, getAddressesApi, type PatientAddress } from '../../../services/patientHelper';
import type { PharmacyRequestItem, OrderFulfillmentType } from '../../../services/types';
import type { PaymentMethod } from '../../../services/bookingHelper';
import { addBasketMedicine, changeBasketQuantity, quantityProblem } from './medicineBasket';
import { usePharmacyBaskets } from '../../../services/PharmacyBasketContext';
import ResumeOrderCard from './ResumeOrderCard';
import MedicineBrowser from './MedicineBrowser';
import ReviewOrder, { ReviewSteps } from './ReviewOrder';
import FulfillmentScreen, { FulfillmentSteps } from './FulfillmentScreen';
import { basketSubtotal } from './medicineBasket';
import SelectPharmacyModal from './SelectPharmacyModal';
import CancellationRefundPolicy from '../../components/CancellationRefundPolicy';
import { OrderSteps, PharmacyCard, PharmacyDirectory, PrescriptionsReady, TrustStrip } from './OrderStart';
import { getProvidersApi } from '../../../services/patientHelper';
import type { ProviderItem } from '../../../services/types';

interface CartLine {
  medicine: MedicineSearchResult;
  quantity: number;
}

// One prescribed (free-text) line, resolved to a real catalogue medicine by search —
// the same name-matching step the pharmacist's own dispense screen already does, since
// Prescription.treatment_plan has no medicine_id to begin with (documented backend
// limitation, not something this screen can fix).
interface RxLine {
  prescribedName: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  matched: MedicineSearchResult | null;
  quantity: number;
}

export default function OrderBuilderScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pharmacyRequestId = searchParams.get('pharmacyRequestId');
  const preselectedPharmacyId = searchParams.get('pharmacy');

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Rx mode state
  const [pharmacyRequest, setPharmacyRequest] = useState<PharmacyRequestItem | null>(null);
  const [rxLines, setRxLines] = useState<RxLine[]>([]);

  // Direct mode state
  const savedBaskets = usePharmacyBaskets();
  const [pharmacyId, setPharmacyId] = useState<string | null>(preselectedPharmacyId);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  useEffect(() => { if (reviewOpen) { document.querySelector('main')?.scrollTo({ top: 0 }); document.getElementById('review-heading')?.focus(); } }, [reviewOpen, checkoutOpen]);
  const [pharmacy, setPharmacy] = useState<ProviderItem | null>(null);
  useEffect(() => {
    if (!pharmacyId || pharmacy?.id === pharmacyId) return;
    getProvidersApi('pharmacy').then((list) => setPharmacy(list.find((p) => p.id === pharmacyId) || null)).catch(() => undefined);
  }, [pharmacyId, pharmacy?.id]);
  const choose = (p: ProviderItem) => { setPharmacy(p); setPharmacyId(p.id); setReviewOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const cart = pharmacyId ? savedBaskets.baskets[pharmacyId]?.lines || [] : [];
  const cartRef = useRef<CartLine[]>(cart);
  cartRef.current = cart;
  const setCart = (lines: CartLine[]) => {
    if (!pharmacyId || !savedBaskets.update(pharmacyId, lines)) return false;
    cartRef.current = lines;
    return true;
  };

  // Shared confirm-step state
  const [fulfillmentType, setFulfillmentType] = useState<OrderFulfillmentType>('PICKUP');
  const [addresses, setAddresses] = useState<PatientAddress[]>([]);
  const [deliveryAddressId, setDeliveryAddressId] = useState<string>('');
  const [payChoice, setPayChoice] = useState<'CASH' | 'ONLINE'>('CASH');

  const isRxMode = !!pharmacyRequestId;

  const load = useCallback(async () => {
    setLoading(true); setLoadError(null);
    try {
      const addrs = await getAddressesApi().catch(() => []);
      setAddresses(addrs);

      if (pharmacyRequestId) {
        const requests = await getPharmacyRequestsApi();
        const req = requests.find((r) => r.id === pharmacyRequestId);
        if (!req) { setLoadError('This pharmacy request could not be found.'); return; }
        if (req.status !== 'Accepted') { setLoadError(`This request is not accepted yet (status: ${req.status}).`); return; }
        if (req.order_id) { setLoadError('An order has already been created for this request.'); return; }
        setPharmacyRequest(req);
        setPharmacyId(req.pharmacy_partner_id);

        const prescriptions = await getPrescriptionsApi();
        const rx = prescriptions.find((p) => p.id === req.prescription_id);
        setRxLines((rx?.medicines || []).map((m) => ({
          prescribedName: m.name || 'Unnamed medicine',
          dosage: m.dosage, frequency: m.frequency, duration: m.duration,
          matched: null, quantity: 1,
        })));
      }
    } catch {
      setLoadError('Unable to load. Please try again.');
    } finally { setLoading(false); }
  }, [pharmacyRequestId]);

  useEffect(() => { load(); }, [load]);

  const matchRxLine = (index: number, medicine: MedicineSearchResult) => {
    setRxLines((prev) => prev.map((l, i) => (i === index ? { ...l, matched: medicine } : l)));
  };
  const setRxQuantity = (index: number, quantity: number) => {
    setRxLines((prev) => prev.map((l, i) => (i === index ? { ...l, quantity: Math.max(1, quantity) } : l)));
  };

  const addToCart = (medicine: MedicineSearchResult, quantity = 1): number => {
    if (pharmacy?.pause) return 0;
    const result = addBasketMedicine(cartRef.current, medicine, quantity);
    if (result.error) return 0;
    if (!setCart(result.lines)) return 0;
    return quantity;
  };
  const setCartQuantity = (medicineId: string, quantity: number): boolean => {
    const result = changeBasketQuantity(cartRef.current, medicineId, quantity);
    if (result.error) return false;
    return setCart(result.lines);
  };

  const items: OrderCartLine[] = useMemo(() => {
    if (isRxMode) {
      return rxLines.filter((l) => l.matched).map((l) => ({ medicine_id: l.matched!.id, quantity: l.quantity }));
    }
    return cart.map((l) => ({ medicine_id: l.medicine.id, quantity: l.quantity }));
  }, [isRxMode, rxLines, cart]);

  const estimatedTotal = useMemo(() => {
    return basketSubtotal(isRxMode ? rxLines.filter(l => l.matched).map(l => ({ medicine: l.matched!, quantity: l.quantity })) : cart);
  }, [isRxMode, rxLines, cart]);

  const hasUnmatchedRequiredLines = isRxMode && rxLines.some((l) => !l.matched);
  const hasDirectRxItem = !isRxMode && cart.some((l) => l.medicine.requires_prescription);
  const canSubmit = !submitting && estimatedTotal !== null && !hasUnmatchedRequiredLines && (isRxMode || (!savedBaskets.loading && !savedBaskets.saving && !savedBaskets.error)) && items.length > 0 && (isRxMode || cart.every(l => !quantityProblem(l.medicine, l.quantity))) && !hasDirectRxItem && !!pharmacyId && (fulfillmentType === 'PICKUP' || !!deliveryAddressId);

  const handleSubmit = async () => {
    if (!canSubmit || !pharmacyId || hasDirectRxItem) return;
    setSubmitError(null); setSubmitting(true);
    try {
      // Cash is load-bearing here (Order.claim() checks payment_method===CASH at CREATED).
      // For an online choice, the specific method (UPI/Card/...) is properly selected on
      // the payment step that follows — this is just a placeholder satisfying the
      // required field, never charged against.
      const payment_method: PaymentMethod = payChoice === 'CASH' ? 'CASH' : 'UPI';
      const base = {
        fulfillment_type: fulfillmentType,
        delivery_address_id: fulfillmentType === 'DELIVERY' ? deliveryAddressId : undefined,
        payment_method,
        items,
      };
      const order = isRxMode
        ? await createRxOrderApi({ ...base, pharmacy_request_id: pharmacyRequestId! })
        : await createDirectOrderApi({ ...base, pharmacy_partner_id: pharmacyId });
      if (!isRxMode && pharmacyId) { savedBaskets.update(pharmacyId, []); await savedBaskets.flush(); }
      navigate(`/pharmacy-orders/${order.id}`);
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Unable to create this order. Please try again.';
      setSubmitError(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally { setSubmitting(false); }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <div className="w-7 h-7 border-[3px] border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-500 font-medium text-sm">Loading...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <p className="text-rose-600 font-semibold text-sm">{loadError}</p>
        <button onClick={() => navigate('/pharmacy-orders?tab=requests')} className="text-xs font-bold text-teal-700 hover:underline">Back to Pharmacy Requests</button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5 pb-28">
      {(savedBaskets.loading || savedBaskets.saving) && <p role="status" className="text-xs text-slate-500">{savedBaskets.loading ? 'Loading saved baskets...' : 'Saving basket...'}</p>}
      {savedBaskets.error && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{savedBaskets.error} <button type="button" onClick={() => void savedBaskets.reload()} className="ml-2 font-bold underline">Reload saved baskets</button></div>}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500"><button onClick={() => navigate('/dashboard')} className="inline-flex items-center gap-1 hover:text-slate-800"><ArrowLeft className="h-3.5 w-3.5" />Home</button><ChevronRight className="h-3 w-3" /><button onClick={() => navigate('/pharmacy-orders')} className="hover:text-slate-800">Pharmacy Orders</button><ChevronRight className="h-3 w-3" /><span className="font-semibold text-slate-800">{checkoutOpen && reviewOpen ? 'Fulfillment' : reviewOpen ? 'Review order' : 'Order medicines'}</span></nav>

      <header className={`flex flex-col gap-4 ${!isRxMode && reviewOpen && checkoutOpen ? '' : 'lg:flex-row lg:items-end lg:justify-between'}`}>
        <div>
          <h1 id="review-heading" tabIndex={-1} className="outline-none text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2.5">{isRxMode ? 'Confirm your prescription order' : reviewOpen && checkoutOpen ? 'Fulfillment' : reviewOpen ? 'Review order' : pharmacyId ? 'Add medicines' : 'Order medicines'}</h1>
          <p className="text-sm text-slate-500 mt-1.5">{isRxMode ? 'Match each prescribed medicine to the pharmacy’s stock and confirm quantities.' : reviewOpen && checkoutOpen ? 'Choose pickup or delivery, then select how to pay.' : reviewOpen ? 'Confirm your pharmacy, medicines and estimated costs before continuing.' : pharmacyId ? 'Choose medicines from your selected pharmacy or send an existing prescription.' : 'Find a nearby pharmacy, send your prescription or add medicines directly.'}</p>
        </div>
        {!isRxMode && (reviewOpen && checkoutOpen ? <FulfillmentSteps /> : reviewOpen ? <ReviewSteps /> : <OrderSteps step={!pharmacyId ? 1 : 2} />)}
      </header>

      {pharmacyId && isRxMode && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[220px]">{pharmacy ? <PharmacyCard p={pharmacy} compact /> : <p className="text-sm font-bold text-slate-700">{'Your pharmacy'}</p>}</div>
          {!isRxMode && <button type="button" onClick={() => { setPharmacyId(null); setPharmacy(null); setCart([]); }} className="text-xs font-bold text-[#B45F28] hover:underline">Change pharmacy</button>}
        </div>
      )}

      {!pharmacyId && !isRxMode && (
        <>
          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
            <div className="min-w-0 space-y-3">
              <TrustStrip />
              <PharmacyDirectory onChoose={choose} />
              <PrescriptionsReady pharmacy={null} onPickPharmacy={() => document.getElementById('ph-dir')?.scrollIntoView({ behavior: 'smooth' })} />
            </div>
            <aside className="space-y-4" aria-label="Order guidance">
              {savedBaskets.loading ? <p role="status" className="rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-500">Loading baskets...</p> : Object.values(savedBaskets.baskets).some(b => b.lines.length) ? Object.values(savedBaskets.baskets).filter(b => b.lines.length).map(b => <ResumeOrderCard key={b.pharmacyId} basket={b} persisted={savedBaskets.isPersisted(b.pharmacyId)} disabled={savedBaskets.saving || !!savedBaskets.error} onResume={() => { setPharmacyId(b.pharmacyId); setPharmacy(null); setReviewOpen(false); }} onDiscard={() => savedBaskets.update(b.pharmacyId, [])} />) : <section className="rounded-2xl border border-slate-200 bg-white p-4"><h2 className="text-sm font-bold text-[#101d48]">Your order</h2><p className="mt-2 text-xs leading-relaxed text-slate-500">{savedBaskets.error ? 'Baskets could not be loaded. Reload them using the message above.' : 'Choose a pharmacy and add medicines to start an order.'}</p></section>}
              <section className="rounded-2xl border border-[#e4ebf4] bg-white p-4">
                <h2 className="flex items-center gap-3 text-sm font-extrabold text-[#101d48]"><span className="grid h-8 w-8 place-items-center rounded-lg bg-orange-50 text-orange-600"><BadgeHelp className="h-5 w-5" /></span>How it works?</h2>
                <ol className="mt-4 space-y-5 text-xs leading-relaxed text-[#6880a6]">
                  <li className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-orange-50 text-xl font-bold text-orange-700">1</span><span><b className="text-[#101d48]">Choose a pharmacy</b><br /><span className="mt-1 block">Select a nearby pharmacy. Review its license details when provided.</span></span></li>
                  <li className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sky-50 text-xl font-bold text-blue-800">2</span><span><b className="text-[#101d48]">Add medicines</b><br /><span className="mt-1 block">Send an existing prescription or add medicines directly.</span></span></li>
                  <li className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-50 text-xl font-bold text-emerald-600">3</span><span><b className="text-[#101d48]">Review & place order</b><br /><span className="mt-1 block">Confirm your order and choose an available pickup or delivery option.</span></span></li>
                </ol>
              </section>
              <section className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-600"><Headphones className="h-6 w-6" /></span><div><h2 className="text-xs font-extrabold text-[#101d48]">Need help with your order?</h2><p className="mt-2 text-xs leading-relaxed text-[#6880a6]">Our support team is here to help with prescriptions, orders or delivery.</p></div></div><button type="button" onClick={() => navigate('/help')} className="mt-3 inline-flex items-center gap-3 rounded-xl border border-orange-400 bg-white px-3 py-2 text-xs font-semibold text-orange-700">Contact support <ChevronRight className="h-4 w-4" /></button></section>
              <section className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-600"><FileText className="h-6 w-6" /></span><div><h2 className="text-sm font-extrabold text-[#101d48] underline">Upload a prescription</h2><p className="mt-2 text-xs leading-relaxed text-[#6880a6]">Prescription upload is not available. You can send an existing prescription from your medical records.</p><button type="button" disabled className="mt-3 inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-blue-800 disabled:cursor-not-allowed disabled:opacity-60">Upload prescription <ChevronRight className="h-4 w-4" /></button><button type="button" onClick={() => navigate('/my-records')} className="mt-2 block text-xs font-semibold text-blue-800 underline">View existing prescriptions</button></div></div></section>
            </aside>
          </div>
        </>
      )}

      {pharmacyId && isRxMode && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Prescribed Medicines</span>
          {rxLines.length === 0 ? (
            <p className="text-xs text-slate-400">No medicines listed on this prescription.</p>
          ) : rxLines.map((line, i) => (
            <div key={i} className="border border-slate-100 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold text-slate-800 text-sm">{line.prescribedName}</p>
              </div>
              {(line.dosage || line.frequency || line.duration) && (
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  {line.dosage && (
                    <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg">
                      <span className="text-slate-400 font-semibold uppercase tracking-wide mr-1">Dose</span>{line.dosage}
                    </span>
                  )}
                  {line.frequency && (
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-100 px-2 py-1 rounded-lg">
                      <span className="text-purple-400 font-semibold uppercase tracking-wide mr-1">Freq</span>{line.frequency}
                    </span>
                  )}
                  {line.duration && (
                    <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-100 px-2 py-1 rounded-lg">
                      <span className="text-teal-400 font-semibold uppercase tracking-wide mr-1">For</span>{line.duration}
                    </span>
                  )}
                </div>
              )}
              {line.matched ? (
                <div className="mt-3 flex items-center justify-between gap-3 bg-teal-50/50 border border-teal-100 rounded-xl p-2.5">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-teal-800 truncate">{line.matched.medicine_name}</p>
                    <p className="text-[10px] text-teal-600">₹{line.matched.mrp.toFixed(2)} each</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setRxQuantity(i, line.quantity - 1)} className="w-6 h-6 rounded-lg bg-white border border-teal-200 flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                    <span className="text-xs font-bold w-4 text-center">{line.quantity}</span>
                    <button onClick={() => setRxQuantity(i, line.quantity + 1)} className="w-6 h-6 rounded-lg bg-white border border-teal-200 flex items-center justify-center"><Plus className="w-3 h-3" /></button>
                    <button onClick={() => matchRxLine(i, null as any)} className="text-slate-400 hover:text-rose-500"><X className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ) : (
                <RxLineMatcher onMatch={(m) => matchRxLine(i, m)} />
              )}
            </div>
          ))}
          {hasUnmatchedRequiredLines && (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              Unmatched lines won't be included in your order — match each one to continue with the full prescription.
            </p>
          )}
        </div>
      )}

      {pharmacyId && !isRxMode && !reviewOpen && <MedicineBrowser key={pharmacyId} pharmacyId={pharmacyId} pharmacy={pharmacy} cart={cart} onBasketOpen={() => setReviewOpen(false)} onReview={() => { setCheckoutOpen(false); setReviewOpen(true); window.scrollTo({ top: 0 }); }} onAdd={addToCart} onQuantity={setCartQuantity} onChange={() => setPickerOpen(true)} />}

      {pharmacyId && !isRxMode && reviewOpen && !checkoutOpen && <ReviewOrder onQuantity={setCartQuantity} onPrescription={() => navigate('/my-records')} pharmacy={pharmacy} lines={cart} busy={savedBaskets.loading || savedBaskets.saving || !!savedBaskets.error} onEdit={() => setReviewOpen(false)} onChange={() => { setReviewOpen(false); setPharmacyId(null); setPharmacy(null); }} onContinue={() => setCheckoutOpen(true)} />}

      {pharmacyId && !isRxMode && reviewOpen && checkoutOpen && <FulfillmentScreen fulfillmentType={fulfillmentType} onFulfillment={setFulfillmentType} addresses={addresses} deliveryAddressId={deliveryAddressId} onAddress={setDeliveryAddressId} payChoice={payChoice} onPayment={setPayChoice} canSubmit={canSubmit} onSubmit={handleSubmit} pharmacy={pharmacy} lines={cart} busy={savedBaskets.loading || savedBaskets.saving} error={submitError || savedBaskets.error} onEdit={() => { setCheckoutOpen(false); setReviewOpen(false); }} onChange={() => { setCheckoutOpen(false); setReviewOpen(false); setPharmacyId(null); setPharmacy(null); }} onBack={() => setCheckoutOpen(false)} onPrescription={() => navigate('/my-records')} />}

      {pharmacyId && items.length > 0 && isRxMode && (
        <div id="pharmacy-checkout" tabIndex={-1} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          {!isRxMode && <button onClick={() => setCheckoutOpen(false)} className="text-sm font-semibold text-blue-700 underline">Back to review order</button>}
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Fulfillment</span>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setFulfillmentType('PICKUP')} className={`p-3 rounded-xl border flex items-center gap-2 text-sm font-bold ${fulfillmentType === 'PICKUP' ? 'border-[#B45F28] bg-[#FDF7F1] text-[#8A4518]' : 'border-slate-200 text-slate-600'}`}>
                <Store className="w-4 h-4" /> Pickup
              </button>
              <button onClick={() => setFulfillmentType('DELIVERY')} disabled={addresses.length === 0} className={`p-3 rounded-xl border flex items-center gap-2 text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed ${fulfillmentType === 'DELIVERY' ? 'border-[#B45F28] bg-[#FDF7F1] text-[#8A4518]' : 'border-slate-200 text-slate-600'}`}>
                <Truck className="w-4 h-4" /> Delivery
              </button>
            </div>
            {addresses.length === 0 && fulfillmentType === 'PICKUP' && (
              <p className="text-[11px] text-slate-400 mt-1.5">Add a saved address in Profile to enable delivery.</p>
            )}
            {fulfillmentType === 'DELIVERY' && (
              <select
                value={deliveryAddressId}
                onChange={(e) => setDeliveryAddressId(e.target.value)}
                className="w-full mt-3 px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold"
              >
                <option value="">Select delivery address...</option>
                {addresses.map((a) => (
                  <option key={a.addressId} value={a.addressId}>{a.label || a.addressLine1 || 'Saved address'}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Payment</span>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setPayChoice('CASH')} className={`p-3 rounded-xl border flex items-center gap-2 text-sm font-bold ${payChoice === 'CASH' ? 'border-[#B45F28] bg-[#FDF7F1] text-[#8A4518]' : 'border-slate-200 text-slate-600'}`}>
                <Banknote className="w-4 h-4" /> Pay at {fulfillmentType === 'DELIVERY' ? 'delivery' : 'pickup'}
              </button>
              <button onClick={() => setPayChoice('ONLINE')} className={`p-3 rounded-xl border flex items-center gap-2 text-sm font-bold ${payChoice === 'ONLINE' ? 'border-[#B45F28] bg-[#FDF7F1] text-[#8A4518]' : 'border-slate-200 text-slate-600'}`}>
                <Wallet className="w-4 h-4" /> Pay online now
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-500">Estimated total</span>
            <span className="text-lg font-black text-slate-800">₹{estimatedTotal === null ? 'Price not provided' : estimatedTotal.toFixed(2)}</span>
          </div>
          <p className="text-[10px] text-slate-400 -mt-2">Final pricing and availability are confirmed by the pharmacy when you place the order.</p>

          {/* Pharmacy Cancellation & Refund Policy (Requirement 4) */}
          <CancellationRefundPolicy service="pharmacy" className="my-2" />

          {hasDirectRxItem && (
            <p className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              Needs a doctor's prescription — send your prescription to a pharmacy
            </p>
          )}

          {submitError && <p className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{submitError}</p>}

          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="w-full py-3 rounded-2xl bg-[#B45F28] hover:bg-[#9A4F20] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm"
          >
            {submitting ? 'Placing order...' : 'Place order'}
          </button>
        </div>
      )}

      {pickerOpen && (
        <SelectPharmacyModal
          title="Select Pharmacy"
          onSelect={(p) => { choose(p); setPickerOpen(false); }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}

// Small inline search-and-match control for one prescribed (free-text) line.
const RxLineMatcher: React.FC<{ onMatch: (m: MedicineSearchResult) => void }> = ({ onMatch }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MedicineSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      try { setResults(await searchMedicinesApi(query)); }
      catch { setResults([]); }
      finally { setSearching(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="mt-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Match to a catalogue medicine..."
          className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
        />
        {searching && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />}
      </div>
      {results.length > 0 && (
        <div className="mt-1.5 border border-slate-100 rounded-lg divide-y divide-slate-100 overflow-hidden">
          {results.map((m) => (
            <button key={m.id} onClick={() => onMatch(m)} className="w-full text-left px-3 py-2 hover:bg-slate-50 text-xs">
              <span className="font-bold text-slate-800">{m.medicine_name}</span>{' '}
              <span className="text-slate-400">{m.strength}{m.strength_unit} · ₹{m.mrp.toFixed(2)}</span>
              {m.requires_prescription && <span className="ml-1.5 text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">Rx</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
