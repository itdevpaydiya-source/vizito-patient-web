import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronRight, Clock, FileText, Info, MapPin,
  Minus, Package, Phone, Plus, Search, ShieldCheck, ShoppingCart, Store, Trash2, Truck, Upload, X,
} from 'lucide-react';
import MediaImage from '../../components/MediaImage';
import CancellationRefundPolicy from '../../components/CancellationRefundPolicy';
import ThemedSelect from '../../components/forms/ThemedSelect';
import VizitoDialog from '../../components/dialogs/VizitoDialog';
import VizitoPagination from '../../components/navigation/VizitoPagination';
import LocationBar from '../../components/location/LocationBar';
import { findPlaces, setSearchArea, useSearchArea, formatDistance } from '../../../services/location';
import { usePharmacyBaskets } from '../../../services/PharmacyBasketContext';
import {
  createDirectOrderApi, createPharmacyRequestApi, createRxOrderApi, createUploadedPharmacyRequestApi,
  cancelPharmacyRequestApi, getDeliveryOptionsApi, getMedicineDetailApi,
  getMedicinePharmaciesNearApi, getMyOrdersGroupedPageApi, getPharmacyRequestsApi,
  searchMedicinesNearApi, discoverMedicinesApi, suggestMedicinesApi, getPharmaciesWithAllApi, getPharmacyCatalogueApi, getPharmacyStockApi,
  type DeliveryOptions, type MedicineDetail, type MedicineNearPharmacy, type CatalogueMedicine, type NearSearchPage,
  type MedicineNearResult, type MedicineSearchResult, type MedicineSuggestion, type Paged, type PatientOrderV2, type PharmacyMedicine, type PharmacyWithAll,
} from '../../../services/pharmacyOrderHelper';
import { getAddressesApi as loadAddresses, getProvidersApi, type PatientAddress } from '../../../services/patientHelper';
import type { PharmacyRequestItem, ProviderItem } from '../../../services/types';
import { beneficiaryLabel, personPharmacyPrescriptions, prescriptionFileProblem, requestedMedicines, type PharmacyPrescriptionChoice } from './pharmacyPrescriptionDetails';
import { differentProduct, quoteExpired, quoteLines } from './prescriptionRequests';
import { onlinePaymentConfig } from '../../../services/razorpayCheckout';
import { recordsApi } from '../records/recordsApi';
import { money, moneyNumber, addressText, errorText, validPin, deliveryEtaText } from './pharmacyV2Ui';
import BookingForChip, { useBookingFamily } from '../family/BookingForChip';
import type { BasketLine } from './medicineBasket';
import '../consultations/DoctorJourney.css';
import './PharmacyV2.css';

const norm = (value: string | null | undefined) => (value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const packText = (medicine: { packaging_type?: string | null; units_per_pack?: number | null }) => {
  if (medicine.packaging_type && medicine.units_per_pack) return `${medicine.packaging_type} of ${medicine.units_per_pack}`;
  if (medicine.packaging_type) return medicine.packaging_type;
  if (medicine.units_per_pack) return `Pack of ${medicine.units_per_pack}`;
  return '';
};

// "500 mg Tablet". A strength that already carries its unit ("10mg") is not given it twice.
const strengthText = (medicine: { strength?: string | null; strength_unit?: string | null; dosage_form?: string | null }) => {
  const strength = String(medicine.strength || '').trim();
  const unit = String(medicine.strength_unit || '').trim();
  const hasUnit = !!unit && strength.toLowerCase().replace(/\s+/g, '').endsWith(unit.toLowerCase().replace(/\s+/g, ''));
  return [strength, hasUnit ? '' : unit].filter(Boolean).join(' ') + (strength && medicine.dosage_form ? ` ${medicine.dosage_form}` : '');
};

type Fulfilment = 'DELIVERY' | 'PICKUP';
type PayMode = 'CASH' | 'ONLINE';

// Everyday medicines shown on the landing page before a location is set.
const LANDING_PICKS = ['Paracetamol', 'Cetirizine', 'Pantoprazole', 'Azithromycin'];

type CardVariant = 'near' | 'catalogue' | 'unavailable';

function cardPrice(medicine: MedicineNearResult | MedicineSearchResult | CatalogueMedicine, variant: CardVariant) {
  const mrp = moneyNumber(medicine.mrp);
  if (variant === 'near' && 'price_from' in medicine && medicine.price_from != null) {
    return medicine.price_to != null && medicine.price_to > medicine.price_from ? `From ${money(medicine.price_from)}` : money(medicine.price_from);
  }
  return mrp > 0 ? (variant === 'near' ? money(mrp) : `MRP ${money(mrp)}`) : 'Price on request';
}

function MedicineCard({ medicine, onOpen, variant = 'near' }: { medicine: MedicineNearResult | MedicineSearchResult | CatalogueMedicine; onOpen: () => void; variant?: CardVariant }) {
  return (
    <article className="ph2-med-card">
      <button type="button" className="ph2-med-open" onClick={onOpen}>
        <MediaImage kind="medicine" name={medicine.medicine_name} src={'image_url' in medicine ? medicine.image_url : null} />
        <span>
          <h3>{medicine.medicine_name}</h3>
          <small>{[medicine.generic_name, strengthText(medicine), packText(medicine)].filter(Boolean).join(' · ') || 'Medicine'}</small>
        </span>
      </button>
      <div className="ph2-med-card-foot">
        <div>
          <div className="ph2-price"><b>{cardPrice(medicine, variant)}</b></div>
          {'pharmacies_near' in medicine && medicine.pharmacies_near > 0 && (
            <span className="ph2-stock"><CheckCircle2 />At {medicine.pharmacies_near} {medicine.pharmacies_near === 1 ? 'pharmacy' : 'pharmacies'} nearby</span>
          )}
          {variant === 'catalogue' && <span className="ph2-stock is-muted"><MapPin />Set your location to check availability</span>}
          {variant === 'unavailable' && <span className="ph2-stock is-muted"><AlertTriangle />Currently unavailable nearby</span>}
        </div>
        <div className="ph2-med-tags">
          {medicine.requires_prescription
            ? <span className="ph2-chip ph2-chip--rx"><FileText />Rx required</span>
            : <span className="ph2-chip ph2-chip--otc">No prescription needed</span>}
          <button type="button" className="ph2-btn ph2-btn--ghost ph2-btn--sm" onClick={onOpen}>{variant === 'near' ? 'View pharmacies' : 'View details'}</button>
        </div>
      </div>
    </article>
  );
}

export default function PharmacyV2() {
  const baskets = usePharmacyBaskets();
  const draft = baskets.draft;
  const area = useSearchArea();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const medicineId = params.get('medicine') || '';
  const query = (params.get('q') || '').trim();
  // "View all medicines": browse everything (no keyword), never a fake search term.
  const browseAll = params.get('all') === '1' && !query;
  // List filters live in the URL so they survive refresh and can be shared.
  const filterRx = params.get('rx') === 'otc' || params.get('rx') === 'rx' ? params.get('rx')! : '';
  const filterDelivery = params.get('delivery') === '1' ? '1' : '';
  const filterPrice = ['50', '200', 'above'].includes(params.get('price') || '') ? params.get('price')! : '';
  const sortBy = ['price', 'name'].includes(params.get('sort') || '') ? params.get('sort')! : 'relevance';
  const setFilter = (patch: Partial<Record<'rx' | 'delivery' | 'price' | 'sort', string>>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => { if (v && v !== 'relevance') next.set(k, v); else next.delete(k); });
    next.delete('page');
    setParams(next);
  };
  const listFilters = {
    ...(filterRx ? { rx: filterRx as 'otc' | 'rx' } : {}),
    ...(filterDelivery ? { delivery: '1' as const } : {}),
    ...(filterPrice ? { price: filterPrice as '50' | '200' | 'above' } : {}),
    ...(sortBy !== 'relevance' ? { sort: sortBy as 'price' | 'name' } : {}),
  };
  const requestParam = params.get('request') || params.get('pharmacyRequestId') || '';
  // A link from a pharmacy card: browse what this one pharmacy stocks.
  const pharmacyParam = params.get('pharmacy') || '';
  const view: 'search' | 'medicine' | 'cart' = medicineId ? 'medicine' : params.get('view') === 'cart' || requestParam ? 'cart' : 'search';

  const [term, setTerm] = useState(query);
  useEffect(() => { setTerm(query); }, [query]);

  const [results, setResults] = useState<NearSearchPage | null>(null);
  // Before a location is set the search still works: catalogue matches, no stock or price claims.
  const [catalogue, setCatalogue] = useState<(Paged<CatalogueMedicine> & { did_you_mean: string | null }) | null>(null);
  const [stocked, setStocked] = useState<{ items: PharmacyMedicine[]; total: number } | null>(null);
  const [suggestions, setSuggestions] = useState<MedicineSuggestion[]>([]);
  const [suggestFix, setSuggestFix] = useState<string | null>(null);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [nearSort, setNearSort] = useState<'nearest' | 'price'>('nearest');
  const [showFilters, setShowFilters] = useState(false);
  // After "Upload prescription" outside the cart: the next step — send it to a nearby pharmacy for a quote.
  const [uploadSend, setUploadSend] = useState<{ open: boolean; pharmacyId: string; busy: boolean; error: string }>({ open: false, pharmacyId: '', busy: false, error: '' });
  const [together, setTogether] = useState<PharmacyWithAll[] | null>(null);
  // Cart: whole packs in stock at the chosen pharmacy, per medicine; lines we cut down to that stock.
  const [stockHere, setStockHere] = useState<Map<string, number> | null>(null);
  const [reducedTo, setReducedTo] = useState<Record<string, number>>({});
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [retry, setRetry] = useState(0);
  const [popular, setPopular] = useState<MedicineNearResult[]>([]);
  const [popularCatalogue, setPopularCatalogue] = useState<CatalogueMedicine[]>([]);
  const [actionError, setActionError] = useState('');

  const [providers, setProviders] = useState<ProviderItem[]>([]);
  const [recent, setRecent] = useState<PatientOrderV2[]>([]);
  const [nearMeta, setNearMeta] = useState<Record<string, MedicineNearPharmacy>>({});

  const [detail, setDetail] = useState<MedicineDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [nearRows, setNearRows] = useState<MedicineNearPharmacy[]>([]);
  const [nearLoading, setNearLoading] = useState(false);
  const [selectedPharmacy, setSelectedPharmacy] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [pendingAdd, setPendingAdd] = useState<{ line: BasketLine; pharmacyId: string } | null>(null);

  const [requestNonce, setRequestNonce] = useState(0);
  const [activeRequest, setActiveRequest] = useState<PharmacyRequestItem | null>(null);
  // A request that already became an order has nothing left to choose here: show the order, not a cart.
  useEffect(() => { if (activeRequest?.order_id && !['Cancelled', 'Rejected', 'Expired'].includes(activeRequest.status)) navigate(`/pharmacy-orders/${activeRequest.order_id}`, { replace: true }); }, [activeRequest?.order_id, activeRequest?.status, navigate]);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState('');

  const [prescriptions, setPrescriptions] = useState<PharmacyPrescriptionChoice[]>([]);
  const [prescriptionId, setPrescriptionId] = useState('');
  const [prescriptionLoading, setPrescriptionLoading] = useState(false);
  const [rxSource, setRxSource] = useState<'vizito' | 'upload'>('vizito');
  const [uploading, setUploading] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const [addresses, setAddresses] = useState<PatientAddress[]>([]);
  const [addressId, setAddressId] = useState('');
  const [manualAddress, setManualAddress] = useState(false);
  const [manualText, setManualText] = useState('');
  const [manualPin, setManualPin] = useState('');
  const [pickupAddressOpen, setPickupAddressOpen] = useState(false);
  const [fulfilment, setFulfilment] = useState<Fulfilment>('DELIVERY');
  // Pickup chosen by the page (address not covered), not the patient: a covered address switches back.
  const autoPickup = useRef(false);
  const [delivery, setDelivery] = useState<DeliveryOptions | null>(null);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [payMode, setPayMode] = useState<PayMode>('CASH');
  // null = not known yet; the payment dialog still checks before charging.
  const [onlineAvailable, setOnlineAvailable] = useState<boolean | null>(null);
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState('');
  const [findingPharmacies, setFindingPharmacies] = useState(false);

  // Who the medicine is for: 'self' or a family member's user id (same URL rule as every booking journey).
  const [familyMemberId, setFamilyMemberId] = useState('');
  const { family, error: familyError } = useBookingFamily(setFamilyMemberId);
  const member = family.find((f) => String(f.memberUserId) === familyMemberId) || null;
  const subject = member ? familyMemberId : 'self';
  const forUserId = member ? Number(familyMemberId) : undefined;
  // An upload belongs to the person it was filed under; it can't be sent for someone else.
  const documentId = (draft.documentSubject || 'self') === subject ? draft.documentId : undefined;
  // The patient decides before a quote takes the place of a basket they built themselves.
  const [replaceBasket, setReplaceBasket] = useState(false);

  const requestId = requestParam || draft.requestId || '';
  // A request opened by link belongs to its own pharmacy, whatever is in the browser basket.
  const pharmacyId = (requestParam && activeRequest?.pharmacy_partner_id) || draft.pharmacyId || activeRequest?.pharmacy_partner_id || '';
  const needsRx = draft.lines.some((line) => line.medicine.requires_prescription);

  const providerById = useMemo(() => new Map(providers.map((p) => [p.id, p])), [providers]);
  const selectedRow = nearRows.find((p) => p.pharmacy_id === selectedPharmacy) || null;
  const detailPrice = selectedRow?.price ?? (detail ? moneyNumber(detail.mrp) : 0);
  const deliverySearch = params.get('deliver') === '1';
  const sortedNear = useMemo(() => [...nearRows].sort((a, b) => {
    if (pharmacyParam && (a.pharmacy_id === pharmacyParam) !== (b.pharmacy_id === pharmacyParam)) return a.pharmacy_id === pharmacyParam ? -1 : 1;
    if (deliverySearch && a.home_delivery !== b.home_delivery) return a.home_delivery ? -1 : 1;
    return nearSort === 'price'
      ? (a.price ?? 1e9) - (b.price ?? 1e9) || (a.distance_km ?? 1e9) - (b.distance_km ?? 1e9)
      : 0;
  }), [nearRows, nearSort, deliverySearch, pharmacyParam]);
  const provider = pharmacyId ? providerById.get(pharmacyId) : undefined;
  const nearPharmacy = pharmacyId ? nearMeta[pharmacyId] : undefined;
  const pharmacyName = provider?.name || nearPharmacy?.name || 'your selected pharmacy';
  const chosenPharmacyName = pharmacyParam ? providerById.get(pharmacyParam)?.name || nearMeta[pharmacyParam]?.name || 'This pharmacy' : '';
  const pharmacyAddress = provider?.address || nearPharmacy?.address || '';
  const pharmacyDistanceText = provider && area ? (() => { const pin = provider.storePin; return pin ? formatDistance(Math.hypot((pin.lat - area.lat) * 111320, (pin.lng - area.lng) * 111320 * Math.cos(area.lat * Math.PI / 180))) : null; })() : null;

  const selectedAddress = addresses.find((a) => a.addressId === addressId) || null;
  const manualMode = manualAddress || addresses.length === 0;
  const deliveryText = manualMode ? manualText.trim() : selectedAddress ? addressText(selectedAddress) : '';
  const deliveryPin = manualMode ? manualPin.trim() : selectedAddress?.pincode || '';
  const effectivePin = deliveryPin || area?.pincode || '';
  const pickupOnly = /pickup only/i.test(delivery?.reason || '');
  const pinUnavailable = delivery?.available === false && !pickupOnly;
  const formatHours = (value: string) => {
    const match = value.match(/^(\d{1,2}):(\d{2})/);
    if (!match) return value;
    const hour = Number(match[1]);
    return `${String(hour % 12 || 12).padStart(2, '0')}:${match[2]} ${hour < 12 ? 'AM' : 'PM'}`;
  };

  const quote = activeRequest ? quoteLines(activeRequest) : null;
  const accepted = !!activeRequest && activeRequest.status === 'Accepted' && !activeRequest.order_id;
  const quoteReady = accepted && !!activeRequest?.quote_items && !!quote?.length && !quoteExpired(activeRequest);

  const livePrices = useMemo(() => {
    const here = together?.find((p) => p.pharmacy_id === draft.pharmacyId);
    return new Map((here?.prices || []).map((x) => [x.medicine_id, Number(x.price)]));
  }, [together, draft.pharmacyId]);

  const quoteExpiredNow = accepted && !!activeRequest?.quote_items && quoteExpired(activeRequest);

  // With a quote, the cart IS the quote: one row per orderable line, exactly what the server charges.
  // A substitute the patient never added still gets a row, built from the quote itself.
  const cartLines = useMemo<BasketLine[]>(() => {
    if (!quoteReady || !quote) {
      return draft.lines.map((line) => livePrices.has(line.medicine.id) ? { ...line, medicine: { ...line.medicine, mrp: livePrices.get(line.medicine.id)! } } : line);
    }
    return quote.flatMap((line): BasketLine[] => {
      if (!line.available || !line.medicine_id) return [];
      const existing = draft.lines.find((item) => item.medicine.id === line.medicine_id);
      const price = Number(line.unit_price);
      const medicine: BasketLine['medicine'] = existing?.medicine || {
        id: line.medicine_id, code: null, medicine_name: line.item_name || line.prescribed_name, brand_name: null,
        generic_name: '', strength: '', strength_unit: '', dosage_form: '', mrp: price, requires_prescription: false,
        image_url: null, packaging_type: null, units_per_pack: null,
      };
      return [{ medicine: { ...medicine, mrp: Number.isFinite(price) ? price : medicine.mrp }, quantity: Math.max(1, Number(line.quantity) || 1) }];
    });
  }, [draft.lines, quote, quoteReady, livePrices]);

  const itemsTotal = cartLines.reduce((sum, line) => sum + Math.round(moneyNumber(line.medicine.mrp) * 100) * line.quantity, 0) / 100;
  // Basket items the pharmacist did not quote (e.g. no-prescription items): they won't be in this order.
  const notInQuote = quoteReady && quote && draft.requestId === activeRequest?.id
    ? draft.lines.filter((line) => !quote.some((row) => row.available && row.medicine_id === line.medicine.id))
    : [];
  // The prescription decides this order until a live quote exists, even if the basket has no Rx line.
  const openRequest = !!activeRequest && !activeRequest.order_id;
  const rxPending = (needsRx || openRequest) && !quoteReady;
  // Opened from Requests with nothing orderable yet: show the request, not a cart.
  const requestOnly = !!requestId && !quoteReady && (cartLines.length === 0 || (!!requestParam && draft.requestId !== requestParam));

  // The pharmacy's own minimum for home delivery, shown before the order is placed.
  const belowMinimum = fulfilment === 'DELIVERY' && !!delivery?.available && delivery.min_order != null && itemsTotal < delivery.min_order;
  const deliveryFee = fulfilment === 'DELIVERY' && delivery?.available
    ? (delivery.free_above != null && itemsTotal >= delivery.free_above ? 0 : delivery.fee)
    : 0;
  const estimatedTotal = itemsTotal + deliveryFee;
  const locked = (!!activeRequest && ['Requested', 'Accepted'].includes(activeRequest.status)) || (!activeRequest && !!draft.requestId);

  const changeParams = (next: URLSearchParams) => setParams(next);

  useEffect(() => {
    const t = term.trim();
    if (t.length < 2 || t === query) { setSuggestions([]); setSuggestFix(null); return; }
    let active = true;
    const handle = setTimeout(() => {
      suggestMedicinesApi(t)
        .then((r) => { if (active) { setSuggestions(r.items); setSuggestFix(r.did_you_mean); } })
        .catch(() => { if (active) { setSuggestions([]); setSuggestFix(null); } });
    }, 250);
    return () => { active = false; clearTimeout(handle); };
  }, [term, query]);

  // Cart: live prices at the chosen pharmacy, and other nearby pharmacies that have every item.
  const cartIds = draft.lines.map((l) => l.medicine.id).join(',');
  useEffect(() => {
    if (view !== 'cart' || !area || !cartIds || quoteReady) { setTogether(null); return; }
    let active = true;
    getPharmaciesWithAllApi(cartIds.split(','), { lat: area.lat, lng: area.lng, pincode: area.pincode, radius_km: 10 })
      .then((rows) => { if (active) setTogether(rows); })
      .catch(() => { if (active) setTogether(null); });
    return () => { active = false; };
  }, [view, area?.lat, area?.lng, area?.pincode, cartIds, quoteReady]);

  // Cart: stock at the chosen pharmacy, so problems show on the row before Place order (the server re-checks).
  useEffect(() => {
    if (view !== 'cart' || !draft.pharmacyId || !cartIds || quoteReady) { setStockHere(null); return; }
    let active = true;
    getPharmacyStockApi(draft.pharmacyId, cartIds.split(','))
      .then((map) => { if (active) setStockHere(map); })
      .catch(() => { if (active) setStockHere(null); });
    return () => { active = false; };
  }, [view, draft.pharmacyId, cartIds, quoteReady]);
  useEffect(() => { setReducedTo({}); }, [draft.pharmacyId]);
  // A quantity above the pharmacy's stock is cut down to that stock (out of stock lines stay for the patient to resolve).
  useEffect(() => {
    if (!stockHere || locked || quoteReady) return;
    const over = draft.lines.filter((l) => { const n = stockHere.get(l.medicine.id); return n != null && n > 0 && l.quantity > n; });
    if (!over.length) return;
    const ok = baskets.updateDraft({ ...draft, lines: draft.lines.map((l) => { const n = stockHere.get(l.medicine.id); return n != null && n > 0 && l.quantity > n ? { ...l, quantity: n } : l; }) });
    if (ok) setReducedTo((r) => ({ ...r, ...Object.fromEntries(over.map((l) => [l.medicine.id, stockHere.get(l.medicine.id)!])) }));
  }, [stockHere, draft, locked, quoteReady]);
  const stockOf = (id: string) => (!quoteReady && stockHere ? stockHere.get(id) : undefined);
  const overStock = cartLines.some((l) => { const n = stockOf(l.medicine.id); return n != null && l.quantity > n; });

  const goSearch = (keyword: string) => {
    setSuggestOpen(false);
    const next = new URLSearchParams(params);
    next.delete('medicine'); next.delete('view'); next.delete('request'); next.delete('pharmacyRequestId'); next.delete('page'); next.delete('all'); next.delete('deliver');
    if (keyword.trim()) next.set('q', keyword.trim()); else next.delete('q');
    changeParams(next);
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openMedicine = (id: string, deliver = false) => {
    const next = new URLSearchParams(params);
    next.delete('view'); next.delete('request'); next.delete('pharmacyRequestId');
    next.set('medicine', id);
    if (deliver) next.set('deliver', '1'); else next.delete('deliver');
    changeParams(next);
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const findNearbyDeliveryPharmacies = async () => {
    if (findingPharmacies) return;
    const medicine = draft.lines[0]?.medicine.id;
    if (!medicine) return;
    setFindingPharmacies(true);
    setActionError('');
    const pin = deliveryPin;
    try {
      if (validPin(pin)) {
        if (!manualMode && selectedAddress?.pin) {
          const places = [selectedAddress.addressLine2, selectedAddress.city]
            .filter((value, index, rows): value is string => !!value && rows.indexOf(value) === index);
          setSearchArea({
            ...selectedAddress.pin,
            pincode: pin,
            city: selectedAddress.city || undefined,
            label: [...places, pin].join(', '),
            source: 'manual',
            at: Date.now(),
          });
        } else {
          const place = (await findPlaces(pin))[0];
          if (place) setSearchArea({ ...place, pincode: pin, source: 'manual', at: Date.now() });
          else setActionError(`We couldn't find PIN ${pin} on the map. Showing pharmacies near your current location.`);
        }
      }
    } catch {
      if (validPin(pin)) setActionError(`We couldn't find PIN ${pin} on the map. Showing pharmacies near your current location.`);
    } finally {
      setFindingPharmacies(false);
      openMedicine(medicine, true);
    }
  };

  // Provider directory: names, addresses and distance for the pharmacy cards.
  useEffect(() => {
    let active = true;
    getProvidersApi('pharmacy').then((rows) => { if (active) setProviders(rows.filter((p) => p.partnerType === 'pharmacy' || p.serviceId === 'pharmacy' || !p.partnerType)); }).catch(() => { if (active) setProviders([]); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (view !== 'search') return;
    let active = true;
    getMyOrdersGroupedPageApi({ group: 'all', page: 1, page_size: 10 })
      .then((page) => { if (active) setRecent(page.items.slice(0, 3)); })
      .catch(() => { if (active) setRecent([]); });
    return () => { active = false; };
  }, [view]);

  // Nearby search: /medicines/near always needs the patient's coordinates.
  useEffect(() => {
    if (view !== 'search') { setResults(null); setCatalogue(null); setStocked(null); return; }
    const keyword = query.length >= 2 ? query : '';
    let active = true;
    setSearching(true); setSearchError('');
    if (pharmacyParam) {
      setResults(null); setCatalogue(null);
      getPharmacyCatalogueApi(pharmacyParam, keyword, Math.max(1, Number(params.get('page')) || 1))
        .then((page) => { if (active) setStocked(page); })
        .catch((error) => { if (active) { setSearchError(errorText(error, 'This pharmacy\'s medicines could not be loaded.')); setStocked(null); } })
        .finally(() => { if (active) setSearching(false); });
      return () => { active = false; };
    }
    setStocked(null);
    if (!area) {
      setResults(null);
      discoverMedicinesApi({ keyword, page: Math.max(1, Number(params.get('page')) || 1), page_size: 10, ...listFilters })
        .then((page) => { if (active) setCatalogue(page); })
        .catch((error) => { if (active) { setSearchError(errorText(error, 'Medicines could not be searched.')); setCatalogue(null); } })
        .finally(() => { if (active) setSearching(false); });
      return () => { active = false; };
    }
    setCatalogue(null);
    searchMedicinesNearApi({
      keyword, ...listFilters, lat: area.lat, lng: area.lng, pincode: area.pincode,
      radius_km: 10, page: Math.max(1, Number(params.get('page')) || 1), page_size: 10,
    })
      .then((page) => { if (active) setResults(page); })
      .catch((error) => { if (active) { setSearchError(errorText(error, 'Medicines could not be searched near you.')); setResults(null); } })
      .finally(() => { if (active) setSearching(false); });
    return () => { active = false; };
  }, [view, area?.lat, area?.lng, area?.pincode, query, params.get('page'), filterRx, filterDelivery, filterPrice, sortBy, retry, pharmacyParam]);

  // The catalogue has no "popular" flag; this is a real unfiltered slice of the nearby catalogue.
  useEffect(() => {
    if (view !== 'search') { setPopular([]); setPopularCatalogue([]); return; }
    let active = true;
    if (!area) {
      // No location yet: real catalogue medicines, shown without any availability claim.
      // One everyday medicine per common search (the first tablet/capsule found), not the
      // alphabetical start of the catalogue.
      setPopular([]);
      Promise.all(LANDING_PICKS.map((keyword) => discoverMedicinesApi({ keyword, page: 1, page_size: 10 })
        .then((page) => {
          // The plain single-ingredient tablet: shortest name wins (no combinations or odd strengths first).
          const solid = page.items.filter((m) => /tablet|capsule/i.test(String(m.dosage_form || '')) && !m.medicine_name.includes('+'));
          return [...solid].sort((a, b) => a.medicine_name.length - b.medicine_name.length)[0] || page.items[0] || null;
        })
        .catch(() => null)))
        .then((rows) => { if (active) setPopularCatalogue(rows.filter((m): m is CatalogueMedicine => !!m)); });
      return () => { active = false; };
    }
    setPopularCatalogue([]);
    searchMedicinesNearApi({ keyword: '', lat: area.lat, lng: area.lng, pincode: area.pincode, radius_km: 10, page: 1, page_size: 10 })
      .then((page) => { if (active) setPopular(page.items.slice(0, 4)); })
      .catch(() => { if (active) setPopular([]); });
    return () => { active = false; };
  }, [view, area?.lat, area?.lng, area?.pincode]);

  useEffect(() => {
    if (!medicineId) { setDetail(null); setNearRows([]); return; }
    let active = true;
    setDetailLoading(true); setDetailError(''); setDetail(null); setSelectedPharmacy(''); setQuantity(1);
    getMedicineDetailApi(medicineId)
      .then((row) => { if (active) setDetail({ ...row, mrp: moneyNumber(row.mrp) }); })
      .catch((error) => { if (active) setDetailError(errorText(error, 'This medicine could not be loaded.')); })
      .finally(() => { if (active) setDetailLoading(false); });
    return () => { active = false; };
  }, [medicineId]);

  useEffect(() => {
    if (!medicineId || !area) { setNearRows([]); return; }
    let active = true;
    setNearLoading(true);
    getMedicinePharmaciesNearApi(medicineId, { lat: area.lat, lng: area.lng, pincode: area.pincode, radius_km: 10 })
      .then((rows) => {
        if (!active) return;
        setNearRows(rows.items);
        setNearMeta((current) => ({ ...current, ...Object.fromEntries(rows.items.map((p) => [p.pharmacy_id, p])) }));
        setSelectedPharmacy((current) => current || rows.items.find((p) => p.in_stock)?.pharmacy_id || '');
      })
      .catch(() => { if (active) setNearRows([]); })
      .finally(() => { if (active) setNearLoading(false); });
    return () => { active = false; };
  }, [medicineId, area?.lat, area?.lng, area?.pincode]);

  // Addresses are only needed once the patient reaches the cart.
  useEffect(() => {
    if (view !== 'cart') return;
    let active = true;
    loadAddresses()
      .then((rows) => {
        if (!active) return;
        setAddresses(rows);
        setAddressId((current) => current || rows.find((a) => a.isDefault)?.addressId || rows[0]?.addressId || '');
      })
      .catch(() => { if (active) setAddresses([]); });
    return () => { active = false; };
  }, [view]);

  // Delivery fee, free-above threshold and PIN availability come from the server.
  useEffect(() => {
    if (view !== 'cart' || !pharmacyId) { setDelivery(null); return; }
    let active = true;
    setDeliveryLoading(true);
    getDeliveryOptionsApi(pharmacyId, effectivePin)
      .then((options) => {
        if (!active) return;
        setDelivery(options);
        if (!options.available) {
          setFulfilment((current) => { if (current === 'DELIVERY') { autoPickup.current = true; return 'PICKUP'; } return current; });
        } else if (autoPickup.current) {
          autoPickup.current = false;
          setFulfilment('DELIVERY');
        }
      })
      .catch(() => { if (active) setDelivery(null); })
      .finally(() => { if (active) setDeliveryLoading(false); });
    return () => { active = false; };
  }, [view, pharmacyId, effectivePin]);

  // Prescription choices for an Rx basket.
  useEffect(() => {
    if (view !== 'cart' || (!needsRx && !activeRequest?.prescription_id)) { setPrescriptions([]); return; }
    let active = true;
    setPrescriptionLoading(true);
    personPharmacyPrescriptions(subject)
      .then((rows) => {
        if (!active) return;
        setPrescriptions(rows);
        const rxLines = draft.lines.filter((line) => line.medicine.requires_prescription);
        const match = rows.find((p) => rxLines.every((line) => (p.medicines || []).some((m) => norm(m.name) === norm(line.medicine.medicine_name))));
        // Family lists carry no medicine names, so the patient picks: never guess a prescription for someone else.
        setPrescriptionId((current) => current || match?.id || (subject === 'self' ? rows[0]?.id : '') || '');
      })
      .catch(() => { if (active) setPrescriptions([]); })
      .finally(() => { if (active) setPrescriptionLoading(false); });
    return () => { active = false; };
  }, [view, needsRx, draft.lines.length, activeRequest?.prescription_id, subject]);

  useEffect(() => {
    if (view !== 'cart') return;
    let active = true;
    onlinePaymentConfig()
      .then((config) => {
        if (!active) return;
        const ready = config.provider === 'razorpay';
        setOnlineAvailable(ready);
        if (!ready) setPayMode('CASH');
      })
      .catch(() => { if (active) setOnlineAvailable(null); });
    return () => { active = false; };
  }, [view]);

  // Poll the request so the quote appears without a manual refresh.
  useEffect(() => {
    if (!requestId) { setActiveRequest(null); setRequestError(''); return; }
    let active = true;
    const tick = async () => {
      try {
        const rows = await getPharmacyRequestsApi();
        if (!active) return;
        const found = rows.find((r) => r.id === requestId) || null;
        setActiveRequest(found);
        setRequestError(found ? '' : 'This prescription request could not be found.');
      } catch (error) {
        if (active) setRequestError(errorText(error, 'Request status could not be refreshed.'));
      }
    };
    setRequestLoading(true);
    void tick().finally(() => { if (active) setRequestLoading(false); });
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void tick(); }, 8000);
    const focus = () => { void tick(); };
    window.addEventListener('focus', focus);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', focus); };
  }, [requestId, requestNonce]);

  // A request opened from My orders may not have a browser draft; rebuild the lines from its quote.
  useEffect(() => {
    if (!activeRequest || !baskets.draftReady) return;
    if (baskets.draft.requestId === activeRequest.id && baskets.draft.lines.length) return;
    if (baskets.draft.lines.length && !replaceBasket) return;
    const rows = quoteLines(activeRequest);
    if (!rows?.length) return;
    let active = true;
    Promise.all(rows.filter((line) => line.available && line.medicine_id).map(async (line) => {
      try {
        const item = await getMedicineDetailApi(line.medicine_id!);
        return {
          medicine: { ...item, mrp: Number.isFinite(Number(line.unit_price)) ? Number(line.unit_price) : moneyNumber(item.mrp) },
          quantity: Math.max(1, Number(line.quantity) || 1),
        } as BasketLine;
      } catch { return null; }
    })).then((built) => {
      if (!active || !built.length) return;
      baskets.updateDraft({
        lines: built.filter(Boolean) as BasketLine[],
        pharmacyId: activeRequest.pharmacy_partner_id,
        requestId: activeRequest.id,
        subject: 'self',
      });
    });
    return () => { active = false; };
  }, [activeRequest?.id, activeRequest?.quote_items, baskets.draftReady, replaceBasket]);

  // The choice survives moving between pages through the saved draft.
  useEffect(() => {
    if (!baskets.draftReady) return;
    const key = params.get('family_member_id');
    if (key === null) {
      if (draft.subject && draft.subject !== 'self' && !familyMemberId) setFamilyMemberId(draft.subject);
      return;
    }
    if (key !== (draft.subject || 'self') && (key === 'self' || subject === key)) baskets.updateDraft((current) => ({ ...current, subject: key }));
  }, [baskets.draftReady, params, draft.subject, familyMemberId, subject]);

  // Someone with family sees who the cart is for. A sent request already names its own patient.
  useEffect(() => {
    if (view !== 'cart' || requestId || !family.length || !baskets.draftReady || params.has('family_member_id')) return;
    const next = new URLSearchParams(params);
    next.set('family_member_id', draft.subject || 'self');
    setParams(next, { replace: true });
  }, [view, requestId, family.length, baskets.draftReady, params, draft.subject]);

  useEffect(() => { setPrescriptionId(''); }, [subject]);

  // Move the whole cart to a pharmacy that stocks every item, at that pharmacy's prices.
  const switchPharmacy = (target: PharmacyWithAll) => {
    if (!baskets.draftReady || locked) return;
    const price = new Map(target.prices.map((x) => [x.medicine_id, Number(x.price)]));
    const ok = baskets.updateDraft({
      ...draft,
      pharmacyId: target.pharmacy_id,
      lines: draft.lines.map((l) => ({ ...l, medicine: { ...l.medicine, mrp: price.get(l.medicine.id) ?? l.medicine.mrp } })),
    });
    if (!ok) { setActionError('Your basket could not be saved in this browser. Allow local storage and try again.'); return; }
    setNearMeta((current) => ({ ...current, [target.pharmacy_id]: { ...(current[target.pharmacy_id] || {}), pharmacy_id: target.pharmacy_id, name: target.name, address: target.address } as MedicineNearPharmacy }));
    setActionError('');
  };

  const postLine = (line: BasketLine, targetPharmacy: string) => {
    if (!baskets.draftReady) { setActionError('Your basket is still loading. Please try again.'); return; }
    const existing = draft.lines.find((item) => item.medicine.id === line.medicine.id);
    const lines = existing
      ? draft.lines.map((item) => item.medicine.id === line.medicine.id ? { ...item, quantity: Math.min(99, item.quantity + line.quantity) } : item)
      : [...draft.lines, line];
    const ok = baskets.updateDraft({
      ...draft, lines, pharmacyId: targetPharmacy,
      requestId: undefined, prescriptionId: undefined,
      subject,
    });
    if (!ok) { setActionError('Your basket could not be saved in this browser. Allow local storage and try again.'); return; }
    const next = new URLSearchParams(params);
    next.delete('medicine'); next.delete('q'); next.delete('page'); next.delete('request'); next.delete('pharmacyRequestId');
    next.set('view', 'cart');
    changeParams(next);
    setActionError('');
  };

  const addMedicine = (pharmacyId: string = selectedPharmacy) => {
    if (!detail) return;
    const pharmacy = nearRows.find((p) => p.pharmacy_id === pharmacyId && p.in_stock);
    if (!pharmacy) { setActionError('Choose a pharmacy that has this medicine in stock.'); return; }
    const line: BasketLine = {
      medicine: {
        id: detail.id, code: null, medicine_name: detail.medicine_name, brand_name: detail.brand_name,
        generic_name: detail.generic_name || '', strength: detail.strength || '', strength_unit: detail.strength_unit || '',
        dosage_form: detail.dosage_form || '', mrp: pharmacy.price ?? moneyNumber(detail.mrp), requires_prescription: detail.requires_prescription,
        image_url: detail.image_url ?? null, packaging_type: detail.packaging_type ?? null, units_per_pack: detail.units_per_pack ?? null,
        in_stock: true,
      },
      quantity,
    };
    if (draft.lines.length && draft.pharmacyId && draft.pharmacyId !== pharmacy.pharmacy_id) {
      setPendingAdd({ line, pharmacyId: pharmacy.pharmacy_id });
      return;
    }
    postLine(line, pharmacy.pharmacy_id);
  };

  const changeQuantity = (id: string, quantityValue: number) => {
    if (locked) return;
    const stock = stockOf(id);
    const nextQuantity = Math.max(1, Math.min(stock && stock > 0 ? stock : 99, 99, Math.floor(quantityValue) || 1));
    setReducedTo((r) => { if (!(id in r)) return r; const next = { ...r }; delete next[id]; return next; });
    baskets.updateDraft({ ...draft, lines: draft.lines.map((line) => line.medicine.id === id ? { ...line, quantity: nextQuantity } : line) });
  };

  const removeLine = (id: string) => {
    if (locked) return;
    const lines = draft.lines.filter((line) => line.medicine.id !== id);
    baskets.updateDraft({
      ...draft, lines,
      ...(lines.length ? {} : { pharmacyId: undefined, requestId: undefined, prescriptionId: undefined }),
    });
  };

  const uploadPrescription = async (file?: File) => {
    if (!file || uploading) return;
    const problem = prescriptionFileProblem(file);
    if (problem) { setActionError(problem); return; }
    setUploading(true); setActionError('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('doc_type', 'PRESCRIPTION');
      form.append('subject', subject);
      const document = await recordsApi.upload(form);
      baskets.updateDraft({ ...draft, documentId: document.id, documentName: document.file_name, documentSubject: subject, prescriptionSource: 'upload' });
      setRxSource('upload');
      if (view !== 'cart') setUploadSend({ open: true, pharmacyId: '', busy: false, error: '' });
    } catch (error) {
      setActionError(errorText(error, 'Prescription could not be uploaded.'));
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const sendUploadForQuote = async () => {
    if (!documentId || !uploadSend.pharmacyId) return;
    setUploadSend((u) => ({ ...u, busy: true, error: '' }));
    try {
      await createUploadedPharmacyRequestApi({ pharmacy_partner_id: uploadSend.pharmacyId, document_id: documentId, items: [], ...(forUserId != null ? { for_user_id: forUserId } : {}) });
      baskets.updateDraft({ ...draft, documentId: undefined, documentName: undefined, prescriptionSource: undefined });
      setUploadSend({ open: false, pharmacyId: '', busy: false, error: '' });
      navigate('/pharmacy-orders?tab=requests&sent=1');
    } catch (error) {
      setUploadSend((u) => ({ ...u, busy: false, error: errorText(error, 'The prescription could not be sent. Try again.') }));
    }
  };

  const sendRequest = async () => {
    if (!pharmacyId) { setActionError('Choose a pharmacy first.'); return; }
    const rxLines = draft.lines.filter((line) => line.medicine.requires_prescription);
    setSendingRequest(true); setPlaceError(''); setActionError('');
    try {
      let sent: PharmacyRequestItem;
      if (rxSource === 'upload') {
        if (!documentId) throw new Error('Upload your prescription first.');
        sent = await createUploadedPharmacyRequestApi({
          pharmacy_partner_id: pharmacyId,
          document_id: documentId,
          items: rxLines.map((line) => ({ medicine_id: line.medicine.id, name: line.medicine.medicine_name, quantity: line.quantity })),
          ...(forUserId != null ? { for_user_id: forUserId } : {}),
        });
      } else {
        if (!prescriptionId) throw new Error('Choose a doctor prescription for these medicines.');
        sent = await createPharmacyRequestApi(prescriptionId, pharmacyId, forUserId);
      }
      baskets.updateDraft({ ...draft, requestId: sent.id, prescriptionId: rxSource === 'vizito' ? prescriptionId : undefined });
      setActiveRequest(sent);
      const next = new URLSearchParams(params);
      next.set('view', 'cart'); next.set('request', sent.id);
      changeParams(next);
    } catch (error) {
      setPlaceError(errorText(error, 'Your prescription request could not be sent.'));
    } finally {
      setSendingRequest(false);
    }
  };

  const cancelRequest = async () => {
    if (!activeRequest) return;
    setSendingRequest(true); setPlaceError('');
    try {
      await cancelPharmacyRequestApi(activeRequest.id);
      baskets.updateDraft({ ...draft, requestId: undefined, prescriptionId: undefined });
      setActiveRequest(null);
      const next = new URLSearchParams(params);
      next.delete('request'); next.delete('pharmacyRequestId');
      next.set('view', 'cart');
      changeParams(next);
      setRequestNonce((n) => n + 1);
    } catch (error) {
      setPlaceError(errorText(error, 'The request could not be cancelled.'));
    } finally {
      setSendingRequest(false);
    }
  };

  const keepBasket = () => {
    const next = new URLSearchParams(params);
    next.delete('request'); next.delete('pharmacyRequestId'); next.delete('step'); next.set('view', 'cart');
    changeParams(next);
  };

  const startFresh = () => {
    baskets.updateDraft({ ...draft, requestId: undefined, prescriptionId: undefined });
    setActiveRequest(null);
    setRequestError('');
    const next = new URLSearchParams(params);
    next.delete('request'); next.delete('pharmacyRequestId'); next.set('view', 'cart');
    changeParams(next);
  };

  const placeOrder = async () => {
    if (!pharmacyId) { setPlaceError('Choose a pharmacy first.'); return; }
    if (quoteExpiredNow) { setPlaceError('This quote has expired. Cancel the request and send it again to get a fresh quote.'); return; }
    if (rxPending) { setPlaceError('The pharmacist must accept your prescription and send a quote before you can order.'); return; }
    if (overStock) { setPlaceError('Some items are not in stock at this pharmacy in that quantity. Fix the items marked above.'); return; }
    if (fulfilment === 'DELIVERY') {
      if (deliveryText.length < 8) { setPlaceError('Add the full delivery address.'); return; }
      if (!validPin(deliveryPin)) { setPlaceError('Add a valid 6-digit delivery PIN code.'); return; }
      if (deliveryLoading) { setPlaceError('Checking delivery availability. Please wait.'); return; }
      if (!delivery?.available) { setPlaceError(delivery?.reason || 'This pharmacy does not deliver to your address. Choose store pickup.'); return; }
    }
    setPlacing(true); setPlaceError(''); setActionError('');
    try {
      const items = cartLines.map((line) => ({ medicine_id: line.medicine.id, quantity: line.quantity }));
      const common = {
        fulfillment_type: fulfilment,
        payment_method: (payMode === 'CASH' ? 'CASH' : 'UPI') as 'CASH' | 'UPI',
        items,
        ...(fulfilment === 'DELIVERY' ? {
          delivery_address_id: manualMode ? undefined : selectedAddress?.addressId,
          delivery_address_text: deliveryText,
          delivery_pincode: deliveryPin,
        } : {}),
      };
      const order = quoteReady && activeRequest
        ? await createRxOrderApi({ ...common, pharmacy_request_id: activeRequest.id })
        : await createDirectOrderApi({ ...common, pharmacy_partner_id: pharmacyId });
      baskets.updateDraft({ lines: [], subject: 'self' });
      navigate(`/pharmacy-orders/${order.id}?placed=1${payMode === 'ONLINE' ? '&pay=1' : ''}`);
    } catch (error) {
      setPlaceError(errorText(error, 'Your order could not be placed. Please try again.'));
    } finally {
      setPlacing(false);
    }
  };

  const reorder = (order: PatientOrderV2) => {
    const lines = order.items.flatMap((item): BasketLine[] => {
      if (!item.medicine) return [];
      return [{
        medicine: {
          id: item.medicine.id, code: null, medicine_name: item.medicine.medicine_name, brand_name: null,
          generic_name: '', strength: item.medicine.strength || '', strength_unit: item.medicine.strength_unit || '',
          dosage_form: item.medicine.dosage_form || '', mrp: moneyNumber(item.medicine.mrp),
          requires_prescription: !!item.medicine.requires_prescription,
          image_url: item.medicine.image_url ?? null, packaging_type: item.medicine.packaging_type ?? null,
          units_per_pack: item.medicine.units_per_pack ?? null,
        },
        quantity: item.quantity,
      }];
    });
    if (!lines.length) { navigate(`/pharmacy-orders/${order.id}`); return; }
    if (!baskets.updateDraft({ lines, pharmacyId: order.pharmacy_partner_id, subject: 'self' })) {
      setActionError('Your basket could not be prepared. Please try again.');
      return;
    }
    navigate('/pharmacy-orders/new?view=cart');
  };

  const searchPage = (page: number) => {
    const next = new URLSearchParams(params);
    next.set('page', String(page));
    changeParams(next);
  };

  const popularKeywords = ['Paracetamol', 'Azithromycin', 'Cetirizine', 'Pantoprazole', 'Metformin', 'Amlodipine'];
  // Directory of pharmacies around the chosen area (pinned stores within 10 km, nearest first).
  // Without a location there is nothing meaningful to show, so the section is hidden.
  const nearbyPharmacies = useMemo(() => {
    if (!area) return [];
    const km = (p: ProviderItem) => p.storePin
      ? Math.hypot((p.storePin.lat - area.lat) * 111.32, (p.storePin.lng - area.lng) * 111.32 * Math.cos(area.lat * Math.PI / 180))
      : Infinity;
    return providers.filter((p) => p.partnerType === 'pharmacy' && km(p) <= 10).sort((a, b) => km(a) - km(b)).slice(0, 4);
  }, [providers, area?.lat, area?.lng]);

  const cartMini = (
    <aside className="ph2-card ph2-cart-mini" aria-label="Your cart">
      <div className="ph2-cart-mini-head">
        <h2><ShoppingCart />Your cart {draft.lines.length > 0 && `(${draft.lines.reduce((n, l) => n + l.quantity, 0)})`}</h2>
        {draft.lines.length > 0 && <button type="button" className="ph2-link" onClick={() => baskets.updateDraft({ lines: [], subject: 'self' })}>Clear all</button>}
      </div>
      {draft.lines.length === 0 ? (
        <div className="ph2-mini-empty"><ShoppingCart /><p>Your cart is empty. Search for a medicine to start.</p></div>
      ) : (
        <>
          <div className="ph2-mini-pharmacy"><Store />Items from {pharmacyName}</div>
          {draft.lines.slice(0, 3).map((line) => (
            <div className="ph2-mini-item" key={line.medicine.id}>
              <MediaImage kind="medicine" name={line.medicine.medicine_name} src={line.medicine.image_url} />
              <div>
                <b>{line.medicine.medicine_name}</b>
                <small>{packText(line.medicine) || 'Medicine'}</small>
              </div>
              <div className="ph2-mini-item-side">
                <strong>{money(moneyNumber(line.medicine.mrp) * line.quantity)}</strong>
                <span className="ph2-mini-qty">
                  <button type="button" aria-label={`Reduce ${line.medicine.medicine_name}`} disabled={locked} onClick={() => changeQuantity(line.medicine.id, line.quantity - 1)}><Minus /></button>
                  <span>{line.quantity}</span>
                  <button type="button" aria-label={`Add another ${line.medicine.medicine_name}`} disabled={locked || (stockOf(line.medicine.id) ?? Infinity) <= line.quantity} onClick={() => changeQuantity(line.medicine.id, line.quantity + 1)}><Plus /></button>
                </span>
              </div>
            </div>
          ))}
          {draft.lines.length > 3 && <p className="ph2-muted">+ {draft.lines.length - 3} more medicine{draft.lines.length - 3 === 1 ? '' : 's'}</p>}
          <div className="ph2-mini-total"><span>Item total</span><b>{money(itemsTotal)}</b></div>
          <Link className="ph2-btn ph2-btn--primary ph2-btn--block" to="/pharmacy-orders/new?view=cart">View cart &amp; checkout <ArrowRight /></Link>
          <p className="ph2-fee-note">Delivery fee is shown at checkout.</p>
        </>
      )}
    </aside>
  );

  // ---------- Medicine list (same pattern as Find Doctors / Find Hospitals) ----------
  const listRows: (MedicineNearResult | CatalogueMedicine)[] = pharmacyParam ? (stocked?.items || []) : area ? (results?.items || []) : (catalogue?.items || []);
  const listTotal = pharmacyParam ? (stocked?.total || 0) : area ? (results?.total || 0) : (catalogue?.total || 0);
  const listPage = area ? results : catalogue;
  const stockedPage = Math.max(1, Number(params.get('page')) || 1);
  const didYouMean = results?.did_you_mean || catalogue?.did_you_mean || null;
  const filtersOn = !!(filterRx || filterDelivery || filterPrice);
  const quickSearches = ['Paracetamol', 'Cetirizine', 'Pantoprazole', 'Azithromycin', 'Metformin', 'Amlodipine'];

  const medicineCard = (m: MedicineNearResult | CatalogueMedicine, state: 'near' | 'nolocation' | 'unavailable' | 'stocked') => {
    const near = state === 'near' && 'pharmacies_near' in m ? m : null;
    const mrp = moneyNumber(m.mrp);
    const price = near?.price_from != null
      ? (near.price_to != null && near.price_to > near.price_from ? `${money(near.price_from)} – ${money(near.price_to)}` : money(near.price_from))
      : mrp > 0 ? money(mrp) : 'Price on request';
    return (
      <article className="dj-card ph3-card" key={m.id}>
        <div className="dj-card-main ph3-identity">
          <MediaImage kind="medicine" name={m.medicine_name} src={'image_url' in m ? (m as any).image_url : null} />
          <div>
            <h3>{m.medicine_name}</h3>
            <p className="ph3-line">{[m.generic_name, strengthText(m)].filter(Boolean).join(' · ') || 'Medicine'}</p>
            {packText(m) && <p className="ph3-line">{packText(m)}{m.manufacturer ? ` · ${m.manufacturer}` : ''}</p>}
            {m.requires_prescription
              ? <span className="ph3-tag is-rx"><FileText />Prescription needed</span>
              : <span className="ph3-tag is-otc"><CheckCircle2 />No prescription needed</span>}
          </div>
        </div>
        <dl className="dj-fees">
          <div><dt>{near ? 'Price nearby' : 'MRP'}</dt><dd>{price}</dd></div>
          {near && <div><dt><Store />Pharmacies</dt><dd>{near.pharmacies_near} nearby</dd></div>}
          {near && <div><dt><Truck />Delivery</dt><dd>{near.home_delivery_available ? 'Available' : 'Pickup only'}</dd></div>}
        </dl>
        <div className="dj-card-next">
          {state === 'near' && <><small>Availability</small><strong className="ph3-ok">In stock nearby</strong>{near?.nearest?.distance_km != null && <span>Nearest {near.nearest.distance_km < 1 ? 'under 1 km' : `${near.nearest.distance_km} km`}</span>}</>}
          {state === 'stocked' && <><small>Availability</small><strong className="ph3-ok">In stock here</strong><span>{chosenPharmacyName}</span></>}
          {state === 'nolocation' && <><small>Availability</small><strong>Set your location</strong><span>to see pharmacies and prices</span></>}
          {state === 'unavailable' && <><small>Availability</small><strong className="ph3-bad">Not in stock nearby</strong><span>No pharmacy within 10 km</span></>}
        </div>
        <footer>
          <span />
          <button type="button" onClick={() => openMedicine(m.id)}>View details</button>
          {state === 'near'
            ? <button type="button" className="dj-primary" onClick={() => openMedicine(m.id)}>Choose pharmacy <ArrowRight /></button>
            : state === 'unavailable'
              ? <button type="button" className="dj-primary" disabled={uploading} onClick={() => fileInput.current?.click()}><Upload />Get a quote</button>
              : <button type="button" className="dj-primary" onClick={() => openMedicine(m.id)}>Check availability <ArrowRight /></button>}
        </footer>
      </article>
    );
  };

  const searchView = (
    <div className="dj ph3">
      <nav className="dj-breadcrumb"><Link to="/dashboard">Dashboard</Link><ChevronRight /><span>Pharmacy</span></nav>
      <BookingForChip family={family} value={member ? familyMemberId : ''} onChange={setFamilyMemberId} />
      <header className="dj-hero">
        <div>
          <h1>Order medicines from pharmacies near you</h1>
          <p>Find your medicine, compare nearby pharmacies by price and distance, then get it delivered or pick it up.</p>
          <LocationBar compact purpose="find pharmacies near you" />
          <div className="ph3-hero-actions">
            <button type="button" className="ph3-hero-btn" disabled={uploading} onClick={() => fileInput.current?.click()}><Upload />{uploading ? 'Uploading...' : 'Upload prescription'}</button>
            <Link className="ph3-hero-btn" to="/pharmacy-orders"><Package />My orders</Link>
          </div>
        </div>
        <img src="/images/healthcare/banners/pharmacy-hero.webp" alt="" />
        <aside>
          <p><ShieldCheck />Licensed pharmacies only</p>
          <p><Store />Each pharmacy's own price</p>
          <p><Check />Pharmacist checks prescriptions</p>
        </aside>
      </header>

      <form className="dj-search ph2-suggest-wrap" role="search" onSubmit={(event) => { event.preventDefault(); goSearch(term); }}>
        <Search />
        <input
          type="search" value={term} autoComplete="off"
          onChange={(event) => { setTerm(event.target.value); setSuggestOpen(true); }}
          onFocus={() => setSuggestOpen(true)}
          onBlur={() => setTimeout(() => setSuggestOpen(false), 150)}
          onKeyDown={(event) => { if (event.key === 'Escape') setSuggestOpen(false); }}
          placeholder="Search medicine by brand, generic name or composition (e.g. Dolo, paracetamol)"
          aria-label="Search medicines" role="combobox" aria-autocomplete="list" aria-controls="ph2-suggest"
          aria-expanded={suggestOpen && term.trim().length >= 2}
        />
        {suggestOpen && term.trim().length >= 2 && term.trim() !== query && (
          <div className="ph2-suggest" id="ph2-suggest" role="listbox">
            {suggestFix && <p className="ph2-suggest-fix">Showing matches for <b>{suggestFix}</b></p>}
            {suggestions.map((m) => (
              <button key={m.id} type="button" role="option" aria-selected={false} onMouseDown={(e) => e.preventDefault()} onClick={() => { setSuggestOpen(false); openMedicine(m.id); }}>
                <b>{m.medicine_name}</b>
                <small>{[m.generic_name, [m.strength, m.strength_unit].filter(Boolean).join(' '), m.dosage_form].filter(Boolean).join(' · ')}{m.requires_prescription ? ' · Prescription needed' : ''}</small>
              </button>
            ))}
            {!suggestions.length && <p className="ph2-suggest-fix">No medicine matches yet. Keep typing or search anyway.</p>}
            <button type="button" className="is-all" onMouseDown={(e) => e.preventDefault()} onClick={() => goSearch(term)}>See all results for &ldquo;{term.trim()}&rdquo;</button>
          </div>
        )}
      </form>

      <div className="dj-specialties" aria-label="Common medicines">
        <button type="button" aria-pressed={!query} onClick={() => goSearch('')}><Package />All medicines</button>
        {quickSearches.map((k) => <button type="button" key={k} aria-pressed={query.toLowerCase() === k.toLowerCase()} onClick={() => goSearch(k)}><Search />{k}</button>)}
      </div>

      {actionError && <p role="alert" className="ph2-error" style={{ marginBottom: 12 }}>{actionError}</p>}

      {pharmacyParam && (
        <p className="ph2-inline-info" style={{ marginBottom: 12 }}><Store />Showing what {chosenPharmacyName} stocks.{' '}
          <button type="button" className="ph2-link" onClick={() => { const next = new URLSearchParams(params); next.delete('pharmacy'); next.delete('page'); changeParams(next); }}>Search all nearby pharmacies</button>
        </p>
      )}

      <div className={`dj-layout${pharmacyParam ? ' ph3-one-pharmacy' : ''}`}>
        {!pharmacyParam && <aside className={`dj-filters${showFilters ? ' open' : ''}`}>
          <header><h2>Filters</h2><button type="button" onClick={() => setFilter({ rx: '', delivery: '', price: '' })}>Clear all</button></header>
          <label>Prescription
            <ThemedSelect aria-label="Prescription filter" value={filterRx} onChange={(e) => setFilter({ rx: e.target.value })}>
              <option value="">Any</option>
              <option value="otc">No prescription needed</option>
              <option value="rx">Prescription needed</option>
            </ThemedSelect>
          </label>
          <label>Price
            <ThemedSelect aria-label="Price filter" value={filterPrice} onChange={(e) => setFilter({ price: e.target.value })}>
              <option value="">Any price</option>
              <option value="50">Up to ₹50</option>
              <option value="200">₹51 – ₹200</option>
              <option value="above">Above ₹200</option>
            </ThemedSelect>
          </label>
          <label>Delivery
            <ThemedSelect aria-label="Delivery filter" value={filterDelivery} disabled={!area} onChange={(e) => setFilter({ delivery: e.target.value })}>
              <option value="">Delivery or pickup</option>
              <option value="1">Home delivery available</option>
            </ThemedSelect>
            {!area && <small className="ph3-hint">Set your location to filter by delivery.</small>}
          </label>
        </aside>}

        <section aria-label="Medicine results">
          <div className="dj-result-heading">
            <div>
              <h2>{searching ? 'Searching…' : `${listTotal} ${listTotal === 1 ? 'medicine' : 'medicines'} ${pharmacyParam ? `in stock at ${chosenPharmacyName}` : area ? 'in stock near you' : 'found'}`}</h2>
              <p>{pharmacyParam ? `Open a medicine to see this pharmacy's price${query ? ` · results for “${query}”` : ''}.` : area ? `Pharmacies within 10 km of ${area.label}${query ? ` · results for “${didYouMean || query}”` : ''}`
                : `From the Vizito catalogue${query ? ` · results for “${didYouMean || query}”` : ''}. Set your location to see which pharmacies have them.`}</p>
            </div>
            {!pharmacyParam && <div className="dj-tools">
              <button type="button" className="dj-filter-toggle" aria-expanded={showFilters} onClick={() => setShowFilters((v) => !v)}>Filters{filtersOn ? ' •' : ''}</button>
              <label>Sort by
                <ThemedSelect variant="menu" aria-label="Sort medicines" value={sortBy} onChange={(e) => setFilter({ sort: e.target.value })}>
                  <option value="relevance">Relevance</option>
                  <option value="price">Price: low to high</option>
                  <option value="name">Name: A to Z</option>
                </ThemedSelect>
              </label>
            </div>}
          </div>
          {didYouMean && <p className="ph2-inline-info" style={{ marginBottom: 12 }}><Info />No exact match for “{query}”. Showing results for <b>“{didYouMean}”</b>.</p>}

          {searching ? (
            <div className="dj-state" role="status" aria-busy="true">Loading medicines…</div>
          ) : searchError ? (
            <div className="dj-state" role="alert"><h2>Unable to load medicines</h2><p>{searchError}</p><button type="button" onClick={() => setRetry((n) => n + 1)}>Retry</button></div>
          ) : listRows.length ? (
            <>
              <div className="dj-cards">{listRows.map((m) => medicineCard(m, pharmacyParam ? 'stocked' : area ? 'near' : 'nolocation'))}</div>
              {pharmacyParam
                ? listTotal > 24 && <div className="ph2-dialog-actions" style={{ marginTop: 12 }}><button type="button" className="ph2-btn ph2-btn--ghost ph2-btn--sm" disabled={stockedPage <= 1} onClick={() => searchPage(stockedPage - 1)}>Previous</button><span className="ph2-muted">Page {stockedPage} of {Math.ceil(listTotal / 24)}</span><button type="button" className="ph2-btn ph2-btn--ghost ph2-btn--sm" disabled={stockedPage >= Math.ceil(listTotal / 24)} onClick={() => searchPage(stockedPage + 1)}>Next</button></div>
                : listPage && listPage.total_pages > 1 && <VizitoPagination page={listPage.page} pageSize={10} total={listPage.total} onPageChange={searchPage} onPageSizeChange={() => undefined} label="medicines" />}
            </>
          ) : (
            <div className="dj-state">
              <Package />
              <h2>{pharmacyParam ? (query ? `${chosenPharmacyName} doesn't have “${query}” in stock` : `${chosenPharmacyName} has no medicines listed yet`) : area ? (query ? `No pharmacy near you has “${didYouMean || query}” in stock` : 'No medicines in stock near you yet') : 'No medicines found'}</h2>
              <p>{pharmacyParam ? 'Search all nearby pharmacies instead.' : filtersOn ? 'Try clearing your filters.' : area ? 'Upload your prescription and send it to a nearby pharmacy for a quote, or try another area.' : 'Check the spelling, or search by the generic name printed on the strip (e.g. paracetamol).'}</p>
              {pharmacyParam ? null : filtersOn ? <button type="button" onClick={() => setFilter({ rx: '', delivery: '', price: '' })}>Clear filters</button>
                : area ? <button type="button" disabled={uploading} onClick={() => fileInput.current?.click()}>Upload prescription</button> : null}
            </div>
          )}

          {area && !pharmacyParam && !searching && !searchError && !!results?.unavailable_nearby.length && (
            <div className="ph3-unavailable">
              <h2>Also matches, but not in stock near you</h2>
              <p>These are in the Vizito catalogue. No pharmacy within 10 km has them today.</p>
              <div className="dj-cards">{results.unavailable_nearby.map((m) => medicineCard(m, 'unavailable'))}</div>
            </div>
          )}
        </section>
      </div>

      {draft.lines.length > 0 && (
        <Link className="ph2-cart-bar ph3-cart-bar" to="/pharmacy-orders/new?view=cart">
          <ShoppingCart /><span>{draft.lines.reduce((n, l) => n + l.quantity, 0)} item{draft.lines.reduce((n, l) => n + l.quantity, 0) === 1 ? '' : 's'} in cart · {money(itemsTotal)} · {pharmacyName}</span><b>View cart <ArrowRight /></b>
        </Link>
      )}
    </div>
  );

  // ---------- Medicine details: what it is, then one clear step — pick a pharmacy and add ----------
  const detailState: 'nolocation' | 'loading' | 'none' | 'available' = !area ? 'nolocation' : nearLoading ? 'loading' : nearRows.some((p) => p.in_stock) ? 'available' : 'none';
  const deliveringPharmacies = nearRows.filter((p) => p.in_stock && p.home_delivery).length;
  const addFrom = (pharmacyId: string) => { setSelectedPharmacy(pharmacyId); addMedicine(pharmacyId); };

  const medicineView = (
    <div className="dj ph3">
      <nav className="dj-breadcrumb">
        <Link to="/dashboard">Dashboard</Link><ChevronRight />
        <button type="button" onClick={() => goSearch(query)}>Pharmacy</button><ChevronRight />
        <span>{detail?.medicine_name || 'Medicine'}</span>
      </nav>
      {actionError && <p role="alert" className="ph2-error" style={{ marginBottom: 12 }}>{actionError}</p>}
      {detailLoading ? (
        <div className="dj-state" role="status" aria-busy="true">Loading medicine details…</div>
      ) : detailError ? (
        <div className="dj-state" role="alert"><h2>Medicine unavailable</h2><p>{detailError}</p><button type="button" onClick={() => goSearch(query)}>Back to medicines</button></div>
      ) : detail ? (
        <div className="ph3-detail">
          <section className="ph3-panel ph3-med-head">
            <MediaImage kind="medicine" name={detail.medicine_name} src={detail.image_url} />
            <div>
              <h1>{detail.medicine_name}</h1>
              <p className="ph3-line">{[detail.generic_name, strengthText(detail)].filter(Boolean).join(' · ') || 'Medicine'}</p>
              <p className="ph3-line">{[packText(detail), detail.manufacturer].filter(Boolean).join(' · ')}</p>
              {detail.requires_prescription
                ? <span className="ph3-tag is-rx"><FileText />Prescription needed — the pharmacist checks it before your order</span>
                : <span className="ph3-tag is-otc"><CheckCircle2 />No prescription needed</span>}
              {detail.composition && <p className="ph3-line"><b>Composition:</b> {detail.composition}</p>}
            </div>
            <div className="ph3-qty">
              <small>Quantity ({detail.packaging_type || 'pack'}s)</small>
              <div className="ph2-qty" aria-label="Quantity">
                <button type="button" aria-label="Reduce quantity" disabled={quantity <= 1} onClick={() => setQuantity((n) => Math.max(1, n - 1))}><Minus /></button>
                <input aria-label="Medicine quantity" type="number" min={1} max={99} value={quantity} onChange={(event) => setQuantity(Math.max(1, Math.min(99, Number(event.target.value) || 1)))} />
                <button type="button" aria-label="Increase quantity" disabled={quantity >= 99} onClick={() => setQuantity((n) => Math.min(99, n + 1))}><Plus /></button>
              </div>
            </div>
          </section>

          <section className="ph3-panel" aria-label="Choose a pharmacy">
            <div className="dj-result-heading">
              <div>
                <h2>Choose a pharmacy</h2>
                <p>{deliverySearch && area?.pincode && detailState === 'available'
                  ? deliveringPharmacies > 0
                    ? `${deliveringPharmacies} of these deliver to PIN ${area.pincode}.`
                    : `None of these deliver to PIN ${area.pincode}. You can still collect from a store.`
                  : detailState === 'available' ? `${nearRows.filter((p) => p.in_stock).length} ${nearRows.filter((p) => p.in_stock).length === 1 ? 'pharmacy has' : 'pharmacies have'} this in stock within 10 km. Prices are each pharmacy's own MRP.`
                  : detailState === 'nolocation' ? 'Set your location to see which pharmacies have this medicine.'
                    : detailState === 'loading' ? 'Checking nearby pharmacies…' : 'No pharmacy within 10 km has this medicine in stock.'}</p>
              </div>
              {detailState === 'available' && nearRows.length > 1 && (
                <div className="dj-tools">
                  <label>Sort by
                    <ThemedSelect variant="menu" aria-label="Sort pharmacies" value={nearSort} onChange={(e) => setNearSort(e.target.value as 'nearest' | 'price')}>
                      <option value="nearest">Nearest</option>
                      <option value="price">Lowest price</option>
                    </ThemedSelect>
                  </label>
                </div>
              )}
            </div>

            {detailState === 'nolocation' ? (
              <div className="dj-state"><MapPin /><h2>Where should we look?</h2><p>Choose your area to see nearby pharmacies, their price and delivery.</p><LocationBar compact purpose="find this medicine nearby" /></div>
            ) : detailState === 'loading' ? (
              <div className="dj-state" role="status" aria-busy="true">Checking nearby pharmacies…</div>
            ) : detailState === 'none' ? (
              <div className="dj-state"><Store /><h2>Not in stock near you</h2><p>Upload your prescription and send it to a nearby pharmacy for a quote. You can also try another area.</p><button type="button" disabled={uploading} onClick={() => fileInput.current?.click()}>Upload prescription</button></div>
            ) : (
              <div className="ph3-pharmacies">
                {pharmacyParam && !nearRows.some((p) => p.pharmacy_id === pharmacyParam && p.in_stock) && <p className="ph2-inline-info is-warn"><AlertTriangle />{chosenPharmacyName} isn't listed here: it may be more than 10 km from your location or out of stock. These pharmacies have it.</p>}
                {sortedNear.filter((p) => p.in_stock).map((p) => {
                  const unit = p.price ?? (moneyNumber(detail.mrp) > 0 ? moneyNumber(detail.mrp) : null);
                  return (
                    <article className="ph3-pharmacy" key={p.pharmacy_id}>
                      <MediaImage kind="business" businessType="pharmacy" name={p.name} src={p.logo_url} />
                      <div className="ph3-pharmacy-info">
                        <h3>{p.name}
                          {p.pharmacy_id === pharmacyParam && <span className="ph3-badge is-green">Your chosen pharmacy</span>}
                          {p.tags.includes('nearest') && <span className="ph3-badge">Nearest</span>}
                          {p.tags.includes('lowest_price') && <span className="ph3-badge is-green">Lowest price</span>}
                        </h3>
                        <p className="ph3-line"><MapPin />{p.distance_km != null ? `${p.distance_km < 1 ? 'Under 1 km' : `${p.distance_km} km`} away · ` : ''}{p.address || 'Address not provided'}</p>
                        <p className="ph3-line">
                          {p.home_delivery ? <><Truck />Home delivery{p.delivery_fee != null ? (p.delivery_fee > 0 ? ` ${money(p.delivery_fee)}` : ' free') : ''}</> : <><Store />Store pickup only</>}
                          {p.available_qty != null && p.available_qty <= 10 && <span className="ph3-low"> · Only {p.available_qty} left</span>}
                        </p>
                      </div>
                      <div className="ph3-pharmacy-buy">
                        <b>{unit != null ? money(unit) : 'Price on request'}</b>
                        <small>{unit != null ? `per ${detail.packaging_type?.toLowerCase() || 'pack'}${quantity > 1 ? ` · ${money(unit * quantity)} for ${quantity}` : ''}` : 'Ask for a quote'}</small>
                        {unit != null
                          ? <button type="button" className="dj-primary" disabled={!baskets.draftReady} onClick={() => addFrom(p.pharmacy_id)}><ShoppingCart />Add to cart</button>
                          : <button type="button" className="dj-outline" disabled={uploading} onClick={() => fileInput.current?.click()}>Get a quote</button>}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="ph3-panel ph3-info">
            <h2>About this medicine</h2>
            <dl>
              <div><dt><Info />Use</dt><dd>{detail.description || 'Ask the pharmacist or your doctor how to take this medicine.'}</dd></div>
              <div><dt><Package />Storage</dt><dd>{detail.storage_condition || 'Store as printed on the pack.'}</dd></div>
              <div><dt><FileText />Prescription</dt><dd>{detail.requires_prescription ? 'Needed. Attach it in the cart; the pharmacist reviews it and confirms your order.' : 'Not needed. If you are pregnant, breastfeeding or have a medical condition, ask a pharmacist first.'}</dd></div>
              <div><dt><ShieldCheck />Sold by</dt><dd>Licensed pharmacies on Vizito. Each sets its price from the MRP on its own stock.</dd></div>
            </dl>
          </section>
        </div>
      ) : null}

      {draft.lines.length > 0 && (
        <Link className="ph2-cart-bar ph3-cart-bar" to="/pharmacy-orders/new?view=cart">
          <ShoppingCart /><span>{draft.lines.reduce((n, l) => n + l.quantity, 0)} item{draft.lines.reduce((n, l) => n + l.quantity, 0) === 1 ? '' : 's'} in cart · {money(itemsTotal)} · {pharmacyName}</span><b>View cart <ArrowRight /></b>
        </Link>
      )}
    </div>
  );

  const rxPanel = (() => {
    if (!needsRx && !activeRequest) return null;
    if (activeRequest) {
      const status = activeRequest.status;
      const lines = quote;
      const expired = quoteExpired(activeRequest);
      const requested = requestedMedicines(activeRequest).map((item) => item.name);
      const sentMedicines = requested.length ? requested : (prescriptions.find((p) => p.id === activeRequest.prescription_id)?.medicines || []).map((m) => m.name).filter(Boolean);
      return (
        <section className="ph2-request" aria-label="Prescription request">
          <div className="ph2-request-head">
            <span className={status === 'Accepted' ? 'is-ok' : status === 'Rejected' || status === 'Cancelled' || status === 'Expired' ? 'is-bad' : ''}>
              {status === 'Accepted' ? <CheckCircle2 /> : status === 'Rejected' || status === 'Cancelled' || status === 'Expired' ? <AlertTriangle /> : <Clock />}
            </span>
            <div>
              <h2>{activeRequest.order_id && status === 'Accepted' ? 'Order already created' : status === 'Requested' ? 'Waiting for pharmacist review' : status === 'Accepted' ? (expired && activeRequest.quote_items ? 'Quote expired' : 'Pharmacist accepted your prescription') : status === 'Rejected' ? 'Prescription not accepted' : `Request ${status.toLowerCase()}`}</h2>
              <p>
                {activeRequest.order_id ? 'This prescription request has already become an order.'
                  : status === 'Requested' ? 'The pharmacy is checking your prescription and stock. This page refreshes automatically.'
                    : status === 'Accepted' && !activeRequest.quote_items ? 'The pharmacist accepted the request and is preparing a quote.'
                      : status === 'Accepted' && expired ? 'The pharmacist’s price is no longer valid, so this quote can’t be ordered.'
                      : status === 'Accepted' ? 'Review the pharmacist’s quote, then place your order.'
                        : activeRequest.reject_reason || 'You can start a new request with another prescription or pharmacy.'}
              </p>
            </div>
          </div>
          {activeRequest.order_id && <Link className="ph2-btn ph2-btn--primary ph2-btn--sm" to={`/pharmacy-orders/${activeRequest.order_id}`}>View order <ChevronRight /></Link>}
          {beneficiaryLabel(activeRequest) && <p className="ph2-muted" style={{ marginTop: 8 }}>{beneficiaryLabel(activeRequest)}</p>}
          {!activeRequest.quote_items && sentMedicines.length > 0 && <p className="ph2-muted" style={{ marginTop: 8 }}>Medicines on this prescription: {sentMedicines.join(', ')}</p>}
          {status === 'Accepted' && !activeRequest.quote_items && !activeRequest.order_id && <p className="ph2-muted" style={{ marginTop: 8 }}>Nothing to do yet. You’ll get a notification when the price is ready.</p>}
          {status === 'Accepted' && activeRequest.quote_items && (
            <>
              {lines === null ? <p className="ph2-error">Quote details could not be read. Refresh before ordering.</p> : (
                <div className="ph2-request-lines">
                  {lines.map((line, index) => (
                    <div className="ph2-request-line" key={`${line.medicine_id || line.prescribed_name}-${index}`}>
                      <span>{line.available ? (line.item_name || line.prescribed_name) : <><s>{line.prescribed_name}</s> — not available</>}{line.available && line.quantity ? ` × ${line.quantity}` : ''}{line.note ? <em> · {line.note}</em> : null}</span>
                      <span>{line.available ? money(line.amount) : '—'}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="ph2-request-foot">
                <div><b>{money(activeRequest.quote_total)}</b><small>{expired ? 'Quote expired' : activeRequest.quote_valid_until ? `Valid until ${new Date(activeRequest.quote_valid_until).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' })}` : 'Quoted total'}</small></div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" className="ph2-btn ph2-btn--ghost ph2-btn--sm" disabled={sendingRequest} onClick={() => setRequestNonce((n) => n + 1)}>Refresh</button>
                  <button type="button" className="ph2-btn ph2-btn--danger ph2-btn--sm" disabled={sendingRequest} onClick={() => void cancelRequest()}>Cancel request</button>
                </div>
              </div>
              {expired && <p className="ph2-warn" style={{ marginTop: 10 }}>This quote has expired. Cancel the request and send it again to get a fresh quote.</p>}
            </>
          )}
          {status === 'Requested' && (
            <div className="ph2-request-foot">
              <small>Request #{activeRequest.id.slice(0, 8).toUpperCase()}</small>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="ph2-btn ph2-btn--ghost ph2-btn--sm" disabled={sendingRequest} onClick={() => setRequestNonce((n) => n + 1)}>Refresh</button>
                <button type="button" className="ph2-btn ph2-btn--danger ph2-btn--sm" disabled={sendingRequest} onClick={() => void cancelRequest()}>Cancel request</button>
              </div>
            </div>
          )}
          {(status === 'Rejected' || status === 'Cancelled' || status === 'Expired') && (
            <div className="ph2-request-foot">
              <small>Request #{activeRequest.id.slice(0, 8).toUpperCase()}</small>
              <button type="button" className="ph2-btn ph2-btn--primary ph2-btn--sm" onClick={startFresh}>Start a new request</button>
            </div>
          )}
          {requestError && <p className="ph2-error" style={{ marginTop: 10 }}>{requestError}</p>}
          {placeError && <p className="ph2-error" style={{ marginTop: 10 }}>{placeError}</p>}
        </section>
      );
    }
    return (
      <section className="ph2-request" aria-label="Attach a prescription">
        <div className="ph2-request-head">
          <span><FileText /></span>
          <div><h2>Prescription required</h2><p>Send your prescription to {pharmacyName} for review. You can place the order after the pharmacist accepts it and sends a quote.</p></div>
        </div>
        <div className="ph2-rx-source" role="group" aria-label="Prescription source">
          <button type="button" aria-pressed={rxSource === 'vizito'} onClick={() => setRxSource('vizito')} disabled={sendingRequest}>Use a Vizito prescription</button>
          <button type="button" aria-pressed={rxSource === 'upload'} onClick={() => setRxSource('upload')} disabled={sendingRequest}>Upload prescription</button>
        </div>
        {rxSource === 'vizito' ? (
          <div style={{ marginTop: 10 }}>
            {prescriptionLoading ? <p role="status" className="ph2-muted">Loading your prescriptions...</p> : prescriptions.length ? (
              <label className="ph2-field">
                <span>Choose a doctor prescription</span>
                <ThemedSelect aria-label="Doctor prescription" value={prescriptionId} disabled={sendingRequest} onChange={(event) => setPrescriptionId(event.target.value)}>
                  <option value="">Select a prescription</option>
                  {prescriptions.map((prescription) => (
                    <option key={prescription.id} value={prescription.id} disabled={prescription.pharmacy_status === 'Dispensed'}>
                      {[prescription.prescription_number, prescription.doctor?.name, prescription.date?.slice(0, 10)].filter(Boolean).join(' · ')}{prescription.pharmacy_status === 'Dispensed' ? ' · already dispensed' : ''}
                    </option>
                  ))}
                </ThemedSelect>
              </label>
            ) : (
              <p className="ph2-muted">No Vizito prescriptions with medicines were found. Upload a prescription instead.</p>
            )}
            {prescriptionId && prescriptions.find((p) => p.id === prescriptionId)?.medicines?.length ? (
              <p className="ph2-muted" style={{ marginTop: 6 }}>
                Listed: {prescriptions.find((p) => p.id === prescriptionId)!.medicines!.map((m) => m.name).filter(Boolean).join(', ')}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="ph2-upload" style={{ marginTop: 10 }}>
            <input ref={fileInput} type="file" accept="application/pdf,image/jpeg,image/png" aria-label="Prescription file" disabled={uploading || sendingRequest} onChange={(event) => void uploadPrescription(event.target.files?.[0])} />
            <small>Photo (JPG/PNG) or PDF, up to 10 MB. The file is stored in your medical records.</small>
            {documentId && <span className="ph2-chip ph2-chip--green"><FileText />{draft.documentName || 'Prescription uploaded'}</span>}
            {uploading && <p role="status" className="ph2-muted">Uploading prescription...</p>}
          </div>
        )}
        <div className="ph2-request-foot">
          <small>No payment is taken until you confirm the order.</small>
          <button
            type="button"
            className="ph2-btn ph2-btn--primary ph2-btn--sm"
            disabled={sendingRequest || uploading || (rxSource === 'vizito' ? !prescriptionId : !documentId)}
            onClick={() => void sendRequest()}
          >
            {sendingRequest ? 'Sending...' : 'Send to pharmacist'}<ArrowRight />
          </button>
        </div>
        {placeError && <p className="ph2-error" style={{ marginTop: 10 }}>{placeError}</p>}
      </section>
    );
  })();

  const cartView = (
    <>
      <nav className="ph2-crumbs" aria-label="Breadcrumb">
        <Link to="/pharmacy-orders/new">Pharmacy</Link><ChevronRight /><b>{requestOnly ? 'Prescription request' : 'Your cart'}</b>
      </nav>
      <div className="ph2-head">
        <div>
          <h1>{requestOnly ? 'Prescription request' : 'Your cart'}</h1>
          <p className="ph2-sub">{requestOnly ? (activeRequest ? `Sent to ${pharmacyName}` : 'Checking your request') : `Items from ${pharmacyName}`}</p>
        </div>
        <Link className="ph2-back" to="/pharmacy-orders"><ArrowLeft />Back to pharmacy</Link>
      </div>
      {!requestId && <BookingForChip family={family} value={member ? familyMemberId : ''} onChange={setFamilyMemberId} />}
      {familyError && params.has('family_member_id') && <p role="alert" className="ph2-error" style={{ marginBottom: 12 }}>{familyError}</p>}
      {member && !requestId && !needsRx && cartLines.length > 0 && <p className="ph2-inline-info is-warn" style={{ marginBottom: 12 }}><AlertTriangle />Medicines without a prescription are saved on your own account for now, not under {member.name}.</p>}
      {actionError && <p role="alert" className="ph2-error" style={{ marginBottom: 12 }}>{actionError}</p>}
      {requestOnly ? (
        <div className="ph2-request-only">
          {activeRequest ? rxPanel
            : requestLoading ? <div className="ph2-card"><p role="status" className="ph2-muted">Loading your request...</p></div>
              : <div className="ph2-empty" role="alert"><AlertTriangle /><h3>This request could not be loaded</h3><p>{requestError || 'Please try again.'}</p><button type="button" className="ph2-btn ph2-btn--ghost" onClick={() => setRequestNonce((n) => n + 1)}>Try again</button></div>}
          <Link className="ph2-link" to="/pharmacy-orders?tab=requests">All prescription requests <ChevronRight /></Link>
        </div>
      ) : cartLines.length === 0 ? (
        <div className="ph2-empty"><ShoppingCart /><h3>Your cart is empty</h3><p>Search for a medicine and choose a nearby pharmacy to start your order.</p><Link className="ph2-btn ph2-btn--primary" to="/pharmacy-orders/new">Browse medicines</Link></div>
      ) : (
        <div className="ph2-cart-grid">
          <div className="ph2-cart-main">
            <section className="ph2-card">
              <div className="ph2-pharmacy-head">
                <MediaImage kind="business" businessType="pharmacy" name={pharmacyName} src={provider?.logo || nearPharmacy?.logo_url} />
                <div>
                  <h2>{pharmacyName}</h2>
                  <p>{[pharmacyAddress, pharmacyDistanceText].filter(Boolean).join(' · ') || 'Pharmacy details not provided'}</p>
                </div>
                <button type="button" className="ph2-btn ph2-btn--ghost ph2-btn--sm" disabled={locked} onClick={() => openMedicine(draft.lines[0]?.medicine.id || '')}>Change pharmacy</button>
              </div>
              <table className="ph2-cart-table">
                <thead><tr><th>Item</th><th>Price</th><th>Quantity</th><th>Total</th></tr></thead>
                <tbody>
                  {cartLines.map((line) => { const stock = stockOf(line.medicine.id), out = stock === 0, dim = out ? { opacity: 0.5 } : undefined; return (
                    <tr key={line.medicine.id}>
                      <td>
                        <div className="ph2-cart-med">
                          <MediaImage kind="medicine" name={line.medicine.medicine_name} src={line.medicine.image_url} />
                          <div>
                            <b style={dim}>{line.medicine.medicine_name}</b>
                            <small style={dim}>{packText(line.medicine) || 'Medicine'}</small>
                            {stock != null && !locked && (out
                              ? <small><span className="ph3-low">Out of stock at this pharmacy</span></small>
                              : reducedTo[line.medicine.id] === stock && line.quantity === stock
                                ? <small><span className="ph3-low">Reduced to {stock}, the available stock</span></small>
                                : (stock <= 10 || line.quantity >= stock) && <small><span className="ph3-low">Only {stock} left</span></small>)}
                            {quoteReady
                              ? <span className="ph2-chip ph2-chip--rx"><FileText />In pharmacist’s quote</span>
                              : line.medicine.requires_prescription
                                ? <span className="ph2-chip ph2-chip--rx"><FileText />Prescription required</span>
                                : <span className="ph2-chip ph2-chip--otc">No prescription needed</span>}
                            {(() => { const row = quoteReady ? quote?.find((q) => q.available && q.medicine_id === line.medicine.id) : null; return row && differentProduct(row) ? <small>Replaces {row.prescribed_name}</small> : null; })()}
                          </div>
                        </div>
                      </td>
                      <td><span className="ph2-cart-price" style={dim}>{money(line.medicine.mrp)}</span></td>
                      <td>
                        <span className="ph2-mini-qty" style={dim}>
                          <button type="button" aria-label={`Reduce ${line.medicine.medicine_name}`} disabled={locked || out} onClick={() => changeQuantity(line.medicine.id, line.quantity - 1)}><Minus /></button>
                          <span>{line.quantity}</span>
                          <button type="button" aria-label={`Add another ${line.medicine.medicine_name}`} disabled={locked || (stock != null && line.quantity >= stock)} onClick={() => changeQuantity(line.medicine.id, line.quantity + 1)}><Plus /></button>
                        </span>
                      </td>
                      <td>
                        <span className="ph2-cart-line-total" style={dim}>{money(moneyNumber(line.medicine.mrp) * line.quantity)}</span>
                        <button type="button" className="ph2-cart-remove" disabled={locked} onClick={() => removeLine(line.medicine.id)}><Trash2 />Remove</button>
                        {out && !locked && <button type="button" className="ph2-link" onClick={() => openMedicine(line.medicine.id)}>Find another pharmacy</button>}
                      </td>
                    </tr>
                  ); })}
                </tbody>
              </table>
              {locked && <p className="ph2-inline-info"><Info />{quoteReady ? 'These are the medicines and prices in the pharmacist’s quote. To change them, cancel the request and send it again.' : 'Your prescription is with the pharmacist. Items are locked until they reply with a quote.'}</p>}
              {notInQuote.length > 0 && <p className="ph2-inline-info is-warn"><AlertTriangle />Not in this quote, so not in this order: {notInQuote.map((line) => line.medicine.medicine_name).join(', ')}. Order {notInQuote.length === 1 ? 'it' : 'them'} separately after this order.</p>}
              {together && !locked && !together.some((p) => p.pharmacy_id === draft.pharmacyId) && (
                <p className="ph2-inline-info is-warn"><AlertTriangle />{pharmacyName} no longer has every item in stock. The pharmacy re-checks stock when you place the order{together.length ? ', or choose a pharmacy below that has everything' : ''}.</p>
              )}
              {together && !locked && together.filter((p) => p.pharmacy_id !== draft.pharmacyId).length > 0 && draft.lines.length > 0 && (
                <div className="ph2-together">
                  <h3>{draft.lines.length > 1 ? `Also has all ${draft.lines.length} items nearby` : 'Also available nearby'}</h3>
                  {together.filter((p) => p.pharmacy_id !== draft.pharmacyId).slice(0, 3).map((p) => (
                    <div key={p.pharmacy_id} className="ph2-together-row">
                      <div><b>{p.name}</b><small>{[p.distance_km != null ? `${p.distance_km} km` : null, p.home_delivery ? `Delivery${p.delivery_fee != null ? ` ${money(p.delivery_fee)}` : ''}` : 'Pickup only'].filter(Boolean).join(' · ')}</small></div>
                      <span className="ph2-together-total">{money(draft.lines.reduce((t, l) => t + (Number(p.prices.find((x) => x.medicine_id === l.medicine.id)?.price) || 0) * l.quantity, 0))}</span>
                      <button type="button" className="ph2-btn ph2-btn--ghost ph2-btn--sm" onClick={() => switchPharmacy(p)}>Switch</button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {rxPanel}

            <section className="ph2-card ph2-receive-card">
              <div className="ph2-receive-title"><Truck /><h2>How would you like to receive your order?</h2></div>
              <div className="ph2-fulfil">
                <div className="ph2-option-wrap">
                  <button type="button" aria-pressed={fulfilment === 'DELIVERY'} disabled={deliveryLoading || (delivery != null && !delivery.available)} onClick={() => { setPickupAddressOpen(false); setFulfilment('DELIVERY'); }}>
                    <span className="ph2-radio" />
                    <span className="ph2-option-icon"><Truck /></span>
                    <span className="ph2-option-copy"><b>Home delivery</b><small>{deliveryLoading ? 'Checking availability...' : delivery?.available ? (deliveryFee === 0 ? 'Free delivery' : money(deliveryFee)) : pickupOnly ? 'This pharmacy offers store pickup only.' : `This pharmacy doesn't deliver to PIN ${effectivePin}.`}</small></span>
                    {delivery?.available === false && <span className="ph2-badge ph2-badge--red">Unavailable</span>}
                  </button>
                  {pinUnavailable && <button type="button" className="ph2-link ph2-change-address" onClick={() => setPickupAddressOpen((value) => !value)}>Change address</button>}
                </div>
                {pinUnavailable && (
                  <div className="ph2-delivery-unavailable"><Info /><span>Home delivery is unavailable for PIN {effectivePin}. You can collect your order from this pharmacy or choose another pharmacy that delivers to your location.</span><button type="button" className="ph2-btn ph2-btn--ghost ph2-btn--sm" disabled={findingPharmacies} onClick={() => void findNearbyDeliveryPharmacies()}>{findingPharmacies ? 'Finding pharmacies...' : 'Find nearby pharmacies'}</button></div>
                )}
                <div className="ph2-option-wrap">
                  <button type="button" aria-pressed={fulfilment === 'PICKUP'} onClick={() => { if (delivery?.available) autoPickup.current = false; setPickupAddressOpen(false); setFulfilment('PICKUP'); }}>
                    <span className="ph2-radio" />
                    <span className="ph2-option-icon"><Store /></span>
                    <span className="ph2-option-copy"><b>Store pickup</b><small>Collect your order directly from the pharmacy.</small></span>
                    {fulfilment === 'PICKUP' && <span className="ph2-badge ph2-badge--green"><Check />Selected</span>}
                  </button>
                </div>
                {fulfilment === 'PICKUP' && (
                  <div className="ph2-pickup-panel">
                    <MediaImage kind="business" businessType="pharmacy" name={pharmacyName} src={provider?.logo || nearPharmacy?.logo_url} />
                    <div className="ph2-pickup-details"><small>Pickup from</small><b>{pharmacyName}</b>{pharmacyAddress && <p><MapPin />{pharmacyAddress}</p>}{delivery?.hours && <p><Clock />Pharmacy hours: {formatHours(delivery.hours.open)} – {formatHours(delivery.hours.close)}</p>}</div>
                    <div className="ph2-pickup-fee"><small>Pickup fee</small><b>Free</b></div>
                  </div>
                )}
              </div>
              {/* The address stays changeable when it isn't covered: another one may be. */}
              {(fulfilment === 'DELIVERY' || (pinUnavailable && pickupAddressOpen)) && (
                <div style={{ marginTop: 12 }}>
                  <div className="ph2-address-head"><b>Delivery address</b>{addresses.length > 0 && <button type="button" className="ph2-link" onClick={() => setManualAddress((value) => !value)}>{manualMode ? 'Use a saved address' : 'Use a different address'}</button>}</div>
                  {!manualMode ? (
                    <div className="ph2-address-list">
                      {addresses.map((address) => (
                        <button type="button" key={address.addressId} className="ph2-address" aria-pressed={addressId === address.addressId} onClick={() => setAddressId(address.addressId)}>
                          <MapPin />
                          <span><b>{address.label || 'Saved address'}{address.isDefault ? ' · Default' : ''}</b><p>{addressText(address)}</p></span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="ph2-manual-address">
                      <label className="ph2-field"><span>Full delivery address</span><textarea rows={2} value={manualText} onChange={(event) => setManualText(event.target.value)} placeholder="Flat, building, street, area, city" /></label>
                      <label className="ph2-field"><span>PIN code</span><input inputMode="numeric" maxLength={6} value={manualPin} onChange={(event) => setManualPin(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit PIN" /></label>
                    </div>
                  )}
                  {belowMinimum && <p className="ph2-error" role="status">Home delivery needs medicines worth at least {money(delivery!.min_order)}. Add {money(delivery!.min_order! - itemsTotal)} more, or choose store pickup.</p>}
                  {delivery?.free_above != null && <p className="ph2-fee-note">Free delivery on orders above {money(delivery.free_above)}.</p>}
                </div>
              )}
              {fulfilment === 'DELIVERY' && <p className="ph2-inline-info" style={{ marginTop: 12 }}><Info />The pharmacy will confirm the delivery time after you place the order.</p>}
            </section>

            <section className="ph2-card ph2-important">
              <div className="ph2-card-head"><div><h2>Important information</h2></div></div>
              <ul>
                <li>Medicines are sold by licensed pharmacies and are subject to availability.</li>
                <li>Please check the pack and expiry date at the time of delivery or pickup.</li>
                <li>For any concerns, contact the pharmacy directly after placing the order.</li>
              </ul>
            </section>
          </div>

          <aside className="ph2-summary">
            <section className="ph2-card">
              <h2>Price details</h2>
              <dl style={{ marginTop: 12 }}>
                <div><dt>Items total ({cartLines.length} {cartLines.length === 1 ? 'item' : 'items'})</dt><dd>{money(itemsTotal)}</dd></div>
                <div><dt>{fulfilment === 'PICKUP' ? 'Pickup fee' : 'Delivery fee (Home delivery)'}</dt><dd>{fulfilment === 'PICKUP' ? 'Free' : deliveryLoading ? 'Checking...' : delivery?.available === false ? '—' : deliveryFee === 0 ? 'Free' : money(deliveryFee)}</dd></div>
                <div className="ph2-summary-total"><dt>Total</dt><dd>{money(estimatedTotal)}</dd></div>
              </dl>
            </section>
            <section className="ph2-card">
              <h2>Choose payment option</h2>
              <div className="ph2-pay-options" style={{ marginTop: 12 }}>
                <button type="button" aria-pressed={payMode === 'CASH'} onClick={() => setPayMode('CASH')}>
                  <span /><span><ShieldCheck /></span>
                  <span><b>{fulfilment === 'PICKUP' ? 'Pay at pharmacy (on pickup)' : 'Pay on delivery'}</b><small>{fulfilment === 'PICKUP' ? 'Pay in cash or UPI when you collect your order.' : 'Pay the pharmacy in cash or by UPI when you receive your order.'}</small></span>
                </button>
                <button type="button" aria-pressed={payMode === 'ONLINE'} disabled={onlineAvailable === false} onClick={() => setPayMode('ONLINE')}>
                  <span /><span><ShoppingCart /></span>
                  <span><b>Pay online now</b><small>{onlineAvailable === false ? 'Online payment is not available right now.' : 'UPI, card or net banking · secured by Razorpay.'}</small></span>
                </button>
              </div>
              <CancellationRefundPolicy service="pharmacy" compact className="ph2-policy" />
              {placeError && <p className="ph2-error" style={{ marginTop: 10 }}>{placeError}</p>}
              <button
                type="button"
                className="ph2-btn ph2-btn--primary ph2-btn--lg ph2-btn--block"
                style={{ marginTop: 12 }}
                disabled={placing || deliveryLoading || rxPending || overStock || (fulfilment === 'DELIVERY' && (!deliveryText || !validPin(deliveryPin) || !delivery?.available || belowMinimum))}
                onClick={() => void placeOrder()}
              >
                {placing ? 'Placing order...' : quoteExpiredNow ? <>Quote expired</> : rxPending ? <>Awaiting pharmacist quote</> : <>Place order · {money(estimatedTotal)} <ArrowRight /></>}
              </button>
              {overStock && !rxPending && <p className="ph2-muted" style={{ marginTop: 8 }}>Some items are not in stock at this pharmacy in that quantity. Fix the items marked above to place the order.</p>}
              {rxPending && (
                <p className="ph2-muted" style={{ marginTop: 8 }}>{quoteExpiredNow ? 'This quote has expired. Cancel the request above and send it again to get a fresh quote.' : activeRequest ? 'You can place the order once the pharmacist\'s quote is ready.' : 'Send your prescription to the pharmacist above. You can place the order once the quote is ready.'}</p>
              )}
              <div className="ph2-secure" style={{ marginTop: 10 }}><ShieldCheck /><span>Your order is safe and secure. We share your information only with the pharmacy to process this order.</span></div>
            </section>
          </aside>
        </div>
      )}
    </>
  );

  return (
    <div className="ph2">
      <input ref={fileInput} type="file" accept="application/pdf,image/jpeg,image/png" aria-label="Upload prescription" className="sr-only" onChange={(event) => void uploadPrescription(event.target.files?.[0])} />
      {view === 'cart' ? cartView : view === 'medicine' ? medicineView : searchView}
      {uploadSend.open && (
        <VizitoDialog
          title="Send your prescription to a pharmacy"
          className="ph2-dialog"
          onClose={() => { if (!uploadSend.busy) setUploadSend((u) => ({ ...u, open: false })); }}
          footer={<div className="ph2-dialog-actions">
            <button type="button" className="ph2-btn ph2-btn--ghost" disabled={uploadSend.busy} onClick={() => setUploadSend((u) => ({ ...u, open: false }))}>Later</button>
            <button type="button" className="ph2-btn ph2-btn--primary" disabled={uploadSend.busy || !uploadSend.pharmacyId} onClick={() => void sendUploadForQuote()}>
              {uploadSend.busy ? 'Sending...' : 'Send for a quote'}
            </button>
          </div>}
        >
          <p className="ph2-inline-info" style={{ marginTop: 0 }}><CheckCircle2 />Uploaded: <b>{draft.documentName || 'prescription'}</b>. It is saved in your Medical Records.</p>
          <p>The pharmacist reads your prescription, checks stock and sends you the price. You then choose pickup or delivery and pay. Nothing is charged until you confirm.</p>
          {!area ? (
            <div className="ph2-note"><MapPin /><div><b>Where are you?</b><p>Set your location to see pharmacies near you.</p></div><LocationBar compact purpose="find pharmacies near you" /></div>
          ) : nearbyPharmacies.length ? (
            <div className="ph3-pick" role="radiogroup" aria-label="Choose a pharmacy">
              {nearbyPharmacies.map((ph) => {
                const km = ph.storePin ? Math.hypot((ph.storePin.lat - area.lat) * 111.32, (ph.storePin.lng - area.lng) * 111.32 * Math.cos(area.lat * Math.PI / 180)) : null;
                return (
                  <button type="button" role="radio" key={ph.id} aria-checked={uploadSend.pharmacyId === ph.id} onClick={() => setUploadSend((u) => ({ ...u, pharmacyId: ph.id }))}>
                    <Store />
                    <span><b>{ph.name}</b><small>{km != null ? `${km < 1 ? 'Under 1' : km.toFixed(1)} km · ` : ''}{ph.address || 'Address not provided'}</small></span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="ph2-warn">No Vizito pharmacy is listed within 10 km of {area.label}. Try a nearby area.</p>
          )}
          {uploadSend.error && <p role="alert" className="ph2-error">{uploadSend.error}</p>}
        </VizitoDialog>
      )}
      {quoteReady && !replaceBasket && draft.lines.length > 0 && draft.requestId !== activeRequest?.id && (
        <VizitoDialog
          title="Replace your basket with this quote?"
          onClose={keepBasket}
          className="ph2-dialog"
          footer={<div className="ph2-dialog-actions">
            <button type="button" className="ph2-btn ph2-btn--ghost" autoFocus onClick={keepBasket}>Keep my basket</button>
            <button type="button" className="ph2-btn ph2-btn--primary" onClick={() => setReplaceBasket(true)}>Replace basket</button>
          </div>}
        >
          <p>Your basket has {draft.lines.length} {draft.lines.length === 1 ? 'medicine' : 'medicines'}{draft.pharmacyId && providerById.get(draft.pharmacyId) ? ` from ${providerById.get(draft.pharmacyId)!.name}` : ''}. Ordering this quote from {pharmacyName} will remove {draft.lines.length === 1 ? 'it' : 'them'}.</p>
          <p>If you keep your basket, this quote stays in Prescription requests until it expires.</p>
        </VizitoDialog>
      )}
      {pendingAdd && (
        <VizitoDialog
          title="Start a new basket?"
          onClose={() => setPendingAdd(null)}
          className="ph2-dialog"
          footer={<div className="ph2-dialog-actions">
            <button type="button" className="ph2-btn ph2-btn--ghost" onClick={() => setPendingAdd(null)}>Keep current basket</button>
            <button type="button" className="ph2-btn ph2-btn--primary" onClick={() => { const next = pendingAdd; setPendingAdd(null); postLine(next.line, next.pharmacyId); }}>Start new basket</button>
          </div>}
        >
          <p>Your basket has medicines from {pharmacyName}. Medicines can only be ordered from one pharmacy at a time.</p>
          <p>Starting a new basket will clear the current items. Your sent prescription requests stay in My orders.</p>
        </VizitoDialog>
      )}
    </div>
  );
}
