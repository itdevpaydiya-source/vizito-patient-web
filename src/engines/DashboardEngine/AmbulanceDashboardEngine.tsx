import React from 'react';
import { Siren, Ambulance, Contact, Wallet, ChevronRight, Navigation } from 'lucide-react';
import { MOCK_AMBULANCE_FLEET, MOCK_AMBULANCE_DRIVERS, MOCK_EMERGENCY_REQUESTS } from './../../mocks/ambulanceFlowMocks';
import { useNavigate } from 'react-router-dom';

const AmbulanceDashboardEngine = () => {
  const navigate = useNavigate();

  const activeRequests = MOCK_EMERGENCY_REQUESTS.filter(r => r.status !== 'Completed');
  const availableFleet = MOCK_AMBULANCE_FLEET.filter(f => f.status === 'Available');

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Dispatch Control</h2>
        <p className="text-slate-500 mt-1">Manage emergency requests, fleet status, and driver roster.</p>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-slate-500">Active Emergencies</p>
              <h3 className="text-3xl font-black text-rose-600 mt-2">{activeRequests.length}</h3>
            </div>
            <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
              <Siren className="w-6 h-6 animate-pulse" />
            </div>
          </div>
          <button onClick={() => navigate('/ambulance-dispatch')} className="mt-4 text-xs font-bold text-rose-600 flex items-center hover:underline">Dispatch Units <ChevronRight className="w-3 h-3 ml-1" /></button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-slate-500">Available Fleet</p>
              <h3 className="text-3xl font-black text-indigo-600 mt-2">{availableFleet.length} <span className="text-sm font-medium text-slate-400">/ {MOCK_AMBULANCE_FLEET.length}</span></h3>
            </div>
            <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
              <Ambulance className="w-6 h-6" />
            </div>
          </div>
          <button onClick={() => navigate('/ambulance-fleet')} className="mt-4 text-xs font-bold text-indigo-600 flex items-center hover:underline">View Fleet <ChevronRight className="w-3 h-3 ml-1" /></button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-slate-500">Drivers On Duty</p>
              <h3 className="text-3xl font-black text-slate-800 mt-2">{MOCK_AMBULANCE_DRIVERS.filter(d => d.status !== 'Off Duty').length}</h3>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 text-slate-600">
              <Contact className="w-6 h-6" />
            </div>
          </div>
          <button onClick={() => navigate('/ambulance-drivers')} className="mt-4 text-xs font-bold text-slate-600 flex items-center hover:underline">Manage Roster <ChevronRight className="w-3 h-3 ml-1" /></button>
        </div>
        
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-slate-500">Trips (Today)</p>
              <h3 className="text-3xl font-black text-emerald-600 mt-2">12</h3>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
              <Wallet className="w-6 h-6" />
            </div>
          </div>
          <button onClick={() => navigate('/revenue')} className="mt-4 text-xs font-bold text-emerald-600 flex items-center hover:underline">View Log <ChevronRight className="w-3 h-3 ml-1" /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Requests Widget */}
        <div className="bg-white rounded-2xl border border-rose-200 shadow-sm p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
          <div className="flex items-center justify-between mb-4 border-b border-rose-100 pb-4">
            <h3 className="text-lg font-bold text-slate-800">Live Dispatch Feed</h3>
            <button onClick={() => navigate('/ambulance-dispatch')} className="text-sm font-semibold text-rose-600 hover:text-rose-700">Open Map</button>
          </div>
          <div className="space-y-3">
            {activeRequests.map(req => (
              <div key={req.id} className="p-4 rounded-xl bg-white border border-rose-100 shadow-sm flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{req.emergencyType}</h4>
                    <p className="text-xs text-slate-500 font-medium">Caller: {req.callerName}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${req.status === 'Pending' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                    {req.status}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-2 text-xs font-bold text-slate-700">
                  <Navigation className="w-3.5 h-3.5 text-rose-500" /> {req.pickupLocation}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fleet Status Widget */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
            <h3 className="text-lg font-bold text-slate-800">Available Vehicles</h3>
            <button onClick={() => navigate('/ambulance-fleet')} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">View All</button>
          </div>
          <div className="space-y-3">
            {availableFleet.map(fleet => (
              <div key={fleet.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-indigo-100 text-indigo-600">
                    <Ambulance className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{fleet.id}</h4>
                    <p className="text-xs text-slate-500 font-medium">{fleet.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1 justify-end">
                    <Navigation className="w-3 h-3" /> {fleet.location}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AmbulanceDashboardEngine;
