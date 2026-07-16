import React from 'react';
import { Ambulance, AlertCircle } from 'lucide-react';
import { MOCK_EMERGENCIES } from '../../../mocks/hospitalFlowMocks';

const EmergencyScreen = () => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Emergency & Ambulance</h2>
          <p className="text-slate-500 mt-1">Live feed of incoming emergencies and trauma cases.</p>
        </div>
      </div>

      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="relative flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500"></span>
          </span>
          <h3 className="text-xl font-black text-rose-900">Active Queue</h3>
        </div>

        <div className="space-y-4">
          {MOCK_EMERGENCIES.map(em => (
            <div key={em.id} className="bg-white rounded-xl border border-rose-100 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-rose-300 transition-colors">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-rose-100 text-rose-600">
                  <Ambulance className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-800">{em.type}</h4>
                  <p className="text-sm font-semibold text-slate-600">{em.details}</p>
                </div>
              </div>
              <div className="flex flex-col md:items-end gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider text-center ${em.severity === 'Critical' ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20' : 'bg-amber-500 text-white'}`}>
                  {em.severity} PRIORITY
                </span>
                <p className="text-xs font-bold text-slate-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Received: {em.time}
                </p>
              </div>
              <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                <button className="flex-1 md:flex-none px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-sm transition-all active:scale-95 text-sm">
                  Acknowledge
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EmergencyScreen;
