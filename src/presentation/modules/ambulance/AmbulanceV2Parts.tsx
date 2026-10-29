import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Ambulance, ArrowRight, Check, ChevronRight, Loader2, PhoneCall, RotateCw, Star, type LucideIcon } from 'lucide-react';
import { Skeleton, StateIllustration } from '../../components/motion/Motion';
import type { MyTrip } from '../../../services/ambulanceHelper';
import './AmbulanceV2.css';

/** Shared representative vehicle image (never a model or registration claim). */
export const AMB_VEHICLE_IMAGE = '/images/healthcare/placeholders/ambulance-vehicle.webp';
export const AMB_HERO_IMAGE = '/images/healthcare/banners/ambulance-hero.webp';

export function AmbCrumb({ label }: { label?: string }) {
  return (
    <nav className="amb2-crumb" aria-label="Breadcrumb">
      <Link to="/dashboard">Dashboard</Link>
      <ChevronRight size={13} aria-hidden="true" />
      <Link to="/book-ambulance">Ambulance</Link>
      {label && <><ChevronRight size={13} aria-hidden="true" /><b>{label}</b></>}
    </nav>
  );
}

export const BOOK_STEPS = ['Pickup & drop', 'Ambulance type', 'Patient details', 'Review & pay'];

export function AmbSteps({ step }: { step: number }) {
  return (
    <nav className="amb2-steps" aria-label="Booking progress">
      {BOOK_STEPS.map((label, index) => (
        <div key={label} className={`amb2-step ${index < step ? 'done' : index === step ? 'active' : ''}`} aria-current={index === step ? 'step' : undefined}>
          <i aria-hidden="true">{index < step ? <Check size={13} /> : index + 1}</i>
          <span>{label}</span>
        </div>
      ))}
    </nav>
  );
}

const STATUS_TONE: Record<string, string> = {
  COMPLETED: 'green', CASH_RECORDED: 'green', PAID_ONLINE: 'green', PAID: 'green',
  CANCELLED: 'red', DECLINED: 'red', EXPIRED: 'red', UNANSWERED: 'red', FAILED: 'red',
  EN_ROUTE: 'teal', ON_BOARD: 'teal', ACTIVE: 'teal',
  ASSIGNED: 'blue', AT_PICKUP: 'blue', ACCEPTED: 'blue',
  REQUESTED: 'amber', OPEN: 'amber', SEARCHING: 'amber', UNPAID: 'amber', PENDING: 'amber',
};

export function StatusPill({ status, label }: { status: string; label: string }) {
  return <span className={`amb2-pill amb2-pill--${STATUS_TONE[status] || 'slate'}`}>{label}</span>;
}

export function paymentText(status: string | null | undefined) {
  return ({ UNPAID: 'Pay after the trip', CASH_RECORDED: 'Paid in cash', PAID_ONLINE: 'Paid online', PAID: 'Paid', REFUNDED: 'Refunded' } as Record<string, string>)[String(status || '')] || String(status || 'Payment status unavailable');
}

export function StateCard({ title, text, kind = 'ambulance', onRetry, action }: { title: string; text?: string | null; kind?: string; onRetry?: () => void; action?: ReactNode }) {
  return (
    <div className="amb2-state" role={onRetry ? 'alert' : 'status'}>
      <StateIllustration kind={kind} />
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {onRetry && <button type="button" className="amb2-btn amb2-btn--outline amb2-btn--sm" onClick={onRetry}><RotateCw size={14} aria-hidden="true" />Retry</button>}
      {action}
    </div>
  );
}

export function LoadingBlock({ rows = 3, label = 'Loading…' }: { rows?: number; label?: string }) {
  return (
    <div className="amb2-stack" role="status" aria-live="polite">
      <span className="amb2-loading-note"><Loader2 aria-hidden="true" />{label}</span>
      {Array.from({ length: rows }, (_, index) => <Skeleton key={index} className="amb2-skeleton-row" />)}
    </div>
  );
}

export function ErrorNote({ error, onRetry }: { error: string | null; onRetry?: () => void }) {
  if (!error) return null;
  return (
    <div className="amb2-error" role="alert">
      <AlertTriangle size={16} aria-hidden="true" />
      <span>{error}</span>
      {onRetry && <button type="button" className="amb2-link" onClick={onRetry}>Retry</button>}
    </div>
  );
}

/** A definition list that drops fields the API did not return (never invents values). */
export function DetailRows({ rows }: { rows: [string, ReactNode | null | undefined | false][] }) {
  const shown = rows.filter(([, value]) => value !== null && value !== undefined && value !== false && value !== '');
  if (!shown.length) return null;
  return (
    <dl className="amb2-details">
      {shown.map(([label, value], index) => (
        <Fragment key={`${label}-${index}`}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </Fragment>
      ))}
    </dl>
  );
}

export function OperatorRating({ rating, reviewCount }: { rating?: number | null; reviewCount?: number | null }) {
  if (rating === null || rating === undefined) return null;
  const count = reviewCount || 0;
  return (
    <span className="amb2-op-rating" aria-label={`Operator rated ${rating} out of 5${count ? ` from ${count} review${count === 1 ? '' : 's'}` : ''}`}>
      <Star size={14} aria-hidden="true" />
      <b>{Number(rating).toLocaleString('en-IN', { maximumFractionDigits: 1 })}</b>
      {count > 0 && <small>({count} review{count === 1 ? '' : 's'})</small>}
    </span>
  );
}

export function VehicleThumb({ className = '' }: { className?: string }) {
  return (
    <span className={`amb2-vehicle-thumb ${className}`}>
      <img src={AMB_VEHICLE_IMAGE} alt="Representative ambulance" loading="lazy" />
    </span>
  );
}

export function Call108() {
  return <a className="amb2-call108" href="tel:108"><PhoneCall aria-hidden="true" />108</a>;
}

export function Kicker({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return <span className="amb2-eyebrow"><span><Icon aria-hidden="true" /></span>{children}</span>;
}

export function ActionCard({ tone, icon: Icon, title, text, children }: { tone: 'urgent' | 'scheduled' | 'event'; icon: LucideIcon; title: string; text: string; children: ReactNode }) {
  return (
    <article className={`amb2-action amb2-action--${tone}`}>
      <div className="amb2-action-top">
        <span className="amb2-action-icon"><Icon aria-hidden="true" /></span>
        <h2>{title}</h2>
      </div>
      <p>{text}</p>
      {children}
    </article>
  );
}

export function CtaLink({ to, children, red = false }: { to: string; children: ReactNode; red?: boolean }) {
  return <Link className={`amb2-action-cta ${red ? 'amb2-action-cta--red' : ''}`} to={to}>{children}<ArrowRight aria-hidden="true" /></Link>;
}

export function CtaButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return <button type="button" className="amb2-action-cta" onClick={onClick}>{children}<ArrowRight aria-hidden="true" /></button>;
}

export const kmText = (km: number | null | undefined) => (km === null || km === undefined ? null : `${Number(km).toLocaleString('en-IN', { maximumFractionDigits: 1 })} km`);

/** Time of the completion event, else the scheduled time; never a made-up timestamp. */
export function completedAt(trip: MyTrip) {
  const done = [...(trip.timeline || [])].reverse().find(event => event.status === 'COMPLETED');
  return done?.at || trip.scheduled_at;
}

/** Representative category short description. Prices and availability always come from the API. */
export const VEHICLE_BLURB: Record<string, string> = {
  PTA: 'Non-emergency transport for patients who can sit.',
  BLS: 'Basic life support for stable patients who need monitoring.',
  ALS: 'Advanced life support for critical patients.',
};

export function AmbulanceMark() {
  return <span className="amb2-mark" aria-hidden="true"><Ambulance /></span>;
}
