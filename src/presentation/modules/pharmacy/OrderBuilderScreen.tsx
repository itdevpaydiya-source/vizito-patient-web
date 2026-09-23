import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search, Plus, Minus, Trash2, AlertCircle, Store, Truck, Wallet, Banknote, X } from 'lucide-react';
import {
  getPharmacyRequestsApi, createRxOrderApi, createDirectOrderApi,
  searchMedicinesApi, type MedicineSearchResult, type OrderCartLine,
} from '../../../services/pharmacyOrderHelper';
import { getPrescriptionsApi, getAddressesApi, type PatientAddress } from '../../../services/patientHelper';
import type { PharmacyRequestItem, OrderFulfillmentType } from '../../../services/types';
import type { PaymentMethod } from '../../../services/bookingHelper';
import SelectPharmacyModal from './SelectPharmacyModal';

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
  const [pickerOpen, setPickerOpen] = useState(!pharmacyRequestId && !preselectedPharmacyId);
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
  const canSubmit = items.length > 0 && !!pharmacyId && (fulfillmentType === 'PICKUP' || !!deliveryAddressId);

  const handleSubmit = async () => {
    if (!canSubmit || !pharmacyId) return;
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
    <div className="max-w-3xl mx-auto space-y-5 pb-28">
      <button onClick={() => navigate('/pharmacy-orders')} className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-2 rounded-xl">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl">
        <h2 className="text-xl font-black">{isRxMode ? 'Confirm Your Prescription Order' : 'Order Medicines'}</h2>
        <p className="text-teal-100/80 text-xs mt-1">{isRxMode ? 'Match each prescribed medicine and confirm quantities.' : 'Search and add medicines to your cart.'}</p>
      </div>

      {!pharmacyId && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center">
          <p className="text-sm font-bold text-slate-700 mb-3">Choose a pharmacy to get started</p>
          <button onClick={() => setPickerOpen(true)} className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs">Select Pharmacy</button>
        </div>
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

      {pharmacyId && !isRxMode && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={medQuery}
              onChange={(e) => setMedQuery(e.target.value)}
              placeholder="Search medicines by name..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
            {searching && <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />}
          </div>
          {medResults.length > 0 && (
            <div className="border border-slate-100 rounded-xl divide-y divide-slate-100 overflow-hidden">
              {medResults.map((m) => (
                <button key={m.id} onClick={() => addToCart(m)} className="w-full flex items-center justify-between gap-3 p-3 hover:bg-slate-50 text-left">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{m.medicine_name} <span className="text-slate-400 font-medium">{m.strength}{m.strength_unit}</span></p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-slate-400">₹{m.mrp.toFixed(2)}</span>
                      {m.requires_prescription && <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">Rx required</span>}
                    </div>
                  </div>
                  <Plus className="w-4 h-4 text-teal-600 shrink-0" />
                </button>
              ))}
            </div>
          )}
          {cart.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cart</span>
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
          {cart.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Your cart is empty — search above to add medicines.</p>}
        </div>
      )}

      {pharmacyId && items.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Fulfillment</span>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setFulfillmentType('PICKUP')} className={`p-3 rounded-xl border flex items-center gap-2 text-sm font-bold ${fulfillmentType === 'PICKUP' ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-slate-200 text-slate-600'}`}>
                <Store className="w-4 h-4" /> Pickup
              </button>
              <button onClick={() => setFulfillmentType('DELIVERY')} disabled={addresses.length === 0} className={`p-3 rounded-xl border flex items-center gap-2 text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed ${fulfillmentType === 'DELIVERY' ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-slate-200 text-slate-600'}`}>
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
              <button onClick={() => setPayChoice('CASH')} className={`p-3 rounded-xl border flex items-center gap-2 text-sm font-bold ${payChoice === 'CASH' ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-slate-200 text-slate-600'}`}>
                <Banknote className="w-4 h-4" /> Pay at {fulfillmentType === 'DELIVERY' ? 'delivery' : 'pickup'}
              </button>
              <button onClick={() => setPayChoice('ONLINE')} className={`p-3 rounded-xl border flex items-center gap-2 text-sm font-bold ${payChoice === 'ONLINE' ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-slate-200 text-slate-600'}`}>
                <Wallet className="w-4 h-4" /> Pay online now
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-500">Estimated total</span>
            <span className="text-lg font-black text-slate-800">₹{estimatedTotal.toFixed(2)}</span>
          </div>
          <p className="text-[10px] text-slate-400 -mt-2">Final pricing and availability are confirmed by the pharmacy when you place the order.</p>

          {submitError && <p className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{submitError}</p>}

          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="w-full py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm"
          >
            {submitting ? 'Placing order...' : 'Place Order'}
          </button>
        </div>
      )}

      {pickerOpen && (
        <SelectPharmacyModal
          title="Select Pharmacy"
          onSelect={(p) => { setPharmacyId(p.id); setPickerOpen(false); }}
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
