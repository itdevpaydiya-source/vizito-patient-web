import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronRight, Clock, FileText, Info, MapPin,
  Minus, Package, Phone, Plus, Search, ShieldCheck, ShoppingCart, Store, Trash2, Truck, Upload, X,
} from 'lucide-react';
import MediaImage from '../../components/MediaImage';
import ThemedSelect from '../../components/forms/ThemedSelect';
import VizitoDialog from '../../components/dialogs/VizitoDialog';
import VizitoPagination from '../../components/navigation/VizitoPagination';
import LocationBar from '../../components/location/LocationBar';
import { useSearchArea, formatDistance } from '../../../services/location';
import { usePharmacyBaskets } from '../../../services/PharmacyBasketContext';
import {
  createDirectOrderApi, createPharmacyRequestApi, createRxOrderApi, createUploadedPharmacyRequestApi,
  cancelPharmacyRequestApi, getDeliveryOptionsApi, getMedicineDetailApi,
  getMedicinePharmaciesNearApi, getMyOrdersGroupedPageApi, getPharmacyRequestsApi,
  searchMedicinesNearApi, type DeliveryOptions, type MedicineDetail, type MedicineNearPharmacy,
  type MedicineNearResult, type MedicineSearchResult, type Paged, type PatientOrderV2,
} from '../../../services/pharmacyOrderHelper';
import { getAddressesApi as loadAddresses, getProvidersApi, type PatientAddress } from '../../../services/patientHelper';
import type { PharmacyRequestItem, ProviderItem } from '../../../services/types';
import { personPharmacyPrescriptions, prescriptionFileProblem, type PharmacyPrescriptionChoice } from './pharmacyPrescriptionDetails';
import { quoteExpired, quoteLines } from './prescriptionRequests';
import { recordsApi } from '../records/recordsApi';
import { money, moneyNumber, addressText, errorText, validPin, deliveryEtaText } from './pharmacyV2Ui';
import type { BasketLine } from './medicineBasket';
import './PharmacyV2.css';

const norm = (value: string | null | undefined) => (value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const packText = (medicine: { packaging_type?: string | null; units_per_pack?: number | null }) => {
  if (medicine.packaging_type && medicine.units_per_pack) return `${medicine.packaging_type} of ${medicine.units_per_pack}`;
  if (medicine.packaging_type) return medicine.packaging_type;
  if (medicine.units_per_pack) return `Pack of ${medicine.units_per_pack}`;
  return '';
};

const strengthText = (medicine: { strength?: string | null; strength_unit?: string | null; dosage_form?: string | null }) =>
  [medicine.strength, medicine.strength_unit].filter(Boolean).join(' ') +
  (medicine.strength && medicine.dosage_form ? ` ${medicine.dosage_form}` : '');

type Fulfilment = 'DELIVERY' | 'PICKUP';
type PayMode = 'CASH' | 'ONLINE';

function MedicineCard({ medicine, onOpen }: { medicine: MedicineNearResult | MedicineSearchResult; onOpen: () => void }) {
  const mrp = moneyNumber(medicine.mrp);
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
          <div className="ph2-price"><b>{money(mrp)}</b></div>
          {'pharmacies_near' in medicine && medicine.pharmacies_near > 0 && (
            <span className="ph2-stock"><CheckCircle2 />At {medicine.pharmacies_near} {medicine.pharmacies_near === 1 ? 'pharmacy' : 'pharmacies'} nearby</span>
          )}
        </div>
        <div className="ph2-med-tags">
          {medicine.requires_prescription
            ? <span className="ph2-chip ph2-chip--rx"><FileText />Rx required</span>
            : <span className="ph2-chip ph2-chip--otc">No prescription needed</span>}
          <button type="button" className="ph2-btn ph2-btn--ghost ph2-btn--sm" onClick={onOpen}>View pharmacies</button>
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
  const requestParam = params.get('request') || params.get('pharmacyRequestId') || '';
  const view: 'search' | 'medicine' | 'cart' = medicineId ? 'medicine' : params.get('view') === 'cart' || requestParam ? 'cart' : 'search';

  const [term, setTerm] = useState(query);
  useEffect(() => { setTerm(query); }, [query]);

  const [results, setResults] = useState<Paged<MedicineNearResult> | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [popular, setPopular] = useState<MedicineNearResult[]>([]);
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
  const [fulfilment, setFulfilment] = useState<Fulfilment>('DELIVERY');
  const [delivery, setDelivery] = useState<DeliveryOptions | null>(null);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [payMode, setPayMode] = useState<PayMode>('CASH');
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState('');

  const requestId = requestParam || draft.requestId || '';
  const pharmacyId = draft.pharmacyId || activeRequest?.pharmacy_partner_id || '';
  const needsRx = draft.lines.some((line) => line.medicine.requires_prescription);

  const providerById = useMemo(() => new Map(providers.map((p) => [p.id, p])), [providers]);
  const provider = pharmacyId ? providerById.get(pharmacyId) : undefined;
  const nearPharmacy = pharmacyId ? nearMeta[pharmacyId] : undefined;
  const pharmacyName = provider?.name || nearPharmacy?.name || 'your selected pharmacy';
  const pharmacyAddress = provider?.address || nearPharmacy?.address || '';
  const pharmacyDistanceText = provider && area ? (() => { const pin = provider.storePin; return pin ? formatDistance(Math.hypot((pin.lat - area.lat) * 111320, (pin.lng - area.lng) * 111320 * Math.cos(area.lat * Math.PI / 180))) : null; })() : null;

  const selectedAddress = addresses.find((a) => a.addressId === addressId) || null;
  const manualMode = manualAddress || addresses.length === 0;
  const deliveryText = manualMode ? manualText.trim() : selectedAddress ? addressText(selectedAddress) : '';
  const deliveryPin = manualMode ? manualPin.trim() : selectedAddress?.pincode || '';
  const effectivePin = deliveryPin || area?.pincode || '';

  const quote = activeRequest ? quoteLines(activeRequest) : null;
  const accepted = !!activeRequest && activeRequest.status === 'Accepted' && !activeRequest.order_id;
  const quoteReady = accepted && !!activeRequest?.quote_items && !!quote?.length && !quoteExpired(activeRequest);

  const cartLines = useMemo<BasketLine[]>(() => {
    if (!quoteReady || !quote) return draft.lines;
    return quote.flatMap((line) => {
      if (!line.available) return [];
      const existing = draft.lines.find((item) => item.medicine.id === line.medicine_id);
      if (!existing) return [];
      const price = Number(line.unit_price);
      return [{
        medicine: { ...existing.medicine, mrp: Number.isFinite(price) ? price : existing.medicine.mrp },
        quantity: Math.max(1, Number(line.quantity) || existing.quantity),
      }];
    });
  }, [draft.lines, quote, quoteReady]);

  const itemsTotal = quoteReady && activeRequest && Number.isFinite(moneyNumber(activeRequest.quote_total))
    ? moneyNumber(activeRequest.quote_total)
    : cartLines.reduce((sum, line) => sum + Math.round(moneyNumber(line.medicine.mrp) * 100) * line.quantity, 0) / 100;

  const deliveryFee = fulfilment === 'DELIVERY' && delivery?.available
    ? (delivery.free_above != null && itemsTotal >= delivery.free_above ? 0 : delivery.fee)
    : 0;
  const estimatedTotal = itemsTotal + deliveryFee;
  const locked = (!!activeRequest && ['Requested', 'Accepted'].includes(activeRequest.status)) || (!activeRequest && !!draft.requestId);

  const changeParams = (next: URLSearchParams) => setParams(next);

  const goSearch = (keyword: string) => {
    const next = new URLSearchParams(params);
    next.delete('medicine'); next.delete('view'); next.delete('request'); next.delete('pharmacyRequestId'); next.delete('page');
    if (keyword.trim()) next.set('q', keyword.trim()); else next.delete('q');
    changeParams(next);
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openMedicine = (id: string) => {
    const next = new URLSearchParams(params);
    next.delete('view'); next.delete('request'); next.delete('pharmacyRequestId');
    next.set('medicine', id);
    changeParams(next);
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
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
    if (view !== 'search' || !area) { setResults(null); return; }
    if (query.length < 2) { setResults(null); setSearchError(''); return; }
    let active = true;
    setSearching(true); setSearchError('');
    searchMedicinesNearApi({
      keyword: query, lat: area.lat, lng: area.lng, pincode: area.pincode,
      radius_km: 10, page: Math.max(1, Number(params.get('page')) || 1), page_size: 10,
    })
      .then((page) => { if (active) setResults(page); })
      .catch((error) => { if (active) { setSearchError(errorText(error, 'Medicines could not be searched near you.')); setResults(null); } })
      .finally(() => { if (active) setSearching(false); });
    return () => { active = false; };
  }, [view, area?.lat, area?.lng, area?.pincode, query, params.get('page')]);

  // The catalogue has no "popular" flag; this is a real unfiltered slice of the nearby catalogue.
  useEffect(() => {
    if (view !== 'search' || !area) { setPopular([]); return; }
    let active = true;
    searchMedicinesNearApi({ keyword: 'mg', lat: area.lat, lng: area.lng, pincode: area.pincode, radius_km: 10, page: 1, page_size: 10 })
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
        if (!options.available) setFulfilment((current) => current === 'DELIVERY' ? 'PICKUP' : current);
      })
      .catch(() => { if (active) setDelivery(null); })
      .finally(() => { if (active) setDeliveryLoading(false); });
    return () => { active = false; };
  }, [view, pharmacyId, effectivePin]);

  // Prescription choices for an Rx basket.
  useEffect(() => {
    if (view !== 'cart' || !needsRx) { setPrescriptions([]); return; }
    let active = true;
    setPrescriptionLoading(true);
    personPharmacyPrescriptions('self')
      .then((rows) => {
        if (!active) return;
        setPrescriptions(rows);
        const rxLines = draft.lines.filter((line) => line.medicine.requires_prescription);
        const match = rows.find((p) => rxLines.every((line) => (p.medicines || []).some((m) => norm(m.name) === norm(line.medicine.medicine_name))));
        setPrescriptionId((current) => current || match?.id || rows[0]?.id || '');
      })
      .catch(() => { if (active) setPrescriptions([]); })
      .finally(() => { if (active) setPrescriptionLoading(false); });
    return () => { active = false; };
  }, [view, needsRx, draft.lines.length]);

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
  }, [activeRequest?.id, activeRequest?.quote_items, baskets.draftReady]);

  const postLine = (line: BasketLine, targetPharmacy: string) => {
    if (!baskets.draftReady) { setActionError('Your basket is still loading. Please try again.'); return; }
    const existing = draft.lines.find((item) => item.medicine.id === line.medicine.id);
    const lines = existing
      ? draft.lines.map((item) => item.medicine.id === line.medicine.id ? { ...item, quantity: Math.min(99, item.quantity + line.quantity) } : item)
      : [...draft.lines, line];
    const ok = baskets.updateDraft({
      ...draft, lines, pharmacyId: targetPharmacy,
      requestId: undefined, prescriptionId: undefined,
      subject: draft.subject || 'self',
    });
    if (!ok) { setActionError('Your basket could not be saved in this browser. Allow local storage and try again.'); return; }
    const next = new URLSearchParams(params);
    next.delete('medicine'); next.delete('q'); next.delete('page'); next.delete('request'); next.delete('pharmacyRequestId');
    next.set('view', 'cart');
    changeParams(next);
    setActionError('');
  };

  const addMedicine = () => {
    if (!detail) return;
    const pharmacy = nearRows.find((p) => p.pharmacy_id === selectedPharmacy && p.in_stock);
    if (!pharmacy) { setActionError('Choose a pharmacy that has this medicine in stock.'); return; }
    const line: BasketLine = {
      medicine: {
        id: detail.id, code: null, medicine_name: detail.medicine_name, brand_name: detail.brand_name,
        generic_name: detail.generic_name || '', strength: detail.strength || '', strength_unit: detail.strength_unit || '',
        dosage_form: detail.dosage_form || '', mrp: moneyNumber(detail.mrp), requires_prescription: detail.requires_prescription,
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
    const nextQuantity = Math.max(1, Math.min(99, Math.floor(quantityValue) || 1));
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
      form.append('subject', 'self');
      const document = await recordsApi.upload(form);
      baskets.updateDraft({ ...draft, documentId: document.id, documentName: document.file_name, documentSubject: 'self', prescriptionSource: 'upload' });
      setRxSource('upload');
    } catch (error) {
      setActionError(errorText(error, 'Prescription could not be uploaded.'));
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const sendRequest = async () => {
    if (!pharmacyId) { setActionError('Choose a pharmacy first.'); return; }
    const rxLines = draft.lines.filter((line) => line.medicine.requires_prescription);
    setSendingRequest(true); setPlaceError(''); setActionError('');
    try {
      let sent: PharmacyRequestItem;
      if (rxSource === 'upload') {
        if (!draft.documentId) throw new Error('Upload your prescription first.');
        sent = await createUploadedPharmacyRequestApi({
          pharmacy_partner_id: pharmacyId,
          document_id: draft.documentId,
          items: rxLines.map((line) => ({ medicine_id: line.medicine.id, name: line.medicine.medicine_name, quantity: line.quantity })),
        });
      } else {
        if (!prescriptionId) throw new Error('Choose a doctor prescription for these medicines.');
        sent = await createPharmacyRequestApi(prescriptionId, pharmacyId);
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
    if (needsRx && !quoteReady) { setPlaceError('The pharmacist must accept your prescription and send a quote before you can order.'); return; }
    if (fulfilment === 'DELIVERY') {
      if (deliveryText.length < 8) { setPlaceError('Add the full delivery address.'); return; }
      if (!validPin(deliveryPin)) { setPlaceError('Add a valid 6-digit delivery PIN code.'); return; }
      if (deliveryLoading) { setPlaceError('Checking delivery availability. Please wait.'); return; }
      if (!delivery?.available) { setPlaceError(delivery?.reason || 'This pharmacy does not deliver to your address. Choose store pickup.'); return; }
    }
    setPlacing(true); setPlaceError(''); setActionError('');
    try {
      const items = draft.lines.map((line) => ({ medicine_id: line.medicine.id, quantity: line.quantity }));
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
  const nearbyPharmacies = useMemo(() => {
    const rows = providers.filter((p) => p.partnerType === 'pharmacy');
    if (!area) return rows.slice(0, 4);
    return [...rows].sort((a, b) => {
      const da = a.storePin ? Math.hypot(a.storePin.lat - area.lat, a.storePin.lng - area.lng) : Infinity;
      const db = b.storePin ? Math.hypot(b.storePin.lat - area.lat, b.storePin.lng - area.lng) : Infinity;
      return da - db;
    }).slice(0, 4);
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
                  <button type="button" aria-label={`Add another ${line.medicine.medicine_name}`} disabled={locked} onClick={() => changeQuantity(line.medicine.id, line.quantity + 1)}><Plus /></button>
                </span>
              </div>
            </div>
          ))}
          {draft.lines.length > 3 && <p className="ph2-muted">+ {draft.lines.length - 3} more medicine{draft.lines.length - 3 === 1 ? '' : 's'}</p>}
          <div className="ph2-mini-total"><span>Item total</span><b>{money(itemsTotal)}</b></div>
          <Link className="ph2-btn ph2-btn--primary ph2-btn--block" to="/pharmacy-orders/new?view=cart">View cart &amp; checkout <ArrowRight /></Link>
          <p className="ph2-fee-note">Delivery fee is calculated by the pharmacy at checkout.</p>
        </>
      )}
    </aside>
  );

  const searchView = (
    <>
      <div className="ph2-hero">
        <div className="ph2-hero-copy">
          <h1>Order medicines and health products from trusted pharmacies near you</h1>
          <p className="ph2-sub">Search real medicines stocked by nearby pharmacies, compare availability and choose home delivery or store pickup.</p>
          <form className="ph2-searchbar" onSubmit={(event) => { event.preventDefault(); goSearch(term); }}>
            <label>
              <Search />
              <input type="search" value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Search medicines (e.g. paracetamol, azithromycin)" aria-label="Search medicines" />
            </label>
            <button type="submit" className="ph2-btn ph2-btn--primary">Search</button>
          </form>
          <div className="ph2-hero-actions">
            <button type="button" className="ph2-btn ph2-btn--ghost" disabled={uploading} onClick={() => fileInput.current?.click()}>
              <Upload />{uploading ? 'Uploading...' : 'Upload prescription'}
            </button>
            {draft.documentId && <span className="ph2-chip ph2-chip--green"><FileText />{draft.documentName || 'Prescription attached'}</span>}
            <span className="ph2-muted">Get quotes from nearby pharmacies.</span>
          </div>
          <div className="ph2-hero-pills">
            <span><ShieldCheck />Licensed pharmacies</span>
            <span><Package />Genuine medicines</span>
            <span><Truck />Delivery or pickup</span>
            <span><CheckCircle2 />Pharmacist reviewed</span>
          </div>
        </div>
        <img src="/images/healthcare/banners/pharmacy-hero.webp" alt="" />
      </div>

      <div className="ph2-locrow"><LocationBar purpose="find medicines and pharmacies near you" /></div>

      {actionError && <p role="alert" className="ph2-error" style={{ marginTop: 10 }}>{actionError}</p>}

      <div className="ph2-landing-grid">
        <div>
          {query ? (
            <section aria-label={`Search results for ${query}`}>
              <div className="ph2-results-head">
                <div><h2>Search results for &ldquo;{query}&rdquo;</h2><p>{results ? `${results.total} medicine${results.total === 1 ? '' : 's'} found near you` : 'Searching nearby pharmacies...'}</p></div>
                <button type="button" className="ph2-link" onClick={() => goSearch('')}>Clear search</button>
              </div>
              <div className="ph2-note is-warm" style={{ marginBottom: 12 }}>
                <FileText />
                <div><b>Have a prescription?</b><p>Attach it at checkout and the pharmacist will verify and quote your medicines before you pay.</p></div>
                <button type="button" className="ph2-btn ph2-btn--ghost ph2-btn--sm" disabled={uploading} onClick={() => fileInput.current?.click()}><Upload />Upload</button>
              </div>
              {!area ? (
                <div className="ph2-empty"><MapPin /><h3>Set your location</h3><p>Choose an area to find medicines stocked by pharmacies near you.</p><LocationBar purpose="find medicines near you" /></div>
              ) : searchError ? (
                <div className="ph2-empty"><AlertTriangle /><h3>Search unavailable</h3><p>{searchError}</p></div>
              ) : searching ? (
                <p role="status" className="ph2-muted">Searching nearby pharmacies...</p>
              ) : results && results.items.length ? (
                <>
                  <div className="ph2-results-grid">{results.items.map((medicine) => <MedicineCard key={medicine.id} medicine={medicine} onOpen={() => openMedicine(medicine.id)} />)}</div>
                  {results.total_pages > 1 && <VizitoPagination page={results.page} pageSize={10} total={results.total} onPageChange={searchPage} onPageSizeChange={() => undefined} label="medicines" />}
                </>
              ) : (
                <div className="ph2-empty"><Search /><h3>No medicines found</h3><p>Try a different spelling or a shorter medicine name. The catalogue shows medicines stocked by pharmacies within 10 km.</p></div>
              )}
            </section>
          ) : (
            <>
              <section aria-label="Popular medicines near you">
                <div className="ph2-results-head">
                  <div><h2>Popular near you</h2><p>Real medicines currently stocked by pharmacies in your area.</p></div>
                  <Link className="ph2-link" to="/pharmacy-orders/new?q=mg">View all medicines <ChevronRight /></Link>
                </div>
                {!area ? (
                  <div className="ph2-empty"><MapPin /><h3>Set your location</h3><p>We search the catalogue of pharmacies around the area you choose.</p></div>
                ) : popular.length ? (
                  <div className="ph2-results-grid">{popular.map((medicine) => <MedicineCard key={medicine.id} medicine={medicine} onOpen={() => openMedicine(medicine.id)} />)}</div>
                ) : (
                  <p className="ph2-muted">No medicines are listed by nearby pharmacies right now.</p>
                )}
                <div className="ph2-hero-pills" style={{ marginTop: 12 }}>
                  {popularKeywords.map((keyword) => <button key={keyword} type="button" className="ph2-chip ph2-chip--slate" onClick={() => goSearch(keyword)}>{keyword}</button>)}
                </div>
              </section>

              <section className="ph2-section" aria-label="Nearby pharmacies">
                <div className="ph2-results-head">
                  <div><h2>Nearby pharmacies</h2><p>Directory details only — medicine availability is checked when you search.</p></div>
                  <Link className="ph2-link" to="/pharmacy-orders/new?q=mg">Browse medicines <ChevronRight /></Link>
                </div>
                {nearbyPharmacies.length ? (
                  <div className="ph2-pharmacy-grid">
                    {nearbyPharmacies.map((pharmacy) => {
                      const distance = area && pharmacy.storePin
                        ? Math.hypot((pharmacy.storePin.lat - area.lat) * 111320, (pharmacy.storePin.lng - area.lng) * 111320 * Math.cos(area.lat * Math.PI / 180))
                        : null;
                      return (
                        <article className="ph2-pharmacy-card" key={pharmacy.id}>
                          <MediaImage kind="business" businessType="pharmacy" name={pharmacy.name} src={pharmacy.logo} />
                          <div>
                            <b>{pharmacy.name}</b>
                            <small>{pharmacy.address || 'Address not provided'}</small>
                            <small>{distance != null ? `${formatDistance(distance)} away` : 'Distance not available'}{pharmacy.rating && pharmacy.rating.count > 0 ? ` · ${Number(pharmacy.rating.average).toFixed(1)} (${pharmacy.rating.count})` : ''}</small>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : <p className="ph2-muted">Pharmacy directory details are not available right now.</p>}
              </section>

              <section className="ph2-section" aria-label="Your recent orders">
                <div className="ph2-results-head">
                  <div><h2>Your recent orders</h2><p>Track an order or start a new basket with the same medicines.</p></div>
                  <Link className="ph2-link" to="/pharmacy-orders">View all orders <ChevronRight /></Link>
                </div>
                {recent.length ? (
                  <div className="ph2-recent">
                    {recent.map((order) => (
                      <article className="ph2-recent-card" key={order.id}>
                        <MediaImage kind="business" businessType="pharmacy" name={providerById.get(order.pharmacy_partner_id)?.name || 'Pharmacy'} src={providerById.get(order.pharmacy_partner_id)?.logo} />
                        <div>
                          <b>{providerById.get(order.pharmacy_partner_id)?.name || 'Pharmacy'}</b>
                          <small>{order.items.length} item{order.items.length === 1 ? '' : 's'} · {money(order.total_amount)}</small>
                          <small>{order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''} · {order.status.replaceAll('_', ' ').toLowerCase()}</small>
                        </div>
                        <div className="ph2-recent-actions">
                          <Link className="ph2-btn ph2-btn--ghost ph2-btn--sm" to={`/pharmacy-orders/${order.id}`}>View</Link>
                          <button type="button" className="ph2-btn ph2-btn--soft ph2-btn--sm" onClick={() => reorder(order)}>Order again</button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="ph2-recent-empty"><ShoppingCart /><span>No pharmacy orders yet. Search for a medicine to place your first order.</span></div>
                )}
              </section>
            </>
          )}
        </div>
        {cartMini}
      </div>
    </>
  );

  const medicineView = (
    <>
      <nav className="ph2-crumbs" aria-label="Breadcrumb">
        <Link to="/pharmacy-orders/new">Pharmacy</Link><ChevronRight />
        <Link to="/pharmacy-orders/new">{detail?.generic_name || 'Medicines'}</Link><ChevronRight />
        <b>{detail?.medicine_name || 'Medicine'}</b>
      </nav>
      <div className="ph2-head">
        <div>
          <h1>{detail?.medicine_name || 'Medicine details'}</h1>
          <p className="ph2-sub">Compare availability at nearby pharmacies and choose where to order.</p>
        </div>
        <button type="button" className="ph2-back" onClick={() => goSearch(query)}><ArrowLeft />Back to search</button>
      </div>
      {actionError && <p role="alert" className="ph2-error" style={{ marginBottom: 12 }}>{actionError}</p>}
      {detailLoading ? (
        <div className="ph2-card"><p role="status" className="ph2-muted">Loading medicine details...</p></div>
      ) : detailError ? (
        <div className="ph2-empty"><AlertTriangle /><h3>Medicine unavailable</h3><p>{detailError}</p><button type="button" className="ph2-btn ph2-btn--ghost" onClick={() => goSearch(query)}>Back to search</button></div>
      ) : detail ? (
        <>
          <section className="ph2-card">
            <div className="ph2-med-top">
              <div className="ph2-med-main">
                <div className="ph2-med-visual">
                  <MediaImage kind="medicine" name={detail.medicine_name} src={detail.image_url} />
                </div>
                <div className="ph2-med-info">
                  <p className="ph2-generic">{[detail.generic_name, strengthText(detail)].filter(Boolean).join(' · ') || 'Medicine'}</p>
                  <div className="ph2-med-facts">
                    {detail.manufacturer && <p><b>Manufacturer:</b> {detail.manufacturer}</p>}
                    {packText(detail) && <p><b>Pack size:</b> {packText(detail)}</p>}
                    {detail.composition && <p><b>Composition:</b> {detail.composition}</p>}
                  </div>
                  <div className="ph2-med-price">
                    <strong>{money(detail.mrp)}</strong>
                    <small>Inclusive of all taxes</small>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    {detail.requires_prescription
                      ? <span className="ph2-chip ph2-chip--rx"><FileText />Prescription required</span>
                      : <span className="ph2-chip ph2-chip--otc"><CheckCircle2 />No prescription needed</span>}
                  </div>
                  <div className="ph2-buy">
                    <div className="ph2-qty" aria-label="Quantity">
                      <button type="button" aria-label="Reduce quantity" disabled={quantity <= 1} onClick={() => setQuantity((n) => Math.max(1, n - 1))}><Minus /></button>
                      <input aria-label="Medicine quantity" type="number" min={1} max={99} value={quantity} onChange={(event) => setQuantity(Math.max(1, Math.min(99, Number(event.target.value) || 1)))} />
                      <button type="button" aria-label="Increase quantity" disabled={quantity >= 99} onClick={() => setQuantity((n) => Math.min(99, n + 1))}><Plus /></button>
                    </div>
                    <button type="button" className="ph2-btn ph2-btn--primary ph2-btn--lg" disabled={!selectedPharmacy || !nearRows.some((p) => p.pharmacy_id === selectedPharmacy && p.in_stock) || !baskets.draftReady} onClick={addMedicine}>
                      <ShoppingCart />Add to cart
                    </button>
                  </div>
                  <p className="ph2-muted" style={{ marginTop: 8 }}>
                    {selectedPharmacy ? `From ${nearRows.find((p) => p.pharmacy_id === selectedPharmacy)?.name || 'selected pharmacy'}` : 'Select a pharmacy below to add this medicine.'}
                  </p>
                </div>
              </div>
              <aside className="ph2-key">
                <h2>Key information</h2>
                <dl className="ph2-key-list">
                  <div className="ph2-key-row"><span><Info /></span><div><dt>About this medicine</dt><dd>{detail.description || 'Ask the pharmacist for advice about this medicine.'}</dd></div></div>
                  <div className="ph2-key-row"><span><Package /></span><div><dt>Storage</dt><dd>{detail.storage_condition || 'Store as printed on the pack.'}</dd></div></div>
                  <div className="ph2-key-row"><span><FileText /></span><div><dt>Prescription</dt><dd>{detail.requires_prescription ? 'A valid prescription is required. Attach one at checkout for pharmacist review.' : 'No prescription is needed for this medicine.'}</dd></div></div>
                  <div className="ph2-key-row"><span><ShieldCheck /></span><div><dt>Sold by</dt><dd>Licensed pharmacies listed on Vizito. Availability and price come from the pharmacy catalogue.</dd></div></div>
                </dl>
              </aside>
            </div>
          </section>

          <section className="ph2-near" aria-label="Available at pharmacies near you">
            <div className="ph2-near-head">
              <div><h2>Available at pharmacies near you</h2><p>The same MRP is shown at every pharmacy. Choose where to collect or receive your order.</p></div>
              <LocationBar compact purpose="find this medicine nearby" />
            </div>
            {!area ? (
              <div className="ph2-empty"><MapPin /><h3>Set your location</h3><p>Choose an area to see pharmacies that stock this medicine.</p></div>
            ) : nearLoading ? (
              <p role="status" className="ph2-muted">Checking nearby pharmacies...</p>
            ) : nearRows.length ? (
              <>
                {nearRows.map((pharmacy) => (
                  <article className="ph2-near-row" key={pharmacy.pharmacy_id}>
                    <MediaImage kind="business" businessType="pharmacy" name={pharmacy.name} src={pharmacy.logo_url} />
                    <div>
                      <h3>{pharmacy.name}</h3>
                      <small><MapPin />{pharmacy.address || 'Address not provided'}{pharmacy.pincode ? ` · ${pharmacy.pincode}` : ''}</small>
                    </div>
                    <div className="ph2-near-tags">
                      {pharmacy.home_delivery && <span className="ph2-chip ph2-chip--green"><Truck />Home delivery{pharmacy.delivery_fee != null ? ` · ${money(pharmacy.delivery_fee)}` : ''}</span>}
                      {pharmacy.store_pickup && <span className="ph2-chip ph2-chip--slate"><Store />Store pickup</span>}
                      {pharmacy.in_stock
                        ? <span className="ph2-chip ph2-chip--green">In stock</span>
                        : <span className="ph2-chip ph2-chip--red">Out of stock</span>}
                    </div>
                    <div className="ph2-near-price">
                      <b>{money(detail.mrp)}</b>
                      <small>{pharmacy.distance_km != null ? `${pharmacy.distance_km} km away` : 'Distance not available'}</small>
                    </div>
                    <button
                      type="button"
                      className={`ph2-btn ${selectedPharmacy === pharmacy.pharmacy_id ? 'ph2-btn--soft' : 'ph2-btn--primary'}`}
                      disabled={!pharmacy.in_stock}
                      aria-pressed={selectedPharmacy === pharmacy.pharmacy_id}
                      onClick={() => setSelectedPharmacy(pharmacy.pharmacy_id)}
                    >
                      {selectedPharmacy === pharmacy.pharmacy_id ? 'Selected' : 'Select'}
                    </button>
                  </article>
                ))}
              </>
            ) : (
              <div className="ph2-empty"><Store /><h3>Not stocked nearby</h3><p>No pharmacy within 10 km lists this medicine. Try another medicine or change your location.</p></div>
            )}
            <div className="ph2-note-grid">
              <div className="ph2-note">
                <FileText />
                <div><b>Prescription note</b><p>{detail.requires_prescription ? 'This medicine needs a valid prescription. Add it to your cart, attach your prescription and the pharmacist will review it before you order.' : 'This medicine does not require a prescription. If you have existing medical conditions, are pregnant or breastfeeding, ask a doctor or pharmacist first.'}</p></div>
              </div>
              <div className="ph2-note is-warm">
                <AlertTriangle />
                <div><b>Prescription required for some medicines</b><p>Antibiotics, strong painkillers and chronic-disease medicines need a valid prescription from a doctor. The pharmacist verifies every prescription-backed order.</p></div>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </>
  );

  const rxPanel = (() => {
    if (!needsRx) return null;
    if (activeRequest) {
      const status = activeRequest.status;
      const lines = quote;
      const expired = quoteExpired(activeRequest);
      return (
        <section className="ph2-request" aria-label="Prescription request">
          <div className="ph2-request-head">
            <span className={status === 'Accepted' ? 'is-ok' : status === 'Rejected' || status === 'Cancelled' || status === 'Expired' ? 'is-bad' : ''}>
              {status === 'Accepted' ? <CheckCircle2 /> : status === 'Rejected' || status === 'Cancelled' || status === 'Expired' ? <AlertTriangle /> : <Clock />}
            </span>
            <div>
              <h2>{activeRequest.order_id ? 'Order already created' : status === 'Requested' ? 'Waiting for pharmacist review' : status === 'Accepted' ? 'Pharmacist accepted your prescription' : status === 'Rejected' ? 'Prescription not accepted' : `Request ${status.toLowerCase()}`}</h2>
              <p>
                {activeRequest.order_id ? 'This prescription request has already become an order.'
                  : status === 'Requested' ? 'The pharmacy is checking your prescription and stock. This page refreshes automatically.'
                    : status === 'Accepted' && !activeRequest.quote_items ? 'The pharmacist accepted the request and is preparing a quote.'
                      : status === 'Accepted' ? 'Review the pharmacist’s quote, then place your order.'
                        : activeRequest.reject_reason || 'You can start a new request with another prescription or pharmacy.'}
              </p>
            </div>
          </div>
          {activeRequest.order_id && <Link className="ph2-btn ph2-btn--primary ph2-btn--sm" to={`/pharmacy-orders/${activeRequest.order_id}`}>View order <ChevronRight /></Link>}
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
                    <option key={prescription.id} value={prescription.id}>
                      {[prescription.prescription_number, prescription.doctor?.name, prescription.date?.slice(0, 10)].filter(Boolean).join(' · ')}
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
            {draft.documentId && <span className="ph2-chip ph2-chip--green"><FileText />{draft.documentName || 'Prescription uploaded'}</span>}
            {uploading && <p role="status" className="ph2-muted">Uploading prescription...</p>}
          </div>
        )}
        <div className="ph2-request-foot">
          <small>No payment is taken until you confirm the order.</small>
          <button
            type="button"
            className="ph2-btn ph2-btn--primary ph2-btn--sm"
            disabled={sendingRequest || uploading || (rxSource === 'vizito' ? !prescriptionId : !draft.documentId)}
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
        <Link to="/pharmacy-orders/new">Pharmacy</Link><ChevronRight /><b>Your cart</b>
      </nav>
      <div className="ph2-head">
        <div>
          <h1>Your cart</h1>
          <p className="ph2-sub">Items from {pharmacyName}</p>
        </div>
        <Link className="ph2-back" to="/pharmacy-orders"><ArrowLeft />Back to pharmacy</Link>
      </div>
      {actionError && <p role="alert" className="ph2-error" style={{ marginBottom: 12 }}>{actionError}</p>}
      {draft.lines.length === 0 ? (
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
                  {cartLines.map((line) => (
                    <tr key={line.medicine.id}>
                      <td>
                        <div className="ph2-cart-med">
                          <MediaImage kind="medicine" name={line.medicine.medicine_name} src={line.medicine.image_url} />
                          <div>
                            <b>{line.medicine.medicine_name}</b>
                            <small>{packText(line.medicine) || 'Medicine'}</small>
                            {line.medicine.requires_prescription
                              ? <span className="ph2-chip ph2-chip--rx"><FileText />Prescription required</span>
                              : <span className="ph2-chip ph2-chip--otc">No prescription needed</span>}
                          </div>
                        </div>
                      </td>
                      <td><span className="ph2-cart-price">{money(line.medicine.mrp)}</span></td>
                      <td>
                        <span className="ph2-mini-qty">
                          <button type="button" aria-label={`Reduce ${line.medicine.medicine_name}`} disabled={locked} onClick={() => changeQuantity(line.medicine.id, line.quantity - 1)}><Minus /></button>
                          <span>{line.quantity}</span>
                          <button type="button" aria-label={`Add another ${line.medicine.medicine_name}`} disabled={locked} onClick={() => changeQuantity(line.medicine.id, line.quantity + 1)}><Plus /></button>
                        </span>
                      </td>
                      <td>
                        <span className="ph2-cart-line-total">{money(moneyNumber(line.medicine.mrp) * line.quantity)}</span>
                        <button type="button" className="ph2-cart-remove" disabled={locked} onClick={() => removeLine(line.medicine.id)}><Trash2 />Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {locked && <p className="ph2-inline-info"><Info />Your prescription is with the pharmacist. Items and quantities are locked until the request is closed.</p>}
            </section>

            {rxPanel}

            <section className="ph2-card">
              <div className="ph2-card-head"><div><h2>Delivery option</h2><p>The pharmacy confirms the delivery fee and time after you place the order.</p></div></div>
              <div className="ph2-fulfil">
                <button type="button" aria-pressed={fulfilment === 'DELIVERY'} disabled={deliveryLoading || (delivery != null && !delivery.available)} onClick={() => setFulfilment('DELIVERY')}>
                  <span><Truck /></span>
                  <span><b>Home delivery</b><small>{deliveryLoading ? 'Checking availability...' : delivery?.available ? (deliveryFee === 0 ? 'Free delivery' : `${money(delivery.fee)} by the pharmacy`) : delivery?.reason || 'Delivery not available'}</small></span>
                </button>
                <button type="button" aria-pressed={fulfilment === 'PICKUP'} onClick={() => setFulfilment('PICKUP')}>
                  <span><Store /></span>
                  <span><b>Store pickup</b><small>Free · Pick up from the pharmacy</small></span>
                </button>
              </div>
              {delivery?.hours && <p className="ph2-muted" style={{ marginTop: 8 }}>Pharmacy hours: {delivery.hours.open}–{delivery.hours.close}</p>}
              {fulfilment === 'DELIVERY' && (
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
                  {delivery?.available === false && <p className="ph2-warn" style={{ marginTop: 8 }}>{delivery.reason || 'This pharmacy does not deliver to this PIN code.'}</p>}
                  {delivery?.free_above != null && <p className="ph2-fee-note">Free delivery on orders above {money(delivery.free_above)}. The pharmacy calculates the final fee when the order is placed.</p>}
                </div>
              )}
              <p className="ph2-inline-info" style={{ marginTop: 12 }}><Info />{fulfilment === 'DELIVERY' ? 'The pharmacy will confirm the delivery time after you place the order.' : 'Show your order ID at the pharmacy counter when you collect.'}</p>
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
                <div><dt>Delivery fee ({fulfilment === 'DELIVERY' ? 'Home delivery' : 'Store pickup'})</dt><dd>{fulfilment === 'PICKUP' ? 'Free' : deliveryLoading ? 'Checking...' : delivery?.available === false ? '—' : deliveryFee === 0 ? 'Free' : money(deliveryFee)}</dd></div>
                <div className="ph2-summary-total"><dt>Total</dt><dd>{money(estimatedTotal)}</dd></div>
              </dl>
              <p className="ph2-summary-tax">Inclusive of all taxes</p>
              <p className="ph2-fee-note">The final delivery fee is calculated by the pharmacy from the confirmed order total.</p>
            </section>
            <section className="ph2-card">
              <h2>Choose payment option</h2>
              <div className="ph2-pay-options" style={{ marginTop: 12 }}>
                <button type="button" aria-pressed={payMode === 'CASH'} onClick={() => setPayMode('CASH')}>
                  <span /><span><ShieldCheck /></span>
                  <span><b>Pay on {fulfilment === 'DELIVERY' ? 'delivery' : 'pickup'}</b><small>Pay the pharmacy in cash or by UPI when you receive your order.</small></span>
                </button>
                <button type="button" aria-pressed={payMode === 'ONLINE'} onClick={() => setPayMode('ONLINE')}>
                  <span /><span><ShoppingCart /></span>
                  <span><b>Pay online now</b><small>UPI, card or net banking · secured by Razorpay.</small></span>
                </button>
              </div>
              {placeError && <p className="ph2-error" style={{ marginTop: 10 }}>{placeError}</p>}
              <button
                type="button"
                className="ph2-btn ph2-btn--primary ph2-btn--lg ph2-btn--block"
                style={{ marginTop: 12 }}
                disabled={placing || deliveryLoading || (needsRx && !quoteReady) || (fulfilment === 'DELIVERY' && (!deliveryText || !validPin(deliveryPin) || !delivery?.available))}
                onClick={() => void placeOrder()}
              >
                {placing ? 'Placing order...' : needsRx && !quoteReady ? <>Awaiting pharmacist quote</> : <>Place order · {money(estimatedTotal)} <ArrowRight /></>}
              </button>
              {needsRx && !quoteReady && (
                <p className="ph2-muted" style={{ marginTop: 8 }}>Send your prescription to the pharmacist above. You can place the order once the quote is ready.</p>
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
