import { Outlet } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col">
      <Outlet />
    </div>
  );
};

export default AuthLayout;
