import { useEffect, useState, type ComponentProps } from 'react';
import {
  MapPin,
  Clock,
  Home,
  Building2,
  ChevronRight,
  ArrowLeft,
  Star,
  ShieldCheck,
  X,
  Pencil,
  PackageCheck,
  AlertCircle,
  RefreshCw,
  FlaskConical,
} from 'lucide-react';
import LabChooser from './LabChooser';
import { findLabsApi, labError, rupees, type LabHit, type PublicPackage } from '../../../services/labHelper';
import { nearest, useSearchArea, formatDistance } from '../../../services/location';
import LocationBar from '../../components/location/LocationBar';
import { LabTrust } from './LabCatalogueDetail';
import { homeCovers, partialCentres } from './labFlowDetails';
import './LabComparison.css';

type Props = ComponentProps<typeof LabChooser> & {
  selectedLab?: LabHit | null;
  selectedTests: { code: string; name: string; fasting_hours?: number; patient_instructions?: string | null }[];
  onChange: () => void;
  onContinue: () => void;
  canContinue: boolean;
  busy: boolean;
  onRemoveTests?: (codes: string[]) => void;
  packageSelection?: PublicPackage | null;
};

export default function LabComparison(p: Props) {
  const area = useSearchArea();
  const [offers, setOffers] = useState<Record<string, LabHit[]>>({});
  const [partialError, setPartialError] = useState('');
  const [checking, setChecking] = useState(false);
  const [retry, setRetry] = useState(0);
  const [pending, setPending] = useState(false);

  const key = p.selectedTests.map((t) => t.code).join(',');

  useEffect(() => {
    if (p.labs?.length !== 0) return;
    let active = true;
    setChecking(true);
    setOffers({});
    setPartialError('');
    Promise.all(
      p.selectedTests.map(async (t) => [t.code, await findLabsApi([t.code], p.city)] as const)
    )
      .then((rows) => {
        if (active) setOffers(Object.fromEntries(rows));
      })
      .catch((e) => {
        if (active) setPartialError(labError(e, 'Could not check individual test availability.'));
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, [key, p.city, p.labs, retry]);

  useEffect(() => {
    if (pending && p.canContinue) {
      setPending(false);
      p.onContinue();
    }
  }, [pending, p.canContinue, p.selectedId, p.onContinue]);

  const name = (code: string) => p.selectedTests.find((t) => t.code === code)?.name || code;
  const partials = partialCentres(
    p.selectedTests.map((t) => t.code),
    offers,
    p.packageSelection
  );
  const missing = partials[0]?.missing || p.selectedTests.map((t) => t.code);
  const remove = (codes: string[]) => p.onRemoveTests?.(codes);

  const totalTestCount = p.selectedTests.length + (p.packageSelection?.test_count || 0);

  return (
    <section className="w-full space-y-4" aria-label="Choose a lab">
      {/* 1. Header Card: Selected Tests count, chips, back / edit buttons */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={p.onChange}
              className="text-xs font-bold text-slate-500 hover:text-slate-900 inline-flex items-center gap-1.5 mb-2 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to test selection
            </button>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              {totalTestCount} test{totalTestCount === 1 ? '' : 's'} selected
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose a verified diagnostic laboratory offering your tests in {p.city || 'your area'}
            </p>
          </div>
          <button
            type="button"
            onClick={p.onChange}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 shadow-xs transition shrink-0"
          >
            <Pencil className="w-3.5 h-3.5 text-slate-500" /> Edit tests
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
          {p.packageSelection && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold">
              <PackageCheck className="w-4 h-4 text-teal-600" />
              <span>{p.packageSelection.name} ({p.packageSelection.test_count} tests)</span>
            </div>
          )}
          {p.selectedTests.map((t) => (
            <div
              key={t.code}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/90 text-slate-800 text-xs font-semibold hover:border-slate-300 transition"
            >
              <span>{t.name}</span>
              <button
                type="button"
                aria-label={`Remove ${t.name}`}
                onClick={() => remove([t.code])}
                className="w-4 h-4 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Location Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <strong className="text-xs font-bold text-slate-900 block">
              Diagnostic labs in {p.city || 'your area'}
            </strong>
            <span className="text-[11px] text-slate-500">
              Sorted by best package price. Sample collection charges shown in next step.
            </span>
          </div>
        </div>
        <div className="shrink-0">
          <LocationBar compact purpose="change lab search location" />
        </div>
      </div>

      {/* 3. Main Results / States */}
      {p.error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center space-y-3" role="alert">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-extrabold text-rose-900">Unable to load labs</h3>
          <p className="text-xs text-rose-700 max-w-md mx-auto">{p.error}</p>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition"
            onClick={p.onRetry}
          >
            <RefreshCw className="w-3.5 h-3.5" /> Try again
          </button>
        </div>
      ) : p.labs === null ? (
        <div role="status" className="rounded-2xl border border-slate-200 bg-white p-12 text-center space-y-3 shadow-xs">
          <div className="w-9 h-9 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-700">Finding labs offering all selected tests...</p>
        </div>
      ) : p.labs.length ? (
        <div className="space-y-3.5">
          {[...p.labs]
            .sort((a, b) => a.total - b.total)
            .map((l, index) => {
              const distance = area ? nearest(area, l.locations) : null;
              const heroImage = l.cover_url || l.gallery?.[0]?.url || l.logo_url;
              const isLowest = index === 0 && p.labs && p.labs.length > 1;

              return (
                <article
                  key={l.id}
                  className="group relative rounded-2xl border border-slate-200 hover:border-teal-400 bg-white hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col md:flex-row items-stretch"
                >
                  {/* Left Visual Cover / Thumbnail */}
                  <div className="relative md:w-48 bg-slate-100 flex-shrink-0 flex items-center justify-center min-h-[140px] md:min-h-0 overflow-hidden">
                    {heroImage ? (
                      <img
                        src={heroImage}
                        alt={l.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full min-h-[140px] flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-teal-50 to-blue-50 p-4 text-center">
                        <div className="w-12 h-12 rounded-xl bg-white shadow-xs border border-teal-100 flex items-center justify-center text-teal-600">
                          <FlaskConical className="w-6 h-6" />
                        </div>
                        <span className="text-[11px] font-bold text-teal-900 line-clamp-1">{l.name}</span>
                      </div>
                    )}

                    {isLowest && (
                      <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-teal-600 text-white text-[10px] font-extrabold uppercase tracking-wide shadow-xs">
                        Lowest Price
                      </span>
                    )}
                  </div>

                  {/* Center Details */}
                  <div className="flex-1 p-4 md:p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-extrabold text-slate-900 group-hover:text-teal-900 transition-colors">
                          {l.name}
                        </h3>
                        <LabTrust lab={l} />
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        {l.rating && l.rating.count > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            {Number(l.rating.average).toFixed(1)}
                            <span className="text-slate-400 font-normal">({l.rating.count})</span>
                          </span>
                        )}
                        <p className="inline-flex items-center gap-1 text-xs text-slate-600">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{l.locations.map((c) => c.name).join(' · ')}</span>
                          {distance && <span className="text-slate-400 font-medium">· {formatDistance(distance.metres)}</span>}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-slate-100">
                      {homeCovers(l, p.patientPin) && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <Home className="w-3 h-3 text-emerald-600" /> Home collection available
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                        <Building2 className="w-3 h-3 text-blue-600" /> Lab visit available
                      </span>
                      {l.report_hours != null && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-50 text-slate-700 border border-slate-200">
                          <Clock className="w-3 h-3 text-slate-500" /> Report in {l.report_hours}h
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Pricing & Action */}
                  <div className="p-4 md:p-5 md:border-l md:border-slate-100 bg-slate-50/50 md:bg-transparent flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 shrink-0 min-w-[200px]">
                    <div className="text-left md:text-right">
                      <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Total for {totalTestCount} test{totalTestCount === 1 ? '' : 's'}
                      </span>
                      <div className="text-2xl font-black text-slate-900 leading-none my-1">
                        {l.prices_vary ? 'From ' : ''}{rupees(l.total)}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={p.busy}
                      onClick={() => {
                        p.onSelect(l);
                        setPending(true);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-sm hover:shadow transition disabled:opacity-50 shrink-0"
                    >
                      Choose this lab <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </article>
              );
            })}
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6 space-y-4" role="alert">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-amber-900">No eligible labs for selected tests</h3>
              <p className="text-xs text-amber-800 mt-1">
                No single centre in {p.city} offers all these tests together.
              </p>
            </div>
          </div>

          {checking || (!partialError && p.selectedTests.some((t) => !Object.prototype.hasOwnProperty.call(offers, t.code))) ? (
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-800">
              <div className="w-4 h-4 border-2 border-amber-800 border-t-transparent rounded-full animate-spin" />
              Checking which tests can be booked together...
            </div>
          ) : partialError ? (
            <div className="space-y-2">
              <p className="text-xs text-rose-700">{partialError}</p>
              <button
                type="button"
                className="text-xs font-bold text-slate-700 underline"
                onClick={() => setRetry((n) => n + 1)}
              >
                Retry individual availability
              </button>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="rounded-xl bg-white border border-amber-200 p-4 space-y-2">
                <strong className="text-xs font-bold text-slate-900 block">
                  {partials.length
                    ? 'Remove these tests to continue with ' + partials[0].lab.name
                    : 'Not offered in ' + p.city}
                </strong>
                <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
                  {missing.map((c) => (
                    <li key={c}>{name(c)}</li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {partials.length > 0 && (
                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-sm transition"
                    onClick={() => remove(missing)}
                  >
                    Remove those tests
                  </button>
                )}
                {partials.length === 0 && (
                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-sm transition"
                    onClick={() => {
                      remove(missing);
                      p.onChange();
                    }}
                  >
                    Remove those tests
                  </button>
                )}
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition"
                  onClick={p.onChange}
                >
                  Edit tests
                </button>
              </div>

              {partials.length > 0 && (
                <section className="mt-6 space-y-3">
                  <h4 className="text-sm font-bold text-slate-900">Labs that can do part of your selection</h4>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {partials.map((r) => (
                      <article key={r.lab.id + ':' + r.centre.id} className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                        <h5 className="text-sm font-bold text-slate-900">
                          {r.lab.name} · {r.codes.length} of {p.selectedTests.length} tests
                        </h5>
                        <p className="text-xs text-slate-500">{r.centre.name}</p>
                        <p className="text-xs text-slate-600">Missing: {r.missing.map(name).join(', ')}</p>
                        <button
                          type="button"
                          className="text-xs font-bold text-teal-700 hover:text-teal-900 underline"
                          onClick={() => remove(r.missing)}
                        >
                          Remove missing tests
                        </button>
                      </article>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
