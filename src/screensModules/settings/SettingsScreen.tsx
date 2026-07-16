import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon, User, Lock, Bell, Globe,
  LogOut, ShieldCheck, Check, Eye, ChevronDown, CheckCircle2,
  Calendar, MessageSquare, FileText, CreditCard, Star, AlertCircle, AlertTriangle, Laptop, Smartphone, Monitor, MapPin, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage, type Language } from '../../store/language/LanguageContext';

// ─── Constants & Types ────────────────────────────────────────────────────────
const TABS = [
  { id: 'general', label: 'General', icon: SettingsIcon },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Password & Security', icon: Lock },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'language', label: 'Language', icon: Globe },
];

const LANGUAGES: { id: Language; label: string; native?: string }[] = [
  { id: 'en', label: 'English', native: 'English' },
  { id: 'hi', label: 'Hindi', native: 'हिंदी' },
  { id: 'te', label: 'Telugu', native: 'తెలుగు' },
  { id: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { id: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { id: 'mr', label: 'Marathi', native: 'मराठी' },
  { id: 'bn', label: 'Bengali', native: 'বাংলা' },
  { id: 'gu', label: 'Gujarati', native: 'ગુજરાતી' },
];

interface SessionItem {
  id: string;
  deviceName: string;
  platform: 'Windows' | 'macOS' | 'iOS' | 'Android';
  browser: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

// Reusable Switch Toggle Component
const Toggle = ({ enabled, onChange, disabled = false }: { enabled: boolean; onChange: () => void; disabled?: boolean }) => (
  <button
    type="button"
    onClick={onChange}
    disabled={disabled}
    className={`w-11 h-6 rounded-full flex items-center transition-colors px-0.5 cursor-pointer ${enabled ? 'bg-purple-700' : 'bg-slate-350'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
  </button>
);

// Reusable Checkbox Component
const Checkbox = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <button
    type="button"
    onClick={onChange}
    className={`w-5 h-5 rounded flex items-center justify-center border transition-colors cursor-pointer ${checked ? 'bg-purple-700 border-purple-700' : 'bg-white border-slate-300 hover:border-purple-500'}`}
  >
    {checked && <Check className="w-3.5 h-3.5 text-white" />}
  </button>
);

export default function SettingsScreen() {
  const navigate = useNavigate();
  const { language, setLanguage } = useLanguage();

  const [activeTab, setActiveTab] = useState('general');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ─── 1. GENERAL SETTINGS STATE ──────────────────────────────────────────────
  const [startOfWeek, setStartOfWeek] = useState<'Monday' | 'Sunday'>('Monday');
  const [draftStartOfWeek, setDraftStartOfWeek] = useState<'Monday' | 'Sunday'>('Monday');
  
  const [generalToggles, setGeneralToggles] = useState({
    appointments: true,
    messages: true,
    payments: true,
    system: true,
  });
  const [draftGenToggles, setDraftGenToggles] = useState({ ...generalToggles });
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  useEffect(() => {
    const savedWeek = localStorage.getItem('vizito_start_of_week') as 'Monday' | 'Sunday' | null;
    if (savedWeek) {
      setStartOfWeek(savedWeek);
      setDraftStartOfWeek(savedWeek);
    }
  }, []);

  const handleSaveGeneral = () => {
    setStartOfWeek(draftStartOfWeek);
    setGeneralToggles(draftGenToggles);
    localStorage.setItem('vizito_start_of_week', draftStartOfWeek);
    showToast('General configuration preferences saved successfully!', 'success');
  };

  const handleCancelGeneral = () => {
    setDraftStartOfWeek(startOfWeek);
    setDraftGenToggles({ ...generalToggles });
    showToast('General updates discarded.', 'info');
  };

  const handleConfirmLogout = () => {
    setIsLogoutModalOpen(false);
    // Clear user tokens or state
    localStorage.removeItem('vizito_user');
    navigate('/auth/login');
  };

  // ─── 2. PROFILE SETTINGS STATE ──────────────────────────────────────────────
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    fullName: 'Dr. Arjun Reddy',
    email: 'dr.arjun@vizito.com',
    phone: '9876543210',
    dob: '1988-05-15',
    gender: 'Male',
    specialization: 'Cardiologist',
    qualification: 'MBBS, MD, DM (Cardiology)',
    experience: '12',
    registrationNumber: 'REG-992834-MED',
    consultationTypes: ['In-Clinic', 'Video Consultation'],
    clinic: 'Apollo Hospital',
    aboutMe: 'Senior cardiologist with over 12 years of clinical experience in interventional cardiology and vascular management.'
  });
  const [draftProfile, setDraftProfile] = useState({ ...profileData });

  const handleSaveProfile = () => {
    // Validations
    if (draftProfile.fullName.trim().length < 3) {
      showToast('Validation Error: Full Name must be at least 3 characters.', 'error');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(draftProfile.email.trim())) {
      showToast('Validation Error: Please enter a valid email address.', 'error');
      return;
    }
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(draftProfile.phone.trim())) {
      showToast('Validation Error: Contact Number must be exactly 10 digits.', 'error');
      return;
    }
    if (!draftProfile.dob) {
      showToast('Validation Error: Date of Birth is mandatory.', 'error');
      return;
    }
    const dobDate = new Date(draftProfile.dob);
    if (dobDate.getTime() > Date.now()) {
      showToast('Validation Error: Date of Birth cannot be in the future.', 'error');
      return;
    }
    if (!draftProfile.gender) {
      showToast('Validation Error: Gender selection is required.', 'error');
      return;
    }
    if (!draftProfile.specialization.trim()) {
      showToast('Validation Error: Specialization is required.', 'error');
      return;
    }
    if (!draftProfile.qualification.trim()) {
      showToast('Validation Error: Qualification is required.', 'error');
      return;
    }
    const expNum = parseFloat(draftProfile.experience);
    if (isNaN(expNum) || expNum < 0) {
      showToast('Validation Error: Experience must be a valid numeric figure.', 'error');
      return;
    }
    if (draftProfile.consultationTypes.length === 0) {
      showToast('Validation Error: Select at least one Consultation Type.', 'error');
      return;
    }
    if (draftProfile.aboutMe.length > 250) {
      showToast('Validation Error: About Me statement must not exceed 250 characters.', 'error');
      return;
    }

    setProfileData(draftProfile);
    setIsEditingProfile(false);
    showToast('Professional profile updated successfully!', 'success');
  };

  const handleCancelProfile = () => {
    setDraftProfile({ ...profileData });
    setIsEditingProfile(false);
    showToast('Profile edits discarded.', 'info');
  };

  const toggleConsultationType = (type: string) => {
    let current = [...draftProfile.consultationTypes];
    if (current.includes(type)) {
      current = current.filter(t => t !== type);
    } else {
      current.push(type);
    }
    setDraftProfile({ ...draftProfile, consultationTypes: current });
  };

  // ─── 3. PASSWORD & SECURITY STATE ───────────────────────────────────────────
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [twoFaEnabled, setTwoFaEnabled] = useState(true);

  // Active Sessions
  const [sessions, setSessions] = useState<SessionItem[]>([
    { id: 'SES-01', deviceName: 'Windows Laptop', platform: 'Windows', browser: 'Chrome', location: 'Hyderabad', lastActive: 'Active Now', isCurrent: true },
    { id: 'SES-02', deviceName: 'iPhone 15 Pro', platform: 'iOS', browser: 'Safari', location: 'Hyderabad', lastActive: '2 hours ago', isCurrent: false },
    { id: 'SES-03', deviceName: 'Office Desktop', platform: 'Windows', browser: 'Edge', location: 'Banjara Hills', lastActive: '1 day ago', isCurrent: false }
  ]);

  const handleUpdatePassword = () => {
    // Validations
    if (!currentPwd || !newPwd || !confirmPwd) {
      showToast('Validation Error: All password fields are required.', 'error');
      return;
    }
    if (currentPwd !== 'Doctor@123') { // Mock check
      showToast('Validation Error: Current Password does not match our records.', 'error');
      return;
    }
    if (newPwd === currentPwd) {
      showToast('Validation Error: New Password cannot be the same as Current Password.', 'error');
      return;
    }
    if (newPwd !== confirmPwd) {
      showToast('Validation Error: Confirm Password must match New Password.', 'error');
      return;
    }
    // Password Strength Check
    const minChar = newPwd.length >= 8;
    const hasUpper = /[A-Z]/.test(newPwd);
    const hasLower = /[a-z]/.test(newPwd);
    const hasDigit = /[0-9]/.test(newPwd);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPwd);

    if (!minChar || !hasUpper || !hasLower || !hasDigit || !hasSpecial) {
      showToast('Validation Error: Password policy requirements are not met.', 'error');
      return;
    }

    setCurrentPwd('');
    setNewPwd('');
    setConfirmPwd('');
    showToast('Security password updated successfully!', 'success');
  };

  const handleSignOutSession = (id: string) => {
    const target = sessions.find(s => s.id === id);
    if (target?.isCurrent) {
      showToast('Error: Cannot sign out of current device session.', 'error');
      return;
    }
    setSessions(sessions.filter(s => s.id !== id));
    showToast('Device session signed out successfully.', 'success');
  };

  const handleSignOutOtherSessions = () => {
    setSessions(sessions.filter(s => s.isCurrent));
    showToast('All other active sessions have been signed out.', 'success');
  };

  // ─── 4. NOTIFICATION SETTINGS STATE ──────────────────────────────────────────
  const [notifMatrix, setNotifMatrix] = useState<Record<string, { inApp: boolean, email: boolean, sms: boolean }>>({
    reminders: { inApp: true, email: true, sms: false },
    messages: { inApp: true, email: true, sms: false },
    prescriptions: { inApp: true, email: false, sms: false },
    payments: { inApp: true, email: true, sms: false },
    reviews: { inApp: true, email: true, sms: false },
    system: { inApp: true, email: true, sms: false },
    alerts: { inApp: true, email: true, sms: true }, // Account Alerts row
  });

  const [quietHours, setQuietHours] = useState(false);
  const [quietFrom, setQuietFrom] = useState('22:00');
  const [quietTo, setQuietTo] = useState('07:00');

  const toggleMatrix = (row: string, col: 'inApp' | 'email' | 'sms') => {
    // Rule: At least one channel must remain active for Account Alerts
    if (row === 'alerts') {
      const current = notifMatrix.alerts;
      const nextVal = !current[col];
      // If turning off makes count 0
      const activeChannels = [
        col === 'inApp' ? nextVal : current.inApp,
        col === 'email' ? nextVal : current.email,
        col === 'sms' ? nextVal : current.sms
      ].filter(Boolean).length;

      if (activeChannels === 0) {
        showToast('Validation Error: At least one channel must remain active for Account Alerts.', 'error');
        return;
      }
    }

    setNotifMatrix(prev => ({
      ...prev,
      [row]: { ...prev[row], [col]: !prev[row][col] }
    }));
    showToast('Preferences updated automatically.', 'success');
  };

  const handleQuietHoursToggle = (enabled: boolean) => {
    if (enabled) {
      // Validate From < To
      const fromHour = parseInt(quietFrom.split(':')[0]);
      const toHour = parseInt(quietTo.split(':')[0]);
      if (fromHour >= toHour) {
        showToast('Validation Warning: From Time must be earlier than To Time.', 'error');
        return;
      }
    }
    setQuietHours(enabled);
    showToast('Quiet hours configured successfully.', 'success');
  };

  const handleQuietFromChange = (val: string) => {
    setQuietFrom(val);
    const fromHour = parseInt(val.split(':')[0]);
    const toHour = parseInt(quietTo.split(':')[0]);
    if (fromHour >= toHour) {
      showToast('Validation Warning: From Time must be earlier than To Time.', 'error');
    }
  };

  const handleQuietToChange = (val: string) => {
    setQuietTo(val);
    const fromHour = parseInt(quietFrom.split(':')[0]);
    const toHour = parseInt(val.split(':')[0]);
    if (fromHour >= toHour) {
      showToast('Validation Warning: From Time must be earlier than To Time.', 'error');
    }
  };

  // ─── 5. LANGUAGE SETTINGS STATE ──────────────────────────────────────────────
  const [selectedLang, setSelectedLang] = useState<Language>(language);

  const handleSaveLanguage = () => {
    setLanguage(selectedLang);
    const selectedName = LANGUAGES.find(l => l.id === selectedLang)?.label || selectedLang;
    showToast(`Display language switched to "${selectedName}" successfully!`, 'success');
  };

  const handleCancelLanguage = () => {
    setSelectedLang(language);
    showToast('Language choice reverted.', 'info');
  };

  return (
    <div className="animate-fade relative min-h-0 flex flex-col gap-0">
      
      {/* Toast popup */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-fade flex items-center gap-3 bg-slate-900 border border-slate-800 text-white px-5 py-3.5 rounded-2xl shadow-xl max-w-sm">
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${toast.type === 'error' ? 'bg-rose-500' : 'bg-teal-400'}`} />
          <p className="text-xs font-bold leading-normal">{toast.message}</p>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#2B2B2B] tracking-tight">Configuration Settings</h1>
        <p className="text-xs font-semibold text-slate-500 mt-1">Manage Start of Week, update verification credentials, configure password policies, and mute alert channels</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left menu column */}
        <div className="w-full lg:w-64 shrink-0 space-y-1.5">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black transition-all cursor-pointer ${isActive
                    ? 'bg-[#FAF5FF] text-[#5C2494] border border-[#5C2494]/15 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50'
                  }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#5C2494]' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Right content column */}
        <div className="flex-1 w-full min-w-0">

          {/* ─── GENERAL PREFERENCES ────────────────────────────────────────── */}
          {activeTab === 'general' && (
            <div className="space-y-6 animate-fade">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">General Application Preferences</h3>
                    <p className="text-xs text-slate-450 mt-0.5 font-bold">Configure weekly timelines and badge indicators</p>
                  </div>
                  
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={handleCancelGeneral}
                      className="px-4 py-2 border border-slate-200 text-slate-655 text-xs font-bold rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveGeneral}
                      className="bg-[#5C2494] text-white px-4 py-2 rounded-xl text-xs font-black shadow-sm"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Start of Week *</label>
                    <div className="relative max-w-xs">
                      <select
                        value={draftStartOfWeek}
                        onChange={e => setDraftStartOfWeek(e.target.value as any)}
                        className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                      >
                        <option value="Monday">Monday</option>
                        <option value="Sunday">Sunday</option>
                        <option value="Tuesday">Tuesday</option>
                        <option value="Wednesday">Wednesday</option>
                        <option value="Thursday">Thursday</option>
                        <option value="Friday">Friday</option>
                        <option value="Saturday">Saturday</option>
                      </select>
                      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Quick Toggles */}
                  <div className="pt-6 border-t border-slate-100 space-y-4">
                    <h4 className="text-xs font-bold text-slate-800">Direct Notifications Badges</h4>
                    <div className="divide-y divide-slate-100">
                      <div className="flex items-center justify-between py-3">
                        <div>
                          <span className="text-xs font-bold text-slate-700">Appointment Reminders</span>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">Toggle screen highlights on bookings</p>
                        </div>
                        <Toggle enabled={draftGenToggles.appointments} onChange={() => setDraftGenToggles({ ...draftGenToggles, appointments: !draftGenToggles.appointments })} />
                      </div>
                      <div className="flex items-center justify-between py-3">
                        <div>
                          <span className="text-xs font-bold text-slate-700">Patient Messages</span>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">Alert popup toggling on chats updates</p>
                        </div>
                        <Toggle enabled={draftGenToggles.messages} onChange={() => setDraftGenToggles({ ...draftGenToggles, messages: !draftGenToggles.messages })} />
                      </div>
                      <div className="flex items-center justify-between py-3">
                        <div>
                          <span className="text-xs font-bold text-slate-700">Payments &amp; Settlements</span>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">Toggles alerts for payout completions</p>
                        </div>
                        <Toggle enabled={draftGenToggles.payments} onChange={() => setDraftGenToggles({ ...draftGenToggles, payments: !draftGenToggles.payments })} />
                      </div>
                      <div className="flex items-center justify-between py-3">
                        <div>
                          <span className="text-xs font-bold text-slate-700">System Updates</span>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">Mutes system update notes notifications</p>
                        </div>
                        <Toggle enabled={draftGenToggles.system} onChange={() => setDraftGenToggles({ ...draftGenToggles, system: !draftGenToggles.system })} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Danger Actions Area */}
              <div className="bg-white border border-rose-150 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Close Current Session</h3>
                    <p className="text-xs text-slate-450 font-bold mt-0.5">Safely log out of your provider dashboard</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsLogoutModalOpen(true)}
                  className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 px-4 py-2 rounded-xl text-xs font-black cursor-pointer shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out Account
                </button>
              </div>
            </div>
          )}

          {/* ─── PROFILE TAB SETTINGS ────────────────────────────────────────── */}
          {activeTab === 'profile' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 animate-fade">
              
              {/* Header Box */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-purple-50 rounded-full border border-purple-200 text-purple-700 flex items-center justify-center font-black text-xl shrink-0 uppercase shadow-xs">
                    {profileData.fullName.charAt(4)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-slate-800">{profileData.fullName}</h3>
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-250 rounded px-1.5 py-0.5 text-[9px] font-black uppercase">Verified</span>
                    </div>
                    <p className="text-xs text-slate-450 font-bold mt-0.5">{profileData.qualification} • Exp: {profileData.experience} Years</p>
                    <p className="text-[10px] font-mono text-slate-400 mt-1">Reg No: {profileData.registrationNumber}</p>
                  </div>
                </div>

                {!isEditingProfile ? (
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="border border-[#5C2494]/30 hover:bg-purple-50 text-[#5C2494] px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer"
                  >
                    Edit Profile
                  </button>
                ) : (
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={handleCancelProfile}
                      className="px-4 py-2 border border-slate-200 text-slate-655 text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      className="bg-[#5C2494] text-white px-4 py-2 rounded-xl text-xs font-black shadow-sm cursor-pointer"
                    >
                      Save Changes
                    </button>
                  </div>
                )}
              </div>

              {/* Personal details grid */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">Personal Information</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Full Name *</label>
                      <input
                        type="text"
                        disabled={!isEditingProfile}
                        value={draftProfile.fullName}
                        onChange={e => setDraftProfile({ ...draftProfile, fullName: e.target.value })}
                        className="w-full bg-slate-50 disabled:opacity-70 disabled:bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email Address *</label>
                      <input
                        type="email"
                        disabled={!isEditingProfile}
                        value={draftProfile.email}
                        onChange={e => setDraftProfile({ ...draftProfile, email: e.target.value })}
                        className="w-full bg-slate-50 disabled:opacity-70 disabled:bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Contact Phone * (10 Digits)</label>
                      <input
                        type="text"
                        disabled={!isEditingProfile}
                        value={draftProfile.phone}
                        onChange={e => setDraftProfile({ ...draftProfile, phone: e.target.value })}
                        className="w-full bg-slate-50 disabled:opacity-70 disabled:bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Date of Birth *</label>
                      <input
                        type="date"
                        disabled={!isEditingProfile}
                        value={draftProfile.dob}
                        onChange={e => setDraftProfile({ ...draftProfile, dob: e.target.value })}
                        className="w-full bg-slate-50 disabled:opacity-70 disabled:bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Gender Selection *</label>
                      <select
                        disabled={!isEditingProfile}
                        value={draftProfile.gender}
                        onChange={e => setDraftProfile({ ...draftProfile, gender: e.target.value })}
                        className="w-full bg-slate-50 disabled:opacity-70 disabled:bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none cursor-pointer"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Specialization Category *</label>
                      <input
                        type="text"
                        disabled={!isEditingProfile}
                        value={draftProfile.specialization}
                        onChange={e => setDraftProfile({ ...draftProfile, specialization: e.target.value })}
                        className="w-full bg-slate-50 disabled:opacity-70 disabled:bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Professional block */}
                <div className="pt-6 border-t border-slate-100 space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Professional Information</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Qualification *</label>
                      <input
                        type="text"
                        disabled={!isEditingProfile}
                        value={draftProfile.qualification}
                        onChange={e => setDraftProfile({ ...draftProfile, qualification: e.target.value })}
                        className="w-full bg-slate-50 disabled:opacity-70 disabled:bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Clinical Experience (Years) *</label>
                      <input
                        type="text"
                        disabled={!isEditingProfile}
                        value={draftProfile.experience}
                        onChange={e => setDraftProfile({ ...draftProfile, experience: e.target.value })}
                        className="w-full bg-slate-50 disabled:opacity-70 disabled:bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Medical Registration Number (Read-Only)</label>
                      <input
                        type="text"
                        disabled={true}
                        value={draftProfile.registrationNumber}
                        className="w-full bg-slate-100 text-slate-500 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Hospital Center Association *</label>
                      <select
                        disabled={!isEditingProfile}
                        value={draftProfile.clinic}
                        onChange={e => setDraftProfile({ ...draftProfile, clinic: e.target.value })}
                        className="w-full bg-slate-50 disabled:opacity-70 disabled:bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none cursor-pointer"
                      >
                        <option value="Apollo Hospital">Apollo Hospital</option>
                        <option value="Care Clinic Banjara">Care Clinic Banjara</option>
                        <option value="Dr. Arjun Virtual Clinic">Dr. Arjun Virtual Clinic</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Consultation Formats *</label>
                      <div className="flex flex-wrap gap-4 mt-2">
                        {['Walk-In', 'In-Clinic', 'Video Consultation', 'Home Visit'].map(fmtOption => {
                          const isChecked = draftProfile.consultationTypes.includes(fmtOption);
                          return (
                            <label key={fmtOption} className="flex items-center gap-2 text-xs font-semibold text-slate-650 cursor-pointer">
                              <input
                                type="checkbox"
                                disabled={!isEditingProfile}
                                checked={isChecked}
                                onChange={() => toggleConsultationType(fmtOption)}
                                className="w-4 h-4 rounded text-purple-700 focus:ring-0 cursor-pointer"
                              />
                              {fmtOption}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">About Me Profile Statement (Max 250 characters)</label>
                    <textarea
                      disabled={!isEditingProfile}
                      maxLength={260}
                      value={draftProfile.aboutMe}
                      onChange={e => setDraftProfile({ ...draftProfile, aboutMe: e.target.value })}
                      placeholder="Biography details..."
                      className="w-full bg-slate-50 disabled:opacity-70 disabled:bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none min-h-[80px]"
                    />
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-1">
                      <span>Provide brief professional background</span>
                      <span className={draftProfile.aboutMe.length > 250 ? 'text-rose-500' : 'text-slate-400'}>
                        {draftProfile.aboutMe.length} / 250 chars
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── PASSWORD & SECURITY ─────────────────────────────────────────── */}
          {activeTab === 'security' && (
            <div className="space-y-6 animate-fade">
              
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Password Policy Update</h3>
                  <p className="text-xs text-slate-455 font-bold mt-0.5">Enforce login credentials protection</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Current Password</label>
                    <div className="relative">
                      <input
                        type={showCurrent ? 'text' : 'password'}
                        value={currentPwd}
                        onChange={e => setCurrentPwd(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-9 py-2 text-xs font-bold text-slate-800 outline-none"
                      />
                      <button
                        onClick={() => setShowCurrent(!showCurrent)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">New Password</label>
                    <div className="relative">
                      <input
                        type={showNew ? 'text' : 'password'}
                        value={newPwd}
                        onChange={e => setNewPwd(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-9 py-2 text-xs font-bold text-slate-800 outline-none"
                      />
                      <button
                        onClick={() => setShowNew(!showNew)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPwd}
                        onChange={e => setConfirmPwd(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-9 py-2 text-xs font-bold text-slate-800 outline-none"
                      />
                      <button
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Complexity constraints checklist:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px] font-bold text-slate-500">
                    <span className={`flex items-center gap-1 ${newPwd.length >= 8 ? 'text-emerald-600' : 'text-slate-400'}`}>
                      <Check className="w-3.5 h-3.5" /> 8+ Characters
                    </span>
                    <span className={`flex items-center gap-1 ${/[A-Z]/.test(newPwd) ? 'text-emerald-600' : 'text-slate-400'}`}>
                      <Check className="w-3.5 h-3.5" /> 1 Uppercase Letter
                    </span>
                    <span className={`flex items-center gap-1 ${/[a-z]/.test(newPwd) ? 'text-emerald-600' : 'text-slate-400'}`}>
                      <Check className="w-3.5 h-3.5" /> 1 Lowercase Letter
                    </span>
                    <span className={`flex items-center gap-1 ${/[0-9]/.test(newPwd) ? 'text-emerald-600' : 'text-slate-400'}`}>
                      <Check className="w-3.5 h-3.5" /> 1 Digit Number
                    </span>
                    <span className={`flex items-center gap-1 ${/[!@#$%^&*(),.?":{}|<>]/.test(newPwd) ? 'text-emerald-600' : 'text-slate-400'}`}>
                      <Check className="w-3.5 h-3.5" /> 1 Special Character
                    </span>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleUpdatePassword}
                    className="bg-[#5C2494] text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-sm"
                  >
                    Update Password
                  </button>
                </div>
              </div>

              {/* Two-Factor verification */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Two-Factor Authentication (2FA) Setup</h3>
                    <p className="text-xs text-slate-450 font-bold mt-0.5">Enable extra security checkpoint steps on logins</p>
                  </div>
                  <Toggle enabled={twoFaEnabled} onChange={() => setTwoFaEnabled(!twoFaEnabled)} />
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => showToast('2FA setup sequence wizard initiated.', 'info')}
                    className="border border-[#5C2494]/30 text-[#5C2494] px-4 py-2 rounded-xl text-xs font-black"
                  >
                    Configure 2FA
                  </button>
                </div>
              </div>

              {/* Active Sessions list */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Active Authorized Sessions</h3>
                    <p className="text-xs text-slate-450 font-bold mt-0.5">Control logged-in platforms and browsers</p>
                  </div>

                  {sessions.length > 1 && (
                    <button
                      onClick={handleSignOutOtherSessions}
                      className="text-xs font-black text-rose-600 hover:underline cursor-pointer"
                    >
                      Sign Out All Other Sessions
                    </button>
                  )}
                </div>

                <div className="divide-y divide-slate-100">
                  {sessions.map(ses => (
                    <div key={ses.id} className="flex items-center justify-between py-3">
                      <div className="flex items-start gap-3">
                        {ses.platform === 'Windows' || ses.platform === 'macOS' ? (
                          <Laptop className="w-5 h-5 text-slate-400 mt-1 shrink-0" />
                        ) : (
                          <Smartphone className="w-5 h-5 text-slate-400 mt-1 shrink-0" />
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-800">{ses.deviceName} ({ses.browser})</span>
                            {ses.isCurrent && (
                              <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">Current</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-450 font-bold mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {ses.location} • Last active: {ses.lastActive}
                          </p>
                        </div>
                      </div>

                      {!ses.isCurrent && (
                        <button
                          onClick={() => handleSignOutSession(ses.id)}
                          className="text-xs font-black text-rose-500 hover:text-rose-700 cursor-pointer"
                        >
                          Sign Out
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── NOTIFICATION MATRIX ────────────────────────────────────────── */}
          {activeTab === 'notifications' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-8 animate-fade">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Fine-grained Notification Matrix</h3>
                <p className="text-xs text-slate-450 font-bold mt-0.5">Control notification routing paths per event channel type</p>
              </div>

              {/* Table */}
              <div className="overflow-x-auto min-w-[550px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="p-3">Notification Event</th>
                      <th className="p-3 text-center">In-App Alerts</th>
                      <th className="p-3 text-center">Email Dispatch</th>
                      <th className="p-3 text-center">SMS Alerts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {[
                      { key: 'reminders', label: 'Appointment Reminders', desc: 'Schedules updates or reminders' },
                      { key: 'messages', label: 'Patient Messages', desc: 'Direct consult messaging warnings' },
                      { key: 'prescriptions', label: 'Prescription Updates', desc: 'Alerts on medication builds' },
                      { key: 'payments', label: 'Payments & Settlements', desc: 'Transfers confirmation notices' },
                      { key: 'reviews', label: 'Reviews & Ratings', desc: 'Ratings notifications feedback' },
                      { key: 'system', label: 'System Updates & Announcements', desc: 'General newsletters updates' },
                      { key: 'alerts', label: 'Account Alerts (Required) *', desc: 'Security credentials modifications' },
                    ].map(row => (
                      <tr key={row.key} className="hover:bg-slate-50/50">
                        <td className="p-3">
                          <p className="text-xs font-bold text-slate-800">{row.label}</p>
                          <p className="text-[10px] text-slate-400 font-bold">{row.desc}</p>
                        </td>
                        <td className="p-3 text-center">
                          <div className="inline-block">
                            <Checkbox checked={notifMatrix[row.key].inApp} onChange={() => toggleMatrix(row.key, 'inApp')} />
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <div className="inline-block">
                            <Checkbox checked={notifMatrix[row.key].email} onChange={() => toggleMatrix(row.key, 'email')} />
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <div className="inline-block">
                            <Checkbox checked={notifMatrix[row.key].sms} onChange={() => toggleMatrix(row.key, 'sms')} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Quiet Hours */}
              <div className="pt-6 border-t border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Muted Hours (Quiet Mode)</h3>
                    <p className="text-xs text-slate-450 font-bold mt-0.5">Temporarily suppress push messages notifications</p>
                  </div>
                  <Toggle enabled={quietHours} onChange={() => handleQuietHoursToggle(!quietHours)} />
                </div>

                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                  <div className="flex items-center gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">From Time</label>
                      <input
                        type="time"
                        disabled={!quietHours}
                        value={quietFrom}
                        onChange={e => handleQuietFromChange(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">To Time</label>
                      <input
                        type="time"
                        disabled={!quietHours}
                        value={quietTo}
                        onChange={e => handleQuietToChange(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div className="bg-purple-50/50 border border-purple-100 text-[#5C2494] px-4 py-3 rounded-xl flex items-start gap-2.5 flex-1">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#5C2494]" />
                    <p className="text-[11px] font-semibold leading-relaxed">
                      Quiet hours mute push notices automatically. Emergency account triggers will still break quiet periods.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── LANGUAGE PREFERENCES ────────────────────────────────────────── */}
          {activeTab === 'language' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 animate-fade">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Display Language Selection</h3>
                  <p className="text-xs text-slate-450 font-bold mt-0.5">Switch localization preferences across interfaces</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={handleCancelLanguage}
                    className="px-4 py-2 border border-slate-200 text-slate-655 text-xs font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveLanguage}
                    className="bg-[#5C2494] text-white px-4 py-2 rounded-xl text-xs font-black shadow-sm"
                  >
                    Save Changes
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {LANGUAGES.map(langItem => {
                  const isChecked = selectedLang === langItem.id;
                  return (
                    <button
                      key={langItem.id}
                      onClick={() => setSelectedLang(langItem.id)}
                      className={`flex items-center justify-between p-4 rounded-xl border text-left cursor-pointer transition-all ${
                        isChecked 
                          ? 'bg-purple-550/5 border-purple-300 shadow-xs' 
                          : 'bg-white border-slate-200 hover:border-slate-350'
                      }`}
                    >
                      <div>
                        <span className="text-xs font-black text-slate-800 block">{langItem.label}</span>
                        {langItem.native && (
                          <span className="text-[10px] text-slate-400 font-bold mt-0.5">{langItem.native}</span>
                        )}
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isChecked ? 'border-purple-700' : 'border-slate-300'}`}>
                        {isChecked && (
                          <div className="w-2 h-2 rounded-full bg-purple-700" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ─── MODALS ────────────────────────────────────────────────────────── */}

      {/* LOGOUT CONFIRMATION POPUP */}
      {isLogoutModalOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setIsLogoutModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-fade flex flex-col gap-4"
            onClick={e => e.stopPropagation()}
          >
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <AlertTriangle className="w-5 h-5 text-rose-500" /> Log Out Confirmation
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mt-2">
                Are you sure you want to end your current session? You will be routed back to the login screen.
              </p>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-3">
              <button
                onClick={() => setIsLogoutModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-655 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLogout}
                className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-xs font-black shadow-sm"
              >
                Confirm Log Out
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
