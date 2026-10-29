import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CalendarDays, CheckCircle2, ChevronRight, Clock, FileText, LifeBuoy, Search, Store, Truck, XCircle,
} from 'lucide-react';
import MediaImage from '../../components/MediaImage';
import ThemedSelect from '../../components/forms/ThemedSelect';
import VizitoPagination from '../../components/navigation/VizitoPagination';
import {
  getMyOrderCountsApi, getMyOrdersGroupedPageApi, getPharmacyRequestsApi,
  type MyOrderCounts, type Paged, type PatientOrderV2,
} from '../../../services/pharmacyOrderHelper';
import { getPrescriptionsApi, getProvidersApi, type PatientPrescription } from '../../../services/patientHelper';
import { useSearchArea, formatDistance } from '../../../services/location';
import { pharmacyDistance } from './pharmacyDiscovery';
import { requestGroup } from './prescriptionRequests';
import PrescriptionRequestsList from './PrescriptionRequestsList';
import { money, orderStatusLabel, orderStatusTone, shortOrderId, dayTime } from './pharmacyV2Ui';
import type { PharmacyRequestItem, ProviderItem } from '../../../services/types';
import './PharmacyV2.css';

type OrderTab = 'all' | 'active' | 'completed' | 'cancelled';
const orderTabs: { key: OrderTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const StatusIcon = ({ order }: { order: PatientOrderV2 }) => {
  if (order.status === 'CANCELLED' || order.status === 'FULFILLMENT_FAILED') return <XCircle />;
  if (order.status === 'COMPLETED') return <CheckCircle2 />;
  if (order.status === 'AWAITING_PAYMENT' || order.status === 'CREATED') return <Clock />;
  return <CheckCircle2 />;
};

export default function PharmacyOrdersV2() {
  const [params, setParams] = useSearchParams();
  const area = useSearchArea();
  const rawTab = params.get('tab');
  const requestsMode = rawTab === 'requests';
  const tab: OrderTab = rawTab === 'active' || rawTab === 'completed' || rawTab === 'cancelled' ? rawTab : 'all';

  const [counts, setCounts] = useState<MyOrderCounts | null>(null);
  const [orders, setOrders] = useState<Paged<PatientOrderV2> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [term, setTerm] = useState(params.get('q') || '');
  const [query, setQuery] = useState(params.get('q') || '');
  const [range, setRange] = useState<'all' | '30' | '90' | '365'>('all');

  const [requests, setRequests] = useState<PharmacyRequestItem[]>([]);
  const [prescriptions, setPrescriptions] = useState<Map<string, PatientPrescription>>(new Map());
  const [pharmacies, setPharmacies] = useState<ProviderItem[]>([]);
  const [requestError, setRequestError] = useState('');
  const [requestsLoading, setRequestsLoading] = useState(true);

  const pharmacyById = useMemo(() => new Map(pharmacies.map((p) => [p.id, p])), [pharmacies]);
  const pharmacyNames = useMemo(() => new Map(pharmacies.map((p) => [p.id, p.name])), [pharmacies]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(term.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [term]);

  useEffect(() => {
    let active = true;
    getMyOrderCountsApi().then((value) => { if (active) setCounts(value); }).catch(() => { if (active) setCounts(null); });
    return () => { active = false; };
  }, []);

  const loadRequests = useCallback(async () => {
    setRequestsLoading(true); setRequestError('');
    try {
      const [rows, rx, providers] = await Promise.all([
        getPharmacyRequestsApi(),
        getPrescriptionsApi().catch(() => [] as PatientPrescription[]),
        getProvidersApi('pharmacy').catch(() => [] as ProviderItem[]),
      ]);
      setRequests(rows);
      setPrescriptions(new Map(rx.map((item) => [item.id, item])));
      setPharmacies(providers);
    } catch {
      setRequestError('Prescription requests could not be loaded. Please try again.');
    } finally {
      setRequestsLoading(false);
    }
  }, []);

  useEffect(() => { void loadRequests(); }, [loadRequests]);

  const dateFrom = useMemo(() => {
    if (range === 'all') return undefined;
    const days = Number(range);
    return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  }, [range]);

  useEffect(() => {
    if (requestsMode) { setLoading(false); return; }
    let active = true;
    setLoading(true); setError('');
    getMyOrdersGroupedPageApi({
      group: tab, page, page_size: 10, sort: 'newest',
      q: query || undefined,
      date_from: dateFrom,
    })
      .then((value) => { if (active) setOrders(value); })
      .catch(() => { if (active) { setError('Unable to load your pharmacy orders. Please try again.'); setOrders(null); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [requestsMode, tab, page, query, dateFrom]);

  const setTab = (next: string) => {
    const search = new URLSearchParams(params);
    if (next === 'all') search.delete('tab'); else search.set('tab', next);
    search.delete('q');
    setParams(search);
    setTerm(''); setQuery(''); setPage(1);
  };

  const refresh = useCallback(async () => {
    await loadRequests();
    getMyOrderCountsApi().then(setCounts).catch(() => undefined);
    if (!requestsMode) {
      getMyOrdersGroupedPageApi({ group: tab, page, page_size: 10, sort: 'newest', q: query || undefined, date_from: dateFrom })
        .then(setOrders).catch(() => undefined);
    }
  }, [loadRequests, requestsMode, tab, page, query, dateFrom]);

  const previewRequests = useMemo(
    () => requests
      .filter((request) => ['attention', 'waiting'].includes(requestGroup(request)))
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
      .slice(0, 3),
    [requests],
  );

  const requestProps = (rows: PharmacyRequestItem[], all: PharmacyRequestItem[]) => ({
    requests: rows,
    allRequests: all,
    prescriptions,
    pharmacies: pharmacyNames,
    orders: orders?.items || [],
    onRefresh: refresh,
  });

  const heading = requestsMode ? 'Prescription requests' : 'My pharmacy orders';
  const subtitle = requestsMode
    ? 'Prescription requests you have sent to pharmacies, including pharmacist quotes.'
    : 'View and track your medicine orders';

  return (
    <div className="ph2">
      <nav className="ph2-crumbs" aria-label="Breadcrumb">
        <Link to="/pharmacy-orders/new">Pharmacy</Link><ChevronRight />
        <b>{requestsMode ? 'Prescription requests' : 'My pharmacy orders'}</b>
      </nav>

      <div className="ph2-orders-head">
        <div>
          <h1>{heading}</h1>
          <p>{subtitle}</p>
        </div>
        <div className="ph2-orders-tools">
          <form className="ph2-orders-search" onSubmit={(event) => { event.preventDefault(); setQuery(term.trim()); setPage(1); }}>
            <Search />
            <input
              type="search"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder={requestsMode ? 'Search requests' : 'Search by medicine, pharmacy or order ID'}
              aria-label={requestsMode ? 'Search prescription requests' : 'Search pharmacy orders'}
            />
          </form>
          {!requestsMode && (
            <label className="ph2-orders-date">
              <CalendarDays />
              <ThemedSelect variant="menu" aria-label="Order date range" value={range} onChange={(event) => { setRange(event.target.value as typeof range); setPage(1); }}>
                <option value="all">All time</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 3 months</option>
                <option value="365">Last 12 months</option>
              </ThemedSelect>
            </label>
          )}
        </div>
      </div>

      {requestsMode ? (
        <>
          <div className="ph2-tabs" role="tablist" aria-label="Pharmacy sections">
            <button type="button" role="tab" aria-selected={false} onClick={() => setTab('all')}>Orders</button>
            <button type="button" role="tab" aria-selected onClick={() => undefined}>Prescription requests</button>
          </div>
          {requestError && <p role="alert" className="ph2-error">{requestError}</p>}
          {requestsLoading ? <div className="ph2-card"><p role="status" className="ph2-muted">Loading prescription requests...</p></div> : requests.length ? (
            <PrescriptionRequestsList {...requestProps(
              requests.filter((request) => !query || [request.id, request.beneficiary_name, request.requested_items, pharmacyNames.get(request.pharmacy_partner_id)].filter(Boolean).join(' ').toLowerCase().includes(query.toLowerCase())),
              requests,
            )} />
          ) : (
            <div className="ph2-empty">
              <FileText />
              <h3>No prescription requests yet</h3>
              <p>Add a medicine that needs a prescription and send it to a pharmacy for review.</p>
              <Link className="ph2-btn ph2-btn--primary" to="/pharmacy-orders/new">Find medicines</Link>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="ph2-tabs" role="tablist" aria-label="Pharmacy order groups">
            {orderTabs.map((item) => (
              <button key={item.key} type="button" role="tab" aria-selected={tab === item.key} onClick={() => setTab(item.key)}>
                {item.label}{counts && <span>({counts[item.key]})</span>}
              </button>
            ))}
            <button type="button" role="tab" aria-selected={false} onClick={() => setTab('requests')}>Requests{requests.length ? <span>({requests.length})</span> : null}</button>
          </div>

          {error ? (
            <div className="ph2-card ph2-orders-empty" role="alert">
              <XCircle />
              <h2>Unable to load your orders</h2>
              <p>{error}</p>
              <button type="button" className="ph2-btn ph2-btn--ghost" onClick={() => setPage((value) => value)}>Retry</button>
            </div>
          ) : loading ? (
            <div className="ph2-card"><p role="status" className="ph2-muted">Loading your pharmacy orders...</p></div>
          ) : !orders || orders.items.length === 0 ? (
            <div className="ph2-card ph2-orders-empty">
              <FileText />
              <h2>{query ? 'No orders match your search' : `No ${tab === 'all' ? '' : tab} orders yet`}</h2>
              <p>{query ? 'Try a different medicine, pharmacy or order ID. Clear the search to see every order.' : 'Order medicines from a nearby pharmacy to see them here.'}</p>
              {query ? <button type="button" className="ph2-btn ph2-btn--ghost" onClick={() => { setTerm(''); setQuery(''); setPage(1); }}>Clear search</button>
                : <Link className="ph2-btn ph2-btn--primary" to="/pharmacy-orders/new">Order medicines</Link>}
            </div>
          ) : (
            <>
              <section className="ph2-card ph2-orders-card" aria-label="Pharmacy orders">
                <table className="ph2-orders-table">
                  <thead>
                    <tr><th>Pharmacy</th><th>Order ID</th><th>Items</th><th>Total</th><th>Fulfilment</th><th>Status</th><th>Order date</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {orders.items.map((order) => {
                      const pharmacy = pharmacyById.get(order.pharmacy_partner_id);
                      const distance = pharmacy ? pharmacyDistance(pharmacy, area) : null;
                      const when = dayTime(order.created_at);
                      return (
                        <tr key={order.id}>
                          <td>
                            <div className="ph2-order-pharmacy">
                              <MediaImage kind="business" businessType="pharmacy" name={pharmacy?.name || 'Pharmacy'} src={pharmacy?.logo} />
                              <div>
                                <b>{pharmacy?.name || 'Pharmacy'}</b>
                                <small>{[pharmacy?.city, distance != null ? formatDistance(distance) : null].filter(Boolean).join(' · ') || 'Details not provided'}</small>
                              </div>
                            </div>
                          </td>
                          <td><span className="ph2-order-id">#{shortOrderId(order.id)}</span></td>
                          <td>{order.items.length} item{order.items.length === 1 ? '' : 's'}</td>
                          <td><span className="ph2-order-total"><b>{money(order.total_amount)}</b><small>incl. all taxes</small></span></td>
                          <td>
                            <span className="ph2-chip ph2-chip--slate">
                              {order.fulfillment_type === 'PICKUP' ? <Store /> : <Truck />}
                              {order.fulfillment_type === 'PICKUP' ? 'Store pickup' : 'Home delivery'}
                            </span>
                          </td>
                          <td><span className={`ph2-order-status ${orderStatusTone(order)}`}><StatusIcon order={order} />{orderStatusLabel(order)}</span></td>
                          <td><span className="ph2-order-date">{when?.day || '—'}<small>{when?.time || ''}</small></span></td>
                          <td><Link className="ph2-btn ph2-btn--ghost ph2-btn--sm" to={`/pharmacy-orders/${order.id}`}>View details</Link></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <VizitoPagination page={orders.page} pageSize={10} total={orders.total} onPageChange={setPage} onPageSizeChange={() => undefined} label="pharmacy orders" />
              </section>

              <div className="ph2-orders-foot">
                <aside className="ph2-card ph2-help">
                  <h2><LifeBuoy />Need help?</h2>
                  <p>Get help with pharmacy orders or prescriptions.</p>
                  <Link className="ph2-link" to="/help">Contact support <ChevronRight /></Link>
                </aside>
                <Link className="ph2-btn ph2-btn--primary" to="/pharmacy-orders/new">Order medicines <ChevronRight /></Link>
              </div>
            </>
          )}

          {!requestsLoading && previewRequests.length > 0 && (
            <section className="ph2-requests" aria-label="Prescription requests">
              <div className="ph2-section-head">
                <div><h2>Prescription requests</h2><p className="ph2-muted">Requests sent to pharmacies for medicines that require a prescription.</p></div>
                <Link className="ph2-link" to="/pharmacy-orders?tab=requests">View all requests <ChevronRight /></Link>
              </div>
              <PrescriptionRequestsList {...requestProps(previewRequests, requests)} />
            </section>
          )}
          {requestError && <p role="alert" className="ph2-error">{requestError}</p>}
        </>
      )}
    </div>
  );
}
