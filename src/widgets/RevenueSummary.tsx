import React from 'react';
import { IndianRupee } from 'lucide-react';

export const RevenueSummary = () => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 flex flex-col h-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
          <IndianRupee className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800">Revenue Summary</h3>
          <p className="text-xs text-slate-500">This Month</p>
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center">
        <span className="text-3xl font-black text-slate-800">₹45,200</span>
        <span className="text-xs text-emerald-600 font-medium mt-1">+12% from last month</span>
      </div>
    </div>
  );
};
