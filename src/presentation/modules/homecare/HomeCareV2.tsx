import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Activity, AlertTriangle, ArrowLeft, ArrowRight, BadgeCheck, CalendarCheck, CalendarDays, Check, CheckCircle2, ChevronRight,
  Clock, Copy, FileText, FlaskConical, HeartHandshake, Home, Info, MapPin, Minus, Phone, PhoneCall, Plus, RotateCcw, ShieldCheck,
  Sparkles, Stethoscope, Syringe, Trash2, Upload, User, UserCheck, Users, Wallet, X,
} from 'lucide-react';
import { payOnline, PaymentCancelled, type PaidOnline } from '../../../services/razorpayCheckout';
import {
  hcBookApi, hcCancelApi, hcCatalogueApi, hcMineApi, hcOrderApi, hcRescheduleApi, TAB_OF,
  type HcCategory, type HcEnquiry, type HcOrder, type HcReferral, type HcService,
} from '../../../services/homecareHelper';
import { getAddressesApi, type PatientAddress } from '../../../services/patientHelper';
import { getFamilyMembersApi, getMyUserId, type PatientFamilyMember } from '../../../services/familyHelper';
import { useFamilyBookingSelection } from '../family/BookingForChip';
import { useSearchArea } from '../../../services/location';
import { labError, rupees } from '../../../services/labHelper';
import { PAYMENTS_SIMULATED, refundText, TestPaymentNote } from '../../../config/payments';
import { recordsApi, type DocumentRecord } from '../records/recordsApi';
import LocationBar from '../../components/location/LocationBar';
import HomePinField from '../../components/location/HomePinField';
import BookingDialog from '../bookings/BookingDialog';
import LongTermEnquiryModal from './components/LongTermEnquiryModal';
import {
  addOrderToCalendar, agenciesForPackage, buildPackages, dateLong, dateShort, dateTiny, dayChips, durationText, endTime,
  earliestDate, findPackage, fullAddress, initialsOf, isoAdd, money, monthYear, packageKeyOf, perLabel, personYears,
  professionalRole, serviceForAgency, slotGroups, statusText, time12, VISIT_STATUS_LABEL,
  type HcPackage,
} from './homeCareV2Data';
import './HomeCareV2.css';

const TABS = ['nursing', 'physio', 'caregiver'] as const;
type Tab = typeof TABS[number];

const CATEGORY_OF: Record<Tab, HcCategory> = { nursing: 'NURSING', physio: 'PHYSIOTHERAPY', caregiver: 'CAREGIVER' };
const TAB_OF_CATEGORY: Record<HcCategory, Tab> = { NURSING: 'nursing', PHYSIOTHERAPY: 'physio', CAREGIVER: 'caregiver' };

const CATEGORY_COPY: Record<Tab, { title: string; short: string; text: string; icon: typeof Syringe }> = {
  nursing: { title: 'Nursing care at home', short: 'Nursing care', text: 'Professional nursing support at the comfort of your home.', icon: Syringe },
  physio: { title: 'Physiotherapy at home', short: 'Physiotherapy', text: 'One-to-one physiotherapy for recovery, mobility and pain relief.', icon: Activity },
  caregiver: { title: 'Caregiver support at home', short: 'Caregiver support', text: 'Help with daily activities, mobility and company at home.', icon: HeartHandshake },
};

const MOBILITY = [
  { value: 'Walks independently', label: 'Walks independently', hint: 'No support needed', icon: UserCheck },
  { value: 'Can walk with support', label: 'Walks with support', hint: 'Needs some assistance', icon: User },
  { value: 'Uses a wheelchair', label: 'Wheelchair', hint: 'Uses a wheelchair', icon: Activity },
  { value: 'Needs care in bed', label: 'Bed-bound', hint: 'Mostly in bed', icon: Home },
];

const PIN_RE = /^[1-9]\d{5}$/;
const SELF_NAME = (() => {
  try { const u = JSON.parse(localStorage.getItem('vizito_user') || '{}'); return u?.fullName || u?.full_name || 'You'; } catch { return 'You'; }
})();

interface Draft {
  who: string;
  condition: string;
  mobility: string;
  notes: string;
  sessions: number;
  date: string;
  time: string;
  gender: 'ANY' | 'FEMALE' | 'MALE';
  address: { line: string; area: string; city: string; pincode: string; landmark: string };
  homePin: { lat: number; lng: number } | null;
  referralDoc: DocumentRecord | null;
  referralType: string;
  pay: 'AFTER' | 'ONLINE';
  addressOpen: boolean;
}

const EMPTY_ADDRESS = { line: '', area: '', city: '', pincode: '', landmark: '' };

export default function HomeCareV2({ referral, prefill }: { referral?: HcReferral | null; prefill?: HcOrder | null }) {
  const [params, setParams] = useSearchParams();
  const area = useSearchArea();
  const navigate = useNavigate();

  const rawTab = params.get('tab');
  const tab: Tab | '' = TABS.includes(rawTab as Tab) ? (rawTab as Tab) : '';
  const category = tab ? CATEGORY_OF[tab] : undefined;
  const step = params.get('step') || '';
  const packageKey = params.get('package');
  const agencyId = params.get('agency');
  const serviceId = params.get('service');
  const orderId = params.get('order');

  const [pin, setPin] = useState('');
  const [savedPin, setSavedPin] = useState('');
  const [areaPincode, setAreaPincode] = useState('');
  const [services, setServices] = useState<HcService[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [savedAddresses, setSavedAddresses] = useState<PatientAddress[]>([]);
  const [family, setFamily] = useState<PatientFamilyMember[]>([]);
  const [familyError, setFamilyError] = useState('');
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quoteFeedback, setQuoteFeedback] = useState('');
  const prefillApplied = useRef(false);

  // Old "long-term care" links land here: open the 12h / 24h quote instead of the visit landing.
  useEffect(() => {
    if (!rawTab && params.get('track') === 'longterm') setQuoteOpen(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [draft, setDraft] = useState<Draft>(() => ({
    who: '', condition: referral ? [referral.diagnosis, referral.instructions].filter(Boolean).join('. ').slice(0, 300) : '',
    mobility: MOBILITY[0].value, notes: '', sessions: 1, date: isoAdd(1), time: '', gender: 'ANY',
    address: { ...EMPTY_ADDRESS }, homePin: null, referralDoc: null, referralType: 'PRESCRIPTION', pay: 'AFTER', addressOpen: true,
  }));

  // Location: the chosen search area wins, then a saved address, so the catalogue opens on the
  // patient's own PIN without asking again.
  useEffect(() => {
    if (area?.pincode && PIN_RE.test(area.pincode)) setAreaPincode(area.pincode);
    else setAreaPincode('');
  }, [area?.pincode]);

  useEffect(() => {
    getAddressesApi().then(list => {
      setSavedAddresses(list);
      const d = list.find(a => a.isDefault && PIN_RE.test(a.pincode || '')) || list.find(a => PIN_RE.test(a.pincode || ''));
      if (d?.pincode) {
        setSavedPin(d.pincode);
        setDraft(cur => cur.address.line ? cur : {
          ...cur,
          address: {
            line: d.addressLine1 || '', area: d.addressLine2 || '', city: d.city || '', pincode: d.pincode || '', landmark: d.landmark || '',
          },
          homePin: d.pin || null,
          addressOpen: !d.addressLine1,
        });
      }
    }).catch(() => undefined);
  }, []);

  useEffect(() => { if (!pin && (areaPincode || savedPin)) setPin(areaPincode || savedPin); }, [areaPincode, savedPin, pin]);
  useEffect(() => { if (!draft.address.pincode && pin) setDraft(cur => ({ ...cur, address: { ...cur.address, pincode: pin } })); }, [pin, draft.address.pincode]);

  useEffect(() => {
    getMyUserId().then(id => (id ? getFamilyMembersApi(id) : [])).then(rows => { setFamily(rows); setFamilyError(''); })
      .catch(e => setFamilyError(labError(e, 'Could not load your family members.')));
  }, []);

  useFamilyBookingSelection(family, useCallback((value: string) => setDraft(cur => ({ ...cur, who: value })), []), '');

  const today = isoAdd(0);
  const activeStep: 'home' | 'service' | 'agency' | 'schedule' | 'review' | 'confirmed' =
    orderId ? 'confirmed' : !tab ? 'home' : step === 'agency' ? 'agency' : step === 'schedule' ? 'schedule' : step === 'review' ? 'review' : 'service';

  const hasPin = PIN_RE.test(pin);

  useEffect(() => {
    if (!hasPin) { setServices(null); setLoading(false); setError(''); return; }
    let alive = true;
    setLoading(true); setError('');
    hcCatalogueApi(pin, undefined, area?.lat, area?.lng)
      .then(r => { if (alive) setServices(r.services); })
      .catch(e => { if (alive) { setServices(null); setError(labError(e, 'Unable to load home care services. Please try again.')); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [pin, hasPin, area?.lat, area?.lng, retry]);

  const packages = useMemo(() => buildPackages(services || [], category), [services, category]);
  const pkg = useMemo(() => {
    if (!packageKey) return activeStep === 'service' ? packages[0] || null : null;
    // Only accept a package that belongs to the care type in the URL, so a stale deep link can't
    // mix a nursing package into the physiotherapy flow.
    const scoped = category ? (services || []).filter(s => s.category === category) : (services || []);
    return findPackage(scoped, packageKey);
  }, [services, packageKey, packages, activeStep, category]);

  const selectedService = useMemo(() => {
    if (!pkg) return null;
    if (serviceId) {
      const found = pkg.services.find(s => s.id === serviceId);
      if (found) return found;
    }
    return serviceForAgency(pkg, agencyId);
  }, [pkg, serviceId, agencyId]);

  // A rebook ("Book again") opens the schedule with the original service and preferences.
  useEffect(() => {
    if (!prefill || !services?.length || prefillApplied.current) return;
    const match = services.find(s => s.agency.id === prefill.agency_id && s.name === prefill.service_name);
    if (!match) return;
    prefillApplied.current = true;
    setDraft(cur => ({
      ...cur,
      who: prefill.patient_profile_id ? String(prefill.patient_profile_id) : cur.who,
      condition: prefill.care_needs || cur.condition,
      sessions: Math.max(1, Math.min(30, prefill.sessions || 1)),
      date: prefill.visits?.[0]?.date || cur.date,
      time: prefill.visits?.[0]?.start_time?.slice(0, 5) || cur.time,
      gender: prefill.preferred_gender === 'MALE' || prefill.preferred_gender === 'FEMALE' ? prefill.preferred_gender : cur.gender,
    }));
    go({ tab: TAB_OF[match.category], step: 'schedule', package: packageKeyOf(match), agency: match.agency.id, service: match.id }, true);
  }, [prefill, services]); // eslint-disable-line react-hooks/exhaustive-deps

  const reviewReady = !!(selectedService && pkg && draft.condition.trim().length >= 10 && draft.address.line.trim().length >= 5 && draft.address.city.trim().length >= 2 && PIN_RE.test(draft.address.pincode) && draft.time);

  function go(next: Record<string, string | null>, replace = false) {
    setParams(prev => {
      const n = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(next)) { if (v === null) n.delete(k); else n.set(k, v); }
      return n;
    }, { replace });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const openService = (nextTab: Tab) => go({ tab: nextTab, step: null, package: null, agency: null, service: null, order: null });
  const openQuote = () => setQuoteOpen(true);

  const chooseAgency = (key: string) => go({ step: 'agency', package: key, agency: null, service: null, order: null });
  const chooseSchedule = (agency: string, service: string) => go({ step: 'schedule', agency, service, order: null });
  const editSchedule = () => go({ step: 'schedule' });
  const editAgency = () => go({ step: 'agency' });

  const pageStage = activeStep === 'review' && !reviewReady ? 'schedule' : activeStep;
  const selectedAgency = selectedService?.agency || null;

  const quoteModal = quoteOpen && (
    <LongTermEnquiryModal
      isOpen
      preselectedAgencyId={selectedAgency?.id}
      preselectedAgencyName={selectedAgency?.name}
      onClose={() => setQuoteOpen(false)}
      onSuccess={(enq: HcEnquiry) => {
        setQuoteOpen(false);
        setQuoteFeedback(`Request ${enq.enquiry_number} sent. The agency will call you to plan 12h / 24h care.`);
      }}
    />
  );

  const feedback = quoteFeedback && (
    <div className="hc2-toast" role="status">
      <CheckCircle2 />
      <p>{quoteFeedback} <Link to="/home-care?tab=mine&view=quotes">View my quotes</Link></p>
      <button type="button" aria-label="Dismiss" onClick={() => setQuoteFeedback('')}><X /></button>
    </div>
  );

  if (pageStage === 'home') {
    return (
      <>
        <LandingPage
          onService={openService}
          onDoctor={() => go({ tab: 'doctor', step: null, package: null, agency: null, service: null, order: null })}
          onLab={() => navigate('/lab-tests?visit=HOME')}
          onQuote={openQuote}
        />
        {feedback}{quoteModal}
      </>
    );
  }

  if (pageStage === 'confirmed' && orderId) {
    return (
      <>
        <ConfirmedPage orderId={orderId} onBookAgain={() => openService(tab || 'nursing')} />
        {feedback}
      </>
    );
  }

  if (!tab) {
    return (
      <>
        <LandingPage
          onService={openService}
          onDoctor={() => go({ tab: 'doctor', step: null, package: null, agency: null, service: null, order: null })}
          onLab={() => navigate('/lab-tests?visit=HOME')}
          onQuote={openQuote}
        />
        {feedback}{quoteModal}
      </>
    );
  }

  if (pageStage === 'service') {
    return (
      <>
        <LocationRow pin={pin} onPin={setPin} />
        <ServicePage
          tab={tab}
          packages={packages}
          pickedKey={pkg?.key || ''}
          onPick={key => go({ package: key })}
          onAgency={() => pkg && chooseAgency(pkg.key)}
          onQuote={openQuote}
          loading={loading}
          error={error}
          hasPin={hasPin}
          onRetry={() => setRetry(n => n + 1)}
          onOpenTab={openService}
        />
        {feedback}{quoteModal}
      </>
    );
  }

  if (pageStage === 'agency' && pkg) {
    return (
      <>
        <LocationRow pin={pin} onPin={setPin} />
        <AgencyPage
          pkg={pkg}
          tab={tab}
          pin={pin}
          areaLabel={area?.label || ''}
          loading={loading}
          error={error}
          onRetry={() => setRetry(n => n + 1)}
          onBack={() => go({ step: null, package: null, agency: null, service: null })}
          onSelect={(agency, service) => chooseSchedule(agency, service)}
          onQuote={openQuote}
        />
        {feedback}{quoteModal}
      </>
    );
  }

  if (pageStage === 'schedule' || pageStage === 'review') {
    if (!pkg || !selectedService) {
      return (
        <>
          <LocationRow pin={pin} onPin={setPin} />
          <ServicePage
            tab={tab}
            packages={packages}
            pickedKey={pkg?.key || ''}
            onPick={key => go({ package: key })}
            onAgency={() => pkg && chooseAgency(pkg.key)}
            onQuote={openQuote}
            loading={loading}
            error={error}
            hasPin={hasPin}
            onRetry={() => setRetry(n => n + 1)}
            onOpenTab={openService}
          />
          {feedback}{quoteModal}
        </>
      );
    }
    const total = selectedService.price * draft.sessions;
    return (
      <>
        {pageStage === 'schedule' ? (
          <SchedulePage
            tab={tab}
            pkg={pkg}
            service={selectedService}
            draft={draft}
            setDraft={setDraft}
            family={family}
            familyError={familyError}
            savedAddresses={savedAddresses}
            onBack={editAgency}
            onContinue={() => go({ step: 'review' })}
            onQuote={openQuote}
          />
        ) : (
          <ReviewPage
            tab={tab}
            pkg={pkg}
            service={selectedService}
            draft={draft}
            setDraft={setDraft}
            family={family}
            total={total}
            referralId={referral?.id}
            onEdit={target => go({ step: target })}
            onBack={editSchedule}
            onBooked={order => go({ tab, step: 'confirmed', order: order.id, package: null, agency: null, service: null })}
            onQuote={openQuote}
          />
        )}
        {feedback}{quoteModal}
      </>
    );
  }

  return (
    <>
      <LandingPage
        onService={openService}
        onDoctor={() => go({ tab: 'doctor' })}
        onLab={() => navigate('/lab-tests?visit=HOME')}
        onQuote={openQuote}
      />
      {feedback}{quoteModal}
    </>
  );
}

// ── shared bits ─────────────────────────────────────────────────────────────

function EmergencyStrip() {
  return (
    <p className="hc2-emergency-strip" role="note">
      <AlertTriangle />
      <span><b>Not for emergencies — call 108.</b> Home care is for planned, non-emergency care only.</span>
    </p>
  );
}

function LocationRow({ pin, onPin }: { pin: string; onPin: (p: string) => void }) {
  const [value, setValue] = useState(pin);
  useEffect(() => setValue(pin), [pin]);
  return (
    <div className="hc2-locrow">
      <LocationBar compact purpose="find home care near you" />
      <form className="hc2-pinform" onSubmit={e => { e.preventDefault(); if (PIN_RE.test(value)) onPin(value); }}>
        <label htmlFor="hc2-pin">Home PIN for service coverage</label>
        <div>
          <input id="hc2-pin" inputMode="numeric" maxLength={6} value={value} onChange={e => setValue(e.target.value.replace(/\D/g, ''))} placeholder="6-digit PIN" />
          <button type="submit" disabled={!PIN_RE.test(value)}>Check</button>
        </div>
      </form>
    </div>
  );
}

function Crumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav className="hc2-crumbs" aria-label="Breadcrumb">
      <Link to="/home-care">Home Care</Link>
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`}>
          <ChevronRight aria-hidden="true" />
          {item.to ? <Link to={item.to}>{item.label}</Link> : <b aria-current="page">{item.label}</b>}
        </span>
      ))}
    </nav>
  );
}

function Hero({ compact = false, title, eyebrow, text, children }: { compact?: boolean; title: string; eyebrow?: string; text?: string; children?: React.ReactNode }) {
  return (
    <header className={`hc2-hero ${compact ? 'is-compact' : ''}`}>
      <div className="hc2-hero-copy">
        {eyebrow && <p className="hc2-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {text && <p className="hc2-sub">{text}</p>}
        {children && <div className="hc2-hero-actions">{children}</div>}
      </div>
      <img src="/images/healthcare/banners/homecare-hero.webp" alt="" />
    </header>
  );
}

function TrustPills({ items, tone = 'mint' }: { items: { icon: typeof Check; label: string }[]; tone?: 'mint' | 'warm' }) {
  return (
    <div className={`hc2-pills ${tone === 'warm' ? 'is-warm' : ''}`}>
      {items.map(({ icon: Icon, label }) => <span key={label}><Icon />{label}</span>)}
    </div>
  );
}

function StepBar({ current }: { current: 1 | 2 | 3 | 4 | 5 }) {
  const steps = ['Service', 'Agency', 'Schedule', 'Review & pay', 'Confirmed'];
  return (
    <ol className="hc2-steps" aria-label="Booking steps">
      {steps.map((label, i) => {
        const n = i + 1;
        return (
          <li key={label} className={n < current ? 'is-done' : n === current ? 'is-current' : ''} aria-current={n === current ? 'step' : undefined}>
            <span>{n < current ? <Check /> : n}</span><b>{label}</b>
          </li>
        );
      })}
    </ol>
  );
}

function AgencyLogo({ service, size = 'md' }: { service: HcService; size?: 'sm' | 'md' }) {
  const [broken, setBroken] = useState(false);
  const src = service.agency.logo_url;
  return (
    <div className={`hc2-logo hc2-logo--${size}`} aria-hidden="true">
      {src && !broken ? <img src={src} alt="" onError={() => setBroken(true)} /> : <span>{initialsOf(service.agency.name)}</span>}
    </div>
  );
}

function PackageIcon({ kind, category }: { kind: 'VISIT' | 'SHIFT'; category: HcCategory }) {
  if (kind === 'SHIFT') return <Clock />;
  if (category === 'PHYSIOTHERAPY') return <Activity />;
  if (category === 'CAREGIVER') return <HeartHandshake />;
  return <Syringe />;
}

// ── landing ────────────────────────────────────────────────────────────────

function LandingPage({ onService, onDoctor, onLab, onQuote }: { onService: (t: Tab) => void; onDoctor: () => void; onLab: () => void; onQuote: () => void }) {
  const [rows, setRows] = useState<HcOrder[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError('');
    hcMineApi().then(list => { if (alive) setRows(list); })
      .catch(e => { if (alive) { setRows(null); setError(labError(e, 'Could not load your home visits.')); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [retry]);

  const upcoming = (rows || [])
    .filter(o => ['REQUESTED', 'CONFIRMED', 'IN_PROGRESS'].includes(o.status))
    .sort((a, b) => `${a.visits?.[0]?.date || ''}${a.visits?.[0]?.start_time || ''}`.localeCompare(`${b.visits?.[0]?.date || ''}${b.visits?.[0]?.start_time || ''}`))
    .slice(0, 2);

  return (
    <div className="hc2">
      <Crumbs items={[{ label: 'Home care' }]} />
      <Hero
        title="Care at home, from agencies on Vizito"
        text="Professional, compassionate care for you and your loved ones."
      >
        <button type="button" className="hc2-btn hc2-btn--primary" onClick={() => onService('nursing')}>Book a visit <ArrowRight /></button>
        <button type="button" className="hc2-btn hc2-btn--ghost" onClick={onQuote}>Request a 12h / 24h quote</button>
      </Hero>

      <TrustPills items={[
        { icon: ShieldCheck, label: 'Agencies on Vizito' },
        { icon: Users, label: 'Trained professionals' },
        { icon: BadgeCheck, label: 'Visit codes for safety' },
      ]} />

      <div className="hc2-landing-grid">
        <section className="hc2-card hc2-services-card" aria-labelledby="hc2-services-title">
          <div className="hc2-card-head">
            <h2 id="hc2-services-title">Our home care services</h2>
          </div>
          <div className="hc2-tiles">
            {[
              { tab: 'nursing' as Tab, label: 'Nursing care', icon: Syringe, hint: 'Injections, IV, wound care' },
              { tab: 'physio' as Tab, label: 'Physiotherapy', icon: Activity, hint: 'Recovery and mobility' },
              { tab: 'caregiver' as Tab, label: 'Caregiver support', icon: HeartHandshake, hint: 'Daily care and company' },
            ].map(item => (
              <button key={item.tab} type="button" onClick={() => onService(item.tab)}>
                <span className="hc2-tile-icon"><item.icon /></span>
                <span><b>{item.label}</b><small>{item.hint}</small></span>
                <ChevronRight />
              </button>
            ))}
            <button type="button" onClick={onDoctor}>
              <span className="hc2-tile-icon"><Stethoscope /></span>
              <span><b>Doctor at home</b><small>Consultation at home</small></span>
              <ChevronRight />
            </button>
            <button type="button" onClick={onLab}>
              <span className="hc2-tile-icon"><FlaskConical /></span>
              <span><b>Lab sample collection</b><small>Tests at home</small></span>
              <ChevronRight />
            </button>
          </div>
        </section>

        <section className="hc2-card hc2-choose" aria-labelledby="hc2-choose-title">
          <div className="hc2-card-head"><h2 id="hc2-choose-title">Choose how you need care</h2></div>
          <button type="button" className="hc2-choose-row is-active" onClick={() => onService('nursing')}>
            <span className="hc2-choose-icon"><CalendarDays /></span>
            <span><b>Book a visit</b><small>One-time or multiple visits</small></span>
            <ChevronRight />
          </button>
          <button type="button" className="hc2-choose-row" onClick={onQuote}>
            <span className="hc2-choose-icon is-blue"><Clock /></span>
            <span><b>12h / 24h care</b><small>Long-term care at home</small></span>
            <ChevronRight />
          </button>
          <button type="button" className="hc2-quote-link" onClick={onQuote}><FileText /> Request a quote</button>
        </section>
      </div>

      <div className="hc2-why-grid">
        <section className="hc2-card" aria-labelledby="hc2-why-title">
          <div className="hc2-card-head"><h2 id="hc2-why-title">Why Vizito home care</h2></div>
          <div className="hc2-why">
            {[
              { icon: ShieldCheck, title: 'Agencies on Vizito', text: 'Real agency names, teams and prices from the catalogue.' },
              { icon: Users, title: 'Trained professionals', text: 'Qualifications and experience are shown before you book.' },
              { icon: Wallet, title: 'Clear pricing', text: 'The price you see is the price from that agency.' },
              { icon: Sparkles, title: 'Range of care', text: 'From a single injection to daily caregiver support.' },
              { icon: PhoneCall, title: 'Support when you need it', text: 'Help with booking and follow-ups.' },
            ].map(item => (
              <div key={item.title} className="hc2-why-item">
                <span><item.icon /></span>
                <div><b>{item.title}</b><small>{item.text}</small></div>
              </div>
            ))}
          </div>
        </section>
        <section className="hc2-emergency-card" aria-label="Not for emergencies">
          <span className="hc2-emergency-icon"><AlertTriangle /></span>
          <div>
            <h2>Not for emergencies</h2>
            <p>For life-threatening situations, call 108 immediately.</p>
          </div>
          <a href="tel:108" className="hc2-108"><Phone />108</a>
        </section>
      </div>

      <section className="hc2-card hc2-upcoming" aria-labelledby="hc2-upcoming-title">
        <div className="hc2-card-head">
          <h2 id="hc2-upcoming-title">My upcoming home visits</h2>
          <Link to="/home-care?tab=mine">View all</Link>
        </div>
        {loading && <p className="hc2-muted" role="status">Loading your home visits…</p>}
        {error && <div className="hc2-error" role="alert"><p>{error}</p><button type="button" onClick={() => setRetry(n => n + 1)}>Retry</button></div>}
        {!loading && !error && !upcoming.length && (
          <div className="hc2-empty-inline">
            <CalendarCheck />
            <div><b>No upcoming home visits</b><p>Book a visit and it will appear here.</p></div>
            <button type="button" className="hc2-btn hc2-btn--primary hc2-btn--sm" onClick={() => onService('nursing')}>Book a visit</button>
          </div>
        )}
        {!loading && !error && upcoming.map(order => {
          const visit = order.visits?.[0];
          const pro = order.visits?.find(v => v.professional)?.professional;
          return (
            <article className="hc2-upcoming-row" key={order.id}>
              <div className="hc2-date-chip"><span>{visit ? dateTiny(visit.date).split(' ')[1] : '—'}</span><b>{visit ? dateTiny(visit.date).split(' ')[0] : ''}</b></div>
              <div className="hc2-upcoming-main">
                <h3>{order.service_name}</h3>
                <p><Clock />{visit ? `${time12(visit.start_time)}${visit.end_time ? ` – ${time12(visit.end_time)}` : ''}` : 'Time to be confirmed'}</p>
                <p><MapPin />{order.address}</p>
              </div>
              <div className="hc2-upcoming-agency">
                <span>{order.agency_name || 'Agency'}</span>
                {pro && <small>{pro.name} · {professionalRole(pro.role_label)}</small>}
              </div>
              <span className={`hc2-status is-${order.status.toLowerCase()}`}>{statusText[order.status] || order.status}</span>
              <div className="hc2-upcoming-actions">
                <Link className="hc2-btn hc2-btn--ghost hc2-btn--sm" to={`/home-care?tab=mine&open=${encodeURIComponent(order.id)}`}>View details</Link>
              </div>
            </article>
          );
        })}
      </section>

      <section className="hc2-card hc2-steps-card" aria-labelledby="hc2-steps-title">
        <div className="hc2-card-head"><h2 id="hc2-steps-title">Book home care in 5 easy steps</h2></div>
        <div className="hc2-five-steps">
          {[
            ['Service details', 'Choose a service and package that suits your needs.'],
            ['Choose agency', 'Compare agencies and prices near you.'],
            ['Schedule & details', 'Select a date and time and share patient details.'],
            ['Review & pay', 'Confirm the booking and choose a payment method.'],
            ['Booking confirmed', 'Get the booking details and track the visit.'],
          ].map(([title, text], i) => (
            <article key={title}>
              <div><span>{i + 1}</span>{i < 4 && <ChevronRight aria-hidden="true" />}</div>
              <b>{title}</b><p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <EmergencyStrip />
    </div>
  );
}

// ── service / packages ─────────────────────────────────────────────────────

function ServicePage({ tab, packages, pickedKey, onPick, onAgency, onQuote, loading, error, hasPin, onRetry, onOpenTab }: {
  tab: Tab; packages: HcPackage[]; pickedKey: string; onPick: (key: string) => void; onAgency: () => void; onQuote: () => void;
  loading: boolean; error: string; hasPin: boolean; onRetry: () => void; onOpenTab: (t: Tab) => void;
}) {
  const [view, setView] = useState<'overview' | 'packages' | 'included' | 'faq'>('packages');
  const copy = CATEGORY_COPY[tab];
  const pkg = packages.find(p => p.key === pickedKey) || packages[0] || null;
  const included = [...new Set(packages.flatMap(p => p.includes))];
  const counts = packages.reduce((n, p) => n + p.services.length, 0);
  const minDuration = packages.filter(p => p.kind === 'VISIT' && p.minutes != null).map(p => p.minutes!) as number[];
  const shiftHours = [...new Set(packages.filter(p => p.kind === 'SHIFT').map(p => p.shiftHours).filter(Boolean))];

  return (
    <div className="hc2">
      <Crumbs items={[{ label: copy.short }]} />
      <Hero compact title={copy.title} eyebrow="Home care services" text={copy.text}>
        <TrustPills tone="warm" items={[
          ...(minDuration.length ? [{ icon: Clock, label: `Visits ${Math.min(...minDuration)}${Math.max(...minDuration) !== Math.min(...minDuration) ? `–${Math.max(...minDuration)}` : ''} minutes` }] : []),
          ...(shiftHours.length ? [{ icon: Clock, label: `${shiftHours.join(' / ')}-hour shifts` }] : []),
          { icon: ShieldCheck, label: 'Agencies on Vizito' },
          { icon: AlertTriangle, label: 'Not for emergencies — call 108' },
        ]} />
      </Hero>

      <div className="hc2-service-tabs" role="tablist" aria-label="Service information">
        {([['overview', 'Overview'], ['packages', 'Packages'], ['included', "What's included"], ['faq', 'FAQs']] as const).map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={view === key} className={view === key ? 'is-active' : ''} onClick={() => setView(key)}>{label}</button>
        ))}
      </div>

      <div className="hc2-service-layout">
        <div className="hc2-service-main">
          {view === 'overview' && (
            <section className="hc2-card">
              <div className="hc2-card-head"><h2>About {copy.short.toLowerCase()}</h2></div>
              <p className="hc2-body">{copy.text} Every package below is offered by an agency on Vizito. Choose a package to see the agencies that offer it at your PIN, their team and their real price.</p>
              <ul className="hc2-checks">
                <li><Check /> The agency assigns a qualified professional; you see their name and qualification before the visit.</li>
                <li><Check /> Visit codes are shared at the door so you know who is coming in.</li>
                <li><Check /> Pay online or after the visit — you choose at review.</li>
                <li><Check /> No live location is shown; the visit status tells you when the professional sets out and arrives.</li>
              </ul>
              <button type="button" className="hc2-btn hc2-btn--primary" onClick={() => setView('packages')}>See packages <ArrowRight /></button>
            </section>
          )}

          {view === 'packages' && (
            <section className="hc2-card" aria-labelledby="hc2-packages-title">
              <div className="hc2-card-head">
                <div><h2 id="hc2-packages-title">Choose a package</h2><p>Select a package that suits your needs. The final price depends on the agency you choose.</p></div>
              </div>
              {loading && <p className="hc2-muted" role="status">Loading packages near you…</p>}
              {!loading && error && <div className="hc2-error" role="alert"><p>{error}</p><button type="button" onClick={onRetry}>Retry</button></div>}
              {!loading && !error && !hasPin && <div className="hc2-empty"><MapPin /><h3>Set your location to see packages</h3><p>Choose an area or enter your home PIN above. Packages and prices depend on the agencies that serve your PIN.</p></div>}
              {!loading && !error && hasPin && !packages.length && (
                <div className="hc2-empty"><Home /><h3>No {copy.short.toLowerCase()} packages at this PIN yet</h3><p>Try another PIN or ask for a 12h / 24h care quote.</p><button type="button" className="hc2-btn hc2-btn--primary" onClick={onQuote}>Request a quote</button></div>
              )}
              {!loading && !error && packages.length > 0 && (
                <div className="hc2-packagelist" role="radiogroup" aria-label="Packages">
                  {packages.map(p => {
                    const active = pkg?.key === p.key;
                    return (
                      <button key={p.key} type="button" role="radio" aria-checked={active} className={`hc2-package ${active ? 'is-active' : ''}`} onClick={() => onPick(p.key)}>
                        <span className="hc2-radio" aria-hidden="true" />
                        <span className="hc2-package-icon"><PackageIcon kind={p.kind} category={p.category} /></span>
                        <span className="hc2-package-copy">
                          <b>{p.name}</b>
                          <small>{p.duration}</small>
                          {p.description && <p>{p.description}</p>}
                        </span>
                        <span className="hc2-package-price">
                          <small>from</small>
                          <b>{money(p.from)}</b>
                          <span>{perLabel(p.minutes, p.shiftHours, p.kind)}</span>
                        </span>
                      </button>
                    );
                  })}
                  <div className="hc2-quote-strip">
                    <span className="hc2-quote-icon"><CalendarDays /></span>
                    <div><b>Need 12 hours or 24 hours care?</b><p>For long-term or round-the-clock care, request a custom quote based on your needs.</p></div>
                    <button type="button" className="hc2-btn hc2-btn--ghost" onClick={onQuote}>Request a quote</button>
                  </div>
                </div>
              )}
            </section>
          )}

          {view === 'included' && (
            <section className="hc2-card">
              <div className="hc2-card-head"><h2>What's included</h2></div>
              {included.length ? (
                <ul className="hc2-checks">{included.map(line => <li key={line}><Check />{line}</li>)}</ul>
              ) : <p className="hc2-body">The agency confirms exactly what is included before the visit. Ask about medicines, dressings or equipment when the agency calls.</p>}
              <p className="hc2-muted">{counts} {counts === 1 ? 'service is' : 'services are'} listed for this care type at the selected PIN. Each package shows the real lowest price across agencies.</p>
            </section>
          )}

          {view === 'faq' && (
            <section className="hc2-card hc2-faq">
              <div className="hc2-card-head"><h2>FAQs</h2></div>
              <details><summary>Who will come to my home?</summary><p>The agency assigns a qualified professional. Their name, role, qualification and experience appear on the booking once assigned — never a star rating.</p></details>
              <details><summary>How does payment work?</summary><p>You can pay online now, or pay the agency after the visit. The total is the agency's price for the package × the number of visits.</p></details>
              <details><summary>Can I cancel?</summary><p>Yes. You get a full refund if you cancel before the professional sets out. If they are already on the way, half of one visit (at most ₹300) is kept. Once they arrive, the current visit cannot be cancelled.</p></details>
              <details><summary>Is home care for emergencies?</summary><p>No. For chest pain, breathlessness, loss of consciousness or heavy bleeding, call 108 immediately.</p></details>
              <details><summary>Can I book for a family member?</summary><p>Yes. Choose the family member on the schedule step, or add them from Family Members first.</p></details>
              <button type="button" className="hc2-text-link" onClick={() => onOpenTab('nursing')}>Browse nursing care <ChevronRight /></button>
            </section>
          )}
        </div>

        <aside className="hc2-card hc2-selection" aria-label="Your selection">
          <h2>Your selection</h2>
          {pkg ? (
            <>
              <div className="hc2-selection-pkg">
                <span className="hc2-package-icon"><PackageIcon kind={pkg.kind} category={pkg.category} /></span>
                <div><b>{pkg.name}</b><small>{pkg.duration}</small></div>
              </div>
              <div className="hc2-selection-price"><small>From</small><b>{money(pkg.from)}</b><span>{perLabel(pkg.minutes, pkg.shiftHours, pkg.kind)}</span></div>
              <ul className="hc2-selection-list">
                <li><Info />Price varies by agency</li>
                <li><UserCheck />Next: choose an agency and view its team</li>
                <li><CalendarDays />You can select date and time in the next step</li>
              </ul>
              <button type="button" className="hc2-btn hc2-btn--primary hc2-btn--block" onClick={onAgency} disabled={!hasPin || loading || !packages.length}>Choose agency <ArrowRight /></button>
            </>
          ) : <p className="hc2-muted">Set your location to see packages.</p>}
        </aside>
      </div>

      <div className="hc2-benefits">
        {[
          { icon: Home, title: 'Care at home', text: 'Professional care without travelling.' },
          { icon: ShieldCheck, title: 'Trained professionals', text: 'Real qualifications and experience.' },
          { icon: Clock, title: 'Flexible timings', text: 'Choose a time that works for you.' },
        ].map(item => <div className="hc2-card" key={item.title}><span><item.icon /></span><div><b>{item.title}</b><small>{item.text}</small></div></div>)}
      </div>

      <EmergencyStrip />
    </div>
  );
}

// ── agency list ────────────────────────────────────────────────────────────

function AgencyPage({ pkg, tab, pin, areaLabel, loading, error, onRetry, onBack, onSelect, onQuote }: {
  pkg: HcPackage; tab: Tab; pin: string; areaLabel: string; loading: boolean; error: string; onRetry: () => void; onBack: () => void;
  onSelect: (agencyId: string, serviceId: string) => void; onQuote: () => void;
}) {
  const rows = useMemo(() => agenciesForPackage(pkg), [pkg]);
  const languages = useMemo(() => [...new Set(rows.flatMap(r => r.service.team?.languages || []))].sort(), [rows]);
  const rated = rows.some(r => r.service.agency.rating != null && r.service.agency.ratings > 0);
  const distances = rows.some(r => r.service.agency.distance_km != null);
  const [langs, setLangs] = useState<string[]>([]);
  const [femaleOnly, setFemaleOnly] = useState(false);
  const [rating, setRating] = useState('');
  const [band, setBand] = useState('');
  const [sort, setSort] = useState<'nearest' | 'price' | 'earliest'>(distances ? 'nearest' : 'price');
  const [page, setPage] = useState(1);
  const perPage = 6;

  useEffect(() => { setPage(1); }, [langs, femaleOnly, rating, band, sort]);

  const earliest = (s: HcService) => s.earliest_start ? `${s.earliest_start.date}T${s.earliest_start.time}` : '9999';
  const filtered = rows.filter(({ service: s }) => {
    if (langs.length && !langs.every(l => s.team?.languages.includes(l))) return false;
    if (femaleOnly && !s.team?.available_genders.includes('FEMALE')) return false;
    if (rating && (s.agency.rating == null || Number(s.agency.rating) < Number(rating))) return false;
    if (band === 'low' && s.price > 800) return false;
    if (band === 'mid' && (s.price < 801 || s.price > 1200)) return false;
    if (band === 'high' && (s.price < 1201 || s.price > 1500)) return false;
    if (band === 'premium' && s.price <= 1500) return false;
    return true;
  }).sort((a, b) => sort === 'price' ? a.service.price - b.service.price : sort === 'earliest' ? earliest(a.service).localeCompare(earliest(b.service)) : (a.service.agency.distance_km ?? Infinity) - (b.service.agency.distance_km ?? Infinity));

  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const shown = filtered.slice((page - 1) * perPage, page * perPage);
  const reset = () => { setLangs([]); setFemaleOnly(false); setRating(''); setBand(''); };

  return (
    <div className="hc2">
      <Crumbs items={[{ label: CATEGORY_COPY[tab].short, to: `/home-care?tab=${tab}` }, { label: 'Choose a home care agency' }]} />
      <Hero compact title="Choose a home care agency">
        <div className="hc2-agency-hero-copy">
          <b>{pkg.name}{pkg.duration ? ` · ${pkg.duration}` : ''}</b>
          {pkg.description && <p>{pkg.description}</p>}
          <span className="hc2-locchip"><MapPin />{areaLabel ? `${areaLabel} — ${pin}` : `Home PIN ${pin}`}</span>
        </div>
        <button type="button" className="hc2-btn hc2-btn--ghost" onClick={onBack}><ArrowLeft /> Back to packages</button>
      </Hero>

      <p className="hc2-info-strip"><Info />The agency assigns a qualified professional. You'll see their name and qualification before the visit.</p>

      <div className="hc2-agency-layout">
        <aside className="hc2-card hc2-filters" aria-label="Filters">
          <div className="hc2-card-head"><h2>Filters</h2><button type="button" className="hc2-text-link" onClick={reset}>Clear all</button></div>
          {rated && (
            <fieldset>
              <legend>Rating</legend>
              {['4.5', '4.0', '3.5'].map(v => <label key={v}><input type="radio" name="hc2-rating" checked={rating === v} onChange={() => setRating(v)} />{v} &amp; above</label>)}
            </fieldset>
          )}
          {languages.length > 0 && (
            <fieldset>
              <legend>Languages spoken</legend>
              {languages.map(l => <label key={l}><input type="checkbox" checked={langs.includes(l)} onChange={e => setLangs(e.target.checked ? [...langs, l] : langs.filter(x => x !== l))} />{l}</label>)}
            </fieldset>
          )}
          <label className="hc2-check"><input type="checkbox" checked={femaleOnly} onChange={e => setFemaleOnly(e.target.checked)} />Female professional available</label>
          <fieldset>
            <legend>Price range ({perLabel(pkg.minutes, pkg.shiftHours, pkg.kind).split(' (')[0]})</legend>
            {[['low', 'Up to ₹800'], ['mid', '₹801 – ₹1,200'], ['high', '₹1,201 – ₹1,500'], ['premium', 'Above ₹1,500']].map(([v, label]) => (
              <label key={v}><input type="radio" name="hc2-band" checked={band === v} onChange={() => setBand(v)} />{label}</label>
            ))}
          </fieldset>
        </aside>

        <section className="hc2-agency-results" aria-live="polite">
          <div className="hc2-agency-head">
            <h2>{loading ? 'Loading agencies…' : `${filtered.length} ${filtered.length === 1 ? 'agency' : 'agencies'} found`}</h2>
            <label>Sort by
              <select value={sort} onChange={e => setSort(e.target.value as typeof sort)}>
                {distances && <option value="nearest">Nearest</option>}
                <option value="price">Lowest price</option>
                <option value="earliest">Earliest visit</option>
              </select>
            </label>
          </div>
          {error && <div className="hc2-error" role="alert"><p>{error}</p><button type="button" onClick={onRetry}>Retry</button></div>}
          {!loading && !error && !filtered.length && (
            <div className="hc2-card hc2-empty"><Home /><h3>No agency matches these filters</h3><p>Clear the filters, try another PIN, or request a 12h / 24h quote.</p><div className="hc2-empty-actions"><button type="button" className="hc2-btn hc2-btn--ghost" onClick={reset}>Clear filters</button><button type="button" className="hc2-btn hc2-btn--primary" onClick={onQuote}>Request a quote</button></div></div>
          )}
          {!loading && !error && shown.map(({ service: s }) => {
            const a = s.agency;
            const genders = s.team?.available_genders || [];
            const genderText = genders.length === 2 ? 'Male and female professionals' : genders.includes('FEMALE') ? 'Female professional' : genders.includes('MALE') ? 'Male professional' : '';
            const quals = (s.team?.qualifications || []).slice(0, 2);
            const hasRating = a.ratings > 0 && a.rating != null;
            return (
              <article className="hc2-card hc2-agency-card" key={a.id}>
                <AgencyLogo service={s} />
                <div className="hc2-agency-main">
                  <h3>{a.name}</h3>
                  {a.on_vizito_since && <p className="hc2-since">On Vizito since {monthYear(a.on_vizito_since)}</p>}
                  <div className="hc2-agency-sub">
                    {hasRating && <span className="hc2-rating">★ {Number(a.rating).toFixed(1)} <small>({a.ratings} reviews)</small></span>}
                    {a.distance_km != null && <span><MapPin />{a.distance_km < 10 ? `${a.distance_km.toFixed(1)} km` : `${Math.round(a.distance_km)} km`}</span>}
                  </div>
                  <div className="hc2-agency-meta">
                    <div><Clock /><b>{a.hours}</b>{s.earliest_start && <small>Earliest {dateTiny(s.earliest_start.date) === dateTiny(isoAdd(0)) ? 'today' : dateTiny(s.earliest_start.date)}</small>}</div>
                    {s.professionals > 0 && <div><Users /><b>{s.professionals} {s.professionals === 1 ? 'care professional' : 'care professionals'}</b>{genderText && <small>{genderText}</small>}</div>}
                    {(quals.length > 0 || s.avg_experience != null) && <div><BadgeCheck /><b>{quals.join(' · ') || 'Qualified team'}</b>{s.avg_experience != null && <small>Avg {s.avg_experience} yrs experience</small>}</div>}
                    {s.earliest_start && <div><CalendarDays /><b>Earliest visit</b><small>{(dateTiny(s.earliest_start.date) === dateTiny(isoAdd(0)) ? 'Today' : dateTiny(s.earliest_start.date))}, {time12(s.earliest_start.time)}</small></div>}
                  </div>
                  {(s.team?.languages || []).length > 0 && <div className="hc2-langchips">{s.team!.languages.map(l => <span key={l}>{l}</span>)}</div>}
                </div>
                <div className="hc2-agency-price">
                  <span>from</span><b>{money(s.price)}</b><small>{perLabel(s.duration_minutes, s.shift_hours, s.kind)}</small>
                  <button type="button" className="hc2-btn hc2-btn--primary" onClick={() => onSelect(a.id, s.id)}>Select</button>
                </div>
              </article>
            );
          })}
          {pages > 1 && (
            <nav className="hc2-pager" aria-label="Agency pages">
              <button type="button" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</button>
              {Array.from({ length: pages }, (_, i) => i + 1).map(n => <button key={n} type="button" aria-current={page === n ? 'page' : undefined} onClick={() => setPage(n)}>{n}</button>)}
              <button type="button" disabled={page === pages} onClick={() => setPage(p => Math.min(pages, p + 1))}>Next</button>
            </nav>
          )}
        </section>
      </div>

      <EmergencyStrip />
    </div>
  );
}

// ── schedule ───────────────────────────────────────────────────────────────

function SchedulePage({ tab, pkg, service, draft, setDraft, family, familyError, savedAddresses, onBack, onContinue, onQuote }: {
  tab: Tab; pkg: HcPackage; service: HcService; draft: Draft; setDraft: React.Dispatch<React.SetStateAction<Draft>>;
  family: PatientFamilyMember[]; familyError: string; savedAddresses: PatientAddress[];
  onBack: () => void; onContinue: () => void; onQuote: () => void;
}) {
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [course, setCourse] = useState(draft.sessions > 1);
  const alertRef = useRef<HTMLDivElement>(null);
  const days = dayChips(8);
  const minDate = earliestDate(service);
  const groups = slotGroups(service, draft.date);
  const allSlots = groups.flatMap(g => g.slots);
  const genders = service.team?.available_genders?.length ? service.team.available_genders : ['FEMALE', 'MALE'] as const;
  const total = service.price * draft.sessions;
  const unit = service.kind === 'VISIT' ? 'visit' : 'shift';

  useEffect(() => {
    if (draft.time && allSlots.includes(draft.time)) return;
    setDraft(cur => ({ ...cur, time: allSlots[0] || '' }));
  }, [draft.date, draft.time, allSlots.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  // A service whose earliest start is later than the default "tomorrow" opens on that first real day.
  useEffect(() => {
    if (draft.date < minDate) setDraft(cur => ({ ...cur, date: minDate, time: '' }));
  }, [minDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickDate = (date: string) => { setDraft(cur => ({ ...cur, date, time: '' })); setError(''); };
  const setSessions = (n: number) => setDraft(cur => ({ ...cur, sessions: Math.max(1, Math.min(30, n)) }));

  const applyAddress = (a: PatientAddress) => setDraft(cur => ({
    ...cur,
    address: { line: a.addressLine1 || '', area: a.addressLine2 || '', city: a.city || '', pincode: a.pincode || cur.address.pincode, landmark: a.landmark || '' },
    homePin: a.pin || null,
    addressOpen: false,
  }));

  const upload = async (file?: File) => {
    if (!file) return;
    setUploadError('');
    if (file.size > 10 * 1024 * 1024 || !['application/pdf', 'image/png', 'image/jpeg'].includes(file.type)) {
      setUploadError('Choose a PDF, JPG or PNG file up to 10 MB.'); return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('doc_type', draft.referralType);
      form.append('subject', draft.who || 'self');
      const doc = await recordsApi.upload(form);
      setDraft(cur => ({ ...cur, referralDoc: doc }));
    } catch (e) {
      setUploadError(labError(e, 'Unable to upload the referral. Please try again.'));
    } finally { setUploading(false); }
  };

  const submit = () => {
    setError('');
    if (draft.condition.trim().length < 10) return fail('Describe the condition or reason for care (at least 10 characters).');
    if (!draft.time) return fail('Choose a visit time.');
    if (!draft.address.line.trim() || draft.address.line.trim().length < 5) return fail('Enter the house / flat number and street.');
    if (draft.address.city.trim().length < 2) return fail('Enter your city.');
    if (!PIN_RE.test(draft.address.pincode)) return fail('Enter a valid 6-digit home PIN in the care address.');
    onContinue();
  };

  const fail = (message: string) => {
    setError(message);
    window.setTimeout(() => alertRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 20);
  };

  const addressText = [draft.address.line, draft.address.area, draft.address.city, draft.address.pincode].filter(Boolean).join(', ');

  return (
    <div className="hc2">
      <Crumbs items={[{ label: CATEGORY_COPY[tab].short, to: `/home-care?tab=${tab}` }, { label: 'Choose a home care agency', to: `/home-care?tab=${tab}&step=agency&package=${encodeURIComponent(pkg.key)}` }, { label: 'Schedule & details' }]} />
      <StepBar current={3} />

      <div className="hc2-booking-layout">
        <div className="hc2-booking-main">
          {error && <div className="hc2-error" role="alert" ref={alertRef}><p>{error}</p><button type="button" onClick={() => setError('')} aria-label="Dismiss">×</button></div>}

          <section className="hc2-card">
            <div className="hc2-step-title"><span>1</span><div><h2>Who needs care?</h2><p>Select the person who will receive care and share a few details.</p></div></div>
            <div className="hc2-family" role="group" aria-label="Who needs care">
              <button type="button" aria-pressed={draft.who === ''} className={draft.who === '' ? 'is-active' : ''} onClick={() => setDraft(cur => ({ ...cur, who: '' }))}>
                <span className="hc2-avatar">{initialsOf(SELF_NAME)}</span><span><b>{SELF_NAME}</b><small>Self</small></span>
              </button>
              {family.map(f => (
                <button key={f.memberUserId} type="button" aria-pressed={draft.who === String(f.memberUserId)} className={draft.who === String(f.memberUserId) ? 'is-active' : ''} onClick={() => setDraft(cur => ({ ...cur, who: String(f.memberUserId) }))}>
                  <span className="hc2-avatar is-warm">{initialsOf(f.name)}</span><span><b>{f.name}</b><small>{f.relationship}</small></span>
                </button>
              ))}
              <Link to="/family-profiles" className="hc2-add-member"><Plus />Add family member</Link>
            </div>
            {familyError && <p className="hc2-warn">{familyError} You can still book for yourself.</p>}

            <label className="hc2-field">Condition / reason for care
              <textarea maxLength={300} rows={3} value={draft.condition} onChange={e => setDraft(cur => ({ ...cur, condition: e.target.value }))} placeholder="E.g. post-surgery care, fever, injection, wound dressing, elderly care, etc." />
              <small>{draft.condition.length}/300</small>
            </label>

            <fieldset className="hc2-mobility">
              <legend>Mobility status</legend>
              <div>
                {MOBILITY.map(m => (
                  <button key={m.value} type="button" aria-pressed={draft.mobility === m.value} className={draft.mobility === m.value ? 'is-active' : ''} onClick={() => setDraft(cur => ({ ...cur, mobility: m.value }))}>
                    <span className="hc2-radio" aria-hidden="true" />
                    <m.icon />
                    <span><b>{m.label}</b><small>{m.hint}</small></span>
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="hc2-referral">
              <p>Doctor referral (optional)</p>
              {draft.referralDoc ? (
                <div className="hc2-file-done">
                  <FileText /><span>{draft.referralDoc.file_name}</span>
                  <button type="button" onClick={() => setDraft(cur => ({ ...cur, referralDoc: null }))} aria-label="Remove referral"><Trash2 /></button>
                </div>
              ) : (
                <label className="hc2-upload">
                  <Upload />
                  <span>{uploading ? 'Uploading…' : 'Upload prescription or doctor’s note'}</span>
                  <small>PDF, JPG, PNG up to 10 MB</small>
                  <input type="file" accept="application/pdf,image/jpeg,image/png" disabled={uploading} onChange={e => void upload(e.target.files?.[0])} />
                </label>
              )}
              {uploadError && <p className="hc2-warn">{uploadError}</p>}
            </div>
          </section>

          <section className="hc2-card">
            <div className="hc2-step-title"><span>2</span><div><h2>Plan</h2><p>Choose visit plan, date and time.</p></div></div>
            <div className="hc2-plan" role="radiogroup" aria-label="Plan type">
              <button type="button" role="radio" aria-checked={!course} className={!course ? 'is-active' : ''} onClick={() => { setCourse(false); setSessions(1); }}>
                <span className="hc2-radio" aria-hidden="true" />
                <span><b>Single visit</b><small>One-time {service.kind === 'VISIT' ? 'care visit' : 'shift'}</small></span>
              </button>
              <button type="button" role="radio" aria-checked={course} className={course ? 'is-active' : ''} onClick={() => { setCourse(true); setSessions(Math.max(2, draft.sessions)); }}>
                <span className="hc2-radio" aria-hidden="true" />
                <span><b>Course of visits</b><small>Multiple {service.kind === 'VISIT' ? 'visits' : 'shifts'} on selected days</small></span>
              </button>
            </div>

            <div className="hc2-field-label">Select date</div>
            <div className="hc2-days" role="group" aria-label="Start date">
              {days.map(d => (
                <button key={d.iso} type="button" disabled={d.iso < minDate} aria-pressed={draft.date === d.iso} className={draft.date === d.iso ? 'is-active' : ''} onClick={() => pickDate(d.iso)}>
                  <span>{d.week}</span><b>{d.day}</b><small>{d.month}</small>
                </button>
              ))}
            </div>

            <div className="hc2-field-label">Select time</div>
            {groups.length ? (
              <div className="hc2-times">
                {groups.map(g => (
                  <div key={g.label}>
                    <b>{g.label}</b>
                    <div>{g.slots.map(t => <button key={t} type="button" aria-pressed={draft.time === t} className={draft.time === t ? 'is-active' : ''} onClick={() => setDraft(cur => ({ ...cur, time: t }))}>{time12(t)}</button>)}</div>
                  </div>
                ))}
              </div>
            ) : <p className="hc2-warn">No times left on this date. Choose another date.</p>}

            <div className="hc2-gender-row">
              <fieldset className="hc2-gender">
                <legend>Preferred gender for professional</legend>
                {([['ANY', 'Any'], ['FEMALE', 'Female'], ['MALE', 'Male']] as const).filter(([v]) => v === 'ANY' || (genders as readonly string[]).includes(v)).map(([v, label]) => (
                  <label key={v}><input type="radio" name="hc2-gender" checked={draft.gender === v} onChange={() => setDraft(cur => ({ ...cur, gender: v }))} />{label}</label>
                ))}
              </fieldset>
              {course && (
                <div className="hc2-counter">
                  <span>Number of {service.kind === 'VISIT' ? 'visits' : 'shifts'}</span>
                  <div>
                    <button type="button" aria-label="Fewer visits" onClick={() => setSessions(draft.sessions - 1)} disabled={draft.sessions <= 2}><Minus /></button>
                    <b>{draft.sessions}</b>
                    <button type="button" aria-label="More visits" onClick={() => setSessions(draft.sessions + 1)} disabled={draft.sessions >= 30}><Plus /></button>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="hc2-card">
            <div className="hc2-step-title"><span>3</span><div><h2>Care address</h2><p>This is where the professional will visit.</p></div></div>
            {!draft.addressOpen ? (
              <div className="hc2-address-row">
                <MapPin />
                <div><b>{addressText || 'Add your care address'}</b>{draft.address.landmark && <small>{draft.address.landmark}</small>}</div>
                <button type="button" className="hc2-text-link" onClick={() => setDraft(cur => ({ ...cur, addressOpen: true }))}>Change</button>
              </div>
            ) : (
              <div className="hc2-address-fields">
                {savedAddresses.length > 0 && (
                  <label className="hc2-field">Saved addresses
                    <select value="" onChange={e => { const a = savedAddresses.find(x => String(x.addressId) === e.target.value); if (a) applyAddress(a); }}>
                      <option value="">Choose a saved address</option>
                      {savedAddresses.map(a => <option key={a.addressId} value={a.addressId}>{a.label || 'Home'} — {a.addressLine1}, {a.pincode}</option>)}
                    </select>
                  </label>
                )}
                <div className="hc2-address-grid">
                  <label className="hc2-field is-wide">House / flat and street<input value={draft.address.line} maxLength={180} onChange={e => setDraft(cur => ({ ...cur, address: { ...cur.address, line: e.target.value } }))} placeholder="Flat 101, Sai Residency" /></label>
                  <label className="hc2-field">Area<input value={draft.address.area} maxLength={120} onChange={e => setDraft(cur => ({ ...cur, address: { ...cur.address, area: e.target.value } }))} placeholder="Kondapur" /></label>
                  <label className="hc2-field">City<input value={draft.address.city} maxLength={60} onChange={e => setDraft(cur => ({ ...cur, address: { ...cur.address, city: e.target.value } }))} placeholder="Hyderabad" /></label>
                  <label className="hc2-field">PIN code<input inputMode="numeric" maxLength={6} value={draft.address.pincode} onChange={e => setDraft(cur => ({ ...cur, address: { ...cur.address, pincode: e.target.value.replace(/\D/g, '') } }))} placeholder="500084" /></label>
                  <label className="hc2-field">Landmark (optional)<input value={draft.address.landmark} maxLength={120} onChange={e => setDraft(cur => ({ ...cur, address: { ...cur.address, landmark: e.target.value } }))} placeholder="Near the park" /></label>
                </div>
                <HomePinField value={draft.homePin} onChange={pin => setDraft(cur => ({ ...cur, homePin: pin }))} who="care professional" />
                <button type="button" className="hc2-text-link" onClick={() => setDraft(cur => ({ ...cur, addressOpen: false }))}>{addressText ? 'Done' : 'Hide address fields'}</button>
              </div>
            )}
          </section>
        </div>

        <aside className="hc2-card hc2-summary" aria-label="Booking summary">
          <h2>Booking summary</h2>
          <div className="hc2-sum-block">
            <small>Service</small>
            <div className="hc2-sum-pkg">
              <span className="hc2-package-icon"><PackageIcon kind={pkg.kind} category={pkg.category} /></span>
              <div><b>{CATEGORY_COPY[tab].short} at home</b><span>{pkg.name} · {pkg.duration}</span>{pkg.description && <small>{pkg.description}</small>}</div>
              <div className="hc2-sum-price"><b>{money(service.price)}</b><small>{perLabel(pkg.minutes, pkg.shiftHours, pkg.kind)}</small></div>
            </div>
          </div>
          <div className="hc2-sum-block">
            <div className="hc2-sum-title"><small>Agency</small><button type="button" className="hc2-text-link" onClick={onBack}>Change</button></div>
            <div className="hc2-sum-agency">
              <AgencyLogo service={service} size="sm" />
              <div><b>{service.agency.name}</b>{service.agency.ratings > 0 && service.agency.rating != null && <span className="hc2-rating">★ {Number(service.agency.rating).toFixed(1)} <small>({service.agency.ratings} reviews)</small></span>}{service.agency.on_vizito_since && <small>On Vizito since {monthYear(service.agency.on_vizito_since)}</small>}</div>
            </div>
          </div>
          <div className="hc2-sum-block">
            <small>Date &amp; time</small>
            <p className="hc2-sum-line"><CalendarDays />{dateLong(draft.date)}</p>
            {draft.time && <p className="hc2-sum-line"><Clock />{time12(draft.time)} – {time12(endTime(draft.time, service.kind === 'SHIFT' ? (service.shift_hours || 12) * 60 : (service.duration_minutes || 60)).time)}</p>}
          </div>
          <div className="hc2-sum-block">
            <small>{service.kind === 'VISIT' ? 'Visits' : 'Shifts'}</small>
            <p className="hc2-sum-line"><User />{draft.sessions} {unit}{draft.sessions === 1 ? '' : 's'}</p>
          </div>
          <div className="hc2-sum-total"><span>Total</span><b>{money(total)}</b></div>
          <button type="button" className="hc2-btn hc2-btn--primary hc2-btn--block" onClick={submit}>Continue to review <ArrowRight /></button>
          <p className="hc2-sum-note"><Info />The agency assigns a qualified professional. You'll see their name and qualification before the visit.</p>
        </aside>
      </div>

      <EmergencyStrip />
    </div>
  );
}

// ── review & pay ───────────────────────────────────────────────────────────

function ReviewPage({ tab, pkg, service, draft, setDraft, family, total, referralId, onEdit, onBack, onBooked, onQuote }: {
  tab: Tab; pkg: HcPackage; service: HcService; draft: Draft; setDraft: React.Dispatch<React.SetStateAction<Draft>>;
  family: PatientFamilyMember[];
  total: number; referralId?: string; onEdit: (target: 'schedule' | 'agency' | 'service') => void; onBack: () => void;
  onBooked: (order: HcOrder) => void; onQuote: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const unit = service.kind === 'VISIT' ? 'visit' : 'shift';
  const member = draft.who ? family.find(f => String(f.memberUserId) === draft.who) : null;
  const person = member?.name || (draft.who ? 'Family member' : SELF_NAME);
  const personSub = member?.relationship || (draft.who ? 'Family member' : 'Self');
  const end = draft.time ? endTime(draft.time, service.kind === 'SHIFT' ? (service.shift_hours || 12) * 60 : (service.duration_minutes || 60)) : null;
  const addressText = [draft.address.line, draft.address.area, draft.address.city, draft.address.pincode].filter(Boolean).join(', ');

  const book = async () => {
    if (busy) return;
    setBusy(true); setError('');
    let payment: PaidOnline | undefined;
    if (draft.pay === 'ONLINE') {
      try {
        payment = await payOnline({ amount: total, purpose: 'home_care', description: `${pkg.name} · ${draft.sessions} ${unit}${draft.sessions === 1 ? '' : 's'}` });
      } catch (e) {
        setError(e instanceof PaymentCancelled ? e.message : `${(e as Error)?.message || 'The payment failed.'} You can try again or choose pay after visit.`);
        setBusy(false); return;
      }
    }
    try {
      const order = await hcBookApi({
        service_id: service.id,
        sessions: draft.sessions,
        start_date: draft.date,
        start_time: draft.time,
        weekdays: [],
        address: {
          line: draft.address.line.trim(), area: draft.address.area.trim() || undefined, landmark: draft.address.landmark.trim() || undefined,
          city: draft.address.city.trim(), pincode: draft.address.pincode, pin: draft.homePin || undefined,
        },
        care_needs: [draft.condition.trim(), `Mobility: ${draft.mobility}`, draft.notes.trim()].filter(Boolean).join('. ').slice(0, 500),
        preferred_gender: draft.gender,
        family_member_id: draft.who || undefined,
        payment_mode: draft.pay === 'ONLINE' ? 'UPI' : 'CASH',
        payment,
        referral_id: referralId,
        referral_document_id: draft.referralDoc?.id,
      });
      onBooked(order);
    } catch (e) {
      setError(`${labError(e, 'Unable to book home care. Please try again.')}${payment ? ' Your payment is being refunded (5–7 working days).' : ''}`);
    } finally { setBusy(false); }
  };

  return (
    <div className="hc2">
      <Crumbs items={[{ label: CATEGORY_COPY[tab].short, to: `/home-care?tab=${tab}` }, { label: 'Choose a home care agency', to: `/home-care?tab=${tab}&step=agency&package=${encodeURIComponent(pkg.key)}` }, { label: 'Schedule & details', to: `/home-care?tab=${tab}&step=schedule&package=${encodeURIComponent(pkg.key)}&agency=${encodeURIComponent(service.agency.id)}&service=${encodeURIComponent(service.id)}` }, { label: 'Review & pay' }]} />
      <StepBar current={4} />
      <h1 className="hc2-page-title">Review your booking</h1>
      <p className="hc2-page-sub">Please review the details below before confirming your booking.</p>

      <div className="hc2-review-layout">
        <div className="hc2-review-main">
          <section className="hc2-card hc2-review-card">
            <div className="hc2-review-head"><User /><h2>Patient</h2><button type="button" className="hc2-text-link" onClick={() => onEdit('schedule')}>Edit</button></div>
            <div className="hc2-review-person"><span className="hc2-avatar">{initialsOf(person)}</span><div><b>{person}</b><small>{personSub}</small></div></div>
          </section>

          <section className="hc2-card hc2-review-card">
            <div className="hc2-review-head"><Home /><h2>Service &amp; package</h2><button type="button" className="hc2-text-link" onClick={() => onEdit('service')}>Edit</button></div>
            <div className="hc2-review-service">
              <span className="hc2-package-icon is-lg"><PackageIcon kind={pkg.kind} category={pkg.category} /></span>
              <div><b>{CATEGORY_COPY[tab].short} at home</b><p>{pkg.name} · {pkg.duration}</p>{pkg.description && <small>{pkg.description}</small>}</div>
              <div className="hc2-review-price"><b>{money(service.price)}</b><small>{perLabel(pkg.minutes, pkg.shiftHours, pkg.kind)}</small></div>
            </div>
          </section>

          <section className="hc2-card hc2-review-card">
            <div className="hc2-review-head"><BadgeCheck /><h2>Agency</h2><button type="button" className="hc2-text-link" onClick={() => onEdit('agency')}>Edit</button></div>
            <div className="hc2-review-agency">
              <AgencyLogo service={service} />
              <div className="hc2-review-agency-main">
                <b>{service.agency.name}</b>
                {service.agency.ratings > 0 && service.agency.rating != null && <span className="hc2-rating">★ {Number(service.agency.rating).toFixed(1)} <small>({service.agency.ratings} reviews)</small></span>}
                {service.agency.on_vizito_since && <small>On Vizito since {monthYear(service.agency.on_vizito_since)}</small>}
                <div className="hc2-review-facts">
                  {service.professionals > 0 && <span><Users />{service.professionals} {service.professionals === 1 ? 'care professional' : 'care professionals'}</span>}
                  {(service.team?.qualifications || []).length > 0 && <span><BadgeCheck />{(service.team!.qualifications || []).slice(0, 2).join(' · ')}</span>}
                  {service.earliest_start && <span><Clock />Earliest {dateTiny(service.earliest_start.date)}, {time12(service.earliest_start.time)}</span>}
                  {service.agency.distance_km != null && <span><MapPin />{service.agency.distance_km.toFixed(1)} km</span>}
                </div>
              </div>
            </div>
          </section>

          <section className="hc2-card hc2-review-card">
            <div className="hc2-review-head"><CalendarDays /><h2>Schedule</h2><button type="button" className="hc2-text-link" onClick={() => onEdit('schedule')}>Edit</button></div>
            <div className="hc2-review-schedule">
              <span><CalendarDays /><b>{dateLong(draft.date)}</b></span>
              <span><Clock /><b>{time12(draft.time)}{end ? ` – ${time12(end.time)}${end.nextDay ? ' (next day)' : ''}` : ''}</b></span>
              <span><User /><b>{draft.sessions} {unit}{draft.sessions === 1 ? '' : 's'}</b></span>
            </div>
          </section>

          <section className="hc2-card hc2-review-card">
            <div className="hc2-review-head"><MapPin /><h2>Care address</h2><button type="button" className="hc2-text-link" onClick={() => onEdit('schedule')}>Edit</button></div>
            <div className="hc2-review-address"><span className="hc2-address-icon"><Home /></span><div><b>{addressText}</b>{draft.address.landmark && <small>{draft.address.landmark}</small>}</div></div>
          </section>

          <section className="hc2-card hc2-review-card">
            <div className="hc2-review-head"><FileText /><h2>Condition / reason for care</h2><button type="button" className="hc2-text-link" onClick={() => onEdit('schedule')}>Edit</button></div>
            <p className="hc2-review-needs">{draft.condition.trim().replace(/[.\s]+$/, '')}. {draft.mobility}.{draft.referralDoc ? ` Referral attached: ${draft.referralDoc.file_name}.` : ''}</p>
          </section>
        </div>

        <aside className="hc2-review-side">
          <section className="hc2-card hc2-price-card" aria-label="Price details">
            <h2>Price details</h2>
            <div className="hc2-price-line"><span>{pkg.name}{pkg.duration ? ` (${pkg.duration})` : ''}<small>{money(service.price)} × {draft.sessions} {unit}{draft.sessions === 1 ? '' : 's'}</small></span><b>{money(total)}</b></div>
            <div className="hc2-price-total"><span>Total</span><b>{money(total)}</b></div>
          </section>

          <section className="hc2-card hc2-pay-card" aria-label="Payment option">
            <h2>Choose payment option</h2>
            <div className="hc2-pay-options" role="radiogroup" aria-label="Payment option">
              <button type="button" role="radio" aria-checked={draft.pay === 'AFTER'} className={draft.pay === 'AFTER' ? 'is-active' : ''} onClick={() => setDraft(cur => ({ ...cur, pay: 'AFTER' }))}>
                <span className="hc2-radio" aria-hidden="true" />
                <Wallet />
                <span><b>Pay after visit</b><small>Pay the agency after the visit is completed.</small></span>
              </button>
              <button type="button" role="radio" aria-checked={draft.pay === 'ONLINE'} className={draft.pay === 'ONLINE' ? 'is-active' : ''} onClick={() => setDraft(cur => ({ ...cur, pay: 'ONLINE' }))}>
                <span className="hc2-radio" aria-hidden="true" />
                <ShieldCheck />
                <span><b>Pay online now</b><small>UPI, card or net banking. Secured by Razorpay.</small></span>
              </button>
            </div>
            {draft.pay === 'ONLINE' && <TestPaymentNote />}
            {error && <p className="hc2-pay-error" role="alert">{error}</p>}
            <button type="button" className="hc2-btn hc2-btn--primary hc2-btn--block hc2-btn--lg" disabled={busy} onClick={() => void book()}>
              {busy ? (draft.pay === 'ONLINE' ? 'Opening payment…' : 'Booking…') : draft.pay === 'ONLINE' ? `Pay ${money(total)} & book` : `Confirm booking`} {!busy && <ArrowRight />}
            </button>
            <p className="hc2-secure"><ShieldCheck />Your payment is secure and encrypted.</p>
          </section>

          <div className="hc2-warn-card"><AlertTriangle /><div><b>Not for emergencies — call 108</b><p>Home care is for non-emergency situations only.</p></div></div>

          <section className="hc2-card hc2-policy">
            <div className="hc2-review-head"><Info /><h2>Cancellation policy</h2></div>
            <ul>
              <li>Full refund if you cancel before the professional sets out.</li>
              <li>After they set out, half of one visit (max ₹300) is kept.</li>
              <li>Cannot cancel once they arrive.</li>
            </ul>
          </section>

          <button type="button" className="hc2-text-link" onClick={onBack}><ArrowLeft />Back to schedule</button>
          <button type="button" className="hc2-text-link" onClick={onQuote}>Need 12h / 24h care instead?</button>
        </aside>
      </div>
    </div>
  );
}

// ── confirmation ───────────────────────────────────────────────────────────

function ConfirmedPage({ orderId, onBookAgain }: { orderId: string; onBookAgain: () => void }) {
  const [order, setOrder] = useState<HcOrder | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [trackOpen, setTrackOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState('');

  const load = useCallback((quiet = false) => {
    if (!quiet) setLoading(true);
    hcOrderApi(orderId).then(o => { setOrder(o); setError(''); }).catch(e => setError(labError(e, 'Could not load this booking.'))).finally(() => setLoading(false));
  }, [orderId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!order || ['CANCELLED', 'COMPLETED'].includes(order.status)) return;
    const timer = window.setInterval(() => load(true), 20000);
    return () => window.clearInterval(timer);
  }, [order, load]);

  const copy = async (text: string, key: string) => {
    try { await navigator.clipboard.writeText(text); } catch { /* clipboard can be blocked in some browsers */ }
    setCopied(key);
    window.setTimeout(() => setCopied(''), 2000);
  };

  if (loading && !order) {
    return <div className="hc2"><Crumbs items={[{ label: 'My bookings', to: '/home-care?tab=mine' }, { label: 'Home care booked' }]} /><div className="hc2-card hc2-state" role="status">Loading your booking…</div></div>;
  }
  if (error && !order) {
    return <div className="hc2"><Crumbs items={[{ label: 'My bookings', to: '/home-care?tab=mine' }, { label: 'Home care booked' }]} /><div className="hc2-card hc2-error" role="alert"><p>{error}</p><button type="button" onClick={() => { setRetry(n => n + 1); load(); }}>Retry</button></div></div>;
  }
  if (!order) return null;

  const cancelled = order.status === 'CANCELLED';
  const visit = order.visits?.[0];
  const proVisit = order.visits.find(v => v.professional) || visit;
  const pro = proVisit?.professional || null;
  const paidOnline = order.payment_mode === 'UPI' || order.payment_mode === 'ONLINE';
  const paid = order.payment_status === 'PAID';
  const paidAmount = order.payments.reduce((n, p) => n + Number(p.amount || 0), 0) || order.total_amount;
  const refund = order.refund;
  const refunded = order.payment_status === 'REFUNDED' || refund?.status === 'REFUNDED';
  const badgeText = cancelled
    ? refunded ? `Refunded ${money(refund?.amount || paidAmount)}` : paidOnline && paid ? 'Refund pending' : 'No payment taken'
    : paidOnline
      ? `${paid ? (PAYMENTS_SIMULATED ? 'Paid online · test mode' : 'Paid online') : 'Online payment pending'}${paid ? ` ${money(paidAmount)}` : ''}`
      : `Pay after visit · ${money(order.total_amount)}`;
  const nextActionable = order.visits.some(v => !['COMPLETED', 'CANCELLED', 'FAILED', 'NO_SHOW'].includes(v.status));

  return (
    <div className="hc2">
      <Crumbs items={[{ label: 'My bookings', to: '/home-care?tab=mine' }, { label: cancelled ? 'Home care cancelled' : 'Home care booked' }]} />

      <section className={`hc2-confirm-hero ${cancelled ? 'is-cancelled' : ''}`}>
        <div className="hc2-confirm-copy">
          <span className="hc2-confirm-check">{cancelled ? <X /> : <Check />}</span>
          <div>
            <h1>{cancelled ? 'Home care cancelled' : 'Home care booked'}</h1>
            <p>{cancelled ? (refund?.status === 'REFUNDED' ? 'Your booking was cancelled and the refund is recorded.' : 'Your booking was cancelled.') : order.status === 'CONFIRMED' ? 'Your home care service has been confirmed.' : 'Your booking is in. The agency will confirm your professional.'}</p>
            <div className="hc2-booking-id">
              <span>Booking ID: <b>{order.order_number}</b></span>
              <button type="button" aria-label="Copy booking ID" onClick={() => void copy(order.order_number, 'order')}>{copied === 'order' ? <Check /> : <Copy />}</button>
              <span className={`hc2-paidbadge ${paid || refunded ? 'is-paid' : ''}`}>{badgeText}</span>
            </div>
          </div>
        </div>
        <img src="/images/healthcare/banners/homecare-hero.webp" alt="" />
      </section>

      {notice && <div className="hc2-cancel-notice" role="status"><CheckCircle2 /><p>{notice}</p></div>}
      {cancelled && refund && !notice && (
        <div className="hc2-cancel-notice" role="status"><RotateCcw /><p>
          {refund.status === 'REFUNDED' ? refundText(money(refund.amount)) : refund.status === 'NEEDS_SUPPORT' ? `Your ${money(refund.amount)} refund is being processed by our support team.` : 'No payment was taken, so there is nothing to refund.'}
        </p></div>
      )}

      <div className="hc2-confirm-grid">
        <div className="hc2-confirm-main">
          <div className="hc2-confirm-cards">
            <section className="hc2-card hc2-code-card">
              <span className="hc2-code-icon"><BadgeCheck /></span>
              <div>
                <small>Visit code</small>
                {visit?.visit_code ? <>
                  <b className="hc2-code">{visit.visit_code}</b>
                  <p>Share this code only when the professional arrives at your home.</p>
                </> : <p>The visit code appears here once the visit is scheduled.</p>}
              </div>
            </section>

            <section className="hc2-card hc2-pro-card">
              <div className="hc2-review-head"><UserCheck /><h2>Assigned professional</h2></div>
              {pro ? (
                <div className="hc2-pro">
                  <img src={pro.gender === 'MALE' ? '/images/healthcare/placeholders/caregiver-male.webp' : '/images/healthcare/placeholders/caregiver-female.webp'} alt="Representative photo of a care professional" />
                  <div>
                    <b>{pro.name}</b>
                    <span>{professionalRole(pro.role_label)}</span>
                    {(pro.qualification || pro.experience_years != null) && <small>{[pro.qualification, personYears(pro.experience_years)].filter(Boolean).join(' · ')}</small>}
                    <p>{pro.name} will contact you before the visit. You can also reach out to the agency if needed.</p>
                    <em className="hc2-photo-note">Photo is representative.</em>
                  </div>
                </div>
              ) : (
                <div className="hc2-unassigned">
                  <img src={order.preferred_gender === 'MALE' || order.category === 'PHYSIOTHERAPY' ? '/images/healthcare/placeholders/caregiver-male.webp' : '/images/healthcare/placeholders/caregiver-female.webp'} alt="Representative photo of a care professional" />
                  <div><b>Being assigned</b><p>The agency assigns a qualified professional. Their name, qualification and experience will appear here before the visit — never a star rating.</p><em className="hc2-photo-note">Photo is representative.</em></div>
                </div>
              )}
            </section>

            <section className="hc2-card hc2-agency-mini">
              <div className="hc2-review-head"><BadgeCheck /><h2>Agency</h2></div>
              <div className="hc2-agency-mini-row">
                <span className="hc2-logo hc2-logo--md"><span>{initialsOf(order.agency_name || 'Agency')}</span></span>
                <div><b>{order.agency_name || 'Agency'}</b><small>{order.service_name} · {order.sessions} {order.kind === 'VISIT' ? 'visit' : 'shift'}{order.sessions === 1 ? '' : 's'}</small></div>
                {order.agency_phone && <a className="hc2-text-link" href={`tel:${order.agency_phone}`}><Phone />Call</a>}
              </div>
            </section>
          </div>

          <section className="hc2-card hc2-timeline" aria-label="Booking progress">
            {order.timeline?.map((step, i) => (
              <div key={step.code} className={`hc2-timeline-step is-${step.state}`}>
                <span>{step.state === 'completed' ? <Check /> : i + 1}</span>
                <b>{step.label}</b>
                <small>{step.occurred_at ? new Date(step.occurred_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' }) : step.state === 'current' ? 'Next' : 'Pending'}</small>
              </div>
            ))}
          </section>

          <section className="hc2-card hc2-details" aria-label="Booking details">
            <div className="hc2-card-head"><h2>Booking details</h2></div>
            <div className="hc2-details-grid">
              <div>
                <small>Service</small>
                <div className="hc2-detail-service"><span className="hc2-package-icon"><PackageIcon kind={order.kind} category={order.category} /></span><div><b>{order.service_name}</b><p>{[order.duration_minutes ? durationText(order.duration_minutes, null) : durationText(null, order.shift_hours), order.category_label].filter(Boolean).join(' · ')}</p></div></div>
                <small>Date &amp; time</small>
                {order.visits.map(v => <p className="hc2-detail-line" key={v.id}><CalendarDays />{dateLong(v.date)} · {time12(v.start_time)}{v.end_time ? ` – ${time12(v.end_time)}` : ''}{v.ends_next_day ? ' (next day)' : ''}</p>)}
                <small>Care address</small>
                <p className="hc2-detail-line"><MapPin />{fullAddress(order)}{order.pincode ? ` – ${order.pincode}` : ''}</p>
              </div>
              <div>
                <small>Patient</small>
                <p className="hc2-detail-line"><User />{order.patient_name || 'You'}</p>
                <small>{order.kind === 'VISIT' ? 'Visits' : 'Shifts'}</small>
                <p className="hc2-detail-line"><User />{order.sessions} {order.kind === 'VISIT' ? 'visit' : 'shift'}{order.sessions === 1 ? '' : 's'}</p>
                <small>Agency</small>
                <p className="hc2-detail-line"><BadgeCheck />{order.agency_name || 'Agency'}</p>
                <small>Payment</small>
                <div className="hc2-payment-block">
                  {paidOnline ? (
                    paid ? <><b>Paid online {money(paidAmount)}</b><span>{order.payments[0]?.paid_at ? `Paid on ${new Date(order.payments[0].paid_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}` : ''}</span><small>{order.payments[0]?.payment_reference || order.payments[0]?.transaction_number || ''}</small></> :
                      <><b>Online payment pending</b><small>The agency will share a payment link if needed.</small></>
                  ) : (
                    <><b>Pay after visit · {money(order.total_amount)}</b><span>Pay the agency after the visit is completed.</span></>
                  )}
                  {order.payments.length > 0 && <details><summary>View payment details</summary>{order.payments.map(p => <p key={`${p.receipt_number}-${p.amount}`}>{p.status} · {money(p.amount)} · {p.method || 'Online'}{p.receipt_number ? ` · ${p.receipt_number}` : ''}</p>)}</details>}
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className="hc2-confirm-side">
          <section className="hc2-card hc2-actions-card" aria-label="Actions">
            <div className="hc2-card-head"><h2>Actions</h2></div>
            {!cancelled && nextActionable && (
              <button type="button" className="hc2-action is-primary" onClick={() => setTrackOpen(true)}><MapPin /><span><b>Track professional</b><small>See the visit status — no live map</small></span><ChevronRight /></button>
            )}
            {!cancelled && nextActionable && order.can_reschedule !== false && (
              <button type="button" className="hc2-action" onClick={() => setRescheduleOpen(true)}><CalendarDays /><span><b>Reschedule visit</b><small>{order.reschedule_unavailable_reason || 'Pick a new date and time'}</small></span><ChevronRight /></button>
            )}
            {!cancelled && order.can_cancel !== false && (
              <button type="button" className="hc2-action is-danger" onClick={() => setCancelOpen(true)}><X /><span><b>Cancel booking</b><small>Refund follows the cancellation policy</small></span><ChevronRight /></button>
            )}
            {cancelled && (
              <button type="button" className="hc2-action is-primary" onClick={onBookAgain}><RotateCcw /><span><b>Book again</b><small>Start a new home care booking</small></span><ChevronRight /></button>
            )}
            {!cancelled && nextActionable && (
              <button type="button" className="hc2-action" onClick={() => addOrderToCalendar(order)}><CalendarCheck /><span><b>Add to calendar</b><small>Save the visit to your calendar</small></span><ChevronRight /></button>
            )}
            {order.agency_phone && (
              <a className="hc2-action" href={`tel:${order.agency_phone}`}><Phone /><span><b>Contact agency</b><small>{order.agency_phone}</small></span><ChevronRight /></a>
            )}
            <Link className="hc2-action" to={`/home-care?tab=mine&open=${encodeURIComponent(order.id)}`}><FileText /><span><b>Booking details</b><small>Visit log, invoice and more</small></span><ChevronRight /></Link>
            {order.can_cancel === false && !cancelled && <p className="hc2-actions-note">{order.cancel_unavailable_reason || 'This booking can no longer be cancelled here. Contact support for help.'}</p>}
          </section>

          <div className="hc2-need-changes"><b>Need to make changes?</b><p>You can reschedule or cancel as per our policy. If you need immediate assistance, contact the agency or support.</p></div>

          <div className="hc2-warn-card"><AlertTriangle /><div><b>Not for emergencies — call 108</b><p>Home care is for non-emergency situations only.</p></div></div>

          <section className="hc2-card hc2-helpful">
            <div className="hc2-review-head"><Info /><h2>Helpful information</h2></div>
            <ul>
              <li>Share the visit code only when the professional arrives.</li>
              <li>Keep prescriptions and medicines ready before the visit.</li>
              <li>No live location is shared. Track professional shows the visit status updated by the agency.</li>
            </ul>
          </section>
        </aside>
      </div>

      {cancelOpen && <CancelDialog order={order} onClose={() => setCancelOpen(false)} onDone={(message, updated) => { setCancelOpen(false); setNotice(message); if (updated) setOrder(updated); else load(true); }} />}
      {trackOpen && <TrackDialog order={order} onClose={() => setTrackOpen(false)} />}
      {rescheduleOpen && <RescheduleDialog order={order} onClose={() => setRescheduleOpen(false)} onDone={message => { setRescheduleOpen(false); setNotice(message); load(true); }} />}
    </div>
  );
}

function CancelDialog({ order, onClose, onDone }: { order: HcOrder; onClose: () => void; onDone: (message: string, updated?: HcOrder) => void }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const onWay = order.visits.some(v => v.status === 'ON_THE_WAY');

  const cancel = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const r = await hcCancelApi(order.id, reason.trim());
      const feeNote = r.cancellation_fee ? ` A late cancellation fee of ${money(r.cancellation_fee)} was kept because the professional was already on the way.` : '';
      const message = (r.refund.status === 'REFUNDED'
        ? `Cancelled. ${refundText(money(r.refund.amount))}`
        : r.refund.status === 'NEEDS_SUPPORT'
          ? `Cancelled. Your ${money(r.refund.amount)} refund is being processed by our support team.`
          : 'Cancelled. No online payment was taken, so there is nothing to refund.') + feeNote;
      onDone(message);
    } catch (e) {
      setError(labError(e, 'Could not cancel this booking. Please try again.'));
    } finally { setBusy(false); }
  };

  return (
    <BookingDialog label="Cancel home care booking" onClose={onClose}>
      <div className="hc2-dialog">
        <h2>Cancel this booking?</h2>
        <p>Booking <b>{order.order_number}</b> · {order.service_name}.</p>
        <div className="hc2-dialog-policy">
          {onWay ? <p><b>The professional is already on the way.</b> Half of one visit (at most ₹300) is kept and the rest is refunded.</p> : <p>You will get a full refund if you cancel now, before the professional sets out.</p>}
        </div>
        <label className="hc2-field">Reason (optional)<textarea rows={2} maxLength={200} value={reason} onChange={e => setReason(e.target.value)} placeholder="Tell us why you are cancelling" /></label>
        {error && <p className="hc2-pay-error" role="alert">{error}</p>}
        <div className="hc2-dialog-actions">
          <button type="button" className="hc2-btn hc2-btn--ghost" onClick={onClose}>Keep booking</button>
          <button type="button" className="hc2-btn hc2-btn--danger" disabled={busy} onClick={() => void cancel()}>{busy ? 'Cancelling…' : 'Cancel booking'}</button>
        </div>
      </div>
    </BookingDialog>
  );
}

function TrackDialog({ order, onClose }: { order: HcOrder; onClose: () => void }) {
  return (
    <BookingDialog label="Track professional" onClose={onClose}>
      <div className="hc2-dialog">
        <h2>Visit status</h2>
        <p>Live location is not shared. The agency updates each visit's status here.</p>
        {order.visits.map(v => (
          <article className="hc2-track" key={v.id}>
            <div className="hc2-track-head">
              <span className="hc2-track-dot" />
              <div><b>{dateLong(v.date)} · {time12(v.start_time)}</b></div>
              <span className={`hc2-status is-${v.status.toLowerCase()}`}>{VISIT_STATUS_LABEL[v.status] || v.status}</span>
            </div>
            {v.professional ? <p>{v.professional.name} · {professionalRole(v.professional.role_label)}{v.professional.qualification ? ` · ${v.professional.qualification}` : ''}</p> : <p className="hc2-muted">The agency is assigning a professional.</p>}
            <div className="hc2-track-times">
              {[['On the way', v.on_the_way_at], ['Arrived', v.arrived_at], ['Started', v.started_at], ['Done', v.completed_at]].map(([label, at]) => <span key={label} className={at ? 'is-done' : ''}><b>{label}</b><small>{at ? new Date(at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : 'Pending'}</small></span>)}
            </div>
            {v.visit_code && <p className="hc2-track-code">Visit code <b>{v.visit_code}</b></p>}
          </article>
        ))}
        <button type="button" className="hc2-btn hc2-btn--primary hc2-btn--block" onClick={onClose}>Close</button>
      </div>
    </BookingDialog>
  );
}

function RescheduleDialog({ order, onClose, onDone }: { order: HcOrder; onClose: () => void; onDone: (message: string) => void }) {
  const visit = order.visits.find(v => !['COMPLETED', 'CANCELLED', 'FAILED', 'NO_SHOW'].includes(v.status)) || order.visits[0];
  const [date, setDate] = useState(visit?.date || isoAdd(1));
  const [time, setTime] = useState(visit?.start_time?.slice(0, 5) || '09:00');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!visit || busy) return;
    setBusy(true); setError('');
    try {
      await hcRescheduleApi(visit.id, date, time);
      onDone(`Visit moved to ${dateLong(date)} at ${time12(time)}.`);
    } catch (e) {
      setError(labError(e, 'Could not reschedule this visit.'));
    } finally { setBusy(false); }
  };

  return (
    <BookingDialog label="Reschedule visit" onClose={onClose}>
      <div className="hc2-dialog">
        <h2>Reschedule visit</h2>
        <p>The agency confirms the professional and time again after a change.</p>
        <label className="hc2-field">New date<input type="date" min={isoAdd(0)} value={date} onChange={e => setDate(e.target.value)} /></label>
        <label className="hc2-field">New start time<input type="time" value={time} onChange={e => setTime(e.target.value)} /></label>
        {error && <p className="hc2-pay-error" role="alert">{error}</p>}
        <div className="hc2-dialog-actions">
          <button type="button" className="hc2-btn hc2-btn--ghost" onClick={onClose}>Keep current</button>
          <button type="button" className="hc2-btn hc2-btn--primary" disabled={busy || !date || !time} onClick={() => void save()}>{busy ? 'Saving…' : 'Save new time'}</button>
        </div>
      </div>
    </BookingDialog>
  );
}
