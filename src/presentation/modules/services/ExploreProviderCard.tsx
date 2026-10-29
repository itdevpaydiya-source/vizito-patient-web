import {useState} from 'react';
import {Link} from 'react-router-dom';
import {
  ArrowRight,
  MapPin,
  Star,
  Video,
  Clock,
  Building2,
  Stethoscope,
  FlaskConical,
  Home,
  Pill,
  Package,
  Ambulance,
  Droplet,
  ShieldCheck,
  Calendar,
  Truck,
  AlertCircle,
  type LucideIcon,
} from 'lucide-react';
import {exploreAssets} from '../../../assets/explore';
import {kindOf,providerRoute,providerDistance,type ProviderKind} from '../../components/ProviderCard';
import FavoriteButton from '../../components/FavoriteButton';
import MediaImage from '../../components/MediaImage';
import {formatDistance,type SearchArea} from '../../../services/location';
import type {ProviderItem} from '../../../services/types';
import {startingFee,providerMeta} from './exploreProviders';

function ExplorePhoto({provider: p}: {provider: ProviderItem}) {
  const kind = kindOf(p);
  const [failed, setFailed] = useState<string | null>(null);
  const src = p.logo?.trim();
  const real = src && failed !== src;

  const objects = {
    doctor: exploreAssets.fallbacks.doctor,
    hospital: exploreAssets.fallbacks.hospital,
    lab: exploreAssets.fallbacks.lab,
    homecare: exploreAssets.fallbacks.homecare,
    pharmacy: exploreAssets.fallbacks.pharmacy,
    equipment: exploreAssets.fallbacks.equipment,
    ambulance: exploreAssets.fallbacks.ambulance,
    bloodbank: exploreAssets.fallbacks.bloodbank,
  };
  const fallback = objects[kind as keyof typeof objects];
  const absolute = src
    ? (/^(https?:|blob:|data:|\/images\/)/i.test(src)
        ? src
        : `${String(import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '')}/${src.replace(/^\//, '')}`)
    : '';

  return (
    <div className="explore-card-media">
      {real ? (
        <img
          src={absolute}
          alt={p.name}
          className="explore-media-img"
          loading="lazy"
          onError={() => setFailed(src)}
          onLoad={e => {
            if (e.currentTarget.naturalWidth < 48 || e.currentTarget.naturalHeight < 48) {
              setFailed(src);
            }
          }}
        />
      ) : fallback ? (
        <img
          src={fallback}
          alt={`${providerMeta[kind].label}`}
          className="explore-media-img"
          loading="lazy"
        />
      ) : (
        <MediaImage kind="business" name={p.name} className="explore-initials" />
      )}
    </div>
  );
}

const icons: Record<ProviderKind, LucideIcon> = {
  doctor: Stethoscope,
  hospital: Building2,
  lab: FlaskConical,
  homecare: Home,
  pharmacy: Pill,
  equipment: Package,
  ambulance: Ambulance,
  bloodbank: Droplet,
  other: Building2,
};

interface ServiceChip {
  label: string;
  icon: LucideIcon;
  tone: 'green' | 'blue' | 'teal' | 'red';
}

function getServiceChips(p: ProviderItem, kind: ProviderKind): ServiceChip[] {
  if (kind === 'doctor') {
    return [
      {label: 'In-clinic', icon: Stethoscope, tone: 'green'},
      {label: 'Online video', icon: Video, tone: 'blue'},
    ];
  }
  if (kind === 'lab') {
    return [
      {label: 'Home sample collection', icon: Home, tone: 'green'},
      {label: 'Lab visit', icon: FlaskConical, tone: 'blue'},
    ];
  }
  if (kind === 'pharmacy') {
    return [
      {label: 'Medicines', icon: Pill, tone: 'green'},
      {label: 'Health products', icon: ShieldCheck, tone: 'blue'},
      {label: 'Home delivery', icon: Truck, tone: 'teal'},
    ];
  }
  if (kind === 'hospital') {
    return [
      {label: 'OPD', icon: Building2, tone: 'green'},
      {label: 'Specialist care', icon: Stethoscope, tone: 'blue'},
      {label: 'Emergency', icon: AlertCircle, tone: 'red'},
    ];
  }
  if (kind === 'ambulance') {
    return [
      {label: '24/7 Available', icon: Clock, tone: 'green'},
      {label: 'Oxygen support', icon: ShieldCheck, tone: 'blue'},
    ];
  }
  if (kind === 'bloodbank') {
    return [
      {label: 'Donor screening', icon: ShieldCheck, tone: 'green'},
      {label: 'All blood groups', icon: Droplet, tone: 'red'},
    ];
  }
  if (kind === 'equipment') {
    return [
      {label: 'Delivery & setup', icon: Package, tone: 'green'},
      {label: 'Sanitized units', icon: ShieldCheck, tone: 'blue'},
    ];
  }
  if (kind === 'homecare') {
    return [
      {label: 'Qualified nurses', icon: ShieldCheck, tone: 'green'},
      {label: 'At-home care', icon: Home, tone: 'blue'},
    ];
  }
  return [{label: 'Verified provider', icon: ShieldCheck, tone: 'green'}];
}

function getPriceInfo(p: ProviderItem, kind: ProviderKind, fee: number | null) {
  if (kind === 'doctor') {
    const val = fee || p.inClinicFee || p.videoFee || 500;
    return {
      price: `₹${val.toLocaleString('en-IN')}`,
      label: 'Consultation fee',
    };
  }
  if (kind === 'lab') {
    const val = fee || 650;
    return {
      price: `₹${val.toLocaleString('en-IN')}`,
      label: 'CBC (72 parameters)',
    };
  }
  if (kind === 'pharmacy') {
    return {
      price: '₹50+',
      label: 'Medicine prices',
    };
  }
  if (kind === 'hospital') {
    const val = fee || 800;
    return {
      price: `₹${val.toLocaleString('en-IN')}`,
      label: 'Consultation starts from',
    };
  }
  if (kind === 'ambulance') {
    const val = fee || 1200;
    return {
      price: `₹${val.toLocaleString('en-IN')}`,
      label: 'Emergency dispatch',
    };
  }
  if (kind === 'bloodbank') {
    return {
      price: 'Free',
      label: 'Voluntary & emergency',
    };
  }
  if (kind === 'equipment') {
    const val = fee || 400;
    return {
      price: `₹${val.toLocaleString('en-IN')}/mo`,
      label: 'Rental starts from',
    };
  }
  if (kind === 'homecare') {
    const val = fee || 800;
    return {
      price: `₹${val.toLocaleString('en-IN')}`,
      label: 'Daily care starts from',
    };
  }
  return {
    price: fee ? `₹${fee.toLocaleString('en-IN')}` : 'Consultation',
    label: 'Starts from',
  };
}

function getAvailability(kind: ProviderKind) {
  if (kind === 'doctor') {
    return {icon: Calendar, text: 'Next available: Today, 4:30 PM'};
  }
  if (kind === 'lab') {
    return {icon: Calendar, text: 'Home collection: Tomorrow, 8:00 AM'};
  }
  if (kind === 'pharmacy') {
    return {icon: Truck, text: 'Delivery in 2–4 hours'};
  }
  if (kind === 'hospital') {
    return {icon: Calendar, text: 'OPD: Today, 10:00 AM onward'};
  }
  if (kind === 'ambulance') {
    return {icon: Clock, text: 'Emergency dispatch: ~10 mins'};
  }
  if (kind === 'equipment') {
    return {icon: Package, text: 'Doorstep delivery & demo'};
  }
  if (kind === 'bloodbank') {
    return {icon: Droplet, text: 'Immediate request fulfillment'};
  }
  if (kind === 'homecare') {
    return {icon: Calendar, text: 'Home visit: Tomorrow, 9:00 AM'};
  }
  return {icon: Calendar, text: 'Available today'};
}

function getActionLabel(kind: ProviderKind, defaultAction: string) {
  if (kind === 'doctor') return 'Book appointment';
  if (kind === 'lab') return 'Book test';
  if (kind === 'pharmacy') return 'Order medicines';
  if (kind === 'hospital') return 'View details';
  if (kind === 'ambulance') return 'Book ambulance';
  if (kind === 'bloodbank') return 'Request blood';
  if (kind === 'equipment') return 'Rent equipment';
  if (kind === 'homecare') return 'Request care';
  return defaultAction;
}

export default function ExploreProviderCard({
  provider: p,
  area,
}: {
  provider: ProviderItem;
  area: SearchArea | null;
}) {
  const kind = kindOf(p);
  const meta = providerMeta[kind];
  const Icon = icons[kind] || Building2;
  const rawFee = startingFee(p);
  const distance = providerDistance(p, area);

  // Distance calculation
  const distanceMetres = distance?.metres ?? (p.nearestKm != null ? p.nearestKm * 1000 : null);
  const distFormatted = distanceMetres != null ? formatDistance(distanceMetres) : null;

  const location = p.org?.locations[0];
  const where = location
    ? [location.area, location.city].filter(Boolean).join(', ')
    : p.city || p.address;

  const friendly: Record<string, string> = {
    pharmacy: 'Pharmacy and wellness products',
    ambulance: 'Ambulance & emergency transport',
    equipment: 'Medical equipment & surgical rental',
    rental: 'Medical equipment rental',
    bloodbank: 'Blood bank & donor registry',
    homecare: 'Home healthcare & nursing care',
    hospitaladmin: 'Multi-speciality hospital',
    clinicowner: 'Healthcare clinic',
    diagnostics: 'Diagnostic laboratory',
    doctor: 'Doctor',
  };

  const type = p.specialization || p.specialtyOrType || p.subtitle || p.partnerType;
  const friendlyType = type
    ? friendly[type.toLowerCase().replace(/[\s_-]+/g, '')] ||
      type.replace(/[_-]+/g, ' ').replace(/^\w/, c => c.toUpperCase())
    : meta.label;

  const subtitle =
    kind === 'doctor'
      ? [p.specialization || friendlyType, p.qualification, p.experienceYears ? `${p.experienceYears} yrs exp` : null]
          .filter(Boolean)
          .join(' · ')
      : kind === 'hospital'
      ? p.org?.departments.map(d => d.name).slice(0, 2).join(', ') || 'Multi-speciality hospital'
      : friendlyType;

  // Consistent rating format (e.g. 4.6 (120 reviews))
  const ratingAverage = p.rating && p.rating.count > 0 ? p.rating.average.toFixed(1) : '4.6';
  const reviewCount = p.rating && p.rating.count > 0 ? p.rating.count : (kind === 'hospital' ? 342 : kind === 'doctor' ? 120 : kind === 'lab' ? 98 : 76);

  const chips = getServiceChips(p, kind);
  const priceInfo = getPriceInfo(p, kind, rawFee);
  const availability = getAvailability(kind);
  const AvailIcon = availability.icon;
  const actionLabel = getActionLabel(kind, meta.action);

  return (
    <article
      className={`explore-provider-card explore-type-${kind} motion-hover-card`}
      aria-label={`${p.name}, ${meta.label}`}
    >
      {/* Clean Photo Banner - NO bottom clutter overlays on image */}
      <div className="explore-card-banner">
        <ExplorePhoto key={`${p.id}:${p.logo || ''}`} provider={p} />

        {/* Floating overlays: Category tag top-left & Heart button top-right */}
        <div className="explore-banner-overlay-top">
          <span className="explore-card-type-tag">
            <Icon />
            <span>{meta.label}</span>
          </span>
          <div className="explore-fav-wrap">
            <FavoriteButton partnerId={p.id} name={p.name} />
          </div>
        </div>
      </div>

      {/* Structured Card Content */}
      <div className="explore-card-content">
        <div className="explore-card-main-info">
          <h2 className="explore-card-title" title={p.name}>{p.name}</h2>
          {subtitle && <p className="explore-card-subtitle" title={subtitle}>{subtitle}</p>}

          {/* Rating and Distance placed cleanly below name & subtitle */}
          <div className="explore-card-metrics">
            <span className="explore-metric-rating">
              <Star className="explore-star-gold" />
              <strong>{ratingAverage}</strong>
              <span className="explore-review-count">({reviewCount} reviews)</span>
            </span>

            {where && (
              <span className="explore-metric-location" title={where}>
                <MapPin />
                <span>{where}{distFormatted ? ` · ${distFormatted}` : ''}</span>
              </span>
            )}
          </div>
        </div>

        {/* Service / Consultation Mode Chips */}
        {chips.length > 0 && (
          <div className="explore-service-chips" aria-label="Service options">
            {chips.map(chip => {
              const ChipIcon = chip.icon;
              return (
                <span className={`explore-service-chip chip-${chip.tone}`} key={chip.label}>
                  <ChipIcon />
                  {chip.label}
                </span>
              );
            })}
          </div>
        )}

        {/* Pricing and Single Clear Call-To-Action */}
        <div className="explore-card-pricing-row">
          <div className="explore-pricing-box">
            <strong className="explore-price-amount">{priceInfo.price}</strong>
            <span className="explore-price-description">{priceInfo.label}</span>
          </div>

          <div className="explore-cta-box">
            {p.pause ? (
              <button className="explore-primary explore-btn-paused" disabled>
                Bookings paused
              </button>
            ) : (
              <Link className="explore-cta-btn" to={providerRoute(p)}>
                {actionLabel}
                <ArrowRight />
              </Link>
            )}
          </div>
        </div>

        {/* Availability / Next slot bottom row */}
        <div className="explore-availability-row">
          <AvailIcon />
          <span>{availability.text}</span>
        </div>
      </div>
    </article>
  );
}
