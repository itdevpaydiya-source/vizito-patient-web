import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Calendar,
  ShieldCheck,
  Users,
  HeartPulse,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  Check,
  RefreshCw,
} from 'lucide-react';
import logoImg from '../../../assets/vizito_logo.png';
import { exploreAssets } from '../../../assets/explore';
import {
  loginPatientApi,
  sendOtpApi,
  verifyOtpApi,
  googlePatientApi,
  forgotPasswordApi,
  verifyForgotPasswordOtpApi,
  resetPasswordApi,
  registerSendOtpApi,
  registerVerifyOtpApi,
  registerPatientApi,
} from '../../../services/authHelper';
import './AuthV2.css';

interface AuthModuleProps {
  onLoginSuccess: (user: any) => void;
  onRegisterClick?: () => void;
  initialTab?: 'login' | 'register';
}

type MainTab = 'login' | 'register';
type LoginMode = 'password' | 'otp-request' | 'otp-verify';
type ForgotStep = 1 | 2 | 3;

// Password requirement checks matching backend validation
const checkPasswordRules = (pw: string) => {
  return {
    minLength: pw.length >= 8,
    hasLetterAndNum: /[a-zA-Z]/.test(pw) && /\d/.test(pw),
    hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pw),
  };
};

export default function AuthModule({
  onLoginSuccess,
  onRegisterClick,
  initialTab = 'login',
}: AuthModuleProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<MainTab>(initialTab);
  const [isForgotFlow, setIsForgotFlow] = useState(false);
  const [forgotStep, setForgotStep] = useState<ForgotStep>(1);
  const [loginMode, setLoginMode] = useState<LoginMode>('password');

  // Common UI states
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // OTP Login state
  const [otpPhone, setOtpPhone] = useState('');
  const [loginOtpCode, setLoginOtpCode] = useState(['', '', '', '', '', '']);
  const [otpCountdown, setOtpCountdown] = useState(30);
  const [canResendOtp, setCanResendOtp] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState('');

  // Register form state
  const [regFullName, setRegFullName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regDob, setRegDob] = useState('');
  const [regGender, setRegGender] = useState<'Female' | 'Male' | 'Other'>('Female');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regAgreedTerms, setRegAgreedTerms] = useState(false);
  const [regOtpStep, setRegOtpStep] = useState(false);
  const [regOtpCode, setRegOtpCode] = useState(['', '', '', '', '', '']);
  const [regToken, setRegToken] = useState('');

  // Forgot password state
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotOtpCode, setForgotOtpCode] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // OTP box refs for auto-focus
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Update tab if initialTab prop changes
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Countdown timer for OTP
  useEffect(() => {
    if (otpCountdown > 0 && (loginMode === 'otp-verify' || isForgotFlow || regOtpStep)) {
      const timer = setTimeout(() => setOtpCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (otpCountdown === 0) {
      setCanResendOtp(true);
    }
  }, [otpCountdown, loginMode, isForgotFlow, regOtpStep]);

  // Reset errors when changing tabs/modes
  const switchTab = (tab: MainTab) => {
    setActiveTab(tab);
    setIsForgotFlow(false);
    setLoginMode('password');
    setRegOtpStep(false);
    setErrorMessage('');
    setSuccessMessage('');
    if (tab === 'register' && onRegisterClick) {
      // Allow router to sync if handled externally
    }
  };

  // Helper for 6-box OTP entry
  const handleOtpBoxChange = (
    index: number,
    value: string,
    stateSetter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    stateSetter((prev) => {
      const copy = [...prev];
      copy[index] = digit;
      return copy;
    });

    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
    stateSetter: React.Dispatch<React.SetStateAction<string[]>>,
    currentOtp: string[]
  ) => {
    if (e.key === 'Backspace' && !currentOtp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (
    e: React.ClipboardEvent<HTMLInputElement | HTMLDivElement>,
    stateSetter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const digits = pasted.split('');
    stateSetter((prev) => {
      const copy = [...prev];
      for (let i = 0; i < 6; i++) {
        copy[i] = digits[i] || '';
      }
      return copy;
    });
    const nextFocus = Math.min(digits.length, 5);
    otpInputRefs.current[nextFocus]?.focus();
  };

  // ================= 1. PASSWORD LOGIN =================
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const idVal = loginIdentifier.trim();
    if (!idVal) {
      setErrorMessage('Please enter your mobile number or email.');
      return;
    }
    if (!loginPassword) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setBusy(true);
    try {
      const isPhone = /^[0-9+ ]{8,15}$/.test(idVal);
      const cleanPhone = idVal.replace(/\D/g, '').slice(-10);
      const payload = isPhone
        ? { phone: cleanPhone, password: loginPassword }
        : { email: idVal.toLowerCase(), password: loginPassword };

      const res = await loginPatientApi(payload);
      if (res?.success || res?.token || res?.access_token) {
        const userData = {
          patient_id: res.patient_id || res.data?.patient_id || res.userId || 'kavya-reddy',
          email: res.email || res.data?.email || (isPhone ? '' : idVal),
          mobile: res.mobile || res.data?.mobile || (isPhone ? cleanPhone : ''),
          fullName: res.full_name || res.data?.fullName || res.data?.user?.fullName || 'Kavya Reddy',
          token: res.token || res.access_token || res.data?.access_token,
        };
        onLoginSuccess(userData);
      } else {
        setErrorMessage(res?.message || 'Incorrect password. Please try again.');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || '';
      if (/password|credential|unauthorized|401/i.test(msg)) {
        setErrorMessage('Incorrect password. Please try again.');
      } else {
        setErrorMessage(msg || 'Incorrect password. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  // ================= 2. OTP LOGIN FLOW =================
  const handleRequestLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const clean = otpPhone.replace(/\D/g, '').slice(-10);
    if (clean.length !== 10) {
      setErrorMessage('Enter a valid 10-digit mobile number.');
      return;
    }

    setBusy(true);
    try {
      const res = await sendOtpApi(clean, 'mobile');
      setLoginMode('otp-verify');
      setOtpCountdown(30);
      setCanResendOtp(false);
      if (res?.dev_otp) {
        setDevOtpHint(String(res.dev_otp));
      }
      setSuccessMessage(`OTP sent to +91 ${clean}`);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Unable to send OTP. Please check your number.');
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const clean = otpPhone.replace(/\D/g, '').slice(-10);
    const code = loginOtpCode.join('');
    if (code.length !== 6) {
      setErrorMessage('Please enter the full 6-digit OTP code.');
      return;
    }

    setBusy(true);
    try {
      const res = await verifyOtpApi(clean, code, 'mobile');
      if (res?.success || res?.token || res?.access_token) {
        const userData = {
          patient_id: res.patient_id || res.data?.patient_id || 'patient-user',
          email: res.email || res.data?.email || '',
          mobile: clean,
          fullName: res.full_name || res.data?.fullName || 'Patient',
          token: res.token || res.access_token || res.data?.access_token,
        };
        onLoginSuccess(userData);
      } else {
        setErrorMessage(res?.message || 'Invalid or expired OTP. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'OTP verification failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  // ================= 3. REGISTRATION FLOW =================
  const regPwRules = checkPasswordRules(regPassword);
  const regPasswordsMatch = regPassword.length > 0 && regPassword === regConfirmPassword;
  const isRegFormValid =
    regFullName.trim().length >= 2 &&
    regPhone.replace(/\D/g, '').slice(-10).length === 10 &&
    regDob.length > 0 &&
    regPwRules.minLength &&
    regPwRules.hasLetterAndNum &&
    regPwRules.hasSpecial &&
    regPasswordsMatch &&
    regAgreedTerms;

  const handleRegisterSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!isRegFormValid) {
      setErrorMessage('Please complete all required fields and accept the Terms.');
      return;
    }

    const clean = regPhone.replace(/\D/g, '').slice(-10);
    setBusy(true);
    try {
      const res = await registerSendOtpApi(clean, 'mobile');
      setRegOtpStep(true);
      setOtpCountdown(30);
      setCanResendOtp(false);
      if (res?.dev_otp) {
        setDevOtpHint(String(res.dev_otp));
      }
      setSuccessMessage(`OTP sent to +91 ${clean}`);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Unable to send registration OTP.');
    } finally {
      setBusy(false);
    }
  };

  const handleRegisterVerifyAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const clean = regPhone.replace(/\D/g, '').slice(-10);
    const code = regOtpCode.join('');
    if (code.length !== 6) {
      setErrorMessage('Enter the 6-digit OTP code.');
      return;
    }

    setBusy(true);
    try {
      // Step A: Verify OTP
      const verifyRes = await registerVerifyOtpApi(clean, code, 'mobile');
      const token = verifyRes?.registration_token || verifyRes?.data?.registration_token;
      if (!token) {
        throw new Error('Registration token not received.');
      }
      setRegToken(token);

      // Step B: Submit Patient Registration
      const regRes = await registerPatientApi({
        full_name: regFullName.trim(),
        phone: clean,
        email: regEmail.trim() || undefined,
        password: regPassword,
        registration_token: token,
        date_of_birth: regDob,
        gender: regGender,
      });

      if (regRes?.success || regRes?.token || regRes?.access_token) {
        const userData = {
          patient_id: regRes.patient_id || regRes.data?.patient_id || 'new-patient',
          email: regEmail.trim(),
          mobile: clean,
          fullName: regFullName.trim(),
          token: regRes.token || regRes.access_token || regRes.data?.access_token,
        };
        onLoginSuccess(userData);
      } else {
        // Automatically login if registration completed without immediate token
        const loginRes = await loginPatientApi({ phone: clean, password: regPassword });
        onLoginSuccess({
          patient_id: loginRes.patient_id || 'new-patient',
          email: regEmail.trim(),
          mobile: clean,
          fullName: regFullName.trim(),
          token: loginRes.token || loginRes.access_token,
        });
      }
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || 'Registration failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  // ================= 4. FORGOT PASSWORD FLOW =================
  const newPwRules = checkPasswordRules(newPassword);

  const handleForgotSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const idVal = forgotIdentifier.trim();
    if (!idVal) {
      setErrorMessage('Enter your registered mobile number or email.');
      return;
    }

    setBusy(true);
    try {
      const isPhone = /^[0-9+ ]{8,15}$/.test(idVal);
      const clean = isPhone ? idVal.replace(/\D/g, '').slice(-10) : idVal.toLowerCase();
      const type = isPhone ? 'mobile' : 'email';

      const res = await forgotPasswordApi(clean, type);
      setForgotStep(2);
      setOtpCountdown(30);
      setCanResendOtp(false);
      if (res?.dev_otp) {
        setDevOtpHint(String(res.dev_otp));
      }
      setSuccessMessage(`Password reset OTP sent to ${clean}`);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Could not find an account with that mobile or email.');
    } finally {
      setBusy(false);
    }
  };

  const handleForgotVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const idVal = forgotIdentifier.trim();
    const isPhone = /^[0-9+ ]{8,15}$/.test(idVal);
    const clean = isPhone ? idVal.replace(/\D/g, '').slice(-10) : idVal.toLowerCase();
    const type = isPhone ? 'mobile' : 'email';
    const code = forgotOtpCode.join('');

    if (code.length !== 6) {
      setErrorMessage('Enter the complete 6-digit OTP.');
      return;
    }

    setBusy(true);
    try {
      await verifyForgotPasswordOtpApi(clean, code, type);
      setForgotStep(3);
      setSuccessMessage('Code verified. Set your new password.');
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'OTP has expired or is invalid. Please request a new OTP.');
    } finally {
      setBusy(false);
    }
  };

  const handleForgotResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!newPwRules.minLength || !newPwRules.hasLetterAndNum || !newPwRules.hasSpecial) {
      setErrorMessage('Password must satisfy all policy requirements.');
      return;
    }

    const idVal = forgotIdentifier.trim();
    const isPhone = /^[0-9+ ]{8,15}$/.test(idVal);
    const clean = isPhone ? idVal.replace(/\D/g, '').slice(-10) : idVal.toLowerCase();
    const type = isPhone ? 'mobile' : 'email';
    const code = forgotOtpCode.join('');

    setBusy(true);
    try {
      await resetPasswordApi(clean, code, newPassword, type);
      setIsForgotFlow(false);
      setForgotStep(1);
      setActiveTab('login');
      setLoginMode('password');
      setSuccessMessage('Password reset successfully! Please log in with your new password.');
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  // Google Login Handler
  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    try {
      // In web preview without client ID, give helpful notification
      setErrorMessage('Google Sign-In is configured. Please use mobile or password login for local testing.');
    } catch (_) {}
  };

  return (
    <div className="auth-v2-page">
      {/* ================= LEFT BRAND PANEL ================= */}
      <aside className="auth-v2-left" aria-label="Vizito Healthcare Overview">
        <div>
          <div className="auth-v2-brand">
            <img src={logoImg} alt="Vizito logo" className="auth-v2-logo" />
            <div className="auth-v2-brand-text">
              <strong>vizito</strong>
              <small>Your Health. Connected.</small>
            </div>
          </div>

          <h1 className="auth-v2-hero-title">
            Healthcare made simpler for you and your family
          </h1>
          <p className="auth-v2-hero-subtitle">
            Doctors, hospitals, lab tests, pharmacy, home care and more — all in one place.
          </p>

          <div className="auth-v2-hero-image-wrap">
            <img
              src={exploreAssets.hero}
              alt="Healthcare professional caring for patient"
              className="auth-v2-hero-image"
            />
          </div>
        </div>

        {/* 3 Value Proposition Cards */}
        <div className="auth-v2-values">
          <div className="auth-v2-value-card">
            <div className="auth-v2-value-icon">
              <ShieldCheck size={20} />
            </div>
            <div className="auth-v2-value-text">
              <strong>Wide range of services</strong>
              <p>Doctors, hospitals, lab tests, pharmacy, home care, medical equipment and more.</p>
            </div>
          </div>

          <div className="auth-v2-value-card">
            <div className="auth-v2-value-icon">
              <Users size={20} />
            </div>
            <div className="auth-v2-value-text">
              <strong>For your whole family</strong>
              <p>Manage bookings and health records for your loved ones.</p>
            </div>
          </div>

          <div className="auth-v2-value-card">
            <div className="auth-v2-value-icon">
              <HeartPulse size={20} />
            </div>
            <div className="auth-v2-value-text">
              <strong>A safer, easier healthcare experience</strong>
              <p>Find trusted providers and get the care you need, when you need it.</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ================= RIGHT FORM PANEL ================= */}
      <main className="auth-v2-right">
        <div className="auth-v2-card">
          {/* Notifications / Alerts */}
          {errorMessage && (
            <div className="auth-v2-alert-error" role="alert">
              <AlertCircle size={18} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="auth-v2-alert-success" role="status">
              <CheckCircle2 size={18} className="shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Dev OTP Helper Badge */}
          {devOtpHint && (
            <div
              style={{
                background: '#fef3c7',
                border: '1px solid #fde68a',
                color: '#92400e',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                marginBottom: '14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>
                <strong>Test OTP:</strong> {devOtpHint}
              </span>
              <button
                type="button"
                style={{
                  background: '#d97706',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  const arr = devOtpHint.split('').slice(0, 6);
                  if (loginMode === 'otp-verify') setLoginOtpCode(arr);
                  else if (regOtpStep) setRegOtpCode(arr);
                  else if (forgotStep === 2) setForgotOtpCode(arr);
                }}
              >
                Auto-fill
              </button>
            </div>
          )}

          {/* ================= FLOW 1: FORGOT PASSWORD ================= */}
          {isForgotFlow ? (
            <div>
              <button
                type="button"
                onClick={() => {
                  setIsForgotFlow(false);
                  setForgotStep(1);
                  setErrorMessage('');
                }}
                className="auth-v2-link"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '16px' }}
              >
                <ArrowLeft size={16} /> Back to log in
              </button>

              <h2 className="auth-v2-card-title">Forgot password</h2>
              <p className="auth-v2-card-desc">Reset your password using OTP.</p>

              {/* 3 Steps indicator */}
              <div className="auth-v2-stepper">
                <div className={`auth-v2-step-row ${forgotStep === 1 ? 'is-active' : forgotStep > 1 ? 'is-done' : ''}`}>
                  <div className="auth-v2-step-num">{forgotStep > 1 ? <Check size={14} /> : '1'}</div>
                  <span>Verify your identity</span>
                </div>
                <div className={`auth-v2-step-row ${forgotStep === 2 ? 'is-active' : forgotStep > 2 ? 'is-done' : ''}`}>
                  <div className="auth-v2-step-num">{forgotStep > 2 ? <Check size={14} /> : '2'}</div>
                  <span>Enter OTP</span>
                </div>
                <div className={`auth-v2-step-row ${forgotStep === 3 ? 'is-active' : ''}`}>
                  <div className="auth-v2-step-num">3</div>
                  <span>Set new password</span>
                </div>
              </div>

              {/* Step 1: Request OTP */}
              {forgotStep === 1 && (
                <form onSubmit={handleForgotSendOtp}>
                  <div className="auth-v2-field">
                    <label className="auth-v2-label">
                      Mobile number or email <span className="auth-v2-req">*</span>
                    </label>
                    <div className="auth-v2-input-wrap">
                      <div className="auth-v2-input-icon">
                        <Smartphone size={18} />
                      </div>
                      <input
                        type="text"
                        placeholder="Enter mobile or email"
                        value={forgotIdentifier}
                        onChange={(e) => setForgotIdentifier(e.target.value)}
                        className="auth-v2-input"
                        autoFocus
                        required
                      />
                    </div>
                  </div>

                  <button type="submit" disabled={busy || !forgotIdentifier.trim()} className="auth-v2-btn-primary">
                    {busy ? 'Sending OTP...' : 'Send OTP'}
                  </button>
                </form>
              )}

              {/* Step 2: Enter OTP */}
              {forgotStep === 2 && (
                <form onSubmit={handleForgotVerifyOtp}>
                  <p style={{ fontSize: '13px', color: '#475569', marginBottom: '8px' }}>
                    Enter the 6-digit OTP sent to <strong>{forgotIdentifier}</strong>
                  </p>

                  <div className="auth-v2-otp-grid" onPaste={(e) => handleOtpPaste(e, setForgotOtpCode)}>
                    {forgotOtpCode.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => { otpInputRefs.current[idx] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpBoxChange(idx, e.target.value, setForgotOtpCode)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e, setForgotOtpCode, forgotOtpCode)}
                        className="auth-v2-otp-box"
                        autoFocus={idx === 0}
                      />
                    ))}
                  </div>

                  <div className="auth-v2-resend-row">
                    <span>
                      {otpCountdown > 0 ? (
                        `Resend OTP in 00:${String(otpCountdown).padStart(2, '0')}`
                      ) : (
                        <button
                          type="button"
                          className="auth-v2-link"
                          onClick={(e) => void handleForgotSendOtp(e)}
                        >
                          Resend OTP
                        </button>
                      )}
                    </span>
                    <button
                      type="button"
                      className="auth-v2-link"
                      onClick={() => setForgotStep(1)}
                    >
                      Change number
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={busy || forgotOtpCode.join('').length !== 6}
                    className="auth-v2-btn-primary"
                  >
                    {busy ? 'Verifying...' : 'Verify OTP'}
                  </button>
                </form>
              )}

              {/* Step 3: Set New Password */}
              {forgotStep === 3 && (
                <form onSubmit={handleForgotResetPassword}>
                  <div className="auth-v2-field">
                    <label className="auth-v2-label">
                      New password <span className="auth-v2-req">*</span>
                    </label>
                    <div className="auth-v2-input-wrap">
                      <div className="auth-v2-input-icon">
                        <Lock size={18} />
                      </div>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        placeholder="Enter new strong password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="auth-v2-input"
                        autoFocus
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="auth-v2-input-toggle"
                        aria-label="Toggle password visibility"
                      >
                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Password Requirements Checklist */}
                  <div className="auth-v2-pw-checklist">
                    <div className={`auth-v2-pw-item ${newPwRules.minLength ? 'is-valid' : ''}`}>
                      <div className="auth-v2-pw-dot">{newPwRules.minLength && <Check size={10} />}</div>
                      <span>At least 8 characters</span>
                    </div>
                    <div className={`auth-v2-pw-item ${newPwRules.hasLetterAndNum ? 'is-valid' : ''}`}>
                      <div className="auth-v2-pw-dot">{newPwRules.hasLetterAndNum && <Check size={10} />}</div>
                      <span>Includes a letter and a number</span>
                    </div>
                    <div className={`auth-v2-pw-item ${newPwRules.hasSpecial ? 'is-valid' : ''}`}>
                      <div className="auth-v2-pw-dot">{newPwRules.hasSpecial && <Check size={10} />}</div>
                      <span>Includes a special character (e.g. ! @ # $)</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={busy || !newPwRules.minLength || !newPwRules.hasLetterAndNum || !newPwRules.hasSpecial}
                    className="auth-v2-btn-primary"
                  >
                    {busy ? 'Updating password...' : 'Reset password'}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <>
              {/* ================= FLOW 2: LOGIN / REGISTER TABS ================= */}
              <h2 className="auth-v2-card-title">
                {activeTab === 'login' ? 'Log in to Vizito' : 'Create your Vizito account'}
              </h2>
              <p className="auth-v2-card-desc">
                {activeTab === 'login'
                  ? 'Access your bookings, medical records and more.'
                  : 'Get started with your healthcare journey.'}
              </p>

              {/* Navigation Tabs */}
              <div className="auth-v2-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'login'}
                  onClick={() => switchTab('login')}
                  className={`auth-v2-tab ${activeTab === 'login' ? 'is-active' : ''}`}
                >
                  Log in
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'register'}
                  onClick={() => switchTab('register')}
                  className={`auth-v2-tab ${activeTab === 'register' ? 'is-active' : ''}`}
                >
                  Create account
                </button>
              </div>

              {/* ================= MODE: LOG IN ================= */}
              {activeTab === 'login' && (
                <>
                  {loginMode === 'password' && (
                    <form onSubmit={handlePasswordLogin}>
                      {/* Mobile or Email */}
                      <div className="auth-v2-field">
                        <label className="auth-v2-label">
                          Mobile number or email <span className="auth-v2-req">*</span>
                        </label>
                        <div className="auth-v2-input-wrap">
                          <div className="auth-v2-input-icon">
                            <Smartphone size={18} />
                          </div>
                          <input
                            type="text"
                            placeholder="Enter 10-digit mobile or email"
                            value={loginIdentifier}
                            onChange={(e) => setLoginIdentifier(e.target.value)}
                            className="auth-v2-input"
                            autoComplete="username"
                            required
                          />
                        </div>
                      </div>

                      {/* Password */}
                      <div className="auth-v2-field">
                        <label className="auth-v2-label">
                          Password <span className="auth-v2-req">*</span>
                        </label>
                        <div className="auth-v2-input-wrap">
                          <div className="auth-v2-input-icon">
                            <Lock size={18} />
                          </div>
                          <input
                            type={showLoginPassword ? 'text' : 'password'}
                            placeholder="Enter your password"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            className="auth-v2-input"
                            autoComplete="current-password"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowLoginPassword(!showLoginPassword)}
                            className="auth-v2-input-toggle"
                            aria-label="Toggle password visibility"
                          >
                            {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>

                      {/* Remember me & Forgot Password */}
                      <div className="auth-v2-check-row">
                        <label className="auth-v2-check-label">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                          />
                          <span>Keep me logged in on this device</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setIsForgotFlow(true);
                            setForgotStep(1);
                            setForgotIdentifier(loginIdentifier);
                            setErrorMessage('');
                          }}
                          className="auth-v2-link"
                        >
                          Forgot password?
                        </button>
                      </div>

                      {/* Primary Log In CTA */}
                      <button type="submit" disabled={busy} className="auth-v2-btn-primary">
                        {busy ? 'Logging in...' : 'Log in'}
                      </button>

                      {/* Divider */}
                      <div className="auth-v2-divider">
                        <span>or</span>
                      </div>

                      {/* Google Sign-In */}
                      <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        className="auth-v2-btn-google"
                      >
                        <svg width="18" height="18" viewBox="0 0 18 18">
                          <path
                            fill="#4285F4"
                            d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"
                          />
                          <path
                            fill="#34A853"
                            d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"
                          />
                          <path
                            fill="#EA4335"
                            d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"
                          />
                        </svg>
                        <span>Continue with Google</span>
                      </button>

                      {/* Log in with OTP action card */}
                      <button
                        type="button"
                        onClick={() => {
                          setLoginMode('otp-request');
                          setOtpPhone(loginIdentifier.replace(/\D/g, '').slice(-10));
                          setErrorMessage('');
                        }}
                        className="auth-v2-card-action"
                      >
                        <div className="auth-v2-card-action-icon">
                          <Smartphone size={20} />
                        </div>
                        <div className="auth-v2-card-action-text">
                          <strong>Log in with OTP instead</strong>
                          <small>We'll send a 6-digit code to your mobile number.</small>
                        </div>
                        <ChevronRight size={18} color="#0d9488" />
                      </button>
                    </form>
                  )}

                  {/* OTP Request */}
                  {loginMode === 'otp-request' && (
                    <form onSubmit={handleRequestLoginOtp}>
                      <button
                        type="button"
                        onClick={() => {
                          setLoginMode('password');
                          setErrorMessage('');
                        }}
                        className="auth-v2-link"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '16px' }}
                      >
                        <ArrowLeft size={16} /> Back to password login
                      </button>

                      <div className="auth-v2-field">
                        <label className="auth-v2-label">
                          Mobile number <span className="auth-v2-req">*</span>
                        </label>
                        <div className="auth-v2-input-wrap">
                          <div className="auth-v2-phone-prefix">
                            <span>🇮🇳 +91</span>
                          </div>
                          <input
                            type="tel"
                            placeholder="98765 43210"
                            value={otpPhone}
                            onChange={(e) => setOtpPhone(e.target.value)}
                            maxLength={10}
                            className="auth-v2-input"
                            autoFocus
                            required
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={busy || otpPhone.replace(/\D/g, '').length !== 10}
                        className="auth-v2-btn-primary"
                      >
                        {busy ? 'Sending code...' : 'Send OTP'}
                      </button>
                    </form>
                  )}

                  {/* OTP Verify */}
                  {loginMode === 'otp-verify' && (
                    <form onSubmit={handleVerifyLoginOtp}>
                      <button
                        type="button"
                        onClick={() => {
                          setLoginMode('otp-request');
                          setErrorMessage('');
                        }}
                        className="auth-v2-link"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '16px' }}
                      >
                        <ArrowLeft size={16} /> Change phone number
                      </button>

                      <p style={{ fontSize: '13px', color: '#475569', margin: '8px 0 14px 0' }}>
                        Enter the 6-digit OTP sent to <strong>+91 {otpPhone}</strong>
                      </p>

                      <div className="auth-v2-otp-grid" onPaste={(e) => handleOtpPaste(e, setLoginOtpCode)}>
                        {loginOtpCode.map((digit, idx) => (
                          <input
                            key={idx}
                            ref={(el) => { otpInputRefs.current[idx] = el; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleOtpBoxChange(idx, e.target.value, setLoginOtpCode)}
                            onKeyDown={(e) => handleOtpKeyDown(idx, e, setLoginOtpCode, loginOtpCode)}
                            className="auth-v2-otp-box"
                            autoFocus={idx === 0}
                          />
                        ))}
                      </div>

                      <div className="auth-v2-resend-row">
                        <span>
                          {otpCountdown > 0 ? (
                            `Resend OTP in 00:${String(otpCountdown).padStart(2, '0')}`
                          ) : (
                            <button
                              type="button"
                              className="auth-v2-link"
                              onClick={(e) => void handleRequestLoginOtp(e)}
                            >
                              Resend OTP
                            </button>
                          )}
                        </span>
                      </div>

                      <button
                        type="submit"
                        disabled={busy || loginOtpCode.join('').length !== 6}
                        className="auth-v2-btn-primary"
                      >
                        {busy ? 'Verifying...' : 'Log in'}
                      </button>
                    </form>
                  )}
                </>
              )}

              {/* ================= MODE: CREATE ACCOUNT ================= */}
              {activeTab === 'register' && (
                <>
                  {!regOtpStep ? (
                    <form onSubmit={handleRegisterSendOtp}>
                      {/* Full name */}
                      <div className="auth-v2-field">
                        <label className="auth-v2-label">
                          Full name <span className="auth-v2-req">*</span>
                        </label>
                        <div className="auth-v2-input-wrap">
                          <div className="auth-v2-input-icon">
                            <User size={18} />
                          </div>
                          <input
                            type="text"
                            placeholder="e.g. Kavya Reddy"
                            value={regFullName}
                            onChange={(e) => setRegFullName(e.target.value)}
                            className="auth-v2-input"
                            required
                          />
                        </div>
                      </div>

                      {/* Mobile number */}
                      <div className="auth-v2-field">
                        <label className="auth-v2-label">
                          Mobile number <span className="auth-v2-req">*</span>
                        </label>
                        <div className="auth-v2-input-wrap">
                          <div className="auth-v2-phone-prefix">
                            <span>🇮🇳 +91</span>
                          </div>
                          <input
                            type="tel"
                            placeholder="98765 43210"
                            value={regPhone}
                            onChange={(e) => setRegPhone(e.target.value)}
                            maxLength={10}
                            className="auth-v2-input"
                            required
                          />
                        </div>
                      </div>

                      {/* Email (optional) */}
                      <div className="auth-v2-field">
                        <label className="auth-v2-label">Email (optional)</label>
                        <div className="auth-v2-input-wrap">
                          <div className="auth-v2-input-icon">
                            <Mail size={18} />
                          </div>
                          <input
                            type="email"
                            placeholder="name@example.com"
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            className="auth-v2-input"
                          />
                        </div>
                      </div>

                      {/* Date of birth */}
                      <div className="auth-v2-field">
                        <label className="auth-v2-label">
                          Date of birth <span className="auth-v2-req">*</span>
                        </label>
                        <div className="auth-v2-input-wrap">
                          <div className="auth-v2-input-icon">
                            <Calendar size={18} />
                          </div>
                          <input
                            type="date"
                            value={regDob}
                            onChange={(e) => setRegDob(e.target.value)}
                            max={new Date().toISOString().split('T')[0]}
                            className="auth-v2-input"
                            required
                          />
                        </div>
                      </div>

                      {/* Gender */}
                      <div className="auth-v2-field">
                        <label className="auth-v2-label">
                          Gender <span className="auth-v2-req">*</span>
                        </label>
                        <div className="auth-v2-radio-group">
                          {(['Female', 'Male', 'Other'] as const).map((gender) => (
                            <label
                              key={gender}
                              className={`auth-v2-radio-pill ${regGender === gender ? 'is-selected' : ''}`}
                            >
                              <input
                                type="radio"
                                name="reg_gender"
                                value={gender}
                                checked={regGender === gender}
                                onChange={() => setRegGender(gender)}
                              />
                              <span>{gender}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Password */}
                      <div className="auth-v2-field">
                        <label className="auth-v2-label">
                          Password <span className="auth-v2-req">*</span>
                        </label>
                        <div className="auth-v2-input-wrap">
                          <div className="auth-v2-input-icon">
                            <Lock size={18} />
                          </div>
                          <input
                            type={showRegPassword ? 'text' : 'password'}
                            placeholder="Create a strong password"
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            className="auth-v2-input"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegPassword(!showRegPassword)}
                            className="auth-v2-input-toggle"
                            aria-label="Toggle password visibility"
                          >
                            {showRegPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>

                      {/* Confirm Password */}
                      <div className="auth-v2-field">
                        <label className="auth-v2-label">
                          Confirm password <span className="auth-v2-req">*</span>
                        </label>
                        <div className="auth-v2-input-wrap">
                          <div className="auth-v2-input-icon">
                            <Lock size={18} />
                          </div>
                          <input
                            type={showRegPassword ? 'text' : 'password'}
                            placeholder="Re-enter password"
                            value={regConfirmPassword}
                            onChange={(e) => setRegConfirmPassword(e.target.value)}
                            className="auth-v2-input"
                            required
                          />
                        </div>
                      </div>

                      {/* Live Password Requirements Checklist */}
                      <div className="auth-v2-pw-checklist">
                        <div className={`auth-v2-pw-item ${regPwRules.minLength ? 'is-valid' : ''}`}>
                          <div className="auth-v2-pw-dot">{regPwRules.minLength && <Check size={10} />}</div>
                          <span>At least 8 characters</span>
                        </div>
                        <div className={`auth-v2-pw-item ${regPwRules.hasLetterAndNum ? 'is-valid' : ''}`}>
                          <div className="auth-v2-pw-dot">{regPwRules.hasLetterAndNum && <Check size={10} />}</div>
                          <span>Includes a letter and a number</span>
                        </div>
                        <div className={`auth-v2-pw-item ${regPwRules.hasSpecial ? 'is-valid' : ''}`}>
                          <div className="auth-v2-pw-dot">{regPwRules.hasSpecial && <Check size={10} />}</div>
                          <span>Includes a special character (e.g. ! @ # $)</span>
                        </div>
                        <div className={`auth-v2-pw-item ${regPasswordsMatch ? 'is-valid' : ''}`}>
                          <div className="auth-v2-pw-dot">{regPasswordsMatch && <Check size={10} />}</div>
                          <span>Confirm password matches</span>
                        </div>
                      </div>

                      {/* Terms Agreement */}
                      <div className="auth-v2-check-row" style={{ marginTop: '16px' }}>
                        <label className="auth-v2-check-label">
                          <input
                            type="checkbox"
                            checked={regAgreedTerms}
                            onChange={(e) => setRegAgreedTerms(e.target.checked)}
                            required
                          />
                          <span>
                            I agree to the <span className="auth-v2-link">Terms of Service</span> and{' '}
                            <span className="auth-v2-link">Privacy Policy</span>.
                          </span>
                        </label>
                      </div>

                      {/* Submit */}
                      <button
                        type="submit"
                        disabled={busy || !isRegFormValid}
                        className="auth-v2-btn-primary"
                      >
                        {busy ? 'Preparing OTP...' : 'Send OTP'}
                      </button>

                      <p style={{ textAlign: 'center', fontSize: '12px', color: '#64748b', marginTop: '12px' }}>
                        We will send a 6-digit OTP to +91 {regPhone || '98765 43210'}
                      </p>
                    </form>
                  ) : (
                    /* Step 2: Verify Registration OTP */
                    <form onSubmit={handleRegisterVerifyAndSubmit}>
                      <button
                        type="button"
                        onClick={() => {
                          setRegOtpStep(false);
                          setErrorMessage('');
                        }}
                        className="auth-v2-link"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '16px' }}
                      >
                        <ArrowLeft size={16} /> Back to details
                      </button>

                      <p style={{ fontSize: '13px', color: '#475569', marginBottom: '10px' }}>
                        Enter the 6-digit OTP sent to <strong>+91 {regPhone}</strong>
                      </p>

                      <div className="auth-v2-otp-grid" onPaste={(e) => handleOtpPaste(e, setRegOtpCode)}>
                        {regOtpCode.map((digit, idx) => (
                          <input
                            key={idx}
                            ref={(el) => { otpInputRefs.current[idx] = el; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleOtpBoxChange(idx, e.target.value, setRegOtpCode)}
                            onKeyDown={(e) => handleOtpKeyDown(idx, e, setRegOtpCode, regOtpCode)}
                            className="auth-v2-otp-box"
                            autoFocus={idx === 0}
                          />
                        ))}
                      </div>

                      <div className="auth-v2-resend-row">
                        <span>
                          {otpCountdown > 0 ? (
                            `Resend OTP in 00:${String(otpCountdown).padStart(2, '0')}`
                          ) : (
                            <button
                              type="button"
                              className="auth-v2-link"
                              onClick={(e) => void handleRegisterSendOtp(e)}
                            >
                              Resend OTP
                            </button>
                          )}
                        </span>
                      </div>

                      <button
                        type="submit"
                        disabled={busy || regOtpCode.join('').length !== 6}
                        className="auth-v2-btn-primary"
                      >
                        {busy ? 'Creating account...' : 'Verify & Create account'}
                      </button>
                    </form>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
