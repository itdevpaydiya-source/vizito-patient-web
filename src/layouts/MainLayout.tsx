import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from '../presentation/components/Sidebar';
import { Bell, Search, Menu, ChevronDown, User, Settings, LogOut } from 'lucide-react';
import { useRole } from '../store/role/RoleContext';
import { useLanguage } from '../store/language/LanguageContext';

const MainLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const { role } = useRole();
  const navigate = useNavigate();
  const { t } = useLanguage();

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

  const displayName = loggedInUserName || 'Ravi Teja';

  const getInitials = (name: string) => {
    if (!name) return 'VI';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + (parts[1][0] || '')).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

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
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 z-10 shrink-0">

          <div className="flex items-center gap-3 flex-1">
            {/* Hamburger - mobile only */}
            <button
              className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-xl lg:hidden transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Search Bar */}
            <div className="relative max-w-sm w-full hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={t("Search healthcare services, doctors, records...")}
                className="w-full pl-9 pr-14 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                <kbd className="text-[10px] font-semibold text-slate-400 bg-slate-100 border border-slate-200 rounded px-1 py-0.5">Ctrl + K</kbd>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <button 
              onClick={() => navigate('/notifications')}
              className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-full transition-colors cursor-pointer"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-white flex items-center justify-center shadow-sm">
                <span className="text-[8px] font-bold text-white leading-none">4</span>
              </span>
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
                    className="fixed inset-0 z-10 cursor-default" 
                    onClick={() => setIsProfileMenuOpen(false)} 
                  />
                  <div 
                    className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 z-20 animate-fade"
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
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-5 lg:p-6">
          <div className="mx-auto max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
