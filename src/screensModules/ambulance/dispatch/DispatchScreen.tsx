import React from 'react';
import { Siren, Navigation, CheckCircle2, Truck } from 'lucide-react';
import { MOCK_EMERGENCY_REQUESTS } from '../../../mocks/ambulanceFlowMocks';

const DispatchScreen = () => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Emergency Dispatch</h2>
          <p className="text-slate-500 mt-1">Manage live emergency requests and assign units.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_EMERGENCY_REQUESTS.map(req => (
          <div key={req.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col group hover:border-rose-300 transition-colors relative">
            
            <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-600">
                  <Siren className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{req.emergencyType}</h3>
                  <p className="text-xs text-slate-500 font-medium">Caller: {req.callerName}</p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                req.status === 'Pending' ? 'bg-rose-100 text-rose-700' : 
                req.status === 'Dispatching' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
              }`}>
                {req.status}
              </span>
            </div>

            <div className="flex-1 space-y-3 mb-6">
              <div className="flex justify-between items-start text-sm">
                <span className="text-slate-500 font-medium min-w-[80px]">Pickup:</span>
                <span className="text-slate-800 font-bold text-right flex flex-col items-end">
                  {req.pickupLocation}
                  <span className="text-[10px] font-medium text-slate-400">{req.time}</span>
                </span>
              </div>
              <div className="flex justify-between items-start text-sm">
                <span className="text-slate-500 font-medium min-w-[80px]">Drop-off:</span>
                <span className="text-slate-800 font-bold text-right">{req.dropLocation}</span>
              </div>
            </div>

            <div className="mt-auto">
              {req.status === 'Pending' ? (
                <button className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-sm transition-all active:scale-95 text-sm flex items-center justify-center gap-2">
                  <Truck className="w-4 h-4" /> Assign Nearest Unit
                </button>
              ) : req.status === 'Dispatching' ? (
                <button className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold shadow-sm transition-all active:scale-95 text-sm flex items-center justify-center gap-2">
                  <Navigation className="w-4 h-4" /> Track Unit ETA
                </button>
              ) : (
                <button className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all active:scale-95 text-sm flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Patient Dropped
                </button>
              )}
            </div>

          </div>
        ))}
      </div>
    </div>
  );
};

export default DispatchScreen;
