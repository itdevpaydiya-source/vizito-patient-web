import React from 'react';
import { Bed } from 'lucide-react';

export const BedOccupancy = () => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
            <Bed className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Bed Occupancy</h3>
            <p className="text-xs text-slate-500">ICU & General Wards</p>
          </div>
        </div>
        <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded">82% Full</span>
      </div>

      <div className="flex-1 flex flex-col justify-center space-y-4">
        <div>
          <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
            <span>ICU Beds (45/50)</span>
            <span className="text-rose-500">90%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div className="bg-rose-500 h-2 rounded-full" style={{ width: '90%' }}></div>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
            <span>General Wards (120/150)</span>
            <span className="text-emerald-500">80%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '80%' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};
