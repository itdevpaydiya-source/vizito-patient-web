export { PharmacyOrdersPage as default } from "./PharmacyOrderPages";
import PrescriptionRequestsList from './PrescriptionRequestsList';
import PharmacyWorkflowTabs, { pharmacyTabParams } from './PharmacyWorkflowTabs';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import RateBox from '../../components/RateBox';
import apiClient from '../../../services';
import {ENDPOINTS} from '../../../services/endpoints';
import {ratePharmacyOrderApi} from '../../../services/pharmacyOrderHelper';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Clock, AlertCircle, RotateCcw, ChevronRight, Plus, XCircle, CheckCircle2, Truck, Store, Stethoscope, Search, CalendarDays, ArrowDownWideNarrow, ShoppingCart, LifeBuoy, FileText } from 'lucide-react';
import { getMyOrdersApi } from '../../../services/pharmacyOrderHelper';
import { getPharmacyRequestsApi } from '../../../services/pharmacyOrderHelper';
import { getPrescriptionsApi, getProvidersApi, type PatientPrescription } from '../../../services/patientHelper';
import { orderEndedBy, type PatientOrder, type PharmacyRequestItem, type OrderStatus } from '../../../services/types';

import { orderGroup, orderAction, orderAmount, orderListStatus, paymentSummary, inDateRange, canPayOrder, statusesForGroup, canRateOrder, reorderRoute, orderEmptyState, type OrderGroup } from './pharmacyOrderList';

type Tab = 'orders' | 'requests';

const orderStatusMeta: Record<OrderStatus, { label: string; className: string }> = {
  CREATED: { label: 'Awaiting confirmation', className: 'bg-slate-100 text-slate-600' },
  AWAITING_PAYMENT: { label: 'Payment required', className: 'bg-amber-50 text-amber-700' },
  PAID: { label: 'Awaiting pharmacy', className: 'bg-sky-50 text-sky-700' },
  PROCESSING: { label: 'Pharmacy is preparing your order', className: 'bg-amber-50 text-amber-700' },
  READY_FOR_PICKUP: { label: 'Ready for pickup', className: 'bg-emerald-50 text-emerald-700' },
  OUT_FOR_DELIVERY: { label: 'Out for delivery', className: 'bg-emerald-50 text-emerald-700' },
  COMPLETED: { label: 'Completed', className: 'bg-slate-100 text-slate-500' },
  CANCELLED: { label: 'Cancelled', className: 'bg-rose-50 text-rose-600' },
  FULFILLMENT_FAILED: { label: 'Could not be fulfilled', className: 'bg-rose-50 text-rose-600' },
};

const requestStatusMeta: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  Requested: { label: 'Waiting for pharmacy', className: 'bg-amber-50 text-amber-700', icon: Clock },
  Accepted: { label: 'Accepted — build your order', className: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
  Rejected: { label: 'Declined by pharmacy', className: 'bg-rose-50 text-rose-600', icon: XCircle },
  Expired: { label: 'No response in time', className: 'bg-slate-100 text-slate-500', icon: Clock },
  Cancelled: { label: 'Cancelled', className: 'bg-slate-100 text-slate-500', icon: XCircle },
};

export function PrescriptionRequestsScreen() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion() ?? false;
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: Tab = searchParams.get('tab') === 'requests' ? 'requests' : 'orders';

  const [reviews,setReviews]=useState<Record<string,unknown>|null>(null);
  const [reviewError,setReviewError]=useState(false);
  const [ratingOrder,setRatingOrder]=useState<PatientOrder|null>(null);
  const [filtersOpen,setFiltersOpen]=useState(false);
  const loadReviews=useCallback(async()=>{setReviewError(false);setReviews(null);try{const response=await apiClient.get(ENDPOINTS.PATIENTS.REVIEWS);const rows=response?.data?.data;if(!Array.isArray(rows))throw new Error('Invalid rating response');const result:Record<string,unknown>={};for(const row of rows){if(!row||typeof row!=='object')throw new Error('Invalid review');if(typeof row.booking_id==='string'&&row.booking_id)result[row.booking_id]=row;}setReviews(result);}catch{setReviewError(true);}},[]);
  useEffect(()=>{void loadReviews();},[loadReviews]);
  const [orders, setOrders] = useState<PatientOrder[]>([]);
  const [requests, setRequests] = useState<PharmacyRequestItem[]>([]);
  // A bare request row only carries prescription_id/pharmacy_partner_id — with several
  // pending requests, every card looked identical (status + a generic pill icon, nothing
  // to tell them apart). Resolved once here so each card can show the real medicine(s)
  // and pharmacy name instead.
  const [prescriptionsById, setPrescriptionsById] = useState<Map<string, PatientPrescription>>(new Map());
  const [availablePharmacies,setAvailablePharmacies]=useState<Set<string>>(new Set());
  const [pharmacyNameById, setPharmacyNameById] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<'all' | '30' | '90' | '365' | 'year' | 'custom'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [visibleCount, setVisibleCount] = useState(8);
  const group: OrderGroup = searchParams.get('tab') === 'completed' ? 'completed' : searchParams.get('tab') === 'cancelled' ? 'cancelled' : 'active';
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  useEffect(() => { setVisibleCount(8); }, [tab, group, searchTerm, statusFilter, dateFilter, fromDate, toDate, sortOrder]);


  useEffect(()=>{if(statusFilter!=='all' && !(tab==='orders' ? statusesForGroup(group).some(status=>status===statusFilter) : Object.keys(requestStatusMeta).includes(statusFilter)))setStatusFilter('all');},[tab,group,statusFilter]);
  const clearFilters=()=>{setSearchTerm('');setStatusFilter('all');setDateFilter('all');setFromDate('');setToDate('');setSortOrder('newest');};
  const categoryCount=orders.filter(o=>orderGroup(o)===group).length;
  const empty=orderEmptyState(group,categoryCount);
  const selectedFilters=[statusFilter!=='all'?statusFilter.replaceAll('_',' '):null,dateFilter!=='all'?(dateFilter==='custom'?`${fromDate||'Any start'} to ${toDate||'Any end'}`:dateFilter==='year'?'This year':`Last ${dateFilter} days`):null,sortOrder==='oldest'?'Oldest first':null].filter(Boolean);
  const load = useCallback(async (background = false) => {
    if (!background) setLoading(true); setError(null);
    try {
      const [o, r, prescriptions, pharmacies] = await Promise.all([
        getMyOrdersApi(),
        getPharmacyRequestsApi(),
        getPrescriptionsApi().catch(() => []),
        getProvidersApi('pharmacy').catch(() => []),
      ]);
      setOrders(o);
      setRequests(r);
      setPrescriptionsById(new Map(prescriptions.map((p) => [p.id, p])));
      setAvailablePharmacies(new Set(pharmacies.filter(p=>!p.pause).map(p=>p.id)));
      setPharmacyNameById(new Map(pharmacies.map((p) => [p.id, p.name])));
    } catch {
      setError('Unable to load pharmacy orders and prescription requests. Please try again.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setTab = (t: Tab) => { setStatusFilter('all'); setSearchParams(pharmacyTabParams(searchParams, t)); };

  const filteredOrders = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return orders.filter((order) => {
      if (orderGroup(order) !== group) return false;
      const status = order.status;
      const search = [order.id, '#'+order.id.slice(0,8), pharmacyNameById.get(order.pharmacy_partner_id), ...(order.items || []).map((item) => item.medicine?.medicine_name)].filter(Boolean).join(' ').toLowerCase();
      if (q && !search.includes(q)) return false;
      if (statusFilter !== 'all' && status !== statusFilter) return false;
      if (!inDateRange(order.created_at, dateFilter, fromDate, toDate)) return false;
      return true;
    }).sort((a, b) => sortOrder === 'newest' ? new Date(b.created_at).getTime()-new Date(a.created_at).getTime() : new Date(a.created_at).getTime()-new Date(b.created_at).getTime());
  }, [orders, pharmacyNameById, searchTerm, statusFilter, dateFilter, sortOrder, group, fromDate, toDate]);
  const filteredRequests = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return requests.filter((request) => {
      const prescription = prescriptionsById.get(request.prescription_id);
      const search = [request.id, pharmacyNameById.get(request.pharmacy_partner_id), prescription?.prescription_number, prescription?.diagnosis, prescription?.doctor?.name, ...(prescription?.medicines || []).map((medicine) => medicine.name)].filter(Boolean).join(' ').toLowerCase();
      if (q && !search.includes(q)) return false;
      if (statusFilter !== 'all' && request.status !== statusFilter) return false;
      if (!inDateRange(request.created_at, dateFilter, fromDate, toDate)) return false;
      return true;
    }).sort((a, b) => sortOrder === 'newest' ? new Date(b.created_at).getTime()-new Date(a.created_at).getTime() : new Date(a.created_at).getTime()-new Date(b.created_at).getTime());
  }, [requests, prescriptionsById, pharmacyNameById, searchTerm, statusFilter, dateFilter, sortOrder, group, fromDate, toDate]);

  const filterControls = <>
        <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2"><select aria-label="Filter by order status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"><option value="all">All statuses</option>{(tab === 'orders' ? statusesForGroup(group) : ['Requested','Accepted','Rejected','Cancelled','Expired']).map((value) => <option key={value} value={value}>{tab === 'orders' ? orderStatusMeta[value as OrderStatus]?.label || value : requestStatusMeta[value]?.label || value}</option>)}</select>
          <label className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-slate-400" /><span className="sr-only">Filter by date range</span><select aria-label="Filter by date range" value={dateFilter} onChange={(event) => setDateFilter(event.target.value as typeof dateFilter)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"><option value="all">Any date</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="365">Last 12 months</option><option value="year">This year</option><option value="custom">Custom range</option></select></label></div>
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600"><ArrowDownWideNarrow className="h-4 w-4 text-slate-400" />Sort by<span className="sr-only">Sort orders</span><select aria-label="Sort orders" value={sortOrder} onChange={(event) => setSortOrder(event.target.value as typeof sortOrder)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
        </div>
        {dateFilter === 'custom' && <div className="mt-3 flex flex-wrap gap-3 text-xs"><label>From <input type="date" aria-label="From date" value={fromDate} onChange={e=>setFromDate(e.target.value)} className="rounded-lg border border-slate-200 p-2" /></label><label>To <input type="date" aria-label="To date" value={toDate} onChange={e=>setToDate(e.target.value)} className="rounded-lg border border-slate-200 p-2" /></label>{fromDate && toDate && fromDate>toDate && <p role="alert" className="text-rose-700">Choose an end date on or after the start date.</p>}</div>}
  </>;

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.28, ease: 'easeOut' }}
      className="space-y-6 pb-12"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-orange-800 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-600" /> Medication care
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{tab==='requests'?'Prescription requests':'Pharmacy orders'}</h1>
          <p className="text-slate-500 mt-1 text-sm">{tab==='requests'?'Send prescriptions to pharmacies and review their responses.':'Track your medicines, payments and pharmacy updates.'}</p>
        </div>
        <button
          onClick={() => navigate(tab==='requests'?'/my-records':'/pharmacy-orders/new')}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-800 hover:bg-orange-900 text-white font-bold text-xs shrink-0 shadow-sm motion-safe:transition-all motion-safe:duration-200 motion-reduce:transition-none hover:shadow-md active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" /> {tab==='requests'?'Send a prescription':'Place an order'}
        </button>
      </div>

      <div className="space-y-3">
        <PharmacyWorkflowTabs selected={tab} onSelect={setTab} orderCount={!loading && !error ? orders.length : undefined} requestCount={!loading && !error ? requests.length : undefined} />
        {tab === 'orders' && <div className="flex flex-nowrap items-center gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-100/80 p-1.5" role="group" aria-label="Pharmacy order category">
          {(['active','completed','cancelled'] as const).map(g => <button key={g} type="button" aria-pressed={group === g} onClick={() => {setStatusFilter('all');setSearchParams(pharmacyTabParams(searchParams, g));}} className={`flex-1 shrink-0 whitespace-nowrap rounded-xl px-2 py-3 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2 sm:text-sm ${group === g ? 'bg-white text-orange-800 shadow-sm' : 'text-slate-600'}`}>{g[0].toUpperCase()+g.slice(1)} {!loading && !error && <span>({orders.filter(o=>orderGroup(o)===g).length})</span>}</button>)}
        </div>}
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_230px]">
      <section role="tabpanel" id={`pharmacy-panel-${tab}`} aria-labelledby={`pharmacy-tab-${tab}`} className="min-w-0 space-y-3" aria-label={tab === 'orders' ? 'My pharmacy orders' : 'Prescription requests'}>
      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4" aria-label="Search and filter orders">
        <label className="relative block"><Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder={tab==='requests'?'Search medicine, doctor, pharmacy or request ID...':'Search by medicine, pharmacy, order ID or reference...'} aria-label={tab==='requests'?'Search prescription requests':'Search pharmacy orders'} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100" /></label>
        <div className="mt-3 flex flex-wrap items-center gap-3"><button type="button" onClick={()=>setFiltersOpen(true)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-orange-500">Filters{selectedFilters.length ? ` (${selectedFilters.length})` : ''}</button>{selectedFilters.map(value=><span key={value} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{value}</span>)}{(selectedFilters.length>0||searchTerm) && <button type="button" onClick={clearFilters} className="text-xs font-semibold text-orange-800 underline">Clear filters</button>}</div>
        <ListDialog open={filtersOpen} onClose={()=>setFiltersOpen(false)} title={tab==='requests'?'Filter prescription requests':'Filter pharmacy orders'}>{filterControls}<div className="mt-4 flex justify-between gap-3"><button type="button" onClick={clearFilters} className="text-sm font-semibold text-orange-800 underline">Clear filters</button><button type="button" onClick={()=>setFiltersOpen(false)} className="rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white">Show results</button></div></ListDialog>
      </section>
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-20 text-center shadow-xs">
          <div className="w-7 h-7 border-[3px] border-orange-700 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 font-medium text-sm">Loading...</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-20 text-center shadow-xs space-y-3">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <p className="text-rose-600 font-semibold text-sm">{error}</p>
          <button onClick={()=>void load()} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl">
            <RotateCcw className="w-4 h-4" /> Retry
          </button>
        </div>
      ) : tab === 'orders' ? (
        filteredOrders.length === 0 ? (
          <EmptyState
            title={empty.title}
            body={empty.body}
            action={{label:empty.action,onClick:categoryCount?clearFilters:()=>navigate('/pharmacy-orders/new')}}
          />
        ) : (
          <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2" aria-label="Order cards">
            {filteredOrders.slice(0, visibleCount).map((o) => {
              const ended = orderEndedBy(o);
              const meta = ended === 'pharmacy' ? { label: 'Declined by pharmacy', className: 'bg-rose-50 text-rose-600' }
                : ended === 'no-answer' ? { label: "Pharmacy didn't respond", className: 'bg-rose-50 text-rose-600' }
                : orderStatusMeta[o.status] || { label: o.status, className: 'bg-slate-100 text-slate-600' };
              const [firstItem, ...restItems] = o.items || [];
              const medicineSummary = firstItem
                ? `${firstItem.medicine?.medicine_name || 'Unnamed item'}${restItems.length > 0 ? ` +${restItems.length} more` : ''}`
                : 'No items';
              const pharmacyName = pharmacyNameById.get(o.pharmacy_partner_id) || 'Pharmacy details not provided';
              const fulfillmentLabel = o.fulfillment_type === 'DELIVERY' ? 'Delivery' : 'Pickup';
              return (
                <article
                  key={o.id}
                  className="group flex h-full min-w-0 flex-col text-left bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 hover:border-orange-200 hover:shadow-md motion-safe:transition-[border-color,box-shadow] motion-safe:duration-200 motion-reduce:transition-none"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-orange-50 border border-orange-100 text-orange-800 flex items-center justify-center shrink-0">
                        {o.fulfillment_type === 'DELIVERY' ? <Truck className="w-5 h-5" /> : <Store className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Order #{String(o.id).slice(0, 8).toUpperCase()}</p>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">{new Date(o.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour:'numeric', minute:'2-digit' })}</p>
                      </div>
                    </div>
                    <span className={`max-w-[48%] text-right text-[10px] leading-4 font-bold px-2.5 py-1.5 rounded-xl ${canPayOrder(o) ? 'bg-amber-50 text-amber-800' : meta.className}`}>{orderListStatus(o)}</span>
                  </div>
                  <div className="mt-3 min-w-0">
                    <h3 className="font-extrabold text-slate-900 text-base leading-5 line-clamp-2">{medicineSummary}</h3>
                    <p className="text-xs text-slate-500 mt-1">{(o.items || []).length} {(o.items || []).length === 1 ? 'medicine' : 'medicines'}</p>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Pharmacy</p>
                      <p className="text-xs font-bold text-slate-800 truncate mt-0.5">{pharmacyName}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Fulfillment</p>
                      <p className="text-xs font-bold text-slate-800 flex items-center gap-1 mt-0.5">{o.fulfillment_type === 'DELIVERY' ? <Truck className="w-3.5 h-3.5 text-orange-700" /> : <Store className="w-3.5 h-3.5 text-orange-700" />}{fulfillmentLabel}</p>
                    </div>
                  </div>
                  {paymentSummary(o) && paymentSummary(o) !== orderListStatus(o) && <p className="mt-3 text-xs leading-relaxed text-slate-600">{paymentSummary(o)}</p>}
                  <div className="mt-auto pt-4 flex flex-wrap items-center justify-between gap-3">
                    <div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Order total</p><p className="mt-0.5 text-lg font-black text-slate-900">{orderAmount(o.total_amount)}</p></div>
                    {o.status==='COMPLETED' && <div className="flex flex-wrap gap-2"><button type="button" disabled={!availablePharmacies.has(o.pharmacy_partner_id)} title={!availablePharmacies.has(o.pharmacy_partner_id)?'Pharmacy availability not confirmed. Choose another pharmacy or refresh the list.':undefined} onClick={()=>navigate(reorderRoute(o))} className="rounded-xl border border-orange-200 px-3 py-2 text-xs font-bold text-orange-800 disabled:opacity-50 disabled:cursor-not-allowed">Reorder</button>{!availablePharmacies.has(o.pharmacy_partner_id) && <span className="self-center text-xs text-slate-500">Pharmacy availability not confirmed</span>}{canRateOrder(o,reviews) && <button type="button" onClick={()=>setRatingOrder(o)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold">Rate order</button>}{reviews && Object.prototype.hasOwnProperty.call(reviews,o.id) && <span className="self-center text-xs text-slate-500">Rated</span>}</div>}
                    <button type="button" onClick={() => navigate(`/pharmacy-orders/${o.id}`)} className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold ${canPayOrder(o) ? 'border-orange-600 bg-orange-600 text-white' : 'border-orange-200 text-orange-800'}`}>{orderAction(o)} <ChevronRight className="h-4 w-4" /></button>
                  </div>
                </article>
              );
            })}
          </div>
        )
      ) : filteredRequests.length === 0 ? (
        <EmptyState
          title={requests.length ? 'No matching requests' : 'No pharmacy requests yet'}
          body={requests.length ? 'Try changing your search or filters.' : 'Send one of your prescriptions to a pharmacy from Medical Records to get started.'}
          action={{label:requests.length?'Clear filters':'View prescriptions',onClick:requests.length?clearFilters:()=>navigate('/my-records')}}
        />
      ) : (
        <PrescriptionRequestsList key={`${searchTerm}:${statusFilter}:${dateFilter}:${fromDate}:${toDate}:${sortOrder}`} requests={filteredRequests} allRequests={requests} prescriptions={prescriptionsById} pharmacies={pharmacyNameById} orders={orders} onRefresh={()=>load(true)} />
      )}
      {tab==='orders' && group==='completed' && reviewError && <p role="status" className="text-xs text-slate-500">Rating availability could not be checked. <button type="button" onClick={()=>void loadReviews()} className="font-semibold text-orange-800 underline">Retry rating check</button></p>}
      {!loading && !error && tab === 'orders' && filteredOrders.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-500" aria-live="polite"><span>Showing {Math.min(visibleCount,filteredOrders.length)} of {filteredOrders.length} {group} orders</span>{visibleCount < filteredOrders.length && <button type="button" onClick={()=>setVisibleCount(n=>n+8)} className="font-semibold text-orange-800">Load more orders</button>}</div>}
      </section>
      <aside className="space-y-3" aria-label="Pharmacy order guidance">
        <section className="rounded-2xl border border-slate-200 bg-white/70 p-4"><h2 className="flex items-center gap-2 text-sm font-bold"><LifeBuoy className="h-4 w-4 text-[#009b89]" />Need help?</h2><p className="mt-2 text-xs leading-relaxed text-slate-500">Get help with pharmacy orders or prescriptions.</p><button type="button" onClick={()=>navigate('/help')} className="mt-3 text-xs font-semibold text-orange-800 underline">Contact support</button></section>
      </aside>
      </div>
      <ListDialog open={!!ratingOrder} onClose={()=>setRatingOrder(null)} title="Rate order">{ratingOrder && <RateBox key={ratingOrder.id} kind="pharmacy" what="this order" onSubmit={async(r,t,g)=>{try{await ratePharmacyOrderApi(ratingOrder.id,r,t,g);setReviews(prev=>({...prev,[ratingOrder.id]:{rating:r}}));}catch(error){void loadReviews();throw error;}}} />}</ListDialog>

    </motion.div>
  );
}

export const EmptyState: React.FC<{ title: string; body: string; action?: {label:string;onClick:()=>void} }> = ({ title, body, action }) => <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center"><span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-teal-50 text-teal-700"><FileText aria-hidden="true" className="h-8 w-8" /></span><h3 className="text-base font-extrabold text-slate-800">{title}</h3><p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{body}</p>{action && <button type="button" onClick={action.onClick} className="mt-5 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2">{action.label}</button>}</div>;

function ListDialog({open,onClose,title,children}:{open:boolean;onClose:()=>void;title:string;children:React.ReactNode}) {
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{if(!open||!ref.current)return;const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;const node=ref.current;node.showModal();return()=>{node.close();previous?.focus({preventScroll:true});};},[open]);
 return <dialog ref={ref} aria-label={title} onCancel={e=>{e.preventDefault();onClose();}} className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[90dvh] w-full max-w-none overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-4 text-[#101d48] shadow-xl backdrop:bg-slate-900/40 sm:inset-0 sm:m-auto sm:max-w-xl sm:rounded-2xl"><header className="flex items-center justify-between gap-3"><h2 className="font-bold">{title}</h2><button type="button" onClick={onClose} className="rounded-lg p-2 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-orange-500">Close</button></header>{children}</dialog>;
}
