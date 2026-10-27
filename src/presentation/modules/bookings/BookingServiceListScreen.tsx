import {Skeleton} from '../../components/motion/Motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  CircleAlert,
  Filter,
  Home,
  MapPin,
  RotateCcw,
  Search,
  UserRound,
  X,
  MoreVertical,
  FileText,
} from 'lucide-react';
import {
  getDashboardApi,
  cancelBookingApi,
} from '../../../services/dashboardHelper';
import {
  myLabOrdersApi,
  myLabOrderApi,
  cancelMyLabOrderApi,
  cancelHomeVisitApi,
  myLabReportApi,
  openMyLabReportPdf,
  labError,
  rupees,
  type MyLabOrderDetail,
} from '../../../services/labHelper';
import {
  hcMineApi,
  hcOrderApi,
  hcCancelApi,
  hcRescheduleApi,
} from '../../../services/homecareHelper';
import {
  getPrescriptionsApi,
  type PatientPrescription,
} from '../../../services/patientHelper';
import { refundText, refundWillText } from '../../../config/payments';
import ReschedulePanel from './ReschedulePanel';
import LabReschedule from '../labs/LabReschedule';
import BookingDialog from './BookingDialog';
import {
  addressOf,
  bookingIcs,
  canCancel,
  canReschedule,
  dateLabel,
  dateOf,
  homeOf,
  placeOf,
  refOf,
  statusOf,
  commerceStatus,
  subtitleOf,
  timeOf,
  timeLabel,
  timeRange,
  titleOf,
  typeOf,
  type Booking,
  type BookingStatus,
  type BookingType,
} from './bookingsPresentation';
import BookingDetailsContent, { KindIcon, Status } from './BookingDetailsContent';
import { getMyOrdersApi, getMyOrderApi, cancelOrderApi } from '../../../services/pharmacyOrderHelper';
import { getProviderDetailApi } from '../../../services/bookingHelper';
import { getAddressesApi } from '../../../services/patientHelper';
import { equipmentService } from '../equipment/equipmentService';
import './MyConsultationsScreen.css';

type Tab = 'all' | BookingStatus;
type Filters = {
  type: 'All' | BookingType;
  status: 'All' | BookingStatus;
  from: string;
  to: string;
};
const clearFilters: Filters = { type: 'All', status: 'All', from: '', to: '' };
const tabs: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];
const reasons = [
  'Feeling better now',
  "Can't make it at this time",
  'Booked by mistake',
  'Other',
];
const readable = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export default function BookingServiceListScreen() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [bookings, setBookings] = useState<Booking[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(false);
  const [tab, setTab] = useState<Tab>('all'),
    [search, setSearch] = useState(''),
    [filters, setFilters] = useState<Filters>({...clearFilters, type: (params.get('type') as BookingType) || 'All'}),
    [draft, setDraft] = useState<Filters>(clearFilters),
    [filterOpen, setFilterOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(
      params.get('open'),
    ),
    [detail, setDetail] = useState<Booking | null>(null),
    [detailLoading, setDetailLoading] = useState(false),
    [detailError, setDetailError] = useState<string | null>(null),
    [detailRetry, setDetailRetry] = useState(0);
  const [action, setAction] = useState<'cancel' | 'reschedule' | null>(null),
    [reason, setReason] = useState(''),
    [busy, setBusy] = useState(false),
    [actionError, setActionError] = useState<string | null>(null),
    [notice, setNotice] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportReady, setReportReady] = useState(false),
    [prescriptions, setPrescriptions] = useState<PatientPrescription[]>([]);
  const generation = useRef(0);
  const load = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true);
    setError(false);
    try {
      const [data, labs, care, pharmacy, rentals, addresses] = await Promise.all([
        getDashboardApi(),
        myLabOrdersApi(),
        hcMineApi(),
        getMyOrdersApi(),
        equipmentService.getBookingOrders(),
        getAddressesApi(),
      ]);
      const unique = new Map(
        [...data.active, ...data.upcoming, ...data.history].map((b) => [
          b.id,
          b,
        ]),
      );
      const clinical: Booking[] = Array.from(unique.values()).map((b) => ({
        dashboard: b,
        ...b,
        section: statusOf(b),
        lab: labs.find((o) => o.id === b.labOrder?.id),
        care: care.find((o) => o.id === b.homeCare?.id),
      }));
      const providerIds = [...new Set(pharmacy.map(o => o.pharmacy_partner_id))];
      const pharmacyProviders = new Map(await Promise.all(providerIds.map(async id => [id, await getProviderDetailApi(id)] as const)));
      const list: Booking[] = [...clinical,
        ...pharmacy.map(order => {
          const address = addresses.find(a => a.addressId === order.delivery_address_id);
          return {id: `pharmacy:${order.id}`, status: order.status, section: commerceStatus(order.status), pharmacy: order, pharmacyProvider: pharmacyProviders.get(order.pharmacy_partner_id), deliveryAddress: address ? [address.addressLine1,address.addressLine2,address.landmark,address.city,address.pincode].filter(Boolean).join(', ') : null};
        }),
        ...rentals.map(order => ({id: `rental:${order.id}`, status: order.status, section: commerceStatus(order.status), rental: order})),
      ];
      if (current === generation.current) setBookings(list);
    } catch {
      if (current === generation.current) setError(true);
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
    return () => {
      generation.current++;
    };
  }, [load]);
  const selected = bookings.find((b) => b.id === selectedId) || null;
  useEffect(() => {
    setDetail(null);
    setMenuOpen(false);
    setAction(null);
    setActionError(null);
    setReason('');
    setDetailError(null);
    setReportReady(false);
    setPrescriptions([]);
    if (!selected) return;
    let active = true;
    setDetailLoading(true);
    const fetch = async () => {
      try {
        let next = selected;
        if (selected.pharmacy) {
          next = {...selected, pharmacy: await getMyOrderApi(selected.pharmacy.id)};
        } else if (selected.rental) {
          next = {...selected, rental: await equipmentService.getBookingOrder(selected.rental.order_number)};
        } else if (selected.labOrder) {
          const lab = await myLabOrderApi(selected.labOrder.id);
          next = { ...selected, lab };
        } else if (selected.homeCare) {
          const care = await hcOrderApi(selected.homeCare.id);
          next = { ...selected, care };
        }
        if (!active) return;
        setDetail(next);
        if (next.section === 'completed') {
          if (next.labOrder) {
            const report = await myLabReportApi(next.labOrder.id);
            if (active) setReportReady(report.released === true);
          } else if (['Doctor','Hospital'].includes(typeOf(next))) {
            const rx = await getPrescriptionsApi();
            if (active)
              setPrescriptions(rx.filter((p) => p.booking_id === next.id));
          }
        }
      } catch (e) {
        if (active)
          setDetailError(labError(e, 'Could not load booking details.'));
      } finally {
        if (active) setDetailLoading(false);
      }
    };
    void fetch();
    return () => {
      active = false;
    };
  }, [selected, detailRetry]);
  const open = (
    b: Booking,
    requested: 'cancel' | 'reschedule' | null = null,
  ) => {
    setSelectedId(b.id);
    setParams(
      (p) => {
        p.set('open', b.id);
        return p;
      },
      { replace: true },
    );
    setNotice(null);
    if (requested) {
      pendingAction.current = requested;
    } else pendingAction.current = null;
  };
  const pendingAction = useRef<'cancel' | 'reschedule' | null>(null);
  useEffect(() => {
    if (detail && !detailLoading && pendingAction.current) {
      const requested = pendingAction.current;
      pendingAction.current = null;
      if (requested === 'cancel' ? canCancel(detail) : canReschedule(detail))
        setAction(requested);
    }
  }, [detail, detailLoading]);
  const close = () => {
    if (busy) return;
    setSelectedId(null);
    setDetail(null);
    setAction(null);
    setParams(
      (p) => {
        p.delete('open');
        return p;
      },
      { replace: true },
    );
  };
  useEffect(() => {
    if (!params.get('open')) setSelectedId(null);
    else setSelectedId(params.get('open'));
  }, [params]);
  const counts = {
    all: bookings.length,
    upcoming: bookings.filter((b) => b.section === 'upcoming').length,
    completed: bookings.filter((b) => b.section === 'completed').length,
    cancelled: bookings.filter((b) => b.section === 'cancelled').length,
  };
  const filtered = bookings
    .filter((b) => {
      if (tab !== 'all' && b.section !== tab) return false;
      if (filters.type !== 'All' && typeOf(b) !== filters.type) return false;
      if (filters.status !== 'All' && b.section !== filters.status)
        return false;
      const date = dateOf(b);
      if (
        (filters.from && (!date || date < filters.from)) ||
        (filters.to && (!date || date > filters.to))
      )
        return false;
      const q = search.trim().toLowerCase();
      return (
        !q ||
        [titleOf(b), ...subtitleOf(b), placeOf(b), addressOf(b), refOf(b)]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q)
      );
    })
    .sort((a, b) => {
      if (a.section === 'upcoming' && b.section !== 'upcoming') return -1;
      if (b.section === 'upcoming' && a.section !== 'upcoming') return 1;
      const x = `${dateOf(a) || ''} ${timeOf(a) || ''}`,
        y = `${dateOf(b) || ''} ${timeOf(b) || ''}`;
      return a.section === 'upcoming' ? x.localeCompare(y) : y.localeCompare(x);
    });
  const changed = async (text: string) => {
    close();
    setNotice(text);
    await load();
  };
  const cancel = async () => {
    if (!detail || !canCancel(detail) || busy) return;
    if (!reason) {
      setActionError('Choose a reason.');
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      if (detail.pharmacy || detail.rental) {
        let message: string;
        if (detail.pharmacy) {
          const order = await cancelOrderApi(detail.pharmacy.id, reason);
          message = `Order cancelled. Payment status: ${order.payment_status.replaceAll('_',' ').toLowerCase()}.`;
        } else {
          const result = await equipmentService.cancelOrder(detail.rental!.order_number, reason);
          if (!result.success) throw new Error(result.message);
          message = result.message;
        }
        setBusy(false);close();setNotice(message);setTab('cancelled');await load();return;
      }
      const result = detail.labOrder
        ? await cancelMyLabOrderApi(detail.labOrder.id, reason)
        : detail.homeCare
          ? await hcCancelApi(detail.homeCare.id, reason)
          : detail.kind === 'HOME_VISIT'
            ? await cancelHomeVisitApi(detail.id, reason)
            : await cancelBookingApi(detail.id, reason);
      const fee =
        'cancellation_fee' in result && result.cancellation_fee
          ? ` Cancellation fee: ${rupees(Number(result.cancellation_fee))}.`
          : '';
      const money =
        result.refund.status === 'REFUNDED'
          ? refundText(rupees(result.refund.amount))
          : result.refund.status === 'NEEDS_SUPPORT'
            ? `Your ${rupees(result.refund.amount)} refund needs support.`
            : 'No online refund applies.';
      setBusy(false);
      setSelectedId(null);
      setDetail(null);
      setAction(null);
      setParams(
        (p) => {
          p.delete('open');
          return p;
        },
        { replace: true },
      );
      setNotice(`${refOf(detail) || 'Booking'} is cancelled. ${money}${fee}`);
      setTab('cancelled');
      await load();
    } catch (e) {
      setActionError(
        labError(
          e,
          e instanceof Error ? e.message : 'Could not cancel this booking.',
        ),
      );
    } finally {
      setBusy(false);
    }
  };
  const calendar = () => {
    if (!detail) return;
    try {
      const blob = new Blob([bookingIcs(detail)], {
          type: 'text/calendar;charset=utf-8',
        }),
        url = URL.createObjectURL(blob),
        a = document.createElement('a');
      a.href = url;
      a.download = `Vizito-${refOf(detail) || detail.id}.ics`;
      a.click();
      setMenuOpen(false);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setActionError((e as Error).message);
    }
  };
  const hasFilters =
    filters.type !== 'All' ||
    filters.status !== 'All' ||
    !!filters.from ||
    !!filters.to;
  return (
    <div className="bk-page">
      <header className="bk-mobile-header">
        <button
          aria-label="Back"
          onClick={() =>
            window.history.state?.idx > 0
              ? navigate(-1)
              : navigate('/dashboard')
          }
        >
          <ArrowLeft />
        </button>
        <h1>Bookings</h1>
      </header>
      <header className="bk-heading">
        <h1>
          <UserRound aria-hidden="true" /> Bookings
        </h1>
        <p>
          View and manage all your appointments, orders and service requests.
        </p>
      </header>
      <div className="bk-toolbar">
        <div className="bk-tabs" role="group" aria-label="Booking status">
          {tabs.map((t) => (
            <button
              key={t.key}
              className={t.key === 'cancelled' ? 'bk-cancelled-tab' : ''}
              aria-pressed={tab === t.key}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              {!loading && !error && ` (${counts[t.key]})`}
            </button>
          ))}
        </div>
        {!loading && !error && bookings.length > 0 && (
          <div className="bk-search-controls">
            <label className="bk-search">
              <Search aria-hidden="true" />
              <span className="sr-only">Search bookings</span>
              <input
                className="bk-desktop-search"
                aria-label="Search bookings"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search bookings, ID or provider name"
              />
              <input
                className="bk-mobile-search"
                aria-label="Search bookings"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search bookings..."
              />
              {search && (
                <button
                  aria-label="Clear booking search"
                  onClick={() => setSearch('')}
                >
                  <X />
                </button>
              )}
            </label>
            <button
              className="bk-button bk-filter-button"
              aria-label="Filter bookings"
              aria-expanded={filterOpen}
              onClick={() => {
                setDraft(filters);
                setFilterOpen(true);
              }}
            >
              <Filter aria-hidden="true" />
              <span>Filter{hasFilters ? ' •' : ''}</span>
            </button>
          </div>
        )}
      </div>
      {notice && (
        <p role="status" className="bk-notice">
          {notice}
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice(null)}
          >
            <X />
          </button>
        </p>
      )}
      {loading ? (
        <section
          className="bk-skeletons"
          aria-label="Loading bookings"
          aria-busy="true"
        >
          <span role="status" className="sr-only">
            Loading bookings…
          </span>
          {[0, 1, 2].map((i) => (
            <Skeleton className="bk-skeleton" key={i}>
              <i />
              <div>
                <b />
                <span />
                <span />
              </div>
            </Skeleton>
          ))}
        </section>
      ) : error ? (
        <section className="bk-error-state">
          <div className="bk-error" role="alert">
            <CircleAlert />
            <div>
              <h2>Unable to load bookings</h2>
              <p>Something went wrong. Please try again.</p>
              <button
                className="bk-button bk-danger"
                onClick={() => void load()}
              >
                <RotateCcw /> Retry
              </button>
            </div>
          </div>
        </section>
      ) : !filtered.length ? (
        <section className="bk-empty" aria-label="Empty bookings">
          <span className="bk-empty-icon">
            <CalendarDays />
          </span>
          <h2>{bookings.length ? 'No bookings found' : 'No bookings yet'}</h2>
          <p>
            {bookings.length
              ? 'No bookings match your search or filters.'
              : 'Your upcoming appointments, lab tests and home care bookings will appear here.'}
          </p>
          {bookings.length ? (
            <button
              className="bk-button"
              onClick={() => {
                setSearch('');
                setFilters(clearFilters);
                setTab('all');
              }}
            >
              Clear filters
            </button>
          ) : (
            <Link className="bk-button bk-primary" to="/healthcare-services">
              Find Care
            </Link>
          )}
        </section>
      ) : (
        <section className="bk-list" aria-label="Your bookings">
          {filtered.map((b) => {
            const LocationIcon = homeOf(b) ? Home : MapPin;
            return (
              <article key={b.id} className="bk-row" data-booking-id={b.id}>
                <KindIcon booking={b} />
                <div className="bk-description">
                  <h2>{titleOf(b)}</h2>
                  {subtitleOf(b).map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
                <div className="bk-when">
                  <CalendarDays aria-hidden="true" />
                  <div>
                    <strong>{dateLabel(dateOf(b))}</strong>
                    <span className="bk-desktop-time">{b.pharmacy ? b.pharmacy.status === 'COMPLETED' ? 'Delivered' : b.pharmacy.status.replaceAll('_', ' ').toLowerCase() : timeRange(b)}</span>
                    <span className="bk-mobile-time">
                      {timeOf(b) && ` • ${timeLabel(timeOf(b))}`}
                    </span>
                  </div>
                </div>
                <div className="bk-where">
                  <LocationIcon aria-hidden="true" />
                  <div>
                    <strong>{placeOf(b)}</strong>
                    {addressOf(b) && <p>{addressOf(b)}</p>}
                  </div>
                </div>
                <div className="bk-row-status">
                  <Status booking={b} />
                </div>
                <div className="bk-row-actions">
                  {b.section === 'upcoming' && !b.pharmacy && !b.rental ? (
                    <>
                      {canReschedule(b) && (
                        <button
                          className="bk-button"
                          onClick={() => open(b, 'reschedule')}
                        >
                          Reschedule
                        </button>
                      )}
                      {canCancel(b) && (
                        <button
                          className="bk-button bk-danger"
                          onClick={() => open(b, 'cancel')}
                        >
                          Cancel
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      {canCancel(b) && <button className="bk-button bk-danger" onClick={() => open(b,'cancel')}>Cancel</button>}
                      <button className="bk-button" onClick={() => open(b)}>View Details</button>
                    </>
                  )}
                </div>
                <button
                  className="bk-row-open"
                  aria-label={`View details for ${refOf(b) || titleOf(b)}`}
                  onClick={() => open(b)}
                >
                  <span className="sr-only">{refOf(b)}</span>
                  <ChevronRight />
                </button>
              </article>
            );
          })}
        </section>
      )}
      {filterOpen && (
        <BookingDialog
          label="Filter bookings"
          onClose={() => setFilterOpen(false)}
          className="bk-filter-panel"
        >
          <header className="bk-panel-header">
            <h2>Filter bookings</h2>
            <button
              aria-label="Close filters"
              onClick={() => setFilterOpen(false)}
            >
              <X />
            </button>
          </header>
          <div className="bk-panel-body">
            <fieldset>
              <legend>Appointment type</legend>
              <div className="bk-chips">
                {(['All', 'Doctor', 'Lab Test', 'Home Care', 'Hospital', 'Pharmacy', 'Equipment'] as const).map(
                  (t) => (
                    <button
                      key={t}
                      aria-pressed={draft.type === t}
                      onClick={() => setDraft({ ...draft, type: t })}
                    >
                      {t}
                    </button>
                  ),
                )}
              </div>
            </fieldset>
            <fieldset>
              <legend>Status</legend>
              <div className="bk-chips">
                {(['All', 'upcoming', 'completed', 'cancelled'] as const).map(
                  (s) => (
                    <button
                      key={s}
                      aria-pressed={draft.status === s}
                      onClick={() => setDraft({ ...draft, status: s })}
                    >
                      {readable(s)}
                    </button>
                  ),
                )}
              </div>
            </fieldset>
            <fieldset>
              <legend>Date range</legend>
              <div className="bk-date-range">
                <label>
                  <span
                    className={draft.from ? 'sr-only' : 'bk-date-placeholder'}
                  >
                    From date
                  </span>
                  <input
                    data-empty={!draft.from}
                    type="date"
                    aria-label="From date"
                    value={draft.from}
                    onChange={(e) =>
                      setDraft({ ...draft, from: e.target.value })
                    }
                  />
                  <CalendarDays className="bk-date-icon" aria-hidden="true" />
                </label>
                <label>
                  <span
                    className={draft.to ? 'sr-only' : 'bk-date-placeholder'}
                  >
                    To date
                  </span>
                  <input
                    data-empty={!draft.to}
                    type="date"
                    aria-label="To date"
                    value={draft.to}
                    min={draft.from || undefined}
                    onChange={(e) => setDraft({ ...draft, to: e.target.value })}
                  />
                  <CalendarDays className="bk-date-icon" aria-hidden="true" />
                </label>
              </div>
            </fieldset>
            {draft.from && draft.to && draft.from > draft.to && (
              <p role="alert">To date must be on or after From date.</p>
            )}
          </div>
          <footer className="bk-panel-actions">
            <button
              className="bk-button"
              onClick={() => setDraft(clearFilters)}
            >
              Clear
            </button>
            <button
              className="bk-button bk-primary"
              disabled={!!draft.from && !!draft.to && draft.from > draft.to}
              onClick={() => {
                setFilters(draft);
                setTab('all');
                setFilterOpen(false);
              }}
            >
              Apply
            </button>
          </footer>
        </BookingDialog>
      )}
      {selectedId && (
        <BookingDialog
          label="Booking details"
          onClose={close}
          className={`bk-detail-panel bk-panel-${detail ? typeOf(detail).toLowerCase().replaceAll(' ','-') : 'doctor'}`}
        >
          <header className="bk-panel-header">
            <button
              aria-label="Back to bookings"
              disabled={busy}
              onClick={close}
            >
              <ArrowLeft />
            </button>
            <h2>Booking details</h2>
            {detail && <div className="bk-detail-menu"><button aria-label="Booking options" aria-expanded={menuOpen} onClick={()=>setMenuOpen(v=>!v)}><MoreVertical/></button>{menuOpen && <div className="bk-options"><button disabled={!dateOf(detail) || !timeOf(detail)} onClick={calendar}><CalendarDays/>Add to calendar</button></div>}</div>}
          </header>
          <div className="bk-panel-body">
            {detailLoading || (loading && !selected) ? (
              <p role="status">Loading booking details…</p>
            ) : detailError ? (
              <p role="alert">
                {detailError}{' '}
                <button
                  className="bk-button"
                  onClick={() => setDetailRetry((n) => n + 1)}
                >
                  Retry details
                </button>
              </p>
            ) : !detail ? (
              <p>
                {error ? (
                  <>
                    Unable to load booking details.{' '}
                    <button className="bk-button" onClick={() => void load()}>
                      Retry details
                    </button>
                  </>
                ) : (
                  'Booking not found.'
                )}
              </p>
            ) : (
              <>
                <BookingDetailsContent booking={detail} hideActions={!!action} onReschedule={()=>setAction('reschedule')} onCancel={()=>setAction('cancel')} onError={setActionError}>
                  {detail.section === 'completed' && <div className="bk-record-links">
                    {reportReady && detail.labOrder && <button className="bk-detail-link" onClick={()=>void openMyLabReportPdf(detail.labOrder!.id).catch(e=>setActionError(labError(e,'Could not open the report.')))}><FileText/>View lab report</button>}
                    {prescriptions.map(rx=><Link className="bk-detail-link" key={rx.id} to={`/my-records?open=${encodeURIComponent(rx.id)}`}>{typeOf(detail)==='Hospital' ? 'View visit summary' : 'View prescription'}{prescriptions.length>1 && rx.prescription_number ? ` ${rx.prescription_number}` : ''}</Link>)}
                  </div>}
                </BookingDetailsContent>
                {action === 'reschedule' &&
                  (detail.labOrder && detail.lab ? (
                    <LabReschedule
                      order={detail.lab as MyLabOrderDetail}
                      startOpen
                      onClose={() => setAction(null)}
                      onMoved={(text) => void changed(text)}
                    />
                  ) : detail.homeCare && detail.care ? (
                    <CareReschedule
                      booking={detail}
                      onClose={() => setAction(null)}
                      onDone={(text) => void changed(text)}
                    />
                  ) : (
                    <ReschedulePanel
                      booking={detail.dashboard!}
                      onCancel={() => setAction(null)}
                      onDone={(r) =>
                        void changed(
                          `${r.booking_number} moved to ${dateLabel(r.appointment_date)}, ${timeLabel(r.time_slot)}. ${r.reschedules_left > 0 ? `You can reschedule ${r.reschedules_left} more ${r.reschedules_left === 1 ? 'time' : 'times'}.` : 'You have used both changes.'}`,
                        )
                      }
                    />
                  ))}
                {action === 'cancel' && (
                  <section
                    className="bk-cancel-panel"
                    role="group"
                    aria-label="Cancel this booking"
                  >
                    <h3>Cancel this booking?</h3>
                    <CancellationRule booking={detail} />
                    <fieldset>
                      <legend>Reason for cancelling</legend>
                      <div
                        className="bk-chips"
                        role="radiogroup"
                        aria-label="Reason for cancelling"
                      >
                        {reasons.map((r) => (
                          <button
                            key={r}
                            role="radio"
                            aria-checked={reason === r}
                            onClick={() => setReason(r)}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                    <div className="bk-panel-actions">
                      <button
                        className="bk-button"
                        disabled={busy}
                        onClick={() => setAction(null)}
                      >
                        Keep booking
                      </button>
                      <button
                        className="bk-button bk-danger"
                        disabled={busy}
                        onClick={() => void cancel()}
                      >
                        {busy ? 'Cancelling…' : 'Yes, cancel booking'}
                      </button>
                    </div>
                  </section>
                )}
                {actionError && (
                  <p role="alert" className="bk-action-error">
                    {actionError}
                  </p>
                )}
              </>
            )}
          </div>
        </BookingDialog>
      )}
    </div>
  );
}
function CancellationRule({ booking: b }: { booking: Booking }) {
  if (b.pharmacy) return <p>{b.pharmacy.payment_status === 'PAID' ? b.pharmacy.payment_method === 'CASH' ? 'Payments made at the pharmacy are returned by the pharmacy. No online refund applies.' : 'Your online payment is refunded to the original payment method. Refund status is shown after cancellation.' : 'No online payment has been collected for this order.'}</p>;
  if (b.rental) return <p>Cancellation is available before delivery starts. This pay-on-delivery order has no online charge to refund. You’ll see the rental provider’s cancellation confirmation after cancelling.</p>;
  const paid =
    b.care?.payment_status || b.lab?.payment_status || b.paymentStatus;
  if (b.care)
    return (
      <p>
        {paid === 'PAID'
          ? 'Payments for visits not yet given are refunded. Completed visits remain charged.'
          : 'No online payment is refunded for pay-at-visit bookings.'}
        {b.care.late_cancel_fee
          ? ` A late cancellation fee of ${rupees(b.care.late_cancel_fee)} applies because the professional is on the way.`
          : ''}
      </p>
    );
  if (b.lab)
    return (
      <p>
        {paid === 'PAID' && ['UPI', 'ONLINE'].includes(b.lab.payment_mode || '')
          ? refundWillText(rupees(b.lab.total_amount))
          : 'Unpaid tests are cancelled without an online charge.'}{' '}
        Payments made at the lab counter are returned by the lab.
      </p>
    );
  return (
    <p>
      {paid === 'PAID' && !/cash|clinic/i.test(b.paymentMode || '')
        ? `The full amount is refunded according to the payment status. ${b.totalAmount != null && Number.isFinite(b.totalAmount) ? refundWillText(rupees(b.totalAmount)) : 'Any applicable online refund is returned to the original payment method.'}`
        : 'You have not been charged online, so there is nothing to refund online.'}{' '}
      The time slot is released and the doctor is informed.
    </p>
  );
}
function CareReschedule({
  booking: b,
  onClose,
  onDone,
}: {
  booking: Booking;
  onClose: () => void;
  onDone: (text: string) => void;
}) {
  const [date, setDate] = useState(''),
    [time, setTime] = useState(timeOf(b) || ''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const care = b.care;
  const save = async () => {
    if (!care?.reschedule_visit_id || !date || !time || busy) return;
    setBusy(true);
    setError(null);
    try {
      const next = await hcRescheduleApi(care.reschedule_visit_id, date, time);
      const visit = next.visits.find((v) => v.id === care.reschedule_visit_id);
      onDone(
        `Booking rescheduled${visit ? ` to ${dateLabel(visit.date)}, ${timeLabel(visit.start_time)}` : ''}.`,
      );
    } catch (e) {
      setError(labError(e, 'Could not reschedule this visit.'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section
      role="group"
      aria-label="Reschedule home care"
      className="bk-reschedule"
    >
      <h3>Choose a new time</h3>
      {care?.reschedules_left != null && (
        <p>
          You can reschedule {care.reschedules_left} more{' '}
          {care.reschedules_left === 1 ? 'time' : 'times'}. The agency will
          confirm the professional again.
        </p>
      )}
      <label>
        New date
        <input
          aria-label="New home care date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>
      <label>
        New time
        <input
          aria-label="New home care time"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
      </label>
      {error && <p role="alert">{error}</p>}
      <div className="bk-panel-actions">
        <button className="bk-button" disabled={busy} onClick={onClose}>
          Keep current time
        </button>
        <button
          className="bk-button bk-primary"
          disabled={!date || !time || busy || !care?.can_reschedule}
          onClick={() => void save()}
        >
          {busy ? 'Moving…' : 'Confirm reschedule'}
        </button>
      </div>
    </section>
  );
}
