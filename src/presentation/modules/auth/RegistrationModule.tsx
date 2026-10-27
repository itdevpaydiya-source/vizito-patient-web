import ServiceLocationDialog from '../../components/location/ServiceLocationDialog';
import React, { useState } from 'react';
import { personNameInput } from '../../../utils/inputFilters';
import {
  ArrowLeft,
  User,
  MapPin,
  CheckCircle2,
  Lock,
  Smartphone,
  Mail,
  ShieldCheck,
  Navigation,
  Send,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
  Check,
  X
} from 'lucide-react';
import { registerPatientApi, registerSendOtpApi, registerVerifyOtpApi } from '../../../services/authHelper';
import { ageFromDob, ageLabelFromDob } from '../../../services/familyHelper';
import MapPinPicker from '../../components/location/MapPinPicker';
import { addressAt, type SearchArea, LOCATE_ERROR_TEXT, type LocateError } from '../../../services/location';
import { isStrongPassword, PASSWORD_POLICY_MESSAGE, PASSWORD_RULES } from '../../../utils/passwordPolicy';
import {
  validatePersonName,
  validateDob,
  validatePinCode,
} from '../../../utils/validators/india';
import {
  isValidIndianMobile,
  isValidEmail,
  normalizeMobile,
  sanitizeMobileInput,
  IDENTIFIER_MESSAGES,
} from '../../../utils/identifier';

interface RegistrationModuleProps {
  onBackToLogin?: () => void;
  onRegisterSuccess: (userData: any) => void;
}

type RegStep = 1 | 2 | 3 | 4;
type VerificationType = 'mobile' | 'email';

export default function RegistrationModule({
  onBackToLogin,
  onRegisterSuccess
}: RegistrationModuleProps) {
  const [currentStep, setCurrentStep] = useState<RegStep>(1);

  // Step 1: Verification State
  const [verificationType, setVerificationType] = useState<VerificationType>('mobile');
  const [mobileNumber, setMobileNumber] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [otpTimer, setOtpTimer] = useState(300);
  // Backend-issued proof of contact verification. Held only for the registration flow — it is
  // NOT a patient auth token and must never be stored in vizito_token.
  const [registrationToken, setRegistrationToken] = useState('');

  // Step 2: Personal Information State
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Step 3: Address Information State
  const [addressMode, setAddressMode] = useState<'auto' | 'manual'>('manual');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationDialogOpen,setLocationDialogOpen]=useState(false);
  const [isAddressSaved, setIsAddressSaved] = useState(false);

  // General Status & Errors
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const derivedAgeLabel = ageLabelFromDob(dateOfBirth || null);
  const sanitizeMobile = (raw: string) => sanitizeMobileInput(raw);

  // --- STEP 1: SEND & VERIFY OTP ---
  const handleSendRegistrationOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (verificationType === 'mobile') {
      if (!isValidIndianMobile(mobileNumber)) {
        setErrorMessage(IDENTIFIER_MESSAGES.MOBILE_INVALID);
        return;
      }
    }
    if (verificationType === 'email') {
      if (!isValidEmail(emailAddress)) {
        setErrorMessage(IDENTIFIER_MESSAGES.EMAIL_INVALID);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const target = verificationType === 'mobile' ? normalizeMobile(mobileNumber) : emailAddress.trim().toLowerCase();
      const res = await registerSendOtpApi(target, verificationType);
      // No SMS/email provider is wired in yet, so the backend returns the OTP directly in dev —
      // pre-fill it instead of making the user read it off the API response and retype it.
      const devOtp = res?.dev_otp || res?.otp || '';
      if (devOtp) setOtpCode(String(devOtp));
      setIsOtpSent(true);
      setOtpTimer(300);
      setSuccessMessage(`OTP sent to ${verificationType === 'mobile' ? '+91 ' + normalizeMobile(mobileNumber) : emailAddress.trim().toLowerCase()}.${devOtp ? ` Test mode: your code is ${devOtp}` : ''}`);
    } catch (err: any) {
      // 409 = the phone/email already belongs to a patient — steer the user to login.
      const status = err?.response?.status;
      const msg = err?.response?.data?.message;
      setErrorMessage(status === 409 ? (msg || 'An account already exists. Please log in instead.') : (msg || 'Failed to send OTP. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyRegistrationOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (otpCode.length !== 6) {
      setErrorMessage('Please enter the mandatory 6-digit OTP code');
      return;
    }

    setIsSubmitting(true);
    try {
      const target = verificationType === 'mobile' ? normalizeMobile(mobileNumber) : emailAddress.trim().toLowerCase();
      const result = await registerVerifyOtpApi(target, otpCode, verificationType);
      // Store the backend proof for the final registration request only (never as an auth token).
      setRegistrationToken(result?.registration_token || '');
      setIsOtpVerified(true);
      setSuccessMessage('Contact verified successfully! Proceeding to Personal Info...');
      setTimeout(() => {
        setErrorMessage('');
        setSuccessMessage('');
        setCurrentStep(2);
      }, 800);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Invalid or expired OTP code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- STEP 2: PERSONAL INFORMATION ---
  const handlePersonalInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const problems: string[] = [];
    const nameVal = validatePersonName(fullName);
    if (!nameVal.ok) problems.push(nameVal.message);
    if (dateOfBirth) {
      const dobVal = validateDob(dateOfBirth);
      if (!dobVal.ok) problems.push(dobVal.message);
    }
    if (verificationType === 'mobile') {
      if (!isValidIndianMobile(mobileNumber)) problems.push(IDENTIFIER_MESSAGES.MOBILE_INVALID);
    }
    if (verificationType === 'email') {
      if (!isValidEmail(emailAddress)) problems.push(IDENTIFIER_MESSAGES.EMAIL_INVALID);
    } else if (verificationType === 'mobile' && emailAddress.trim()) {
      if (!isValidEmail(emailAddress)) problems.push(IDENTIFIER_MESSAGES.EMAIL_INVALID);
    }
    if (!password) problems.push('Create a password.');
    else if (!isStrongPassword(password)) problems.push(PASSWORD_POLICY_MESSAGE);
    if (!confirmPassword) problems.push('Re-enter the password to confirm it.');
    else if (password !== confirmPassword) problems.push('Confirm Password must match Password.');
    if (problems.length) {
      setErrorMessage(problems.join('\n'));
      return;
    }

    setCurrentStep(3);
  };

  // --- STEP 3: ADDRESS AUTOMATIC CAPTURE & MANUAL ENTRY ---
  const handleAutoCaptureAddress = async (here:SearchArea|null) => {
    if(!here){setLatitude(undefined);setLongitude(undefined);return;}
    setErrorMessage('');
    setSuccessMessage('');
    setIsDetectingLocation(true);
    try {
      setLatitude(here.lat);
      setLongitude(here.lng);
      // A laptop without GPS reports a Wi-Fi / internet-provider position that can be kilometres off.
      const rough = !here.accuracy || here.accuracy > 500;
      const near = here.accuracy ? (here.accuracy >= 1000 ? `about ${Math.round(here.accuracy / 1000)} km` : `about ${here.accuracy} m`) : '';
      let addr: Awaited<ReturnType<typeof addressAt>> = null;
      try { addr = await addressAt(here); } catch { /* typed by hand below */ }
      if (addr) {
        // A fresh detection replaces what an earlier one filled in.
        setStreet([addr.line1, addr.area].filter(Boolean).join(', '));
        setCity(addr.city);
        setState(addr.state);
        setPincode(addr.pincode);
      }
      if (!addr) setErrorMessage('Location found, but we could not read the address there. Please type it below.');
      else if (rough) setErrorMessage(`Your device gave only an approximate location${near ? ` (${near})` : ''}. Please check the address and correct it, especially the house number and PIN code.`);
      else setSuccessMessage(`Address filled from your location${near ? ` (accurate to ${near})` : ''}. Add your house / flat number and check every field.`);
    } catch (e) {
      setErrorMessage(LOCATE_ERROR_TEXT[e as LocateError] || 'Could not detect your location. Please enter your address manually.');
    } finally {
      setIsDetectingLocation(false);
      setAddressMode('manual');
    }
  };

  const handlePincodeChange = async (val: string) => {
    const cleanPin = val.replace(/\D/g, '').slice(0, 6);
    setPincode(cleanPin);
    if (errorMessage) setErrorMessage('');

    if (cleanPin.length === 6) {
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${cleanPin}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
            const po = data[0].PostOffice[0];
            if (po.District) setCity(po.District);
            if (po.State) setState(po.State);
          }
        }
      } catch (pinErr) {
        console.warn('[handlePincodeChange] Postal API lookup error:', pinErr);
      }
    }
  };

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const problems: string[] = [];
    if (street.trim().length < 3) problems.push('Enter the house / street address.');
    if (!city.trim()) problems.push('Enter the city.');
    if (!state.trim()) problems.push('Enter the state.');
    const pinVal = validatePinCode(pincode);
    if (!pinVal.ok) problems.push(pinVal.message);
    if (problems.length) {
      setErrorMessage(problems.join('\n'));
      return;
    }

    setIsAddressSaved(true);
    setErrorMessage('');
    setSuccessMessage('');
    setCurrentStep(4);
  };

  // --- STEP 4: COMPLETE REGISTRATION ---
  const handleFinalCompleteRegistration = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!isAddressSaved && (!street || !city || !state || !pincode)) {
      setErrorMessage('At least one valid address is required before registration completes.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await registerPatientApi({
        full_name: fullName,
        phone: normalizeMobile(mobileNumber),
        email: emailAddress ? emailAddress.trim().toLowerCase() : undefined,
        password,
        // Backend-authoritative proof that the phone/email was OTP-verified (Step 1).
        registration_token: registrationToken,
        date_of_birth: dateOfBirth || undefined,
        gender: gender || undefined,
        address: {
          street,
          city,
          state,
          pincode,
          latitude,
          longitude,
          is_default: true
        }
      });

      // Use only the real backend response — no fabricated identity/token.
      const userData = {
        patient_id: result.patient_id,
        fullName: result.full_name || fullName,
        mobile: result.mobile || mobileNumber,
        email: result.email || emailAddress || '',
        role: result.role || 'patient',
        token: result.access_token || result.token
      };

      // Auto Login & Redirect to Dashboard, which greets the new patient once.
      try { sessionStorage.setItem('vizito_welcome', '1'); } catch { /* no storage */ }
      onRegisterSuccess(userData);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Registration failed. Please check your information and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepsList = [
    { id: 1, label: 'Verification' },
    { id: 2, label: 'Personal Info' },
    { id: 3, label: 'Address Info' },
    { id: 4, label: 'Complete' }
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-slate-50/80 p-4 md:p-6 font-sans">
      <div className="w-full max-w-xl mx-auto my-auto">
        
        {/* Navigation Back Button */}
        <div className="w-full flex justify-start mb-4">
          <button
            onClick={() => {
              if (currentStep === 1) {
                if (onBackToLogin) onBackToLogin();
              } else {
                setCurrentStep((prev) => (prev - 1) as RegStep);
                setErrorMessage('');
                setSuccessMessage('');
              }
            }}
            className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-700 text-xs font-bold uppercase transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            {currentStep === 1 ? 'Back to Login' : `Back to Step ${currentStep - 1}`}
          </button>
        </div>

        {/* Card Panel */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-6 md:p-8 relative overflow-hidden">
          
          {/* Header Accent Bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-secondary to-teal-500"></div>

          {/* Stepper Header Bar */}
          <div className="flex items-center justify-between mb-8 overflow-x-auto pb-2 scrollbar-none border-b border-slate-100">
            {stepsList.map((s, idx) => (
              <React.Fragment key={s.id}>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                      currentStep === s.id
                        ? 'bg-primary text-white shadow-md shadow-primary/20'
                        : currentStep > s.id
                        ? 'bg-emerald-100 text-emerald-700 font-extrabold'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {currentStep > s.id ? '✓' : s.id}
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      currentStep === s.id ? 'text-slate-800' : 'text-slate-400'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {idx < stepsList.length - 1 && (
                  <div
                    className={`h-0.5 w-6 md:w-10 shrink-0 ${
                      currentStep > s.id ? 'bg-emerald-300' : 'bg-slate-100'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Error Message Banner */}
          {errorMessage && (
            <div role="alert" className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-px" />
              {errorMessage.includes('\n') ? (
                <div className="flex-1">
                  <p className="mb-1">Please fix these before continuing:</p>
                  <ul className="list-disc pl-4 space-y-0.5 font-semibold">
                    {errorMessage.split('\n').map((line) => <li key={line}>{line}</li>)}
                  </ul>
                </div>
              ) : (
                <span className="flex-1">{errorMessage}</span>
              )}
            </div>
          )}

          {/* Success Message Banner */}
          {successMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="flex-1">{successMessage}</span>
            </div>
          )}

          {/* ── STEP 1: VERIFY MOBILE OR EMAIL VIA OTP ── */}
          {currentStep === 1 && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" /> Verify Mobile or Email
                </h2>
                <p className="text-slate-500 text-xs mt-1">
                  Start registration by verifying your contact number or email address with an OTP.
                </p>
              </div>

              {/* Selector for Mobile vs Email verification */}
              <div className="flex bg-slate-100 p-1 rounded-xl gap-1 mb-5">
                <button
                  type="button"
                  onClick={() => {
                    setVerificationType('mobile');
                    setIsOtpSent(false);
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    verificationType === 'mobile'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Smartphone className="w-4 h-4" /> Mobile OTP
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVerificationType('email');
                    setIsOtpSent(false);
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    verificationType === 'email'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Mail className="w-4 h-4" /> Email OTP
                </button>
              </div>

              {!isOtpSent ? (
                <form onSubmit={handleSendRegistrationOtp} className="space-y-4">
                  {verificationType === 'mobile' ? (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number *</label>
                      <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
                        <span className="px-3 py-3 bg-slate-50 border-r border-slate-200 text-slate-700 font-bold text-xs">
                          +91
                        </span>
                        <input
                          type="tel"
                          inputMode="tel"
                          maxLength={10}
                          value={mobileNumber}
                          onChange={(e) => setMobileNumber(sanitizeMobile(e.target.value))}
                          onBlur={() => {
                            if (mobileNumber && !isValidIndianMobile(mobileNumber)) {
                              setErrorMessage(IDENTIFIER_MESSAGES.MOBILE_INVALID);
                            }
                          }}
                          placeholder="10-digit mobile number"
                          className="flex-1 px-3 py-3 text-xs font-semibold text-slate-800 outline-none"
                          required
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                      <div className="flex items-center border border-slate-200 rounded-xl px-3 bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
                        <Mail className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                        <input
                          type="email"
                          inputMode="email"
                          value={emailAddress}
                          onChange={(e) => setEmailAddress(e.target.value)}
                          onBlur={() => {
                            if (emailAddress && !isValidEmail(emailAddress)) {
                              setErrorMessage(IDENTIFIER_MESSAGES.EMAIL_INVALID);
                            }
                          }}
                          placeholder="abc@gmail.com"
                          className="flex-1 py-3 text-xs font-semibold text-slate-800 outline-none"
                          required
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 rounded-xl font-bold text-xs shadow-md shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 mt-2"
                  >
                    {isSubmitting ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <>
                        <span>Send Verification OTP</span>
                        <Send className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyRegistrationOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Enter 6-Digit OTP sent to {verificationType === 'mobile' ? mobileNumber : emailAddress} *
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 123456"
                      className="w-full text-center text-xl font-mono font-bold tracking-widest py-3 border border-slate-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => setIsOtpSent(false)}
                      className="text-slate-500 font-semibold hover:underline"
                    >
                      Change Contact
                    </button>
                    <button
                      type="button"
                      onClick={handleSendRegistrationOtp}
                      className="text-primary font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" /> Resend OTP
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 rounded-xl font-bold text-xs shadow-md shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <span>Verify OTP &amp; Continue</span>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ── STEP 2: PERSONAL INFORMATION ── */}
          {currentStep === 2 && (
            <form onSubmit={handlePersonalInfoSubmit} noValidate className="space-y-4">
              <div className="mb-4">
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" /> Personal Information
                </h2>
                <p className="text-slate-500 text-xs mt-1">
                  Provide your basic personal details and account security password.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(personNameInput(e.target.value))}
                  onBlur={() => {
                    if (fullName) {
                      const v = validatePersonName(fullName);
                      if (!v.ok) setErrorMessage(v.message);
                    }
                  }}
                  placeholder="e.g. Sarah Connor"
                  className="w-full px-3 py-3 text-xs font-semibold text-slate-800 border border-slate-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    onBlur={() => {
                      if (dateOfBirth) {
                        const v = validateDob(dateOfBirth);
                        if (!v.ok) setErrorMessage(v.message);
                      }
                    }}
                    className="w-full px-3 py-3 text-xs font-semibold text-slate-800 border border-slate-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Age</label>
                  <div className="w-full px-3 py-3 text-xs font-semibold text-slate-500 border border-slate-200 rounded-xl bg-slate-50">
                    {derivedAgeLabel || 'Auto-calculated from date of birth'}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3 py-3 text-xs font-semibold text-slate-800 border border-slate-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none bg-white"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number *</label>
                  <div className={`flex items-center border border-slate-200 rounded-xl overflow-hidden ${
                    verificationType === 'mobile' && isOtpVerified ? 'bg-slate-50' : 'bg-white'
                  }`}>
                    <span className="px-3 py-3 border-r border-slate-200 text-slate-600 font-bold text-xs">+91</span>
                    <input
                      type="tel"
                      inputMode="tel"
                      maxLength={10}
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(sanitizeMobile(e.target.value))}
                      onBlur={() => {
                        if (mobileNumber && !isValidIndianMobile(mobileNumber)) {
                          setErrorMessage(IDENTIFIER_MESSAGES.MOBILE_INVALID);
                        }
                      }}
                      placeholder="10-digit mobile"
                      // A mobile number verified via OTP in Step 1 must not be silently swappable
                      // here for a different, unverified one while still showing "Verified via OTP".
                      disabled={verificationType === 'mobile' && isOtpVerified}
                      className="flex-1 px-3 py-3 text-xs font-semibold text-slate-800 bg-transparent outline-none disabled:cursor-not-allowed disabled:text-slate-500"
                      required
                    />
                  </div>
                  {verificationType === 'mobile' && isOtpVerified && (
                    <span className="text-[10px] text-emerald-600 font-bold mt-1 inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Verified via OTP
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Address {verificationType === 'email' ? '*' : '(Optional)'}
                  </label>
                  <input
                    type="email"
                    inputMode="email"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    onBlur={() => {
                      if (emailAddress && !isValidEmail(emailAddress)) {
                        setErrorMessage(IDENTIFIER_MESSAGES.EMAIL_INVALID);
                      }
                    }}
                    placeholder="sarah@example.com"
                    // Same reasoning as the mobile field above — an OTP-verified email must not be
                    // editable here while the "Verified via OTP" badge still shows underneath it.
                    disabled={verificationType === 'email' && isOtpVerified}
                    className={`w-full px-3 py-3 text-xs font-semibold border rounded-xl outline-none disabled:cursor-not-allowed ${
                      verificationType === 'email' && isOtpVerified
                        ? 'bg-slate-50 border-slate-200 text-slate-500'
                        : 'bg-white border-slate-200 text-slate-800 focus:border-primary focus:ring-2 focus:ring-primary/10'
                    }`}
                    required={verificationType === 'email'}
                  />
                  {verificationType === 'email' && isOtpVerified && (
                    <span className="text-[10px] text-emerald-600 font-bold mt-1 inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Verified via OTP
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Create Password *</label>
                <div className="relative flex items-center border border-slate-200 rounded-xl px-3 bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
                  <Lock className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    aria-label="Create password"
                    aria-describedby="pw-rules"
                    className="flex-1 py-3 text-xs font-semibold text-slate-800 bg-transparent outline-none pr-8"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <ul id="pw-rules" className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1" aria-label="Password requirements">
                  {PASSWORD_RULES.map((rule) => {
                    const ok = rule.test(password);
                    return (
                      <li key={rule.label} className={`flex items-center gap-1.5 text-[11px] font-semibold ${ok ? 'text-emerald-600' : 'text-slate-400'}`}>
                        <Check className={`w-3.5 h-3.5 ${ok ? 'opacity-100' : 'opacity-30'}`} />
                        {rule.label}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Confirm Password *</label>
                <div className="flex items-center border border-slate-200 rounded-xl px-3 bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
                  <Lock className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    aria-label="Confirm password"
                    className="flex-1 py-3 text-xs font-semibold text-slate-800 bg-transparent outline-none"
                    required
                  />
                  <button type="button" onClick={() => setShowConfirm((v) => !v)} aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'} className="text-slate-400 hover:text-slate-600 p-1">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && (
                  <p role="status" className={`mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold ${confirmPassword === password ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {confirmPassword === password ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    {confirmPassword === password ? 'Passwords match' : 'Passwords do not match'}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 rounded-xl font-bold text-xs shadow-md shadow-primary/20 cursor-pointer transition-all mt-4"
              >
                Proceed to Address Information
              </button>
            </form>
          )}

          {/* ── STEP 3: ADDRESS INFORMATION (AUTO CAPTURE OR MANUAL ENTRY) ── */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="mb-4">
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" /> Address Information
                </h2>
                <p className="text-slate-500 text-xs mt-1">
                  At least one valid address is required before registration completes. You can capture automatically or enter manually.
                </p>
              </div>

              {/* Action options: Auto capture vs Manual Entry */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  type="button"
                  onClick={()=>setLocationDialogOpen(true)}
                  disabled={isDetectingLocation}
                  className="p-3.5 rounded-2xl border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary font-bold text-xs flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                >
                  {isDetectingLocation ? (
                    <span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <Navigation className="w-5 h-5" />
                      <span>Auto Capture Location</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAddressMode('manual');
                    setSuccessMessage('');
                  }}
                  className={`p-3.5 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    addressMode === 'manual'
                      ? 'border-slate-800 bg-slate-800 text-white shadow-md'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <MapPin className="w-5 h-5" />
                  <span>Manual Address Entry</span>
                </button>
              </div>

              {/* Address Form (Editable regardless of auto/manual mode) */}
              <form onSubmit={handleSaveAddress} noValidate className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Flat / House No / Street Address *</label>
                  <input
                    type="text"
                    value={street}
                    onChange={(e) => {
                      setStreet(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder="House/Flat No, Street, Area"
                    className="w-full px-3 py-2.5 text-xs font-semibold text-slate-800 border border-slate-200 rounded-xl focus:border-primary outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">City *</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => {
                        setCity(personNameInput(e.target.value));
                        if (errorMessage) setErrorMessage('');
                      }}
                      placeholder="City"
                      className="w-full px-3 py-2.5 text-xs font-semibold text-slate-800 border border-slate-200 rounded-xl focus:border-primary outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">State *</label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => {
                        setState(personNameInput(e.target.value));
                        if (errorMessage) setErrorMessage('');
                      }}
                      placeholder="State"
                      className="w-full px-3 py-2.5 text-xs font-semibold text-slate-800 border border-slate-200 rounded-xl focus:border-primary outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Pincode *</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={pincode}
                      onChange={(e) => handlePincodeChange(e.target.value)}
                      onBlur={() => {
                        if (pincode) {
                          const v = validatePinCode(pincode);
                          if (!v.ok) setErrorMessage(v.message);
                        }
                      }}
                      placeholder="6-digit Pincode"
                      className="w-full px-3 py-2.5 text-xs font-semibold text-slate-800 border border-slate-200 rounded-xl focus:border-primary outline-none"
                      required
                    />
                  </div>

                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                  <p className="text-xs font-bold text-slate-800">Pin your home on the map <span className="font-semibold text-slate-500">(recommended)</span></p>
                  <p className="text-[11px] text-slate-500">At home now? Tap “I’m here now”. Otherwise search, or tap and drag the pin onto your door.</p>
                  <MapPinPicker key={latitude != null && longitude != null ? `${latitude},${longitude}` : 'none'}
                    value={latitude != null && longitude != null ? { lat: latitude, lng: longitude } : null}
                    placeName="your home" hint="Lab collectors, nurses and delivery staff use this pin to reach your door."
                    address={[street, city, state, pincode].filter(Boolean).join(', ')}
                    onChange={(p) => { setLatitude(p ? p.lat : undefined); setLongitude(p ? p.lng : undefined); }}
                    onUseAddress={(a) => { setStreet(a.line1 || a.area ? [a.line1, a.area].filter(Boolean).join(', ') : street); if (a.city) setCity(a.city); if (a.state) setState(a.state); if (a.pincode) setPincode(a.pincode); }} />
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage('');
                      setCurrentStep(2);
                    }}
                    className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold text-xs cursor-pointer transition-all"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-primary hover:bg-primary-hover text-white py-3 rounded-xl font-bold text-xs shadow-md shadow-primary/20 cursor-pointer transition-all"
                  >
                    Proceed to Review
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── STEP 4: REGISTRATION COMPLETION ── */}
          {currentStep === 4 && (
            <div className="space-y-5">
              <div className="mb-4">
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Review &amp; Complete Registration
                </h2>
                <p className="text-slate-500 text-xs mt-1">
                  Please review your details before submitting your registration.
                </p>
              </div>

              {/* Patient Details Summary */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-semibold">Full Name</span>
                  <span className="font-extrabold text-slate-800">{fullName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-semibold">Mobile</span>
                  <span className="font-extrabold text-slate-800">+91 {mobileNumber}</span>
                </div>
                {dateOfBirth && (
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500 font-semibold">Date of Birth</span>
                    <span className="font-extrabold text-slate-800">
                      {dateOfBirth}{derivedAgeLabel ? ` (${derivedAgeLabel})` : ''}
                    </span>
                  </div>
                )}
                {gender && (
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500 font-semibold">Gender</span>
                    <span className="font-extrabold text-slate-800">{gender}</span>
                  </div>
                )}
                {emailAddress && (
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500 font-semibold">Email</span>
                    <span className="font-extrabold text-slate-800">{emailAddress}</span>
                  </div>
                )}
                <div className="pt-1">
                  <span className="text-slate-500 font-semibold block mb-1">Primary Saved Address</span>
                  <span className="font-bold text-slate-700 block bg-white p-2.5 rounded-xl border border-slate-200">
                    {street}, {city}, {state} - {pincode}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleFinalCompleteRegistration}
                disabled={isSubmitting}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <span>Complete Registration &amp; Enter Dashboard</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}

        </div>

      </div>
      {locationDialogOpen&&<ServiceLocationDialog context="address" initialArea={null} onClose={()=>setLocationDialogOpen(false)} onApply={a=>void handleAutoCaptureAddress(a)}/>}
    </div>
  );
}
