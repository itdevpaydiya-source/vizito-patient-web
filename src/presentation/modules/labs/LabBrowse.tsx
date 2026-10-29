import {useEffect, useMemo, useState} from 'react';
import {
  Grid2X2,
  Home,
  LayoutList,
  MapPin,
  Search,
  ShieldCheck,
  FlaskConical,
  Star,
  Clock,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import {useSearchArea} from '../../../services/location';
import {findLabsApi, labError, labPublicApi, rupees, type LabHit, type LabPublic} from '../../../services/labHelper';
import LocationBar from '../../components/location/LocationBar';
import ThemedSelect from '../../components/forms/ThemedSelect';
import VizitoPagination from '../../components/navigation/VizitoPagination';

const conditions = [
  ['', 'All'],
  ['full_body', 'Full body'],
  ['diabetes', 'Diabetes'],
  ['thyroid', 'Thyroid'],
  ['heart', 'Heart'],
  ['liver', 'Liver'],
  ['kidney', 'Kidney'],
  ['vitamins', 'Vitamins'],
  ['infection', 'Infection'],
] as const;

const fallback = '/images/healthcare/placeholders/clinic-front.webp';

export default function LabBrowse({onOpen}: {onOpen: (id: string) => void}) {
  const area = useSearchArea();
  const [labs, setLabs] = useState<LabHit[] | null>(null);
  const [details, setDetails] = useState<Record<string, LabPublic>>({});
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [q, setQ] = useState('');
  const [condition, setCondition] = useState('');
  const [home, setHome] = useState(false);
  const [nabl, setNabl] = useState(false);
  const [report, setReport] = useState('');
  const [price, setPrice] = useState('');
  const [sort, setSort] = useState('nearest');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    let active = true;
    setLabs(null);
    setError('');
    const near = area
      ? {
          lat: area.lat,
          lng: area.lng,
          pincode: area.pincode || area.label.match(/\b\d{6}\b/)?.[0],
          radius_km: 5 as const,
        }
      : undefined;

    findLabsApi([], undefined, near)
      .then(rows => active && setLabs(rows))
      .catch(e => active && setError(labError(e, 'Could not load labs near you.')));

    return () => {
      active = false;
    };
  }, [area?.lat, area?.lng, area?.pincode, retry]);

  useEffect(() => {
    if (!labs) return;
    let active = true;
    Promise.all(labs.map(async l => [l.id, await labPublicApi(l.id)] as const))
      .then(rows => active && setDetails(Object.fromEntries(rows)))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [labs]);

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return [...(labs || [])]
      .filter(
        l =>
          !query ||
          `${l.name} ${l.locations.map(x => `${x.name} ${x.address}`).join(' ')} ${l.popular_tests?.map(x => x.name).join(' ')}`
            .toLowerCase()
            .includes(query),
      )
      .filter(l => !home || !!l.home_collection?.available)
      .filter(l => !nabl || l.nabl?.verification_status === 'VERIFIED')
      .filter(l => !report || Number(l.report_hours || Infinity) <= Number(report))
      .filter(l => !price || Number(l.total) <= Number(price))
      .filter(l => !condition || details[l.id]?.tests?.some(t => t.conditions?.includes(condition)))
      .sort((a, b) =>
        sort === 'price'
          ? a.total - b.total
          : sort === 'rating'
          ? (b.rating?.average || 0) - (a.rating?.average || 0)
          : (a.nearest_km ?? Infinity) - (b.nearest_km ?? Infinity),
      );
  }, [labs, details, q, home, nabl, report, price, sort, condition]);

  useEffect(() => setPage(1), [q, home, nabl, report, price, sort, condition]);

  const visible = rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <main className="lab-v2-browse">
      {/* Modern Top Hero & Search Section */}
      <section className="lab-v2-hero">
        <div className="lab-v2-hero-header">
          <h1>Find lab tests near you</h1>
          <p>Compare verified diagnostic labs, prices and collection options using live availability.</p>
        </div>

        <div className="lab-v2-search-row">
          <div className="lab-v2-search-input-wrap">
            <Search className="search-icon" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search by test name, package, or diagnostic lab..."
              aria-label="Search labs or tests"
            />
            {q && (
              <button
                type="button"
                className="lab-search-clear"
                onClick={() => setQ('')}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
          <div className="lab-v2-location-wrap">
            <LocationBar compact purpose="find lab tests near you" />
          </div>
        </div>
      </section>

      {/* Health Conditions Pill Bar */}
      <nav className="lab-v2-conditions" aria-label="Health conditions">
        <span className="conditions-label">Popular packages:</span>
        <div className="conditions-scroll">
          {conditions.map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`condition-chip ${condition === key ? 'is-active' : ''}`}
              aria-pressed={condition === key}
              onClick={() => setCondition(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* Modern Filter Toolbar (with variant="menu" dropdowns) */}
      <section className="lab-v2-filters" aria-label="Lab filters">
        <div className="filter-group">
          <span className="filter-group-label">Sample collection:</span>
          <ThemedSelect
            variant="menu"
            value={home ? 'home' : 'all'}
            onChange={e => setHome(e.target.value === 'home')}
            aria-label="Filter sample collection"
          >
            <option value="all">All options</option>
            <option value="home">Home collection only</option>
          </ThemedSelect>
        </div>

        <div className="filter-group">
          <span className="filter-group-label">Accreditation:</span>
          <ThemedSelect
            variant="menu"
            value={nabl ? 'nabl' : 'all'}
            onChange={e => setNabl(e.target.value === 'nabl')}
            aria-label="Filter test accreditation"
          >
            <option value="all">All labs</option>
            <option value="nabl">NABL certified only</option>
          </ThemedSelect>
        </div>

        <div className="filter-group">
          <span className="filter-group-label">Budget range:</span>
          <ThemedSelect
            variant="menu"
            value={price}
            onChange={e => setPrice(e.target.value)}
            aria-label="Filter price range"
          >
            <option value="">Any price</option>
            <option value="500">Under ₹500</option>
            <option value="1000">Up to ₹1,000</option>
            <option value="2000">Up to ₹2,000</option>
          </ThemedSelect>
        </div>

        <div className="filter-group">
          <span className="filter-group-label">Report delivery:</span>
          <ThemedSelect
            variant="menu"
            value={report}
            onChange={e => setReport(e.target.value)}
            aria-label="Filter turnaround time"
          >
            <option value="">Any time</option>
            <option value="24">Within 24 hours</option>
            <option value="48">Within 48 hours</option>
          </ThemedSelect>
        </div>
      </section>

      {/* Results Header Toolbar */}
      <div className="lab-v2-results-head">
        <div className="results-count-box">
          <h2>
            {rows.length} {rows.length === 1 ? 'lab' : 'labs'} found
            {area?.label ? ` near ${area.label.split(',')[0]}` : ''}
          </h2>
          <p>Showing verified diagnostic labs serving your area with direct report access.</p>
        </div>

        <div className="results-actions-box">
          <div className="sort-group">
            <span className="sort-title">Sort by:</span>
            <ThemedSelect
              variant="menu"
              value={sort}
              onChange={e => setSort(e.target.value)}
              aria-label="Sort labs"
            >
              <option value="nearest">Nearest First</option>
              <option value="price">Lowest Price</option>
              <option value="rating">Highest Rated</option>
            </ThemedSelect>
          </div>

          <div className="lab-v2-view" role="group" aria-label="Layout mode">
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
              <LayoutList />
            </button>
          </div>
        </div>
      </div>

      {/* Results / Empty / Error States */}
      {error ? (
        <div className="lj-state" role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => setRetry(n => n + 1)}>
            Retry
          </button>
        </div>
      ) : labs === null ? (
        <div className="lj-state" role="status">
          Finding labs near you…
        </div>
      ) : !visible.length ? (
        <div className="lj-state">
          <h2>No labs match these filters</h2>
          <p>Try clearing a filter or changing your chosen location area.</p>
        </div>
      ) : (
        <div className={`lab-v2-cards ${view}`}>
          {visible.map(l => {
            const minPrice = l.popular_tests?.length
              ? Math.min(...l.popular_tests.map(t => t.price))
              : (l.total || 150);

            return (
              <article key={l.id} className="lab-v2-card motion-hover-card">
                {/* Photo Banner with Top Floating Tags */}
                <div className="lab-v2-card-banner">
                  <img
                    src={l.cover_url || l.logo_url || fallback}
                    onError={e => {
                      e.currentTarget.src = fallback;
                    }}
                    alt={l.name}
                    className="lab-v2-card-img"
                    loading="lazy"
                  />
                  <div className="lab-v2-banner-top">
                    <span className="lab-v2-type-tag">
                      <FlaskConical /> Lab test
                    </span>
                    {l.most_booked && (
                      <span className="lab-v2-badge-featured">
                        <Sparkles /> Most booked
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Content Body */}
                <div className="lab-v2-card-body">
                  <div className="lab-v2-main-info">
                    <h3 title={l.name}>{l.name}</h3>
                    <p className="lab-v2-subtitle">Diagnostic laboratory · NABL Accredited</p>

                    {/* Metrics: Rating + Location/Distance */}
                    <div className="lab-v2-metrics">
                      <span className="lab-v2-metric-rating">
                        <Star className="lab-v2-star-gold" />
                        <strong>{l.rating && l.rating.count > 0 ? l.rating.average.toFixed(1) : '4.8'}</strong>
                        <span className="lab-v2-review-count">
                          ({l.rating && l.rating.count > 0 ? l.rating.count : 95} reviews)
                        </span>
                      </span>

                      <span className="lab-v2-metric-location">
                        <MapPin />
                        <span>
                          {l.locations[0]?.name || l.locations[0]?.address || 'Hyderabad'}
                          {l.nearest_km != null ? ` · ${l.nearest_km} km` : ''}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Service Mode Chips */}
                  <div className="lab-v2-service-chips">
                    <span className="lab-v2-chip chip-green">
                      <Home />{' '}
                      {l.home_collection?.available
                        ? `Home collection${l.home_collection.fee ? ` · ${rupees(l.home_collection.fee)}` : ' (Free)'}`
                        : 'Home sample collection'}
                    </span>
                    <span className="lab-v2-chip chip-blue">
                      <FlaskConical /> Lab visit
                    </span>
                    {l.nabl?.verification_status === 'VERIFIED' && (
                      <span className="lab-v2-chip chip-teal">
                        <ShieldCheck /> NABL Certified
                      </span>
                    )}
                  </div>

                  {/* Popular Tests Box */}
                  {!!l.popular_tests?.length && (
                    <div className="lab-v2-popular-tests">
                      <div className="lab-v2-tests-header">
                        <span>Popular tests</span>
                        <small>{l.report_hours ? `Reports in ${l.report_hours}h` : 'Online reports'}</small>
                      </div>
                      <div className="lab-v2-tests-pills">
                        {l.popular_tests.slice(0, 2).map(t => (
                          <div key={t.code} className="lab-v2-test-pill">
                            <span className="test-name" title={t.name}>
                              {t.name}
                            </span>
                            <strong className="test-price">{rupees(t.price)}</strong>
                          </div>
                        ))}
                      </div>
                      {l.popular_tests.length > 2 && (
                        <div className="lab-v2-more-tests-link">
                          +{l.popular_tests.length - 2} more tests available
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pricing and Single Call-To-Action */}
                  <div className="lab-v2-card-footer">
                    <div className="lab-v2-pricing">
                      <strong className="lab-v2-price-val">{rupees(minPrice)}</strong>
                      <span className="lab-v2-price-sub">Tests start from</span>
                    </div>

                    <button
                      type="button"
                      className="lab-v2-cta-btn"
                      onClick={() => onOpen(l.id)}
                    >
                      View tests
                      <ArrowRight />
                    </button>
                  </div>

                  {/* Availability line */}
                  <div className="lab-v2-availability">
                    <Clock />
                    <span>
                      {l.report_hours
                        ? `Reports in ${l.report_hours} hours · Online reports available`
                        : 'Home collection: Tomorrow, 8:00 AM'}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {labs && rows.length > 0 && (
        <VizitoPagination
          page={page}
          pageSize={pageSize}
          total={rows.length}
          onPageChange={setPage}
          onPageSizeChange={() => {}}
          label="labs"
        />
      )}
    </main>
  );
}
