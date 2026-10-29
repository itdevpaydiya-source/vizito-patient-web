import {useMemo, useState} from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  ExternalLink,
  FlaskConical,
  Home,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  Calendar,
  Building2,
  FileText,
  Package,
} from 'lucide-react';
import type {LabPublic} from '../../../services/labHelper';
import {rupees} from '../../../services/labHelper';

const fallback = '/images/healthcare/placeholders/clinic-front.webp';

const conditions = [
  ['', 'All conditions'],
  ['full_body', 'Full body'],
  ['diabetes', 'Diabetes'],
  ['thyroid', 'Thyroid'],
  ['heart', 'Heart'],
  ['liver', 'Liver'],
  ['kidney', 'Kidney'],
  ['vitamins', 'Vitamins'],
  ['infection', 'Infection'],
] as const;

export default function LabDetailSelection({
  lab,
  chosen,
  onToggle,
  onContinue,
  onBack,
}: {
  lab: LabPublic;
  chosen: string[];
  onToggle: (code: string) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const [tab, setTab] = useState('All tests');
  const [q, setQ] = useState('');
  const [condition, setCondition] = useState('');

  const images = [lab.cover_url, ...(lab.gallery || []).map(x => x.url)].filter(
    (x): x is string => !!x,
  );

  const tests = useMemo(() => {
    const s = q.trim().toLowerCase();
    let rows = lab.tests || [];
    if (tab === 'Popular tests') {
      rows = rows.filter(t => lab.popular_tests?.some(p => p.code === t.code));
    }
    if (condition) {
      rows = rows.filter(t => t.conditions?.includes(condition));
    }
    if (s) {
      rows = rows.filter(t =>
        `${t.name} ${t.department || ''}`.toLowerCase().includes(s),
      );
    }
    return rows;
  }, [lab, tab, q, condition]);

  const selected = (lab.tests || []).filter(t => chosen.includes(t.code));
  const total = selected.reduce((n, t) => n + t.price, 0);
  const first = lab.locations[0];

  return (
    <main className="lab-v2-detail">
      {/* Top Navigation Bar */}
      <div className="lab-detail-top-nav">
        <button type="button" className="lab-detail-back-btn" onClick={onBack}>
          <ArrowLeft />
          <span>Back to diagnostic labs</span>
        </button>

        <div className="lab-detail-breadcrumb">
          <span>Lab tests</span>
          <span className="sep">/</span>
          <strong>{lab.name}</strong>
        </div>
      </div>

      {/* Lab Hero Profile Card */}
      <section className="lab-v2-detail-hero">
        <div className="lab-v2-gallery">
          <img
            src={images[0] || lab.logo_url || fallback}
            onError={e => {
              e.currentTarget.src = fallback;
            }}
            alt={lab.name}
            className="gallery-main-img"
          />
          {images.length > 1 && (
            <div className="gallery-thumbs">
              {images.slice(1, 4).map((src, i) => (
                <img
                  key={src}
                  src={src}
                  alt={lab.gallery?.[i]?.caption || ''}
                  className="gallery-thumb-img"
                />
              ))}
            </div>
          )}
        </div>

        <div className="lab-v2-hero-info">
          <div className="lab-hero-title-row">
            <div>
              <h1>{lab.name}</h1>
              <p className="lab-hero-subtitle">
                Diagnostic Laboratory &amp; Pathology Center
              </p>
            </div>

            <div className="lab-hero-trust-badges">
              {lab.nabl?.verification_status === 'VERIFIED' && (
                <span className="badge-nabl">
                  <ShieldCheck /> NABL Accredited
                </span>
              )}
              {lab.rating && lab.rating.count > 0 && (
                <span className="badge-rating">
                  <Star className="star-icon" />
                  <strong>{lab.rating.average}</strong>
                  <small>({lab.rating.count} reviews)</small>
                </span>
              )}
            </div>
          </div>

          {first && (
            <div className="lab-hero-location">
              <MapPin className="pin-icon" />
              <span>{[first.address, first.city, first.pincode].filter(Boolean).join(', ')}</span>
              {first?.pin && (
                <a
                  target="_blank"
                  rel="noreferrer"
                  href={`https://www.google.com/maps/dir/?api=1&destination=${first.pin.lat},${first.pin.lng}`}
                  className="directions-link"
                >
                  Get directions <ExternalLink />
                </a>
              )}
            </div>
          )}

          <div className="lab-hero-highlights">
            <span className="highlight-pill pill-blue">
              <Clock /> Open today · Working hours below
            </span>
            {lab.settings.home.enabled && (
              <span className="highlight-pill pill-green">
                <Home /> Home collection available{lab.settings.home.fee ? ` (${rupees(lab.settings.home.fee)})` : ' (Free)'}
              </span>
            )}
            <span className="highlight-pill pill-purple">
              <FileText /> Digital report delivery
            </span>
          </div>
        </div>
      </section>

      {/* Main Tests Selection Section & Sticky Summary */}
      <div className="lab-v2-detail-layout">
        <div className="lab-tests-content-col">
          {/* Navigation Tabs */}
          <nav className="lab-v2-detail-tabs" aria-label="Test categories">
            {['All tests', 'Health packages', 'Popular tests', 'By health condition'].map(x => (
              <button
                key={x}
                type="button"
                className={`tab-btn ${tab === x ? 'is-active' : ''}`}
                aria-pressed={tab === x}
                onClick={() => setTab(x)}
              >
                {x}
              </button>
            ))}
          </nav>

          {/* Health packages tab */}
          {tab === 'Health packages' ? (
            <section className="lab-v2-test-list">
              {lab.packages?.length ? (
                lab.packages.map(p => (
                  <article key={p.code} className="lab-test-card">
                    <div className="test-card-info">
                      <h3>{p.name}</h3>
                      {p.description && <p className="test-desc">{p.description}</p>}
                      <div className="test-meta-pills">
                        <span>{p.test_count} tests included</span>
                        <span>·</span>
                        <span>Reports in {p.tat_hours} hours</span>
                      </div>
                    </div>
                    <div className="test-card-actions">
                      <strong className="test-price">{rupees(p.price)}</strong>
                      <button
                        type="button"
                        className="test-action-btn"
                        onClick={() => onToggle(p.code)}
                      >
                        {chosen.includes(p.code) ? (
                          <>
                            <Check /> Added
                          </>
                        ) : (
                          <>
                            <Plus /> Add package
                          </>
                        )}
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="lab-empty-state">
                  <p>No health packages are currently available at this centre.</p>
                </div>
              )}
            </section>
          ) : (
            <>
              {/* Search tests input */}
              <div className="lab-v2-test-search">
                <Search className="search-icon" />
                <input
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="Search tests or parameters at this lab..."
                  aria-label="Search tests"
                />
                {q && (
                  <button
                    type="button"
                    className="search-clear-btn"
                    onClick={() => setQ('')}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Conditions filter pills */}
              {tab === 'By health condition' && (
                <nav className="lab-v2-conditions conditions-subbar" aria-label="Health conditions">
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
                </nav>
              )}

              {/* Tests list */}
              <section className="lab-v2-test-list">
                {tests.length === 0 ? (
                  <div className="lab-empty-state">
                    <p>No tests match your search query. Try another keyword.</p>
                  </div>
                ) : (
                  tests.map(t => {
                    const isChosen = chosen.includes(t.code);
                    return (
                      <article
                        key={t.code}
                        className={`lab-test-card ${isChosen ? 'is-selected' : ''}`}
                      >
                        <div className="test-card-info">
                          <h3>{t.name}</h3>
                          <div className="test-meta-pills">
                            <span className="param-pill">
                              <FlaskConical /> {t.parameters} {t.parameters === 1 ? 'parameter' : 'parameters'}
                            </span>
                            <span className="fasting-pill">
                              <Clock /> {t.fasting_hours ? `${t.fasting_hours} h fasting required` : 'No fasting required'}
                            </span>
                            <span className="report-pill">
                              <Calendar /> Report in {t.tat_hours} h
                            </span>
                          </div>
                        </div>

                        <div className="test-card-actions">
                          <div className="pricing-box">
                            {t.mrp && <del className="test-mrp">{rupees(t.mrp)}</del>}
                            <strong className="test-price">{rupees(t.price)}</strong>
                          </div>
                          <button
                            type="button"
                            className={`test-action-btn ${isChosen ? 'is-added' : ''}`}
                            onClick={() => onToggle(t.code)}
                            aria-pressed={isChosen}
                          >
                            {isChosen ? (
                              <>
                                <Check /> Added
                              </>
                            ) : (
                              <>
                                <Plus /> Add
                              </>
                            )}
                          </button>
                        </div>
                      </article>
                    );
                  })
                )}
              </section>
            </>
          )}
        </div>

        {/* Sticky Selected Tests Cart Sidebar */}
        <aside className="lab-v2-selected">
          <div className="cart-header">
            <h2>Selected tests</h2>
            {selected.length > 0 && (
              <span className="cart-badge">{selected.length}</span>
            )}
          </div>

          {selected.length ? (
            <div className="cart-body">
              <div className="cart-items-scroll">
                {selected.map(t => (
                  <div key={t.code} className="cart-item-row">
                    <div className="cart-item-info">
                      <span className="cart-item-title">{t.name}</span>
                      <small className="cart-item-meta">{t.parameters} parameters</small>
                    </div>
                    <div className="cart-item-right">
                      <b>{rupees(t.price)}</b>
                      <button
                        type="button"
                        className="cart-remove-btn"
                        onClick={() => onToggle(t.code)}
                        title="Remove test"
                        aria-label={`Remove ${t.name}`}
                      >
                        <Trash2 />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="cart-summary-box">
                <div className="summary-line">
                  <span>Tests Subtotal</span>
                  <strong>{rupees(total)}</strong>
                </div>
                <div className="summary-line total-line">
                  <span>Total Payable</span>
                  <span className="grand-total">{rupees(total)}</span>
                </div>
                <small className="summary-note">
                  Sample collection method &amp; time slot chosen in next step.
                </small>
              </div>

              <button
                type="button"
                className="cart-checkout-btn"
                onClick={onContinue}
              >
                Continue to booking
                <ArrowRight />
              </button>
            </div>
          ) : (
            <div className="cart-empty">
              <FlaskConical className="empty-cart-icon" />
              <p>No tests selected yet</p>
              <small>Click "Add" on any test to add it to your booking.</small>
            </div>
          )}
        </aside>
      </div>

      {/* Lab Information / Facilities / Hours Cards */}
      <section className="lab-v2-about" aria-label="Laboratory information">
        <div className="about-card">
          <div className="about-card-title">
            <Building2 />
            <h2>About {lab.name}</h2>
          </div>
          {lab.registration_number && (
            <p className="reg-text">Registered diagnostic laboratory · {lab.registration_number}</p>
          )}
          <p>Online reports and digital download available for all completed bookings.</p>
        </div>

        <div className="about-card">
          <div className="about-card-title">
            <MapPin />
            <h2>Address &amp; Location</h2>
          </div>
          {lab.locations.map(l => (
            <p key={l.id}>{[l.name, l.address, l.city, l.pincode].filter(Boolean).join(', ')}</p>
          ))}
        </div>

        <div className="about-card">
          <div className="about-card-title">
            <Clock />
            <h2>Working hours</h2>
          </div>
          <p>Centre hours are shown when you choose a collection date and slot.</p>
          {lab.settings.home.enabled && (
            <p className="home-hours">
              Home collection: {lab.settings.home.open} – {lab.settings.home.close}
            </p>
          )}
        </div>

        <div className="about-card">
          <div className="about-card-title">
            <ShieldCheck />
            <h2>Quality &amp; Facilities</h2>
          </div>
          {lab.nabl && <p className="facility-item">✓ NABL Accredited diagnostic facility</p>}
          {lab.settings.home.enabled && <p className="facility-item">✓ Temperature-controlled sample transport</p>}
          <p className="facility-item">✓ Automated computerized reporting</p>
        </div>
      </section>
    </main>
  );
}
