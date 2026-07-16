import { useState, useEffect } from 'react';
import {
  Phone,
  Mail,
  Eye,
  EyeOff,
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  LockKeyhole,
  Smartphone,
  Lock,
  KeyRound,
  Send,
  ChevronDown,
} from 'lucide-react';
import logoImg from '../assets/vizito_logo.png';
import { loginApi } from '../services/authHelper';

interface AuthModuleProps {
  onLoginSuccess: (user: any) => void;
  onRegisterClick: () => void;
}

type LoginType = 'mobile' | 'email';
type AuthMethod = 'otp' | 'password';
type AuthState =
  | 'login'
  | 'otp-verify'
  | 'forgot-select'
  | 'forgot-input'
  | 'forgot-otp'
  | 'forgot-reset'
  | 'forgot-success';

export default function AuthModule({ onLoginSuccess, onRegisterClick }: AuthModuleProps) {
  // Navigation & UI States
  const [loginType, setLoginType] = useState<LoginType>('mobile');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('otp');
  const [authState, setAuthState] = useState<AuthState>('login');

  // Fields
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // Recovery States
  const [recoveryMethod, setRecoveryMethod] = useState<LoginType>('mobile');
  const [recoveryMobile, setRecoveryMobile] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryOtp, setRecoveryOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Security Simulation States
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockCountdown, setLockCountdown] = useState(0);
  const [otpCountdown, setOtpCountdown] = useState(300);
  const [otpSent, setOtpSent] = useState(false);

  // Error & Status Messages
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // OTP Countdown Effect
  useEffect(() => {
    let timer: any;
    if (otpSent && otpCountdown > 0) {
      timer = setInterval(() => {
        setOtpCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [otpSent, otpCountdown]);

  // Account Lockout Countdown Effect
  useEffect(() => {
    let timer: any;
    if (isLocked && lockCountdown > 0) {
      timer = setInterval(() => {
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
    return () => clearInterval(timer);
  }, [isLocked, lockCountdown]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Validations
  const validateMobile = (num: string) => /^\d{10}$/.test(num);
  const validateEmail = (mail: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail);
  const validatePassword = (pass: string) => pass.length >= 8;

  const handleSendOTP = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (loginType === 'mobile' && !validateMobile(mobile)) {
      setErrorMessage('Invalid Mobile Number');
      return;
    }
    if (loginType === 'email' && !validateEmail(email)) {
      setErrorMessage('Invalid Email Address');
      return;
    }

    if (loginType === 'mobile') {
      if (mobile === '9999999999') { setErrorMessage('Your account verification is pending.'); return; }
      if (mobile === '8888888888') { setErrorMessage('Your account has been temporarily blocked. Please contact support.'); return; }
      if (mobile === '7777777777') { setErrorMessage('Account Not Found'); return; }
    }
    if (loginType === 'email') {
      if (email === 'pending@vizito.com') { setErrorMessage('Your account verification is pending.'); return; }
      if (email === 'blocked@vizito.com') { setErrorMessage('Your account has been temporarily blocked. Please contact support.'); return; }
      if (email === 'missing@vizito.com') { setErrorMessage('Account Not Found'); return; }
    }

    setOtpSent(true);
    setOtpCountdown(300);
    setAuthState('otp-verify');
    setSuccessMessage(`OTP sent to ${loginType === 'mobile' ? '+91 ' + mobile : email}. Use mock code: 123456`);
  };

  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (otp.length !== 6 || otpCountdown === 0 || otp !== '123456') {
      setErrorMessage('Invalid OTP');
      return;
    }
    onLoginSuccess({
      email: loginType === 'email' ? email : 'john.doe@hospital.com',
      mobile: loginType === 'mobile' ? mobile : '9876543210',
      fullName: 'Dr. Johnathan Doe',
      role: 'doctor',
    });
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (isLocked) { setErrorMessage('Your account has been temporarily blocked. Please contact support.'); return; }
    if (loginType === 'mobile') {
      setErrorMessage('Mobile password login is not supported. Please use Email login.');
      return;
    }
    if (!validateEmail(email)) { setErrorMessage('Invalid Email Address'); return; }
    if (!validatePassword(password)) { setErrorMessage('Password must be at least 8 characters.'); return; }

    setIsSubmitting(true);
    try {
      const response = await loginApi({ email, password });
      
      const userData = {
        email: response?.email || email,
        role: response?.role || 'doctor',
        fullName: response?.fullName || response?.full_name || 'Provider Workspace',
        token: response?.token || '',
      };

      onLoginSuccess(userData);
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Login failed. Please verify your credentials.';
      setErrorMessage(msg);

      const attempts = failedAttempts + 1;
      setFailedAttempts(attempts);
      if (attempts >= 5) {
        setIsLocked(true);
        setLockCountdown(900);
        setErrorMessage('Your account has been temporarily blocked. Please contact support.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotSelect = (method: LoginType) => {
    setRecoveryMethod(method);
    setAuthState('forgot-input');
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleRecoverySend = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (recoveryMethod === 'mobile') {
      if (!validateMobile(recoveryMobile)) { setErrorMessage('Invalid Mobile Number'); return; }
    } else {
      if (!validateEmail(recoveryEmail)) { setErrorMessage('Invalid Email Address'); return; }
    }
    setOtpSent(true);
    setOtpCountdown(300);
    setAuthState('forgot-otp');
    setSuccessMessage('Recovery OTP code sent! Use mock code: 123456');
  };

  const handleRecoveryVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (recoveryOtp !== '123456') { setErrorMessage('Invalid OTP'); return; }
    setAuthState('forgot-reset');
    setSuccessMessage('');
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const complexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!complexityRegex.test(newPassword)) { setErrorMessage('Password does not meet validation rules.'); return; }
    if (newPassword !== confirmPassword) { setErrorMessage('Passwords do not match'); return; }
    setAuthState('forgot-success');
    setSuccessMessage('');
  };

  const goBackToLogin = () => {
    setAuthState('login');
    setErrorMessage('');
    setSuccessMessage('');
  };

  return (
    <div className="flex-grow flex items-center justify-center min-h-screen bg-slate-50 font-sans p-6">
      <div className="w-full max-w-[480px] flex flex-col justify-between relative overflow-y-auto">
        <div className="w-full mx-auto my-auto py-8">
          {/* Card Container */}
          <div className="bg-white rounded-[2rem] shadow-[0_15px_45px_-12px_rgba(0,0,0,0.04)] border border-slate-100/80 p-8 relative">
            
            {/* Show logo at top of the card */}
            <div className="flex items-center gap-3 mb-6 justify-center">
              <div className="w-10 h-10 overflow-hidden relative shrink-0">
                <img 
                  src={logoImg} 
                  alt="VIZITO Icon" 
                  className="absolute top-0 left-0 w-full h-[180%] object-contain object-top" 
                />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-extrabold text-lg tracking-tight text-slate-800 leading-none">VIZITO</span>
                <span className="text-[9px] text-teal-650 font-bold uppercase tracking-wider mt-0.5">Your Health. Connected.</span>
              </div>
            </div>

            {/* Back button (Only for nested sub-flows: OTP verification, Recovery states) */}
            {authState !== 'login' && authState !== 'forgot-success' && (
              <button
                onClick={goBackToLogin}
                className="inline-flex items-center gap-1.5 text-slate-400 hover:text-primary text-xs font-bold uppercase transition-all mb-6 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Login
              </button>
            )}

            {/* Error Banner */}
            {errorMessage && (
              <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-100/60 text-rose-700 text-xs font-bold flex items-center gap-2 animate-pulse">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Success Banner */}
            {successMessage && (
              <div className="mb-4 p-3.5 rounded-xl bg-teal-50 border border-teal-100/60 text-teal-700 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#007A87] shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* ── ACCOUNT LOCKED ── */}
            {isLocked && (
              <div className="text-center py-6 animate-fade">
                <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-200 shadow-inner">
                  <LockKeyhole className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Account Temporarily Locked</h3>
                <p className="text-slate-500 text-xs mt-2 max-w-sm mx-auto font-medium">
                  Too many failed login attempts. To protect patient healthcare records, this device access is temporarily disabled.
                </p>
                <div className="mt-4 text-2xl font-black text-rose-600 font-mono bg-rose-50 border border-rose-100 inline-block px-4 py-1.5 rounded-xl">
                  {formatTime(lockCountdown)}
                </div>
                <p className="text-[10px] text-slate-400 mt-3 font-bold uppercase tracking-wider">Please wait before trying again.</p>
              </div>
            )}

            {/* ── LOGIN SCREEN ── */}
            {!isLocked && authState === 'login' && (
              <div className="animate-fade">
                <div className="mb-8">
                  <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-none">Welcome Back!</h2>
                  <p className="text-slate-500 text-sm mt-2 font-medium">Login to continue to your Provider Workspace</p>
                </div>

                {/* Tabs selection header */}
                <div className="grid grid-cols-4 border-b border-slate-100 -mx-8 px-4 mb-6">
                  <button
                    type="button"
                    onClick={() => { setLoginType('mobile'); setAuthMethod('otp'); setErrorMessage(''); }}
                    className={`flex flex-col items-center pb-3 text-center border-b-2 transition-all gap-1.5 cursor-pointer ${
                      loginType === 'mobile' && authMethod === 'otp'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <Smartphone className="w-5 h-5" />
                    <span className="text-[10px] font-bold tracking-tight whitespace-nowrap">Mobile + OTP</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setLoginType('mobile'); setAuthMethod('password'); setErrorMessage(''); }}
                    className={`flex flex-col items-center pb-3 text-center border-b-2 transition-all gap-1.5 cursor-pointer ${
                      loginType === 'mobile' && authMethod === 'password'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-center relative">
                      <Smartphone className="w-5 h-5" />
                      <span className="absolute bottom-0 right-0 bg-white rounded-full p-px"><Lock className="w-2.5 h-2.5" /></span>
                    </div>
                    <span className="text-[10px] font-bold tracking-tight whitespace-nowrap">Mobile + Password</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setLoginType('email'); setAuthMethod('otp'); setErrorMessage(''); }}
                    className={`flex flex-col items-center pb-3 text-center border-b-2 transition-all gap-1.5 cursor-pointer ${
                      loginType === 'email' && authMethod === 'otp'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <Mail className="w-5 h-5" />
                    <span className="text-[10px] font-bold tracking-tight whitespace-nowrap">Email + OTP</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setLoginType('email'); setAuthMethod('password'); setErrorMessage(''); }}
                    className={`flex flex-col items-center pb-3 text-center border-b-2 transition-all gap-1.5 cursor-pointer ${
                      loginType === 'email' && authMethod === 'password'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <KeyRound className="w-5 h-5" />
                    <span className="text-[10px] font-bold tracking-tight whitespace-nowrap">Email + Password</span>
                  </button>
                </div>

                {/* Main Auth Form */}
                <form
                  onSubmit={authMethod === 'otp' ? handleSendOTP : handlePasswordLogin}
                  className="space-y-5"
                >
                  {/* Contact Fields (Mobile/Email) */}
                  {loginType === 'mobile' ? (
                    <div className="form-group mb-0">
                      <label className="form-label text-slate-600 font-bold text-xs">Mobile Number</label>
                      <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden px-3 bg-white focus-within:border-[#007A87] focus-within:ring-4 focus-within:ring-teal-500/10 transition-all">
                        <div className="flex items-center gap-1.5 cursor-pointer select-none py-3 text-slate-700">
                          <span className="text-base">🇮🇳</span>
                          <span className="font-bold text-sm">+91</span>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                        <div className="w-px h-6 bg-slate-200 mx-3.5 shrink-0" />
                        <input
                          type="tel"
                          maxLength={10}
                          value={mobile}
                          onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                          placeholder="Enter your mobile number"
                          className="flex-1 py-3 text-sm font-semibold text-slate-800 bg-transparent outline-none placeholder:text-slate-400"
                          required
                        />
                      </div>
                      {authMethod === 'otp' && (
                        <p className="text-[11px] text-slate-400 font-semibold mt-2">
                          We will send you a 6-digit OTP to verify your number
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="form-group mb-0">
                      <label className="form-label text-slate-600 font-bold text-xs">Email Address</label>
                      <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden px-3 bg-white focus-within:border-[#007A87] focus-within:ring-4 focus-within:ring-teal-500/10 transition-all">
                        <Mail className="w-4.5 h-4.5 text-slate-400 mr-2 shrink-0" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter your email address"
                          className="flex-1 py-3 text-sm font-semibold text-slate-800 bg-transparent outline-none placeholder:text-slate-400"
                          required
                        />
                      </div>
                      {authMethod === 'otp' && (
                        <p className="text-[11px] text-slate-400 font-semibold mt-2">
                          We will send you a 6-digit OTP to verify your email
                        </p>
                      )}
                    </div>
                  )}

                  {/* Password Field (Only for password auth) */}
                  {authMethod === 'password' && (
                    <div className="form-group mb-0">
                      <label className="form-label text-slate-600 font-bold text-xs">Password</label>
                      <div className="relative flex items-center border border-slate-200 rounded-xl overflow-hidden px-3 bg-white focus-within:border-[#007A87] focus-within:ring-4 focus-within:ring-teal-500/10 transition-all">
                        <Lock className="w-4.5 h-4.5 text-slate-400 mr-2 shrink-0" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          className="flex-1 py-3 text-sm font-semibold text-slate-800 bg-transparent outline-none placeholder:text-slate-400 pr-10"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Action Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center relative shadow-md shadow-primary/10 cursor-pointer mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <>
                        <span>{authMethod === 'otp' ? 'Send OTP' : 'Login'}</span>
                        <Send className="w-4 h-4 absolute right-4 text-white/90" />
                      </>
                    )}
                  </button>
                </form>

                {/* Checkbox and Forgot Password footer */}
                <div className="flex items-center justify-between mt-6 pt-4 text-xs font-semibold text-slate-600">
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
                    onClick={() => setAuthState('forgot-select')}
                    className="text-primary font-bold hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>

                {/* Register Option */}
                <div className="mt-8 text-center text-xs text-slate-500 font-semibold border-t border-slate-100 pt-4">
                  <span>Don't have an account? </span>
                  <button onClick={onRegisterClick} className="text-primary hover:text-primary-hover font-bold hover:underline cursor-pointer">Register</button>
                </div>
              </div>
            )}

            {/* ── OTP VERIFY ── */}
            {!isLocked && authState === 'otp-verify' && (
              <div className="animate-fade">
                <div className="mb-6">
                  <h2 className="text-2xl font-black text-slate-800">Enter OTP</h2>
                  <p className="text-slate-500 text-sm mt-1 font-medium leading-relaxed">
                    We've sent a 6-digit passcode to{' '}
                    <strong className="text-slate-700">{loginType === 'mobile' ? '+91 ' + mobile : email}</strong>.
                  </p>
                </div>

                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <div className="form-group text-center">
                    <label className="form-label text-slate-600 font-bold text-xs text-left">6-Digit Verification Code</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter code"
                      className="form-control text-center text-2xl font-black tracking-widest font-mono"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs py-1 font-semibold">
                    <span className="text-slate-400">
                      OTP expires in:{' '}
                      <strong className={otpCountdown < 60 ? 'text-rose-500' : 'text-slate-600'}>{formatTime(otpCountdown)}</strong>
                    </span>
                    <button
                      type="button"
                      disabled={otpCountdown > 0}
                      onClick={() => { setOtpCountdown(300); setSuccessMessage('New OTP code 123456 sent successfully!'); }}
                      className="text-primary font-bold hover:underline disabled:text-slate-350 disabled:no-underline flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Resend OTP
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center cursor-pointer shadow-md shadow-primary/10 mt-2"
                  >
                    Verify &amp; Enter Dashboard
                  </button>
                </form>
              </div>
            )}

            {/* ── FORGOT: Select Method ── */}
            {authState === 'forgot-select' && (
              <div className="animate-fade">
                <div className="mb-6">
                  <h2 className="text-2xl font-black text-slate-800">Forgot Password</h2>
                  <p className="text-slate-500 text-sm mt-1 font-medium">Choose how you want to reset your password.</p>
                </div>
                <div className="space-y-3">
                  <button type="button" onClick={() => handleForgotSelect('mobile')} className="w-full p-4 rounded-2xl border border-slate-200 hover:border-primary/30 bg-white hover:bg-slate-50 transition-all flex items-center gap-4 text-left cursor-pointer">
                    <span className="p-3 rounded-xl bg-primary-light text-primary shrink-0"><Phone className="w-5 h-5" /></span>
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-sm">Recover via Mobile Number</h4>
                      <p className="text-[10px] text-slate-400 font-semibold">Send standard 6-digit OTP verification code.</p>
                    </div>
                  </button>
                  <button type="button" onClick={() => handleForgotSelect('email')} className="w-full p-4 rounded-2xl border border-slate-200 hover:border-primary/30 bg-white hover:bg-slate-50 transition-all flex items-center gap-4 text-left cursor-pointer">
                    <span className="p-3 rounded-xl bg-sky-50 text-sky-600 shrink-0"><Mail className="w-5 h-5" /></span>
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-sm">Recover via Email Address</h4>
                      <p className="text-[10px] text-slate-400 font-semibold">Send custom recovery email link containing code.</p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* ── FORGOT: Enter Contact ── */}
            {authState === 'forgot-input' && (
              <div className="animate-fade">
                <div className="mb-6">
                  <h2 className="text-2xl font-black text-slate-800">Forgot Password</h2>
                  <p className="text-slate-500 text-sm mt-1 font-medium">
                    Enter your registered {recoveryMethod === 'mobile' ? 'mobile number' : 'email address'} to continue.
                  </p>
                </div>
                <form onSubmit={handleRecoverySend} className="space-y-4">
                  {recoveryMethod === 'mobile' ? (
                    <div className="form-group mb-0">
                      <label className="form-label text-slate-600 font-bold text-xs">Mobile Number</label>
                      <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden px-3 bg-white focus-within:border-primary focus-within:ring-4 focus-within:ring-primary-light transition-all">
                        <span className="pr-3 py-3 text-slate-500 font-bold text-sm whitespace-nowrap">+91</span>
                        <div className="w-px h-5 bg-slate-200 mr-3 shrink-0" />
                        <input type="tel" maxLength={10} value={recoveryMobile} onChange={(e) => setRecoveryMobile(e.target.value.replace(/\D/g, ''))} placeholder="Enter your mobile number" className="flex-1 py-3 text-sm font-semibold text-slate-800 bg-transparent outline-none placeholder:text-slate-400" required />
                      </div>
                    </div>
                  ) : (
                    <div className="form-group mb-0">
                      <label className="form-label text-slate-600 font-bold text-xs">Email Address</label>
                      <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden px-3 bg-white focus-within:border-primary focus-within:ring-4 focus-within:ring-primary-light transition-all">
                        <Mail className="w-4.5 h-4.5 text-slate-400 mr-2 shrink-0" />
                        <input type="email" value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} placeholder="doctor@vizito.com" className="flex-1 py-3 text-sm font-semibold text-slate-800 bg-transparent outline-none placeholder:text-slate-400" required />
                      </div>
                    </div>
                  )}
                  <button type="submit" className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center cursor-pointer shadow-md shadow-primary/10 mt-4">Continue</button>
                </form>
              </div>
            )}

            {/* ── FORGOT: OTP Verify ── */}
            {authState === 'forgot-otp' && (
              <div className="animate-fade">
                <div className="mb-6">
                  <h2 className="text-2xl font-black text-slate-800">Verify Code</h2>
                  <p className="text-slate-500 text-sm mt-1 font-medium">Enter the 6-digit confirmation code we sent to your device.</p>
                </div>
                <form onSubmit={handleRecoveryVerify} className="space-y-4">
                  <div className="form-group">
                    <label className="form-label text-slate-600 font-bold text-xs">Verification Code</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={recoveryOtp}
                      onChange={(e) => setRecoveryOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter code"
                      className="form-control text-center text-xl font-bold tracking-widest font-mono"
                      required
                    />
                  </div>
                  <div className="flex justify-between items-center text-xs py-1 font-semibold">
                    <span className="text-slate-400">Expires in: {formatTime(otpCountdown)}</span>
                    <button type="button" disabled={otpCountdown > 0} onClick={() => { setOtpCountdown(300); setSuccessMessage('Code 123456 resent!'); }} className="text-primary font-bold hover:underline disabled:text-slate-300 cursor-pointer">
                      Resend Code
                    </button>
                  </div>
                  <button type="submit" className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center cursor-pointer shadow-md shadow-primary/10">Verify OTP</button>
                </form>
              </div>
            )}

            {/* ── FORGOT: New Password ── */}
            {authState === 'forgot-reset' && (
              <div className="animate-fade">
                <div className="mb-6">
                  <h2 className="text-2xl font-black text-slate-800">Create New Password</h2>
                  <p className="text-slate-500 text-sm mt-1 font-medium">Ensure it meets clinical password complexity guidelines.</p>
                </div>
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="form-group">
                    <label className="form-label text-slate-600 font-bold text-xs">New Password</label>
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 8 chars, 1 Upper, 1 Lower, 1 Num, 1 Spec" className="form-control" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label text-slate-600 font-bold text-xs">Confirm Password</label>
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password" className="form-control" required />
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] text-slate-500 space-y-1 font-bold">
                    <div className="text-slate-700">Password Requirements:</div>
                    <div>• Minimum 8 characters long</div>
                    <div>• At least 1 uppercase &amp; 1 lowercase letter</div>
                    <div>• At least 1 numeric digit (0-9)</div>
                    <div>• At least 1 special symbol (e.g. @, $, !, %, *, ?, &amp;)</div>
                  </div>
                  <button type="submit" className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center cursor-pointer shadow-md shadow-primary/10">Update Password</button>
                </form>
              </div>
            )}

            {/* ── FORGOT: Success ── */}
            {authState === 'forgot-success' && (
              <div className="text-center py-6 animate-fade">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Password Updated Successfully</h3>
                <p className="text-slate-500 text-xs mt-2 max-w-xs mx-auto font-medium leading-relaxed">
                  Your password has been changed successfully.
                </p>
                <button
                  onClick={() => {
                    setAuthState('login');
                    setSuccessMessage('');
                    setErrorMessage('');
                    setPassword('');
                    setMobile('');
                    setEmail('');
                  }}
                  className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center cursor-pointer shadow-md shadow-primary/10 mt-6"
                >
                  Login Now
                </button>
              </div>
            )}

          </div>

        </div>

        {/* Empty bottom spacing div to push card layout to center vertically on tall viewports */}
        <div className="h-4" />
      </div>
    </div>
  );
}
