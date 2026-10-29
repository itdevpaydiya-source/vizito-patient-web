import AuthModule from './AuthModule';

interface RegistrationModuleProps {
  onBackToLogin?: () => void;
  onRegisterSuccess: (userData: any) => void;
}

export default function RegistrationModule({
  onBackToLogin,
  onRegisterSuccess,
}: RegistrationModuleProps) {
  return (
    <AuthModule
      initialTab="register"
      onLoginSuccess={onRegisterSuccess}
      onRegisterClick={onBackToLogin}
    />
  );
}
