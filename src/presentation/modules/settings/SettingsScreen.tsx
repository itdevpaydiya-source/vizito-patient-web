import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  Bell,
  Globe,
  Lock,
  LogOut,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  KeyRound,
  Check,
  SlidersHorizontal,
  ArrowRight
} from 'lucide-react';
import { useLanguage, type Language } from '../../../store/language/LanguageContext';

export const SUPPORTED_LANGUAGES: { id: Language | string; label: string; native: string }[] = [
  { id: 'en', label: 'English', native: 'English' },
  { id: 'te', label: 'Telugu', native: 'తెలుగు' },
  { id: 'hi', label: 'Hindi', native: 'हिंदी' },
  { id: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { id: 'ta', label: 'Tamil', native: 'தமிழ்' }
];

export default function SettingsScreen() {
  const navigate = useNavigate();
  const { language, setLanguage } = useLanguage();

  // Search State
  const [searchTerm, setSearchTerm] = useState('');

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 1. Notification Preferences State
  const [notifications, setNotifications] = useState({
    appointments: true,
    orders: true,
    promotional: false
  });

  // 2. Language State
  const [selectedLanguage, setSelectedLanguage] = useState<string>('English');

  // 3. Security / Change Password State
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // 4. Logout Modal State
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  // Load stored settings on mount
  useEffect(() => {
    try {
      const storedNotifs = localStorage.getItem('vizito_patient_settings_notifs');
      if (storedNotifs) setNotifications(JSON.parse(storedNotifs));

      const storedLang = localStorage.getItem('vizito_patient_language');
      if (storedLang) setSelectedLanguage(storedLang);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Toggle Notification handler
  const handleToggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem('vizito_patient_settings_notifs', JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
      showToast('Notification preferences updated.');
      return updated;
    });
  };

  // Language Change handler
  const handleLanguageChange = (langLabel: string) => {
    setSelectedLanguage(langLabel);
    const matched = SUPPORTED_LANGUAGES.find((l) => l.label === langLabel);
    if (matched && (matched.id === 'en' || matched.id === 'hi' || matched.id === 'te')) {
      setLanguage(matched.id as Language);
    }
    try {
      localStorage.setItem('vizito_patient_language', langLabel);
    } catch (err) {
      console.error(err);
    }
    showToast('Language updated successfully.');
  };

  // Change Password Submit handler
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError('Current Password is required.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordError('New Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Password validation failed. New Password and Confirm Password must match.');
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordSection(false);
    showToast('Password updated successfully.');
  };

  // Logout handler
  const handleConfirmLogout = () => {
    localStorage.removeItem('vizito_user');
    localStorage.removeItem('vizito_token');
    setShowLogoutDialog(false);
    showToast('User Logged Out');
    setTimeout(() => {
      navigate('/auth/login');
    }, 500);
  };

  // Search filtering logic
  const searchLower = searchTerm.toLowerCase();
  const showNotifSection = !searchTerm || 'notification appointments orders promotional offers'.includes(searchLower);
  const showLangSection = !searchTerm || 'language english telugu hindi kannada tamil'.includes(searchLower);
  const showSecuritySection = !searchTerm || 'security password change password credentials'.includes(searchLower);
  const showLogoutSection = !searchTerm || 'logout sign out exit account'.includes(searchLower);

  const hasAnyMatch = showNotifSection || showLangSection || showSecuritySection || showLogoutSection;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 max-w-4xl mx-auto">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-top-3 max-w-md">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold leading-relaxed">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-teal-600" /> Settings
        </h1>
        <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
          Customize notification alerts, language preferences, account security, and session options from one centralized page.
        </p>
      </div>

      {/* Search Bar (Optional for Web Settings) */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search settings (e.g. Notifications, Language, Password, Logout)..."
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 shadow-xs"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {hasAnyMatch ? (
        <div className="space-y-6">
          {/* SECTION 1: Notification Preferences */}
          {showNotifSection && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5 shadow-xs">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-teal-600" /> Notification Preferences
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Configure alert preferences. Changes apply to future notifications.
                  </p>
                </div>
              </div>

              <div className="space-y-4 text-xs font-extrabold">
                {/* Appointment Notifications */}
                <div className="p-4 rounded-2xl border border-slate-200 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <div>
                    <span className="text-slate-800 block text-sm font-extrabold">Appointment Notifications</span>
                    <span className="text-slate-400 font-normal">
                      Receive alerts for booking confirmations, appointment reminders, and cancellations.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleNotification('appointments')}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                      notifications.appointments ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {notifications.appointments ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* Order Notifications */}
                <div className="p-4 rounded-2xl border border-slate-200 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <div>
                    <span className="text-slate-800 block text-sm font-extrabold">Order & Dispatch Notifications</span>
                    <span className="text-slate-400 font-normal">
                      Receive live updates for Pharmacy, Home Care, Ambulance, Lab, and Equipment rentals.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleNotification('orders')}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                      notifications.orders ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {notifications.orders ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* Promotional Notifications */}
                <div className="p-4 rounded-2xl border border-slate-200 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <div>
                    <span className="text-slate-800 block text-sm font-extrabold">Promotional Notifications</span>
                    <span className="text-slate-400 font-normal">
                      Receive special offers, discount coupons, and wellness checkup campaign updates.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleNotification('promotional')}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                      notifications.promotional ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {notifications.promotional ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: Language Preference */}
          {showLangSection && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-teal-600" /> Language Preference
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Select your preferred language for the application interface.
                </p>
              </div>

              <div className="max-w-md space-y-3 text-xs font-bold">
                <label className="block text-slate-700">Supported Application Languages</label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-800 focus:outline-none focus:border-teal-500"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.id} value={lang.label}>
                      {lang.label} ({lang.native})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* SECTION 3: Account Security */}
          {showSecuritySection && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5 shadow-xs">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-teal-600" /> Account Security
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Update your password and security credentials. Available for password-based accounts.
                  </p>
                </div>

                {!showPasswordSection && (
                  <button
                    onClick={() => setShowPasswordSection(true)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center gap-1.5"
                  >
                    Change Password &gt;
                  </button>
                )}
              </div>

              {showPasswordSection && (
                <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs max-w-md animate-in fade-in">
                  {passwordError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs font-bold text-rose-700">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{passwordError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block font-extrabold text-slate-700 uppercase tracking-wider mb-1">Current Password</label>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full p-3 rounded-xl font-bold text-sm text-slate-800 border border-slate-200 bg-slate-50 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block font-extrabold text-slate-700 uppercase tracking-wider mb-1">New Password</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min 6 characters)"
                      className="w-full p-3 rounded-xl font-bold text-sm text-slate-800 border border-slate-200 bg-slate-50 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block font-extrabold text-slate-700 uppercase tracking-wider mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full p-3 rounded-xl font-bold text-sm text-slate-800 border border-slate-200 bg-slate-50 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPasswordSection(false);
                        setPasswordError(null);
                      }}
                      className="px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-xs text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all"
                    >
                      Update Password
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* SECTION 4: Logout */}
          {showLogoutSection && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                  <LogOut className="w-5 h-5 text-rose-600" /> Logout
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Sign out of your active health session on this device.
                </p>
              </div>

              <div className="max-w-md">
                <button
                  type="button"
                  onClick={() => setShowLogoutDialog(true)}
                  className="w-full p-3.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-black text-xs border border-rose-200 transition-colors flex items-center justify-center gap-2 shadow-xs"
                >
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Empty Fallback State when search yields no results */
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-slate-800 text-sm">Unable to find matching settings.</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try searching for "Notifications", "Language", "Password", or "Logout".
          </p>
          <button
            onClick={() => setSearchTerm('')}
            className="mt-2 inline-flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-md"
          >
            Clear Search
          </button>
        </div>
      )}

      {/* Logout Confirmation Dialog */}
      {showLogoutDialog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base text-rose-600 flex items-center gap-2">
                <LogOut className="w-5 h-5 text-rose-600" /> Logout?
              </h3>
              <button onClick={() => setShowLogoutDialog(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-slate-600 font-semibold">
              Are you sure you want to logout? You will need to sign in again to access your health bookings and records.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutDialog(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
