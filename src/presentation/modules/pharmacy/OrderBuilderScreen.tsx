import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search, Plus, Minus, Trash2, AlertCircle, Store, Truck, Wallet, Banknote, X, Pill } from 'lucide-react';
import {
  getPharmacyRequestsApi, createRxOrderApi, createDirectOrderApi,
  searchMedicinesApi, type MedicineSearchResult, type OrderCartLine,
} from '../../../services/pharmacyOrderHelper';
import { getPrescriptionsApi, getAddressesApi, type PatientAddress } from '../../../services/patientHelper';
import type { PharmacyRequestItem, OrderFulfillmentType } from '../../../services/types';
import type { PaymentMethod } from '../../../services/bookingHelper';
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
  const [pharmacyId, setPharmacyId] = useState<string | null>(preselectedPharmacyId);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pharmacy, setPharmacy] = useState<ProviderItem | null>(null);
  useEffect(() => {
    if (!pharmacyId || pharmacy?.id === pharmacyId) return;
    getProvidersApi('pharmacy').then((list) => setPharmacy(list.find((p) => p.id === pharmacyId) || null)).catch(() => undefined);
  }, [pharmacyId, pharmacy?.id]);
  const choose = (p: ProviderItem) => { setPharmacy(p); setPharmacyId(p.id); setCart([]); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const [cart, setCart] = useState<CartLine[]>([]);
  const [medQuery, setMedQuery] = useState('');
  const [medResults, setMedResults] = useState<MedicineSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

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

  // Medicine search for direct-mode cart building
  useEffect(() => {
    if (isRxMode || !medQuery.trim()) { setMedResults([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      try { setMedResults(await searchMedicinesApi(medQuery)); }
      catch { setMedResults([]); }
      finally { setSearching(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [medQuery, isRxMode]);

  const matchRxLine = (index: number, medicine: MedicineSearchResult) => {
    setRxLines((prev) => prev.map((l, i) => (i === index ? { ...l, matched: medicine } : l)));
  };
  const setRxQuantity = (index: number, quantity: number) => {
    setRxLines((prev) => prev.map((l, i) => (i === index ? { ...l, quantity: Math.max(1, quantity) } : l)));
  };

  const addToCart = (medicine: MedicineSearchResult) => {
    if (medicine.requires_prescription && !isRxMode) return;
    setCart((prev) => {
      const existing = prev.find((l) => l.medicine.id === medicine.id);
      if (existing) return prev.map((l) => (l.medicine.id === medicine.id ? { ...l, quantity: l.quantity + 1 } : l));
      return [...prev, { medicine, quantity: 1 }];
    });
    setMedQuery(''); setMedResults([]);
  };
  const setCartQuantity = (medicineId: string, quantity: number) => {
    if (quantity <= 0) { setCart((prev) => prev.filter((l) => l.medicine.id !== medicineId)); return; }
    setCart((prev) => prev.map((l) => (l.medicine.id === medicineId ? { ...l, quantity } : l)));
  };

  const items: OrderCartLine[] = useMemo(() => {
    if (isRxMode) {
      return rxLines.filter((l) => l.matched).map((l) => ({ medicine_id: l.matched!.id, quantity: l.quantity }));
    }
    return cart.map((l) => ({ medicine_id: l.medicine.id, quantity: l.quantity }));
  }, [isRxMode, rxLines, cart]);

  const estimatedTotal = useMemo(() => {
    if (isRxMode) return rxLines.reduce((sum, l) => sum + (l.matched ? l.matched.mrp * l.quantity : 0), 0);
    return cart.reduce((sum, l) => sum + l.medicine.mrp * l.quantity, 0);
  }, [isRxMode, rxLines, cart]);

  const hasUnmatchedRequiredLines = isRxMode && rxLines.some((l) => !l.matched);
  const hasDirectRxItem = !isRxMode && cart.some((l) => l.medicine.requires_prescription);
  const canSubmit = items.length > 0 && !hasDirectRxItem && !!pharmacyId && (fulfillmentType === 'PICKUP' || !!deliveryAddressId);

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
      <button onClick={() => navigate('/pharmacy-orders')} className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900">
        <ArrowLeft className="w-4 h-4" /> Pharmacy orders
      </button>

      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2.5"><span className="w-10 h-10 rounded-xl bg-[#FDF7F1] text-[#B45F28] grid place-items-center"><Pill className="w-5 h-5" /></span>{isRxMode ? 'Confirm your prescription order' : 'Order medicines'}</h1>
          <p className="text-sm text-slate-500 mt-1.5">{isRxMode ? 'Match each prescribed medicine to the pharmacy’s stock and confirm quantities.' : 'From a licensed pharmacy near you: send your prescription, or add medicines yourself.'}</p>
        </div>
        {!isRxMode && <OrderSteps step={!pharmacyId ? 1 : items.length === 0 ? 2 : 3} />}
      </header>

      {pharmacyId && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[220px]">{pharmacy ? <PharmacyCard p={pharmacy} compact /> : <p className="text-sm font-bold text-slate-700">{'Your pharmacy'}</p>}</div>
          {!isRxMode && <button type="button" onClick={() => { setPharmacyId(null); setPharmacy(null); setCart([]); }} className="text-xs font-bold text-[#B45F28] hover:underline">Change pharmacy</button>}
        </div>
      )}

      {!pharmacyId && !isRxMode && (
        <>
          <TrustStrip />
          <PrescriptionsReady pharmacy={null} onPickPharmacy={() => document.getElementById('ph-dir')?.scrollIntoView({ behavior: 'smooth' })} />
          <PharmacyDirectory onChoose={choose} />
        </>
      )}
      {pharmacyId && !isRxMode && cart.length === 0 && <PrescriptionsReady pharmacy={pharmacy} onPickPharmacy={() => undefined} />}

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

      {pharmacyId && !isRxMode && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={medQuery}
              onChange={(e) => setMedQuery(e.target.value)}
              aria-label="Search medicines" placeholder="Search a medicine, e.g. Paracetamol 650, Dolo, Cetirizine"
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
            {searching && <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />}
          </div>
          {medResults.length > 0 && (
            <div className="border border-slate-100 rounded-xl divide-y divide-slate-100 overflow-hidden">
              {medResults.map((m) => {
                const rxBlocked = m.requires_prescription && !isRxMode;
                if (rxBlocked) {
                  return (
                    <div key={m.id} className="p-3 bg-amber-50/50 flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {m.medicine_name} <span className="text-slate-400 font-medium">{m.strength}{m.strength_unit}</span>
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-slate-400">₹{m.mrp.toFixed(2)}</span>
                            <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">Rx required</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-2.5 bg-white border border-amber-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-sm">
                        <p className="text-xs text-amber-900 font-medium leading-relaxed">
                          Needs a doctor's prescription — send your prescription to a pharmacy
                        </p>
                        <button
                          type="button"
                          onClick={() => navigate('/my-records')}
                          className="px-3 py-1.5 bg-[#B45F28] hover:bg-[#9A4F20] text-white rounded-lg text-xs font-bold shrink-0 shadow-sm transition"
                        >
                          Send to pharmacy
                        </button>
                      </div>
                    </div>
                  );
                }
                return (
                  <button key={m.id} type="button" onClick={() => addToCart(m)} className="w-full flex items-center justify-between gap-3 p-3 hover:bg-slate-50 text-left">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{m.medicine_name} <span className="text-slate-400 font-medium">{m.strength}{m.strength_unit}</span></p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-slate-400">₹{m.mrp.toFixed(2)}</span>
                        {m.requires_prescription && <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">Rx required</span>}
                      </div>
                    </div>
                    <Plus className="w-4 h-4 text-teal-600 shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
          {cart.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Your cart · {cart.reduce((n, l) => n + l.quantity, 0)} item{cart.reduce((n, l) => n + l.quantity, 0) === 1 ? '' : 's'}</span>
              {hasDirectRxItem && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-amber-900 shadow-sm">
                  <p className="font-semibold">Needs a doctor's prescription — send your prescription to a pharmacy</p>
                  <button type="button" onClick={() => navigate('/my-records')} className="px-3 py-1.5 bg-[#B45F28] hover:bg-[#9A4F20] text-white rounded-lg text-xs font-bold shrink-0">Send to pharmacy</button>
                </div>
              )}
              {cart.map((l) => (
                <div key={l.medicine.id} className="flex items-center justify-between gap-3 bg-slate-50 rounded-xl p-2.5">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{l.medicine.medicine_name}</p>
                    <p className="text-[10px] text-slate-400">₹{l.medicine.mrp.toFixed(2)} each</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setCartQuantity(l.medicine.id, l.quantity - 1)} className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                    <span className="text-xs font-bold w-4 text-center">{l.quantity}</span>
                    <button onClick={() => setCartQuantity(l.medicine.id, l.quantity + 1)} className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center"><Plus className="w-3 h-3" /></button>
                    <button onClick={() => setCartQuantity(l.medicine.id, 0)} className="text-slate-400 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {cart.length === 0 && !medQuery && <p className="text-xs text-slate-500 text-center py-4">Search above to add medicines. Medicines marked <b className="text-amber-700">Rx</b> need a prescription; the pharmacist checks it before handing them over.</p>}
          {medQuery.trim().length >= 2 && !searching && medResults.length === 0 && <p className="text-xs text-slate-500 text-center py-3">No medicine matches “{medQuery.trim()}”. Check the spelling or try the generic name.</p>}
        </div>
      )}

      {pharmacyId && items.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
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
            <span className="text-lg font-black text-slate-800">₹{estimatedTotal.toFixed(2)}</span>
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
