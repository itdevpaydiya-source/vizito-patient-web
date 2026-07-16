import React, { useState, useEffect } from 'react';
import ProfileCompletionBanner from '../../widgets/ProfileCompletionBanner';
import ClinicSelector from '../../widgets/ClinicSelector';
import AppointmentSummaryCards from '../../widgets/AppointmentSummaryCards';
import TodayAppointmentsList from '../../widgets/TodayAppointmentsList';
import RevenueOverviewWidget from '../../widgets/RevenueOverviewWidget';
import LatestReviewsWidget from '../../widgets/LatestReviewsWidget';
import { 
  MOCK_PROFILE_COMPLETION, 
  MOCK_UPCOMING_SCHEDULE_BY_CLINIC, 
  MOCK_NOTIFICATIONS 
} from '../../mocks/doctorFlowMocks';
import { 
  Plus, UserPlus, FileText, CalendarX2, BarChart2, Bell, 
  ArrowRight, CalendarDays, RefreshCw 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DoctorDashboardEngine = () => {
  const navigate = useNavigate();

  const userString = localStorage.getItem('vizito_user');
  let doctorName = 'Dr. Arjun';
  if (userString) {
    try {
      const user = JSON.parse(userString);
      if (user?.fullName || user?.full_name) {
        doctorName = user.fullName || user.full_name;
      }
    } catch (e) {
      console.error(e);
    }
  }
  const [selectedClinic, setSelectedClinic] = useState<string | null>(null);
  const [greeting, setGreeting] = useState('Good Morning');
  const [autoRefreshedTime, setAutoRefreshedTime] = useState<string>('');
  const [showRefreshPulse, setShowRefreshPulse] = useState(false);

  // 1. Hour-Based Dynamic Greeting builder
  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) {
        setGreeting('Good Morning');
      } else if (hour >= 12 && hour < 17) {
        setGreeting('Good Afternoon');
      } else {
        setGreeting('Good Evening');
      }
    };
    updateGreeting();
    
    // Set initial refreshed timestamp
    const now = new Date();
    setAutoRefreshedTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  }, []);

  // 2. Auto-Refresh Simulation: Triggered when Clinic Selection changes or an event is completed.
  const handleClinicChange = (clinicId: string | null) => {
    setSelectedClinic(clinicId);
    
    // Trigger visual refresh indicator/toast to show "Auto Refresh" occurred without page reload
    setShowRefreshPulse(true);
    const now = new Date();
    setAutoRefreshedTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    
    setTimeout(() => {
      setShowRefreshPulse(false);
    }, 1500);
  };

  // Quick Action Buttons
  const quickActions = [
    { icon: Plus, label: 'Add Consultation', color: 'bg-[#FAF5FF] text-[#5C2494]', onClick: () => navigate('/appointments/create?type=walk_in') },
    { icon: UserPlus, label: 'Add Patient', color: 'bg-[#FEF3C7]/40 text-[#7C3AED]', onClick: () => navigate('/patients?action=add') },
    { icon: FileText, label: 'Create Prescription', color: 'bg-[#FAF5FF] text-[#5C2494]', onClick: () => navigate('/prescriptions') },
    { icon: CalendarX2, label: 'Block Slots', color: 'bg-[#FEF3C7]/40 text-[#7C3AED]', onClick: () => navigate('/availability?action=block') },
    { icon: BarChart2, label: 'Revenue & Settlement', color: 'bg-[#FAF5FF] text-[#5C2494]', onClick: () => navigate('/revenue') },
  ];

  // Upcoming Schedule Details
  const scheduleKey = selectedClinic || 'all';
  const displaySchedule = MOCK_UPCOMING_SCHEDULE_BY_CLINIC[scheduleKey] || MOCK_UPCOMING_SCHEDULE_BY_CLINIC.all;

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Available':
        return 'bg-emerald-50/80 text-emerald-700 border border-emerald-100';
      case 'Partially Available':
        return 'bg-amber-50/80 text-amber-700 border border-amber-100';
      case 'Fully Booked':
        return 'bg-rose-50/80 text-rose-700 border border-rose-100';
      case 'Leave':
        return 'bg-slate-50 text-slate-400 border border-slate-200/50';
      case 'Blocked':
        return 'bg-slate-100 text-slate-600 border border-slate-200';
      default:
        return 'bg-slate-50 text-slate-600 border border-slate-200';
    }
  };

  const handleScheduleClick = () => {
    navigate('/availability');
  };

  const handleDayClick = (dateStr: string) => {
    navigate(`/availability?date=${dateStr}`);
  };

  // Recent Notifications
  const displayNotifications = MOCK_NOTIFICATIONS.slice(0, 5);

  const handleNotificationsClick = () => {
    navigate('/notifications');
  };

  const handleSingleNotificationClick = (id: number) => {
    navigate(`/notifications?id=${id}`);
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Header + Actions */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#2B2B2B] tracking-tight">{greeting}, {doctorName} 👋</h1>
          <p className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Real-time active practice overview • 
            <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 flex items-center gap-1 font-bold">
              <RefreshCw className={`w-3 h-3 ${showRefreshPulse ? 'animate-spin text-[#5C2494]' : ''}`} />
              Auto-Refreshed: {autoRefreshedTime}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0 w-full md:w-auto">
          <ClinicSelector value={selectedClinic} onChange={handleClinicChange} />
          <button
            onClick={() => navigate('/appointments/create?type=walk_in')}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-[#5C2494] to-[#7C3AED] hover:opacity-95 text-white px-4 py-2.5 rounded-xl text-xs font-black shadow-sm shadow-purple-500/10 transition-all active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Add Consultation
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <AppointmentSummaryCards selectedClinic={selectedClinic} />

      {/* Profile Completion Alert Banner */}
      <ProfileCompletionBanner completionPercentage={MOCK_PROFILE_COMPLETION.percentage} />

      {/* 3-Column Widget Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Today's Appointments List */}
        <div className="lg:col-span-5 min-h-[420px] w-full">
          <TodayAppointmentsList selectedClinic={selectedClinic} />
        </div>

        {/* Revenue Overview Chart Widget */}
        <div className="lg:col-span-4 min-h-[420px] w-full">
          <RevenueOverviewWidget selectedClinic={selectedClinic} />
        </div>

        {/* Latest Reviews List */}
        <div className="lg:col-span-3 min-h-[420px] w-full">
          <LatestReviewsWidget selectedClinic={selectedClinic} />
        </div>
      </div>

      {/* Bottom Matrix: Upcoming Schedule + Quick Actions + Recent Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Upcoming Schedule Card */}
        <div className="lg:col-span-8 w-full flex flex-col justify-between">
          <div className="glass-panel p-5 h-full flex flex-col justify-between hover-grow card-glow-primary">
            <div 
              onClick={handleScheduleClick}
              className="flex items-center justify-between mb-4 cursor-pointer group"
            >
              <h3 className="text-sm font-bold text-[#2B2B2B] group-hover:text-[#5C2494] transition-colors flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-slate-400" />
                Upcoming Schedule
              </h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleScheduleClick();
                }}
                className="text-xs font-bold text-[#5C2494] hover:text-[#7C3AED] flex items-center gap-1 transition-colors"
              >
                Availability Management
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {displaySchedule.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
                <CalendarDays className="w-10 h-10 text-slate-300 mb-2" />
                <p className="text-xs text-slate-500 font-semibold">No availability configured.</p>
                <button
                  onClick={handleScheduleClick}
                  className="mt-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-black px-3.5 py-1.5 rounded-lg transition-colors"
                >
                  Add Availability
                </button>
              </div>
            ) : (
              <div className="flex overflow-x-auto lg:grid lg:grid-cols-7 gap-2 pb-2 lg:pb-0" style={{ scrollbarWidth: 'none' }}>
                {displaySchedule.map((day) => (
                  <button
                    key={day.day}
                    onClick={() => handleDayClick(day.date)}
                    className={`flex flex-col items-center p-3 rounded-xl transition-all shrink-0 min-w-[64px] lg:min-w-0 border ${
                      day.isToday
                        ? 'bg-gradient-to-br from-[#5C2494] to-[#7C3AED] border-transparent text-white shadow-md scale-105'
                        : 'bg-slate-50/50 hover:bg-slate-100/80 text-slate-600 border-slate-200/60'
                    } hover:scale-105 active:scale-95`}
                  >
                    <span className={`text-[10px] font-bold ${day.isToday ? 'text-purple-100' : 'text-slate-400'}`}>
                      {day.day}
                    </span>
                    <span className={`text-sm font-black mt-0.5 ${day.isToday ? 'text-white' : 'text-[#2B2B2B]'}`}>
                      {day.date}
                    </span>
                    
                    {/* Availability Status Badge */}
                    <span className={`text-[8px] font-black mt-2.5 px-1 py-0.5 rounded leading-none text-center max-w-full truncate ${getStatusStyle(day.status)}`}>
                      {day.status}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="lg:col-span-4 w-full">
          <div className="glass-panel p-5 h-full flex flex-col justify-between hover-grow card-glow-secondary">
            <h3 className="text-sm font-bold text-[#2B2B2B] mb-4">Quick Actions</h3>
            <div className="grid grid-cols-5 gap-2">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    onClick={action.onClick}
                    className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl hover:bg-[#FAF5FF]/45 border border-transparent hover:border-slate-200/40 hover:scale-105 active:scale-95 transition-all group w-full"
                  >
                    <div className={`w-9 h-9 rounded-xl ${action.color} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-sm`}>
                      <Icon className="w-4 h-4"/>
                    </div>
                    <span className="text-[9px] font-bold text-slate-500 text-center leading-tight line-clamp-2">
                      {action.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Notifications Widget Card */}
      <div className="glass-panel p-5 w-full hover-grow card-glow-primary">
        <div 
          onClick={handleNotificationsClick}
          className="flex items-center justify-between mb-4 cursor-pointer group"
        >
          <h3 className="text-sm font-bold text-[#2B2B2B] group-hover:text-[#5C2494] transition-colors flex items-center gap-2">
            <Bell className="w-4 h-4 text-slate-400" />
            Recent Notifications
          </h3>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNotificationsClick();
            }}
            className="text-xs font-bold text-[#5C2494] hover:text-[#7C3AED] flex items-center gap-1 transition-colors"
          >
            View all
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {displayNotifications.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-xs text-slate-400 font-semibold">No notifications available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {displayNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleSingleNotificationClick(notif.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between gap-2.5 hover:shadow-md hover:scale-[1.02] active:scale-98 ${
                  notif.unread
                    ? 'bg-gradient-to-br from-[#FAF5FF]/60 to-white border-[#E9D5FF] shadow-sm'
                    : 'bg-slate-50/30 hover:bg-white border-slate-200'
                }`}
              >
                {notif.unread && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#5C2494] rounded-full shrink-0" />
                )}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 leading-snug truncate pr-2">{notif.title}</h4>
                  <p className="text-[10px] text-slate-500 leading-normal mt-1 line-clamp-2">{notif.desc}</p>
                </div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{notif.time}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorDashboardEngine;
