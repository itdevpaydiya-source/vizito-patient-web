import React, { useState, useEffect, useCallback } from 'react';
import ProviderCard, { providerDistance } from '../../components/ProviderCard';
import LocationBar from '../../components/location/LocationBar';
import { useSearchArea } from '../../../services/location';
import FavoriteButton from '../../components/FavoriteButton';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import {
  Search, ChevronRight, Stethoscope, Building2, Home, Truck, Pill, Microscope,
  Accessibility, AlertCircle, RotateCcw, ArrowRight, Star, X
} from 'lucide-react';
import { SERVICE_TILES, serviceRoute } from '../../../config/serviceTypes';
import ServiceVisual from '../../components/illustrations/ServiceVisual';
import { getProvidersApi, getFavoritesApi, addFavoriteApi, removeFavoriteApi } from '../../../services/patientHelper';
import type { ProviderItem } from '../../../services/types';

const ICON_MAP: Record<string, React.ElementType> = {
  Stethoscope, Building2, Home, Truck, Pill, TestTube: Microscope, Package: Accessibility, Microscope, Accessibility
};

// Healthcare Services — the seven service tiles are static navigation config (SERVICE_TILES); every
// provider shown is a real approved partner from GET /patients/providers. The backend exposes only
// provider identity (name + type) today, so ratings, fees, reviews, departments, catalogs, queue and
// tracking are intentionally not shown here (they have no backend) rather than fabricated.
export default function HealthcareServicesScreen() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion() ?? false;
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') || searchParams.get('search') || '';

  const [globalSearch, setGlobalSearch] = useState(urlQuery);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [providerSearch, setProviderSearch] = useState('');

  const [providers, setProviders] = useState<ProviderItem[]>([]);
  const area = useSearchArea();
  const [nearFirst, setNearFirst] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Synchronize when URL query param changes
  useEffect(() => {
    if (urlQuery !== globalSearch) {
      setGlobalSearch(urlQuery);
    }
  }, [urlQuery]);

  // Favorites (real, patient-scoped). Keyed by partner id for quick toggle lookup.
  const [favByPartner, setFavByPartner] = useState<Record<string, string>>({}); // partnerId -> favoriteId

  const loadProviders = useCallback(async (category: string, search?: string) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const list = await getProvidersApi(category === 'all' ? undefined : category, search);
      setProviders(list);
    } catch {
      setLoadError('Unable to load providers. Please try again.');
      setProviders([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const term = (providerSearch || globalSearch).trim();
    loadProviders(activeCategory, term || undefined);
  }, [activeCategory, globalSearch, providerSearch, loadProviders]);

  useEffect(() => {
    // Load favorites once for the heart toggle. Non-fatal — absence just means no hearts filled.
    getFavoritesApi()
      .then((favs) => {
        const map: Record<string, string> = {};
        favs.forEach((f) => { if (f.partnerId) map[f.partnerId] = f.id; });
        setFavByPartner(map);
      })
      .catch(() => setFavByPartner({}));
  }, []);

  const toggleFavorite = async (partnerId: string) => {
    const existing = favByPartner[partnerId];
    try {
      if (existing) {
        await removeFavoriteApi(existing);
        setFavByPartner((prev) => { const n = { ...prev }; delete n[partnerId]; return n; });
      } else {
        await addFavoriteApi({ doctor_partner_id: partnerId });
        const favs = await getFavoritesApi();
        const map: Record<string, string> = {};
        favs.forEach((f) => { if (f.partnerId) map[f.partnerId] = f.id; });
        setFavByPartner(map);
      }
    } catch { /* non-fatal; leave state unchanged */ }
  };

  const filteredServices = SERVICE_TILES.filter((svc) => {
    if (!globalSearch.trim()) return true;
    const q = globalSearch.toLowerCase().trim();
    return svc.name.toLowerCase().includes(q) || svc.shortDesc.toLowerCase().includes(q);
  });

  const activeSearch = (providerSearch || globalSearch).toLowerCase().trim();
  const filteredProviders = providers.filter((p) => {
    if (!activeSearch) return true;
    return (
      p.name.toLowerCase().includes(activeSearch) ||
      (p.specialtyOrType || '').toLowerCase().includes(activeSearch) ||
      (p.subtitle || '').toLowerCase().includes(activeSearch)
    );
  });
  const orderedProviders = nearFirst
    ? [...filteredProviders].sort((x, y) => (providerDistance(x, area)?.metres ?? Infinity) - (providerDistance(y, area)?.metres ?? Infinity))
    : filteredProviders;

  const initialsOf = (name: string) =>
    name.trim().split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <motion.div
      className="mx-auto w-full max-w-[1600px] space-y-6 pb-12"
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: 'easeOut' }}
    >
      {/* Title. Search lives in the header (doctors, hospitals, labs, tests, pharmacies); a header
          search lands here as ?q= and filters the results below. */}
      <section aria-label="Healthcare services" className="rounded-3xl border border-orange-100 bg-gradient-to-r from-orange-50/80 via-white to-white px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-orange-800"><span className="h-2 w-2 rounded-full bg-orange-500" aria-hidden="true" />Care, made easier</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-1">Find the right care for you</h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">Browse services, find a provider near you, and continue to booking when you’re ready.</p>
          </div>
          <div className="hidden lg:flex items-center gap-2 rounded-2xl border border-white bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-sm">
            <Stethoscope className="h-5 w-5 text-teal-700" /> <span>Care from trusted local providers</span>
          </div>
        </div>
        {globalSearch.trim() && (
          <p className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-100 rounded-full pl-3 pr-1 py-1">
            Results for “{globalSearch.trim()}”
            <button aria-label="Clear search" onClick={() => { setGlobalSearch(''); setSearchParams({}); }} className="p-1 rounded-full hover:bg-white"><X className="w-3.5 h-3.5" /></button>
          </p>
        )}
      </section>

      {/* One category selector (replaces the big tiles + the repeated category strip). */}
      <section aria-label="Type of care" className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div><h2 className="text-lg font-bold text-slate-900">Browse by service</h2><p className="text-sm text-slate-500 mt-0.5">Choose a category to narrow down your options.</p></div>
          <span className="hidden sm:inline-flex text-xs font-semibold text-slate-500">{activeCategory === 'all' ? 'All services' : SERVICE_TILES.find((s) => s.id === activeCategory)?.name}</span>
        </div>
        <div role="radiogroup" aria-label="Type of care" className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2.5">
          {[{ id: 'all', name: 'All providers', shortDesc: 'Every type of care', iconName: 'Package', available: true } as any, ...SERVICE_TILES].map((svc) => {
            const Ic = svc.id === 'all' ? Building2 : ICON_MAP[svc.iconName] || Stethoscope;
            const sel = activeCategory === svc.id;
            return (
              <button key={svc.id} type="button" role="radio" aria-checked={sel} disabled={!svc.available}
                onClick={() => { setActiveCategory(svc.id); setProviderSearch(''); }}
                className={`min-h-[92px] text-left rounded-2xl border p-3 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55 ${sel ? 'border-teal-700 bg-orange-50/70 shadow-sm ring-1 ring-orange-200' : 'border-slate-200 bg-white hover:border-orange-200 hover:shadow-sm'}`}>
                <Ic className={`w-5 h-5 ${sel ? 'text-teal-700' : 'text-slate-500'}`} aria-hidden="true" />
                <span className="block text-xs font-extrabold text-slate-900 mt-1.5 leading-tight">{svc.name}</span>
                {!svc.available && <span className="mt-1 block text-[10px] font-bold text-slate-400">Coming soon</span>}
              </button>
            );
          })}
        </div>
      </section>

      {/* Results: location, filter and sort sit right above the providers they change. */}
      <section aria-label="Find providers" className="rounded-3xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4 space-y-3">
        <LocationBar compact purpose="see how far each provider is and sort nearest first" />
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[14rem] max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" aria-label="Filter these providers by name" value={providerSearch} onChange={(e) => setProviderSearch(e.target.value)}
              placeholder={`Filter ${activeCategory === 'all' ? 'providers' : (SERVICE_TILES.find((x) => x.id === activeCategory)?.name || 'providers').toLowerCase()} by name`}
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
          </div>
          {activeCategory !== 'all' && SERVICE_TILES.find((x) => x.id === activeCategory)?.available && (
            <button type="button" onClick={() => navigate(serviceRoute(activeCategory))} className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 inline-flex items-center gap-1 hover:border-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600">
              {activeCategory === 'doctor' || activeCategory === 'hospital' ? 'Find by date & availability' : activeCategory === 'diagnostic' ? 'Choose tests first' : 'Open full booking'} <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-1">
          <div><h2 className="text-lg font-bold text-slate-900">{activeCategory === 'all' ? 'Available providers' : `Available ${SERVICE_TILES.find((s) => s.id === activeCategory)?.name || 'providers'}`}</h2><p className="text-xs text-slate-500 mt-0.5">Choose a provider to see the next steps.</p></div>
          {!isLoading && !loadError && <span className="text-xs font-semibold text-slate-500">{filteredProviders.length} {filteredProviders.length === 1 ? 'provider' : 'providers'}</span>}
        </div>

        {/* Provider list states */}
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center shadow-xs">
            <div className="w-7 h-7 border-[3px] border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-500 font-medium text-sm">Loading providers...</p>
          </div>
        ) : loadError ? (
          <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center shadow-xs space-y-3">
            <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
            <p className="text-rose-600 font-semibold text-sm">{loadError}</p>
            <button onClick={() => loadProviders(activeCategory)} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl">
              <RotateCcw className="w-4 h-4" /> Retry
            </button>
          </div>
        ) : filteredProviders.length > 0 ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {area && filteredProviders.some((p) => providerDistance(p, area)) && (
                <button type="button" aria-pressed={nearFirst} onClick={() => setNearFirst(!nearFirst)} className={`px-3 py-1 rounded-full border text-xs font-bold ${nearFirst ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>Nearest first</button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {orderedProviders.map((p, index) => {
                if (reduceMotion || index >= 6) return <ProviderCard key={p.id} p={p} />;
                return (
                  <motion.div
                    key={p.id}
                    className="h-full"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.995 }}
                    transition={{ duration: 0.24, delay: index * 0.045, ease: 'easeOut' }}
                  >
                    <ProviderCard p={p} />
                  </motion.div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800">No providers available</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {providerSearch ? 'No providers match your search.' : 'There are no approved providers in this category yet.'}
            </p>
          </div>
        )}
      </section>
    </motion.div>
  );
}
