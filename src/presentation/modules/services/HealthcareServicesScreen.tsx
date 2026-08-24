import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search, ChevronRight, Stethoscope, Building2, Home, Truck, Pill, Microscope,
  Accessibility, AlertCircle, RotateCcw, ArrowRight, Star, X
} from 'lucide-react';
import { SERVICE_TILES } from '../../../config/serviceTypes';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') || searchParams.get('search') || '';

  const [globalSearch, setGlobalSearch] = useState(urlQuery);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [providerSearch, setProviderSearch] = useState('');

  const [providers, setProviders] = useState<ProviderItem[]>([]);
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

  const initialsOf = (name: string) =>
    name.trim().split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-3">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Healthcare Services</h1>
          <p className="text-teal-100/80 text-sm sm:text-base font-medium leading-relaxed">
            Choose a service and book with a verified provider.
          </p>
          <div className="mt-6 relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => {
                const val = e.target.value;
                setGlobalSearch(val);
                if (val.trim()) {
                  setSearchParams({ q: val.trim() });
                } else {
                  setSearchParams({});
                }
              }}
              placeholder="Search doctors, hospitals, clinics, or services..."
              className="w-full pl-12 pr-10 py-3.5 bg-white text-slate-900 rounded-2xl font-semibold text-sm placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-teal-400/30 shadow-lg"
            />
            {globalSearch && (
              <button
                onClick={() => {
                  setGlobalSearch('');
                  setSearchParams({});
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Service tiles (static config) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2"><span>🩺</span> Available Services</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredServices.map((service) => {
            const IconComponent = ICON_MAP[service.iconName] || Stethoscope;
            const isSelected = activeCategory === service.id;
            return (
              <div
                key={service.id}
                onClick={() => { setActiveCategory(service.id); setProviderSearch(''); }}
                className={`group relative bg-white rounded-2xl border p-5 flex flex-col justify-between cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                  isSelected ? 'border-teal-600 ring-2 ring-teal-600/30 shadow-lg bg-teal-50/20' : 'border-slate-200 hover:border-teal-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-50 to-teal-50/50 border border-slate-100 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                      {service.emoji}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/booking?service=${service.id}`); }}
                      className="text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-600 hover:text-white px-3 py-1.5 rounded-xl border border-teal-100 transition-colors flex items-center gap-1 shadow-xs"
                    >
                      Book Now &rarr;
                    </button>
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-base group-hover:text-teal-700 transition-colors">{service.name}</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed line-clamp-2">{service.shortDesc}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-400 group-hover:text-teal-600">
                  <span>View Providers</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Category tabs + provider list */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto modal-scrollbar">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeCategory === 'all' ? 'bg-slate-900 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            All Providers
          </button>
          {SERVICE_TILES.map((svc) => (
            <button
              key={svc.id}
              onClick={() => setActiveCategory(svc.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                activeCategory === svc.id ? 'bg-teal-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{svc.emoji}</span><span>{svc.name}</span>
            </button>
          ))}
        </div>

        {/* Provider search */}
        <div className="relative max-w-xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={providerSearch}
            onChange={(e) => setProviderSearch(e.target.value)}
            placeholder="Search providers by name..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 shadow-xs"
          />
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProviders.map((provider) => {
              const isFav = Boolean(favByPartner[provider.id]);
              return (
                <div key={provider.id} className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between hover:shadow-xl transition-all duration-300 relative group">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider capitalize">
                      {provider.specialtyOrType || 'Verified Partner'}
                    </span>
                    <button
                      onClick={() => toggleFavorite(provider.id)}
                      className={`p-2 rounded-full transition-colors ${isFav ? 'bg-amber-50 text-amber-500' : 'bg-slate-100 text-slate-400 hover:text-amber-500'}`}
                      title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Star className={`w-4 h-4 ${isFav ? 'fill-amber-500' : ''}`} />
                    </button>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-2xl border border-slate-100 shadow-xs shrink-0 bg-teal-50 text-teal-700 flex items-center justify-center font-black text-lg">
                      {initialsOf(provider.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-extrabold text-slate-800 text-base truncate group-hover:text-teal-700 transition-colors">{provider.name}</h3>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/booking?service=${provider.serviceId || activeCategory}`)}
                    className="w-full mt-5 px-4 py-2.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white transition-all shadow-xs"
                  >
                    Book Now
                  </button>
                </div>
              );
            })}
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
      </div>
    </div>
  );
}
