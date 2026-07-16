import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Calendar,
    Users,
    Wallet,
    Settings,
    FileText,
    Clock,
    Star,
    LifeBuoy,
    X,
    Search,
    Pill,
    HeartPulse,
    BedDouble,
    Ambulance,
    Building2,
    Package,
    ClipboardList,
    Microscope,
    TestTubes,
    FileCheck,
    HeartHandshake,
    UsersRound,
    CalendarClock,
    Siren,
    Contact,
    Bell,
    ShieldCheck,
    MessageCircle,
    CalendarCheck
} from 'lucide-react';
import { useRole } from '../../store/role/RoleContext';
import { useLanguage } from '../../store/language/LanguageContext';
import logoImg from '../../assets/vizito_logo.png';

const allNavItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['patient'] },
    { name: 'Find Doctors & Clinics', path: '/find-doctors', icon: Search, roles: ['patient'] },
    { name: 'My Consultations', path: '/my-consultations', icon: Calendar, roles: ['patient'] },
    { name: 'Records & Reports', path: '/my-records', icon: HeartPulse, roles: ['patient'] },
    { name: 'Pharmacy Orders', path: '/pharmacy-orders', icon: Pill, roles: ['patient'] },
    { name: 'Family Profiles', path: '/family-profiles', icon: Users, roles: ['patient'] },
    { name: 'Reviews & Ratings', path: '/reviews', icon: Star, roles: ['patient'] },
    { name: 'Notifications', path: '/notifications', icon: Bell, roles: ['patient'], badge: 8 },
];

interface SidebarEngineProps {
    isOpen?: boolean;
    onClose?: () => void;
}

const SidebarEngine: React.FC<SidebarEngineProps> = ({ isOpen = false, onClose }) => {
    const { role } = useRole();
    const { t } = useLanguage();
    const location = useLocation();
    const visibleNavItems = allNavItems.filter(item => item.roles.includes(role));
    const [isFooterVisible, setIsFooterVisible] = useState(true);

    const isReviewsPage = location.pathname.includes('/reviews');
    const isNotificationsPage = location.pathname.includes('/notifications');
    const isAvailabilityPage = location.pathname.includes('/availability');

    return (
        <div className={`
      fixed inset-y-0 left-0 z-50 w-60 bg-white flex flex-col border-r border-slate-200
      transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    `}>

            {/* Brand Header */}
            <div className="h-16 flex items-center justify-between px-5 shrink-0 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                    <img src={logoImg} alt="VIZITO Logo" className="h-9 w-auto object-contain" />
                    <div>
                        <span className="block text-base font-extrabold text-slate-900 leading-tight">vizito</span>
                        <span className="block text-[9px] font-medium text-slate-400 leading-tight">Your Health. Connected.</span>
                    </div>
                </div>
                {/* Close Button on Mobile */}
                <button
                    onClick={onClose}
                    className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5" style={{ scrollbarWidth: 'none' }}>
                {visibleNavItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <NavLink
                            key={item.name}
                            to={item.path}
                            onClick={onClose}
                            className={({ isActive }) =>
                                `flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 group ${isActive
                                    ? 'bg-[#F3E8FF] text-[#7C3AED] font-bold shadow-xs'
                                    : 'text-[#5F6368] hover:bg-[#FAF5FF] font-medium'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <div className="flex items-center gap-3">
                                        <Icon className={`w-[18px] h-[18px] shrink-0 ${isActive 
                                            ? 'text-[#7C3AED]' 
                                            : 'text-slate-400 group-hover:text-[#7C3AED]'} transition-colors`} />
                                        <span className="text-[13px]">{t(item.name)}</span>
                                    </div>
                                    {'badge' in item && item.badge && !isActive && (
                                        <span className="text-[10px] font-bold bg-[#E9D5FF] text-[#7C3AED] px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                            {item.badge}
                                        </span>
                                    )}
                                </>
                            )}
                        </NavLink>
                    );
                })}

                {/* Help & Support */}
                <div className="pt-2 mt-2 border-t border-slate-100 space-y-0.5">
                    <NavLink
                        to="/help"
                        onClick={onClose}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${isActive
                                ? 'bg-[#F3E8FF] text-[#7C3AED] font-bold shadow-xs'
                                : 'text-[#5F6368] hover:bg-[#FAF5FF] font-medium'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <LifeBuoy className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-[#7C3AED]' : 'text-slate-400 group-hover:text-[#7C3AED]'} transition-colors`} />
                                <span className="text-[13px]">{t('Help & Support')}</span>
                            </>
                        )}
                    </NavLink>
                </div>
            </div>

            {/* Dynamic Footer Card */}
            {isFooterVisible && (
                <div className="m-3 mt-0 shrink-0 hidden lg:block relative">
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center text-center relative group">
                        <button
                            onClick={() => setIsFooterVisible(false)}
                            className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors cursor-pointer"
                            title="Close"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                        {isReviewsPage ? (
                            <>
                                <div className="relative mb-3 flex items-center justify-center">
                                    <MessageCircle className="w-12 h-12 text-teal-600 stroke-[1.5]" />
                                    <div className="absolute inset-0 flex items-center justify-center -mt-1 gap-0.5">
                                        {[1, 2, 3].map(i => <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" key={i} />)}
                                    </div>
                                </div>
                                <h4 className="text-sm font-extrabold text-slate-800 mb-1">Build your reputation</h4>
                                <p className="text-[11px] text-slate-500 leading-relaxed mb-4">
                                    Respond to reviews and build<br />trust with your patients.
                                </p>
                                <button className="w-full bg-teal-700 hover:bg-teal-800 text-white text-[12px] font-bold py-2.5 px-3 rounded-xl transition-colors">
                                    Learn More
                                </button>
                            </>
                        ) : isNotificationsPage ? (
                            <>
                                <div className="mb-3 relative">
                                    <div className="w-12 h-12 bg-teal-50 rounded-full flex items-center justify-center">
                                        <Bell className="w-6 h-6 text-teal-500 fill-teal-500" />
                                    </div>
                                    {/* Sparkles */}
                                    <Star className="absolute top-0 right-0 w-3 h-3 text-amber-400 fill-amber-400" />
                                    <Star className="absolute bottom-2 left-0 w-2 h-2 text-amber-400 fill-amber-400" />
                                </div>
                                <h4 className="text-sm font-extrabold text-slate-800 mb-1">Stay Updated</h4>
                                <p className="text-[11px] text-slate-500 leading-relaxed mb-4">
                                    Enable push notifications<br />to never miss important<br />updates.
                                </p>
                                <button className="w-full bg-teal-700 hover:bg-teal-800 text-white text-[12px] font-bold py-2.5 px-3 rounded-xl transition-colors">
                                    Enable Notifications
                                </button>
                            </>
                        ) : isAvailabilityPage ? (
                            <>
                                <div className="mb-3">
                                    <div className="w-12 h-12 bg-teal-50 rounded-full flex items-center justify-center">
                                        <CalendarCheck className="w-6 h-6 text-teal-600" />
                                    </div>
                                </div>
                                <h4 className="text-sm font-extrabold text-slate-800 mb-1">Smart Scheduling</h4>
                                <p className="text-[11px] text-slate-500 leading-relaxed mb-4">
                                    Manage your availability and<br />reduce no-shows.
                                </p>
                                <button className="w-full bg-teal-700 hover:bg-teal-800 text-white text-[12px] font-bold py-2.5 px-3 rounded-xl transition-colors">
                                    Learn More
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="mb-3">
                                    <ShieldCheck className="w-10 h-10 text-teal-600" />
                                </div>
                                <h4 className="text-sm font-extrabold text-slate-800 mb-1">Your Account is Secure</h4>
                                <p className="text-[11px] text-slate-500 leading-relaxed mb-4">
                                    We keep your data safe<br />and protected.
                                </p>
                                <button className="w-full bg-teal-700 hover:bg-teal-800 text-white text-[12px] font-bold py-2.5 px-3 rounded-xl transition-colors">
                                    Learn More
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SidebarEngine;
