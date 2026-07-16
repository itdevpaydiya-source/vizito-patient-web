import { Outlet } from 'react-router-dom';

const DashboardLayout = () => {
  return (
    <div className="flex flex-col gap-6">
      <Outlet />
    </div>
  );
};

export default DashboardLayout;
