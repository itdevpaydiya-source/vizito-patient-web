import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { personNameInput } from '../../../utils/inputFilters';
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
  Calendar,
  HeartPulse
} from 'lucide-react';
import HealthProfileSection from './HealthProfileSection';
import { getHealthProfileApi, type HealthProfile } from '../../../services/healthProfileHelper';
import AddressBook from './AddressBook';
import ContactSection from './ContactSection';
import {
  getPatientProfileApi,
  updateProfileApi,
  changePasswordApi,
  getAddressesApi,
  deleteAddressApi,
  setDefaultAddressApi,
  type PatientAddress,
  uploadPatientPhotoApi,
  photoUrl,
  logoutOtherDevicesApi,
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
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from '../../../utils/passwordPolicy';

export default function ProfileLayout() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion() ?? false;

  // Active Tab / Section
  const [activeSection, setActiveSection] = useState<
    'personal' | 'health' | 'contact' | 'addresses' | 'family' | 'password' | 'settings'
  >(() => (new URLSearchParams(window.location.search).get('section') === 'health' ? 'health' : 'personal'));

  // Toasts Feedback State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 1. Personal Info State — avatar starts empty (initials shown); a real photo is loaded from the
  // backend when present. No fabricated stock image.
  const [profilePhoto, setProfilePhoto] = useState<string>('');
  // Name/email/phone/dob/gender are populated from the real backend (/patients/me) and persisted
  // via PATCH /patients/profile — no fabricated defaults, no local-only fields.
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | ''>('');
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

  // 6. Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  // 7. Account Settings State
  const [signingOutOthers, setSigningOutOthers] = useState(false);
  // Health profile, only to count what's filled in for the completeness meter.
  const [health, setHealth] = useState<HealthProfile | null>(null);
  useEffect(() => { getHealthProfileApi().then(setHealth).catch(() => setHealth(null)); }, [activeSection]);
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
          { const g = String(profile.gender || '').toLowerCase(); setGender(g === 'male' ? 'Male' : g === 'female' ? 'Female' : g === 'other' ? 'Other' : ''); }
          if (profile.profilePicture) setProfilePhoto(photoUrl(profile.profilePicture));
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
    const name = fullName.trim();
    if (!name) {
      showToast('Full name is required.');
      return;
    }
    if (!/^[A-Za-z][A-Za-z .'-]{1,59}$/.test(name)) {
      showToast("Full name can only contain letters, spaces and . ' -");
      return;
    }
    if (dob && new Date(`${dob}T00:00:00`) > new Date()) {
      showToast('Date of birth cannot be in the future.');
      return;
    }
    setSavingPersonal(true);
    try {
      // Date of birth is optional; leaving it empty keeps it unset (doctors then see no age).
      await updateProfileApi({
        fullName: name,
        ...(dob ? { dateOfBirth: dob } : {}),
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
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) { showToast('Use a PNG, JPEG or WEBP photo.'); return; }
    if (file.size > 2 * 1024 * 1024) { showToast('That photo is over 2 MB. Choose a smaller one.'); return; }
    const before = profilePhoto;
    setProfilePhoto(URL.createObjectURL(file));
    try {
      const url = await uploadPatientPhotoApi(file);
      await updateProfileApi({ profilePicture: url });
      setProfilePhoto(photoUrl(url));
      showToast('Profile photo updated.');
    } catch (err: any) {
      setProfilePhoto(before);
      const m = err?.response?.data?.message; showToast(Array.isArray(m) ? m.join(' ') : m || 'Could not upload the photo. Please try again.');
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

  // 6. Change Password Submit — real backend operation (verifies the current password server-side).
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError('Current Password is required.');
      return;
    }
    if (!isStrongPassword(newPassword)) {
      setPasswordError(PASSWORD_POLICY_MESSAGE);
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
    <div className="mx-auto max-w-[1440px] space-y-6 px-1 pb-12 sm:px-2 animate-in fade-in slide-in-from-bottom-3 duration-500">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Page Title */}
      <div className="flex flex-col gap-1 border-b border-slate-200/80 pb-5">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand-700">Your account</p>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Profile & Account</h1>
        <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1 max-w-3xl">
          Manage your personal details, contact info, saved addresses, family members, security, and preferences.
        </p>
      </div>

      {/* Profile Summary Card */}
      <div className="bg-gradient-to-br from-[#A95724] via-[#75472F] to-[#35251E] rounded-[1.75rem] p-5 sm:p-7 text-white shadow-[0_18px_45px_-26px_rgba(74,47,32,.7)] flex flex-col sm:flex-row items-center justify-between gap-5 relative overflow-hidden">
        <div aria-hidden="true" className="absolute -right-12 -top-24 h-72 w-72 rounded-full border-[32px] border-white/[0.06]" />
        <div className="flex items-center gap-5 z-10">
          <div className="relative group shrink-0">
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
            <label title="Change profile photo" className="absolute -bottom-1 -right-1 bg-brand-500 hover:bg-brand-400 text-white p-2 rounded-xl cursor-pointer shadow-md transition-transform group-hover:scale-110">
              <Camera className="w-3.5 h-3.5" />
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </label>
          </div>

          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-orange-100 border border-white/15 mb-1.5">
              <Sparkles className="w-3 h-3 text-orange-200" /> Patient profile
            </div>
            <h2 className="text-xl font-extrabold tracking-tight">{fullName}</h2>
            <p className="text-xs text-teal-100/80 font-medium">{[emailAddress, mobileNumber].filter(Boolean).join(' • ')}</p>
            {(() => {
              // What doctors, labs and home care need from you, and what's still missing.
              const def = addresses.find((a) => a.isDefault) || addresses[0];
              const checks: [boolean, string, typeof activeSection][] = [
                [!!dob, 'date of birth', 'personal'], [!!gender, 'gender', 'personal'], [!!mobileNumber && !!emailAddress, 'mobile and email', 'contact'],
                [!!def && !!def.city && !!def.state && !!def.pincode, 'home address', 'addresses'],
                [!!health && (!!health.blood_group || health.no_known_allergies || (health.allergies || []).length > 0), 'blood group / allergies', 'health'],
                [!!health?.emergency_contact?.phone, 'emergency contact', 'health'],
              ];
              const done = checks.filter((x) => x[0]).length; const pct = Math.round((done / checks.length) * 100); const next = checks.find((x) => !x[0]);
              return (
                <div className="mt-3 max-w-sm" aria-label="Profile completeness">
                  <div className="flex items-center justify-between text-[11px] font-bold text-teal-100"><span>Profile {pct}% complete</span><span>{done}/{checks.length}</span></div>
                  <div className="h-2 rounded-full bg-black/20 mt-1.5 overflow-hidden"><div className="h-full rounded-full bg-emerald-300 transition-[width] duration-500" style={{ width: `${pct}%` }} /></div>
                  {next && <button type="button" onClick={() => setActiveSection(next[2])} className="mt-1 text-[11px] font-bold text-white underline underline-offset-2">Add your {next[1]} →</button>}
                </div>
              );
            })()}
          </div>
        </div>

        <div className="z-10 flex w-full flex-col gap-3 sm:w-auto sm:min-w-56 sm:items-end">
          <div className="flex items-center gap-2 self-start rounded-2xl border border-white/15 bg-white/[0.08] px-3 py-2 sm:self-auto">
            <ShieldCheck className="h-4 w-4 text-emerald-200" />
            <div><p className="text-xs font-bold">Your care details</p><p className="text-[10px] text-orange-50/75">Private and in your control</p></div>
          </div>
          {profilePhoto && (
            <button
              onClick={async () => {
                setProfilePhoto('');
                try { await updateProfileApi({ profilePicture: '' }); showToast('Profile photo removed.'); }
                catch { showToast('Failed to remove photo.'); }
              }}
              className="text-xs font-bold text-white bg-white/10 px-3 py-2 rounded-xl border border-white/15 hover:bg-white/20 transition-all"
            >
              Remove Photo
            </button>
          )}
        </div>
      </div>

      {/* Main Container Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[250px_minmax(0,1fr)] xl:grid-cols-[270px_minmax(0,1fr)] gap-4 lg:gap-6 items-start">
        
        {/* Navigation Sidebar / Tabs */}
        <div className="sticky top-3 z-10 flex gap-1 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/95 p-2 shadow-sm backdrop-blur lg:static lg:flex-col lg:gap-1 lg:overflow-visible">
          <p className="hidden px-3 pb-2 pt-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 lg:block">Profile sections</p>
          <button
            onClick={() => setActiveSection('personal')}
            className={`w-auto shrink-0 lg:w-full lg:shrink flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 text-left ${
              activeSection === 'personal'
                ? 'bg-brand-700 text-white shadow-sm ring-1 ring-brand-800/10'
                : 'text-slate-600 hover:bg-brand-50 hover:text-brand-800'
            }`}
          >
            <User className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Personal Information</span>
          </button>

          <button
            onClick={() => setActiveSection('contact')}
            className={`w-auto shrink-0 lg:w-full lg:shrink flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 text-left ${
              activeSection === 'contact'
                ? 'bg-brand-700 text-white shadow-sm ring-1 ring-brand-800/10'
                : 'text-slate-600 hover:bg-brand-50 hover:text-brand-800'
            }`}
          >
            <Phone className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Contact Information</span>
          </button>

          <button
            onClick={() => setActiveSection('addresses')}
            className={`w-auto shrink-0 lg:w-full lg:shrink flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 text-left ${
              activeSection === 'addresses'
                ? 'bg-brand-700 text-white shadow-sm ring-1 ring-brand-800/10'
                : 'text-slate-600 hover:bg-brand-50 hover:text-brand-800'
            }`}
          >
            <MapPin className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Address Management</span>
          </button>

          <button
            onClick={() => setActiveSection('family')}
            className={`w-auto shrink-0 lg:w-full lg:shrink flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 text-left ${
              activeSection === 'family'
                ? 'bg-brand-700 text-white shadow-sm ring-1 ring-brand-800/10'
                : 'text-slate-600 hover:bg-brand-50 hover:text-brand-800'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Family Members</span>
          </button>

          <button
            onClick={() => setActiveSection('health')}
            className={`w-auto shrink-0 lg:w-full lg:shrink flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 text-left ${
              activeSection === 'health'
                ? 'bg-brand-700 text-white shadow-sm ring-1 ring-brand-800/10'
                : 'text-slate-600 hover:bg-brand-50 hover:text-brand-800'
            }`}
          >
            <HeartPulse className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Health Profile</span>
          </button>

          <button
            onClick={() => setActiveSection('password')}
            className={`w-auto shrink-0 lg:w-full lg:shrink flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 text-left ${
              activeSection === 'password'
                ? 'bg-brand-700 text-white shadow-sm ring-1 ring-brand-800/10'
                : 'text-slate-600 hover:bg-brand-50 hover:text-brand-800'
            }`}
          >
            <Lock className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Change Password</span>
          </button>

          <button
            onClick={() => setActiveSection('settings')}
            className={`w-auto shrink-0 lg:w-full lg:shrink flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 text-left ${
              activeSection === 'settings'
                ? 'bg-brand-700 text-white shadow-sm ring-1 ring-brand-800/10'
                : 'text-slate-600 hover:bg-brand-50 hover:text-brand-800'
            }`}
          >
            <Globe className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Account Settings</span>
          </button>
        </div>

        {/* Section Detail Views */}
        <motion.div
          key={activeSection}
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.22, ease: 'easeOut' }}
          className="min-w-0 space-y-4"
        >
          
          {/* SECTION 1: Personal Information */}
          {activeSection === 'personal' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-7 space-y-5 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50"><User className="w-4 h-4 text-brand-700" /></span> Personal Information
                </h3>
                {!isEditingPersonal ? (
                  <button
                    onClick={() => setIsEditingPersonal(true)}
                    className="px-4 py-2 rounded-xl bg-brand-50 hover:bg-brand-100 font-bold text-xs text-brand-800 transition-colors flex items-center gap-1.5"
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
                    onChange={(e) => setFullName(personNameInput(e.target.value))}
                    className={`w-full p-3 rounded-xl font-bold text-sm text-slate-800 border transition-all ${
                      isEditingPersonal
                        ? 'bg-white border-brand-500 ring-2 ring-brand-500/15'
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
                          ? 'bg-white border-brand-500 ring-2 ring-brand-500/15'
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
                        ? 'bg-white border-brand-500 ring-2 ring-brand-500/15'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <option value="">Not set</option>
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
                      className="px-6 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 disabled:opacity-60 text-white font-bold shadow-sm transition-colors"
                    >
                      {savingPersonal ? 'Saving...' : 'Save Profile'}
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* SECTION 2: Contact Information (verified change) */}
          {activeSection === 'contact' && (
            <ContactSection phone={mobileNumber} email={emailAddress} toast={showToast}
              onChanged={(w, v) => {
                if (w === 'phone') setMobileNumber(v); else setEmailAddress(v);
                try { const u = JSON.parse(localStorage.getItem('vizito_user') || '{}'); localStorage.setItem('vizito_user', JSON.stringify({ ...u, ...(w === 'phone' ? { mobile: v } : { email: v }) })); } catch { /* non-fatal */ }
              }} />
          )}

          {/* SECTION 3: Address Management */}
          {activeSection === 'addresses' && (
            <AddressBook addresses={addresses} me={{ name: fullName, phone: mobileNumber }} onChanged={reloadAddresses} toast={showToast} />
          )}

          {/* SECTION 4: Family Members */}
          {activeSection === 'family' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-7 space-y-5 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50"><Users className="w-4 h-4 text-brand-700" /></span> Family members
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Manage family profiles available during healthcare bookings.</p>
                </div>
                <button
                  onClick={() => {
                    setFamilyForm({ name: '', dob: '', relationship: 'Father', gender: 'Male' });
                    setFamilyModal('new');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Add Family Member
                </button>
              </div>

              {familyMembers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {familyMembers.map((member) => (
                    <div
                      key={member.associationId}
                      className="p-4 rounded-2xl border border-slate-200/80 bg-white hover:border-brand-200 hover:shadow-sm transition-all flex items-center justify-between"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-slate-900 text-sm">{member.name}</h4>
                            <span className="text-[10px] font-black uppercase text-brand-800 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-100">
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

          {/* SECTION 5: Health Profile */}
          {activeSection === 'health' && <HealthProfileSection />}

          {/* SECTION 6: Change Password */}
          {activeSection === 'password' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-7 space-y-5 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50"><Lock className="w-4 h-4 text-brand-700" /></span> Change Password
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Update your password to keep your health account secure.</p>
              </div>

              {passwordError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs font-bold text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(240px,0.8fr)] gap-6 items-start">
              <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs max-w-xl">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Current password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full p-3 rounded-xl font-medium text-sm text-slate-800 border border-slate-200 bg-white focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">New password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full p-3 rounded-xl font-medium text-sm text-slate-800 border border-slate-200 bg-white focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Confirm new password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full p-3 rounded-xl font-medium text-sm text-slate-800 border border-slate-200 bg-white focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingPassword}
                  className="px-6 py-3 rounded-xl bg-brand-700 hover:bg-brand-800 disabled:opacity-60 text-white font-bold text-sm shadow-sm transition-all"
                >
                  {savingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </form>
              <aside className="rounded-2xl border border-brand-100 bg-brand-50/60 p-5">
                <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-white text-brand-700 shadow-sm"><ShieldCheck className="h-5 w-5" /></div>
                <h4 className="text-sm font-extrabold text-slate-900">Keep your account secure</h4>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">Choose a password that is hard to guess and unique to your Vizito account. We’ll check it against the password requirements before saving.</p>
              </aside>
              </div>
            </div>
          )}

          {/* SECTION 7: Account Settings & Logout */}
          {activeSection === 'settings' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-7 space-y-5 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50"><Globe className="w-4 h-4 text-brand-700" /></span> Account settings</h3>
                <p className="text-xs text-slate-500 mt-0.5">Language, where you’re signed in, and your account.</p>
              </div>
              <div className="space-y-4 text-xs">
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 sm:p-5">
                  <p className="font-extrabold text-slate-800 text-sm">Language</p>
                  <p className="text-slate-600 mt-1">Vizito is in <b>English</b>. Telugu and Hindi will be added once every medical screen has a reviewed translation, so instructions and reports are never mistranslated.</p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 sm:p-5 space-y-2">
                  <p className="font-extrabold text-slate-800 text-sm">Where you’re signed in</p>
                  <p className="text-slate-600">Your account can stay signed in on up to 5 devices. Lost a phone, or used a shared computer? Sign out everywhere else; this device stays signed in.</p>
                  <button type="button" disabled={signingOutOthers} onClick={async () => {
                    setSigningOutOthers(true);
                    try { const r = await logoutOtherDevicesApi(); showToast(r.signed_out ? `Signed out of ${r.signed_out} other device${r.signed_out === 1 ? '' : 's'}.` : 'You weren’t signed in anywhere else.'); }
                    catch { showToast('Could not sign out other devices. Please try again.'); } finally { setSigningOutOthers(false); }
                  }} className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-60">{signingOutOthers ? 'Signing out…' : 'Sign out of all other devices'}</button>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 sm:p-5 space-y-2">
                  <p className="font-extrabold text-slate-800 text-sm">Your data</p>
                  <p className="text-slate-600">Your records are shared only with the doctors, labs, pharmacies and home care you book. To get a copy of your data or close your account, contact us from <button type="button" onClick={() => navigate('/help')} className="font-bold text-teal-700 underline">Help & Support</button>.</p>
                </div>
                <button type="button" onClick={() => setShowLogoutDialog(true)}
                  className="w-full max-w-md flex items-center justify-center gap-2 p-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs border border-rose-200">
                  <LogOut className="w-4 h-4" /> Log out of this device
                </button>
              </div>
            </div>
          )}

        </motion.div>
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
                  onChange={(e) => setFamilyForm({ ...familyForm, name: personNameInput(e.target.value) })}
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
