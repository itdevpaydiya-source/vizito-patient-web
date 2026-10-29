import {useCallback,useEffect,useRef,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {
  ArrowRight,
  ChevronRight,
  Grid2X2,
  List,
  Search,
  SlidersHorizontal,
  X,
  Stethoscope,
  Building2,
  FlaskConical,
  Pill,
  Home,
  Package,
  Ambulance,
  Droplet,
  Sparkles,
  Star,
  Check,
  Video,
  MapPin,
} from 'lucide-react';
import VizitoPagination from '../../components/navigation/VizitoPagination';
import ThemedSelect from '../../components/forms/ThemedSelect';
import {exploreAssets} from '../../../assets/explore';
import {type ProviderKind} from '../../components/ProviderCard';
import LocationBar from '../../components/location/LocationBar';
import {Skeleton} from '../../components/motion/Motion';
import {useSearchArea,setSearchArea,locateOnce} from '../../../services/location';
import type {ProviderItem} from '../../../services/types';
import BookingDialog from '../bookings/BookingDialog';
import ServiceLocationDialog from '../../components/location/ServiceLocationDialog';
import {StateEmpty,StateFilteredEmpty,StateError} from '../bookings/BookingStates';
import {getProvidersPageApi,getAddressesApi} from '../../../services/patientHelper';
import ExploreProviderCard from './ExploreProviderCard';
import '../bookings/BookingsReference.css';
import './HealthcareServicesScreen.css';

const tiles = [
  {id:'all',name:'All providers',description:'View all services',image:exploreAssets.tiles.allProviders},
  {id:'doctor',name:'Doctor consultation',description:'In-clinic & online',image:exploreAssets.tiles.doctorConsultation},
  {id:'hospital',name:'Hospitals & clinics',description:'OPD & specialist care',image:exploreAssets.tiles.hospitalsClinics},
  {id:'lab',name:'Lab tests',description:'Blood, urine, imaging',image:exploreAssets.tiles.labTests},
  {id:'homecare',name:'Home care services',description:'Nursing, physio & more',image:exploreAssets.tiles.homeCare},
  {id:'pharmacy',name:'Pharmacy',description:'Medicines & refills',image:exploreAssets.tiles.pharmacy},
  {id:'equipment',name:'Medical equipment',description:'Rent equipment',image:exploreAssets.tiles.medicalEquipment},
  {id:'ambulance',name:'Ambulance',description:'Patient transport',image:exploreAssets.tiles.ambulance},
  {id:'bloodbank',name:'Blood services',description:'Find or donate blood',image:exploreAssets.tiles.bloodServices},
] as const;

const categoryIcons: Record<string, React.ElementType> = {
  all: Sparkles,
  doctor: Stethoscope,
  hospital: Building2,
  lab: FlaskConical,
  homecare: Home,
  pharmacy: Pill,
  equipment: Package,
  ambulance: Ambulance,
  bloodbank: Droplet,
};

type Category = ProviderKind | 'all';
type Sort = 'recommended' | 'nearest' | 'rating' | 'price';

export default function HealthcareServicesScreen() {
  const [params, setParams] = useSearchParams();
  const urlQuery = params.get('q') || params.get('search') || '';

  const [query, setQuery] = useState(urlQuery);
  const [category, setCategory] = useState<Category>('all');
  const [providers, setProviders] = useState<ProviderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sort, setSort] = useState<Sort>('recommended');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Modern interactive filters
  const [mode, setMode] = useState<string>('');
  const [rating, setRating] = useState<string>('');
  const [fee, setFee] = useState<string>('');
  const [radius, setRadius] = useState<number | null>(null);
  const [locationDialogOpen, setLocationDialogOpen] = useState<boolean>(false);

  const area = useSearchArea();
  const requestId = useRef(0);

  // Auto-load patient's default registered address if location is not set yet
  useEffect(() => {
    if (!area) {
      getAddressesApi()
        .then(addresses => {
          const def = addresses.find(a => a.isDefault && a.pin) || addresses.find(a => a.pin);
          if (def && def.pin) {
            setSearchArea({
              lat: def.pin.lat,
              lng: def.pin.lng,
              city: def.city || '',
              pincode: def.pincode || '',
              label: [def.label || def.addressLine1, def.city || def.pincode].filter(Boolean).join(', ') || 'Your saved address',
              source: 'manual',
              at: Date.now(),
            });
          }
        })
        .catch(() => {});
    }
  }, [area]);

  const page = Math.max(1, Number(params.get('providersPage')) || 1);
  const pageSize = params.get('providersPageSize') === '20' ? (20 as const) : (10 as const);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setSort(area ? 'nearest' : 'recommended');
    if (!area) setRadius(null);
  }, [area]);

  const handleNearestClick = async () => {
    if (area) {
      setSort(sort === 'nearest' ? 'recommended' : 'nearest');
      pagination.resetPage();
      return;
    }
    // Attempt fast browser GPS detection
    try {
      const userPos = await locateOnce();
      setSearchArea(userPos);
      setSort('nearest');
      pagination.resetPage();
    } catch {
      // If GPS is disabled or prompt rejected, open location selector
      setLocationDialogOpen(true);
    }
  };

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError(false);

    try {
      const feeRange = fee === '500' ? { feeMax: 500 }
        : fee === '1000' ? { feeMin: 501, feeMax: 1000 }
        : fee === '2500' ? { feeMin: 1001, feeMax: 2500 }
        : fee === 'above' ? { feeMin: 2501 } : {};

      const result = await getProvidersPageApi(
        category === 'all' ? undefined : category,
        query,
        page,
        pageSize,
        {
          lat: area?.lat,
          lng: area?.lng,
          radiusKm: (radius || undefined) as 5 | 10 | 25 | 50 | undefined,
          ...feeRange,
          minRating: rating ? Number(rating) : undefined,
          mode: mode === 'clinic' ? 'IN_CLINIC' : mode === 'video' ? 'VIDEO' : undefined,
          online: mode === 'video' ? true : undefined,
          sort: sort === 'nearest' ? (area ? 'nearest' : undefined) : sort === 'rating' ? 'rating' : sort === 'price' ? 'fee_low' : undefined,
        }
      );

      if (id === requestId.current) {
        setProviders(result.items);
        setTotal(result.total);
      }
    } catch {
      if (id === requestId.current) setError(true);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [category, query, page, pageSize, area, radius, fee, rating, mode, sort]);

  useEffect(() => {
    void load();
    return () => {
      requestId.current++;
    };
  }, [load]);

  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  const setPage = (value: number) =>
    setParams(current => {
      const next = new URLSearchParams(current);
      if (value === 1) next.delete('providersPage');
      else next.set('providersPage', String(value));
      return next;
    });

  const setPageSize = (value: 10 | 20) =>
    setParams(current => {
      const next = new URLSearchParams(current);
      next.set('providersPageSize', String(value));
      next.delete('providersPage');
      return next;
    });

  const resetPage = () => setPage(1);

  const changeCategory = (value: Category) => {
    setCategory(value);
    resetPage();
  };

  const clear = () => {
    setCategory('all');
    setQuery('');
    setParams({});
    setMode('');
    setRating('');
    setFee('');
    setRadius(null);
    setSort(area ? 'nearest' : 'recommended');
  };

  const activeFilterCount =
    (category !== 'all' ? 1 : 0) +
    (mode ? 1 : 0) +
    (radius !== null ? 1 : 0) +
    (rating ? 1 : 0) +
    (fee ? 1 : 0) +
    (query ? 1 : 0);

  const pagination = { page, pageSize, setPage, setPageSize, resetPage };

  // Modern interactive filter panel
  const renderFiltersContent = () => (
    <>
      <div className="filter-panel-header">
        <div className="filter-panel-title">
          <h2>Filters</h2>
          {activeFilterCount > 0 && (
            <span className="filter-badge-count">{activeFilterCount}</span>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button type="button" className="filter-clear-link" onClick={clear}>
            Clear all
          </button>
        )}
      </div>

      {/* Service Category */}
      <div className="filter-section">
        <span className="filter-section-title">SERVICE CATEGORY</span>
        <div className="filter-category-menu">
          {tiles.map(t => {
            const Icon = categoryIcons[t.id] || Sparkles;
            const isActive = category === t.id;
            return (
              <button
                key={t.id}
                type="button"
                className={`filter-category-item ${isActive ? 'is-selected' : ''}`}
                onClick={() => changeCategory(t.id)}
              >
                <span className="cat-icon-wrap">
                  <Icon />
                </span>
                <span className="cat-text">{t.name}</span>
                {isActive && <Check className="cat-check-icon" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Consultation Mode */}
      <div className="filter-section">
        <span className="filter-section-title">CONSULTATION MODE</span>
        <div className="filter-pill-group">
          <button
            type="button"
            className={`filter-pill-btn ${mode === '' ? 'is-active' : ''}`}
            onClick={() => {
              setMode('');
              resetPage();
            }}
          >
            All
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${mode === 'clinic' ? 'is-active' : ''}`}
            onClick={() => {
              setMode(mode === 'clinic' ? '' : 'clinic');
              resetPage();
            }}
          >
            <Building2 /> In-Clinic
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${mode === 'video' ? 'is-active' : ''}`}
            onClick={() => {
              setMode(mode === 'video' ? '' : 'video');
              resetPage();
            }}
          >
            <Video /> Video
          </button>
        </div>
      </div>

      {/* Distance Radius */}
      <div className="filter-section">
        <div className="filter-title-row">
          <span className="filter-section-title">DISTANCE</span>
          {!area && <span className="filter-hint-note">Set location</span>}
        </div>
        <div className="filter-pill-group">
          <button
            type="button"
            className={`filter-pill-btn ${radius === null ? 'is-active' : ''}`}
            onClick={() => {
              setRadius(null);
              resetPage();
            }}
          >
            Any
          </button>
          {[5, 10, 25, 50].map(km => (
            <button
              key={km}
              type="button"
              className={`filter-pill-btn ${radius === km ? 'is-active' : ''}`}
              onClick={() => {
                if (!area) {
                  setLocationDialogOpen(true);
                  return;
                }
                setRadius(radius === km ? null : km);
                resetPage();
              }}
            >
              {km} km
            </button>
          ))}
        </div>
      </div>

      {/* Ratings */}
      <div className="filter-section">
        <span className="filter-section-title">MINIMUM RATING</span>
        <div className="filter-pill-group">
          <button
            type="button"
            className={`filter-pill-btn ${rating === '' ? 'is-active' : ''}`}
            onClick={() => {
              setRating('');
              resetPage();
            }}
          >
            Any
          </button>
          {[
            { val: '4.5', label: '★ 4.5+' },
            { val: '4', label: '★ 4.0+' },
            { val: '3', label: '★ 3.0+' },
          ].map(r => (
            <button
              key={r.val}
              type="button"
              className={`filter-pill-btn ${rating === r.val ? 'is-active' : ''}`}
              onClick={() => {
                setRating(rating === r.val ? '' : r.val);
                resetPage();
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Price / Fee */}
      <div className="filter-section">
        <span className="filter-section-title">PRICE / FEE (₹)</span>
        <div className="filter-pill-group filter-pills-column">
          <button
            type="button"
            className={`filter-pill-btn ${fee === '' ? 'is-active' : ''}`}
            onClick={() => {
              setFee('');
              resetPage();
            }}
          >
            Any fee
          </button>
          {[
            { val: '500', label: 'Up to ₹500' },
            { val: '1000', label: '₹501 – ₹1,000' },
            { val: '2500', label: '₹1,001 – ₹2,500' },
            { val: 'above', label: 'Above ₹2,500' },
          ].map(f => (
            <button
              key={f.val}
              type="button"
              className={`filter-pill-btn ${fee === f.val ? 'is-active' : ''}`}
              onClick={() => {
                setFee(fee === f.val ? '' : f.val);
                resetPage();
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <div className="explore-page">
      <section className="explore-heading-row">
        <div className="explore-heading">
          <nav aria-label="Breadcrumb">
            <Link to="/dashboard">Dashboard</Link>
            <ChevronRight />
            <span>Explore services</span>
          </nav>
          <h1>Explore healthcare services</h1>
          <p>Find and book trusted doctors, hospitals, labs &amp; pharmacies near you.</p>
          <div className="explore-trust">
            <span>
              <img src={exploreAssets.icons.verified} alt="" />
              Verified providers
            </span>
            <span>
              <img src={exploreAssets.icons.nearby} alt="" />
              Nearby options
            </span>
            <span>
              <img src={exploreAssets.icons.easyBooking} alt="" />
              Easy online booking
            </span>
          </div>
        </div>
        <div className="explore-hero">
          <img src={exploreAssets.hero} alt="Healthcare services illustrative scene" />
          <div>
            <h2>Quality care<br />for you and your family</h2>
            <p>Consult doctors, book tests, or get care at home.</p>
            <Link className="explore-primary" to="/find-doctors">
              Book an appointment <ArrowRight />
            </Link>
          </div>
        </div>
      </section>

      {/* Top category service navigation (Swiggy / Apollo 24|7 style) */}
      <section className="explore-category-nav" aria-label="Browse by service">
        <div className="explore-category-scroll">
          {tiles.map(t => {
            const isSelected = category === t.id;
            return (
              <button
                key={t.id}
                type="button"
                className={`explore-category-pill ${isSelected ? 'is-selected' : ''}`}
                aria-pressed={isSelected}
                onClick={() => changeCategory(t.id)}
              >
                <div className="explore-category-avatar">
                  <img src={t.image} alt="" />
                </div>
                <span className="explore-category-name">{t.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      <LocationBar purpose="find providers near you" />

      <div className="explore-content">
        {/* Left Filter Sidebar */}
        <aside className="explore-filter-panel" aria-label="Provider filters">
          {renderFiltersContent()}
        </aside>

        <section className="explore-results" aria-label="Find providers">
          {/* Main Toolbar */}
          <div className="explore-toolbar">
            <label className="explore-search">
              <Search />
              <input
                type="search"
                aria-label="Search providers"
                placeholder="Search by doctor name, speciality, hospital, lab or clinic..."
                value={query}
                onChange={e => {
                  setQuery(e.target.value);
                  pagination.resetPage();
                }}
              />
              {query && (
                <button
                  type="button"
                  aria-label="Clear provider search"
                  onClick={() => {
                    setQuery('');
                    setParams({});
                  }}
                >
                  <X />
                </button>
              )}
            </label>

            {/* Compact Dropdown Sort Menu */}
            <div className="explore-sort-wrapper">
              <span className="sort-label">Sort by:</span>
              <ThemedSelect
                variant="menu"
                aria-label="Sort providers"
                value={sort}
                onChange={e => {
                  const val = e.target.value as Sort;
                  if (val === 'nearest' && !area) {
                    void handleNearestClick();
                  } else {
                    setSort(val);
                    pagination.resetPage();
                  }
                }}
              >
                <option value="recommended">Recommended</option>
                <option value="nearest">Nearest First</option>
                <option value="rating">Highest Rated</option>
                <option value="price">Lowest Fee</option>
              </ThemedSelect>
            </div>

            <div className="explore-view" role="group" aria-label="Provider layout">
              <button
                type="button"
                aria-label="Grid view"
                aria-pressed={view === 'grid'}
                onClick={() => setView('grid')}
              >
                <Grid2X2 />
              </button>
              <button
                type="button"
                aria-label="List view"
                aria-pressed={view === 'list'}
                onClick={() => setView('list')}
              >
                <List />
              </button>
            </div>

            <button
              type="button"
              className="explore-mobile-filters"
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal />
              Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
            </button>
          </div>

          {/* Swiggy/Zomato Quick Filter Chips Toolbar */}
          <div className="explore-quick-filters" aria-label="Quick filters">
            <button
              type="button"
              className={`quick-filter-chip ${sort === 'nearest' ? 'is-active' : ''}`}
              onClick={handleNearestClick}
            >
              <MapPin /> Nearest First {!area ? '(Set location)' : ''}
            </button>

            <button
              type="button"
              className={`quick-filter-chip ${rating === '4' ? 'is-active' : ''}`}
              onClick={() => {
                setRating(rating === '4' ? '' : '4');
                pagination.resetPage();
              }}
            >
              <Star className="fill-current" /> Rating 4.0+
            </button>

            <button
              type="button"
              className={`quick-filter-chip ${mode === 'video' ? 'is-active' : ''}`}
              onClick={() => {
                setMode(mode === 'video' ? '' : 'video');
                pagination.resetPage();
              }}
            >
              <Video /> Online Video
            </button>

            <button
              type="button"
              className={`quick-filter-chip ${mode === 'clinic' ? 'is-active' : ''}`}
              onClick={() => {
                setMode(mode === 'clinic' ? '' : 'clinic');
                pagination.resetPage();
              }}
            >
              <Building2 /> In-Clinic
            </button>

            <button
              type="button"
              className={`quick-filter-chip ${fee === '500' ? 'is-active' : ''}`}
              onClick={() => {
                setFee(fee === '500' ? '' : '500');
                pagination.resetPage();
              }}
            >
              Under ₹500
            </button>

            {activeFilterCount > 0 && (
              <button
                type="button"
                className="quick-filter-chip-reset"
                onClick={clear}
              >
                <X /> Reset ({activeFilterCount})
              </button>
            )}
          </div>

          {!loading && !error && (
            <div className="explore-result-count" aria-live="polite">
              <strong>{total.toLocaleString('en-IN')} {total === 1 ? 'provider' : 'providers'} found</strong>
              {area && <span>near {area.label}</span>}
            </div>
          )}

          {loading ? (
            <div className="explore-provider-grid" aria-label="Loading providers" aria-busy="true">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="explore-provider-skeleton">
                  <div />
                  <span />
                  <span />
                  <span />
                </Skeleton>
              ))}
            </div>
          ) : error ? (
            <StateError
              title="Unable to load providers"
              description="Something went wrong. Please try again."
              retry={() => void load()}
              home={false}
            />
          ) : !providers.length ? (
            <StateEmpty
              title="No providers available yet"
              description="Healthcare providers will appear here when they are available."
            >
              <button className="booking-button" onClick={() => void load()}>
                Refresh providers
              </button>
            </StateEmpty>
          ) : (
            <>
              <div
                className={`explore-provider-grid ${view === 'list' ? 'explore-list-view' : ''}`}
                data-motion-list
              >
                {providers.map(p => (
                  <ExploreProviderCard key={p.id} provider={p} area={area} />
                ))}
              </div>

              <VizitoPagination
                page={pagination.page}
                pageSize={pagination.pageSize}
                total={total}
                onPageChange={pagination.setPage}
                onPageSizeChange={pagination.setPageSize}
                label="providers"
              />
            </>
          )}
        </section>
      </div>

      {filtersOpen && (
        <BookingDialog
          label="Provider filters"
          className="lab-action-dialog explore-page explore-filter-sheet"
          onClose={() => setFiltersOpen(false)}
        >
          <button
            type="button"
            className="explore-filter-close"
            aria-label="Close filters"
            onClick={() => setFiltersOpen(false)}
          >
            <X />
          </button>
          <div className="explore-filter-panel-inner">
            {renderFiltersContent()}
          </div>
          <button
            type="button"
            className="explore-primary explore-apply"
            onClick={() => setFiltersOpen(false)}
          >
            Show results
          </button>
        </BookingDialog>
      )}

      {locationDialogOpen && (
        <ServiceLocationDialog onClose={() => setLocationDialogOpen(false)} />
      )}
    </div>
  );
}
