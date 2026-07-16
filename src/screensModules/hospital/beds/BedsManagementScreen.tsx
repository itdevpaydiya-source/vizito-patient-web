import React from 'react';
import { BedDouble } from 'lucide-react';
import { MOCK_BEDS } from '../../../mocks/hospitalFlowMocks';

const BedsManagementScreen = () => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Bed Availability & Allocation</h2>
          <p className="text-slate-500 mt-1">Manage hospital ward capacity and assign beds.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {MOCK_BEDS.breakdown.map((ward, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:border-blue-300 transition-colors">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                  <BedDouble className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">{ward.type}</h3>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${ward.available < 10 ? 'bg-rose-100 text-rose-700' : 'bg-teal-100 text-teal-700'}`}>
                {ward.available} Available
              </span>
            </div>

            <div className="flex justify-between items-end mb-2">
              <span className="text-sm font-semibold text-slate-500">Occupancy</span>
              <span className="text-sm font-bold text-slate-800">{ward.occupied} / {ward.total}</span>
            </div>
            
            <div className="w-full bg-slate-100 rounded-full h-3 mb-6">
              <div className={`h-3 rounded-full ${ward.available < 10 ? 'bg-rose-500' : 'bg-teal-500'}`} style={{ width: `${(ward.occupied / ward.total) * 100}%` }}></div>
            </div>

            <div className="flex gap-3">
              <button className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm shadow-blue-600/20 transition-all active:scale-95 text-sm">
                Assign Bed
              </button>
              <button className="flex-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-semibold transition-all active:scale-95 text-sm">
                View Patients
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BedsManagementScreen;
