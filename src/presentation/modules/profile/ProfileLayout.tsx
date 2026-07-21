import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Users,
  Bell,
  Lock,
  Globe,
  LogOut,
  Camera,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  X,
  ShieldCheck,
  KeyRound,
  Check,
  Calendar
} from 'lucide-react';
import { MOCK_FAMILY_MEMBERS, type FamilyMember } from '../../../mocks/patientFlowMocks';

export interface SavedAddressItem {
  id: string;
  label: string;
  addressLine: string;
  landmark: string;
  city: string;
  state: string;
  pinCode: string;
  isDefault: boolean;
}

export const INITIAL_SAVED_ADDRESSES: SavedAddressItem[] = [
  {
    id: 'addr_1',
    label: 'Home',
    addressLine: 'H.No 4-12, Near Metro Station, Madhapur',
    landmark: 'Opposite Inorbit Mall',
    city: 'Hyderabad',
    state: 'Telangana',
    pinCode: '500081',
    isDefault: true
  },
  {
    id: 'addr_2',
    label: 'Work',
    addressLine: 'Cyber Towers, 4th Floor, Hitec City',
    landmark: 'Mindspace IT Park Gateway',
    city: 'Hyderabad',
    state: 'Telangana',
    pinCode: '500081',
    isDefault: false
  },
  {
    id: 'addr_3',
    label: 'Parents House',
    addressLine: 'Plot 45, Road No 36, Jubilee Hills',
    landmark: 'Near Peddamma Temple',
    city: 'Hyderabad',
    state: 'Telangana',
    pinCode: '500033',
    isDefault: false
  }
];

export default function ProfileLayout() {
  const navigate = useNavigate();

  // Active Tab / Section
  const [activeSection, setActiveSection] = useState<
    'personal' | 'contact' | 'addresses' | 'family' | 'notifications' | 'password' | 'settings'
  >('personal');

  // Toasts Feedback State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 1. Personal Info State
  const [profilePhoto, setProfilePhoto] = useState<string>(
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80'
  );
  const [fullName, setFullName] = useState('Ravi Teja');
  const [dob, setDob] = useState('2000-07-20');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);

  // 2. Contact Info State
  const [mobileNumber, setMobileNumber] = useState('+91 9876543210');
  const [emailAddress, setEmailAddress] = useState('ravi@email.com');
  const [isEditingContact, setIsEditingContact] = useState(false);

  // OTP Verification Dialog State for Contact Update
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [pendingContactUpdate, setPendingContactUpdate] = useState<{ mobile: string; email: string } | null>(null);

  // 3. Address Management State
  const [addresses, setAddresses] = useState<SavedAddressItem[]>([]);
  const [addressModal, setAddressModal] = useState<SavedAddressItem | null | 'new'>(null);
  const [addressDeleteModal, setAddressDeleteModal] = useState<SavedAddressItem | null>(null);
  const [addressForm, setAddressForm] = useState<Omit<SavedAddressItem, 'id'>>({
    label: 'Home',
    addressLine: '',
    landmark: '',
    city: 'Hyderabad',
    state: 'Telangana',
    pinCode: '',
    isDefault: false
  });

  // 4. Family Member Management State
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [familyModal, setFamilyModal] = useState<FamilyMember | null | 'new'>(null);
  const [familyDeleteModal, setFamilyDeleteModal] = useState<FamilyMember | null>(null);
  const [familyForm, setFamilyForm] = useState<{
    name: string;
    dob: string;
    relationship: string;
    gender: string;
  }>({
    name: '',
    dob: '1970-01-01',
    relationship: 'Father',
    gender: 'Male'
  });

  // 5. Notification Preferences State
  const [notifications, setNotifications] = useState({
    appointments: true,
    orders: true,
    promotional: false
  });

  // 6. Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // 7. Account Settings State
  const [language, setLanguage] = useState('English');
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  // Load saved state from localStorage
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('vizito_user');
      if (storedUser) {
        const u = JSON.parse(storedUser);
        if (u.fullName) setFullName(u.fullName);
        if (u.email) setEmailAddress(u.email);
        if (u.mobile) setMobileNumber(u.mobile);
      }

      const storedAddrs = localStorage.getItem('vizito_patient_addresses');
      setAddresses(storedAddrs ? JSON.parse(storedAddrs) : INITIAL_SAVED_ADDRESSES);

      const storedFamily = localStorage.getItem('vizito_family_members');
      setFamilyMembers(storedFamily ? JSON.parse(storedFamily) : MOCK_FAMILY_MEMBERS.filter((m) => !m.isSelf));
    } catch (err) {
      console.error(err);
      setAddresses(INITIAL_SAVED_ADDRESSES);
      setFamilyMembers(MOCK_FAMILY_MEMBERS.filter((m) => !m.isSelf));
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. Personal Information Submit
  const handleSavePersonal = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const stored = localStorage.getItem('vizito_user');
      const user = stored ? JSON.parse(stored) : {};
      localStorage.setItem('vizito_user', JSON.stringify({ ...user, fullName }));
    } catch (err) {
      console.error(err);
    }
    setIsEditingPersonal(false);
    showToast('Profile updated successfully.');
  };

  // Profile Photo Upload Simulation
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePhoto(URL.createObjectURL(file));
      showToast('Profile photo updated.');
    }
  };

  // 2. Contact Information Submit & OTP Trigger
  const handleInitiateContactUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setPendingContactUpdate({ mobile: mobileNumber, email: emailAddress });
    setOtpInput('');
    setShowOtpDialog(true);
  };

  const handleVerifyOtp = () => {
    if (otpInput.trim().length !== 4 && otpInput.trim().length !== 6) {
      showToast('Please enter a valid OTP code (e.g. 1234)');
      return;
    }

    if (pendingContactUpdate) {
      setMobileNumber(pendingContactUpdate.mobile);
      setEmailAddress(pendingContactUpdate.email);
      try {
        const stored = localStorage.getItem('vizito_user');
        const user = stored ? JSON.parse(stored) : {};
        localStorage.setItem(
          'vizito_user',
          JSON.stringify({
            ...user,
            email: pendingContactUpdate.email,
            mobile: pendingContactUpdate.mobile
          })
        );
      } catch (err) {
        console.error(err);
      }
    }

    setShowOtpDialog(false);
    setIsEditingContact(false);
    showToast('Contact information updated successfully.');
  };

  // 3. Address Management Functions
  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    let updated: SavedAddressItem[];

    if (addressModal === 'new') {
      const newAddr: SavedAddressItem = {
        id: `addr_${Date.now()}`,
        ...addressForm
      };
      if (newAddr.isDefault) {
        updated = addresses.map((a) => ({ ...a, isDefault: false }));
        updated.push(newAddr);
      } else {
        updated = [...addresses, newAddr];
      }
    } else if (addressModal && typeof addressModal === 'object') {
      updated = addresses.map((a) => {
        if (a.id === addressModal.id) {
          return { ...addressForm, id: a.id };
        }
        return addressForm.isDefault ? { ...a, isDefault: false } : a;
      });
    } else {
      return;
    }

    setAddresses(updated);
    try {
      localStorage.setItem('vizito_patient_addresses', JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }

    setAddressModal(null);
    showToast('Address saved successfully.');
  };

  const handleSetDefaultAddress = (id: string) => {
    const updated = addresses.map((a) => ({
      ...a,
      isDefault: a.id === id
    }));
    setAddresses(updated);
    try {
      localStorage.setItem('vizito_patient_addresses', JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
    showToast('Default address updated.');
  };

  const handleConfirmDeleteAddress = () => {
    if (!addressDeleteModal) return;
    const updated = addresses.filter((a) => a.id !== addressDeleteModal.id);
    setAddresses(updated);
    try {
      localStorage.setItem('vizito_patient_addresses', JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
    setAddressDeleteModal(null);
    showToast('Address deleted successfully.');
  };

  // 4. Family Member Management Functions
  const handleSaveFamilyMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyForm.name.trim()) {
      showToast('Please enter family member name.');
      return;
    }

    let updated: FamilyMember[];
    if (familyModal === 'new') {
      const newMem: FamilyMember = {
        id: `fam_${Date.now()}`,
        name: familyForm.name,
        relationship: familyForm.relationship,
        age: 30, // calculated mock
        gender: familyForm.gender,
        bloodGroup: 'O+'
      };
      updated = [...familyMembers, newMem];
    } else if (familyModal && typeof familyModal === 'object') {
      updated = familyMembers.map((f) => {
        if (f.id === familyModal.id) {
          return {
            ...f,
            name: familyForm.name,
            relationship: familyForm.relationship,
            gender: familyForm.gender
          };
        }
        return f;
      });
    } else {
      return;
    }

    setFamilyMembers(updated);
    try {
      localStorage.setItem('vizito_family_members', JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }

    setFamilyModal(null);
    showToast('Family member saved successfully.');
  };

  const handleConfirmDeleteFamilyMember = () => {
    if (!familyDeleteModal) return;
    const updated = familyMembers.filter((f) => f.id !== familyDeleteModal.id);
    setFamilyMembers(updated);
    try {
      localStorage.setItem('vizito_family_members', JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
    setFamilyDeleteModal(null);
    showToast('Family member deleted successfully.');
  };

  // 5. Notification Preference Toggle
  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      showToast('Notification preferences updated.');
      return updated;
    });
  };

  // 6. Change Password Submit
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
      setPasswordError('New Password and Confirm Password must match.');
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    showToast('Password changed successfully.');
  };

  // 7. Logout Handler
  const handleConfirmLogout = () => {
    localStorage.removeItem('vizito_user');
    localStorage.removeItem('vizito_token');
    setShowLogoutDialog(false);
    navigate('/auth/login');
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 max-w-6xl mx-auto">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Page Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Profile & Account</h1>
        <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
          Manage your personal details, contact info, saved addresses, family members, security, and preferences.
        </p>
      </div>

      {/* Profile Summary Card */}
      <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-5 relative overflow-hidden">
        <div className="flex items-center gap-5 z-10">
          <div className="relative group">
            <img
              src={profilePhoto}
              alt={fullName}
              className="w-20 h-20 rounded-2xl object-cover border-2 border-white/30 shadow-md"
            />
            <label className="absolute -bottom-1 -right-1 bg-teal-500 hover:bg-teal-600 text-white p-1.5 rounded-xl cursor-pointer shadow-md transition-transform group-hover:scale-110">
              <Camera className="w-3.5 h-3.5" />
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </label>
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-bold text-teal-200 border border-white/10 mb-1">
              <Sparkles className="w-3 h-3 text-teal-300" /> Patient Profile
            </div>
            <h2 className="text-xl font-extrabold tracking-tight">{fullName}</h2>
            <p className="text-xs text-teal-100/80 font-medium">{emailAddress} • {mobileNumber}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 z-10">
          <button
            onClick={() => setProfilePhoto('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80')}
            className="text-xs font-bold text-teal-200 hover:text-white bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/20 transition-all"
          >
            Remove Photo
          </button>
        </div>
      </div>

      {/* Main Container Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Navigation Sidebar / Tabs */}
        <div className="bg-white rounded-2xl border border-slate-200 p-2 space-y-1 shadow-xs">
          <button
            onClick={() => setActiveSection('personal')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
              activeSection === 'personal'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4 shrink-0" />
            <span>Personal Information</span>
          </button>

          <button
            onClick={() => setActiveSection('contact')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
              activeSection === 'contact'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Phone className="w-4 h-4 shrink-0" />
            <span>Contact Information</span>
          </button>

          <button
            onClick={() => setActiveSection('addresses')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
              activeSection === 'addresses'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-4 h-4 shrink-0" />
            <span>Address Management</span>
          </button>

          <button
            onClick={() => setActiveSection('family')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
              activeSection === 'family'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Family Members</span>
          </button>

          <button
            onClick={() => setActiveSection('notifications')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
              activeSection === 'notifications'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Bell className="w-4 h-4 shrink-0" />
            <span>Notification Preferences</span>
          </button>

          <button
            onClick={() => setActiveSection('password')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
              activeSection === 'password'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Lock className="w-4 h-4 shrink-0" />
            <span>Change Password</span>
          </button>

          <button
            onClick={() => setActiveSection('settings')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
              activeSection === 'settings'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Globe className="w-4 h-4 shrink-0" />
            <span>Account Settings</span>
          </button>
        </div>

        {/* Section Detail Views */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* SECTION 1: Personal Information */}
          {activeSection === 'personal' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                  <User className="w-5 h-5 text-teal-600" /> Personal Information
                </h3>
                {!isEditingPersonal ? (
                  <button
                    onClick={() => setIsEditingPersonal(true)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-xs text-slate-700 transition-colors flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                ) : null}
              </div>

              <form onSubmit={handleSavePersonal} className="space-y-4 text-xs">
                <div>
                  <label className="block font-extrabold text-slate-700 uppercase tracking-wider mb-1">Full Name</label>
                  <input
                    type="text"
                    disabled={!isEditingPersonal}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={`w-full p-3 rounded-xl font-bold text-sm text-slate-800 border transition-all ${
                      isEditingPersonal
                        ? 'bg-white border-teal-500 ring-2 ring-teal-500/20'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-extrabold text-slate-700 uppercase tracking-wider mb-1">Date of Birth</label>
                    <input
                      type="date"
                      disabled={!isEditingPersonal}
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className={`w-full p-3 rounded-xl font-bold text-sm text-slate-800 border transition-all ${
                        isEditingPersonal
                          ? 'bg-white border-teal-500 ring-2 ring-teal-500/20'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block font-extrabold text-slate-700 uppercase tracking-wider mb-1">Gender</label>
                    <select
                      disabled={!isEditingPersonal}
                      value={gender}
                      onChange={(e) => setGender(e.target.value as any)}
                      className={`w-full p-3 rounded-xl font-bold text-sm text-slate-800 border transition-all ${
                        isEditingPersonal
                          ? 'bg-white border-teal-500 ring-2 ring-teal-500/20'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {isEditingPersonal && (
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsEditingPersonal(false)}
                      className="px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-md"
                    >
                      Save Profile
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* SECTION 2: Contact Information */}
          {activeSection === 'contact' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                  <Phone className="w-5 h-5 text-teal-600" /> Contact Information
                </h3>
                {!isEditingContact && (
                  <button
                    onClick={() => setIsEditingContact(true)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-xs text-slate-700 transition-colors flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                )}
              </div>

              <form onSubmit={handleInitiateContactUpdate} className="space-y-4 text-xs">
                <div>
                  <label className="block font-extrabold text-slate-700 uppercase tracking-wider mb-1">Mobile Number</label>
                  <input
                    type="text"
                    disabled={!isEditingContact}
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    className={`w-full p-3 rounded-xl font-bold text-sm text-slate-800 border transition-all ${
                      isEditingContact
                        ? 'bg-white border-teal-500 ring-2 ring-teal-500/20'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-slate-700 uppercase tracking-wider mb-1">Email Address</label>
                  <input
                    type="email"
                    disabled={!isEditingContact}
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    className={`w-full p-3 rounded-xl font-bold text-sm text-slate-800 border transition-all ${
                      isEditingContact
                        ? 'bg-white border-teal-500 ring-2 ring-teal-500/20'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>

                {isEditingContact && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>OTP verification code will be sent to confirm contact changes.</span>
                  </div>
                )}

                {isEditingContact && (
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsEditingContact(false)}
                      className="px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-md"
                    >
                      Update & Verify OTP
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* SECTION 3: Address Management */}
          {activeSection === 'addresses' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-teal-600" /> Saved Addresses
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Manage doorstep delivery and home visit locations.</p>
                </div>
                <button
                  onClick={() => {
                    setAddressForm({
                      label: 'Home',
                      addressLine: '',
                      landmark: '',
                      city: 'Hyderabad',
                      state: 'Telangana',
                      pinCode: '',
                      isDefault: false
                    });
                    setAddressModal('new');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Add Address
                </button>
              </div>

              {/* Address Cards List */}
              {addresses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 relative ${
                        addr.isDefault
                          ? 'border-teal-600 bg-teal-50/20 ring-2 ring-teal-600/20 shadow-xs'
                          : 'border-slate-200 bg-slate-50/50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-extrabold text-slate-900 text-sm">{addr.label}</span>
                          {addr.isDefault ? (
                            <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 bg-teal-100 px-2.5 py-0.5 rounded-full border border-teal-200">
                              Default
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSetDefaultAddress(addr.id)}
                              className="text-[10px] font-bold text-slate-500 hover:text-teal-700 underline"
                            >
                              Set as Default
                            </button>
                          )}
                        </div>

                        <p className="text-xs text-slate-700 font-semibold">{addr.addressLine}</p>
                        {addr.landmark && <p className="text-xs text-slate-500">Landmark: {addr.landmark}</p>}
                        <p className="text-xs text-slate-500">
                          {addr.city}, {addr.state} - {addr.pinCode}
                        </p>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60 text-xs font-bold">
                        <button
                          onClick={() => {
                            setAddressForm({
                              label: addr.label,
                              addressLine: addr.addressLine,
                              landmark: addr.landmark,
                              city: addr.city,
                              state: addr.state,
                              pinCode: addr.pinCode,
                              isDefault: addr.isDefault
                            });
                            setAddressModal(addr);
                          }}
                          className="px-3 py-1.5 rounded-lg text-slate-700 hover:bg-slate-200 flex items-center gap-1"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => setAddressDeleteModal(addr)}
                          className="px-3 py-1.5 rounded-lg text-rose-600 hover:bg-rose-100 flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-500 text-xs">
                  <p className="font-bold">No saved addresses.</p>
                  <p>Add a new address to use for home care, delivery, and ambulance pickup.</p>
                </div>
              )}
            </div>
          )}

          {/* SECTION 4: Family Members */}
          {activeSection === 'family' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-teal-600" /> Family Member Management
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Manage family profiles available during healthcare bookings.</p>
                </div>
                <button
                  onClick={() => {
                    setFamilyForm({ name: '', dob: '1970-01-01', relationship: 'Father', gender: 'Male' });
                    setFamilyModal('new');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Add Family Member
                </button>
              </div>

              {familyMembers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {familyMembers.map((member) => (
                    <div
                      key={member.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-slate-900 text-sm">{member.name}</h4>
                          <span className="text-[10px] font-black uppercase text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                            {member.relationship}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-500">
                          {member.gender || 'Male'} • {member.age} Years
                        </p>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-bold">
                        <button
                          onClick={() => {
                            setFamilyForm({
                              name: member.name,
                              dob: '1970-01-01',
                              relationship: member.relationship,
                              gender: member.gender || 'Male'
                            });
                            setFamilyModal(member);
                          }}
                          className="p-2 text-slate-600 hover:bg-slate-200 rounded-xl"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setFamilyDeleteModal(member)}
                          className="p-2 text-rose-600 hover:bg-rose-100 rounded-xl"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-500 text-xs space-y-2">
                  <p className="font-bold">No family members added.</p>
                  <p>Add your first family member to easily book consultations on their behalf.</p>
                </div>
              )}
            </div>
          )}

          {/* SECTION 5: Notification Preferences */}
          {activeSection === 'notifications' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5 shadow-xs">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                  <Bell className="w-5 h-5 text-teal-600" /> Notification Preferences
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Control which notifications you receive for future updates.</p>
              </div>

              <div className="space-y-4 text-xs font-extrabold">
                <div className="p-4 rounded-2xl border border-slate-200 flex items-center justify-between bg-slate-50/50">
                  <div>
                    <span className="text-slate-800 block text-sm">Appointment Notifications</span>
                    <span className="text-slate-400 font-normal">Reminders for upcoming consultations & queue updates</span>
                  </div>
                  <button
                    onClick={() => toggleNotification('appointments')}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                      notifications.appointments ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {notifications.appointments ? 'ON' : 'OFF'}
                  </button>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 flex items-center justify-between bg-slate-50/50">
                  <div>
                    <span className="text-slate-800 block text-sm">Order & Dispatch Notifications</span>
                    <span className="text-slate-400 font-normal">Live GPS status & pharmacy delivery updates</span>
                  </div>
                  <button
                    onClick={() => toggleNotification('orders')}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                      notifications.orders ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {notifications.orders ? 'ON' : 'OFF'}
                  </button>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 flex items-center justify-between bg-slate-50/50">
                  <div>
                    <span className="text-slate-800 block text-sm">Promotional Notifications</span>
                    <span className="text-slate-400 font-normal">Offers, health checkup packages & wellness newsletters</span>
                  </div>
                  <button
                    onClick={() => toggleNotification('promotional')}
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

          {/* SECTION 6: Change Password */}
          {activeSection === 'password' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5 shadow-xs">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                  <Lock className="w-5 h-5 text-teal-600" /> Change Password
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Update your password to keep your health account secure.</p>
              </div>

              {passwordError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs font-bold text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs max-w-md">
                <div>
                  <label className="block font-extrabold text-slate-700 uppercase tracking-wider mb-1">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full p-3 rounded-xl font-bold text-sm text-slate-800 border border-slate-200 bg-slate-50 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-slate-700 uppercase tracking-wider mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full p-3 rounded-xl font-bold text-sm text-slate-800 border border-slate-200 bg-slate-50 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-slate-700 uppercase tracking-wider mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full p-3 rounded-xl font-bold text-sm text-slate-800 border border-slate-200 bg-slate-50 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all"
                >
                  Update Password
                </button>
              </form>
            </div>
          )}

          {/* SECTION 7: Account Settings & Logout */}
          {activeSection === 'settings' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5 shadow-xs">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                  <Globe className="w-5 h-5 text-teal-600" /> Account Settings
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Manage language preferences and session controls.</p>
              </div>

              <div className="space-y-4 text-xs max-w-md">
                <div>
                  <label className="block font-extrabold text-slate-700 uppercase tracking-wider mb-1">Language Preference</label>
                  <select
                    value={language}
                    onChange={(e) => {
                      setLanguage(e.target.value);
                      showToast(`Language set to ${e.target.value}`);
                    }}
                    className="w-full p-3 rounded-xl font-bold text-sm text-slate-800 border border-slate-200 bg-slate-50 focus:outline-none focus:border-teal-500"
                  >
                    <option value="English">English</option>
                    <option value="Telugu">Telugu (తెలుగు)</option>
                    <option value="Hindi">Hindi (हिंदी)</option>
                  </select>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowLogoutDialog(true)}
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs border border-rose-200 transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> Logout of Account
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* OTP Verification Modal */}
      {showOtpDialog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2 text-teal-700">
                <ShieldCheck className="w-5 h-5 text-teal-600" /> Verify Contact Change
              </h3>
              <button onClick={() => setShowOtpDialog(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-slate-600 font-medium">
              Enter the 4-digit verification OTP code sent to your updated mobile ({pendingContactUpdate?.mobile}):
            </p>

            <div>
              <input
                type="text"
                maxLength={6}
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
                placeholder="Enter 4-digit OTP (e.g. 1234)"
                className="w-full text-center tracking-widest text-lg font-black p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowOtpDialog(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVerifyOtp}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-md"
              >
                Verify & Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Address Form Modal */}
      {addressModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2 text-teal-700">
                <MapPin className="w-5 h-5 text-teal-600" /> {addressModal === 'new' ? 'Add Address' : 'Edit Address'}
              </h3>
              <button onClick={() => setAddressModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAddress} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Label</label>
                <select
                  value={addressForm.label}
                  onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                >
                  <option value="Home">Home</option>
                  <option value="Work">Work</option>
                  <option value="Parents House">Parents House</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Address Line</label>
                <input
                  type="text"
                  required
                  value={addressForm.addressLine}
                  onChange={(e) => setAddressForm({ ...addressForm, addressLine: e.target.value })}
                  placeholder="House/Flat No, Building, Street"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Landmark</label>
                <input
                  type="text"
                  value={addressForm.landmark}
                  onChange={(e) => setAddressForm({ ...addressForm, landmark: e.target.value })}
                  placeholder="Near landmark..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    required
                    value={addressForm.state}
                    onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Pincode</label>
                  <input
                    type="text"
                    required
                    value={addressForm.pinCode}
                    onChange={(e) => setAddressForm({ ...addressForm, pinCode: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chkDefault"
                  checked={addressForm.isDefault}
                  onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                  className="w-4 h-4 text-teal-600 rounded"
                />
                <label htmlFor="chkDefault" className="font-bold text-slate-700 cursor-pointer">
                  Set as default delivery address
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddressModal(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-md"
                >
                  Save Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Address Confirmation */}
      {addressDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base text-rose-600 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-600" /> Delete Address?
              </h3>
              <button onClick={() => setAddressDeleteModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-slate-600 font-semibold">
              Are you sure you want to delete <strong className="text-slate-800">{addressDeleteModal.label} Address</strong>?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAddressDeleteModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAddress}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Family Member Form Modal */}
      {familyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2 text-teal-700">
                <Users className="w-5 h-5 text-teal-600" /> {familyModal === 'new' ? 'Add Family Member' : 'Edit Family Member'}
              </h3>
              <button onClick={() => setFamilyModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFamilyMember} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={familyForm.name}
                  onChange={(e) => setFamilyForm({ ...familyForm, name: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Relationship</label>
                <select
                  value={familyForm.relationship}
                  onChange={(e) => setFamilyForm({ ...familyForm, relationship: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                >
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Child">Child</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Gender</label>
                  <select
                    value={familyForm.gender}
                    onChange={(e) => setFamilyForm({ ...familyForm, gender: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={familyForm.dob}
                    onChange={(e) => setFamilyForm({ ...familyForm, dob: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setFamilyModal(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-md"
                >
                  Save Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Family Member Confirmation */}
      {familyDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base text-rose-600 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-600" /> Delete Family Member?
              </h3>
              <button onClick={() => setFamilyDeleteModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-slate-600 font-semibold">
              Are you sure you want to delete <strong className="text-slate-800">{familyDeleteModal.name} ({familyDeleteModal.relationship})</strong>?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setFamilyDeleteModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteFamilyMember}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Dialog */}
      {showLogoutDialog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base text-rose-600 flex items-center gap-2">
                <LogOut className="w-5 h-5 text-rose-600" /> Confirm Logout
              </h3>
              <button onClick={() => setShowLogoutDialog(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-slate-600 font-semibold">
              Are you sure you want to logout of your health account?
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
