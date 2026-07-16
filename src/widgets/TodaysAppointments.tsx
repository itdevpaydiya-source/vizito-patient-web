import React from 'react';
import { Calendar } from 'lucide-react';

export const TodaysAppointments = () => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 flex flex-col h-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
          <Calendar className="w-5 h-5 text-teal-600" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800">Today's Appointments</h3>
          <p className="text-xs text-slate-500">You have 12 appointments today</p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
        [Appointments List Placeholder]
      </div>
    </div>
  );
};
