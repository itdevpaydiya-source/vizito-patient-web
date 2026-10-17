import React, { useState, useEffect, useCallback } from 'react';
import { bookingView } from '../../../utils/bookingView';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Star,
  ChevronRight,
  Plus,
  Stethoscope,
  Building2,
  Home,
  Truck,
  Pill,
  TestTube,
  Package,
  Activity,
  ArrowRight,
  AlertCircle,
  RotateCcw,
  MapPin,
  Clock
} from 'lucide-react';
import { SERVICE_TILES, serviceRoute } from '../../../config/serviceTypes';
import ServiceVisual from '../../components/illustrations/ServiceVisual';
import { getPatientProfileApi } from '../../../services/patientHelper';
import { getFavoritesApi, type PatientFavoriteItem } from '../../../services/patientHelper';
import { getDashboardApi, type DashboardBooking } from '../../../services/dashboardHelper';
import { getHealthProfileApi } from '../../../services/healthProfileHelper';
import { getMyUserId, getFamilyMembersApi, type PatientFamilyMember } from '../../../services/familyHelper';
import { formatDayDate, formatTime } from '../../../utils/dateFormat';

const ICON_MAP: Record<string, React.ElementType> = {
  Stethoscope, Building2, Home, Truck, Pill, TestTube, Package
};


export default function PatientDashboard() {
  const navigate = useNavigate();

  const [userName, setUserName] = useState<string>('');
  // Shown once, right after sign-up.
  const [welcome, setWelcome] = useState(() => {
    try { const w = sessionStorage.getItem('vizito_welcome') === '1'; sessionStorage.removeItem('vizito_welcome'); return w; } catch { return false; }
  });

  const [family, setFamily] = useState<PatientFamilyMember[]>([]);
  const [activeBookings, setActiveBookings] = useState<DashboardBooking[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<DashboardBooking[]>([]);
  const [favorites, setFavorites] = useState<PatientFavoriteItem[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      // Identity + dashboard bookings are the core; family + favorites are best-effort enrichments.
      const [profile, dashboard] = await Promise.all([
        getPatientProfileApi(),
        getDashboardApi(),
      ]);
      if (profile?.fullName) setUserName(profile.fullName);
      setActiveBookings(dashboard.active);
      setUpcomingBookings(dashboard.upcoming);

      // Family + favorites: failures here must not blank the whole dashboard, but must NOT fall back
      // to mock data — they simply render empty on error.
      try {
        const uid = profile?.userId ?? (await getMyUserId());
        if (uid != null) setFamily(await getFamilyMembersApi(uid));
      } catch { setFamily([]); }
      try {
        setFavorites(await getFavoritesApi());
      } catch { setFavorites([]); }
    } catch {
      setLoadError('Unable to load your dashboard. Please try again.');
      setActiveBookings([]);
      setUpcomingBookings([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Nudge until the patient has told us their blood group / allergies once.
  const [healthProfileEmpty, setHealthProfileEmpty] = useState(false);
  useEffect(() => {
    getHealthProfileApi().then((h) => setHealthProfileEmpty(h.is_empty)).catch(() => setHealthProfileEmpty(false));
  }, []);

  useEffect(() => {
    // Fast paint of the name from the session, then authoritative profile via loadAll().
    try {
      const stored = localStorage.getItem('vizito_user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u.fullName || u.full_name) setUserName(u.fullName || u.full_name);
      }
    } catch { /* ignore */ }
    loadAll();
  }, [loadAll]);

  const greetingName = userName || 'there';

  return (
    <div className="max-w-[1600px] mx-auto space-y-7 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 w-full">
      {welcome && (
        <div role="status" className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <span className="flex-1"><b>Welcome to Vizito{userName ? `, ${userName}` : ''}!</b> Your account is ready. Book a doctor, keep your prescriptions in one place and order medicines from nearby pharmacies.</span>
          <button onClick={() => setWelcome(false)} className="text-xs font-bold text-emerald-800 hover:underline shrink-0">Dismiss</button>
        </div>
      )}
      {/* A. Compact welcome: one primary action. Search lives in the header for every page. */}
      <section aria-label="Welcome" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-teal-800"><span className="h-2 w-2 rounded-full bg-orange-500" aria-hidden="true" />Your care dashboard</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-1">Hello, {greetingName}</h1>
          <p className="text-sm text-slate-500 mt-1">Book care for your family and keep visits, reports and prescriptions together.</p>
        </div>
        <div className="flex gap-2 shrink-0 w-full sm:w-auto">
          <button onClick={() => navigate('/my-records')} className="flex-1 sm:flex-none px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2">My records</button>
          <button onClick={() => navigate('/healthcare-services')} className="flex-1 sm:flex-none px-4 py-3 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-bold inline-flex items-center justify-center gap-1.5 shadow-sm transition-all duration-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"><Plus className="w-4 h-4" /> Book care</button>
        </div>
      </section>

      {/* Your next visit — the first thing a patient looks for */}
      {(() => {
        // The soonest visit by date and time (not the most recently booked), described fully.
        const views = [...activeBookings, ...upcomingBookings].map((b) => bookingView(b, userName)).filter((v) => v.at !== Infinity);
        const soon = views.filter((v) => v.at >= Date.now() - 2 * 3600000).sort((a, b) => a.at - b.at);
        const v = soon[0] || views.sort((a, b) => a.at - b.at)[0];
        if (isLoading) return <div className="h-28 rounded-2xl bg-white border border-slate-200 animate-pulse" aria-label="Loading your next visit" />;
        if (!v) return (
          <section aria-label="Your next visit" className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0"><Calendar className="w-6 h-6" /></div>
            <div className="flex-1"><p className="text-[10px] font-bold uppercase tracking-wider text-teal-700 mb-1">Your next visit</p><p className="font-bold text-slate-900 text-base">No upcoming visits</p><p className="text-sm text-slate-500 mt-1">When you book care, your visit details and directions will appear here.</p></div>
            <button onClick={() => navigate('/healthcare-services')} className="px-5 py-3 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-bold shrink-0">Find care</button>
          </section>
        );
        const today = v.date === new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
        return (
          <section aria-label="Your next visit" className="bg-gradient-to-r from-teal-50/80 via-white to-white rounded-3xl border border-teal-200 border-l-4 border-l-teal-600 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white border border-teal-100 text-teal-700 flex items-center justify-center shrink-0"><Calendar className="w-6 h-6" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black uppercase tracking-wider text-teal-700">Your next visit · {v.kindLabel}{today ? <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">Today</span> : null}</p>
              <p className="font-extrabold text-slate-900 text-base truncate">{v.title}{v.detail && v.kind !== 'LAB_TEST' ? <span className="font-semibold text-slate-500"> · {v.detail}</span> : null}</p>
              {v.business && <p className="text-xs font-semibold text-slate-600 truncate flex items-center gap-1"><Building2 className="w-3.5 h-3.5 text-slate-400" />{v.business}</p>}
              <p className="text-sm font-semibold text-slate-700 flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                <span className="inline-flex items-center gap-1"><Clock className="w-4 h-4 text-slate-400" />{formatDayDate(v.date)}{v.time ? `, ${formatTime(v.time)}` : ''}</span>
                {v.place && <span className="inline-flex items-center gap-1 min-w-0"><MapPin className="w-4 h-4 text-slate-400 shrink-0" /><span className="truncate">{v.place}</span></span>}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{[v.forWhom ? `For ${v.forWhom}` : null, v.status, v.ref ? `Ref ${v.ref}` : null].filter(Boolean).join(' · ')}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              {v.place && v.kind !== 'VIDEO_CONSULT' && !/home/i.test(v.place) && (
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${v.business || ''} ${v.place}`)}`} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50">Directions</a>
              )}
              <button onClick={() => navigate(v.href)} className="px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold">{v.kind === 'LAB_TEST' ? 'Open booking' : 'Manage'}</button>
            </div>
          </section>
        );
      })()}

      {healthProfileEmpty && (
        <section className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-3xl border border-teal-200 bg-teal-50/60 px-5 py-4 sm:px-6">
          <span className="w-11 h-11 rounded-2xl bg-white border border-orange-100 text-orange-700 flex items-center justify-center shrink-0"><Activity className="w-5 h-5" /></span>
          <div className="flex-1"><p className="text-sm font-bold text-slate-900">Help your care team know you</p><p className="text-sm text-slate-600 mt-0.5">Add your blood group, allergies and regular medicines to share with providers you visit.</p></div>
          <button onClick={() => navigate('/profile?section=health')} className="px-5 py-3 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-bold shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2">
            Add health details
          </button>
        </section>
      )}

      {/* Quick Healthcare Services Grid (static navigation config) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div><h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Stethoscope className="w-5 h-5 text-teal-700" /> Healthcare services</h2><p className="text-sm text-slate-500 mt-1">Choose the type of care you need.</p></div>
          <button onClick={() => navigate('/healthcare-services')} className="text-sm font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1">
            View all <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {SERVICE_TILES.map((service) => {
            const IconComp = ICON_MAP[service.iconName] || Stethoscope;
            return (
              <div
                key={service.id}
                role="link"
                tabIndex={service.available ? 0 : -1}
                aria-label={`${service.name}${service.available ? '' : ' (coming soon)'}`}
                onClick={() => service.available && navigate(serviceRoute(service.id))}
                onKeyDown={(e) => { if (service.available && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); navigate(serviceRoute(service.id)); } }}
                aria-disabled={!service.available}
                className={`bg-white rounded-3xl border border-slate-200 overflow-hidden motion-safe:transition-all motion-safe:duration-200 group flex flex-col justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${service.available ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-teal-200' : 'cursor-default'}`}
              >
                <div className="relative">
                  <ServiceVisual id={service.id} muted={!service.available} className="h-28 sm:h-32 w-full" />
                  {!service.available && <span className="absolute top-2 right-2 text-[10px] font-extrabold uppercase tracking-wider bg-white/90 text-slate-600 border border-slate-200 rounded-full px-2 py-0.5">Coming soon</span>}
                </div>
                <div className="px-4 sm:px-5 pt-4 flex-1">
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-teal-700 transition-colors flex items-center gap-2"><IconComp className="w-4 h-4 text-teal-700 shrink-0" aria-hidden="true" />{service.name}</h3>
                  <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{service.shortDesc}</p>
                </div>
                <div className={`mx-4 sm:mx-5 mb-4 mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-sm font-semibold ${service.available ? 'text-teal-700' : 'text-slate-400'}`}>
                  <span>{service.available ? (service.id === 'pharmacy' ? 'Order Now' : service.id === 'equipment' ? 'Rent Now' : 'Book Now') : 'Coming soon'}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* D. Your information: frequently used destinations */}
      <section aria-label="Your health information" className="space-y-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Your health information</h2>
          <p className="text-sm text-slate-500 mt-1">Quick access to the details you use most.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { l: 'Medical records', d: 'Prescriptions and visit notes', to: '/my-records', icon: Activity },
          { l: 'Lab reports', d: 'Bookings and released reports', to: '/lab-bookings', icon: TestTube },
          { l: 'Medicine orders', d: 'Track pharmacy orders', to: '/pharmacy-orders', icon: Pill },
          { l: 'Family profiles', d: 'Book for parents and children', to: '/family-profiles', icon: Home },
        ].map((x) => (
          <button key={x.l} onClick={() => navigate(x.to)} className="text-left bg-white rounded-2xl border border-slate-200 p-4 hover:border-teal-300 hover:shadow-sm flex items-start gap-3">
            <span className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0"><x.icon className="w-4.5 h-4.5" /></span>
            <span className="min-w-0"><span className="block text-sm font-extrabold text-slate-900">{x.l}</span><span className="block text-xs text-slate-500">{x.d}</span></span>
          </button>
        ))}
        </div>
      </section>

      {/* Active Bookings (real) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-teal-600" /> Active Bookings
          </h2>
          <button onClick={() => navigate('/bookings')} className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1">
            View All <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-2xl border border-slate-200 py-10 text-center shadow-xs">
            <div className="w-6 h-6 border-[3px] border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-slate-500 text-sm font-medium">Loading bookings...</p>
          </div>
        ) : loadError ? (
          <div className="bg-white rounded-2xl border border-slate-200 py-10 text-center shadow-xs space-y-3">
            <AlertCircle className="w-9 h-9 text-rose-400 mx-auto" />
            <p className="text-rose-600 text-sm font-semibold">{loadError}</p>
            <button onClick={loadAll} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl">
              <RotateCcw className="w-4 h-4" /> Retry
            </button>
          </div>
        ) : activeBookings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeBookings.map((b) => { const v = bookingView(b, userName); return (
              <div key={b.id} role="button" aria-label={`${v.kindLabel}: ${v.title}`} onClick={() => navigate(v.href)} className="bg-white rounded-2xl border border-teal-200 p-5 shadow-xs hover:border-teal-400 cursor-pointer transition-all space-y-3">
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-100">{v.kindLabel}</span>
                    <h3 className="font-extrabold text-slate-900 text-sm mt-1 truncate">{v.title}</h3>
                    {v.business && <p className="text-[11px] font-semibold text-slate-600 truncate">{v.business}</p>}
                  </div>
                  <span className="shrink-0 text-[11px] font-extrabold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-xl">{v.status}</span>
                </div>
                <div className="space-y-1 text-xs font-semibold text-slate-600">
                  <p className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-400" />{formatDayDate(v.date)}{v.time ? ` · ${formatTime(v.time)}` : ''}</p>
                  {v.place && <p className="flex items-center gap-1.5 truncate"><MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />{v.place}</p>}
                  <p className="text-[11px] text-slate-400">{[v.forWhom ? `For ${v.forWhom}` : null, v.ref ? `Ref: ${v.ref}` : null].filter(Boolean).join(' · ')}</p>
                </div>
              </div>
            ); })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 py-10 text-center shadow-xs">
            <p className="text-slate-500 text-sm font-medium">No active bookings.</p>
          </div>
        )}
      </div>

      {/* Upcoming + Favorites */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-teal-600" /> Upcoming Bookings
            </h2>
            <button onClick={() => navigate('/bookings')} className="text-xs font-bold text-slate-500 hover:text-slate-700">Manage</button>
          </div>

          {isLoading ? (
            <div className="bg-white rounded-2xl border border-slate-200 py-8 text-center shadow-xs text-slate-500 text-sm">Loading...</div>
          ) : upcomingBookings.length > 0 ? (
            <div className="space-y-3">
              {upcomingBookings.map((up) => bookingView(up, userName)).sort((a, b) => a.at - b.at).slice(0, 5).map((v, i) => (
                <div key={`${v.ref}-${i}`} role="button" aria-label={`${v.kindLabel}: ${v.title}`} onClick={() => navigate(v.href)} className="bg-white rounded-2xl border border-slate-200 p-4 hover:border-slate-300 transition-all cursor-pointer flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-wider text-teal-700">{v.kindLabel}</p>
                      <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm truncate">{v.title}</h4>
                      <p className="text-xs text-slate-500 font-semibold truncate">{[v.business, v.place].filter(Boolean).join(' · ')}{v.forWhom ? ` · for ${v.forWhom}` : ''}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-extrabold text-slate-800 block">{formatDayDate(v.date)}</span>
                    <span className="text-[11px] text-teal-700 font-bold">{v.time ? formatTime(v.time) : ''}</span>
                    <span className="block text-[10px] text-slate-400 font-semibold">{v.status}</span>
                  </div>
                </div>
              ))}
              {upcomingBookings.length > 5 && <button onClick={() => navigate('/bookings')} className="text-xs font-bold text-teal-700 hover:underline">See all {upcomingBookings.length} upcoming bookings</button>}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 py-8 text-center shadow-xs text-slate-500 text-sm font-medium">
              No upcoming bookings.
            </div>
          )}
        </div>

        {/* Favorites (real) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" /> Favorite Providers
            </h3>
            {favorites.length > 0 && <span className="text-[10px] font-bold text-slate-400">{favorites.length} Saved</span>}
          </div>

          {favorites.length > 0 ? (
            <div className="space-y-3">
              {favorites.map((fav) => (
                <div key={fav.id} role="link" tabIndex={0} onClick={() => navigate(favoriteLink(fav))} onKeyDown={(e) => { if (e.key === 'Enter') navigate(favoriteLink(fav)); }} className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/80 transition-colors cursor-pointer flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-xs">{fav.name || 'Saved provider'}</h4>
                    {fav.partnerType && <p className="text-[11px] text-slate-500">{favoriteKind(fav.partnerType)}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-xs font-medium py-4 text-center">No favorites saved yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Where a saved provider opens, and what to call it.
const favType = (t?: string | null) => String(t || '').toLowerCase();
function favoriteKind(t?: string | null): string {
  const x = favType(t);
  return /diagnostic|laborator/.test(x) ? 'Laboratory' : /pharmac/.test(x) ? 'Pharmacy' : /homecare|home_care/.test(x) ? 'Home care' : /hospital|clinic/.test(x) ? 'Hospital' : /doctor/.test(x) ? 'Doctor' : 'Provider';
}
function favoriteLink(f: { partnerId?: string | null; partnerType?: string | null }): string {
  const id = encodeURIComponent(String(f.partnerId || '')); const k = favoriteKind(f.partnerType);
  return k === 'Laboratory' ? `/lab-tests?lab=${id}` : k === 'Pharmacy' ? `/pharmacy-orders/new?pharmacy=${id}` : k === 'Home care' ? `/home-care?agency=${id}`
    : k === 'Doctor' ? `/find-doctors?doctor=${id}`
    : `/booking?service=hospital&provider=${id}`;
}
