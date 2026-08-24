import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Star,
  LifeBuoy,
  X,
  HeartPulse,
  Bell,
  User,
  Settings,
  LogOut,
  Sparkles
} from 'lucide-react';
import { useLanguage } from '../../store/language/LanguageContext';
import logoImg from '../../assets/vizito_logo.png';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('vizito_user');
    localStorage.removeItem('vizito_token');
    if (onClose) onClose();
    navigate('/auth/login');
  };

  return (
    <div
      className={`
      fixed inset-y-0 left-0 z-50 w-64 bg-white flex flex-col border-r border-slate-200
      transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    `}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-5 shrink-0 border-b border-slate-100">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/dashboard')}>
          <img src={logoImg} alt="VIZITO Logo" className="h-9 w-auto object-contain" />
          <div>
            <span className="block text-base font-extrabold text-slate-900 leading-tight">vizito</span>
            <span className="block text-[9px] font-bold text-teal-600 tracking-wider leading-tight">Your Health. Connected.</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation list */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1" style={{ scrollbarWidth: 'none' }}>
        
        {/* 1. Dashboard */}
        <NavLink
          to="/dashboard"
          onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-xs font-bold ${
              isActive
                ? 'bg-teal-50 text-teal-700 shadow-xs ring-1 ring-teal-200'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`
          }
        >
          <LayoutDashboard className="w-4 h-4 shrink-0" />
          <span>{t('Dashboard')}</span>
        </NavLink>

        {/* 2. Healthcare Services */}
        <NavLink
          to="/healthcare-services"
          onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-xs font-bold ${
              isActive
                ? 'bg-teal-50 text-teal-700 shadow-xs ring-1 ring-teal-200'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`
          }
        >
          <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
          <span>{t('Healthcare Services')}</span>
        </NavLink>

        {/* 3. Bookings */}
        <NavLink
          to="/bookings"
          onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-xs font-bold ${
              isActive
                ? 'bg-teal-50 text-teal-700 shadow-xs ring-1 ring-teal-200'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`
          }
        >
          <Calendar className="w-4 h-4 shrink-0" />
          <span>{t('Bookings')}</span>
        </NavLink>

        {/* 4. Medical Records */}
        <NavLink
          to="/my-records"
          onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-xs font-bold ${
              isActive
                ? 'bg-teal-50 text-teal-700 shadow-xs ring-1 ring-teal-200'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`
          }
        >
          <HeartPulse className="w-4 h-4 shrink-0" />
          <span>{t('Medical Records')}</span>
        </NavLink>

        {/* 5. Ratings & Reviews */}
        <NavLink
          to="/reviews"
          onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-xs font-bold ${
              isActive
                ? 'bg-teal-50 text-teal-700 shadow-xs ring-1 ring-teal-200'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`
          }
        >
          <Star className="w-4 h-4 shrink-0" />
          <span>{t('Ratings & Reviews')}</span>
        </NavLink>

        {/* 6. Notifications */}
        <NavLink
          to="/notifications"
          onClick={onClose}
          className={({ isActive }) =>
            `flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all text-xs font-bold ${
              isActive
                ? 'bg-teal-50 text-teal-700 shadow-xs ring-1 ring-teal-200'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`
          }
        >
          <div className="flex items-center gap-3">
            <Bell className="w-4 h-4 shrink-0" />
            <span>{t('Notifications')}</span>
          </div>
        </NavLink>

        {/* Separator */}
        <div className="pt-3 mt-3 border-t border-slate-100 space-y-1">
          {/* Profile */}
          <NavLink
            to="/profile"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-xs font-bold ${
                isActive
                  ? 'bg-teal-50 text-teal-700 shadow-xs ring-1 ring-teal-200'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            <User className="w-4 h-4 shrink-0" />
            <span>{t('Profile & Account')}</span>
          </NavLink>

          {/* Settings */}
          <NavLink
            to="/settings"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-xs font-bold ${
                isActive
                  ? 'bg-teal-50 text-teal-700 shadow-xs ring-1 ring-teal-200'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            <Settings className="w-4 h-4 shrink-0" />
            <span>{t('Settings')}</span>
          </NavLink>

          {/* Help & Support */}
          <NavLink
            to="/help"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-xs font-bold ${
                isActive
                  ? 'bg-teal-50 text-teal-700 shadow-xs ring-1 ring-teal-200'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            <LifeBuoy className="w-4 h-4 shrink-0" />
            <span>{t('Help & Support')}</span>
          </NavLink>

          {/* Logout */}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-xs font-bold text-rose-600 hover:bg-rose-50 cursor-pointer mt-2"
          >
            <LogOut className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{t('Logout')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
