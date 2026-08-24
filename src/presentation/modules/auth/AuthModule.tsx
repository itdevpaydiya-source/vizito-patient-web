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
  ChevronDown,
  KeyRound,
  ShieldCheck,
  UserPlus
} from 'lucide-react';
import logoImg from '../../../assets/vizito_logo.png';
import { loginPatientApi, sendOtpApi, verifyOtpApi, googlePatientApi } from '../../../services/authHelper';

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

type AuthMethodOption = 'mobile-otp' | 'mobile-password' | 'email-otp' | 'email-password';
type AuthScreenState = 'login' | 'forgot-input' | 'forgot-otp' | 'forgot-reset' | 'forgot-success';

export default function AuthModule({ onLoginSuccess, onRegisterClick }: AuthModuleProps) {
  // Authentication Method Choice (Default: Mobile + OTP)
  const [selectedMethod, setSelectedMethod] = useState<AuthMethodOption>('mobile-otp');
  const [screenState, setScreenState] = useState<AuthScreenState>('login');

  // Input Fields
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

  // Validation functions
  const validateMobile = (num: string) => /^[6-9]\d{9}$/.test(num.trim());
  const validateEmail = (mail: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail.trim());

  // Handle Switching Method
  const handleMethodSelect = (method: AuthMethodOption) => {
    setSelectedMethod(method);
    setErrorMessage('');
    setSuccessMessage('');
    setOtpSent(false);
    setOtp('');
  };

  // Trigger Send OTP for Login
  const handleSendOTP = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (selectedMethod.startsWith('mobile') && !validateMobile(mobile)) {
      setErrorMessage('Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9');
      return;
    }
    if (selectedMethod.startsWith('email') && !validateEmail(email)) {
      setErrorMessage('Please enter a valid email address (e.g. user@domain.com)');
      return;
    }

    setIsSubmitting(true);
    try {
      const identifier = selectedMethod.startsWith('mobile') ? mobile : email;
      const type = selectedMethod.startsWith('mobile') ? 'mobile' : 'email';
      await sendOtpApi(identifier, type);

      setOtpSent(true);
      setOtpCountdown(300);
      setSuccessMessage(`OTP sent to ${selectedMethod.startsWith('mobile') ? '+91 ' + mobile : email}.`);
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
      const type = selectedMethod.startsWith('mobile') ? 'mobile' : 'email';
      const identifier = type === 'mobile' ? mobile : email;
      const response = await verifyOtpApi(identifier, otp, type);

      // Authenticated — use only the real backend response.
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

    if (selectedMethod === 'mobile-password') {
      if (!validateMobile(mobile)) {
        setErrorMessage('Please enter a valid 10-digit mobile number');
        return;
      }
    } else {
      if (!validateEmail(email)) {
        setErrorMessage('Please enter a valid email address');
        return;
      }
    }

    if (!password) {
      setErrorMessage('Password is mandatory');
      return;
    }

    setIsSubmitting(true);
    try {
      const isMobile = selectedMethod === 'mobile-password';
      const response = await loginPatientApi(
        isMobile ? { phone: mobile, password } : { email, password }
      );

      // Use only the real backend response — no fabricated identity/token.
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

  // Receives the Google ID token, forwards it to the backend /patient/auth/google endpoint
  // (already fully implemented — only this frontend wiring was ever missing), then reuses the
  // exact same post-login handling as manual login.
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

  // Loads Google Identity Services and renders the official Google button whenever the login
  // screen is shown.
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
        // Google script blocked/offline — manual auth still works; button stays hidden.
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
      await sendOtpApi(recoveryIdentifier, recoveryType);
      setOtpCountdown(300);
      setScreenState('forgot-otp');
      setSuccessMessage(`Recovery OTP sent to ${recoveryIdentifier}.`);
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
      // Verify against the real backend OTP — no universal/hardcoded code accepted.
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

    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('New Password is required and must be at least 6 characters');
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

          {/* Navigation Back Button for Forgot Sub-Flow */}
          {screenState !== 'login' && screenState !== 'forgot-success' && (
            <button
              onClick={() => {
                setScreenState('login');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-700 text-xs font-bold uppercase mb-4 transition-colors cursor-pointer"
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
            <div>
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-black text-slate-800">Welcome Back</h2>
                <p className="text-slate-500 text-xs mt-1 font-medium">Log in to access your Patient Portal</p>
              </div>

              {/* 4 Authentication Method Selector Tabs */}
              <div className="grid grid-cols-4 border-b border-slate-100 mb-6 pb-2 text-center gap-1">
                <button
                  type="button"
                  onClick={() => handleMethodSelect('mobile-otp')}
                  className={`pb-2.5 flex flex-col items-center gap-1 cursor-pointer transition-all border-b-2 ${
                    selectedMethod === 'mobile-otp'
                      ? 'border-primary text-primary font-bold'
                      : 'border-transparent text-slate-400 hover:text-slate-600 font-semibold'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span className="text-[10px] whitespace-nowrap">Mobile + OTP</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleMethodSelect('mobile-password')}
                  className={`pb-2.5 flex flex-col items-center gap-1 cursor-pointer transition-all border-b-2 ${
                    selectedMethod === 'mobile-password'
                      ? 'border-primary text-primary font-bold'
                      : 'border-transparent text-slate-400 hover:text-slate-600 font-semibold'
                  }`}
                >
                  <div className="relative">
                    <Smartphone className="w-4 h-4" />
                    <Lock className="w-2.5 h-2.5 absolute -bottom-1 -right-1 text-slate-500" />
                  </div>
                  <span className="text-[10px] whitespace-nowrap">Mobile + Pass</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleMethodSelect('email-otp')}
                  className={`pb-2.5 flex flex-col items-center gap-1 cursor-pointer transition-all border-b-2 ${
                    selectedMethod === 'email-otp'
                      ? 'border-primary text-primary font-bold'
                      : 'border-transparent text-slate-400 hover:text-slate-600 font-semibold'
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  <span className="text-[10px] whitespace-nowrap">Email + OTP</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleMethodSelect('email-password')}
                  className={`pb-2.5 flex flex-col items-center gap-1 cursor-pointer transition-all border-b-2 ${
                    selectedMethod === 'email-password'
                      ? 'border-primary text-primary font-bold'
                      : 'border-transparent text-slate-400 hover:text-slate-600 font-semibold'
                  }`}
                >
                  <KeyRound className="w-4 h-4" />
                  <span className="text-[10px] whitespace-nowrap">Email + Pass</span>
                </button>
              </div>

              {/* DYNAMIC METHOD FORMS - Active fields ONLY */}

              {/* 1. Mobile + OTP Form */}
              {selectedMethod === 'mobile-otp' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number *</label>
                    <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                      <div className="flex items-center gap-1 px-3 py-3 bg-slate-50 border-r border-slate-200 text-slate-700 font-bold text-xs">
                        <span>🇮🇳</span>
                        <span>+91</span>
                      </div>
                      <input
                        type="tel"
                        maxLength={10}
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                        placeholder="Enter 10-digit mobile number"
                        className="flex-1 px-3 py-3 text-xs font-semibold text-slate-800 bg-transparent outline-none placeholder:text-slate-400"
                        required
                      />
                    </div>
                  </div>

                  {!otpSent ? (
                    <button
                      type="button"
                      onClick={() => handleSendOTP()}
                      disabled={isSubmitting}
                      className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 rounded-xl font-bold text-xs shadow-md shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        <>
                          <span>Send OTP</span>
                          <Send className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  ) : (
                    <form onSubmit={handleVerifyOTPAndLogin} className="space-y-3 pt-2">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-bold text-slate-700">Enter 6-Digit OTP *</label>
                          <span className="text-[10px] font-semibold text-slate-400">
                            Expires: <strong className={otpCountdown < 60 ? 'text-rose-500' : 'text-slate-600'}>{formatTime(otpCountdown)}</strong>
                          </span>
                        </div>
                        <input
                          type="text"
                          maxLength={6}
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                          placeholder="e.g. 123456"
                          className="w-full text-center text-xl font-mono font-bold tracking-widest py-3 border border-slate-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
                          required
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <button
                          type="button"
                          disabled={otpCountdown > 0}
                          onClick={() => handleSendOTP()}
                          className="text-primary font-bold hover:underline disabled:text-slate-300 disabled:no-underline flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" /> Resend OTP
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={isVerifyingOtp}
                        className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 rounded-xl font-bold text-xs shadow-md shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                      >
                        {isVerifyingOtp ? (
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        ) : (
                          <span>Verify OTP &amp; Login</span>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* 2. Email + OTP Form */}
              {selectedMethod === 'email-otp' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                    <div className="flex items-center border border-slate-200 rounded-xl px-3 bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                      <Mail className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="abc@gmail.com"
                        className="flex-1 py-3 text-xs font-semibold text-slate-800 bg-transparent outline-none placeholder:text-slate-400"
                        required
                      />
                    </div>
                  </div>

                  {!otpSent ? (
                    <button
                      type="button"
                      onClick={() => handleSendOTP()}
                      disabled={isSubmitting}
                      className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 rounded-xl font-bold text-xs shadow-md shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        <>
                          <span>Send OTP to Email</span>
                          <Send className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  ) : (
                    <form onSubmit={handleVerifyOTPAndLogin} className="space-y-3 pt-2">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-bold text-slate-700">Enter 6-Digit OTP *</label>
                          <span className="text-[10px] font-semibold text-slate-400">
                            Expires: <strong className={otpCountdown < 60 ? 'text-rose-500' : 'text-slate-600'}>{formatTime(otpCountdown)}</strong>
                          </span>
                        </div>
                        <input
                          type="text"
                          maxLength={6}
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                          placeholder="e.g. 123456"
                          className="w-full text-center text-xl font-mono font-bold tracking-widest py-3 border border-slate-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
                          required
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <button
                          type="button"
                          disabled={otpCountdown > 0}
                          onClick={() => handleSendOTP()}
                          className="text-primary font-bold hover:underline disabled:text-slate-300 disabled:no-underline flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" /> Resend OTP
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={isVerifyingOtp}
                        className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 rounded-xl font-bold text-xs shadow-md shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                      >
                        {isVerifyingOtp ? (
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        ) : (
                          <span>Verify OTP &amp; Login</span>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* 3. Mobile + Password Form */}
              {selectedMethod === 'mobile-password' && (
                <form onSubmit={handlePasswordLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number *</label>
                    <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                      <div className="flex items-center gap-1 px-3 py-3 bg-slate-50 border-r border-slate-200 text-slate-700 font-bold text-xs">
                        <span>🇮🇳</span>
                        <span>+91</span>
                      </div>
                      <input
                        type="tel"
                        maxLength={10}
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                        placeholder="10-digit mobile number"
                        className="flex-1 px-3 py-3 text-xs font-semibold text-slate-800 bg-transparent outline-none placeholder:text-slate-400"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Password *</label>
                    <div className="relative flex items-center border border-slate-200 rounded-xl px-3 bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                      <Lock className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="flex-1 py-3 text-xs font-semibold text-slate-800 bg-transparent outline-none placeholder:text-slate-400 pr-8"
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

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 rounded-xl font-bold text-xs shadow-md shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 mt-2"
                  >
                    {isSubmitting ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <span>Login</span>
                    )}
                  </button>
                </form>
              )}

              {/* 4. Email + Password Form */}
              {selectedMethod === 'email-password' && (
                <form onSubmit={handlePasswordLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                    <div className="flex items-center border border-slate-200 rounded-xl px-3 bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                      <Mail className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="abc@gmail.com"
                        className="flex-1 py-3 text-xs font-semibold text-slate-800 bg-transparent outline-none placeholder:text-slate-400"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Password *</label>
                    <div className="relative flex items-center border border-slate-200 rounded-xl px-3 bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                      <Lock className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="flex-1 py-3 text-xs font-semibold text-slate-800 bg-transparent outline-none placeholder:text-slate-400 pr-8"
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

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 rounded-xl font-bold text-xs shadow-md shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 mt-2"
                  >
                    {isSubmitting ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <span>Login</span>
                    )}
                  </button>
                </form>
              )}

              {/* OR separator + Google Sign-In — coexists with manual auth. Mirrors the working
                  provider-side implementation in vizito-partner-main/AuthModule.tsx. */}
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
                    placeholder="At least 6 characters"
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
                  setSelectedMethod('email-password');
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
