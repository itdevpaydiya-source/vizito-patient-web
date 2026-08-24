import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Calendar,
  Users,
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
  RotateCcw
} from 'lucide-react';
import { SERVICE_TILES } from '../../../config/serviceTypes';
import { getPatientProfileApi } from '../../../services/patientHelper';
import { getFavoritesApi, type PatientFavoriteItem } from '../../../services/patientHelper';
import { getDashboardApi, type DashboardBooking } from '../../../services/dashboardHelper';
import { getMyUserId, getFamilyMembersApi, type PatientFamilyMember } from '../../../services/familyHelper';

const ICON_MAP: Record<string, React.ElementType> = {
  Stethoscope, Building2, Home, Truck, Pill, TestTube, Package
};

// Maps a backend appointment_type to a human label. Only real values are handled; anything else
// falls back to a neutral "Appointment" rather than an invented service description.
function appointmentTypeLabel(t: string | null): string {
  switch (t) {
    case 'VIDEO_CALL': return 'Video Consultation';
    case 'IN_CLINIC': return 'In-Clinic Visit';
    case 'HOME_VISIT': return 'Home Visit';
    default: return 'Appointment';
  }
}

export default function PatientDashboard() {
  const navigate = useNavigate();

  const [userName, setUserName] = useState<string>('');
  const [selectedFamilyId, setSelectedFamilyId] = useState('self');
  const [searchTerm, setSearchTerm] = useState('');

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

  const handleUniversalSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/healthcare-services?q=${encodeURIComponent(searchTerm)}`);
    }
  };

  const greetingName = userName || 'there';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 w-full">
      {/* Top Banner & Greeting */}
      <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Hello, {greetingName} 👋</h1>
            <p className="text-teal-100/80 text-xs sm:text-sm font-medium">
              Manage your consultations, view records, and book care for your family.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => navigate('/booking')}
              className="px-5 py-3 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs shadow-lg transition-all active:scale-95 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Book New Service
            </button>
          </div>
        </div>

        <form onSubmit={handleUniversalSearchSubmit} className="mt-6 relative max-w-3xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search doctors, hospitals, home care, pharmacy, lab tests..."
            className="w-full pl-12 pr-28 py-3.5 bg-white text-slate-900 rounded-2xl font-semibold text-sm placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-teal-400/30 shadow-lg"
          />
          <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors">
            Search
          </button>
        </form>
      </div>

      {/* Family Member Profile Selector Bar (real family members) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-teal-600 shrink-0" />
          <div>
            <span className="font-extrabold text-slate-900 text-sm block">Healthcare For:</span>
            <span className="text-[11px] text-slate-500 font-medium">Switch patient profile for this session</span>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedFamilyId('self')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedFamilyId === 'self' ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Myself{userName ? ` (${userName})` : ''}
          </button>
          {family.map((member) => (
            <button
              key={member.associationId}
              onClick={() => setSelectedFamilyId(member.associationId)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedFamilyId === member.associationId ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {member.name} ({member.relationship})
            </button>
          ))}
          <button
            onClick={() => navigate('/family-profiles')}
            className="px-3 py-2 rounded-xl border border-dashed border-slate-300 text-slate-500 hover:bg-slate-50 font-bold text-xs shrink-0 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add Member
          </button>
        </div>
      </div>

      {/* Quick Healthcare Services Grid (static navigation config) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2"><span>🏥</span> Healthcare Services</h2>
          <button onClick={() => navigate('/healthcare-services')} className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1">
            Explore All <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SERVICE_TILES.map((service) => {
            const IconComp = ICON_MAP[service.iconName] || Stethoscope;
            return (
              <div
                key={service.id}
                onClick={() => navigate('/healthcare-services')}
                className="bg-white rounded-2xl border border-slate-200 p-5 cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center ${service.tileClass}`}>
                      <IconComp className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-sm group-hover:text-teal-700 transition-colors">{service.name}</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">{service.shortDesc}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-teal-600">
                  <span>Book Now</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

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
            {activeBookings.map((b) => (
              <div key={b.id} onClick={() => navigate('/bookings')} className="bg-white rounded-2xl border border-teal-200 p-5 shadow-xs hover:border-teal-400 cursor-pointer transition-all space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-100">
                      {appointmentTypeLabel(b.appointmentType)}
                    </span>
                    <h3 className="font-extrabold text-slate-900 text-sm mt-1">{b.location || 'Location to be confirmed'}</h3>
                  </div>
                  <span className="text-xs font-extrabold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-xl">{b.status}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span>{b.appointmentDate || b.bookingDate || '—'}{b.timeSlot ? ` • ${b.timeSlot}` : ''}</span>
                  {b.bookingNumber && <span className="text-slate-400">Ref: {b.bookingNumber}</span>}
                </div>
              </div>
            ))}
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
              {upcomingBookings.map((up) => (
                <div key={up.id} onClick={() => navigate('/bookings')} className="bg-white rounded-2xl border border-slate-200 p-4 hover:border-slate-300 transition-all cursor-pointer flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">{appointmentTypeLabel(up.appointmentType)}</h4>
                      <p className="text-xs text-slate-500 font-semibold">{up.location || 'Location to be confirmed'}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-extrabold text-slate-800 block">{up.appointmentDate || up.bookingDate || '—'}</span>
                    <span className="text-[11px] text-teal-700 font-bold">{up.timeSlot || ''}</span>
                  </div>
                </div>
              ))}
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
                <div key={fav.id} onClick={() => navigate('/healthcare-services')} className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/80 transition-colors cursor-pointer flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-xs">{fav.name || 'Saved provider'}</h4>
                    {fav.partnerType && <p className="text-[11px] text-slate-500 capitalize">{fav.partnerType}</p>}
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
