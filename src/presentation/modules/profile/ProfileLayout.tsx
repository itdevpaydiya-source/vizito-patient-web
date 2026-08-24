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
import {
  getPatientProfileApi,
  updateProfileApi,
  changePasswordApi,
  getAddressesApi,
  deleteAddressApi,
  setDefaultAddressApi,
  type PatientAddress,
} from '../../../services/patientHelper';
import {
  getMyUserId,
  getFamilyMembersApi,
  addFamilyMemberApi,
  removeFamilyMemberApi,
  FAMILY_RELATIONSHIPS,
  type PatientFamilyMember,
  type FamilyRelationship,
} from '../../../services/familyHelper';

export default function ProfileLayout() {
  const navigate = useNavigate();

  // Active Tab / Section
  const [activeSection, setActiveSection] = useState<
    'personal' | 'contact' | 'addresses' | 'family' | 'notifications' | 'password' | 'settings'
  >('personal');

  // Toasts Feedback State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 1. Personal Info State — avatar starts empty (initials shown); a real photo is loaded from the
  // backend when present. No fabricated stock image.
  const [profilePhoto, setProfilePhoto] = useState<string>('');
  // Name/email/phone/dob/gender are populated from the real backend (/patients/me) and persisted
  // via PATCH /patients/profile — no fabricated defaults, no local-only fields.
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [savingPersonal, setSavingPersonal] = useState(false);

  // 2. Contact Info State — real values loaded from /patients/me, persisted via PATCH /patients/profile.
  const [mobileNumber, setMobileNumber] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [savingContact, setSavingContact] = useState(false);

  // Authenticated user's own users.id (needed for the path-scoped family API).
  const [userId, setUserId] = useState<number | null>(null);

  // 3. Address Management State — list is real (GET /patients/me); delete + set-default are real APIs.
  // Create/edit are NOT wired: the backend requires catalogue city/state/country IDs validated via
  // /locations/validate, which needs location pickers in the UI. Reported as a blocker rather than
  // fabricating location IDs.
  const [addresses, setAddresses] = useState<PatientAddress[]>([]);
  const [addressDeleteModal, setAddressDeleteModal] = useState<PatientAddress | null>(null);

  // 4. Family Member Management State (real /users/:id/family-members API — add + delete)
  const [familyMembers, setFamilyMembers] = useState<PatientFamilyMember[]>([]);
  const [familyModal, setFamilyModal] = useState<PatientFamilyMember | null | 'new'>(null);
  const [familyDeleteModal, setFamilyDeleteModal] = useState<PatientFamilyMember | null>(null);
  const [familySubmitting, setFamilySubmitting] = useState(false);
  const [familyForm, setFamilyForm] = useState<{
    name: string;
    dob: string;
    relationship: FamilyRelationship;
    gender: string;
  }>({
    name: '',
    dob: '',
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
  const [savingPassword, setSavingPassword] = useState(false);

  // 7. Account Settings State
  const [language, setLanguage] = useState('English');
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  // Load identity from the session for a fast paint, then hydrate authoritative profile, addresses,
  // and family members from the backend. No mock/localStorage business data is used as a source.
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('vizito_user');
      if (storedUser) {
        const u = JSON.parse(storedUser);
        if (u.fullName) setFullName(u.fullName);
        if (u.email) setEmailAddress(u.email);
        if (u.mobile) setMobileNumber(u.mobile);
      }
    } catch { /* ignore */ }

    let mounted = true;
    (async () => {
      try {
        const profile = await getPatientProfileApi();
        if (mounted && profile) {
          if (profile.fullName) setFullName(profile.fullName);
          if (profile.email) setEmailAddress(profile.email);
          if (profile.phone) setMobileNumber(profile.phone);
          if (profile.dateOfBirth) setDob(profile.dateOfBirth);
          if (profile.gender === 'Male' || profile.gender === 'Female' || profile.gender === 'Other') setGender(profile.gender);
          if (profile.profilePicture) setProfilePhoto(profile.profilePicture);
          setUserId(profile.userId);
          try {
            const stored = localStorage.getItem('vizito_user');
            const user = stored ? JSON.parse(stored) : {};
            localStorage.setItem('vizito_user', JSON.stringify({
              ...user,
              fullName: profile.fullName ?? user.fullName,
              email: profile.email ?? user.email,
              mobile: profile.phone ?? user.mobile,
            }));
          } catch { /* non-fatal */ }
          // Family members (real). Non-fatal on error — render empty, never mock.
          try {
            const fam = await getFamilyMembersApi(profile.userId);
            if (mounted) setFamilyMembers(fam);
          } catch { if (mounted) setFamilyMembers([]); }
        }
      } catch { /* keep localStorage identity; inject no fabricated data */ }

      // Addresses (real, from /patients/me). Non-fatal on error.
      try {
        const addrs = await getAddressesApi();
        if (mounted) setAddresses(addrs);
      } catch { if (mounted) setAddresses([]); }
    })();
    return () => { mounted = false; };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. Personal Information Submit — persisted to the backend (PATCH /patients/profile).
  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      showToast('Full name is required.');
      return;
    }
    setSavingPersonal(true);
    try {
      await updateProfileApi({
        fullName: fullName.trim(),
        dateOfBirth: dob || '',
        gender,
      });
      try {
        const stored = localStorage.getItem('vizito_user');
        const user = stored ? JSON.parse(stored) : {};
        localStorage.setItem('vizito_user', JSON.stringify({ ...user, fullName: fullName.trim() }));
      } catch { /* non-fatal */ }
      setIsEditingPersonal(false);
      showToast('Profile updated successfully.');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      showToast(Array.isArray(msg) ? msg.join(', ') : (msg || 'Failed to update profile.'));
    } finally {
      setSavingPersonal(false);
    }
  };

  // Profile photo preview. There is no patient image-upload/storage endpoint yet, so this shows the
  // selected image locally only — it is NOT persisted, and we say so honestly rather than fake a save.
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePhoto(URL.createObjectURL(file));
      showToast('Preview only — photo upload will be saved once storage is enabled.');
    }
  };

  // 2. Contact Information Submit — persisted to the backend (PATCH /patients/profile). The backend
  // validates the mobile format and rejects duplicate phone/email, so failures surface the real error.
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedMobile = mobileNumber.replace(/\D/g, '').slice(-10);
    if (cleanedMobile.length !== 10) {
      showToast('Please enter a valid 10-digit mobile number.');
      return;
    }
    setSavingContact(true);
    try {
      await updateProfileApi({ phone: cleanedMobile, email: emailAddress.trim() });
      setMobileNumber(cleanedMobile);
      try {
        const stored = localStorage.getItem('vizito_user');
        const user = stored ? JSON.parse(stored) : {};
        localStorage.setItem('vizito_user', JSON.stringify({ ...user, email: emailAddress.trim(), mobile: cleanedMobile }));
      } catch { /* non-fatal */ }
      setIsEditingContact(false);
      showToast('Contact information updated successfully.');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      showToast(Array.isArray(msg) ? msg.join(', ') : (msg || 'Failed to update contact information.'));
    } finally {
      setSavingContact(false);
    }
  };

  // 3. Address Management Functions — real backend. Reloads from the source of truth after writes.
  const reloadAddresses = async () => {
    try { setAddresses(await getAddressesApi()); } catch { /* keep current list */ }
  };

  const handleSetDefaultAddress = async (id: string) => {
    try {
      await setDefaultAddressApi(id);
      await reloadAddresses();
      showToast('Default address updated.');
    } catch {
      showToast('Failed to update default address.');
    }
  };

  const handleConfirmDeleteAddress = async () => {
    if (!addressDeleteModal) return;
    const target = addressDeleteModal;
    try {
      await deleteAddressApi(target.addressId);
      setAddresses((prev) => prev.filter((a) => a.addressId !== target.addressId));
      showToast('Address deleted successfully.');
    } catch {
      showToast('Failed to delete address.');
    } finally {
      setAddressDeleteModal(null);
    }
  };

  // 4. Family Member Management Functions — real API. Only add + delete are supported by the backend
  // association endpoints; editing an existing member is not wired (guarded below).
  const handleSaveFamilyMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyForm.name.trim()) {
      showToast('Please enter family member name.');
      return;
    }
    if (userId == null) {
      showToast('Your account could not be resolved. Please refresh.');
      return;
    }
    if (familyModal !== 'new') {
      // No update endpoint for the linked member's details yet — close without fabricating a change.
      setFamilyModal(null);
      return;
    }
    setFamilySubmitting(true);
    try {
      await addFamilyMemberApi(userId, {
        first_name: familyForm.name.trim(),
        full_name: familyForm.name.trim(),
        relationship: familyForm.relationship,
        gender: familyForm.gender,
        date_of_birth: familyForm.dob || undefined,
      });
      setFamilyMembers(await getFamilyMembersApi(userId));
      setFamilyModal(null);
      showToast('Family member added successfully.');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to add family member.';
      showToast(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setFamilySubmitting(false);
    }
  };

  const handleConfirmDeleteFamilyMember = async () => {
    if (!familyDeleteModal || userId == null) {
      setFamilyDeleteModal(null);
      return;
    }
    const target = familyDeleteModal;
    try {
      await removeFamilyMemberApi(userId, target.associationId);
      setFamilyMembers((prev) => prev.filter((f) => f.associationId !== target.associationId));
      showToast('Family member removed.');
    } catch {
      showToast('Failed to remove family member.');
    } finally {
      setFamilyDeleteModal(null);
    }
  };

  // 5. Notification Preference Toggle
  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      showToast('Notification preferences updated.');
      return updated;
    });
  };

  // 6. Change Password Submit — real backend operation (verifies the current password server-side).
  const handlePasswordSubmit = async (e: React.FormEvent) => {
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

    setSavingPassword(true);
    try {
      await changePasswordApi(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password changed successfully.');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setPasswordError(Array.isArray(msg) ? msg.join(', ') : (msg || 'Failed to change password.'));
    } finally {
      setSavingPassword(false);
    }
  };

  // 7. Logout Handler
  const handleConfirmLogout = () => {
    localStorage.removeItem('vizito_user');
    localStorage.removeItem('vizito_token');
    setShowLogoutDialog(false);
    navigate('/auth/login');
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 max-w-7xl mx-auto">
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
            {profilePhoto ? (
              <img
                src={profilePhoto}
                alt={fullName || 'Patient'}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-white/30 shadow-md"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl border-2 border-white/30 shadow-md bg-white/15 backdrop-blur-md flex items-center justify-center">
                <span className="text-2xl font-black text-white tracking-tight">
                  {(fullName || 'Patient').split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'P'}
                </span>
              </div>
            )}
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
          {profilePhoto && (
            <button
              onClick={async () => {
                setProfilePhoto('');
                try { await updateProfileApi({ profilePicture: '' }); showToast('Profile photo removed.'); }
                catch { showToast('Failed to remove photo.'); }
              }}
              className="text-xs font-bold text-teal-200 hover:text-white bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/20 transition-all"
            >
              Remove Photo
            </button>
          )}
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
                      disabled={savingPersonal}
                      className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-bold shadow-md"
                    >
                      {savingPersonal ? 'Saving...' : 'Save Profile'}
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

              <form onSubmit={handleSaveContact} className="space-y-4 text-xs">
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
                      disabled={savingContact}
                      className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-bold shadow-md"
                    >
                      {savingContact ? 'Saving...' : 'Save Contact Info'}
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
                  <p className="text-xs text-slate-500 mt-0.5">Your saved delivery and home-visit locations.</p>
                </div>
              </div>

              {/* Adding/editing an address requires selecting country/state/city from the catalogue
                  (numeric IDs validated server-side). Those pickers are not built yet, so creation is
                  reported here rather than fabricated. Viewing, deleting, and set-default are live. */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Adding a new address is coming soon (requires city/state selection). You can view, delete, or change your default address below.</span>
              </div>

              {/* Address Cards List (real, from /patients/me) */}
              {addresses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addresses.map((addr) => (
                    <div
                      key={addr.addressId}
                      className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 relative ${
                        addr.isDefault
                          ? 'border-teal-600 bg-teal-50/20 ring-2 ring-teal-600/20 shadow-xs'
                          : 'border-slate-200 bg-slate-50/50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-extrabold text-slate-900 text-sm">{addr.label || 'Address'}</span>
                          {addr.isDefault ? (
                            <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 bg-teal-100 px-2.5 py-0.5 rounded-full border border-teal-200">
                              Default
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSetDefaultAddress(addr.addressId)}
                              className="text-[10px] font-bold text-slate-500 hover:text-teal-700 underline"
                            >
                              Set as Default
                            </button>
                          )}
                        </div>

                        {addr.addressLine1 && <p className="text-xs text-slate-700 font-semibold">{addr.addressLine1}</p>}
                        {addr.addressLine2 && <p className="text-xs text-slate-600">{addr.addressLine2}</p>}
                        {addr.landmark && <p className="text-xs text-slate-500">Landmark: {addr.landmark}</p>}
                        {addr.pincode && <p className="text-xs text-slate-500">Pincode: {addr.pincode}</p>}
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60 text-xs font-bold">
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
                    setFamilyForm({ name: '', dob: '', relationship: 'Father', gender: 'Male' });
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
                      key={member.associationId}
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
                          {member.gender || '—'}{member.age != null ? ` • ${member.age} Years` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-bold">
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
                  disabled={savingPassword}
                  className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-bold text-xs shadow-md transition-all"
                >
                  {savingPassword ? 'Updating...' : 'Update Password'}
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
              Are you sure you want to delete <strong className="text-slate-800">{addressDeleteModal.label || 'this'} address</strong>?
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
                  onChange={(e) => setFamilyForm({ ...familyForm, relationship: e.target.value as FamilyRelationship })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                >
                  {FAMILY_RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
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
                  disabled={familySubmitting}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-bold shadow-md"
                >
                  {familySubmitting ? 'Saving...' : 'Save Member'}
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
