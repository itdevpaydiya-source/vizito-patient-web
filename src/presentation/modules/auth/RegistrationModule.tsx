import React, { useState } from 'react';
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
  RefreshCw
} from 'lucide-react';
import { registerPatientApi, registerSendOtpApi, registerVerifyOtpApi } from '../../../services/authHelper';

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
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 3: Address Information State
  const [addressMode, setAddressMode] = useState<'auto' | 'manual'>('manual');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [isAddressSaved, setIsAddressSaved] = useState(false);

  // General Status & Errors
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation functions
  const validateMobile = (num: string) => /^[6-9]\d{9}$/.test(num.trim());
  const validateEmail = (mail: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail.trim());

  // --- STEP 1: SEND & VERIFY OTP ---
  const handleSendRegistrationOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (verificationType === 'mobile' && !validateMobile(mobileNumber)) {
      setErrorMessage('Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9');
      return;
    }
    if (verificationType === 'email' && !validateEmail(emailAddress)) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    try {
      const target = verificationType === 'mobile' ? mobileNumber : emailAddress;
      await registerSendOtpApi(target, verificationType);
      setIsOtpSent(true);
      setOtpTimer(300);
      setSuccessMessage(`OTP sent to ${verificationType === 'mobile' ? '+91 ' + mobileNumber : emailAddress}.`);
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
      const target = verificationType === 'mobile' ? mobileNumber : emailAddress;
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

    if (!fullName.trim() || fullName.trim().length < 2) {
      setErrorMessage('Full Name is required (minimum 2 characters)');
      return;
    }

    if (verificationType === 'mobile' && !validateMobile(mobileNumber)) {
      setErrorMessage('Valid Mobile Number is required');
      return;
    }

    if (verificationType === 'email' && !validateEmail(emailAddress)) {
      setErrorMessage('Valid Email Address is required');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage('Password is mandatory and must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Confirm Password must match Password');
      return;
    }

    setCurrentStep(3);
  };

  // --- STEP 3: ADDRESS AUTOMATIC CAPTURE & MANUAL ENTRY ---
  const handleAutoCaptureAddress = () => {
    setErrorMessage('');
    setSuccessMessage('');
    setIsDetectingLocation(true);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLatitude(lat);
          setLongitude(lng);

          try {
            let detectedStreet = '';
            let detectedCity = '';
            let detectedState = '';
            let detectedPincode = '';

            // 1. Primary High-Accuracy Reverse Geocoding via OpenStreetMap Nominatim (zoom=18 includes postal code)
            try {
              const nomRes = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
                { headers: { 'Accept-Language': 'en' } }
              );
              if (nomRes.ok) {
                const nomData = await nomRes.json();
                const addr = nomData.address || {};

                detectedStreet = [
                  addr.building,
                  addr.house_number,
                  addr.road,
                  addr.suburb || addr.neighbourhood || addr.residential
                ].filter(Boolean).join(', ');

                detectedCity = addr.city || addr.town || addr.city_district || addr.district || addr.county || '';
                detectedState = addr.state || '';

                if (addr.postcode) {
                  const cleanPin = String(addr.postcode).replace(/\D/g, '').slice(0, 6);
                  if (cleanPin.length === 6) detectedPincode = cleanPin;
                }
                if (!detectedPincode && nomData.display_name) {
                  const pinMatch = nomData.display_name.match(/\b([1-9]\d{5})\b/);
                  if (pinMatch) detectedPincode = pinMatch[1];
                }
              }
            } catch (nomErr) {
              console.warn('[handleAutoCaptureAddress] Nominatim error:', nomErr);
            }

            // 2. Secondary fallback via BigDataCloud to fill any remaining missing fields
            if (!detectedCity || !detectedState || !detectedPincode || !detectedStreet) {
              try {
                const bdcRes = await fetch(
                  `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
                );
                if (bdcRes.ok) {
                  const bdcData = await bdcRes.json();
                  if (!detectedStreet) detectedStreet = [bdcData.locality, bdcData.principalSubdivisionCity].filter(Boolean).join(', ');
                  if (!detectedCity) detectedCity = bdcData.city || bdcData.locality || bdcData.principalSubdivisionCity || '';
                  if (!detectedState) detectedState = bdcData.principalSubdivision || '';
                  if (!detectedPincode && bdcData.postcode) {
                    const cleanPin = String(bdcData.postcode).replace(/\D/g, '').slice(0, 6);
                    if (cleanPin.length === 6) detectedPincode = cleanPin;
                  }
                }
              } catch (bdcErr) {
                console.warn('[handleAutoCaptureAddress] BigDataCloud error:', bdcErr);
              }
            }

            // 3. If Pincode is still missing but we have City/Area, query Nominatim search for the pincode
            if (!detectedPincode && (detectedCity || detectedStreet)) {
              try {
                const searchQ = [detectedStreet, detectedCity, detectedState].filter(Boolean).join(', ');
                const searchRes = await fetch(
                  `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQ)}&format=json&addressdetails=1&limit=1`
                );
                if (searchRes.ok) {
                  const searchData = await searchRes.json();
                  if (searchData && searchData[0]?.address?.postcode) {
                    const cleanPin = String(searchData[0].address.postcode).replace(/\D/g, '').slice(0, 6);
                    if (cleanPin.length === 6) detectedPincode = cleanPin;
                  }
                }
              } catch (searchErr) {}
            }

            if (detectedStreet && !street) setStreet(detectedStreet);
            if (detectedCity) setCity(detectedCity);
            if (detectedState) setState(detectedState);
            if (detectedPincode) setPincode(detectedPincode);

            setSuccessMessage('Location detected and all address fields auto-filled! You can edit any field below.');
          } catch (geoErr) {
            console.warn('[handleAutoCaptureAddress] Reverse geocode error:', geoErr);
            setSuccessMessage('Location coordinates captured. Please enter your address details below.');
          } finally {
            setIsDetectingLocation(false);
            setAddressMode('manual');
          }
        },
        () => {
          setIsDetectingLocation(false);
          setAddressMode('manual');
          setErrorMessage('Could not detect your location automatically. Please enter your address manually.');
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    } else {
      setIsDetectingLocation(false);
      setErrorMessage('Geolocation is not supported by your browser. Please enter address manually.');
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

    if (!street.trim() || !city.trim() || !state.trim() || !pincode.trim()) {
      setErrorMessage('Please fill in all mandatory address fields before proceeding.');
      return;
    }

    if (pincode.trim().length !== 6) {
      setErrorMessage('Please enter a valid 6-digit pincode.');
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
        phone: mobileNumber,
        email: emailAddress || undefined,
        password,
        // Backend-authoritative proof that the phone/email was OTP-verified (Step 1).
        registration_token: registrationToken,
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

      // Auto Login & Redirect to Dashboard
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
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span className="flex-1">{errorMessage}</span>
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
                          maxLength={10}
                          value={mobileNumber}
                          onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
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
                          value={emailAddress}
                          onChange={(e) => setEmailAddress(e.target.value)}
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
            <form onSubmit={handlePersonalInfoSubmit} className="space-y-4">
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
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Sarah Connor"
                  className="w-full px-3 py-3 text-xs font-semibold text-slate-800 border border-slate-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number *</label>
                  <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                    <span className="px-3 py-3 border-r border-slate-200 text-slate-600 font-bold text-xs">+91</span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                      placeholder="10-digit mobile"
                      className="flex-1 px-3 py-3 text-xs font-semibold text-slate-800 bg-transparent outline-none"
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
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    placeholder="sarah@example.com"
                    className="w-full px-3 py-3 text-xs font-semibold text-slate-800 border border-slate-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
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
                    placeholder="Minimum 6 characters"
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
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Confirm Password *</label>
                <div className="flex items-center border border-slate-200 rounded-xl px-3 bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
                  <Lock className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="flex-1 py-3 text-xs font-semibold text-slate-800 bg-transparent outline-none"
                    required
                  />
                </div>
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
                  onClick={handleAutoCaptureAddress}
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
              <form onSubmit={handleSaveAddress} className="space-y-3 pt-2">
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
                        setCity(e.target.value);
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
                        setState(e.target.value);
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
                      maxLength={6}
                      value={pincode}
                      onChange={(e) => handlePincodeChange(e.target.value)}
                      placeholder="6-digit Pincode"
                      className="w-full px-3 py-2.5 text-xs font-semibold text-slate-800 border border-slate-200 rounded-xl focus:border-primary outline-none"
                      required
                    />
                  </div>

                  {latitude && longitude && (
                    <div className="flex flex-col justify-center text-[10px] text-slate-500 font-semibold bg-slate-50 px-3 py-1 rounded-xl border border-slate-200">
                      <span>Lat: {latitude.toFixed(4)}</span>
                      <span>Lng: {longitude.toFixed(4)}</span>
                    </div>
                  )}
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
    </div>
  );
}
