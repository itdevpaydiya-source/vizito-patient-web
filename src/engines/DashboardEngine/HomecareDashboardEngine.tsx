import React from 'react';
import { HeartHandshake, UsersRound, CalendarClock, Wallet, ChevronRight, Navigation } from 'lucide-react';
import { MOCK_CARE_SERVICES, MOCK_CARE_STAFF, MOCK_CARE_BOOKINGS } from './../../mocks/homecareFlowMocks';
import { useNavigate } from 'react-router-dom';

const HomecareDashboardEngine = () => {
  const navigate = useNavigate();

  const pendingBookings = MOCK_CARE_BOOKINGS.filter(b => b.status === 'Pending Assignment');
  const staffOnDuty = MOCK_CARE_STAFF.filter(s => s.status === 'On Duty');

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Homecare Admin</h2>
        <p className="text-slate-500 mt-1">Manage field staff, care services, and active bookings.</p>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-slate-500">Pending Bookings</p>
              <h3 className="text-3xl font-black text-rose-600 mt-2">{pendingBookings.length}</h3>
            </div>
            <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
              <CalendarClock className="w-6 h-6" />
            </div>
          </div>
          <button onClick={() => navigate('/homecare-bookings')} className="mt-4 text-xs font-bold text-rose-600 flex items-center hover:underline">Dispatch Staff <ChevronRight className="w-3 h-3 ml-1" /></button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-slate-500">Staff On Duty</p>
              <h3 className="text-3xl font-black text-indigo-600 mt-2">{staffOnDuty.length} <span className="text-sm font-medium text-slate-400">/ {MOCK_CARE_STAFF.length}</span></h3>
            </div>
            <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
              <UsersRound className="w-6 h-6" />
            </div>
          </div>
          <button onClick={() => navigate('/homecare-staff')} className="mt-4 text-xs font-bold text-indigo-600 flex items-center hover:underline">View Roster <ChevronRight className="w-3 h-3 ml-1" /></button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-slate-500">Active Services</p>
              <h3 className="text-3xl font-black text-slate-800 mt-2">{MOCK_CARE_SERVICES.length}</h3>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 text-slate-600">
              <HeartHandshake className="w-6 h-6" />
            </div>
          </div>
          <button onClick={() => navigate('/homecare-services')} className="mt-4 text-xs font-bold text-slate-600 flex items-center hover:underline">Manage Catalog <ChevronRight className="w-3 h-3 ml-1" /></button>
        </div>
        
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-slate-500">Revenue (Today)</p>
              <h3 className="text-3xl font-black text-emerald-600 mt-2">₹12,400</h3>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
              <Wallet className="w-6 h-6" />
            </div>
          </div>
          <button onClick={() => navigate('/revenue')} className="mt-4 text-xs font-bold text-emerald-600 flex items-center hover:underline">View Ledger <ChevronRight className="w-3 h-3 ml-1" /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Bookings Widget */}
        <div className="bg-white rounded-2xl border border-rose-200 shadow-sm p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
          <div className="flex items-center justify-between mb-4 border-b border-rose-100 pb-4">
            <h3 className="text-lg font-bold text-slate-800">Unassigned Bookings</h3>
            <button onClick={() => navigate('/homecare-bookings')} className="text-sm font-semibold text-rose-600 hover:text-rose-700">Assign Staff</button>
          </div>
          <div className="space-y-3">
            {pendingBookings.map(bk => (
              <div key={bk.id} className="p-4 rounded-xl bg-white border border-rose-100 shadow-sm flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">{bk.patientName}</h4>
                  <p className="text-xs text-slate-500 font-medium">{bk.serviceName}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-500 block mb-1">{bk.date}</span>
                  <button className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 justify-end">
                    <Navigation className="w-3.5 h-3.5" /> Dispatch
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Staff On Duty Widget */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
            <h3 className="text-lg font-bold text-slate-800">Field Staff On Duty</h3>
            <button onClick={() => navigate('/homecare-staff')} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">View Roster</button>
          </div>
          <div className="space-y-3">
            {staffOnDuty.map(staff => (
              <div key={staff.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-indigo-100 text-indigo-600">
                    <UsersRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{staff.name}</h4>
                    <p className="text-xs text-slate-500 font-medium">{staff.role}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 block mb-1">
                    {staff.status}
                  </span>
                  <p className="text-[10px] font-bold text-slate-500 truncate max-w-[120px]">{staff.assignedTo}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomecareDashboardEngine;
