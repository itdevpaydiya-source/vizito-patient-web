import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle, Check, CheckCircle2, Clock, Copy, CreditCard, Download,
  FileText, LifeBuoy, Lock, MapPin, Phone, RotateCcw, ShieldCheck, ShoppingBag, Store, Truck, User, XCircle,
} from 'lucide-react';
import MediaImage from '../../components/MediaImage';
import VizitoDialog from '../../components/dialogs/VizitoDialog';
import {
  cancelOrderApi, getMyOrderApi, getPharmacyRequestsApi, type PatientOrderV2,
} from '../../../services/pharmacyOrderHelper';
import type { PharmacyRequestItem } from '../../../services/types';
import { getProviderDetailApi, type ProviderDetail } from '../../../services/bookingHelper';
import { paymentMethodLabel } from '../../../utils/paymentLabels';
import { usePharmacyBaskets } from '../../../services/PharmacyBasketContext';
import { printPharmacyInvoice } from './pharmacyInvoice';
import PharmacyPaymentDialog from './PharmacyPaymentDialog';
import {
  dateTime, dayTime, deliveryEtaText, errorText, money, moneyNumber, onlinePaymentNeeded,
  orderStatusLabel, orderStatusTone, paymentStateLabel, shortOrderId,
} from './pharmacyV2Ui';
import type { BasketLine } from './medicineBasket';
import './PharmacyV2.css';

const methodLabel = (order: PatientOrderV2) => {
  const method = order.payments?.[0]?.method || order.payment_method || '';
  return method ? paymentMethodLabel(method) : 'Not recorded';
};

const packText = (medicine: { packaging_type?: string | null; units_per_pack?: number | null } | null | undefined) => {
  if (!medicine) return '';
  if (medicine.packaging_type && medicine.units_per_pack) return `${medicine.packaging_type} of ${medicine.units_per_pack}`;
  if (medicine.packaging_type) return medicine.packaging_type;
  if (medicine.units_per_pack) return `Pack of ${medicine.units_per_pack}`;
  return '';
};

const strengthText = (medicine: { strength?: string | null; strength_unit?: string | null; dosage_form?: string | null } | null | undefined) => {
  if (!medicine) return '';
  const strength = [medicine.strength, medicine.strength_unit].filter(Boolean).join(' ');
  return [strength, medicine.dosage_form].filter(Boolean).join(' ');
};

const statusExplanation = (order: PatientOrderV2): string => {
  const delivery = order.fulfillment_type === 'DELIVERY';
  switch (order.status) {
    case 'CREATED': return order.payment_method === 'CASH'
      ? 'The pharmacy is confirming your order. Nothing is payable until you receive it.'
      : 'Your order is waiting for the online payment to be completed.';
    case 'AWAITING_PAYMENT': return 'Complete the payment to let the pharmacy start preparing your medicines.';
    case 'PAID': return 'The pharmacy has confirmed your order and will start packing your medicines.';
    case 'PROCESSING': return 'Your medicines are being packed and checked by the pharmacist.';
    case 'READY_FOR_PICKUP': return 'Your medicines are packed and waiting at the pharmacy counter.';
    case 'OUT_FOR_DELIVERY': return `Your medicines are on the way${order.delivery_person_name ? ` with ${order.delivery_person_name}` : ''}. Share the delivery code only when you receive the order.`;
    case 'COMPLETED': return delivery ? 'This order was delivered to you.' : 'This order was collected from the pharmacy.';
    case 'CANCELLED': return order.cancelled_by === 'SYSTEM'
      ? 'The pharmacy did not respond in time, so this order was cancelled.'
      : order.cancelled_by && order.cancelled_by !== order.patient_id
        ? 'The pharmacy cancelled this order.'
        : 'You cancelled this order.';
    case 'FULFILLMENT_FAILED': return 'The pharmacy could not fulfil this order. Any online payment is refunded.';
    default: return '';
  }
};

export default function PharmacyOrderDetailV2() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const baskets = usePharmacyBaskets();

  const [order, setOrder] = useState<PatientOrderV2 | null>(null);
  const [provider, setProvider] = useState<ProviderDetail | null>(null);
  const [request, setRequest] = useState<PharmacyRequestItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [actionError, setActionError] = useState('');
  const [placedDismissed, setPlacedDismissed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [payOpen, setPayOpen] = useState(false);

  const load = useCallback(async (background = false) => {
    if (!id) { setNotFound(true); setLoading(false); return; }
    if (!background) setLoading(true);
    setError(''); setNotFound(false);
    try {
      const row = (await getMyOrderApi(id)) as PatientOrderV2;
      setOrder(row);
      getProviderDetailApi(row.pharmacy_partner_id)
        .then((detail) => setProvider(detail))
        .catch(() => setProvider(null));
    } catch (failure) {
      const status = (failure as { response?: { status?: number } }).response?.status;
      if (status === 404) setNotFound(true);
      else setError(errorText(failure, 'Something went wrong while loading this order.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  // Prescription context: the order only stores the request id; the request holds the file/quote.
  useEffect(() => {
    if (!order?.pharmacy_request_id) { setRequest(null); return; }
    let active = true;
    getPharmacyRequestsApi()
      .then((rows) => { if (active) setRequest(rows.find((row) => row.id === order.pharmacy_request_id) || null); })
      .catch(() => { if (active) setRequest(null); });
    return () => { active = false; };
  }, [order?.pharmacy_request_id]);

  // Keep an in-flight order fresh without a manual reload.
  useEffect(() => {
    if (!order || ['COMPLETED', 'CANCELLED', 'FULFILLMENT_FAILED'].includes(order.status)) return;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void load(true);
    }, 15000);
    const focus = () => void load(true);
    window.addEventListener('focus', focus);
    return () => { clearInterval(timer); window.removeEventListener('focus', focus); };
  }, [order?.id, order?.status, load]);

  // A refund is processed by the payment provider; show the change without a page refresh.
  useEffect(() => {
    if (!order || order.payment_status !== 'REFUND_PENDING') return;
    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (cancelled) return;
      attempts += 1;
      try {
        const latest = (await getMyOrderApi(order.id)) as PatientOrderV2;
        if (cancelled) return;
        setOrder(latest);
        if (latest.payment_status === 'REFUND_PENDING' && attempts < 5) timer = setTimeout(tick, 4000);
      } catch {
        if (!cancelled && attempts < 5) timer = setTimeout(tick, 4000);
      }
    };
    timer = setTimeout(tick, 3000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [order?.id, order?.payment_status]);

  useEffect(() => {
    if (order && params.get('pay') === '1' && onlinePaymentNeeded(order)) setPayOpen(true);
  }, [order?.id, order?.status, order?.payment_status, params.get('pay')]);

  const timeline = useMemo(() => order?.timeline || [], [order?.timeline]);
  const placed = params.get('placed') === '1' && !placedDismissed;
  const delivery = order?.fulfillment_type === 'DELIVERY';
  const deliveredAt = timeline.find((step) => step.code === 'DELIVERED' || step.code === 'COLLECTED')?.occurred_at || null;
  const code = order?.pickup_code || null;
  const active = !!order && !['COMPLETED', 'CANCELLED', 'FULFILLMENT_FAILED'].includes(order.status);

  const dismissPlaced = () => {
    setPlacedDismissed(true);
    const next = new URLSearchParams(params);
    next.delete('placed');
    setParams(next, { replace: true });
  };

  const copyOrderId = async () => {
    if (!order) return;
    try {
      await navigator.clipboard.writeText(order.id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setActionError('The order ID could not be copied. Select and copy it instead.');
    }
  };

  const reorder = () => {
    if (!order) return;
    const lines = order.items.flatMap((item): BasketLine[] => {
      if (!item.medicine) return [];
      return [{
        medicine: {
          id: item.medicine.id, code: null, medicine_name: item.medicine.medicine_name,
          brand_name: null, generic_name: '', strength: item.medicine.strength || '',
          strength_unit: item.medicine.strength_unit || '', dosage_form: item.medicine.dosage_form || '',
          mrp: moneyNumber(item.medicine.mrp), requires_prescription: !!item.medicine.requires_prescription,
          image_url: item.medicine.image_url ?? null, packaging_type: item.medicine.packaging_type ?? null,
          units_per_pack: item.medicine.units_per_pack ?? null,
        },
        quantity: item.quantity,
      }];
    });
    if (!lines.length) { setActionError('These medicines are no longer listed, so the basket could not be prepared.'); return; }
    if (!baskets.updateDraft({ lines, pharmacyId: order.pharmacy_partner_id, subject: 'self' })) {
      setActionError('Your basket could not be prepared in this browser. Allow local storage and try again.');
      return;
    }
    navigate('/pharmacy-orders/new?view=cart');
  };

  const cancelOrder = async () => {
    if (!order) return;
    setCancelBusy(true); setActionError('');
    try {
      const updated = (await cancelOrderApi(order.id, cancelReason.trim() || undefined)) as PatientOrderV2;
      setOrder((current) => current ? { ...current, ...updated } : updated);
      setCancelOpen(false);
      setCancelReason('');
      void load(true);
    } catch (failure) {
      setActionError(errorText(failure, 'This order could not be cancelled.'));
    } finally {
      setCancelBusy(false);
    }
  };

  const invoice = () => {
    if (!order) return;
    try {
      printPharmacyInvoice(order, provider);
    } catch (failure) {
      setActionError(errorText(failure, 'The invoice could not be opened.'));
    }
  };

  if (loading) {
    return (
      <div className="ph2">
        <div className="ph2-card"><p role="status" className="ph2-muted">Loading your order...</p></div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="ph2">
        <nav className="ph2-crumbs" aria-label="Breadcrumb">
          <Link to="/pharmacy-orders/new">Pharmacy</Link><span aria-hidden="true">›</span>
          <Link to="/pharmacy-orders">My orders</Link>
        </nav>
        <div className="ph2-empty">
          <ShoppingBag />
          <h1>Order not found</h1>
          <p>This order may have been removed, or the link is incorrect.</p>
          <Link className="ph2-btn ph2-btn--primary" to="/pharmacy-orders">Go to my orders</Link>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="ph2">
        <div className="ph2-empty" role="alert">
          <AlertTriangle />
          <h1>Unable to load this order</h1>
          <p>{error || 'The order details could not be loaded.'}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button type="button" className="ph2-btn ph2-btn--ghost" onClick={() => void load()}>Try again</button>
            <Link className="ph2-btn ph2-btn--primary" to="/pharmacy-orders">Go to my orders</Link>
          </div>
        </div>
      </div>
    );
  }

  const orderNumber = shortOrderId(order.id);
  // delivery_address_text already ends with the PIN for saved addresses — do not repeat it.
  const addressBase = (order.delivery_address_text || '').trim();
  const addressPin = (order.delivery_pincode || '').trim();
  const address = addressBase
    ? addressPin && !addressBase.replace(/\s+/g, '').endsWith(addressPin) ? `${addressBase}, ${addressPin}` : addressBase
    : addressPin;
  const pharmacyName = provider?.business_name || 'Pharmacy';
  const pharmacyAddress = provider?.pharmacy?.address || '';
  const pharmacyPhone = provider?.pharmacy?.phone || '';

  const billRows = [
    { label: `Items total (${order.items.length} ${order.items.length === 1 ? 'item' : 'items'})`, value: money(order.subtotal_amount) },
    ...(delivery ? [{ label: 'Delivery fee', value: money(order.delivery_fee) }] : []),
    ...(Number(order.discount_amount) > 0 ? [{ label: 'Discount', value: `− ${money(order.discount_amount)}` }] : []),
  ];

  return (
    <div className="ph2">
      <nav className="ph2-crumbs" aria-label="Breadcrumb">
        <Link to="/pharmacy-orders/new">Pharmacy</Link><span aria-hidden="true">›</span>
        <Link to="/pharmacy-orders">My orders</Link><span aria-hidden="true">›</span>
        <b>Order #{orderNumber}</b>
      </nav>

      <div className="ph2-detail-head">
        <div>
          <h1>Order #{orderNumber}</h1>
          <div className="ph2-detail-status">
            <span className={`ph2-order-status ${orderStatusTone(order)}`}>
              {order.status === 'CANCELLED' || order.status === 'FULFILLMENT_FAILED' ? <XCircle />
                : order.status === 'COMPLETED' ? <CheckCircle2 />
                  : order.status === 'OUT_FOR_DELIVERY' ? <Truck />
                    : order.status === 'READY_FOR_PICKUP' ? <Store />
                      : <Clock />}
              {orderStatusLabel(order)}
            </span>
            {order.fulfillment_type === 'PICKUP'
              ? <span className="ph2-chip ph2-chip--slate"><Store />Store pickup</span>
              : <span className="ph2-chip ph2-chip--slate"><Truck />Home delivery</span>}
            {order.pharmacy_request_id && <span className="ph2-chip ph2-chip--rx"><FileText />Prescription order</span>}
          </div>
        </div>
        <Link className="ph2-btn ph2-btn--ghost" to="/help"><LifeBuoy />Help</Link>
      </div>

      {placed && active && (
        <section className="ph2-placed" aria-label="Order confirmation">
          <CheckCircle2 />
          <div>
            <b>{delivery ? 'Your home delivery order is placed' : 'Your store pickup order is placed'}</b>
            <p>
              {delivery
                ? 'The pharmacy will confirm and dispatch it. The delivery partner, expected time and delivery code appear on this page.'
                : 'The pharmacy will prepare your medicines. Your pickup code appears when the order is ready.'}
            </p>
          </div>
          <button type="button" className="ph2-btn ph2-btn--ghost ph2-btn--sm" onClick={dismissPlaced}>Dismiss</button>
        </section>
      )}

      {active && <p className="ph2-muted" style={{ marginBottom: 12 }}>{statusExplanation(order)}</p>}

      {timeline.length > 0 && (
        <section className="ph2-card ph2-timeline-card" aria-label="Order progress">
          <ol className="ph2-timeline" style={{ gridTemplateColumns: `repeat(${timeline.length}, minmax(0, 1fr))` }}>
            {timeline.map((step) => {
              const when = dayTime(step.occurred_at);
              return (
                <li
                  key={step.code}
                  className={step.state === 'completed' ? 'is-done' : step.state === 'current' ? 'is-current' : undefined}
                  aria-current={step.state === 'current' ? 'step' : undefined}
                >
                  <span className="ph2-timeline-dot">
                    {step.state === 'completed' ? <Check /> : step.state === 'current' ? <Clock /> : null}
                  </span>
                  <b>{step.label}</b>
                  <time dateTime={step.occurred_at || undefined} className={when ? undefined : 'is-empty'}>
                    {when ? when.day : '—'}<br />{when?.time || '\u00a0'}
                  </time>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {delivery ? (
        <section className="ph2-card ph2-partner" aria-label="Delivery details">
          <span className="ph2-partner-avatar" aria-hidden="true">
            {order.delivery_person_name ? <User /> : <Truck />}
          </span>
          <div>
            <h2>{order.delivery_person_name || (order.status === 'COMPLETED' ? 'Delivered' : 'Delivery partner')}</h2>
            <p>
              {order.delivery_person_name
                ? 'Delivery partner'
                : order.status === 'COMPLETED'
                  ? `Delivered${deliveredAt ? ` on ${dateTime(deliveredAt)}` : ''}`
                  : 'Assigned when the pharmacy dispatches your order'}
            </p>
          </div>
          {order.delivery_person_phone
            ? <a className="ph2-btn ph2-btn--soft" href={`tel:${order.delivery_person_phone}`}><Phone />Call</a>
            : <span className="ph2-muted">Phone not provided</span>}
          <div className="ph2-partner-block">
            <Clock />
            <div>
              <b>Expected delivery</b>
              <strong>{order.delivery_eta ? deliveryEtaText(order.delivery_eta) : deliveredAt ? 'Delivered' : 'After dispatch'}</strong>
              <small>{deliveredAt ? dateTime(deliveredAt) : order.delivery_eta ? dateTime(order.delivery_eta) : 'The pharmacy sets this when dispatching'}</small>
            </div>
          </div>
          <div className="ph2-partner-block">
            <Lock />
            <div>
              <b>Delivery code</b>
              <strong className={code ? 'ph2-delivery-code' : undefined}>{code || '—'}</strong>
              <small>{code ? 'Share this with the delivery partner at handover' : active ? 'Appears when your order is out for delivery' : 'Not available for this order'}</small>
            </div>
          </div>
        </section>
      ) : (
        <section className="ph2-card ph2-partner" aria-label="Pickup details">
          <span className="ph2-partner-avatar" aria-hidden="true"><Store /></span>
          <div>
            <h2>{pharmacyName}</h2>
            <p>{pharmacyAddress || 'Collect from the pharmacy counter'}</p>
          </div>
          {pharmacyPhone
            ? <a className="ph2-btn ph2-btn--soft" href={`tel:${pharmacyPhone}`}><Phone />Call</a>
            : <span className="ph2-muted">Phone not provided</span>}
          <div className="ph2-partner-block">
            <MapPin />
            <div>
              <b>Store pickup</b>
              <strong>{order.status === 'COMPLETED' ? 'Collected' : order.status === 'READY_FOR_PICKUP' ? 'Ready now' : ['CANCELLED', 'FULFILLMENT_FAILED'].includes(order.status) ? 'Cancelled' : 'Being prepared'}</strong>
              <small>{deliveredAt ? dateTime(deliveredAt) : order.status === 'READY_FOR_PICKUP' ? 'Waiting at the pharmacy counter' : active ? 'The pharmacy is preparing your medicines' : 'This order will not be collected'}</small>
            </div>
          </div>
          {(code || active) && (
            <div className="ph2-partner-block">
              <Lock />
              <div>
                <b>Pickup code</b>
                <strong className={code ? 'ph2-delivery-code' : undefined}>{code || '—'}</strong>
                <small>{code ? 'Show this code at the counter' : 'Appears when the order is ready'}</small>
              </div>
            </div>
          )}
        </section>
      )}

      <div className="ph2-detail-grid">
        <div className="ph2-detail-main">
          <section className="ph2-card" aria-label="Items in your order">
            <div className="ph2-card-head">
              <div><h2>Items in your order</h2><p>{order.items.length} {order.items.length === 1 ? 'item' : 'items'} from {pharmacyName}</p></div>
            </div>
            <div className="ph2-item-list">
              {order.items.map((item) => {
                const medicine = item.medicine;
                const detail = [strengthText(medicine), packText(medicine)].filter(Boolean).join(' · ');
                return (
                  <div className="ph2-item" key={item.id}>
                    <MediaImage kind="medicine" category={medicine?.dosage_form} src={medicine?.image_url} name={medicine?.medicine_name || 'Medicine'} />
                    <div>
                      <b>{medicine?.medicine_name || 'Unnamed item'}</b>
                      <small>{detail || 'Medicine'}</small>
                      {medicine?.requires_prescription && <span className="ph2-chip ph2-chip--rx" style={{ marginTop: 4 }}><FileText />Prescription required</span>}
                    </div>
                    <span className="ph2-item-qty">Qty: {item.quantity}</span>
                    <span className="ph2-item-amount">{money(item.subtotal)}</span>
                  </div>
                );
              })}
            </div>

            {order.pharmacy_request_id && (
              <div className="ph2-rx-strip">
                <FileText />
                <div>
                  <b>Prescription attached</b>
                  <small>
                    {request?.document_id
                      ? `Uploaded prescription${request.created_at ? ` · ${dateTime(request.created_at)}` : ''}`
                      : request?.prescription_id
                        ? 'Doctor prescription reviewed by the pharmacist'
                        : 'Verified by the pharmacy for this order'}
                  </small>
                </div>
                <Link className="ph2-link" to="/pharmacy-orders?tab=requests">View request</Link>
              </div>
            )}
            {request?.quote_note && <p className="ph2-muted" style={{ marginTop: 10 }}>Pharmacist note: {request.quote_note}</p>}
          </section>

          <section className="ph2-card" aria-label="Order information">
            <div className="ph2-card-head"><div><h2>Order information</h2></div></div>
            <dl className="ph2-info-rows">
              <div>
                <dt>Order ID</dt>
                <dd><span className="ph2-mono">{order.id}</span> <button type="button" className="ph2-copy" onClick={() => void copyOrderId()}><Copy />{copied ? 'Copied' : 'Copy'}</button></dd>
              </div>
              <div><dt>Ordered on</dt><dd>{dateTime(order.created_at) || 'Not provided'}</dd></div>
              <div><dt>Order type</dt><dd>{delivery ? 'Home delivery' : 'Store pickup'}</dd></div>
              {delivery && <div><dt>Delivery address</dt><dd>{address || 'Address not provided'}</dd></div>}
              {!delivery && pharmacyAddress && <div><dt>Pharmacy</dt><dd>{pharmacyAddress}</dd></div>}
              {request?.beneficiary_name && <div><dt>Patient</dt><dd>{request.beneficiary_name}</dd></div>}
            </dl>
          </section>

          {order.status === 'CANCELLED' && (
            <section className="ph2-card" aria-label="Cancellation">
              <div className="ph2-card-head"><div><h2>Cancellation</h2></div></div>
              <p className="ph2-muted">{statusExplanation(order)}</p>
              {order.cancel_refund_note && order.payment_status === 'PAID' && <p className="ph2-warn" style={{ marginTop: 8 }}>{order.cancel_refund_note}</p>}
              {order.cancellation_reason && <p className="ph2-muted" style={{ marginTop: 8 }}>Reason: {order.cancellation_reason}</p>}
            </section>
          )}
        </div>

        <aside className="ph2-detail-side">
          <section className="ph2-card ph2-bill" aria-label="Bill summary">
            <h2>Bill summary</h2>
            <dl style={{ marginTop: 12 }}>
              {billRows.map((row) => <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}
              <div className="ph2-bill-total">
                <dt>{order.payment_status === 'PAID' ? 'Total paid' : 'Total payable'}</dt>
                <dd>{money(order.total_amount)}</dd>
              </div>
            </dl>
            <p className="ph2-bill-tax">Inclusive of all taxes</p>

            <div className="ph2-pay-method">
              {order.payment_status === 'PAID' ? <CheckCircle2 /> : order.payment_status === 'REFUNDED' ? <RotateCcw /> : order.payment_status === 'REFUND_PENDING' ? <Clock /> : <CreditCard />}
              <span>
                {paymentStateLabel(order)}
                {order.payment_status === 'PAID' && ` · ${methodLabel(order)}`}
              </span>
            </div>

            {order.payment_status === 'REFUND_PENDING' && (
              <p className="ph2-warn" style={{ marginTop: 10 }}>
                {money(order.total_amount)} is being refunded to {methodLabel(order)}. Refunds usually appear within 5–7 working days.
              </p>
            )}
            {order.payment_status === 'REFUNDED' && (
              <p className="ph2-ok" style={{ marginTop: 10 }}>
                {money(order.total_amount)} was refunded to {methodLabel(order)}{order.refunded_at ? ` on ${dateTime(order.refunded_at)}` : ''}.
              </p>
            )}
            {order.payment_method === 'CASH' && order.payment_status === 'PENDING' && active && (
              <p className="ph2-muted" style={{ marginTop: 8 }}>Pay {money(order.total_amount)} when you {delivery ? 'receive the order' : 'collect it'}.</p>
            )}
            {order.payment_status === 'PAID' && !order.invoice_number && (
              <p className="ph2-muted" style={{ marginTop: 8 }}>Invoice available after the pharmacy settles the sale.</p>
            )}
          </section>

          <section className="ph2-card" aria-label="Order actions">
            <div className="ph2-detail-actions">
              {onlinePaymentNeeded(order) && (
                <button type="button" className="ph2-btn ph2-btn--primary" onClick={() => setPayOpen(true)}>
                  <CreditCard />Pay now · {money(order.total_amount)}
                </button>
              )}
              {order.payment_status === 'PAID' && order.invoice_number && (
                <button type="button" className="ph2-btn ph2-btn--ghost" onClick={invoice}>
                  <Download />Download invoice
                </button>
              )}
              <button type="button" className="ph2-btn ph2-btn--soft" disabled={!baskets.draftReady} onClick={reorder}>
                <RotateCcw />Order again
              </button>
              {active && order.can_cancel === true && (
                <button type="button" className="ph2-btn ph2-btn--danger" onClick={() => setCancelOpen(true)}>
                  <XCircle />Cancel order{order.status === 'PAID' || order.status === 'CREATED' || order.status === 'AWAITING_PAYMENT' ? ' · before packing' : ''}
                </button>
              )}
              {active && order.can_cancel !== true && order.cancel_unavailable_reason && (
                <p className="ph2-muted">{order.cancel_unavailable_reason}</p>
              )}
              {order.can_cancel === true && (
                <p className="ph2-fee-note">
                  {order.payment_status === 'PAID'
                    ? 'Cancelling a paid order starts a refund to the original payment method.'
                    : 'You can cancel until the pharmacy starts packing your order.'}
                </p>
              )}
              <Link className="ph2-btn ph2-btn--ghost" to="/help"><LifeBuoy />Need help?</Link>
            </div>
            {actionError && <p role="alert" className="ph2-error" style={{ marginTop: 10 }}>{actionError}</p>}
          </section>

          <section className="ph2-card" aria-label="Pharmacy details">
            <div className="ph2-card-head"><div><h2>{pharmacyName}</h2></div></div>
            <div className="ph2-order-pharmacy">
              <MediaImage kind="business" businessType="pharmacy" name={pharmacyName} src={provider?.image_url} />
              <div>
                <b>{pharmacyName}</b>
                <small>{pharmacyAddress || 'Address not provided'}</small>
                {pharmacyPhone && <small>Phone: {pharmacyPhone}</small>}
              </div>
            </div>
            <p className="ph2-fee-note" style={{ marginTop: 8 }}>
              <ShieldCheck style={{ width: 12, height: 12, verticalAlign: '-2px' }} /> Licensed pharmacy listed on Vizito.{' '}
              {provider?.pharmacy?.license_number ? `Licence ${provider.pharmacy.license_number}.` : 'Licence details available at the pharmacy.'}
            </p>
          </section>
        </aside>
      </div>

      {cancelOpen && (
        <VizitoDialog
          title="Cancel this order?"
          className="ph2-dialog"
          onClose={() => { if (!cancelBusy) setCancelOpen(false); }}
          footer={<div className="ph2-dialog-actions">
            <button type="button" className="ph2-btn ph2-btn--ghost" autoFocus disabled={cancelBusy} onClick={() => setCancelOpen(false)}>Keep order</button>
            <button type="button" className="ph2-btn ph2-btn--danger" disabled={cancelBusy} onClick={() => void cancelOrder()}>
              {cancelBusy ? 'Cancelling...' : 'Cancel order'}
            </button>
          </div>}
        >
          <p>The pharmacy will be notified and stop preparing this order.</p>
          {order.payment_status === 'PAID' && (
            <p>{money(order.total_amount)} will be refunded to {methodLabel(order)}. Refunds usually appear within 5–7 working days.</p>
          )}
          <label>
            Reason (optional)
            <textarea rows={2} maxLength={500} value={cancelReason} disabled={cancelBusy} onChange={(event) => setCancelReason(event.target.value)} />
          </label>
          {actionError && <p role="alert" className="ph2-error">{actionError}</p>}
        </VizitoDialog>
      )}

      {payOpen && (
        <PharmacyPaymentDialog
          order={order}
          onClose={() => setPayOpen(false)}
          onPaid={() => { setPayOpen(false); void load(true); }}
        />
      )}
    </div>
  );
}
