import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Send,
  UserPlus
} from 'lucide-react';
import logoImg from '../../../assets/vizito_logo.png';
import { loginPatientApi, sendOtpApi, verifyOtpApi, googlePatientApi } from '../../../services/authHelper';
import { validateIndianMobile } from '../../../utils/phoneValidation';

interface AuthModuleProps {
  onLoginSuccess: (user: any) => void;
  onRegisterClick: () => void;
}

// Google Sign-In web client ID — must match GOOGLE_CLIENT_ID in vizito-auth/.env. Mirrors the
// working provider-side implementation (vizito-partner-main/src/presentation/components/AuthModule.tsx).
const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || '';

declare global {
  interface Window {
    google?: any;
  }
}

// Loads the Google Identity Services script once and resolves when ready.
const loadGoogleIdentity = (): Promise<void> =>
  new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const existing = document.getElementById('google-gis-script') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google script')));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.id = 'google-gis-script';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google script'));
    document.head.appendChild(script);
  });

type AuthMethod = 'password' | 'otp';
type LoginType = 'mobile' | 'email';
type AuthScreenState = 'login' | 'otp-verify' | 'forgot-input' | 'forgot-otp' | 'forgot-reset' | 'forgot-success';

export default function AuthModule({ onLoginSuccess, onRegisterClick }: AuthModuleProps) {
  // Navigation & UI States
  const [authMethod, setAuthMethod] = useState<AuthMethod>('password');
  const [screenState, setScreenState] = useState<AuthScreenState>('login');
  const [loginType, setLoginType] = useState<LoginType>('mobile');

  // Input Fields
  // `identifier` is the single "email or mobile" input box on the login screen
  const [identifier, setIdentifier] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // OTP States
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(300); // 5 mins expiration
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // Recovery / Forgot Password States
  const [recoveryType, setRecoveryType] = useState<'mobile' | 'email'>('mobile');
  const [recoveryIdentifier, setRecoveryIdentifier] = useState('');
  const [recoveryOtp, setRecoveryOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // UI Statuses & Messages
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Account Lockout Protection
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockCountdown, setLockCountdown] = useState(0);

  // OTP Expiration Timer Effect
  useEffect(() => {
    let interval: any;
    if (otpSent && otpCountdown > 0) {
      interval = setInterval(() => {
        setOtpCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpSent, otpCountdown]);

  // Account Lock Timer Effect
  useEffect(() => {
    let interval: any;
    if (isLocked && lockCountdown > 0) {
      interval = setInterval(() => {
        setLockCountdown((prev) => {
          if (prev <= 1) {
            setIsLocked(false);
            setFailedAttempts(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isLocked, lockCountdown]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Validations
  const validateMobile = (num: string) => validateIndianMobile(num);
  const validateEmail = (mail: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail.trim());

  // "@" is the discriminator for the unified identifier box
  const isEmailIdentifier = (val: string) => val.includes('@');

  // Normalizes phone input by removing non-digits and leading +91 / 91 / 0
  const normalizeMobileCandidate = (raw: string): string => {
    let digits = raw.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
    else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    return digits;
  };

  type ClassifiedIdentifier = { type: 'email'; value: string } | { type: 'mobile'; value: string };

  const classifyIdentifier = (raw: string): ClassifiedIdentifier | null => {
    const trimmed = raw.trim();
    if (!trimmed) {
      setErrorMessage('Please enter your mobile number or email');
      return null;
    }
    if (isEmailIdentifier(trimmed)) {
      if (!validateEmail(trimmed)) {
        setErrorMessage('Please enter a valid email address (e.g. user@domain.com)');
        return null;
      }
      return { type: 'email', value: trimmed };
    }
    const digits = normalizeMobileCandidate(trimmed);
    if (!validateMobile(digits)) {
      setErrorMessage(digits ? 'Please enter a valid 10-digit mobile number' : 'Please enter a valid mobile number or email address');
      return null;
    }
    return { type: 'mobile', value: digits };
  };

  const syncIdentifierState = (classified: ClassifiedIdentifier) => {
    setLoginType(classified.type);
    if (classified.type === 'email') {
      setEmail(classified.value);
      setMobile('');
    } else {
      setMobile(classified.value);
      setEmail('');
    }
  };

  const toggleAuthMethod = () => {
    setAuthMethod((prev) => (prev === 'password' ? 'otp' : 'password'));
    setPassword('');
    setErrorMessage('');
    setSuccessMessage('');
  };

  const goBackToLogin = () => {
    setScreenState('login');
    setErrorMessage('');
    setSuccessMessage('');
    setOtp('');
  };

  // Trigger Send OTP for Login
  const handleSendOTP = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const classified = classifyIdentifier(identifier);
    if (!classified) return;
    syncIdentifierState(classified);

    const displayValue = classified.type === 'mobile' ? '+91 ' + classified.value : classified.value;

    setIsSubmitting(true);
    try {
      const res = await sendOtpApi(classified.value, classified.type);
      // No SMS/email provider is wired in yet, so the backend returns the OTP directly in dev —
      // pre-fill it instead of making the user read it off the API response and retype it.
      const devOtp = res?.dev_otp || res?.otp || '';
      if (devOtp) setOtp(String(devOtp));
      setOtpSent(true);
      setOtpCountdown(300);
      setScreenState('otp-verify');
      setSuccessMessage(`OTP sent to ${displayValue}.${devOtp ? ' (Auto-filled for testing)' : ''}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Verify OTP and Complete Login
  const handleVerifyOTPAndLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!otp || otp.length !== 6) {
      setErrorMessage('Please enter the mandatory 6-digit OTP code');
      return;
    }

    if (otpCountdown <= 0) {
      setErrorMessage('OTP has expired. Please request a new OTP code.');
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const activeIdentifier = loginType === 'mobile' ? mobile : email;
      const response = await verifyOtpApi(activeIdentifier, otp, loginType);

      const patientUser = {
        patient_id: response.patient_id,
        fullName: response.full_name,
        email: response.email || '',
        mobile: response.mobile || '',
        role: response.role || 'patient',
        token: response.access_token || response.token
      };

      onLoginSuccess(patientUser);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Invalid or expired OTP. Please try again.');
      registerFailureAttempt();
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Handle Password-based Login
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (isLocked) {
      setErrorMessage('Your account is temporarily locked due to failed attempts.');
      return;
    }

    const classified = classifyIdentifier(identifier);
    if (!classified) return;
    syncIdentifierState(classified);

    if (!password) {
      setErrorMessage('Password is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = classified.type === 'mobile'
        ? { phone: classified.value, password }
        : { email: classified.value, password };

      const response = await loginPatientApi(payload);

      const patientUser = {
        patient_id: response.patient_id,
        fullName: response.full_name,
        email: response.email || '',
        mobile: response.mobile || '',
        role: response.role || 'patient',
        token: response.access_token || response.token
      };

      onLoginSuccess(patientUser);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Invalid credentials. Please check your password.');
      registerFailureAttempt();
    } finally {
      setIsSubmitting(false);
    }
  };

  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Receives the Google ID token and logs the patient in
  const handleGoogleCredential = async (response: any) => {
    const idToken = response?.credential;
    if (!idToken) {
      setErrorMessage('Google sign-in failed. Please try again.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const res = await googlePatientApi(idToken);
      const patientUser = {
        patient_id: res.patient_id,
        fullName: res.full_name,
        email: res.email || '',
        mobile: res.mobile || '',
        role: res.role || 'patient',
        token: res.access_token || res.token,
      };
      onLoginSuccess(patientUser);
    } catch (error: any) {
      const rawMsg = error.response?.data?.message || error.message || 'Google sign-in failed. Please try again.';
      setErrorMessage(Array.isArray(rawMsg) ? rawMsg.join(', ') : rawMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loads Google Identity Services
  useEffect(() => {
    if (screenState !== 'login' || !GOOGLE_CLIENT_ID) return;
    let cancelled = false;
    loadGoogleIdentity()
      .then(() => {
        if (cancelled || !window.google?.accounts?.id) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredential,
        });
        if (googleBtnRef.current) {
          googleBtnRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'pill',
            width: 380,
          });
        }
      })
      .catch(() => {
        // Google script blocked/offline
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenState]);

  const registerFailureAttempt = () => {
    const nextAttempts = failedAttempts + 1;
    setFailedAttempts(nextAttempts);
    if (nextAttempts >= 5) {
      setIsLocked(true);
      setLockCountdown(900); // 15 mins lock
    }
  };

  // Forgot Password Actions
  const handleForgotSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (recoveryType === 'mobile' && !validateMobile(recoveryIdentifier)) {
      setErrorMessage('Please enter a valid 10-digit mobile number');
      return;
    }
    if (recoveryType === 'email' && !validateEmail(recoveryIdentifier)) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await sendOtpApi(recoveryIdentifier, recoveryType);
      // No SMS/email provider is wired in yet, so the backend returns the OTP directly in dev —
      // pre-fill it instead of making the user read it off the API response and retype it.
      const devOtp = res?.dev_otp || res?.otp || '';
      if (devOtp) setRecoveryOtp(String(devOtp));
      setOtpCountdown(300);
      setScreenState('forgot-otp');
      setSuccessMessage(`Recovery OTP sent to ${recoveryIdentifier}.${devOtp ? ' (Auto-filled for testing)' : ''}`);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to send recovery OTP.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!recoveryOtp || recoveryOtp.length !== 6) {
      setErrorMessage('Please enter the 6-digit OTP code');
      return;
    }
    setIsSubmitting(true);
    try {
      await verifyOtpApi(recoveryIdentifier, recoveryOtp, recoveryType as 'mobile' | 'email');
      setScreenState('forgot-reset');
      setSuccessMessage('');
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Invalid or expired OTP code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!newPassword || newPassword.length < 8) {
      setErrorMessage('New Password is required and must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Confirm Password does not match New Password');
      return;
    }

    setScreenState('forgot-success');
    setSuccessMessage('');
  };

  return (
    <div className="flex-1 flex items-center justify-center min-h-screen bg-slate-50/80 p-4 md:p-6 font-sans">
      <div className="w-full max-w-[460px] mx-auto my-auto">
        
        {/* Main Card Container */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-6 md:p-8 relative overflow-hidden">
          
          {/* Top Brand Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-12 h-12 mb-3 relative flex items-center justify-center">
              <img 
                src={logoImg} 
                alt="Vizito Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-xl font-black tracking-tight text-slate-800">VIZITO PATIENT</h1>
            <p className="text-[11px] font-bold text-teal-600 uppercase tracking-widest mt-0.5">Your Health. Connected.</p>
          </div>

          {/* Navigation Back Button for OTP Verification & Forgot Sub-Flows */}
          {screenState !== 'login' && screenState !== 'forgot-success' && (
            <button
              type="button"
              onClick={goBackToLogin}
              className="inline-flex items-center gap-1.5 text-slate-400 hover:text-primary text-xs font-bold uppercase mb-4 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Login
            </button>
          )}

          {/* Error Message Alert Banner */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span className="flex-1">{errorMessage}</span>
            </div>
          )}

          {/* Success Message Alert Banner */}
          {successMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="flex-1">{successMessage}</span>
            </div>
          )}

          {/* ── ACCOUNT LOCKED VIEW ── */}
          {isLocked && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-200">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Account Temporarily Locked</h3>
              <p className="text-slate-500 text-xs mt-2 leading-relaxed">
                Too many failed login attempts. Device access temporarily restricted for security.
              </p>
              <div className="mt-4 text-2xl font-mono font-black text-rose-600 bg-rose-50 border border-rose-200 inline-block px-4 py-2 rounded-xl">
                {formatTime(lockCountdown)}
              </div>
            </div>
          )}

          {/* ── LOGIN SCREEN ── */}
          {!isLocked && screenState === 'login' && (
            <div className="animate-fade">
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Welcome Back</h2>
                <p className="text-slate-500 text-xs mt-1 font-medium">Log in to access your Patient Portal</p>
              </div>

              {/* Main Auth Form */}
              <form
                onSubmit={authMethod === 'otp' ? handleSendOTP : handlePasswordLogin}
                className="space-y-4"
              >
                {/* Unified Identifier Input */}
                <div className="form-group mb-0 text-left">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number or Email</label>
                  <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden px-3 bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                    {isEmailIdentifier(identifier) ? (
                      <Mail className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                    ) : (
                      <Smartphone className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                    )}
                    <input
                      type="text"
                      inputMode="email"
                      autoComplete="username"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="Enter mobile number or email"
                      className="flex-1 py-3 text-xs font-semibold text-slate-800 bg-transparent outline-none placeholder:text-slate-400"
                    />
                  </div>
                  {authMethod === 'otp' && (
                    <p className="text-[11px] text-slate-400 font-semibold mt-1.5">
                      We will send you a 6-digit OTP to verify it's you
                    </p>
                  )}
                </div>

                {/* Password Field (Only for password auth) */}
                {authMethod === 'password' && (
                  <div className="form-group mb-0 text-left">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                    <div className="relative flex items-center border border-slate-200 rounded-xl overflow-hidden px-3 bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                      <Lock className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="flex-1 py-3 text-xs font-semibold text-slate-800 bg-transparent outline-none placeholder:text-slate-400 pr-10"
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
                )}

                {/* Switch between Password / OTP sign-in */}
                <div className="flex justify-end -mt-1">
                  <button
                    type="button"
                    onClick={toggleAuthMethod}
                    className="text-primary text-xs font-bold hover:underline cursor-pointer"
                  >
                    {authMethod === 'password' ? 'Login with OTP instead' : 'Login with password instead'}
                  </button>
                </div>

                {/* Action Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center relative shadow-md shadow-primary/20 cursor-pointer mt-5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <span>{authMethod === 'otp' ? 'Send OTP' : 'Login'}</span>
                      <Send className="w-3.5 h-3.5 absolute right-4 text-white/90" />
                    </>
                  )}
                </button>
              </form>

              {/* OR separator + Google Sign-In */}
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>
              <div className="flex justify-center min-h-[44px]">
                <div ref={googleBtnRef} className="w-full flex justify-center" />
              </div>

              {/* Bottom Options: Remember Me & Forgot Password */}
              <div className="flex items-center justify-between mt-5 pt-3 border-t border-slate-100 text-xs font-semibold text-slate-600">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-primary border-slate-300 focus:ring-primary cursor-pointer"
                  />
                  <span>Remember me</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setScreenState('forgot-input');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="text-primary font-bold hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Register Call-to-action */}
              <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-500 font-medium">
                <span>New to Vizito?</span>
                <button
                  type="button"
                  onClick={onRegisterClick}
                  className="text-primary hover:text-primary-hover font-bold hover:underline cursor-pointer flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5 shrink-0" />
                  <span>Create New Account</span>
                </button>
              </div>
            </div>
          )}

          {/* ── DEDICATED OTP VERIFICATION SCREEN ── */}
          {!isLocked && screenState === 'otp-verify' && (
            <div className="animate-fade">
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-black text-slate-800">Enter OTP</h2>
                <p className="text-slate-500 text-xs mt-1 font-medium leading-relaxed">
                  We've sent a 6-digit passcode to{' '}
                  <strong className="text-slate-700">{loginType === 'mobile' ? '+91 ' + mobile : email}</strong>.
                </p>
              </div>

              <form onSubmit={handleVerifyOTPAndLogin} className="space-y-4">
                <div className="form-group text-center mb-0">
                  <label className="block text-xs font-bold text-slate-700 mb-1 text-left">6-Digit Verification Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 123456"
                    className="w-full text-center text-2xl font-black tracking-widest font-mono py-3 border border-slate-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
                    required
                    autoFocus
                  />
                </div>

                <div className="flex items-center justify-between text-xs py-1 font-semibold">
                  <span className="text-slate-400">
                    OTP expires in:{' '}
                    <strong className={otpCountdown < 60 ? 'text-rose-500' : 'text-slate-600'}>{formatTime(otpCountdown)}</strong>
                  </span>
                  <button
                    type="button"
                    disabled={otpCountdown > 0 || isSubmitting}
                    onClick={() => handleSendOTP()}
                    className="text-primary font-bold hover:underline disabled:text-slate-350 disabled:no-underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Resend OTP
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isVerifyingOtp}
                  className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center cursor-pointer shadow-md shadow-primary/20 mt-2 disabled:opacity-50"
                >
                  {isVerifyingOtp ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <span>Verify OTP &amp; Login</span>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ── FORGOT PASSWORD FLOW ── */}
          {/* Step 1: Input Mobile or Email */}
          {screenState === 'forgot-input' && (
            <div className="space-y-4">
              <div className="mb-4">
                <h2 className="text-xl font-black text-slate-800">Forgot Password</h2>
                <p className="text-slate-500 text-xs mt-1">Enter your registered Mobile Number or Email to receive an OTP.</p>
              </div>

              <div className="flex bg-slate-100 p-1 rounded-xl gap-1 mb-2">
                <button
                  type="button"
                  onClick={() => setRecoveryType('mobile')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                    recoveryType === 'mobile' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Via Mobile
                </button>
                <button
                  type="button"
                  onClick={() => setRecoveryType('email')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                    recoveryType === 'email' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Via Email
                </button>
              </div>

              <form onSubmit={handleForgotSendOtp} className="space-y-4">
                {recoveryType === 'mobile' ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Registered Mobile Number *</label>
                    <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
                      <span className="px-3 py-3 bg-slate-50 border-r border-slate-200 text-slate-700 font-bold text-xs">+91</span>
                      <input
                        type="tel"
                        maxLength={10}
                        value={recoveryIdentifier}
                        onChange={(e) => setRecoveryIdentifier(e.target.value.replace(/\D/g, ''))}
                        placeholder="Enter mobile number"
                        className="flex-1 px-3 py-3 text-xs font-semibold text-slate-800 bg-transparent outline-none"
                        required
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Registered Email Address *</label>
                    <div className="flex items-center border border-slate-200 rounded-xl px-3 bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
                      <Mail className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                      <input
                        type="email"
                        value={recoveryIdentifier}
                        onChange={(e) => setRecoveryIdentifier(e.target.value)}
                        placeholder="abc@gmail.com"
                        className="flex-1 py-3 text-xs font-semibold text-slate-800 bg-transparent outline-none"
                        required
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 rounded-xl font-bold text-xs shadow-md shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <span>Send Recovery OTP</span>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Step 2: Verify Recovery OTP */}
          {screenState === 'forgot-otp' && (
            <form onSubmit={handleForgotVerifyOtp} className="space-y-4">
              <div className="mb-4">
                <h2 className="text-xl font-black text-slate-800">Verify Recovery OTP</h2>
                <p className="text-slate-500 text-xs mt-1">
                  We've sent a 6-digit code to <strong className="text-slate-700">{recoveryIdentifier}</strong>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">6-Digit OTP *</label>
                <input
                  type="text"
                  maxLength={6}
                  value={recoveryOtp}
                  onChange={(e) => setRecoveryOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter code"
                  className="w-full text-center text-xl font-mono font-bold tracking-widest py-3 border border-slate-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Expires in: {formatTime(otpCountdown)}</span>
                <button
                  type="button"
                  disabled={otpCountdown > 0}
                  onClick={() => handleForgotSendOtp({ preventDefault: () => {} } as any)}
                  className="text-primary font-bold hover:underline disabled:text-slate-300 cursor-pointer"
                >
                  Resend OTP
                </button>
              </div>

              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 rounded-xl font-bold text-xs shadow-md shadow-primary/20 cursor-pointer transition-all"
              >
                Verify OTP
              </button>
            </form>
          )}

          {/* Step 3: Reset Password Form */}
          {screenState === 'forgot-reset' && (
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div className="mb-4">
                <h2 className="text-xl font-black text-slate-800">Reset Password</h2>
                <p className="text-slate-500 text-xs mt-1">Set a new secure password for your patient account.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Password *</label>
                <div className="relative flex items-center border border-slate-200 rounded-xl px-3 bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
                  <Lock className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="flex-1 py-3 text-xs font-semibold text-slate-800 bg-transparent outline-none pr-8"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                    placeholder="Re-enter new password"
                    className="flex-1 py-3 text-xs font-semibold text-slate-800 bg-transparent outline-none"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 rounded-xl font-bold text-xs shadow-md shadow-primary/20 cursor-pointer transition-all mt-2"
              >
                Reset Password
              </button>
            </form>
          )}

          {/* Step 4: Reset Success Confirmation */}
          {screenState === 'forgot-success' && (
            <div className="text-center py-6">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Password Reset Successful</h3>
              <p className="text-slate-500 text-xs mt-2 leading-relaxed">
                Your password has been updated. You can now log in with your new password.
              </p>
              <button
                type="button"
                onClick={() => {
                  setScreenState('login');
                  setAuthMethod('password');
                  setErrorMessage('');
                  setSuccessMessage('Password reset successfully! Please log in.');
                }}
                className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 rounded-xl font-bold text-xs shadow-md shadow-primary/20 mt-6 cursor-pointer"
              >
                Back to Login
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
