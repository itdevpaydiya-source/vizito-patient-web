import React from 'react';
import { CalendarClock, Navigation, CheckCircle2, UserPlus } from 'lucide-react';
import { MOCK_CARE_BOOKINGS } from '../../../mocks/homecareFlowMocks';

const CareBookingsScreen = () => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Care Bookings</h2>
          <p className="text-slate-500 mt-1">Review patient requests and dispatch your staff.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_CARE_BOOKINGS.map(bk => (
          <div key={bk.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col group hover:border-indigo-300 transition-colors relative">
            
            <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-600">
                  <CalendarClock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{bk.patientName}</h3>
                  <p className="text-xs text-slate-500 font-medium">ID: {bk.id}</p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                bk.status === 'Pending Assignment' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {bk.status}
              </span>
            </div>

            <div className="flex-1 space-y-3 mb-6">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-medium">Service:</span>
                <span className="text-slate-800 font-bold">{bk.serviceName}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-medium">Schedule:</span>
                <span className="text-slate-800 font-bold">{bk.date}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-medium">Location:</span>
                <span className="text-slate-800 font-bold">{bk.location}</span>
              </div>
            </div>

            <div className="mt-auto">
              {bk.status === 'Pending Assignment' ? (
                <button className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-sm transition-all active:scale-95 text-sm flex items-center justify-center gap-2">
                  <UserPlus className="w-4 h-4" /> Assign Staff
                </button>
              ) : (
                <button className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all active:scale-95 text-sm flex items-center justify-center gap-2">
                  <Navigation className="w-4 h-4" /> Track Ongoing
                </button>
              )}
            </div>

          </div>
        ))}
      </div>
    </div>
  );
};

export default CareBookingsScreen;
