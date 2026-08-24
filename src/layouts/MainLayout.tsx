import { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../presentation/components/Sidebar';
import {
  Bell, Search, Menu, ChevronDown, User, Settings, LogOut, ArrowLeft, Home,
  X, Loader2, Stethoscope, Building2, ChevronRight, ArrowRight
} from 'lucide-react';
import { useRole } from '../store/role/RoleContext';
import { useLanguage } from '../store/language/LanguageContext';
import { useNotifications } from '../store/notifications/NotificationsContext';
import { getProvidersApi } from '../services/patientHelper';
import { SERVICE_TILES } from '../config/serviceTypes';
import type { ProviderItem } from '../services/types';

const MainLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const { role } = useRole();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { unreadCount } = useNotifications();
  const isDashboard = location.pathname === '/dashboard' || location.pathname === '/';

  // Global Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProviderItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const userString = localStorage.getItem('vizito_user');
  let loggedInUserName = '';
  if (userString) {
    try {
      const user = JSON.parse(userString);
      loggedInUserName = user?.fullName || user?.full_name || '';
    } catch (e) {
      console.error(e);
    }
  }

  // Neutral fallback only — never a fabricated person's name. The real name comes from the session
  // (set at login and refreshed from /patients/me by the dashboard/profile screens).
  const displayName = loggedInUserName || 'Patient';

  const getInitials = (name: string) => {
    if (!name) return 'VI';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + (parts[1][0] || '')).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Live search debounced query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const list = await getProvidersApi(undefined, searchQuery.trim());
        setSearchResults(list);
      } catch (err) {
        console.error('Search failed:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close search dropdown on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSearchOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (searchQuery.trim()) {
      setIsSearchOpen(false);
      navigate(`/healthcare-services?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const matchingServices = searchQuery.trim()
    ? SERVICE_TILES.filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.shortDesc.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const doctorResults = searchResults.filter(
    (p) => p.serviceId === 'doctor' || (p.specialtyOrType || '').toLowerCase().includes('physician') || (p.specialtyOrType || '').toLowerCase().includes('doctor') || (p.subtitle || '').toLowerCase().includes('speciali') || !(p.subtitle || '').toLowerCase().includes('hospital')
  );
  const hospitalResults = searchResults.filter(
    (p) => p.serviceId === 'hospital' || (p.specialtyOrType || '').toLowerCase().includes('hospital') || (p.specialtyOrType || '').toLowerCase().includes('clinic') || (p.subtitle || '').toLowerCase().includes('hospital') || (p.subtitle || '').toLowerCase().includes('clinic')
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative" style={{ fontFamily: "var(--font-sans)" }}>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 relative z-30 shrink-0">

          <div className="flex items-center gap-3 flex-1">
            {/* Hamburger - mobile only */}
            <button
              className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-xl lg:hidden transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Back */}
            {!isDashboard && (
              <button
                onClick={() => {
                  if (window.history.state && window.history.state.idx > 0) navigate(-1);
                  else navigate('/dashboard');
                }}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                aria-label="Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}

            {/* Home */}
            {!isDashboard && (
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                aria-label="Home"
              >
                <Home className="w-5 h-5" />
              </button>
            )}

            {/* Search Bar */}
            <div ref={searchContainerRef} className="relative max-w-md w-full hidden md:block">
              <form onSubmit={handleSearchSubmit} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                  placeholder={t("Search healthcare services, doctors, hospitals...")}
                  className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-2xs"
                />
                {isSearching ? (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-600 animate-spin" />
                ) : searchQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-md"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : null}
              </form>

              {/* Search Live Results Dropdown */}
              {isSearchOpen && searchQuery.trim().length > 0 && (
                <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150 max-h-[460px] overflow-y-auto">
                  {isSearching && searchResults.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-teal-600" /> Searching healthcare database...
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {/* Services matches */}
                      {matchingServices.length > 0 && (
                        <div className="p-2">
                          <p className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">Services</p>
                          {matchingServices.map((svc) => (
                            <button
                              key={svc.id}
                              onClick={() => {
                                setIsSearchOpen(false);
                                navigate(`/booking?service=${svc.id}`);
                              }}
                              className="w-full text-left px-3 py-2 rounded-xl hover:bg-teal-50/60 flex items-center justify-between group transition-colors"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="text-lg">{svc.emoji}</span>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-800 group-hover:text-teal-700 truncate">{svc.name}</p>
                                  <p className="text-[10px] text-slate-400 truncate">{svc.shortDesc}</p>
                                </div>
                              </div>
                              <span className="text-[10px] font-bold text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity">Book &rarr;</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Providers (Doctors & Hospitals) */}
                      {searchResults.length > 0 ? (
                        <div className="p-2">
                          <p className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Doctors & Healthcare Providers ({searchResults.length})
                          </p>
                          {searchResults.map((p) => {
                            const isDoctor = p.serviceId === 'doctor' || (p.specialtyOrType || '').toLowerCase().includes('physician') || (p.specialtyOrType || '').toLowerCase().includes('doctor') || !(p.specialtyOrType || '').toLowerCase().includes('hospital');
                            return (
                              <button
                                key={p.id}
                                onClick={() => {
                                  setIsSearchOpen(false);
                                  navigate(`/booking?service=${isDoctor ? 'doctor' : 'hospital'}`);
                                }}
                                className="w-full text-left px-3 py-2 rounded-xl hover:bg-teal-50/60 flex items-center justify-between group transition-colors"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-100 font-black text-xs">
                                    {isDoctor ? <Stethoscope className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-800 group-hover:text-teal-700 truncate">{p.name}</p>
                                    <p className="text-[10px] text-slate-400 capitalize truncate">
                                      {p.specialtyOrType || (isDoctor ? 'Doctor' : 'Hospital')}
                                    </p>
                                  </div>
                                </div>
                                <span className="text-[10px] font-bold text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                  Book Slot &rarr;
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      ) : null}

                      {/* No Results at all */}
                      {matchingServices.length === 0 && searchResults.length === 0 && !isSearching && (
                        <div className="p-6 text-center">
                          <p className="text-xs font-bold text-slate-700">No matching providers or services</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Try searching with a doctor name, hospital, or specialty.</p>
                        </div>
                      )}

                      {/* View All Footer */}
                      <div className="p-2 bg-slate-50/80">
                        <button
                          onClick={() => handleSearchSubmit()}
                          className="w-full py-2 text-center text-xs font-bold text-teal-700 hover:text-teal-800 hover:bg-white rounded-xl transition-all flex items-center justify-center gap-1.5 border border-transparent hover:border-slate-200"
                        >
                          <span>View all results for &ldquo;{searchQuery}&rdquo;</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Bell — badge is the real unread count from the backend feed. */}
            <button
              onClick={() => navigate('/notifications')}
              className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-full transition-colors cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-rose-500 rounded-full border-2 border-white flex items-center justify-center shadow-sm">
                  <span className="text-[9px] font-extrabold text-white leading-none">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                </span>
              )}
            </button>

            <div className="w-px h-6 bg-slate-200" />

            {/* Patient Profile Dropdown Trigger */}
            <div className="relative">
              <div
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-2.5 cursor-pointer group hover:bg-slate-50 p-1.5 rounded-xl transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden shrink-0 ring-2 ring-white shadow-sm">
                  <div className="w-full h-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {getInitials(displayName)}
                    </span>
                  </div>
                </div>
                <div className="hidden sm:block text-right select-none">
                  <p className="text-sm font-bold text-slate-800 leading-none">
                    {displayName}
                  </p>
                  <p className="text-[10px] text-teal-600 leading-none mt-1 font-bold">
                    Patient Profile
                  </p>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
              </div>

              {isProfileMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30 cursor-default"
                    onClick={() => setIsProfileMenuOpen(false)}
                  />
                  <div
                    className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 z-40 animate-fade"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => { setIsProfileMenuOpen(false); navigate('/profile'); }}
                      className="w-full text-left px-4.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <User className="w-4 h-4 text-slate-400" /> Profile & Account
                    </button>

                    <button
                      onClick={() => { setIsProfileMenuOpen(false); navigate('/settings'); }}
                      className="w-full text-left px-4.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Settings className="w-4 h-4 text-slate-400" /> {t("Settings")}
                    </button>

                    <div className="border-t border-slate-100 my-1" />

                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        localStorage.removeItem('vizito_user');
                        localStorage.removeItem('vizito_token');
                        navigate('/auth/login');
                      }}
                      className="w-full text-left px-4.5 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" /> {t("Sign Out")}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-5 md:p-6 lg:p-8 xl:p-10">
          <div className="w-full min-w-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
