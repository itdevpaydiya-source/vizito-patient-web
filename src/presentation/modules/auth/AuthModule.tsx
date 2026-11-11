import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Calendar,
  Stethoscope,
  Building2,
  FlaskConical,
  Pill,
  Home,
  Accessibility,
  Ambulance,
  Droplet,
  ShieldCheck,
  Zap,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  Check,
  RefreshCw,
} from 'lucide-react';
import logoImg from '../../../assets/vizito_logo.png';
import familyImg from '../../../assets/auth-family.jpg';
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
import { suggestEmailFix } from '../../../utils/emailTypo';

interface AuthModuleProps {
  onLoginSuccess: (user: any) => void;
  onRegisterClick?: () => void;
  initialTab?: 'login' | 'register';
}

type MainTab = 'login' | 'register';

// Every service a patient can use on Vizito, shown on the sign-in panel.
const AUTH_SERVICES = [
  { icon: Stethoscope, title: 'Doctors', desc: 'In-clinic or online visits' },
  { icon: Building2, title: 'Hospitals', desc: 'Trusted and nearby' },
  { icon: FlaskConical, title: 'Lab tests', desc: 'Home sample or at a centre' },
  { icon: Pill, title: 'Pharmacy', desc: 'Genuine medicines' },
  { icon: Home, title: 'Home care', desc: 'Nursing and care at home' },
  { icon: Accessibility, title: 'Medical equipment', desc: 'Rent or buy' },
  { icon: Ambulance, title: 'Ambulance', desc: 'Book when it matters' },
  { icon: Droplet, title: 'Blood', desc: 'Find or donate' },
];
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
  // Field-level messages for password login (NEW-04): shown under the field, not in the top banner.
  const [loginErr, setLoginErr] = useState<{ id?: string; pw?: string }>({});
  const [rememberMe, setRememberMe] = useState(true);

  // OTP Login state
  const [otpPhone, setOtpPhone] = useState('');
  // Log in with a code sent to a mobile number or an email (NEW-03).
  const [loginOtpChannel, setLoginOtpChannel] = useState<'mobile' | 'email'>('mobile');
  const loginOtpId = loginOtpChannel === 'mobile' ? otpPhone.replace(/\D/g, '').slice(-10) : otpPhone.trim().toLowerCase();
  const loginOtpLabel = loginOtpChannel === 'mobile' ? `+91 ${loginOtpId}` : loginOtpId;
  const loginOtpValid = loginOtpChannel === 'mobile' ? /^[6-9]\d{9}$/.test(loginOtpId) : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(loginOtpId);
  const [loginOtpCode, setLoginOtpCode] = useState(['', '', '', '', '', '']);
  const [otpCountdown, setOtpCountdown] = useState(30);
  const [canResendOtp, setCanResendOtp] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState('');
  // Dev server only (no SMS provider): the test OTP fills the boxes by itself.
  useEffect(() => {
    if (!devOtpHint) return;
    const arr = devOtpHint.split('').slice(0, 6);
    if (loginMode === 'otp-verify') setLoginOtpCode(arr);
    else if (regOtpStep) setRegOtpCode(arr);
    else if (forgotStep === 2) setForgotOtpCode(arr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devOtpHint]);

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
  // Sign-up runs in 3 short steps: 1 mobile/email, 2 code, 3 about you (each fits one screen).
  const [regStep, setRegStep] = useState<1 | 2 | 3>(1);
  const [regChannel, setRegChannel] = useState<'mobile' | 'email'>('mobile');
  const [regContact, setRegContact] = useState('');
  const regOtpStep = regStep === 2;
  const [showRegConfirm, setShowRegConfirm] = useState(false);
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
    setRegStep(1);
    setRegToken('');
    setDevOtpHint('');
    setShowRegErrors(false);
    setLoginErr({});
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
    const digits = idVal.replace(/[\s+-]/g, '');
    const looksLikePhone = /^\d+$/.test(digits);
    const cleanPhone = digits.replace(/^(91|0)(?=\d{10}$)/, '');
    const errs: { id?: string; pw?: string } = {};
    if (!idVal) errs.id = 'Enter your mobile number or email.';
    else if (looksLikePhone && !/^[6-9]\d{9}$/.test(cleanPhone)) errs.id = 'Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9.';
    else if (!looksLikePhone && idVal.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(idVal)) errs.id = 'Enter a valid email address, like name@gmail.com.';
    else if (!looksLikePhone && !idVal.includes('@')) errs.id = 'Enter a valid mobile number or email.';
    if (!loginPassword) errs.pw = 'Enter your password.';
    setLoginErr(errs);
    if (errs.id || errs.pw) {
      document.getElementById(errs.id ? 'login-id' : 'login-password')?.focus();
      return;
    }

    setBusy(true);
    try {
      const payload = looksLikePhone
        ? { phone: cleanPhone, password: loginPassword }
        : { email: idVal.toLowerCase(), password: loginPassword };

      const res = await loginPatientApi(payload);
      if (res?.success || res?.token || res?.access_token) {
        const userData = {
          patient_id: res.patient_id || res.data?.patient_id || res.userId || 'kavya-reddy',
          email: res.email || res.data?.email || (looksLikePhone ? '' : idVal),
          mobile: res.mobile || res.data?.mobile || (looksLikePhone ? cleanPhone : ''),
          fullName: res.full_name || res.data?.fullName || res.data?.user?.fullName || 'Kavya Reddy',
          token: res.token || res.access_token || res.data?.access_token,
        };
        onLoginSuccess(userData);
      } else {
        setLoginErr({ pw: 'Mobile number/email or password is incorrect.' });
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const raw = err?.response?.data?.message;
      const msg = Array.isArray(raw) ? raw.join(' ') : String(raw || err?.message || '');
      if (!err?.response) {
        setErrorMessage('Could not reach Vizito. Check your internet connection and try again.');
      } else if (status === 429 || /too many|locked|try again in/i.test(msg)) {
        setErrorMessage(msg || 'Too many attempts. Please wait a few minutes and try again.');
      } else {
        // Never say which one is wrong, or whether the account exists.
        setLoginErr({ pw: 'Mobile number/email or password is incorrect.' });
      }
    } finally {
      setBusy(false);
    }
  };

  // ================= 2. OTP LOGIN FLOW =================
  const handleRequestLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!loginOtpValid) {
      setErrorMessage(loginOtpChannel === 'mobile'
        ? 'Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9.'
        : 'Enter a valid email address, like name@gmail.com.');
      return;
    }

    setBusy(true);
    try {
      const res = await sendOtpApi(loginOtpId, loginOtpChannel);
      setLoginMode('otp-verify');
      setOtpCountdown(30);
      setCanResendOtp(false);
      if (res?.dev_otp) {
        setDevOtpHint(String(res.dev_otp));
      }
      setSuccessMessage(`Code sent to ${loginOtpLabel}`);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Unable to send the code. Please check and try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const code = loginOtpCode.join('');
    if (code.length !== 6) {
      setErrorMessage('Please enter the full 6-digit OTP code.');
      return;
    }

    setBusy(true);
    try {
      const res = await verifyOtpApi(loginOtpId, code, loginOtpChannel);
      if (res?.success || res?.token || res?.access_token) {
        const userData = {
          patient_id: res.patient_id || res.data?.patient_id || 'patient-user',
          email: res.email || res.data?.email || (loginOtpChannel === 'email' ? loginOtpId : ''),
          mobile: res.mobile || res.data?.mobile || (loginOtpChannel === 'mobile' ? loginOtpId : ''),
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
  const regContactClean = regChannel === 'mobile' ? regContact.replace(/\D/g, '').slice(-10) : regContact.trim().toLowerCase();
  const regMobileClean = regChannel === 'mobile' ? regContactClean : regPhone.replace(/\D/g, '').slice(-10);
  const regContactLabel = regChannel === 'mobile' ? `+91 ${regContactClean}` : regContactClean;

  // Errors show under their own field after the first tap on the step's button (NEW-01, TC-08).
  const [showRegErrors, setShowRegErrors] = useState(false);
  type RegField = 'contact' | 'terms' | 'name' | 'phone' | 'dob' | 'password' | 'confirm';
  const regErrors: Partial<Record<RegField, string>> = {};
  if (regChannel === 'mobile' && !/^[6-9]\d{9}$/.test(regContactClean))
    regErrors.contact = 'Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9.';
  if (regChannel === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(regContactClean))
    regErrors.contact = 'Enter a valid email address, like name@gmail.com.';
  if (!regAgreedTerms) regErrors.terms = 'Accept the Terms of Service and Privacy Policy to continue.';
  // Same rule as the server: letters, spaces, dots, apostrophes and hyphens only (TC-04, TC-06).
  if (regFullName.trim().length < 2) regErrors.name = 'Enter your full name.';
  else if (!/^[A-Za-z][A-Za-z .'-]*$/.test(regFullName.trim())) regErrors.name = 'Use letters only (spaces, dots and hyphens are fine).';
  if (regChannel === 'email' && !/^[6-9]\d{9}$/.test(regMobileClean))
    regErrors.phone = 'Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9.';
  if (!regDob) regErrors.dob = 'Enter your date of birth.';
  else if (regDob > new Date().toISOString().slice(0, 10)) regErrors.dob = 'Date of birth cannot be in the future.';
  if (!regPassword) regErrors.password = 'Create a password.';
  else if (!regPwRules.minLength) regErrors.password = 'Password must be at least 8 characters.';
  else if (!regPwRules.hasLetterAndNum) regErrors.password = 'Password must include a letter and a number.';
  else if (!regPwRules.hasSpecial) regErrors.password = 'Password must include a special character (e.g. ! @ # $).';
  if (!regConfirmPassword) regErrors.confirm = 'Re-enter your password.';
  else if (!regPasswordsMatch) regErrors.confirm = 'Passwords do not match.';
  const regErr = (k: RegField) => (showRegErrors ? regErrors[k] : undefined);
  const firstRegError = (fields: RegField[]) => {
    const first = fields.find((k) => regErrors[k]);
    if (!first) return false;
    setShowRegErrors(true);
    document.getElementById(`reg-${first}`)?.focus();
    return true;
  };

  // Step 1 (and Resend): send a code to the chosen mobile or email.
  const handleRegisterSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    if (firstRegError(['contact', 'terms'])) return;
    setBusy(true);
    try {
      const res = await registerSendOtpApi(regContactClean, regChannel);
      setRegStep(2);
      setShowRegErrors(false);
      setRegOtpCode(['', '', '', '', '', '']);
      setOtpCountdown(30);
      setCanResendOtp(false);
      setDevOtpHint(res?.dev_otp ? String(res.dev_otp) : '');
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Unable to send the code. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  // Back to step 1 to change the mobile/email: the old code is no longer valid.
  const restartRegistration = () => {
    setRegStep(1);
    setRegToken('');
    setDevOtpHint('');
    setRegOtpCode(['', '', '', '', '', '']);
    setErrorMessage('');
    setSuccessMessage('');
  };

  // Step 2: check the code; the server returns a short-lived proof used in step 3.
  const handleRegisterVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const code = regOtpCode.join('');
    if (code.length !== 6) {
      setErrorMessage('Enter the 6-digit code.');
      return;
    }
    setBusy(true);
    try {
      const verifyRes = await registerVerifyOtpApi(regContactClean, code, regChannel);
      const token = verifyRes?.registration_token || verifyRes?.data?.registration_token;
      if (!token) throw new Error('Could not verify the code. Please try again.');
      setRegToken(token);
      setDevOtpHint('');
      setRegStep(3);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || 'Invalid or expired code. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  // Step 3: create the account with the verified contact.
  const handleRegisterVerifyAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (firstRegError(['name', 'phone', 'dob', 'password', 'confirm'])) return;
    setBusy(true);
    try {
      const email = regChannel === 'email' ? regContactClean : undefined;
      const regRes = await registerPatientApi({
        full_name: regFullName.trim(),
        phone: regMobileClean,
        email,
        password: regPassword,
        registration_token: regToken,
        date_of_birth: regDob,
        gender: regGender,
      });
      const token = regRes?.token || regRes?.access_token || regRes?.data?.access_token;
      const loginRes = token ? null : await loginPatientApi({ phone: regMobileClean, password: regPassword });
      // The dashboard shows "Welcome to Vizito, <name>! Your account is ready." once (TC-22).
      try { sessionStorage.setItem('vizito_welcome', '1'); } catch { /* storage blocked: skip the banner */ }
      onLoginSuccess({
        patient_id: regRes?.patient_id || regRes?.data?.patient_id || loginRes?.patient_id || 'new-patient',
        email: email || '',
        mobile: regMobileClean,
        fullName: regFullName.trim(),
        token: token || loginRes?.token || loginRes?.access_token,
      });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Registration failed. Please try again.';
      if (/token|verification/i.test(String(msg))) {
        // The 15-minute proof ran out or was used: verify again from step 1.
        restartRegistration();
        setErrorMessage('Your verification expired. Please verify your mobile or email again.');
      } else {
        setErrorMessage(Array.isArray(msg) ? msg.join(' ') : msg);
      }
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
      {/* One panel for Log in and Create account: family photo on top, every Vizito service below. */}
      <aside className="auth-v2-left" aria-label="About Vizito">
        <div className="auth-v2-left-inner">
          <img src={familyImg} alt="" className="auth-v2-left-photo" />
          <div className="auth-v2-brand">
            <img src={logoImg} alt="Vizito logo" className="auth-v2-logo" />
            <div className="auth-v2-brand-text">
              <strong>vizito</strong>
              <small>Your Health. Connected.</small>
            </div>
          </div>

          <div className="auth-v2-left-copy">
            <h1 className="auth-v2-hero-title">Your health, closer to you</h1>
            <p className="auth-v2-hero-subtitle">
              Doctors, hospitals, lab tests, medicines and care at home, for you and your family, in one place.
            </p>
            <ul className="auth-v2-services" aria-label="Vizito services">
              {AUTH_SERVICES.map(({ icon: Icon, title }) => (
                <li key={title}>
                  <Icon size={22} aria-hidden="true" />
                  <span>{title}</span>
                </li>
              ))}
            </ul>
            <ul className="auth-v2-trust" aria-label="Why Vizito">
              <li><ShieldCheck size={18} aria-hidden="true" /> Verified providers</li>
              <li><Zap size={18} aria-hidden="true" /> Easy booking</li>
              <li><Lock size={18} aria-hidden="true" /> Secure &amp; private</li>
            </ul>
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
              {!(activeTab === 'register' && regStep > 1) && (
                <>
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
                  <h2 className="auth-v2-card-title">
                    {activeTab === 'login' ? 'Log in to Vizito' : 'Create your Vizito account'}
                  </h2>
                  <p className="auth-v2-card-desc">
                    {activeTab === 'login' ? 'Access your bookings, medical records and more.' : 'Step 1 of 3'}
                  </p>
                </>
              )}

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
                        <div className={`auth-v2-input-wrap ${loginErr.id ? 'has-error' : ''}`}>
                          <div className="auth-v2-input-icon">
                            <Smartphone size={18} />
                          </div>
                          <input
                            id="login-id"
                            type="text"
                            placeholder="Enter 10-digit mobile or email"
                            value={loginIdentifier}
                            onChange={(e) => { setLoginIdentifier(e.target.value); setLoginErr((x) => ({ ...x, id: undefined })); }}
                            className="auth-v2-input"
                            autoComplete="username"
                            aria-invalid={Boolean(loginErr.id)}
                          />
                        </div>
                        {loginErr.id && <p className="auth-v2-field-error" role="alert">{loginErr.id}</p>}
                        {!loginErr.id && loginIdentifier.includes('@') && suggestEmailFix(loginIdentifier.trim()) && (
                          <p className="auth-v2-hint">
                            Did you mean{' '}
                            <button type="button" className="auth-v2-link" onClick={() => setLoginIdentifier(suggestEmailFix(loginIdentifier.trim()) as string)}>
                              {suggestEmailFix(loginIdentifier.trim())}
                            </button>
                            ?
                          </p>
                        )}
                      </div>

                      {/* Password */}
                      <div className="auth-v2-field">
                        <label className="auth-v2-label">
                          Password <span className="auth-v2-req">*</span>
                        </label>
                        <div className={`auth-v2-input-wrap ${loginErr.pw ? 'has-error' : ''}`}>
                          <div className="auth-v2-input-icon">
                            <Lock size={18} />
                          </div>
                          <input
                            id="login-password"
                            type={showLoginPassword ? 'text' : 'password'}
                            placeholder="Enter your password"
                            value={loginPassword}
                            onChange={(e) => { setLoginPassword(e.target.value); setLoginErr((x) => ({ ...x, pw: undefined })); }}
                            className="auth-v2-input"
                            autoComplete="current-password"
                            aria-invalid={Boolean(loginErr.pw)}
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
                        {loginErr.pw && <p className="auth-v2-field-error" role="alert">{loginErr.pw}</p>}
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
                          <small>We'll send a 6-digit code to your mobile number or email.</small>
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

                      <div className="auth-v2-seg" role="radiogroup" aria-label="Send the code to">
                        {(['mobile', 'email'] as const).map((ch) => (
                          <button
                            key={ch}
                            type="button"
                            role="radio"
                            aria-checked={loginOtpChannel === ch}
                            className={`auth-v2-seg-btn ${loginOtpChannel === ch ? 'is-active' : ''}`}
                            onClick={() => { setLoginOtpChannel(ch); setOtpPhone(''); setErrorMessage(''); }}
                          >
                            {ch === 'mobile' ? <Smartphone size={16} /> : <Mail size={16} />}
                            {ch === 'mobile' ? 'Mobile' : 'Email'}
                          </button>
                        ))}
                      </div>

                      <div className="auth-v2-field">
                        <label className="auth-v2-label" htmlFor="login-otp-id">
                          {loginOtpChannel === 'mobile' ? 'Mobile number' : 'Email address'} <span className="auth-v2-req">*</span>
                        </label>
                        <div className="auth-v2-input-wrap">
                          {loginOtpChannel === 'mobile' ? (
                            <div className="auth-v2-phone-prefix"><span>🇮🇳 +91</span></div>
                          ) : (
                            <div className="auth-v2-input-icon"><Mail size={18} /></div>
                          )}
                          <input
                            id="login-otp-id"
                            type={loginOtpChannel === 'mobile' ? 'tel' : 'email'}
                            inputMode={loginOtpChannel === 'mobile' ? 'numeric' : 'email'}
                            placeholder={loginOtpChannel === 'mobile' ? '98765 43210' : 'name@gmail.com'}
                            value={otpPhone}
                            onChange={(e) => setOtpPhone(loginOtpChannel === 'mobile' ? e.target.value.replace(/\D/g, '').slice(0, 10) : e.target.value)}
                            className="auth-v2-input"
                            autoFocus
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={busy || !loginOtpValid}
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
                        <ArrowLeft size={16} /> {loginOtpChannel === 'mobile' ? 'Change number' : 'Change email'}
                      </button>

                      <p style={{ fontSize: '13px', color: '#475569', margin: '8px 0 14px 0' }}>
                        Enter the 6-digit code sent to <strong>{loginOtpLabel}</strong>
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
              {activeTab === 'register' && regStep === 1 && (
                <form onSubmit={handleRegisterSendOtp} noValidate>
                  <div className="auth-v2-seg" role="radiogroup" aria-label="Sign up with">
                    {(['mobile', 'email'] as const).map((ch) => (
                      <button
                        key={ch}
                        type="button"
                        role="radio"
                        aria-checked={regChannel === ch}
                        className={`auth-v2-seg-btn ${regChannel === ch ? 'is-active' : ''}`}
                        onClick={() => { setRegChannel(ch); setRegContact(''); setShowRegErrors(false); }}
                      >
                        {ch === 'mobile' ? <Smartphone size={16} /> : <Mail size={16} />}
                        {ch === 'mobile' ? 'Mobile' : 'Email'}
                      </button>
                    ))}
                  </div>

                  <div className="auth-v2-field">
                    <label className="auth-v2-label" htmlFor="reg-contact">
                      {regChannel === 'mobile' ? 'Mobile number' : 'Email address'} <span className="auth-v2-req">*</span>
                    </label>
                    <div className={`auth-v2-input-wrap ${regErr('contact') ? 'has-error' : ''}`}>
                      {regChannel === 'mobile' ? (
                        <div className="auth-v2-phone-prefix"><span>🇮🇳 +91</span></div>
                      ) : (
                        <div className="auth-v2-input-icon"><Mail size={18} /></div>
                      )}
                      <input
                        id="reg-contact"
                        type={regChannel === 'mobile' ? 'tel' : 'email'}
                        inputMode={regChannel === 'mobile' ? 'numeric' : 'email'}
                        autoComplete={regChannel === 'mobile' ? 'tel-national' : 'email'}
                        placeholder={regChannel === 'mobile' ? '98765 43210' : 'name@gmail.com'}
                        value={regContact}
                        onChange={(e) => setRegContact(regChannel === 'mobile' ? e.target.value.replace(/\D/g, '').slice(0, 10) : e.target.value)}
                        className="auth-v2-input"
                      />
                    </div>
                    {regErr('contact') && <p className="auth-v2-field-error" role="alert">{regErr('contact')}</p>}
                    {regChannel === 'email' && suggestEmailFix(regContact) && (
                      <p className="auth-v2-hint">
                        Did you mean{' '}
                        <button type="button" className="auth-v2-link" onClick={() => setRegContact(suggestEmailFix(regContact) as string)}>
                          {suggestEmailFix(regContact)}
                        </button>
                        ?
                      </p>
                    )}
                  </div>

                  <div className="auth-v2-check-row">
                    <label className="auth-v2-check-label">
                      <input id="reg-terms" type="checkbox" checked={regAgreedTerms} onChange={(e) => setRegAgreedTerms(e.target.checked)} />
                      <span>
                        I agree to Vizito's <span className="auth-v2-link">Terms of Service</span> and{' '}
                        <span className="auth-v2-link">Privacy Policy</span>.
                      </span>
                    </label>
                  </div>
                  {regErr('terms') && <p className="auth-v2-field-error" role="alert">{regErr('terms')}</p>}

                  <button type="submit" disabled={busy} className="auth-v2-btn-primary">
                    {busy ? 'Sending code...' : 'Send code'}
                  </button>
                  {!regErrors.contact && (
                    <p className="auth-v2-foot-note">We will send a 6-digit code to <strong>{regContactLabel}</strong></p>
                  )}
                </form>
              )}

              {activeTab === 'register' && regStep === 2 && (
                <form onSubmit={handleRegisterVerifyOtp}>
                  <div className="auth-v2-step-head">
                    <button type="button" className="auth-v2-back" onClick={restartRegistration} aria-label="Back to step 1">
                      <ArrowLeft size={20} />
                    </button>
                    <span>Step 2 of 3</span>
                  </div>
                  <p className="auth-v2-code-title">
                    Enter the 6-digit code sent to <strong>{regContactLabel}</strong>
                  </p>

                  <div className="auth-v2-otp-grid" onPaste={(e) => handleOtpPaste(e, setRegOtpCode)}>
                    {regOtpCode.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => { otpInputRefs.current[idx] = el; }}
                        type="text"
                        inputMode="numeric"
                        autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                        aria-label={`Digit ${idx + 1}`}
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
                    <button type="button" className="auth-v2-link" onClick={restartRegistration}>
                      {regChannel === 'mobile' ? 'Change number' : 'Change email'}
                    </button>
                    {otpCountdown > 0 ? (
                      <span>Resend in 0:{String(otpCountdown).padStart(2, '0')}</span>
                    ) : (
                      <button type="button" className="auth-v2-link" onClick={(e) => void handleRegisterSendOtp(e)}>
                        Resend code
                      </button>
                    )}
                  </div>

                  <button type="submit" disabled={busy || regOtpCode.join('').length !== 6} className="auth-v2-btn-primary">
                    {busy ? 'Verifying...' : 'Verify'}
                  </button>
                </form>
              )}

              {activeTab === 'register' && regStep === 3 && (
                <form onSubmit={handleRegisterVerifyAndSubmit} noValidate>
                  <div className="auth-v2-step-head">
                    <button type="button" className="auth-v2-back" onClick={restartRegistration} aria-label="Start again">
                      <ArrowLeft size={20} />
                    </button>
                    <span>Step 3 of 3</span>
                  </div>
                  <h2 className="auth-v2-card-title">Tell us about you</h2>
                  <p className="auth-v2-card-desc auth-v2-verified">
                    <CheckCircle2 size={14} className="auth-v2-verified-icon" /> Verified: {regContactLabel}
                  </p>

                  <div className="auth-v2-field">
                    <label className="auth-v2-label" htmlFor="reg-name">Full name <span className="auth-v2-req">*</span></label>
                    <div className={`auth-v2-input-wrap ${regErr('name') ? 'has-error' : ''}`}>
                      <div className="auth-v2-input-icon"><User size={18} /></div>
                      <input id="reg-name" type="text" autoComplete="name" placeholder="Enter your full name" value={regFullName} onChange={(e) => setRegFullName(e.target.value)} className="auth-v2-input" />
                    </div>
                    {regErr('name') && <p className="auth-v2-field-error" role="alert">{regErr('name')}</p>}
                  </div>

                  {regChannel === 'email' && (
                    <div className="auth-v2-field">
                      <label className="auth-v2-label" htmlFor="reg-phone">Mobile number <span className="auth-v2-req">*</span></label>
                      <div className={`auth-v2-input-wrap ${regErr('phone') ? 'has-error' : ''}`}>
                        <div className="auth-v2-phone-prefix"><span>🇮🇳 +91</span></div>
                        <input id="reg-phone" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="98765 43210" value={regPhone} onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} className="auth-v2-input" />
                      </div>
                      {regErr('phone') ? <p className="auth-v2-field-error" role="alert">{regErr('phone')}</p> : <p className="auth-v2-hint">So doctors, hospitals and delivery staff can reach you.</p>}
                    </div>
                  )}

                  <div className="auth-v2-row-2">
                    <div className="auth-v2-field">
                      <label className="auth-v2-label" htmlFor="reg-dob">Date of birth <span className="auth-v2-req">*</span></label>
                      <div className={`auth-v2-input-wrap ${regErr('dob') ? 'has-error' : ''}`}>
                        <input id="reg-dob" type="date" value={regDob} onChange={(e) => setRegDob(e.target.value)} max={new Date().toISOString().split('T')[0]} className="auth-v2-input auth-v2-input-plain" />
                      </div>
                      {regErr('dob') && <p className="auth-v2-field-error" role="alert">{regErr('dob')}</p>}
                    </div>
                    <div className="auth-v2-field">
                      <span className="auth-v2-label">Gender <span className="auth-v2-req">*</span></span>
                      <div className="auth-v2-gender" role="radiogroup" aria-label="Gender">
                        {(['Female', 'Male', 'Other'] as const).map((g) => (
                          <label key={g} className={`auth-v2-gender-opt ${regGender === g ? 'is-selected' : ''}`}>
                            <input type="radio" name="reg_gender" value={g} checked={regGender === g} onChange={() => setRegGender(g)} />
                            <span>{g}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="auth-v2-field">
                    <label className="auth-v2-label" htmlFor="reg-password">Password <span className="auth-v2-req">*</span></label>
                    <div className={`auth-v2-input-wrap ${regErr('password') ? 'has-error' : ''}`}>
                      <div className="auth-v2-input-icon"><Lock size={18} /></div>
                      <input id="reg-password" type={showRegPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Create a password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className="auth-v2-input" />
                      <button type="button" onClick={() => setShowRegPassword(!showRegPassword)} className="auth-v2-input-toggle" aria-label={showRegPassword ? 'Hide password' : 'Show password'}>
                        {showRegPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {regErr('password') && <p className="auth-v2-field-error" role="alert">{regErr('password')}</p>}
                  </div>

                  <div className="auth-v2-field">
                    <label className="auth-v2-label" htmlFor="reg-confirm">Confirm password <span className="auth-v2-req">*</span></label>
                    <div className={`auth-v2-input-wrap ${regErr('confirm') ? 'has-error' : ''}`}>
                      <div className="auth-v2-input-icon"><Lock size={18} /></div>
                      <input id="reg-confirm" type={showRegConfirm ? 'text' : 'password'} autoComplete="new-password" placeholder="Re-enter your password" value={regConfirmPassword} onChange={(e) => setRegConfirmPassword(e.target.value)} className="auth-v2-input" />
                      <button type="button" onClick={() => setShowRegConfirm(!showRegConfirm)} className="auth-v2-input-toggle" aria-label={showRegConfirm ? 'Hide confirm password' : 'Show confirm password'}>
                        {showRegConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {regErr('confirm') && <p className="auth-v2-field-error" role="alert">{regErr('confirm')}</p>}
                  </div>

                  <ul className="auth-v2-pw-box" aria-label="Password rules">
                    {([
                      [regPwRules.minLength, 'At least 8 characters'],
                      [regPwRules.hasLetterAndNum, 'A letter and a number'],
                      [regPwRules.hasSpecial, 'A special character (e.g. ! @ # $)'],
                      [regPasswordsMatch, 'Passwords match'],
                    ] as const).map(([ok, text]) => (
                      <li key={text} className={ok ? 'is-valid' : ''}>
                        <span className="auth-v2-pw-dot">{ok && <Check size={10} />}</span>
                        {text}
                      </li>
                    ))}
                  </ul>

                  <button type="submit" disabled={busy} className="auth-v2-btn-primary">
                    {busy ? 'Creating account...' : 'Create account'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
