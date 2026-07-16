import React, { useState, useEffect } from 'react';
import PatientQuickActions from '../../widgets/patient/PatientQuickActions';
import UpcomingAppointmentsWidget from '../../widgets/patient/UpcomingAppointmentsWidget';
import RecentLabReportsWidget from '../../widgets/patient/RecentLabReportsWidget';
import HealthVitalsSummary from '../../widgets/patient/HealthVitalsSummary';
import { 
  MOCK_PATIENT_PROFILE, 
  MOCK_PATIENT_APPOINTMENTS, 
  MOCK_LAB_REPORTS, 
  MOCK_PHARMACY_ORDERS, 
  MOCK_FAMILY_MEMBERS 
} from '../../mocks/patientFlowMocks';
import { Calendar, HeartPulse, Pill, Users, RefreshCw, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PatientDashboardEngine = () => {
  const navigate = useNavigate();
  const [greeting, setGreeting] = useState('Good Morning');
  const [syncTime, setSyncTime] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // Parse patient name from localStorage if available
  const userString = localStorage.getItem('vizito_user');
  let patientName = MOCK_PATIENT_PROFILE.name;
  if (userString) {
    try {
      const user = JSON.parse(userString);
      if (user?.fullName || user?.full_name) {
        patientName = user.fullName || user.full_name;
      }
    } catch (e) {
      console.error('Error parsing patient name:', e);
    }
  }

  // Dynamic greeting & initial timestamp
  useEffect(() => {
    const updateTimeContext = () => {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) {
        setGreeting('Good Morning');
      } else if (hour >= 12 && hour < 17) {
        setGreeting('Good Afternoon');
      } else {
        setGreeting('Good Evening');
      }
    };
    updateTimeContext();
    setSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  }, []);

  const handleManualSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setIsSyncing(false);
    }, 800);
  };

  const activeOrdersCount = MOCK_PHARMACY_ORDERS.filter(o => o.status === 'Processing').length;

  // Stat Cards Details
  const stats = [
    {
      label: 'Appointments',
      value: MOCK_PATIENT_APPOINTMENTS.length,
      desc: 'Active consultations',
      icon: Calendar,
      color: 'text-teal-600 bg-teal-50 border-teal-100 hover:border-teal-300',
      route: '/my-consultations'
    },
    {
      label: 'Medical Records',
      value: MOCK_LAB_REPORTS.length,
      desc: 'Reports & vitals synced',
      icon: HeartPulse,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100 hover:border-indigo-300',
      route: '/my-records'
    },
    {
      label: 'Pharmacy Orders',
      value: activeOrdersCount,
      desc: 'Order in delivery',
      icon: Pill,
      color: 'text-violet-600 bg-violet-50 border-violet-100 hover:border-violet-300',
      route: '/pharmacy-orders'
    },
    {
      label: 'Family Members',
      value: MOCK_FAMILY_MEMBERS.length,
      desc: 'Dependents connected',
      icon: Users,
      color: 'text-amber-600 bg-amber-50 border-amber-100 hover:border-amber-300',
      route: '/family-profiles'
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Real-time Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">{greeting}, {patientName} 👋</h1>
          <p className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
            </span>
            Real-time health tracker active • 
            <button 
              onClick={handleManualSync}
              className="text-[10px] bg-slate-100 hover:bg-slate-200 transition-colors px-2 py-0.5 rounded text-slate-600 flex items-center gap-1 font-bold"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-teal-600' : ''}`} />
              Last Synced: {syncTime}
            </button>
          </p>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div 
              key={idx}
              onClick={() => navigate(stat.route)}
              className={`bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all active:scale-98 cursor-pointer flex flex-col justify-between group ${stat.color.split(' ').pop()}`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-bold text-slate-400 group-hover:text-slate-600 transition-colors">{stat.label}</p>
                  <h3 className="text-3xl font-black text-slate-800 mt-2">{stat.value}</h3>
                </div>
                <div className={`p-3 rounded-xl border ${stat.color.split(' ').slice(0, 3).join(' ')}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-400 group-hover:text-slate-600 transition-colors">
                <span>{stat.desc}</span>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-800">Quick Access Panel</h3>
        <PatientQuickActions />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-8 space-y-6 flex flex-col">
          <UpcomingAppointmentsWidget />
          <RecentLabReportsWidget />
        </div>

        {/* Right Column */}
        <div className="lg:col-span-4 space-y-6 flex flex-col">
          <HealthVitalsSummary />
        </div>
      </div>
    </div>
  );
};

export default PatientDashboardEngine;
